import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
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

    if (!user || !hasPermission(user.role, 'placements:update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const placement = await prisma.studentPlacement.findUnique({ where: { id } })
    if (!placement) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 })
    }

    const body = await request.json()
    const confirmed = Boolean(body.confirmed)

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.studentPlacement.update({
        where: { id },
        data: {
          seisConfirmed: confirmed,
          seisConfirmedAt: confirmed ? new Date() : null,
          seisConfirmedBy: confirmed ? user.id : null,
        },
      })

      await tx.placementAuditLog.create({
        data: {
          entityType: 'StudentPlacement',
          entityId: id,
          field: 'seisConfirmed',
          oldValue: String(placement.seisConfirmed),
          newValue: String(confirmed),
          changedBy: user.id,
          studentId: id,
        },
      })

      return result
    })

    return NextResponse.json({ placement: updated })
  } catch (error) {
    console.error('SEIS update error:', error)
    return NextResponse.json({ error: 'Failed to update SEIS confirmation' }, { status: 500 })
  }
}
