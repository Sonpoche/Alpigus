// app/api/bookings/[id]/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { createError } from "@/lib/error-handler"
import { z } from "zod"

// Schéma de validation pour la mise à jour des réservations
const updateBookingSchema = z.object({
  quantity: z.number().min(0.1, 'Quantité minimale 0.1').max(1000, 'Quantité maximale 1000').optional(),
  status: z.enum(['TEMPORARY', 'PENDING', 'CONFIRMED', 'CANCELLED']).optional()
}).strict()

export const GET = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID de la réservation
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const bookingId = pathParts[pathParts.indexOf('bookings') + 1]
    
    if (!bookingId || !bookingId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de réservation invalide")
    }
    
    console.log(`Utilisateur ${session.user.id} consulte la réservation ${bookingId}`)
    
    // Récupérer la réservation avec toutes les relations
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            status: true,
            total: true,
            createdAt: true
          }
        },
        deliverySlot: {
          include: {
            product: {
              include: {
                producer: {
                  select: {
                    id: true,
                    userId: true,
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
        }
      }
    })
    
    if (!booking) {
      throw createError.notFound("Réservation non trouvée")
    }
    
    // Vérification des autorisations selon le rôle
    const hasAccess = 
      // Le propriétaire de la commande
      booking.order.userId === session.user.id ||
      // Un admin
      session.user.role === 'ADMIN' ||
      // Le producteur du produit
      (session.user.role === 'PRODUCER' && booking.deliverySlot.product.producer.userId === session.user.id)
    
    if (!hasAccess) {
      throw createError.forbidden("Accès non autorisé à cette réservation")
    }
    
    // Enrichir la réponse avec des informations calculées
    const enrichedBooking = {
      ...booking,
      canModify: booking.status === 'TEMPORARY' || booking.status === 'PENDING',
      isExpired: booking.expiresAt ? new Date(booking.expiresAt) < new Date() : false,
      daysUntilDelivery: Math.ceil((new Date(booking.deliverySlot.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      totalValue: booking.quantity * (booking.price || booking.deliverySlot.product.price)
    }
    
    return NextResponse.json(enrichedBooking)
    
  } catch (error) {
    console.error("Erreur lors de la récupération de la réservation:", error)
    throw error
  }
})

export const PATCH = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID de la réservation
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const bookingId = pathParts[pathParts.indexOf('bookings') + 1]
    
    if (!bookingId || !bookingId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de réservation invalide")
    }
    
    // Validation des données d'entrée
    const rawData = await request.json()
    const { quantity, status } = validateData(updateBookingSchema, rawData)
    
    console.log(`Utilisateur ${session.user.id} met à jour la réservation ${bookingId}`)
    
    // Récupérer la réservation existante
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            status: true
          }
        },
        deliverySlot: {
          include: {
            product: {
              include: {
                producer: {
                  select: {
                    id: true,
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
        }
      }
    })
    
    if (!booking) {
      throw createError.notFound("Réservation non trouvée")
    }
    
    // Vérification des autorisations
    const canModify = 
      // Le propriétaire de la commande peut modifier certains aspects
      (booking.order.userId === session.user.id && ['TEMPORARY', 'PENDING'].includes(booking.status)) ||
      // Un admin peut tout modifier
      session.user.role === 'ADMIN' ||
      // Le producteur peut modifier le statut de ses produits
      (session.user.role === 'PRODUCER' && booking.deliverySlot.product.producer.userId === session.user.id)
    
    if (!canModify) {
      throw createError.forbidden("Modification non autorisée pour cette réservation")
    }
    
    // Validations spécifiques selon les modifications
    if (quantity !== undefined && quantity !== booking.quantity) {
      const quantityDifference = quantity - booking.quantity
      
      // Vérifier la capacité du créneau
      const deliverySlot = booking.deliverySlot
      const availableCapacity = deliverySlot.maxCapacity - deliverySlot.reserved
      
      if (quantityDifference > 0 && quantityDifference > availableCapacity) {
        throw createError.validation("Capacité du créneau insuffisante")
      }
      
      // Vérifier le stock disponible
      if (quantityDifference > 0 && deliverySlot.product.stock && 
          quantityDifference > deliverySlot.product.stock.quantity) {
        throw createError.validation("Stock insuffisant")
      }
    }
    
    // Effectuer les mises à jour dans une transaction
    const updatedBooking = await prisma.$transaction(async (tx) => {
      const updateData: any = {}
      
      // Mettre à jour le statut si fourni
      if (status && status !== booking.status) {
        updateData.status = status
        
        // Si on confirme une réservation temporaire, supprimer l'expiration
        if (status === 'CONFIRMED' && booking.status === 'TEMPORARY') {
          updateData.expiresAt = null
        }
      }
      
      // Si la quantité est modifiée
      if (quantity !== undefined && quantity !== booking.quantity) {
        const quantityDifference = quantity - booking.quantity
        updateData.quantity = quantity
        
        // Mettre à jour le créneau
        await tx.deliverySlot.update({
          where: { id: booking.slotId },
          data: {
            reserved: {
              increment: quantityDifference
            }
          }
        })
        
        // Mettre à jour le stock
        if (booking.deliverySlot.product.stock) {
          await tx.stock.update({
            where: { productId: booking.deliverySlot.product.id },
            data: {
              quantity: {
                decrement: quantityDifference
              }
            }
          })
        }
      }
      
      // Mettre à jour la réservation
      return tx.booking.update({
        where: { id: bookingId },
        data: updateData,
        include: {
          deliverySlot: {
            include: {
              product: {
                include: {
                  producer: {
                    select: {
                      id: true,
                      companyName: true
                    }
                  }
                }
              }
            }
          }
        }
      })
    })
    
    console.log(`Réservation ${bookingId} mise à jour avec succès`)
    
    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: "Réservation mise à jour avec succès"
    })
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la réservation:", error)
    throw error
  }
})

