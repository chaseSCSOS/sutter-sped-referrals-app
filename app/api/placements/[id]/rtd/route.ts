import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

interface RouteParams {
  params: Promise<{ id: string }>
}

// RTD step fields — maps each boolean step to its timestamp and actor fields
const STEP_FIELDS = {
  dorNotified: { at: 'dorNotifiedAt', by: 'dorNotifiedBy' },
  parentNotified: { at: 'parentNotifiedAt', by: 'parentNotifiedBy' },
  secondStaffingCompleted: { at: 'secondStaffingAt', by: 'secondStaffingBy' },
  transitionIepHeld: { at: 'transitionIepAt', by: 'transitionIepBy' },
  packetCompleted: { at: 'packetCompletedAt', by: 'packetCompletedBy' },
  packetSignedScanned: { at: 'packetSignedAt', by: 'packetSignedBy' },
  aeriesExitCompleted: { at: 'aeriesExitAt', by: 'aeriesExitBy' },
  seisExitCompleted: { at: 'seisExitAt', by: 'seisExitBy' },
} as const

export async function GET(_request: Request, { params }: RouteParams) {
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

    if (!hasPermission(user.role, 'placements:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify the student placement exists
    const placement = await prisma.studentPlacement.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!placement) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 })
    }

    // Get or auto-create the RTD checklist for this student
    const checklist = await prisma.rTDChecklist.upsert({
      where: { studentId: id },
      create: { studentId: id },
      update: {},
    })

    return NextResponse.json({ checklist })
  } catch (error) {
    console.error('RTD checklist fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch RTD checklist' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
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

    if (!hasPermission(user.role, 'rtd:update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify the student placement exists
    const placement = await prisma.studentPlacement.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!placement) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 })
    }

    const body = await request.json()
    const { step, completed } = body as { step: string; completed: boolean }

    if (!step || !(step in STEP_FIELDS)) {
      return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
    }

    if (typeof completed !== 'boolean') {
      return NextResponse.json({ error: 'completed must be a boolean' }, { status: 400 })
    }

    const fields = STEP_FIELDS[step as keyof typeof STEP_FIELDS]

    const updateData: Record<string, unknown> = {
      [step]: completed,
      [fields.at]: completed ? new Date() : null,
      [fields.by]: completed ? user.id : null,
    }

    const checklist = await prisma.rTDChecklist.upsert({
      where: { studentId: id },
      create: { studentId: id, ...updateData },
      update: updateData,
    })

    // Create audit log entry
    await prisma.placementAuditLog.create({
      data: {
        entityType: 'RTDChecklist',
        entityId: checklist.id,
        field: step,
        newValue: String(completed),
        changedBy: user.id,
        studentId: id,
      },
    })

    return NextResponse.json({ checklist })
  } catch (error) {
    console.error('RTD checklist update error:', error)
    return NextResponse.json({ error: 'Failed to update RTD checklist' }, { status: 500 })
  }
}
