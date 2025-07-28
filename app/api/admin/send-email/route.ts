// app/api/admin/send-email/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import resend from "@/lib/resend"
import { z } from "zod"
import { createError } from "@/lib/error-handler"

// Schéma de validation strict
const emailSchema = z.object({
  to: z.string().email('Format email invalide').max(255, 'Email trop long'),
  toName: z.string().min(1, 'Nom destinataire requis').max(100, 'Nom trop long'),
  subject: z.string().min(1, 'Sujet requis').max(200, 'Sujet trop long'),
  message: z.string().min(1, 'Message requis').max(5000, 'Message trop long'),
  type: z.enum(['client', 'producer'], {
    errorMap: () => ({ message: 'Type doit être client ou producer' })
  })
}).strict()

export const POST = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Validation stricte des données d'entrée
    const rawData = await request.json()
    const { to, toName, subject, message, type } = validateData(emailSchema, rawData)

    console.log(`📧 Admin ${session.user.id} envoie un email à ${to}`)

    // Vérification supplémentaire : l'email existe-t-il dans notre système ?
    const targetUser = await prisma.user.findUnique({
      where: { email: to },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true 
      }
    })

    if (!targetUser) {
      throw createError.notFound("Destinataire non trouvé dans le système")
    }

    // Vérification cohérence type vs rôle utilisateur
    if (type === 'producer' && targetUser.role !== 'PRODUCER') {
      throw createError.validation("Type 'producer' spécifié mais l'utilisateur n'est pas producteur")
    }
    if (type === 'client' && targetUser.role !== 'CLIENT') {
      throw createError.validation("Type 'client' spécifié mais l'utilisateur n'est pas client")
    }

    // Construction sécurisée du template HTML (échapper le contenu)
    const escapedMessage = message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\n/g, '<br>')

    const escapedToName = toName
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #FF5A5F; margin-bottom: 10px;">Mushroom Marketplace</h1>
          <p style="color: #666; font-size: 14px;">Message de l'équipe administrative</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #333; margin-top: 0;">Bonjour ${escapedToName},</h2>
          <div style="color: #555; line-height: 1.6;">
            ${escapedMessage}
          </div>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Cordialement,</p>
          <p style="margin-bottom: 0;">
            L'équipe Mushroom Marketplace<br>
            <a href="mailto:admin@mushroom-marketplace.com" style="color: #FF5A5F;">admin@mushroom-marketplace.com</a>
          </p>
        </div>
      </div>
    `

    // Envoyer l'email via Resend avec gestion d'erreur
    let emailResult
    try {
      emailResult = await resend.emails.send({
        from: 'Mushroom Marketplace <admin@resend.dev>',
        to: to,
        subject: subject,
        html: htmlContent,
        headers: {
          'X-Entity-Ref-ID': `admin_email_${Date.now()}_${session.user.id}`,
        },
        tags: [
          {
            name: 'type',
            value: 'admin_contact'
          },
          {
            name: 'recipient_type',
            value: type
          },
          {
            name: 'admin_id',
            value: session.user.id
          }
        ]
      })
    } catch (emailError) {
      console.error("❌ Erreur Resend:", emailError)
      throw createError.internal("Échec de l'envoi de l'email")
    }

    // Log d'audit détaillé et sécurisé
    try {
      await prisma.adminLog.create({
        data: {
          action: 'SEND_EMAIL',
          entityType: 'EMAIL',
          entityId: targetUser.id,
          adminId: session.user.id,
          details: JSON.stringify({
            to: to,
            toName: toName,
            subject: subject,
            type: type,
            recipientRole: targetUser.role,
            messageLength: message.length,
            emailId: emailResult?.data?.id || null,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error("⚠️ Erreur log admin (non critique):", logError)
    }

    console.log(`✅ Email envoyé avec succès à ${to} par admin ${session.user.id}`)

    return NextResponse.json({ 
      success: true, 
      message: "Email envoyé avec succès",
      emailId: emailResult?.data?.id || null
    })

  } catch (error) {
    console.error("❌ Erreur envoi email admin:", error)
    
    // En cas d'erreur, log pour investigation
    try {
      await prisma.adminLog.create({
        data: {
          action: 'SEND_EMAIL_FAILED',
          entityType: 'EMAIL',
          entityId: 'unknown',
          adminId: session.user.id,
          details: JSON.stringify({
            error: error instanceof Error ? error.message : 'Erreur inconnue',
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error("⚠️ Erreur log échec email:", logError)
    }

    // Le système withAdminSecurity gère automatiquement les erreurs
    throw error
  }
})