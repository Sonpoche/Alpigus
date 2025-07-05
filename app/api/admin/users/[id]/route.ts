// app/api/admin/users/[id]/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity } from "@/lib/api-security"
import { validateInput, userSchemas } from "@/lib/validation-schemas"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { isValidPhoneNumber } from 'libphonenumber-js'
import { UserRole } from "@prisma/client"
import { z } from 'zod'

// Schémas de validation spécifiques pour l'admin
const adminUserUpdateSchema = z.object({
  name: z.string().min(2, 'Nom trop court').max(100, 'Nom trop long').optional(),
  email: z.string().email('Email invalide').max(255, 'Email trop long').optional(),
  phone: z.string().min(10, 'Téléphone invalide').max(20, 'Téléphone trop long').optional(),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Rôle invalide' }) }).optional(),
  producer: z.object({
    companyName: z.string().max(255, 'Nom entreprise trop long').optional(),
    description: z.string().max(2000, 'Description trop longue').optional(),
    address: z.string().max(500, 'Adresse trop longue').optional()
  }).optional()
}).strict() // Empêche les champs non définis

// GET: Récupérer un utilisateur spécifique
export const GET = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Récupérer l'ID utilisateur depuis l'URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const userId = pathParts[pathParts.indexOf('users') + 1]
    
    // Validation de l'ID
    if (!userId || !userId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID utilisateur invalide")
    }
    
    console.log(`👤 Admin ${session.user.id} consulte l'utilisateur ${userId}`)
    
    // Récupération sécurisée avec limitation des données sensibles
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profileCompleted: true,
        createdAt: true,
        updatedAt: true,
        producer: {
          select: {
            id: true,
            companyName: true,
            address: true,
            description: true,
            bankName: true,
            bankAccountName: true,
            iban: true,
            bic: true
          }
        },
        // Statistiques utiles pour l'admin
        _count: {
          select: {
            orders: true,
            notifications: true,
            invoices: true
          }
        }
      }
    })

    if (!user) {
      throw createError.notFound("Utilisateur non trouvé")
    }

    // Log d'audit pour traçabilité
    console.log(`✅ Consultation utilisateur par admin:`, {
      adminId: session.user.id,
      targetUserId: userId,
      targetUserEmail: user.email,
      timestamp: new Date().toISOString()
    })

    // Ne jamais exposer de données sensibles comme les mots de passe
    return NextResponse.json(user)
    
  } catch (error) {
    console.error("❌ Erreur consultation utilisateur:", error)
    return handleError(error, request.url)
  }
})

