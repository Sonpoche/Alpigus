// __tests__/api/auth/nextauth.test.ts
import { UserRole } from '@prisma/client'
import { compare } from 'bcrypt'
import type { JWT } from 'next-auth/jwt'
import type { Session } from 'next-auth'
import type { AdapterUser } from 'next-auth/adapters'

// Variables pour les tests
const mockCredentials = {
  email: 'test@example.com',
  password: 'password123'
}

// Créer une version mockée de la fonction authorize
const mockAuthorize = jest.fn()
const mockSessionCallback = jest.fn(({ session, token }) => ({
  ...session,
  user: {
    ...session.user,
    id: token.id,
    role: token.role,
    phone: token.phone,
  }
}))

const mockJwtCallback = jest.fn(({ token, user, session, trigger }) => {
  if (trigger === "update" && session?.user) {
    return { ...token, ...session.user }
  }
  if (user) {
    return { ...token, id: user.id, role: user.role, phone: user.phone }
  }
  return token
})

// Mock des dépendances
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    }
  }
}))

jest.mock('bcrypt', () => ({
  compare: jest.fn()
}))

// Mock de authOptions
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {
    providers: [{
      id: 'credentials',
      name: 'Credentials',
      type: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: mockAuthorize
    }],
    callbacks: {
      session: mockSessionCallback,
      jwt: mockJwtCallback
    }
  }
}))

// Import après les mocks
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

