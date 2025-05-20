// app/api/admin/withdrawals/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { WalletService } from "@/lib/wallet-service"

export const PATCH = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'ADMIN') {
      return new NextResponse("Non autorisé", { status: 403 })
    }
    
    const withdrawalId = context.params.id
    const { action, note } = await req.json()
    
    // Valider l'action
    if (action !== 'approve' && action !== 'reject') {
      return new NextResponse("Action invalide", { status: 400 })
    }
    
    // Si rejet, vérifier qu'une note est fournie
    if (action === 'reject' && (!note || !note.trim())) {
      return new NextResponse("Une raison de rejet est requise", { status: 400 })
    }
    
    // Récupérer la demande de retrait
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        wallet: true
      }
    })
    
    if (!withdrawal) {
      return new NextResponse("Demande de retrait non trouvée", { status: 404 })
    }
    
    if (withdrawal.status !== 'PENDING') {
      return new NextResponse("Cette demande a déjà été traitée", { status: 400 })
    }
    
    // Traiter la demande selon l'action
    if (action === 'approve') {
      // Approuver le retrait
      await WalletService.approveWithdrawal(withdrawalId, note || undefined);
    } else {
      // Rejeter le retrait
      await WalletService.rejectWithdrawal(withdrawalId, note);
    }
    
    // Journaliser l'action de l'admin
    await prisma.adminLog.create({
      data: {
        action: action === 'approve' ? 'WITHDRAWAL_APPROVED' : 'WITHDRAWAL_REJECTED',
        entityType: 'WITHDRAWAL',
        entityId: withdrawalId,
        adminId: session.user.id,
        details: JSON.stringify({
          withdrawalId,
          producerId: withdrawal.wallet.producerId,
          amount: withdrawal.amount,
          note
        })
      }
    })
    
    return NextResponse.json({
      success: true,
      message: action === 'approve' ? 'Retrait approuvé' : 'Retrait rejeté'
    })
  } catch (error) {
    console.error("Erreur lors du traitement de la demande de retrait:", error)
    return new NextResponse(
      error instanceof Error ? error.message : "Erreur serveur", 
      { status: 500 }
    )
  }
}, ["ADMIN"])