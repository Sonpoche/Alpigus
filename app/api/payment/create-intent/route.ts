// app/api/payment/create-intent/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withClientSecurity } from "@/lib/api-security"
import { validateInput, paymentSchemas } from "@/lib/validation-schemas"
import { handleError, createError } from "@/lib/error-handler"
import { stripe, STRIPE_CONFIG } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export const POST = withClientSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Validation des données d'entrée avec Zod
    const rawData = await request.json()
    const { amount, orderId } = validateInput(paymentSchemas.createIntent, rawData)
    
    // 2. Validation métier supplémentaire
    // CORRECTION: Le montant est déjà en centimes depuis le frontend
    const amountInCents = Math.round(amount)
    const amountInFrancs = amount / 100
    
    if (amountInFrancs < 0.5) {
      throw createError.validation("Montant minimum 0.50 CHF")
    }
    
    if (amountInCents < 50) { // Minimum 0.50 CHF en centimes
      throw createError.validation("Montant minimum 0.50 CHF")
    }
    
    // 3. Vérification de l'existence et des droits sur la commande
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
        status: 'DRAFT' // Seulement les commandes en brouillon
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        items: {
          select: {
            id: true,
            quantity: true,
            price: true
          }
        }
      }
    })
    
    if (!order) {
      throw createError.notFound("Commande non trouvée ou déjà traitée")
    }
    
    // 4. Vérification de cohérence du montant
    const calculatedTotal = order.items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    )
    
    // Utiliser la variable déjà déclarée plus haut
    if (Math.abs(calculatedTotal - amountInFrancs) > 0.01) { // Tolérance de 1 centime
      throw createError.validation(
        `Montant incohérent. Attendu: ${calculatedTotal.toFixed(2)} CHF, reçu: ${amountInFrancs.toFixed(2)} CHF`
      )
    }
    
    console.log(`💰 Validation montant - DB: ${calculatedTotal} CHF, Reçu: ${amountInFrancs} CHF, Stripe: ${amountInCents} centimes`)
    
    // 5. Création du PaymentIntent Stripe avec métadonnées enrichies
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: STRIPE_CONFIG.currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: order.id,
        userId: session.user.id,
        userEmail: session.user.email || '',
        orderTotal: amountInFrancs.toString(), // En francs pour les métadonnées
        itemsCount: order.items.length.toString(),
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      },
      description: `Commande Mushroom Marketplace #${order.id.substring(0, 8)}`,
      receipt_email: session.user.email || undefined,
      setup_future_usage: undefined, // Pas de sauvegarde de carte
    })
    
    // 6. Sauvegarde sécurisée des métadonnées dans la commande
    try {
      const existingMetadata = order.metadata ? JSON.parse(order.metadata) : {}
      const updatedMetadata = {
        ...existingMetadata,
        stripePaymentIntentId: paymentIntent.id,
        paymentMethod: 'card',
        paymentCreatedAt: new Date().toISOString(),
        userAgent: request.headers.get('user-agent')?.substring(0, 255) || 'unknown'
      }
      
      await prisma.order.update({
        where: { id: order.id },
        data: {
          metadata: JSON.stringify(updatedMetadata)
        }
      })
    } catch (metadataError) {
      // Log l'erreur mais ne pas faire échouer la création du payment intent
      console.warn("Erreur lors de la sauvegarde des métadonnées:", metadataError)
    }
    
    // 7. Log sécurisé pour audit
    console.log(`✅ PaymentIntent créé: ${paymentIntent.id} pour commande ${order.id} (user: ${session.user.id})`)
    
    // 8. Réponse sécurisée (ne pas exposer d'infos sensibles)
    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: amountInFrancs, // Retourner en francs
      currency: STRIPE_CONFIG.currency
    })
    
  } catch (error) {
    // 9. Gestion d'erreur centralisée avec le système de sécurité
    console.error("❌ Erreur création PaymentIntent:", error)
    
    // Log supplémentaire pour les erreurs Stripe
    if (error instanceof Error && error.message.includes('stripe')) {
      console.error("Erreur Stripe détaillée:", {
        message: error.message,
        stack: error.stack
      })
    }
    
    return handleError(error, request.url)
  }
})