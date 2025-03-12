// __tests__/api/delivery-slots.test.ts
import { prisma } from "@/lib/prisma"
import { ProductType, UserRole, BookingStatus } from "@prisma/client"
import { NextRequest } from "next/server"
import { GET, POST } from '@/app/api/delivery-slots/route'
import { GET as GET_SLOT, PATCH, DELETE } from '@/app/api/delivery-slots/[id]/route'
import { POST as BOOK_SLOT } from '@/app/api/delivery-slots/[id]/book/route'

// Désactiver les logs pendant les tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

// Restaurer les logs après les tests
afterAll(() => {
  jest.restoreAllMocks();
});

function createRequest(method: string, body?: any, params: any = {}, userRole: UserRole = UserRole.PRODUCER, searchParams: Record<string, string> = {}) {
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
        id: userRole === UserRole.PRODUCER ? 'test-producer' : 'test-client',
        role: userRole,
        email: `test-${userRole.toLowerCase()}@test.com`,
        phone: '+33600000000',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  }

  return { req, context }
}

describe('DeliverySlots API', () => {
  let producerId: string
  let productId: string
  let slotId: string
  let orderId: string

  beforeEach(async () => {
    // Nettoyer la base de données
    await prisma.booking.deleteMany()
    await prisma.deliverySlot.deleteMany()
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.stock.deleteMany()
    await prisma.product.deleteMany()
    await prisma.producer.deleteMany()
    await prisma.user.deleteMany()

    // Créer un producteur
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
    producerId = producer.producer!.id

    // Créer un client
    const client = await prisma.user.create({
      data: {
        id: 'test-client',
        email: 'client@test.com',
        role: UserRole.CLIENT,
        phone: '+33600000002',
      }
    })

    // Créer un produit avec stock
    const product = await prisma.product.create({
      data: {
        name: 'Test Mushroom',
        description: 'Fresh mushrooms',
        price: 10.0,
        type: ProductType.FRESH,
        unit: 'kg',
        producerId: producer.producer!.id,
        stock: {
          create: {
            quantity: 100
          }
        }
      }
    })
    productId = product.id

    // Créer une commande pour le client
    const order = await prisma.order.create({
      data: {
        userId: client.id,
        total: 0,
      }
    })
    orderId = order.id

    // Créer un créneau de livraison
    const slot = await prisma.deliverySlot.create({
      data: {
        productId: product.id,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain
        maxCapacity: 50,
        reserved: 0,
        isAvailable: true
      }
    })
    slotId = slot.id
  })

  describe('GET /api/delivery-slots', () => {
    it('should list available delivery slots', async () => {
      const { req, context } = createRequest('GET', null, {}, UserRole.CLIENT)
      const response = await GET(req, context)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.slots.length).toBeGreaterThan(0)
      expect(data.slots[0].isAvailable).toBe(true)
    })

    it('should filter slots by product', async () => {
      const { req, context } = createRequest('GET', null, {}, UserRole.CLIENT, {
        productId: productId
      })
      
      const response = await GET(req, context)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.slots.every((slot: any) => slot.productId === productId)).toBe(true)
    })

    it('should handle pagination', async () => {
      const { req, context } = createRequest('GET', null, {}, UserRole.CLIENT, {
        page: '1',
        limit: '10'
      })
      
      const response = await GET(req, context)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.pagination).toBeDefined()
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(10)
    })
  })

  describe('POST /api/delivery-slots', () => {
    it('should create a new delivery slot', async () => {
      const { req, context } = createRequest('POST', {
        productId: productId,
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Dans 2 jours
        maxCapacity: 30
      })

      const response = await POST(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.productId).toBe(productId)
      expect(data.maxCapacity).toBe(30)
      expect(data.reserved).toBe(0)
      expect(data.isAvailable).toBe(true)
    })

    it('should validate capacity against stock', async () => {
      const { req, context } = createRequest('POST', {
        productId: productId,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        maxCapacity: 150 // Plus que le stock disponible
      })

      const response = await POST(req, context)
      expect(response.status).toBe(400)
    })

    it('should prevent creating slots in the past', async () => {
      const { req, context } = createRequest('POST', {
        productId: productId,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Hier
        maxCapacity: 30
      })

      const response = await POST(req, context)
      expect(response.status).toBe(400)
    })
  })

  describe('PATCH /api/delivery-slots/[id]', () => {
    it('should update slot capacity', async () => {
      const { req, context } = createRequest('PATCH', 
        {
          maxCapacity: 40
        },
        { id: slotId }
      )

      const response = await PATCH(req, context)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.maxCapacity).toBe(40)
    })

    it('should prevent reducing capacity below reserved amount', async () => {
      // D'abord faire une réservation
      await prisma.deliverySlot.update({
        where: { id: slotId },
        data: { reserved: 30 }
      })

      const { req, context } = createRequest('PATCH',
        {
          maxCapacity: 20 // Moins que le montant réservé
        },
        { id: slotId }
      )

      const response = await PATCH(req, context)
      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/delivery-slots/[id]/book', () => {
    it('should create a booking', async () => {
      const { req, context } = createRequest('POST',
        {
          quantity: 10,
          orderId: orderId
        },
        { id: slotId },
        UserRole.CLIENT
      )

      const response = await BOOK_SLOT(req, context)
      expect(response.status).toBe(200)

      // Vérifier la mise à jour du créneau
      const updatedSlot = await prisma.deliverySlot.findUnique({
        where: { id: slotId }
      })
      expect(updatedSlot?.reserved).toBe(10)

      // Vérifier la mise à jour du stock
      const updatedStock = await prisma.stock.findUnique({
        where: { productId: productId }
      })
      expect(updatedStock?.quantity).toBe(90) // 100 - 10
    })

    it('should prevent overbooking', async () => {
      const { req, context } = createRequest('POST',
        {
          quantity: 60, // Plus que la capacité max
          orderId: orderId
        },
        { id: slotId },
        UserRole.CLIENT
      )

      const response = await BOOK_SLOT(req, context)
      expect(response.status).toBe(400)
    })

    it('should prevent booking when stock is insufficient', async () => {
      // Réduire le stock à 5
      await prisma.stock.update({
        where: { productId: productId },
        data: { quantity: 5 }
      })

      const { req, context } = createRequest('POST',
        {
          quantity: 10,
          orderId: orderId
        },
        { id: slotId },
        UserRole.CLIENT
      )

      const response = await BOOK_SLOT(req, context)
      expect(response.status).toBe(400)
    })
  })
})