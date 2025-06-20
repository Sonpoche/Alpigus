// middleware.ts - Version corrigée

import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Ignorer les routes statiques et API
  if (
    path.startsWith('/_next') || 
    path.includes('/favicon.ico') || 
    path.startsWith('/api/')
  ) {
    return NextResponse.next()
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  // Routes publiques (accessibles sans authentification)
  if (path === '/' || path === '/login' || path === '/register' || path.startsWith('/reset-password')) {
    if (token) {
      // ✅ CORRECTION : Ne pas rediriger les admins vers onboarding
      if (token.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      
      // Si connecté, vérifier si le profil est complété
      if (!token.profileCompleted) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Vérification de l'authentification pour toutes les autres routes
  if (!token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', encodeURI(path))
    return NextResponse.redirect(url)
  }

  // ✅ Gestion de la page d'onboarding
  if (path === '/onboarding') {
    // ✅ CORRECTION : Empêcher les admins d'accéder à l'onboarding
    if (token.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    
    // Si le profil est déjà complété, rediriger vers dashboard
    if (token.profileCompleted) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // Sinon, permettre l'accès à l'onboarding
    return NextResponse.next()
  }

  // ✅ CORRECTION : Ne forcer l'onboarding que pour les non-admins
  if (!token.profileCompleted && token.role !== 'ADMIN') {
    console.log('Redirection vers onboarding pour:', token.email)
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Protection des routes par rôle (uniquement si profil complété)
  if (path.startsWith('/admin') && token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (path.startsWith('/producer') && token.role !== 'PRODUCER') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/onboarding',
    '/dashboard/:path*',
    '/admin/:path*',
    '/producer/:path*',
    '/profile/:path*',
    '/invoices/:path*',
    '/orders/:path*',
    '/checkout/:path*',
    '/cart',
    '/invoices'
  ]
}