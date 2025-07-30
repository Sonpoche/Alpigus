// app/api/producers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schéma de validation pour les paramètres d'URL
const paramsSchema = z.object({
  id: commonSchemas.id
})

// Schéma de validation pour la mise à jour de producteur
const updateProducerSchema = z.object({
  companyName: z.string()
    .min(2, 'Nom entreprise requis (min 2 caractères)')
    .max(200, 'Nom entreprise trop long')
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-'&.()]+$/, 'Caractères invalides dans le nom')
    .optional(),
  address: z.string()
    .min(10, 'Adresse complète requise')
    .max(500, 'Adresse trop longue')
    .optional(),
  description: z.string()
    .max(1000, 'Description trop longue')
    .optional(),
  siretNumber: z.string()
    .regex(/^[0-9]{14}$/, 'SIRET invalide (14 chiffres)')
    .optional(),
  bankAccountName: z.string()
    .min(2, 'Nom titulaire compte requis')
    .max(100, 'Nom titulaire trop long')
    .optional(),
  iban: z.string()
    .min(15, 'IBAN invalide')
    .max(34, 'IBAN trop long')
    .regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, 'Format IBAN invalide')
    .optional()
}).strict()

// GET - Obtenir un producteur spécifique
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const producerId = pathSegments[pathSegments.indexOf('producers') + 1]

    const { id } = validateData(paramsSchema, { id: producerId })

    console.log(`🔍 Récupération producteur ${id} par ${session.user.role} ${session.user.id}`)

    // 2. Récupération sécurisée du producteur
    const producer = await prisma.producer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profileCompleted: true,
            createdAt: true,
            updatedAt: true
          }
        },
        // Statistiques pour admins et le producteur lui-même
        ...(session.user.role === 'ADMIN' || 
           (session.user.role === 'PRODUCER' && session.user.id === producer?.userId)) && {
          products: {
            select: {
              id: true,
              name: true,
              available: true,
              price: true,
              createdAt: true
            }
          },
          _count: {
            select: {
              products: true
            }
          }
        }
      }
    })

    if (!producer) {
      console.warn(`⚠️ Tentative accès producteur inexistant ${id} par user ${session.user.id}`)
      throw createError.notFound("Producteur non trouvé")
    }

    // 3. Vérifications d'autorisation selon le rôle
    let canViewSensitiveData = false
    
    if (session.user.role === 'ADMIN') {
      canViewSensitiveData = true
    } else if (session.user.role === 'PRODUCER' && producer.userId === session.user.id) {
      canViewSensitiveData = true
      console.log(`🏭 Producteur ${producer.companyName || 'Inconnu'} consulte son propre profil`)
    }
    // CLIENT peut voir les données publiques seulement

    // 4. Filtrage des données selon les autorisations
    const baseData = {
      id: producer.id,
      companyName: producer.companyName,
      description: producer.description,
      address: producer.address, // Visible pour tous (nécessaire pour livraisons)
      createdAt: producer.createdAt,
      updatedAt: producer.updatedAt,
      user: {
        id: producer.user.id,
        name: producer.user.name,
        profileCompleted: producer.user.profileCompleted
      }
    }

    let responseData: any = baseData

    // Données sensibles pour le propriétaire et les admins
    if (canViewSensitiveData) {
      responseData = {
        ...baseData,
        user: {
          ...baseData.user,
          email: producer.user.email,
          phone: producer.user.phone,
          createdAt: producer.user.createdAt,
          updatedAt: producer.user.updatedAt
        },
        // Informations commerciales sensibles
        siretNumber: producer.siretNumber,
        bankAccountName: producer.bankAccountName,
        // IBAN partiellement masqué même pour le propriétaire (sécurité)
        ibanPreview: producer.iban ? `${producer.iban.substring(0, 4)}****` : null,
        
        // Statistiques si disponibles
        ...(producer.products && {
          stats: {
            totalProducts: producer._count?.products || 0,
            activeProducts: producer.products.filter(p => p.available).length || 0,
            averagePrice: producer.products.length > 0 
              ? producer.products.reduce((sum, p) => sum + p.price, 0) / producer.products.length 
              : 0
          }
        })
      }

      // Produits détaillés pour admin seulement
      if (session.user.role === 'ADMIN' && producer.products) {
        responseData.products = producer.products.map(product => ({
          id: product.id,
          name: product.name,
          available: product.available,
          price: product.price,
          createdAt: product.createdAt
        }))
      }
    }

    // 5. Log d'audit sécurisé
    console.log(`📋 Audit - Producteur consulté:`, {
      producerId: id,
      consultedBy: session.user.id,
      role: session.user.role,
      canViewSensitive: canViewSensitiveData,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Producteur ${id} récupéré avec niveau d'accès: ${canViewSensitiveData ? 'complet' : 'public'}`)

    return NextResponse.json({
      ...responseData,
      meta: {
        accessLevel: canViewSensitiveData ? 'full' : 'public',
        viewerRole: session.user.role
      }
    })

  } catch (error) {
    console.error("❌ Erreur récupération producteur:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'PRODUCER', 'ADMIN'],
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 100, // 100 consultations par minute
    window: 60
  }
})

