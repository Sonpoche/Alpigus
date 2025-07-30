// app/api/orders/[id]/prepare-checkout/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withClientSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { OrderStatus } from "@prisma/client"
import { z } from "zod"

// Schéma de validation pour les paramètres d'URL
const paramsSchema = z.object({
  id: commonSchemas.id
})

// Schéma de validation pour les données de préparation checkout
const prepareCheckoutSchema = z.object({
  deliveryType: z.enum(['pickup', 'delivery'], {
    errorMap: () => ({ message: 'Type de livraison invalide' })
  }),
  deliveryInfo: z.object({
    fullName: z.string().min(1, 'Nom complet requis').max(100, 'Nom trop long'),
    company: z.string().max(100, 'Nom entreprise trop long').optional(),
    address: z.string().min(5, 'Adresse requise').max(500, 'Adresse trop longue'),
    postalCode: z.string().regex(/^\d{4}$/, 'Code postal invalide (format: 1234)'),
    city: z.string().min(1, 'Ville requise').max(100, 'Nom ville trop long'),
    phone: z.string().min(10, 'Numéro de téléphone invalide').max(20, 'Numéro trop long'),
    notes: z.string().max(500, 'Notes trop longues').optional()
  }).nullable(),
  paymentMethod: z.enum(['card', 'bank_transfer', 'invoice'], {
    errorMap: () => ({ message: 'Méthode de paiement invalide' })
  }),
  paymentStatus: z.enum(['PENDING', 'PAID']).default('PENDING')
}).refine((data) => {
  // Si delivery, les infos de livraison sont requises
  if (data.deliveryType === 'delivery') {
    return data.deliveryInfo !== null
  }
  return true
}, {
  message: 'Informations de livraison requises pour la livraison à domicile',
  path: ['deliveryInfo']
})

export const POST = withClientSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const orderId = pathSegments[pathSegments.indexOf('orders') + 1]

    const { id } = validateData(paramsSchema, { id: orderId })

    // 2. Validation des données de préparation
    const rawData = await request.json()
    const { deliveryType, deliveryInfo, paymentMethod, paymentStatus } = validateData(prepareCheckoutSchema, rawData)

    console.log(`🛒 Préparation checkout commande ${id} par user ${session.user.id} (${deliveryType}, ${paymentMethod})`)

    // 3. Récupération sécurisée de la commande avec vérification d'ownership
    const order = await prisma.order.findUnique({
      where: { 
        id,
        userId: session.user.id // SÉCURITÉ CRITIQUE: Vérifier ownership
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                acceptDeferred: true,
                available: true
              }
            }
          }
        },
        bookings: {
          include: {
            deliverySlot: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    acceptDeferred: true,
                    available: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!order) {
      console.warn(`⚠️ Tentative préparation checkout commande non autorisée ${id} par user ${session.user.id}`)
      throw createError.notFound("Commande non trouvée ou non autorisée")
    }

    // 4. Validation du statut de la commande
    const preparableStatuses: OrderStatus[] = [OrderStatus.DRAFT, OrderStatus.PENDING]
    if (!preparableStatuses.includes(order.status as OrderStatus)) {
      throw createError.validation(
        `Impossible de préparer le checkout pour une commande avec le statut: ${order.status}`
      )
    }

    // 5. Validation que la commande contient des items
    if (order.items.length === 0 && order.bookings.length === 0) {
      throw createError.validation("Impossible de préparer le checkout d'une commande vide")
    }

    // 6. Validation des produits (disponibilité)
    const unavailableItems = order.items.filter(item => !item.product.available)
    const unavailableBookings = order.bookings.filter(booking => !booking.deliverySlot.product.available)

    if (unavailableItems.length > 0 || unavailableBookings.length > 0) {
      const unavailableProducts = [
        ...unavailableItems.map(item => item.product.name),
        ...unavailableBookings.map(booking => booking.deliverySlot.product.name)
      ]
      throw createError.validation(
        `Produits non disponibles: ${unavailableProducts.join(', ')}`
      )
    }

    // 7. Validation spécifique pour le paiement différé (invoice)
    if (paymentMethod === 'invoice') {
      console.log(`💳 Vérification éligibilité paiement différé pour commande ${id}`)
      
      // Vérifier chaque produit standard
      const nonDeferredItems = order.items.filter(item => !item.product.acceptDeferred)
      if (nonDeferredItems.length > 0) {
        const productNames = nonDeferredItems.map(item => item.product.name).join(', ')
        throw createError.validation(
          `Les produits suivants n'acceptent pas le paiement sous 30 jours: ${productNames}`
        )
      }
      
      // Vérifier les produits des réservations
      const nonDeferredBookings = order.bookings.filter(
        booking => !booking.deliverySlot.product.acceptDeferred
      )
      
      if (nonDeferredBookings.length > 0) {
        const productNames = nonDeferredBookings.map(booking => booking.deliverySlot.product.name).join(', ')
        throw createError.validation(
          `Les produits suivants (réservations) n'acceptent pas le paiement sous 30 jours: ${productNames}`
        )
      }
      
      console.log(`✅ Tous les produits acceptent le paiement différé`)
    }

    // 8. Calcul sécurisé des frais de livraison
    const deliveryFee = deliveryType === 'delivery' ? 15 : 0
    const totalWithDelivery = order.total + deliveryFee

    // Validation du montant minimum pour éviter les commandes de test
    if (totalWithDelivery < 0.50) {
      throw createError.validation("Montant de commande trop faible (minimum 0.50 CHF)")
    }

    console.log(`💰 Total commande: ${totalWithDelivery} CHF (dont frais livraison: ${deliveryFee} CHF)`)

    // 9. Préparation sécurisée des métadonnées
    const metadata = {
      deliveryType,
      deliveryInfo: deliveryType === 'delivery' ? deliveryInfo : null,
      paymentMethod,
      paymentStatus,
      preparedAt: new Date().toISOString(),
      preparedBy: session.user.id,
      originalTotal: order.total,
      deliveryFee: deliveryFee,
      finalTotal: totalWithDelivery
    }

    // 10. Mise à jour sécurisée de la commande
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { 
        total: totalWithDelivery,
        metadata: JSON.stringify(metadata)
      },
      select: {
        id: true,
        total: true,
        status: true,
        updatedAt: true
      }
    })

    // 11. Log d'audit sécurisé
    console.log(`📋 Audit - Checkout préparé:`, {
      orderId: id,
      userId: session.user.id,
      deliveryType,
      paymentMethod,
      originalTotal: order.total,
      finalTotal: totalWithDelivery,
      deliveryFee,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Checkout préparé avec succès pour commande ${id}`)

    // 12. Réponse sécurisée
    return NextResponse.json({
      success: true,
      message: "Commande préparée avec succès",
      order: {
        id: updatedOrder.id,
        total: updatedOrder.total,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt
      },
      checkout: {
        deliveryType,
        deliveryFee,
        paymentMethod,
        totalWithDelivery
      }
    })

  } catch (error) {
    console.error("❌ Erreur préparation checkout:", error)
    return handleError(error, request.url)
  }
})