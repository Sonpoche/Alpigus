// app/api/admin/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const GET = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      // Vérifier que l'utilisateur est admin
      if (session.user.role !== 'ADMIN') {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      const orderId = context.params.id
      
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          items: {
            include: {
              product: {
                include: {
                  producer: {
                    include: {
                      user: {
                        select: {
                          name: true,
                          email: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          invoice: true
        }
      })

      if (!order) {
        return new NextResponse("Commande introuvable", { status: 404 })
      }

      return NextResponse.json(order)
    } catch (error) {
      console.error("Erreur lors de la récupération de la commande:", error)
      return new NextResponse("Erreur lors de la récupération de la commande", { status: 500 })
    }
  },
  ["ADMIN"] // Seuls les admins peuvent accéder à cet endpoint
)