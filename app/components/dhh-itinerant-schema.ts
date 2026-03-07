import { z } from 'zod';

export const dhhItinerantReferralSchema = z
  .object({
    // Section 1: Student & School Information
    studentName: z.string().min(1, 'Student name is required'),
    grade: z.string().min(1, 'Grade is required'),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    lea: z.string().min(1, 'LEA is required'),
    schoolSite: z.string().min(1, 'School site is required'),
    generalEdTeacher: z.string().min(1, 'General Ed Teacher name is required'),
    generalEdTeacherContact: z.string().min(1, 'Teacher email/phone is required'),
    otherContact: z.string().optional(),

    // Section 2: Service Type
    serviceType: z.enum(
      ['Screening', 'Assessment', 'DHH Itinerant Service', 'DHH Consult'] as const,
      { message: 'Please select a service type' }
    ),

    // Section 3: Eligibility
    isEligibleForSped: z.enum(['Yes', 'No'] as const, {
      message: 'Please indicate eligibility status',
    }),
    eligibilityIEP: z.object({
      autisticLike: z.boolean(),
      deafness: z.boolean(),
      intellectualDisability: z.boolean(),
      otherHealthImpairment: z.boolean(),
      visualImpairment: z.boolean(),
      deafBlindness: z.boolean(),
      emotionalDisturbance: z.boolean(),
      multipleDisabilities: z.boolean(),
      specificLearningDisability: z.boolean(),
    }),
    eligibility504: z.object({
      hearingImpairment: z.boolean(),
      orthopedicImpairment: z.boolean(),
      speechLanguageImpairment: z.boolean(),
      traumaticBrainInjury: z.boolean(),
    }),

    // Section 4: Reason for Request
    reasonForRequest: z.string().min(1, 'Reason for request is required'),

    // Section 5: Areas of Concern
    areasOfConcern: z.object({
      acoustic: z.boolean(),
      environmentalAdaptations: z.boolean(),
      communication: z.boolean(),
      curriculumAccess: z.boolean(),
      academic: z.boolean(),
      visualAccess: z.boolean(),
      audiological: z.boolean(),
      other: z.boolean(),
      otherDescription: z.string().optional(),
    }),

    // Section 6: Health Status
    historyOfSeizures: z.enum(['Yes', 'No'] as const, { message: 'Required' }),
    visionAdequate: z.enum(['Yes', 'No'] as const, { message: 'Required' }),
    medications: z.enum(['Yes', 'No'] as const, { message: 'Required' }),
    medicationsList: z.string().optional(),
    recentSurgeries: z.enum(['Yes', 'No'] as const, { message: 'Required' }),
    recentSurgeriesDescription: z.string().optional(),
    hearingAid: z.enum(['Yes', 'No'] as const, { message: 'Required' }),
    hearingAidMakeModel: z.string().optional(),
    hasAudiogramChart: z.enum(['Yes', 'No'] as const, { message: 'Required' }),
    hasAudiologyReport: z.enum(['Yes', 'No'] as const, { message: 'Required' }),

    // Section 7: Assistive Listening Devices
    assistiveListeningDevices: z.object({
      fmSystem: z.boolean(),
      soundField: z.boolean(),
      other: z.boolean(),
    }),
    staffKnowledgeALD: z.enum(['Yes', 'No'] as const, { message: 'Required' }),
    additionalTrainingNeeded: z.enum(['Yes', 'No'] as const, { message: 'Required' }),
    aldSufficient: z.enum(['Yes', 'No'] as const, { message: 'Required' }),

    // Section 8: Additional Concerns
    additionalConcerns: z.string().optional(),

    // Section 10: LEA Admin Authorization
    leaAdminName: z.string().min(1, 'LEA Admin name is required'),
    leaAdminCertification: z.boolean().refine((val) => val === true, {
      message: 'You must certify before submitting',
    }),

    // Additional Comments
    additionalComments: z.string().max(500, 'Comments cannot exceed 500 characters').optional(),
  })
  .refine(
    (data) => {
      // If medications = Yes, list is required
      if (data.medications === 'Yes' && !data.medicationsList?.trim()) return false;
      return true;
    },
    { message: 'Please list the medications', path: ['medicationsList'] }
  )
  .refine(
    (data) => {
      if (data.recentSurgeries === 'Yes' && !data.recentSurgeriesDescription?.trim()) return false;
      return true;
    },
    { message: 'Please describe recent surgeries', path: ['recentSurgeriesDescription'] }
  )
  .refine(
    (data) => {
      if (data.hearingAid === 'Yes' && !data.hearingAidMakeModel?.trim()) return false;
      return true;
    },
    { message: 'Please list hearing aid make/model', path: ['hearingAidMakeModel'] }
  )
  .refine(
    (data) => {
      if (data.areasOfConcern.other && !data.areasOfConcern.otherDescription?.trim()) return false;
      return true;
    },
    { message: 'Please describe the other area of concern', path: ['areasOfConcern', 'otherDescription'] }
  );

export type DhhItinerantReferralFormData = z.infer<typeof dhhItinerantReferralSchema>;
