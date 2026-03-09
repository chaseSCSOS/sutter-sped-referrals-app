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
    const { name, description, sortOrder, isActive } = body

    const category = await prisma.assessmentCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    })
    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error updating assessment category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    await prisma.assessmentCategory.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting assessment category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
