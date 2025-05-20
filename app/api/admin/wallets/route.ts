// app/api/admin/wallets/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'ADMIN') {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    // D'abord, récupérer tous les producteurs
    const producers = await prisma.producer.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Récupérer tous les portefeuilles existants
    const existingWallets = await prisma.wallet.findMany()
    
    // Pour chaque producteur, s'assurer qu'il a un portefeuille
    const wallets = await Promise.all(
      producers.map(async (producer) => {
        // Chercher si le portefeuille existe déjà
        let wallet = existingWallets.find(w => w.producerId === producer.id)
        
        // Si le portefeuille n'existe pas, on le crée temporairement pour l'affichage
        // sans l'enregistrer en base de données
        if (!wallet) {
          wallet = {
            id: `temp-${producer.id}`,
            producerId: producer.id,
            balance: 0,
            pendingBalance: 0,
            totalEarned: 0,
            totalWithdrawn: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
        
        // Calculer le nombre de retraits en attente
        const pendingWithdrawals = wallet.id.startsWith('temp-')
          ? 0
          : await prisma.withdrawal.count({
              where: {
                walletId: wallet.id,
                status: 'PENDING'
              }
            })
        
        // Retourner le portefeuille avec toutes les informations nécessaires
        return {
          ...wallet,
          pendingWithdrawals,
          producer: {
            ...producer
          }
        }
      })
    )

    return NextResponse.json(wallets)
  } catch (error) {
    console.error("Erreur lors de la récupération des portefeuilles:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}, ["ADMIN"])