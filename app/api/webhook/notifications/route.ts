// app/api/webhook/notifications/route.ts - Version sécurisée (corrigée)
import { NextRequest, NextResponse } from "next/server"
import { withPublicSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { NotificationType } from "@/types/notification"
import { z } from "zod"
import { createError } from "@/lib/error-handler"
import crypto from 'crypto'

// Schéma de validation strict pour les webhooks
const webhookNotificationSchema = z.object({
  userId: z.string().cuid('ID utilisateur invalide'),
  type: z.nativeEnum(NotificationType, {
    errorMap: () => ({ message: 'Type de notification invalide' })
  }),
  title: z.string().min(1, 'Titre requis').max(200, 'Titre trop long'),
  message: z.string().min(1, 'Message requis').max(1000, 'Message trop long'),
  link: z.string().optional(),
  data: z.any().optional()
}).strict()

// Fonction de vérification de signature webhook
function verifyWebhookSignature(
  signature: string | null, 
  body: string, 
  secret: string
): boolean {
  if (!signature) return false
  
  try {
    // Générer la signature attendue
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')
    
    // Comparer de manière sécurisée (protection contre timing attacks)
    const providedSignature = signature.replace('sha256=', '')
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    )
  } catch (error) {
    console.error('❌ Erreur vérification signature webhook:', error)
    return false
  }
}

// Liste blanche des sources autorisées
const ALLOWED_WEBHOOK_SOURCES = [
  'payment-service',
  'notification-service', 
  'order-service',
  'admin-system',
  'internal' // Pour les appels internes
]

export const POST = withPublicSecurity(async (
  request: NextRequest
) => {
  try {
    let userId: string, type: any, title: string, message: string, link: string | undefined, data: any
    
    // Si WEBHOOK_SECRET n'est pas défini, utiliser un mode simplifié pour le développement
    const webhookSecret = process.env.WEBHOOK_SECRET
    
    if (webhookSecret) {
      // Mode production avec vérification complète
      console.log('🔒 Mode production: vérification signature webhook')
      
      const signature = request.headers.get('x-webhook-signature')
      const source = request.headers.get('x-webhook-source')
      const timestamp = request.headers.get('x-webhook-timestamp')
      
      // Vérifier la présence des headers requis
      if (!signature || !source || !timestamp) {
        throw createError.auth('Headers webhook manquants (signature, source, timestamp requis)')
      }
      
      // Vérifier que la source est autorisée
      if (!ALLOWED_WEBHOOK_SOURCES.includes(source)) {
        console.warn(`🚨 Tentative webhook source non autorisée: ${source}`)
        throw createError.auth('Source webhook non autorisée')
      }
      
      // Vérifier la fraîcheur du webhook (protection contre replay attacks)
      const webhookTimestamp = parseInt(timestamp)
      const currentTimestamp = Math.floor(Date.now() / 1000)
      const timestampDiff = Math.abs(currentTimestamp - webhookTimestamp)
      
      if (timestampDiff > 300) { // 5 minutes maximum
        throw createError.auth('Webhook expiré')
      }
      
      // Lire le body pour vérification signature
      const rawBody = await request.text()
      
      if (!verifyWebhookSignature(signature, rawBody, webhookSecret)) {
        console.warn(`🚨 Signature webhook invalide de ${source}`)
        throw createError.auth('Signature webhook invalide')
      }
      
      // Parser le JSON après vérification
      const parsedData = JSON.parse(rawBody)
      const validatedData = validateData(webhookNotificationSchema, parsedData)
      
      userId = validatedData.userId
      type = validatedData.type
      title = validatedData.title
      message = validatedData.message
      link = validatedData.link
      data = validatedData.data
      
      console.log(`📬 Webhook sécurisé reçu de ${source} pour utilisateur ${userId}`)
      
    } else {
      // Mode développement simplifié (pas de vérification de signature)
      console.warn('⚠️ Mode développement: WEBHOOK_SECRET non défini, sécurité réduite')
      
      const rawData = await request.json()
      const validatedData = validateData(webhookNotificationSchema, rawData)
      
      userId = validatedData.userId
      type = validatedData.type
      title = validatedData.title
      message = validatedData.message
      link = validatedData.link
      data = validatedData.data
      
      console.log(`📬 Webhook dev reçu pour utilisateur ${userId}`)
    }
    
    // Vérifier que l'utilisateur existe
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true }
    })
    
    if (!targetUser) {
      throw createError.notFound('Utilisateur cible non trouvé')
    }
    
    // Créer la notification de manière sécurisée
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title: title.trim(),
        message: message.trim(),
        link: link || null,
        data: data || null,
        read: false
      },
      select: {
        id: true,
        type: true,
        title: true,
        createdAt: true
      }
    })
    
    // Log d'audit pour traçabilité
    console.log(`✅ Notification créée via webhook:`, {
      notificationId: notification.id,
      userId,
      type,
      timestamp: new Date().toISOString()
    })
    
    // Réponse sécurisée (ne pas exposer trop d'informations)
    return NextResponse.json({
      success: true,
      notificationId: notification.id,
      message: 'Notification créée avec succès'
    })
    
  } catch (error) {
    // Log détaillé pour debugging (sans exposer de données sensibles)
    console.error('❌ Erreur webhook notification:', {
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      timestamp: new Date().toISOString()
    })
    
    // Le système withPublicSecurity gère automatiquement les erreurs
    throw error
  }
})

// Route de vérification de santé pour les webhooks
export const GET = withPublicSecurity(async (request: NextRequest) => {
  return NextResponse.json({
    status: 'healthy',
    service: 'webhook-notifications',
    timestamp: new Date().toISOString()
  })
})