import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { createPlacementSchema } from '@/lib/validation/placement'
import { calculateAgeOutDate } from '@/lib/utils/placement-helpers'
import type { EnrollmentStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
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

    if (!hasPermission(user.role, 'placements:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const schoolYear = searchParams.get('schoolYear')
    const classroomId = searchParams.get('classroomId')
    const enrollmentStatus = searchParams.get('enrollmentStatus')
    const programSilo = searchParams.get('programSilo')

    const whereClause: Record<string, unknown> = {}

    if (schoolYear) {
      whereClause.schoolYear = schoolYear
    }

    if (classroomId) {
      whereClause.classroomId = classroomId
    }

    if (enrollmentStatus) {
      whereClause.enrollmentStatus = enrollmentStatus as EnrollmentStatus
    }

    if (programSilo) {
      whereClause.classroom = {
        programSilo,
      }
    }

    const placements = await prisma.studentPlacement.findMany({
      where: whereClause,
      include: {
        classroom: {
          select: {
            id: true,
            programSilo: true,
            siteId: true,
            site: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } },
          },
        },
        referral: {
          select: {
            id: true,
            confirmationNumber: true,
            studentName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ placements })
  } catch (error) {
    console.error('Placements fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch placements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
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

    if (!hasPermission(user.role, 'placements:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Validate request body
    const parseResult = createPlacementSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const data = parseResult.data

    // Check for existing placement on this referralId
    const existing = await prisma.studentPlacement.findUnique({
      where: { referralId: data.referralId },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'A placement already exists for this referral' },
        { status: 409 }
      )
    }

    // Fetch the referral to get current status
    const referral = await prisma.referral.findUnique({
      where: { id: data.referralId },
    })
    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    // Calculate ageOutDate
    const dob = new Date(data.dateOfBirth)
    const ageOutDate = calculateAgeOutDate(dob)

    // Determine initial enrollment status
    const enrollmentStatus: EnrollmentStatus = data.classroomId
      ? 'PLACED_NOT_IN_SYSTEMS'
      : 'REFERRAL_PENDING'

    // Run transaction
    const result = await prisma.$transaction(async (tx) => {
      // a. Create StudentPlacement
      const placement = await tx.studentPlacement.create({
        data: {
          referralId: data.referralId,
          classroomId: data.classroomId ?? null,
          studentNameFirst: data.studentNameFirst,
          studentNameLast: data.studentNameLast,
          dateOfBirth: dob,
          grade: data.grade,
          districtOfResidence: data.districtOfResidence ?? null,
          disabilityCodes: data.disabilityCodes,
          primaryDisability: data.primaryDisability ?? null,
          schoolYear: data.schoolYear,
          requires1to1: data.requires1to1,
          notes: data.notes ?? null,
          enrollmentStatus,
          ageOutDate,
        },
      })

      // b. If requires1to1 and classroomId, create a VACANT ONE_TO_ONE_PARA StaffMember
      if (data.requires1to1 && data.classroomId) {
        await tx.staffMember.create({
          data: {
            name: 'VACANT',
            role: 'ONE_TO_ONE_PARA',
            isVacancy: true,
            schoolYear: data.schoolYear,
            classroomId: data.classroomId,
            oneToOneStudentId: placement.id,
          },
        })
      }

      // c. Update Referral status to COMPLETED
      await tx.referral.update({
        where: { id: data.referralId },
        data: { status: 'COMPLETED' },
      })

      // d. Create StatusHistory entry
      await tx.statusHistory.create({
        data: {
          referralId: data.referralId,
          fromStatus: referral.status,
          toStatus: 'COMPLETED',
          changedBy: user.id,
          reason: 'Student placed in classroom',
        },
      })

      // e. Create PlacementAuditLog
      await tx.placementAuditLog.create({
        data: {
          entityType: 'StudentPlacement',
          entityId: placement.id,
          field: 'created',
          newValue: JSON.stringify({ classroomId: data.classroomId ?? null, enrollmentStatus }),
          changedBy: user.id,
          studentId: placement.id,
        },
      })

      return placement
    })

    return NextResponse.json({ placement: result }, { status: 201 })
  } catch (error) {
    console.error('Placement creation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create placement',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
