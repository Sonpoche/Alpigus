// app/api/auth/reset-password/update/route.ts
import { hash } from 'bcrypt'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return new NextResponse(
        'Token et mot de passe requis',
        { status: 400 }
      )
    }

    // Validation du mot de passe
    if (password.length < 8 ||
        !password.match(/[A-Z]/) ||
        !password.match(/[a-z]/) ||
        !password.match(/[0-9]/)) {
      return new NextResponse(
        'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre',
        { status: 400 }
      )
    }

    // Rechercher l'utilisateur avec le token valide
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date() // Token non expiré
        }
      }
    })

    if (!user) {
      return new NextResponse(
        'Token invalide ou expiré',
        { status: 400 }
      )
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await hash(password, 12)

    // Mettre à jour le mot de passe et supprimer le token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    })

    return NextResponse.json({
      message: 'Mot de passe mis à jour avec succès'
    })

  } catch (error) {
    console.error('Update password error:', error)
    return new NextResponse(
      'Une erreur est survenue lors de la mise à jour du mot de passe',
      { status: 500 }
    )
  }
}