// PATCH: Mettre à jour un utilisateur
export const PATCH = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Récupérer l'ID utilisateur
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const userId = pathParts[pathParts.indexOf('users') + 1]
    
    if (!userId || !userId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID utilisateur invalide")
    }
    
    // Validation des données d'entrée
    const rawData = await request.json()
    const validatedData = validateInput(adminUserUpdateSchema, rawData)
    
    console.log(`✏️ Admin ${session.user.id} modifie l'utilisateur ${userId}`)
    
    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        producer: true,
        _count: {
          select: {
            orders: true,
            invoices: true
          }
        }
      }
    })

    if (!existingUser) {
      throw createError.notFound("Utilisateur non trouvé")
    }
    
    // SÉCURITÉ: Empêcher l'auto-modification du rôle admin
    if (userId === session.user.id && validatedData.role && validatedData.role !== 'ADMIN') {
      throw createError.validation("Vous ne pouvez pas modifier votre propre rôle d'administrateur")
    }
    
    // Validation métier avancée
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const userWithEmail = await prisma.user.findUnique({
        where: { email: validatedData.email }
      })
      if (userWithEmail) {
        throw createError.conflict("Cet email est déjà utilisé par un autre utilisateur")
      }
    }

    // Validation du téléphone si fourni
    if (validatedData.phone && validatedData.phone.trim()) {
      try {
        if (!isValidPhoneNumber(validatedData.phone)) {
          throw createError.validation("Format de téléphone invalide")
        }
      } catch (e) {
        throw createError.validation("Format de téléphone invalide")
      }
    }
    
    // SÉCURITÉ: Log avant modification pour audit
    const changeLog = {
      adminId: session.user.id,
      targetUserId: userId,
      targetUserEmail: existingUser.email,
      changes: {} as any,
      timestamp: new Date().toISOString()
    }
    
    // Tracer les modifications
    if (validatedData.name && validatedData.name !== existingUser.name) {
      changeLog.changes.name = { from: existingUser.name, to: validatedData.name }
    }
    if (validatedData.email && validatedData.email !== existingUser.email) {
      changeLog.changes.email = { from: existingUser.email, to: validatedData.email }
    }
    if (validatedData.role && validatedData.role !== existingUser.role) {
      changeLog.changes.role = { from: existingUser.role, to: validatedData.role }
    }

    // Préparer les données de mise à jour
    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.email !== undefined) updateData.email = validatedData.email
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone || null
    if (validatedData.role !== undefined) updateData.role = validatedData.role

    // Transaction atomique pour la mise à jour complexe
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Gestion sécurisée du changement de rôle
      if (validatedData.role && validatedData.role !== existingUser.role) {
        console.log(`🔄 Changement de rôle: ${existingUser.role} → ${validatedData.role}`)
        
        // Si on passe de producteur à un autre rôle
        if (existingUser.role === 'PRODUCER' && validatedData.role !== 'PRODUCER') {
          if (existingUser.producer) {
            // Vérifier s'il n'y a pas de commandes en cours avant suppression
            if (existingUser._count.orders > 0) {
              console.warn(`⚠️ Suppression producteur avec ${existingUser._count.orders} commandes`)
            }
            
            await tx.producer.delete({
              where: { id: existingUser.producer.id }
            })
            console.log(`🗑️ Profil producteur supprimé pour ${userId}`)
          }
        }
        // Si on passe à producteur
        else if (validatedData.role === 'PRODUCER' && existingUser.role !== 'PRODUCER') {
          await tx.producer.create({
            data: {
              userId: userId,
              companyName: validatedData.producer?.companyName || '',
              description: validatedData.producer?.description || '',
              address: validatedData.producer?.address || ''
            }
          })
          console.log(`✅ Profil producteur créé pour ${userId}`)
        }
      }

      // Mettre à jour l'utilisateur
      const user = await tx.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          producer: true
        }
      })
      
      // Mettre à jour les données du producteur si nécessaire
      if (validatedData.producer && user.role === 'PRODUCER' && user.producer) {
        await tx.producer.update({
          where: { id: user.producer.id },
          data: {
            companyName: validatedData.producer.companyName || user.producer.companyName,
            description: validatedData.producer.description !== undefined 
              ? validatedData.producer.description 
              : user.producer.description,
            address: validatedData.producer.address !== undefined 
              ? validatedData.producer.address 
              : user.producer.address
          }
        })
      }
      
      return user
    })

    // Log d'audit détaillé
    console.log(`✅ Utilisateur modifié par admin:`, changeLog)
    
    // Créer un log admin dans la base
    try {
      await prisma.adminLog.create({
        data: {
          adminId: session.user.id,
          action: 'UPDATE_USER',
          entityType: 'User',
          entityId: userId,
          details: JSON.stringify({
            changes: changeLog.changes,
            targetUserEmail: existingUser.email
          })
        }
      })
    } catch (logError) {
      console.error('⚠️ Erreur log admin (non critique):', logError)
    }

    // Récupérer l'utilisateur final avec toutes les relations
    const finalUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profileCompleted: true,
        createdAt: true,
        updatedAt: true,
        producer: {
          select: {
            id: true,
            companyName: true,
            address: true,
            description: true,
            bankName: true,
            bankAccountName: true,
            iban: true,
            bic: true
          }
        }
      }
    })

    return NextResponse.json(finalUser)
    
  } catch (error) {
    console.error("❌ Erreur modification utilisateur:", error)
    return handleError(error, request.url)
  }
})

