// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js'

// Schéma de validation pour la mise à jour utilisateur
const updateUserSchema = z.object({
  name: z.string().min(2, 'Nom trop court').max(50, 'Nom trop long').optional(),
  email: z.string().email('Email invalide').optional(),
  phone: z.string().min(8, 'Téléphone invalide').optional()
}).strict()

// GET - Obtenir le profil utilisateur connecté
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    console.log(`👤 Récupération profil utilisateur ${session.user.id}`)

    // Récupération sécurisée des données utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profileCompleted: true,
        createdAt: true,
        updatedAt: true,
        // Inclure les données producteur si applicable
        producer: session.user.role === 'PRODUCER' ? {
          select: {
            id: true,
            companyName: true,
            address: true,
            description: true,
            // Informations bancaires masquées par sécurité
            bankName: true,
            bankAccountName: true,
            // IBAN partiellement masqué
            iban: true
          }
        } : false
      }
    })

    if (!user) {
      throw createError.notFound("Utilisateur non trouvé")
    }

    // Masquer l'IBAN complet pour la sécurité
    if (user.producer?.iban) {
      (user.producer as any).ibanPreview = `${user.producer.iban.substring(0, 4)}****`
      delete (user.producer as any).iban
    }

    console.log(`✅ Profil récupéré pour ${user.name} (${user.role})`)

    return NextResponse.json({
      ...user,
      meta: {
        accessLevel: 'owner',
        role: user.role
      }
    })

  } catch (error) {
    console.error("❌ Erreur récupération profil:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'PRODUCER', 'ADMIN'],
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 100,
    window: 60
  }
})

// PATCH - Mettre à jour le profil utilisateur
export const PATCH = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // Validation des données d'entrée
    const rawData = await request.json()
    const validatedData = validateData(updateUserSchema, rawData)
    
    const { name, email, phone } = validatedData

    console.log(`✏️ Mise à jour profil utilisateur ${session.user.id}`)

    // Vérifications de sécurité pour l'email
    if (email && email !== session.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
      })
      
      if (existingUser) {
        throw createError.validation("Cet email est déjà utilisé par un autre utilisateur")
      }
    }

    // Validation et formatage du téléphone
    let formattedPhone: string | undefined = undefined
    if (phone !== undefined) {
      try {
        // Nettoyer le numéro
        const cleanPhone = phone.replace(/\s+/g, '').replace(/[-()]/g, '')
        
        if (!isValidPhoneNumber(cleanPhone)) {
          throw createError.validation("Format de téléphone invalide (exemple: +33612345678)")
        }

        // Formater le numéro dans un format standard
        const phoneNumber = parsePhoneNumber(cleanPhone)
        if (phoneNumber) {
          formattedPhone = phoneNumber.format('E.164') // Format standard international
        }
      } catch (e) {
        throw createError.validation("Format de téléphone invalide (exemple: +33612345678)")
      }
    }

    // Préparation des données à mettre à jour
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (email !== undefined) updateData.email = email.toLowerCase().trim()
    if (formattedPhone !== undefined) updateData.phone = formattedPhone

    // Mise à jour sécurisée
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profileCompleted: true,
        updatedAt: true,
        producer: session.user.role === 'PRODUCER' ? {
          select: {
            id: true,
            companyName: true,
            address: true,
            description: true
          }
        } : false
      }
    })

    // Log d'audit sécurisé
    console.log(`📋 Audit - Profil utilisateur modifié:`, {
      userId: session.user.id,
      fieldsUpdated: Object.keys(updateData),
      role: session.user.role,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Profil mis à jour pour ${updatedUser.name}`)

    return NextResponse.json({
      ...updatedUser,
      meta: {
        updatedFields: Object.keys(updateData),
        updatedAt: updatedUser.updatedAt
      }
    })

  } catch (error) {
    // Gestion spécifique des erreurs Prisma
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Conflit de données - Cette information est déjà utilisée', code: 'CONFLICT_ERROR' },
        { status: 409 }
      )
    }

    console.error("❌ Erreur mise à jour profil:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'PRODUCER', 'ADMIN'],
  allowedMethods: ['PATCH'],
  rateLimit: {
    requests: 20, // Modifications limitées
    window: 60
  }
})