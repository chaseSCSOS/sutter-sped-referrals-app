import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const settings = await (prisma as any).emailSettings.findFirst()

    return NextResponse.json({
      orderNotifyEmails: settings?.orderNotifyEmails ?? [],
      referralNotifyEmails: settings?.referralNotifyEmails ?? [],
      cumReminderDays: settings?.cumReminderDays ?? 10,
      seisAeriesReminderDays: settings?.seisAeriesReminderDays ?? 5,
    })
  } catch (error) {
    console.error('Error fetching email settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { orderNotifyEmails, referralNotifyEmails, cumReminderDays, seisAeriesReminderDays } = body

    if (!Array.isArray(orderNotifyEmails) || !Array.isArray(referralNotifyEmails)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const existing = await (prisma as any).emailSettings.findFirst()

    const sharedData: Record<string, any> = {
      orderNotifyEmails,
      referralNotifyEmails,
      updatedById: user.id,
    }
    if (typeof cumReminderDays === 'number') sharedData.cumReminderDays = cumReminderDays
    if (typeof seisAeriesReminderDays === 'number') sharedData.seisAeriesReminderDays = seisAeriesReminderDays

    let settings
    if (existing) {
      settings = await (prisma as any).emailSettings.update({
        where: { id: existing.id },
        data: sharedData,
      })
    } else {
      settings = await (prisma as any).emailSettings.create({
        data: sharedData,
      })
    }

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Error saving email settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
