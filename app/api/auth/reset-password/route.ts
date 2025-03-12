// app/api/auth/reset-password/route.ts
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { EmailService } from '@/lib/email-service'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    // Validation de l'email
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return new NextResponse('Format d\'email invalide', { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Pour des raisons de sécurité, on ne révèle pas si l'email existe
    if (!user) {
      return NextResponse.json({ 
        message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.'
      })
    }

    // Générer un token unique
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 heure

    // Sauvegarder le token dans la base de données
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    })

    // Construire le lien de réinitialisation
    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password/${resetToken}`

    // Envoyer l'email
    await EmailService.sendPasswordResetEmail(
      user.email,
      user.name || 'Utilisateur',
      resetLink
    )

    return NextResponse.json({ 
      message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.'
    })

  } catch (error) {
    console.error('Reset password error:', error)
    return new NextResponse('Une erreur est survenue', { status: 500 })
  }
}