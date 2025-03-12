// app/api/users/complete-profile/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { isValidPhoneNumber } from 'libphonenumber-js'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return new NextResponse("Non autorisé", { status: 401 })
    }

    const { role, phone } = await req.json()

    // Validation du rôle
    if (!role || !['CLIENT', 'PRODUCER'].includes(role)) {
      return new NextResponse("Rôle invalide", { status: 400 })
    }

    // Validation du téléphone
    if (!phone || !isValidPhoneNumber(phone)) {
      return new NextResponse(
        "Format de téléphone invalide (exemple: +41791234567)", 
        { status: 400 }
      )
    }

    // Mise à jour de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        role,
        phone,
        // Si c'est un producteur, créer l'entrée Producer
        ...(role === 'PRODUCER' && {
          producer: {
            create: {
              companyName: '',
              description: '',
              address: ''
            }
          }
        })
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du profil:', error)
    return new NextResponse(
      error.message || "Une erreur est survenue", 
      { status: 500 }
    )
  }
}