// app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { isValidPhoneNumber } from 'libphonenumber-js'
import { UserRole } from "@prisma/client"

// GET: Récupérer un utilisateur spécifique
export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'ADMIN') {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: context.params.id },
      include: {
        producer: true
      }
    })

    if (!user) {
      return new NextResponse("Utilisateur non trouvé", { status: 404 })
    }

    // Ne pas renvoyer le mot de passe
    const { password, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error)
    return new NextResponse(
      "Erreur lors de la récupération de l'utilisateur", 
      { status: 500 }
    )
  }
}, ["ADMIN"])

// PATCH: Mettre à jour un utilisateur
export const PATCH = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'ADMIN') {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    const userId = context.params.id
    
    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { producer: true }
    })

    if (!existingUser) {
      return new NextResponse("Utilisateur non trouvé", { status: 404 })
    }

    const body = await req.json()
    const { name, email, phone, role, producer } = body

    // Validation
    if (email && email !== existingUser.email) {
      const userWithEmail = await prisma.user.findUnique({
        where: { email }
      })
      if (userWithEmail) {
        return new NextResponse("Cet email est déjà utilisé", { status: 400 })
      }
    }

    // Validation du téléphone si fourni
    if (phone) {
      try {
        if (!isValidPhoneNumber(phone)) {
          return new NextResponse(
            "Format de téléphone invalide", 
            { status: 400 }
          )
        }
      } catch (e) {
        return new NextResponse(
          "Format de téléphone invalide", 
          { status: 400 }
        )
      }
    }

    // Préparer les données à mettre à jour
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (role !== undefined) updateData.role = role

    // Gestion du changement de rôle
    if (role !== undefined && role !== existingUser.role) {
      // Si on passe de producteur à un autre rôle, supprimer l'entrée producer
      if (existingUser.role === 'PRODUCER' && role !== 'PRODUCER') {
        if (existingUser.producer) {
          await prisma.producer.delete({
            where: { id: existingUser.producer.id }
          })
        }
      }
      // Si on passe à producteur, créer l'entrée producer
      else if (role === 'PRODUCER' && existingUser.role !== 'PRODUCER') {
        await prisma.producer.create({
          data: {
            userId: userId,
            companyName: '',
            description: '',
            address: ''
          }
        })
      }
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        producer: true
      }
    })

    // Mettre à jour les données du producteur si nécessaire
    if (producer && updatedUser.role === 'PRODUCER' && updatedUser.producer) {
      await prisma.producer.update({
        where: { id: updatedUser.producer.id },
        data: {
          companyName: producer.companyName || '',
          ...(producer.description !== undefined && { description: producer.description }),
          ...(producer.address !== undefined && { address: producer.address })
        }
      })
    }

    // Récupérer l'utilisateur mis à jour avec les données du producteur
    const finalUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        producer: true
      }
    })

    // Ne pas renvoyer le mot de passe
    const { password, ...userWithoutPassword } = finalUser as any

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'utilisateur:", error)
    return new NextResponse(
      "Erreur lors de la mise à jour de l'utilisateur", 
      { status: 500 }
    )
  }
}, ["ADMIN"])

// app/api/admin/users/[id]/route.ts - Remplacer la méthode DELETE

