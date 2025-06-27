// app/api/invoices/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { prisma } from "@/lib/prisma"

export const GET = apiAuthMiddleware(async (req: NextRequest, session, context) => {
  try {
    const invoiceId = context.params.id

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId: session.user.id
      },
      include: {
        order: {
          select: {
            id: true,
            createdAt: true
          }
        }
      }
    })

    if (!invoice) {
      return new NextResponse("Facture non trouvée", { status: 404 })
    }

    // Générer un numéro de facture à partir de l'ID
    const invoiceNumber = `INV-${invoice.id.substring(0, 8).toUpperCase()}`

    // Formater la réponse
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
        createdAt: invoice.order.createdAt
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Erreur lors de la récupération de la facture:", error)
    return new NextResponse("Erreur interne du serveur", { status: 500 })
  }
}, ["CLIENT"])