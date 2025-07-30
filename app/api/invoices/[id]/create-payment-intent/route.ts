// app/api/invoices/[id]/create-payment-intent/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withClientSecurity } from "@/lib/api-security"
import { stripe, STRIPE_CONFIG } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schéma de validation pour les paramètres d'URL
const paramsSchema = z.object({
  id: z.string().cuid('ID de facture invalide')
})

export const POST = withClientSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation sécurisée de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const invoiceId = pathSegments[pathSegments.indexOf('invoices') + 1]
    
    const { id } = paramsSchema.parse({ id: invoiceId })
    
    console.log(`💳 Création PaymentIntent pour facture ${id} par user ${session.user.id}`)
    
    // 2. Récupération sécurisée de la facture avec vérification d'ownership
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId: session.user.id, // SÉCURITÉ CRITIQUE: Vérifier ownership
        status: { in: ['PENDING', 'OVERDUE'] } // Seulement les factures non payées
      },
      include: {
        order: {
          select: {
            id: true,
            metadata: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })
    
    if (!invoice) {
      console.warn(`⚠️ Tentative création PaymentIntent non autorisée pour facture ${id} par user ${session.user.id}`)
      return NextResponse.json(
        { 
          error: 'Facture non trouvée, non autorisée ou déjà payée', 
          code: 'INVOICE_NOT_FOUND' 
        },
        { status: 404 }
      )
    }
    
    // 3. Validation stricte du montant (protection anti-fraude)
    const amount = Math.round(invoice.amount * 100) // Convertir en centimes
    
    if (amount < 50) { // Minimum 0.50 CHF en centimes
      return NextResponse.json(
        { 
          error: 'Montant minimum 0.50 CHF', 
          code: 'AMOUNT_TOO_LOW' 
        },
        { status: 400 }
      )
    }
    
    if (amount > 99999999) { // Maximum ~1M CHF (protection)
      return NextResponse.json(
        { 
          error: 'Montant trop élevé', 
          code: 'AMOUNT_TOO_HIGH' 
        },
        { status: 400 }
      )
    }
    
    console.log(`💰 Validation montant: ${amount / 100} CHF (${amount} centimes)`)
    
    // 4. Vérification d'un PaymentIntent existant (éviter les doublons)
    const existingMetadata = invoice.order?.metadata ? JSON.parse(invoice.order.metadata) : {}
    if (existingMetadata.stripePaymentIntentId && existingMetadata.invoicePayment) {
      console.log(`🔄 PaymentIntent existant trouvé: ${existingMetadata.stripePaymentIntentId}`)
      
      // Vérifier le statut du PaymentIntent existant
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(existingMetadata.stripePaymentIntentId)
        
        // Si l'intent est encore utilisable, le réutiliser
        if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingIntent.status)) {
          console.log(`♻️ Réutilisation PaymentIntent existant: ${existingIntent.id}`)
          return NextResponse.json({
            client_secret: existingIntent.client_secret,
            payment_intent_id: existingIntent.id,
            amount: amount / 100,
            currency: STRIPE_CONFIG.currency
          })
        }
      } catch (stripeError) {
        console.warn("⚠️ PaymentIntent existant non trouvé ou invalide, création d'un nouveau")
      }
    }
    
    // 5. Création sécurisée du PaymentIntent avec métadonnées complètes
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: STRIPE_CONFIG.currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        // Métadonnées critiques pour la sécurité
        invoiceId: invoice.id,
        orderId: invoice.orderId,
        userId: session.user.id,
        userEmail: session.user.email || '',
        invoiceAmount: (amount / 100).toString(),
        type: 'invoice_payment',
        environment: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString(),
        // Informations de sécurité additionnelles
        userAgent: request.headers.get('user-agent')?.substring(0, 255) || 'unknown',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   request.headers.get('x-real-ip') || 'unknown'
      },
      description: `Paiement facture #${invoice.id.substring(0, 8)} - Commande #${invoice.orderId.substring(0, 8)}`,
      receipt_email: session.user.email || undefined,
      setup_future_usage: undefined, // Pas de sauvegarde des moyens de paiement
    })
    
    console.log(`✅ PaymentIntent créé: ${paymentIntent.id} pour facture ${invoice.id}`)
    
    // 6. Sauvegarde sécurisée de l'intent ID dans les métadonnées de la commande
    try {
      const updatedMetadata = {
        ...existingMetadata,
        stripePaymentIntentId: paymentIntent.id,
        invoicePayment: true,
        invoiceId: invoice.id,
        paymentCreatedAt: new Date().toISOString(),
        paymentCreatedBy: session.user.id,
        // Informations de sécurité pour audit
        userAgent: request.headers.get('user-agent')?.substring(0, 255) || 'unknown',
        clientIP: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                  request.headers.get('x-real-ip') || 'unknown'
      }
      
      await prisma.order.update({
        where: { id: invoice.orderId },
        data: {
          metadata: JSON.stringify(updatedMetadata)
        }
      })
      
      console.log(`💾 Métadonnées PaymentIntent sauvegardées pour commande ${invoice.orderId}`)
      
    } catch (metadataError) {
      // Ne pas faire échouer la création du PaymentIntent si les métadonnées échouent
      console.warn("⚠️ Impossible de sauvegarder les métadonnées PaymentIntent:", metadataError)
    }
    
    // 7. Log d'audit sécurisé pour traçabilité
    console.log(`🎯 PaymentIntent créé avec succès:`, {
      paymentIntentId: paymentIntent.id,
      invoiceId: invoice.id,
      userId: session.user.id,
      amount: amount / 100,
      currency: STRIPE_CONFIG.currency,
      timestamp: new Date().toISOString()
    })
    
    // 8. Réponse sécurisée (ne pas exposer d'informations sensibles)
    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: amount / 100, // Retourner en francs pour l'affichage
      currency: STRIPE_CONFIG.currency,
      // Informations additionnelles sécurisées
      invoice: {
        id: invoice.id,
        number: `INV-${invoice.id.substring(0, 8).toUpperCase()}`,
        dueDate: invoice.dueDate
      }
    })
    
  } catch (error) {
    console.error("❌ Erreur création PaymentIntent pour facture:", error)
    
    // Gestion d'erreur avec validation Zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'ID de facture invalide', 
          code: 'VALIDATION_ERROR',
          details: error.errors
        },
        { status: 400 }
      )
    }
    
    // Gestion d'erreur Stripe spécifique
    if (error instanceof Error) {
      if (error.message.includes('stripe') || error.message.includes('Stripe')) {
        console.error("💥 Erreur Stripe critique:", error.message)
        return NextResponse.json(
          { 
            error: 'Erreur du système de paiement. Veuillez réessayer.', 
            code: 'STRIPE_ERROR' 
          },
          { status: 400 }
        )
      }
      
      // Erreur de base de données
      if (error.message.includes('Prisma') || error.message.includes('database')) {
        return NextResponse.json(
          { 
            error: 'Erreur de base de données', 
            code: 'DATABASE_ERROR' 
          },
          { status: 500 }
        )
      }
    }
    
    // Erreur générique (ne pas exposer les détails en production)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la création du paiement', 
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error instanceof Error ? error.message : 'Erreur inconnue' 
        })
      },
      { status: 500 }
    )
  }
})