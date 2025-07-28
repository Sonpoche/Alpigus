// app/api/admin/products/[id]/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { ProductType } from "@prisma/client"
import { PRESET_IMAGES } from '@/types/images'
import { createError } from "@/lib/error-handler"
import { z } from "zod"

// Schéma de validation pour la mise à jour
const updateProductSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(255, 'Nom trop long').optional(),
  description: z.string().max(2000, 'Description trop longue').optional(),
  price: z.number().min(0, 'Prix ne peut pas être négatif').optional(),
  type: z.nativeEnum(ProductType, {
    errorMap: () => ({ message: 'Type de produit invalide' })
  }).optional(),
  unit: z.string().min(1, 'Unité requise').max(50, 'Unité trop longue').optional(),
  producerId: z.string().cuid('ID producteur invalide').optional(),
  categories: z.array(z.string().cuid()).optional(),
  stock: z.object({
    quantity: z.number().min(0, 'Quantité ne peut pas être négative')
  }).optional(),
  available: z.boolean().optional(),
  imagePreset: z.string().nullable().optional()
}).strict()

// GET: Récupérer un produit spécifique
export const GET = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID produit
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const productId = pathParts[pathParts.indexOf('products') + 1]
    
    if (!productId || !productId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID produit invalide")
    }
    
    console.log(`📦 Admin ${session.user.id} consulte le produit ${productId}`)
    
    // Récupérer le produit avec toutes ses relations
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        producer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        categories: true,
        stock: true,
        orderItems: {
          include: {
            order: {
              select: {
                id: true,
                status: true,
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            }
          },
          orderBy: {
            id: 'desc'
          },
          take: 10
        },
        deliverySlots: {
          include: {
            bookings: {
              select: {
                quantity: true
              }
            }
          },
          where: {
            date: {
              gte: new Date()
            }
          },
          orderBy: {
            date: 'asc'
          },
          take: 5
        }
      }
    })

    if (!product) {
      throw createError.notFound("Produit non trouvé")
    }
    
    // Calculer des métriques utiles
    const totalQuantitySold = product.orderItems.reduce(
      (sum: number, item: any) => sum + item.quantity, 
      0
    )
    
    const totalRevenue = product.orderItems.reduce(
      (sum: number, item: any) => sum + (item.price * item.quantity), 
      0
    )
    
    const avgOrderValue = product.orderItems.length > 0 
      ? totalRevenue / product.orderItems.length 
      : 0
    
    const upcomingBookings = product.deliverySlots.reduce(
      (sum: number, slot: any) => sum + slot.bookings.reduce((bookingSum: number, booking: any) => bookingSum + booking.quantity, 0),
      0
    )
    
    // Enrichir la réponse avec les statistiques
    const enrichedProduct = {
      ...product,
      analytics: {
        totalQuantitySold,
        totalRevenue,
        avgOrderValue,
        totalOrders: product.orderItems.length,
        upcomingBookings,
        stockLevel: product.stock?.quantity || 0,
        lastStockUpdate: product.stock?.updatedAt || null
      }
    }
    
    console.log(`📦 Produit ${productId} récupéré avec analytics`)
    
    return NextResponse.json(enrichedProduct)
    
  } catch (error) {
    console.error("❌ Erreur récupération produit:", error)
    throw error
  }
})

