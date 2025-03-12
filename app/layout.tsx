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

// Thème personnalisé pour Mantine
const theme = createTheme({
  primaryColor: 'custom',
  colors: {
    custom: [
      "#FFE8E8",
      "#FFD1D1",
      "#FFBBBB",
      "#FFA5A5",
      "#FF8F8F",
      "#FF5A5F", // Notre couleur principale
      "#FF4045",
      "#FF262C",
      "#FF0D14",
      "#F50000"
    ]
  }
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