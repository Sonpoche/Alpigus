// lib/wallet-service.ts
import { prisma } from './prisma';
import { OrderStatus } from '@prisma/client';

// Pourcentage de commission de la plateforme
const PLATFORM_FEE_PERCENTAGE = Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE || 10);

export class WalletService {
  /**
   * Crée ou met à jour le portefeuille d'un producteur
   */
  static async ensureWalletExists(producerId: string): Promise<void> {
    // Vérifier si le portefeuille existe déjà
    const wallet = await prisma.wallet.findUnique({
      where: { producerId }
    });

    // Si non, le créer
    if (!wallet) {
      await prisma.wallet.create({
        data: {
          producerId,
          balance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          totalWithdrawn: 0
        }
      });
    }
  }

  /**
   * Ajoute une transaction de vente au portefeuille
   */
  static async addSaleTransaction(orderId: string): Promise<void> {
    console.log(`Début addSaleTransaction pour la commande ${orderId}`);
    
    // Récupérer les détails de la commande
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: { producer: true }
            }
          }
        },
        bookings: {
          include: {
            deliverySlot: {
              include: {
                product: {
                  include: { producer: true }
                }
              }
            }
          }
        }
      }
    });

    if (!order) {
      console.error(`Commande ${orderId} non trouvée`);
      throw new Error('Commande non trouvée');
    }

    console.log(`Statut de la commande ${orderId}: ${order.status}`);
    console.log(`Nombre d'articles: ${order.items.length}`);
    console.log(`Nombre de réservations: ${order.bookings.length}`);

    // Regrouper les montants par producteur
    const producerAmounts: Record<string, {
      amount: number;
      items: { productId: string; quantity: number; price: number }[];
    }> = {};

    // Ajouter les articles standards
    for (const item of order.items) {
      const producerId = item.product.producer.id;
      if (!producerAmounts[producerId]) {
        producerAmounts[producerId] = { amount: 0, items: [] };
      }
      
      const itemAmount = item.price * item.quantity;
      producerAmounts[producerId].amount += itemAmount;
      producerAmounts[producerId].items.push({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.price
      });
    }

    // Ajouter les réservations
    for (const booking of order.bookings) {
      const producerId = booking.deliverySlot.product.producer.id;
      if (!producerAmounts[producerId]) {
        producerAmounts[producerId] = { amount: 0, items: [] };
      }
      
      const price = booking.price || booking.deliverySlot.product.price;
      const bookingAmount = price * booking.quantity;
      producerAmounts[producerId].amount += bookingAmount;
      producerAmounts[producerId].items.push({
        productId: booking.deliverySlot.product.id,
        quantity: booking.quantity,
        price
      });
    }

    console.log(`Nombre de producteurs concernés: ${Object.keys(producerAmounts).length}`);

    // Calcul de la commission totale de la plateforme
    let totalFee = 0;

    // Créer une transaction pour chaque producteur
    for (const [producerId, data] of Object.entries(producerAmounts)) {
      console.log(`Traitement du producteur ${producerId} - Montant: ${data.amount}`);
      
      // S'assurer que le producteur a un portefeuille
      await this.ensureWalletExists(producerId);

      // Récupérer le portefeuille
      const wallet = await prisma.wallet.findUnique({
        where: { producerId }
      });

      if (!wallet) {
        console.error(`Portefeuille non trouvé pour le producteur ${producerId}`);
        throw new Error(`Portefeuille non trouvé pour le producteur ${producerId}`);
      }

      // Calculer la commission de la plateforme
      const fee = (data.amount * PLATFORM_FEE_PERCENTAGE) / 100;
      const netAmount = data.amount - fee;
      totalFee += fee;

      console.log(`Commission: ${fee}, Montant net: ${netAmount}`);

      // Vérifier si une transaction existe déjà pour cette commande et ce portefeuille
      const existingTransaction = await prisma.walletTransaction.findFirst({
        where: {
          walletId: wallet.id,
          orderId: order.id,
          type: 'SALE'
        }
      });

      // Déterminer si le montant doit être dans le solde disponible ou en attente
      // Uniquement disponible si la commande est livrée
      const isDelivered = order.status === OrderStatus.DELIVERED;

      if (existingTransaction) {
        console.log(`Transaction existante trouvée pour la commande ${order.id} et le producteur ${producerId}`);
        
        // Mettre à jour la transaction existante si nécessaire
        if (existingTransaction.amount !== netAmount) {
          await prisma.walletTransaction.update({
            where: { id: existingTransaction.id },
            data: {
              amount: netAmount,
              status: isDelivered ? 'COMPLETED' : 'PENDING'
            }
          });
          console.log(`Transaction mise à jour: ${existingTransaction.id}`);
        }
      } else {
        // Créer une nouvelle transaction
        const transaction = await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            orderId: order.id,
            amount: netAmount,
            status: isDelivered ? 'COMPLETED' : 'PENDING',
            type: 'SALE',
            description: `Vente - Commande #${order.id.substring(0, 8)}`,
            metadata: JSON.stringify({
              items: data.items,
              platformFeePercentage: PLATFORM_FEE_PERCENTAGE,
              fee,
              grossAmount: data.amount,
              netAmount
            })
          }
        });
        console.log(`Nouvelle transaction créée: ${transaction.id}`);
      }
      
      // Mettre à jour le portefeuille
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          pendingBalance: {
            increment: !isDelivered ? netAmount : 0
          },
          balance: {
            increment: isDelivered ? netAmount : 0
          },
          totalEarned: {
            increment: netAmount
          }
        }
      });
      console.log(`Portefeuille mis à jour pour le producteur ${producerId}`);
    }

    // Mettre à jour la commande avec la commission de la plateforme
    await prisma.order.update({
      where: { id: order.id },
      data: {
        platformFee: totalFee
      }
    });

    console.log(`Transaction complétée avec succès pour la commande ${orderId}`);
  }

  /**
   * Met à jour le statut des transactions en fonction du statut de la commande
   */
  static async updateTransactionsOnOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    console.log(`Mise à jour des transactions pour la commande ${orderId} avec statut ${status}`);
    
    // Si la commande n'est pas en statut DELIVERED, on ne fait rien
    if (status !== OrderStatus.DELIVERED) {
      console.log(`Pas de mise à jour du portefeuille tant que la commande n'est pas livrée (${status})`);
      return;
    }
    
    // Récupérer toutes les transactions liées à cette commande
    const transactions = await prisma.walletTransaction.findMany({
      where: {
        orderId,
        status: 'PENDING'
      },
      include: {
        wallet: true
      }
    });

    console.log(`Nombre de transactions à mettre à jour: ${transactions.length}`);

    // Mettre à jour chaque transaction
    for (const transaction of transactions) {
      console.log(`Mise à jour de la transaction ${transaction.id}`);
      
      // Mettre à jour le statut de la transaction
      await prisma.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'COMPLETED'
        }
      });

      // Déplacer le montant de pendingBalance vers balance
      await prisma.wallet.update({
        where: { id: transaction.walletId },
        data: {
          pendingBalance: {
            decrement: transaction.amount
          },
          balance: {
            increment: transaction.amount
          }
        }
      });
      
      console.log(`Transaction ${transaction.id} passée à COMPLETED, montant transféré vers le solde disponible`);
    }
    
    console.log(`Mise à jour des transactions terminée pour la commande ${orderId}`);
  }

  /**
   * Crée une demande de retrait
   */
  static async createWithdrawalRequest(producerId: string, amount: number, bankDetails: any): Promise<any> {
    console.log(`Début createWithdrawalRequest pour le producteur ${producerId}, montant: ${amount}`);
    
    // Vérifier que le producteur a un portefeuille
    const wallet = await prisma.wallet.findUnique({
      where: { producerId }
    });

    if (!wallet) {
      console.error(`Portefeuille non trouvé pour le producteur ${producerId}`);
      throw new Error('Portefeuille non trouvé');
    }

    // Vérifier que le solde disponible est suffisant
    if (wallet.balance < amount) {
      console.error(`Solde disponible insuffisant: ${wallet.balance} < ${amount}`);
      throw new Error('Solde disponible insuffisant. Seul le solde disponible peut être retiré, pas le solde en attente.');
    }

    // Créer la demande de retrait
    const withdrawal = await prisma.withdrawal.create({
      data: {
        walletId: wallet.id,
        amount,
        status: 'PENDING',
        bankDetails: JSON.stringify(bankDetails)
      }
    });
    console.log(`Demande de retrait créée: ${withdrawal.id}`);

    // Créer une transaction correspondante
    const transaction = await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: -amount, // Montant négatif car c'est un débit
        status: 'PENDING',
        type: 'WITHDRAWAL',
        description: `Demande de retrait #${withdrawal.id.substring(0, 8)}`,
        metadata: JSON.stringify({
          withdrawalId: withdrawal.id,
          requestedAt: withdrawal.requestedAt
        })
      }
    });
    console.log(`Transaction de retrait créée: ${transaction.id}`);

    // Mettre à jour le solde en attente
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          decrement: amount
        },
        pendingBalance: {
          increment: amount
        }
      }
    });
    console.log(`Portefeuille mis à jour, balance: -${amount}, pendingBalance: +${amount}`);

    console.log(`Demande de retrait complétée avec succès`);
    return withdrawal;
  }

  /**
   * Traite une demande de retrait (pour les administrateurs)
   */
  static async processWithdrawal(withdrawalId: string, status: 'COMPLETED' | 'REJECTED', note?: string): Promise<void> {
    console.log(`Début processWithdrawal pour la demande ${withdrawalId}, statut: ${status}`);
    
    // Récupérer la demande de retrait
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        wallet: true
      }
    });

    if (!withdrawal) {
      console.error(`Demande de retrait ${withdrawalId} non trouvée`);
      throw new Error('Demande de retrait non trouvée');
    }

    if (withdrawal.status !== 'PENDING') {
      console.error(`Demande ${withdrawalId} déjà traitée avec le statut: ${withdrawal.status}`);
      throw new Error('Cette demande a déjà été traitée');
    }

    // Mettre à jour le statut de la demande
    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status,
        processorNote: note,
        processedAt: new Date()
      }
    });
    console.log(`Statut de la demande ${withdrawalId} mis à jour: ${status}`);

    // Récupérer la transaction associée
    const transaction = await prisma.walletTransaction.findFirst({
      where: {
        walletId: withdrawal.walletId,
        type: 'WITHDRAWAL',
        metadata: { contains: withdrawalId }
      }
    });

    if (transaction) {
      // Mettre à jour le statut de la transaction
      await prisma.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          status: status === 'COMPLETED' ? 'COMPLETED' : 'CANCELLED'
        }
      });
      console.log(`Statut de la transaction ${transaction.id} mis à jour: ${status === 'COMPLETED' ? 'COMPLETED' : 'CANCELLED'}`);
    } else {
      console.warn(`Aucune transaction trouvée pour la demande de retrait ${withdrawalId}`);
    }

    // Mettre à jour le portefeuille
    if (status === 'COMPLETED') {
      // Si le retrait est validé, déduire du solde en attente et incrémenter le total retiré
      await prisma.wallet.update({
        where: { id: withdrawal.walletId },
        data: {
          pendingBalance: {
            decrement: withdrawal.amount
          },
          totalWithdrawn: {
            increment: withdrawal.amount
          }
        }
      });
      console.log(`Retrait validé, pendingBalance: -${withdrawal.amount}, totalWithdrawn: +${withdrawal.amount}`);
    } else {
      // Si le retrait est rejeté, remettre le montant dans le solde disponible
      await prisma.wallet.update({
        where: { id: withdrawal.walletId },
        data: {
          pendingBalance: {
            decrement: withdrawal.amount
          },
          balance: {
            increment: withdrawal.amount
          }
        }
      });
      console.log(`Retrait rejeté, pendingBalance: -${withdrawal.amount}, balance: +${withdrawal.amount}`);
    }
    
    console.log(`Traitement de la demande de retrait terminé`);
  }

  /**
   * Approuve une demande de retrait
   */
  static async approveWithdrawal(withdrawalId: string, reference?: string): Promise<void> {
    console.log(`Approbation de la demande de retrait ${withdrawalId}`);
    await this.processWithdrawal(withdrawalId, 'COMPLETED', reference);
    
    // Récupérer les détails pour les notifications
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        wallet: {
          include: {
            producer: {
              include: { user: true }
            }
          }
        }
      }
    });
    
    // Si le withdrawal existe et a un producteur associé, notifier
    if (withdrawal?.wallet?.producer?.user) {
      // Importer le service de notification ici pour éviter les dépendances circulaires
      const { NotificationService } = require('./notification-service');
      
      // Envoyer une notification au producteur
      await NotificationService.createNotification({
        userId: withdrawal.wallet.producer.user.id,
        type: 'WITHDRAWAL_APPROVED',
        title: 'Retrait approuvé',
        message: `Votre demande de retrait de ${withdrawal.amount} CHF a été approuvée et le virement est en cours.`,
        link: '/producer/wallet',
        data: { withdrawalId, amount: withdrawal.amount }
      });
      console.log(`Notification d'approbation envoyée à l'utilisateur ${withdrawal.wallet.producer.user.id}`);
    }
  }

  /**
   * Rejette une demande de retrait
   */
  static async rejectWithdrawal(withdrawalId: string, reason: string): Promise<void> {
    console.log(`Rejet de la demande de retrait ${withdrawalId}, raison: ${reason}`);
    
    if (!reason || reason.trim() === '') {
      throw new Error('Une raison de rejet est nécessaire');
    }
    
    await this.processWithdrawal(withdrawalId, 'REJECTED', reason);
    
    // Récupérer les détails pour les notifications
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        wallet: {
          include: {
            producer: {
              include: { user: true }
            }
          }
        }
      }
    });
    
    // Si le withdrawal existe et a un producteur associé, notifier
    if (withdrawal?.wallet?.producer?.user) {
      // Importer le service de notification ici pour éviter les dépendances circulaires
      const { NotificationService } = require('./notification-service');
      
      // Envoyer une notification au producteur
      await NotificationService.createNotification({
        userId: withdrawal.wallet.producer.user.id,
        type: 'WITHDRAWAL_REJECTED',
        title: 'Retrait rejeté',
        message: `Votre demande de retrait de ${withdrawal.amount} CHF a été rejetée. Raison: ${reason}`,
        link: '/producer/wallet',
        data: { withdrawalId, amount: withdrawal.amount, reason }
      });
      console.log(`Notification de rejet envoyée à l'utilisateur ${withdrawal.wallet.producer.user.id}`);
    }
  }

  /**
   * Récupère le solde et l'historique des transactions d'un producteur
   */
  static async getProducerWalletDetails(producerId: string): Promise<any> {
    console.log(`Récupération des détails du portefeuille pour le producteur ${producerId}`);
    
    // S'assurer que le producteur a un portefeuille
    await this.ensureWalletExists(producerId);

    // Récupérer le portefeuille avec les transactions et retraits
    const wallet = await prisma.wallet.findUnique({
      where: { producerId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        withdrawals: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });
    
    console.log(`Détails du portefeuille récupérés: balance=${wallet?.balance}, pendingBalance=${wallet?.pendingBalance}`);

    return wallet;
  }
}