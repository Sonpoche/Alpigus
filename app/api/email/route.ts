// app/api/email/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData } from "@/lib/api-security"
import { createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import resend from '@/lib/resend'
import { z } from "zod"

// Schéma de validation pour l'envoi d'emails
const sendEmailSchema = z.object({
  to: z.array(z.string().email('Email invalide')).min(1, 'Au moins un destinataire requis').max(10, 'Maximum 10 destinataires'),
  subject: z.string().min(1, 'Sujet requis').max(200, 'Sujet trop long'),
  html: z.string().min(1, 'Contenu HTML requis').max(50000, 'Contenu trop long'),
  text: z.string().max(10000, 'Texte trop long').optional(),
  from: z.string().email('Email expéditeur invalide').optional(),
  replyTo: z.string().email('Email de réponse invalide').optional(),
  type: z.enum(['test', 'notification', 'marketing', 'system'])
}).strict()

// Types d'emails autorisés selon le rôle
const EMAIL_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['test', 'notification', 'marketing', 'system'],
  PRODUCER: ['notification'],
  CLIENT: [] // Les clients ne peuvent pas envoyer d'emails directement
}

export const POST = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    console.log(`Utilisateur ${session.user.id} (${session.user.role}) tente d'envoyer un email`)
    
    // Validation des données d'entrée
    const rawData = await request.json()
    // Appliquer la valeur par défaut avant validation
    const dataWithDefaults = {
      ...rawData,
      type: rawData.type || 'test'
    }
    const { to, subject, html, text, from, replyTo, type } = validateData(sendEmailSchema, dataWithDefaults)
    
    // Vérification des permissions selon le rôle
    const allowedTypes = EMAIL_PERMISSIONS[session.user.role || 'CLIENT'] || []
    
    if (!allowedTypes.includes(type)) {
      throw createError.forbidden(`Votre rôle ne permet pas d'envoyer des emails de type '${type}'`)
    }
    
    // Limitations spécifiques selon le rôle
    if (session.user.role === 'PRODUCER') {
      // Les producteurs ne peuvent envoyer que des notifications à leurs clients
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id },
        include: {
          // Récupérer les emails des clients qui ont commandé chez ce producteur
          products: {
            include: {
              orderItems: {
                include: {
                  order: {
                    include: {
                      user: {
                        select: {
                          email: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      })
      
      if (!producer) {
        throw createError.notFound("Profil producteur non trouvé")
      }
      
      // Extraire les emails des clients autorisés
      const authorizedEmails = new Set(
        producer.products.flatMap(product => 
          product.orderItems.map(item => item.order.user.email)
        )
      )
      
      // Vérifier que tous les destinataires sont autorisés
      const unauthorizedEmails = to.filter(email => !authorizedEmails.has(email))
      if (unauthorizedEmails.length > 0) {
        throw createError.forbidden(
          `Vous ne pouvez envoyer d'emails qu'à vos clients. Emails non autorisés: ${unauthorizedEmails.join(', ')}`
        )
      }
    }
    
    // Configuration de l'expéditeur selon le rôle et le type
    let emailFrom = from
    if (!emailFrom) {
      switch (type) {
        case 'test':
          emailFrom = 'Test <test@alpigus.com>'
          break
        case 'notification':
          emailFrom = 'Alpigus Notifications <notifications@alpigus.com>'
          break
        case 'marketing':
          emailFrom = 'Alpigus Marketing <marketing@alpigus.com>'
          break
        case 'system':
          emailFrom = 'Alpigus System <system@alpigus.com>'
          break
        default:
          emailFrom = 'Alpigus <noreply@alpigus.com>'
      }
    }
    
    // Validation finale pour les emails de test (uniquement en développement)
    if (type === 'test' && process.env.NODE_ENV === 'production') {
      // En production, limiter les emails de test aux adresses autorisées
      const testEmails = process.env.TEST_EMAIL_ADDRESSES?.split(',') || []
      const unauthorizedTestEmails = to.filter(email => !testEmails.includes(email))
      
      if (unauthorizedTestEmails.length > 0) {
        throw createError.forbidden(
          'En production, les emails de test ne peuvent être envoyés qu\'aux adresses autorisées'
        )
      }
    }
    
    // Préparer les données d'email avec sécurité
    const emailData = {
      from: emailFrom,
      to,
      subject: `[${type.toUpperCase()}] ${subject}`,
      html,
      ...(text && { text }),
      ...(replyTo && { replyTo })
    }
    
    console.log(`Envoi email ${type} à ${to.length} destinataire(s)`)
    
    // Envoyer l'email via Resend
    const result = await resend.emails.send(emailData)
    
    // Log d'audit pour l'envoi d'email
    try {
      await prisma.adminLog.create({
        data: {
          action: 'SEND_EMAIL',
          entityType: 'Email',
          entityId: result.data?.id || 'unknown',
          adminId: session.user.id,
          details: JSON.stringify({
            type,
            to: to.length > 1 ? `${to.length} destinataires` : to[0],
            subject,
            emailId: result.data?.id,
            success: !!result.data,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('Erreur log admin (non critique):', logError)
    }
    
    console.log(`Email envoyé avec succès: ${result.data?.id}`)
    
    return NextResponse.json({
      success: true,
      emailId: result.data?.id,
      message: `Email ${type} envoyé à ${to.length} destinataire(s)`,
      to: to.length > 3 ? `${to.length} destinataires` : to,
      type
    })
    
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error)
    
    // Log des erreurs d'envoi pour debug
    try {
      await prisma.adminLog.create({
        data: {
          action: 'SEND_EMAIL_ERROR',
          entityType: 'Email',
          entityId: 'error',
          adminId: session.user.id,
          details: JSON.stringify({
            error: error instanceof Error ? error.message : 'Erreur inconnue',
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('Erreur log admin:', logError)
    }
    
    throw error
  }
}, {
  requireAuth: true,
  allowedRoles: ['ADMIN', 'PRODUCER'], // Les clients ne peuvent pas envoyer d'emails directement
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 10, // Limité car l'envoi d'emails coûte cher
    window: 60
  }
})

// Route GET pour tester la configuration email (admin seulement)
export const GET = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    console.log(`Admin ${session.user.id} teste la configuration email`)
    
    // Email de test simple
    const testData = {
      from: 'Alpigus Test <test@alpigus.com>',
      to: [session.user.email || 'test@example.com'],
      subject: 'Test de configuration email',
      html: `
        <h2>Test de configuration email</h2>
        <p>Cet email confirme que la configuration Resend fonctionne correctement.</p>
        <p><strong>Utilisateur:</strong> ${session.user.name || session.user.email}</p>
        <p><strong>Rôle:</strong> ${session.user.role}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
        <hr>
        <p><small>Email automatique - Ne pas répondre</small></p>
      `
    }
    
    const result = await resend.emails.send(testData)
    
    console.log(`Email de test envoyé: ${result.data?.id}`)
    
    return NextResponse.json({
      success: true,
      emailId: result.data?.id,
      message: 'Email de test envoyé avec succès',
      configuration: {
        resendConfigured: !!process.env.RESEND_API_KEY,
        defaultFrom: testData.from,
        testEmail: testData.to[0]
      }
    })
    
  } catch (error) {
    console.error("Erreur lors du test email:", error)
    throw createError.internal("Erreur lors du test de configuration email")
  }
}, {
  requireAuth: true,
  allowedRoles: ['ADMIN'],
  allowedMethods: ['GET']
})