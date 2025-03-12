// __tests__/api/auth/register.test.ts
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import { NextRequest } from "next/server"
import { POST } from '@/app/api/auth/register/route'
import { hash } from 'bcrypt'

// Désactiver les logs pendant les tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

function createRequest(body: any) {
  return new NextRequest(new URL('http://localhost:3000/api/auth/register'), {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

describe('Registration API', () => {
  beforeEach(async () => {
    // Nettoyer la base de données
    await prisma.producer.deleteMany()
    await prisma.user.deleteMany()

    // Créer un utilisateur existant pour tester les doublons
    await prisma.user.create({
      data: {
        email: 'existing@test.com',
        password: await hash('password123', 12),
        name: 'Existing User',
        phone: '+33123456789',
        role: UserRole.CLIENT
      }
    })
  })

  describe('POST /api/auth/register', () => {
    it('should register a new client user', async () => {
      const req = createRequest({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
        phone: '+33123456789',
        role: UserRole.CLIENT
      })

      const response = await POST(req)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.email).toBe('test@test.com')
      expect(data.name).toBe('Test User')
      expect(data.role).toBe(UserRole.CLIENT)
      expect(data.password).toBeUndefined() // Le mot de passe ne doit pas être renvoyé
    })

    it('should register a new producer with company details', async () => {
      const req = createRequest({
        email: 'producer@test.com',
        password: 'password123',
        name: 'Test Producer',
        phone: '+33123456789',
        role: UserRole.PRODUCER,
        companyName: 'Test Farm'
      })

      const response = await POST(req)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.role).toBe(UserRole.PRODUCER)
      expect(data.producer).toBeDefined()
      expect(data.producer.companyName).toBe('Test Farm')
    })

    it('should prevent duplicate email registration', async () => {
      const req = createRequest({
        email: 'existing@test.com', // Email déjà utilisé
        password: 'password123',
        name: 'New User',
        phone: '+33123456789',
        role: UserRole.CLIENT
      })

      const response = await POST(req)
      expect(response.status).toBe(400)
    })

    it('should require company name for producer registration', async () => {
      const req = createRequest({
        email: 'producer@test.com',
        password: 'password123',
        name: 'Test Producer',
        phone: '+33123456789',
        role: UserRole.PRODUCER
        // companyName manquant
      })

      const response = await POST(req)
      const data = await response.json()
      expect(data.producer.companyName).toBe('') // Devrait être vide mais pas null
    })

    it('should hash the password', async () => {
      const req = createRequest({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
        phone: '+33123456789',
        role: UserRole.CLIENT
      })

      await POST(req)

      const user = await prisma.user.findUnique({
        where: { email: 'test@test.com' }
      })

      // Vérifier que le mot de passe est hashé
      expect(user?.password).not.toBe('password123')
      expect(user?.password).toContain('$2b$') // Format de hash bcrypt
    })

    it('should handle missing required fields', async () => {
      const invalidRequests = [
        { 
          // Email manquant
          password: 'password123',
          name: 'Test User',
          phone: '+33123456789',
          role: UserRole.CLIENT
        },
        {
          email: 'test@test.com',
          // Password manquant
          name: 'Test User',
          phone: '+33123456789',
          role: UserRole.CLIENT
        },
        {
          email: 'test@test.com',
          password: 'password123',
          // Name manquant
          phone: '+33123456789',
          role: UserRole.CLIENT
        }
      ]

      for (const body of invalidRequests) {
        const req = createRequest(body)
        const response = await POST(req)
        expect(response.status).toBe(400)
      }
    })

    it('should handle invalid phone numbers', async () => {
      const req = createRequest({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
        phone: 'invalid-phone', // Numéro invalide
        role: UserRole.CLIENT
      })

      const response = await POST(req)
      expect(response.status).toBe(400)
    })

    it('should validate password length', async () => {
      const req = createRequest({
        email: 'test@test.com',
        password: '123', // Trop court
        name: 'Test User',
        phone: '+33123456789',
        role: UserRole.CLIENT
      })

      const response = await POST(req)
      expect(response.status).toBe(400)
    })

    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@invalid.com',
        'invalid@.com',
        'invalid@com.',
        '@.',
        'user@.com'
      ]

      for (const email of invalidEmails) {
        const req = createRequest({
          email,
          password: 'password123',
          name: 'Test User',
          phone: '+33123456789',
          role: UserRole.CLIENT
        })

        const response = await POST(req)
        expect(response.status).toBe(400)
      }
    })

    it('should validate name length', async () => {
      // Test nom trop court
      const reqShort = createRequest({
        email: 'test@test.com',
        password: 'password123',
        name: 'A', // Trop court
        phone: '+33123456789',
        role: UserRole.CLIENT
      })

      const responseShort = await POST(reqShort)
      expect(responseShort.status).toBe(400)

      // Test nom trop long
      const reqLong = createRequest({
        email: 'test@test.com',
        password: 'password123',
        name: 'A'.repeat(51), // Trop long
        phone: '+33123456789',
        role: UserRole.CLIENT
      })

      const responseLong = await POST(reqLong)
      expect(responseLong.status).toBe(400)
    })
  })
})