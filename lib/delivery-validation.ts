// lib/delivery-validation.ts
import { DeliverySlot } from '@prisma/client'

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

interface DailyCapacity {
  date: Date
  totalCapacity: number
  totalReserved: number
  slots: DeliverySlot[]
}

export const MAX_DAILY_DELIVERIES = 10 // Nombre maximum de livraisons par jour
export const MAX_DAILY_CAPACITY = 100 // Capacité maximale en kg par jour

export function validateNewDeliverySlots(
  newSlots: { date: Date; maxCapacity: number }[],
  existingSlots: DeliverySlot[],
  productUnit: string
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  // Regrouper tous les créneaux par jour (existants + nouveaux)
  const dailyCapacities = new Map<string, DailyCapacity>()

  // Ajouter les créneaux existants
  existingSlots.forEach(slot => {
    const dateKey = slot.date.toISOString().split('T')[0]
    if (!dailyCapacities.has(dateKey)) {
      dailyCapacities.set(dateKey, {
        date: slot.date,
        totalCapacity: 0,
        totalReserved: 0,
        slots: []
      })
    }
    const day = dailyCapacities.get(dateKey)!
    day.totalCapacity += slot.maxCapacity
    day.totalReserved += slot.reserved
    day.slots.push(slot)
  })

  // Vérifier les nouveaux créneaux
  newSlots.forEach(newSlot => {
    const dateKey = newSlot.date.toISOString().split('T')[0]
    if (!dailyCapacities.has(dateKey)) {
      dailyCapacities.set(dateKey, {
        date: newSlot.date,
        totalCapacity: 0,
        totalReserved: 0,
        slots: []
      })
    }
    const day = dailyCapacities.get(dateKey)!
    day.totalCapacity += newSlot.maxCapacity

    // Vérifier le nombre de créneaux par jour
    if (day.slots.length + 1 > MAX_DAILY_DELIVERIES) {
      result.errors.push(
        `Le nombre maximum de livraisons par jour (${MAX_DAILY_DELIVERIES}) serait dépassé le ${formatDate(newSlot.date)}`
      )
      result.isValid = false
    }

    // Vérifier la capacité totale par jour
    const newTotalCapacity = day.totalCapacity
    if (newTotalCapacity > MAX_DAILY_CAPACITY) {
      result.errors.push(
        `La capacité maximale journalière (${MAX_DAILY_CAPACITY} ${productUnit}) serait dépassée le ${formatDate(newSlot.date)}`
      )
      result.isValid = false
    }

    // Avertissements pour les charges importantes
    if (newTotalCapacity > MAX_DAILY_CAPACITY * 0.8) {
      result.warnings.push(
        `La charge sera élevée le ${formatDate(newSlot.date)} (${newTotalCapacity} ${productUnit})`
      )
    }
  })

  return result
}

// Fonction utilitaire pour formater les dates
function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}