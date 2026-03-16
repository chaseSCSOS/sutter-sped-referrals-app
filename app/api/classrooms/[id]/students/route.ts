import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!hasPermission(user.role, 'classrooms:view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify the classroom exists
    const classroom = await prisma.classroom.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
    }

    const students = await prisma.studentPlacement.findMany({
      where: { classroomId: id },
      select: {
        id: true,
        studentNameFirst: true,
        studentNameLast: true,
        dateOfBirth: true,
        grade: true,
        districtOfResidence: true,
        disabilityCodes: true,
        primaryDisability: true,
        enrollmentStatus: true,
        schoolYear: true,
        requires1to1: true,
        seisConfirmed: true,
        seisConfirmedAt: true,
        seisConfirmedBy: true,
        aeriesConfirmed: true,
        aeriesConfirmedAt: true,
        aeriesConfirmedBy: true,
        ageOutDate: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        oneToOnePara: {
          select: {
            id: true,
            name: true,
            positionControlNumber: true,
            isVacancy: true,
          },
        },
        referral: {
          select: {
            confirmationNumber: true,
          },
        },
        _count: {
          select: {
            transferEvents: true,
          },
        },
      },
      orderBy: [
        { studentNameLast: 'asc' },
        { studentNameFirst: 'asc' },
      ],
    })

    return NextResponse.json({ students })
  } catch (error) {
    console.error('Error fetching classroom students:', error)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}
