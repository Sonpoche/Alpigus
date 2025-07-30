// app/api/invoices/pending-count/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withClientSecurity } from "@/lib/api-security"
import { handleError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"

export const GET = withClientSecurity(async (request: NextRequest, session) => {
  try {
    console.log(`📊 Comptage factures en attente pour user ${session.user.id}`)

    // Compter les factures en attente ou en retard pour l'utilisateur connecté uniquement
    const count = await prisma.invoice.count({
      where: {
        userId: session.user.id, // SÉCURITÉ: Limiter strictement à l'utilisateur connecté
        status: {
          in: ['PENDING', 'OVERDUE']
        }
      }
    })

    console.log(`✅ ${count} factures en attente trouvées pour user ${session.user.id}`)
    
    return NextResponse.json({ count })
    
  } catch (error) {
    console.error("❌ Erreur comptage factures en attente:", error)
    
    // En cas d'erreur, retourner 0 pour éviter de casser l'interface utilisateur
    // Cette route est probablement utilisée pour des badges/notifications
    return NextResponse.json({ count: 0 }, { status: 200 })
  }
})