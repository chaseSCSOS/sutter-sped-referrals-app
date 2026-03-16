import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
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

    if (!user || !hasPermission(user.role, 'placements:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10)
    const pageSize = 20
    const skip = (page - 1) * pageSize

    const [logs, total] = await Promise.all([
      prisma.placementAuditLog.findMany({
        where: { studentId: id },
        orderBy: { changedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.placementAuditLog.count({ where: { studentId: id } }),
    ])

    return NextResponse.json({ logs, total, page, pageSize })
  } catch (error) {
    console.error('Audit log fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 })
  }
}
