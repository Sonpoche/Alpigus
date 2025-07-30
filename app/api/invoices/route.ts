// app/api/invoices/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withClientSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from 'zod'

// Schéma de validation pour la création de facture
const createInvoiceSchema = z.object({
  orderId: commonSchemas.id,
  amount: z.number().positive('Le montant doit être positif').max(999999, 'Montant trop élevé'),
  dueDate: z.string().datetime('Date d\'échéance invalide')
})

// GET /api/invoices - Obtenir toutes les factures de l'utilisateur
export const GET = withClientSecurity(async (request: NextRequest, session) => {
  try {
    console.log(`📋 Récupération factures pour user ${session.user.id}`)

    // Récupération sécurisée des factures de l'utilisateur uniquement
    const invoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id // SÉCURITÉ: Limiter aux factures de l'utilisateur connecté
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    unit: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Vérification et mise à jour automatique des factures en retard
    const today = new Date()
    const updatedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        const dueDate = new Date(invoice.dueDate)
        
        // Si la facture est en attente et la date d'échéance est passée
        if (invoice.status === 'PENDING' && dueDate < today) {
          console.log(`⏰ Facture ${invoice.id} marquée en retard`)
          
          // Mettre à jour le statut dans la base de données
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'OVERDUE' }
          })
          
          // Mettre à jour l'objet pour la réponse
          return { 
            ...invoice, 
            status: 'OVERDUE' as any
          }
        }
        
        return invoice
      })
    )

    console.log(`✅ ${updatedInvoices.length} factures récupérées pour user ${session.user.id}`)

    return NextResponse.json({ invoices: updatedInvoices })

  } catch (error) {
    console.error("❌ Erreur récupération factures:", error)
    return handleError(error, request.url)
  }
})

// POST /api/invoices - Créer une nouvelle facture
export const POST = withClientSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Validation sécurisée des données d'entrée
    const rawData = await request.json()
    const { orderId, amount, dueDate } = validateData(createInvoiceSchema, rawData)

    console.log(`🧾 Création facture pour commande ${orderId} par user ${session.user.id}`)

    // 2. Vérification sécurisée que la commande existe et appartient à l'utilisateur
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
        userId: session.user.id // SÉCURITÉ: Vérifier ownership de la commande
      }
    })
    
    if (!order) {
      throw createError.notFound("Commande non trouvée ou non autorisée")
    }

    // 3. Validation de la date d'échéance
    const dueDateObj = new Date(dueDate)
    const now = new Date()
    if (dueDateObj <= now) {
      throw createError.validation("La date d'échéance doit être dans le futur")
    }

    // 4. Création sécurisée de la facture
    const invoice = await prisma.invoice.create({
      data: {
        orderId,
        userId: session.user.id, // SÉCURITÉ: Forcer l'ID de l'utilisateur connecté
        amount,
        status: 'PENDING',
        dueDate: dueDateObj,
      }
    })

    console.log(`✅ Facture créée: ${invoice.id} pour montant ${amount} CHF`)
    
    return NextResponse.json(invoice, { status: 201 })

  } catch (error) {
    console.error("❌ Erreur création facture:", error)
    return handleError(error, request.url)
  }
})