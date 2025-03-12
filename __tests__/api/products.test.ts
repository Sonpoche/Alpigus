import { prisma } from "@/lib/prisma"
import { ProductType, UserRole } from "@prisma/client"
import { NextRequest } from "next/server"
import { GET, POST } from '@/app/api/products/route'
import { DELETE, PATCH } from '@/app/api/products/[id]/route'
import { Session } from "next-auth"

// Helper function modifié pour inclure les paramètres de requête et l'ID utilisateur en option
function createRequest(
  method: string, 
  body?: any, 
  params: any = {}, 
  userRole: UserRole = UserRole.PRODUCER, 
  searchParams: Record<string, string> = {},
  userId: string = 'test-producer'
) {
  const url = new URL('http://localhost:3000')
  Object.keys(searchParams).forEach(key => {
    url.searchParams.append(key, searchParams[key])
  })

  const req = new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  })
  
  const context = {
    params,
    session: {
      user: {
        id: userId,
        role: userRole,
        email: 'producer@test.com',
        phone: '+33600000000',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    } as Session
  }

  return { req, context }
}

describe('Products API', () => {
  let testProduct: any
  let otherProducer: any
  
  beforeEach(async () => {
    if (!prisma) return

    await prisma.stock.deleteMany()
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.product.deleteMany()
    await prisma.category.deleteMany()
    await prisma.producer.deleteMany()
    await prisma.user.deleteMany()

    const producer = await prisma.user.create({
      data: {
        id: 'test-producer',
        email: 'producer@test.com',
        role: UserRole.PRODUCER,
        phone: '+33600000001',
        producer: {
          create: {
            id: 'producer-1',
            companyName: 'Test Producer',
          }
        }
      },
      include: {
        producer: true
      }
    })

    // Créer un autre producteur pour les tests de sécurité
    otherProducer = await prisma.user.create({
      data: {
        id: 'other-producer',
        email: 'other@test.com',
        role: UserRole.PRODUCER,
        phone: '+33600000002',
        producer: {
          create: {
            companyName: 'Other Producer'
          }
        }
      },
      include: {
        producer: true
      }
    })

    // Créer une catégorie de test
    const category = await prisma.category.create({
      data: {
        id: 'test-category',
        name: 'Test Category'
      }
    })

    // Créer plusieurs produits pour tester la pagination
    for (let i = 0; i < 15; i++) {
      const product = await prisma.product.create({
        data: {
          name: `Test Product ${i}`,
          description: 'Test Description',
          price: 10 + i,
          type: ProductType.FRESH,
          unit: 'kg',
          producerId: producer.producer!.id,
          categories: {
            connect: i % 2 === 0 ? [{ id: category.id }] : undefined
          },
          stock: {
            create: {
              quantity: 100
            }
          }
        }
      })

      if (i === 0) {
        testProduct = product
      }
    }
  })

  // Tests GET existants
  describe('GET /api/products with pagination and filters', () => {
    it('should handle pagination correctly', async () => {
      const { req, context } = createRequest('GET', null, {}, UserRole.CLIENT, { 
        page: '2', 
        limit: '5' 
      })

      const response = await GET(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.products.length).toBe(5)
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(5)
      expect(data.pagination.total).toBe(15)
    })

    it('should filter by category', async () => {
      const { req, context } = createRequest('GET', null, {}, UserRole.CLIENT, {
        category: 'test-category'
      })

      const response = await GET(req, context)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.products.every((product: any) => 
        product.categories.some((cat: any) => cat.id === 'test-category')
      )).toBe(true)
    })

    it('should return error with invalid type parameter', async () => {
      const { req, context } = createRequest('GET', null, {}, UserRole.CLIENT, {
        type: 'INVALID_TYPE'
      })

      const response = await GET(req, context)
      expect(response.status).toBe(400)
    })
  })

  // Tests POST existants et nouveaux
  describe('POST /api/products validations', () => {
    it('should reject negative stock quantity', async () => {
      const { req, context } = createRequest('POST', {
        name: 'Test Product',
        description: 'Test Description',
        price: 10,
        type: ProductType.FRESH,
        unit: 'kg',
        initialStock: -5
      })

      const response = await POST(req, context)
      expect(response.status).toBe(400)
    })

    it('should reject negative price', async () => {
      const { req, context } = createRequest('POST', {
        name: 'Test Product',
        description: 'Test Description',
        price: -10,
        type: ProductType.FRESH,
        unit: 'kg',
        initialStock: 10
      })

      const response = await POST(req, context)
      expect(response.status).toBe(400)
    })

    it('should create product with categories', async () => {
      const { req, context } = createRequest('POST', {
        name: 'Test Product',
        description: 'Test Description',
        price: 10,
        type: ProductType.FRESH,
        unit: 'kg',
        initialStock: 10,
        categories: ['test-category']
      })

      const response = await POST(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.categories).toBeDefined()
      expect(data.categories.length).toBe(1)
      expect(data.categories[0].id).toBe('test-category')
    })
  })

  // Tests PATCH existants
  describe('PATCH /api/products/[id] operations', () => {
    it('should update product availability', async () => {
      const { req, context } = createRequest('PATCH', 
        {
          available: false
        },
        { id: testProduct.id }
      )

      const response = await PATCH(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.available).toBe(false)
    })

    it('should properly handle stock updates', async () => {
      const { req, context } = createRequest('PATCH',
        {
          stock: {
            quantity: 50
          }
        },
        { id: testProduct.id }
      )

      const response = await PATCH(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.stock.quantity).toBe(50)
    })
  })

  // NOUVEAUX TESTS DE SÉCURITÉ
  describe('Security tests', () => {
    it('should reject non-producer users for POST', async () => {
      const validProductData = {
        name: "Test Product",
        price: 10,
        type: ProductType.FRESH,
        unit: "kg",
        initialStock: 100
      }
      
      const { req, context } = createRequest('POST', validProductData, {}, UserRole.CLIENT)
      const response = await POST(req, context)
      expect(response.status).toBe(403)
    })

    it('should only allow producers to update their own products', async () => {
      const { req, context } = createRequest(
        'PATCH',
        { name: "Modified Product" },
        { id: testProduct.id },
        UserRole.PRODUCER,
        {},
        'other-producer'
      )

      const response = await PATCH(req, context)
      expect(response.status).toBe(403)
    })
  })

  // NOUVEAUX TESTS DE GESTION D'ERREUR
  describe('Error handling', () => {
    let originalPrismaCreate: any

    beforeEach(() => {
      originalPrismaCreate = prisma.product.create
    })

    afterEach(() => {
      prisma.product.create = originalPrismaCreate
    })

    it('should handle database errors gracefully', async () => {
      // @ts-ignore - Mock de prisma
      prisma.product.create = jest.fn().mockRejectedValue(new Error('DB Error'))

      const { req, context } = createRequest('POST', {
        name: "Test Product",
        price: 10,
        type: ProductType.FRESH,
        unit: "kg",
        initialStock: 100
      })

      const response = await POST(req, context)
      expect(response.status).toBe(500)
    })

    it('should validate category IDs', async () => {
      const { req, context } = createRequest('POST', {
        name: "Test Product",
        price: 10,
        type: ProductType.FRESH,
        unit: "kg",
        initialStock: 100,
        categories: ['non-existent-category-id']
      })

      const response = await POST(req, context)
      expect(response.status).toBe(400)
    })
  })
})