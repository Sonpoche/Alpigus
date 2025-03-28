// app/api/admin/users/[id]/invite/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { EmailService } from "@/lib/email-service"
import crypto from "crypto" // Importez le module crypto de Node.js

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

    // Générer un token unique en utilisant le module crypto de Node.js
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

    // Construire le lien d'invitation
    const inviteLink = `${process.env.NEXTAUTH_URL}/reset-password/${resetToken}`

    // Envoyer l'email d'invitation (en utilisant le service d'email existant)
    try {
      await EmailService.sendWelcomeEmail(
        user.email,
        user.name || 'Utilisateur',
        user.role
      )
      
      return NextResponse.json({
        message: "Invitation envoyée avec succès"
      })
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'email:", emailError)
      return new NextResponse(
        "Erreur lors de l'envoi de l'email d'invitation", 
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'invitation:", error)
    return new NextResponse(
      "Erreur lors de l'envoi de l'invitation", 
      { status: 500 }
    )
  }
}, ["ADMIN"])