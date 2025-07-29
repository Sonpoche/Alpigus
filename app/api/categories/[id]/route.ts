// app/api/categories/[id]/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, withPublicSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { createError } from "@/lib/error-handler"
import { z } from "zod"

// Schéma de validation pour la mise à jour de catégories
const updateCategorySchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .trim()
    .refine(name => /^[a-zA-ZÀ-ÿ\s\-&'()]+$/.test(name), {
      message: 'Le nom ne peut contenir que des lettres, espaces et caractères spéciaux de base'
    })
}).strict()

// GET: Obtenir une catégorie spécifique (route publique)
export const GET = withPublicSecurity(async (
  request: NextRequest
) => {
  try {
    // Extraction et validation de l'ID de la catégorie
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const categoryId = pathParts[pathParts.indexOf('categories') + 1]
    
    if (!categoryId || !categoryId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de catégorie invalide")
    }
    
    console.log(`Récupération de la catégorie ${categoryId}`)
    
    // Paramètres de requête
    const { searchParams } = new URL(request.url)
    const includeProducts = searchParams.get('includeProducts') !== 'false' // true par défaut
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc'
    
    // Validation des paramètres de tri
    const validSortFields = ['name', 'price', 'createdAt']
    let orderBy: any = { name: 'asc' }
    
    if (validSortFields.includes(sortBy)) {
      orderBy = { [sortBy]: sortOrder }
    }
    
    // Récupérer la catégorie
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        products: includeProducts ? {
          where: {
            available: true
          },
          include: {
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
            },
            stock: {
              select: {
                quantity: true
              }
            }
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit
        } : false,
        _count: {
          select: {
            products: {
              where: {
                available: true
              }
            }
          }
        }
      }
    })
    
    if (!category) {
      throw createError.notFound("Catégorie non trouvée")
    }
    
    // Calculer des statistiques pour les produits de cette catégorie
    const productStats = await prisma.product.aggregate({
      where: {
        categories: {
          some: {
            id: categoryId
          }
        },
        available: true
      },
      _count: {
        id: true
      },
      _avg: {
        price: true
      },
      _min: {
        price: true
      },
      _max: {
        price: true
      }
    })
    
    // Enrichir la réponse
    const enrichedCategory = {
      ...category,
      stats: {
        totalProducts: productStats._count.id,
        displayedProducts: category.products?.length || 0,
        averagePrice: productStats._avg.price ? Math.round(productStats._avg.price * 100) / 100 : 0,
        priceRange: {
          min: productStats._min.price || 0,
          max: productStats._max.price || 0
        }
      },
      pagination: includeProducts ? {
        page,
        limit,
        total: productStats._count.id,
        pages: Math.ceil(productStats._count.id / limit),
        hasMore: page * limit < productStats._count.id
      } : null
    }
    
    return NextResponse.json(enrichedCategory)
    
  } catch (error) {
    console.error("Erreur lors de la récupération de la catégorie:", error)
    throw error
  }
})

// PATCH: Mettre à jour une catégorie (admin seulement)
export const PATCH = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID de la catégorie
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const categoryId = pathParts[pathParts.indexOf('categories') + 1]
    
    if (!categoryId || !categoryId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de catégorie invalide")
    }
    
    // Validation des données d'entrée
    const rawData = await request.json()
    const { name } = validateData(updateCategorySchema, rawData)
    
    console.log(`Admin ${session.user.id} met à jour la catégorie ${categoryId}`)
    
    // Vérifier que la catégorie existe
    const existingCategory = await prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    })
    
    if (!existingCategory) {
      throw createError.notFound("Catégorie non trouvée")
    }
    
    // Vérifier si le nouveau nom n'est pas déjà utilisé par une autre catégorie
    if (name !== existingCategory.name) {
      const duplicateCategory = await prisma.category.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive'
          },
          id: {
            not: categoryId
          }
        }
      })
      
      if (duplicateCategory) {
        throw createError.validation("Une autre catégorie utilise déjà ce nom")
      }
    }
    
    // Mettre à jour la catégorie
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: name.trim()
      },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    })
    
    // Log d'audit
    try {
      await prisma.adminLog.create({
        data: {
          action: 'UPDATE_CATEGORY',
          entityType: 'Category',
          entityId: categoryId,
          adminId: session.user.id,
          details: JSON.stringify({
            previousName: existingCategory.name,
            newName: name,
            productsCount: existingCategory._count.products,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('Erreur log admin (non critique):', logError)
    }
    
    console.log(`Catégorie ${categoryId} mise à jour: "${existingCategory.name}" → "${name}"`)
    
    return NextResponse.json({
      success: true,
      category: updatedCategory,
      message: `Catégorie mise à jour avec succès`
    })
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la catégorie:", error)
    throw error
  }
}, {
  requireAuth: true,
  allowedRoles: ['ADMIN'],
  allowedMethods: ['PATCH']
})

// DELETE: Supprimer une catégorie (admin seulement)
export const DELETE = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID de la catégorie
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const categoryId = pathParts[pathParts.indexOf('categories') + 1]
    
    if (!categoryId || !categoryId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de catégorie invalide")
    }
    
    console.log(`Admin ${session.user.id} supprime la catégorie ${categoryId}`)
    
    // Vérifier que la catégorie existe et récupérer ses informations
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    })
    
    if (!category) {
      throw createError.notFound("Catégorie non trouvée")
    }
    
    // Vérifier s'il y a des produits associés
    if (category._count.products > 0) {
      throw createError.validation(
        `Impossible de supprimer cette catégorie car elle contient ${category._count.products} produit(s). Veuillez d'abord déplacer ou supprimer les produits.`
      )
    }
    
    // Supprimer la catégorie
    await prisma.category.delete({
      where: { id: categoryId }
    })
    
    // Log d'audit
    try {
      await prisma.adminLog.create({
        data: {
          action: 'DELETE_CATEGORY',
          entityType: 'Category',
          entityId: categoryId,
          adminId: session.user.id,
          details: JSON.stringify({
            categoryName: category.name,
            productsCount: category._count.products,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('Erreur log admin (non critique):', logError)
    }
    
    console.log(`Catégorie "${category.name}" supprimée avec succès`)
    
    return NextResponse.json({
      success: true,
      message: `Catégorie "${category.name}" supprimée avec succès`
    })
    
  } catch (error) {
    console.error("Erreur lors de la suppression de la catégorie:", error)
    throw error
  }
}, {
  requireAuth: true,
  allowedRoles: ['ADMIN'],
  allowedMethods: ['DELETE']
})