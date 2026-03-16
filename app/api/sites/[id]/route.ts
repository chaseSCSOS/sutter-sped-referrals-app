import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { z } from 'zod'

const updateSiteSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  district: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    const site = await prisma.site.findUnique({ where: { id } })
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateSiteSchema.parse(body)

    if (validatedData.name && validatedData.name !== site.name) {
      const existing = await prisma.site.findFirst({
        where: {
          name: { equals: validatedData.name, mode: 'insensitive' },
          id: { not: id },
        },
      })
      if (existing) {
        return NextResponse.json({ error: 'A site with this name already exists' }, { status: 400 })
      }
    }

    const updatedSite = await prisma.site.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json({ site: updatedSite })
  } catch (error) {
    console.error('Error updating site:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update site' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    const site = await prisma.site.findUnique({ where: { id } })
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    await prisma.site.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting site:', error)
    return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 })
  }
}
