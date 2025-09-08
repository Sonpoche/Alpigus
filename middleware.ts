// Chemin du fichier: middleware.ts
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

  // Routes publiques (accessibles sans authentification) - URLs françaises
  if (
    path === '/' || 
    path === '/connexion' || 
    path === '/inscription' || 
    path === '/panier' ||
    path.startsWith('/produits/') ||
    path.startsWith('/mot-de-passe/')
  ) {
    if (token) {
      // Ne pas rediriger les admins vers onboarding
      if (token.role === 'ADMIN') {
        // Si admin essaie d'accéder à des pages publiques, le laisser faire
        if (path === '/' || path === '/panier' || path.startsWith('/produits/')) {
          return NextResponse.next()
        }
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      
      // Si connecté et essaie d'accéder à connexion/inscription, rediriger
      if (path === '/connexion' || path === '/inscription') {
        if (!token.profileCompleted) {
          return NextResponse.redirect(new URL('/integration', request.url))
        }
        return NextResponse.redirect(new URL('/tableau-de-bord', request.url))
      }
    }
    return NextResponse.next()
  }

  // Vérification de l'authentification pour toutes les autres routes
  if (!token) {
    const url = new URL('/connexion', request.url)
    url.searchParams.set('callbackUrl', encodeURI(path))
    return NextResponse.redirect(url)
  }

  // Gestion de la page d'onboarding
  if (path === '/integration') {
    // Empêcher les admins d'accéder à l'onboarding
    if (token.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    
    // Si le profil est déjà complété, rediriger vers dashboard
    if (token.profileCompleted) {
      return NextResponse.redirect(new URL('/tableau-de-bord', request.url))
    }
    // Sinon, permettre l'accès à l'onboarding
    return NextResponse.next()
  }

  // Ne forcer l'onboarding que pour les non-admins
  if (!token.profileCompleted && token.role !== 'ADMIN') {
    console.log('Redirection vers integration pour:', token.email)
    return NextResponse.redirect(new URL('/integration', request.url))
  }

  // Protection des routes par rôle (uniquement si profil complété)
  if (path.startsWith('/admin') && token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/tableau-de-bord', request.url))
  }

  if (path.startsWith('/producteur') && token.role !== 'PRODUCER') {
    return NextResponse.redirect(new URL('/tableau-de-bord', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/connexion',
    '/inscription', 
    '/integration',
    '/tableau-de-bord/:path*',
    '/admin/:path*',
    '/producteur/:path*',
    '/profil/:path*',
    '/factures/:path*',
    '/commandes/:path*',
    '/commande/:path*',
    '/panier',
    '/produits/:path*'
  ]
}