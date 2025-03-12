// __tests__/api/users.test.ts
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import { NextRequest } from "next/server"
import { GET, PATCH } from '@/app/api/users/route'

// Désactiver les logs pendant les tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

function createRequest(method: string, body?: any, userRole: UserRole = UserRole.CLIENT) {
  const req = new NextRequest(new URL('http://localhost:3000'), {
    method,
    body: body ? JSON.stringify(body) : undefined,
  })
  
  const context = {
    params: {},  // Objet params requis
    session: {
      user: {
        id: 'test-user',
        role: userRole,
        email: 'test@test.com',
        phone: '+33123456789',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  }

  return { req, context }
}

describe('Users API', () => {
  beforeEach(async () => {
    // Nettoyer la base de données
    await prisma.producer.deleteMany()
    await prisma.user.deleteMany()

    // Créer un utilisateur test
    await prisma.user.create({
      data: {
        id: 'test-user',
        name: 'Test User',
        email: 'test@test.com',
        phone: '+33123456789',
        role: UserRole.CLIENT
      }
    })

    // Créer un autre utilisateur pour tester les conflits d'email
    await prisma.user.create({
      data: {
        id: 'other-user',
        name: 'Other User',
        email: 'other@test.com',
        phone: '+33987654321',
        role: UserRole.CLIENT
      }
    })
  })

  describe('GET /api/users', () => {
    it('should get user profile', async () => {
      const { req, context } = createRequest('GET')
      const response = await GET(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.id).toBe('test-user')
      expect(data.email).toBe('test@test.com')
      expect(data.name).toBe('Test User')
      // Vérifier que les champs sensibles ne sont pas inclus
      expect(data.password).toBeUndefined()
      expect(data.emailVerified).toBeUndefined()
    })

    it('should include producer info for producer users', async () => {
      // Créer un producteur
      const producer = await prisma.user.create({
        data: {
          id: 'test-producer',
          name: 'Test Producer',
          email: 'producer@test.com',
          phone: '+33123456780',
          role: UserRole.PRODUCER,
          producer: {
            create: {
              companyName: 'Test Farm'
            }
          }
        }
      })

      const { req, context } = createRequest('GET', null, UserRole.PRODUCER)
      context.session.user.id = producer.id
      context.session.user.email = producer.email

      const response = await GET(req, context)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.producer).toBeDefined()
      expect(data.producer.companyName).toBe('Test Farm')
    })

    it('should return 404 for non-existent user', async () => {
      const { req, context } = createRequest('GET')
      context.session.user.id = 'non-existent-id'
      
      const response = await GET(req, context)
      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /api/users', () => {
    it('should update user profile', async () => {
      const { req, context } = createRequest('PATCH', {
        name: 'Updated Name',
        phone: '+33123456788'
      })

      const response = await PATCH(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.name).toBe('Updated Name')
      expect(data.phone).toBe('+33123456788')
    })

    it('should allow partial updates', async () => {
      const { req, context } = createRequest('PATCH', {
        name: 'Only Name Updated'
      })

      const response = await PATCH(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.name).toBe('Only Name Updated')
      // Les autres champs restent inchangés
      expect(data.phone).toBe('+33123456789')
      expect(data.email).toBe('test@test.com')
    })

    it('should prevent email duplication', async () => {
      const { req, context } = createRequest('PATCH', {
        email: 'other@test.com' // Email déjà utilisé
      })

      const response = await PATCH(req, context)
      expect(response.status).toBe(400)
    })

    it('should allow updating own email', async () => {
      const { req, context } = createRequest('PATCH', {
        email: 'new@test.com'
      })

      const response = await PATCH(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.email).toBe('new@test.com')
    })

    it('should handle invalid session', async () => {
      const { req, context } = createRequest('PATCH', {
        name: 'Updated Name'
      })
      context.session.user = null as any

      const response = await PATCH(req, context)
      expect(response.status).toBe(401)
    })

    it('should accept valid international phone numbers', async () => {
      const validPhones = [
        '+33123456789',  // France
        '+41791234567',  // Suisse
        '+32470123456',  // Belgique
        '+447123456789', // UK
        '+16505550123'   // USA
      ]

      for (const phone of validPhones) {
        const { req, context } = createRequest('PATCH', { phone })
        const response = await PATCH(req, context)
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.phone).toBe(phone)
      }
    })

    it('should reject invalid phone numbers', async () => {
      const invalidPhones = [
        '0612345678',     // Pas de +
        '+336123456',     // Trop court
        '+3361234567890', // Trop long
        '+abc12345678',   // Caractères invalides
        '++33612345678'   // Double +
      ]

      for (const phone of invalidPhones) {
        const { req, context } = createRequest('PATCH', { phone })
        const response = await PATCH(req, context)
        expect(response.status).toBe(400)
      }
    })

    it('should reject names that are too short', async () => {
      const { req, context } = createRequest('PATCH', { name: 'A' })
      const response = await PATCH(req, context)
      expect(response.status).toBe(400)
    })

    it('should reject names that are too long', async () => {
      const { req, context } = createRequest('PATCH', { 
        name: 'A'.repeat(51) 
      })
      const response = await PATCH(req, context)
      expect(response.status).toBe(400)
    })

    it('should reject invalid emails', async () => {
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
        const { req, context } = createRequest('PATCH', { email })
        const response = await PATCH(req, context)
        expect(response.status).toBe(400)
      }
    })

    it('should handle invalid input types', async () => {
      const invalidInputs = [
        { name: 123 },           // Nombre au lieu de string
        { email: true },         // Booléen au lieu de string
        { phone: { num: '123' }} // Objet au lieu de string
      ]

      for (const input of invalidInputs) {
        const { req, context } = createRequest('PATCH', input)
        const response = await PATCH(req, context)
        expect(response.status).toBe(400)
      }
    })
  })
})