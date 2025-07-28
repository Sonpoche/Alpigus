// app/api/admin/withdrawals/[id]/process/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { WalletService } from "@/lib/wallet-service"
import { createError } from "@/lib/error-handler"
import { z } from "zod"

// Schéma de validation pour le traitement des retraits
const processWithdrawalSchema = z.object({
  status: z.enum(['COMPLETED', 'REJECTED'], {
    errorMap: () => ({ message: 'Statut doit être COMPLETED ou REJECTED' })
  }),
  note: z.string().max(500, 'Note trop longue').optional(),
  paymentReference: z.string().max(100, 'Référence de paiement trop longue').optional()
}).strict()

export const POST = withAdminSecurity(async (
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
    const { status, note, paymentReference } = validateData(processWithdrawalSchema, rawData)
    
    console.log(`💰 Admin ${session.user.id} traite le retrait ${withdrawalId}: ${status}`)
    
    // Récupérer la demande de retrait avec toutes les informations nécessaires
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
                    email: true
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
    
    // Vérifier que la demande peut être traitée
    if (!['PENDING', 'APPROVED'].includes(withdrawal.status)) {
      throw createError.validation(
        `Cette demande ne peut pas être traitée (statut actuel: ${withdrawal.status})`
      )
    }
    
    // Validations spécifiques selon le statut demandé
    if (status === 'COMPLETED') {
      // Vérifications pour l'approbation
      if (withdrawal.wallet.balance < withdrawal.amount) {
        throw createError.validation(
          `Solde insuffisant: ${withdrawal.wallet.balance}€ disponible, ${withdrawal.amount}€ requis`
        )
      }
      
      // Vérifier les informations bancaires
      const producer = withdrawal.wallet.producer
      if (!producer.iban || !producer.bankAccountName) {
        throw createError.validation(
          "Informations bancaires incomplètes pour ce producteur"
        )
      }
      
      console.log(`💰 Traitement du retrait approuvé: ${withdrawal.amount}€ vers ${producer.iban?.slice(-4)}`)
      
    } else if (status === 'REJECTED') {
      // Le rejet nécessite une note explicative
      if (!note || !note.trim()) {
        throw createError.validation("Une raison de rejet est requise")
      }
      
      console.log(`❌ Rejet du retrait: ${withdrawal.amount}€ (raison: ${note.substring(0, 50)}...)`)
    }
    
    let processedWithdrawal
    
    try {
      // Traiter la demande via le service wallet
      processedWithdrawal = await WalletService.processWithdrawal(
        withdrawalId, 
        status as 'COMPLETED' | 'REJECTED', 
        note?.trim()
      )
      
      // Ajouter la référence de paiement si fournie (pour les complétions)
      if (status === 'COMPLETED' && paymentReference) {
        await prisma.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            metadata: JSON.stringify({ 
              paymentReference: paymentReference.trim(),
              processedBy: session.user.id,
              processedAt: new Date().toISOString()
            })
          }
        })
        processedWithdrawal.paymentReference = paymentReference.trim()
      }
      
    } catch (serviceError) {
      console.error(`❌ Erreur service wallet:`, serviceError)
      throw createError.internal(
        `Erreur lors du traitement: ${serviceError instanceof Error ? serviceError.message : 'Erreur inconnue'}`
      )
    }
    
    // Créer des notifications pour le producteur
    try {
      const notificationData = {
        userId: withdrawal.wallet.producer.userId,
        type: status === 'COMPLETED' ? 'WITHDRAWAL_COMPLETED' : 'WITHDRAWAL_REJECTED',
        title: status === 'COMPLETED' ? '✅ Retrait effectué' : '❌ Retrait rejeté',
        message: status === 'COMPLETED' 
          ? `Votre demande de retrait de ${withdrawal.amount}€ a été traitée avec succès. ${paymentReference ? `Référence: ${paymentReference}` : ''}`
          : `Votre demande de retrait de ${withdrawal.amount}€ a été rejetée. ${note ? `Raison: ${note}` : ''}`,
        link: '/producer/wallet',
        data: JSON.stringify({
          withdrawalId,
          amount: withdrawal.amount,
          status,
          paymentReference: paymentReference || null
        })
      }
      
      await prisma.notification.create({
        data: notificationData
      })
      
      console.log(`📧 Notification envoyée au producteur ${withdrawal.wallet.producer.user.email}`)
      
    } catch (notifError) {
      console.error('⚠️ Erreur notification (non critique):', notifError)
    }
    
    // Log d'audit détaillé
    try {
      await prisma.adminLog.create({
        data: {
          action: status === 'COMPLETED' ? 'PROCESS_WITHDRAWAL_COMPLETED' : 'PROCESS_WITHDRAWAL_REJECTED',
          entityType: 'WITHDRAWAL',
          entityId: withdrawalId,
          adminId: session.user.id,
          details: JSON.stringify({
            withdrawalId,
            amount: withdrawal.amount,
            status,
            note: note || null,
            paymentReference: paymentReference || null,
            producerId: withdrawal.wallet.producerId,
            producerEmail: withdrawal.wallet.producer.user.email,
            walletBalanceBefore: withdrawal.wallet.balance,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('⚠️ Erreur log admin (non critique):', logError)
    }
    
    // Récupérer la demande mise à jour avec toutes les informations
    const updatedWithdrawal = await prisma.withdrawal.findUnique({
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
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    })
    
    console.log(`✅ Retrait ${withdrawalId} traité avec succès: ${status}`)
    
    return NextResponse.json({
      success: true,
      withdrawal: updatedWithdrawal,
      message: status === 'COMPLETED' 
        ? `Retrait de ${withdrawal.amount}€ effectué avec succès`
        : `Retrait de ${withdrawal.amount}€ rejeté`,
      processedAt: new Date().toISOString(),
      processedBy: {
        id: session.user.id,
        name: session.user.name || session.user.email
      }
    })
    
  } catch (error) {
    console.error("❌ Erreur traitement retrait:", error)
    throw error
  }
})