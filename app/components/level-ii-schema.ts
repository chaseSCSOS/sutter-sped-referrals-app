import { z } from 'zod';

export const levelIIReferralSchema = z
  .object({
    // Section 1: Student Identification
    studentName: z.string().min(1, 'Student name is required'),
    grade: z.string().min(1, 'Grade is required'),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    birthplace: z.string().min(1, 'Birthplace is required'),
    fosterYouth: z.enum(['Yes', 'No'] as const, {
      message: 'Please indicate foster youth status',
    }),

    // EL dates (conditional on grade / home language survey being relevant)
    elStartDate: z.string().optional(),
    reclassificationDate: z.string().optional(),

    // Reports from Other Agencies sub-checkboxes
    reportsOtherAgencies: z.object({
      regionalCenter: z.boolean(),
      medical: z.boolean(),
      otPt: z.boolean(),
      speechLanguage: z.boolean(),
      mentalHealth: z.boolean(),
    }),

    // Audiogram applicability flag
    audiogramApplicable: z.boolean(),

    // Section 3: District Authorization
    districtAdminName: z.string().min(1, 'District admin name is required'),
    districtAdminEmail: z.string().email('Valid email is required'),
    districtAdminCertification: z.boolean().refine((val) => val === true, {
      message: 'You must certify the accuracy of this information before submitting',
    }),

    // Section 4: Additional Comments
    additionalComments: z.string().max(500, 'Comments cannot exceed 500 characters').optional(),
  });

export type LevelIIReferralFormData = z.infer<typeof levelIIReferralSchema>;
