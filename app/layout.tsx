// app/layout.tsx
import type { Metadata } from "next"
import { Montserrat, Roboto } from 'next/font/google'
import "./globals.css"
import { Providers } from './providers'
import { ThemeToggleMinimal } from '@/components/theme-toggle-minimal'
import { Toaster } from "@/components/ui/toaster"
import { ProfileCompletionAlert } from '@/components/layout/profile-completion-alert'
import { MantineProvider, createTheme } from '@mantine/core'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'

const montserrat = Montserrat({ 
  subsets: ['latin'],
  variable: '--font-montserrat'
})

const roboto = Roboto({ 
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-roboto'
})

// Thème minimaliste noir/blanc pour Mantine
const theme = createTheme({
  primaryColor: 'gray',
  
  // Palette de couleurs entièrement en nuances de gris
  colors: {
    // Couleur primaire en nuances de gris
    gray: [
      '#f8f9fa',    // 0 - Gris ultra clair
      '#f1f3f4',    // 1 - Gris très clair  
      '#e9ecef',    // 2 - Gris clair
      '#dee2e6',    // 3 - Gris moyen-clair
      '#ced4da',    // 4 - Gris moyen
      '#adb5bd',    // 5 - Gris moyen-foncé
      '#6c757d',    // 6 - Gris foncé
      '#495057',    // 7 - Gris très foncé
      '#343a40',    // 8 - Gris ultra foncé
      '#212529',    // 9 - Quasi noir
    ],
    
    // Redéfinir toutes les couleurs en nuances de gris
    dark: [
      '#f8f9fa',
      '#f1f3f4', 
      '#e9ecef',
      '#dee2e6',
      '#ced4da',
      '#adb5bd',
      '#6c757d',
      '#495057',
      '#343a40',
      '#212529',
    ],
  },
  
  // Configuration globale
  fontFamily: 'var(--font-roboto), -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  headings: {
    fontFamily: 'var(--font-montserrat), -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  },
  
  // Rayon des bordures - style minimaliste
  radius: {
    xs: '0.25rem',
    sm: '0.375rem', 
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  
  // Ombres minimalistes
  shadows: {
    xs: '0 1px 3px rgba(0, 0, 0, 0.05)',
    sm: '0 2px 6px rgba(0, 0, 0, 0.08)',
    md: '0 4px 12px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
    xl: '0 16px 32px rgba(0, 0, 0, 0.15)',
  },
  
  // Configuration des composants
  components: {
    Button: {
      styles: {
        root: {
          fontWeight: 500,
          transition: 'all 0.2s ease',
        },
      },
    },
    
    Card: {
      styles: {
        root: {
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    
    Input: {
      styles: {
        input: {
          transition: 'border-color 0.2s ease',
          '&:focus': {
            borderColor: '#000',
          },
        },
      },
    },
    
    DatePicker: {
      styles: {
        calendar: {
          backgroundColor: 'var(--mantine-color-white)',
        },
        day: {
          '&[data-selected]': {
            backgroundColor: '#000',
            color: '#fff',
          },
          '&:hover': {
            backgroundColor: '#f1f3f4',
          },
        },
      },
    },
  },
  
  // Mode sombre
  other: {
    darkMode: {
      colors: {
        background: '#000000',
        paper: '#0a0a0a', 
        text: '#ffffff',
        border: '#1a1a1a',
      },
    },
  },
})

export const metadata: Metadata = {
  title: "Mushroom Marketplace",
  description: "Plateforme B2B pour l'achat et la vente de champignons",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${montserrat.variable} ${roboto.variable} antialiased`}>
        <MantineProvider theme={theme}>
          <Providers>
            <ProfileCompletionAlert />
            {children}
            <ThemeToggleMinimal />
            <Toaster />
          </Providers>
        </MantineProvider>
      </body>
    </html>
  )
}