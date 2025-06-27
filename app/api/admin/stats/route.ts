// app/api/admin/stats/route.ts - CORRECTION pour exclure les DRAFT
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { ProductType, Prisma, OrderStatus } from "@prisma/client"

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
      
      // ✅ CORRECTION: --- Statistiques des commandes (SANS les DRAFT) ---
      // Total des commandes (SANS les DRAFT)
      const totalOrders = await prisma.order.count({
        where: {
          status: {
            not: OrderStatus.DRAFT
          }
        }
      });
      
      // ✅ CORRECTION: Commandes par statut (SANS les DRAFT)
      const ordersByStatus = await prisma.order.groupBy({
        by: ['status'],
        where: {
          status: {
            not: OrderStatus.DRAFT
          }
        },
        _count: {
          id: true
        }
      });
      
      // ✅ CORRECTION: Commandes récentes 30 derniers jours (SANS les DRAFT)
      const newOrders = await prisma.order.count({
        where: {
          AND: [
            {
              createdAt: {
                gte: thirtyDaysAgo
              }
            },
            {
              status: {
                not: OrderStatus.DRAFT
              }
            }
          ]
        }
      });
      
      // ✅ CORRECTION: Valeur totale des commandes (SANS les DRAFT)
      const totalOrdersValue = await prisma.order.aggregate({
        where: {
          status: {
            not: OrderStatus.DRAFT
          }
        },
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
      
      // ✅ CORRECTION: Top produits basé sur les vraies commandes (SANS les DRAFT)
      const topProducts = await prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            status: {
              not: OrderStatus.DRAFT
            }
          }
        },
        _count: {
          id: true
        },
        _sum: {
          quantity: true
        },
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: 5
      });
      
      // Récupérer les informations des produits pour le top
      const topProductsWithNames = await Promise.all(
        topProducts.map(async (item) => {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { name: true, type: true }
          });
          return {
            ...item,
            name: product?.name || 'Produit inconnu',
            type: product?.type || 'Type inconnu'
          };
        })
      );
      
      // ✅ CORRECTION: Commandes par type de produit (SANS les DRAFT)
      const ordersByProductType = await prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            status: {
              not: OrderStatus.DRAFT
            }
          }
        },
        _count: {
          id: true
        }
      });
      
      // Regrouper par type de produit
      const ordersByProductTypeMap: Record<string, number> = {};
      
      for (const item of ordersByProductType) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { type: true }
        });
        
        const productType = product?.type || 'Inconnu';
        
        if (!ordersByProductTypeMap[productType]) {
          ordersByProductTypeMap[productType] = 0;
        }
        
        ordersByProductTypeMap[productType] += item._count.id;
      }
      
      const ordersByProductTypeArray = Object.entries(ordersByProductTypeMap).map(([type, count]) => ({
        type,
        count
      }));
      
      // ✅ CORRECTION: Ventes mensuelles (SANS les DRAFT)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      // Récupérer les commandes des 6 derniers mois (SANS les DRAFT)
      const orders = await prisma.order.findMany({
        where: {
          AND: [
            {
              createdAt: {
                gte: sixMonthsAgo
              }
            },
            {
              status: {
                not: OrderStatus.DRAFT
              }
            }
          ]
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
          topProducts: topProductsWithNames
        },
        ordersByProductType: ordersByProductTypeArray,
        salesByMonth
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      return new NextResponse("Erreur lors de la récupération des statistiques", { status: 500 });
    }
  },
  ["ADMIN"] // Seuls les admins peuvent accéder à cet endpoint
);