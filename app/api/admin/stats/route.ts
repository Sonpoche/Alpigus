// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { ProductType, Prisma } from "@prisma/client"

export const GET = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session
  ) => {
    try {
      // Vérifier que l'utilisateur est admin
      if (session.user.role !== 'ADMIN') {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      // --- Statistiques des utilisateurs ---
      // Compter le nombre total d'utilisateurs
      const totalUsers = await prisma.user.count();
      
      // Compter par rôle
      const usersByRole = await prisma.user.groupBy({
        by: ['role'],
        _count: {
          id: true
        }
      });
      
      // Utilisateurs récemment inscrits (30 derniers jours)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const newUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      });
      
      // --- Statistiques des commandes ---
      // Total des commandes
      const totalOrders = await prisma.order.count();
      
      // Commandes par statut
      const ordersByStatus = await prisma.order.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      });
      
      // Commandes récentes (30 derniers jours)
      const newOrders = await prisma.order.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      });
      
      // Valeur totale des commandes
      const totalOrdersValue = await prisma.order.aggregate({
        _sum: {
          total: true
        }
      });
      
      // --- Statistiques des produits ---
      // Total des produits
      const totalProducts = await prisma.product.count();
      
      // Produits par type
      const productsByType = await prisma.product.groupBy({
        by: ['type'],
        _count: {
          id: true
        }
      });
      
      // Articles les plus commandés
      const topProductsRaw = await prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: {
          quantity: true
        },
        _count: {
          id: true
        },
        orderBy: [{
          _sum: {
            quantity: 'desc'
          }
        }],
        take: 5
      });
      
      // Récupérer les détails des produits les plus commandés
      const topProducts = await Promise.all(
        topProductsRaw.map(async (item) => {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { id: true, name: true, type: true, unit: true }
          });
          
          return {
            ...product,
            totalOrders: item._count.id,
            totalQuantity: item._sum?.quantity || 0
          };
        })
      );
      
      // --- Pour éviter les problèmes avec $queryRaw, utilisons une approche différente ---
      // Commandes par type de produit
      const ordersByProductType = [];
      for (const type of Object.values(ProductType)) {
        const count = await prisma.product.count({
          where: {
            type,
            orderItems: {
              some: {}
            }
          }
        });
        
        ordersByProductType.push({
          type,
          count
        });
      }
      
      // --- Statistiques financières ---
      // Chiffre d'affaires par mois sur les 6 derniers mois
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      // Utilisons une approche différente pour les ventes mensuelles
      const orders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: sixMonthsAgo
          }
        },
        select: {
          createdAt: true,
          total: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      
      // Regrouper manuellement les commandes par mois
      const salesByMonthMap: Record<string, number> = {};
      
      orders.forEach(order => {
        const date = new Date(order.createdAt);
        const month = date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
        
        if (!salesByMonthMap[month]) {
          salesByMonthMap[month] = 0;
        }
        
        salesByMonthMap[month] += order.total;
      });
      
      // Convertir en tableau pour le front-end
      const salesByMonth = Object.entries(salesByMonthMap).map(([month, value]) => ({
        month,
        value
      }));
      
      return NextResponse.json({
        users: {
          total: totalUsers,
          byRole: usersByRole,
          newUsers
        },
        orders: {
          total: totalOrders,
          byStatus: ordersByStatus,
          newOrders,
          totalValue: totalOrdersValue._sum?.total || 0
        },
        products: {
          total: totalProducts,
          byType: productsByType,
          topProducts
        },
        ordersByProductType,
        salesByMonth
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      return new NextResponse("Erreur lors de la récupération des statistiques", { status: 500 });
    }
  },
  ["ADMIN"] // Seuls les admins peuvent accéder à cet endpoint
);