// lib/notification-service.ts
import { prisma } from '@/lib/prisma'
import { NotificationType } from '@/types/notification'
import { Order, OrderStatus, Booking, BookingStatus } from '@/types/order'
import fs from 'fs/promises';
import path from 'path';

// Fonction d'aide pour les logs de débogage
async function logDebug(message: string, data?: any): Promise<void> {
  try {
    const logMessage = `[${new Date().toISOString()}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}`;
    await fs.appendFile(
      path.join(process.cwd(), 'debug.log'), 
      logMessage + '\n'
    );
  } catch (error) {
    console.error('Erreur d\'écriture dans le fichier de log:', error);
  }
}

export interface CreateNotificationParams {
  userId: string;
  type: string | NotificationType;
  title: string;
  message: string;
  link?: string;
  data?: any;
}

export class NotificationService {
  // Crée une notification
  static async createNotification({
    userId,
    type,
    title,
    message,
    link,
    data
  }: CreateNotificationParams): Promise<any> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          link,
          data: data ? JSON.stringify(data) : undefined
        }
      });
      
      await logDebug('Notification créée avec succès', { id: notification.id, userId, type });
      return notification;
    } catch (error) {
      await logDebug('Erreur lors de la création de la notification', { error, userId, type });
      throw error;
    }
  }
  
  // Récupère les notifications non lues d'un utilisateur
  static async getUnreadNotifications(userId: string, limit = 10): Promise<any[]> {
    return prisma.notification.findMany({
      where: {
        userId,
        read: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
  }

  // Récupère le nombre de notifications non lues d'un utilisateur
  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        read: false
      }
    });
  }

  // Marque une notification comme lue
  static async markAsRead(notificationId: string): Promise<any> {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    });
  }

  // Marque toutes les notifications d'un utilisateur comme lues
  static async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false
      },
      data: {
        read: true
      }
    });
  }

  // Envoyer une notification pour une nouvelle commande
  static async sendNewOrderNotification(order: Order): Promise<void> {
  try {
    await logDebug("NotificationService: Début envoi notification commande", { orderId: order.id });
    // Récupérer les ID des producteurs impliqués dans cette commande
    const producerIds = new Set<string>();
    
    // Ajouter les producteurs des articles standards
    await logDebug("Items dans la commande:", order.items?.length || 0);
    
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        await logDebug("Traitement item produit:", { 
          productId: item.product?.id,
          productName: item.product?.name
        });
        
        // Si le producer n'est pas inclus dans l'objet, le récupérer séparément
        if (!item.product?.producerId) {
          await logDebug("Producer manquant, tentative de récupération");
          try {
            const product = await prisma.product.findUnique({
              where: { id: item.product.id },
              include: { producer: true }
            });
            
            if (product?.producer?.id) {
              producerIds.add(product.producer.id);
              await logDebug("Producer récupéré et ajouté", { 
                producerId: product.producer.id,
                userId: product.producer.userId
              });
            } else {
              await logDebug("Impossible de trouver le producer pour le produit");
            }
          } catch (e) {
            const err = e as Error;
            await logDebug("Erreur lors de la récupération du producer", { error: err.message });
          }
        } else if (item.product?.producerId) {
          producerIds.add(item.product.producerId);
          await logDebug("Producer ID directement ajouté:", item.product.producerId);
        }
      }
    } else {
      await logDebug("Aucun item dans la commande");
    }
    
    // Ajouter les producteurs des réservations
    await logDebug("Bookings dans la commande:", order.bookings?.length || 0);
    
    if (order.bookings && order.bookings.length > 0) {
      for (const booking of order.bookings) {
        await logDebug("Traitement booking:", {
          slotId: booking.deliverySlot?.id,
          productId: booking.deliverySlot?.product?.id
        });
        
        if (booking.deliverySlot?.product?.producerId) {
          producerIds.add(booking.deliverySlot.product.producerId);
          await logDebug("Producer ID de booking ajouté:", booking.deliverySlot.product.producerId);
        }
      }
    }
    
    await logDebug("Nombre de producteurs à notifier:", producerIds.size);
    await logDebug("Liste des IDs producteurs:", Array.from(producerIds));
    
    const producerIdsArray = Array.from(producerIds);
    
    // Pour chaque producteur, créer une notification
    for (const producerId of producerIdsArray) {
      await logDebug("Traitement du producteur:", producerId);
      
      // Trouver le userId associé au producer
      const producer = await prisma.producer.findUnique({
        where: { id: producerId },
        select: { userId: true }
      });
      
      if (!producer) {
        await logDebug("ERREUR: Producteur non trouvé dans la base de données:", producerId);
        continue;
      }
      
      await logDebug("Producer userId:", producer.userId);
      
      // Calculer le montant total de la commande pour ce producteur
      const producerItems = order.items?.filter(item => 
        item.product?.producerId === producerId
      ) || [];
      
      const producerBookings = order.bookings?.filter(booking => 
        booking.deliverySlot?.product?.producerId === producerId
      ) || [];
      
      const itemsTotal = producerItems.reduce(
        (sum, item) => sum + (item.price * item.quantity), 0
      );
      
      const bookingsTotal = producerBookings.reduce(
        (sum, booking) => {
          const price = booking.price || booking.deliverySlot?.product?.price || 0;
          return sum + (price * booking.quantity);
        }, 0
      );
      
      const total = itemsTotal + bookingsTotal;
      
      await logDebug("Montant total pour ce producteur:", { 
        itemsTotal,
        bookingsTotal,
        total
      });
      
      // Créer la notification avec le format de lien corrigé
      try {
        const truncatedOrderId = order.id.substring(0, 8).toUpperCase();
        const notification = await prisma.notification.create({
          data: {
            userId: producer.userId,
            type: NotificationType.NEW_ORDER,
            title: 'Nouvelle commande reçue',
            message: `Vous avez reçu une nouvelle commande (#${truncatedOrderId}) d'un montant de ${total.toFixed(2)} CHF`,
            link: `/producer/orders`, // Modifié pour simplifier l'URL
            data: JSON.stringify({ orderId: order.id, total })
          }
        });
        
        await logDebug("Notification créée avec ID:", notification.id);
      } catch (e) {
        const createError = e as Error;
        await logDebug("ERREUR lors de la création de la notification:", {
          error: createError.message,
          stack: createError.stack
        });
      }
    }
    
    await logDebug("NotificationService: Fin de l'envoi de notification");
  } catch (e) {
    const error = e as Error;
    await logDebug('Erreur lors de l\'envoi de la notification:', {
      error: error.message,
      stack: error.stack
    });
    console.error('Erreur lors de l\'envoi de la notification:', error);
  }
}
  
  // Envoyer une notification de changement de statut de commande
  static async sendOrderStatusChangeNotification(order: Order, oldStatus: string): Promise<void> {
    try {
      await logDebug("Début notification changement de statut", {
        orderId: order.id,
        oldStatus,
        newStatus: order.status
      });
      
      // Récupérer les ID des producteurs impliqués dans cette commande
      const producerIds = new Set<string>();
      
      // Ajouter les producteurs des articles standards
      order.items?.forEach(item => {
        if (item.product?.producerId) {
          producerIds.add(item.product.producerId);
        }
      });
      
      // Ajouter les producteurs des réservations
      order.bookings?.forEach(booking => {
        if (booking.deliverySlot?.product?.producerId) {
          producerIds.add(booking.deliverySlot.product.producerId);
        }
      });
      
      // Traduire les statuts en français
      const statusTranslations: Record<string, string> = {
        PENDING: 'En attente',
        CONFIRMED: 'Confirmée',
        SHIPPED: 'Expédiée',
        DELIVERED: 'Livrée',
        CANCELLED: 'Annulée',
        INVOICE_PENDING: 'Facture en attente',
        INVOICE_PAID: 'Facture payée'
      };
      
      const producerIdsArray = Array.from(producerIds);
      
      // Pour chaque producteur, créer une notification
      for (const producerId of producerIdsArray) {
        // Trouver le userId associé au producer
        const producer = await prisma.producer.findUnique({
          where: { id: producerId },
          select: { userId: true }
        });
        
        if (!producer) continue;
        
        try {
          // Créer la notification avec le format de lien corrigé
          const notification = await prisma.notification.create({
            data: {
              userId: producer.userId,
              type: NotificationType.ORDER_STATUS_CHANGED,
              title: 'Statut de commande modifié',
              message: `La commande #${order.id.substring(0, 8)} est passée de "${statusTranslations[oldStatus] || oldStatus}" à "${statusTranslations[order.status as string] || order.status}"`,
              link: `/producer/orders?modal=${order.id}`, // Format corrigé
              data: JSON.stringify({ orderId: order.id, oldStatus, newStatus: order.status })
            }
          });
          
          await logDebug("Notification changement statut créée", { id: notification.id });
        } catch (e) {
          const notifError = e as Error;
          await logDebug("Erreur création notification changement statut", {
            error: notifError.message,
            stack: notifError.stack
          });
        }
      }
    } catch (e) {
      const error = e as Error;
      await logDebug('Erreur lors de l\'envoi de la notification de changement de statut:', {
        error: error.message,
        stack: error.stack
      });
      console.error('Erreur lors de l\'envoi de la notification de changement de statut:', error);
    }
  }
  
  // Envoyer une notification d'alerte de stock bas
  static async sendLowStockNotification(productId: string, quantity: number): Promise<void> {
    try {
      await logDebug("Début notification stock bas", { productId, quantity });
      
      // Récupérer les informations du produit et du producteur
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          producer: true
        }
      });
      
      if (!product) {
        await logDebug("Produit non trouvé", { productId });
        return;
      }
      
      try {
        // Créer la notification
        const notification = await prisma.notification.create({
          data: {
            userId: product.producer.userId,
            type: NotificationType.LOW_STOCK,
            title: 'Alerte stock bas',
            message: `Le stock de "${product.name}" est bas (${quantity} ${product.unit} restants)`,
            link: `/producer/${productId}/edit`,
            data: JSON.stringify({ productId, quantity })
          }
        });
        
        await logDebug("Notification stock bas créée", { id: notification.id });
      } catch (e) {
        const notifError = e as Error;
        await logDebug("Erreur création notification stock bas", {
          error: notifError.message,
          stack: notifError.stack
        });
      }
    } catch (e) {
      const error = e as Error;
      await logDebug('Erreur lors de l\'envoi de la notification de stock bas:', {
        error: error.message,
        stack: error.stack
      });
      console.error('Erreur lors de l\'envoi de la notification de stock bas:', error);
    }
  }

  // Envoyer une notification de changement de statut au client
  static async sendOrderStatusToClientNotification(order: Order): Promise<void> {
    try {
      // Vérifier que l'ordre a un utilisateur associé
      if (!order.userId) return;
      
      // Créer un titre et un message appropriés en fonction du statut
      let title = '';
      let message = '';
      
      switch (order.status) {
        case OrderStatus.CONFIRMED:
          title = 'Commande confirmée';
          message = `Votre commande #${order.id.substring(0, 8)} a été confirmée et est en cours de préparation.`;
          break;
        case OrderStatus.SHIPPED:
          title = 'Commande expédiée';
          message = `Votre commande #${order.id.substring(0, 8)} a été expédiée.`;
          break;
        case OrderStatus.DELIVERED:
          title = 'Commande livrée';
          message = `Votre commande #${order.id.substring(0, 8)} a été livrée.`;
          break;
        case OrderStatus.CANCELLED:
          title = 'Commande annulée';
          message = `Votre commande #${order.id.substring(0, 8)} a été annulée.`;
          break;
        case OrderStatus.INVOICE_PAID:
          title = 'Paiement de facture confirmé';
          message = `Le paiement de votre facture pour la commande #${order.id.substring(0, 8)} a été confirmé.`;
          break;
        default:
          return; // Ne pas envoyer de notification pour d'autres statuts
      }
      
      // Créer la notification
      await prisma.notification.create({
        data: {
          userId: order.userId,
          type: NotificationType.ORDER_STATUS_CHANGED,
          title,
          message,
          link: `/orders?view=${order.id}`,
          data: JSON.stringify({ orderId: order.id, status: order.status })
        }
      });
      
      await logDebug("Notification de changement de statut créée pour le client:", order.userId);
    } catch (error) {
      const err = error as Error;
      await logDebug('Erreur lors de l\'envoi de la notification au client:', {
        error: err.message,
        stack: err.stack
      });
      console.error('Erreur lors de l\'envoi de la notification au client:', error);
    }
  }

  // Envoyer une notification de création de facture
  static async sendInvoiceCreatedNotification(order: any, invoice: any): Promise<void> {
    try {
      if (!order.userId) return;
      
      // Créer une notification pour le client
      await prisma.notification.create({
        data: {
          userId: order.userId,
          type: NotificationType.INVOICE_CREATED,
          title: 'Nouvelle facture disponible',
          message: `Votre facture #${invoice.id.substring(0, 8)} d'un montant de ${invoice.amount.toFixed(2)} CHF est à régler avant le ${new Date(invoice.dueDate).toLocaleDateString()}.`,
          link: `/invoices`,
          data: JSON.stringify({ 
            invoiceId: invoice.id, 
            amount: invoice.amount,
            dueDate: invoice.dueDate
          })
        }
      });
      
      // Enregistrer dans les logs
      await logDebug("Notification de création de facture envoyée au client:", {
        userId: order.userId,
        invoiceId: invoice.id
      });
    } catch (error) {
      const err = error as Error;
      await logDebug('Erreur lors de l\'envoi de la notification de facture:', {
        error: err.message,
        stack: err.stack
      });
      console.error('Erreur lors de l\'envoi de la notification de facture:', error);
    }
  }

  // Envoyer un rappel de paiement pour une facture proche de l'échéance
  static async sendInvoiceReminderNotification(invoice: any): Promise<void> {
    try {
      if (!invoice.userId) return;
      
      await prisma.notification.create({
        data: {
          userId: invoice.userId,
          type: NotificationType.INVOICE_REMINDER,
          title: 'Rappel de paiement',
          message: `Votre facture #${invoice.id.substring(0, 8)} d'un montant de ${invoice.amount.toFixed(2)} CHF arrive à échéance le ${new Date(invoice.dueDate).toLocaleDateString()}.`,
          link: `/invoices`,
          data: JSON.stringify({ 
            invoiceId: invoice.id, 
            amount: invoice.amount,
            dueDate: invoice.dueDate
          })
        }
      });
      
      await logDebug("Notification de rappel de facture envoyée:", {
        userId: invoice.userId,
        invoiceId: invoice.id
      });
    } catch (error) {
      const err = error as Error;
      await logDebug('Erreur lors de l\'envoi du rappel de facture:', {
        error: err.message,
        stack: err.stack
      });
      console.error('Erreur lors de l\'envoi du rappel de facture:', error);
    }
  }

  // Notifier quand une facture est passée en retard
  static async sendInvoiceOverdueNotification(invoice: any): Promise<void> {
    try {
      if (!invoice.userId) return;
      
      await prisma.notification.create({
        data: {
          userId: invoice.userId,
          type: NotificationType.INVOICE_OVERDUE,
          title: 'Facture en retard',
          message: `Votre facture #${invoice.id.substring(0, 8)} d'un montant de ${invoice.amount.toFixed(2)} CHF est en retard de paiement. Veuillez la régler dès que possible.`,
          link: `/invoices`,
          data: JSON.stringify({ 
            invoiceId: invoice.id, 
            amount: invoice.amount,
            dueDate: invoice.dueDate
          })
        }
      });
      
      await logDebug("Notification de facture en retard envoyée:", {
        userId: invoice.userId,
        invoiceId: invoice.id
      });
    } catch (error) {
      const err = error as Error;
      await logDebug('Erreur lors de l\'envoi de la notification de facture en retard:', {
        error: err.message,
        stack: err.stack
      });
      console.error('Erreur lors de l\'envoi de la notification de facture en retard:', error);
    }
  }

  // Notifier le producteur quand une facture est payée
  static async sendInvoicePaidToProducerNotification(invoice: any, producer: any): Promise<void> {
    try {
      if (!producer?.userId) return;
      
      await prisma.notification.create({
        data: {
          userId: producer.userId,
          type: NotificationType.INVOICE_PAID,
          title: 'Paiement reçu',
          message: `Le paiement de la commande #${invoice.orderId.substring(0, 8)} d'un montant de ${invoice.amount.toFixed(2)} CHF a été effectué.`,
          link: `/producer/orders?modal=${invoice.orderId}`,
          data: JSON.stringify({ 
            invoiceId: invoice.id, 
            orderId: invoice.orderId,
            amount: invoice.amount
          })
        }
      });
      
      await logDebug("Notification de paiement reçu envoyée au producteur:", {
        userId: producer.userId,
        invoiceId: invoice.id
      });
    } catch (error) {
      const err = error as Error;
      await logDebug('Erreur lors de l\'envoi de la notification de paiement au producteur:', {
        error: err.message,
        stack: err.stack
      });
      console.error('Erreur lors de l\'envoi de la notification de paiement au producteur:', error);
    }
  }

  // Ajouter une méthode pour notifier les clients des réservations de produits frais
  static async sendDeliveryBookingNotification(booking: Booking): Promise<void> {
    try {
      // Vérifier si la réservation a une commande et un utilisateur associés
      if (!booking.orderId) return;
      
      // Récupérer la commande pour avoir l'ID utilisateur
      const order = await prisma.order.findUnique({
        where: { id: booking.orderId }
      });
      
      if (!order || !order.userId) return;
      
      // Récupérer les informations du créneau et du produit
      const deliverySlot = await prisma.deliverySlot.findUnique({
        where: { id: booking.slotId },
        include: {
          product: true
        }
      });
      
      if (!deliverySlot) return;
      
      // Créer la notification
      await prisma.notification.create({
        data: {
          userId: order.userId,
          type: NotificationType.DELIVERY_REMINDER,
          title: 'Livraison réservée',
          message: `Votre réservation de ${booking.quantity} ${deliverySlot.product.unit} de ${deliverySlot.product.name} est confirmée pour le ${new Date(deliverySlot.date).toLocaleDateString()}.`,
          link: `/orders?view=${order.id}`,
          data: JSON.stringify({ 
            bookingId: booking.id, 
            productId: deliverySlot.productId,
            date: deliverySlot.date 
          })
        }
      });
      
      await logDebug("Notification de réservation créée pour le client:", order.userId);
    } catch (error) {
      const err = error as Error;
      await logDebug('Erreur lors de l\'envoi de la notification de réservation:', {
        error: err.message,
        stack: err.stack
      });
      console.error('Erreur lors de l\'envoi de la notification de réservation:', error);
    }
  }

  // Envoyer une notification de rappel administratif
  static async sendAdminReminderNotification(
    userId: string,
    entityType: 'order' | 'invoice',
    entityId: string,
    reminderType: 'payment' | 'action'
  ): Promise<void> {
    try {
      // Déterminer le bon message en fonction du type de rappel
      let title = '';
      let message = '';
      let link = '';
      
      if (entityType === 'order') {
        title = reminderType === 'action' 
          ? 'Rappel concernant une commande' 
          : 'Rappel de paiement';
        
        message = reminderType === 'action'
          ? `Un administrateur a envoyé un rappel concernant la commande #${entityId.substring(0, 8)}.`
          : `Un rappel de paiement a été émis pour votre commande #${entityId.substring(0, 8)}.`;
        
        link = `/orders?view=${entityId}`;
      } else {
        title = 'Rappel de paiement';
        message = `Un rappel a été émis concernant votre facture #${entityId.substring(0, 8)}.`;
        link = `/invoices`;
      }
      
      await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.SYSTEM,
          title,
          message,
          link,
          data: JSON.stringify({ 
            entityType,
            entityId,
            reminderType
          })
        }
      });
      
      await logDebug("Notification de rappel administratif envoyée:", {
        userId,
        entityType,
        entityId
      });
    } catch (error) {
      const err = error as Error;
      await logDebug('Erreur lors de l\'envoi de la notification de rappel administratif:', {
        error: err.message,
        stack: err.stack
      });
      console.error('Erreur lors de l\'envoi de la notification de rappel administratif:', error);
    }
  }
  
  // Notifier le client quand une facture est marquée comme payée
  static async sendInvoicePaidNotification(
    userId: string,
    invoiceId: string,
    orderId: string
  ): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.INVOICE_PAID,
          title: 'Paiement de facture confirmé',
          message: `Le paiement de votre facture #${invoiceId.substring(0, 8)} a été confirmé. Merci pour votre commande !`,
          link: `/orders?view=${orderId}`,
          data: JSON.stringify({ 
            invoiceId,
            orderId
          })
        }
      });
      
      await logDebug("Notification de paiement confirmé envoyée au client:", {
        userId,
        invoiceId
      });
    } catch (error) {
      const err = error as Error;
      await logDebug('Erreur lors de l\'envoi de la notification de paiement confirmé:', {
        error: err.message,
        stack: err.stack
      });
      console.error('Erreur lors de l\'envoi de la notification de paiement confirmé:', error);
    }
  }
}