// DELETE: Supprimer un utilisateur
export const DELETE = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Récupérer l'ID utilisateur
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const userId = pathParts[pathParts.indexOf('users') + 1]
    
    if (!userId || !userId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID utilisateur invalide")
    }
    
    console.log(`🗑️ Admin ${session.user.id} tente de supprimer l'utilisateur ${userId}`)
    
    // SÉCURITÉ CRITIQUE: Empêcher l'auto-suppression
    if (userId === session.user.id) {
      throw createError.validation("Vous ne pouvez pas supprimer votre propre compte administrateur")
    }
    
    // Vérifier que l'utilisateur existe et récupérer ses dépendances
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
        invoices: true,
        _count: {
          select: {
            orders: true,
            invoices: true
          }
        }
      }
    })

    if (!user) {
      throw createError.notFound("Utilisateur non trouvé")
    }
    
    // SÉCURITÉ: Empêcher la suppression d'autres admins (optionnel)
    if (user.role === 'ADMIN') {
      throw createError.validation("La suppression d'autres administrateurs n'est pas autorisée")
    }
    
    // Avertissement si l'utilisateur a des données importantes
    if (user._count.orders > 0) {
      console.warn(`⚠️ Suppression utilisateur avec ${user._count.orders} commandes et ${user._count.invoices} factures`)
    }

    // Transaction atomique massive pour la suppression en cascade
    await prisma.$transaction(async (tx) => {
      console.log(`🧹 Début suppression en cascade pour ${user.email}`)
      
      // 1. Supprimer les logs admin créés PAR cet utilisateur
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

      // 5. Si c'est un producteur, suppression complète des dépendances
      if (user.producer) {
        const producerId = user.producer.id
        console.log(`🏭 Suppression producteur et dépendances: ${producerId}`)

        // Supprimer le portefeuille et ses dépendances
        const wallet = await tx.wallet.findUnique({
          where: { producerId: producerId }
        })
        
        if (wallet) {
          await tx.withdrawal.deleteMany({
            where: { walletId: wallet.id }
          })
          
          await tx.walletTransaction.deleteMany({
            where: { walletId: wallet.id }
          })
          
          await tx.wallet.delete({
            where: { id: wallet.id }
          })
        }
        
        // Récupérer et supprimer tous les produits
        const products = await tx.product.findMany({
          where: { producerId: producerId }
        })
        
        for (const product of products) {
          // Supprimer toutes les dépendances du produit
          await tx.stockAlert.deleteMany({
            where: { productId: product.id }
          })
          
          await tx.stockHistory.deleteMany({
            where: { productId: product.id }
          })
          
          await tx.productionSchedule.deleteMany({
            where: { productId: product.id }
          })
          
          // Créneaux de livraison et réservations
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
          
          await tx.stock.deleteMany({
            where: { productId: product.id }
          })
          
          await tx.orderItem.deleteMany({
            where: { productId: product.id }
          })
        }
        
        // Supprimer les produits
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

      // 6. Supprimer les comptes et sessions OAuth
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
      
      console.log(`✅ Suppression terminée pour ${user.email}`)
    })

    // Log d'audit critique
    const auditLog = {
      adminId: session.user.id,
      action: 'DELETE_USER',
      targetUserId: userId,
      targetUserEmail: user.email,
      targetUserRole: user.role,
      wasProducer: !!user.producer,
      ordersCount: user._count.orders,
      invoicesCount: user._count.invoices,
      timestamp: new Date().toISOString()
    }
    
    console.log(`🔥 SUPPRESSION UTILISATEUR PAR ADMIN:`, auditLog)
    
    try {
      await prisma.adminLog.create({
        data: {
          adminId: session.user.id,
          action: 'DELETE_USER',
          entityType: 'User',
          entityId: userId,
          details: JSON.stringify(auditLog)
        }
      })
    } catch (logError) {
      console.error('⚠️ Erreur log admin (critique):', logError)
      // Pour une suppression, l'échec du log est grave mais on continue
    }

    return new NextResponse(null, { status: 204 })
    
  } catch (error) {
    console.error("❌ Erreur suppression utilisateur:", error)
    return handleError(error, request.url)
  }
})