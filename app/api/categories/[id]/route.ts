import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

// Obtenir une catégorie spécifique
export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: context.params.id },
      include: {
        products: true
      }
    })

    if (!category) {
      return new NextResponse("Catégorie non trouvée", { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    return new NextResponse("Erreur lors de la récupération de la catégorie", { status: 500 })
  }
})

// Mettre à jour une catégorie
export const PATCH = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      const body = await req.json()
      const { name } = body

      const category = await prisma.category.update({
        where: { id: context.params.id },
        data: { name }
      })

      return NextResponse.json(category)
    } catch (error) {
      return new NextResponse("Erreur lors de la mise à jour de la catégorie", { status: 500 })
    }
  },
  ["ADMIN"]
)

// Supprimer une catégorie
export const DELETE = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      await prisma.category.delete({
        where: { id: context.params.id }
      })

      return new NextResponse(null, { status: 204 })
    } catch (error) {
      return new NextResponse("Erreur lors de la suppression de la catégorie", { status: 500 })
    }
  },
  ["ADMIN"]
)