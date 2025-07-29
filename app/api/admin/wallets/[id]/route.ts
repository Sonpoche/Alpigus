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
    
    console.log(`Admin ${session.user.id} consulte le portefeuille ${walletId}`)
    
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
            take: 10
          },
          _count: {
            select: {
              products: true
            }
          }
        }
      })
      
      if (!producer) {
        throw createError.notFound("Producteur non trouvé")
      }
      
      // Créer le portefeuille pour ce producteur automatiquement
      console.log(`Création automatique du portefeuille pour ${producer.companyName}`)
      
      try {
        await WalletService.ensureWalletExists(producerId)
      } catch (walletError) {
        console.error('Erreur création portefeuille:', walletError)
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
      
      if (!newWallet) {
        throw createError.internal("Erreur lors de la récupération du portefeuille créé")
      }
      
      // Calculer les analytics pour le nouveau portefeuille
      const totalPendingWithdrawals = newWallet.withdrawals
        .filter((w: any) => w.status === 'PENDING')
        .reduce((sum: number, w: any) => sum + w.amount, 0)
      
      const successfulWithdrawals = newWallet.withdrawals.filter((w: any) => w.status === 'COMPLETED')
      const lastSuccessfulWithdrawal = successfulWithdrawals[0] || null
      
      const walletAnalytics = {
        totalPendingWithdrawals,
        pendingWithdrawalsCount: newWallet.withdrawals.filter((w: any) => w.status === 'PENDING').length,
        completedWithdrawalsCount: newWallet.withdrawals.filter((w: any) => w.status === 'COMPLETED').length,
        rejectedWithdrawalsCount: newWallet.withdrawals.filter((w: any) => w.status === 'REJECTED').length,
        lastSuccessfulWithdrawal,
        avgMonthlyEarnings: 0,
        withdrawalRate: 0,
        monthlyEarnings: [],
        transactionStats: {
          total: newWallet.transactions.length,
          lastTransactionDate: newWallet.transactions[0]?.createdAt || null,
          avgTransactionAmount: newWallet.transactions.length > 0 
            ? newWallet.transactions.reduce((sum: number, t: any) => sum + t.amount, 0) / newWallet.transactions.length
            : 0
        }
      }
      
      return NextResponse.json({
        ...newWallet,
        analytics: walletAnalytics,
        bankingInfo: {
          hasCompleteInfo: !!(newWallet.producer.iban && newWallet.producer.bankAccountName),
          iban: newWallet.producer.iban ? `****${newWallet.producer.iban.slice(-4)}` : null,
          bankName: newWallet.producer.bankName,
          accountName: newWallet.producer.bankAccountName,
          bic: newWallet.producer.bic
        },
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
      .filter((w: any) => w.status === 'PENDING')
      .reduce((sum: number, w: any) => sum + w.amount, 0)
    
    const successfulWithdrawals = wallet.withdrawals.filter((w: any) => w.status === 'COMPLETED')
    const lastSuccessfulWithdrawal = successfulWithdrawals[0] || null
    
    // Analyse des transactions par mois (6 derniers mois)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const recentTransactions = wallet.transactions.filter(
      (t: any) => new Date(t.createdAt) >= sixMonthsAgo
    )
    
    const monthlyEarnings: { [key: string]: number } = {}
    recentTransactions.forEach((transaction: any) => {
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
        pendingWithdrawalsCount: wallet.withdrawals.filter((w: any) => w.status === 'PENDING').length,
        completedWithdrawalsCount: wallet.withdrawals.filter((w: any) => w.status === 'COMPLETED').length,
        rejectedWithdrawalsCount: wallet.withdrawals.filter((w: any) => w.status === 'REJECTED').length,
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
            ? wallet.transactions.reduce((sum: number, t: any) => sum + t.amount, 0) / wallet.transactions.length
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
    
    console.log(`Portefeuille ${walletId} récupéré avec ${wallet.transactions.length} transactions`)
    
    return NextResponse.json(enrichedWallet)
    
  } catch (error) {
    console.error("Erreur récupération portefeuille:", error)
    throw error
  }
})

export const PUT = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const walletId = pathParts[pathParts.indexOf('wallets') + 1]
    
    if (!walletId) {
      throw createError.validation("ID de portefeuille manquant")
    }

    const { action, amount, reason } = await request.json()

    console.log(`Admin ${session.user.id} effectue l'action ${action} sur le portefeuille ${walletId}`)

    // Vérifier que le portefeuille existe
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      include: {
        producer: {
          include: {
            user: true
          }
        }
      }
    })

    if (!wallet) {
      throw createError.notFound("Portefeuille non trouvé")
    }

    let result
    
    switch (action) {
      case 'adjust_balance':
        if (typeof amount !== 'number') {
          throw createError.validation("Montant invalide")
        }
        
        // Créer une transaction d'ajustement
        const adjustment = await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: amount,
            type: 'ADJUSTMENT',
            status: 'COMPLETED',
            description: reason || 'Ajustement administrateur',
            metadata: JSON.stringify({
              adminId: session.user.id,
              adminAction: 'balance_adjustment',
              timestamp: new Date().toISOString()
            })
          }
        })

        // Mettre à jour le solde
        const updatedWallet = await prisma.wallet.update({
          where: { id: walletId },
          data: {
            balance: {
              increment: amount
            },
            totalEarned: amount > 0 ? {
              increment: amount
            } : undefined
          }
        })

        result = {
          success: true,
          transaction: adjustment,
          newBalance: updatedWallet.balance,
          message: `Ajustement de ${amount > 0 ? '+' : ''}${amount}€ effectué`
        }
        break

      case 'force_withdrawal':
        if (typeof amount !== 'number' || amount <= 0) {
          throw createError.validation("Montant de retrait invalide")
        }
        
        if (amount > wallet.balance) {
          throw createError.validation("Solde insuffisant")
        }
        
        // Créer une transaction de retrait forcé
        const withdrawal = await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: -amount,
            type: 'WITHDRAWAL',
            status: 'COMPLETED',
            description: reason || 'Retrait forcé par admin',
            metadata: JSON.stringify({
              adminId: session.user.id,
              adminAction: 'force_withdrawal',
              timestamp: new Date().toISOString()
            })
          }
        })

        // Mettre à jour le solde
        const walletAfterWithdrawal = await prisma.wallet.update({
          where: { id: walletId },
          data: {
            balance: {
              decrement: amount
            },
            totalWithdrawn: {
              increment: amount
            }
          }
        })

        result = {
          success: true,
          transaction: withdrawal,
          newBalance: walletAfterWithdrawal.balance,
          message: `Retrait forcé de ${amount}€ effectué`
        }
        break

      default:
        throw createError.validation("Action non reconnue")
    }

    // Log d'audit
    try {
      await prisma.adminLog.create({
        data: {
          adminId: session.user.id,
          action: `WALLET_${action.toUpperCase()}`,
          entityType: 'Wallet',
          entityId: walletId,
          details: JSON.stringify({
            amount,
            reason,
            previousBalance: wallet.balance,
            newBalance: result.newBalance,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('Erreur log admin (non critique):', logError)
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error("Erreur lors de la modification du portefeuille:", error)
    throw error
  }
})