import { z } from 'zod'

export const createClassroomSchema = z.object({
  classroomNumber: z.string().optional(),
  programSilo: z.enum(['ASD_ELEM', 'ASD_MIDHS', 'SD', 'NC', 'DHH', 'ATP', 'MD']),
  siteId: z.string().uuid(),
  gradeStart: z.string().min(1),
  gradeEnd: z.string().min(1),
  sessionType: z.enum(['AM', 'PM', 'FULL_DAY', 'PERIOD_ATTENDANCE', 'SELF_CONTAINED']),
  sessionNumber: z.string().optional(),
  positionControlNumber: z.string().optional(),
  credentials: z.string().optional(),
  maxCapacity: z.number().int().positive().optional().nullable(),
  schoolYear: z.string().min(1),
  teacherId: z.string().uuid().optional().nullable(),
  supportStaffIds: z.array(z.string().uuid()).optional(),
  isOpenPosition: z.boolean().default(false),
})

export type CreateClassroomData = z.infer<typeof createClassroomSchema>
