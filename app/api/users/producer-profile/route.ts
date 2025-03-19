// app/api/users/producer-profile/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

// Endpoint pour obtenir les données du producteur
export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    // Vérifier si l'utilisateur est un producteur
    if (session.user.role !== 'PRODUCER') {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    // Recherche des données du producteur
    const producer = await prisma.producer.findUnique({
      where: { userId: session.user.id }
    })

    if (!producer) {
      return new NextResponse("Profil producteur non trouvé", { status: 404 })
    }

    return NextResponse.json(producer)
  } catch (error) {
    console.error("Erreur lors de la récupération du profil producteur:", error)
    return new NextResponse(
      "Erreur lors de la récupération du profil producteur", 
      { status: 500 }
    )
  }
})

// Endpoint pour mettre à jour les données du producteur
export const PATCH = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    // Vérifier si l'utilisateur est un producteur
    if (session.user.role !== 'PRODUCER') {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    const body = await req.json()
    const { companyName, address, description } = body

    // Validation basique
    if (companyName !== undefined && typeof companyName !== 'string') {
      return new NextResponse("Le nom de l'entreprise doit être une chaîne de caractères", { status: 400 })
    }

    if (address !== undefined && typeof address !== 'string') {
      return new NextResponse("L'adresse doit être une chaîne de caractères", { status: 400 })
    }

    if (description !== undefined && typeof description !== 'string') {
      return new NextResponse("La description doit être une chaîne de caractères", { status: 400 })
    }

    // Recherche du producteur
    const producer = await prisma.producer.findUnique({
      where: { userId: session.user.id }
    })

    if (!producer) {
      return new NextResponse("Profil producteur non trouvé", { status: 404 })
    }

    // Préparation des données à mettre à jour
    const updateData: any = {}
    if (companyName !== undefined) updateData.companyName = companyName
    if (address !== undefined) updateData.address = address
    if (description !== undefined) updateData.description = description

    // Mise à jour du producteur
    const updatedProducer = await prisma.producer.update({
      where: { userId: session.user.id },
      data: updateData
    })

    return NextResponse.json(updatedProducer)
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil producteur:", error)
    return new NextResponse(
      "Erreur lors de la mise à jour du profil producteur", 
      { status: 500 }
    )
  }
})