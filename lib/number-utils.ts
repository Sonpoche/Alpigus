// lib/number-utils.ts
/**
 * Utilitaires pour le formatage des nombres
 * Standardise l'affichage à maximum 2 décimales dans toute l'application
 */

/**
 * Formate un nombre avec maximum 2 décimales, sans zéros inutiles
 * @param num - Le nombre à formater
 * @returns Le nombre formaté en string (ex: 1.5 au lieu de 1.50)
 */
export const formatNumber = (num: number): string => {
  if (isNaN(num)) return '0'
  return parseFloat(num.toFixed(2)).toString()
}

/**
 * Formate un prix avec maximum 2 décimales
 * @param price - Le prix à formater
 * @param currency - La devise (défaut: 'CHF')
 * @returns Le prix formaté (ex: "1.50 CHF")
 */
export const formatPrice = (price: number, currency: string = 'CHF'): string => {
  if (isNaN(price)) return `0 ${currency}`
  return `${formatNumber(price)} ${currency}`
}

/**
 * Formate un prix simple sans devise
 * @param price - Le prix à formater
 * @returns Le prix formaté sans zéros inutiles (ex: "1.5" au lieu de "1.50")
 */
export const formatPriceSimple = (price: number): string => {
  if (isNaN(price)) return '0'
  return formatNumber(price)
}

/**
 * Formate une quantité avec son unité
 * @param quantity - La quantité à formater
 * @param unit - L'unité (ex: 'kg', 'g', 'pièces')
 * @returns La quantité formatée avec unité (ex: "1.5 kg")
 */
export const formatQuantity = (quantity: number, unit: string): string => {
  if (isNaN(quantity)) return `0 ${unit}`
  return `${formatNumber(quantity)} ${unit}`
}

/**
 * Parse une valeur d'input et la limite à 2 décimales
 * @param value - La valeur à parser (string ou number)
 * @returns Le nombre parsé et limité à 2 décimales
 */
export const parseToTwoDecimals = (value: string | number): number => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return 0
  return parseFloat(num.toFixed(2))
}

/**
 * Valide qu'un input ne dépasse pas 2 décimales
 * @param value - La valeur à valider
 * @returns true si valide, false sinon
 */
export const isValidDecimalInput = (value: string): boolean => {
  const regex = /^\d+(\.\d{0,2})?$/
  return regex.test(value) || value === ''
}

/**
 * Formate un input pour n'accepter que 2 décimales max
 * @param value - La valeur de l'input
 * @returns La valeur formatée pour l'input
 */
export const formatInputValue = (value: string): string => {
  // Permet seulement les chiffres et un point
  const cleaned = value.replace(/[^\d.]/g, '')
  
  // Empêche plusieurs points
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('')
  }
  
  // Limite à 2 décimales
  if (parts[1] && parts[1].length > 2) {
    return parts[0] + '.' + parts[1].substring(0, 2)
  }
  
  return cleaned
}