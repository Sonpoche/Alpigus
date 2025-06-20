// lib/commission-utils.ts

/**
 * Utilitaires pour le calcul des commissions
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

// Calculer la commission sur un montant
export const calculatePlatformFee = (amount: number): number => {
  const percentage = getPlatformFeePercentage()
  return Math.round((amount * percentage / 100) * 100) / 100 // Arrondi à 2 décimales
}

// Calculer le montant producteur (après commission)
export const calculateProducerAmount = (amount: number): number => {
  const fee = calculatePlatformFee(amount)
  return Math.round((amount - fee) * 100) / 100 // Arrondi à 2 décimales
}

// Calculer le montant total avec commission (pour affichage client)
export const calculateTotalWithFee = (subtotal: number): number => {
  const fee = calculatePlatformFee(subtotal)
  return Math.round((subtotal + fee) * 100) / 100 // Arrondi à 2 décimales
}

// Obtenir les détails de commission pour affichage
export interface CommissionBreakdown {
  subtotal: number
  platformFee: number
  producerAmount: number
  total: number
  feePercentage: number
  deliveryFee?: number
  grandTotal?: number
}

export const getCommissionBreakdown = (subtotal: number): CommissionBreakdown => {
  const feePercentage = getPlatformFeePercentage()
  const platformFee = calculatePlatformFee(subtotal)
  const producerAmount = calculateProducerAmount(subtotal)
  const total = calculateTotalWithFee(subtotal)
  
  return {
    subtotal,
    platformFee,
    producerAmount,
    total,
    feePercentage
  }
}