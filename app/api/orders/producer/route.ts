// app/api/orders/producer/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withProducerSecurity, validateData } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { OrderStatus } from "@prisma/client"
import { z } from "zod"

// Schéma de validation pour les paramètres de requête
const producerOrdersQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus, {
    errorMap: () => ({ message: 'Statut de commande invalide' })
  }).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  sortBy: z.enum(['createdAt', 'status', 'total']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const GET = withProducerSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Validation des paramètres de requête
    const { searchParams } = new URL(request.url)
    const queryParams = {
      status: searchParams.get('status'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    }

    const validatedQuery = validateData(producerOrdersQuerySchema, queryParams)
    const { status, sortBy, sortOrder } = validatedQuery
    const page = validatedQuery.page ?? 1
    const limit = validatedQuery.limit ?? 50

    console.log(`🏭 Récupération commandes producteur par user ${session.user.id} (page: ${page}, limite: ${limit})`)

    // 2. Récupération sécurisée du profil producteur
    const producer = await prisma.producer.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyName: true,
        userId: true
      }
    })

    if (!producer) {
      console.error(`❌ Profil producteur non trouvé pour user ${session.user.id}`)
      throw createError.notFound("Profil producteur non trouvé")
    }

    console.log(`🏭 Producteur ${producer.companyName || 'Inconnu'} (${producer.id}) récupère ses commandes`)

    // 3. Construction sécurisée des filtres de base
    const baseWhere: any = {}

    // Gestion cohérente des statuts DRAFT
    if (status) {
      baseWhere.status = status
    } else {
      // Par défaut, exclure les DRAFT (cohérent avec les autres APIs)
      baseWhere.status = {
        not: OrderStatus.DRAFT
      }
    }

    console.log(`📊 Filtres appliqués:`, { baseWhere, producerId: producer.id })

    // 4. Récupération des commandes contenant les produits du producteur
    const [ordersWithProducerItems, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: {
          AND: [
            // Filtre de statut appliqué en premier
            baseWhere,
            // Puis filtrer par producteur
            {
              OR: [
                // Commandes contenant des articles standard du producteur
                {
                  items: {
                    some: {
                      product: {
                        producerId: producer.id
                      }
                    }
                  }
                },
                // Commandes contenant des réservations de créneaux du producteur
                {
                  bookings: {
                    some: {
                      deliverySlot: {
                        product: {
                          producerId: producer.id
                        }
                      }
                    }
                  }
                }
              ]
            }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          items: {
            include: {
              product: {
                include: {
                  producer: {
                    select: {
                      id: true,
                      companyName: true,
                      userId: true
                    }
                  }
                }
              }
            }
          },
          bookings: {
            include: {
              deliverySlot: {
                include: {
                  product: {
                    include: {
                      producer: {
                        select: {
                          id: true,
                          companyName: true,
                          userId: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          invoice: {
            select: {
              id: true,
              amount: true,
              status: true,
              dueDate: true,
              paidAt: true
            }
          }
        },
        orderBy: sortBy === 'createdAt' ? { createdAt: sortOrder } :
                 sortBy === 'status' ? { status: sortOrder } :
                 sortBy === 'total' ? { total: sortOrder } :
                 { createdAt: sortOrder }, // fallback
        skip: (page - 1) * limit,
        take: limit
      }),

      // Compter le total pour la pagination
      prisma.order.count({
        where: {
          AND: [
            baseWhere,
            {
              OR: [
                {
                  items: {
                    some: {
                      product: {
                        producerId: producer.id
                      }
                    }
                  }
                },
                {
                  bookings: {
                    some: {
                      deliverySlot: {
                        product: {
                          producerId: producer.id
                        }
                      }
                    }
                  }
                }
              ]
            }
          ]
        }
      })
    ])

    console.log(`📊 ${ordersWithProducerItems.length} commandes trouvées (total: ${totalCount})`)

    // 5. Filtrage sécurisé des données pour ne montrer que les produits du producteur
    const ordersWithFilteredItems = ordersWithProducerItems.map(order => {
      // Filtrer les items qui appartiennent au producteur
      const filteredItems = order.items.filter(item => 
        item.product.producerId === producer.id
      )
      
      // Filtrer les bookings qui appartiennent au producteur
      const filteredBookings = order.bookings.filter(booking => 
        booking.deliverySlot.product.producerId === producer.id
      )

      // Calcul sécurisé du sous-total pour ce producteur uniquement
      const producerItemsTotal = filteredItems.reduce(
        (sum, item) => sum + (item.price * item.quantity), 0
      )

      const producerBookingsTotal = filteredBookings.reduce(
        (sum, booking) => {
          const price = booking.price || booking.deliverySlot.product.price
          return sum + (price * booking.quantity)
        }, 0
      )

      const producerTotal = producerItemsTotal + producerBookingsTotal

      // Retourner la commande filtrée avec le total du producteur
      return {
        id: order.id,
        userId: order.userId,
        status: order.status,
        total: producerTotal, // Total spécifique au producteur
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        metadata: order.metadata,
        user: order.user,
        items: filteredItems,
        bookings: filteredBookings,
        invoice: order.invoice
      }
    })

    // 6. Calcul des métriques pour le producteur
    const totalRevenue = ordersWithFilteredItems.reduce((sum, order) => sum + order.total, 0)
    const avgOrderValue = ordersWithFilteredItems.length > 0 ? totalRevenue / ordersWithFilteredItems.length : 0

    // 7. Log d'audit sécurisé
    console.log(`📋 Audit - Commandes producteur consultées:`, {
      producerId: producer.id,
      userId: session.user.id,
      ordersCount: ordersWithFilteredItems.length,
      totalRevenue,
      filters: { status, page, limit },
      timestamp: new Date().toISOString()
    })

    console.log(`✅ ${ordersWithFilteredItems.length} commandes filtrées récupérées pour producteur ${producer.id}`)

    // 8. Réponse sécurisée avec pagination et métriques
    return NextResponse.json({
      orders: ordersWithFilteredItems,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1
      },
      metrics: {
        totalRevenue,
        avgOrderValue,
        ordersCount: ordersWithFilteredItems.length
      },
      producer: {
        id: producer.id,
        companyName: producer.companyName
      }
    })

  } catch (error) {
    console.error("❌ Erreur récupération commandes producteur:", error)
    return handleError(error, request.url)
  }
})