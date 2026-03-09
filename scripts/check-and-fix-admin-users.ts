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
  console.log('🔍 Checking admin users status...\n')

  const usersToCheck = [
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

  for (const userData of usersToCheck) {
    console.log(`\nChecking: ${userData.email}`)

    // Check database
    const dbUser = await prisma.user.findUnique({
      where: { email: userData.email },
    })

    if (dbUser) {
      console.log(`  ✓ Database record exists (ID: ${dbUser.id})`)
      console.log(`    - Name: ${dbUser.name}`)
      console.log(`    - Role: ${dbUser.role}`)
      console.log(`    - Active: ${dbUser.isActive}`)
      
      // Generate password reset link for existing users
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: userData.email,
        options: {
          redirectTo,
        },
      })

      if (linkError || !linkData?.properties?.action_link) {
        console.log(`    ⚠️  Could not generate password reset link`)
      } else {
        console.log(`    🔗 Password reset link: ${linkData.properties.action_link}`)
      }
    } else {
      console.log(`  ⚠️  No database record found`)
      
      // Try to find the Supabase auth user
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError) {
        console.log(`    ❌ Error listing Supabase users: ${listError.message}`)
        continue
      }

      const authUser = users.find(u => u.email === userData.email)
      
      if (authUser) {
        console.log(`  ✓ Found Supabase auth user (ID: ${authUser.id})`)
        console.log(`    Creating database record...`)
        
        try {
          const newDbUser = await prisma.user.create({
            data: {
              email: userData.email,
              name: userData.name,
              role: userData.role,
              organization: userData.organization,
              jobTitle: userData.jobTitle,
              supabaseUserId: authUser.id,
              isActive: true,
            },
          })
          
          console.log(`    ✓ Database record created (ID: ${newDbUser.id})`)
          
          // Generate password reset link
          const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: userData.email,
            options: {
              redirectTo,
            },
          })

          if (linkError || !linkData?.properties?.action_link) {
            console.log(`    ⚠️  Could not generate password reset link`)
          } else {
            console.log(`    🔗 Password reset link: ${linkData.properties.action_link}`)
          }
        } catch (error) {
          console.error(`    ❌ Error creating database record:`, error)
        }
      } else {
        console.log(`  ❌ No Supabase auth user found either`)
      }
    }
  }

  console.log('\n✅ Check completed!\n')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
