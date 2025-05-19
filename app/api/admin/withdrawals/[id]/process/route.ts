// app/api/admin/withdrawals/[id]/process/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { WalletService } from "@/lib/wallet-service"

export const POST = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const withdrawalId = context.params.id
    const { status, note } = await req.json()
    
    if (!status || !['COMPLETED', 'REJECTED'].includes(status)) {
      return new NextResponse("Statut invalide", { status: 400 })
    }
    
    // Traiter la demande de retrait
    await WalletService.processWithdrawal(withdrawalId, status as 'COMPLETED' | 'REJECTED', note)
    
    // Récupérer la demande mise à jour
    const updatedWithdrawal = await prisma.withdrawal.findUnique({
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
    
    // Envoyer une notification au producteur
    if (updatedWithdrawal) {
      await prisma.notification.create({
        data: {
          userId: updatedWithdrawal.wallet.producer.userId,
          type: status === 'COMPLETED' ? 'WITHDRAWAL_COMPLETED' : 'WITHDRAWAL_REJECTED',
          title: status === 'COMPLETED' ? 'Retrait effectué' : 'Retrait rejeté',
          message: status === 'COMPLETED' 
            ? `Votre demande de retrait de ${updatedWithdrawal.amount} CHF a été traitée avec succès.`
            : `Votre demande de retrait de ${updatedWithdrawal.amount} CHF a été rejetée. Raison: ${note || 'Non spécifiée'}.`,
          link: '/producer/wallet',
          read: false
        }
      })
    }
    
    return NextResponse.json(updatedWithdrawal)
  } catch (error) {
    console.error("Erreur lors du traitement de la demande de retrait:", error)
    return new NextResponse(
      error instanceof Error ? error.message : "Erreur serveur", 
      { status: 500 }
    )
  }
}, ["ADMIN"])