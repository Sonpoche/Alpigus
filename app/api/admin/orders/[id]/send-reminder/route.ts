// app/api/admin/orders/[id]/send-reminder/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { EmailService } from "@/lib/email-service"
import { NotificationService } from '@/lib/notification-service'
import { OrderStatus } from '@/types/order'
import { createError } from "@/lib/error-handler"

export const POST = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID de commande
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const orderId = pathParts[pathParts.indexOf('orders') + 1]
    
    if (!orderId || !orderId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de commande invalide")
    }
    
    console.log(`📧 Admin ${session.user.id} envoie un rappel pour la commande ${orderId}`)
    
    // Récupérer la commande avec les producteurs concernés
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        items: {
          include: {
            product: {
              include: {
                producer: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        email: true,
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        invoice: {
          select: {
            id: true,
            status: true,
            dueDate: true
          }
        }
      }
    })

    if (!order) {
      throw createError.notFound("Commande non trouvée")
    }
    
    // Vérifier que la commande nécessite un rappel
    const reminderNeeded = [
      OrderStatus.PENDING,
      OrderStatus.INVOICE_PENDING,
      OrderStatus.INVOICE_OVERDUE
    ].includes(order.status as any)
    
    if (!reminderNeeded) {
      throw createError.validation(`Cette commande (statut: ${order.status}) ne nécessite pas de rappel`)
    }

    // Récupérer les producteurs uniques impliqués dans cette commande
    const producerIds = new Set(
      order.items.map(item => item.product.producer.id)
    )
    
    const producers = Array.from(producerIds).map(producerId => 
      order.items.find(item => 
        item.product.producer.id === producerId
      )?.product.producer
    ).filter(Boolean)

    console.log(`📧 Envoi de rappels à ${producers.length} producteurs et 1 client`)

    // Envoyer des notifications aux producteurs
    const producerNotifications = await Promise.allSettled(
      producers.map(async producer => {
        if (!producer) return null
        
        // Créer une notification pour le producteur
        await NotificationService.createNotification({
          userId: producer.userId,
          type: 'ORDER_REMINDER',
          title: '📋 Rappel de commande - Action requise',
          message: `Un administrateur vous rappelle de traiter la commande #${order.id.substring(0, 8)}. Statut actuel: ${order.status}`,
          link: `/producer/orders/${order.id}`
        })
        
        // Envoyer un email au producteur
        await EmailService.sendOrderReminder(
          producer.user.email,
          producer.user.name || 'Producteur',
          order.id,
          'producteur'
        )
        
        return producer.id
      })
    )
    
    // Créer une notification pour le client
    let clientNotificationSent = false
    try {
      await NotificationService.createNotification({
        userId: order.user.id,
        type: 'ORDER_STATUS',
        title: '📦 Mise à jour de votre commande',
        message: `Notre équipe suit activement votre commande #${order.id.substring(0, 8)}. Nous vous tiendrons informé des prochaines étapes.`,
        link: `/orders/${order.id}`
      })
      clientNotificationSent = true
    } catch (notifError) {
      console.error('⚠️ Erreur notification client:', notifError)
    }
    
    // Si la commande est liée à une facture impayée, envoyer un rappel spécifique
    let invoiceReminderSent = false
    if (order.status === OrderStatus.INVOICE_PENDING || order.status === OrderStatus.INVOICE_OVERDUE) {
      try {
        const dueDate = order.invoice?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        
        await EmailService.sendInvoiceReminderEmail(
          order.user.email,
          order.user.name || 'Client',
          order.id,
          order.total,
          dueDate
        )
        invoiceReminderSent = true
        console.log(`💰 Rappel de facture envoyé à ${order.user.email}`)
      } catch (emailError) {
        console.error('⚠️ Erreur rappel facture:', emailError)
      }
    }
    
    // Calculer les résultats des envois
    const successfulProducers = producerNotifications.filter(
      result => result.status === 'fulfilled' && result.value
    ).length
    
    const failedProducers = producerNotifications.filter(
      result => result.status === 'rejected'
    ).length
    
    // Enregistrer cette action dans les logs d'administration
    try {
      await prisma.adminLog.create({
        data: {
          action: 'SEND_ORDER_REMINDER',
          entityType: 'ORDER',
          entityId: order.id,
          adminId: session.user.id,
          details: JSON.stringify({
            orderStatus: order.status,
            customerEmail: order.user.email,
            producersCount: producers.length,
            successfulProducers,
            failedProducers,
            clientNotificationSent,
            invoiceReminderSent,
            orderTotal: order.total,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('⚠️ Erreur log admin (non critique):', logError)
    }

    console.log(`✅ Rappels envoyés: ${successfulProducers}/${producers.length} producteurs, client: ${clientNotificationSent}`)

    return NextResponse.json({ 
      success: true,
      results: {
        producersNotified: successfulProducers,
        producersFailed: failedProducers,
        clientNotified: clientNotificationSent,
        invoiceReminderSent,
        totalRecipients: successfulProducers + (clientNotificationSent ? 1 : 0)
      },
      message: `Rappels envoyés avec succès à ${successfulProducers} producteur(s) et ${clientNotificationSent ? '1' : '0'} client`
    })
    
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi du rappel:", error)
    throw error
  }
})