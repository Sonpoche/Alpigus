// app/api/auth/[...nextauth]/route.ts
import { NextAuthOptions } from "next-auth"
import { DefaultSession, User } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import { compare } from "bcrypt"
import NextAuth from 'next-auth'
import { UserRole } from "@prisma/client"
import { EmailService } from '@/lib/email-service'

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole | null
      phone: string | null
      profileCompleted: boolean // ✅ NOUVEAU
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    role: UserRole | null
    phone: string | null
    profileCompleted: boolean // ✅ NOUVEAU
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole | null
    phone: string | null
    profileCompleted: boolean // ✅ NOUVEAU
    sessionDuration?: number
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours maximum
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember", type: "checkbox" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { producer: true } // ✅ Inclure les données producer si nécessaire
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          phone: user.phone,
          profileCompleted: user.profileCompleted, // ✅ NOUVEAU
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      async profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          phone: '',
          role: 'CLIENT' as UserRole,
          profileCompleted: false // ✅ NOUVEAU - Les comptes Google doivent aussi compléter l'onboarding
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        if (account?.provider === 'google') {
          console.log('Tentative de connexion Google pour:', user.email);

          let dbUser = await prisma.user.findUnique({
            where: { email: user.email! }
          })

          if (!dbUser) {
            console.log('Création d\'un nouvel utilisateur Google');
            try {
              dbUser = await prisma.user.create({
                data: {
                  email: user.email!,
                  name: user.name || '',
                  image: user.image,
                  role: 'CLIENT',
                  phone: '',
                  profileCompleted: false, // ✅ NOUVEAU - Forcer l'onboarding pour Google aussi
                  emailVerified: new Date()
                }
              })
              
              // Envoyer email de bienvenue
              try {
                await EmailService.sendWelcomeEmail(user.email!, user.name || 'Utilisateur', 'CLIENT');
              } catch (emailError) {
                console.error('Erreur email de bienvenue Google:', emailError);
              }
              
            } catch (error) {
              console.error('Erreur lors de la création de l\'utilisateur Google:', error);
              return false
            }
          } else {
            console.log('Utilisateur Google existant trouvé');
          }

          // Mettre à jour les infos utilisateur avec les données récentes
          user.id = dbUser.id
          user.role = dbUser.role
          user.phone = dbUser.phone
          user.profileCompleted = dbUser.profileCompleted // ✅ NOUVEAU
        }
        
        return true
      } catch (error) {
        console.error('Erreur dans signIn callback:', error);
        return false
      }
    },

    async jwt({ token, user, trigger, session }) {
      // ✅ MISE À JOUR : Inclure profileCompleted dans le token
      
      // Lors de la connexion initiale
      if (user) {
        token.id = user.id
        token.role = user.role
        token.phone = user.phone
        token.profileCompleted = user.profileCompleted // ✅ NOUVEAU
      }

      // Lors de la mise à jour de session (update)
      if (trigger === "update" && session) {
        console.log('Mise à jour de session JWT:', session);
        
        // Permettre la mise à jour de profileCompleted
        if (session.profileCompleted !== undefined) {
          token.profileCompleted = session.profileCompleted
        }
        
        // Autres mises à jour possibles
        if (session.name) token.name = session.name
        if (session.phone) token.phone = session.phone
        if (session.role) token.role = session.role
        
        return { ...token, ...session }
      }

      return token
    },

    async session({ session, token }) {
      // ✅ MISE À JOUR : Inclure profileCompleted dans la session
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.phone = token.phone as string
        session.user.profileCompleted = token.profileCompleted as boolean // ✅ NOUVEAU
      }

      return session
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`Connexion: ${user.email} via ${account?.provider}${isNewUser ? ' (nouveau)' : ''}`)
    }
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }