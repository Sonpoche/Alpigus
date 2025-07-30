// app/api/invoices/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withClientSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from 'zod'

// Schéma de validation pour les paramètres d'URL
const paramsSchema = z.object({
  id: commonSchemas.id
})

export const GET = withClientSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation sécurisée de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const invoiceId = pathSegments[pathSegments.indexOf('invoices') + 1]

    // Validation que l'ID est un CUID valide
    const { id } = validateData(paramsSchema, { id: invoiceId })

    console.log(`🔍 Récupération facture ${id} par user ${session.user.id}`)

    // 2. Récupération sécurisée avec vérification d'ownership
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId: session.user.id // SÉCURITÉ CRITIQUE: Vérifier que la facture appartient à l'utilisateur
      },
      include: {
        order: {
          select: {
            id: true,
            createdAt: true,
            status: true
          }
        }
      }
    })

    if (!invoice) {
      console.warn(`⚠️ Tentative d'accès non autorisé à la facture ${id} par user ${session.user.id}`)
      throw createError.notFound("Facture non trouvée ou non autorisée")
    }

    // 3. Génération sécurisée du numéro de facture
    const invoiceNumber = `INV-${invoice.id.substring(0, 8).toUpperCase()}`

    // 4. Formatage de la réponse avec seulement les données nécessaires
    const response = {
      id: invoice.id,
      invoiceNumber: invoiceNumber,
      amount: invoice.amount,
      status: invoice.status,
      paidAt: invoice.paidAt,
      paymentMethod: invoice.paymentMethod,
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt,
      order: {
        id: invoice.order.id,
        createdAt: invoice.order.createdAt,
        status: invoice.order.status
      }
    }

    console.log(`✅ Facture ${id} récupérée avec succès pour user ${session.user.id}`)

    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ Erreur récupération facture:", error)
    return handleError(error, request.url)
  }
})