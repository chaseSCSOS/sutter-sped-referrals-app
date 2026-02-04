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
  console.log('🔗 Linking existing Supabase users to Prisma database...\n')

  const usersToLink = [
    {
      email: 'chasef@sutter.k12.ca.us',
      name: 'System Admin',
      role: 'SUPER_ADMIN' as const,
      organization: 'Sutter County Superintendent of School',
      jobTitle: 'Information Systems Analyst',
    },
    {
      email: 'janinef@sutter.k12.ca.us',
      name: 'Janine Franklin',
      role: 'ADMIN' as const,
      organization: 'Sutter County Superintendent of Schools',
      jobTitle: 'Assistant Superintendent, Special Education',
    },
    {
      email: 'sped@sutter.k12.ca.us',
      name: 'SPED Staff Member',
      role: 'SPED_STAFF' as const,
      organization: 'Sutter County Superintendent of Schools',
      jobTitle: 'Special Education Coordinator',
    },
  ]

  for (const userData of usersToLink) {
    console.log(`Linking user: ${userData.email}`)

    // Check if already exists in Prisma
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    })

    if (existingUser) {
      console.log(`  ⚠️  User ${userData.email} already exists in Prisma database, skipping...`)
      continue
    }

    try {
      // Get Supabase user by email
      const { data: users, error: listError } = await supabase.auth.admin.listUsers()

      if (listError) {
        console.error(`  ❌ Failed to list Supabase users: ${listError.message}`)
        continue
      }

      const supabaseUser = users.users.find(u => u.email === userData.email)

      if (!supabaseUser) {
        console.log(`  ⚠️  User ${userData.email} not found in Supabase, skipping...`)
        continue
      }

      console.log(`  ✓ Found Supabase user: ${supabaseUser.id}`)

      // Create Prisma user record linked to existing Supabase user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          role: userData.role,
          organization: userData.organization,
          jobTitle: userData.jobTitle,
          supabaseUserId: supabaseUser.id,
          isActive: true,
        },
      })

      console.log(`  ✓ Created Prisma user record: ${user.id}`)
      console.log(`  📧 Email: ${userData.email}\n`)
    } catch (error) {
      console.error(`  ❌ Error linking user ${userData.email}:`, error)
    }
  }

  console.log('✅ User linking completed!')
}

main()
  .catch((e) => {
    console.error('Link failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
