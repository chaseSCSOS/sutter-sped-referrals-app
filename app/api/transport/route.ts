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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!hasPermission(user.role, 'transport:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const placements = await prisma.studentPlacement.findMany({
      where: { enrollmentStatus: { not: 'EXITED' } },
      include: {
        classroom: {
          include: {
            site: true,
            teacher: true,
          },
        },
        referral: {
          select: { confirmationNumber: true },
        },
        transportRecord: true,
      },
      orderBy: [
        { classroom: { site: { name: 'asc' } } },
        { studentNameLast: 'asc' },
      ],
    })

    return NextResponse.json({ placements })
  } catch (error) {
    console.error('Transport list fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch transport data' }, { status: 500 })
  }
}
