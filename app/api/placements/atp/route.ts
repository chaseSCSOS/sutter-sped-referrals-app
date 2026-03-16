import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET(request: NextRequest) {
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

    if (!hasPermission(user.role, 'placements:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const schoolYear = searchParams.get('schoolYear')

    const whereClause: Record<string, unknown> = {
      classroom: { programSilo: 'ATP' },
      enrollmentStatus: { not: 'EXITED' },
    }

    if (schoolYear) {
      whereClause.schoolYear = schoolYear
    }

    const placements = await prisma.studentPlacement.findMany({
      where: whereClause,
      include: {
        classroom: {
          include: {
            teacher: { select: { id: true, name: true } },
            site: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ ageOutDate: 'asc' }],
    })

    return NextResponse.json({ placements })
  } catch (error) {
    console.error('ATP placements fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch ATP placements' }, { status: 500 })
  }
}
