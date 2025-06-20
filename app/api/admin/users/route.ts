// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { hash } from "bcrypt"
import { isValidPhoneNumber } from 'libphonenumber-js'
import { UserRole } from "@prisma/client"
import { EmailService } from "@/lib/email-service"

// GET: Récupérer tous les utilisateurs
export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'ADMIN') {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    const users = await prisma.user.findMany({
      include: {
        producer: {
          select: {
            id: true,
            companyName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error)
    return new NextResponse(
      "Erreur lors de la récupération des utilisateurs", 
      { status: 500 }
    )
  }
}, ["ADMIN"])

// POST: Créer un nouvel utilisateur
export const POST = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'ADMIN') {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    const { name, email, phone, role } = await req.json()

    // Validation - Email ET téléphone obligatoires
    if (!email || !role || !phone) {
      return new NextResponse("Email, téléphone et rôle sont requis", { status: 400 })
    }

    // Validation format téléphone
    if (!phone.trim()) {
      return new NextResponse("Le téléphone ne peut pas être vide", { status: 400 })
    }

    // Vérifier si l'email est déjà utilisé
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return new NextResponse("Cet email est déjà utilisé", { status: 400 })
    }

    // Validation téléphone flexible pour tous les pays
    let normalizedPhone = phone.trim()

    // Si le numéro ne commence pas par +, validation basique
    if (!normalizedPhone.startsWith('+')) {
      // Pour les numéros sans indicatif, validation simple
      const localPhoneRegex = /^[0-9\s\-\(\)]{6,15}$/
      if (!localPhoneRegex.test(normalizedPhone)) {
        return new NextResponse(
          "Format de téléphone invalide. Utilisez l'indicatif pays pour les numéros internationaux (ex: +41791234567)", 
          { status: 400 }
        )
      }
    } else {
      // Si l'indicatif est présent, valider avec libphonenumber-js
      try {
        const cleanPhone = normalizedPhone.replace(/\s+/g, '').replace(/[-()]/g, '')
        
        if (!isValidPhoneNumber(cleanPhone)) {
          return new NextResponse(
            "Numéro de téléphone invalide pour l'indicatif pays spécifié", 
            { status: 400 }
          )
        }
        
        // Utiliser le numéro validé
        normalizedPhone = cleanPhone
      } catch (e) {
        return new NextResponse(
          "Format de téléphone invalide", 
          { status: 400 }
        )
      }
    }

    // Vérifier si le rôle est valide
    if (!Object.values(UserRole).includes(role as UserRole)) {
      return new NextResponse("Rôle invalide", { status: 400 })
    }

    // Générer un mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-8)
    const hashedPassword = await hash(tempPassword, 12)

    // Créer l'utilisateur avec téléphone flexible
    const user = await prisma.user.create({
      data: {
        email: email.trim(),
        name: name?.trim() || null,
        password: hashedPassword,
        role: role as UserRole,
        phone: normalizedPhone,
        profileCompleted: false, // ✅ NOUVEAU - Forcer l'onboarding pour les utilisateurs invités
        // Si c'est un producteur, créer aussi l'entrée Producer
        ...(role === UserRole.PRODUCER && {
          producer: {
            create: {
              companyName: '',
              description: '',
              address: ''
            }
          }
        })
      },
      include: {
        producer: true
      }
    })

    // Envoyer email d'invitation avec mot de passe temporaire
    let emailSent = false
    try {
      await EmailService.sendInvitationEmail(
        email, 
        name || 'Utilisateur', 
        tempPassword,
        role as UserRole
      );
      console.log(`Email d'invitation envoyé avec succès à ${email}`);
      emailSent = true
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email d\'invitation:', emailError);
      // On continue malgré l'erreur d'email
    }

    // Créer une entrée dans les logs admin
    try {
      await prisma.adminLog.create({
        data: {
          adminId: session.user.id,
          action: 'CREATE_USER',
          entityType: 'User',
          entityId: user.id,
          details: JSON.stringify({
            action: `Création d'un utilisateur ${role}: ${email}`,
            userEmail: email,
            userName: name,
            userRole: role,
            emailSent: emailSent
          })
        }
      })
    } catch (logError) {
      console.error('Erreur lors de la création du log admin:', logError)
      // Ne pas faire échouer la création pour un problème de log
    }

    // Retirer le mot de passe de la réponse
    const { password, ...userWithoutPassword } = user

    return NextResponse.json({
      ...userWithoutPassword,
      message: emailSent 
        ? "Utilisateur créé avec succès. Email d'invitation envoyé."
        : "Utilisateur créé avec succès. Erreur lors de l'envoi de l'email."
    })
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error)
    return new NextResponse(
      "Erreur lors de la création de l'utilisateur: " + (error instanceof Error ? error.message : 'Erreur inconnue'), 
      { status: 500 }
    )
  }
}, ["ADMIN"])