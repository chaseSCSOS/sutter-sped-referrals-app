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

    const settings = await prisma.emailSettings.findFirst()

    return NextResponse.json({
      orderNotifyEmails: settings?.orderNotifyEmails ?? [],
      referralNotifyEmails: settings?.referralNotifyEmails ?? [],
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
    const { orderNotifyEmails, referralNotifyEmails } = body

    if (!Array.isArray(orderNotifyEmails) || !Array.isArray(referralNotifyEmails)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const existing = await prisma.emailSettings.findFirst()

    let settings
    if (existing) {
      settings = await prisma.emailSettings.update({
        where: { id: existing.id },
        data: {
          orderNotifyEmails,
          referralNotifyEmails,
          updatedById: user.id,
        },
      })
    } else {
      settings = await prisma.emailSettings.create({
        data: {
          orderNotifyEmails,
          referralNotifyEmails,
          updatedById: user.id,
        },
      })
    }

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Error saving email settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
