import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { supabaseUserId: supabaseUser.id } })
    if (!user || !hasPermission(user.role, 'classrooms:view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const referrals = await prisma.referral.findMany({
      where: { status: 'ACCEPTED_AWAITING_PLACEMENT', placement: null },
      select: {
        id: true,
        confirmationNumber: true,
        studentName: true,
        grade: true,
        silo: true,
        districtOfResidence: true,
        submittedAt: true,
        assignedTo: { select: { name: true } },
      },
      orderBy: { submittedAt: 'asc' },
    })

    const now = new Date()
    const queue = referrals.map(r => {
      const daysElapsed = Math.floor((now.getTime() - new Date(r.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
      return { ...r, daysElapsed, isStale: daysElapsed >= 14, isCritical: daysElapsed >= 30 }
    })

    return NextResponse.json({ queue })
  } catch (error) {
    console.error('Referral queue error:', error)
    return NextResponse.json({ error: 'Failed to fetch referral queue' }, { status: 500 })
  }
}
