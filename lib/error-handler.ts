// lib/error-handler.ts
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { env } from './env-validation'

// Types d'erreurs personnalisées
export class AppError extends Error {
  public statusCode: number
  public code: string
  public isOperational: boolean

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
    
    Error.captureStackTrace(this, this.constructor)
  }
}

// Erreurs spécifiques
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Non autorisé') {
    super(message, 401, 'AUTH_ERROR')
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Accès interdit') {
    super(message, 403, 'FORBIDDEN_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Ressource non trouvée') {
    super(message, 404, 'NOT_FOUND_ERROR')
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflit de données') {
    super(message, 409, 'CONFLICT_ERROR')
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Trop de requêtes') {
    super(message, 429, 'RATE_LIMIT_ERROR')
  }
}

// Interface pour les réponses d'erreur
interface ErrorResponse {
  error: string
  code: string
  statusCode: number
  timestamp: string
  path?: string
  details?: any
  stack?: string
}

// Fonction pour logger les erreurs
function logError(error: Error, context?: any) {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context,
    ...(error instanceof AppError && { 
      statusCode: error.statusCode,
      code: error.code,
      isOperational: error.isOperational
    })
  }
  
  console.error('🚨 Error:', JSON.stringify(errorLog, null, 2))
  
  // En production, vous pourriez envoyer à un service de monitoring
  if (env.NODE_ENV === 'production') {
    // Exemple: Sentry, LogRocket, etc.
    // sentry.captureException(error, { contexts: { custom: context } })
  }
}

// Gestionnaire principal d'erreurs
export function handleError(error: unknown, path?: string): NextResponse {
  let errorResponse: ErrorResponse
  let statusCode = 500
  
  // Identifier le type d'erreur
  if (error instanceof AppError) {
    // Erreur personnalisée de l'application
    errorResponse = {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
      path
    }
    statusCode = error.statusCode
    
    // Logger seulement les erreurs serveur
    if (error.statusCode >= 500) {
      logError(error, { path })
    }
    
  } else if (error instanceof ZodError) {
    // Erreur de validation Zod
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))
    
    errorResponse = {
      error: 'Erreur de validation',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      timestamp: new Date().toISOString(),
      path,
      details: validationErrors
    }
    statusCode = 400
    
  } else if (error instanceof PrismaClientKnownRequestError) {
    // Erreurs Prisma
    let message = 'Erreur de base de données'
    let code = 'DATABASE_ERROR'
    
    switch (error.code) {
      case 'P2002':
        message = 'Cette ressource existe déjà'
        code = 'DUPLICATE_ERROR'
        statusCode = 409
        break
      case 'P2025':
        message = 'Ressource non trouvée'
        code = 'NOT_FOUND_ERROR'
        statusCode = 404
        break
      case 'P2003':
        message = 'Contrainte de clé étrangère violée'
        code = 'FOREIGN_KEY_ERROR'
        statusCode = 400
        break
      default:
        statusCode = 500
    }
    
    errorResponse = {
      error: message,
      code,
      statusCode,
      timestamp: new Date().toISOString(),
      path,
      ...(env.NODE_ENV === 'development' && { 
        details: {
          prismaCode: error.code,
          meta: error.meta
        }
      })
    }
    
    logError(error, { path, prismaCode: error.code })
    
  } else if (error instanceof Error) {
    // Erreur JavaScript générique
    errorResponse = {
      error: env.NODE_ENV === 'development' ? error.message : 'Erreur interne du serveur',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path
    }
    
    logError(error, { path })
    
  } else {
    // Erreur inconnue
    errorResponse = {
      error: 'Erreur inconnue',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path
    }
    
    console.error('🚨 Unknown error:', error)
  }
  
  // Ajouter la stack trace en développement
  if (env.NODE_ENV === 'development' && error instanceof Error) {
    errorResponse.stack = error.stack
  }
  
  return NextResponse.json(errorResponse, { 
    status: statusCode,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

// Wrapper pour les routes API
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleError(error, 'API_ROUTE')
    }
  }
}

// Helper pour créer des erreurs rapidement
export const createError = {
  validation: (message: string) => new ValidationError(message),
  auth: (message?: string) => new AuthError(message),
  forbidden: (message?: string) => new ForbiddenError(message),
  notFound: (message?: string) => new NotFoundError(message),
  conflict: (message?: string) => new ConflictError(message),
  rateLimit: (message?: string) => new RateLimitError(message),
  internal: (message: string) => new AppError(message, 500, 'INTERNAL_ERROR')
}

// Exemple d'utilisation dans une route API
export function createApiHandler<T>(
  handler: (data: T) => Promise<any>,
  options?: {
    schema?: any
    requireAuth?: boolean
  }
) {
  return withErrorHandler(async (request: Request) => {
    let data: T
    
    // Validation des données
    if (options?.schema) {
      const rawData = await request.json()
      data = options.schema.parse(rawData)
    } else {
      data = await request.json()
    }
    
    // Authentification si requise
    if (options?.requireAuth) {
      // Logique d'authentification
      // throw new AuthError('Token manquant')
    }
    
    // Exécuter le handler
    const result = await handler(data)
    
    return NextResponse.json(result)
  })
}