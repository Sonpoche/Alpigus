// lib/api-security.ts (Version adaptée pour NextAuth)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { z } from 'zod'
import { env } from './env-validation'

// Types pour la sécurité
interface SecurityConfig {
  requireAuth?: boolean
  allowedRoles?: string[]
  allowedMethods?: string[]
  rateLimit?: {
    requests: number
    window: number // en secondes
  }
  cors?: {
    origins?: string[]
    methods?: string[]
    headers?: string[]
  }
}

// Interface pour la session NextAuth
interface AuthSession {
  user: {
    id: string
    email?: string | null
    role?: string | null
    name?: string | null
  }
  expires: string
}

// Store pour le rate limiting (en production, utilisez Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Fonction de rate limiting
function checkRateLimit(clientId: string, config: SecurityConfig['rateLimit']) {
  if (!config) return true

  const now = Date.now()
  const key = clientId
  const existing = rateLimitStore.get(key)

  if (!existing || now > existing.resetTime) {
    // Nouvelle fenêtre ou première requête
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + (config.window * 1000)
    })
    return true
  }

  if (existing.count >= config.requests) {
    return false
  }

  existing.count++
  rateLimitStore.set(key, existing)
  return true
}

// Fonction pour obtenir l'IP du client
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (real) {
    return real
  }
  
  return request.ip || 'unknown'
}

// Headers de sécurité
function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  }
}

// Interface pour le handler avec session
type AuthenticatedHandler = (
  request: NextRequest,
  session: AuthSession
) => Promise<NextResponse> | NextResponse

// Interface pour le handler public (sans session)
type PublicHandler = (
  request: NextRequest
) => Promise<NextResponse> | NextResponse

// Fonction principale de sécurité adaptée pour NextAuth
export function withAuthSecurity(
  handler: AuthenticatedHandler,
  config: SecurityConfig = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Vérifier la méthode HTTP
      if (config.allowedMethods && !config.allowedMethods.includes(request.method)) {
        return NextResponse.json(
          { error: 'Méthode non autorisée', code: 'METHOD_NOT_ALLOWED' },
          { status: 405 }
        )
      }

      // 2. Rate limiting
      if (config.rateLimit) {
        const clientIP = getClientIP(request)
        const rateLimitKey = `${clientIP}-${request.nextUrl.pathname}`
        
        if (!checkRateLimit(rateLimitKey, config.rateLimit)) {
          return NextResponse.json(
            { 
              error: 'Trop de requêtes', 
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: config.rateLimit.window 
            },
            { 
              status: 429,
              headers: {
                'Retry-After': config.rateLimit.window.toString(),
                ...getSecurityHeaders()
              }
            }
          )
        }
      }

      // 3. Authentification avec NextAuth
      let session: AuthSession | null = null
      if (config.requireAuth !== false) { // Par défaut, l'auth est requise
        const nextAuthSession = await getServerSession(authOptions)
        
        if (!nextAuthSession) {
          return NextResponse.json(
            { error: 'Non authentifié', code: 'AUTH_ERROR' },
            { status: 401, headers: getSecurityHeaders() }
          )
        }

        // Convertir la session NextAuth vers notre format
        session = {
          user: {
            id: nextAuthSession.user.id,
            email: nextAuthSession.user.email,
            role: nextAuthSession.user.role,
            name: nextAuthSession.user.name
          },
          expires: nextAuthSession.expires
        }

        // 4. Vérification des rôles
        if (config.allowedRoles && session.user.role && !config.allowedRoles.includes(session.user.role)) {
          return NextResponse.json(
            { error: 'Rôle non autorisé', code: 'FORBIDDEN_ERROR' },
            { status: 403, headers: getSecurityHeaders() }
          )
        }
        
        // Vérifier que l'utilisateur a un rôle si des rôles sont requis
        if (config.allowedRoles && !session.user.role) {
          return NextResponse.json(
            { error: 'Rôle utilisateur manquant', code: 'FORBIDDEN_ERROR' },
            { status: 403, headers: getSecurityHeaders() }
          )
        }
      }

      // 5. Exécuter le handler (seulement si la session existe pour les routes authentifiées)
      if (config.requireAuth !== false && !session) {
        return NextResponse.json(
          { error: 'Session manquante', code: 'AUTH_ERROR' },
          { status: 401, headers: getSecurityHeaders() }
        )
      }

      const response = await handler(request, session as AuthSession)

      // 6. Ajouter les headers de sécurité
      const securityHeaders = getSecurityHeaders()
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      return response

    } catch (error) {
      console.error('Erreur dans withAuthSecurity:', error)
      
      return NextResponse.json(
        { 
          error: 'Erreur interne du serveur', 
          code: 'INTERNAL_SERVER_ERROR',
          ...(env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Erreur inconnue' })
        },
        { 
          status: 500,
          headers: getSecurityHeaders()
        }
      )
    }
  }
}

// Middleware pour les APIs publiques (sans auth)
export function withPublicSecurity(
  handler: PublicHandler,
  config: Omit<SecurityConfig, 'requireAuth' | 'allowedRoles'> = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Appliquer la sécurité sans authentification
      const securityMiddleware = withAuthSecurity(
        (req, session) => handler(req), // Ignorer la session pour les routes publiques
        { ...config, requireAuth: false }
      )
      
      return await securityMiddleware(request)
    } catch (error) {
      console.error('Erreur dans withPublicSecurity:', error)
      return NextResponse.json(
        { error: 'Erreur interne du serveur', code: 'INTERNAL_SERVER_ERROR' },
        { status: 500, headers: getSecurityHeaders() }
      )
    }
  }
}

// Middleware spécialisés
export function withClientSecurity(handler: AuthenticatedHandler) {
  return withAuthSecurity(handler, {
    requireAuth: true,
    allowedRoles: ['CLIENT'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    rateLimit: {
      requests: 100,
      window: 60 // 1 minute
    }
  })
}

export function withProducerSecurity(handler: AuthenticatedHandler) {
  return withAuthSecurity(handler, {
    requireAuth: true,
    allowedRoles: ['PRODUCER'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    rateLimit: {
      requests: 150,
      window: 60 // 1 minute
    }
  })
}

export function withAdminSecurity(handler: AuthenticatedHandler) {
  return withAuthSecurity(handler, {
    requireAuth: true,
    allowedRoles: ['ADMIN'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    rateLimit: {
      requests: 200,
      window: 60 // 1 minute
    }
  })
}

// Schémas de validation communs
export const commonSchemas = {
  id: z.string().cuid('ID invalide'),
  email: z.string().email('Email invalide'),
  phone: z.string().min(10, 'Numéro de téléphone invalide'),
  pagination: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10)
  }),
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  })
}

// Fonction pour valider les données
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`)
    }
    throw error
  }
}