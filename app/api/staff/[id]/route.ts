import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import type { Prisma, StaffRole } from '@prisma/client'
import { z } from 'zod'

const STAFF_ROLE_VALUES = ['TEACHER', 'CLASS_PARA', 'ONE_TO_ONE_PARA', 'INTERPRETER', 'SIGNING_PARA', 'LVN'] as const

const updateStaffMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  role: z.enum(['TEACHER', 'CLASS_PARA', 'ONE_TO_ONE_PARA', 'INTERPRETER', 'SIGNING_PARA', 'LVN']).optional(),
  positionControlNumber: z.string().nullable().optional(),
  credentials: z.string().nullable().optional(),
  schoolYear: z.string().min(1).optional(),
  classroomId: z.string().uuid().nullable().optional(),
  isVacancy: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

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

    if (!hasPermission(user.role, 'staff:view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const staffMember = await prisma.staffMember.findUnique({
      where: { id },
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
            sessionType: true,
            schoolYear: true,
            site: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        oneToOneStudentId: true,
        oneToOneStudent: {
          select: {
            id: true,
            studentNameFirst: true,
            studentNameLast: true,
            grade: true,
            schoolYear: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!staffMember) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    return NextResponse.json({ staffMember })
  } catch (error) {
    console.error('Error fetching staff member:', error)
    return NextResponse.json({ error: 'Failed to fetch staff member' }, { status: 500 })
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

    if (!hasPermission(user.role, 'staff:manage')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const existing = await prisma.staffMember.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateStaffMemberSchema.parse(body)

    const updateData: Prisma.StaffMemberUncheckedUpdateInput = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.role !== undefined) updateData.role = validatedData.role
    if (validatedData.positionControlNumber !== undefined) updateData.positionControlNumber = validatedData.positionControlNumber
    if (validatedData.credentials !== undefined) updateData.credentials = validatedData.credentials
    if (validatedData.schoolYear !== undefined) updateData.schoolYear = validatedData.schoolYear
    if (validatedData.classroomId !== undefined) updateData.classroomId = validatedData.classroomId
    if (validatedData.isVacancy !== undefined) updateData.isVacancy = validatedData.isVacancy
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive

    const staffMember = await prisma.staffMember.update({
      where: { id },
      data: updateData,
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
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ staffMember })
  } catch (error) {
    console.error('Error updating staff member:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
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

    if (!hasPermission(user.role, 'staff:manage')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const staffMember = await prisma.staffMember.findUnique({ where: { id } })
    if (!staffMember) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Auto-create a vacancy record when deleting an active, non-vacancy staff member with a PC#
    if (
      staffMember.isActive &&
      !staffMember.isVacancy &&
      staffMember.positionControlNumber
    ) {
      await prisma.staffMember.create({
        data: {
          name: `Vacancy – ${staffMember.positionControlNumber}`,
          role: staffMember.role,
          positionControlNumber: staffMember.positionControlNumber,
          isVacancy: true,
          isActive: true,
          schoolYear: staffMember.schoolYear,
          classroomId: staffMember.classroomId,
        },
      })
    }

    await prisma.staffMember.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting staff member:', error)
    return NextResponse.json({ error: 'Failed to delete staff member' }, { status: 500 })
  }
}
