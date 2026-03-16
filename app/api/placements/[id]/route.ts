import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { updatePlacementSchema } from '@/lib/validation/placement'
import type { EnrollmentStatus } from '@prisma/client'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

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

    const placement = await prisma.studentPlacement.findUnique({
      where: { id },
      include: {
        classroom: {
          include: {
            site: true,
            teacher: true,
            paras: true,
          },
        },
        referral: true,
        transferEvents: {
          orderBy: { effectiveDate: 'desc' },
        },
        rtdChecklist: true,
        transportRecord: true,
        oneToOnePara: true,
        auditLogs: {
          orderBy: { changedAt: 'desc' },
        },
      },
    })

    if (!placement) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 })
    }

    return NextResponse.json({ placement })
  } catch (error) {
    console.error('Placement fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch placement' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

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

    if (!hasPermission(user.role, 'placements:update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Validate request body
    const parseResult = updatePlacementSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const data = parseResult.data

    // Fetch existing placement for diffing
    const existing = await prisma.studentPlacement.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 })
    }

    // Build update payload and audit entries
    const updateData: Record<string, unknown> = {}
    const auditEntries: Array<{
      field: string
      oldValue: string | null
      newValue: string | null
    }> = []

    if (data.classroomId !== undefined && data.classroomId !== existing.classroomId) {
      updateData.classroomId = data.classroomId
      auditEntries.push({
        field: 'classroomId',
        oldValue: existing.classroomId ?? null,
        newValue: data.classroomId ?? null,
      })
    }

    if (data.enrollmentStatus !== undefined && data.enrollmentStatus !== existing.enrollmentStatus) {
      updateData.enrollmentStatus = data.enrollmentStatus as EnrollmentStatus
      auditEntries.push({
        field: 'enrollmentStatus',
        oldValue: existing.enrollmentStatus,
        newValue: data.enrollmentStatus,
      })
    }

    if (data.requires1to1 !== undefined && data.requires1to1 !== existing.requires1to1) {
      updateData.requires1to1 = data.requires1to1
      auditEntries.push({
        field: 'requires1to1',
        oldValue: String(existing.requires1to1),
        newValue: String(data.requires1to1),
      })
    }

    if (data.notes !== undefined && data.notes !== existing.notes) {
      updateData.notes = data.notes
      auditEntries.push({
        field: 'notes',
        oldValue: existing.notes ?? null,
        newValue: data.notes,
      })
    }

    if (data.seisConfirmed !== undefined && data.seisConfirmed !== existing.seisConfirmed) {
      updateData.seisConfirmed = data.seisConfirmed
      if (data.seisConfirmed) {
        updateData.seisConfirmedAt = new Date()
        updateData.seisConfirmedBy = user.id
      }
      auditEntries.push({
        field: 'seisConfirmed',
        oldValue: String(existing.seisConfirmed),
        newValue: String(data.seisConfirmed),
      })
    }

    if (data.aeriesConfirmed !== undefined && data.aeriesConfirmed !== existing.aeriesConfirmed) {
      updateData.aeriesConfirmed = data.aeriesConfirmed
      if (data.aeriesConfirmed) {
        updateData.aeriesConfirmedAt = new Date()
        updateData.aeriesConfirmedBy = user.id
      }
      auditEntries.push({
        field: 'aeriesConfirmed',
        oldValue: String(existing.aeriesConfirmed),
        newValue: String(data.aeriesConfirmed),
      })
    }

    // Run update + audit logs in a transaction
    const placement = await prisma.$transaction(async (tx) => {
      const updated = await tx.studentPlacement.update({
        where: { id },
        data: updateData,
      })

      if (auditEntries.length > 0) {
        await tx.placementAuditLog.createMany({
          data: auditEntries.map((entry) => ({
            entityType: 'StudentPlacement',
            entityId: id,
            field: entry.field,
            oldValue: entry.oldValue,
            newValue: entry.newValue,
            changedBy: user.id,
            studentId: id,
          })),
        })
      }

      return updated
    })

    return NextResponse.json({ placement })
  } catch (error) {
    console.error('Placement update error:', error)
    return NextResponse.json({ error: 'Failed to update placement' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

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

    if (!hasPermission(user.role, 'placements:delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.studentPlacement.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 })
    }

    await prisma.studentPlacement.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Placement deleted' })
  } catch (error) {
    console.error('Placement delete error:', error)
    return NextResponse.json({ error: 'Failed to delete placement' }, { status: 500 })
  }
}
