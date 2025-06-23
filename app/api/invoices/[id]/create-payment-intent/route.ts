// app/api/invoices/[id]/create-payment-intent/route.ts
import { NextRequest, NextResponse } from "next/server"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { stripe, STRIPE_CONFIG } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export const POST = apiAuthMiddleware(async (req: NextRequest, session, context) => {
  try {
    const invoiceId = context.params.id
    
    // Vérifier que la facture existe et appartient à l'utilisateur
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId: session.user.id,
        status: { in: ['PENDING', 'OVERDUE'] } // Seulement les factures non payées
      },
      include: {
        order: {
          select: {
            id: true
          }
        },
        user: true
      }
    })
    
    if (!invoice) {
      return new NextResponse("Facture non trouvée ou déjà payée", { status: 404 })
    }
    
    const amount = Math.round(invoice.amount * 100) // Convertir en centimes
    
    if (amount < 50) { // Minimum 0.50 CHF en centimes
      return new NextResponse("Montant minimum 0.50 CHF", { status: 400 })
    }
    
    // Créer le PaymentIntent Stripe
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
        type: 'invoice_payment'
      },
      description: `Paiement facture #${invoice.id.substring(0, 8)} - Commande #${invoice.orderId.substring(0, 8)}`,
      receipt_email: session.user.email || undefined,
      setup_future_usage: undefined,
    })
    
    // Optionnel: Sauvegarder l'intent ID dans les métadonnées de la commande associée
    // (puisque Invoice n'a pas de champ metadata)
    try {
      await prisma.order.update({
        where: { id: invoice.orderId },
        data: {
          metadata: JSON.stringify({
            stripePaymentIntentId: paymentIntent.id,
            invoicePayment: true,
            invoiceId: invoice.id,
            createdAt: new Date().toISOString()
          })
        }
      })
    } catch (metadataError) {
      // Ne pas faire échouer la création du PaymentIntent si les métadonnées échouent
      console.warn("Impossible de sauvegarder les métadonnées:", metadataError)
    }
    
    console.log(`PaymentIntent créé pour facture: ${paymentIntent.id} pour facture ${invoice.id}`)
    
    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    })
    
  } catch (error) {
    console.error("Erreur lors de la création du PaymentIntent pour facture:", error)
    
    if (error instanceof Error) {
      if (error.message.includes('stripe')) {
        return new NextResponse(`Erreur Stripe: ${error.message}`, { status: 400 })
      }
    }
    
    return new NextResponse("Erreur lors de la création du paiement", { status: 500 })
  }
}, ["CLIENT"])