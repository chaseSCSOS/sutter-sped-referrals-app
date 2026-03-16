import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET() {
  try {
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

    if (!user || !hasPermission(user.role, 'placements:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const placements = await prisma.studentPlacement.findMany({
      where: {
        OR: [{ seisConfirmed: false }, { aeriesConfirmed: false }],
        enrollmentStatus: { not: 'EXITED' },
      },
      include: {
        classroom: {
          select: {
            id: true,
            programSilo: true,
            site: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } },
          },
        },
        referral: {
          select: { confirmationNumber: true, studentName: true },
        },
      },
      orderBy: [{ enrollmentStatus: 'asc' }, { studentNameLast: 'asc' }],
    })

    return NextResponse.json({ placements })
  } catch (error) {
    console.error('SEIS/Aeries pending fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch pending confirmations' }, { status: 500 })
  }
}
