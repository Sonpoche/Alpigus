// app/api/products/[id]/stock-history/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schémas de validation
const paramsSchema = z.object({
  id: commonSchemas.id
})

const historyQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  type: z.enum(['sale', 'adjustment', 'refund', 'initial']).optional()
})

// GET - Obtenir l'historique du stock d'un produit
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const productId = pathSegments[pathSegments.indexOf('products') + 1]

    const { id } = validateData(paramsSchema, { id: productId })

    // 2. Validation des paramètres de requête
    const { searchParams } = new URL(request.url)
    const queryParams = {
      limit: searchParams.get('limit'),
      type: searchParams.get('type')
    }

    const { limit, type } = validateData(historyQuerySchema, queryParams)

    console.log(`📊 Récupération historique stock produit ${id} par ${session.user.role} ${session.user.id}`)

    // 3. Vérification d'existence et d'autorisation
    const product = await prisma.product.findUnique({
      where: { id },
      include: { 
        producer: {
          select: {
            userId: true,
            companyName: true
          }
        }
      }
    })

    if (!product) {
      throw createError.notFound("Produit non trouvé")
    }

    // Vérification d'autorisation
    if (session.user.role !== 'ADMIN' && product.producer.userId !== session.user.id) {
      throw createError.forbidden("Vous ne pouvez consulter que l'historique de vos propres produits")
    }

    console.log(`🏭 Accès historique stock pour ${product.name} de ${product.producer.companyName}`)

    // 4. Construction des filtres
    const whereClause: any = { productId: id }
    if (type) {
      whereClause.type = type
    }

    // 5. Récupération sécurisée de l'historique
    const [history, currentStock] = await Promise.all([
      prisma.stockHistory.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        take: limit
      }),
      prisma.stock.findUnique({
        where: { productId: id },
        select: {
          quantity: true,
          updatedAt: true
        }
      })
    ])

    // 6. Calcul des statistiques avancées
    const now = new Date()
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    // Filtrer les ventes du dernier mois pour calculer le taux d'écoulement
    const recentSales = history.filter(record => 
      record.type === 'sale' && 
      new Date(record.date) >= oneMonthAgo
    )

    // Calculer la somme des ventes (quantités de sortie)
    let totalSalesQuantity = 0
    for (let i = 0; i < recentSales.length; i++) {
      const currentRecord = recentSales[i]
      const previousRecord = history.find(h => 
        new Date(h.date) < new Date(currentRecord.date) &&
        h.type !== 'sale'
      )
      
      const quantityChange = (previousRecord?.quantity || 0) - currentRecord.quantity
      if (quantityChange > 0) {
        totalSalesQuantity += quantityChange
      }
    }

    // Calcul du taux hebdomadaire (sur 4 semaines)
    const weeklyRate = totalSalesQuantity / 4 || 0.1 // Éviter division par zéro

    // Calculer le nombre de jours avant rupture
    const currentQuantity = currentStock?.quantity || 0
    const dailyRate = weeklyRate / 7
    const daysUntilEmpty = dailyRate > 0 ? Math.floor(currentQuantity / dailyRate) : null

    // 7. Formatage des données pour la réponse
    const formattedHistory = history.map(record => ({
      id: record.id,
      date: record.date.toISOString(),
      quantity: record.quantity,
      type: record.type,
      note: record.note,
      orderId: record.orderId // Si lié à une commande
    }))

    // 8. Calcul des tendances
    const trends = {
      totalEntries: history.length,
      byType: {
        sales: history.filter(h => h.type === 'sale').length,
        adjustments: history.filter(h => h.type === 'adjustment').length,
        refunds: history.filter(h => h.type === 'refund').length,
        initial: history.filter(h => h.type === 'initial').length
      },
      recentActivity: {
        lastWeek: history.filter(h => 
          new Date(h.date) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        ).length,
        lastMonth: history.filter(h => 
          new Date(h.date) >= oneMonthAgo
        ).length
      }
    }

    // 9. Log d'audit sécurisé
    console.log(`📋 Audit - Historique stock consulté:`, {
      productId: id,
      consultedBy: session.user.id,
      role: session.user.role,
      entriesCount: history.length,
      typeFilter: type || 'all',
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Historique récupéré: ${history.length} entrées`)

    // 10. Réponse sécurisée
    const response = {
      productId: id,
      product: {
        name: product.name,
        unit: product.unit
      },
      history: formattedHistory,
      currentStock: {
        quantity: currentQuantity,
        lastUpdated: currentStock?.updatedAt || null
      },
      analytics: {
        weeklyRate: Math.round(weeklyRate * 100) / 100, // Arrondir à 2 décimales
        daysUntilEmpty,
        trends
      },
      meta: {
        totalEntries: history.length,
        limit,
        typeFilter: type || 'all',
        generatedAt: new Date().toISOString()
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ Erreur récupération historique stock:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN'], // Seuls producteurs et admins
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 50, // Consultation d'historique modérée
    window: 60
  }
})