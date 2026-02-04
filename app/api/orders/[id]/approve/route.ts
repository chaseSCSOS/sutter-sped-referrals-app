import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only SPED staff and admins can approve orders
    const canApprove = ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)
    if (!canApprove) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { notes } = body

    const order = await prisma.order.findUnique({
      where: { id },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order status to SHIPPED
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'SHIPPED',
        approverId: user.id,
        approvedAt: new Date(),
        lastStatusUpdate: new Date(),
      },
      include: {
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
    })

    // Create status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        status: 'SHIPPED',
        changedByUserId: user.id,
        notes: notes || 'Order approved and marked as shipped',
      },
    })

    // TODO: Send email notification to requestor

    return NextResponse.json({
      success: true,
      message: 'Order approved successfully',
      order: updatedOrder,
    })
  } catch (error) {
    console.error('Error approving order:', error)
    return NextResponse.json(
      { error: 'Failed to approve order' },
      { status: 500 }
    )
  }
}
