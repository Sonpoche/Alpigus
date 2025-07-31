// app/api/wallet/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { WalletService } from "@/lib/wallet-service"

// GET - Obtenir les détails du portefeuille producteur
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    console.log(`💰 Récupération portefeuille producteur ${session.user.id}`)

    // Récupération sécurisée du producteur
    const producer = await prisma.producer.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyName: true,
        bankName: true,
        bankAccountName: true,
        iban: true,
        bic: true,
        wallet: {
          select: {
            id: true,
            balance: true,
            pendingBalance: true,
            totalEarned: true,
            totalWithdrawn: true,
            updatedAt: true
          }
        }
      }
    })

    if (!producer) {
      throw createError.notFound("Profil producteur non trouvé")
    }

    console.log(`🏭 Producteur ${producer.companyName} consulte son portefeuille`)

    // Récupération des détails complets du portefeuille via le service
    let walletDetails
    try {
      walletDetails = await WalletService.getProducerWalletDetails(producer.id)
    } catch (serviceError) {
      console.error("Erreur WalletService:", serviceError)
      // Fallback avec données de base si le service échoue
      walletDetails = {
        wallet: producer.wallet || {
          id: null,
          balance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          updatedAt: new Date()
        },
        recentTransactions: [],
        pendingWithdrawals: []
      }
    }

    // Vérification de la configuration bancaire
    const hasBankInfo = !!(producer.bankName && producer.iban && producer.bankAccountName)

    // Construction de la réponse sécurisée
    const response = {
      wallet: {
        id: walletDetails.wallet?.id || null,
        balance: Math.round((walletDetails.wallet?.balance || 0) * 100) / 100,
        pendingBalance: Math.round((walletDetails.wallet?.pendingBalance || 0) * 100) / 100,
        totalEarned: Math.round((walletDetails.wallet?.totalEarned || 0) * 100) / 100,
        totalWithdrawn: Math.round((walletDetails.wallet?.totalWithdrawn || 0) * 100) / 100,
        lastUpdated: walletDetails.wallet?.updatedAt?.toISOString() || new Date().toISOString()
      },
      producer: {
        id: producer.id,
        companyName: producer.companyName,
        bankInfo: {
          configured: hasBankInfo,
          bankName: producer.bankName,
          accountName: producer.bankAccountName,
          // IBAN partiellement masqué pour sécurité
          ibanPreview: producer.iban ? `${producer.iban.substring(0, 4)}****` : null,
          bic: producer.bic
        }
      },
      // Transactions récentes (si disponibles via le service)
      recentTransactions: (walletDetails.recentTransactions || []).slice(0, 10).map((transaction: any) => ({
        id: transaction.id,
        amount: Math.round(transaction.amount * 100) / 100,
        type: transaction.type,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.createdAt
      })),
      // Retraits en attente
      pendingWithdrawals: (walletDetails.pendingWithdrawals || []).map((withdrawal: any) => ({
        id: withdrawal.id,
        amount: Math.round(withdrawal.amount * 100) / 100,
        status: withdrawal.status,
        requestedAt: withdrawal.createdAt,
        estimatedProcessing: withdrawal.estimatedProcessing || null
      })),
      meta: {
        canWithdraw: hasBankInfo && (walletDetails.wallet?.balance || 0) > 0,
        minimumWithdrawal: 10.00, // CHF minimum
        currency: 'CHF',
        accessLevel: 'owner'
      }
    }

    // Log d'audit sécurisé (sans montants exacts)
    console.log(`📋 Audit - Portefeuille consulté:`, {
      producerId: producer.id,
      consultedBy: session.user.id,
      hasWallet: !!walletDetails.wallet?.id,
      hasBankInfo,
      transactionsCount: walletDetails.recentTransactions?.length || 0,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Portefeuille récupéré pour ${producer.companyName}`)

    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ Erreur récupération portefeuille:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER'], // Seuls les producteurs
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 100, // Consultation fréquente des finances
    window: 60
  }
})