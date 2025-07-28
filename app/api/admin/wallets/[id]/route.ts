// app/api/admin/wallets/[id]/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { WalletService } from "@/lib/wallet-service"
import { createError } from "@/lib/error-handler"

export const GET = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID du portefeuille
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const walletId = pathParts[pathParts.indexOf('wallets') + 1]
    
    if (!walletId) {
      throw createError.validation("ID de portefeuille manquant")
    }
    
    console.log(`💼 Admin ${session.user.id} consulte le portefeuille ${walletId}`)
    
    // Vérifier si l'ID est temporaire (pour un portefeuille non encore créé)
    if (walletId.startsWith('temp-')) {
      const producerId = walletId.replace('temp-', '')
      
      if (!producerId.match(/^[a-zA-Z0-9]+$/)) {
        throw createError.validation("ID producteur invalide")
      }
      
      // Récupérer le producteur
      const producer = await prisma.producer.findUnique({
        where: { id: producerId },
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
          products: {
            select: {
              id: true,
              name: true,
              type: true,
              price: true,
              available: true
            },
            take: 10 // Derniers 10 produits
          }
        }
      })
      
      if (!producer) {
        throw createError.notFound("Producteur non trouvé")
      }
      
      // Créer le portefeuille pour ce producteur automatiquement
      console.log(`💼 Création automatique du portefeuille pour ${producer.companyName}`)
      
      try {
        await WalletService.ensureWalletExists(producerId)
      } catch (walletError) {
        console.error('❌ Erreur création portefeuille:', walletError)
        throw createError.internal("Erreur lors de la création du portefeuille")
      }
      
      // Récupérer le portefeuille nouvellement créé
      const newWallet = await prisma.wallet.findUnique({
        where: { producerId },
        include: {
          producer: {
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
            products: {
              select: {
                id: true,
                name: true,
                type: true,
                price: true,
                available: true,
                createdAt: true
              },
              orderBy: {
                createdAt: 'desc'
              },
              take: 10
            },
            _count: {
              select: {
                products: true
              }
            }
          }
        },
        withdrawals: {
          orderBy: {
            requestedAt: 'desc'
          },
          take: 20
        },
        transactions: {
          include: {
            order: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 50
        }
      }
    })
    
    if (!wallet) {
      throw createError.notFound("Portefeuille non trouvé")
    }
    
    // Calculer des statistiques avancées
    const totalPendingWithdrawals = wallet.withdrawals
      .filter(w => w.status === 'PENDING')
      .reduce((sum, w) => sum + w.amount, 0)
    
    const successfulWithdrawals = wallet.withdrawals.filter(w => w.status === 'COMPLETED')
    const lastSuccessfulWithdrawal = successfulWithdrawals[0] || null
    
    // Analyse des transactions par mois (6 derniers mois)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const recentTransactions = wallet.transactions.filter(
      t => new Date(t.createdAt) >= sixMonthsAgo
    )
    
    const monthlyEarnings: { [key: string]: number } = {}
    recentTransactions.forEach(transaction => {
      const month = new Date(transaction.createdAt).toISOString().slice(0, 7) // YYYY-MM
      monthlyEarnings[month] = (monthlyEarnings[month] || 0) + transaction.amount
    })
    
    // Statistiques de performance
    const avgMonthlyEarnings = Object.keys(monthlyEarnings).length > 0
      ? Object.values(monthlyEarnings).reduce((a, b) => a + b, 0) / Object.keys(monthlyEarnings).length
      : 0
    
    const withdrawalRate = wallet.totalEarned > 0 
      ? (wallet.totalWithdrawn / wallet.totalEarned) * 100 
      : 0
    
    // Enrichir la réponse avec toutes les données
    const enrichedWallet = {
      ...wallet,
      analytics: {
        totalPendingWithdrawals,
        pendingWithdrawalsCount: wallet.withdrawals.filter(w => w.status === 'PENDING').length,
        completedWithdrawalsCount: wallet.withdrawals.filter(w => w.status === 'COMPLETED').length,
        rejectedWithdrawalsCount: wallet.withdrawals.filter(w => w.status === 'REJECTED').length,
        lastSuccessfulWithdrawal,
        avgMonthlyEarnings: Math.round(avgMonthlyEarnings * 100) / 100,
        withdrawalRate: Math.round(withdrawalRate * 100) / 100,
        monthlyEarnings: Object.entries(monthlyEarnings).map(([month, amount]) => ({
          month,
          amount: Math.round(amount * 100) / 100
        })).sort((a, b) => a.month.localeCompare(b.month)),
        transactionStats: {
          total: wallet.transactions.length,
          lastTransactionDate: wallet.transactions[0]?.createdAt || null,
          avgTransactionAmount: wallet.transactions.length > 0 
            ? wallet.transactions.reduce((sum, t) => sum + t.amount, 0) / wallet.transactions.length
            : 0
        }
      },
      bankingInfo: {
        hasCompleteInfo: !!(wallet.producer.iban && wallet.producer.bankAccountName),
        iban: wallet.producer.iban ? `****${wallet.producer.iban.slice(-4)}` : null,
        bankName: wallet.producer.bankName,
        accountName: wallet.producer.bankAccountName,
        bic: wallet.producer.bic
      }
    }
    
    console.log(`💼 Portefeuille ${walletId} récupéré avec ${wallet.transactions.length} transactions`)
    
    return NextResponse.json(enrichedWallet)
    
  } catch (error) {
    console.error("❌ Erreur récupération portefeuille:", error)
    throw error
  }
}),
                  createdAt: true
                }
              }
            }
          },
          withdrawals: {
            orderBy: {
              requestedAt: 'desc'
            },
            take: 20
          },
          transactions: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 50
          }
        }
      })
      
      if (!newWallet) {
        throw createError.internal("Erreur lors de la récupération du portefeuille créé")
      }
      
      return NextResponse.json({
        ...newWallet,
        isNewlyCreated: true
      })
    }
    
    // Si c'est un ID normal, valider le format
    if (!walletId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("Format d'ID de portefeuille invalide")
    }
    
    // Récupérer le portefeuille avec toutes ses relations
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      include: {
        producer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true