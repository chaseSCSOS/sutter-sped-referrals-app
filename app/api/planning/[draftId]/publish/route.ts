import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

interface Params { params: Promise<{ draftId: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { draftId } = await params
    const supabase = await createClient()
    const { data: { user: sb } } = await supabase.auth.getUser()
    if (!sb) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { supabaseUserId: sb.id } })
    if (!user || !hasPermission(user.role, 'planning:publish')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const draft = await prisma.planningDraft.findUnique({
      where: { id: draftId },
      include: {
        draftPlacements: true,
        draftClassrooms: true,
      },
    })
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    if (draft.isPublished) return NextResponse.json({ error: 'Already published' }, { status: 409 })

    await prisma.$transaction(async (tx) => {
      // For each draft placement that has a source, check if classroom changed
      for (const dp of draft.draftPlacements) {
        if (!dp.sourcePlacementId) continue
        const sourcePlacement = await tx.studentPlacement.findUnique({
          where: { id: dp.sourcePlacementId },
        })
        if (!sourcePlacement) continue

        // Find the live classroom id corresponding to the draft classroom
        const draftClassroom = draft.draftClassrooms.find(dc => dc.id === dp.draftClassroomId)
        const targetClassroomId = draftClassroom?.sourceClassroomId ?? null

        if (targetClassroomId !== sourcePlacement.classroomId) {
          // Create a TransferEvent
          await tx.transferEvent.create({
            data: {
              studentId: dp.sourcePlacementId,
              fromClassroomId: sourcePlacement.classroomId ?? null,
              toClassroomId: targetClassroomId,
              effectiveDate: new Date(),
              reason: 'CASELOAD_BALANCE',
              initiatedBy: user.id,
              notes: `Published from planning draft: ${draft.name}`,
            },
          })
          // Update live placement
          await tx.studentPlacement.update({
            where: { id: dp.sourcePlacementId },
            data: {
              classroomId: targetClassroomId,
              seisConfirmed: false,
              aeriesConfirmed: false,
              enrollmentStatus: 'PLACED_NOT_IN_SYSTEMS',
            },
          })
          // Audit log
          await tx.placementAuditLog.create({
            data: {
              entityType: 'StudentPlacement',
              entityId: dp.sourcePlacementId,
              field: 'classroomId',
              oldValue: sourcePlacement.classroomId ?? null,
              newValue: targetClassroomId,
              changedBy: user.id,
              studentId: dp.sourcePlacementId,
            },
          })
        }
      }

      // Mark draft as published
      await tx.planningDraft.update({
        where: { id: draftId },
        data: { isPublished: true, publishedAt: new Date() },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Draft publish error:', error)
    return NextResponse.json({ error: 'Failed to publish draft' }, { status: 500 })
  }
}
