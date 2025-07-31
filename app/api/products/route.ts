// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { ProductType, Prisma } from "@prisma/client"
import { PRESET_IMAGES } from '@/types/images'

// Schémas de validation
const productsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  type: z.nativeEnum(ProductType).optional(),
  category: z.string().optional(),
  available: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'popular', 'newest']).default('newest'),
  search: z.string().max(100).optional()
})

const createProductSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(200, 'Nom trop long'),
  description: z.string().max(2000, 'Description trop longue').optional(),
  price: z.number().min(0.01, 'Prix invalide'),
  type: z.nativeEnum(ProductType),
  unit: z.string().min(1, 'Unité requise').max(50, 'Unité trop longue'),
  categories: z.array(z.string().cuid()).max(10, 'Trop de catégories').optional(),
  initialStock: z.number().min(0, 'Stock initial invalide').default(0),
  imagePreset: z.string().optional(),
  acceptDeferred: z.boolean().default(false),
  minOrderQuantity: z.number().min(0, 'Quantité minimale invalide').default(0)
}).strict()

// GET - Obtenir la liste des produits
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Validation des paramètres de requête
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validatedQuery = validateData(productsQuerySchema, queryParams)
    const { type, category, available, minPrice, maxPrice, sortBy, search } = validatedQuery
    
    // Assurer que page et limit ont des valeurs définies (garanties par les valeurs par défaut Zod)
    const page = validatedQuery.page!
    const limit = validatedQuery.limit!

    console.log(`🛍️ Récupération produits par ${session.user.role} ${session.user.id}`)

    // 2. Construction des filtres de base sécurisés
    const baseWhere: Prisma.ProductWhereInput = {}
    
    if (type) {
      baseWhere.type = type
    }
    
    if (category) {
      baseWhere.categories = { some: { id: category } }
    }

    if (available !== undefined) {
      baseWhere.available = available
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      baseWhere.price = {}
      if (minPrice !== undefined) baseWhere.price.gte = minPrice
      if (maxPrice !== undefined) baseWhere.price.lte = maxPrice
    }

    if (search && search.trim()) {
      const searchTerm = search.trim()
      baseWhere.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { categories: { some: { name: { contains: searchTerm, mode: 'insensitive' } } } }
      ]
    }

    // 3. Filtres selon le rôle utilisateur
    let where: Prisma.ProductWhereInput = { ...baseWhere }
    
    if (session.user.role === 'PRODUCER') {
      // Producteurs ne voient que leurs produits
      where = {
        ...where,
        producer: {
          userId: session.user.id
        }
      }
    } else if (session.user.role === 'CLIENT') {
      // Clients ne voient que les produits disponibles par défaut
      if (available === undefined) {
        where = {
          ...where,
          available: true
        }
      }
    }
    // Admins voient tous les produits

    // 4. Configuration du tri sécurisé
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' }
    
    switch (sortBy) {
      case 'price_asc':
        orderBy = { price: 'asc' }
        break
      case 'price_desc':
        orderBy = { price: 'desc' }
        break
      case 'popular':
        // Pour la popularité, on pourrait trier par le nombre de commandes
        orderBy = { createdAt: 'desc' } // Fallback
        break
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' }
    }

    // 5. Récupération sécurisée des produits
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          producer: {
            include: {
              user: {
                select: {
                  name: true,
                  email: session.user.role === 'ADMIN', // Email visible pour admin seulement
                  phone: session.user.role !== 'CLIENT' // Téléphone masqué pour clients
                }
              }
            }
          },
          categories: true,
          stock: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy
      }),
      prisma.product.count({ where })
    ])

    // 6. Log d'audit sécurisé
    console.log(`📋 Audit - Produits consultés:`, {
      consultedBy: session.user.id,
      role: session.user.role,
      productsCount: products.length,
      filters: { type, category, available, search: !!search },
      timestamp: new Date().toISOString()
    })

    console.log(`✅ ${products.length} produits récupérés sur ${total}`)

    // 7. Réponse sécurisée
    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1
      },
      meta: {
        accessLevel: session.user.role,
        filtersApplied: { type, category, available, search: !!search }
      }
    })

  } catch (error) {
    console.error("❌ Erreur récupération produits:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'PRODUCER', 'ADMIN'],
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 200, // Consultation fréquente
    window: 60
  }
})

// POST - Créer un nouveau produit (PRODUCTEUR uniquement)
export const POST = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Validation des données d'entrée
    const rawData = await request.json()
    const validatedData = validateData(createProductSchema, rawData)
    
    const { 
      name, 
      description, 
      price, 
      type, 
      unit, 
      categories, 
      imagePreset,
      acceptDeferred,
      minOrderQuantity
    } = validatedData
    
    // Assurer que initialStock a une valeur définie (garantie par valeur par défaut Zod)
    const initialStock = validatedData.initialStock!

    console.log(`🏭 Création produit par producteur ${session.user.id}`)

    // 2. Vérification du profil producteur
    const producer = await prisma.producer.findUnique({
      where: { userId: session.user.id },
      select: { id: true, companyName: true }
    })

    if (!producer) {
      throw createError.notFound("Profil producteur non trouvé")
    }

    // 3. Gestion sécurisée de l'image prédéfinie
    let imageUrl: string | null = null
    if (imagePreset) {
      const preset = PRESET_IMAGES.find(p => p.id === imagePreset)
      if (preset) {
        imageUrl = preset.src
      } else {
        throw createError.validation("Image prédéfinie non valide")
      }
    }

    // 4. Validation des catégories si fournies
    if (categories && categories.length > 0) {
      const existingCategories = await prisma.category.findMany({
        where: { id: { in: categories } },
        select: { id: true }
      })

      if (existingCategories.length !== categories.length) {
        throw createError.validation("Une ou plusieurs catégories n'existent pas")
      }
    }

    // 5. Création sécurisée du produit avec transaction
    const product = await prisma.$transaction(async (tx) => {
      // Créer le produit
      const newProduct = await tx.product.create({
        data: {
          name: name.trim(),
          description: description?.trim() || '',
          price,
          type,
          unit: unit.trim(),
          image: imageUrl,
          producerId: producer.id,
          available: true,
          acceptDeferred,
          minOrderQuantity,
          stock: {
            create: {
              quantity: initialStock
            }
          },
          ...(categories && categories.length > 0 && {
            categories: {
              connect: categories.map((id: string) => ({ id }))
            }
          })
        },
        include: {
          stock: true,
          categories: true,
          producer: {
            select: {
              id: true,
              companyName: true,
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      })

      // Créer une entrée d'historique de stock initial
      if (initialStock > 0) {
        await tx.stockHistory.create({
          data: {
            productId: newProduct.id,
            quantity: initialStock,
            type: 'initial',
            note: 'Stock initial à la création'
          }
        })
      }

      return newProduct
    })

    // 6. Log d'audit sécurisé
    console.log(`📋 Audit - Produit créé:`, {
      productId: product.id,
      createdBy: session.user.id,
      producerId: producer.id,
      productName: name,
      price,
      initialStock,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Produit créé: ${product.id} par ${producer.companyName}`)

    return NextResponse.json(product, { status: 201 })

  } catch (error) {
    console.error("❌ Erreur création produit:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER'], // Seuls les producteurs peuvent créer
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 20, // Création limitée
    window: 60
  }
})