// app/api/onboarding/complete/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { hash, compare } from "bcrypt"
import { z } from "zod"

// Schémas de validation stricts
const baseOnboardingSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128, 'Mot de passe trop long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'),
  confirmPassword: z.string().min(1, 'Confirmation du mot de passe requise'),
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Nom trop long')
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  phone: z.string()
    .min(10, 'Numéro de téléphone invalide')
    .max(20, 'Numéro de téléphone trop long')
    .regex(/^(?:\+33|0)[1-9](?:[0-9]{8})$|^[0-9]{10}$/, 'Format de téléphone invalide')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
})

const producerOnboardingSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128, 'Mot de passe trop long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'),
  confirmPassword: z.string().min(1, 'Confirmation du mot de passe requise'),
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Nom trop long')
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  phone: z.string()
    .min(10, 'Numéro de téléphone invalide')
    .max(20, 'Numéro de téléphone trop long')
    .regex(/^(?:\+33|0)[1-9](?:[0-9]{8})$|^[0-9]{10}$/, 'Format de téléphone invalide'),
  companyName: z.string()
    .min(2, 'Nom de l\'entreprise requis')
    .max(200, 'Nom d\'entreprise trop long')
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-'&.()]+$/, 'Nom d\'entreprise invalide'),
  description: z.string().max(1000, 'Description trop longue').optional(),
  address: z.string()
    .min(10, 'Adresse complète requise')
    .max(500, 'Adresse trop longue'),
  siretNumber: z.string()
    .regex(/^[0-9]{14}$/, 'Le numéro SIRET doit contenir 14 chiffres')
    .optional(),
  bankAccountNumber: z.string()
    .min(15, 'IBAN invalide')
    .max(34, 'IBAN trop long')
    .regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, 'Format IBAN invalide'),
  bankAccountName: z.string()
    .min(2, 'Nom du titulaire du compte requis')
    .max(100, 'Nom du titulaire trop long')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
})

