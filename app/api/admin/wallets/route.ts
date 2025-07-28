// app/api/admin/wallets/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"

export const GET = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    console.log(`💼 Admin ${session.user.id} consulte les portefeuilles`)
    
    // D'abord, récupérer tous les producteurs avec leurs informations
    const producers = await prisma.producer.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true
          }
        },
        // Inclure les statistiques de commandes
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Récupérer tous les portefeuilles existants
    const existingWallets = await prisma.wallet.findMany({
      include: {
        // Statistiques des retraits
        withdrawals: {
          select: {
            id: true,
            amount: true,
            status: true,
            requestedAt: true
          },
          orderBy: {
            requestedAt: 'desc'
          },
          take: 3 // Derniers 3 retraits
        },
        // Statistiques des transactions
        _count: {
          select: {
            transactions: true,
            withdrawals: true
          }
        }
      }
    })
    
    // Pour chaque producteur, s'assurer qu'il a un portefeuille ou créer un objet temporaire
    const wallets = await Promise.all(
      producers.map(async (producer) => {
        // Chercher si le portefeuille existe déjà
        let wallet = existingWallets.find(w => w.producerId === producer.id)
        
        // Si le portefeuille n'existe pas, créer un objet temporaire pour l'affichage
        if (!wallet) {
          wallet = {
            id: `temp-${producer.id}`,
            producerId: producer.id,
            balance: 0,
            pendingBalance: 0,
            totalEarned: 0,
            totalWithdrawn: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            withdrawals: [],
            _count: {
              transactions: 0,
              withdrawals: 0
            }
          } as any
        }
        
        // Calculer les statistiques supplémentaires
        const pendingWithdrawals = wallet.id.startsWith('temp-')
          ? 0
          : await prisma.withdrawal.count({
              where: {
                walletId: wallet.id,
                status: 'PENDING'
              }
            })
        
        // Calculer le ratio de performance
        const performanceRatio = wallet.totalEarned > 0 
          ? (wallet.balance / wallet.totalEarned) * 100 
          : 0
        
        // Statut du portefeuille
        let walletStatus = 'active'
        if (wallet.balance === 0 && wallet.totalEarned === 0) {
          walletStatus = 'inactive'
        } else if (pendingWithdrawals > 0) {
          walletStatus = 'pending_withdrawal'
        } else if (wallet.balance < 10) {
          walletStatus = 'low_balance'
        }
        
        // Informations bancaires disponibles
        const hasBankInfo = !!(producer.iban && producer.bankAccountName)
        
        return {
          id: wallet.id,
          balance: wallet.balance,
          pendingBalance: wallet.pendingBalance,
          totalEarned: wallet.totalEarned,
          totalWithdrawn: wallet.totalWithdrawn,
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt,
          status: walletStatus,
          
          // Statistiques calculées
          performanceRatio: Math.round(performanceRatio * 100) / 100,
          pendingWithdrawals,
          hasBankInfo,
          
          // Informations du producteur
          producer: {
            id: producer.id,
            companyName: producer.companyName,
            address: producer.address,
            description: producer.description,
            productsCount: producer._count.products,
            
            // Informations bancaires (masquées pour sécurité)
            bankInfo: {
              hasIban: !!producer.iban,
              hasBankName: !!producer.bankName,
              hasAccountName: !!producer.bankAccountName,
              ibanMasked: producer.iban ? `****${producer.iban.slice(-4)}` : null
            },
            
            // Utilisateur associé
            user: {
              id: producer.user.id,
              name: producer.user.name,
              email: producer.user.email,
              phone: producer.user.phone,
              memberSince: producer.user.createdAt
            }
          },
          
          // Activité récente
          recentActivity: {
            transactionsCount: wallet._count.transactions,
            withdrawalsCount: wallet._count.withdrawals,
            lastWithdrawals: wallet.withdrawals.map(w => ({
              id: w.id,
              amount: w.amount,
              status: w.status,
              requestedAt: w.requestedAt
            }))
          }
        }
      })
    )
    
    // Calculer des statistiques globales
    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0)
    const totalEarned = wallets.reduce((sum, w) => sum + w.totalEarned, 0)
    const totalWithdrawn = wallets.reduce((sum, w) => sum + w.totalWithdrawn, 0)
    const activeWallets = wallets.filter(w => w.status === 'active').length
    const walletsWithPendingWithdrawals = wallets.filter(w => w.pendingWithdrawals > 0).length
    
    // Trier les portefeuilles par solde décroissant
    wallets.sort((a, b) => b.balance - a.balance)
    
    console.log(`💼 ${wallets.length} portefeuilles traités (${Math.round(totalBalance)}€ total)`)
    
    const response = {
      wallets,
      summary: {
        totalWallets: wallets.length,
        activeWallets,
        totalBalance: Math.round(totalBalance * 100) / 100,
        totalEarned: Math.round(totalEarned * 100) / 100,
        totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
        pendingBalance: wallets.reduce((sum, w) => sum + w.pendingBalance, 0),
        walletsWithPendingWithdrawals,
        averageBalance: wallets.length > 0 ? totalBalance / wallets.length : 0
      },
      breakdown: {
        byStatus: {
          active: wallets.filter(w => w.status === 'active').length,
          inactive: wallets.filter(w => w.status === 'inactive').length,
          pending_withdrawal: wallets.filter(w => w.status === 'pending_withdrawal').length,
          low_balance: wallets.filter(w => w.status === 'low_balance').length
        }
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error("❌ Erreur récupération portefeuilles:", error)
    throw error
  }
})