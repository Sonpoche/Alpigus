// app/api/delivery-slots/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { UserRole } from "@prisma/client"

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '10')
    const date = searchParams.get('date')
    const productId = searchParams.get('productId')

    let where: any = {}
    
    if (date) {
      where.date = new Date(date)
    }
    
    if (productId) {
      where.productId = productId
    }

    // Vérifier les autorisations avec une approche différente
    if (typeof session.user.role === 'string' && session.user.role.includes('PRODUCER')) {
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id }
      })

      if (!producer) {
        return new NextResponse("Producteur non trouvé", { status: 404 })
      }

      if (!productId) {
        where.product = {
          producer: {
            userId: session.user.id
          }
        }
      } else {
        // Si un productId est spécifié, vérifier qu'il appartient au producteur
        const product = await prisma.product.findFirst({
          where: { 
            id: productId,
            producer: {
              userId: session.user.id
            }
          }
        })
        
        // Utiliser une méthode différente pour vérifier les autorisations
        const isAdmin = typeof session.user.role === 'string' && session.user.role.includes('ADMIN');
        if (!product && !isAdmin) {
          return new NextResponse("Non autorisé", { status: 403 })
        }
      }
    }

    const [slots, total] = await Promise.all([
      prisma.deliverySlot.findMany({
        where,
        include: {
          product: {
            include: {
              stock: true,
              producer: {
                include: {
                  user: true
                }
              }
            }
          },
          bookings: true
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'asc' }
      }),
      prisma.deliverySlot.count({ where })
    ])

    return NextResponse.json({
      slots,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des créneaux:", error)
    return new NextResponse(
      "Erreur lors de la récupération des créneaux", 
      { status: 500 }
    )
  }
})

export const POST = apiAuthMiddleware(
  async (req: NextRequest, session: Session) => {
    try {
      // Vérifier que c'est bien un producteur avec une approche différente
      const isProducer = typeof session.user.role === 'string' && session.user.role.includes('PRODUCER');
      if (!isProducer) {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      // Récupérer le producteur
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id }
      })

      if (!producer) {
        return new NextResponse("Producteur non trouvé", { status: 404 })
      }

      const body = await req.json()
      const { productId, date, maxCapacity } = body

      // Vérifier que le produit appartient bien au producteur
      const product = await prisma.product.findUnique({
        where: { id: productId }
      })

      if (!product) {
        return new NextResponse("Produit non trouvé", { status: 404 })
      }

      if (product.producerId !== producer.id) {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      // Créer le créneau
      const slot = await prisma.deliverySlot.create({
        data: {
          productId,
          date: new Date(date),
          maxCapacity,
          reserved: 0,
          isAvailable: true
        },
        include: {
          product: {
            include: {
              producer: true
            }
          }
        }
      })

      return NextResponse.json(slot)
    } catch (error) {
      console.error("Erreur lors de la création du créneau:", error)
      return new NextResponse(
        "Erreur lors de la création du créneau", 
        { status: 500 }
      )
    }
  },
  ["PRODUCER"]  // Seuls les producteurs peuvent créer des créneaux
)