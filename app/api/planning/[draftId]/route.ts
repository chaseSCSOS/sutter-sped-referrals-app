import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

interface Params { params: Promise<{ draftId: string }> }

export async function GET(request: Request, { params }: Params) {
  try {
    const { draftId } = await params
    const supabase = await createClient()
    const { data: { user: sb } } = await supabase.auth.getUser()
    if (!sb) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { supabaseUserId: sb.id } })
    if (!user || !hasPermission(user.role, 'planning:view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const draft = await prisma.planningDraft.findUnique({
      where: { id: draftId },
      include: {
        draftClassrooms: {
          include: { draftPlacements: true },
          orderBy: [{ programSilo: 'asc' }],
        },
        draftPlacements: { orderBy: [{ studentNameLast: 'asc' }] },
      },
    })
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    return NextResponse.json({ draft })
  } catch (error) {
    console.error('Draft GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { draftId } = await params
    const supabase = await createClient()
    const { data: { user: sb } } = await supabase.auth.getUser()
    if (!sb) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { supabaseUserId: sb.id } })
    if (!user || !hasPermission(user.role, 'planning:view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    // Move a DraftStudentPlacement to a different DraftClassroom
    if (body.movePlacement) {
      const { placementId, toDraftClassroomId } = body.movePlacement
      const updated = await prisma.draftStudentPlacement.update({
        where: { id: placementId },
        data: { draftClassroomId: toDraftClassroomId },
      })
      return NextResponse.json({ placement: updated })
    }
    return NextResponse.json({ error: 'Unknown operation' }, { status: 400 })
  } catch (error) {
    console.error('Draft PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { draftId } = await params
    const supabase = await createClient()
    const { data: { user: sb } } = await supabase.auth.getUser()
    if (!sb) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { supabaseUserId: sb.id } })
    if (!user || !hasPermission(user.role, 'planning:create')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const draft = await prisma.planningDraft.findUnique({ where: { id: draftId } })
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    if (draft.isPublished) return NextResponse.json({ error: 'Cannot delete a published draft' }, { status: 409 })

    await prisma.planningDraft.delete({ where: { id: draftId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Draft DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 })
  }
}
