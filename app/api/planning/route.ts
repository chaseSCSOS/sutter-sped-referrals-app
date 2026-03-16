import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { getCurrentSchoolYear } from '@/lib/school-year'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: sb } } = await supabase.auth.getUser()
    if (!sb) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { supabaseUserId: sb.id } })
    if (!user || !hasPermission(user.role, 'planning:view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const schoolYear = request.nextUrl.searchParams.get('schoolYear') ?? getCurrentSchoolYear()
    const drafts = await prisma.planningDraft.findMany({
      where: { schoolYear },
      include: {
        _count: { select: { draftClassrooms: true, draftPlacements: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ drafts })
  } catch (error) {
    console.error('Planning GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: sb } } = await supabase.auth.getUser()
    if (!sb) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { supabaseUserId: sb.id } })
    if (!user || !hasPermission(user.role, 'planning:create')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { name, description, schoolYear } = body
    if (!name || !schoolYear) return NextResponse.json({ error: 'name and schoolYear required' }, { status: 400 })

    // Clone live classrooms and placements into the draft
    const liveClassrooms = await prisma.classroom.findMany({
      where: { schoolYear },
      include: { studentPlacements: { where: { enrollmentStatus: { not: 'EXITED' } } } },
    })

    const draft = await prisma.$transaction(async (tx) => {
      const d = await tx.planningDraft.create({
        data: { name, description: description ?? null, schoolYear, createdBy: user.id },
      })

      for (const c of liveClassrooms) {
        const dc = await tx.draftClassroom.create({
          data: {
            draftId: d.id,
            sourceClassroomId: c.id,
            programSilo: c.programSilo,
            siteId: c.siteId,
            gradeStart: c.gradeStart,
            gradeEnd: c.gradeEnd,
            sessionType: c.sessionType,
            positionControlNumber: c.positionControlNumber ?? null,
            credentials: c.credentials ?? null,
            isOpenPosition: c.isOpenPosition,
          },
        })
        for (const p of c.studentPlacements) {
          await tx.draftStudentPlacement.create({
            data: {
              draftId: d.id,
              sourcePlacementId: p.id,
              draftClassroomId: dc.id,
              studentNameFirst: p.studentNameFirst,
              studentNameLast: p.studentNameLast,
              grade: p.grade,
              primaryDisability: p.primaryDisability ?? null,
              requires1to1: p.requires1to1,
            },
          })
        }
      }
      return d
    })

    return NextResponse.json({ draft }, { status: 201 })
  } catch (error) {
    console.error('Planning POST error:', error)
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 })
  }
}
