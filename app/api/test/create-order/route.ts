// app/api/test/create-order/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { env } from "@/lib/env-validation"

// GET - Créer une commande de test (DÉVELOPPEMENT + ADMIN uniquement)
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // Bloquer complètement en production
    if (env.NODE_ENV === 'production') {
      throw createError.forbidden("Routes de test désactivées en production")
    }

    console.log(`🧪 Test commande par admin ${session.user.id}`)

    // Récupérer un utilisateur client pour le test
    const user = await prisma.user.findFirst({
      where: { role: 'CLIENT' }
    })
    
    if (!user) {
      throw createError.notFound("Aucun utilisateur client trouvé pour le test")
    }
    
    // Récupérer un produit disponible
    const product = await prisma.product.findFirst({
      where: { available: true },
      include: { 
        producer: true,
        stock: true
      }
    })
    
    if (!product) {
      throw createError.notFound("Aucun produit disponible trouvé pour le test")
    }

    if (!product.stock || product.stock.quantity < 1) {
      throw createError.validation("Produit trouvé mais sans stock suffisant")
    }
    
    // Créer une commande de test avec transaction sécurisée
    const result = await prisma.$transaction(async (tx) => {
      // Créer la commande
      const order = await tx.order.create({
        data: {
          userId: user.id,
          status: "PENDING",
          total: product.price,
          metadata: JSON.stringify({ 
            isTestOrder: true,
            createdBy: session.user.id,
            createdByName: session.user.name,
            timestamp: new Date().toISOString()
          }),
          items: {
            create: {
              productId: product.id,
              quantity: 1,
              price: product.price
            }
          }
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  producer: true
                }
              }
            }
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
      
      // Créer une notification pour le producteur
      const notification = await tx.notification.create({
        data: {
          userId: product.producer.userId,
          type: "NEW_ORDER",
          title: "🧪 Commande de test reçue",
          message: `Commande de test créée par ${session.user.name || 'Admin'} (#${order.id.substring(0, 8)})`,
          link: `/producer/orders/${order.id}`,
          data: JSON.stringify({ 
            orderId: order.id,
            isTest: true,
            createdBy: session.user.id
          })
        }
      })

      return { order, notification }
    })
    
    // Log d'audit sécurisé
    console.log(`📋 Audit - Commande test créée:`, {
      orderId: result.order.id,
      createdBy: session.user.id,
      clientUserId: user.id,
      productId: product.id,
      producerId: product.producerId,
      amount: product.price,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Commande test créée: ${result.order.id}`)

    return NextResponse.json({ 
      success: true, 
      data: {
        order: {
          id: result.order.id,
          status: result.order.status,
          total: result.order.total,
          userId: result.order.userId,
          itemsCount: result.order.items.length,
          createdAt: result.order.createdAt
        },
        notification: {
          id: result.notification.id,
          userId: result.notification.userId,
          type: result.notification.type,
          title: result.notification.title
        },
        testInfo: {
          environment: env.NODE_ENV,
          createdBy: session.user.name || session.user.id,
          productName: product.name,
          producerName: product.producer.companyName
        }
      },
      message: "Commande et notification de test créées avec succès",
      warning: "⚠️ Ceci est une commande de test créée en environnement de développement"
    })

  } catch (error) {
    console.error("❌ Erreur test commande:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['ADMIN'], // Seuls les admins peuvent créer des tests
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 5, // Très limité pour éviter le spam
    window: 300  // 5 minutes
  }
})