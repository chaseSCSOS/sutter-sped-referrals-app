import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, itemId } = await params
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

    if (!hasPermission(user.role, 'referrals:update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const status = body.status as string | undefined
    const rejectionReason = body.rejectionReason as string | undefined

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const item = await prisma.documentChecklistItem.findFirst({
      where: { id: itemId, referralId: id },
    })

    if (!item) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 })
    }

    const updated = await prisma.documentChecklistItem.update({
      where: { id: itemId },
      data: {
        status: status as any,
        rejectionReason: status === 'REJECTED' ? rejectionReason || 'Rejected by reviewer' : null,
        reviewedAt: new Date(),
        reviewedBy: user.id,
      },
    })

    return NextResponse.json({ checklistItem: updated })
  } catch (error) {
    console.error('Checklist update error:', error)
    return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 })
  }
}
