import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"

// Obtenir la liste des producteurs
export const GET = apiAuthMiddleware(async (req: Request) => {
  try {
    const producers = await prisma.producer.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          }
        }
      }
    })

    return NextResponse.json(producers)
  } catch (error) {
    return new NextResponse("Erreur lors de la récupération des producteurs", { status: 500 })
  }
})

// Créer un nouveau producteur
export const POST = apiAuthMiddleware(
  async (req: Request) => {
    try {
      const body = await req.json()
      const { userId, companyName, address, description } = body

      const producer = await prisma.producer.create({
        data: {
          userId,
          companyName,
          address,
          description,
        }
      })

      return NextResponse.json(producer)
    } catch (error) {
      return new NextResponse("Erreur lors de la création du producteur", { status: 500 })
    }
  },
  ["ADMIN"] // Seuls les admins peuvent créer des producteurs manuellement
)