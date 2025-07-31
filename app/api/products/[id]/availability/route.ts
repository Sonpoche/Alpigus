// app/api/products/[id]/availability/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schémas de validation
const paramsSchema = z.object({
  id: commonSchemas.id
})

const updateAvailabilitySchema = z.object({
  available: z.boolean(),
  reason: z.string().max(200, 'Raison trop longue').optional()
}).strict()

// PATCH - Mettre à jour la disponibilité d'un produit
export const PATCH = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const productId = pathSegments[pathSegments.indexOf('products') + 1]

    const { id } = validateData(paramsSchema, { id: productId })

    // 2. Validation des données
    const rawData = await request.json()
    const { available, reason } = validateData(updateAvailabilitySchema, rawData)

    console.log(`🔄 Mise à jour disponibilité produit ${id} par ${session.user.role} ${session.user.id}`)

    // 3. Vérification d'existence et d'autorisation
    const product = await prisma.product.findUnique({
      where: { id },
      include: { 
        producer: {
          select: {
            id: true,
            userId: true,
            companyName: true
          }
        }
      }
    })

    if (!product) {
      throw createError.notFound("Produit non trouvé")
    }

    // Vérification d'autorisation stricte
    if (session.user.role !== 'ADMIN' && product.producer.userId !== session.user.id) {
      throw createError.forbidden("Vous ne pouvez modifier que la disponibilité de vos propres produits")
    }

    // 4. Vérification de logique métier
    if (available && product.available) {
      // Produit déjà disponible
      return NextResponse.json({
        ...product,
        message: "Produit déjà disponible"
      })
    }

    if (!available && !product.available) {
      // Produit déjà indisponible
      return NextResponse.json({
        ...product,
        message: "Produit déjà indisponible"
      })
    }

    // 5. Mise à jour sécurisée avec transaction
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Mettre à jour la disponibilité
      const updated = await tx.product.update({
        where: { id },
        data: { available },
        include: {
          producer: {
            select: {
              id: true,
              companyName: true,
              user: {
                select: {
                  name: true
                }
              }
            }
          },
          stock: {
            select: {
              quantity: true
            }
          }
        }
      })

      // Créer une entrée d'historique pour traçabilité
      await tx.stockHistory.create({
        data: {
          productId: id,
          quantity: updated.stock?.quantity || 0,
          type: 'adjustment',
          note: `Disponibilité ${available ? 'activée' : 'désactivée'}${reason ? ` - ${reason}` : ''}`
        }
      })

      return updated
    })

    // 6. Notifications automatiques pour changements importants
    if (!available && product.available) {
      // Produit rendu indisponible - notifier les clients avec ce produit en wishlist
      // Note: Implémentation dépendante du système de notifications
      console.log(`⚠️ Produit ${product.name} rendu indisponible`)
    } else if (available && !product.available) {
      // Produit rendu disponible - notifier les clients intéressés
      console.log(`✅ Produit ${product.name} rendu disponible`)
    }

    // 7. Log d'audit sécurisé
    console.log(`📋 Audit - Disponibilité produit modifiée:`, {
      productId: id,
      modifiedBy: session.user.id,
      role: session.user.role,
      productName: product.name,
      previousAvailability: product.available,
      newAvailability: available,
      reason: reason || null,
      producerCompany: product.producer.companyName,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Disponibilité mise à jour: ${product.name} ${available ? 'disponible' : 'indisponible'}`)

    // 8. Réponse sécurisée
    const response = {
      id: updatedProduct.id,
      name: updatedProduct.name,
      available: updatedProduct.available,
      producer: {
        companyName: updatedProduct.producer.companyName
      },
      stock: {
        inStock: (updatedProduct.stock?.quantity || 0) > 0
      },
      updatedAt: new Date().toISOString(),
      changedBy: {
        role: session.user.role,
        userId: session.user.id
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ Erreur mise à jour disponibilité:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['ADMIN', 'PRODUCER'], // Seuls admins et producteurs
  allowedMethods: ['PATCH'],
  rateLimit: {
    requests: 20, // Changements de disponibilité limités
    window: 60
  }
})