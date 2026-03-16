import { getMonth } from 'date-fns'

/**
 * ATP age-out date: Jan–Sep birthday → June 30 of year turning 22
 * Oct–Dec birthday → Dec 31 of year turning 22
 */
export function calculateAgeOutDate(dob: Date): Date {
  const ageOutYear = dob.getFullYear() + 22
  const birthMonth = getMonth(dob) // 0-indexed
  if (birthMonth <= 8) { // Jan(0)–Sep(8)
    return new Date(ageOutYear, 5, 30) // June 30
  }
  return new Date(ageOutYear, 11, 31) // Dec 31
}

/**
 * Split "Last, First" or "First Last" into parts.
 */
export function splitStudentName(fullName: string): { first: string; last: string } {
  if (fullName.includes(',')) {
    const [last, ...firstParts] = fullName.split(',').map((s) => s.trim())
    return { first: firstParts.join(' ') || '', last: last || fullName }
  }
  const parts = fullName.trim().split(' ')
  if (parts.length >= 2) {
    return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] }
  }
  return { first: fullName, last: '' }
}
