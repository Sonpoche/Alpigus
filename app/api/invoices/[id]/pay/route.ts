// app/api/invoices/[id]/pay/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withClientSecurity } from "@/lib/api-security"
import { validateInput } from "@/lib/validation-schemas"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { NotificationService } from '@/lib/notification-service'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'

// Schéma de validation pour le paiement de facture
const invoicePaymentSchema = z.object({
  paymentMethod: z.enum(['card', 'bank_transfer'], {
    errorMap: () => ({ message: 'Méthode de paiement invalide' })
  }),
  stripePaymentIntentId: z.string().optional()
}).refine((data) => {
  // stripePaymentIntentId requis pour les paiements par carte
  if (data.paymentMethod === 'card') {
    return data.stripePaymentIntentId && data.stripePaymentIntentId.startsWith('pi_')
  }
  return true
}, {
  message: 'ID du paiement Stripe requis et doit commencer par "pi_" pour les paiements par carte',
  path: ['stripePaymentIntentId']
})

export const POST = withClientSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Récupérer les paramètres depuis l'URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const invoiceId = pathParts[pathParts.indexOf('invoices') + 1]
    
    // Validation des paramètres d'URL
    if (!invoiceId || typeof invoiceId !== 'string') {
      throw createError.validation("ID de facture invalide")
    }
    
    // Validation des données d'entrée
    const rawData = await request.json()
    const { paymentMethod, stripePaymentIntentId } = validateInput(invoicePaymentSchema, rawData)
    
    console.log(`🧾 Tentative de paiement facture ${invoiceId} via ${paymentMethod} par user ${session.user.id}`)
    
    // Récupération sécurisée de la facture avec vérification d'ownership
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId: session.user.id // SÉCURITÉ: Vérification que la facture appartient à l'utilisateur
      },
      include: {
        order: {
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
                  select: {
                    id: true,
                    name: true,
                    unit: true,
                    price: true,
                    producerId: true
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
                            userId: true,
                            companyName: true,
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
            }
          }
        }
      }
    })
    
    if (!invoice) {
      throw createError.notFound("Facture non trouvée ou non autorisée")
    }
    
    // Validation du statut de la facture
    const validStatuses = ['PENDING', 'OVERDUE']
    if (!validStatuses.includes(invoice.status)) {
      throw createError.validation(
        `Cette facture ne peut pas être payée. Statut actuel: ${invoice.status}`
      )
    }
    
    // Validation des montants pour éviter la fraude
    if (invoice.amount <= 0) {
      throw createError.validation("Montant de facture invalide")
    }
    
    console.log(`💰 Validation facture: ${invoice.amount} CHF, statut: ${invoice.status}`)
    
    let finalPaymentStatus = 'PAID'
    let paidAt = new Date()
    let paymentVerified = false
    
    // Traitement sécurisé selon la méthode de paiement
    if (paymentMethod === 'card') {
      if (!stripePaymentIntentId) {
        throw createError.validation("ID du paiement Stripe manquant pour le paiement par carte")
      }
      
      try {
        // Vérification sécurisée avec Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId)
        
        console.log(`🔍 Vérification PaymentIntent: ${stripePaymentIntentId}, statut: ${paymentIntent.status}`)
        
        // Validation du statut Stripe
        if (paymentIntent.status !== 'succeeded') {
          throw createError.validation(
            `Paiement Stripe non confirmé. Statut: ${paymentIntent.status}`
          )
        }
        
        // SÉCURITÉ CRITIQUE: Vérification du montant
        const expectedAmount = Math.round(invoice.amount * 100) // Convertir en centimes
        if (paymentIntent.amount !== expectedAmount) {
          throw createError.validation(
            `Montant invalide. Attendu: ${expectedAmount} centimes, reçu: ${paymentIntent.amount} centimes`
          )
        }
        
        // SÉCURITÉ: Vérifier que le paiement correspond à cette facture
        const intentMetadata = paymentIntent.metadata
        if (intentMetadata.invoiceId && intentMetadata.invoiceId !== invoiceId) {
          throw createError.validation("Le paiement ne correspond pas à cette facture")
        }
        
        // SÉCURITÉ: Vérifier que le paiement appartient au bon utilisateur
        if (intentMetadata.userId && intentMetadata.userId !== session.user.id) {
          throw createError.validation("Paiement non autorisé pour cet utilisateur")
        }
        
        paymentVerified = true
        console.log(`✅ Paiement Stripe vérifié: ${stripePaymentIntentId} pour facture ${invoiceId}`)
        
      } catch (stripeError) {
        console.error("❌ Erreur Stripe:", stripeError)
        
        if (stripeError instanceof Error) {
          if (stripeError.message.includes('No such payment_intent')) {
            throw createError.validation("PaymentIntent Stripe introuvable")
          }
          if (stripeError.message.includes('validation')) {
            throw stripeError // Re-lancer nos erreurs de validation
          }
        }
        
        throw createError.internal("Erreur lors de la vérification du paiement Stripe")
      }
      
    } else if (paymentMethod === 'bank_transfer') {
      // Pour les virements, confirmation utilisateur (à vérifier manuellement par admin)
      console.log(`🏦 Virement bancaire déclaré par l'utilisateur pour facture ${invoiceId}`)
      paymentVerified = true
      
    } else {
      throw createError.validation(`Méthode de paiement non supportée: ${paymentMethod}`)
    }
    
    // SÉCURITÉ: Double vérification avant la mise à jour
    if (!paymentVerified) {
      throw createError.internal("Paiement non vérifié, transaction annulée")
    }
    
    // Transaction atomique pour la mise à jour
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      // Mettre à jour la facture
      const invoice = await tx.invoice.update({
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
                      id: true,
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
      
      // Mettre à jour le statut de la commande associée
      await tx.order.update({
        where: { id: invoice.orderId },
        data: { status: 'INVOICE_PAID' }
      })
      
      return invoice
    })
    
    console.log(`✅ Facture ${invoiceId} mise à jour avec succès`)
    
    // Envoi sécurisé des notifications
    try {
      // Notification au client
      if (invoice.order?.user) {
        const orderForNotification = {
          id: invoice.order.id,
          userId: invoice.order.user.id,
          status: 'INVOICE_PAID' as any,
          total: invoice.amount,
          createdAt: invoice.order.createdAt || new Date(),
          updatedAt: invoice.order.updatedAt || new Date(),
          user: invoice.order.user,
          items: invoice.order.items?.map(item => ({
            id: item.id,
            orderId: item.orderId,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            product: {
              id: item.product.id,
              name: item.product.name,
              unit: item.product.unit,
              image: null,
              producerId: item.product.producerId
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
        console.log(`📧 Notification envoyée au client: ${invoice.order.user.email}`)
      }
      
      // Notifications aux producteurs
      if (invoice.order?.bookings && invoice.order.bookings.length > 0) {
        const producerIds = new Set<string>()
        
        invoice.order.bookings.forEach(booking => {
          if (booking.deliverySlot.product.producer.userId) {
            producerIds.add(booking.deliverySlot.product.producer.userId)
          }
        })
        
        // Envoyer une notification à chaque producteur (sauf à soi-même)
        for (const producerId of Array.from(producerIds)) {
          if (producerId !== session.user.id) {
            await prisma.notification.create({
              data: {
                userId: producerId,
                type: "INVOICE_PAID",
                title: "💰 Paiement client reçu",
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
        
        console.log(`📧 Notifications envoyées à ${producerIds.size} producteurs`)
      }
      
    } catch (notifError) {
      console.error("⚠️ Erreur notifications (non critique):", notifError)
      // Ne pas bloquer le processus si les notifications échouent
    }
    
    // Log d'audit final
    console.log(`🎉 Paiement facture terminé avec succès:`, {
      invoiceId,
      userId: session.user.id,
      paymentMethod,
      amount: invoice.amount,
      stripePaymentIntentId: paymentMethod === 'card' ? stripePaymentIntentId : undefined
    })
    
    // Réponse sécurisée (ne pas exposer trop d'informations)
    return NextResponse.json({
      success: true,
      invoice: {
        id: updatedInvoice.id,
        status: updatedInvoice.status,
        paidAt: updatedInvoice.paidAt,
        amount: updatedInvoice.amount
      },
      message: paymentMethod === 'card' 
        ? '✅ Paiement confirmé avec succès'
        : '🏦 Virement confirmé, traitement sous 1-2 jours ouvrés'
    })
    
  } catch (error) {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const invoiceIdForError = pathParts[pathParts.indexOf('invoices') + 1]
    
    console.error("❌ Erreur paiement facture:", {
      invoiceId: invoiceIdForError,
      userId: session.user.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return handleError(error, request.url)
  }
})