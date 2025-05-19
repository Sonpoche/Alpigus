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
      throw new Error('Commande non trouvée');
    }

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

    // Calcul de la commission totale de la plateforme
    let totalFee = 0;

    // Créer une transaction pour chaque producteur
    for (const [producerId, data] of Object.entries(producerAmounts)) {
      // S'assurer que le producteur a un portefeuille
      await this.ensureWalletExists(producerId);

      // Récupérer le portefeuille
      const wallet = await prisma.wallet.findUnique({
        where: { producerId }
      });

      if (!wallet) {
        throw new Error(`Portefeuille non trouvé pour le producteur ${producerId}`);
      }

      // Calculer la commission de la plateforme
      const fee = (data.amount * PLATFORM_FEE_PERCENTAGE) / 100;
      const netAmount = data.amount - fee;
      totalFee += fee;

      // Créer la transaction
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          orderId: order.id,
          amount: netAmount,
          status: order.status === OrderStatus.CONFIRMED ? 'COMPLETED' : 'PENDING',
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

      // Mettre à jour le portefeuille
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          pendingBalance: {
            increment: order.status !== OrderStatus.CONFIRMED ? netAmount : 0
          },
          balance: {
            increment: order.status === OrderStatus.CONFIRMED ? netAmount : 0
          },
          totalEarned: {
            increment: netAmount
          }
        }
      });
    }

    // Mettre à jour la commande avec la commission de la plateforme
    await prisma.order.update({
      where: { id: order.id },
      data: {
        platformFee: totalFee
      }
    });
  }

  /**
   * Met à jour le statut des transactions en attente lors de la confirmation d'une commande
   */
  static async updateTransactionsOnOrderConfirmation(orderId: string): Promise<void> {
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

    // Mettre à jour chaque transaction
    for (const transaction of transactions) {
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
    }
  }

  /**
   * Crée une demande de retrait
   */
  static async createWithdrawalRequest(producerId: string, amount: number, bankDetails: any): Promise<any> {
    // Vérifier que le producteur a un portefeuille
    const wallet = await prisma.wallet.findUnique({
      where: { producerId }
    });

    if (!wallet) {
      throw new Error('Portefeuille non trouvé');
    }

    // Vérifier que le solde est suffisant
    if (wallet.balance < amount) {
      throw new Error('Solde insuffisant');
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

    // Créer une transaction correspondante
    await prisma.walletTransaction.create({
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

    return withdrawal;
  }

  /**
   * Traite une demande de retrait (pour les administrateurs)
   */
  static async processWithdrawal(withdrawalId: string, status: 'COMPLETED' | 'REJECTED', note?: string): Promise<void> {
    // Récupérer la demande de retrait
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        wallet: true
      }
    });

    if (!withdrawal) {
      throw new Error('Demande de retrait non trouvée');
    }

    if (withdrawal.status !== 'PENDING') {
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
    }
  }

  /**
   * Récupère le solde et l'historique des transactions d'un producteur
   */
  static async getProducerWalletDetails(producerId: string): Promise<any> {
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

    return wallet;
  }
}