import { PrismaClient, OrderStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🛒 Seeding sample orders...\n')

  // Find the teacher user to assign orders to
  const teacher = await prisma.user.findUnique({
    where: { email: 'teacher@sutter.k12.ca.us' },
  })

  if (!teacher) {
    console.error('❌ Teacher user not found. Please run seed first.')
    process.exit(1)
  }

  // Find SPED staff for approvals
  const spedStaff = await prisma.user.findUnique({
    where: { email: 'sped@sutter.k12.ca.us' },
  })

  if (!spedStaff) {
    console.error('❌ SPED staff user not found. Please run seed first.')
    process.exit(1)
  }

  const sampleOrders = [
    {
      orderNumber: 'ORD-2025-0001',
      status: OrderStatus.PENDING,
      justification: 'Need sensory processing tools for students with tactile sensitivities in classroom 3A.',
      schoolSite: 'Sutter Elementary',
      requestorId: teacher.id,
      totalEstimatedPrice: 251.00, // 125.50 * 2
      items: [
        {
          itemName: 'Sensory Processing Kit',
          itemLink: 'https://example.com/sensory-kit',
          estimatedPrice: 125.50,
          quantity: 2,
        },
      ],
    },
    {
      orderNumber: 'ORD-2025-0002',
      status: OrderStatus.UNDER_REVIEW,
      justification: 'Students with fine motor challenges require specialized grips for writing assignments.',
      schoolSite: 'Sutter Elementary',
      requestorId: teacher.id,
      totalEstimatedPrice: 137.97, // 45.99 * 3
      lastStatusUpdate: new Date('2025-01-20'),
      items: [
        {
          itemName: 'Adaptive Writing Grips Set',
          itemLink: 'https://example.com/writing-grips',
          estimatedPrice: 45.99,
          quantity: 3,
        },
      ],
    },
    {
      orderNumber: 'ORD-2025-0003',
      status: OrderStatus.APPROVED,
      justification: 'Visual supports needed for students with autism to improve daily transitions.',
      schoolSite: 'Sutter Middle School',
      requestorId: teacher.id,
      approverId: spedStaff.id,
      approvedAt: new Date('2025-01-18'),
      lastStatusUpdate: new Date('2025-01-18'),
      totalEstimatedPrice: 89.99,
      items: [
        {
          itemName: 'Visual Schedule Cards',
          itemLink: 'https://example.com/visual-cards',
          estimatedPrice: 89.99,
          quantity: 1,
        },
      ],
    },
    {
      orderNumber: 'ORD-2025-0004',
      status: OrderStatus.ORDERED,
      justification: 'Annual software license renewal for augmentative communication devices used by non-verbal students.',
      schoolSite: 'Sutter High School',
      requestorId: teacher.id,
      approverId: spedStaff.id,
      approvedAt: new Date('2025-01-15'),
      purchaseOrderNumber: 'PO-2025-1234',
      vendor: 'AAC Software Inc.',
      lastStatusUpdate: new Date('2025-01-19'),
      totalEstimatedPrice: 299.00,
      totalActualPrice: 299.00,
      items: [
        {
          itemName: 'Communication Devices AAC Software License',
          itemLink: 'https://example.com/aac-software',
          estimatedPrice: 299.00,
          actualPrice: 299.00,
          quantity: 1,
        },
      ],
    },
    {
      orderNumber: 'ORD-2025-0005',
      status: OrderStatus.SHIPPED,
      justification: 'Students with auditory sensitivities need quiet workspace options during testing and independent work.',
      schoolSite: 'Sutter Elementary',
      requestorId: teacher.id,
      approverId: spedStaff.id,
      approvedAt: new Date('2025-01-10'),
      purchaseOrderNumber: 'PO-2025-1198',
      vendor: 'School Supply Depot',
      trackingNumber: 'USPS-9400123456789',
      expectedDelivery: new Date('2025-01-28'),
      lastStatusUpdate: new Date('2025-01-22'),
      totalEstimatedPrice: 300.00, // 75.00 * 4
      totalActualPrice: 291.96, // 72.99 * 4
      items: [
        {
          itemName: 'Noise-Cancelling Headphones',
          itemLink: 'https://example.com/headphones',
          estimatedPrice: 75.00,
          actualPrice: 72.99,
          quantity: 4,
        },
      ],
    },
    {
      orderNumber: 'ORD-2025-0006',
      status: OrderStatus.RECEIVED,
      justification: 'Weighted lap pads help students with ADHD maintain focus during instruction time.',
      schoolSite: 'Sutter Middle School',
      requestorId: teacher.id,
      approverId: spedStaff.id,
      approvedAt: new Date('2025-01-05'),
      purchaseOrderNumber: 'PO-2025-1150',
      vendor: 'Therapeutic Learning Tools',
      trackingNumber: 'UPS-1Z999AA1234567890',
      expectedDelivery: new Date('2025-01-15'),
      receivedDate: new Date('2025-01-16'),
      lastStatusUpdate: new Date('2025-01-16'),
      totalEstimatedPrice: 300.00, // 60.00 * 5
      totalActualPrice: 292.50, // 58.50 * 5
      items: [
        {
          itemName: 'Weighted Lap Pads',
          itemLink: 'https://example.com/lap-pads',
          estimatedPrice: 60.00,
          actualPrice: 58.50,
          quantity: 5,
        },
      ],
    },
    {
      orderNumber: 'ORD-2025-0007',
      status: OrderStatus.REJECTED,
      justification: 'Need for assistive technology access.',
      schoolSite: 'Sutter High School',
      requestorId: teacher.id,
      approverId: spedStaff.id,
      rejectionReason:
        'Please provide more detailed justification and specify which student(s) will use the device. Also, consider if existing tablets can meet the need before purchasing new equipment.',
      lastStatusUpdate: new Date('2025-01-12'),
      totalEstimatedPrice: 1099.00,
      items: [
        {
          itemName: 'Tablet Computer iPad Pro',
          itemLink: 'https://example.com/ipad-pro',
          estimatedPrice: 1099.00,
          quantity: 1,
        },
      ],
    },
  ]

  for (const orderData of sampleOrders) {
    try {
      // Check if order already exists
      const existing = await prisma.order.findUnique({
        where: { orderNumber: orderData.orderNumber },
      })

      if (existing) {
        console.log(`  ⚠️  Order ${orderData.orderNumber} already exists, skipping...`)
        continue
      }

      // Separate items from order data
      const { items, ...orderFields } = orderData

      // Create order with items
      const order = await prisma.order.create({
        data: {
          ...orderFields,
          items: {
            create: items,
          },
        },
        include: {
          items: true,
        },
      })

      const firstItem = order.items[0]
      console.log(`  ✓ Created order: ${order.orderNumber} (${order.status})`)
      if (firstItem) {
        console.log(`     ${firstItem.itemName} - $${firstItem.estimatedPrice}`)
      }
    } catch (error) {
      console.error(`  ❌ Error creating order ${orderData.orderNumber}:`, error)
    }
  }

  console.log('\n✅ Order seeding completed!')
  console.log(`\n📊 Sample orders created for teacher@sutter.k12.ca.us`)
  console.log(`   - Total orders: ${sampleOrders.length}`)
  console.log(`   - PENDING: 1, UNDER_REVIEW: 1, APPROVED: 1`)
  console.log(`   - ORDERED: 1, SHIPPED: 1, RECEIVED: 1, REJECTED: 1`)
}

main()
  .catch((e) => {
    console.error('Order seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
