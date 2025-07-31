// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { ProductType } from "@prisma/client"
import { PRESET_IMAGES } from '@/types/images'

// Schémas de validation
const paramsSchema = z.object({
  id: commonSchemas.id
})

const updateProductSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(200, 'Nom trop long').optional(),
  description: z.string().max(2000, 'Description trop longue').optional(),
  price: z.number().min(0.01, 'Prix invalide').optional(),
  type: z.nativeEnum(ProductType).optional(),
  unit: z.string().min(1, 'Unité requise').max(50, 'Unité trop longue').optional(),
  categories: z.array(z.string().cuid()).max(10, 'Trop de catégories').optional(),
  available: z.boolean().optional(),
  stock: z.object({
    quantity: z.number().min(0, 'Stock invalide')
  }).optional(),
  imagePreset: z.string().nullable().optional(),
  acceptDeferred: z.boolean().optional(),
  minOrderQuantity: z.number().min(0, 'Quantité minimale invalide').optional()
}).strict()

// GET - Obtenir un produit spécifique
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const productId = pathSegments[pathSegments.indexOf('products') + 1]

    const { id } = validateData(paramsSchema, { id: productId })

    console.log(`🛍️ Récupération produit ${id} par ${session.user.role} ${session.user.id}`)

    // 2. Récupération sécurisée du produit
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        producer: {
          include: {
            user: {
              select: {
                name: true,
                email: session.user.role === 'ADMIN', // Email pour admin seulement
                phone: session.user.role !== 'CLIENT' // Téléphone masqué pour clients
              }
            }
          }
        },
        categories: true,
        stock: true,
      }
    })

    if (!product) {
      throw createError.notFound("Produit non trouvé")
    }

    // 3. Vérifications d'autorisation selon le rôle
    let canViewSensitiveData = false
    
    if (session.user.role === 'ADMIN') {
      canViewSensitiveData = true
    } else if (session.user.role === 'PRODUCER' && product.producer.userId === session.user.id) {
      canViewSensitiveData = true
      console.log(`🏭 Producteur ${product.producer.user.name} consulte son produit`)
    } else if (session.user.role === 'CLIENT' && !product.available) {
      // Clients ne peuvent pas voir les produits non disponibles
      throw createError.notFound("Produit non disponible")
    }

    // 4. Filtrage des données selon les autorisations
    const responseData = {
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
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      categories: product.categories,
      producer: {
        id: product.producer.id,
        companyName: product.producer.companyName,
        address: product.producer.address, // Nécessaire pour livraisons
        user: {
          name: product.producer.user.name,
          ...(canViewSensitiveData && product.producer.user.email && {
            email: product.producer.user.email
          }),
          ...(canViewSensitiveData && product.producer.user.phone && {
            phone: product.producer.user.phone
          })
        }
      },
      // Stock selon le niveau d'accès
      stock: canViewSensitiveData ? {
        quantity: product.stock?.quantity || 0,
        updatedAt: product.stock?.updatedAt
      } : {
        inStock: (product.stock?.quantity || 0) > 0,
        stockLevel: product.stock ? 
          (product.stock.quantity > 10 ? 'high' : 
           product.stock.quantity > 5 ? 'medium' : 'low') : 'out'
      }
    }

    // 5. Log d'audit sécurisé
    console.log(`📋 Audit - Produit consulté:`, {
      productId: id,
      consultedBy: session.user.id,
      role: session.user.role,
      canViewSensitive: canViewSensitiveData,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Produit ${id} récupéré`)

    return NextResponse.json({
      ...responseData,
      meta: {
        accessLevel: canViewSensitiveData ? 'full' : 'public',
        viewerRole: session.user.role
      }
    })

  } catch (error) {
    console.error("❌ Erreur récupération produit:", error)
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

// PATCH - Mettre à jour un produit
export const PATCH = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const productId = pathSegments[pathSegments.indexOf('products') + 1]

    const { id } = validateData(paramsSchema, { id: productId })

    // 2. Validation des données de mise à jour
    const rawData = await request.json()
    const validatedData = validateData(updateProductSchema, rawData)

    console.log(`✏️ Mise à jour produit ${id} par ${session.user.role} ${session.user.id}`)

    // 3. Vérification d'existence et d'autorisation
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { 
        producer: true,
        stock: true
      }
    })

    if (!existingProduct) {
      throw createError.notFound("Produit non trouvé")
    }

    // Vérification d'autorisation stricte
    if (session.user.role !== 'ADMIN' && existingProduct.producer.userId !== session.user.id) {
      throw createError.forbidden("Vous ne pouvez modifier que vos propres produits")
    }

    // 4. Gestion sécurisée de l'image prédéfinie
    let imageUrl: string | null | undefined = undefined
    if (validatedData.imagePreset !== undefined) {
      if (validatedData.imagePreset === null) {
        imageUrl = null
      } else {
        const preset = PRESET_IMAGES.find(p => p.id === validatedData.imagePreset)
        if (preset) {
          imageUrl = preset.src
        } else {
          throw createError.validation("Image prédéfinie non valide")
        }
      }
    }

    // 5. Validation des catégories si fournies
    if (validatedData.categories && validatedData.categories.length > 0) {
      const existingCategories = await prisma.category.findMany({
        where: { id: { in: validatedData.categories } },
        select: { id: true }
      })

      if (existingCategories.length !== validatedData.categories.length) {
        throw createError.validation("Une ou plusieurs catégories n'existent pas")
      }
    }

    // 6. Mise à jour sécurisée avec transaction
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Mise à jour du produit
      const updated = await tx.product.update({
        where: { id },
        data: {
          ...(validatedData.name !== undefined && { name: validatedData.name.trim() }),
          ...(validatedData.description !== undefined && { description: validatedData.description?.trim() || '' }),
          ...(validatedData.price !== undefined && { price: validatedData.price }),
          ...(validatedData.type !== undefined && { type: validatedData.type }),
          ...(validatedData.unit !== undefined && { unit: validatedData.unit.trim() }),
          ...(imageUrl !== undefined && { image: imageUrl }),
          ...(validatedData.available !== undefined && { available: validatedData.available }),
          ...(validatedData.acceptDeferred !== undefined && { acceptDeferred: validatedData.acceptDeferred }),
          ...(validatedData.minOrderQuantity !== undefined && { minOrderQuantity: validatedData.minOrderQuantity }),
          ...(validatedData.categories && validatedData.categories.length > 0 && {
            categories: {
              set: validatedData.categories.map((categoryId: string) => ({ id: categoryId }))
            }
          })
        },
        include: {
          categories: true,
          stock: true,
          producer: true
        }
      })

      // Mise à jour du stock si nécessaire
      if (validatedData.stock && typeof validatedData.stock.quantity === 'number') {
        const previousStock = existingProduct.stock

        await tx.stock.upsert({
          where: { productId: id },
          create: {
            productId: id,
            quantity: validatedData.stock.quantity
          },
          update: {
            quantity: validatedData.stock.quantity
          }
        })

        // Créer une entrée d'historique
        await tx.stockHistory.create({
          data: {
            productId: id,
            quantity: validatedData.stock.quantity,
            type: 'adjustment',
            note: `Ajustement lors de mise à jour produit (${(previousStock?.quantity || 0)} → ${validatedData.stock.quantity})`
          }
        })
      }

      return updated
    })

    // 7. Log d'audit sécurisé
    console.log(`📋 Audit - Produit modifié:`, {
      productId: id,
      modifiedBy: session.user.id,
      role: session.user.role,
      fieldsUpdated: Object.keys(validatedData),
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Produit ${id} mis à jour`)

    return NextResponse.json(updatedProduct)

  } catch (error) {
    console.error("❌ Erreur mise à jour produit:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN'],
  allowedMethods: ['PATCH'],
  rateLimit: {
    requests: 30, // Modifications limitées
    window: 60
  }
})