// PATCH - Mettre à jour un producteur
export const PATCH = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const producerId = pathSegments[pathSegments.indexOf('producers') + 1]

    const { id } = validateData(paramsSchema, { id: producerId })

    // 2. Validation des données de mise à jour
    const rawData = await request.json()
    const validatedData = validateData(updateProducerSchema, rawData)

    console.log(`✏️ Mise à jour producteur ${id} par ${session.user.role} ${session.user.id}`)

    // 3. Récupération et vérification d'autorisation
    const existingProducer = await prisma.producer.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        companyName: true,
        siretNumber: true,
        iban: true
      }
    })

    if (!existingProducer) {
      throw createError.notFound("Producteur non trouvé")
    }

    // 4. Vérifications d'autorisation strictes
    let canEdit = false
    
    if (session.user.role === 'ADMIN') {
      canEdit = true
    } else if (session.user.role === 'PRODUCER' && existingProducer.userId === session.user.id) {
      canEdit = true
      console.log(`🏭 Producteur ${existingProducer.companyName || 'Inconnu'} modifie son profil`)
    }

    if (!canEdit) {
      console.warn(`⚠️ Tentative modification producteur non autorisée ${id} par user ${session.user.id}`)
      throw createError.forbidden("Non autorisé - Vous ne pouvez modifier que votre propre profil producteur")
    }

    // 5. Vérifications d'unicité pour les champs critiques
    if (validatedData.siretNumber && validatedData.siretNumber !== existingProducer.siretNumber) {
      const existingSiret = await prisma.producer.findFirst({
        where: { 
          siretNumber: validatedData.siretNumber,
          NOT: { id }
        }
      })
      if (existingSiret) {
        throw createError.validation("Ce numéro SIRET est déjà utilisé par un autre producteur")
      }
    }

    // 6. Nettoyage des données
    const updateData: any = {}
    
    if (validatedData.companyName) {
      updateData.companyName = validatedData.companyName.trim()
    }
    
    if (validatedData.address) {
      updateData.address = validatedData.address.trim()
    }
    
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description?.trim() || ''
    }
    
    if (validatedData.siretNumber !== undefined) {
      updateData.siretNumber = validatedData.siretNumber?.trim() || null
    }
    
    if (validatedData.bankAccountName !== undefined) {
      updateData.bankAccountName = validatedData.bankAccountName?.trim() || null
    }
    
    if (validatedData.iban !== undefined) {
      const cleanIban = validatedData.iban?.trim().toUpperCase() || null
      updateData.iban = cleanIban
      
      // Validation IBAN pour la sécurité
      if (cleanIban && !cleanIban.startsWith('FR') && !cleanIban.startsWith('CH')) {
        console.warn(`⚠️ IBAN suspect lors de modification: ${cleanIban.substring(0, 4)}...`)
      }
    }

    // 7. Mise à jour sécurisée
    const updatedProducer = await prisma.producer.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    // 8. Log d'audit sécurisé
    console.log(`📋 Audit - Producteur modifié:`, {
      producerId: id,
      modifiedBy: session.user.id,
      role: session.user.role,
      fieldsUpdated: Object.keys(updateData),
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Producteur ${id} mis à jour avec succès`)

    // 9. Réponse sécurisée (IBAN masqué)
    const response = {
      ...updatedProducer,
      iban: undefined,
      ibanPreview: updatedProducer.iban ? `${updatedProducer.iban.substring(0, 4)}****` : null
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ Erreur mise à jour producteur:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['ADMIN', 'PRODUCER'],
  allowedMethods: ['PATCH'],
  rateLimit: {
    requests: 20, // 20 modifications par minute
    window: 60
  }
})

// DELETE - Supprimer un producteur (ADMIN uniquement)
export const DELETE = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const producerId = pathSegments[pathSegments.indexOf('producers') + 1]

    const { id } = validateData(paramsSchema, { id: producerId })

    console.log(`🗑️ Suppression producteur ${id} par admin ${session.user.id}`)

    // 2. Vérification d'existence et contraintes métier
    const producer = await prisma.producer.findUnique({
      where: { id },
      include: {
        products: {
          select: { id: true }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!producer) {
      throw createError.notFound("Producteur non trouvé")
    }

    // 3. Vérifications de contraintes métier
    if (producer.products.length > 0) {
      throw createError.validation(
        `Impossible de supprimer ce producteur car il a ${producer.products.length} produit(s) associé(s). Supprimez d'abord ses produits.`
      )
    }

    // 4. Vérifier s'il y a des commandes en cours
    const pendingOrders = await prisma.order.count({
      where: {
        items: {
          some: {
            product: {
              producerId: id
            }
          }
        },
        status: {
          in: ['PENDING', 'CONFIRMED', 'SHIPPED']
        }
      }
    })

    if (pendingOrders > 0) {
      throw createError.validation(
        `Impossible de supprimer ce producteur car il a ${pendingOrders} commande(s) en cours. Attendez que les commandes soient finalisées.`
      )
    }

    // 5. Suppression sécurisée
    await prisma.producer.delete({
      where: { id }
    })

    // 6. Log d'audit sécurisé
    console.log(`📋 Audit - Producteur supprimé:`, {
      producerId: id,
      deletedBy: session.user.id,
      producerName: producer.user.name,
      producerEmail: producer.user.email,
      companyName: producer.companyName,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Producteur ${id} supprimé avec succès`)

    return NextResponse.json({
      success: true,
      message: 'Producteur supprimé avec succès'
    })

  } catch (error) {
    console.error("❌ Erreur suppression producteur:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['ADMIN'], // Seuls les admins peuvent supprimer
  allowedMethods: ['DELETE'],
  rateLimit: {
    requests: 5,  // 5 suppressions max par minute (action critique)
    window: 60
  }
})