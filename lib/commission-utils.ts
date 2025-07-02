// lib/commission-utils.ts - VERSION CORRIGÉE

/**
 * Utilitaires pour le calcul des commissions
 * IMPORTANT : La commission est prélevée sur le montant payé par le client,
 * elle n'est PAS ajoutée au prix affiché.
 */

// Récupérer le pourcentage de commission depuis l'environnement
export const getPlatformFeePercentage = (): number => {
  const percentage = process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE
  if (!percentage) {
    console.warn('NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE non définie, utilisation de 5% par défaut')
    return 5
  }
  
  const parsed = parseFloat(percentage)
  if (isNaN(parsed) || parsed < 0 || parsed > 100) {
    console.warn('NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE invalide, utilisation de 5% par défaut')
    return 5
  }
  
  return parsed
}

// Calculer la commission prélevée sur un montant (répartition interne)
export const calculatePlatformFee = (clientPaidAmount: number): number => {
  const percentage = getPlatformFeePercentage()
  return Math.round((clientPaidAmount * percentage / 100) * 100) / 100 // Arrondi à 2 décimales
}

// Calculer le montant producteur (après commission prélevée)
export const calculateProducerAmount = (clientPaidAmount: number): number => {
  const fee = calculatePlatformFee(clientPaidAmount)
  return Math.round((clientPaidAmount - fee) * 100) / 100 // Arrondi à 2 décimales
}

// Obtenir les détails de commission pour affichage (répartition interne)
export interface CommissionBreakdown {
  subtotal: number              // Ce que paie le client (produits)
  platformFee: number           // Commission prélevée (5% du subtotal)
  producerAmount: number        // Ce que reçoit le producteur (95% du subtotal)
  total: number                 // = subtotal (pas de commission ajoutée)
  feePercentage: number
  deliveryFee?: number          // Frais de livraison (ajoutés au total client)
  grandTotal?: number           // Total final client = subtotal + deliveryFee
}

export const getCommissionBreakdown = (subtotal: number): CommissionBreakdown => {
  const feePercentage = getPlatformFeePercentage()
  const platformFee = calculatePlatformFee(subtotal)
  const producerAmount = calculateProducerAmount(subtotal)
  
  return {
    subtotal,                    // Montant des produits
    platformFee,                 // 5% de commission prélevée
    producerAmount,              // 95% pour le producteur
    total: subtotal,             // CORRECTION : pas de commission ajoutée
    feePercentage
  }
}

// Fonction utilitaire pour le calcul total client (avec frais de livraison uniquement)
export const calculateClientTotal = (subtotal: number, deliveryFee: number = 0): number => {
  return Math.round((subtotal + deliveryFee) * 100) / 100
}