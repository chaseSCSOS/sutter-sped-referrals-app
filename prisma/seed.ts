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
  console.log('🌱 Starting seed...\n')

  // Admin users to create
  const adminUsers = [
    {
      email: 'chasef@sutter.k12.ca.us',
      password: 'Seliaria1023!',
      name: 'System Admin',
      role: 'SUPER_ADMIN' as const,
      organization: 'Sutter County Superintendent of School',
      jobTitle: 'Information Systems Analyst',
    },
    {
      email: 'janinef@sutter.k12.ca.us',
      password: 'Janine123!',
      name: 'Janine Franklin',
      role: 'ADMIN' as const,
      organization: 'Sutter County Superintendent of Schools',
      jobTitle: 'Assistant Superintendent, Special Education',
    },
    {
      email: 'teacher@sutter.k12.ca.us',
      password: 'Teacher123!',
      name: 'Sarah Johnson',
      role: 'TEACHER' as const,
      organization: 'Sutter County School District',
      jobTitle: 'Special Education Teacher',
    },
    {
      email: 'agency@example.com',
      password: 'Agency123!',
      name: 'Community Services Agency',
      role: 'EXTERNAL_ORG' as const,
      organization: 'Valley Community Services',
      jobTitle: 'Referral Coordinator',
    },
  ]

  for (const userData of adminUsers) {
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
      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Auto-confirm email
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
      console.log(`  📧 Login: ${userData.email} / ${userData.password}\n`)
    } catch (error) {
      console.error(`  ❌ Error creating user ${userData.email}:`, error)
    }
  }

  // Create sample SPED staff user
  console.log('Creating SPED staff user...')
  const spedEmail = 'sped@sutter.k12.ca.us'

  const existingSped = await prisma.user.findUnique({
    where: { email: spedEmail },
  })

  if (!existingSped) {
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: spedEmail,
        password: 'Sped123!', // Change this!
        email_confirm: true,
      })

      if (authError) {
        console.error(`  ❌ Failed to create SPED staff auth user: ${authError.message}`)
      } else if (authData.user) {
        await prisma.user.create({
          data: {
            email: spedEmail,
            name: 'SPED Staff Member',
            role: 'SPED_STAFF',
            organization: 'Sutter County Superintendent of Schools',
            jobTitle: 'Special Education Coordinator',
            supabaseUserId: authData.user.id,
            isActive: true,
          },
        })
        console.log(`  ✓ Created SPED staff user`)
        console.log(`  📧 Login: ${spedEmail} / Sped123!\n`)
      }
    } catch (error) {
      console.error(`  ❌ Error creating SPED staff user:`, error)
    }
  } else {
    console.log(`  ⚠️  SPED staff user already exists, skipping...\n`)
  }

  console.log('✅ Seed completed!')
  console.log('\n⚠️  IMPORTANT: Change the default passwords after first login!\n')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
