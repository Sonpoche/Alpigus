// app/api/admin/orders/overview/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { Prisma, OrderStatus } from "@prisma/client"
import { z } from "zod"

// Schéma de validation pour les paramètres de requête
const overviewQuerySchema = z.object({
  days: z.coerce.number().min(1).max(365),
  page: z.coerce.number().min(1),
  limit: z.coerce.number().min(1).max(100),
  search: z.string().max(100).optional()
})

// Valeurs par défaut
const defaultParams = {
  days: 30,
  page: 1,
  limit: 10,
  search: ''
}

export const GET = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    console.log(`📊 Admin ${session.user.id} consulte l'aperçu des commandes`)
    
    // Validation des paramètres de requête
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    // Appliquer les valeurs par défaut
    const parsedParams = {
      days: queryParams.days || defaultParams.days.toString(),
      page: queryParams.page || defaultParams.page.toString(),
      limit: queryParams.limit || defaultParams.limit.toString(),
      search: queryParams.search || defaultParams.search
    }
    
    const { days, page, limit, search } = validateData(overviewQuerySchema, parsedParams)
    
    // Calculer la date limite
    const dateLimit = new Date()
    dateLimit.setDate(dateLimit.getDate() - days)
    
    console.log(`📅 Récupération des commandes des ${days} derniers jours`)
    
    // ÉTAPE 1 - Statistiques de base SANS les DRAFT
    console.log("📈 Calcul des statistiques de base...")
    
    const [totalOrders, ordersByStatus] = await Promise.all([
      // Total des commandes (SANS les DRAFT)
      prisma.order.count({
        where: {
          status: {
            not: OrderStatus.DRAFT
          }
        }
      }),
      
      // Commandes par statut (SANS les DRAFT)
      prisma.order.groupBy({
        by: ['status'],
        where: {
          status: {
            not: OrderStatus.DRAFT
          }
        },
        _count: {
          id: true
        }
      })
    ])
    
    console.log(`📊 Total commandes (sans DRAFT): ${totalOrders}`)
    
    // ÉTAPE 2 - Préparation de la recherche avec exclusion des DRAFT
    let whereClause: Prisma.OrderWhereInput = {
      createdAt: {
        gte: dateLimit
      },
      // Exclure explicitement les DRAFT
      status: {
        not: OrderStatus.DRAFT
      }
    }
    
    // Ajouter un filtre de recherche sécurisé si un terme est fourni
    if (search && search.trim()) {
      const searchTerm = search.trim()
      whereClause = {
        ...whereClause,
        OR: [
          { 
            id: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            user: {
              OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } }
              ]
            }
          }
        ]
      }
    }
    
    // ÉTAPE 3 - Commandes récentes avec pagination sécurisée
    console.log("📝 Récupération des commandes avec pagination...")
    const skip = (page - 1) * limit
    
    const [orders, totalFilteredOrders] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        select: {
          id: true,
          createdAt: true,
          status: true,
          total: true,
          user: {
            select: {
              name: true,
              email: true
            }
          },
          items: {
            select: {
              id: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      
      prisma.order.count({
        where: whereClause
      })
    ])
    
    const totalPages = Math.ceil(totalFilteredOrders / limit)
    console.log(`📄 ${orders.length} commandes récupérées (page ${page}/${totalPages})`)
    
    // ÉTAPE 4 - Commandes nécessitant attention (SANS les DRAFT)
    console.log("⚠️ Identification des commandes nécessitant attention...")
    const ordersNeedingAttention = await prisma.order.findMany({
      where: {
        AND: [
          // Exclure les DRAFT
          {
            status: {
              not: OrderStatus.DRAFT
            }
          },
          // Conditions d'attention
          {
            OR: [
              { 
                status: OrderStatus.PENDING, 
                createdAt: { 
                  lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
                } 
              }
              // Ajouter d'autres conditions d'attention ici si nécessaire
            ]
          }
        ]
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
        total: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 10
    })
    
    console.log(`⚠️ ${ordersNeedingAttention.length} commandes nécessitent attention`)
    
    // ÉTAPE 5 - Préparation de la réponse sécurisée
    const response = {
      overview: {
        totalOrders,
        ordersByStatus: ordersByStatus.map(item => ({
          status: item.status,
          count: item._count.id
        }))
      },
      orders: orders.map(order => ({
        id: order.id,
        createdAt: order.createdAt,
        status: order.status,
        total: order.total,
        customer: order.user ? {
          name: order.user.name,
          email: order.user.email
        } : null,
        items: order.items.length
      })),
      pagination: {
        page,
        limit,
        total: totalFilteredOrders,
        pages: totalPages
      },
      ordersNeedingAttention: ordersNeedingAttention.map(order => ({
        id: order.id,
        createdAt: order.createdAt,
        status: order.status,
        total: order.total,
        customer: order.user ? {
          name: order.user.name,
          email: order.user.email
        } : null,
        issueType: 'Commande en attente depuis longtemps'
      })),
      filters: {
        days,
        search: search || null
      }
    }
    
    console.log(`✅ Aperçu des commandes généré avec succès`)
    return NextResponse.json(response)
    
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de l'aperçu des commandes:", error)
    throw error
  }
})