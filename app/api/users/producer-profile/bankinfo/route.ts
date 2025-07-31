// app/api/users/producer-profile/bankinfo/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schéma de validation pour les informations bancaires
const bankInfoSchema = z.object({
  bankName: z.string().min(2, 'Nom banque requis').max(100, 'Nom banque trop long'),
  bankAccountName: z.string().min(2, 'Nom titulaire requis').max(100, 'Nom titulaire trop long'),
  iban: z.string()
    .min(15, 'IBAN invalide')
    .max(34, 'IBAN trop long')
    .regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, 'Format IBAN invalide'),
  bic: z.string()
    .min(8, 'BIC invalide')
    .max(11, 'BIC trop long')
    .regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'Format BIC invalide')
    .optional()
}).strict()

// PATCH - Mettre à jour les informations bancaires
export const PATCH = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // Validation des données d'entrée
    const rawData = await request.json()
    
    // Préparation des données pour validation (nettoyage IBAN/BIC)
    const cleanedData = {
      ...rawData,
      iban: rawData.iban?.replace(/\s+/g, '').toUpperCase(),
      bic: rawData.bic?.trim().toUpperCase()
    }
    
    const validatedData = validateData(bankInfoSchema, cleanedData)
    const { bankName, bankAccountName, iban, bic } = validatedData

    console.log(`🏦 Mise à jour informations bancaires producteur ${session.user.id}`)

    // Vérification d'existence du producteur
    const producer = await prisma.producer.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyName: true,
        bankName: true,
        iban: true
      }
    })

    if (!producer) {
      throw createError.notFound("Profil producteur non trouvé")
    }

    // Validation de sécurité IBAN (optionnelle mais recommandée)
    if (!iban.startsWith('FR') && !iban.startsWith('CH') && !iban.startsWith('BE')) {
      console.warn(`⚠️ IBAN non européen détecté: ${iban.substring(0, 4)}...`)
      // On peut choisir de bloquer ou juste logger selon la politique
    }

    // Vérification d'unicité IBAN (si l'IBAN change)
    if (iban !== producer.iban) {
      const existingProducerWithIban = await prisma.producer.findFirst({
        where: {
          iban,
          NOT: { id: producer.id }
        },
        select: { id: true }
      })

      if (existingProducerWithIban) {
        throw createError.validation("Cet IBAN est déjà utilisé par un autre producteur")
      }
    }

    // Mise à jour sécurisée avec transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedProducer = await tx.producer.update({
        where: { id: producer.id },
        data: {
          bankName: bankName.trim(),
          bankAccountName: bankAccountName.trim(),  
          iban,
          bic: bic || null
        },
        select: {
          id: true,
          companyName: true,
          bankName: true,
          bankAccountName: true,
          iban: true,
          bic: true
        }
      })

      // Créer une entrée d'audit pour modification IBAN (données sensibles)
      if (iban !== producer.iban) {
        console.log(`🔒 IBAN modifié pour producteur ${producer.companyName}: ${producer.iban?.substring(0, 4)}... → ${iban.substring(0, 4)}...`)
      }

      return updatedProducer
    })

    // Log d'audit sécurisé (sans exposer les données bancaires complètes)
    console.log(`📋 Audit - Informations bancaires modifiées:`, {
      userId: session.user.id,
      producerId: producer.id,
      bankName: bankName,
      ibanChanged: iban !== producer.iban,
      ibanPrefix: iban.substring(0, 4),
      hasBic: !!bic,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Informations bancaires mises à jour pour ${producer.companyName}`)

    // Réponse sécurisée (IBAN partiellement masqué)
    const response = {
      id: result.id,
      companyName: result.companyName,
      bankName: result.bankName,
      bankAccountName: result.bankAccountName,
      bic: result.bic,
      // IBAN partiellement masqué pour sécurité
      ibanPreview: result.iban ? `${result.iban.substring(0, 4)}****` : null,
      updatedAt: new Date().toISOString(), // Utiliser timestamp actuel
      meta: {
        success: true,
        message: "Informations bancaires mises à jour avec succès",
        securityNote: "IBAN masqué pour des raisons de sécurité"
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ Erreur mise à jour informations bancaires:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER'], // Seuls les producteurs
  allowedMethods: ['PATCH'],
  rateLimit: {
    requests: 5, // Très limité (données sensibles)
    window: 300  // 5 minutes
  }
})