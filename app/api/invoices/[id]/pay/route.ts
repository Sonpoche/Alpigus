// app/api/invoices/[id]/pay/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { NotificationService } from '@/lib/notification-service'
import { stripe } from '@/lib/stripe'

export const POST = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      const invoiceId = context.params.id
      const { paymentMethod, stripePaymentIntentId } = await req.json()
      
      // Vérifier que la facture existe et appartient à l'utilisateur
      const invoice = await prisma.invoice.findUnique({
        where: {
          id: invoiceId,
          userId: session.user.id
        },
        include: {
          order: {
            include: {
              user: true,
              items: {
                include: {
                  product: {
                    select: {
                      name: true,
                      unit: true
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
                              userId: true,
                              companyName: true,
                              user: {
                                select: {
                                  name: true
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
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
      
      let finalPaymentStatus = 'PAID'
      let paidAt = new Date()
      
      // Traitement selon la méthode de paiement
      if (paymentMethod === 'card') {
        // Vérification du paiement Stripe
        if (stripePaymentIntentId) {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId)
            
            if (paymentIntent.status !== 'succeeded') {
              return new NextResponse(
                "Le paiement Stripe n'a pas été confirmé",
                { status: 400 }
              )
            }
            
            // Vérifier que le montant correspond
            const expectedAmount = Math.round(invoice.amount * 100) // Convertir en centimes
            if (paymentIntent.amount !== expectedAmount) {
              return new NextResponse(
                "Le montant du paiement ne correspond pas à la facture",
                { status: 400 }
              )
            }
            
            console.log(`Paiement Stripe confirmé: ${stripePaymentIntentId} pour facture ${invoiceId}`)
          } catch (stripeError) {
            console.error("Erreur Stripe:", stripeError)
            return new NextResponse(
              "Erreur lors de la vérification du paiement Stripe",
              { status: 400 }
            )
          }
        } else {
          // Si pas de PaymentIntent fourni, c'est un problème
          return new NextResponse(
            "ID du paiement Stripe manquant",
            { status: 400 }
          )
        }
        
      } else if (paymentMethod === 'bank_transfer') {
        // Pour les virements, le paiement est "confirmé" par le client
        // mais devra être vérifié manuellement côté admin
        console.log(`Virement bancaire confirmé par l'utilisateur pour facture ${invoiceId}`)
        
      } else {
        return new NextResponse("Méthode de paiement non supportée", { status: 400 })
      }
      
      // Mettre à jour la facture
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: finalPaymentStatus,
          paidAt,
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
      
      // Envoyer des notifications
      try {
        // Notification au client - utiliser les données déjà chargées
        if (invoice.order?.user) {
          // Créer un objet ordre simplifié compatible
          const orderForNotification = {
            id: invoice.order.id,
            userId: invoice.order.user.id,
            status: 'INVOICE_PAID' as any,
            total: invoice.amount,
            createdAt: invoice.order.createdAt || new Date(),
            updatedAt: invoice.order.updatedAt || new Date(),
            user: invoice.order.user,
            // Simplifier les items pour éviter les erreurs de type
            items: invoice.order.items?.map(item => ({
              id: item.id,
              orderId: item.orderId,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              product: {
                id: item.productId,
                name: item.product.name,
                unit: item.product.unit,
                image: null,
                producerId: item.productId // Valeur par défaut
              }
            })) || [],
            metadata: null,
            invoice: null,
            bookings: [],
            transactions: [],
            walletTransactions: [],
            platformFee: null
          }
          
          await NotificationService.sendOrderStatusToClientNotification(orderForNotification)
        }
        
        // Notifications aux producteurs concernés
        if (invoice.order?.bookings) {
          const producerIds = new Set<string>()
          
          invoice.order.bookings.forEach(booking => {
            if (booking.deliverySlot.product.producer.userId) {
              producerIds.add(booking.deliverySlot.product.producer.userId)
            }
          })
          
          // Envoyer une notification à chaque producteur
          for (const producerId of Array.from(producerIds)) {
            if (producerId !== session.user.id) {
              await prisma.notification.create({
                data: {
                  userId: producerId,
                  type: "INVOICE_PAID",
                  title: "Paiement client reçu",
                  message: `Le paiement pour la commande #${invoice.order.id.substring(0, 8)} a été confirmé (${paymentMethod === 'card' ? 'Carte bancaire' : 'Virement bancaire'}).`,
                  link: `/producer/orders?modal=${invoice.order.id}`,
                  data: JSON.stringify({ 
                    invoiceId,
                    orderId: invoice.order.id,
                    paymentMethod,
                    amount: invoice.amount
                  })
                }
              })
            }
          }
        }
        
      } catch (notifError) {
        console.error("Erreur notifications:", notifError)
        // Ne pas bloquer le processus si les notifications échouent
      }
      
      // Log pour suivi
      console.log(`Facture ${invoiceId} payée avec succès via ${paymentMethod}`)
      
      return NextResponse.json({
        success: true,
        invoice: updatedInvoice,
        message: paymentMethod === 'card' 
          ? 'Paiement confirmé avec succès'
          : 'Virement confirmé, traitement sous 1-2 jours ouvrés'
      })
      
    } catch (error) {
      console.error("Erreur lors du paiement de la facture:", error)
      return new NextResponse("Erreur serveur", { status: 500 })
    }
  }
)