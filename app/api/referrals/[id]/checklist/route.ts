import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const referral = await prisma.referral.findUnique({
      where: { id },
      select: { submittedByUserId: true },
    })

    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    const canViewAll = hasPermission(user.role, 'referrals:view-all')
    const isOwner = referral.submittedByUserId === user.id

    if (!canViewAll && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const checklist = await prisma.documentChecklistItem.findMany({
      where: { referralId: id },
      include: { files: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ checklist })
  } catch (error) {
    console.error('Checklist fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch checklist' }, { status: 500 })
  }
}
