// app/api/invoices/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

// Obtenir toutes les factures de l'utilisateur
export const GET = apiAuthMiddleware(async (req: NextRequest, session: Session) => {
  try {
    // Récupérer les factures de l'utilisateur
    const invoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id
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

    // Vérifier les factures en retard et les marquer comme telles
    const today = new Date()
    const updatedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        const dueDate = new Date(invoice.dueDate)
        
        // Si la facture est en attente et la date d'échéance est passée
        if (invoice.status === 'PENDING' && dueDate < today) {
          // Mettre à jour le statut dans la base de données
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'OVERDUE' }
          })
          
          // Mettre à jour l'objet pour la réponse
          return { 
            ...invoice, 
            status: 'OVERDUE' 
          }
        }
        
        return invoice
      })
    )

    return NextResponse.json({ invoices: updatedInvoices })
  } catch (error) {
    console.error("Erreur lors de la récupération des factures:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
})

// Créer une nouvelle facture (généralement appelé par le système lors de la finalisation d'une commande)
export const POST = apiAuthMiddleware(async (req: NextRequest, session: Session) => {
  try {
    const { orderId, amount, dueDate } = await req.json()
    
    // Vérifier que la commande existe et appartient à l'utilisateur
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
        userId: session.user.id
      }
    })
    
    if (!order) {
      return new NextResponse("Commande non trouvée", { status: 404 })
    }
    
    // Créer la facture
    const invoice = await prisma.invoice.create({
      data: {
        orderId,
        userId: session.user.id,
        amount,
        status: 'PENDING',
        dueDate: new Date(dueDate),
      }
    })
    
    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Erreur lors de la création de la facture:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
})