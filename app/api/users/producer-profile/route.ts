// app/api/users/producer-profile/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schéma de validation pour la mise à jour du profil producteur
const updateProducerProfileSchema = z.object({
  companyName: z.string().min(2, 'Nom entreprise trop court').max(200, 'Nom entreprise trop long').optional(),
  address: z.string().min(5, 'Adresse trop courte').max(500, 'Adresse trop longue').optional(),
  description: z.string().max(2000, 'Description trop longue').optional()
}).strict()

// GET - Obtenir le profil producteur connecté
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    console.log(`🏭 Récupération profil producteur ${session.user.id}`)

    // Recherche sécurisée du profil producteur
    const producer = await prisma.producer.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyName: true,
        address: true,
        description: true,
        bankName: true,
        bankAccountName: true,
        iban: true,
        bic: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profileCompleted: true
          }
        }
      }
    })

    if (!producer) {
      throw createError.notFound("Profil producteur non trouvé")
    }

    // Masquer l'IBAN complet pour la sécurité
    const response = {
      ...producer,
      iban: undefined, // Masquer complètement
      ibanPreview: producer.iban ? `${producer.iban.substring(0, 4)}****` : null
    }

    console.log(`✅ Profil producteur récupéré: ${producer.companyName}`)

    return NextResponse.json({
      ...response,
      meta: {
        accessLevel: 'owner',
        hasBank: !!(producer.bankName && producer.iban),
        profileCompleted: !!(producer.companyName && producer.address)
      }
    })

  } catch (error) {
    console.error("❌ Erreur récupération profil producteur:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER'], // Seuls les producteurs
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 100,
    window: 60
  }
})

// PATCH - Mettre à jour le profil producteur
export const PATCH = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // Validation des données d'entrée
    const rawData = await request.json()
    const validatedData = validateData(updateProducerProfileSchema, rawData)
    
    const { companyName, address, description } = validatedData

    console.log(`✏️ Mise à jour profil producteur ${session.user.id}`)

    // Vérification d'existence du profil producteur
    const existingProducer = await prisma.producer.findUnique({
      where: { userId: session.user.id },
      select: { id: true, companyName: true }
    })

    if (!existingProducer) {
      throw createError.notFound("Profil producteur non trouvé")
    }

    // Préparation des données à mettre à jour
    const updateData: any = {}
    if (companyName !== undefined) updateData.companyName = companyName.trim()
    if (address !== undefined) updateData.address = address.trim()
    if (description !== undefined) updateData.description = description.trim()

    // Mise à jour sécurisée
    const updatedProducer = await prisma.producer.update({
      where: { userId: session.user.id },
      data: updateData,
      select: {
        id: true,
        companyName: true,
        address: true,
        description: true,
        bankName: true,
        bankAccountName: true,
        iban: true,
        bic: true,
        user: {
          select: {
            name: true,
            email: true,
            profileCompleted: true
          }
        }
      }
    })

    // Vérifier si le profil est maintenant complet
    const isProfileComplete = !!(updatedProducer.companyName && updatedProducer.address)
    
    // Mettre à jour le flag profileCompleted si nécessaire
    if (isProfileComplete && !updatedProducer.user.profileCompleted) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { profileCompleted: true }
      })
    }

    // Log d'audit sécurisé
    console.log(`📋 Audit - Profil producteur modifié:`, {
      userId: session.user.id,
      producerId: updatedProducer.id,
      fieldsUpdated: Object.keys(updateData),
      profileComplete: isProfileComplete,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Profil producteur mis à jour: ${updatedProducer.companyName}`)

    // Masquer l'IBAN complet dans la réponse
    const response = {
      ...updatedProducer,
      iban: undefined,
      ibanPreview: updatedProducer.iban ? `${updatedProducer.iban.substring(0, 4)}****` : null
    }

    return NextResponse.json({
      ...response,
      meta: {
        updatedFields: Object.keys(updateData),
        profileComplete: isProfileComplete,
        updatedAt: new Date().toISOString() // Utiliser timestamp actuel
      }
    })

  } catch (error) {
    console.error("❌ Erreur mise à jour profil producteur:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER'], // Seuls les producteurs
  allowedMethods: ['PATCH'],
  rateLimit: {
    requests: 20, // Modifications limitées
    window: 60
  }
})