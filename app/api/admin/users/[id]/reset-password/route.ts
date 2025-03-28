// app/api/admin/users/[id]/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { EmailService } from "@/lib/email-service"
import crypto from "crypto"

export const POST = apiAuthMiddleware(async (
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
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return new NextResponse("Utilisateur non trouvé", { status: 404 })
    }

    // Générer un token unique
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 heure

    // Sauvegarder le token dans la base de données
    await prisma.user.update({
      where: { id: userId },
      data: {
        resetToken,
        resetTokenExpiry
      }
    })

    // Construire le lien de réinitialisation
    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password/${resetToken}`

    // Envoyer l'email de réinitialisation
    try {
      await EmailService.sendPasswordResetEmail(
        user.email,
        user.name || 'Utilisateur',
        resetLink
      )
      
      return NextResponse.json({
        message: "Email de réinitialisation envoyé avec succès"
      })
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'email:", emailError)
      return new NextResponse(
        "Erreur lors de l'envoi de l'email de réinitialisation", 
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error)
    return new NextResponse(
      "Erreur lors de la réinitialisation du mot de passe", 
      { status: 500 }
    )
  }
}, ["ADMIN"])