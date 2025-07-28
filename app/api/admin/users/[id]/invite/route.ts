// app/api/admin/users/[id]/invite/route.ts - Version sécurisée
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
    
    console.log(`💌 Admin ${session.user.id} envoie une invitation à l'utilisateur ${userId}`)
    
    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileCompleted: true,
        createdAt: true,
        resetToken: true,
        resetTokenExpiry: true
      }
    })

    if (!user) {
      throw createError.notFound("Utilisateur non trouvé")
    }
    
    // Vérifier si l'utilisateur a déjà un token valide
    const hasValidToken = user.resetToken && 
                         user.resetTokenExpiry && 
                         new Date(user.resetTokenExpiry) > new Date()
    
    if (hasValidToken) {
      console.log(`⚠️ Token valide existant pour ${user.email}, régénération...`)
    }

    // Générer un nouveau token d'invitation sécurisé
    const inviteToken = crypto.randomBytes(32).toString('hex')
    const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours pour invitation

    console.log(`🔐 Token d'invitation généré pour ${user.email} (expire: ${inviteTokenExpiry.toISOString()})`)

    // Sauvegarder le token dans la base de données
    await prisma.user.update({
      where: { id: userId },
      data: {
        resetToken: inviteToken,
        resetTokenExpiry: inviteTokenExpiry
      }
    })

    // Construire le lien d'invitation
    const inviteLink = `${process.env.NEXTAUTH_URL}/reset-password/${inviteToken}`
    
    // Déterminer le type d'invitation selon le statut de l'utilisateur
    const isNewUser = !user.profileCompleted
    const invitationType = isNewUser ? 'welcome' : 'reinvite'
    
    console.log(`📧 Envoi invitation ${invitationType} à ${user.email}`)

    // Envoyer l'email d'invitation approprié
    let emailSent = false
    let emailType = ''
    
    try {
      if (isNewUser) {
        // Nouvel utilisateur - email de bienvenue avec lien d'activation
        await EmailService.sendWelcomeEmail(
          user.email,
          user.name || 'Utilisateur',
          user.role
        )
        emailType = 'welcome'
      } else {
        // Utilisateur existant - réinvitation
        await EmailService.sendPasswordResetEmail(
          user.email,
          user.name || 'Utilisateur',
          inviteLink
        )
        emailType = 'reinvite'
      }
      
      emailSent = true
      console.log(`📧 Email ${emailType} envoyé avec succès à ${user.email}`)
      
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
      
      throw createError.internal("Erreur lors de l'envoi de l'email d'invitation")
    }
    
    // Calculer la durée depuis la création du compte
    const accountAge = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    // Log d'audit détaillé pour traçabilité
    try {
      await prisma.adminLog.create({
        data: {
          adminId: session.user.id,
          action: 'SEND_USER_INVITATION',
          entityType: 'User',
          entityId: userId,
          details: JSON.stringify({
            targetUserEmail: user.email,
            targetUserRole: user.role,
            invitationType,
            emailType,
            isNewUser,
            profileCompleted: user.profileCompleted,
            accountAgeInDays: accountAge,
            inviteTokenExpiry: inviteTokenExpiry.toISOString(),
            emailSent,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('⚠️ Erreur log admin (non critique):', logError)
    }
    
    console.log(`✅ Invitation envoyée avec succès à ${user.email}`)
    
    return NextResponse.json({ 
      success: true,
      message: "Invitation envoyée avec succès",
      invitation: {
        type: invitationType,
        emailType,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },