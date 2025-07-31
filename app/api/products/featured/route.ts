// app/api/products/featured/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withPublicSecurity, validateData } from "@/lib/api-security"
import { handleError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schéma de validation pour les paramètres
const featuredQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(20).default(6)
})

// GET - Obtenir les produits en vedette (route publique)
export const GET = withPublicSecurity(async (request: NextRequest) => {
  try {
    // 1. Validation des paramètres
    const { searchParams } = new URL(request.url)
    const queryParams = {
      limit: searchParams.get('limit')
    }
    
    const { limit } = validateData(featuredQuerySchema, queryParams)

    console.log(`⭐ Récupération produits vedette (limit: ${limit})`)

    // 2. Récupération sécurisée des produits en vedette
    const products = await prisma.product.findMany({
      where: {
        available: true, // Seulement les produits disponibles
        // Optionnel: ajouter d'autres critères comme stock > 0
        stock: {
          quantity: {
            gt: 0
          }
        }
      },
      include: {
        producer: {
          select: {
            id: true,
            companyName: true,
            address: true, // Visible pour livraisons
            user: {
              select: {
                name: true
                // Email et téléphone masqués pour route publique
              }
            }
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
            quantity: true,
            updatedAt: true
          }
        }
      },
      take: limit,
      orderBy: [
        { createdAt: 'desc' }, // Produits récents d'abord
        { available: 'desc' }  // Disponibles en priorité
      ]
    })

    // 3. Filtrage des données sensibles pour route publique
    const publicProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      type: product.type,
      unit: product.unit,
      image: product.image,
      available: product.available,
      acceptDeferred: product.acceptDeferred,
      minOrderQuantity: product.minOrderQuantity,
      categories: product.categories,
      producer: {
        id: product.producer.id,
        companyName: product.producer.companyName,
        address: product.producer.address,
        user: {
          name: product.producer.user.name
        }
      },
      stock: {
        // Indiquer seulement si en stock ou pas (pas la quantité exacte)
        inStock: product.stock ? product.stock.quantity > 0 : false,
        // Optionnel: niveau de stock approximatif
        stockLevel: product.stock ? 
          (product.stock.quantity > 10 ? 'high' : 
           product.stock.quantity > 5 ? 'medium' : 'low') : 'out'
      }
    }))

    // 4. Log d'audit (route publique)
    console.log(`📋 Audit - Produits vedette consultés:`, {
      productsCount: publicProducts.length,
      requestIP: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent')?.substring(0, 100) || 'unknown',
      timestamp: new Date().toISOString()
    })

    console.log(`✅ ${publicProducts.length} produits vedette récupérés`)

    return NextResponse.json({
      products: publicProducts,
      meta: {
        count: publicProducts.length,
        maxLimit: 20,
        accessLevel: 'public'
      }
    })

  } catch (error) {
    console.error("❌ Erreur récupération produits vedette:", error)
    return handleError(error, request.url)
  }
}, {
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 300, // Limite élevée pour route publique
    window: 60
  }
})