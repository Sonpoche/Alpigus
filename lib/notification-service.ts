// lib/notification-service.ts
import { prisma } from '@/lib/prisma'
import { NotificationType } from '@/types/notification'
import { Order, OrderItem, Booking } from '@/types/order'

export class NotificationService {
  // Envoyer une notification pour une nouvelle commande
  static async sendNewOrderNotification(order: Order): Promise<void> {
    try {
      // Récupérer les ID des producteurs impliqués dans cette commande
      const producerIds = new Set<string>()
      
      // Ajouter les producteurs des articles standards
      order.items.forEach(item => {
        producerIds.add(item.product.producerId)
      })
      
      // Ajouter les producteurs des réservations
      order.bookings.forEach(booking => {
        producerIds.add(booking.deliverySlot.product.producerId)
      })
      
      // Pour chaque producteur, créer une notification
      for (const producerId of producerIds) {
        // Trouver le userId associé au producer
        const producer = await prisma.producer.findUnique({
          where: { id: producerId },
          select: { userId: true }
        })
        
        if (!producer) continue
        
        // Calculer le montant total de la commande pour ce producteur
        const producerItems = order.items.filter(item => 
          item.product.producerId === producerId
        )
        
        const producerBookings = order.bookings.filter(booking => 
          booking.deliverySlot.product.producerId === producerId
        )
        
        const itemsTotal = producerItems.reduce(
          (sum, item) => sum + (item.price * item.quantity), 0
        )
        
        const bookingsTotal = producerBookings.reduce(
          (sum, booking) => {
            const price = booking.price || booking.deliverySlot.product.price
            return sum + (price * booking.quantity)
          }, 0
        )
        
        const total = itemsTotal + bookingsTotal
        
        // Créer la notification
        await prisma.notification.create({
          data: {
            userId: producer.userId,
            type: NotificationType.NEW_ORDER,
            title: 'Nouvelle commande reçue',
            message: `Vous avez reçu une nouvelle commande (#${order.id.substring(0, 8)}) d'un montant de ${total.toFixed(2)} CHF`,
            link: `/producer/orders/${order.id}`,
            data: { orderId: order.id, total }
          }
        })
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error)
    }
  }
  
  // Envoyer une notification de changement de statut de commande
  static async sendOrderStatusChangeNotification(order: Order, oldStatus: string): Promise<void> {
    try {
      // Récupérer les ID des producteurs impliqués dans cette commande
      const producerIds = new Set<string>()
      
      // Ajouter les producteurs des articles standards
      order.items.forEach(item => {
        producerIds.add(item.product.producerId)
      })
      
      // Ajouter les producteurs des réservations
      order.bookings.forEach(booking => {
        producerIds.add(booking.deliverySlot.product.producerId)
      })
      
      // Traduire les statuts en français
      const statusTranslations: Record<string, string> = {
        PENDING: 'En attente',
        CONFIRMED: 'Confirmée',
        SHIPPED: 'Expédiée',
        DELIVERED: 'Livrée',
        CANCELLED: 'Annulée'
      }
      
      // Pour chaque producteur, créer une notification
      for (const producerId of producerIds) {
        // Trouver le userId associé au producer
        const producer = await prisma.producer.findUnique({
          where: { id: producerId },
          select: { userId: true }
        })
        
        if (!producer) continue
        
        // Créer la notification
        await prisma.notification.create({
          data: {
            userId: producer.userId,
            type: NotificationType.ORDER_STATUS_CHANGED,
            title: 'Statut de commande modifié',
            message: `La commande #${order.id.substring(0, 8)} est passée de "${statusTranslations[oldStatus]}" à "${statusTranslations[order.status]}"`,
            link: `/producer/orders/${order.id}`,
            data: { orderId: order.id, oldStatus, newStatus: order.status }
          }
        })
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error)
    }
  }
  
  // Envoyer une notification d'alerte de stock bas
  static async sendLowStockNotification(productId: string, quantity: number): Promise<void> {
    try {
      // Récupérer les informations du produit et du producteur
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          producer: true
        }
      })
      
      if (!product) return
      
      // Créer la notification
      await prisma.notification.create({
        data: {
          userId: product.producer.userId,
          type: NotificationType.LOW_STOCK,
          title: 'Alerte stock bas',
          message: `Le stock de "${product.name}" est bas (${quantity} ${product.unit} restants)`,
          link: `/producer/products/${productId}/edit`,
          data: { productId, quantity }
        }
      })
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error)
    }
  }
}