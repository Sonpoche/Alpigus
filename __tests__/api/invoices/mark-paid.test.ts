// __tests__/api/invoices/mark-paid.test.ts
import { NextRequest } from 'next/server'
import { withAuthSecurity } from '@/lib/api-security'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Créer les mocks avant l'import
const mockPrismaInvoiceFindUnique = jest.fn()
const mockPrismaInvoiceUpdate = jest.fn()
const mockPrismaOrderUpdate = jest.fn()
const mockPrismaProducerFindUnique = jest.fn()
const mockPrismaNotificationCreate = jest.fn()

// Mock des dépendances
jest.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: {
      findUnique: mockPrismaInvoiceFindUnique,
      update: mockPrismaInvoiceUpdate
    },
    order: {
      update: mockPrismaOrderUpdate
    },
    producer: {
      findUnique: mockPrismaProducerFindUnique
    },
    notification: {
      create: mockPrismaNotificationCreate
    }
  }
}))

// Mock withAuthSecurity pour tester avec différents rôles
const mockWithAuthSecurity = jest.fn()
jest.mock('@/lib/api-security', () => ({
  withAuthSecurity: mockWithAuthSecurity
}))

describe('/api/invoices/[id]/mark-paid', () => {
  // Import dynamique après les mocks
  let POST: any

  beforeAll(async () => {
    // Setup du mock withAuthSecurity
    mockWithAuthSecurity.mockImplementation((handler, config) => {
      return async (request: NextRequest) => {
        // Récupérer la session du contexte de test
        const testSession = (globalThis as any).testSession
        if (!testSession) {
          throw new Error('Test session not configured')
        }

        // Vérifier la configuration du middleware
        expect(config).toEqual({
          requireAuth: true,
          allowedRoles: ['PRODUCER', 'ADMIN'],
          allowedMethods: ['POST'],
          rateLimit: {
            requests: 5,
            window: 60
          }
        })
        
        return handler(request, testSession)
      }
    })

    const module = await import('@/app/api/invoices/[id]/mark-paid/route')
    POST = module.POST
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrismaInvoiceFindUnique.mockClear()
    mockPrismaInvoiceUpdate.mockClear()
    mockPrismaOrderUpdate.mockClear()
    mockPrismaProducerFindUnique.mockClear()
    mockPrismaNotificationCreate.mockClear()
    
    // Reset test session
    delete (globalThis as any).testSession
  })

  const mockInvoice = {
    id: 'clu123456789012345678901',
    orderId: 'order-123',
    amount: 75.50,
    status: 'PENDING',
    paidAt: null,
    paymentMethod: null,
    order: {
      id: 'order-123',
      status: 'PENDING',
      metadata: null,
      user: {
        id: 'user-client-123',
        name: 'John Doe',
        email: 'john@example.com'
      },
      items: [
        {
          id: 'item-1',
          product: {
            id: 'product-1',
            name: 'Champignons de Paris',
            producer: {
              id: 'producer-1',
              userId: 'user-producer-123',
              companyName: 'Ferme Bio'
            }
          }
        }
      ],
      bookings: []
    }
  }

  const mockProducer = {
    id: 'producer-1',
    companyName: 'Ferme Bio'
  }

  const createRequest = (invoiceId: string, body?: any) => {
    const url = `http://localhost:3000/api/invoices/${invoiceId}/mark-paid`
    return new NextRequest(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: body ? { 'Content-Type': 'application/json' } : undefined
    })
  }

  const setTestSession = (role: 'PRODUCER' | 'ADMIN', userId: string = 'user-producer-123') => {
    ;(globalThis as any).testSession = {
      user: {
        id: userId,
        email: role === 'PRODUCER' ? 'producer@example.com' : 'admin@example.com',
        role: role
      },
      expires: new Date(Date.now() + 3600000).toISOString()
    }
  }

  describe('✅ Cas de Succès', () => {
    it('devrait marquer une facture comme payée (PRODUCER)', async () => {
      // Setup
      setTestSession('PRODUCER')
      mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice)
      mockPrismaProducerFindUnique.mockResolvedValue(mockProducer)
      mockPrismaInvoiceUpdate.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod: 'manual'
      })
      mockPrismaOrderUpdate.mockResolvedValue({})
      mockPrismaNotificationCreate.mockResolvedValue({})

      // Test
      const request = createRequest('clu123456789012345678901')
      const response = await POST(request)
      const data = await response.json()

      // Vérifications
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.invoice.status).toBe('PAID')
      expect(data.message).toBe('Facture marquée comme payée avec succès')

      // Vérifier les appels Prisma
      expect(mockPrismaInvoiceFindUnique).toHaveBeenCalledWith({
        where: { id: 'clu123456789012345678901' },
        include: expect.any(Object)
      })

      expect(mockPrismaInvoiceUpdate).toHaveBeenCalledWith({
        where: { id: 'clu123456789012345678901' },
        data: expect.objectContaining({
          status: 'PAID',
          paidAt: expect.any(Date),
          paymentMethod: 'manual'
        })
      })

      expect(mockPrismaOrderUpdate).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: expect.objectContaining({
          status: 'CONFIRMED',
          metadata: expect.any(String)
        })
      })
    })

    it('devrait marquer une facture comme payée (ADMIN)', async () => {
      // Setup
      setTestSession('ADMIN', 'admin-123')
      mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice)
      mockPrismaInvoiceUpdate.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod: 'bank_transfer'
      })
      mockPrismaOrderUpdate.mockResolvedValue({})
      mockPrismaNotificationCreate.mockResolvedValue({})

      // Test avec options
      const request = createRequest('clu123456789012345678901', {
        paymentMethod: 'bank_transfer',
        notes: 'Virement confirmé par admin'
      })
      const response = await POST(request)
      const data = await response.json()

      // Vérifications
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.invoice.paymentMethod).toBe('bank_transfer')

      // Admin n'a pas besoin de vérification producteur
      expect(mockPrismaProducerFindUnique).not.toHaveBeenCalled()
    })

    it('devrait gérer les notifications correctement', async () => {
      // Setup
      setTestSession('PRODUCER')
      mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice)
      mockPrismaProducerFindUnique.mockResolvedValue(mockProducer)
      mockPrismaInvoiceUpdate.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID'
      })
      mockPrismaOrderUpdate.mockResolvedValue({})
      mockPrismaNotificationCreate.mockResolvedValue({})

      // Test
      const request = createRequest('clu123456789012345678901')
      await POST(request)

      // Vérifier les notifications
      expect(mockPrismaNotificationCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-client-123',
          type: 'INVOICE_PAID',
          title: 'Paiement confirmé',
          message: expect.stringContaining('commande #order-12')
        })
      })
    })
  })

  describe('❌ Cas d\'Erreur - Validation', () => {
    it('devrait rejeter un ID de facture invalide', async () => {
      setTestSession('PRODUCER')
      
      const request = createRequest('invalid-id')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Données invalides')
      expect(data.code).toBe('VALIDATION_ERROR')
      expect(data.details).toBeDefined()
    })

    it('devrait rejeter une facture inexistante', async () => {
      setTestSession('PRODUCER')
      mockPrismaInvoiceFindUnique.mockResolvedValue(null)

      const request = createRequest('clu999999999999999999999')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Facture non trouvée')
      expect(data.code).toBe('INVOICE_NOT_FOUND')
    })

    it('devrait rejeter une facture déjà payée', async () => {
      setTestSession('PRODUCER')
      const paidInvoice = { ...mockInvoice, status: 'PAID' }
      mockPrismaInvoiceFindUnique.mockResolvedValue(paidInvoice)

      const request = createRequest('clu123456789012345678901')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Facture déjà payée')
      expect(data.code).toBe('ALREADY_PAID')
    })

    it('devrait accepter un body optionnel avec valeurs par défaut', async () => {
      setTestSession('ADMIN')
      mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice)
      mockPrismaInvoiceUpdate.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
        paymentMethod: 'manual' // Valeur par défaut
      })
      mockPrismaOrderUpdate.mockResolvedValue({})
      mockPrismaNotificationCreate.mockResolvedValue({})

      // Test avec body vide (devrait utiliser les valeurs par défaut)
      const request = createRequest('clu123456789012345678901', {})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.invoice.paymentMethod).toBe('manual') // Valeur par défaut utilisée
    })

    it('devrait utiliser les valeurs par défaut si le body est invalide', async () => {
      setTestSession('ADMIN')
      mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice)
      mockPrismaInvoiceUpdate.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
        paymentMethod: 'manual'
      })
      mockPrismaOrderUpdate.mockResolvedValue({})
      mockPrismaNotificationCreate.mockResolvedValue({})

      // Test avec méthode de paiement invalide (devrait fallback sur manual)
      const request = createRequest('clu123456789012345678901', {
        paymentMethod: 'invalid_method'
      })
      const response = await POST(request)
      const data = await response.json()

      // Le body étant optionnel et avec gestion d'erreur, ça devrait fonctionner avec les valeurs par défaut
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('🔐 Cas d\'Erreur - Autorisation', () => {
    it('devrait rejeter un producteur sans profil', async () => {
      setTestSession('PRODUCER')
      mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice)
      mockPrismaProducerFindUnique.mockResolvedValue(null)

      const request = createRequest('clu123456789012345678901')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Profil producteur non trouvé')
      expect(data.code).toBe('PRODUCER_NOT_FOUND')
    })

    it('devrait rejeter un producteur sans produits dans la commande', async () => {
      setTestSession('PRODUCER', 'other-producer-456')
      
      const otherProducer = {
        id: 'producer-other',
        companyName: 'Autre Ferme'
      }
      
      mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice)
      mockPrismaProducerFindUnique.mockResolvedValue(otherProducer)

      const request = createRequest('clu123456789012345678901')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Non autorisé - cette facture ne concerne pas vos produits')
      expect(data.code).toBe('FORBIDDEN_PRODUCER')
    })
  })

  describe('💾 Tests avec Données Complètes', () => {
    it('devrait gérer une facture avec bookings', async () => {
      setTestSession('PRODUCER')
      
      const invoiceWithBookings = {
        ...mockInvoice,
        order: {
          ...mockInvoice.order,
          items: [],
          bookings: [
            {
              id: 'booking-1',
              deliverySlot: {
                id: 'slot-1',
                product: {
                  id: 'product-2',
                  name: 'Shiitake',
                  producer: {
                    id: 'producer-1',
                    userId: 'user-producer-123',
                    companyName: 'Ferme Bio'
                  }
                }
              }
            }
          ]
        }
      }

      mockPrismaInvoiceFindUnique.mockResolvedValue(invoiceWithBookings)
      mockPrismaProducerFindUnique.mockResolvedValue(mockProducer)
      mockPrismaInvoiceUpdate.mockResolvedValue({
        ...invoiceWithBookings,
        status: 'PAID'
      })
      mockPrismaOrderUpdate.mockResolvedValue({})
      mockPrismaNotificationCreate.mockResolvedValue({})

      const request = createRequest('clu123456789012345678901')
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockPrismaInvoiceUpdate).toHaveBeenCalled()
    })

    it('devrait gérer les erreurs de notification sans faire échouer le processus', async () => {
      setTestSession('PRODUCER')
      mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice)
      mockPrismaProducerFindUnique.mockResolvedValue(mockProducer)
      mockPrismaInvoiceUpdate.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID'
      })
      mockPrismaOrderUpdate.mockResolvedValue({})
      
      // Simuler une erreur de notification
      mockPrismaNotificationCreate.mockRejectedValue(new Error('Notification service down'))

      const request = createRequest('clu123456789012345678901')
      const response = await POST(request)
      const data = await response.json()

      // Le processus devrait continuer malgré l'erreur de notification
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('🛡️ Tests de Sécurité', () => {
    // Le middleware est testé indirectement par tous les autres tests
    // Si les autorisations n'étaient pas correctes, les tests échoueraient
    
    it('devrait inclure les métadonnées d\'audit', async () => {
      setTestSession('ADMIN', 'admin-456')
      mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice)
      mockPrismaInvoiceUpdate.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID'
      })
      mockPrismaOrderUpdate.mockResolvedValue({})
      mockPrismaNotificationCreate.mockResolvedValue({})

      const request = createRequest('clu123456789012345678901', {
        paymentMethod: 'cash',
        notes: 'Paiement espèces vérifié'
      })
      await POST(request)

      // Vérifier que les métadonnées d'audit sont incluses
      expect(mockPrismaOrderUpdate).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: expect.objectContaining({
          metadata: expect.stringMatching(/markedPaidBy.*admin-456/)
        })
      })
    })
  })

  describe('🔍 Tests de Type et Structure', () => {
    it('devrait valider le schéma de paramètres', () => {
      const schema = z.object({
        id: z.string().cuid('ID de facture invalide')
      })

      // Valid CUID
      expect(() => schema.parse({ id: 'clu123456789012345678901' })).not.toThrow()
      
      // Invalid ID
      expect(() => schema.parse({ id: 'invalid' })).toThrow()
      expect(() => schema.parse({ id: '123' })).toThrow()
    })

    it('devrait valider le schéma de body', () => {
      const schema = z.object({
        paymentMethod: z.enum(['manual', 'bank_transfer', 'cash']).optional(),
        notes: z.string().max(500).optional()
      }).optional()

      // Valid body
      expect(() => schema.parse({ 
        paymentMethod: 'bank_transfer', 
        notes: 'Test note' 
      })).not.toThrow()
      
      // Invalid payment method
      expect(() => schema.parse({ 
        paymentMethod: 'crypto' 
      })).toThrow()
      
      // Notes too long
      expect(() => schema.parse({ 
        notes: 'x'.repeat(501) 
      })).toThrow()
    })
  })
})