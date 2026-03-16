export const DISTRICTS = [
  'YCUSD',
  'LOUSD',
  'Franklin',
  'Meridian',
  'Brittan',
  'PLG',
  'SUHS',
  'MJUSD',
  'Marcum',
  'Nuestro',
  'ENHS',
] as const

export type District = (typeof DISTRICTS)[number]
