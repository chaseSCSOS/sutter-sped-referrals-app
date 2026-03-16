import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { z } from 'zod'

const createSiteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  district: z.string().nullable().optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!hasPermission(user.role, 'classrooms:view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const sites = await prisma.site.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        district: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ sites })
  } catch (error) {
    console.error('Error fetching sites:', error)
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!hasPermission(user.role, 'sites:manage')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createSiteSchema.parse(body)

    const existing = await prisma.site.findFirst({
      where: { name: { equals: validatedData.name, mode: 'insensitive' } },
    })

    if (existing) {
      return NextResponse.json({ error: 'A site with this name already exists' }, { status: 400 })
    }

    const site = await prisma.site.create({
      data: {
        name: validatedData.name,
        district: validatedData.district || null,
      },
    })

    return NextResponse.json({ site }, { status: 201 })
  } catch (error) {
    console.error('Error creating site:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 })
  }
}
