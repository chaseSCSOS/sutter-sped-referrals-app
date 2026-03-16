import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

const updateClassroomSchema = z.object({
  classroomNumber: z.string().nullable().optional(),
  programSilo: z.enum(['ASD_ELEM', 'ASD_MIDHS', 'SD', 'NC', 'DHH', 'ATP', 'MD']).optional(),
  siteId: z.string().uuid().optional(),
  gradeStart: z.string().min(1).optional(),
  gradeEnd: z.string().min(1).optional(),
  sessionType: z.enum(['AM', 'PM', 'FULL_DAY', 'PERIOD_ATTENDANCE', 'SELF_CONTAINED']).optional(),
  sessionNumber: z.string().nullable().optional(),
  positionControlNumber: z.string().nullable().optional(),
  credentials: z.string().nullable().optional(),
  maxCapacity: z.number().int().positive().nullable().optional(),
  schoolYear: z.string().min(1).optional(),
  teacherId: z.string().uuid().nullable().optional(),
  supportStaffIds: z.array(z.string().uuid()).optional(),
  isOpenPosition: z.boolean().optional(),
})

const CLASSROOM_SELECT = {
  id: true,
  classroomNumber: true,
  programSilo: true,
  siteId: true,
  site: { select: { id: true, name: true, isActive: true } },
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
      credentials: true,
      isVacancy: true,
      isActive: true,
      schoolYear: true,
    },
  },
  paras: {
    select: {
      id: true,
      name: true,
      role: true,
      positionControlNumber: true,
      credentials: true,
      isVacancy: true,
      isActive: true,
      schoolYear: true,
    },
  },
  studentPlacements: {
    select: {
      id: true,
      studentNameFirst: true,
      studentNameLast: true,
      grade: true,
      enrollmentStatus: true,
      primaryDisability: true,
      requires1to1: true,
      seisConfirmed: true,
      aeriesConfirmed: true,
    },
  },
  _count: { select: { studentPlacements: true } },
  createdAt: true,
  updatedAt: true,
} as const

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const classroom = await prisma.classroom.findUnique({
      where: { id },
      select: CLASSROOM_SELECT,
    })

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
    }

    return NextResponse.json({ classroom })
  } catch (error) {
    console.error('Error fetching classroom:', error)
    return NextResponse.json({ error: 'Failed to fetch classroom' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    if (!hasPermission(user.role, 'classrooms:update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const existing = await prisma.classroom.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateClassroomSchema.parse(body)

    // Verify site exists if provided
    if (validatedData.siteId) {
      const site = await prisma.site.findUnique({ where: { id: validatedData.siteId } })
      if (!site) {
        return NextResponse.json({ error: 'Site not found' }, { status: 400 })
      }
    }

    // Verify teacher exists if provided (not null)
    if (validatedData.teacherId) {
      const teacher = await prisma.staffMember.findUnique({ where: { id: validatedData.teacherId } })
      if (!teacher) {
        return NextResponse.json({ error: 'Teacher not found' }, { status: 400 })
      }
    }

    const updateData: Prisma.ClassroomUncheckedUpdateInput = {}
    if (validatedData.classroomNumber !== undefined) updateData.classroomNumber = validatedData.classroomNumber
    if (validatedData.programSilo !== undefined) updateData.programSilo = validatedData.programSilo
    if (validatedData.siteId !== undefined) updateData.siteId = validatedData.siteId
    if (validatedData.gradeStart !== undefined) updateData.gradeStart = validatedData.gradeStart
    if (validatedData.gradeEnd !== undefined) updateData.gradeEnd = validatedData.gradeEnd
    if (validatedData.sessionType !== undefined) updateData.sessionType = validatedData.sessionType
    if (validatedData.sessionNumber !== undefined) updateData.sessionNumber = validatedData.sessionNumber
    if (validatedData.positionControlNumber !== undefined) updateData.positionControlNumber = validatedData.positionControlNumber
    if (validatedData.credentials !== undefined) updateData.credentials = validatedData.credentials
    if (validatedData.maxCapacity !== undefined) updateData.maxCapacity = validatedData.maxCapacity
    if (validatedData.schoolYear !== undefined) updateData.schoolYear = validatedData.schoolYear
    if (validatedData.teacherId !== undefined) updateData.teacherId = validatedData.teacherId
    if (validatedData.isOpenPosition !== undefined) updateData.isOpenPosition = validatedData.isOpenPosition

    // Handle support staff assignment
    if (validatedData.supportStaffIds !== undefined) {
      const newIds = validatedData.supportStaffIds

      // Unassign staff currently linked to this classroom but not in the new list
      await prisma.staffMember.updateMany({
        where: { classroomId: id, id: { notIn: newIds } },
        data: { classroomId: null },
      })

      // Assign new staff members to this classroom
      if (newIds.length > 0) {
        await prisma.staffMember.updateMany({
          where: { id: { in: newIds } },
          data: { classroomId: id },
        })
      }
    }

    const classroom = await prisma.classroom.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        classroomNumber: true,
        programSilo: true,
        siteId: true,
        site: { select: { id: true, name: true } },
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
        teacher: { select: { id: true, name: true, role: true } },
        paras: { select: { id: true, name: true, role: true } },
        _count: { select: { studentPlacements: true } },
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ classroom })
  } catch (error) {
    console.error('Error updating classroom:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update classroom' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    if (!hasPermission(user.role, 'classrooms:delete')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const classroom = await prisma.classroom.findUnique({ where: { id } })
    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
    }

    await prisma.classroom.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting classroom:', error)
    return NextResponse.json({ error: 'Failed to delete classroom' }, { status: 500 })
  }
}
