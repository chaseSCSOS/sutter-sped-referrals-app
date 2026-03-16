import { z } from 'zod'

export const createPlacementSchema = z.object({
  referralId: z.string().uuid(),
  classroomId: z.string().uuid().optional().nullable(),
  studentNameFirst: z.string().min(1),
  studentNameLast: z.string().min(1),
  dateOfBirth: z.string().datetime(),
  grade: z.string().min(1),
  districtOfResidence: z.string().optional(),
  disabilityCodes: z.array(z.string()).default([]),
  primaryDisability: z.string().optional(),
  schoolYear: z.string().min(1),
  requires1to1: z.boolean().default(false),
  notes: z.string().optional(),
})

export const updatePlacementSchema = z.object({
  classroomId: z.string().uuid().optional().nullable(),
  enrollmentStatus: z.enum([
    'ACTIVE',
    'REFERRAL_PENDING',
    'REFERRAL_NOT_RECEIVED',
    'REFERRAL_ON_HOLD',
    'PLACED_NOT_IN_SYSTEMS',
    'HOME_INSTRUCTION',
    'RTD_IN_PROGRESS',
    'EXITED',
  ]).optional(),
  requires1to1: z.boolean().optional(),
  notes: z.string().optional(),
  seisConfirmed: z.boolean().optional(),
  aeriesConfirmed: z.boolean().optional(),
})
