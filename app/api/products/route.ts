import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { ProductType, Prisma } from "@prisma/client"
import { PRESET_IMAGES } from '@/types/images'

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '10')
    const typeParam = searchParams.get('type')
    const category = searchParams.get('category')
    const available = searchParams.get('available')

    // Validation du type de produit
    if (typeParam && !Object.values(ProductType).includes(typeParam as ProductType)) {
      return new NextResponse("Type de produit invalide", { status: 400 })
    }

    // Construction du filtre de base
    const baseWhere: Prisma.ProductWhereInput = {
      ...(typeParam && { type: typeParam as ProductType }),
      ...(category && { categories: { some: { id: category } } }),
      ...(available !== null && { available: available === 'true' }),
    }

    // Ajout des filtres spécifiques selon le rôle
    let where: Prisma.ProductWhereInput = { ...baseWhere }
    
    if (session.user.role === 'PRODUCER') {
      // Les producteurs ne voient que leurs produits
      where = {
        ...where,
        producer: {
          userId: session.user.id
        }
      }
    } else if (session.user.role === 'CLIENT') {
      // Les clients ne voient que les produits disponibles
      where = {
        ...where,
        available: true
      }
    }
    // Les admins voient tous les produits

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
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
      prisma.product.count({ where })
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
})

export const POST = apiAuthMiddleware(
  async (req: NextRequest, session: Session) => {
    try {
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id }
      })

      if (!producer) {
        return new NextResponse("Producteur non trouvé", { status: 404 })
      }

      const body = await req.json()
      const { 
        name, 
        description, 
        price, 
        type, 
        unit, 
        categories, 
        initialStock,
        imagePreset,
        acceptDeferred,   // Nouvel attribut
        minOrderQuantity  // Nouvel attribut
      } = body

      // Validations
      if (!name || !price || !type || !unit) {
        return new NextResponse("Champs requis manquants", { status: 400 })
      }

      if (price < 0) {
        return new NextResponse("Le prix ne peut pas être négatif", { status: 400 })
      }

      if (initialStock < 0) {
        return new NextResponse("Le stock initial ne peut pas être négatif", { status: 400 })
      }

      if (minOrderQuantity < 0) {
        return new NextResponse("La quantité minimale ne peut pas être négative", { status: 400 })
      }

      if (!Object.values(ProductType).includes(type)) {
        return new NextResponse("Type de produit invalide", { status: 400 })
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

      const product = await prisma.product.create({
        data: {
          name,
          description,
          price,
          type: type as ProductType,
          unit,
          image: imageUrl,
          producerId: producer.id,
          available: true,
          acceptDeferred: acceptDeferred === true,          // Nouvelle valeur
          minOrderQuantity: minOrderQuantity || 0,          // Nouvelle valeur
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
  ["PRODUCER"]
)