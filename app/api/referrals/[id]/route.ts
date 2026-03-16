import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { z } from 'zod'

const updateReferralSchema = z.object({
  // Student Information
  studentName: z.string().min(1).optional(),
  dateOfBirth: z.string().optional(),
  age: z.number().int().positive().optional(),
  grade: z.string().optional(),
  gender: z.string().nullable().optional(),
  fosterYouth: z.boolean().optional(),
  birthplace: z.string().nullable().optional(),
  classroomTeacher: z.string().nullable().optional(),
  pipIndicator: z.boolean().optional(),

  // Contact Information
  parentGuardianName: z.string().optional(),
  homePhone: z.string().nullable().optional(),
  cellPhone: z.string().nullable().optional(),
  homeAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),

  // School Information
  schoolOfAttendance: z.string().nullable().optional(),
  schoolOfResidence: z.string().optional(),
  transportationSpecialEd: z.boolean().optional(),

  // Language & Demographics
  nativeLanguage: z.string().optional(),
  englishLearner: z.boolean().optional(),
  elStartDate: z.string().nullable().optional(),
  redesignated: z.boolean().nullable().optional(),
  reclassificationDate: z.string().nullable().optional(),
  ethnicity: z.string().nullable().optional(),
  residency: z.string().nullable().optional(),

  // Placement
  placementType: z.enum(['FRA', 'SDC']).optional(),
  silo: z.enum(['ASD', 'SD', 'NC', 'DHH', 'MD', 'OT']).nullable().optional(),

  // Disability
  primaryDisability: z.string().optional(),
  disabilities: z.record(z.string(), z.string()).optional(),

  // SPED Dates
  deadlineDate: z.string().optional(),
  spedEntryDate: z.string().nullable().optional(),
  interimPlacementReviewDate: z.string().nullable().optional(),
  triennialDue: z.string().nullable().optional(),
  currentIepDate: z.string().nullable().optional(),
  currentPsychoReportDate: z.string().nullable().optional(),

  // Last Placement
  lastPlacementSchool: z.string().optional(),
  lastPlacementDistrict: z.string().optional(),
  lastPlacementCounty: z.string().optional(),
  lastPlacementState: z.string().optional(),
  lastPlacementPhone: z.string().nullable().optional(),
  lastPlacementContactPerson: z.string().nullable().optional(),

  // Services
  specialEdServices: z.array(z.any()).optional(),
  percentageOutsideGenEd: z.number().int().min(0).max(100).optional(),

  // District Authorization
  leaRepresentativeName: z.string().optional(),
  leaRepresentativePosition: z.string().optional(),
  nonSeisIep: z.boolean().optional(),
  submittedByEmail: z.string().nullable().optional(),
  additionalComments: z.string().nullable().optional(),

  // System Sync
  inSEIS: z.boolean().optional(),
  inSEISDate: z.string().nullable().optional(),
  inAeries: z.boolean().optional(),
  inAeriesDate: z.string().nullable().optional(),
  cumNotes: z.string().nullable().optional(),

  // Operational fields (SPED_STAFF+ only)
  programTrack: z.enum(['GENERAL', 'BEHAVIOR', 'DHH', 'SCIP', 'VIP']).optional(),
  districtOfResidence: z.string().nullable().optional(),
  referringParty: z.string().nullable().optional(),
  dateStudentStartedSchool: z.string().nullable().optional(),
  serviceProvider: z.string().nullable().optional(),

  // Teacher classroom assignment (triggers placement update, not stored on Referral)
  classroomTeacherStaffId: z.string().uuid().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: supabaseUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!hasPermission(user.role, 'referrals:update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const referral = await prisma.referral.findUnique({ where: { id } })
    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateReferralSchema.parse(body)

    // Operational fields require elevated permission
    const operationalFields = ['programTrack', 'districtOfResidence', 'referringParty', 'dateStudentStartedSchool', 'serviceProvider', 'silo']
    const hasOperationalFields = operationalFields.some(f => (validatedData as Record<string, any>)[f] !== undefined)
    if (hasOperationalFields && !hasPermission(user.role, 'referrals:write-operational')) {
      return NextResponse.json({ error: 'Insufficient permissions to update operational fields' }, { status: 403 })
    }

    // Convert date strings to Date objects where needed
    const updateData: Record<string, any> = {}

    const dateFields = [
      'dateOfBirth',
      'elStartDate',
      'reclassificationDate',
      'spedEntryDate',
      'interimPlacementReviewDate',
      'triennialDue',
      'currentIepDate',
      'currentPsychoReportDate',
      'dateStudentStartedSchool',
      'deadlineDate',
      'inSEISDate',
      'inAeriesDate',
    ]

    // Extract classroom teacher staff ID (not a Referral field, handled separately)
    const { classroomTeacherStaffId, ...referralFields } = validatedData

    for (const [key, value] of Object.entries(referralFields)) {
      if (value === undefined) continue
      if (dateFields.includes(key)) {
        updateData[key] = value === null ? null : new Date(value as string)
      } else {
        updateData[key] = value
      }
    }

    const updated = await prisma.referral.update({
      where: { id },
      data: {
        ...updateData,
        lastReviewedAt: new Date(),
        lastReviewedBy: user.name,
      },
    })

    // If a teacher was selected, assign the student to their classroom
    if (classroomTeacherStaffId !== undefined) {
      if (classroomTeacherStaffId === null) {
        // Clear classroom assignment (only if a placement exists)
        await prisma.studentPlacement.updateMany({
          where: { referralId: id },
          data: { classroomId: null },
        })
      } else {
        const classroom = await prisma.classroom.findFirst({
          where: { teacherId: classroomTeacherStaffId },
        })
        if (classroom) {
          // Split student name into first/last for placement record
          const nameParts = updated.studentName.trim().split(' ')
          const studentNameFirst = nameParts[0] || updated.studentName
          const studentNameLast = nameParts.slice(1).join(' ') || nameParts[0] || updated.studentName

          // Upsert: update existing placement or create a new one
          await prisma.studentPlacement.upsert({
            where: { referralId: id },
            update: { classroomId: classroom.id },
            create: {
              referralId: id,
              classroomId: classroom.id,
              studentNameFirst,
              studentNameLast,
              dateOfBirth: updated.dateOfBirth,
              grade: updated.grade,
              schoolYear: classroom.schoolYear,
              districtOfResidence: updated.districtOfResidence ?? null,
              primaryDisability: updated.primaryDisability ?? null,
              disabilityCodes: [],
              enrollmentStatus: 'PLACED_NOT_IN_SYSTEMS',
            },
          })
        }
      }
    }

    return NextResponse.json({ success: true, referral: updated })
  } catch (error) {
    console.error('Error updating referral:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update referral' },
      { status: 500 }
    )
  }
}
