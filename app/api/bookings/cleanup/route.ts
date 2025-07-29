// app/api/bookings/cleanup/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { createError } from "@/lib/error-handler"

export const POST = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    console.log(`Nettoyage des réservations expirées lancé par ${session.user.id} (${session.user.role})`)
    
    // Seuls les admins et le système peuvent déclencher le nettoyage
    if (session.user.role !== 'ADMIN') {
      throw createError.forbidden("Seuls les administrateurs peuvent déclencher le nettoyage")
    }
    
    // Recherche des réservations expirées
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: "TEMPORARY",
        expiresAt: {
          lt: new Date() // Réservations dont la date d'expiration est dépassée
        }
      },
      include: {
        order: {
          select: {
            id: true,
            userId: true
          }
        },
        deliverySlot: {
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
        }
      }
    })

    if (expiredBookings.length === 0) {
      console.log("Aucune réservation expirée trouvée")
      return NextResponse.json({
        success: true,
        message: "Aucune réservation expirée à nettoyer",
        cleaned: 0,
        details: []
      })
    }

    console.log(`${expiredBookings.length} réservations expirées trouvées`)

    // Pour chaque réservation expirée, effectuer une transaction
    const cleanupResults = await Promise.allSettled(
      expiredBookings.map(async (booking) => {
        try {
          return await prisma.$transaction(async (tx) => {
            // 1. Mettre à jour la réservation comme annulée
            await tx.booking.update({
              where: { id: booking.id },
              data: { 
                status: "CANCELLED",
                updatedAt: new Date()
              }
            })

            // 2. Libérer le créneau de livraison
            await tx.deliverySlot.update({
              where: { id: booking.slotId },
              data: {
                reserved: {
                  decrement: booking.quantity
                }
              }
            })

            // 3. Retourner la quantité au stock si nécessaire
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

            return {
              bookingId: booking.id,
              orderId: booking.order.id,
              userId: booking.order.userId,
              productName: booking.deliverySlot.product.name,
              quantity: booking.quantity,
              producerName: booking.deliverySlot.product.producer.companyName,
              expiredAt: booking.expiresAt,
              cleanedAt: new Date()
            }
          })
        } catch (error) {
          console.error(`Erreur lors du nettoyage de la réservation ${booking.id}:`, error)
          throw error
        }
      })
    )

    // Analyser les résultats
    const successful = cleanupResults.filter(result => result.status === 'fulfilled')
    const failed = cleanupResults.filter(result => result.status === 'rejected')

    if (failed.length > 0) {
      console.error(`${failed.length} réservations n'ont pas pu être nettoyées:`, failed)
    }

    const successfulDetails = successful.map(result => 
      result.status === 'fulfilled' ? result.value : null
    ).filter(Boolean)

    console.log(`Nettoyage terminé: ${successful.length} succès, ${failed.length} échecs`)

    // Log d'audit pour l'action de nettoyage
    try {
      await prisma.adminLog.create({
        data: {
          action: 'CLEANUP_EXPIRED_BOOKINGS',
          entityType: 'Booking',
          entityId: 'batch',
          adminId: session.user.id,
          details: JSON.stringify({
            totalFound: expiredBookings.length,
            successfulCleanups: successful.length,
            failedCleanups: failed.length,
            cleanupDetails: successfulDetails,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('Erreur log admin (non critique):', logError)
    }

    return NextResponse.json({
      success: true,
      message: `${successful.length} réservations expirées ont été nettoyées`,
      cleaned: successful.length,
      failed: failed.length,
      details: successfulDetails,
      ...(failed.length > 0 && {
        warnings: `${failed.length} réservations n'ont pas pu être nettoyées`
      })
    })

  } catch (error) {
    console.error("Erreur lors du nettoyage des réservations:", error)
    throw error
  }
}, {
  requireAuth: true,
  allowedRoles: ['ADMIN'],
  allowedMethods: ['POST']
})