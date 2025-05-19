// app/api/wallet/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { WalletService } from "@/lib/wallet-service"

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    // Récupérer le producteur associé à l'utilisateur
    const producer = await prisma.producer.findUnique({
      where: { userId: session.user.id }
    })

    if (!producer) {
      return new NextResponse("Producteur non trouvé", { status: 404 })
    }

    // Récupérer les détails du portefeuille
    const walletDetails = await WalletService.getProducerWalletDetails(producer.id)
    
    // Ajouter les informations du producteur
    const result = {
      ...walletDetails,
      producer: {
        id: producer.id,
        bankName: producer.bankName,
        bankAccountName: producer.bankAccountName,
        iban: producer.iban,
        bic: producer.bic
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Erreur lors de la récupération du portefeuille:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}, ["PRODUCER"])