// app/api/producers/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schéma de validation pour les paramètres de requête
const producersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['companyName']).default('companyName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

// Schéma de validation pour la création de producteur
const createProducerSchema = z.object({
  userId: commonSchemas.id,
  companyName: z.string()
    .min(2, 'Nom entreprise requis (min 2 caractères)')
    .max(200, 'Nom entreprise trop long')
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-'&.()]+$/, 'Caractères invalides dans le nom'),
  address: z.string()
    .min(10, 'Adresse complète requise')
    .max(500, 'Adresse trop longue'),
  description: z.string()
    .max(1000, 'Description trop longue')
    .optional(),
  bankAccountName: z.string()
    .min(2, 'Nom titulaire compte requis')
    .max(100, 'Nom titulaire trop long')
    .optional(),
  iban: z.string()
    .min(15, 'IBAN invalide')
    .max(34, 'IBAN trop long')
    .regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, 'Format IBAN invalide')
    .optional(),
  bankName: z.string()
    .min(2, 'Nom banque requis')
    .max(100, 'Nom banque trop long')
    .optional(),
  bic: z.string()
    .min(8, 'BIC invalide')
    .max(11, 'BIC trop long')
    .regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'Format BIC invalide')
    .optional()
}).strict()

// Définition des types
type ProducerWithUser = {
  id: string
  userId: string
  companyName: string | null
  address: string | null
  description: string | null
  bankName: string | null
  bankAccountName: string | null
  iban: string | null
  bic: string | null
  user: {
    id: string
    name: string | null
    email: string | null
    phone: string
    profileCompleted: boolean
    createdAt: Date
  }
  products?: Array<{
    id: string
    available: boolean
  }>
  _count?: {
    products: number
  }
}

