// app/api/admin/orders/[id]/admin-notes/route.ts

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const POST = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'ADMIN') {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    const orderId = context.params.id
    const { note } = await req.json()

    if (!note || !note.trim()) {
      return new NextResponse("La note ne peut pas être vide", { status: 400 })
    }

    // Vérifier que la commande existe
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return new NextResponse("Commande introuvable", { status: 404 })
    }

    // Récupérer les notes existantes
    const existingNotes = order.metadata ? JSON.parse(order.metadata) : {}
    const adminNotes = existingNotes.adminNotes || []

    // Ajouter la nouvelle note avec timestamp et auteur
    const newNote = {
      content: note.trim(),
      adminId: session.user.id,
      adminName: session.user.name || session.user.email,
      createdAt: new Date().toISOString()
    }

    adminNotes.push(newNote)

    // Mettre à jour les métadonnées de la commande
    const updatedMetadata = {
      ...existingNotes,
      adminNotes: adminNotes
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        metadata: JSON.stringify(updatedMetadata)
      }
    })

    // Enregistrer cette action dans les logs d'administration
    await prisma.adminLog.create({
      data: {
        action: 'ADD_ADMIN_NOTE',
        entityType: 'Order',
        entityId: orderId,
        adminId: session.user.id,
        details: JSON.stringify({
          note: note.trim(),
          timestamp: new Date().toISOString()
        })
      }
    })

    return NextResponse.json({ 
      success: true, 
      note: newNote,
      totalNotes: adminNotes.length 
    })

  } catch (error) {
    console.error("Erreur lors de l'ajout de la note admin:", error)
    return new NextResponse(
      "Erreur lors de l'ajout de la note", 
      { status: 500 }
    )
  }
}, ["ADMIN"])

// GET pour récupérer les notes d'administration
export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'ADMIN') {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    const orderId = context.params.id

    // Récupérer la commande avec ses métadonnées
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { metadata: true }
    })

    if (!order) {
      return new NextResponse("Commande introuvable", { status: 404 })
    }

    const metadata = order.metadata ? JSON.parse(order.metadata) : {}
    const adminNotes = metadata.adminNotes || []

    return NextResponse.json({ 
      adminNotes: adminNotes.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    })

  } catch (error) {
    console.error("Erreur lors de la récupération des notes:", error)
    return new NextResponse(
      "Erreur lors de la récupération des notes", 
      { status: 500 }
    )
  }
}, ["ADMIN"])