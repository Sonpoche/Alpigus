// app/api/admin/withdrawals/[id]/route.ts
// app/api/admin/withdrawals/[id]/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { WalletService } from "@/lib/wallet-service"
import { createError } from "@/lib/error-handler"
import { z } from "zod"

// Schéma de validation pour les actions sur les retraits
const withdrawalActionSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: 'Action doit être approve ou reject' })
  }),
  note: z.string().max(500, 'Note trop longue').optional()
}).strict()

export const GET = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID du retrait
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const withdrawalId = pathParts[pathParts.indexOf('withdrawals') + 1]
    
    if (!withdrawalId || !withdrawalId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de retrait invalide")
    }
    
    console.log(`Admin ${session.user.id} consulte le retrait ${withdrawalId}`)
    
    // Récupérer la demande de retrait avec toutes les informations
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        wallet: {
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
                }
              }
            }
          }
        }
      }
    })
    
    if (!withdrawal) {
      throw createError.notFound("Demande de retrait non trouvée")
    }
    
    // Enrichir la réponse avec des informations calculées
    const enrichedWithdrawal = {
      ...withdrawal,
      producer: {
        id: withdrawal.wallet.producer.id,
        companyName: withdrawal.wallet.producer.companyName,
        user: withdrawal.wallet.producer.user
      },
      wallet: {
        id: withdrawal.wallet.id,
        balance: withdrawal.wallet.balance,
        pendingBalance: withdrawal.wallet.pendingBalance,
        totalEarned: withdrawal.wallet.totalEarned,
        totalWithdrawn: withdrawal.wallet.totalWithdrawn
      },
      bankInfo: {
        hasCompleteInfo: !!(withdrawal.wallet.producer.iban && withdrawal.wallet.producer.bankAccountName),
        iban: withdrawal.wallet.producer.iban ? `****${withdrawal.wallet.producer.iban.slice(-4)}` : null,
        bankName: withdrawal.wallet.producer.bankName,
        accountName: withdrawal.wallet.producer.bankAccountName,
        bic: withdrawal.wallet.producer.bic
      },
      canProcess: ['PENDING', 'APPROVED'].includes(withdrawal.status),
      daysAgo: Math.floor((Date.now() - new Date(withdrawal.requestedAt).getTime()) / (1000 * 60 * 60 * 24))
    }
    
    return NextResponse.json(enrichedWithdrawal)
    
  } catch (error) {
    console.error("Erreur lors de la récupération du retrait:", error)
    throw error
  }
})

export const PATCH = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID du retrait
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const withdrawalId = pathParts[pathParts.indexOf('withdrawals') + 1]
    
    if (!withdrawalId || !withdrawalId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de retrait invalide")
    }
    
    // Validation des données d'entrée
    const rawData = await request.json()
    const { action, note } = validateData(withdrawalActionSchema, rawData)
    
    console.log(`Admin ${session.user.id} effectue l'action ${action} sur le retrait ${withdrawalId}`)
    
    // Valider les prérequis selon l'action
    if (action === 'reject' && (!note || !note.trim())) {
      throw createError.validation("Une raison de rejet est requise")
    }
    
    // Récupérer la demande de retrait
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        wallet: {
          include: {
            producer: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })
    
    if (!withdrawal) {
      throw createError.notFound("Demande de retrait non trouvée")
    }
    
    if (withdrawal.status !== 'PENDING') {
      throw createError.validation("Cette demande a déjà été traitée")
    }
    
    // Traiter la demande selon l'action
    try {
      if (action === 'approve') {
        await WalletService.approveWithdrawal(withdrawalId, note || undefined)
      } else {
        await WalletService.rejectWithdrawal(withdrawalId, note!)
      }
    } catch (serviceError) {
      console.error(`Erreur service wallet:`, serviceError)
      throw createError.internal(
        `Erreur lors du traitement: ${serviceError instanceof Error ? serviceError.message : 'Erreur inconnue'}`
      )
    }
    
    // Log d'audit détaillé
    try {
      await prisma.adminLog.create({
        data: {
          action: action === 'approve' ? 'WITHDRAWAL_APPROVED' : 'WITHDRAWAL_REJECTED',
          entityType: 'Withdrawal',
          entityId: withdrawalId,
          adminId: session.user.id,
          details: JSON.stringify({
            withdrawalId,
            producerId: withdrawal.wallet.producerId,
            producerEmail: withdrawal.wallet.producer.user.email,
            amount: withdrawal.amount,
            note: note || null,
            walletBalance: withdrawal.wallet.balance,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('Erreur log admin (non critique):', logError)
    }
    
    console.log(`Retrait ${withdrawalId} traité avec succès: ${action}`)
    
    return NextResponse.json({
      success: true,
      message: action === 'approve' ? 'Retrait approuvé avec succès' : 'Retrait rejeté',
      action,
      withdrawalId,
      processedAt: new Date().toISOString(),
      processedBy: {
        id: session.user.id,
        name: session.user.name || session.user.email
      }
    })
    
  } catch (error) {
    console.error("Erreur lors du traitement de la demande de retrait:", error)
    throw error
  }
})