// PATCH: Mettre à jour un produit
export const PATCH = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID produit
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const productId = pathParts[pathParts.indexOf('products') + 1]
    
    if (!productId || !productId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID produit invalide")
    }
    
    // Validation des données d'entrée
    const rawData = await request.json()
    const validatedData = validateData(updateProductSchema, rawData)
    
    console.log(`📦 Admin ${session.user.id} modifie le produit ${productId}`)
    
    // Vérifier que le produit existe
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { 
        producer: true,
        stock: true,
        categories: true
      }
    })

    if (!existingProduct) {
      throw createError.notFound("Produit non trouvé")
    }
    
    // Vérifier si le producteur existe (si fourni)
    if (validatedData.producerId) {
      const producer = await prisma.producer.findUnique({
        where: { id: validatedData.producerId },
        select: { id: true, companyName: true }
      })

      if (!producer) {
        throw createError.notFound("Producteur non trouvé")
      }
    }

    // Gérer l'image prédéfinie de manière sécurisée
    let imageUrl: string | null | undefined = undefined
    if (validatedData.imagePreset !== undefined) {
      if (validatedData.imagePreset === null) {
        imageUrl = null
      } else {
        const preset = PRESET_IMAGES.find(p => p.id === validatedData.imagePreset)
        if (!preset) {
          throw createError.validation("Image prédéfinie non valide")
        }
        imageUrl = preset.src
      }
    }

    // Validation des catégories si fournies
    if (validatedData.categories && validatedData.categories.length > 0) {
      const existingCategories = await prisma.category.findMany({
        where: {
          id: {
            in: validatedData.categories
          }
        },
        select: { id: true }
      })

      if (existingCategories.length !== validatedData.categories.length) {
        throw createError.validation("Une ou plusieurs catégories n'existent pas")
      }
    }

    // Transaction atomique pour la mise à jour complexe
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Préparer les données de mise à jour
      const updateData: any = {}
      
      if (validatedData.name !== undefined) updateData.name = validatedData.name.trim()
      if (validatedData.description !== undefined) updateData.description = validatedData.description?.trim() || null
      if (validatedData.price !== undefined) updateData.price = validatedData.price
      if (validatedData.type !== undefined) updateData.type = validatedData.type
      if (validatedData.unit !== undefined) updateData.unit = validatedData.unit.trim()
      if (validatedData.producerId !== undefined) updateData.producerId = validatedData.producerId
      if (imageUrl !== undefined) updateData.image = imageUrl
      if (validatedData.available !== undefined) updateData.available = validatedData.available
      
      // Gestion des catégories
      if (validatedData.categories) {
        updateData.categories = {
          set: validatedData.categories.map((id: string) => ({ id }))
        }
      }

      // Mise à jour du produit
      const updated = await tx.product.update({
        where: { id: productId },
        data: updateData,
        include: {
          categories: true,
          stock: true,
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

      // Mise à jour du stock si nécessaire
      if (validatedData.stock && typeof validatedData.stock.quantity === 'number') {
        await tx.stock.upsert({
          where: { productId },
          create: {
            productId,
            quantity: validatedData.stock.quantity
          },
          update: {
            quantity: validatedData.stock.quantity
          }
        })
        console.log(`📦 Stock mis à jour: ${validatedData.stock.quantity} unités`)
      }

      return updated
    })
    
    // Log d'audit détaillé
    const changes: any = {}
    if (validatedData.name && validatedData.name !== existingProduct.name) {
      changes.name = { from: existingProduct.name, to: validatedData.name }
    }
    if (validatedData.price && validatedData.price !== existingProduct.price) {
      changes.price = { from: existingProduct.price, to: validatedData.price }
    }
    if (validatedData.stock) {
      changes.stock = { 
        from: existingProduct.stock?.quantity || 0, 
        to: validatedData.stock.quantity 
      }
    }
    
    try {
      await prisma.adminLog.create({
        data: {
          adminId: session.user.id,
          action: 'UPDATE_PRODUCT',
          entityType: 'Product',
          entityId: productId,
          details: JSON.stringify({
            changes,
            productName: existingProduct.name,
            producerName: existingProduct.producer.companyName,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('⚠️ Erreur log admin (non critique):', logError)
    }

    console.log(`✅ Produit ${productId} mis à jour avec succès`)

    return NextResponse.json(updatedProduct)
    
  } catch (error) {
    console.error("❌ Erreur mise à jour produit:", error)
    throw error
  }
})

// DELETE: Supprimer un produit (soft delete recommandé)
export const DELETE = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID produit
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const productId = pathParts[pathParts.indexOf('products') + 1]
    
    if (!productId || !productId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID produit invalide")
    }
    
    console.log(`🗑️ Admin ${session.user.id} supprime le produit ${productId}`)
    
    // Vérifier que le produit existe et récupérer ses dépendances
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        producer: true,
        orderItems: true,
        deliverySlots: {
          include: {
            bookings: true
          }
        },
        _count: {
          select: {
            orderItems: true,
            deliverySlots: true
          }
        }
      }
    })

    if (!product) {
      throw createError.notFound("Produit non trouvé")
    }
    
    // Vérifier s'il y a des commandes en cours
    const hasActiveOrders = product.orderItems.length > 0
    const hasActiveBookings = product.deliverySlots.some(slot => slot.bookings.length > 0)
    
    if (hasActiveOrders || hasActiveBookings) {
      throw createError.validation(
        `Impossible de supprimer ce produit: ${product._count.orderItems} commande(s) et ${product.deliverySlots.length} créneau(x) de livraison associés`
      )
    }
    
    // Suppression en cascade sécurisée
    await prisma.$transaction(async (tx) => {
      // Supprimer les créneaux de livraison (sans réservations)
      await tx.deliverySlot.deleteMany({
        where: { productId }
      })
      
      // Supprimer le stock
      await tx.stock.deleteMany({
        where: { productId }
      })
      
      // Supprimer le produit
      await tx.product.delete({
        where: { id: productId }
      })
    })
    
    // Log d'audit
    try {
      await prisma.adminLog.create({
        data: {
          adminId: session.user.id,
          action: 'DELETE_PRODUCT',
          entityType: 'Product',
          entityId: productId,
          details: JSON.stringify({
            productName: product.name,
            productType: product.type,
            producerName: product.producer.companyName,
            hadOrders: hasActiveOrders,
            hadBookings: hasActiveBookings,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('⚠️ Erreur log admin (non critique):', logError)
    }

    console.log(`✅ Produit ${productId} supprimé avec succès`)

    return new NextResponse(null, { status: 204 })
    
  } catch (error) {
    console.error("❌ Erreur suppression produit:", error)
    throw error
  }
})