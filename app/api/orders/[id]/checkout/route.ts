// app/api/orders/[id]/checkout/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { OrderStatus } from '@prisma/client'
import { NotificationService } from '@/lib/notification-service'
import { WalletService } from "@/lib/wallet-service"
import { z } from "zod"

// Schéma de validation pour les données de checkout
const checkoutSchema = z.object({
  deliveryType: z.enum(['pickup', 'delivery']),
  deliveryInfo: z.object({
    fullName: z.string().min(1, 'Nom complet requis'),
    company: z.string().optional(),
    address: z.string().min(1, 'Adresse requise'),
    postalCode: z.string().regex(/^\d{4}$/, 'Code postal invalide (format: 1234)'),
    city: z.string().min(1, 'Ville requise'),
    phone: z.string().min(10, 'Numéro de téléphone invalide'),
    notes: z.string().optional()
  }).nullable(),
  paymentMethod: z.enum(['card', 'bank_transfer', 'invoice']),
  paymentStatus: z.enum(['PENDING', 'PAID']).default('PENDING'),
  paymentIntentId: z.string().optional(),
  commission: z.object({
    subtotal: z.number(),
    deliveryFee: z.number(),
    grandTotal: z.number()
  }).optional()
})

export const POST = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraire l'ID de la commande depuis l'URL
    const url = new URL(request.url)
    const orderId = url.pathname.split('/').slice(-2)[0]

    if (!orderId) {
      return NextResponse.json(
        { error: 'ID de commande manquant', code: 'MISSING_ORDER_ID' },
        { status: 400 }
      )
    }

    // Valider l'ID avec Zod
    const validatedId = validateData(commonSchemas.id, orderId)
    
    // Valider les données du body
    const body = await request.json()
    const validatedData = validateData(checkoutSchema, body)
    
    const { deliveryType, deliveryInfo, paymentMethod, paymentStatus } = validatedData
    
    console.log(`Traitement de la commande ${orderId} avec méthode de paiement: ${paymentMethod}`)
    
    // Vérifier que la commande existe et appartient à l'utilisateur
    const order = await prisma.order.findUnique({
      where: { 
        id: validatedId,
        userId: session.user.id
      },
      include: {
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
    })

    if (!order) {
      console.error(`Commande ${orderId} non trouvée`)
      return NextResponse.json(
        { error: 'Commande non trouvée', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Vérification que tous les produits acceptent le paiement différé
    if (paymentMethod === 'invoice') {
      console.log('Vérification du paiement différé pour la commande:', orderId)
      
      // Vérifier chaque produit standard du panier
      const nonDeferredItems = order.items.filter(item => !item.product.acceptDeferred)
      if (nonDeferredItems.length > 0) {
        const productNames = nonDeferredItems.map(item => item.product.name).join(', ')
        console.error('Produits non éligibles au paiement différé:', productNames)
        return NextResponse.json(
          { 
            error: `Les produits suivants n'acceptent pas le paiement sous 30 jours: ${productNames}`,
            code: 'DEFERRED_PAYMENT_NOT_ALLOWED'
          },
          { status: 400 }
        )
      }
      
      // Vérifier aussi les produits des réservations
      const nonDeferredBookings = order.bookings?.filter(
        booking => !booking.deliverySlot.product.acceptDeferred
      ) || []
      
      if (nonDeferredBookings.length > 0) {
        const productNames = nonDeferredBookings.map(booking => booking.deliverySlot.product.name).join(', ')
        console.error('Produits de réservation non éligibles au paiement différé:', productNames)
        return NextResponse.json(
          { 
            error: `Les produits suivants (réservations) n'acceptent pas le paiement sous 30 jours: ${productNames}`,
            code: 'DEFERRED_PAYMENT_NOT_ALLOWED'
          },
          { status: 400 }
        )
      }
      
      console.log('Tous les produits acceptent le paiement différé')
    }

    // Calculer les frais de livraison
    const deliveryFee = deliveryType === 'delivery' ? 15 : 0
    const totalWithDelivery = order.total + deliveryFee

    console.log(`Total de la commande: ${totalWithDelivery} CHF (dont frais de livraison: ${deliveryFee} CHF)`)

    // Effectuer le processus de paiement/confirmation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le statut de la commande
      const updatedOrder = await tx.order.update({
        where: { id: validatedId },
        data: { 
          status: paymentMethod === 'invoice' ? OrderStatus.CONFIRMED : OrderStatus.CONFIRMED,
          total: totalWithDelivery,
          metadata: JSON.stringify({
            deliveryType,
            deliveryInfo: deliveryType === 'delivery' ? deliveryInfo : null,
            paymentMethod,
            paymentStatus
          })
        }
      })
      
      console.log(`Commande ${orderId} mise à jour avec succès au statut ${updatedOrder.status}`)
      
      // 2. Mettre à jour toutes les réservations de TEMPORARY à CONFIRMED
      await tx.booking.updateMany({
        where: {
          orderId: validatedId,
          status: "TEMPORARY"
        },
        data: {
          status: "CONFIRMED",
          expiresAt: null
        }
      })
      
      console.log(`Réservations de la commande ${orderId} confirmées`)
      
      // 3. Si paiement par facture, créer une entrée dans la table Invoice
      if (paymentMethod === 'invoice') {
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 30)
        
        await tx.invoice.create({
          data: {
            orderId: validatedId,
            userId: session.user.id,
            amount: totalWithDelivery,
            status: 'PENDING',
            dueDate
          }
        })
        
        console.log(`Facture créée pour la commande ${orderId}`)
      }
      
      return updatedOrder
    })

    console.log(`Transaction réussie pour la commande ${orderId}`)

    // Récupérer les informations utilisateur nécessaires pour la notification
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        phone: true
      }
    })

    // Envoyer des notifications et mettre à jour le portefeuille
    if (user) {
      const completeOrderData = {
        ...order,
        user,
        status: result.status,
        total: totalWithDelivery
      }

      try {
        console.log(`Envoi des notifications pour la commande ${orderId}`)
        
        // Notification pour les producteurs concernés par la commande
        await NotificationService.sendNewOrderNotification(completeOrderData)
        
        // Si c'est un paiement par facture, envoyer une notification spécifique
        if (paymentMethod === 'invoice') {
          const invoice = await prisma.invoice.findFirst({
            where: { orderId: validatedId }
          })
          
          if (invoice) {
            await NotificationService.sendInvoiceCreatedNotification(completeOrderData, invoice)
            console.log(`Notification de facturation envoyée pour la commande ${orderId}`)
          }
        }
        
        console.log(`Tentative d'ajout des transactions pour la commande ${orderId}`)
        
        try {
          await WalletService.addSaleTransaction(orderId)
          console.log(`Transactions ajoutées avec succès pour la commande ${orderId}`)
        } catch (walletError) {
          console.error(`Erreur lors de l'ajout des transactions pour la commande ${orderId}:`, walletError)
        }
        
      } catch (notifError) {
        console.error("Erreur lors de l'envoi des notifications:", notifError)
      }
    }

    return NextResponse.json({
      message: "Commande confirmée avec succès",
      orderId: validatedId
    })

  } catch (error) {
    console.error("Erreur lors de la confirmation de la commande:", error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la confirmation de la commande',
        code: 'CHECKOUT_ERROR',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error instanceof Error ? error.message : 'Erreur inconnue' 
        })
      },
      { status: 500 }
    )
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'ADMIN'],
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 10,
    window: 60
  }
})