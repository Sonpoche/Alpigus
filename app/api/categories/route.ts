import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"

// Obtenir toutes les catégories
export const GET = apiAuthMiddleware(async (req: Request) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        products: true, // Inclut le nombre de produits dans chaque catégorie
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    return new NextResponse("Erreur lors de la récupération des catégories", { status: 500 })
  }
})

// Créer une nouvelle catégorie
export const POST = apiAuthMiddleware(
  async (req: Request) => {
    try {
      const body = await req.json()
      const { name } = body

      // Vérifie si la catégorie existe déjà
      const existingCategory = await prisma.category.findUnique({
        where: { name }
      })

      if (existingCategory) {
        return new NextResponse("Cette catégorie existe déjà", { status: 400 })
      }

      const category = await prisma.category.create({
        data: { name }
      })

      return NextResponse.json(category)
    } catch (error) {
      return new NextResponse("Erreur lors de la création de la catégorie", { status: 500 })
    }
  },
  ["ADMIN"] // Seuls les admins peuvent créer des catégories
)