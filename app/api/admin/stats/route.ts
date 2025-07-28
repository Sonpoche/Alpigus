// app/api/admin/stats/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { ProductType, Prisma, OrderStatus } from "@prisma/client"

export const GET = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    console.log(`📊 Admin ${session.user.id} consulte les statistiques générales`)
    
    // --- ÉTAPE 1: Statistiques des utilisateurs ---
    console.log("👥 Calcul des statistiques utilisateurs...")
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const [totalUsers, usersByRole, newUsers] = await Promise.all([
      prisma.user.count(),
      
      prisma.user.groupBy({
        by: ['role'],
        _count: {
          id: true
        }
      }),
      
      prisma.user.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      })
    ])
    
    console.log(`👥 ${totalUsers} utilisateurs au total, ${newUsers} nouveaux ce mois`)
    
    // --- ÉTAPE 2: Statistiques des commandes (SANS les DRAFT) ---
    console.log("🛒 Calcul des statistiques commandes...")
    
    const [totalOrders, ordersByStatus, newOrders, totalOrdersValue] = await Promise.all([
      prisma.order.count({
        where: {
          status: {
            not: OrderStatus.DRAFT
          }
        }
      }),
      
      prisma.order.groupBy({
        by: ['status'],
        where: {
          status: {
            not: OrderStatus.DRAFT
          }
        },
        _count: {
          id: true
        }
      }),
      
      prisma.order.count({
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
      }),
      
      prisma.order.aggregate({
        where: {
          status: {
            not: OrderStatus.DRAFT
          }
        },
        _sum: {
          total: true
        }
      })
    ])
    
    console.log(`🛒 ${totalOrders} commandes (sans DRAFT), valeur totale: ${totalOrdersValue._sum?.total || 0} CHF`)
    
    // --- ÉTAPE 3: Statistiques des produits ---
    console.log("📦 Calcul des statistiques produits...")
    
    const [totalProducts, productsByType] = await Promise.all([
      prisma.product.count(),
      
      prisma.product.groupBy({
        by: ['type'],
        _count: {
          id: true
        }
      })
    ])
    
    console.log(`📦 ${totalProducts} produits au total`)
    
    // --- ÉTAPE 4: Top produits avec calcul optimisé ---
    console.log("🏆 Calcul du top des produits...")
    
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
    })
    
    // Enrichir les données des produits de manière optimisée
    const topProductsWithDetails = await Promise.all(
      topProductsRaw
        .filter(item => item._sum.quantity && item._sum.quantity > 0)
        .map(async (item) => {
          // Récupérer les détails du produit
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { 
              id: true,
              name: true, 
              type: true,
              unit: true 
            }
          })
          
          if (!product) return null
          
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
          })
          
          return {
            id: item.productId,
            name: product.name,
            type: product.type,
            unit: product.unit,
            totalQuantity: item._sum.quantity!,
            totalOrders: uniqueOrders,
            orderItems: item._count.id
          }
        })
    )
    
    const topProducts = topProductsWithDetails
      .filter(Boolean)
      .slice(0, 5)
    
    console.log(`🏆 Top 5 produits calculé`)
    
    // --- ÉTAPE 5: Commandes par type de produit ---
    console.log("📊 Calcul des commandes par type de produit...")
    
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
      }
    })
    
    // Regrouper par type de produit de manière optimisée
    const productTypes = await prisma.product.findMany({
      where: {
        id: {
          in: ordersByProductTypeRaw.map(item => item.productId)
        }
      },
      select: {
        id: true,
        type: true
      }
    })
    
    const ordersByProductTypeMap: Record<string, number> = {}
    
    ordersByProductTypeRaw.forEach(item => {
      const product = productTypes.find(p => p.id === item.productId)
      const productType = product?.type || 'Inconnu'
      
      if (!ordersByProductTypeMap[productType]) {
        ordersByProductTypeMap[productType] = 0
      }
      
      ordersByProductTypeMap[productType] += item._count.id
    })
    
    const ordersByProductTypeArray = Object.entries(ordersByProductTypeMap).map(([type, count]) => ({
      type,
      count
    }))
    
    // --- ÉTAPE 6: Ventes mensuelles (SANS les DRAFT) ---
    console.log("📈 Calcul des ventes mensuelles...")
    
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
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
    })
    
    const salesByMonthMap: Record<string, number> = {}
    
    orders.forEach(order => {
      const date = new Date(order.createdAt)
      const month = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      
      if (!salesByMonthMap[month]) {
        salesByMonthMap[month] = 0
      }
      
      salesByMonthMap[month] += order.total
    })
    
    const salesByMonth = Object.entries(salesByMonthMap).map(([month, value]) => ({
      month,
      value
    }))
    
    console.log(`📈 Ventes calculées pour ${Object.keys(salesByMonthMap).length} mois`)
    
    // --- ÉTAPE 7: Réponse finale sécurisée ---
    const response = {
      users: {
        total: totalUsers,
        byRole: usersByRole.map(item => ({
          role: item.role,
          count: item._count.id
        })),
        newUsers
      },
      orders: {
        total: totalOrders,
        byStatus: ordersByStatus.map(item => ({
          status: item.status,
          count: item._count.id
        })),
        newOrders,
        totalValue: totalOrdersValue._sum?.total || 0
      },
      products: {
        total: totalProducts,
        byType: productsByType.map(item => ({
          type: item.type,
          count: item._count.id
        })),
        topProducts: topProducts
      },
      ordersByProductType: ordersByProductTypeArray,
      salesByMonth,
      generatedAt: new Date().toISOString()
    }
    
    console.log(`✅ Statistiques générées avec succès`)
    return NextResponse.json(response)
    
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des statistiques:", error)
    throw error
  }
})