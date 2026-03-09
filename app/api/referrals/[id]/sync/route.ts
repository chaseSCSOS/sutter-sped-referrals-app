import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { z } from 'zod'

const syncSchema = z.object({
  field: z.enum(['inSEIS', 'inAeries']),
  value: z.boolean(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    if (!hasPermission(user.role, 'referrals:manage-sync')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const referral = await prisma.referral.findUnique({ where: { id } })
    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    const body = await request.json()
    const { field, value } = syncSchema.parse(body)

    const dateField = field === 'inSEIS' ? 'inSEISDate' : 'inAeriesDate'
    const updateData: Record<string, any> = {
      [field]: value,
      [dateField]: value ? new Date() : null,
    }

    const updated = await prisma.referral.update({
      where: { id },
      data: updateData,
    })

    await prisma.note.create({
      data: {
        referralId: id,
        noteType: 'GENERAL',
        content: value
          ? `${field === 'inSEIS' ? 'SEIS' : 'Aeries'} entry confirmed on ${new Date().toLocaleDateString()}`
          : `${field === 'inSEIS' ? 'SEIS' : 'Aeries'} entry status cleared`,
        createdBy: user.id,
      },
    })

    return NextResponse.json({ success: true, referral: updated })
  } catch (error) {
    console.error('Sync update error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update sync status' }, { status: 500 })
  }
}
