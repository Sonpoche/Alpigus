// app/api/delivery-slots/booked/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { createError } from "@/lib/error-handler"
import { z } from "zod"

// Schéma de validation pour les paramètres de requête
const bookedSlotsQuerySchema = z.object({
  status: z.enum(['TEMPORARY', 'PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
  page: z.number().min(1),
  limit: z.number().min(1).max(50),
  includeExpired: z.boolean()
})

export const GET = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    console.log(`Utilisateur ${session.user.id} consulte ses créneaux réservés`)
    
    // Extraction et validation des paramètres
    const { searchParams } = new URL(request.url)
    const rawParams = {
      status: searchParams.get('status') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      includeExpired: searchParams.get('includeExpired') === 'true'
    }
    
    const { status, page, limit, includeExpired } = validateData(bookedSlotsQuerySchema, rawParams)
    
    // Construction de la requête WHERE
    let whereCondition: any = {
      order: {
        userId: session.user.id
      }
    }
    
    // Filtre par statut si spécifié
    if (status) {
      whereCondition.status = status
    }
    
    // Exclure les réservations expirées par défaut
    if (!includeExpired) {
      whereCondition.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
        { status: { in: ['CONFIRMED', 'CANCELLED'] } }
      ]
    }
    
    // Récupération des réservations avec pagination
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: whereCondition,
        include: {
          deliverySlot: {
            include: {
              product: {
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
                }
              }
            }
          },
          order: {
            select: {
              id: true,
              status: true,
              total: true,
              createdAt: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { deliverySlot: { date: 'asc' } },
          { createdAt: 'desc' }
        ]
      }),
      prisma.booking.count({ where: whereCondition })
    ])
    
    // Enrichir les données avec des informations calculées
    const enrichedSlots = bookings.map(booking => {
      const slot = booking.deliverySlot
      const isExpired = booking.expiresAt ? new Date(booking.expiresAt) < new Date() : false
      const isPast = slot.date < new Date()
      const daysUntilDelivery = Math.ceil((slot.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      
      return {
        ...slot,
        booking: {
          id: booking.id,
          quantity: booking.quantity,
          price: booking.price,
          status: booking.status,
          expiresAt: booking.expiresAt,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt,
          isExpired,
          canModify: !isPast && !isExpired && ['TEMPORARY', 'PENDING'].includes(booking.status),
          canCancel: !isPast && ['TEMPORARY', 'PENDING', 'CONFIRMED'].includes(booking.status)
        },
        order: booking.order,
        deliveryInfo: {
          isPast,
          daysUntilDelivery,
          isToday: daysUntilDelivery === 0,
          isTomorrow: daysUntilDelivery === 1,
          timeSlot: slot.date.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        },
        totalValue: booking.quantity * (booking.price || slot.product.price)
      }
    })
    
    // Calculer des statistiques
    const stats = {
      totalBookings: total,
      activeBookings: bookings.filter(b => 
        ['PENDING', 'CONFIRMED'].includes(b.status) && 
        (!b.expiresAt || b.expiresAt > new Date())
      ).length,
      temporaryBookings: bookings.filter(b => b.status === 'TEMPORARY').length,
      expiredBookings: bookings.filter(b => 
        b.expiresAt && b.expiresAt < new Date() && b.status === 'TEMPORARY'
      ).length,
      upcomingDeliveries: bookings.filter(b => 
        b.deliverySlot.date > new Date() && 
        ['CONFIRMED'].includes(b.status)
      ).length,
      totalValue: bookings.reduce((sum, b) => 
        sum + (b.quantity * (b.price || b.deliverySlot.product.price)), 0
      )
    }
    
    console.log(`${bookings.length} réservations récupérées (${stats.activeBookings} actives)`)
    
    return NextResponse.json({
      slots: enrichedSlots,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total
      },
      stats,
      filters: {
        status,
        includeExpired
      }
    })
    
  } catch (error) {
    console.error("Erreur lors de la récupération des créneaux réservés:", error)
    throw error
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'ADMIN'],
  allowedMethods: ['GET']
})