export const DELETE = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID de la réservation
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const bookingId = pathParts[pathParts.indexOf('bookings') + 1]
    
    if (!bookingId || !bookingId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de réservation invalide")
    }
    
    console.log(`Utilisateur ${session.user.id} supprime la réservation ${bookingId}`)
    
    // Récupérer la réservation pour vérifier les autorisations
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            status: true
          }
        },
        deliverySlot: {
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
        }
      }
    })
    
    if (!booking) {
      throw createError.notFound("Réservation non trouvée")
    }
    
    // Vérification des autorisations pour la suppression
    const canDelete = 
      // Le propriétaire de la commande
      booking.order.userId === session.user.id ||
      // Un admin
      session.user.role === 'ADMIN' ||
      // Le producteur peut annuler ses réservations dans certains cas
      (session.user.role === 'PRODUCER' && booking.deliverySlot.product.producer.userId === session.user.id)
    
    if (!canDelete) {
      throw createError.forbidden("Suppression non autorisée pour cette réservation")
    }
    
    // Vérifier si la réservation peut être supprimée
    if (booking.status === 'CONFIRMED' && session.user.role !== 'ADMIN') {
      throw createError.validation("Impossible de supprimer une réservation confirmée")
    }
    
    // Effectuer la suppression dans une transaction
    await prisma.$transaction(async (tx) => {
      // 1. Supprimer la réservation
      await tx.booking.delete({
        where: { id: bookingId }
      })
      
      // 2. Libérer le créneau
      await tx.deliverySlot.update({
        where: { id: booking.slotId },
        data: {
          reserved: {
            decrement: booking.quantity
          }
        }
      })
      
      // 3. Remettre la quantité en stock
      if (booking.deliverySlot.product.stock) {
        await tx.stock.update({
          where: { productId: booking.deliverySlot.product.id },
          data: {
            quantity: {
              increment: booking.quantity
            }
          }
        })
      }
    })
    
    console.log(`Réservation ${bookingId} supprimée avec succès`)
    
    return NextResponse.json({
      success: true,
      message: "Réservation supprimée avec succès"
    })
    
  } catch (error) {
    console.error("Erreur lors de la suppression de la réservation:", error)
    throw error
  }
})