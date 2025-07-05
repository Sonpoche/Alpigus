// lib/env-validation.js
const { z } = require('zod')

// Schéma de validation des variables d'environnement
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requise"),
  
  // NextAuth
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL doit être une URL valide"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET doit faire au moins 32 caractères"),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY est requise"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY est requise"),
  
  // Email
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY est requise"),
  
  // Platform
  NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE: z.string().default("5"),
  
  // Optionnels
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
})

// Validation au démarrage
function validateEnv() {
  try {
    const env = envSchema.parse(process.env)
    console.log('✅ Variables d\'environnement validées avec succès')
    return env
  } catch (error) {
    console.error('❌ Erreur de validation des variables d\'environnement:')
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
    }
    process.exit(1)
  }
}

// Exporter les variables validées
const env = validateEnv()

module.exports = {
  env,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
}