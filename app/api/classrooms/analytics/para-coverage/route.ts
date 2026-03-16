import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { getCurrentSchoolYear } from '@/lib/school-year'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { supabaseUserId: supabaseUser.id } })
    if (!user || !hasPermission(user.role, 'classrooms:view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const schoolYear = request.nextUrl.searchParams.get('schoolYear') ?? getCurrentSchoolYear()

    const classrooms = await prisma.classroom.findMany({
      where: { schoolYear },
      include: {
        site: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        studentPlacements: {
          where: { requires1to1: true, enrollmentStatus: { not: 'EXITED' } },
          include: { oneToOnePara: { select: { id: true, name: true, isVacancy: true } } },
        },
      },
      orderBy: [{ programSilo: 'asc' }, { site: { name: 'asc' } }],
    })

    const coverage = classrooms
      .filter(c => c.studentPlacements.length > 0)
      .map(c => ({
        classroomId: c.id,
        teacherName: c.teacher?.name ?? 'Open Position',
        siteName: c.site.name,
        programSilo: c.programSilo,
        totalRequiring1to1: c.studentPlacements.length,
        assigned: c.studentPlacements.filter(p => p.oneToOnePara && !p.oneToOnePara.isVacancy).length,
        vacant: c.studentPlacements.filter(p => !p.oneToOnePara || p.oneToOnePara.isVacancy).length,
        students: c.studentPlacements.map(p => ({
          id: p.id,
          name: `${p.studentNameLast}, ${p.studentNameFirst}`,
          paraName: p.oneToOnePara?.isVacancy ? null : (p.oneToOnePara?.name ?? null),
          isVacant: !p.oneToOnePara || p.oneToOnePara.isVacancy,
        })),
      }))

    const totals = {
      totalRequiring1to1: coverage.reduce((s, c) => s + c.totalRequiring1to1, 0),
      totalAssigned: coverage.reduce((s, c) => s + c.assigned, 0),
      totalVacant: coverage.reduce((s, c) => s + c.vacant, 0),
    }

    return NextResponse.json({ coverage, totals, schoolYear })
  } catch (error) {
    console.error('Para coverage error:', error)
    return NextResponse.json({ error: 'Failed to fetch para coverage' }, { status: 500 })
  }
}
