// app/api/admin/orders/[id]/admin-notes/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { createError } from "@/lib/error-handler"
import { z } from "zod"
import crypto from "crypto"

// Schéma de validation pour les notes admin
const adminNoteSchema = z.object({
  note: z.string().min(1, 'Note ne peut pas être vide').max(1000, 'Note trop longue')
}).strict()

// POST: Ajouter une note d'administration
export const POST = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID de commande
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const orderId = pathParts[pathParts.indexOf('orders') + 1]
    
    if (!orderId || !orderId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de commande invalide")
    }
    
    // Validation des données d'entrée
    const rawData = await request.json()
    const { note } = validateData(adminNoteSchema, rawData)
    
    console.log(`📝 Admin ${session.user.id} ajoute une note à la commande ${orderId}`)

    // Vérifier que la commande existe
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        metadata: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })

    if (!order) {
      throw createError.notFound("Commande non trouvée")
    }

    // Récupérer et parser les métadonnées existantes de manière sécurisée
    let existingMetadata: any = {}
    try {
      existingMetadata = order.metadata ? JSON.parse(order.metadata) : {}
    } catch (parseError) {
      console.warn('⚠️ Erreur parsing metadata existantes, initialisation nouvelles métadonnées')
      existingMetadata = {}
    }
    
    const adminNotes = Array.isArray(existingMetadata.adminNotes) ? existingMetadata.adminNotes : []

    // Créer la nouvelle note avec validation des données
    const newNote = {
      content: note.trim(),
      adminId: session.user.id,
      adminName: session.user.name || session.user.email || 'Admin',
      createdAt: new Date().toISOString(),
      id: crypto.randomUUID() // Ajouter un ID unique pour traçabilité
    }

    // Limiter le nombre de notes (prévention spam/DoS)
    const maxNotes = 50
    if (adminNotes.length >= maxNotes) {
      // Garder seulement les notes les plus récentes
      adminNotes.splice(0, adminNotes.length - maxNotes + 1)
    }

    adminNotes.push(newNote)

    // Mettre à jour les métadonnées de manière atomique
    const updatedMetadata = {
      ...existingMetadata,
      adminNotes: adminNotes,
      lastNoteAt: new Date().toISOString(),
      notesCount: adminNotes.length
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        metadata: JSON.stringify(updatedMetadata)
      }
    })

    // Log d'audit détaillé
    try {
      await prisma.adminLog.create({
        data: {
          action: 'ADD_ADMIN_NOTE',
          entityType: 'Order',
          entityId: orderId,
          adminId: session.user.id,
          details: JSON.stringify({
            noteId: newNote.id,
            noteLength: note.length,
            totalNotes: adminNotes.length,
            customerEmail: order.user?.email,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('⚠️ Erreur log admin (non critique):', logError)
    }

    console.log(`✅ Note ajoutée à la commande ${orderId} (${adminNotes.length} notes au total)`)

    return NextResponse.json({ 
      success: true, 
      note: newNote,
      totalNotes: adminNotes.length,
      message: 'Note ajoutée avec succès'
    })

  } catch (error) {
    console.error("❌ Erreur lors de l'ajout de la note admin:", error)
    throw error
  }
})

// GET: Récupérer les notes d'administration
export const GET = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID de commande
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const orderId = pathParts[pathParts.indexOf('orders') + 1]
    
    if (!orderId || !orderId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de commande invalide")
    }
    
    console.log(`📖 Admin ${session.user.id} consulte les notes de la commande ${orderId}`)

    // Récupérer la commande avec ses métadonnées
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        id: true,
        metadata: true 
      }
    })

    if (!order) {
      throw createError.notFound("Commande non trouvée")
    }

    // Parser les métadonnées de manière sécurisée
    let metadata: any = {}
    try {
      metadata = order.metadata ? JSON.parse(order.metadata) : {}
    } catch (parseError) {
      console.warn('⚠️ Erreur parsing metadata, retour liste vide')
      metadata = {}
    }
    
    const adminNotes = Array.isArray(metadata.adminNotes) ? metadata.adminNotes : []

    // Trier les notes par date décroissante et valider la structure
    const validatedNotes = adminNotes
      .filter((note: any) => note && typeof note === 'object' && note.content)
      .sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()
        return dateB - dateA
      })
      .map((note: any) => ({
        id: note.id || 'legacy',
        content: note.content,
        adminId: note.adminId,
        adminName: note.adminName || 'Admin',
        createdAt: note.createdAt || new Date().toISOString()
      }))

    console.log(`📖 ${validatedNotes.length} notes récupérées pour la commande ${orderId}`)

    return NextResponse.json({ 
      adminNotes: validatedNotes,
      totalNotes: validatedNotes.length,
      orderId: orderId
    })

  } catch (error) {
    console.error("❌ Erreur lors de la récupération des notes:", error)
    throw error
  }
})