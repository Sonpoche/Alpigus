// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { hash } from "bcrypt"
import { isValidPhoneNumber } from 'libphonenumber-js'
import { UserRole } from "@prisma/client"

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

    // Validation
    if (!email || !role) {
      return new NextResponse("Email et rôle sont requis", { status: 400 })
    }

    // Vérifier si l'email est déjà utilisé
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return new NextResponse("Cet email est déjà utilisé", { status: 400 })
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

    // Vérifier si le rôle est valide
    if (!Object.values(UserRole).includes(role as UserRole)) {
      return new NextResponse("Rôle invalide", { status: 400 })
    }

    // Générer un mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-8)
    const hashedPassword = await hash(tempPassword, 12)

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role as UserRole,
        phone: phone || null,
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

    // TODO: Envoyer email d'invitation avec mot de passe temporaire
    // EmailService.sendInvitationEmail(email, name || 'Utilisateur', tempPassword);

    // Retirer le mot de passe de la réponse
    const { password, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error)
    return new NextResponse(
      "Erreur lors de la création de l'utilisateur", 
      { status: 500 }
    )
  }
}, ["ADMIN"])