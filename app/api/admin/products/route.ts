// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { ProductType } from "@prisma/client"
import { PRESET_IMAGES } from '@/types/images'

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'ADMIN') {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '10')
    
    // Récupérer tous les produits sans filtrage par producteur
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        include: {
          producer: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                }
              }
            }
          },
          categories: true,
          stock: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count()
    ])

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error)
    return new NextResponse(
      "Erreur lors de la récupération des produits", 
      { status: 500 }
    )
  }
}, ["ADMIN"])

export const POST = apiAuthMiddleware(
  async (req: NextRequest, session: Session) => {
    try {
      // Vérifier que l'utilisateur est admin
      if (session.user.role !== 'ADMIN') {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      const body = await req.json()
      const { 
        name, 
        description, 
        price, 
        type, 
        unit, 
        producerId,
        categories, 
        initialStock,
        imagePreset
      } = body

      // Validations
      if (!name || !price || !type || !unit || !producerId) {
        return new NextResponse("Champs requis manquants", { status: 400 })
      }

      if (price < 0) {
        return new NextResponse("Le prix ne peut pas être négatif", { status: 400 })
      }

      if (initialStock < 0) {
        return new NextResponse("Le stock initial ne peut pas être négatif", { status: 400 })
      }

      if (!Object.values(ProductType).includes(type)) {
        return new NextResponse("Type de produit invalide", { status: 400 })
      }

      // Vérifier que le producteur existe
      const producer = await prisma.producer.findUnique({
        where: { id: producerId }
      })

      if (!producer) {
        return new NextResponse("Producteur non trouvé", { status: 404 })
      }

      // Gérer l'image prédéfinie
      let imageUrl = null;
      if (imagePreset) {
        const preset = PRESET_IMAGES.find(p => p.id === imagePreset);
        if (preset) {
          imageUrl = preset.src;
        } else {
          return new NextResponse("Image prédéfinie non valide", { status: 400 });
        }
      }

      // Validation des catégories
      if (categories?.length > 0) {
        const existingCategories = await prisma.category.findMany({
          where: {
            id: {
              in: categories
            }
          }
        })

        if (existingCategories.length !== categories.length) {
          return new NextResponse(
            "Une ou plusieurs catégories n'existent pas",
            { status: 400 }
          )
        }
      }

      // Créer le produit
      const product = await prisma.product.create({
        data: {
          name,
          description,
          price,
          type: type as ProductType,
          unit,
          image: imageUrl,
          producerId,
          available: true,
          stock: {
            create: {
              quantity: initialStock
            }
          },
          ...(categories && {
            categories: {
              connect: categories.map((id: string) => ({ id }))
            }
          })
        },
        include: {
          stock: true,
          categories: true,
          producer: true
        }
      })

      return NextResponse.json(product)
    } catch (error) {
      console.error("Erreur création produit:", error)
      return new NextResponse(
        "Erreur lors de la création du produit", 
        { status: 500 }
      )
    }
  },
  ["ADMIN"]
)