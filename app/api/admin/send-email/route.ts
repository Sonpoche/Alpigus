// app/api/admin/send-email/route.ts

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import  resend  from "@/lib/resend"

interface EmailRequest {
  to: string
  toName: string
  subject: string
  message: string
  type: 'client' | 'producer'
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    const { to, toName, subject, message, type }: EmailRequest = await req.json()

    // Validation des données
    if (!to || !toName || !subject || !message) {
      return new NextResponse("Données manquantes", { status: 400 })
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return new NextResponse("Format d'email invalide", { status: 400 })
    }

    // Construction du template HTML
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #FF5A5F; margin-bottom: 10px;">Mushroom Marketplace</h1>
          <p style="color: #666; font-size: 14px;">Message de l'équipe administrative</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #333; margin-top: 0;">Bonjour ${toName},</h2>
          <div style="color: #555; line-height: 1.6; white-space: pre-line;">
            ${message}
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

    // Envoyer l'email via Resend
    await resend.emails.send({
      from: 'Mushroom Marketplace <admin@resend.dev>', // Utilisez votre domaine configuré
      to: to,
      subject: subject,
      html: htmlContent,
      headers: {
        'X-Entity-Ref-ID': `admin_email_${new Date().getTime()}_${to}`,
      },
      tags: [
        {
          name: 'type',
          value: 'admin_contact'
        },
        {
          name: 'recipient_type',
          value: type
        }
      ]
    })

    // Enregistrer cette action dans les logs d'administration
    await prisma.adminLog.create({
      data: {
        action: 'SEND_EMAIL',
        entityType: 'EMAIL',
        entityId: to,
        adminId: session.user.id,
        details: JSON.stringify({
          to: to,
          toName: toName,
          subject: subject,
          type: type,
          timestamp: new Date().toISOString()
        })
      }
    })

    console.log(`Email admin envoyé avec succès à ${to}`)

    return NextResponse.json({ 
      success: true, 
      message: "Email envoyé avec succès" 
    })

  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email admin:", error)
    return new NextResponse(
      "Erreur lors de l'envoi de l'email", 
      { status: 500 }
    )
  }
}