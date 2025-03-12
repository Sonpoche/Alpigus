// __tests__/api/producers.test.ts
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import { NextRequest } from "next/server"
import { GET, POST } from '@/app/api/producers/route'
import { GET as GET_PRODUCER, PATCH, DELETE } from '@/app/api/producers/[id]/route'

// Désactiver les logs pendant les tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

// Restaurer les logs après les tests
afterAll(() => {
  jest.restoreAllMocks();
});

function createRequest(method: string, body?: any, params: any = {}, userRole: UserRole = UserRole.ADMIN) {
  const req = new NextRequest(new URL('http://localhost:3000'), {
    method,
    body: body ? JSON.stringify(body) : undefined,
  })
  
  const context = {
    params,
    session: {
      user: {
        id: userRole === UserRole.PRODUCER ? 'test-producer-user' : 'test-user',
        role: userRole,
        email: `test-${userRole.toLowerCase()}@test.com`,
        phone: '+33600000000',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  }

  return { req, context }
}

describe('Producers API', () => {
  let producerId: string
  let userId: string

  beforeEach(async () => {
    // Nettoyer la base de données
    await prisma.product.deleteMany()
    await prisma.producer.deleteMany()
    await prisma.user.deleteMany()

    // Créer un utilisateur producteur
    const user = await prisma.user.create({
      data: {
        id: 'test-producer-user',
        email: 'producer@test.com',
        role: UserRole.PRODUCER,
        phone: '+33600000001',
      }
    })
    userId = user.id

    // Créer un producteur test
    const producer = await prisma.producer.create({
      data: {
        userId: user.id,
        companyName: 'Test Farm',
        address: '123 Farm Road',
        description: 'Test producer description'
      }
    })
    producerId = producer.id
  })

  describe('GET /api/producers', () => {
    it('should list all producers', async () => {
      const { req, context } = createRequest('GET', null, {}, UserRole.CLIENT)
      const response = await GET(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      expect(data[0].companyName).toBe('Test Farm')
      expect(data[0].user).toBeDefined()
      expect(data[0].user.email).toBe('producer@test.com')
    })
  })

  describe('POST /api/producers', () => {
    it('should create a new producer', async () => {
      // Créer d'abord un nouvel utilisateur
      const newUser = await prisma.user.create({
        data: {
          email: 'new-producer@test.com',
          role: UserRole.PRODUCER,
          phone: '+33600000002',
        }
      })

      const { req, context } = createRequest('POST', {
        userId: newUser.id,
        companyName: 'New Farm',
        address: '456 Farm Road',
        description: 'New producer description'
      })

      const response = await POST(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.companyName).toBe('New Farm')
      expect(data.userId).toBe(newUser.id)
    })

    it('should prevent non-admin from creating producers', async () => {
      const { req, context } = createRequest('POST', {
        userId: 'some-id',
        companyName: 'New Farm'
      }, {}, UserRole.CLIENT)

      const response = await POST(req, context)
      expect(response.status).toBe(403)
    })

    it('should validate required fields', async () => {
      const { req, context } = createRequest('POST', {
        // Missing userId and companyName
        address: '456 Farm Road'
      })

      const response = await POST(req, context)
      expect(response.status).toBe(500) // Ou 400 selon votre préférence
    })
  })

  describe('GET /api/producers/[id]', () => {
    it('should get a specific producer', async () => {
      const { req, context } = createRequest('GET', null, { id: producerId }, UserRole.CLIENT)
      const response = await GET_PRODUCER(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.id).toBe(producerId)
      expect(data.companyName).toBe('Test Farm')
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe('producer@test.com')
    })

    it('should return 404 for non-existent producer', async () => {
      const { req, context } = createRequest('GET', null, { id: 'non-existent-id' }, UserRole.CLIENT)
      const response = await GET_PRODUCER(req, context)
      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /api/producers/[id]', () => {
    it('should allow admin to update producer', async () => {
      const { req, context } = createRequest('PATCH', 
        {
          companyName: 'Updated Farm',
          address: 'New Address'
        },
        { id: producerId }
      )

      const response = await PATCH(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.companyName).toBe('Updated Farm')
      expect(data.address).toBe('New Address')
    })

    it('should allow producer to update their own profile', async () => {
      const { req, context } = createRequest('PATCH',
        {
          companyName: 'Self Updated Farm'
        },
        { id: producerId },
        UserRole.PRODUCER
      )

      const response = await PATCH(req, context)
      expect(response.status).toBe(200)
    })

    it('should prevent non-admin/non-owner from updating', async () => {
      const { req, context } = createRequest('PATCH',
        {
          companyName: 'Hacked Farm'
        },
        { id: producerId },
        UserRole.CLIENT
      )

      const response = await PATCH(req, context)
      expect(response.status).toBe(403)
    })
  })

  describe('DELETE /api/producers/[id]', () => {
    it('should allow admin to delete producer', async () => {
      const { req, context } = createRequest('DELETE', null, { id: producerId })
      const response = await DELETE(req, context)
      expect(response.status).toBe(204)

      const deletedProducer = await prisma.producer.findUnique({
        where: { id: producerId }
      })
      expect(deletedProducer).toBeNull()
    })

    it('should prevent non-admin from deleting producers', async () => {
      const { req, context } = createRequest('DELETE',
        null,
        { id: producerId },
        UserRole.PRODUCER
      )

      const response = await DELETE(req, context)
      expect(response.status).toBe(403)
    })

    it('should handle deletion of non-existent producer', async () => {
      const { req, context } = createRequest('DELETE', null, { id: 'non-existent-id' })
      const response = await DELETE(req, context)
      expect(response.status).toBe(500)
    })
  })
})