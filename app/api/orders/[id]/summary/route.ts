// app/api/orders/[id]/summary/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schéma de validation pour les paramètres d'URL
const paramsSchema = z.object({
  id: commonSchemas.id
})

export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const orderId = pathSegments[pathSegments.indexOf('orders') + 1]

    const { id } = validateData(paramsSchema, { id: orderId })

    console.log(`📊 Récupération résumé commande ${id} par ${session.user.role} ${session.user.id}`)

    // 2. Récupération sécurisée de la commande avec toutes les relations nécessaires
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
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
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    unit: true,
                    price: true,
                    producerId: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!order) {
      console.warn(`⚠️ Tentative accès résumé commande inexistante ${id} par user ${session.user.id}`)
      throw createError.notFound("Commande non trouvée")
    }

    // 3. Vérifications d'autorisation selon le rôle
    if (session.user.role === 'CLIENT') {
      // Les clients ne peuvent voir que le résumé de leurs propres commandes
      if (order.userId !== session.user.id) {
        console.warn(`⚠️ Client ${session.user.id} tentative accès résumé non autorisé ${id}`)
        throw createError.forbidden("Non autorisé - Cette commande ne vous appartient pas")
      }
    } 
    else if (session.user.role === 'PRODUCER') {
      // Les producteurs ne peuvent voir que le résumé des commandes contenant leurs produits
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id },
        select: { id: true, companyName: true }
      })

      if (!producer) {
        throw createError.notFound("Profil producteur non trouvé")
      }

      // Vérifier si ce producteur a des produits dans cette commande
      const hasProducts = order.items.some(item => 
        item.product.producerId === producer.id
      )
      
      const hasBookings = order.bookings.some(booking => 
        booking.deliverySlot.product.producerId === producer.id
      )

      if (!hasProducts && !hasBookings) {
        console.warn(`⚠️ Producteur ${session.user.id} tentative accès résumé non autorisé ${id}`)
        throw createError.forbidden("Non autorisé - Vous n'avez pas de produits dans cette commande")
      }

      console.log(`🏭 Producteur ${producer.companyName || 'Inconnu'} accède au résumé commande ${id}`)
    }
    // Les ADMIN peuvent voir tous les résumés (pas de vérification supplémentaire)

    // 4. Création sécurisée du résumé des articles (filtré selon le rôle)
    let cartItems = order.items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        image: item.product.image,
        unit: item.product.unit,
        currentPrice: item.product.price // Prix actuel pour comparaison
      }
    }))

    // 5. Création sécurisée du résumé des réservations
    let bookings = order.bookings
      .filter(booking => booking.status !== 'CANCELLED')
      .map(booking => {
        const price = booking.price || booking.deliverySlot.product.price
        return {
          id: booking.id,
          quantity: booking.quantity,
          price: price,
          subtotal: price * booking.quantity,
          product: {
            id: booking.deliverySlot.product.id,
            name: booking.deliverySlot.product.name,
            image: booking.deliverySlot.product.image,
            unit: booking.deliverySlot.product.unit,
            currentPrice: booking.deliverySlot.product.price
          },
          deliveryDate: booking.deliverySlot.date
        }
      })

    // 6. Filtrage spécifique pour les producteurs
    if (session.user.role === 'PRODUCER') {
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      })

      if (producer) {
        // Filtrer seulement les produits du producteur connecté
        cartItems = cartItems.filter(item => 
          item.product.id && order.items.find(orderItem => 
            orderItem.id === item.id
          )?.product.producerId === producer.id
        )

        bookings = bookings.filter(booking => 
          booking.product.id && order.bookings.find(orderBooking => 
            orderBooking.id === booking.id
          )?.deliverySlot.product.producerId === producer.id
        )
      }
    }

    // 7. Calculs sécurisés des totaux
    const itemsSubtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0)
    const bookingsSubtotal = bookings.reduce((sum, booking) => sum + booking.subtotal, 0)
    const subtotal = itemsSubtotal + bookingsSubtotal

    // 8. Informations de livraison et frais
    let deliveryInfo = { type: 'pickup', fee: 0 }
    try {
      if (order.metadata) {
        const metadata = JSON.parse(order.metadata)
        deliveryInfo = {
          type: metadata.deliveryType || 'pickup',
          fee: metadata.deliveryType === 'delivery' ? 15 : 0
        }
      }
    } catch (error) {
      console.error("Erreur parsing metadata résumé:", error)
    }

    const totalPrice = subtotal + deliveryInfo.fee

    // 9. Détection des changements de prix (sécurité/transparence)
    const priceChanges = [
      ...cartItems.filter(item => item.price !== item.product.currentPrice),
      ...bookings.filter(booking => booking.price !== booking.product.currentPrice)
    ]

    // 10. Création du résumé sécurisé
    const summary = {
      orderId: order.id,
      status: order.status,
      itemCount: cartItems.length + bookings.length,
      items: cartItems,
      bookings: bookings,
      totals: {
        itemsSubtotal,
        bookingsSubtotal,
        subtotal,
        deliveryFee: deliveryInfo.fee,
        total: totalPrice
      },
      delivery: deliveryInfo,
      // Informations de sécurité/transparence
      security: {
        hasPriceChanges: priceChanges.length > 0,
        priceChangesCount: priceChanges.length,
        lastUpdated: order.updatedAt
      },
      // Métadonnées pour l'interface
      meta: {
        currency: 'CHF',
        isEditable: ['DRAFT', 'PENDING'].includes(order.status),
        accessLevel: session.user.role === 'PRODUCER' ? 'filtered' : 'full'
      }
    }

    // 11. Log d'audit sécurisé
    console.log(`📋 Audit - Résumé commande consulté:`, {
      orderId: id,
      userId: session.user.id,
      role: session.user.role,
      itemsCount: cartItems.length,
      bookingsCount: bookings.length,
      totalValue: totalPrice,
      hasPriceChanges: priceChanges.length > 0,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Résumé commande ${id} généré avec succès (${cartItems.length + bookings.length} items, ${totalPrice} CHF)`)

    return NextResponse.json(summary)

  } catch (error) {
    console.error("❌ Erreur génération résumé commande:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'PRODUCER', 'ADMIN'],
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 100, // 100 consultations par minute (usage fréquent)
    window: 60
  }
})