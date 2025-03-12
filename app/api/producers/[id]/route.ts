import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { NextRequest } from "next/server"

// Obtenir un producteur spécifique
export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const producer = await prisma.producer.findUnique({
      where: { id: context.params.id },
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

    if (!producer) {
      return new NextResponse("Producteur non trouvé", { status: 404 })
    }

    return NextResponse.json(producer)
  } catch (error) {
    return new NextResponse("Erreur lors de la récupération du producteur", { status: 500 })
  }
})

// Mettre à jour un producteur
export const PATCH = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      const body = await req.json()
      const { companyName, address, description } = body

      const producer = await prisma.producer.update({
        where: { id: context.params.id },
        data: {
          companyName,
          address,
          description,
        }
      })

      return NextResponse.json(producer)
    } catch (error) {
      return new NextResponse("Erreur lors de la mise à jour du producteur", { status: 500 })
    }
  },
  ["ADMIN", "PRODUCER"]
)

// Supprimer un producteur
export const DELETE = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      await prisma.producer.delete({
        where: { id: context.params.id }
      })

      return new NextResponse(null, { status: 204 })
    } catch (error) {
      return new NextResponse("Erreur lors de la suppression du producteur", { status: 500 })
    }
  },
  ["ADMIN"]
)