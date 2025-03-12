// __tests__/api/orders.test.ts
import { prisma } from "@/lib/prisma"
import { ProductType, UserRole } from "@prisma/client"
import { GET, POST } from '@/app/api/orders/route'
import { Session } from "next-auth"
import { NextRequest } from "next/server"

// Helper function modifiée pour gérer le contexte et les rôles
function createRequest(method: string, body?: any, userRole: UserRole = UserRole.CLIENT, userId: string = 'test-client') {
  const req = new NextRequest(new URL('http://localhost:3000'), {
    method,
    body: body ? JSON.stringify(body) : undefined,
  })
  return {
    req,
    context: { 
      params: {},
      session: {
        user: {
          id: userId,
          role: userRole,
          email: `test-${userRole.toLowerCase()}@test.com`,
          phone: '+33600000000',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    }
  }
}

describe('Orders API', () => {
  // Configuration avant chaque test
  beforeEach(async () => {
    // D'abord nettoyer la base
    await prisma.booking.deleteMany()
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.deliverySlot.deleteMany()
    await prisma.stock.deleteMany()
    await prisma.product.deleteMany()
    await prisma.producer.deleteMany()
    await prisma.user.deleteMany()

    // Puis recréer les données de test
    const user = await prisma.user.create({
      data: {
        id: 'test-client',
        email: 'client@test.com',
        role: UserRole.CLIENT,
        phone: '+33600000000',
      }
    })

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

    await prisma.product.create({
      data: {
        id: 'normal-product',
        name: 'Champignon sec',
        price: 10,
        type: ProductType.DRIED,
        unit: 'kg',
        producerId: producer.producer!.id,
        stock: {
          create: {
            quantity: 100
          }
        }
      }
    })

    await prisma.product.create({
      data: {
        id: 'fresh-product',
        name: 'Champignon frais',
        price: 15,
        type: ProductType.FRESH,
        unit: 'kg',
        producerId: producer.producer!.id,
      }
    })

    await prisma.deliverySlot.create({
      data: {
        id: 'test-slot',
        productId: 'fresh-product',
        date: new Date('2024-12-25'),
        maxCapacity: 50,
        reserved: 0,
      }
    })
  })

  describe('GET /api/orders', () => {
    it('should return orders for a client', async () => {
      const { req, context } = createRequest('GET')
      const response = await GET(req, context)
      expect(response.status).toBe(200)
    })

    it('should only show user own orders for CLIENT role', async () => {
      // Créer un autre client avec ses commandes
      const otherUser = await prisma.user.create({
        data: {
          id: 'other-client',
          email: 'other@test.com',
          role: UserRole.CLIENT,
          phone: '+33600000002',
        }
      })

      // Créer des commandes pour les deux utilisateurs
      await prisma.order.createMany({
        data: [
          { userId: 'test-client', total: 100 },
          { userId: otherUser.id, total: 200 }
        ]
      })

      const { req, context } = createRequest('GET')
      const response = await GET(req, context)
      const orders = await response.json()
      
      expect(orders.length).toBe(1)
      expect(orders[0].userId).toBe('test-client')
    })

    it('should show all orders for ADMIN role', async () => {
      // Créer plusieurs commandes
      await prisma.order.createMany({
        data: [
          { userId: 'test-client', total: 100 },
          { userId: 'test-client', total: 200 }
        ]
      })

      const { req, context } = createRequest('GET', null, UserRole.ADMIN)
      const response = await GET(req, context)
      const orders = await response.json()
      
      expect(orders.length).toBe(2)
    })
  })

  describe('POST /api/orders', () => {
    it('should create an order with normal products', async () => {
      const { req, context } = createRequest('POST', {
        items: [
          {
            productId: 'normal-product',
            quantity: 5
          }
        ]
      })

      const response = await POST(req, context)
      expect(response.status).toBe(200)

      const updatedStock = await prisma.stock.findUnique({
        where: { productId: 'normal-product' }
      })
      if (!updatedStock) throw new Error('Stock not found')
      expect(updatedStock.quantity).toBe(95)
    })

    it('should create an order with fresh products and delivery slot', async () => {
      const { req, context } = createRequest('POST', {
        items: [
          {
            productId: 'fresh-product',
            quantity: 10,
            slotId: 'test-slot'
          }
        ]
      })

      const response = await POST(req, context)
      expect(response.status).toBe(200)

      const updatedSlot = await prisma.deliverySlot.findUnique({
        where: { id: 'test-slot' }
      })
      if (!updatedSlot) throw new Error('Delivery slot not found')
      expect(updatedSlot.reserved).toBe(10)
    })

    it('should fail when ordering more than available quantity', async () => {
      const { req, context } = createRequest('POST', {
        items: [
          {
            productId: 'normal-product',
            quantity: 1000
          }
        ]
      })

      const response = await POST(req, context)
      expect(response.status).toBe(400)
    })

    it('should calculate total price correctly', async () => {
      const { req, context } = createRequest('POST', {
        items: [
          { productId: 'normal-product', quantity: 2 },
          { productId: 'fresh-product', quantity: 3, slotId: 'test-slot' }
        ]
      })

      const response = await POST(req, context)
      const order = await response.json()
      
      // 2 * 10 + 3 * 15 = 65
      expect(order.total).toBe(65)
    })

    it('should require delivery slot for fresh products', async () => {
      const { req, context } = createRequest('POST', {
        items: [
          { 
            productId: 'fresh-product', 
            quantity: 5 
            // slotId manquant
          }
        ]
      })

      const response = await POST(req, context)
      expect(response.status).toBe(400)
    })

    it('should validate delivery slot capacity', async () => {
      const { req, context } = createRequest('POST', {
        items: [
          {
            productId: 'fresh-product',
            quantity: 60, // Plus que la capacité max (50)
            slotId: 'test-slot'
          }
        ]
      })

      const response = await POST(req, context)
      expect(response.status).toBe(400)
    })

    it('should handle invalid product IDs', async () => {
      const { req, context } = createRequest('POST', {
        items: [
          {
            productId: 'non-existent-product',
            quantity: 5
          }
        ]
      })

      const response = await POST(req, context)
      expect(response.status).toBe(404)
    })

    it('should rollback transaction if any part fails', async () => {
      // Commande avec un produit normal et un produit frais avec surréservation
      const { req, context } = createRequest('POST', {
        items: [
          { 
            productId: 'normal-product', 
            quantity: 5 
          },
          { 
            productId: 'fresh-product', 
            quantity: 60, // Dépassement de capacité pour forcer l'échec
            slotId: 'test-slot'
          }
        ]
      })

      const response = await POST(req, context)
      expect(response.status).toBe(400)

      // Vérifier que le stock n'a pas été modifié
      const stock = await prisma.stock.findUnique({
        where: { productId: 'normal-product' }
      })
      expect(stock?.quantity).toBe(100) // Stock d'origine

      // Vérifier que le slot n'a pas été modifié
      const slot = await prisma.deliverySlot.findUnique({
        where: { id: 'test-slot' }
      })
      expect(slot?.reserved).toBe(0) // Réservation d'origine
    })
  })
})