// app/api/delivery-slots/cleanup/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { createError } from "@/lib/error-handler"

export const POST = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    console.log(`Nettoyage des créneaux expirés lancé par ${session.user.id} (${session.user.role})`)
    
    // Calculer la date limite (avant-hier à minuit)
    const dayBeforeYesterday = new Date()
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2)
    dayBeforeYesterday.setHours(23, 59, 59, 999)
    
    console.log(`Suppression des créneaux antérieurs à: ${dayBeforeYesterday.toISOString()}`)
    
    // Construction de la requête WHERE selon le rôle
    let whereCondition: any = {
      date: {
        lt: dayBeforeYesterday
      }
    }
    
    // Si c'est un producteur, limiter à ses propres créneaux
    if (session.user.role === 'PRODUCER') {
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      })
      
      if (!producer) {
        throw createError.notFound("Profil producteur non trouvé")
      }
      
      whereCondition.product = {
        producerId: producer.id
      }
    }
    
    // Récupérer les créneaux à supprimer pour logging
    const slotsToDelete = await prisma.deliverySlot.findMany({
      where: whereCondition,
      include: {
        product: {
          select: {
            name: true,
            producer: {
              select: {
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
    
    if (slotsToDelete.length === 0) {
      console.log("Aucun créneau expiré trouvé")
      return NextResponse.json({
        success: true,
        message: "Aucun créneau expiré à supprimer",
        deletedCount: 0,
        details: []
      })
    }
    
    // Vérifier s'il y a des réservations actives
    const slotsWithActiveBookings = slotsToDelete.filter(slot => 
      slot.bookings.some(booking => ['PENDING', 'CONFIRMED'].includes(booking.status))
    )
    
    if (slotsWithActiveBookings.length > 0 && session.user.role !== 'ADMIN') {
      throw createError.validation(
        `${slotsWithActiveBookings.length} créneaux ont des réservations actives. Seuls les administrateurs peuvent forcer la suppression.`
      )
    }
    
    console.log(`${slotsToDelete.length} créneaux trouvés pour suppression`)
    
    // Effectuer la suppression dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Si il y a des réservations, les annuler d'abord
      if (slotsWithActiveBookings.length > 0) {
        await tx.booking.updateMany({
          where: {
            slotId: {
              in: slotsWithActiveBookings.map(slot => slot.id)
            },
            status: {
              in: ['PENDING', 'CONFIRMED']
            }
          },
          data: {
            status: 'CANCELLED'
          }
        })
        
        console.log(`${slotsWithActiveBookings.length} réservations annulées`)
      }
      
      // Supprimer les créneaux
      const deleteResult = await tx.deliverySlot.deleteMany({
        where: whereCondition
      })
      
      return deleteResult
    })
    
    // Préparer les détails pour le log
    const deletionDetails = slotsToDelete.map(slot => ({
      slotId: slot.id,
      productName: slot.product.name,
      producerName: slot.product.producer.companyName,
      date: slot.date,
      maxCapacity: slot.maxCapacity,
      reserved: slot.reserved,
      bookingsCount: slot.bookings.length,
      hadActiveBookings: slot.bookings.some(b => ['PENDING', 'CONFIRMED'].includes(b.status))
    }))
    
    // Log d'audit pour l'action de nettoyage
    try {
      await prisma.adminLog.create({
        data: {
          action: 'CLEANUP_EXPIRED_DELIVERY_SLOTS',
          entityType: 'DeliverySlot',
          entityId: 'batch',
          adminId: session.user.id,
          details: JSON.stringify({
            deletedCount: result.count,
            cutoffDate: dayBeforeYesterday.toISOString(),
            slotsWithActiveBookings: slotsWithActiveBookings.length,
            deletionDetails,
            userRole: session.user.role,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('Erreur log admin (non critique):', logError)
    }
    
    console.log(`Nettoyage terminé: ${result.count} créneaux supprimés`)
    
    return NextResponse.json({
      success: true,
      message: `${result.count} créneaux expirés supprimés`,
      deletedCount: result.count,
      details: deletionDetails,
      slotsWithActiveBookings: slotsWithActiveBookings.length,
      cutoffDate: dayBeforeYesterday.toISOString()
    })
    
  } catch (error) {
    console.error("Erreur lors du nettoyage des créneaux:", error)
    throw error
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN'],
  allowedMethods: ['POST']
})