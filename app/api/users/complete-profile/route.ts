// app/api/users/complete-profile/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js'

// Schéma de validation pour la complétion de profil
const completeProfileSchema = z.object({
  role: z.enum(['CLIENT', 'PRODUCER'], { message: 'Rôle invalide' }),
  phone: z.string().min(8, 'Téléphone requis'),
  // Champs optionnels pour producteurs
  companyName: z.string().min(2, 'Nom entreprise requis').optional(),
  address: z.string().min(5, 'Adresse requise').optional(),
  description: z.string().max(1000, 'Description trop longue').optional()
}).strict()

// POST - Compléter le profil utilisateur (première connexion)
export const POST = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // Validation des données d'entrée
    const rawData = await request.json()
    const validatedData = validateData(completeProfileSchema, rawData)
    
    const { role, phone, companyName, address, description } = validatedData

    console.log(`👤 Complétion profil utilisateur ${session.user.id} (role: ${role})`)

    // Vérifier que l'utilisateur existe et n'a pas déjà complété son profil
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileCompleted: true,
        producer: {
          select: { id: true }
        }
      }
    })

    if (!user) {
      throw createError.notFound("Utilisateur non trouvé")
    }

    if (user.profileCompleted) {
      throw createError.validation("Profil déjà complété")
    }

    // Validation et formatage du téléphone
    let formattedPhone: string
    try {
      // Nettoyer le numéro
      const cleanPhone = phone.replace(/\s+/g, '').replace(/[-()]/g, '')
      
      if (!isValidPhoneNumber(cleanPhone)) {
        throw createError.validation("Format de téléphone invalide (exemple: +33612345678)")
      }

      // Formater le numéro
      const phoneNumber = parsePhoneNumber(cleanPhone)
      if (!phoneNumber) {
        throw createError.validation("Impossible de formater le numéro de téléphone")
      }
      
      formattedPhone = phoneNumber.format('E.164')
    } catch (e) {
      throw createError.validation("Format de téléphone invalide (exemple: +33612345678)")
    }

    // Validation spécifique pour les producteurs
    if (role === 'PRODUCER') {
      if (!companyName || !address) {
        throw createError.validation("Nom d'entreprise et adresse requis pour les producteurs")
      }
    }

    // Mise à jour sécurisée avec transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mise à jour de l'utilisateur
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          role,
          phone: formattedPhone,
          profileCompleted: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          profileCompleted: true,
          updatedAt: true
        }
      })

      // Création du profil producteur si nécessaire
      let producerProfile = null
      if (role === 'PRODUCER') {
        // Supprimer l'ancien profil producteur s'il existe (cas rare)
        if (user.producer) {
          await tx.producer.delete({
            where: { userId: session.user.id }
          })
        }

        producerProfile = await tx.producer.create({
          data: {
            userId: session.user.id,
            companyName: companyName!.trim(),
            address: address!.trim(),
            description: description?.trim() || ''
          },
          select: {
            id: true,
            companyName: true,
            address: true,
            description: true
          }
        })

        console.log(`🏭 Profil producteur créé: ${producerProfile.companyName}`)
      }

      return { user: updatedUser, producer: producerProfile }
    })

    // Log d'audit sécurisé
    console.log(`📋 Audit - Profil complété:`, {
      userId: session.user.id,
      role,
      isProducer: role === 'PRODUCER',
      producerId: result.producer?.id || null,
      companyName: result.producer?.companyName || null,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Profil complété pour ${result.user.name} (${role})`)

    // Réponse sécurisée
    const response = {
      user: result.user,
      ...(result.producer && { producer: result.producer }),
      meta: {
        profileCompleted: true,
        role,
        message: role === 'PRODUCER' 
          ? "Profil producteur créé avec succès" 
          : "Profil client complété avec succès"
      }
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error("❌ Erreur complétion profil:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'PRODUCER', 'ADMIN'], // Tous les rôles peuvent compléter
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 5, // Très limité (action unique normalement)
    window: 300  // 5 minutes
  }
})