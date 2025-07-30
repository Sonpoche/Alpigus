// app/api/orders/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { OrderStatus } from "@prisma/client"
import { NotificationService } from '@/lib/notification-service'
import { WalletService } from "@/lib/wallet-service"
import { z } from "zod"

// Schéma de validation pour les paramètres d'URL
const paramsSchema = z.object({
  id: commonSchemas.id
})

// Schéma de validation pour le changement de statut
const statusUpdateSchema = z.object({
  status: z.nativeEnum(OrderStatus, {
    errorMap: () => ({ message: 'Statut de commande invalide' })
  })
})

export const PATCH = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const orderId = pathSegments[pathSegments.indexOf('orders') + 1]

    const { id } = validateData(paramsSchema, { id: orderId })

    // 2. Validation des données de mise à jour
    const rawData = await request.json()
    const { status } = validateData(statusUpdateSchema, rawData)

    console.log(`🔄 Mise à jour statut commande ${id} vers ${status} par ${session.user.role} ${session.user.id}`)

    // 3. Récupération sécurisée de la commande avec toutes les relations
    const order = await prisma.order.findUnique({
      where: { id },
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
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    if (!order) {
      console.warn(`⚠️ Tentative mise à jour commande inexistante ${id} par user ${session.user.id}`)
      throw createError.notFound("Commande non trouvée")
    }

    // 4. Vérifications d'autorisation selon le rôle
    if (session.user.role === 'PRODUCER') {
      // Récupérer l'ID du producteur
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id },
        select: { id: true, companyName: true }
      })

      if (!producer) {
        throw createError.notFound("Profil producteur non trouvé")
      }

      // Vérifier si ce producteur a des produits dans cette commande
      const hasProducts = order.items.some(item => 
        item.product.producer.userId === session.user.id
      )

      const hasBookings = order.bookings.some(booking => 
        booking.deliverySlot.product.producer.userId === session.user.id
      )

      if (!hasProducts && !hasBookings) {
        console.warn(`⚠️ Producteur ${session.user.id} tentative modif commande non autorisée ${id}`)
        throw createError.forbidden("Non autorisé - Vous n'avez pas de produits dans cette commande")
      }

      // 5. Validation des transitions d'état pour les producteurs
      const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
        [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
        [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.CANCELLED]: [],
        [OrderStatus.DRAFT]: [],
        [OrderStatus.INVOICE_PENDING]: [],
        [OrderStatus.INVOICE_PAID]: [],
        [OrderStatus.INVOICE_OVERDUE]: []
      }

      if (!validTransitions[order.status].includes(status)) {
        throw createError.validation(
          `Transition de statut invalide: ${order.status} → ${status}`
        )
      }

      console.log(`🏭 Producteur ${producer.companyName || 'Inconnu'} modifie commande ${id}`)
    } 
    else if (session.user.role !== 'ADMIN') {
      throw createError.forbidden("Non autorisé - Seuls les producteurs et admins peuvent modifier le statut")
    }

    // 6. Sauvegarder l'ancien statut pour les notifications
    const oldStatus = order.status

    // 7. Mise à jour sécurisée du statut
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
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
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    console.log(`✅ Statut commande ${id} mis à jour de ${oldStatus} à ${status}`)

    // 8. Notifications sécurisées (non bloquantes)
    try {
      // Notification de changement de statut
      await NotificationService.sendOrderStatusChangeNotification(updatedOrder, oldStatus)
      
      // Notification spécifique au client
      await NotificationService.sendOrderStatusToClientNotification(updatedOrder)
      
      console.log(`📧 Notifications envoyées pour changement statut commande ${id}`)
    } catch (notifError) {
      console.error("⚠️ Erreur notifications (non critique):", notifError)
    }

    // 9. Gestion des transactions wallet selon le nouveau statut
    if (status !== oldStatus) {
      try {
        console.log(`💰 Mise à jour transactions pour commande ${id} passant à ${status}`)
        
        // Si c'est une nouvelle commande confirmée, ajouter les transactions
        if (status === OrderStatus.CONFIRMED && oldStatus === OrderStatus.PENDING) {
          try {
            await WalletService.addSaleTransaction(id)
            console.log(`✅ Transactions ajoutées pour commande ${id}`)
          } catch (walletError) {
            console.error(`❌ Erreur ajout transactions commande ${id}:`, walletError)
          }
        } 
        // Si la commande est livrée, libérer les fonds
        else if (status === OrderStatus.DELIVERED) {
          try {
            await WalletService.updateTransactionsOnOrderStatus(id, status)
            console.log(`✅ Transactions mises à jour pour commande livrée ${id}`)
          } catch (walletError) {
            console.error(`❌ Erreur MAJ wallet commande ${id}:`, walletError)
          }
        }
      } catch (walletError) {
        console.error("❌ Erreur globale wallet:", walletError)
        // Continuer le processus malgré l'erreur
      }
    }

    // 10. Gestion de l'annulation (remise en stock)
    if (status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
      try {
        await handleCancellation(order)
        console.log(`📦 Stock remis à jour pour annulation commande ${id}`)
      } catch (stockError) {
        console.error(`❌ Erreur remise en stock commande ${id}:`, stockError)
      }
    }

    // 11. Log d'audit sécurisé
    console.log(`📋 Audit - Changement statut commande:`, {
      orderId: id,
      oldStatus,
      newStatus: status,
      changedBy: session.user.id,
      changedByRole: session.user.role,
      timestamp: new Date().toISOString()
    })

    // 12. Réponse sécurisée
    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt
      },
      message: `Statut mis à jour de ${oldStatus} à ${status}`
    })

  } catch (error) {
    console.error("❌ Erreur mise à jour statut commande:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN'],
  allowedMethods: ['PATCH'],
  rateLimit: {
    requests: 30, // 30 mises à jour max par minute
    window: 60
  }
})

// Fonction utilitaire pour gérer l'annulation (remise en stock)
async function handleCancellation(order: any) {
  try {
    // 1. Retourner les articles au stock
    for (const item of order.items) {
      await prisma.stock.update({
        where: { productId: item.product.id },
        data: {
          quantity: {
            increment: item.quantity
          }
        }
      })
    }

    // 2. Retourner les réservations au stock et libérer les créneaux
    for (const booking of order.bookings) {
      // Mettre à jour le statut de la réservation
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' }
      })
      
      // Libérer le créneau
      await prisma.deliverySlot.update({
        where: { id: booking.slotId },
        data: {
          reserved: {
            decrement: booking.quantity
          }
        }
      })
      
      // Retourner au stock
      await prisma.stock.update({
        where: { productId: booking.deliverySlot.product.id },
        data: {
          quantity: {
            increment: booking.quantity
          }
        }
      })
    }

    console.log(`📦 Remise en stock terminée pour commande annulée`)
  } catch (error) {
    console.error("❌ Erreur lors de la remise en stock:", error)
    throw error
  }
}