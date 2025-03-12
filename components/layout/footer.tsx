// components/layout/footer.tsx
'use client'

import Link from 'next/link'
import { Facebook, Instagram, Linkedin, Mail } from 'lucide-react'

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
  { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
  { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
  { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
  { icon: Mail, href: 'mailto:contact@mushroom-marketplace.com', label: 'Email' },
]

export function Footer() {
  return (
    <footer className="w-full border-t border-foreground/10 bg-background">
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
        {/* Section principale */}
        <div className="grid grid-cols-1 gap-8 py-12 md:grid-cols-2 lg:grid-cols-4">
          {/* À propos */}
          <div>
            <h3 className="text-lg font-montserrat font-semibold text-custom-title">
              Mushroom Marketplace
            </h3>
            <p className="mt-4 max-w-xs text-sm font-roboto text-custom-text">
              La première marketplace B2B dédiée aux champignons en Suisse.
              Connectons producteurs et professionnels.
            </p>
            {/* Réseaux sociaux */}
            <div className="mt-6 flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-custom-text hover:text-custom-accent"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Produits */}
          <div>
            <h3 className="text-sm font-montserrat font-semibold text-custom-title">
              Produits
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.produits.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm font-roboto text-custom-text hover:text-custom-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Aide */}
          <div>
            <h3 className="text-sm font-montserrat font-semibold text-custom-title">
              Aide
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.aide.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm font-roboto text-custom-text hover:text-custom-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="text-sm font-montserrat font-semibold text-custom-title">
              Informations légales
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm font-roboto text-custom-text hover:text-custom-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-foreground/10 py-4">
          <p className="text-center text-sm font-roboto text-custom-text">
            © {new Date().getFullYear()} Mushroom Marketplace. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  )
}