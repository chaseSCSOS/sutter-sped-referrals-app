import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { USER_ROLE_VALUES } from '@/lib/auth/role-options'
import { sendUserInvitationEmail } from '@/lib/email'
import type { Prisma, UserRole } from '@prisma/client'
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(USER_ROLE_VALUES),
  roleOptionId: z.string().uuid().nullable().optional(),
  organization: z.string().optional(),
  phoneNumber: z.string().optional(),
  jobTitle: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!hasPermission(user.role, 'users:create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createUserSchema.parse(body)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const redirectTo = `${appUrl}/auth/callback?next=/dashboard`

    let selectedRoleOption: { id: string; name: string } | null = null
    if (validatedData.roleOptionId) {
      const roleOption = await prisma.userRoleOption.findUnique({
        where: { id: validatedData.roleOptionId },
        select: {
          id: true,
          name: true,
          baseRole: true,
        },
      })

      if (!roleOption) {
        return NextResponse.json({ error: 'Selected role option was not found' }, { status: 400 })
      }

      if (roleOption.baseRole !== validatedData.role) {
        return NextResponse.json(
          { error: 'Selected role option does not match the assigned permission role' },
          { status: 400 }
        )
      }

      selectedRoleOption = { id: roleOption.id, name: roleOption.name }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth using admin client
    const adminClient = createAdminClient()
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: validatedData.email,
      email_confirm: true,
      user_metadata: {
        name: validatedData.name,
      },
    })

    if (authError || !authData.user) {
      console.error('Supabase auth error:', authError)
      return NextResponse.json(
        { error: 'Failed to create user in authentication system' },
        { status: 500 }
      )
    }

    // Create user in database
    const newUser = await prisma.user.create({
      data: {
        supabaseUserId: authData.user.id,
        email: validatedData.email,
        name: validatedData.name,
        role: validatedData.role,
        roleOptionId: selectedRoleOption?.id ?? null,
        organization: validatedData.organization || null,
        phoneNumber: validatedData.phoneNumber || null,
        jobTitle: validatedData.jobTitle || null,
        isActive: true,
        createdBy: user.id,
      },
    })

    let inviteSent = false
    let warning: string | null = null

    try {
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: validatedData.email,
        options: {
          redirectTo,
        },
      })

      if (linkError || !linkData?.properties?.action_link) {
        console.error('Failed to generate invitation link:', linkError)
        warning = 'User was created, but invitation email could not be sent.'
      } else {
        await sendUserInvitationEmail({
          recipientName: validatedData.name,
          recipientEmail: validatedData.email,
          role: validatedData.role,
          roleLabel: selectedRoleOption?.name,
          actionLink: linkData.properties.action_link,
          sentByName: user.name,
        })
        inviteSent = true
      }
    } catch (inviteError) {
      console.error('Failed to send invitation email:', inviteError)
      warning = 'User was created, but invitation email could not be sent.'
    }

    return NextResponse.json(
      {
        success: true,
        inviteSent,
        warning,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          roleOptionId: newUser.roleOptionId,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating user:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!hasPermission(user.role, 'users:view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const search = searchParams.get('search')

    const where: Prisma.UserWhereInput = {}

    if (role) {
      if (!USER_ROLE_VALUES.includes(role as UserRole)) {
        return NextResponse.json({ error: 'Invalid role filter' }, { status: 400 })
      }
      where.role = role as UserRole
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        roleOption: {
          select: {
            id: true,
            name: true,
            baseRole: true,
          },
        },
        organization: true,
        phoneNumber: true,
        jobTitle: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
