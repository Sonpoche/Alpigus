// app/api/admin/users/[id]/reset-password/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { EmailService } from "@/lib/email-service"
import { createError } from "@/lib/error-handler"
import crypto from "crypto"

export const POST = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID utilisateur
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const userId = pathParts[pathParts.indexOf('users') + 1]
    
    if (!userId || !userId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID utilisateur invalide")
    }
    
    console.log(`🔑 Admin ${session.user.id} réinitialise le mot de passe de ${userId}`)
    
    // SÉCURITÉ: Empêcher l'auto-réinitialisation du mot de passe admin
    if (userId === session.user.id) {
      throw createError.validation("Vous ne pouvez pas réinitialiser votre propre mot de passe via cette fonction")
    }
    
    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })

    if (!user) {
      throw createError.notFound("Utilisateur non trouvé")
    }
    
    // SÉCURITÉ: Empêcher la réinitialisation des mots de passe d'autres admins
    if (user.role === 'ADMIN') {
      throw createError.validation("La réinitialisation de mot de passe d'autres administrateurs n'est pas autorisée")
    }

    // Générer un token sécurisé avec une expiration
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 heure
    
    console.log(`🔐 Token de réinitialisation généré pour ${user.email}`)

    // Sauvegarder le token dans la base de données de manière atomique
    await prisma.user.update({
      where: { id: userId },
      data: {
        resetToken,
        resetTokenExpiry
      }
    })

    // Construire le lien de réinitialisation sécurisé
    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password/${resetToken}`

    // Envoyer l'email de réinitialisation
    let emailSent = false
    try {
      await EmailService.sendPasswordResetEmail(
        user.email,
        user.name || 'Utilisateur',
        resetLink
      )
      emailSent = true
      console.log(`📧 Email de réinitialisation envoyé à ${user.email}`)
    } catch (emailError) {
      console.error("❌ Erreur lors de l'envoi de l'email:", emailError)
      
      // En cas d'échec d'email, nettoyer le token pour éviter les fuites
      await prisma.user.update({
        where: { id: userId },
        data: {
          resetToken: null,
          resetTokenExpiry: null
        }
      })
      
      throw createError.internal("Erreur lors de l'envoi de l'email de réinitialisation")
    }
    
    // Log d'audit détaillé pour traçabilité
    try {
      await prisma.adminLog.create({
        data: {
          adminId: session.user.id,
          action: 'RESET_PASSWORD_REQUEST',
          entityType: 'User',
          entityId: userId,
          details: JSON.stringify({
            targetUserEmail: user.email,
            targetUserRole: user.role,
            resetTokenExpiry: resetTokenExpiry.toISOString(),
            emailSent: emailSent,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('⚠️ Erreur log admin (non critique):', logError)
    }
    
    console.log(`✅ Réinitialisation de mot de passe initiée pour ${user.email}`)
    
    return NextResponse.json({ 
      success: true,
      message: "Email de réinitialisation envoyé avec succès",
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      expiresAt: resetTokenExpiry.toISOString()
    })
    
  } catch (error) {
    console.error("❌ Erreur lors de la réinitialisation du mot de passe:", error)
    throw error
  }
})