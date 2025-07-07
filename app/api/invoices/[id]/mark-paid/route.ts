// app/api/invoices/[id]/mark-paid/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schéma de validation pour les paramètres
const paramsSchema = z.object({
  id: z.string().cuid('ID de facture invalide')
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
    // 1. Extraction et validation de l'ID de facture depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const invoiceId = pathSegments[pathSegments.indexOf('invoices') + 1]
    
    const validatedParams = paramsSchema.parse({ id: invoiceId })
    
    // 2. Validation du body de la requête (optionnel)
    let bodyData: { paymentMethod?: string; notes?: string } = { paymentMethod: 'manual' }
    try {
      const rawBody = await request.text()
      if (rawBody.trim()) {
        const parsedBody = bodySchema.parse(JSON.parse(rawBody))
        bodyData = parsedBody || { paymentMethod: 'manual' }
      }
    } catch (bodyError) {
      // Body optionnel, continuer avec les valeurs par défaut
      bodyData = { paymentMethod: 'manual' }
    }
    
    const { paymentMethod = 'manual', notes } = bodyData
    
    // 3. Récupération de la facture avec toutes les relations nécessaires
    const invoice = await prisma.invoice.findUnique({
      where: { id: validatedParams.id },
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
      return NextResponse.json(
        { 
          error: 'Facture non trouvée', 
          code: 'INVOICE_NOT_FOUND' 
        },
        { status: 404 }
      )
    }
    
    // 4. Vérification du statut de la facture
    if (invoice.status === 'PAID') {
      return NextResponse.json(
        { 
          error: 'Facture déjà payée', 
          code: 'ALREADY_PAID' 
        },
        { status: 400 }
      )
    }
    
    // 5. Vérifications d'autorisation spécifiques selon le rôle
    if (session.user.role === 'PRODUCER') {
      // Pour les producteurs : vérifier qu'ils ont des produits dans cette commande
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id },
        select: { id: true, companyName: true }
      })
      
      if (!producer) {
        return NextResponse.json(
          { 
            error: 'Profil producteur non trouvé', 
            code: 'PRODUCER_NOT_FOUND' 
          },
          { status: 404 }
        )
      }
      
      // Vérifier si ce producteur a des produits dans la commande
      const hasProducerProducts = invoice.order.items.some((item: any) => 
        item.product.producer.id === producer.id
      )
      
      const hasProducerBookings = invoice.order.bookings.some((booking: any) => 
        booking.deliverySlot.product.producer.id === producer.id
      )
      
      if (!hasProducerProducts && !hasProducerBookings) {
        return NextResponse.json(
          { 
            error: 'Non autorisé - cette facture ne concerne pas vos produits', 
            code: 'FORBIDDEN_PRODUCER' 
          },
          { status: 403 }
        )
      }
      
      console.log(`🏭 Producteur ${producer.companyName || 'Inconnu'} marque la facture ${invoiceId} comme payée`)
    }
    // Les ADMIN peuvent marquer toutes les factures (pas de vérification supplémentaire)
    
    // 6. Mise à jour de la facture
    const updatedInvoice = await prisma.invoice.update({
      where: { id: validatedParams.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod: paymentMethod,
        // Ajouter les notes dans les métadonnées si fournies
        ...(notes && {
          metadata: JSON.stringify({
            markedPaidBy: session.user.id,
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
          paymentMethod: paymentMethod,
          ...(notes && { paymentNotes: notes })
        })
      }
    })
    
    // 8. Notifications sécurisées (utiliser la facture originale avec include)
    try {
      // Notification au client
      if (invoice.order.user) {
        await prisma.notification.create({
          data: {
            userId: invoice.order.user.id,
            type: "INVOICE_PAID",
            title: "Paiement confirmé",
            message: `Votre paiement pour la commande #${invoice.order.id.substring(0, 8)} a été confirmé.`,
            link: `/orders?view=${invoice.order.id}`,
            data: JSON.stringify({ 
              invoiceId: validatedParams.id,
              orderId: invoice.order.id,
              paymentMethod
            })
          }
        })
      }
      
      // Notifications aux producteurs concernés
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
              title: "Paiement client reçu",
              message: `Le paiement pour la commande #${invoice.order.id.substring(0, 8)} a été confirmé.`,
              link: `/producer/orders?modal=${invoice.order.id}`,
              data: JSON.stringify({ 
                invoiceId: validatedParams.id,
                orderId: invoice.order.id,
                paymentMethod
              })
            }
          })
        }
      }
      
    } catch (notificationError) {
      // Ne pas faire échouer l'opération si les notifications échouent
      console.warn("Erreur lors de l'envoi des notifications:", notificationError)
    }
    
    // 9. Log d'audit sécurisé
    console.log(`✅ Facture ${validatedParams.id} marquée comme payée par ${session.user.role} ${session.user.id} via ${paymentMethod}`)
    
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
    
    // Gestion d'erreur avec validation Zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          code: 'VALIDATION_ERROR',
          details: error.errors
        },
        { status: 400 }
      )
    }
    
    // Gestion d'erreur Prisma
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { 
            error: 'Conflit de données', 
            code: 'CONFLICT_ERROR' 
          },
          { status: 409 }
        )
      }
      
      if (error.message.includes('Record to update not found')) {
        return NextResponse.json(
          { 
            error: 'Facture non trouvée pour mise à jour', 
            code: 'UPDATE_NOT_FOUND' 
          },
          { status: 404 }
        )
      }
    }
    
    // Erreur générique
    return NextResponse.json(
      { 
        error: 'Erreur lors du traitement', 
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error instanceof Error ? error.message : 'Erreur inconnue' 
        })
      },
      { status: 500 }
    )
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN'],
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 5,     // 5 tentatives max (action critique)
    window: 60       // par minute
  }
})