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

  // Create mock orders
  console.log('Creating mock orders...')
  
  const teacherUser = await prisma.user.findUnique({ where: { email: 'teacher@sutter.k12.ca.us' } })
  const spedUser = await prisma.user.findUnique({ where: { email: spedEmail } })
  const adminUser = await prisma.user.findUnique({ where: { email: 'janinef@sutter.k12.ca.us' } })

  if (teacherUser && spedUser && adminUser) {
    const orders = [
      {
        orderNumber: 'ORD-2026-001',
        status: 'NEW' as const,
        justification: 'Need sensory tools for new student with autism. Items will help with self-regulation during class transitions.',
        totalEstimatedPrice: 245.50,
        requestorId: teacherUser.id,
        schoolSite: 'Yuba City Elementary',
        budgetCategory: 'Special Education Materials',
        fiscalYear: '2025-2026',
        items: [
          { itemName: 'Weighted Lap Pad (5 lbs)', estimatedPrice: 34.99, quantity: 2, itemLink: 'https://example.com/weighted-lap-pad' },
          { itemName: 'Fidget Spinner Set (12 pack)', estimatedPrice: 18.99, quantity: 1, itemLink: 'https://example.com/fidget-spinners' },
          { itemName: 'Noise-Canceling Headphones', estimatedPrice: 89.99, quantity: 1, itemLink: 'https://example.com/headphones' },
          { itemName: 'Visual Timer', estimatedPrice: 24.99, quantity: 2, itemLink: 'https://example.com/visual-timer' },
          { itemName: 'Sensory Brush Set', estimatedPrice: 16.99, quantity: 3, itemLink: 'https://example.com/sensory-brush' },
        ]
      },
      {
        orderNumber: 'ORD-2026-002',
        status: 'SHIPPED' as const,
        justification: 'Replacement materials for damaged classroom supplies. Original items were damaged during water leak incident.',
        totalEstimatedPrice: 156.75,
        totalActualPrice: 149.99,
        requestorId: teacherUser.id,
        approverId: adminUser.id,
        approvedAt: new Date('2026-01-28'),
        schoolSite: 'Yuba City Elementary',
        vendor: 'School Specialty',
        purchaseOrderNumber: 'PO-2026-0042',
        trackingNumber: '1Z999AA10123456784',
        expectedDelivery: new Date('2026-02-10'),
        budgetCategory: 'Classroom Supplies',
        fiscalYear: '2025-2026',
        items: [
          { itemName: 'Dry Erase Markers (Bulk Pack)', estimatedPrice: 45.99, actualPrice: 42.99, quantity: 2 },
          { itemName: 'Construction Paper (500 sheets)', estimatedPrice: 22.99, actualPrice: 22.99, quantity: 3 },
          { itemName: 'Glue Sticks (100 pack)', estimatedPrice: 41.78, actualPrice: 41.02, quantity: 1 },
        ]
      },
      {
        orderNumber: 'ORD-2026-003',
        status: 'RECEIVED' as const,
        justification: 'Adaptive technology for student with physical disabilities. Required for IEP accommodations.',
        totalEstimatedPrice: 1250.00,
        totalActualPrice: 1199.99,
        requestorId: spedUser.id,
        approverId: adminUser.id,
        approvedAt: new Date('2026-01-15'),
        schoolSite: 'Sutter High School',
        vendor: 'Assistive Tech Solutions',
        purchaseOrderNumber: 'PO-2026-0028',
        trackingNumber: '1Z999AA10123456789',
        expectedDelivery: new Date('2026-01-30'),
        receivedDate: new Date('2026-02-01'),
        budgetCategory: 'Assistive Technology',
        fiscalYear: '2025-2026',
        items: [
          { itemName: 'Ergonomic Keyboard with Large Keys', estimatedPrice: 350.00, actualPrice: 329.99, quantity: 1 },
          { itemName: 'Adjustable Document Holder', estimatedPrice: 150.00, actualPrice: 140.00, quantity: 1 },
          { itemName: 'Voice Recognition Software License', estimatedPrice: 750.00, actualPrice: 730.00, quantity: 1 },
        ]
      },
      {
        orderNumber: 'ORD-2026-004',
        status: 'COMPLETED' as const,
        justification: 'Math manipulatives for resource room. Supporting students with dyscalculia.',
        totalEstimatedPrice: 189.50,
        totalActualPrice: 189.50,
        requestorId: teacherUser.id,
        approverId: adminUser.id,
        approvedAt: new Date('2026-01-10'),
        schoolSite: 'Yuba City Elementary',
        vendor: 'Learning Resources',
        purchaseOrderNumber: 'PO-2026-0015',
        trackingNumber: '1Z999AA10123456790',
        expectedDelivery: new Date('2026-01-22'),
        receivedDate: new Date('2026-01-20'),
        budgetCategory: 'Instructional Materials',
        fiscalYear: '2025-2026',
        items: [
          { itemName: 'Base Ten Blocks Set', estimatedPrice: 45.50, actualPrice: 45.50, quantity: 2 },
          { itemName: 'Fraction Tower Cubes', estimatedPrice: 32.99, actualPrice: 32.99, quantity: 2 },
          { itemName: 'Number Line Floor Mat', estimatedPrice: 65.52, actualPrice: 65.52, quantity: 1 },
        ]
      },
      {
        orderNumber: 'ORD-2026-005',
        status: 'NEW' as const,
        justification: 'Reading intervention materials for Tier 2 students. Aligned with our RTI program.',
        totalEstimatedPrice: 425.00,
        requestorId: spedUser.id,
        schoolSite: 'Brittan Elementary',
        budgetCategory: 'Intervention Materials',
        fiscalYear: '2025-2026',
        items: [
          { itemName: 'Phonics Readers Level C (Set of 25)', estimatedPrice: 125.00, quantity: 1 },
          { itemName: 'Decodable Books Library', estimatedPrice: 200.00, quantity: 1 },
          { itemName: 'Reading Fluency Cards', estimatedPrice: 50.00, quantity: 2 },
        ]
      },
      {
        orderNumber: 'ORD-2026-006',
        status: 'CANCELLED' as const,
        justification: 'Art supplies for social skills group. Order cancelled due to budget reallocation.',
        totalEstimatedPrice: 95.00,
        requestorId: teacherUser.id,
        approverId: adminUser.id,
        approvedAt: new Date('2026-01-25'),
        rejectionReason: 'Budget reallocated to higher priority assistive technology needs',
        schoolSite: 'Yuba City Elementary',
        budgetCategory: 'Social Skills Materials',
        fiscalYear: '2025-2026',
        items: [
          { itemName: 'Watercolor Paint Sets', estimatedPrice: 35.00, quantity: 2 },
          { itemName: 'Drawing Paper Pads', estimatedPrice: 25.00, quantity: 1 },
        ]
      },
    ]

    for (const orderData of orders) {
      const existingOrder = await prisma.order.findUnique({
        where: { orderNumber: orderData.orderNumber }
      })

      if (!existingOrder) {
        const { items, ...orderFields } = orderData
        await prisma.order.create({
          data: {
            ...orderFields,
            items: {
              create: items
            }
          }
        })
        console.log(`  ✓ Created order: ${orderData.orderNumber}`)
      } else {
        console.log(`  ⚠️  Order ${orderData.orderNumber} already exists, skipping...`)
      }
    }
    console.log('')
  } else {
    console.log('  ⚠️  Required users not found, skipping order creation\n')
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
