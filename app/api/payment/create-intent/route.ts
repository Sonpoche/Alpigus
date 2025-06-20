// app/api/payment/create-intent/route.ts
import { NextRequest, NextResponse } from "next/server"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { stripe, STRIPE_CONFIG } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export const POST = apiAuthMiddleware(async (req: NextRequest, session) => {
  try {
    const { amount, orderId } = await req.json()
    
    // Validation
    if (!amount || !orderId) {
      return new NextResponse("Montant et ID de commande requis", { status: 400 })
    }
    
    if (amount < 50) { // Minimum 0.50 CHF en centimes
      return new NextResponse("Montant minimum 0.50 CHF", { status: 400 })
    }
    
    // Vérifier que la commande existe et appartient à l'utilisateur
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
        status: 'DRAFT' // Seulement les commandes en brouillon
      },
      include: {
        user: true
      }
    })
    
    if (!order) {
      return new NextResponse("Commande non trouvée ou déjà traitée", { status: 404 })
    }
    
    // Créer le PaymentIntent Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Déjà en centimes
      currency: STRIPE_CONFIG.currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: order.id,
        userId: session.user.id,
        userEmail: session.user.email || '',
        orderTotal: (amount / 100).toString() // Pour référence
      },
      description: `Commande Mushroom Marketplace #${order.id.substring(0, 8)}`,
      receipt_email: session.user.email || undefined,
      setup_future_usage: undefined, // Pas de sauvegarde de carte pour l'instant
    })
    
    // Optionnel: Sauvegarder l'intent ID dans la commande pour suivi
    await prisma.order.update({
      where: { id: order.id },
      data: {
        metadata: JSON.stringify({
          ...JSON.parse(order.metadata || '{}'),
          stripePaymentIntentId: paymentIntent.id,
          paymentMethod: 'card'
        })
      }
    })
    
    console.log(`PaymentIntent créé: ${paymentIntent.id} pour commande ${order.id}`)
    
    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    })
    
  } catch (error) {
    console.error("Erreur lors de la création du PaymentIntent:", error)
    
    if (error instanceof Error) {
      // Erreurs Stripe spécifiques
      if (error.message.includes('stripe')) {
        return new NextResponse(`Erreur Stripe: ${error.message}`, { status: 400 })
      }
    }
    
    return new NextResponse("Erreur lors de la création du paiement", { status: 500 })
  }
}, ["CLIENT"])