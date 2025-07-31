// app/api/wishlist/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schémas de validation
const addToWishlistSchema = z.object({
  productId: commonSchemas.id
}).strict()

const getWishlistQuerySchema = z.object({
  page: z.number().min(1),
  limit: z.number().min(1).max(50),
  category: z.string().optional(),
  available: z.boolean().optional()
})

// GET - Récupérer tous les favoris de l'utilisateur
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // Extraction et validation des paramètres de requête
    const { searchParams } = new URL(request.url)
    const rawParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      category: searchParams.get('category') || undefined,
      available: searchParams.get('available') === 'true' ? true : undefined
    }

    const validatedParams = validateData(getWishlistQuerySchema, rawParams)
    
    // TypeScript assertion: Zod garantit que ces valeurs existent
    const page = validatedParams.page as number
    const limit = validatedParams.limit as number
    const { category, available } = validatedParams

    console.log(`👤 Récupération wishlist utilisateur ${session.user.id}`)

    // Construction des filtres sécurisés
    const userId = session.user.id // SÉCURITÉ: Toujours filtrer par utilisateur

    // Filtres optionnels sur les produits
    const productFilters: any = {}
    if (category) {
      productFilters.categories = { 
        some: { 
          name: { 
            contains: category, 
            mode: 'insensitive' 
          } 
        } 
      }
    }
    if (available !== undefined) {
      productFilters.available = available
    }

    // Requête avec pagination sécurisée
    const wishlistWhere = {
      userId, // SÉCURITÉ: Isolation par utilisateur
      ...(Object.keys(productFilters).length > 0 && {
        product: productFilters
      })
    }

    const [wishlistItems, totalCount] = await Promise.all([
      prisma.wishlist.findMany({
        where: wishlistWhere,
        include: {
          product: {
            include: {
              producer: {
                select: {
                  id: true,
                  companyName: true
                }
              },
              categories: {
                select: {
                  id: true,
                  name: true
                }
              },
              stock: {
                select: {
                  quantity: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.wishlist.count({
        where: wishlistWhere
      })
    ])

    // Calcul des métadonnées de pagination
    const totalPages = Math.ceil(totalCount / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    const response = {
      items: wishlistItems,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNext,
        hasPrev
      },
      meta: {
        totalFavorites: totalCount,
        availableProducts: wishlistItems.filter(item => item.product?.available).length
      }
    }

    console.log(`✅ Wishlist récupérée: ${wishlistItems.length} items`)
    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ Erreur récupération wishlist:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 60, // Consultation fréquente autorisée
    window: 60
  }
})

// POST - Ajouter un produit aux favoris
export const POST = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // Validation des données d'entrée
    const rawData = await request.json()
    const { productId } = validateData(addToWishlistSchema, rawData)

    console.log(`❤️ Ajout produit ${productId} aux favoris par ${session.user.id}`)

    // Vérification de l'existence du produit
    const product = await prisma.product.findUnique({
      where: { 
        id: productId,
        available: true // Seuls les produits disponibles peuvent être ajoutés
      },
      select: {
        id: true,
        name: true,
        available: true,
        producer: {
          select: {
            id: true,
            companyName: true,
            userId: true
          }
        }
      }
    })

    if (!product) {
      throw createError.notFound("Produit non trouvé ou non disponible")
    }

    // Vérification que l'utilisateur n'ajoute pas ses propres produits
    if (product.producer.userId === session.user.id) {
      throw createError.validation("Vous ne pouvez pas ajouter vos propres produits aux favoris")
    }

    // Vérification si le produit n'est pas déjà dans les favoris
    const existingWishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId: productId
        }
      }
    })

    if (existingWishlistItem) {
      throw createError.validation("Produit déjà dans les favoris")
    }

    // Ajout sécurisé aux favoris
    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId: session.user.id,
        productId: productId
      },
      include: {
        product: {
          include: {
            producer: {
              select: {
                id: true,
                companyName: true
              }
            },
            categories: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    // Log d'audit
    console.log(`✅ Produit ajouté aux favoris:`, {
      userId: session.user.id,
      productId: productId,
      productName: product.name,
      producerName: product.producer.companyName,
      timestamp: new Date().toISOString()
    })

    const response = {
      wishlistItem,
      message: `${product.name} ajouté aux favoris`,
      success: true
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error("❌ Erreur ajout wishlist:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 30, // Limite pour éviter le spam
    window: 60
  }
})