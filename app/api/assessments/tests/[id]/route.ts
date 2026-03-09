import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()
  if (!supabaseUser) return null
  const user = await prisma.user.findUnique({ where: { supabaseUserId: supabaseUser.id } })
  if (!user || !hasPermission(user.role, 'assessments:manage')) return null
  return user
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const { name, vendorId, categoryId, purchaseUrl, estimatedPrice, isPhysical, notes, isActive } = body

    const test = await prisma.assessmentTest.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(vendorId !== undefined && { vendorId }),
        ...(categoryId !== undefined && { categoryId }),
        ...(purchaseUrl !== undefined && { purchaseUrl: purchaseUrl?.trim() || null }),
        ...(estimatedPrice !== undefined && { estimatedPrice }),
        ...(isPhysical !== undefined && { isPhysical }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json({ test })
  } catch (error) {
    console.error('Error updating assessment test:', error)
    return NextResponse.json({ error: 'Failed to update test' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    await prisma.assessmentTest.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting assessment test:', error)
    return NextResponse.json({ error: 'Failed to delete test' }, { status: 500 })
  }
}
