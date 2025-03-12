// app/api/auth/update-role/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('Body reçu:', body)

    const { role, email } = body

    if (!role || !['CLIENT', 'PRODUCER'].includes(role)) {
      return new NextResponse("Rôle invalide", { status: 400 })
    }

    if (!email) {
      return new NextResponse("Email requis", { status: 400 })
    }

    // Chercher ou créer l'utilisateur
    let user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Créer un nouvel utilisateur
      user = await prisma.user.create({
        data: {
          email,
          role,
          name: email.split('@')[0], // Nom temporaire basé sur l'email
          phone: '', // Champ obligatoire
        }
      })
    }

    // Mettre à jour l'utilisateur avec le rôle sélectionné
    if (role === 'PRODUCER') {
      // Pour un producteur, créer également l'entrée Producer
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          role,
          producer: {
            create: {
              companyName: '',
              description: '',
              address: ''
            }
          }
        },
        include: {
          producer: true
        }
      })
      return NextResponse.json(updatedUser)
    } else {
      // Pour un client, simple mise à jour du rôle
      const updatedUser = await prisma.user.update({
        where: { email },
        data: { role }
      })
      return NextResponse.json(updatedUser)
    }

  } catch (error: any) {
    console.error("[UPDATE_ROLE]", error)
    const errorMessage = error?.message || "Erreur interne inconnue"
    return new NextResponse(`Erreur interne: ${errorMessage}`, { status: 500 })
  }
}