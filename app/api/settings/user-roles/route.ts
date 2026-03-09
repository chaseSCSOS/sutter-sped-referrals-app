import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getSystemRoleOptions, USER_ROLE_VALUES } from '@/lib/auth/role-options'
import { z } from 'zod'

const createUserRoleOptionSchema = z.object({
  name: z.string().trim().min(2).max(60),
  baseRole: z.enum(USER_ROLE_VALUES),
})

async function getAuthorizedUser() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const user = await prisma.user.findUnique({
    where: { supabaseUserId: authUser.id },
  })

  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user }
}

export async function GET() {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error) return auth.error

    const customRoleOptions = await prisma.userRoleOption.findMany({
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        baseRole: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      roleOptions: [
        ...getSystemRoleOptions(),
        ...customRoleOptions.map((roleOption) => ({
          id: roleOption.id,
          name: roleOption.name,
          baseRole: roleOption.baseRole,
          isSystem: false,
        })),
      ],
      customRoleOptions,
    })
  } catch (error) {
    console.error('Error loading user role options:', error)
    return NextResponse.json({ error: 'Failed to load user role options' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error) return auth.error

    const body = await request.json()
    const validatedData = createUserRoleOptionSchema.parse(body)
    const name = validatedData.name.trim()

    const duplicateSystemRole = getSystemRoleOptions().some(
      (role) => role.name.toLowerCase() === name.toLowerCase()
    )

    if (duplicateSystemRole) {
      return NextResponse.json(
        { error: 'That role name is already used by a built-in role.' },
        { status: 400 }
      )
    }

    const existing = await prisma.userRoleOption.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json({ error: 'A role with that name already exists.' }, { status: 400 })
    }

    const created = await prisma.userRoleOption.create({
      data: {
        name,
        baseRole: validatedData.baseRole,
        createdById: auth.user.id,
      },
      select: {
        id: true,
        name: true,
        baseRole: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        roleOption: {
          id: created.id,
          name: created.name,
          baseRole: created.baseRole,
          isSystem: false,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating user role option:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create user role option' }, { status: 500 })
  }
}
