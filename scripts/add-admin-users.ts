import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  console.log('🔐 Adding new admin users...\n')

  const newAdminUsers = [
    {
      email: 'leiab@sutter.k12.ca.us',
      name: 'Leia Balderrama',
      role: 'ADMIN' as const,
      organization: 'Sutter County Superintendent of Schools',
      jobTitle: 'Administrator',
    },
    {
      email: 'amandc@sutter.k12.ca.us',
      name: 'Amanda Cearly',
      role: 'ADMIN' as const,
      organization: 'Sutter County Superintendent of Schools',
      jobTitle: 'Administrator',
    },
    {
      email: 'jamiel@sutter.k12.ca.us',
      name: 'Jamie Lomeli',
      role: 'ADMIN' as const,
      organization: 'Sutter County Superintendent of Schools',
      jobTitle: 'Administrator',
    },
  ]

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectTo = `${appUrl}/auth/callback?next=/dashboard`

  for (const userData of newAdminUsers) {
    console.log(`Creating user: ${userData.email}`)

    // Check if user already exists in database
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    })

    if (existingUser) {
      console.log(`  ⚠️  User ${userData.email} already exists in database, skipping...`)
      continue
    }

    try {
      // Create Supabase Auth user WITHOUT a password
      // This will require them to set a password on first login
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: userData.name,
        },
      })

      if (authError) {
        console.error(`  ❌ Failed to create Supabase auth user: ${authError.message}`)
        continue
      }

      if (!authData.user) {
        console.error(`  ❌ No user returned from Supabase`)
        continue
      }

      console.log(`  ✓ Created Supabase auth user: ${authData.user.id}`)

      // Create database user record
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          role: userData.role,
          organization: userData.organization,
          jobTitle: userData.jobTitle,
          supabaseUserId: authData.user.id,
          isActive: true,
        },
      })

      console.log(`  ✓ Created database user record: ${user.id}`)

      // Generate password reset link
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: userData.email,
        options: {
          redirectTo,
        },
      })

      if (linkError || !linkData?.properties?.action_link) {
        console.error(`  ❌ Failed to generate password reset link: ${linkError?.message}`)
        console.log(`  ⚠️  User created but you'll need to manually send a password reset link`)
      } else {
        console.log(`  ✓ Password reset link generated:`)
        console.log(`  🔗 ${linkData.properties.action_link}`)
        console.log(`  📧 Send this link to ${userData.email}\n`)
      }
    } catch (error) {
      console.error(`  ❌ Error creating user ${userData.email}:`, error)
    }
  }

  console.log('✅ Admin user creation completed!')
  console.log('\n📝 Next steps:')
  console.log('   1. Send the password reset links to each user via email')
  console.log('   2. Users will click the link and set their own secure password')
  console.log('   3. Users can then log in with their email and new password\n')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
