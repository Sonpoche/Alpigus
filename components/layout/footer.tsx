// Chemin du fichier: components/layout/footer.tsx
'use client'

import Link from 'next/link'
import { Mail, ExternalLink } from 'lucide-react'

const footerLinks = {
  produits: [
    { label: 'Catalogue', href: '/catalogue' },
    { label: 'Nouveautés', href: '/nouveautes' },
    { label: 'Meilleures ventes', href: '/best-sellers' },
    { label: 'Devenir producteur', href: '/register?role=producer' },
  ],
  aide: [
    { label: 'Centre d\'aide', href: '/help' },
    { label: 'Livraison', href: '/shipping' },
    { label: 'Retours', href: '/returns' },
    { label: 'FAQ', href: '/faq' },
  ],
  legal: [
    { label: 'Mentions légales', href: '/legal' },
    { label: 'CGV', href: '/terms' },
    { label: 'Confidentialité', href: '/privacy' },
    { label: 'Cookies', href: '/cookies' },
  ],
}

const socialLinks = [
  { href: 'https://facebook.com', label: 'Facebook' },
  { href: 'https://instagram.com', label: 'Instagram' },
  { href: 'https://linkedin.com', label: 'LinkedIn' },
  { href: 'mailto:contact@mushroom-marketplace.com', label: 'Email', isEmail: true },
]

export function Footer() {
  return (
    <footer className="w-full bg-white border-t border-gray-200">
      <div className="mx-auto w-full max-w-7xl px-8">
        {/* Section principale */}
        <div className="grid grid-cols-1 gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
          {/* À propos */}
          <div className="lg:col-span-1">
            <div className="flex items-center mb-6">
              {/* Logo minimaliste */}
              <div className="flex items-center gap-1 mr-3">
                <div className="w-5 h-5 bg-black rounded-full"></div>
                <div className="w-4 h-4 bg-white border-2 border-black rounded-full -ml-1.5"></div>
              </div>
              <h3 className="text-lg font-light text-black tracking-tight">
                Mushroom Marketplace
              </h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-8 font-light">
              La première marketplace B2B dédiée aux champignons en Suisse.
              Connectons producteurs et professionnels.
            </p>
            
            {/* Réseaux sociaux minimalistes */}
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 group"
                  aria-label={social.label}
                >
                  {social.isEmail ? (
                    <Mail className="h-4 w-4 text-gray-600 group-hover:text-black transition-colors" />
                  ) : (
                    <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-black transition-colors" />
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Produits */}
          <div>
            <h3 className="text-sm font-medium text-black mb-6 tracking-wide">
              Produits
            </h3>
            <ul className="space-y-4">
              {footerLinks.produits.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-black transition-colors font-light"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Aide */}
          <div>
            <h3 className="text-sm font-medium text-black mb-6 tracking-wide">
              Aide
            </h3>
            <ul className="space-y-4">
              {footerLinks.aide.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-black transition-colors font-light"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="text-sm font-medium text-black mb-6 tracking-wide">
              Informations légales
            </h3>
            <ul className="space-y-4">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-black transition-colors font-light"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright - design minimaliste */}
        <div className="border-t border-gray-200 py-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <p className="text-sm text-gray-500 font-light">
              © {new Date().getFullYear()} Mushroom Marketplace. Tous droits réservés.
            </p>
            
            {/* Liens rapides en bas */}
            <div className="flex flex-wrap gap-6">
              <Link
                href="/privacy"
                className="text-xs text-gray-500 hover:text-black transition-colors font-light"
              >
                Confidentialité
              </Link>
              <Link
                href="/terms"
                className="text-xs text-gray-500 hover:text-black transition-colors font-light"
              >
                Conditions
              </Link>
              <Link
                href="/cookies"
                className="text-xs text-gray-500 hover:text-black transition-colors font-light"
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}