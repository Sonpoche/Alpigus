// app/api/invoices/[id]/create-payment-intent/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity } from "@/lib/api-security"
import { stripe, STRIPE_CONFIG } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schéma de validation pour les paramètres
const paramsSchema = z.object({
  id: z.string().cuid('ID de facture invalide')
})

export const POST = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID de facture depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const invoiceId = pathSegments[pathSegments.indexOf('invoices') + 1]
    
    const validatedParams = paramsSchema.parse({ id: invoiceId })
    
    // 2. Vérifier que la facture existe et appartient à l'utilisateur
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: validatedParams.id,
        userId: session.user.id,
        status: { in: ['PENDING', 'OVERDUE'] } // Seulement les factures non payées
      },
      include: {
        order: {
          select: {
            id: true,
            metadata: true
          }
        },
        user: true
      }
    })
    
    if (!invoice) {
      return NextResponse.json(
        { 
          error: 'Facture non trouvée ou déjà payée', 
          code: 'INVOICE_NOT_FOUND' 
        },
        { status: 404 }
      )
    }
    
    // 3. Validation du montant
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
    
    // 4. Vérifier qu'il n'y a pas déjà un PaymentIntent en cours
    const existingMetadata = invoice.order?.metadata ? JSON.parse(invoice.order.metadata) : {}
    if (existingMetadata.stripePaymentIntentId && existingMetadata.invoicePayment) {
      console.log(`PaymentIntent existant trouvé: ${existingMetadata.stripePaymentIntentId}`)
      
      // Vérifier le statut du PaymentIntent existant
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(existingMetadata.stripePaymentIntentId)
        if (existingIntent.status === 'requires_payment_method' || existingIntent.status === 'requires_confirmation') {
          // Réutiliser l'intent existant
          return NextResponse.json({
            client_secret: existingIntent.client_secret,
            payment_intent_id: existingIntent.id
          })
        }
      } catch (stripeError) {
        console.warn("PaymentIntent existant non trouvé ou invalide, création d'un nouveau")
      }
    }
    
    // 5. Créer le PaymentIntent Stripe avec métadonnées sécurisées
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: STRIPE_CONFIG.currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        invoiceId: invoice.id,
        orderId: invoice.orderId,
        userId: session.user.id,
        userEmail: session.user.email || '',
        invoiceAmount: (amount / 100).toString(),
        type: 'invoice_payment',
        environment: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString()
      },
      description: `Paiement facture #${invoice.id.substring(0, 8)} - Commande #${invoice.orderId.substring(0, 8)}`,
      receipt_email: session.user.email || undefined,
      setup_future_usage: undefined,
    })
    
    // 6. Sauvegarder l'intent ID dans les métadonnées de la commande
    try {
      const updatedMetadata = {
        ...existingMetadata,
        stripePaymentIntentId: paymentIntent.id,
        invoicePayment: true,
        invoiceId: invoice.id,
        paymentCreatedAt: new Date().toISOString(),
        userAgent: request.headers.get('user-agent')?.substring(0, 255) || 'unknown'
      }
      
      await prisma.order.update({
        where: { id: invoice.orderId },
        data: {
          metadata: JSON.stringify(updatedMetadata)
        }
      })
    } catch (metadataError) {
      // Ne pas faire échouer la création du PaymentIntent si les métadonnées échouent
      console.warn("Impossible de sauvegarder les métadonnées:", metadataError)
    }
    
    // 7. Log sécurisé pour audit
    console.log(`✅ PaymentIntent créé pour facture: ${paymentIntent.id} pour facture ${invoice.id} (user: ${session.user.id})`)
    
    // 8. Réponse sécurisée
    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: amount / 100, // Retourner en francs pour l'affichage
      currency: STRIPE_CONFIG.currency
    })
    
  } catch (error) {
    console.error("❌ Erreur lors de la création du PaymentIntent pour facture:", error)
    
    // Gestion d'erreur avec validation Zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          code: 'VALIDATION_ERROR',
          details: error.errors
        },
        { status: 400 }
      )
    }
    
    // Gestion d'erreur Stripe
    if (error instanceof Error) {
      if (error.message.includes('stripe') || error.message.includes('Stripe')) {
        return NextResponse.json(
          { 
            error: `Erreur de paiement: ${error.message}`, 
            code: 'STRIPE_ERROR' 
          },
          { status: 400 }
        )
      }
    }
    
    // Erreur générique
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
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT'],
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 10,    // 10 tentatives max
    window: 60       // par minute
  }
})