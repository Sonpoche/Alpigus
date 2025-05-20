// app/api/admin/wallets/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { WalletService } from "@/lib/wallet-service"

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'ADMIN') {
      return new NextResponse("Non autorisé", { status: 403 })
    }
    
    const walletId = context.params.id
    
    // Vérifier si l'ID est temporaire (pour un portefeuille non encore créé)
    if (walletId.startsWith('temp-')) {
      const producerId = walletId.replace('temp-', '')
      
      // Récupérer le producteur
      const producer = await prisma.producer.findUnique({
        where: { id: producerId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      })
      
      if (!producer) {
        return new NextResponse("Producteur non trouvé", { status: 404 })
      }
      
      // Créer le portefeuille pour ce producteur
      await WalletService.ensureWalletExists(producerId)
      
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
                  phone: true
                }
              }
            }
          },
          withdrawals: {
            orderBy: {
              requestedAt: 'desc'
            }
          },
          transactions: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 50
          }
        }
      })
      
      if (!newWallet) {
        return new NextResponse("Portefeuille non trouvé", { status: 404 })
      }
      
      return NextResponse.json(newWallet)
    }
    
    // Si c'est un ID normal, récupérer le portefeuille normalement
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
                phone: true
              }
            }
          }
        },
        withdrawals: {
          orderBy: {
            requestedAt: 'desc'
          }
        },
        transactions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 50
        }
      }
    })
    
    if (!wallet) {
      return new NextResponse("Portefeuille non trouvé", { status: 404 })
    }
    
    return NextResponse.json(wallet)
  } catch (error) {
    console.error("Erreur lors de la récupération du portefeuille:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}, ["ADMIN"])