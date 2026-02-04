import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOrderNumber } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { orderSchema } from '@/lib/validation/order'
import type { OrderStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission to submit orders
    const allowedRoles = ['TEACHER', 'SPED_STAFF', 'ADMIN', 'SUPER_ADMIN']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()

    // Validate request body
    const validatedData = orderSchema.parse(body)

    // Calculate total estimated price
    const totalEstimatedPrice = validatedData.items.reduce(
      (sum, item) => sum + item.estimatedPrice * item.quantity,
      0
    )

    // Generate order number
    const orderNumber = generateOrderNumber()

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: 'NEW',
        schoolSite: validatedData.schoolSite,
        justification: validatedData.justification,
        totalEstimatedPrice,
        requestorId: user.id,
        items: {
          create: validatedData.items.map((item) => ({
            itemName: item.itemName,
            itemLink: item.itemLink || null,
            estimatedPrice: item.estimatedPrice,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
        requestor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Create initial status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'NEW',
        changedByUserId: user.id,
        notes: 'Order created',
      },
    })

    return NextResponse.json({
      success: true,
      id: order.id,
      orderNumber: order.orderNumber,
      order,
    })
  } catch (error) {
    console.error('Error creating order:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as OrderStatus | null
    const search = searchParams.get('search')

    // Build where clause based on user role
    const where: any = {}

    // Teachers can only see their own orders
    if (user.role === 'TEACHER') {
      where.requestorId = user.id
    }
    // SPED staff and admins can see all orders

    // Apply status filter
    if (status) {
      where.status = status
    }

    // Apply search filter
    if (search) {
      where.OR = [
        { itemName: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { schoolSite: { contains: search, mode: 'insensitive' } },
      ]
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        requestor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
