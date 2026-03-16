import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
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

    if (!hasPermission(user.role, 'transport:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify the placement exists
    const placement = await prisma.studentPlacement.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!placement) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 })
    }

    // Find or create the TransportRecord for this student
    const record = await prisma.transportRecord.upsert({
      where: { studentId: id },
      create: { studentId: id },
      update: {},
    })

    return NextResponse.json({ transport: record })
  } catch (error) {
    console.error('Transport fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch transport record' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
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

    if (!hasPermission(user.role, 'transport:update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify the placement exists
    const placement = await prisma.studentPlacement.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!placement) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 })
    }

    const body = await request.json()

    // Only allow these fields to be updated
    const allowed = [
      'busNumber',
      'transportType',
      'amPmFlag',
      'specialTransportNotes',
      'isWheelchair',
      'needsCarSeat',
      'needsSafetyVest',
      'needsSafetyLock',
      'needsBusAide',
      'riderAtHome',
      'reducedDaySchedule',
      'transportPending',
    ]

    const data: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) data[key] = body[key]
    }

    const record = await prisma.transportRecord.upsert({
      where: { studentId: id },
      create: { studentId: id, ...data },
      update: data,
    })

    return NextResponse.json({ transport: record })
  } catch (error) {
    console.error('Transport update error:', error)
    return NextResponse.json({ error: 'Failed to update transport record' }, { status: 500 })
  }
}
