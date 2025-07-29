// app/api/categories/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, withPublicSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { createError } from "@/lib/error-handler"
import { z } from "zod"

// Schéma de validation pour la création de catégories
const createCategorySchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .trim()
    .refine(name => /^[a-zA-ZÀ-ÿ\s\-&'()]+$/.test(name), {
      message: 'Le nom ne peut contenir que des lettres, espaces et caractères spéciaux de base'
    })
}).strict()

// GET: Obtenir toutes les catégories (route publique)
export const GET = withPublicSecurity(async (
  request: NextRequest
) => {
  try {
    console.log('Récupération de toutes les catégories')
    
    // Paramètres de requête optionnels
    const { searchParams } = new URL(request.url)
    const includeProducts = searchParams.get('includeProducts') === 'true'
    const includeStats = searchParams.get('includeStats') === 'true'
    
    // Récupérer les catégories avec relations conditionnelles
    const categories = await prisma.category.findMany({
      include: {
        // Inclure les produits seulement si demandé
        products: includeProducts ? {
          select: {
            id: true,
            name: true,
            price: true,
            available: true,
            type: true,
            image: true,
            producer: {
              select: {
                id: true,
                companyName: true
              }
            }
          },
          where: {
            available: true // Seulement les produits disponibles
          }
        } : false,
        // Toujours inclure le comptage
        _count: {
          select: {
            products: {
              where: {
                available: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    // Enrichir avec des statistiques si demandé
    let enrichedCategories = categories
    
    if (includeStats) {
      enrichedCategories = await Promise.all(
        categories.map(async (category) => {
          // Calculer des statistiques additionnelles
          const stats = await prisma.product.aggregate({
            where: {
              categories: {
                some: {
                  id: category.id
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
          
          return {
            ...category,
            stats: {
              totalProducts: stats._count.id,
              averagePrice: stats._avg.price ? Math.round(stats._avg.price * 100) / 100 : 0,
              priceRange: {
                min: stats._min.price || 0,
                max: stats._max.price || 0
              }
            }
          }
        })
      )
    }
    
    console.log(`${categories.length} catégories récupérées`)
    
    return NextResponse.json({
      categories: enrichedCategories,
      total: categories.length,
      includeProducts,
      includeStats
    })
    
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error)
    throw createError.internal("Erreur lors de la récupération des catégories")
  }
})

// POST: Créer une nouvelle catégorie (admin seulement)
export const POST = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Validation des données d'entrée
    const rawData = await request.json()
    const { name } = validateData(createCategorySchema, rawData)
    
    console.log(`Admin ${session.user.id} crée une nouvelle catégorie: ${name}`)
    
    // Vérifier si la catégorie existe déjà (insensible à la casse)
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    })
    
    if (existingCategory) {
      throw createError.validation("Une catégorie avec ce nom existe déjà")
    }
    
    // Créer la nouvelle catégorie
    const category = await prisma.category.create({
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
          action: 'CREATE_CATEGORY',
          entityType: 'Category',
          entityId: category.id,
          adminId: session.user.id,
          details: JSON.stringify({
            categoryName: category.name,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('Erreur log admin (non critique):', logError)
    }
    
    console.log(`Catégorie "${name}" créée avec succès (ID: ${category.id})`)
    
    return NextResponse.json({
      success: true,
      category,
      message: `Catégorie "${name}" créée avec succès`
    }, { status: 201 })
    
  } catch (error) {
    console.error("Erreur lors de la création de la catégorie:", error)
    throw error
  }
}, {
  requireAuth: true,
  allowedRoles: ['ADMIN'],
  allowedMethods: ['POST']
})