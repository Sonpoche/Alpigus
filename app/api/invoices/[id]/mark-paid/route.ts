// app/api/invoices/[id]/mark-paid/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schéma de validation pour les paramètres d'URL
const paramsSchema = z.object({
  id: commonSchemas.id
})

// Schéma de validation pour le body (optionnel)
const bodySchema = z.object({
  paymentMethod: z.enum(['manual', 'bank_transfer', 'cash'], {
    errorMap: () => ({ message: 'Méthode de paiement invalide' })
  }).optional().default('manual'),
  notes: z.string().max(500, 'Notes trop longues (max 500 caractères)').optional()
}).optional()

export const POST = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation sécurisée de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const invoiceId = pathSegments[pathSegments.indexOf('invoices') + 1]
    
    const { id } = validateData(paramsSchema, { id: invoiceId })
    
    // 2. Validation du body de la requête (optionnel)
    let bodyData: { paymentMethod?: string; notes?: string } = { paymentMethod: 'manual' }
    try {
      const rawBody = await request.text()
      if (rawBody.trim()) {
        const parsedBody = validateData(bodySchema, JSON.parse(rawBody))
        bodyData = parsedBody || { paymentMethod: 'manual' }
      }
    } catch (bodyError) {
      // Body optionnel, continuer avec les valeurs par défaut
      bodyData = { paymentMethod: 'manual' }
    }
    
    const { paymentMethod = 'manual', notes } = bodyData
    
    console.log(`✅ Marquage facture ${id} comme payée par ${session.user.role} ${session.user.id} via ${paymentMethod}`)
    
    // 3. Récupération de la facture avec toutes les relations nécessaires
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            items: {
              include: {
                product: {
                  include: {
                    producer: {
                      select: {
                        id: true,
                        userId: true,
                        companyName: true
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
                            userId: true,
                            companyName: true
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
      throw createError.notFound("Facture non trouvée")
    }
    
    // 4. Validation du statut de la facture
    if (invoice.status === 'PAID') {
      throw createError.validation("Facture déjà payée")
    }
    
    // 5. Vérifications d'autorisation spécifiques selon le rôle
    if (session.user.role === 'PRODUCER') {
      // Pour les producteurs : vérifier qu'ils ont des produits dans cette commande
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id },
        select: { id: true, companyName: true }
      })
      
      if (!producer) {
        throw createError.notFound("Profil producteur non trouvé")
      }
      
      // Vérifier si ce producteur a des produits dans la commande
      const hasProducerProducts = invoice.order.items.some((item: any) => 
        item.product.producer.id === producer.id
      )
      
      const hasProducerBookings = invoice.order.bookings.some((booking: any) => 
        booking.deliverySlot.product.producer.id === producer.id
      )
      
      if (!hasProducerProducts && !hasProducerBookings) {
        console.warn(`⚠️ Producteur ${session.user.id} tentative marquage facture non autorisée ${id}`)
        throw createError.forbidden("Non autorisé - cette facture ne concerne pas vos produits")
      }
      
      console.log(`🏭 Producteur ${producer.companyName || 'Inconnu'} marque la facture ${id} comme payée`)
    }
    // Les ADMIN peuvent marquer toutes les factures (pas de vérification supplémentaire)
    
    // 6. Mise à jour sécurisée de la facture
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod: paymentMethod,
        // Ajouter les notes dans les métadonnées si fournies
        ...(notes && {
          metadata: JSON.stringify({
            markedPaidBy: session.user.id,
            markedPaidByRole: session.user.role,
            markedPaidAt: new Date().toISOString(),
            notes: notes,
            method: paymentMethod
          })
        })
      }
    })
    
    // 7. Mise à jour du statut de la commande (utiliser la facture originale avec include)
    const existingOrderMetadata = invoice.order.metadata ? JSON.parse(invoice.order.metadata) : {}
    
    await prisma.order.update({
      where: { id: invoice.orderId },
      data: {
        // Mettre à jour le statut si la commande est en attente
        ...(invoice.order.status === 'PENDING' && { status: 'CONFIRMED' }),
        // Enrichir les métadonnées
        metadata: JSON.stringify({
          ...existingOrderMetadata,
          paymentStatus: 'PAID',
          paidAt: new Date().toISOString(),
          markedPaidBy: session.user.id,
          markedPaidByRole: session.user.role,
          paymentMethod: paymentMethod,
          ...(notes && { paymentNotes: notes })
        })
      }
    })
    
    // 8. Notifications sécurisées (non bloquantes)
    try {
      // Notification au client
      if (invoice.order.user) {
        await prisma.notification.create({
          data: {
            userId: invoice.order.user.id,
            type: "INVOICE_PAID",
            title: "💰 Paiement confirmé",
            message: `Votre paiement pour la commande #${invoice.order.id.substring(0, 8)} a été confirmé par ${session.user.role === 'PRODUCER' ? 'le producteur' : 'l\'administrateur'}.`,
            link: `/orders?view=${invoice.order.id}`,
            data: JSON.stringify({ 
              invoiceId: id,
              orderId: invoice.order.id,
              paymentMethod,
              confirmedBy: session.user.role
            })
          }
        })
      }
      
      // Notifications aux producteurs concernés (sauf celui qui a confirmé)
      const producerIds = new Set<string>()
      
      // Collecter les producteurs des articles
      invoice.order.items.forEach((item: any) => {
        if (item.product.producer.userId) {
          producerIds.add(item.product.producer.userId)
        }
      })
      
      // Collecter les producteurs des réservations
      invoice.order.bookings.forEach((booking: any) => {
        if (booking.deliverySlot.product.producer.userId) {
          producerIds.add(booking.deliverySlot.product.producer.userId)
        }
      })
      
      // Envoyer notifications (exclure celui qui a marqué la facture)
      for (const producerId of Array.from(producerIds)) {
        if (producerId !== session.user.id) {
          await prisma.notification.create({
            data: {
              userId: producerId,
              type: "INVOICE_PAID",
              title: "💰 Paiement client confirmé",
              message: `Le paiement pour la commande #${invoice.order.id.substring(0, 8)} a été confirmé${session.user.role === 'PRODUCER' ? ' par un autre producteur' : ' par l\'administrateur'}.`,
              link: `/producer/orders?modal=${invoice.order.id}`,
              data: JSON.stringify({ 
                invoiceId: id,
                orderId: invoice.order.id,
                paymentMethod,
                confirmedBy: session.user.role
              })
            }
          })
        }
      }
      
      console.log(`📧 Notifications envoyées pour confirmation paiement facture ${id}`)
      
    } catch (notificationError) {
      // Ne pas faire échouer l'opération si les notifications échouent
      console.warn("⚠️ Erreur lors de l'envoi des notifications:", notificationError)
    }
    
    // 9. Log d'audit sécurisé
    console.log(`✅ Facture ${id} marquée comme payée par ${session.user.role} ${session.user.id} via ${paymentMethod}`)
    
    // 10. Réponse sécurisée
    return NextResponse.json({
      success: true,
      invoice: {
        id: updatedInvoice.id,
        status: updatedInvoice.status,
        paidAt: updatedInvoice.paidAt,
        paymentMethod: updatedInvoice.paymentMethod,
        amount: updatedInvoice.amount
      },
      message: 'Facture marquée comme payée avec succès'
    })
    
  } catch (error) {
    console.error("❌ Erreur lors du marquage de la facture comme payée:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN'], // Seuls les producteurs et admins peuvent marquer comme payé
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 5,     // 5 tentatives max (action critique)
    window: 60       // par minute
  }
})