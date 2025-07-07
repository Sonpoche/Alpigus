// __tests__/api/invoices/create-payment-intent.test.ts
import { NextRequest } from 'next/server'
import { withAuthSecurity } from '@/lib/api-security'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Créer les mocks avant l'import
const mockStripeCreate = jest.fn()
const mockStripeRetrieve = jest.fn()
const mockPrismaInvoiceFindFirst = jest.fn()
const mockPrismaOrderUpdate = jest.fn()

// Mock des dépendances
jest.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: {
      create: mockStripeCreate,
      retrieve: mockStripeRetrieve
    }
  },
  STRIPE_CONFIG: {
    currency: 'chf'
  }
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: {
      findFirst: mockPrismaInvoiceFindFirst
    },
    order: {
      update: mockPrismaOrderUpdate
    }
  }
}))

// Mock withAuthSecurity pour tester uniquement la logique de route
jest.mock('@/lib/api-security', () => ({
  withAuthSecurity: jest.fn((handler, config) => {
    return async (request: NextRequest) => {
      // Simuler une session valide
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'CLIENT'
        },
        expires: new Date(Date.now() + 3600000).toISOString()
      }
      
      // Vérifier la configuration du middleware
      expect(config).toEqual({
        requireAuth: true,
        allowedRoles: ['CLIENT'],
        allowedMethods: ['POST'],
        rateLimit: {
          requests: 10,
          window: 60
        }
      })
      
      return handler(request, mockSession)
    }
  })
}))

