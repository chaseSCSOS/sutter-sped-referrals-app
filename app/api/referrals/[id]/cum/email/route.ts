import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { sendCumRequestEmail } from '@/lib/email'
import { z } from 'zod'

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
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

    const referral = await (prisma as any).referral.findUnique({ where: { id } })
    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    const body = await request.json()
    const { to, subject, body: emailBody } = sendEmailSchema.parse(body)

    await sendCumRequestEmail(to, subject, emailBody, id)

    await prisma.note.create({
      data: {
        referralId: id,
        noteType: 'EMAIL',
        content: `CUM request email sent to ${to} — Subject: ${subject}`,
        createdBy: user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('CUM email send error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to send CUM request email' }, { status: 500 })
  }
}
