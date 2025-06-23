// app/api/invoices/pending-count/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"

export const GET = apiAuthMiddleware(async (req, session) => {
  try {
    // Compter les factures en attente ou en retard pour l'utilisateur connecté
    const count = await prisma.invoice.count({
      where: {
        userId: session.user.id,
        status: {
          in: ['PENDING', 'OVERDUE']
        }
      }
    })
    
    return NextResponse.json({ count })
    
  } catch (error) {
    console.error("Erreur lors du comptage des factures en attente:", error)
    return NextResponse.json({ count: 0 }, { status: 500 })
  }
}, ["CLIENT"])