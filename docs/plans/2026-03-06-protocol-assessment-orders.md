# Protocol/Assessment Orders Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a protocols/assessments ordering page where SCSOS staff select a role category, vendor, and test(s) from an admin-configured catalog, with those orders appearing in the existing orders page.

**Architecture:** Extend the existing `Order` model with an `orderType` enum (SUPPLY | PROTOCOL_ASSESSMENT) and add three new catalog models (`AssessmentCategory`, `AssessmentVendor`, `AssessmentTest`). Each `OrderItem` gets an optional FK to `AssessmentTest` so protocol orders reuse the entire existing approval/status/notes workflow. Admin manages the catalog via a new tab on the Settings page.

**Tech Stack:** Next.js App Router, Prisma/PostgreSQL, Supabase Auth, React Hook Form + Zod, Tailwind CSS, shadcn/ui

---

## Task 1: Prisma Schema — catalog models + order type

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add `OrderType` enum, catalog models, and FK fields**

Add to `prisma/schema.prisma` (after the existing `OrderStatus` enum and before the closing):

```prisma
enum OrderType {
  SUPPLY
  PROTOCOL_ASSESSMENT
}

model AssessmentCategory {
  id          String            @id @default(uuid())
  name        String            @unique
  description String?
  isActive    Boolean           @default(true)
  sortOrder   Int               @default(0)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  tests       AssessmentTest[]
  orders      Order[]

  @@index([isActive])
}

model AssessmentVendor {
  id          String            @id @default(uuid())
  name        String            @unique
  description String?
  website     String?
  isActive    Boolean           @default(true)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  tests       AssessmentTest[]

  @@index([isActive])
}

model AssessmentTest {
  id                  String             @id @default(uuid())
  name                String
  vendorId            String
  vendor              AssessmentVendor   @relation(fields: [vendorId], references: [id])
  categoryId          String
  category            AssessmentCategory @relation(fields: [categoryId], references: [id])
  purchaseUrl         String?
  estimatedPrice      Decimal            @default(0) @db.Decimal(10, 2)
  isPhysical          Boolean            @default(true)  // true = physical kit, false = digital
  isActive            Boolean            @default(true)
  notes               String?
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  orderItems          OrderItem[]

  @@index([vendorId])
  @@index([categoryId])
  @@index([isActive])
}
```

Add to the `Order` model (after `fiscalYear String?`):
```prisma
  // Protocol/Assessment orders
  orderType           OrderType      @default(SUPPLY)
  assessmentCategoryId String?
  assessmentCategory  AssessmentCategory? @relation(fields: [assessmentCategoryId], references: [id])
```

Add to the `OrderItem` model (after `quantity Int @default(1)`):
```prisma
  // Protocol orders link items to catalog tests
  assessmentTestId    String?
  assessmentTest      AssessmentTest? @relation(fields: [assessmentTestId], references: [id])
```

**Step 2: Run migration**

```bash
cd sutter-sped-referrals
npx prisma migrate dev --name add_assessment_catalog
npx prisma generate
```

Expected: Migration created and applied, Prisma Client regenerated with new types.

**Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add assessment catalog schema and orderType"
```

---

## Task 2: Permissions

**Files:**
- Modify: `lib/auth/permissions.ts`

**Step 1: Add new permissions**

Add after the `orders:delete` line:

```typescript
  // Assessment catalog permissions
  'assessments:submit': ['TEACHER', 'SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'assessments:manage': ['ADMIN', 'SUPER_ADMIN'],
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

```bash
git add lib/auth/permissions.ts
git commit -m "feat: add assessments submit and manage permissions"
```

---

## Task 3: Assessment Catalog API Routes — Categories

**Files:**
- Create: `app/api/assessments/categories/route.ts`
- Create: `app/api/assessments/categories/[id]/route.ts`

**Step 1: Create `app/api/assessments/categories/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const categories = await prisma.assessmentCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching assessment categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { supabaseUserId: supabaseUser.id } })
    if (!user || !hasPermission(user.role, 'assessments:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, sortOrder } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const category = await prisma.assessmentCategory.create({
      data: { name: name.trim(), description: description?.trim() || null, sortOrder: sortOrder ?? 0 },
    })
    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Error creating assessment category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
```

**Step 2: Create `app/api/assessments/categories/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()
  if (!supabaseUser) return null
  const user = await prisma.user.findUnique({ where: { supabaseUserId: supabaseUser.id } })
  if (!user || !hasPermission(user.role, 'assessments:manage')) return null
  return user
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const { name, description, sortOrder, isActive } = body

    const category = await prisma.assessmentCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    })
    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error updating assessment category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    // Soft delete — keeps referential integrity
    await prisma.assessmentCategory.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting assessment category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
```

**Step 3: Commit**

```bash
git add app/api/assessments/
git commit -m "feat: assessment category API routes"
```

---

## Task 4: Assessment Catalog API Routes — Vendors

**Files:**
- Create: `app/api/assessments/vendors/route.ts`
- Create: `app/api/assessments/vendors/[id]/route.ts`

**Step 1: Create `app/api/assessments/vendors/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendors = await prisma.assessmentVendor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ vendors })
  } catch (error) {
    console.error('Error fetching assessment vendors:', error)
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { supabaseUserId: supabaseUser.id } })
    if (!user || !hasPermission(user.role, 'assessments:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, website } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const vendor = await prisma.assessmentVendor.create({
      data: { name: name.trim(), description: description?.trim() || null, website: website?.trim() || null },
    })
    return NextResponse.json({ vendor }, { status: 201 })
  } catch (error) {
    console.error('Error creating assessment vendor:', error)
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 })
  }
}
```

**Step 2: Create `app/api/assessments/vendors/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()
  if (!supabaseUser) return null
  const user = await prisma.user.findUnique({ where: { supabaseUserId: supabaseUser.id } })
  if (!user || !hasPermission(user.role, 'assessments:manage')) return null
  return user
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const { name, description, website, isActive } = body

    const vendor = await prisma.assessmentVendor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(website !== undefined && { website: website?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
      },
    })
    return NextResponse.json({ vendor })
  } catch (error) {
    console.error('Error updating assessment vendor:', error)
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    await prisma.assessmentVendor.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting assessment vendor:', error)
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 })
  }
}
```

**Step 3: Commit**

```bash
git add app/api/assessments/vendors/
git commit -m "feat: assessment vendor API routes"
```

---

## Task 5: Assessment Catalog API Routes — Tests

**Files:**
- Create: `app/api/assessments/tests/route.ts`
- Create: `app/api/assessments/tests/[id]/route.ts`

**Step 1: Create `app/api/assessments/tests/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    const tests = await prisma.assessmentTest.findMany({
      where: {
        isActive: true,
        ...(categoryId && { categoryId }),
      },
      include: {
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ vendor: { name: 'asc' } }, { name: 'asc' }],
    })
    return NextResponse.json({ tests })
  } catch (error) {
    console.error('Error fetching assessment tests:', error)
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { supabaseUserId: supabaseUser.id } })
    if (!user || !hasPermission(user.role, 'assessments:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, vendorId, categoryId, purchaseUrl, estimatedPrice, isPhysical, notes } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!vendorId) return NextResponse.json({ error: 'Vendor is required' }, { status: 400 })
    if (!categoryId) return NextResponse.json({ error: 'Category is required' }, { status: 400 })

    const test = await prisma.assessmentTest.create({
      data: {
        name: name.trim(),
        vendorId,
        categoryId,
        purchaseUrl: purchaseUrl?.trim() || null,
        estimatedPrice: estimatedPrice ?? 0,
        isPhysical: isPhysical ?? true,
        notes: notes?.trim() || null,
      },
      include: {
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json({ test }, { status: 201 })
  } catch (error) {
    console.error('Error creating assessment test:', error)
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 })
  }
}
```

**Step 2: Create `app/api/assessments/tests/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()
  if (!supabaseUser) return null
  const user = await prisma.user.findUnique({ where: { supabaseUserId: supabaseUser.id } })
  if (!user || !hasPermission(user.role, 'assessments:manage')) return null
  return user
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const { name, vendorId, categoryId, purchaseUrl, estimatedPrice, isPhysical, notes, isActive } = body

    const test = await prisma.assessmentTest.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(vendorId !== undefined && { vendorId }),
        ...(categoryId !== undefined && { categoryId }),
        ...(purchaseUrl !== undefined && { purchaseUrl: purchaseUrl?.trim() || null }),
        ...(estimatedPrice !== undefined && { estimatedPrice }),
        ...(isPhysical !== undefined && { isPhysical }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json({ test })
  } catch (error) {
    console.error('Error updating assessment test:', error)
    return NextResponse.json({ error: 'Failed to update test' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    await prisma.assessmentTest.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting assessment test:', error)
    return NextResponse.json({ error: 'Failed to delete test' }, { status: 500 })
  }
}
```

**Step 3: Commit**

```bash
git add app/api/assessments/tests/
git commit -m "feat: assessment test API routes"
```

---

## Task 6: Update Orders API to support protocol order type

**Files:**
- Modify: `app/api/orders/route.ts`

**Step 1: Read the current file**

Open `app/api/orders/route.ts` and locate the POST handler.

**Step 2: Update the POST body parsing**

The POST currently creates `Order` + `OrderItem` records. Add support for `orderType` and `assessmentCategoryId` in the body, and `assessmentTestId` per item. The relevant section in the POST that calls `prisma.order.create` should be updated so the `data` object includes:

```typescript
orderType: body.orderType ?? 'SUPPLY',
assessmentCategoryId: body.assessmentCategoryId ?? null,
```

And each item in the `items.create` array should include:

```typescript
assessmentTestId: item.assessmentTestId ?? null,
```

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add app/api/orders/route.ts
git commit -m "feat: orders API accepts orderType and assessmentTestId"
```

---

## Task 7: Protocol/Assessment Submit Page

**Files:**
- Create: `app/dashboard/orders/submit-protocol/page.tsx`

**Step 1: Create the page**

This is a multi-step client component. Full implementation:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/hooks'
import { hasPermission } from '@/lib/auth/permissions'

interface Category { id: string; name: string; description: string | null }
interface Vendor { id: string; name: string }
interface Test {
  id: string
  name: string
  vendorId: string
  vendor: Vendor
  estimatedPrice: string
  purchaseUrl: string | null
  isPhysical: boolean
  notes: string | null
}
interface CartItem { test: Test; quantity: number }

export default function SubmitProtocolPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [schoolSite, setSchoolSite] = useState('')
  const [justification, setJustification] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loadingTests, setLoadingTests] = useState(false)

  useEffect(() => {
    fetch('/api/assessments/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories ?? []))
  }, [])

  useEffect(() => {
    if (!selectedCategory) { setTests([]); return }
    setLoadingTests(true)
    fetch(`/api/assessments/tests?categoryId=${selectedCategory.id}`)
      .then(r => r.json())
      .then(d => setTests(d.tests ?? []))
      .finally(() => setLoadingTests(false))
  }, [selectedCategory])

  if (!user) return null

  if (!hasPermission(user.role, 'assessments:submit')) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-semibold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">You do not have permission to submit protocol orders.</p>
        </div>
      </div>
    )
  }

  // Group tests by vendor
  const testsByVendor = tests.reduce<Record<string, { vendor: Vendor; tests: Test[] }>>((acc, t) => {
    if (!acc[t.vendorId]) acc[t.vendorId] = { vendor: t.vendor, tests: [] }
    acc[t.vendorId].tests.push(t)
    return acc
  }, {})

  function getCartQty(testId: string) {
    return cart.find(c => c.test.id === testId)?.quantity ?? 0
  }

  function setCartQty(test: Test, qty: number) {
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.test.id !== test.id))
    } else {
      setCart(prev => {
        const existing = prev.find(c => c.test.id === test.id)
        if (existing) return prev.map(c => c.test.id === test.id ? { ...c, quantity: qty } : c)
        return [...prev, { test, quantity: qty }]
      })
    }
  }

  const totalEstimate = cart.reduce((sum, c) => sum + Number(c.test.estimatedPrice) * c.quantity, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (cart.length === 0) { setError('Add at least one test to your order.'); return }
    if (!schoolSite.trim()) { setError('School/site is required.'); return }
    if (justification.trim().length < 20) { setError('Justification must be at least 20 characters.'); return }

    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType: 'PROTOCOL_ASSESSMENT',
          assessmentCategoryId: selectedCategory?.id ?? null,
          schoolSite: schoolSite.trim(),
          justification: justification.trim(),
          items: cart.map(c => ({
            itemName: c.test.name,
            itemLink: c.test.purchaseUrl ?? '',
            estimatedPrice: Number(c.test.estimatedPrice),
            quantity: c.quantity,
            assessmentTestId: c.test.id,
          })),
        }),
      })
      if (response.ok) {
        const result = await response.json()
        router.push(`/dashboard/orders/${result.id}`)
      } else {
        const result = await response.json()
        setError(result.error || 'Failed to submit order')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center"
            style={{ boxShadow: '0 6px 12px rgba(109, 40, 217, 0.2)' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-warm-gray-900">Order Protocols / Assessments</h1>
            <p className="text-sm text-warm-gray-600">Select a category, then add assessments to your order</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up animation-delay-100">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-xl text-sm flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Category Selection */}
        <div className="bg-white rounded-xl p-5 border border-cream-200" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <h2 className="text-base font-semibold text-warm-gray-900 mb-1">Step 1: Select Category</h2>
          <p className="text-xs text-warm-gray-500 mb-4">Choose the role/discipline this order is for</p>
          {categories.length === 0 ? (
            <p className="text-sm text-warm-gray-400 italic">No categories configured yet. Contact your administrator.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setSelectedCategory(cat); setCart([]) }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedCategory?.id === cat.id
                      ? 'border-violet-500 bg-violet-50 shadow-sm'
                      : 'border-cream-200 hover:border-violet-300 hover:bg-violet-50/40'
                  }`}
                >
                  <p className="font-semibold text-warm-gray-900 text-sm">{cat.name}</p>
                  {cat.description && <p className="text-xs text-warm-gray-500 mt-1">{cat.description}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Browse & Add Tests */}
        {selectedCategory && (
          <div className="bg-white rounded-xl p-5 border border-cream-200" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
            <h2 className="text-base font-semibold text-warm-gray-900 mb-1">Step 2: Add Assessments</h2>
            <p className="text-xs text-warm-gray-500 mb-4">Browse available assessments for <span className="font-medium text-violet-700">{selectedCategory.name}</span></p>

            {loadingTests ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-cream-200 border-t-violet-500" />
              </div>
            ) : Object.keys(testsByVendor).length === 0 ? (
              <p className="text-sm text-warm-gray-400 italic">No assessments available for this category yet.</p>
            ) : (
              <div className="space-y-5">
                {Object.values(testsByVendor).map(({ vendor, tests: vTests }) => (
                  <div key={vendor.id}>
                    <h3 className="text-xs font-bold text-warm-gray-500 uppercase tracking-wide mb-2">{vendor.name}</h3>
                    <div className="space-y-2">
                      {vTests.map(test => {
                        const qty = getCartQty(test.id)
                        return (
                          <div key={test.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${qty > 0 ? 'border-violet-300 bg-violet-50/50' : 'border-cream-200 bg-cream-50/50'}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-warm-gray-900">{test.name}</span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${test.isPhysical ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {test.isPhysical ? 'Physical' : 'Digital'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-xs text-warm-gray-500">${Number(test.estimatedPrice).toFixed(2)} est.</span>
                                {test.purchaseUrl && (
                                  <a href={test.purchaseUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline">View listing</a>
                                )}
                              </div>
                              {test.notes && <p className="text-xs text-warm-gray-400 mt-0.5">{test.notes}</p>}
                            </div>
                            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                              {qty > 0 ? (
                                <>
                                  <button type="button" onClick={() => setCartQty(test, qty - 1)}
                                    className="w-7 h-7 rounded-md bg-white border border-cream-200 flex items-center justify-center text-warm-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                  </button>
                                  <span className="w-6 text-center text-sm font-semibold text-warm-gray-900">{qty}</span>
                                  <button type="button" onClick={() => setCartQty(test, qty + 1)}
                                    className="w-7 h-7 rounded-md bg-violet-600 border border-violet-600 flex items-center justify-center text-white hover:bg-violet-700 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                  </button>
                                </>
                              ) : (
                                <button type="button" onClick={() => setCartQty(test, 1)}
                                  className="px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors">
                                  Add
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-4 border border-violet-200">
            <h3 className="text-xs font-bold text-violet-900 uppercase tracking-wide mb-3">Order Summary — {cart.length} assessment{cart.length > 1 ? 's' : ''}</h3>
            <div className="space-y-1 mb-3">
              {cart.map(c => (
                <div key={c.test.id} className="flex items-center justify-between text-sm">
                  <span className="text-warm-gray-700">{c.test.name} <span className="text-warm-gray-400">×{c.quantity}</span></span>
                  <span className="font-medium text-warm-gray-900">${(Number(c.test.estimatedPrice) * c.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-violet-200">
              <span className="text-xs font-semibold text-violet-900">Total Estimate</span>
              <span className="text-xl font-bold text-violet-700">${totalEstimate.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="bg-white rounded-xl p-5 border border-cream-200" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <h2 className="text-base font-semibold text-warm-gray-900 mb-4">Order Details</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="schoolSite" className="block text-xs font-medium text-warm-gray-700 mb-1.5">School/Site *</label>
              <input
                id="schoolSite"
                type="text"
                value={schoolSite}
                onChange={e => setSchoolSite(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm text-warm-gray-900 placeholder-warm-gray-400"
                placeholder="e.g., Lincoln Elementary"
                style={{ outline: 'none' }}
              />
            </div>
            <div>
              <label htmlFor="justification" className="block text-xs font-medium text-warm-gray-700 mb-1.5">Justification *</label>
              <textarea
                id="justification"
                value={justification}
                onChange={e => setJustification(e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm text-warm-gray-900 placeholder-warm-gray-400 resize-none"
                placeholder="Explain why these assessments are needed, which students will benefit, and any relevant IEP goals."
                style={{ outline: 'none' }}
              />
              <p className="mt-1 text-xs text-warm-gray-400">Minimum 20 characters.</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex-1 px-4 py-2.5 bg-cream-100 text-warm-gray-700 rounded-lg text-sm font-medium transition-all hover:bg-cream-200">
            Cancel
          </button>
          <button type="submit" disabled={submitting || cart.length === 0}
            className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-600/20">
            {submitting ? 'Submitting...' : 'Submit Protocol Order'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/dashboard/orders/submit-protocol/
git commit -m "feat: protocol/assessment order submit page"
```

---

## Task 8: Update Orders List — type filter + badge

**Files:**
- Modify: `app/dashboard/orders/components/order-card.tsx`
- Modify: `app/dashboard/orders/components/order-list.tsx`

**Step 1: Read both files to understand current structure**

Open and read `app/dashboard/orders/components/order-card.tsx` and `app/dashboard/orders/components/order-list.tsx`.

**Step 2: Add protocol badge to order-card**

In the order card component, locate where the order number or status badge is rendered. Add a badge alongside it:

```tsx
{order.orderType === 'PROTOCOL_ASSESSMENT' && (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
    Protocol
  </span>
)}
```

**Step 3: Add order type filter to order-list**

In the order list, find where filter buttons/dropdowns are defined. Add a filter option for order type. The filter state should track `orderType: 'ALL' | 'SUPPLY' | 'PROTOCOL_ASSESSMENT'` and filter the displayed orders accordingly. Add filter buttons:

```tsx
// In the filter bar, add:
<button
  onClick={() => setOrderTypeFilter('ALL')}
  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${orderTypeFilter === 'ALL' ? 'bg-warm-gray-800 text-white' : 'bg-cream-100 text-warm-gray-600 hover:bg-cream-200'}`}
>
  All Types
</button>
<button
  onClick={() => setOrderTypeFilter('SUPPLY')}
  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${orderTypeFilter === 'SUPPLY' ? 'bg-sky-600 text-white' : 'bg-cream-100 text-warm-gray-600 hover:bg-cream-200'}`}
>
  Supply
</button>
<button
  onClick={() => setOrderTypeFilter('PROTOCOL_ASSESSMENT')}
  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${orderTypeFilter === 'PROTOCOL_ASSESSMENT' ? 'bg-violet-600 text-white' : 'bg-cream-100 text-warm-gray-600 hover:bg-cream-200'}`}
>
  Protocol
</button>
```

**Step 4: Pass orderType to the orders API GET call**

The order list fetches from `/api/orders`. Update the fetch to include `?orderType=SUPPLY` or `?orderType=PROTOCOL_ASSESSMENT` when a filter is active. Update `app/api/orders/route.ts` GET handler to accept `orderType` query param and filter accordingly:

```typescript
const orderType = searchParams.get('orderType')
// Add to the Prisma where clause:
...(orderType && orderType !== 'ALL' && { orderType: orderType as OrderType }),
```

**Step 5: Commit**

```bash
git add app/dashboard/orders/components/ app/api/orders/route.ts
git commit -m "feat: protocol badge and type filter on orders list"
```

---

## Task 9: Settings Page — Assessment Catalog Tab

**Files:**
- Modify: `app/dashboard/settings/page.tsx`

**Step 1: Read the current settings page**

Open `app/dashboard/settings/page.tsx` to understand current structure.

**Step 2: Add tab state and tab navigation**

Wrap the existing email settings content in a tab system. Add at the top of the component:

```tsx
const [activeTab, setActiveTab] = useState<'email' | 'assessments'>('email')
```

Add tab navigation UI above the content:

```tsx
<div className="flex gap-1 bg-cream-100 rounded-xl p-1 mb-6 max-w-xs">
  <button
    onClick={() => setActiveTab('email')}
    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'email' ? 'bg-white shadow-sm text-warm-gray-900' : 'text-warm-gray-600 hover:text-warm-gray-900'}`}
  >
    Email
  </button>
  <button
    onClick={() => setActiveTab('assessments')}
    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'assessments' ? 'bg-white shadow-sm text-warm-gray-900' : 'text-warm-gray-600 hover:text-warm-gray-900'}`}
  >
    Assessments
  </button>
</div>
```

**Step 3: Add the Assessment Catalog tab content**

Below the existing email settings component in the same file, add a new component `AssessmentCatalogSettings`. This component manages three sections: Categories, Vendors, Tests.

Each section follows the same pattern:
1. Fetch list from API on mount
2. Show items in a table/list with Edit + Deactivate buttons
3. An inline "Add new" form at the bottom

```tsx
function AssessmentCatalogSettings() {
  // Categories state
  const [categories, setCategories] = useState<{ id: string; name: string; description: string | null; sortOrder: number }[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [savingCat, setSavingCat] = useState(false)

  // Vendors state
  const [vendors, setVendors] = useState<{ id: string; name: string; website: string | null }[]>([])
  const [newVendorName, setNewVendorName] = useState('')
  const [newVendorWebsite, setNewVendorWebsite] = useState('')
  const [savingVendor, setSavingVendor] = useState(false)

  // Tests state
  const [tests, setTests] = useState<{ id: string; name: string; vendor: { name: string }; category: { name: string }; estimatedPrice: string; isPhysical: boolean; purchaseUrl: string | null }[]>([])
  const [newTest, setNewTest] = useState({ name: '', vendorId: '', categoryId: '', purchaseUrl: '', estimatedPrice: '', isPhysical: true, notes: '' })
  const [savingTest, setSavingTest] = useState(false)
  const [allVendors, setAllVendors] = useState<{ id: string; name: string }[]>([])
  const [allCategories, setAllCategories] = useState<{ id: string; name: string }[]>([])

  function loadCategories() {
    fetch('/api/assessments/categories').then(r => r.json()).then(d => {
      setCategories(d.categories ?? [])
      setAllCategories(d.categories ?? [])
    })
  }
  function loadVendors() {
    fetch('/api/assessments/vendors').then(r => r.json()).then(d => {
      setVendors(d.vendors ?? [])
      setAllVendors(d.vendors ?? [])
    })
  }
  function loadTests() {
    fetch('/api/assessments/tests').then(r => r.json()).then(d => setTests(d.tests ?? []))
  }

  useEffect(() => { loadCategories(); loadVendors(); loadTests() }, [])

  async function addCategory() {
    if (!newCatName.trim()) return
    setSavingCat(true)
    await fetch('/api/assessments/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName, description: newCatDesc }),
    })
    setNewCatName(''); setNewCatDesc('')
    loadCategories()
    setSavingCat(false)
  }

  async function deleteCategory(id: string) {
    await fetch(`/api/assessments/categories/${id}`, { method: 'DELETE' })
    loadCategories()
  }

  async function addVendor() {
    if (!newVendorName.trim()) return
    setSavingVendor(true)
    await fetch('/api/assessments/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newVendorName, website: newVendorWebsite }),
    })
    setNewVendorName(''); setNewVendorWebsite('')
    loadVendors()
    setSavingVendor(false)
  }

  async function deleteVendor(id: string) {
    await fetch(`/api/assessments/vendors/${id}`, { method: 'DELETE' })
    loadVendors()
  }

  async function addTest() {
    if (!newTest.name.trim() || !newTest.vendorId || !newTest.categoryId) return
    setSavingTest(true)
    await fetch('/api/assessments/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newTest, estimatedPrice: parseFloat(newTest.estimatedPrice) || 0 }),
    })
    setNewTest({ name: '', vendorId: '', categoryId: '', purchaseUrl: '', estimatedPrice: '', isPhysical: true, notes: '' })
    loadTests()
    setSavingTest(false)
  }

  async function deleteTest(id: string) {
    await fetch(`/api/assessments/tests/${id}`, { method: 'DELETE' })
    loadTests()
  }

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-cream-200 bg-cream-50/70">
          <h2 className="text-sm font-bold text-warm-gray-900">Role Categories</h2>
          <p className="text-xs text-warm-gray-500 mt-0.5">The discipline/role groups shown on the order form (e.g., Speech, Psych, Teacher).</p>
        </div>
        <div className="p-5 space-y-4">
          {categories.length > 0 ? (
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between py-2 px-3 bg-cream-50 rounded-lg border border-cream-200">
                  <div>
                    <span className="text-sm font-medium text-warm-gray-900">{cat.name}</span>
                    {cat.description && <span className="text-xs text-warm-gray-500 ml-2">{cat.description}</span>}
                  </div>
                  <button onClick={() => deleteCategory(cat.id)} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">Remove</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-warm-gray-400 italic">No categories yet.</p>
          )}
          <div className="flex gap-2 pt-2 border-t border-cream-100">
            <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Category name *"
              className="flex-1 rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none" />
            <input value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Description (optional)"
              className="flex-1 rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none" />
            <button onClick={addCategory} disabled={!newCatName.trim() || savingCat}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 font-medium transition-colors text-sm">
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Vendors */}
      <div className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-cream-200 bg-cream-50/70">
          <h2 className="text-sm font-bold text-warm-gray-900">Vendors / Publishers</h2>
          <p className="text-xs text-warm-gray-500 mt-0.5">Companies that publish or sell assessment materials.</p>
        </div>
        <div className="p-5 space-y-4">
          {vendors.length > 0 ? (
            <div className="space-y-2">
              {vendors.map(v => (
                <div key={v.id} className="flex items-center justify-between py-2 px-3 bg-cream-50 rounded-lg border border-cream-200">
                  <div>
                    <span className="text-sm font-medium text-warm-gray-900">{v.name}</span>
                    {v.website && <a href={v.website} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline ml-2">{v.website}</a>}
                  </div>
                  <button onClick={() => deleteVendor(v.id)} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">Remove</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-warm-gray-400 italic">No vendors yet.</p>
          )}
          <div className="flex gap-2 pt-2 border-t border-cream-100">
            <input value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="Vendor name *"
              className="flex-1 rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none" />
            <input value={newVendorWebsite} onChange={e => setNewVendorWebsite(e.target.value)} placeholder="Website (optional)"
              className="flex-1 rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none" />
            <button onClick={addVendor} disabled={!newVendorName.trim() || savingVendor}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 font-medium transition-colors text-sm">
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Tests */}
      <div className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-cream-200 bg-cream-50/70">
          <h2 className="text-sm font-bold text-warm-gray-900">Assessments / Tests</h2>
          <p className="text-xs text-warm-gray-500 mt-0.5">Individual assessment tools available for ordering.</p>
        </div>
        <div className="p-5 space-y-4">
          {tests.length > 0 ? (
            <div className="space-y-2">
              {tests.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 px-3 bg-cream-50 rounded-lg border border-cream-200">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-warm-gray-900">{t.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-warm-gray-500">{t.vendor.name}</span>
                      <span className="text-xs text-warm-gray-400">·</span>
                      <span className="text-xs text-warm-gray-500">{t.category.name}</span>
                      <span className="text-xs text-warm-gray-400">·</span>
                      <span className={`text-xs font-medium ${t.isPhysical ? 'text-amber-600' : 'text-blue-600'}`}>{t.isPhysical ? 'Physical' : 'Digital'}</span>
                      <span className="text-xs text-warm-gray-400">·</span>
                      <span className="text-xs text-warm-gray-500">${Number(t.estimatedPrice).toFixed(2)}</span>
                    </div>
                  </div>
                  <button onClick={() => deleteTest(t.id)} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors ml-4">Remove</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-warm-gray-400 italic">No tests configured yet.</p>
          )}
          {/* Add test form */}
          <div className="pt-2 border-t border-cream-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={newTest.name} onChange={e => setNewTest(p => ({ ...p, name: e.target.value }))} placeholder="Test name *"
                className="rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none" />
              <input value={newTest.purchaseUrl} onChange={e => setNewTest(p => ({ ...p, purchaseUrl: e.target.value }))} placeholder="Purchase URL"
                className="rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none" />
              <select value={newTest.categoryId} onChange={e => setNewTest(p => ({ ...p, categoryId: e.target.value }))}
                className="rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none">
                <option value="">Select category *</option>
                {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={newTest.vendorId} onChange={e => setNewTest(p => ({ ...p, vendorId: e.target.value }))}
                className="rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none">
                <option value="">Select vendor *</option>
                {allVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <input value={newTest.estimatedPrice} onChange={e => setNewTest(p => ({ ...p, estimatedPrice: e.target.value }))} placeholder="Estimated price ($)"
                type="number" step="0.01" min="0"
                className="rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none" />
              <select value={newTest.isPhysical ? 'physical' : 'digital'} onChange={e => setNewTest(p => ({ ...p, isPhysical: e.target.value === 'physical' }))}
                className="rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none">
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
              </select>
            </div>
            <input value={newTest.notes} onChange={e => setNewTest(p => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)"
              className="w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none" />
            <button onClick={addTest} disabled={!newTest.name.trim() || !newTest.vendorId || !newTest.categoryId || savingTest}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 font-medium transition-colors text-sm">
              Add Test
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Wire the tab in the main settings component**

In the return JSX of `EmailSettingsPage`, replace the content section with:

```tsx
{activeTab === 'email' ? (
  <> {/* existing email settings content */} </>
) : (
  <AssessmentCatalogSettings />
)}
```

**Step 5: Commit**

```bash
git add app/dashboard/settings/page.tsx
git commit -m "feat: assessment catalog management in settings tabs"
```

---

## Task 10: Add Navigation Items

**Files:**
- Modify: `app/dashboard/layout.tsx`

**Step 1: Add "Order Protocol" nav item**

In the `NAVIGATION` array in `app/dashboard/layout.tsx`, add after the `Submit Order` entry:

```typescript
{
  name: 'Order Protocol',
  href: '/dashboard/orders/submit-protocol',
  permission: 'assessments:submit' as const,
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
},
```

**Step 2: Verify TypeScript compiles (permissions type)**

```bash
npx tsc --noEmit
```

Expected: No errors (the new permission key is now a valid `Permission` type).

**Step 3: Commit**

```bash
git add app/dashboard/layout.tsx
git commit -m "feat: add Order Protocol nav item"
```

---

## Task 11: Final verification

**Step 1: Build**

```bash
npm run build
```

Expected: No TypeScript errors, no build failures.

**Step 2: Run dev and smoke test**

```bash
npm run dev
```

Manual test checklist:
- [ ] Admin can open Settings → Assessments tab and add a category, vendor, and test
- [ ] Staff can navigate to "Order Protocol" in sidebar
- [ ] Category cards appear on the submit-protocol page
- [ ] Selecting a category shows tests grouped by vendor
- [ ] Add/remove buttons update quantity correctly
- [ ] Submitting the form creates an order and redirects to the order detail page
- [ ] The new order appears in /dashboard/orders with a "Protocol" badge
- [ ] Order type filter works (All / Supply / Protocol)

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: final assessment orders feature complete"
```
