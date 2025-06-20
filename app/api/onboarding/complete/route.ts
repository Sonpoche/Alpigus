// app/api/onboarding/complete/route.ts

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { hash, compare } from "bcrypt"

interface OnboardingData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
  name: string
  phone: string
  companyName?: string
  description?: string
  address?: string
  siretNumber?: string
  bankAccountNumber?: string
  bankAccountName?: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return new NextResponse("Non authentifié", { status: 401 })
    }

    // Si le profil est déjà complété, ne pas permettre la modification
    if (session.user.profileCompleted) {
      return new NextResponse("Profil déjà complété", { status: 400 })
    }

    const data: OnboardingData = await req.json()

    // Validation des données
    if (!data.currentPassword || !data.newPassword || !data.name || !data.phone) {
      return new NextResponse("Données manquantes", { status: 400 })
    }

    if (data.newPassword !== data.confirmPassword) {
      return new NextResponse("Les mots de passe ne correspondent pas", { status: 400 })
    }

    if (data.newPassword.length < 8) {
      return new NextResponse("Le mot de passe doit contenir au moins 8 caractères", { status: 400 })
    }

    // Récupérer l'utilisateur actuel
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { producer: true }
    })

    if (!user) {
      return new NextResponse("Utilisateur non trouvé", { status: 404 })
    }

    // Vérifier le mot de passe actuel
    const isPasswordValid = await compare(data.currentPassword, user.password!)
    if (!isPasswordValid) {
      return new NextResponse("Mot de passe actuel incorrect", { status: 400 })
    }

    // Hasher le nouveau mot de passe
    const hashedNewPassword = await hash(data.newPassword, 12)

    // Validation téléphone (format plus flexible)
    const phoneRegex = /^(?:\+33|0)[1-9](?:[0-9]{8})$|^[0-9]{10}$/
    if (!phoneRegex.test(data.phone.replace(/[\s\-\.]/g, ''))) {
      return new NextResponse("Format de téléphone invalide (ex: 0612345678 ou +33612345678)", { status: 400 })
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      password: hashedNewPassword,
      name: data.name.trim(),
      phone: data.phone.trim(),
      profileCompleted: true // ✅ Marquer le profil comme complété
    }

    // Si c'est un producteur, mettre à jour aussi les données producteur
    if (session.user.role === 'PRODUCER') {
      if (!data.companyName || !data.address) {
        return new NextResponse("Informations d'entreprise manquantes", { status: 400 })
      }

      if (!data.bankAccountNumber || !data.bankAccountName) {
        return new NextResponse("Informations bancaires manquantes", { status: 400 })
      }

      // Mettre à jour les informations producteur
      updateData.producer = {
        upsert: {
          create: {
            companyName: data.companyName.trim(),
            description: data.description?.trim() || '',
            address: data.address.trim(),
            bankAccountName: data.bankAccountName.trim(),
            iban: data.bankAccountNumber.trim(),
          },
          update: {
            companyName: data.companyName.trim(),
            description: data.description?.trim() || '',
            address: data.address.trim(),
            bankAccountName: data.bankAccountName.trim(),
            iban: data.bankAccountNumber.trim(),
          }
        }
      }
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      include: { producer: true }
    })

    console.log('Profil complété avec succès pour:', updatedUser.email)

    // Retirer le mot de passe de la réponse
    const { password, ...userWithoutPassword } = updatedUser

    return NextResponse.json({
      ...userWithoutPassword,
      message: "Profil complété avec succès"
    })

  } catch (error) {
    console.error('Erreur lors de la complétion de l\'onboarding:', error)
    return new NextResponse(
      error instanceof Error ? error.message : "Erreur lors de la complétion du profil", 
      { status: 500 }
    )
  }
}