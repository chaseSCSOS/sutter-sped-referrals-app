import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const confirmationNumber = searchParams.get('confirmation')

    if (!confirmationNumber) {
      return NextResponse.json(
        { error: 'Confirmation number is required' },
        { status: 400 }
      )
    }

    // Find referral by confirmation number (public - no auth required)
    const referral = await prisma.referral.findUnique({
      where: { confirmationNumber },
      select: {
        id: true,
        confirmationNumber: true,
        status: true,
        studentName: true,
        grade: true,
        placementType: true,
        submittedAt: true,
        deadlineDate: true,
        rejectionReason: true,
        missingItems: true,
        lastReviewedAt: true,
      },
    })

    if (!referral) {
      return NextResponse.json(
        { error: 'Referral not found. Please check your confirmation number and try again.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ referral })
  } catch (error) {
    console.error('Status lookup error:', error)
    return NextResponse.json(
      { error: 'Failed to lookup referral status' },
      { status: 500 }
    )
  }
}
