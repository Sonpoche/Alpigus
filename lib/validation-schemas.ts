// lib/validation-schemas.ts
import { z } from 'zod'
import { UserRole, ProductType, OrderStatus } from '@prisma/client'

// Schémas pour l'authentification
export const authSchemas = {
  login: z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(6, 'Mot de passe trop court')
  }),
  
  register: z.object({
    name: z.string().min(2, 'Nom trop court'),
    email: z.string().email('Email invalide'),
    password: z.string().min(6, 'Mot de passe trop court'),
    phone: z.string().min(10, 'Numéro de téléphone invalide'),
    role: z.nativeEnum(UserRole).default('CLIENT')
  }),
  
  resetPassword: z.object({
    email: z.string().email('Email invalide')
  }),
  
  updatePassword: z.object({
    token: z.string().min(1, 'Token requis'),
    password: z.string().min(6, 'Mot de passe trop court')
  })
}

// Schémas pour les utilisateurs
export const userSchemas = {
  update: z.object({
    name: z.string().min(2, 'Nom trop court').optional(),
    email: z.string().email('Email invalide').optional(),
    phone: z.string().min(10, 'Numéro de téléphone invalide').optional(),
    image: z.string().url('URL d\'image invalide').optional()
  }),
  
  updateRole: z.object({
    userId: z.string().cuid('ID utilisateur invalide'),
    role: z.nativeEnum(UserRole)
  }),
  
  search: z.object({
    q: z.string().min(1, 'Terme de recherche requis'),
    role: z.nativeEnum(UserRole).optional(),
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10)
  })
}

// Schémas pour les producteurs
export const producerSchemas = {
  create: z.object({
    companyName: z.string().min(2, 'Nom de l\'entreprise trop court'),
    address: z.string().min(10, 'Adresse trop courte'),
    description: z.string().min(20, 'Description trop courte').optional(),
    bankName: z.string().min(2, 'Nom de la banque requis').optional(),
    bankAccountName: z.string().min(2, 'Nom du titulaire requis').optional(),
    iban: z.string().min(15, 'IBAN invalide').optional(),
    bic: z.string().min(8, 'BIC invalide').optional()
  }),
  
  update: z.object({
    companyName: z.string().min(2, 'Nom de l\'entreprise trop court').optional(),
    address: z.string().min(10, 'Adresse trop courte').optional(),
    description: z.string().min(20, 'Description trop courte').optional(),
    bankName: z.string().min(2, 'Nom de la banque requis').optional(),
    bankAccountName: z.string().min(2, 'Nom du titulaire requis').optional(),
    iban: z.string().min(15, 'IBAN invalide').optional(),
    bic: z.string().min(8, 'BIC invalide').optional()
  })
}

// Schémas pour les produits
export const productSchemas = {
  create: z.object({
    name: z.string().min(2, 'Nom du produit trop court'),
    description: z.string().min(10, 'Description trop courte').optional(),
    price: z.number().min(0.01, 'Prix invalide'),
    type: z.nativeEnum(ProductType),
    unit: z.string().min(1, 'Unité requise'),
    image: z.string().url('URL d\'image invalide').optional(),
    stock: z.number().min(0, 'Stock invalide').optional(),
    available: z.boolean().default(true),
    acceptDeferred: z.boolean().default(false),
    minOrderQuantity: z.number().min(0, 'Quantité minimale invalide').default(0)
  }),
  
  update: z.object({
    name: z.string().min(2, 'Nom du produit trop court').optional(),
    description: z.string().min(10, 'Description trop courte').optional(),
    price: z.number().min(0.01, 'Prix invalide').optional(),
    type: z.nativeEnum(ProductType).optional(),
    unit: z.string().min(1, 'Unité requise').optional(),
    image: z.string().url('URL d\'image invalide').optional(),
    available: z.boolean().optional(),
    acceptDeferred: z.boolean().optional(),
    minOrderQuantity: z.number().min(0, 'Quantité minimale invalide').optional()
  }),
  
  search: z.object({
    q: z.string().optional(),
    type: z.nativeEnum(ProductType).optional(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
    available: z.boolean().optional(),
    producerId: z.string().cuid().optional(),
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10)
  })
}

// Schémas pour les commandes
export const orderSchemas = {
  create: z.object({
    items: z.array(z.object({
      productId: z.string().cuid('ID produit invalide'),
      quantity: z.number().min(0.01, 'Quantité invalide'),
      price: z.number().min(0.01, 'Prix invalide')
    })).min(1, 'Au moins un article requis'),
    metadata: z.string().optional()
  }),
  
  updateStatus: z.object({
    orderId: z.string().cuid('ID commande invalide'),
    status: z.nativeEnum(OrderStatus)
  }),
  
  search: z.object({
    status: z.nativeEnum(OrderStatus).optional(),
    userId: z.string().cuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10)
  })
}

// Schémas pour les créneaux de livraison
export const deliverySlotSchemas = {
  create: z.object({
    productId: z.string().cuid('ID produit invalide'),
    date: z.string().datetime('Date invalide'),
    maxCapacity: z.number().min(0.01, 'Capacité invalide')
  }),
  
  update: z.object({
    date: z.string().datetime('Date invalide').optional(),
    maxCapacity: z.number().min(0.01, 'Capacité invalide').optional(),
    isAvailable: z.boolean().optional()
  }),
  
  book: z.object({
    slotId: z.string().cuid('ID créneau invalide'),
    orderId: z.string().cuid('ID commande invalide'),
    quantity: z.number().min(0.01, 'Quantité invalide')
  })
}

// Schémas pour les factures
export const invoiceSchemas = {
  create: z.object({
    orderId: z.string().cuid('ID commande invalide'),
    amount: z.number().min(0.01, 'Montant invalide'),
    dueDate: z.string().datetime('Date d\'échéance invalide')
  }),
  
  updateStatus: z.object({
    invoiceId: z.string().cuid('ID facture invalide'),
    status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']),
    paidAt: z.string().datetime().optional(),
    paymentMethod: z.string().optional()
  })
}

// Schémas pour les notifications
export const notificationSchemas = {
  create: z.object({
    userId: z.string().cuid('ID utilisateur invalide'),
    type: z.string().min(1, 'Type requis'),
    title: z.string().min(1, 'Titre requis'),
    message: z.string().min(1, 'Message requis'),
    link: z.string().url('URL invalide').optional(),
    data: z.record(z.any()).optional()
  }),
  
  markAsRead: z.object({
    notificationId: z.string().cuid('ID notification invalide')
  })
}

// Schémas pour les paiements
export const paymentSchemas = {
  createIntent: z.object({
    amount: z.number().min(0.5, 'Montant minimum 0.50 CHF'),
    orderId: z.string().cuid('ID commande invalide').optional(),
    invoiceId: z.string().cuid('ID facture invalide').optional()
  }),
  
  webhook: z.object({
    type: z.string().min(1, 'Type d\'événement requis'),
    data: z.record(z.any())
  })
}

// Helper pour valider les données
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`)
    }
    throw error
  }
}