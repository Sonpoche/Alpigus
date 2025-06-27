// app/api/admin/orders/[id]/route.ts - CORRECTION pour afficher le statut de paiement correct
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

    // ✅ CORRECTION: Récupérer la commande avec la facture actualisée
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
        // ✅ CORRECTION: Inclure la facture avec toutes ses informations de paiement
        invoice: {
          select: {
            id: true,
            amount: true,
            status: true,
            dueDate: true,
            createdAt: true,
            paidAt: true,
            paymentMethod: true
          }
        }
      }
    })

    if (!order) {
      return new NextResponse("Commande introuvable", { status: 404 })
    }

    // ✅ CORRECTION: Détecter automatiquement le statut de paiement actuel
    let actualPaymentStatus = order.status
    let paymentInfo = null

    // Si une facture existe, utiliser son statut pour déterminer le vrai statut de paiement
    if (order.invoice) {
      if (order.invoice.status === 'PAID') {
        actualPaymentStatus = 'INVOICE_PAID'
        paymentInfo = {
          paidAt: order.invoice.paidAt,
          paymentMethod: order.invoice.paymentMethod,
          amount: order.invoice.amount
        }
      } else if (order.invoice.status === 'OVERDUE') {
        actualPaymentStatus = 'INVOICE_OVERDUE'
      } else {
        actualPaymentStatus = 'INVOICE_PENDING'
      }
    }

    // ✅ CORRECTION: Mettre à jour le statut de la commande si nécessaire
    if (actualPaymentStatus !== order.status) {
      console.log(`Mise à jour du statut de la commande ${orderId}: ${order.status} → ${actualPaymentStatus}`)
      
      await prisma.order.update({
        where: { id: orderId },
        data: { status: actualPaymentStatus }
      })
    }

    // Extraire les notes d'administration des métadonnées
    const metadata = order.metadata ? JSON.parse(order.metadata) : {}
    const adminNotes = metadata.adminNotes || []

    // ✅ CORRECTION: Ajouter les informations de paiement à la réponse
    const orderWithNotes = {
      ...order,
      status: actualPaymentStatus, // Utiliser le statut actualisé
      paymentInfo, // Ajouter les infos de paiement
      adminNotesHistory: adminNotes.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      // Extraire d'autres informations utiles des métadonnées
      deliveryInfo: metadata.deliveryInfo || null
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