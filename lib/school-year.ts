export const SCHOOL_YEARS = [
  '2024-2025',
  '2025-2026',
  '2026-2027',
  '2027-2028',
]

export function getCurrentSchoolYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed; July = 6
  // New school year starts in July
  if (month >= 6) {
    return `${year}-${year + 1}`
  }
  return `${year - 1}-${year}`
}
