// app/api/invoices/[id]/mark-paid/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { NotificationService } from '@/lib/notification-service'

export const POST = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      const invoiceId = context.params.id;
      
      // Vérifier que la facture existe
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          order: {
            include: {
              user: true,
              items: {
                include: {
                  product: {
                    include: {
                      producer: true
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
                          producer: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
      
      if (!invoice) {
        return new NextResponse("Facture non trouvée", { status: 404 });
      }
      
      // Vérifier les autorisations selon le rôle
      if (session.user.role === 'PRODUCER') {
        const producer = await prisma.producer.findUnique({
          where: { userId: session.user.id }
        });
        
        if (!producer) {
          return new NextResponse("Producteur non trouvé", { status: 404 });
        }
        
        // Vérifier si un des produits dans la commande appartient à ce producteur
        const hasProducerProducts = invoice.order.items.some(item => 
          item.product.producer.id === producer.id
        );
        
        const hasProducerBookings = invoice.order.bookings.some(booking => 
          booking.deliverySlot.product.producer.id === producer.id
        );
        
        if (!hasProducerProducts && !hasProducerBookings) {
          return new NextResponse("Non autorisé", { status: 403 });
        }
      } else if (session.user.role !== 'ADMIN') {
        // Seuls les producteurs concernés et les admins peuvent marquer les factures comme payées
        return new NextResponse("Non autorisé", { status: 403 });
      }
      
      // Mettre à jour la facture
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentMethod: 'manual' // Indique que le paiement a été marqué manuellement
        }
      });
      
      // Mettre à jour également le statut de la commande si nécessaire
      await prisma.order.update({
        where: { id: invoice.orderId },
        data: {
          // Mettre à jour le statut uniquement si la commande est en attente de paiement
          ...(invoice.order.status === 'PENDING' && { status: 'CONFIRMED' }),
          // Stocker l'information de paiement dans les métadonnées
          metadata: JSON.stringify({
            ...JSON.parse(invoice.order.metadata || '{}'),
            paymentStatus: 'PAID',
            paidAt: new Date()
          })
        }
      });
      
      // Envoyer une notification au client
      if (invoice.order.user) {
        try {
          await prisma.notification.create({
            data: {
              userId: invoice.order.user.id,
              type: "INVOICE_PAID",
              title: "Paiement confirmé",
              message: `Votre paiement pour la commande #${invoice.order.id.substring(0, 8)} a été confirmé.`,
              link: `/orders?view=${invoice.order.id}`,
              data: JSON.stringify({ 
                invoiceId,
                orderId: invoice.order.id
              })
            }
          });
        } catch (notifError) {
          console.error("Erreur notification:", notifError);
          // Ne pas bloquer le processus si la notification échoue
        }
      }
      
      // Envoyer également une notification aux producteurs concernés
      try {
        // Collecter les producteurs uniques
        const producerIds = new Set<string>();
        
        invoice.order.items.forEach(item => {
          if (item.product.producer.userId) {
            producerIds.add(item.product.producer.userId);
          }
        });
        
        invoice.order.bookings.forEach(booking => {
          if (booking.deliverySlot.product.producer.userId) {
            producerIds.add(booking.deliverySlot.product.producer.userId);
          }
        });
        
        // Envoyer une notification à chaque producteur
        for (const producerId of Array.from(producerIds)) {
          if (producerId !== session.user.id) { // Ne pas notifier le producteur qui a marqué la facture
            await prisma.notification.create({
              data: {
                userId: producerId,
                type: "INVOICE_PAID",
                title: "Paiement client reçu",
                message: `Le paiement pour la commande #${invoice.order.id.substring(0, 8)} a été confirmé.`,
                link: `/producer/orders?modal=${invoice.order.id}`,
                data: JSON.stringify({ 
                  invoiceId,
                  orderId: invoice.order.id
                })
              }
            });
          }
        }
      } catch (notifError) {
        console.error("Erreur notification producteurs:", notifError);
        // Ne pas bloquer le processus si les notifications échouent
      }
      
      return NextResponse.json({
        success: true,
        invoice: updatedInvoice
      });
    } catch (error) {
      console.error("Erreur lors du marquage de la facture comme payée:", error);
      return new NextResponse("Erreur lors du traitement", { status: 500 });
    }
  },
  ["PRODUCER", "ADMIN"] // Seuls les producteurs et les admins peuvent accéder à cette route
);