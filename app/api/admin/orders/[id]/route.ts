// app/api/admin/orders/[id]/route.ts
// app/api/admin/orders/[id]/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { createError } from "@/lib/error-handler"
import { z } from "zod"

// Schéma de validation pour les mises à jour de commande
const orderUpdateSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'INVOICE_PENDING', 'INVOICE_PAID', 'INVOICE_OVERDUE']).optional(),
  adminNote: z.string().max(1000, 'Note trop longue').optional()
}).strict()

export const GET = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID de la commande
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const orderId = pathParts[pathParts.indexOf('orders') + 1]
    
    if (!orderId || !orderId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de commande invalide")
    }
    
    console.log(`Admin ${session.user.id} consulte la commande ${orderId}`)
    
    // Récupérer la commande avec toutes les relations nécessaires
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true
          }
        },
        items: {
          include: {
            product: {
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
                }
              }
            }
          }
        },
        bookings: {
          include: {
            deliverySlot: {
              include: {
                product: {
                  include: {
                    producer: {
                      include: {
                        user: {
                          select: {
                            id: true,
                            name: true,
                            email: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        invoice: {
          select: {
            id: true,
            amount: true,
            status: true,
            dueDate: true,
            createdAt: true,
            paidAt: true,
            paymentMethod: true
          }
        },
        transactions: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            producerId: true
          }
        },
        walletTransactions: {
          select: {
            id: true,
            amount: true,
            status: true,
            type: true,
            createdAt: true
          }
        }
      }
    })
    
    if (!order) {
      throw createError.notFound("Commande non trouvée")
    }
    
    // Détecter automatiquement le statut de paiement actuel
    let actualPaymentStatus = order.status
    let paymentInfo = null
    
    // Si une facture existe, utiliser son statut pour déterminer le vrai statut de paiement
    if (order.invoice) {
      if (order.invoice.status === 'PAID') {
        actualPaymentStatus = 'INVOICE_PAID'
        paymentInfo = {
          paidAt: order.invoice.paidAt,
          paymentMethod: order.invoice.paymentMethod,
          amount: order.invoice.amount
        }
      } else if (order.invoice.status === 'OVERDUE') {
        actualPaymentStatus = 'INVOICE_OVERDUE'
      } else {
        actualPaymentStatus = 'INVOICE_PENDING'
      }
    }
    
    // Mettre à jour le statut de la commande si nécessaire
    if (actualPaymentStatus !== order.status) {
      console.log(`Mise à jour du statut de la commande ${orderId}: ${order.status} → ${actualPaymentStatus}`)
      
      await prisma.order.update({
        where: { id: orderId },
        data: { status: actualPaymentStatus }
      })
    }
    
    // Extraire les métadonnées et notes d'administration
    let metadata = {}
    try {
      metadata = order.metadata ? JSON.parse(order.metadata) : {}
    } catch (parseError) {
      console.warn('Erreur parsing metadata, retour objet vide')
      metadata = {}
    }
    
    const adminNotes = Array.isArray((metadata as any).adminNotes) ? (metadata as any).adminNotes : []
    
    // Calculer des statistiques pour l'admin
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0)
    const uniqueProducers = Array.from(new Set(order.items.map(item => item.product.producerId))).length
    const isPaid = actualPaymentStatus === 'INVOICE_PAID'
    const isOverdue = actualPaymentStatus === 'INVOICE_OVERDUE'
    const daysSinceOrder = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    
    // Enrichir la réponse avec les informations administratives
    const enrichedOrder = {
      ...order,
      status: actualPaymentStatus, // Utiliser le statut actualisé
      paymentInfo,
      adminNotesHistory: adminNotes.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      deliveryInfo: (metadata as any).deliveryInfo || null,
      adminStats: {
        totalItems,
        uniqueProducers,
        isPaid,
        isOverdue,
        daysSinceOrder,
        hasInvoice: !!order.invoice,
        transactionsCount: order.transactions.length,
        walletTransactionsCount: order.walletTransactions.length
      },
      // Grouper les items par producteur pour l'affichage admin
      itemsByProducer: order.items.reduce((acc: any, item) => {
        const producerId = item.product.producerId
        if (!acc[producerId]) {
          acc[producerId] = {
            producer: item.product.producer,
            items: [],
            totalAmount: 0
          }
        }
        acc[producerId].items.push(item)
        acc[producerId].totalAmount += item.price * item.quantity
        return acc
      }, {})
    }
    
    return NextResponse.json(enrichedOrder)
    
  } catch (error) {
    console.error("Erreur lors de la récupération de la commande:", error)
    throw error
  }
})

export const PUT = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID de la commande
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const orderId = pathParts[pathParts.indexOf('orders') + 1]
    
    if (!orderId || !orderId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de commande invalide")
    }
    
    // Validation des données d'entrée
    const rawData = await request.json()
    const { status, adminNote } = validateData(orderUpdateSchema, rawData)
    
    console.log(`Admin ${session.user.id} met à jour la commande ${orderId}`)
    
    // Vérifier que la commande existe
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        metadata: true,
        userId: true
      }
    })
    
    if (!existingOrder) {
      throw createError.notFound("Commande non trouvée")
    }
    
    // Préparer les données de mise à jour
    const updateData: any = {}
    
    if (status && status !== existingOrder.status) {
      updateData.status = status
    }
    
    // Gestion des notes administratives
    if (adminNote && adminNote.trim()) {
      let metadata = {}
      try {
        metadata = existingOrder.metadata ? JSON.parse(existingOrder.metadata) : {}
      } catch (parseError) {
        metadata = {}
      }
      
      const adminNotes = Array.isArray((metadata as any).adminNotes) ? (metadata as any).adminNotes : []
      
      // Ajouter la nouvelle note
      adminNotes.push({
        id: Date.now().toString(),
        content: adminNote.trim(),
        adminId: session.user.id,
        adminName: session.user.name || session.user.email,
        createdAt: new Date().toISOString()
      })
      
      (metadata as any).adminNotes = adminNotes
      updateData.metadata = JSON.stringify(metadata)
    }
    
    // Effectuer la mise à jour si nécessaire
    if (Object.keys(updateData).length > 0) {
      await prisma.order.update({
        where: { id: orderId },
        data: updateData
      })
    }
    
    // Log d'audit
    try {
      await prisma.adminLog.create({
        data: {
          action: 'UPDATE_ORDER',
          entityType: 'Order',
          entityId: orderId,
          adminId: session.user.id,
          details: JSON.stringify({
            orderId,
            userId: existingOrder.userId,
            previousStatus: existingOrder.status,
            newStatus: status || existingOrder.status,
            adminNote: adminNote || null,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('Erreur log admin (non critique):', logError)
    }
    
    console.log(`Commande ${orderId} mise à jour avec succès`)
    
    return NextResponse.json({
      success: true,
      message: "Commande mise à jour avec succès",
      orderId,
      updatedFields: Object.keys(updateData),
      updatedAt: new Date().toISOString(),
      updatedBy: {
        id: session.user.id,
        name: session.user.name || session.user.email
      }
    })
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la commande:", error)
    throw error
  }
})