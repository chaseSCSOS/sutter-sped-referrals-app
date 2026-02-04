import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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

    const canViewAll = ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)

    // Fetch recent referrals based on role
    const referralWhere = canViewAll ? {} : { submittedByUserId: user.id }
    const recentReferrals = await prisma.referral.findMany({
      where: referralWhere,
      take: 5,
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        confirmationNumber: true,
        studentName: true,
        status: true,
        submittedAt: true,
        submittedByUser: {
          select: {
            name: true,
          },
        },
      },
    })

    // Fetch recent orders based on role
    let recentOrders: Array<{
      id: string
      orderNumber: string
      status: string
      createdAt: Date
      items: Array<{ itemName: string }>
      requestor: { name: string }
    }> = []

    if (user.role === 'TEACHER') {
      recentOrders = await prisma.order.findMany({
        where: { requestorId: user.id },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          items: {
            select: {
              itemName: true,
            },
            take: 1,
          },
          requestor: {
            select: {
              name: true,
            },
          },
        },
      })
    } else if (canViewAll) {
      recentOrders = await prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          items: {
            select: {
              itemName: true,
            },
            take: 1,
          },
          requestor: {
            select: {
              name: true,
            },
          },
        },
      })
    }

    // Get counts for dashboard cards
    let pendingReferrals = 0
    let pendingOrders = 0

    if (canViewAll) {
      pendingReferrals = await prisma.referral.count({
        where: {
          status: {
            in: ['SUBMITTED', 'UNDER_REVIEW', 'PENDING_ADDITIONAL_INFO'],
          },
        },
      })

      pendingOrders = await prisma.order.count({
        where: {
          status: 'PENDING',
        },
      })
    } else if (user.role === 'EXTERNAL_ORG') {
      pendingReferrals = await prisma.referral.count({
        where: {
          submittedByUserId: user.id,
          status: {
            in: ['SUBMITTED', 'UNDER_REVIEW', 'PENDING_ADDITIONAL_INFO'],
          },
        },
      })
    } else if (user.role === 'TEACHER') {
      pendingOrders = await prisma.order.count({
        where: {
          requestorId: user.id,
          status: 'PENDING',
        },
      })
    }

    return NextResponse.json({
      recentReferrals,
      recentOrders,
      pendingReferrals,
      pendingOrders,
    })
  } catch (error) {
    console.error('Error fetching dashboard activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard activity' },
      { status: 500 }
    )
  }
}
