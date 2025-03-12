// __tests__/api/categories.test.ts
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import { NextRequest } from "next/server"
import { GET, POST } from '@/app/api/categories/route'
import { GET as GET_CATEGORY, PATCH, DELETE } from '@/app/api/categories/[id]/route'

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
        id: 'test-user',
        role: userRole,
        email: `test-${userRole.toLowerCase()}@test.com`,
        phone: '+33600000000',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  }

  return { req, context }
}

describe('Categories API', () => {
  let categoryId: string

  beforeEach(async () => {
    // Nettoyer la base de données
    await prisma.category.deleteMany()

    // Créer une catégorie de test
    const category = await prisma.category.create({
      data: {
        name: 'Test Category'
      }
    })
    categoryId = category.id
  })

  describe('GET /api/categories', () => {
    it('should list all categories', async () => {
      const { req, context } = createRequest('GET', null, {}, UserRole.CLIENT)
      const response = await GET(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      expect(data[0].name).toBe('Test Category')
    })

    it('should include products in categories', async () => {
      const { req, context } = createRequest('GET', null, {}, UserRole.CLIENT)
      const response = await GET(req, context)
      const data = await response.json()
      
      expect(data[0]).toHaveProperty('products')
      expect(Array.isArray(data[0].products)).toBe(true)
    })
  })

  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      const { req, context } = createRequest('POST', {
        name: 'New Category'
      })

      const response = await POST(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.name).toBe('New Category')
    })

    it('should prevent duplicate category names', async () => {
      const { req, context } = createRequest('POST', {
        name: 'Test Category' // Nom déjà utilisé
      })

      const response = await POST(req, context)
      expect(response.status).toBe(400)
    })

    it('should prevent non-admin from creating categories', async () => {
      const { req, context } = createRequest('POST', {
        name: 'New Category'
      }, {}, UserRole.CLIENT)

      const response = await POST(req, context)
      expect(response.status).toBe(403)
    })
  })

  describe('GET /api/categories/[id]', () => {
    it('should get a specific category', async () => {
      const { req, context } = createRequest('GET', null, { id: categoryId }, UserRole.CLIENT)
      const response = await GET_CATEGORY(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.id).toBe(categoryId)
      expect(data.name).toBe('Test Category')
    })

    it('should return 404 for non-existent category', async () => {
      const { req, context } = createRequest('GET', null, { id: 'non-existent-id' }, UserRole.CLIENT)
      const response = await GET_CATEGORY(req, context)
      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /api/categories/[id]', () => {
    it('should update category name', async () => {
      const { req, context } = createRequest('PATCH', 
        { name: 'Updated Category' },
        { id: categoryId }
      )

      const response = await PATCH(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.name).toBe('Updated Category')
    })

    it('should prevent non-admin from updating categories', async () => {
      const { req, context } = createRequest('PATCH',
        { name: 'Updated Category' },
        { id: categoryId },
        UserRole.CLIENT
      )

      const response = await PATCH(req, context)
      expect(response.status).toBe(403)
    })
  })

  describe('DELETE /api/categories/[id]', () => {
    it('should delete a category', async () => {
      const { req, context } = createRequest('DELETE', null, { id: categoryId })
      const response = await DELETE(req, context)
      expect(response.status).toBe(204)

      // Vérifier que la catégorie a bien été supprimée
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      })
      expect(category).toBeNull()
    })

    it('should prevent non-admin from deleting categories', async () => {
      const { req, context } = createRequest('DELETE',
        null,
        { id: categoryId },
        UserRole.CLIENT
      )

      const response = await DELETE(req, context)
      expect(response.status).toBe(403)
    })

    it('should handle deletion of non-existent category', async () => {
      const { req, context } = createRequest('DELETE', null, { id: 'non-existent-id' })
      const response = await DELETE(req, context)
      expect(response.status).toBe(500) // Ou 404, selon votre préférence
    })
  })
})