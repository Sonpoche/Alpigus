// components/layout/footer.tsx
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
    <footer className="w-full border-t border-border bg-background">
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
        {/* Section principale */}
        <div className="grid grid-cols-1 gap-8 py-12 md:grid-cols-2 lg:grid-cols-4">
          {/* À propos */}
          <div>
            <div className="flex items-center mb-4">
              {/* Logo minimaliste */}
              <div className="flex items-center gap-1 mr-2">
                <div className="w-4 h-4 bg-foreground rounded-full"></div>
                <div className="w-3 h-3 bg-background border border-foreground rounded-full -ml-1"></div>
              </div>
              <h3 className="text-base font-montserrat font-semibold text-foreground">
                Mushroom Marketplace
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              La première marketplace B2B dédiée aux champignons en Suisse.
              Connectons producteurs et professionnels.
            </p>
            
            {/* Réseaux sociaux minimalistes */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-md border border-border hover:bg-accent hover:border-foreground/20 transition-all duration-200 group"
                  aria-label={social.label}
                >
                  {social.isEmail ? (
                    <Mail className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                  ) : (
                    <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Produits */}
          <div>
            <h3 className="text-sm font-montserrat font-semibold text-foreground mb-4">
              Produits
            </h3>
            <ul className="space-y-3">
              {footerLinks.produits.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Aide */}
          <div>
            <h3 className="text-sm font-montserrat font-semibold text-foreground mb-4">
              Aide
            </h3>
            <ul className="space-y-3">
              {footerLinks.aide.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="text-sm font-montserrat font-semibold text-foreground mb-4">
              Informations légales
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border py-6">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Mushroom Marketplace. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  )
}