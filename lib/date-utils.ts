// lib/date-utils.ts
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Formate une date en chaîne YYYY-MM-DD
 */
export function formatDateToYYYYMMDD(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Formate une date en jour de la semaine et date en français
 * Exemple: "lundi 11 mars 2025"
 */
export function formatDateToFrench(date: Date): string {
  return format(date, 'EEEE d MMMM yyyy', { locale: fr });
}

/**
 * Vérifie si une date est aujourd'hui ou dans le futur (ignorant l'heure)
 */
export function isDateTodayOrFuture(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  return checkDate >= today;
}

/**
 * Vérifie si une date est antérieure à la date d'aujourd'hui (sans considérer l'heure)
 */
export function isDateBeforeToday(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateToCheck = new Date(date);
  dateToCheck.setHours(0, 0, 0, 0);
  return dateToCheck < today;
}

/**
 * Convertit une chaîne de date en objet Date
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Calcule le temps restant en minutes entre maintenant et une date cible
 */
export function getMinutesRemaining(targetDate: Date): number {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60)));
}