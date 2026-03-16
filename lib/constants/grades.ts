export const GRADE_VALUES = [
  'Pre-TK',
  'TK',
  'K',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '18-22',
  'Mixed',
] as const

export type GradeValue = (typeof GRADE_VALUES)[number]

/** Formats a grade range for display. */
export function formatGradeRange(gradeStart: string, gradeEnd: string): string {
  if (gradeStart === gradeEnd) return gradeStart
  return `${gradeStart}–${gradeEnd}`
}
