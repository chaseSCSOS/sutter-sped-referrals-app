import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOrderNumber } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { orderSchema } from '@/lib/validation/order'
import type { OrderStatus, OrderType } from '@prisma/client'
import { sendOrderSubmittedToStaff, sendOrderSubmittedToRequestor, getEmailSettings } from '@/lib/email'

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

    const isProtocol = body.orderType === 'PROTOCOL_ASSESSMENT'

    // For supply orders use Zod schema; for protocol orders validate manually
    let schoolSite: string
    let justification: string
    let items: Array<{ itemName: string; itemLink?: string; estimatedPrice: number; quantity: number; assessmentTestId?: string }>

    if (isProtocol) {
      if (!body.schoolSite?.trim()) return NextResponse.json({ error: 'School/site is required' }, { status: 400 })
      if (!body.justification?.trim() || body.justification.trim().length < 20) return NextResponse.json({ error: 'Justification must be at least 20 characters' }, { status: 400 })
      if (!Array.isArray(body.items) || body.items.length === 0) return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
      schoolSite = body.schoolSite.trim()
      justification = body.justification.trim()
      items = body.items
    } else {
      const validatedData = orderSchema.parse(body)
      schoolSite = validatedData.schoolSite
      justification = validatedData.justification
      items = validatedData.items
    }

    // Calculate total estimated price
    const totalEstimatedPrice = items.reduce(
      (sum, item) => sum + (Number(item.estimatedPrice) || 0) * (Number(item.quantity) || 1),
      0
    )

    // Generate order number
    const orderNumber = generateOrderNumber()

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: 'NEW',
        orderType: isProtocol ? 'PROTOCOL_ASSESSMENT' : 'SUPPLY',
        assessmentCategoryId: isProtocol ? (body.assessmentCategoryId || null) : null,
        schoolSite,
        justification,
        totalEstimatedPrice,
        requestorId: user.id,
        items: {
          create: items.map((item) => ({
            itemName: item.itemName,
            itemLink: item.itemLink || null,
            estimatedPrice: Number(item.estimatedPrice) || 0,
            quantity: Number(item.quantity) || 1,
            assessmentTestId: item.assessmentTestId || null,
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

    // Send email notifications (fire-and-forget)
    const emailData = {
      orderNumber: order.orderNumber,
      orderId: order.id,
      requestorName: order.requestor.name,
      requestorEmail: order.requestor.email,
      schoolSite: order.schoolSite,
      itemCount: order.items.length,
      items: order.items.map((i: any) => ({
        itemName: i.itemName,
        quantity: i.quantity,
        estimatedPrice: Number(i.estimatedPrice),
      })),
      totalEstimatedPrice: Number(order.totalEstimatedPrice),
      submittedAt: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    }

    getEmailSettings().then(({ orderNotifyEmails }) => {
      sendOrderSubmittedToStaff(orderNotifyEmails, emailData).catch(err =>
        console.error('[email] staff order notify failed:', err)
      )
      sendOrderSubmittedToRequestor(emailData).catch(err =>
        console.error('[email] requestor order confirm failed:', err)
      )
    }).catch(err => console.error('[email] settings load failed:', err))

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
    const orderType = searchParams.get('orderType') as OrderType | null
    const search = searchParams.get('search')
    const scope = searchParams.get('scope')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause based on user role
    const where: any = {}

    // Force own-only scope when requested; TEACHER is always own-only.
    if (scope === 'own' || user.role === 'TEACHER') {
      where.requestorId = user.id
    }
    // SPED staff and admins can see all orders

    // Apply status filter
    if (status) {
      where.status = status
    }

    // Apply order type filter
    if (orderType) {
      where.orderType = orderType
    }

    // Apply search filter
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { schoolSite: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
