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
      select: { submittedByUserId: true, releaseOfInformation: true },
    })

    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    const canViewAll = hasPermission(user.role, 'referrals:view-all')
    const isOwner = referral.submittedByUserId === user.id

    if (!canViewAll && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ releaseOfInformation: referral.releaseOfInformation })
  } catch (error) {
    console.error('Release info fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch release info' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    if (!hasPermission(user.role, 'referrals:update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    const updated = await prisma.releaseOfInformationMetadata.upsert({
      where: { referralId: id },
      create: { referralId: id, ...body },
      update: { ...body },
    })

    return NextResponse.json({ releaseOfInformation: updated })
  } catch (error) {
    console.error('Release info update error:', error)
    return NextResponse.json({ error: 'Failed to update release info' }, { status: 500 })
  }
}
