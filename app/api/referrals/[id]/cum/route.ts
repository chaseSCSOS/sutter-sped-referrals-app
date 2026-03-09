import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { z } from 'zod'
import { buildCumRequestEmailDraft } from '@/lib/email'

const cumStepSchema = z.object({
  step: z.enum(['requested', 'received', 'sent']),
  date: z.string(),
  notes: z.string().optional(),
  staffId: z.string().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    if (!hasPermission(user.role, 'referrals:manage-cum')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const referral = await (prisma as any).referral.findUnique({ where: { id } }) as any
    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    const body = await request.json()
    const { step, date, notes, staffId } = cumStepSchema.parse(body)
    const stepDate = new Date(date)

    let updateData: Record<string, any> = {}
    let auditNote = ''
    let emailDraft: Record<string, string> | null = null

    if (step === 'requested') {
      updateData.cumRequestedDate = stepDate
      if (notes) updateData.cumNotes = notes
      auditNote = `CUM Requested on ${stepDate.toLocaleDateString()}`

      emailDraft = buildCumRequestEmailDraft(referral)
    } else if (step === 'received') {
      if (!referral.cumRequestedDate) {
        return NextResponse.json(
          { error: 'CUM must be requested before it can be received' },
          { status: 400 }
        )
      }
      updateData.cumReceivedDate = stepDate
      if (notes) updateData.cumNotes = (referral.cumNotes ? referral.cumNotes + '\n' : '') + notes
      auditNote = `CUM Received on ${stepDate.toLocaleDateString()}`
    } else if (step === 'sent') {
      if (!referral.cumReceivedDate) {
        return NextResponse.json(
          { error: 'CUM must be received before it can be sent' },
          { status: 400 }
        )
      }
      updateData.cumSentDate = stepDate
      if (staffId) updateData.cumProcessedByStaffId = staffId
      if (notes) updateData.cumNotes = (referral.cumNotes ? referral.cumNotes + '\n' : '') + notes
      auditNote = `CUM Sent to school on ${stepDate.toLocaleDateString()}`
    }

    const updated = await prisma.referral.update({
      where: { id },
      data: updateData,
    })

    await prisma.note.create({
      data: {
        referralId: id,
        noteType: 'GENERAL',
        content: auditNote + (notes ? ` — Notes: ${notes}` : ''),
        createdBy: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      referral: updated,
      emailDraft,
    })
  } catch (error) {
    console.error('CUM workflow error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update CUM workflow' }, { status: 500 })
  }
}
