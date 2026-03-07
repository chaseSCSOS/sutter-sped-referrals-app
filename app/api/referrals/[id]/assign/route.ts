import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (!user || !hasPermission(user.role, 'referrals:update')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { staffId } = body

    if (!staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 })
    }

    const staffUser = await prisma.user.findUnique({
      where: { id: staffId },
      select: { id: true, name: true, role: true },
    })

    if (!staffUser || !['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(staffUser.role)) {
      return NextResponse.json({ error: 'Invalid staff member' }, { status: 400 })
    }

    const updatedReferral = await prisma.referral.update({
      where: { id },
      data: { assignedToStaffId: staffId },
      select: {
        id: true,
        assignedToStaff: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(updatedReferral)
  } catch (error) {
    console.error('Assign staff error:', error)
    return NextResponse.json({ error: 'Failed to assign staff' }, { status: 500 })
  }
}