// DELETE - Supprimer un produit
export const DELETE = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const productId = pathSegments[pathSegments.indexOf('products') + 1]

    const { id } = validateData(paramsSchema, { id: productId })

    console.log(`🗑️ Suppression produit ${id} par ${session.user.role} ${session.user.id}`)

    // 2. Vérification d'existence et d'autorisation
    const product = await prisma.product.findUnique({
      where: { id },
      include: { 
        producer: true,
        orderItems: {
          select: { id: true }
        }
      }
    })

    if (!product) {
      throw createError.notFound("Produit non trouvé")
    }

    // Vérification d'autorisation stricte
    if (session.user.role !== 'ADMIN' && product.producer.userId !== session.user.id) {
      throw createError.forbidden("Vous ne pouvez supprimer que vos propres produits")
    }

    // 3. Vérifications de contraintes métier
    if (product.orderItems.length > 0) {
      throw createError.validation(
        "Impossible de supprimer ce produit car il est lié à des commandes existantes"
      )
    }

    // 4. Suppression sécurisée
    await prisma.product.delete({
      where: { id }
      // Les relations (stock, stockHistory, etc.) seront supprimées automatiquement via les cascades Prisma
    })

    // 5. Nettoyage des fichiers d'images si nécessaire
    if (product.image && product.image.startsWith('/uploads/')) {
      try {
        const fs = await import('fs/promises')
        const path = await import('path')
        
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'products', id)
        await fs.rm(uploadsDir, { recursive: true, force: true })
        console.log(`Dossier d'images supprimé: ${uploadsDir}`)
      } catch (error) {
        console.error('Erreur lors de la suppression du dossier d\'images:', error)
        // On continue même si la suppression du dossier échoue
      }
    }

    // 6. Log d'audit sécurisé
    console.log(`📋 Audit - Produit supprimé:`, {
      productId: id,
      deletedBy: session.user.id,
      role: session.user.role,
      productName: product.name,
      producerCompany: product.producer.companyName,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Produit ${id} supprimé avec succès`)

    return new NextResponse(null, { status: 204 })

  } catch (error) {
    console.error("❌ Erreur suppression produit:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN'],
  allowedMethods: ['DELETE'],
  rateLimit: {
    requests: 10, // Suppressions très limitées
    window: 60
  }
})