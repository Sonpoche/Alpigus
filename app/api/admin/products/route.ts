// app/api/admin/products/route.ts - Version securisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { ProductType } from "@prisma/client"
import { PRESET_IMAGES } from '@/types/images'
import { createError } from "@/lib/error-handler"
import { z } from "zod"

// Schémas de validation
const getProductsQuerySchema = z.object({
  page: z.coerce.number().min(1),
  limit: z.coerce.number().min(1).max(100),
  search: z.string().max(100).optional(),
  type: z.nativeEnum(ProductType).optional(),
  producerId: z.string().cuid().optional()
})

const createProductSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(255, 'Nom trop long'),
  description: z.string().max(2000, 'Description trop longue').optional(),
  price: z.number().min(0, 'Prix ne peut pas être négatif'),
  type: z.nativeEnum(ProductType, {
    errorMap: () => ({ message: 'Type de produit invalide' })
  }),
  unit: z.string().min(1, 'Unité requise').max(50, 'Unité trop longue'),
  producerId: z.string().cuid('ID producteur invalide'),
  categories: z.array(z.string().cuid()).optional(),
  initialStock: z.number().min(0, 'Stock initial ne peut pas être négatif').optional(),
  imagePreset: z.string().optional()
}).strict()

// Valeurs par défaut
const defaultParams = {
  page: 1,
  limit: 10
}

export const GET = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    console.log(`📦 Admin ${session.user.id} consulte les produits`)
    
    // Validation des paramètres de requête
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    // Appliquer les valeurs par défaut
    const parsedParams = {
      page: queryParams.page || defaultParams.page.toString(),
      limit: queryParams.limit || defaultParams.limit.toString(),
      search: queryParams.search,
      type: queryParams.type,
      producerId: queryParams.producerId
    }
    
    const { page, limit, search, type, producerId } = validateData(getProductsQuerySchema, parsedParams)
    
    // Construction de la requête avec filtres sécurisés
    const where: any = {}
    
    if (type) {
      where.type = type
    }
    
    if (producerId) {
      // Vérifier que le producteur existe
      const producer = await prisma.producer.findUnique({
        where: { id: producerId },
        select: { id: true }
      })
      
      if (!producer) {
        throw createError.notFound('Producteur non trouvé')
      }
      
      where.producerId = producerId
    }
    
    if (search && search.trim()) {
      const searchTerm = search.trim()
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }
    
    // Exécution des requêtes en parallèle
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
          },
          // Statistiques utiles
          _count: {
            select: {
              orderItems: true,
              deliverySlots: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ])
    
    console.log(`📦 ${products.length} produits récupérés (page ${page}/${Math.ceil(total / limit)})`)
    
    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        search: search || null,
        type: type || null,
        producerId: producerId || null
      }
    })
    
  } catch (error) {
    console.error("❌ Erreur récupération produits:", error)
    throw error
  }
})

export const POST = withAdminSecurity(async (
  request: NextRequest, 
  session
) => {
  try {
    // Validation stricte des données d'entrée
    const rawData = await request.json()
    const validatedData = validateData(createProductSchema, rawData)
    
    const { 
      name, 
      description, 
      price, 
      type, 
      unit, 
      producerId,
      categories, 
      imagePreset
    } = validatedData
    
    // Gestion explicite de initialStock avec valeur par défaut
    const initialStock = validatedData.initialStock ?? 0
    
    console.log(`📦 Admin ${session.user.id} crée un produit: ${name} (stock initial: ${initialStock})`)
    
    // Vérifier que le producteur existe
    const producer = await prisma.producer.findUnique({
      where: { id: producerId },
      select: { 
        id: true, 
        companyName: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    
    if (!producer) {
      throw createError.notFound("Producteur non trouvé")
    }
    
    // Gérer l'image prédéfinie de manière sécurisée
    let imageUrl: string | null = null
    if (imagePreset) {
      const preset = PRESET_IMAGES.find(p => p.id === imagePreset)
      if (!preset) {
        throw createError.validation("Image prédéfinie non valide")
      }
      imageUrl = preset.src
    }
    
    // Validation des catégories si fournies
    if (categories && categories.length > 0) {
      const existingCategories = await prisma.category.findMany({
        where: {
          id: {
            in: categories
          }
        },
        select: { id: true }
      })
      
      if (existingCategories.length !== categories.length) {
        throw createError.validation("Une ou plusieurs catégories n'existent pas")
      }
    }
    
    // Transaction atomique pour créer le produit et ses relations
    const product = await prisma.$transaction(async (tx) => {
      // Créer le produit
      const newProduct = await tx.product.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          price,
          type: type,
          unit: unit.trim(),
          image: imageUrl,
          producerId,
          available: true,
          ...(categories && categories.length > 0 && {
            categories: {
              connect: categories.map((id: string) => ({ id }))
            }
          })
        },
        include: {
          categories: {
            select: {
              id: true,
              name: true
            }
          },
          producer: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      })
      
      // Créer le stock initial seulement si > 0
      if (initialStock > 0) {
        await tx.stock.create({
          data: {
            productId: newProduct.id,
            quantity: initialStock
          }
        })
        console.log(`📦 Stock initial créé: ${initialStock} unités`)
      } else {
        console.log(`📦 Produit créé sans stock initial`)
      }
      
      return newProduct
    })
    
    // Log d'audit
    try {
      await prisma.adminLog.create({
        data: {
          adminId: session.user.id,
          action: 'CREATE_PRODUCT',
          entityType: 'Product',
          entityId: product.id,
          details: JSON.stringify({
            productName: name,
            productType: type,
            producerName: producer.companyName,
            producerEmail: producer.user.email,
            initialStock,
            hasImage: !!imageUrl,
            categoriesCount: categories?.length || 0,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('⚠️ Erreur log admin (non critique):', logError)
    }
    
    console.log(`✅ Produit créé avec succès: ${product.id}`)
    
    return NextResponse.json(product)
    
  } catch (error) {
    console.error("❌ Erreur création produit:", error)
    throw error
  }
})