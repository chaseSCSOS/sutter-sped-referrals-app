import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { transferSchema } from '@/lib/validation/placement'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
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

    if (!user || !hasPermission(user.role, 'placements:transfer')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const placement = await prisma.studentPlacement.findUnique({
      where: { id },
      include: { oneToOnePara: true },
    })

    if (!placement) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = transferSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { toClassroomId, effectiveDate, reason, notes } = parsed.data

    const targetClassroom = await prisma.classroom.findUnique({ where: { id: toClassroomId } })
    if (!targetClassroom) {
      return NextResponse.json({ error: 'Target classroom not found' }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create TransferEvent
      const transfer = await tx.transferEvent.create({
        data: {
          studentId: placement.id,
          fromClassroomId: placement.classroomId ?? null,
          toClassroomId,
          effectiveDate: new Date(effectiveDate),
          reason,
          initiatedBy: user.id,
          notes: notes ?? null,
        },
      })

      // 2. Update StudentPlacement
      const updated = await tx.studentPlacement.update({
        where: { id },
        data: {
          classroomId: toClassroomId,
          seisConfirmed: false,
          seisConfirmedAt: null,
          seisConfirmedBy: null,
          aeriesConfirmed: false,
          aeriesConfirmedAt: null,
          aeriesConfirmedBy: null,
          enrollmentStatus: 'PLACED_NOT_IN_SYSTEMS',
        },
      })

      // 3. If student has a 1:1 para, move them to new classroom and create a vacant slot in old one
      if (placement.oneToOnePara) {
        // Update the para's classroomId to the new classroom
        await tx.staffMember.update({
          where: { id: placement.oneToOnePara.id },
          data: { classroomId: toClassroomId },
        })

        // Create a VACANT 1:1 para in the old classroom
        if (placement.classroomId) {
          await tx.staffMember.create({
            data: {
              name: 'VACANT',
              role: 'ONE_TO_ONE_PARA',
              isVacancy: true,
              schoolYear: placement.schoolYear,
              classroomId: placement.classroomId,
            },
          })
        }
      }

      // 4. Audit log
      await tx.placementAuditLog.create({
        data: {
          entityType: 'StudentPlacement',
          entityId: id,
          field: 'transfer',
          oldValue: placement.classroomId ?? null,
          newValue: toClassroomId,
          changedBy: user.id,
          studentId: id,
        },
      })

      return { updated, transfer }
    })

    return NextResponse.json({ placement: result.updated, transfer: result.transfer })
  } catch (error) {
    console.error('Transfer error:', error)
    return NextResponse.json({ error: 'Failed to transfer student' }, { status: 500 })
  }
}
