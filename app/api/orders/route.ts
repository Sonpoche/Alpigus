// app/api/orders/route.ts - Version corrigée
import { NextRequest, NextResponse } from "next/server"
import { withClientSecurity } from "@/lib/api-security"
import { validateInput, orderSchemas } from "@/lib/validation-schemas"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { OrderStatus, ProductType, Prisma } from "@prisma/client"
import { NotificationService } from '@/lib/notification-service'

// Fonction d'aide pour les logs de débogage sécurisés (simplifiée)
function logDebug(message: string, data?: any): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] ${message}`, data || '')
  }
}

// Types pour la validation
interface OrderItem {
  productId: string
  quantity: number
  price: number
}

// GET: Récupérer les commandes de l'utilisateur
export const GET = withClientSecurity(async (request: NextRequest, session) => {
  try {
    const { searchParams } = new URL(request.url)
    
    // Validation des paramètres de requête
    const queryParams = {
      status: searchParams.get('status'),
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
    }
    
    logDebug("Requête GET /api/orders", {
      userId: session.user.id,
      queryParams
    })
    
    // Construction sécurisée de la requête
    const baseWhere: any = {
      userId: session.user.id, // SÉCURITÉ: Toujours filtrer par utilisateur connecté
    }
    
    // ✅ CORRECTION: Utiliser l'enum OrderStatus au lieu de chaînes
    if (queryParams.status) {
      // Vérifier que le statut est valide
      if (!Object.values(OrderStatus).includes(queryParams.status as OrderStatus)) {
        throw createError.validation(`Statut invalide: ${queryParams.status}`)
      }
      baseWhere.status = queryParams.status as OrderStatus
    } else {
      // Par défaut, exclure les DRAFT en utilisant l'enum
      baseWhere.status = { not: OrderStatus.DRAFT }
    }
    
    // Pagination sécurisée
    const maxLimit = 50 // Limite maximale pour éviter les surcharges
    const safeLimit = Math.min(queryParams.limit || 10, maxLimit)
    const safePage = Math.max(queryParams.page || 1, 1)
    
    logDebug("Query conditions", { baseWhere, safeLimit, safePage })
    
    // Récupération sécurisée des données
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: baseWhere,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            }
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  unit: true,
                  image: true,
                  producerId: true
                }
              }
            }
          },
          bookings: {
            include: {
              deliverySlot: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                      unit: true,
                      image: true
                    }
                  }
                }
              }
            }
          },
          invoice: {
            select: {
              id: true,
              amount: true,
              status: true,
              dueDate: true,
              paidAt: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit
      }),
      prisma.order.count({
        where: baseWhere
      })
    ])
    
    logDebug("Commandes récupérées", {
      userId: session.user.id,
      count: orders.length,
      total,
      page: safePage
    })
    
    return NextResponse.json({
      orders,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit)
      }
    })
    
  } catch (error) {
    logDebug("Erreur GET /api/orders", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    console.error("Erreur lors de la récupération des commandes:", error)
    return handleError(error, request.url)
  }
})

// POST: Créer une nouvelle commande
export const POST = withClientSecurity(async (request: NextRequest, session) => {
  try {
    // Validation des données d'entrée
    const rawData = await request.json()
    logDebug("Requête de création de commande reçue", {
      userId: session.user.id,
      hasItems: rawData.items && rawData.items.length > 0
    })
    
    // Validation avec schéma si des items sont fournis
    let validatedData: any = null
    if (rawData.items && rawData.items.length > 0) {
      validatedData = validateInput(orderSchemas.create, rawData)
    }
    
    // Récupération sécurisée du panier existant avec l'enum OrderStatus
    let cartItems: OrderItem[] = []
    
    try {
      const cart = await prisma.order.findFirst({
        where: {
          userId: session.user.id,
          status: OrderStatus.DRAFT // ✅ CORRECTION: Utiliser l'enum
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  available: true,
                  producerId: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      if (cart && cart.items.length > 0) {
        // Validation que les produits sont toujours disponibles
        const unavailableProducts = cart.items.filter(item => !item.product.available)
        if (unavailableProducts.length > 0) {
          throw createError.validation(
            `Certains produits ne sont plus disponibles: ${unavailableProducts.map(p => p.product.name).join(', ')}`
          )
        }
        
        cartItems = cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        }))
        
        logDebug("Items trouvés dans le panier existant", { itemsCount: cartItems.length })
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation')) {
        throw error // Re-lancer les erreurs de validation
      }
      logDebug("Erreur lors de la récupération du panier", { 
        error: error instanceof Error ? error.message : 'Unknown' 
      })
    }
    
    // Déterminer les items à utiliser
    const itemsToCreate = validatedData?.items || cartItems
    
    // ✅ CORRECTION TEMPORAIRE: Permettre la création de paniers vides pour compatibilité
    if (itemsToCreate.length === 0) {
      console.log('🛒 Création d\'un panier vide (mode compatibilité)')
      
      // Créer un panier vide pour la compatibilité avec l'ancien système
      const order = await prisma.order.create({
        data: {
          userId: session.user.id,
          total: 0,
          status: OrderStatus.DRAFT, // ✅ CORRECTION: Utiliser l'enum
          metadata: JSON.stringify({
            createdByAPI: true,
            emptyCart: true,
            userAgent: request.headers.get('user-agent')?.substring(0, 255),
            createdAt: new Date().toISOString()
          })
        },
        include: {
          items: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          bookings: true
        }
      })
      
      logDebug("Panier vide créé (compatibilité)", {
        orderId: order.id,
        userId: session.user.id
      })
      
      return NextResponse.json(order)
    }
    
    logDebug("Items qui seront utilisés", { itemsCount: itemsToCreate.length })
    
    // Validation des produits et calcul sécurisé du total
    let totalAmount = 0
    const validatedItems: OrderItem[] = []
    
    for (const item of itemsToCreate) {
      // Vérifier que le produit existe et est disponible
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          price: true,
          available: true,
          minOrderQuantity: true,
          producerId: true
        }
      })
      
      if (!product) {
        throw createError.notFound(`Produit non trouvé: ${item.productId}`)
      }
      
      if (!product.available) {
        throw createError.validation(`Produit non disponible: ${product.name}`)
      }
      
      if (item.quantity < product.minOrderQuantity) {
        throw createError.validation(
          `Quantité insuffisante pour ${product.name}. Minimum: ${product.minOrderQuantity}`
        )
      }
      
      // Vérifier la cohérence du prix (sécurité importante !)
      if (Math.abs(item.price - product.price) > 0.01) {
        throw createError.validation(
          `Prix incohérent pour ${product.name}. Attendu: ${product.price}, reçu: ${item.price}`
        )
      }
      
      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price // Utiliser le prix de la DB pour la sécurité
      })
      
      totalAmount += product.price * item.quantity
    }
    
    // Transaction sécurisée pour la création
    const order = await prisma.$transaction(async (tx) => {
      // Créer la commande avec l'enum OrderStatus
      const newOrder = await tx.order.create({
        data: {
          userId: session.user.id,
          total: totalAmount,
          status: OrderStatus.DRAFT, // ✅ CORRECTION: Utiliser l'enum
          metadata: JSON.stringify({
            createdByAPI: true,
            userAgent: request.headers.get('user-agent')?.substring(0, 255),
            createdAt: new Date().toISOString()
          })
        }
      })
      
      // Créer les items
      await tx.orderItem.createMany({
        data: validatedItems.map(item => ({
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        }))
      })
      
      return newOrder
    })
    
    // Récupération de la commande complète
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                producer: {
                  select: {
                    id: true,
                    companyName: true,
                    userId: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        bookings: {
          include: {
            deliverySlot: {
              include: {
                product: {
                  include: {
                    producer: {
                      select: {
                        id: true,
                        companyName: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
    
    logDebug("Commande créée avec succès", {
      orderId: order.id,
      userId: session.user.id,
      itemsCount: validatedItems.length,
      total: totalAmount
    })
    
    // Notification sécurisée
    if (completeOrder && completeOrder.items.length > 0) {
      try {
        await NotificationService.sendNewOrderNotification(completeOrder)
        logDebug("Notification envoyée", { orderId: order.id })
      } catch (notificationError) {
        logDebug("Erreur notification (non critique)", { 
          orderId: order.id,
          error: notificationError instanceof Error ? notificationError.message : 'Unknown'
        })
        // Ne pas faire échouer la création pour une erreur de notification
      }
    }
    
    return NextResponse.json(completeOrder)
    
  } catch (error) {
    logDebug("Erreur création commande", {
      userId: session.user.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    console.error("Erreur lors de la création de commande:", error)
    return handleError(error, request.url)
  }
})