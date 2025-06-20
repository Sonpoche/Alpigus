// lib/stripe.ts
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
  typescript: true,
})

// Helper pour convertir les montants (CHF vers centimes)
export const toStripeAmount = (amount: number): number => {
  return Math.round(amount * 100) // CHF vers centimes
}

// Helper pour convertir depuis Stripe (centimes vers CHF)
export const fromStripeAmount = (amount: number): number => {
  return amount / 100 // centimes vers CHF
}

// Configuration pour la Suisse
export const STRIPE_CONFIG = {
  currency: 'chf',
  country: 'CH',
  payment_methods: ['card', 'sepa_debit'],
  locale: 'fr-CH'
} as const