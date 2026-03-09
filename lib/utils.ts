import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Generates a unique confirmation number for referrals
 * Format: REF-YYYY-MM-DD-XXX
 */
export function generateConfirmationNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().split('T')[0]
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `REF-${dateStr}-${random}`
}

/**
 * Generates a unique draft number for saved referral drafts
 * Format: DFT-YYYYMMDD-XXXX
 */
export function generateDraftNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `DFT-${dateStr}-${random}`
}

/**
 * Generates a unique order number
 * Format: ORD-YYYY-MM-DD-XXX
 */
export function generateOrderNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().split('T')[0]
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `ORD-${dateStr}-${random}`
}

/**
 * Calculates deadline date (30 days from now)
 */
export function calculateDeadline(days: number = 30): Date {
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + days)
  return deadline
}

/**
 * Formats a date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Calculates days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay))
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
