import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { createStaffMemberSchema } from '@/lib/validation/staff'
import type { Prisma, StaffRole } from '@prisma/client'
import { z } from 'zod'

const STAFF_ROLE_VALUES = ['TEACHER', 'CLASS_PARA', 'ONE_TO_ONE_PARA', 'INTERPRETER', 'SIGNING_PARA', 'LVN'] as const

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!hasPermission(user.role, 'staff:view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const schoolYear = searchParams.get('schoolYear')
    const role = searchParams.get('role')
    const isActiveParam = searchParams.get('isActive')

    const where: Prisma.StaffMemberWhereInput = {}

    if (schoolYear) {
      where.schoolYear = schoolYear
    }

    if (role) {
      if (!STAFF_ROLE_VALUES.includes(role as StaffRole)) {
        return NextResponse.json({ error: 'Invalid role filter' }, { status: 400 })
      }
      where.role = role as StaffRole
    }

    if (isActiveParam !== null) {
      where.isActive = isActiveParam === 'true'
    }

    const staffMembers = await prisma.staffMember.findMany({
      where,
      select: {
        id: true,
        name: true,
        role: true,
        positionControlNumber: true,
        credentials: true,
        isVacancy: true,
        isActive: true,
        schoolYear: true,
        classroomId: true,
        classroom: {
          select: {
            id: true,
            programSilo: true,
            gradeStart: true,
            gradeEnd: true,
            site: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        oneToOneStudentId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { schoolYear: 'desc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json({ staffMembers })
  } catch (error) {
    console.error('Error fetching staff members:', error)
    return NextResponse.json({ error: 'Failed to fetch staff members' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!hasPermission(user.role, 'staff:manage')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createStaffMemberSchema.parse(body)

    const staffMember = await prisma.staffMember.create({
      data: {
        name: validatedData.name,
        role: validatedData.role,
        positionControlNumber: validatedData.positionControlNumber || null,
        credentials: validatedData.credentials || null,
        schoolYear: validatedData.schoolYear,
        classroomId: validatedData.classroomId || null,
        isVacancy: false,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        positionControlNumber: true,
        credentials: true,
        isVacancy: true,
        isActive: true,
        schoolYear: true,
        classroomId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ staffMember }, { status: 201 })
  } catch (error) {
    console.error('Error creating staff member:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 })
  }
}
