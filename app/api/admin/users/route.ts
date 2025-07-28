// app/api/admin/users/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { EmailService } from "@/lib/email-service"
import { createError } from "@/lib/error-handler"
import { hash } from "bcrypt"
import { isValidPhoneNumber } from 'libphonenumber-js'
import { UserRole } from "@prisma/client"
import { z } from "zod"
import crypto from "crypto"

// Schémas de validation
const createUserSchema = z.object({
  name: z.string().min(2, 'Nom trop court').max(100, 'Nom trop long').optional(),
  email: z.string().email('Email invalide').max(255, 'Email trop long'),
  phone: z.string().min(6, 'Téléphone trop court').max(20, 'Téléphone trop long'),
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Rôle invalide' })
  })
}).strict()

const getUsersQuerySchema = z.object({
  page: z.coerce.number().min(1),
  limit: z.coerce.number().min(1).max(100),
  role: z.nativeEnum(UserRole).optional(),
  search: z.string().max(100).optional()
})

// Valeurs par défaut
const defaultPagination = {
  page: 1,
  limit: 20
}

// GET: Récupérer tous les utilisateurs avec pagination et filtres
export const GET = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    console.log(`👥 Admin ${session.user.id} consulte la liste des utilisateurs`)
    
    // Validation et extraction des paramètres de requête
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    // Appliquer les valeurs par défaut manuellement
    const parsedParams = {
      page: queryParams.page || defaultPagination.page.toString(),
      limit: queryParams.limit || defaultPagination.limit.toString(),
      role: queryParams.role,
      search: queryParams.search
    }
    
    const { page, limit, role, search } = validateData(getUsersQuerySchema, parsedParams)
    
    // Construction de la requête avec filtres sécurisés
    const where: any = {}
    
    if (role) {
      where.role = role
    }
    
    if (search && search.trim()) {
      const searchTerm = search.trim()
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }
    
    // Exécution des requêtes en parallèle pour optimiser les performances
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
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
              companyName: true
            }
          },
          // Statistiques utiles pour l'admin
          _count: {
            select: {
              orders: true,
              notifications: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where })
    ])
    
    console.log(`✅ ${users.length} utilisateurs récupérés (page ${page}/${Math.ceil(totalCount / limit)})`)
    
    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      filters: {
        role: role || null,
        search: search || null
      }
    })
    
  } catch (error) {
    console.error("❌ Erreur récupération utilisateurs:", error)
    throw error
  }
})

// POST: Créer un nouvel utilisateur
export const POST = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Validation stricte des données d'entrée
    const rawData = await request.json()
    const { name, email, phone, role } = validateData(createUserSchema, rawData)
    
    console.log(`👤 Admin ${session.user.id} crée un utilisateur ${role}: ${email}`)
    
    // Vérification unicité email
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    })
    
    if (existingUser) {
      throw createError.conflict("Cet email est déjà utilisé")
    }
    
    // Validation et normalisation du téléphone
    let normalizedPhone = phone.trim()
    
    if (!normalizedPhone.startsWith('+')) {
      // Validation basique pour numéros locaux
      const localPhoneRegex = /^[0-9\s\-\(\)]{6,15}$/
      if (!localPhoneRegex.test(normalizedPhone)) {
        throw createError.validation(
          "Format de téléphone invalide. Utilisez l'indicatif pays (+41) pour les numéros internationaux"
        )
      }
    } else {
      // Validation stricte avec indicatif pays
      try {
        const cleanPhone = normalizedPhone.replace(/\s+/g, '').replace(/[-()]/g, '')
        if (!isValidPhoneNumber(cleanPhone)) {
          throw createError.validation("Numéro de téléphone invalide")
        }
        normalizedPhone = cleanPhone
      } catch (e) {
        throw createError.validation("Format de téléphone invalide")
      }
    }
    
    // Génération mot de passe temporaire sécurisé
    const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 12)
    const hashedPassword = await hash(tempPassword, 12)
    
    // Transaction atomique pour créer l'utilisateur et ses dépendances
    const user = await prisma.$transaction(async (tx) => {
      // Créer l'utilisateur
      const newUser = await tx.user.create({
        data: {
          email: email.trim().toLowerCase(),
          name: name?.trim() || null,
          password: hashedPassword,
          role: role,
          phone: normalizedPhone,
          profileCompleted: false // Forcer l'onboarding
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          profileCompleted: true,
          createdAt: true
        }
      })
      
      // Si c'est un producteur, créer le profil producteur
      let producerProfile = null
      if (role === UserRole.PRODUCER) {
        producerProfile = await tx.producer.create({
          data: {
            userId: newUser.id,
            companyName: '',
            description: '',
            address: ''
          },
          select: {
            id: true,
            companyName: true
          }
        })
      }
      
      return {
        ...newUser,
        producer: producerProfile
      }
    })
    
    // Envoi email d'invitation (non bloquant)
    let emailSent = false
    try {
      await EmailService.sendInvitationEmail(
        email,
        name || 'Utilisateur',
        tempPassword,
        role
      )
      emailSent = true
      console.log(`📧 Email d'invitation envoyé à ${email}`)
    } catch (emailError) {
      console.error('⚠️ Erreur envoi email (non critique):', emailError)
    }
    
    // Log d'audit détaillé
    try {
      await prisma.adminLog.create({
        data: {
          adminId: session.user.id,
          action: 'CREATE_USER',
          entityType: 'User',
          entityId: user.id,
          details: JSON.stringify({
            userEmail: email,
            userName: name,
            userRole: role,
            emailSent,
            hasPhone: !!phone,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('⚠️ Erreur log admin (non critique):', logError)
    }
    
    console.log(`✅ Utilisateur créé avec succès: ${user.id}`)
    
    return NextResponse.json({
      ...user,
      message: emailSent 
        ? "Utilisateur créé avec succès. Email d'invitation envoyé."
        : "Utilisateur créé avec succès. Erreur lors de l'envoi de l'email.",
      emailSent
    })
    
  } catch (error) {
    console.error("❌ Erreur création utilisateur:", error)
    throw error
  }
})