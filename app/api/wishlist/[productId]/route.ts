// app/api/wishlist/[productId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Interface pour la session
interface AuthSession {
  user: {
    id: string
    email?: string | null
    role?: string | null
    name?: string | null
  }
  expires: string
}

// Schéma de validation pour les paramètres d'URL
const paramsSchema = z.object({
  productId: commonSchemas.id
})

// DELETE - Supprimer un produit des favoris
export const DELETE = withAuthSecurity(async (
  request: NextRequest, 
  session: AuthSession
) => {
  try {
    // Extraction de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const productId = pathSegments[pathSegments.indexOf('wishlist') + 1]

    // Validation de l'ID du produit
    const { productId: validatedProductId } = validateData(paramsSchema, { productId })

    console.log(`🗑️ Suppression produit ${validatedProductId} des favoris par ${session.user.id}`)

    // Vérification que l'item existe bien pour cet utilisateur
    const existingWishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId: validatedProductId
        }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            producer: {
              select: {
                companyName: true
              }
            }
          }
        }
      }
    })

    if (!existingWishlistItem) {
      throw createError.notFound("Produit non trouvé dans vos favoris")
    }

    // Suppression sécurisée
    const deletedItem = await prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId: session.user.id, // SÉCURITÉ: Double vérification ownership
          productId: validatedProductId
        }
      }
    })

    // Log d'audit
    console.log(`✅ Produit supprimé des favoris:`, {
      userId: session.user.id,
      productId: validatedProductId,
      productName: existingWishlistItem.product.name,
      producerName: existingWishlistItem.product.producer.companyName,
      timestamp: new Date().toISOString()
    })

    const response = {
      success: true,
      message: `${existingWishlistItem.product.name} retiré des favoris`,
      deletedItem: {
        id: deletedItem.id,
        productId: deletedItem.productId,
        removedAt: deletedItem.updatedAt
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ Erreur suppression wishlist:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedMethods: ['DELETE'],
  rateLimit: {
    requests: 30, // Limite raisonnable pour suppressions
    window: 60
  }
})

// GET - Vérifier si un produit est dans les favoris
export const GET = withAuthSecurity(async (
  request: NextRequest,
  session: AuthSession
) => {
  try {
    // Extraction de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const productId = pathSegments[pathSegments.indexOf('wishlist') + 1]

    // Validation de l'ID du produit
    const { productId: validatedProductId } = validateData(paramsSchema, { productId })

    console.log(`🔍 Vérification favori produit ${validatedProductId} pour ${session.user.id}`)

    // Vérification sécurisée de l'existence dans les favoris
    const wishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId: validatedProductId
        }
      },
      select: {
        id: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
            available: true
          }
        }
      }
    })

    const response = {
      isFavorite: !!wishlistItem,
      favoriteInfo: wishlistItem ? {
        addedAt: wishlistItem.createdAt,
        productName: wishlistItem.product.name,
        isProductAvailable: wishlistItem.product.available
      } : null
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ Erreur vérification wishlist:", error)
    // Pour cette route, on retourne false en cas d'erreur pour ne pas casser l'UI
    return NextResponse.json({ 
      isFavorite: false,
      error: "Erreur lors de la vérification"
    })
  }
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 100, // Vérifications fréquentes autorisées
    window: 60
  }
})