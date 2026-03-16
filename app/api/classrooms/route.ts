import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { createClassroomSchema } from '@/lib/validation/classroom'
import type { Prisma, ProgramSilo } from '@prisma/client'
import { z } from 'zod'

const PROGRAM_SILO_VALUES = ['ASD_ELEM', 'ASD_MIDHS', 'SD', 'NC', 'DHH', 'ATP', 'MD'] as const

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

    if (!hasPermission(user.role, 'classrooms:view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const schoolYear = searchParams.get('schoolYear')
    const programSilo = searchParams.get('programSilo')
    const siteId = searchParams.get('siteId')
    const isOpenPositionParam = searchParams.get('isOpenPosition')

    const where: Prisma.ClassroomWhereInput = {}

    if (schoolYear) {
      where.schoolYear = schoolYear
    }

    if (programSilo) {
      if (!PROGRAM_SILO_VALUES.includes(programSilo as ProgramSilo)) {
        return NextResponse.json({ error: 'Invalid programSilo filter' }, { status: 400 })
      }
      where.programSilo = programSilo as ProgramSilo
    }

    if (siteId) {
      where.siteId = siteId
    }

    if (isOpenPositionParam !== null) {
      where.isOpenPosition = isOpenPositionParam === 'true'
    }

    const classrooms = await prisma.classroom.findMany({
      where,
      select: {
        id: true,
        classroomNumber: true,
        programSilo: true,
        siteId: true,
        site: {
          select: {
            id: true,
            name: true,
          },
        },
        gradeStart: true,
        gradeEnd: true,
        sessionNumber: true,
        sessionType: true,
        positionControlNumber: true,
        credentials: true,
        maxCapacity: true,
        schoolYear: true,
        isOpenPosition: true,
        teacherId: true,
        teacher: {
          select: {
            id: true,
            name: true,
            role: true,
            positionControlNumber: true,
          },
        },
        paras: {
          select: {
            id: true,
            name: true,
            role: true,
            positionControlNumber: true,
          },
        },
        _count: {
          select: {
            studentPlacements: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { schoolYear: 'desc' },
        { site: { name: 'asc' } },
        { programSilo: 'asc' },
        { gradeStart: 'asc' },
      ],
    })

    return NextResponse.json({ classrooms })
  } catch (error) {
    console.error('Error fetching classrooms:', error)
    return NextResponse.json({ error: 'Failed to fetch classrooms' }, { status: 500 })
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

    if (!hasPermission(user.role, 'classrooms:create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createClassroomSchema.parse(body)

    // Verify site exists
    const site = await prisma.site.findUnique({ where: { id: validatedData.siteId } })
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 400 })
    }

    // Verify teacher exists (if provided)
    if (validatedData.teacherId) {
      const teacher = await prisma.staffMember.findUnique({ where: { id: validatedData.teacherId } })
      if (!teacher) {
        return NextResponse.json({ error: 'Teacher not found' }, { status: 400 })
      }
    }

    const classroom = await prisma.classroom.create({
      data: {
        classroomNumber: validatedData.classroomNumber || null,
        programSilo: validatedData.programSilo,
        siteId: validatedData.siteId,
        gradeStart: validatedData.gradeStart,
        gradeEnd: validatedData.gradeEnd,
        sessionType: validatedData.sessionType,
        sessionNumber: validatedData.sessionNumber || null,
        positionControlNumber: validatedData.positionControlNumber || null,
        credentials: validatedData.credentials || null,
        maxCapacity: validatedData.maxCapacity ?? null,
        schoolYear: validatedData.schoolYear,
        teacherId: validatedData.teacherId ?? null,
        isOpenPosition: validatedData.isOpenPosition,
      },
      select: {
        id: true,
        classroomNumber: true,
        programSilo: true,
        siteId: true,
        site: {
          select: { id: true, name: true },
        },
        gradeStart: true,
        gradeEnd: true,
        sessionNumber: true,
        sessionType: true,
        positionControlNumber: true,
        credentials: true,
        maxCapacity: true,
        schoolYear: true,
        isOpenPosition: true,
        teacherId: true,
        teacher: {
          select: { id: true, name: true, role: true },
        },
        paras: {
          select: { id: true, name: true, role: true },
        },
        _count: {
          select: { studentPlacements: true },
        },
        createdAt: true,
        updatedAt: true,
      },
    })

    // Assign support staff if provided
    if (validatedData.supportStaffIds && validatedData.supportStaffIds.length > 0) {
      await prisma.staffMember.updateMany({
        where: { id: { in: validatedData.supportStaffIds } },
        data: { classroomId: classroom.id },
      })
    }

    return NextResponse.json({ classroom }, { status: 201 })
  } catch (error) {
    console.error('Error creating classroom:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to create classroom' }, { status: 500 })
  }
}
