// app/api/admin/wallets/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"

export const GET = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    console.log(`Admin ${session.user.id} consulte les portefeuilles`)
    
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
        user: {
          createdAt: 'desc'
        }
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
        
        // Vérifier que le wallet existe avant d'accéder à ses propriétés
        if (!wallet) {
          console.error(`Erreur: portefeuille manquant pour le producteur ${producer.id}`)
          return null
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
            productsCount: producer._count?.products || 0,
            
            // Informations bancaires (masquées pour sécurité)
            bankInfo: {
              hasIban: !!producer.iban,
              hasBankName: !!producer.bankName,
              hasAccountName: !!producer.bankAccountName,
              ibanMasked: producer.iban ? `****${producer.iban.slice(-4)}` : null
            },
            
            // Utilisateur associé
            user: {
              id: producer.user?.id || '',
              name: producer.user?.name || '',
              email: producer.user?.email || '',
              phone: producer.user?.phone || '',
              memberSince: producer.user?.createdAt || new Date()
            }
          },
          
          // Activité récente
          recentActivity: {
            transactionsCount: wallet._count?.transactions || 0,
            withdrawalsCount: wallet._count?.withdrawals || 0,
            lastWithdrawals: (wallet.withdrawals || []).map((w: any) => ({
              id: w.id,
              amount: w.amount,
              status: w.status,
              requestedAt: w.requestedAt
            }))
          }
        }
      })
    )
    
    // Filtrer les wallets null (au cas où)
    const validWallets = wallets.filter(w => w !== null)
    
    // Calculer des statistiques globales
    const totalBalance = validWallets.reduce((sum, w) => sum + w.balance, 0)
    const totalEarned = validWallets.reduce((sum, w) => sum + w.totalEarned, 0)
    const totalWithdrawn = validWallets.reduce((sum, w) => sum + w.totalWithdrawn, 0)
    const activeWallets = validWallets.filter(w => w.status === 'active').length
    const walletsWithPendingWithdrawals = validWallets.filter(w => w.pendingWithdrawals > 0).length
    
    // Trier les portefeuilles par solde décroissant
    validWallets.sort((a, b) => b.balance - a.balance)
    
    console.log(`${validWallets.length} portefeuilles traités (${Math.round(totalBalance)}€ total)`)
    
    const response = {
      wallets: validWallets,
      summary: {
        totalWallets: validWallets.length,
        activeWallets,
        totalBalance: Math.round(totalBalance * 100) / 100,
        totalEarned: Math.round(totalEarned * 100) / 100,
        totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
        pendingBalance: validWallets.reduce((sum, w) => sum + w.pendingBalance, 0),
        walletsWithPendingWithdrawals,
        averageBalance: validWallets.length > 0 ? totalBalance / validWallets.length : 0
      },
      breakdown: {
        byStatus: {
          active: validWallets.filter(w => w.status === 'active').length,
          inactive: validWallets.filter(w => w.status === 'inactive').length,
          pending_withdrawal: validWallets.filter(w => w.status === 'pending_withdrawal').length,
          low_balance: validWallets.filter(w => w.status === 'low_balance').length
        }
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error("Erreur récupération portefeuilles:", error)
    throw error
  }
})