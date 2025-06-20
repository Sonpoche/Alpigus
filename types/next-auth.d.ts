// types/next-auth.d.ts
import { DefaultSession } from 'next-auth'
import { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole | null
      phone: string | null
      profileCompleted: boolean // ✅ NOUVEAU
    } & DefaultSession['user']
  }

  interface User {
    id: string
    role: UserRole | null
    phone: string | null
    profileCompleted: boolean // ✅ NOUVEAU
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole | null
    phone: string | null
    profileCompleted: boolean // ✅ NOUVEAU
  }
}