import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const categories = await prisma.assessmentCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching assessment categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { supabaseUserId: supabaseUser.id } })
    if (!user || !hasPermission(user.role, 'assessments:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, sortOrder } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const category = await prisma.assessmentCategory.create({
      data: { name: name.trim(), description: description?.trim() || null, sortOrder: sortOrder ?? 0 },
    })
    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Error creating assessment category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
