import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

interface EnrollmentStats {
  totalReferrals: number
  byStatus: Record<string, number>
  byGrade: Record<string, number>
  byPrimaryDisability: Record<string, number>
  bySilo: Record<string, number>
  byPlacementType: Record<string, number>
}

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const supabase = await createClient()
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: supabaseUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check permissions - only SPED_STAFF, ADMIN, SUPER_ADMIN can view reports
    if (!hasPermission(user.role, 'referrals:view-all')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')

    // Build where clause
    const whereClause: any = {}

    if (startDate) {
      whereClause.submittedAt = {
        ...(whereClause.submittedAt || {}),
        gte: new Date(startDate),
      }
    }

    if (endDate) {
      whereClause.submittedAt = {
        ...(whereClause.submittedAt || {}),
        lte: new Date(endDate),
      }
    }

    if (status) {
      whereClause.status = status
    }

    // Fetch all referrals matching filters
    const referrals = await prisma.referral.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        grade: true,
        primaryDisability: true,
        silo: true,
        placementType: true,
        submittedAt: true,
        assignedToStaff: {
          select: {
            name: true,
          },
        },
      },
    })

    // Calculate statistics
    const stats: EnrollmentStats = {
      totalReferrals: referrals.length,
      byStatus: {},
      byGrade: {},
      byPrimaryDisability: {},
      bySilo: {},
      byPlacementType: {},
    }

    referrals.forEach((referral) => {
      // Count by status
      stats.byStatus[referral.status] = (stats.byStatus[referral.status] || 0) + 1

      // Count by grade
      stats.byGrade[referral.grade] = (stats.byGrade[referral.grade] || 0) + 1

      // Count by primary disability
      if (referral.primaryDisability) {
        stats.byPrimaryDisability[referral.primaryDisability] =
          (stats.byPrimaryDisability[referral.primaryDisability] || 0) + 1
      }

      // Count by silo
      const siloKey = referral.silo || 'Unassigned'
      stats.bySilo[siloKey] = (stats.bySilo[siloKey] || 0) + 1

      // Count by placement type
      stats.byPlacementType[referral.placementType] =
        (stats.byPlacementType[referral.placementType] || 0) + 1
    })

    return NextResponse.json({
      stats,
      referrals,
      filters: {
        startDate,
        endDate,
        status,
      },
    })
  } catch (error) {
    console.error('Enrollment report error:', error)
    return NextResponse.json(
      { error: 'Failed to generate enrollment report' },
      { status: 500 }
    )
  }
}