describe('/api/invoices/[id]/create-payment-intent', () => {
  // Import dynamique après les mocks
  let POST: any

  beforeAll(async () => {
    const module = await import('@/app/api/invoices/[id]/create-payment-intent/route')
    POST = module.POST
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockStripeCreate.mockClear()
    mockStripeRetrieve.mockClear()
    mockPrismaInvoiceFindFirst.mockClear()
    mockPrismaOrderUpdate.mockClear()
  })

  const mockInvoice = {
    id: 'clu123456789012345678901',
    amount: 50.0,
    status: 'PENDING' as const,
    userId: 'user-123',
    orderId: 'order-123',
    order: {
      id: 'order-123',
      metadata: null
    },
    user: {
      id: 'user-123',
      email: 'test@example.com'
    }
  }

  const createRequest = (invoiceId: string) => {
    return new NextRequest(
      `http://localhost:3000/api/invoices/${invoiceId}/create-payment-intent`,
      { method: 'POST' }
    )
  }

  describe('✅ Cas de Succès', () => {
    it('devrait créer un PaymentIntent avec succès', async () => {
      // Setup
      mockPrismaInvoiceFindFirst.mockResolvedValue(mockInvoice)
      mockStripeCreate.mockResolvedValue({
        id: 'pi_123456789',
        client_secret: 'pi_123456789_secret_abc',
        amount: 5000,
        currency: 'chf',
        status: 'requires_payment_method',
        metadata: {}
      } as any)
      mockPrismaOrderUpdate.mockResolvedValue({} as any)

      // Test
      const request = createRequest('clu123456789012345678901')
      const response = await POST(request)
      const data = await response.json()

      // Vérifications
      expect(response.status).toBe(200)
      expect(data).toEqual({
        client_secret: 'pi_123456789_secret_abc',
        payment_intent_id: 'pi_123456789',
        amount: 50.0,
        currency: 'chf'
      })

      // Vérifier les appels
      expect(mockPrismaInvoiceFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'clu123456789012345678901',
          userId: 'user-123',
          status: { in: ['PENDING', 'OVERDUE'] }
        },
        include: {
          order: {
            select: {
              id: true,
              metadata: true
            }
          },
          user: true
        }
      })

      expect(mockStripeCreate).toHaveBeenCalledWith({
        amount: 5000,
        currency: 'chf',
        automatic_payment_methods: { enabled: true },
        metadata: expect.objectContaining({
          invoiceId: 'clu123456789012345678901',
          orderId: 'order-123',
          userId: 'user-123',
          type: 'invoice_payment'
        }),
        description: expect.stringContaining('Paiement facture'),
        receipt_email: 'test@example.com',
        setup_future_usage: undefined
      })
    })

    it('devrait réutiliser un PaymentIntent existant valide', async () => {
      // Setup avec métadonnées existantes
      const invoiceWithExistingIntent = {
        ...mockInvoice,
        order: {
          id: 'order-123',
          metadata: JSON.stringify({
            stripePaymentIntentId: 'pi_existing_123',
            invoicePayment: true
          })
        }
      }

      mockPrismaInvoiceFindFirst.mockResolvedValue(invoiceWithExistingIntent)
      mockStripeRetrieve.mockResolvedValue({
        id: 'pi_existing_123',
        client_secret: 'pi_existing_123_secret',
        status: 'requires_payment_method'
      } as any)

      // Test
      const request = createRequest('clu123456789012345678901')
      const response = await POST(request)
      const data = await response.json()

      // Vérifications
      expect(response.status).toBe(200)
      expect(data.payment_intent_id).toBe('pi_existing_123')
      expect(mockStripeCreate).not.toHaveBeenCalled()
    })
  })

  describe('❌ Cas d\'Erreur - Validation', () => {
    it('devrait rejeter un ID de facture invalide', async () => {
      const request = createRequest('invalid-id')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Données invalides')
      expect(data.code).toBe('VALIDATION_ERROR')
      expect(data.details).toBeDefined()
    })

    it('devrait rejeter une facture inexistante', async () => {
      mockPrismaInvoiceFindFirst.mockResolvedValue(null)

      const request = createRequest('clu999999999999999999999')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Facture non trouvée ou déjà payée')
      expect(data.code).toBe('INVOICE_NOT_FOUND')
    })

    it('devrait rejeter un montant trop faible', async () => {
      const lowAmountInvoice = { ...mockInvoice, amount: 0.40 }
      mockPrismaInvoiceFindFirst.mockResolvedValue(lowAmountInvoice)

      const request = createRequest('clu123456789012345678901')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Montant minimum 0.50 CHF')
      expect(data.code).toBe('AMOUNT_TOO_LOW')
    })

    it('devrait rejeter une facture qui n\'appartient pas à l\'utilisateur', async () => {
      // findFirst retourne null car le userId ne correspond pas dans la clause WHERE
      mockPrismaInvoiceFindFirst.mockResolvedValue(null)

      const request = createRequest('clu123456789012345678901')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.code).toBe('INVOICE_NOT_FOUND')
    })
  })

  describe('💳 Cas d\'Erreur - Stripe', () => {
    it('devrait gérer les erreurs Stripe', async () => {
      mockPrismaInvoiceFindFirst.mockResolvedValue(mockInvoice)
      mockStripeCreate.mockRejectedValue(
        new Error('Stripe error: Invalid payment method')
      )

      const request = createRequest('clu123456789012345678901')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Erreur de paiement')
      expect(data.code).toBe('STRIPE_ERROR')
    })

    it('devrait gérer les erreurs génériques', async () => {
      mockPrismaInvoiceFindFirst.mockResolvedValue(mockInvoice)
      mockStripeCreate.mockRejectedValue(
        new Error('Network error')
      )

      const request = createRequest('clu123456789012345678901')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Erreur lors de la création du paiement')
      expect(data.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('💾 Sauvegarde des Métadonnées', () => {
    it('devrait sauvegarder les métadonnées PaymentIntent', async () => {
      mockPrismaInvoiceFindFirst.mockResolvedValue(mockInvoice)
      mockStripeCreate.mockResolvedValue({
        id: 'pi_new_123',
        client_secret: 'pi_new_123_secret',
        amount: 5000,
        currency: 'chf'
      } as any)
      mockPrismaOrderUpdate.mockResolvedValue({} as any)

      const request = createRequest('clu123456789012345678901')
      await POST(request)

      expect(mockPrismaOrderUpdate).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: {
          metadata: expect.stringContaining('"stripePaymentIntentId":"pi_new_123"')
        }
      })
    })

    it('devrait continuer même si la sauvegarde des métadonnées échoue', async () => {
      mockPrismaInvoiceFindFirst.mockResolvedValue(mockInvoice)
      mockStripeCreate.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'pi_123_secret',
        amount: 5000,
        currency: 'chf'
      } as any)
      mockPrismaOrderUpdate.mockRejectedValue(new Error('Database error'))

      const request = createRequest('clu123456789012345678901')
      const response = await POST(request)

      // Devrait quand même retourner succès
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.payment_intent_id).toBe('pi_123')
    })
  })

  // Suppression du test de configuration middleware car il est testé indirectement
  // par le fait que tous les autres tests passent avec la bonne configuration
})

// Tests d'intégration pour vérifier les types
describe('🔍 Tests de Type et Structure', () => {
  it('devrait valider le schéma Zod', () => {
    const schema = z.object({
      id: z.string().cuid('ID de facture invalide')
    })

    // Valid CUID
    expect(() => schema.parse({ id: 'clu123456789012345678901' })).not.toThrow()
    
    // Invalid ID
    expect(() => schema.parse({ id: 'invalid' })).toThrow()
    expect(() => schema.parse({ id: '123' })).toThrow()
    expect(() => schema.parse({ id: '' })).toThrow()
  })

  it('devrait calculer correctement les montants', () => {
    const amounts = [
      { chf: 0.50, centimes: 50 },
      { chf: 25.99, centimes: 2599 },
      { chf: 100.00, centimes: 10000 }
    ]

    amounts.forEach(({ chf, centimes }) => {
      expect(Math.round(chf * 100)).toBe(centimes)
    })
  })
})