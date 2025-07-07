// app/api/admin/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAdminSecurity } from "@/lib/api-security"

export const GET = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraire l'ID de la commande depuis l'URL
    const url = new URL(request.url)
    const orderId = url.pathname.split('/').slice(-1)[0]

    if (!orderId) {
      return NextResponse.json(
        { error: 'ID de commande manquant', code: 'MISSING_ORDER_ID' },
        { status: 400 }
      )
    }

    // Récupérer la commande avec la facture actualisée
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
        // Inclure la facture avec toutes ses informations de paiement
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
      return NextResponse.json(
        { error: 'Commande non trouvée', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Détecter automatiquement le statut de paiement actuel
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

    // Mettre à jour le statut de la commande si nécessaire
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

    // Ajouter les informations de paiement à la réponse
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
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération de la commande', 
        code: 'INTERNAL_SERVER_ERROR',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error instanceof Error ? error.message : 'Erreur inconnue' 
        })
      },
      { status: 500 }
    )
  }
})