export const POST = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    console.log(`🔧 Début onboarding pour user ${session.user.id} (${session.user.role})`)

    // 1. Vérification que le profil n'est pas déjà complété
    if ((session.user as any).profileCompleted) {
      console.warn(`⚠️ Tentative onboarding sur profil déjà complété par user ${session.user.id}`)
      throw createError.validation("Profil déjà complété - modification non autorisée")
    }

    // 2. Validation des données selon le rôle
    const rawData = await request.json()
    
    let validatedData: any
    if (session.user.role === 'PRODUCER') {
      validatedData = validateData(producerOnboardingSchema, rawData)
    } else {
      validatedData = validateData(baseOnboardingSchema, rawData)
    }

    const { currentPassword, newPassword, name, phone } = validatedData

    // 3. Récupération sécurisée de l'utilisateur avec vérification d'ownership
    const user = await prisma.user.findUnique({
      where: { 
        id: session.user.id // SÉCURITÉ: Vérifier que c'est bien l'utilisateur de la session
      },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        profileCompleted: true,
        producer: true
      }
    })

    if (!user) {
      console.error(`❌ Utilisateur non trouvé lors de l'onboarding: ${session.user.id}`)
      throw createError.notFound("Utilisateur non trouvé")
    }

    // 4. Double vérification du statut de complétion (sécurité)
    if (user.profileCompleted) {
      console.warn(`⚠️ Double tentative onboarding profil complété: ${session.user.id}`)
      throw createError.validation("Profil déjà complété")
    }

    // 5. Vérification sécurisée du mot de passe actuel
    if (!user.password) {
      throw createError.internal("Compte en état incohérent - contactez le support")
    }

    const isPasswordValid = await compare(currentPassword, user.password)
    if (!isPasswordValid) {
      console.warn(`⚠️ Tentative onboarding avec mauvais mot de passe: ${session.user.id}`)
      throw createError.validation("Mot de passe actuel incorrect")
    }

    // 6. Vérification que le nouveau mot de passe est différent
    const isSamePassword = await compare(newPassword, user.password)
    if (isSamePassword) {
      throw createError.validation("Le nouveau mot de passe doit être différent de l'actuel")
    }

    // 7. Hashage sécurisé du nouveau mot de passe
    const hashedNewPassword = await hash(newPassword, 12)

    // 8. Nettoyage et validation des données
    const cleanPhone = phone.replace(/[\s\-\.]/g, '')
    const cleanName = name.trim()

    // 9. Préparation des données de mise à jour
    const updateData: any = {
      password: hashedNewPassword,
      name: cleanName,
      phone: cleanPhone,
      profileCompleted: true // Marquer comme complété
    }

    // 10. Gestion spécifique des producteurs
    if (session.user.role === 'PRODUCER') {
      const { companyName, description, address, siretNumber, bankAccountNumber, bankAccountName } = validatedData

      // Validation métier supplémentaire pour les producteurs
      if (!companyName || !address || !bankAccountNumber || !bankAccountName) {
        throw createError.validation("Informations d'entreprise et bancaires requises pour les producteurs")
      }

      // Nettoyage des données producteur
      const cleanCompanyName = companyName.trim()
      const cleanAddress = address.trim()
      const cleanBankAccountName = bankAccountName.trim()
      const cleanIban = bankAccountNumber.trim().toUpperCase()

      // Validation IBAN simple (peut être renforcée)
      if (!cleanIban.startsWith('FR') && !cleanIban.startsWith('CH')) {
        console.warn(`⚠️ IBAN suspect lors de l'onboarding: ${cleanIban.substring(0, 4)}...`)
      }

      updateData.producer = {
        upsert: {
          create: {
            companyName: cleanCompanyName,
            description: description?.trim() || '',
            address: cleanAddress,
            bankAccountName: cleanBankAccountName,
            iban: cleanIban,
            siretNumber: siretNumber?.trim() || null
          },
          update: {
            companyName: cleanCompanyName,
            description: description?.trim() || '',
            address: cleanAddress,
            bankAccountName: cleanBankAccountName,
            iban: cleanIban,
            siretNumber: siretNumber?.trim() || null
          }
        }
      }

      console.log(`🏭 Données producteur préparées pour user ${session.user.id}`)
    }

    // 11. Mise à jour atomique en transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Mettre à jour l'utilisateur
      const user = await tx.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          profileCompleted: true,
          createdAt: true,
          updatedAt: true,
          producer: {
            select: {
              id: true,
              companyName: true,
              description: true,
              address: true,
              bankAccountName: true,
              // Ne pas exposer l'IBAN complet dans la réponse
            }
          }
        }
      })

      return user
    })

    // 12. Log d'audit sécurisé (sans données sensibles)
    console.log(`✅ Onboarding complété avec succès:`, {
      userId: session.user.id,
      email: updatedUser.email,
      role: session.user.role,
      isProducer: session.user.role === 'PRODUCER',
      timestamp: new Date().toISOString()
    })

    // 13. Réponse sécurisée (sans mot de passe ni IBAN complet)
    return NextResponse.json({
      success: true,
      message: "Profil complété avec succès",
      user: {
        ...updatedUser,
        // Masquer l'IBAN dans la réponse (garder seulement les 4 premiers caractères)
        ...(updatedUser.producer && {
          producer: {
            ...updatedUser.producer,
            ibanPreview: validatedData.bankAccountNumber ? 
              `${validatedData.bankAccountNumber.substring(0, 4)}****` : undefined
          }
        })
      }
    })

  } catch (error) {
    console.error(`❌ Erreur onboarding pour user ${session.user.id}:`, error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'PRODUCER'], // Les admins n'ont pas d'onboarding
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 5,  // 5 tentatives par heure (au cas où)
    window: 3600  // 1 heure
  }
})