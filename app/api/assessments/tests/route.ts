import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    const tests = await prisma.assessmentTest.findMany({
      where: {
        isActive: true,
        ...(categoryId && { categoryId }),
      },
      include: {
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ vendor: { name: 'asc' } }, { name: 'asc' }],
    })
    return NextResponse.json({ tests })
  } catch (error) {
    console.error('Error fetching assessment tests:', error)
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 })
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
    const { name, vendorId, categoryId, purchaseUrl, estimatedPrice, isPhysical, notes } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!vendorId) return NextResponse.json({ error: 'Vendor is required' }, { status: 400 })
    if (!categoryId) return NextResponse.json({ error: 'Category is required' }, { status: 400 })

    const test = await prisma.assessmentTest.create({
      data: {
        name: name.trim(),
        vendorId,
        categoryId,
        purchaseUrl: purchaseUrl?.trim() || null,
        estimatedPrice: estimatedPrice ?? 0,
        isPhysical: isPhysical ?? true,
        notes: notes?.trim() || null,
      },
      include: {
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json({ test }, { status: 201 })
  } catch (error) {
    console.error('Error creating assessment test:', error)
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 })
  }
}
