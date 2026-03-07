import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supabaseUserId, email, name, organization, role } = body

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Create user in database (pending approval)
    const user = await prisma.user.create({
      data: {
        supabaseUserId,
        email,
        name,
        organization: organization || null,
        role,
        isActive: role === 'TEACHER' || role === 'EXTERNAL_ORG' ? false : true, // Require approval for external users
      },
    })

    return NextResponse.json(
      { success: true, user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create user account' },
      { status: 500 }
    )
  }
}
