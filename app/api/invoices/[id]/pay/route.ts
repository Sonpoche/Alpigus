// app/api/invoices/[id]/pay/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { NotificationService } from '@/lib/notification-service'
import { OrderStatus } from '@/types/order'

export const POST = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      const invoiceId = context.params.id
      const { paymentMethod } = await req.json()
      
      // Vérifier que la facture existe et appartient à l'utilisateur
      const invoice = await prisma.invoice.findUnique({
        where: {
          id: invoiceId,
          userId: session.user.id
        },
        include: {
          order: true
        }
      })
      
      if (!invoice) {
        return new NextResponse("Facture non trouvée", { status: 404 })
      }
      
      // Vérifier que la facture est en attente ou en retard
      if (invoice.status !== 'PENDING' && invoice.status !== 'OVERDUE') {
        return new NextResponse(
          "Cette facture ne peut pas être payée car son statut est " + invoice.status, 
          { status: 400 }
        )
      }
      
      // Dans une implémentation réelle, ici nous traiterions réellement le paiement
      // via un processeur de paiement comme Stripe
      
      // Marquer la facture comme payée
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentMethod
        },
        include: {
          order: {
            include: {
              items: {
                include: {
                  product: {
                    select: {
                      name: true,
                      unit: true
                    }
                  }
                }
              }
            }
          }
        }
      })
      
      // Pour la notification, récupérer l'ordre complet avec toutes les informations nécessaires
      if (invoice.order) {
        // Récupérer l'utilisateur associé à la commande
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            name: true,
            email: true,
            phone: true
          }
        });
        
        // Récupérer les items et bookings pour la commande
        const orderDetails = await prisma.order.findUnique({
          where: { id: invoice.order.id },
          include: {
            items: {
              include: {
                product: true
              }
            },
            bookings: {
              include: {
                deliverySlot: {
                  include: {
                    product: true
                  }
                }
              }
            }
          }
        });
        
        if (orderDetails && user) {
          const completeOrder = {
            ...orderDetails,
            user,
            status: 'INVOICE_PAID'
          };
          
          // Envoyer la notification avec toutes les données
          await NotificationService.sendOrderStatusToClientNotification(completeOrder);
        }
      }
      
      return NextResponse.json(updatedInvoice)
    } catch (error) {
      console.error("Erreur lors du paiement de la facture:", error)
      return new NextResponse("Erreur serveur", { status: 500 })
    }
  }
)