// app/api/delivery-slots/[id]/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { createError } from "@/lib/error-handler"
import { z } from "zod"

// Schéma de validation pour la mise à jour
const updateSlotSchema = z.object({
  maxCapacity: z.number().min(0.1).max(10000).optional(),
  isAvailable: z.boolean().optional()
}).strict()

export const GET = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID du créneau
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const slotId = pathParts[pathParts.indexOf('delivery-slots') + 1]
    
    if (!slotId || !slotId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de créneau invalide")
    }
    
    console.log(`Utilisateur ${session.user.id} consulte le créneau ${slotId}`)
    
    // Récupérer le créneau avec toutes les relations
    const slot = await prisma.deliverySlot.findUnique({
      where: { id: slotId },
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
                userId: true,
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
        bookings: {
          include: {
            order: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })
    
    if (!slot) {
      throw createError.notFound("Créneau non trouvé")
    }
    
    // Vérification des autorisations selon le rôle
    const hasAccess = 
      // Admin peut tout voir
      session.user.role === 'ADMIN' ||
      // Producteur peut voir ses créneaux
      (session.user.role === 'PRODUCER' && slot.product.producer.userId === session.user.id) ||
      // Client peut voir les créneaux disponibles ou ses propres réservations
      (session.user.role === 'CLIENT' && (
        slot.isAvailable || 
        slot.bookings.some(booking => booking.order.user.id === session.user.id)
      ))
    
    if (!hasAccess) {
      throw createError.forbidden("Accès non autorisé à ce créneau")
    }
    
    // Filtrer les réservations selon le rôle pour la confidentialité
    let filteredBookings = slot.bookings
    if (session.user.role === 'CLIENT') {
      // Les clients ne voient que leurs propres réservations
      filteredBookings = slot.bookings.filter(booking => 
        booking.order.user.id === session.user.id
      )
    } else if (session.user.role === 'PRODUCER') {
      // Les producteurs voient toutes les réservations mais avec des données limitées
      filteredBookings = slot.bookings.map(booking => ({
        ...booking,
        order: {
          ...booking.order,
          user: {
            id: booking.order.user.id,
            name: booking.order.user.name,
            email: '***@***.***' // Masquer l'email pour les producteurs
          }
        }
      })) as any // Cast temporaire pour éviter le conflit de types
    }
    
    // Enrichir les données avec des informations calculées
    const enrichedSlot = {
      ...slot,
      bookings: filteredBookings,
      analytics: {
        availableCapacity: slot.maxCapacity - slot.reserved,
        capacityPercentage: Math.round((slot.reserved / slot.maxCapacity) * 100),
        totalBookings: slot.bookings.length,
        activeBookings: slot.bookings.filter(b => 
          ['PENDING', 'CONFIRMED'].includes(b.status)
        ).length,
        temporaryBookings: slot.bookings.filter(b => b.status === 'TEMPORARY').length,
        isFullyBooked: slot.reserved >= slot.maxCapacity,
        isPast: slot.date < new Date(),
        isToday: new Date(slot.date).toDateString() === new Date().toDateString(),
        daysFromNow: Math.ceil((slot.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      },
      permissions: {
        canModify: session.user.role === 'ADMIN' || 
                  (session.user.role === 'PRODUCER' && slot.product.producer.userId === session.user.id),
        canDelete: (session.user.role === 'ADMIN' || 
                   (session.user.role === 'PRODUCER' && slot.product.producer.userId === session.user.id)) &&
                   slot.bookings.length === 0,
        canBook: session.user.role === 'CLIENT' && 
                slot.isAvailable && 
                slot.reserved < slot.maxCapacity && 
                slot.date > new Date()
      }
    }
    
    return NextResponse.json(enrichedSlot)
    
  } catch (error) {
    console.error("Erreur lors de la récupération du créneau:", error)
    throw error
  }
})

export const PATCH = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID du créneau
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const slotId = pathParts[pathParts.indexOf('delivery-slots') + 1]
    
    if (!slotId || !slotId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de créneau invalide")
    }
    
    // Validation des données d'entrée
    const rawData = await request.json()
    const { maxCapacity, isAvailable } = validateData(updateSlotSchema, rawData)
    
    console.log(`Utilisateur ${session.user.id} met à jour le créneau ${slotId}`)
    
    // Récupérer le créneau existant
    const slot = await prisma.deliverySlot.findUnique({
      where: { id: slotId },
      include: {
        product: {
          include: {
            producer: {
              select: {
                userId: true
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
    
    if (!slot) {
      throw createError.notFound("Créneau non trouvé")
    }
    
    // Vérification des autorisations
    const canModify = 
      session.user.role === 'ADMIN' || 
      (session.user.role === 'PRODUCER' && slot.product.producer.userId === session.user.id)
    
    if (!canModify) {
      throw createError.forbidden("Modification non autorisée pour ce créneau")
    }
    
    // Validations spécifiques
    if (maxCapacity !== undefined) {
      // Vérifier que la nouvelle capacité peut accommoder les réservations existantes
      if (maxCapacity < slot.reserved) {
        throw createError.validation(
          `La capacité ne peut pas être inférieure aux réservations existantes (${slot.reserved})`
        )
      }
      
      // Vérifier que la capacité ne dépasse pas le stock
      if (!slot.product.stock || maxCapacity > slot.product.stock.quantity) {
        throw createError.validation(
          `La capacité ne peut pas dépasser le stock disponible (${slot.product.stock?.quantity || 0})`
        )
      }
    }
    
    // Préparer les données de mise à jour
    const updateData: any = {}
    if (maxCapacity !== undefined) updateData.maxCapacity = maxCapacity
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable
    
    // Effectuer la mise à jour
    const updatedSlot = await prisma.deliverySlot.update({
      where: { id: slotId },
      data: updateData,
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
                companyName: true
              }
            }
          }
        },
        bookings: {
          select: {
            id: true,
            quantity: true,
            status: true
          }
        }
      }
    })
    
    console.log(`Créneau ${slotId} mis à jour avec succès`)
    
    return NextResponse.json({
      success: true,
      slot: {
        ...updatedSlot,
        availableCapacity: updatedSlot.maxCapacity - updatedSlot.reserved,
        capacityPercentage: Math.round((updatedSlot.reserved / updatedSlot.maxCapacity) * 100)
      },
      message: "Créneau mis à jour avec succès"
    })
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour du créneau:", error)
    throw error
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN'],
  allowedMethods: ['PATCH']
})

export const DELETE = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID du créneau
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const slotId = pathParts[pathParts.indexOf('delivery-slots') + 1]
    
    if (!slotId || !slotId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de créneau invalide")
    }
    
    console.log(`Utilisateur ${session.user.id} supprime le créneau ${slotId}`)
    
    // Récupérer le créneau avec ses réservations
    const slot = await prisma.deliverySlot.findUnique({
      where: { id: slotId },
      include: {
        product: {
          include: {
            producer: {
              select: {
                userId: true,
                companyName: true
              }
            }
          }
        },
        bookings: {
          select: {
            id: true,
            status: true,
            quantity: true
          }
        }
      }
    })
    
    if (!slot) {
      throw createError.notFound("Créneau non trouvé")
    }
    
    // Vérification des autorisations
    const canDelete = 
      session.user.role === 'ADMIN' || 
      (session.user.role === 'PRODUCER' && slot.product.producer.userId === session.user.id)
    
    if (!canDelete) {
      throw createError.forbidden("Suppression non autorisée pour ce créneau")
    }
    
    // Vérifier s'il y a des réservations actives
    const activeBookings = slot.bookings.filter(booking => 
      ['PENDING', 'CONFIRMED'].includes(booking.status)
    )
    
    if (activeBookings.length > 0 && session.user.role !== 'ADMIN') {
      throw createError.validation(
        `Impossible de supprimer un créneau avec ${activeBookings.length} réservation(s) active(s). Seuls les administrateurs peuvent forcer la suppression.`
      )
    }
    
    // Effectuer la suppression dans une transaction
    await prisma.$transaction(async (tx) => {
      // Annuler toutes les réservations actives si c'est un admin
      if (activeBookings.length > 0) {
        await tx.booking.updateMany({
          where: {
            slotId: slotId,
            status: {
              in: ['PENDING', 'CONFIRMED']
            }
          },
          data: {
            status: 'CANCELLED'
          }
        })
        
        console.log(`${activeBookings.length} réservations annulées avant suppression`)
      }
      
      // Supprimer le créneau
      await tx.deliverySlot.delete({
        where: { id: slotId }
      })
    })
    
    console.log(`Créneau ${slotId} supprimé avec succès`)
    
    return NextResponse.json({
      success: true,
      message: "Créneau supprimé avec succès",
      cancelledBookings: activeBookings.length
    })
    
  } catch (error) {
    console.error("Erreur lors de la suppression du créneau:", error)
    throw error
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN'],
  allowedMethods: ['DELETE']
})