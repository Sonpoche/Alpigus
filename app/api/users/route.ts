// app/api/users/route.ts
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import type { NextRequest } from 'next/server'
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js'

export const GET = apiAuthMiddleware(async (req: NextRequest, session) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        producer: true
      }
    })

    if (!user) {
      return new NextResponse("Utilisateur non trouvé", { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    return new NextResponse("Erreur lors de la récupération du profil", { status: 500 })
  }
})

export const PATCH = apiAuthMiddleware(async (req: NextRequest, session) => {
  try {
    if (!session?.user?.id) {
      return new NextResponse("Session invalide", { status: 401 })
    }

    const body = await req.json()
    const { name, email, phone } = body

    // Validations
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return new NextResponse("Le nom doit être une chaîne de caractères", { status: 400 })
      }
      if (name.length < 2 || name.length > 50) {
        return new NextResponse("Le nom doit contenir entre 2 et 50 caractères", { status: 400 })
      }
    }

    if (email !== undefined) {
      if (typeof email !== 'string') {
        return new NextResponse("L'email doit être une chaîne de caractères", { status: 400 })
      }
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return new NextResponse("Format d'email invalide", { status: 400 })
      }
      // Vérifier si l'email est différent et déjà utilisé
      if (email !== session.user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email }
        })
        if (existingUser) {
          return new NextResponse("Cet email est déjà utilisé", { status: 400 })
        }
      }
    }

    if (phone !== undefined) {
      if (typeof phone !== 'string') {
        return new NextResponse("Le numéro de téléphone doit être une chaîne de caractères", { status: 400 })
      }

      try {
        // Nettoyer le numéro (enlever les espaces et autres caractères)
        const cleanPhone = phone.replace(/\s+/g, '').replace(/[-()]/g, '')
        
        if (!isValidPhoneNumber(cleanPhone)) {
          return new NextResponse(
            "Format de téléphone invalide (exemple: +33612345678)", 
            { status: 400 }
          )
        }

        // Formater le numéro dans un format standard
        const phoneNumber = parsePhoneNumber(cleanPhone)
        if (phoneNumber) {
          body.phone = phoneNumber.format('E.164') // Format standard international
        }
      } catch (e) {
        return new NextResponse(
          "Format de téléphone invalide (exemple: +33612345678)", 
          { status: 400 }
        )
      }
    }

    // Création d'un objet avec uniquement les champs à mettre à jour
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (body.phone !== undefined) updateData.phone = body.phone // Utiliser le numéro formaté
    if (email !== undefined) updateData.email = email

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        producer: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    // Gestion spécifique des erreurs Prisma
    if (error.code === 'P2002') {
      return new NextResponse("Une erreur de conflit est survenue", { status: 409 })
    }

    console.error("Erreur détaillée:", error)
    return new NextResponse(
      "Erreur lors de la mise à jour du profil", 
      { status: 500 }
    )
  }
})