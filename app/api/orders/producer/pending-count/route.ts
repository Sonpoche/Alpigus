// app/api/orders/producer/pending-count/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withProducerSecurity } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { OrderStatus } from "@prisma/client"

export const GET = withProducerSecurity(async (request: NextRequest, session) => {
  try {
    console.log(`📊 Comptage commandes en attente pour producteur user ${session.user.id}`)

    // 1. Récupération sécurisée du profil producteur
    const producer = await prisma.producer.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyName: true
      }
    })

    if (!producer) {
      console.error(`❌ Profil producteur non trouvé pour user ${session.user.id}`)
      throw createError.notFound("Profil producteur non trouvé")
    }

    console.log(`🏭 Comptage pour producteur ${producer.companyName || 'Inconnu'} (${producer.id})`)

    // 2. Comptage sécurisé des commandes en attente pour ce producteur uniquement
    const pendingOrdersCount = await prisma.order.count({
      where: {
        // Statuts considérés comme "en attente" pour un producteur
        status: {
          in: [OrderStatus.PENDING, OrderStatus.CONFIRMED]
        },
        // Filtrer par les produits du producteur
        OR: [
          // Commandes contenant des produits standard du producteur
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
    })

    // 3. Comptage détaillé par statut pour plus d'informations
    const [pendingCount, confirmedCount] = await Promise.all([
      prisma.order.count({
        where: {
          status: OrderStatus.PENDING,
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
      }),
      prisma.order.count({
        where: {
          status: OrderStatus.CONFIRMED,
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
      })
    ])

    // 4. Log d'audit sécurisé
    console.log(`📋 Audit - Comptage commandes en attente:`, {
      producerId: producer.id,
      userId: session.user.id,
      totalPending: pendingOrdersCount,
      pendingCount,
      confirmedCount,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ ${pendingOrdersCount} commandes en attente pour producteur ${producer.id}`)

    // 5. Réponse sécurisée avec détails
    return NextResponse.json({ 
      count: pendingOrdersCount,
      details: {
        pending: pendingCount,
        confirmed: confirmedCount
      },
      producer: {
        id: producer.id,
        companyName: producer.companyName
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("❌ Erreur comptage commandes en attente producteur:", error)
    
    // En cas d'erreur, retourner 0 pour éviter de casser l'interface
    // Cette route est probablement utilisée pour des badges de notification
    return NextResponse.json({ 
      count: 0, 
      error: "Erreur lors du comptage",
      timestamp: new Date().toISOString()
    }, { status: 200 })
  }
})