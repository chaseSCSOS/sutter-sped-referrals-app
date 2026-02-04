import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@prisma/client'

export async function GET(
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

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        requestor: {
          select: {
            id: true,
            name: true,
            email: true,
            organization: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        statusHistory: {
          include: {
            changedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        notes: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        attachments: {
          orderBy: {
            uploadedAt: 'desc',
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user has permission to view this order
    const canViewAll = ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)
    const isRequestor = order.requestorId === user.id

    if (!canViewAll && !isRequestor) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    // Only SPED staff and admins can update orders
    const canUpdate = ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)
    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const {
      status,
      totalActualPrice,
      trackingNumber,
      vendor,
      purchaseOrderNumber,
      receivedDate,
      notes,
    } = body

    const updateData: any = {}

    if (status) {
      updateData.status = status as OrderStatus
      updateData.lastStatusUpdate = new Date()
    }
    if (totalActualPrice !== undefined) updateData.totalActualPrice = totalActualPrice
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber
    if (vendor !== undefined) updateData.vendor = vendor
    if (purchaseOrderNumber !== undefined) updateData.purchaseOrderNumber = purchaseOrderNumber
    if (receivedDate !== undefined) updateData.receivedDate = new Date(receivedDate)

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
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
    })

    // Create status history if status changed
    if (status) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          status: status as OrderStatus,
          changedByUserId: user.id,
          notes: notes || `Status updated to ${status}`,
        },
      })
    }

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Only requestor or admin can cancel order
    const canCancel = ['ADMIN', 'SUPER_ADMIN'].includes(user.role) || order.requestorId === user.id

    if (!canCancel) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Soft delete by updating status to CANCELLED
    await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        lastStatusUpdate: new Date(),
      },
    })

    // Create status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        status: 'CANCELLED',
        changedByUserId: user.id,
        notes: 'Order cancelled',
      },
    })

    return NextResponse.json({ success: true, message: 'Order cancelled' })
  } catch (error) {
    console.error('Error cancelling order:', error)
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    )
  }
}
