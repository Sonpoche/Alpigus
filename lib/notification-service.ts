// lib/notification-service.ts
import { prisma } from '@/lib/prisma'
import { NotificationType } from '@/types/notification'
import { Order, OrderItem, Booking } from '@/types/order'
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

export class NotificationService {
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
              // Correction pour TypeScript: erreur de type unknown
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
      
      // Correction pour TypeScript: convertir en Array
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
        
        // Créer la notification
        try {
          const notification = await prisma.notification.create({
            data: {
              userId: producer.userId,
              type: NotificationType.NEW_ORDER,
              title: 'Nouvelle commande reçue',
              message: `Vous avez reçu une nouvelle commande (#${order.id.substring(0, 8)}) d'un montant de ${total.toFixed(2)} CHF`,
              link: `/producer/orders/${order.id}`,
              data: JSON.stringify({ orderId: order.id, total })
            }
          });
          
          await logDebug("Notification créée avec ID:", notification.id);
        } catch (e) {
          // Correction pour TypeScript: erreur de type unknown
          const createError = e as Error;
          await logDebug("ERREUR lors de la création de la notification:", {
            error: createError.message,
            stack: createError.stack
          });
        }
      }
      
      await logDebug("NotificationService: Fin de l'envoi de notification");
    } catch (e) {
      // Correction pour TypeScript: erreur de type unknown
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
        CANCELLED: 'Annulée'
      };
      
      // Correction pour TypeScript: convertir en Array
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
          // Créer la notification
          const notification = await prisma.notification.create({
            data: {
              userId: producer.userId,
              type: NotificationType.ORDER_STATUS_CHANGED,
              title: 'Statut de commande modifié',
              message: `La commande #${order.id.substring(0, 8)} est passée de "${statusTranslations[oldStatus] || oldStatus}" à "${statusTranslations[order.status as string] || order.status}"`,
              link: `/producer/orders/${order.id}`,
              data: JSON.stringify({ orderId: order.id, oldStatus, newStatus: order.status })
            }
          });
          
          await logDebug("Notification changement statut créée", { id: notification.id });
        } catch (e) {
          // Correction pour TypeScript: erreur de type unknown
          const notifError = e as Error;
          await logDebug("Erreur création notification changement statut", {
            error: notifError.message,
            stack: notifError.stack
          });
        }
      }
    } catch (e) {
      // Correction pour TypeScript: erreur de type unknown
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
            link: `/producer/products/${productId}/edit`,
            data: JSON.stringify({ productId, quantity })
          }
        });
        
        await logDebug("Notification stock bas créée", { id: notification.id });
      } catch (e) {
        // Correction pour TypeScript: erreur de type unknown
        const notifError = e as Error;
        await logDebug("Erreur création notification stock bas", {
          error: notifError.message,
          stack: notifError.stack
        });
      }
    } catch (e) {
      // Correction pour TypeScript: erreur de type unknown
      const error = e as Error;
      await logDebug('Erreur lors de l\'envoi de la notification de stock bas:', {
        error: error.message,
        stack: error.stack
      });
      console.error('Erreur lors de l\'envoi de la notification de stock bas:', error);
    }
  }
}