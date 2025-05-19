// app/api/wallet/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { WalletService } from "@/lib/wallet-service"

export const POST = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    const { amount } = await req.json()
    
    if (!amount || amount <= 0) {
      return new NextResponse("Montant invalide", { status: 400 })
    }

    // Récupérer le producteur associé à l'utilisateur
    const producer = await prisma.producer.findUnique({
      where: { userId: session.user.id },
      include: {
        wallet: true
      }
    })

    if (!producer) {
      return new NextResponse("Producteur non trouvé", { status: 404 })
    }

    // Vérifier si les informations bancaires sont configurées
    if (!producer.iban || !producer.bankName || !producer.bankAccountName) {
      return new NextResponse(
        "Veuillez configurer vos informations bancaires dans les paramètres avant de demander un retrait", 
        { status: 400 }
      )
    }

    // Créer la demande de retrait
    const bankDetails = {
      bankName: producer.bankName,
      accountName: producer.bankAccountName,
      iban: producer.iban,
      bic: producer.bic
    }

    const withdrawal = await WalletService.createWithdrawalRequest(producer.id, amount, bankDetails)

    return NextResponse.json(withdrawal)
  } catch (error) {
    console.error("Erreur lors de la demande de retrait:", error)
    return new NextResponse(
      error instanceof Error ? error.message : "Erreur serveur", 
      { status: 500 }
    )
  }
}, ["PRODUCER"])