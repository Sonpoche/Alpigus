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
      where: { id: userId }
    })

    if (!user) {
      return new NextResponse("Utilisateur non trouvé", { status: 404 })
    }

    // Supprimer l'utilisateur (les suppressions en cascade sont gérées par Prisma)
    await prisma.user.delete({
      where: { id: userId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error)
    return new NextResponse(
      "Erreur lors de la suppression de l'utilisateur", 
      { status: 500 }
    )
  }
}, ["ADMIN"])