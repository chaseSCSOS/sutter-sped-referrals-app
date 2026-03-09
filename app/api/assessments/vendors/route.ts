import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendors = await prisma.assessmentVendor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ vendors })
  } catch (error) {
    console.error('Error fetching assessment vendors:', error)
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
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
    const { name, description, website } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const vendor = await prisma.assessmentVendor.create({
      data: { name: name.trim(), description: description?.trim() || null, website: website?.trim() || null },
    })
    return NextResponse.json({ vendor }, { status: 201 })
  } catch (error) {
    console.error('Error creating assessment vendor:', error)
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 })
  }
}
