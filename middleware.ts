// middleware.ts
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

  // Routes publiques
  if (path === '/' || path === '/login' || path === '/register') {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Vérification de l'authentification
  if (!token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', encodeURI(path))
    return NextResponse.redirect(url)
  }

  // Gestion de la page de complétion du profil
  if (path === '/profile/complete') {
    // Si l'utilisateur a déjà un numéro de téléphone (profil complet)
    if (token.phone && token.phone !== '') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Si le profil est incomplet (pas de téléphone), rediriger vers la page de complétion
  if (!token.phone || token.phone === '') {
    return NextResponse.redirect(new URL('/profile/complete', request.url))
  }

  // Protection des routes par rôle
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
    '/dashboard/:path*',
    '/admin/:path*',
    '/producer/:path*',
    '/profile/:path*',
    '/invoices/:path*',     // Ajout du chemin des factures
    '/orders/:path*',       // S'assurer que les commandes sont aussi protégées
    '/checkout/:path*',     // Protection du checkout
    '/cart',               // Protection du panier
    '/invoices'            // Protection de la page des factures (chemin direct)
  ]
}