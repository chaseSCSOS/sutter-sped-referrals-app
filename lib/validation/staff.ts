import { z } from 'zod'

export const createStaffMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['TEACHER', 'CLASS_PARA', 'ONE_TO_ONE_PARA', 'INTERPRETER', 'SIGNING_PARA', 'LVN']),
  positionControlNumber: z.string().optional(),
  credentials: z.string().optional(),
  schoolYear: z.string().min(1, 'School year is required'),
  classroomId: z.string().uuid().optional().nullable(),
})

export type CreateStaffMemberInput = z.infer<typeof createStaffMemberSchema>
