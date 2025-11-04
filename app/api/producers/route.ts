// Chemin du fichier: app/api/producers/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

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

// GET - Obtenir la liste des producteurs
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    const { searchParams } = new URL(request.url)
    
    // Récupération directe des paramètres sans validation stricte
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || undefined
    const sortBy = searchParams.get('sortBy') || 'companyName'
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc'

    console.log(`👥 Récupération producteurs par ${session.user.role} ${session.user.id}`)

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

    const [producers, totalCount] = await Promise.all([
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

    const filteredProducers = producers.map((producer: any) => {
      const baseData = {
        id: producer.id,
        companyName: producer.companyName,
        description: producer.description,
        address: producer.address,
        user: {
          id: producer.user.id,
          name: producer.user.name,
          email: producer.user.email,
          profileCompleted: producer.user.profileCompleted
        }
      }

      if (session.user.role === 'ADMIN') {
        return {
          ...baseData,
          user: {
            ...baseData.user,
            phone: producer.user.phone,
            createdAt: producer.user.createdAt
          },
          stats: {
            totalProducts: producer._count?.products || 0,
            activeProducts: producer.products?.filter((p: any) => p.available).length || 0
          },
          bankName: producer.bankName,
          bankAccountName: producer.bankAccountName,
          bic: producer.bic,
          ibanPreview: producer.iban ? `${producer.iban.substring(0, 4)}****` : null
        }
      }

      return baseData
    })

    console.log(`✅ ${filteredProducers.length} producteurs récupérés`)

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
  allowedRoles: ['CLIENT', 'PRODUCER', 'ADMIN'],
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 100,
    window: 60
  }
})

// POST - Créer un nouveau producteur (ADMIN uniquement)
export const POST = withAuthSecurity(async (request: NextRequest, session) => {
  try {
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

    if (targetUser.producer) {
      throw createError.validation("Cet utilisateur a déjà un profil producteur")
    }

    if (targetUser.role !== 'PRODUCER') {
      throw createError.validation("L'utilisateur doit avoir le rôle PRODUCER")
    }

    const cleanCompanyName = companyName.trim()
    const cleanAddress = address.trim()
    const cleanIban = iban ? iban.trim().toUpperCase() : undefined
    const cleanBic = bic ? bic.trim().toUpperCase() : undefined

    if (cleanIban && !cleanIban.startsWith('FR') && !cleanIban.startsWith('CH')) {
      console.warn(`⚠️ IBAN suspect lors de création producteur: ${cleanIban.substring(0, 4)}...`)
    }

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

    const response = {
      ...producer,
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
  allowedRoles: ['ADMIN'],
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 5,
    window: 60
  }
})