import { z } from 'zod';

// Disability codes schema
const disabilitySchema = z.object({
  '210': z.enum(['', 'P', 'S'] as const).optional(),
  '220': z.enum(['', 'P', 'S'] as const).optional(),
  '230': z.enum(['', 'P', 'S'] as const).optional(),
  '240': z.enum(['', 'P', 'S'] as const).optional(),
  '250': z.enum(['', 'P', 'S'] as const).optional(),
  '260': z.enum(['', 'P', 'S'] as const).optional(),
  '270': z.enum(['', 'P', 'S'] as const).optional(),
  '280': z.enum(['', 'P', 'S'] as const).optional(),
  '290': z.enum(['', 'P', 'S'] as const).optional(),
  '300': z.enum(['', 'P', 'S'] as const).optional(),
  '310': z.enum(['', 'P', 'S'] as const).optional(),
  '320': z.enum(['', 'P', 'S'] as const).optional(),
  '330': z.enum(['', 'P', 'S'] as const).optional(),
  '281': z.enum(['', 'P', 'S'] as const).optional(),
});

// Special Education Service schema (repeatable)
const specialEdServiceSchema = z.object({
  service: z.string().min(1, 'Service is required'),
  serviceType: z.enum(['Individual', 'Group'] as const, {
    message: 'Service type is required',
  }),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().min(1, 'Duration is required'),
  location: z.string().min(1, 'Location is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  serviceProvider: z.string().min(1, 'Service provider is required'),
});

// Main form schema
export const interimReferralSchema = z
  .object({
    // Section 1: Student Information
    studentName: z.string().min(1, 'Student name is required'),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    age: z.number().min(0).max(22, 'Age must be between 0 and 22'),
    grade: z.string().min(1, 'Grade is required'),
    gender: z.string().min(1, 'Gender is required'),
    fosterYouth: z.enum(['Yes', 'No'] as const, {
      message: 'Please indicate foster youth status',
    }),
    birthplace: z.string().min(1, 'Birthplace is required'),

    // Section 2: Contact Information
    parentGuardianName: z.string().min(1, 'Parent/Guardian name is required'),
    homePhone: z.string().optional(),
    cellPhone: z.string().optional(),
    homeAddress: z.string().min(1, 'Home address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z
      .string()
      .regex(/^\d{5}$/, 'Zip code must be 5 digits')
      .min(1, 'Zip code is required'),

    // Section 3: School Information
    schoolOfAttendance: z.string().min(1, 'School of attendance is required'),
    schoolOfResidence: z.string().min(1, 'School of residence is required'),
    transportationSpecialEd: z.enum(['Yes', 'No'] as const, {
      message: 'Transportation status is required',
    }),

    // Section 4: Language & Demographics
    nativeLanguage: z.string().min(1, 'Native language is required'),
    englishLearner: z.enum(['Yes', 'No'] as const, {
      message: 'English Learner status is required',
    }),
    elStartDate: z.string().optional(),
    elBecameDate: z.string().optional(),
    redesignated: z.enum(['Yes', 'No'] as const).optional(),
    reclassificationDate: z.string().optional(),
    ethnicity: z.string().min(1, 'Ethnicity is required'),
    residency: z.string().min(1, 'Residency is required'),

    // Section 5: Placement Type
    placementType: z.enum(['FRA', 'SDC'] as const, {
      message: 'Placement type is required',
    }),

    // Section 5b: Organizational Grouping
    silo: z.string().optional(),

    // Section 6: Disability Information
    disabilities: disabilitySchema,

    // Section 7: Special Education Dates
    spedEntryDate: z.string().min(1, 'SPED entry date is required'),
    triennialDue: z.string().min(1, 'Triennial due date is required'),

    // Document Dates
    currentIepDate: z.string().optional(),
    currentPsychoReportDate: z.string().optional(),
    nonSeisIep: z.enum(['Yes', 'No'] as const, {
      message: 'Please indicate if the IEP is non-SEIS',
    }),

    // Section 8: Last Placement Information
    lastPlacementSchool: z.string().min(1, 'Last placement school is required'),
    lastPlacementDistrict: z.string().min(1, 'Last placement district is required'),
    lastPlacementCounty: z.string().min(1, 'Last placement county is required'),
    lastPlacementState: z.string().min(1, 'Last placement state is required'),
    lastPlacementPhone: z.string().optional(),
    lastPlacementContactPerson: z.string().optional(),

    // Section 9: Special Education Services
    specialEdServices: z.array(specialEdServiceSchema).min(1, 'At least one service is required'),
    percentageOutsideGenEd: z
      .number()
      .min(0, 'Percentage must be between 0 and 100')
      .max(100, 'Percentage must be between 0 and 100'),

    // Section 10: District Authorization
    leaRepresentativeName: z.string().min(1, 'LEA representative name is required'),
    leaRepresentativePosition: z.string().min(1, 'Position is required'),
    districtAdminCertification: z
      .boolean()
      .refine((val) => val === true, {
        message: 'You must certify the accuracy of this information',
      }),

    // Section 12: Additional Information
    additionalComments: z.string().max(500, 'Comments cannot exceed 500 characters').optional(),
  })
  .refine(
    (data) => {
      // If English Learner is Yes, elStartDate is required
      if (data.englishLearner === 'Yes' && !data.elStartDate) {
        return false;
      }
      return true;
    },
    {
      message: 'EL Start Date is required when English Learner is Yes',
      path: ['elStartDate'],
    }
  )
  .refine(
    (data) => {
      // If English Learner is Yes, elBecameDate is required
      if (data.englishLearner === 'Yes' && !data.elBecameDate) {
        return false;
      }
      return true;
    },
    {
      message: 'Date when they became an English learner is required when English Learner is Yes',
      path: ['elBecameDate'],
    }
  )
  .refine(
    (data) => {
      // If English Learner is Yes, redesignated status is required
      if (data.englishLearner === 'Yes' && !data.redesignated) {
        return false;
      }
      return true;
    },
    {
      message: 'Reclassified status is required when English Learner is Yes',
      path: ['redesignated'],
    }
  )
  .refine(
    (data) => {
      // If Redesignated is Yes, reclassificationDate is required
      if (data.redesignated === 'Yes' && !data.reclassificationDate) {
        return false;
      }
      return true;
    },
    {
      message: 'Reclassification Date is required when Reclassified is Yes',
      path: ['reclassificationDate'],
    }
  )
  .refine(
    (data) => {
      // At least one disability must be marked as Primary
      const hasPrimary = Object.values(data.disabilities || {}).some(
        (value) => value === 'P'
      );
      return hasPrimary;
    },
    {
      message: 'At least one disability must be marked as Primary (P)',
      path: ['disabilities'],
    }
  );

export type InterimReferralFormData = z.infer<typeof interimReferralSchema>;