// DELETE: Supprimer un utilisateur
export const DELETE = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'ADMIN') {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    const userId = context.params.id
    
    // Empêcher de supprimer son propre compte
    if (userId === session.user.id) {
      return new NextResponse(
        "Vous ne pouvez pas supprimer votre propre compte", 
        { status: 400 }
      )
    }
    
    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        producer: true,
        orders: {
          include: {
            items: true,
            bookings: true
          }
        },
        adminLogs: true,
        notifications: true,
        invoices: true
      }
    })

    if (!user) {
      return new NextResponse("Utilisateur non trouvé", { status: 404 })
    }

    // Supprimer dans une transaction pour garantir la cohérence
    await prisma.$transaction(async (tx) => {
      // 1. Supprimer les logs admin créés PAR cet utilisateur (s'il était admin)
      await tx.adminLog.deleteMany({
        where: { adminId: userId }
      })

      // 2. Supprimer les notifications
      await tx.notification.deleteMany({
        where: { userId: userId }
      })

      // 3. Supprimer les factures
      await tx.invoice.deleteMany({
        where: { userId: userId }
      })

      // 4. Traiter les commandes et leurs dépendances
      for (const order of user.orders) {
        // Supprimer les réservations
        await tx.booking.deleteMany({
          where: { orderId: order.id }
        })
        
        // Supprimer les transactions de portefeuille
        await tx.walletTransaction.deleteMany({
          where: { orderId: order.id }
        })
        
        // Supprimer les transactions
        await tx.transaction.deleteMany({
          where: { orderId: order.id }
        })
        
        // Supprimer les items de commande
        await tx.orderItem.deleteMany({
          where: { orderId: order.id }
        })
      }
      
      // Supprimer les commandes
      await tx.order.deleteMany({
        where: { userId: userId }
      })

      // 5. Si c'est un producteur, supprimer toutes ses dépendances
      if (user.producer) {
        const producerId = user.producer.id

        // Supprimer le portefeuille et ses dépendances
        const wallet = await tx.wallet.findUnique({
          where: { producerId: producerId }
        })
        
        if (wallet) {
          // Supprimer les retraits
          await tx.withdrawal.deleteMany({
            where: { walletId: wallet.id }
          })
          
          // Supprimer les transactions de portefeuille
          await tx.walletTransaction.deleteMany({
            where: { walletId: wallet.id }
          })
          
          // Supprimer le portefeuille
          await tx.wallet.delete({
            where: { id: wallet.id }
          })
        }
        
        // Récupérer tous les produits du producteur
        const products = await tx.product.findMany({
          where: { producerId: producerId }
        })
        
        // Supprimer les dépendances de chaque produit
        for (const product of products) {
          // Supprimer les alertes de stock
          await tx.stockAlert.deleteMany({
            where: { productId: product.id }
          })
          
          // Supprimer l'historique des stocks
          await tx.stockHistory.deleteMany({
            where: { productId: product.id }
          })
          
          // Supprimer les plannings de production
          await tx.productionSchedule.deleteMany({
            where: { productId: product.id }
          })
          
          // Supprimer les créneaux de livraison et leurs réservations
          const deliverySlots = await tx.deliverySlot.findMany({
            where: { productId: product.id }
          })
          
          for (const slot of deliverySlots) {
            await tx.booking.deleteMany({
              where: { slotId: slot.id }
            })
          }
          
          await tx.deliverySlot.deleteMany({
            where: { productId: product.id }
          })
          
          // Supprimer le stock
          await tx.stock.deleteMany({
            where: { productId: product.id }
          })
          
          // Supprimer les items de commande référençant ce produit
          await tx.orderItem.deleteMany({
            where: { productId: product.id }
          })
        }
        
        // Supprimer tous les produits
        await tx.product.deleteMany({
          where: { producerId: producerId }
        })
        
        // Supprimer les transactions du producteur
        await tx.transaction.deleteMany({
          where: { producerId: producerId }
        })
        
        // Supprimer le profil producteur
        await tx.producer.delete({
          where: { id: producerId }
        })
      }

      // 6. Supprimer les comptes et sessions liés
      await tx.account.deleteMany({
        where: { userId: userId }
      })
      
      await tx.session.deleteMany({
        where: { userId: userId }
      })

      // 7. Enfin, supprimer l'utilisateur
      await tx.user.delete({
        where: { id: userId }
      })
    })

    // Log de l'action
    try {
      await prisma.adminLog.create({
        data: {
          adminId: session.user.id,
          action: 'DELETE_USER',
          entityType: 'User',
          entityId: userId,
          details: JSON.stringify({
            action: `Suppression de l'utilisateur: ${user.email}`,
            userEmail: user.email,
            userName: user.name,
            userRole: user.role,
            wasProducer: !!user.producer
          })
        }
      })
    } catch (logError) {
      console.error('Erreur lors de la création du log:', logError)
      // Ne pas faire échouer pour un problème de log
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error)
    return new NextResponse(
      "Erreur lors de la suppression de l'utilisateur: " + (error instanceof Error ? error.message : 'Erreur inconnue'), 
      { status: 500 }
    )
  }
}, ["ADMIN"])