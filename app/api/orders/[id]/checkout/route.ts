// app/api/orders/[id]/checkout/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { OrderStatus } from '@prisma/client'
import { NotificationService } from '@/lib/notification-service'
import { WalletService } from "@/lib/wallet-service"
import fs from 'fs/promises';
import path from 'path';

export const POST = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      const orderId = context.params.id;
      const body = await req.json();
      const { 
        deliveryType, 
        deliveryInfo, 
        paymentMethod, 
        paymentStatus = "PENDING" 
      } = body;
      
      console.log(`Traitement de la commande ${orderId} avec méthode de paiement: ${paymentMethod}`);
      
      // Vérifier que la commande existe et appartient à l'utilisateur
      const order = await prisma.order.findUnique({
        where: { 
          id: orderId,
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
      });

      if (!order) {
        console.error(`Commande ${orderId} non trouvée`);
        return new NextResponse("Commande non trouvée", { status: 404 });
      }

      // AJOUT: Vérification que tous les produits acceptent le paiement différé
      if (paymentMethod === 'invoice') {
        // Vérifier chaque produit standard du panier
        const nonDeferredProduct = order.items.find(item => !item.product.acceptDeferred);
        if (nonDeferredProduct) {
          return new NextResponse(
            `Le produit ${nonDeferredProduct.product.name} n'accepte pas le paiement sous 30 jours`, 
            { status: 400 }
          );
        }
        
        // Vérifier aussi les produits des réservations
        const nonDeferredBooking = order.bookings.find(
          booking => !booking.deliverySlot.product.acceptDeferred
        );
        if (nonDeferredBooking) {
          return new NextResponse(
            `Le produit ${nonDeferredBooking.deliverySlot.product.name} n'accepte pas le paiement sous 30 jours`, 
            { status: 400 }
          );
        }
      }

      // Calculer les frais de livraison
      const deliveryFee = deliveryType === 'delivery' ? 15 : 0;
      const totalWithDelivery = order.total + deliveryFee;

      console.log(`Total de la commande: ${totalWithDelivery} CHF (dont frais de livraison: ${deliveryFee} CHF)`);

      // Effectuer le processus de paiement/confirmation
      const result = await prisma.$transaction(async (tx) => {
        // 1. Mettre à jour le statut de la commande de DRAFT à PENDING ou CONFIRMED selon méthode de paiement
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { 
            // Si paiement par facture, passer directement à CONFIRMED, sinon à PENDING
            status: paymentMethod === 'invoice' ? OrderStatus.CONFIRMED : OrderStatus.CONFIRMED, // En mode test, on passe directement à CONFIRMED
            total: totalWithDelivery,
            // Ajouter les informations additionnelles avec le nouveau format
            metadata: JSON.stringify({
              deliveryType,
              deliveryInfo: deliveryType === 'delivery' ? deliveryInfo : null,
              paymentMethod,
              paymentStatus
            })
          }
        });
        
        console.log(`Commande ${orderId} mise à jour avec succès au statut ${updatedOrder.status}`);
        
        // 2. Mettre à jour toutes les réservations de TEMPORARY à CONFIRMED
        await tx.booking.updateMany({
          where: {
            orderId: orderId,
            status: "TEMPORARY"
          },
          data: {
            status: "CONFIRMED",
            expiresAt: null // Supprimer la date d'expiration
          }
        });
        
        console.log(`Réservations de la commande ${orderId} confirmées`);
        
        // 3. Si paiement par facture, créer une entrée dans la table Invoice
        if (paymentMethod === 'invoice') {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30); // Échéance à 30 jours
          
          await tx.invoice.create({
            data: {
              orderId,
              userId: session.user.id,
              amount: totalWithDelivery,
              status: 'PENDING',
              dueDate
            }
          });
          
          console.log(`Facture créée pour la commande ${orderId}`);
        }
        
        return updatedOrder;
      });

      console.log(`Transaction réussie pour la commande ${orderId}`);

      // Récupérer les informations utilisateur nécessaires pour la notification
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          email: true,
          phone: true
        }
      });

      // S'assurer que user n'est pas null avant d'envoyer la notification
      if (user) {
        // Construire un objet complet pour les notifications
        const completeOrderData = {
          ...order,
          user,
          status: result.status,
          total: totalWithDelivery
        };

        // Envoyer des notifications et mettre à jour le portefeuille
        try {
          console.log(`Envoi des notifications pour la commande ${orderId}`);
          
          // Notification pour les producteurs concernés par la commande
          await NotificationService.sendNewOrderNotification(completeOrderData);
          
          // Si c'est un paiement par facture, envoyer une notification spécifique
          if (paymentMethod === 'invoice') {
            // Récupérer la facture créée
            const invoice = await prisma.invoice.findFirst({
              where: { orderId }
            });
            
            if (invoice) {
              await NotificationService.sendInvoiceCreatedNotification(completeOrderData, invoice);
              console.log(`Notification de facturation envoyée pour la commande ${orderId}`);
            }
          }
          
          console.log(`Tentative d'ajout des transactions pour la commande ${orderId}`);
          
          try {
            // Ajouter les transactions - elles sont en statut PENDING jusqu'à livraison
            await WalletService.addSaleTransaction(orderId);
            console.log(`Transactions ajoutées avec succès pour la commande ${orderId}`);
          } catch (walletError) {
            console.error(`Erreur lors de l'ajout des transactions pour la commande ${orderId}:`, walletError);
          }
          
        } catch (notifError) {
          // Log l'erreur mais continuer le processus
          console.error("Erreur lors de l'envoi des notifications:", notifError);
        }
      }

      return NextResponse.json({
        message: "Commande confirmée avec succès",
        orderId: orderId
      });
    } catch (error) {
      console.error("Erreur lors de la confirmation de la commande:", error);
      return new NextResponse(
        "Erreur lors de la confirmation de la commande",
        { status: 500 }
      );
    }
  },
  ["CLIENT"]
)