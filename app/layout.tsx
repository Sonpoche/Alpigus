// Chemin du fichier: app/layout.tsx
import type { Metadata } from "next"
import { Montserrat, Roboto } from 'next/font/google'
import "./globals.css"
import { Providers } from './providers'
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

// Configuration Mantine minimaliste
const theme = createTheme({
  primaryColor: 'dark',
  fontFamily: 'var(--font-roboto), Arial, sans-serif',
  headings: {
    fontFamily: 'var(--font-montserrat), Arial, sans-serif',
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
    <html lang="fr">
      <body className={`${montserrat.variable} ${roboto.variable} antialiased bg-white text-black min-h-screen`}>
        <Providers>
          <MantineProvider theme={theme}>
            <ProfileCompletionAlert />
            {children}
            <Toaster />
          </MantineProvider>
        </Providers>
      </body>
    </html>
  )
}