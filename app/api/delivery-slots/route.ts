// app/api/delivery-slots/route.ts
// app/api/delivery-slots/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { createError } from "@/lib/error-handler"
import { z } from "zod"

// Schémas de validation
const getSlotsQuerySchema = z.object({
  page: z.number().min(1),
  limit: z.number().min(1).max(50),
  date: z.string().datetime().optional(),
  productId: z.string().cuid().optional(),
  available: z.boolean().optional()
})

const createSlotSchema = z.object({
  productId: z.string().cuid('ID produit invalide'),
  date: z.string().datetime('Date invalide'),
  maxCapacity: z.number().min(0.1, 'Capacité minimale 0.1').max(10000, 'Capacité maximale 10000')
}).strict()

export const GET = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    console.log(`Utilisateur ${session.user.id} consulte les créneaux de livraison`)
    
    // Extraction et validation des paramètres
    const { searchParams } = new URL(request.url)
    const rawParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      date: searchParams.get('date') || undefined,
      productId: searchParams.get('productId') || undefined,
      available: searchParams.get('available') === 'true' ? true : undefined
    }
    
    const { page, limit, date, productId, available } = validateData(getSlotsQuerySchema, rawParams)
    
    // Construction de la requête WHERE selon le rôle
    let where: any = {}
    
    // Filtre par date si spécifié
    if (date) {
      const targetDate = new Date(date)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)
      
      where.date = {
        gte: targetDate,
        lt: nextDay
      }
    }
    
    // Filtre par disponibilité
    if (available !== undefined) {
      where.isAvailable = available
      // Seulement les créneaux avec de la capacité disponible
      if (available) {
        where.reserved = {
          lt: prisma.deliverySlot.fields.maxCapacity
        }
      }
    }
    
    // Filtre par produit spécifique
    if (productId) {
      where.productId = productId
    }
    
    // Restrictions selon le rôle
    if (session.user.role === 'PRODUCER') {
      // Les producteurs ne voient que leurs créneaux
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      })
      
      if (!producer) {
        throw createError.notFound("Profil producteur non trouvé")
      }
      
      if (productId) {
        // Vérifier que le produit appartient au producteur
        const product = await prisma.product.findFirst({
          where: { 
            id: productId,
            producerId: producer.id
          }
        })
        
        if (!product) {
          throw createError.forbidden("Accès non autorisé à ce produit")
        }
      } else {
        // Filtrer par tous les produits du producteur
        where.product = {
          producerId: producer.id
        }
      }
    }
    
    // Pour les clients, seulement les créneaux disponibles et futurs
    if (session.user.role === 'CLIENT') {
      where.isAvailable = true
      where.date = {
        gte: new Date()
      }
      where.reserved = {
        lt: prisma.deliverySlot.fields.maxCapacity
      }
    }
    
    // Récupération des créneaux avec pagination
    const [slots, total] = await Promise.all([
      prisma.deliverySlot.findMany({
        where,
        include: {
          product: {
            include: {
              stock: {
                select: {
                  quantity: true
                }
              },
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
          },
          bookings: session.user.role === 'ADMIN' ? {
            include: {
              order: {
                select: {
                  id: true,
                  user: {
                    select: {
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          } : {
            select: {
              id: true,
              quantity: true,
              status: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'asc' }
      }),
      prisma.deliverySlot.count({ where })
    ])
    
    // Enrichir les données avec des informations calculées
    const enrichedSlots = slots.map(slot => ({
      ...slot,
      availableCapacity: slot.maxCapacity - slot.reserved,
      capacityPercentage: Math.round((slot.reserved / slot.maxCapacity) * 100),
      isFullyBooked: slot.reserved >= slot.maxCapacity,
      isPast: slot.date < new Date(),
      canBook: slot.isAvailable && slot.reserved < slot.maxCapacity && slot.date > new Date(),
      daysFromNow: Math.ceil((slot.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    }))
    
    console.log(`${slots.length} créneaux récupérés pour ${session.user.role}`)
    
    return NextResponse.json({
      slots: enrichedSlots,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total
      },
      filters: {
        date,
        productId,
        available
      }
    })
    
  } catch (error) {
    console.error("Erreur lors de la récupération des créneaux:", error)
    throw error
  }
})

export const POST = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Validation des données d'entrée
    const rawData = await request.json()
    const { productId, date, maxCapacity } = validateData(createSlotSchema, rawData)
    
    console.log(`Producteur ${session.user.id} crée un créneau pour le produit ${productId}`)
    
    // Récupérer et vérifier le producteur
    const producer = await prisma.producer.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    })
    
    if (!producer) {
      throw createError.notFound("Profil producteur non trouvé")
    }
    
    // Vérifier et récupérer le produit avec son stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        stock: {
          select: {
            quantity: true
          }
        }
      }
    })
    
    if (!product) {
      throw createError.notFound("Produit non trouvé")
    }
    
    if (product.producerId !== producer.id) {
      throw createError.forbidden("Ce produit ne vous appartient pas")
    }
    
    if (!product.stock) {
      throw createError.validation("Stock non configuré pour ce produit")
    }
    
    if (maxCapacity > product.stock.quantity) {
      throw createError.validation(
        `La capacité ne peut pas dépasser le stock disponible (${product.stock.quantity} ${product.unit})`
      )
    }
    
    // Vérifier que la date n'est pas dans le passé
    const slotDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (slotDate < today) {
      throw createError.validation("Impossible de créer un créneau dans le passé")
    }
    
    // Vérifier qu'il n'existe pas déjà un créneau pour ce produit à cette date
    const existingSlot = await prisma.deliverySlot.findFirst({
      where: {
        productId,
        date: {
          gte: slotDate,
          lt: new Date(slotDate.getTime() + 24 * 60 * 60 * 1000) // Même jour
        }
      }
    })
    
    if (existingSlot) {
      throw createError.validation("Un créneau existe déjà pour ce produit à cette date")
    }
    
    // Créer le créneau
    const slot = await prisma.deliverySlot.create({
      data: {
        productId,
        date: slotDate,
        maxCapacity,
        reserved: 0,
        isAvailable: true
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
            stock: {
              select: {
                quantity: true
              }
            }
          }
        }
      }
    })
    
    console.log(`Créneau créé avec succès: ${slot.id} pour ${maxCapacity}${product.unit}`)
    
    return NextResponse.json({
      success: true,
      slot: {
        ...slot,
        availableCapacity: slot.maxCapacity - slot.reserved,
        canBook: true,
        daysFromNow: Math.ceil((slot.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      },
      message: "Créneau de livraison créé avec succès"
    }, { status: 201 })
    
  } catch (error) {
    console.error("Erreur lors de la création du créneau:", error)
    throw error
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER'],
  allowedMethods: ['POST']
})