// GET - Obtenir la liste des producteurs
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Validation des paramètres de requête
    const { searchParams } = new URL(request.url)
    const queryParams = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    }

    const validatedQuery = validateData(producersQuerySchema, queryParams)
    const { search, sortBy, sortOrder } = validatedQuery
    const page = validatedQuery.page ?? 1
    const limit = validatedQuery.limit ?? 20

    console.log(`👥 Récupération producteurs par ${session.user.role} ${session.user.id} (page: ${page}, search: ${search || 'none'})`)

    // 2. Construction des filtres de recherche
    const whereClause: any = {}
    
    if (search) {
      whereClause.OR = [
        {
          companyName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          user: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          user: {
            email: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      ]
    }

    // 3. Récupération sécurisée des producteurs avec pagination
    const [producersResult, totalCount] = await Promise.all([
      prisma.producer.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profileCompleted: true,
              createdAt: true
            }
          },
          // Statistiques agrégées pour les admins
          ...(session.user.role === 'ADMIN' && {
            products: {
              select: {
                id: true,
                available: true
              }
            },
            _count: {
              select: {
                products: true
              }
            }
          })
        },
        orderBy: {
          companyName: sortOrder
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.producer.count({ where: whereClause })
    ])

    const producers = producersResult as unknown as ProducerWithUser[]

    // 4. Filtrage des données selon le rôle
    const filteredProducers = producers.map((producer: ProducerWithUser) => {
      // Données de base pour tous les rôles
      const baseData = {
        id: producer.id,
        companyName: producer.companyName,
        description: producer.description,
        address: producer.address,
        user: {
          id: producer.user.id,
          name: producer.user.name,
          profileCompleted: producer.user.profileCompleted
        }
      }

      // Données supplémentaires pour les admins
      if (session.user.role === 'ADMIN') {
        return {
          ...baseData,
          user: {
            ...baseData.user,
            email: producer.user.email,
            phone: producer.user.phone,
            createdAt: producer.user.createdAt
          },
          // Statistiques admin
          stats: {
            totalProducts: producer._count?.products || 0,
            activeProducts: producer.products?.filter((p: any) => p.available).length || 0
          },
          // Informations sensibles pour admin seulement
          bankName: producer.bankName,
          bankAccountName: producer.bankAccountName,
          bic: producer.bic,
          // IBAN partiellement masqué même pour admin
          ibanPreview: producer.iban ? `${producer.iban.substring(0, 4)}****` : null
        }
      }

      return baseData
    })

    // 5. Log d'audit sécurisé
    console.log(`📋 Audit - Producteurs consultés:`, {
      consultedBy: session.user.id,
      role: session.user.role,
      producersCount: filteredProducers.length,
      searchTerm: search || null,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ ${filteredProducers.length} producteurs récupérés`)

    // 6. Réponse sécurisée avec pagination
    return NextResponse.json({
      producers: filteredProducers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1
      },
      meta: {
        accessLevel: session.user.role,
        searchApplied: !!search
      }
    })

  } catch (error) {
    console.error("❌ Erreur récupération producteurs:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'PRODUCER', 'ADMIN'], // Tous peuvent voir la liste
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 100, // 100 consultations par minute
    window: 60
  }
})

// POST - Créer un nouveau producteur (ADMIN uniquement)
export const POST = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Validation des données d'entrée
    const rawData = await request.json()
    const validatedData = validateData(createProducerSchema, rawData)
    
    const { 
      userId, 
      companyName, 
      address, 
      description, 
      bankAccountName, 
      iban,
      bankName,
      bic
    } = validatedData

    console.log(`🏭 Création producteur par admin ${session.user.id} pour user ${userId}`)

    // 2. Vérifications de sécurité préalables
    // Vérifier que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
        producer: { select: { id: true } }
      }
    })

    if (!targetUser) {
      throw createError.notFound("Utilisateur cible non trouvé")
    }

    // Vérifier que l'utilisateur n'a pas déjà un profil producteur
    if (targetUser.producer) {
      throw createError.validation("Cet utilisateur a déjà un profil producteur")
    }

    // Vérifier que l'utilisateur a le bon rôle
    if (targetUser.role !== 'PRODUCER') {
      throw createError.validation("L'utilisateur doit avoir le rôle PRODUCER")
    }

    // 3. Nettoyage et validation des données sensibles
    const cleanCompanyName = companyName.trim()
    const cleanAddress = address.trim()
    const cleanIban = iban ? iban.trim().toUpperCase() : undefined
    const cleanBic = bic ? bic.trim().toUpperCase() : undefined

    // Validation IBAN spécifique (si fourni)
    if (cleanIban && !cleanIban.startsWith('FR') && !cleanIban.startsWith('CH')) {
      console.warn(`⚠️ IBAN suspect lors de création producteur: ${cleanIban.substring(0, 4)}...`)
    }

    // 4. Création sécurisée du producteur
    const producer = await prisma.producer.create({
      data: {
        userId,
        companyName: cleanCompanyName,
        address: cleanAddress,
        description: description?.trim() || '',
        bankAccountName: bankAccountName?.trim() || null,
        iban: cleanIban || null,
        bankName: bankName?.trim() || null,
        bic: cleanBic || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true
          }
        }
      }
    })

    // 5. Log d'audit sécurisé (sans données sensibles)
    console.log(`📋 Audit - Producteur créé:`, {
      producerId: producer.id,
      createdBy: session.user.id,
      targetUserId: userId,
      companyName: cleanCompanyName,
      hasIban: !!cleanIban,
      hasBic: !!cleanBic,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Producteur créé: ${producer.id} pour user ${userId}`)

    // 6. Réponse sécurisée (IBAN masqué)
    const response = {
      ...producer,
      // Masquer l'IBAN dans la réponse
      iban: undefined,
      ibanPreview: cleanIban ? `${cleanIban.substring(0, 4)}****` : null
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error("❌ Erreur création producteur:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['ADMIN'], // Seuls les admins peuvent créer des producteurs manuellement
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 5,  // 5 créations max par minute (action critique)
    window: 60
  }
})