// app/api/wallet/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { WalletService } from "@/lib/wallet-service"

// Schéma de validation pour les demandes de retrait
const withdrawalSchema = z.object({
  amount: z.number()
    .min(10, 'Montant minimum: 10 CHF')
    .max(10000, 'Montant maximum: 10000 CHF par retrait')
    .refine(val => Number(val.toFixed(2)) === val, 'Maximum 2 décimales autorisées'),
  reason: z.string()
    .min(3, 'Raison requise')
    .max(200, 'Raison trop longue')
    .optional()
}).strict()

// POST - Créer une demande de retrait
export const POST = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // Validation des données d'entrée
    const rawData = await request.json()
    const { amount, reason } = validateData(withdrawalSchema, rawData)

    console.log(`💸 Demande retrait ${amount} CHF par producteur ${session.user.id}`)

    // Récupération sécurisée du producteur avec portefeuille
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
            pendingBalance: true
          }
        }
      }
    })

    if (!producer) {
      throw createError.notFound("Profil producteur non trouvé")
    }

    // Vérifications de sécurité préalables
    
    // 1. Vérifier la configuration bancaire
    if (!producer.iban || !producer.bankName || !producer.bankAccountName) {
      throw createError.validation(
        "Veuillez configurer vos informations bancaires dans les paramètres avant de demander un retrait"
      )
    }

    // 2. Vérifier l'existence du portefeuille
    if (!producer.wallet) {
      throw createError.notFound("Portefeuille non configuré")
    }

    // 3. Vérifier le solde disponible
    const availableBalance = producer.wallet.balance
    if (availableBalance < amount) {
      throw createError.validation(
        `Solde insuffisant. Disponible: ${availableBalance.toFixed(2)} CHF, Demandé: ${amount.toFixed(2)} CHF`
      )
    }

    // 4. CORRECTION : Utiliser wallet.id au lieu de producerId
    const existingPendingWithdrawal = await prisma.withdrawal.findFirst({
      where: {
        walletId: producer.wallet.id, // ✅ Correction ici
        status: 'PENDING'
      }
    })

    if (existingPendingWithdrawal) {
      throw createError.validation(
        "Vous avez déjà une demande de retrait en cours de traitement"
      )
    }

    // 5. Préparation des détails bancaires sécurisés
    const bankDetails = {
      bankName: producer.bankName,
      accountName: producer.bankAccountName,
      iban: producer.iban,
      bic: producer.bic || undefined
    }

    // 6. Validation IBAN pour sécurité supplémentaire
    if (!producer.iban.match(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/)) {
      throw createError.validation("Format IBAN invalide dans votre profil")
    }

    // 7. CORRECTION : Utiliser seulement 3 paramètres selon la signature du service
    let withdrawal
    try {
      withdrawal = await WalletService.createWithdrawalRequest(
        producer.id, 
        amount, 
        bankDetails // ✅ Correction : suppression du 4ème paramètre
      )
    } catch (serviceError) {
      console.error("Erreur WalletService:", serviceError)
      throw createError.internal(
        serviceError instanceof Error ? serviceError.message : "Erreur lors de la création du retrait"
      )
    }

    // 8. Log d'audit sécurisé (sans IBAN complet)
    console.log(`📋 Audit - Retrait demandé:`, {
      withdrawalId: withdrawal.id,
      producerId: producer.id,
      requestedBy: session.user.id,
      amount: Math.round(amount * 100) / 100,
      ibanPrefix: producer.iban.substring(0, 4),
      bankName: producer.bankName,
      companyName: producer.companyName,
      reason: reason || 'Non spécifiée',
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Retrait créé: ${withdrawal.id} pour ${amount} CHF`)

    // 9. Réponse sécurisée (masquer données bancaires sensibles)
    const response = {
      withdrawal: {
        id: withdrawal.id,
        amount: Math.round(amount * 100) / 100,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt,
        estimatedProcessing: withdrawal.estimatedProcessing || null,
        reference: withdrawal.reference || null
      },
      bankDetails: {
        bankName: producer.bankName,
        accountName: producer.bankAccountName,
        ibanPreview: `${producer.iban.substring(0, 4)}****`, // IBAN masqué
        bic: producer.bic
      },
      wallet: {
        previousBalance: availableBalance,
        newBalance: Math.round((availableBalance - amount) * 100) / 100,
        pendingBalance: Math.round((producer.wallet.pendingBalance + amount) * 100) / 100
      },
      meta: {
        currency: 'CHF',
        processingTime: '2-5 jours ouvrés',
        message: 'Votre demande de retrait a été créée avec succès'
      }
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error("❌ Erreur demande retrait:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER'], // Seuls les producteurs
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 5, // Très limité (opération financière sensible)
    window: 300  // 5 minutes
  }
})