// app/api/products/[id]/stats/route.ts - Version sécurisée (PRODUCTEUR SEULEMENT)
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { createError } from "@/lib/error-handler"

export const GET = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID produit
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const productId = pathParts[pathParts.indexOf('products') + 1]
    
    if (!productId || !productId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID produit invalide")
    }
    
    console.log(`📊 Producteur ${session.user.id} consulte les stats de son produit ${productId}`)
    
    // Vérifier que le produit existe et appartient au producteur
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        producer: {
          select: {
            id: true,
            userId: true,
            companyName: true
          }
        }
      }
    })

    if (!product) {
      throw createError.notFound("Produit non trouvé")
    }

    // Vérification que le producteur est propriétaire du produit
    if (product.producer.userId !== session.user.id) {
      throw createError.forbidden("Vous ne pouvez consulter que les statistiques de vos propres produits")
    }
    
    console.log(`✅ Producteur accède aux stats de son produit ${product.name}`)
    
    // Récupérer toutes les données nécessaires en parallèle
    const [
      orderItems,
      deliverySlots,
      stockHistory,
      recentBookings
    ] = await Promise.all([
      // Items de commande pour ce produit
      prisma.orderItem.findMany({
        where: { productId },
        include: {
          order: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              user: {
                select: {
                  name: true,
                  // Email masqué pour RGPD
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          id: 'desc'
        },
        take: 100 // Limiter pour les performances
      }),
      
      // Créneaux de livraison
      prisma.deliverySlot.findMany({
        where: { productId },
        include: {
          bookings: {
            select: {
              id: true,
              quantity: true,
              price: true,
              createdAt: true,
              order: {
                select: {
                  user: {
                    select: {
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          date: 'desc'
        }
      }),
      
      // Historique des stocks
      prisma.stock.findUnique({
        where: { productId },
        select: {
          quantity: true,
          updatedAt: true
        }
      }),
      
      // Réservations récentes
      prisma.booking.findMany({
        where: {
          deliverySlot: {
            productId
          }
        },
        include: {
          deliverySlot: {
            select: {
              date: true
            }
          },
          order: {
            select: {
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20
      })
    ])

    // Calculer les statistiques de vente
    const totalOrderItems = orderItems.length
    const totalQuantitySold = orderItems.reduce(
      (sum: number, item: any) => sum + item.quantity, 
      0
    )
    
    const totalRevenue = orderItems.reduce(
      (sum: number, item: any) => sum + (item.price * item.quantity), 
      0
    )
    
    const avgOrderValue = totalOrderItems > 0 ? totalRevenue / totalOrderItems : 0
    const avgQuantityPerOrder = totalOrderItems > 0 ? totalQuantitySold / totalOrderItems : 0

    // Statistiques des créneaux de livraison
    const totalDeliverySlots = deliverySlots.length
    const upcomingDeliverySlots = deliverySlots.filter(
      slot => new Date(slot.date) > new Date()
    ).length
    
    const totalBookings = deliverySlots.reduce(
      (sum, slot) => sum + slot.bookings.length, 
      0
    )
    
    const bookedQuantity = deliverySlots.reduce(
      (sum, slot) => sum + slot.bookings.reduce((bookingSum, booking) => bookingSum + booking.quantity, 0),
      0
    )

    // Analyse des ventes par période (6 derniers mois)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const recentOrderItems = orderItems.filter(
      item => new Date(item.order.createdAt) >= sixMonthsAgo
    )

    // Agréger les ventes par mois
    const salesByMonth: { [key: string]: { orders: number, quantity: number, revenue: number } } = {}
    
    recentOrderItems.forEach(item => {
      const month = new Date(item.order.createdAt).toISOString().slice(0, 7) // Format "YYYY-MM"
      
      if (!salesByMonth[month]) {
        salesByMonth[month] = { 
          orders: 0, 
          quantity: 0, 
          revenue: 0 
        }
      }
      
      salesByMonth[month].orders += 1
      salesByMonth[month].quantity += item.quantity
      salesByMonth[month].revenue += item.price * item.quantity
    })
    
    // Convertir en array trié
    const salesByMonthArray = Object.entries(salesByMonth)
      .map(([month, data]) => ({
        month,
        ...data,
        avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Analyse des clients (top 5 avec emails masqués pour RGPD)
    const customerStats: { [key: string]: { orders: number, quantity: number, revenue: number, email: string, name: string } } = {}
    
    orderItems.forEach(item => {
      const customerEmail = item.order.user.email
      const customerName = item.order.user.name || 'Client'
      
      if (!customerStats[customerEmail]) {
        customerStats[customerEmail] = { 
          orders: 0, 
          quantity: 0, 
          revenue: 0,
          email: customerEmail,
          name: customerName
        }
      }
      
      customerStats[customerEmail].orders += 1
      customerStats[customerEmail].quantity += item.quantity
      customerStats[customerEmail].revenue += item.price * item.quantity
    })
    
    const topCustomers = Object.values(customerStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(customer => ({
        ...customer,
        // Masquer l'email pour RGPD (producteurs ne voient pas les emails complets)
        email: `${customer.email.split('@')[0].slice(0, 3)}***@${customer.email.split('@')[1]}`
      }))

    // Statistiques des performances récentes (30 derniers jours)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentPerformance = {
      orders: orderItems.filter(item => new Date(item.order.createdAt) >= thirtyDaysAgo).length,
      revenue: orderItems
        .filter(item => new Date(item.order.createdAt) >= thirtyDaysAgo)
        .reduce((sum, item) => sum + (item.price * item.quantity), 0),
      bookings: recentBookings.filter(booking => new Date(booking.createdAt) >= thirtyDaysAgo).length
    }

    console.log(`📊 Statistiques calculées: ${totalOrderItems} commandes, ${totalQuantitySold} unités, ${Math.round(totalRevenue)}€`)

    const response = {
      product: {
        id: product.id,
        name: product.name,
        type: product.type,
        price: product.price
      },
      sales: {
        totalOrders: totalOrderItems,
        totalQuantitySold,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        avgQuantityPerOrder: Math.round(avgQuantityPerOrder * 100) / 100
      },
      delivery: {
        totalSlots: totalDeliverySlots,
        upcomingSlots: upcomingDeliverySlots,
        totalBookings,
        bookedQuantity
      },
      trends: {
        salesByMonth: salesByMonthArray,
        recentPerformance
      },
      customers: {
        topCustomers, // Emails masqués
        uniqueCustomers: Object.keys(customerStats).length
      },
      inventory: {
        currentStock: stockHistory?.quantity || 0,
        lastStockUpdate: stockHistory?.updatedAt || null
      },
      generatedAt: new Date().toISOString(),
      generatedBy: {
        role: session.user.role,
        isOwner: true // Toujours vrai pour les producteurs
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error("❌ Erreur récupération statistiques produit:", error)
    throw error
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER'], // Seulement les producteurs
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 100,
    window: 60
  }
})