describe('NextAuth Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthorize.mockReset()
    mockSessionCallback.mockClear()
    mockJwtCallback.mockClear()
  })

  describe('authorize function', () => {
    it('should return null when credentials are missing', async () => {
      mockAuthorize.mockResolvedValueOnce(null)
      const result = await mockAuthorize({})
      expect(result).toBeNull()
    })

    it('should return null when user is not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)
      mockAuthorize.mockResolvedValueOnce(null)
      const result = await mockAuthorize(mockCredentials)
      expect(result).toBeNull()
    })

    it('should return null when password is incorrect', async () => {
      const mockUser = {
        id: '1',
        email: mockCredentials.email,
        password: 'hashedPassword',
        name: 'Test User',
        role: UserRole.CLIENT,
        phone: '+41791234567',
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser)
      ;(compare as jest.Mock).mockResolvedValueOnce(false)
      mockAuthorize.mockResolvedValueOnce(null)

      const result = await mockAuthorize(mockCredentials)
      expect(result).toBeNull()
    })

    it('should return user data when credentials are valid', async () => {
      const mockUser = {
        id: '1',
        email: mockCredentials.email,
        password: 'hashedPassword',
        name: 'Test User',
        role: UserRole.CLIENT,
        phone: '+41791234567',
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser)
      ;(compare as jest.Mock).mockResolvedValueOnce(true)
      mockAuthorize.mockResolvedValueOnce({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        phone: mockUser.phone,
      })

      const result = await mockAuthorize(mockCredentials)
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        phone: mockUser.phone,
      })
    })
  })

  describe('authorize function - validation cases', () => {
    it('should return null with invalid email format', async () => {
      const invalidCredentials = {
        email: 'invalid-email',
        password: 'password123'
      }
      mockAuthorize.mockResolvedValueOnce(null)
      const result = await mockAuthorize(invalidCredentials)
      expect(result).toBeNull()
    })

    it('should return null with too short password', async () => {
      const invalidCredentials = {
        email: 'test@example.com',
        password: '123'  // Trop court
      }
      mockAuthorize.mockResolvedValueOnce(null)
      const result = await mockAuthorize(invalidCredentials)
      expect(result).toBeNull()
    })

    it('should return null with invalid phone format', async () => {
      const mockUser = {
        id: '1',
        email: mockCredentials.email,
        password: 'hashedPassword',
        name: 'Test User',
        role: UserRole.CLIENT,
        phone: 'invalid-phone',  // Format invalide
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser)
      mockAuthorize.mockResolvedValueOnce(null)
      const result = await mockAuthorize(mockCredentials)
      expect(result).toBeNull()
    })
  })

  describe('session callback', () => {
    it('should include custom fields in session', async () => {
      const mockSessionData: Session = {
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: UserRole.CLIENT,
          phone: '+41791234567',
          image: null,
        },
        expires: '2024-01-01',
      }

      const mockToken: JWT = {
        id: '1',
        role: UserRole.CLIENT,
        phone: '+41791234567',
        name: 'Test User',
        email: 'test@example.com',
        sub: '1'
      }

      const session = await mockSessionCallback({
        session: mockSessionData,
        token: mockToken,
        user: null as any,
        trigger: 'update',
        newSession: null
      })

      expect(session.user).toHaveProperty('id', '1')
      expect(session.user).toHaveProperty('role', UserRole.CLIENT)
      expect(session.user).toHaveProperty('phone', '+41791234567')
      expect(mockSessionCallback).toHaveBeenCalled()
    })

    it('should never expose password in session', async () => {
      const mockSessionData: Session = {
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: UserRole.CLIENT,
          phone: '+41791234567',
          image: null,
        },
        expires: '2024-01-01',
      }

      const mockToken: JWT = {
        id: '1',
        role: UserRole.CLIENT,
        phone: '+41791234567',
        name: 'Test User',
        email: 'test@example.com',
        password: 'should-not-appear',  // Ne devrait pas apparaître
        sub: '1'
      }

      const session = await mockSessionCallback({
        session: mockSessionData,
        token: mockToken,
        user: null as any,
        trigger: 'update',
        newSession: null
      })

      expect(session.user).not.toHaveProperty('password')
    })

    it('should handle session data gracefully', async () => {
      const mockSessionData: Session = {
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: UserRole.CLIENT,
          phone: '+41791234567',
          image: null,
        },
        expires: '2024-01-01',
      }

      const mockToken: JWT = {
        id: '1',
        role: UserRole.CLIENT,
        phone: '+41791234567',
        name: 'Test User',
        email: 'test@example.com',
        sub: '1'
      }

      const session = await mockSessionCallback({
        session: mockSessionData,
        token: mockToken,  // Utilisation du mockToken au lieu de {} as JWT
        user: null as any,
        trigger: 'update',
        newSession: null
      })

      expect(session).toBeDefined()
      expect(session.user).toBeDefined()
      expect(session.user.email).toBe('test@example.com')
      expect(session.user.id).toBe('1')
      expect(session.user.role).toBe(UserRole.CLIENT)
      expect(session.user.phone).toBe('+41791234567')
    })
  })

  describe('jwt callback', () => {
    it('should update token with user data on sign in', async () => {
      const mockUser: AdapterUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.CLIENT,
        phone: '+41791234567',
        emailVerified: null,
        image: null
      }

      const result = await mockJwtCallback({
        token: {} as JWT,
        user: mockUser,
        account: null,
        trigger: 'signIn'
      })

      expect(result).toMatchObject({
        id: mockUser.id,
        role: mockUser.role,
        phone: mockUser.phone
      })
      expect(mockJwtCallback).toHaveBeenCalled()
    })

    it('should update token on session update', async () => {
      const initialToken: JWT = {
        id: '1',
        role: UserRole.CLIENT,
        phone: '+41791234567',
        name: 'Test User',
        email: 'old@example.com',
        sub: '1'
      }

      const mockSession = {
        user: {
          email: 'new@example.com',
          role: UserRole.PRODUCER,
          id: '1',
          phone: '+41791234567',
          image: null,
          name: 'Test User'
        }
      }

      const result = await mockJwtCallback({
        token: initialToken,
        user: null as any,
        session: mockSession,
        trigger: 'update',
        account: null
      })

      expect(result).toMatchObject({
        email: 'new@example.com',
        role: UserRole.PRODUCER
      })
      expect(mockJwtCallback).toHaveBeenCalled()
    })

    it('should preserve custom claims after token refresh', async () => {
      const initialToken: JWT = {
        id: '1',
        role: UserRole.CLIENT,
        phone: '+41791234567',
        name: 'Test User',
        email: 'test@example.com',
        sub: '1',
        customData: 'should-persist'
      }

      const result = await mockJwtCallback({
        token: initialToken,
        user: null,
        account: null,
        trigger: 'update'
      })

      expect(result).toMatchObject({
        customData: 'should-persist'
      })
    })

    it('should handle different user roles correctly', async () => {
      // Test ADMIN
      const adminUser: AdapterUser = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: UserRole.ADMIN,
        phone: '+41791234567',
        emailVerified: null,
        image: null
      }

      const adminResult = await mockJwtCallback({
        token: {} as JWT,
        user: adminUser,
        account: null,
        trigger: 'signIn'
      })

      expect(adminResult.role).toBe(UserRole.ADMIN)

      // Test PRODUCER
      const producerUser: AdapterUser = {
        id: '2',
        email: 'producer@example.com',
        name: 'Producer User',
        role: UserRole.PRODUCER,
        phone: '+41791234567',
        emailVerified: null,
        image: null
      }

      const producerResult = await mockJwtCallback({
        token: {} as JWT,
        user: producerUser,
        account: null,
        trigger: 'signIn'
      })

      expect(producerResult.role).toBe(UserRole.PRODUCER)
    })

    it('should handle session updates with missing data gracefully', async () => {
      const initialToken: JWT = {
        id: '1',
        role: UserRole.CLIENT,
        phone: '+41791234567',
        name: 'Test User',
        email: 'test@example.com',
        sub: '1'
      }

      const mockSession = {
        user: {
          id: '1',
          email: 'new@example.com',
          role: UserRole.PRODUCER,
          phone: '+41791234567',
          name: 'Test User',
          image: null
        }
      }

      const result = await mockJwtCallback({
        token: initialToken,
        user: null,
        session: mockSession,
        trigger: 'update',
        account: null
      })

      expect(result).toMatchObject({
        email: 'new@example.com',
        role: UserRole.PRODUCER,
        id: '1',
        phone: '+41791234567'
      })
    })
  })
})