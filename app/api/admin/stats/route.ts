// app/api/admin/stats/route.ts - CODE COMPLET CORRIGÉ
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
      const totalUsers = await prisma.user.count();
      
      const usersByRole = await prisma.user.groupBy({
        by: ['role'],
        _count: {
          id: true
        }
      });
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const newUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      });
      
      // --- Statistiques des commandes (SANS les DRAFT) ---
      const totalOrders = await prisma.order.count({
        where: {
          status: {
            not: OrderStatus.DRAFT
          }
        }
      });
      
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
      const totalProducts = await prisma.product.count();
      
      const productsByType = await prisma.product.groupBy({
        by: ['type'],
        _count: {
          id: true
        }
      });
      
      // ✅ Top produits avec calcul correct et simple
      const topProductsRaw = await prisma.orderItem.groupBy({
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
        take: 10
      });

      // ✅ Mapping simplifié et direct
      const topProductsWithDetails = [];

      for (const item of topProductsRaw) {
        if (!item._sum.quantity || item._sum.quantity <= 0) continue;
        
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { 
            id: true,
            name: true, 
            type: true,
            unit: true 
          }
        });
        
        if (!product) continue;
        
        // Compter le nombre de commandes uniques pour ce produit
        const uniqueOrders = await prisma.order.count({
          where: {
            AND: [
              {
                status: {
                  not: OrderStatus.DRAFT
                }
              },
              {
                items: {
                  some: {
                    productId: item.productId
                  }
                }
              }
            ]
          }
        });
        
        // ✅ Structure finale correcte
        const productData = {
          id: item.productId,
          name: product.name,
          type: product.type,
          unit: product.unit,
          totalQuantity: item._sum.quantity, // ✅ Quantité totale commandée
          totalOrders: uniqueOrders, // ✅ Nombre de commandes uniques
          orderItems: item._count.id // ✅ Nombre de lignes de commande
        };
        
        topProductsWithDetails.push(productData);
      }

      const topProducts = topProductsWithDetails.slice(0, 5);
      
      // ✅ Commandes par type de produit avec meilleure logique
      const ordersByProductTypeRaw = await prisma.orderItem.groupBy({
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
        }
      });
      
      // Regrouper par type de produit
      const ordersByProductTypeMap: Record<string, number> = {};
      
      for (const item of ordersByProductTypeRaw) {
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
      
      // ✅ Ventes mensuelles (SANS les DRAFT)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
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
      
      const salesByMonthMap: Record<string, number> = {};
      
      orders.forEach(order => {
        const date = new Date(order.createdAt);
        const month = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        
        if (!salesByMonthMap[month]) {
          salesByMonthMap[month] = 0;
        }
        
        salesByMonthMap[month] += order.total;
      });
      
      const salesByMonth = Object.entries(salesByMonthMap).map(([month, value]) => ({
        month,
        value
      }));
      
      // ✅ Réponse finale avec structure correcte
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
          topProducts: topProducts // ✅ Données correctement formatées
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