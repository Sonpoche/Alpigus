// app/api/admin/orders/[id]/route.ts - Mise à jour pour inclure les notes

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'ADMIN') {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    const orderId = context.params.id

    // Récupérer la commande avec tous ses détails
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true
          }
        },
        items: {
          include: {
            product: {
              include: {
                producer: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                      }
                    }
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
                      include: {
                        user: {
                          select: {
                            id: true,
                            name: true,
                            email: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        invoice: true
      }
    })

    if (!order) {
      return new NextResponse("Commande introuvable", { status: 404 })
    }

    // Extraire les notes d'administration des métadonnées
    const metadata = order.metadata ? JSON.parse(order.metadata) : {}
    const adminNotes = metadata.adminNotes || []

    // Ajouter les notes à la réponse
    const orderWithNotes = {
      ...order,
      adminNotesHistory: adminNotes.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      // Extraire d'autres informations utiles des métadonnées
      deliveryInfo: metadata.deliveryInfo || null,
      paymentInfo: metadata.paymentInfo || null
    }

    return NextResponse.json(orderWithNotes)

  } catch (error) {
    console.error("Erreur lors de la récupération de la commande:", error)
    return new NextResponse(
      "Erreur lors de la récupération de la commande", 
      { status: 500 }
    )
  }
}, ["ADMIN"])