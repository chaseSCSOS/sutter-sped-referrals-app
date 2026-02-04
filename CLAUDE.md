# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **SPED (Special Education) Referrals and Orders Management System** built with Next.js. The application manages two primary workflows:

1. **Referrals**: External organizations and SPED staff submit and track special education student referrals through a comprehensive workflow with document uploads, status tracking, and review processes.
2. **Orders**: Teachers and staff request instructional materials/supplies with an approval workflow and tracking system.

## Development Commands

```bash
# Development
npm run dev                    # Start Next.js dev server on port 3000

# Build & Production
npm run build                  # Build for production
npm run start                  # Start production server

# Code Quality
npm run lint                   # Run ESLint

# Database
npx prisma generate            # Generate Prisma client after schema changes
npx prisma migrate dev         # Create and apply migrations in dev
npx prisma migrate deploy      # Apply migrations in production
npx prisma studio              # Open Prisma Studio database GUI
npm run db:seed                # Seed database with initial user data
npm run db:seed-referrals      # Seed referral-specific test data
npm run db:seed-orders         # Seed order-specific test data
```

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **React**: 19.2.3
- **TypeScript**: 5.x (strict mode enabled)
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: Supabase Auth (SSR)
- **Storage**: Supabase Storage (file uploads)
- **Styling**: Tailwind CSS 4.x
- **Forms**: React Hook Form + Zod validation

### Database Architecture

The database has two main domains defined in `prisma/schema.prisma`:

**Referrals Domain:**
- `Referral` - Core referral data with student info, placement details, disabilities (JSON), special ed services (JSON)
- `Document` - Uploaded documents associated with referrals (stored in Supabase Storage)
- `DocumentChecklistItem` - Dynamic checklist for required documents (e.g., IEP, transcripts) with conditional logic
- `DocumentFile` - Individual files uploaded for checklist items
- `ReleaseOfInformationMetadata` - Metadata for Release of Information forms
- `StatusHistory` - Audit trail of referral status changes
- `Note` - Notes/communications on referrals (GENERAL, PHONE_CALL, EMAIL, MEETING, DOCUMENT_RECEIVED, DECISION_MADE)

**Orders Domain:**
- `Order` - Material/supply orders with pricing, justification, tracking
- `OrderStatusHistory` - Audit trail of order status changes
- `OrderNote` - Notes on orders
- `OrderAttachment` - Files attached to orders

**Shared:**
- `User` - Users with roles (EXTERNAL_ORG, TEACHER, SPED_STAFF, ADMIN, SUPER_ADMIN)

Key relationships:
- Users can submit referrals and have referrals assigned to them
- Users request orders and approve orders
- Referrals and Orders have status histories and notes for audit trails

### Authentication & Authorization

**Authentication Flow:**
1. Supabase handles authentication (email/password, magic links, etc.)
2. After Supabase auth, users are stored in Prisma's `User` table with `supabaseUserId` link
3. Middleware in `middleware.ts` updates session cookies on every request
4. Server components use `createClient()` from `@/lib/supabase/server` to get user
5. Client components use `createBrowserClient()` from `@/lib/supabase/client`

**Authorization:**
- Role-based permissions defined in `lib/auth/permissions.ts`
- Use `hasPermission(userRole, permission)` to check access
- Permissions include: `referrals:submit`, `referrals:view-all`, `orders:approve`, etc.
- API routes check permissions before allowing operations

**Role Capabilities:**

The application has three distinct user experiences based on role:

1. **External Organizations (EXTERNAL_ORG)** - "Submitting Side"
   - Submit new special education referrals
   - View and track status of their own submitted referrals
   - Cannot see referral management or order functionality
   - Dashboard shows: "Submit Referral" and "My Referrals" actions

2. **Teachers (TEACHER)** - "Ordering Side"
   - Submit new material/supply orders
   - View and track their own order requests
   - Cannot see referral management or submission functionality
   - Dashboard shows: "Submit Order" and "My Orders" actions

3. **SPED Staff and Admins (SPED_STAFF, ADMIN, SUPER_ADMIN)** - "Admin Side"
   - View and manage all referrals (review, approve, reject, update status)
   - View and manage all orders (approve, track, manage)
   - Access enrollment projections and reporting tools
   - Dashboard shows: "Manage Referrals" and "Manage Orders" actions
   - SUPER_ADMIN has additional user management capabilities

**Important**: The dashboard quick actions are role-specific and should not show submission actions to SPED staff/admins, nor management actions to teachers or external organizations. This separation ensures each user type sees only the functionality relevant to their workflow.

### File Storage

Files are uploaded to **Supabase Storage**:
- Bucket: `referral-documents` for referral files
- Path pattern: `referrals/{referralId}/{documentType}/{filename}`
- Helper: `uploadFile()` in `lib/storage.ts`
- Metadata stored in Prisma `Document` or `OrderAttachment` tables

### Domain-Specific Data

**Placement Types** (PlacementType enum):
- `FRA` - Fully Resource Alternative (full-time special education)
- `SDC` - Special Day Class
- Understanding placement type is critical for enrollment projections and reporting

**Common Disability Codes** (examples - stored as strings):
- `210` - Intellectual Disability
- `220` - Hard of Hearing
- `230` - Deafness
- `240` - Speech or Language Impairment
- `250` - Visual Impairment
- `260` - Emotional Disturbance
- `270` - Orthopedic Impairment
- `280` - Other Health Impairment
- `290` - Specific Learning Disability
- `300` - Deaf-Blindness
- `310` - Multiple Disabilities
- `320` - Autism
- `330` - Traumatic Brain Injury

Each referral has one `primaryDisability` and may have multiple disabilities in the `disabilities` JSON field (each marked with 'P' for primary, 'S' for secondary, or 'T' for tertiary).

### Document Checklist System

Referrals use a **dynamic checklist system** for required documents:

**Checklist Configuration** (in API route handlers like `app/api/referrals/route.ts`):
```javascript
const checklistConfig = [
  { key: 'studentRegistration', type: 'STUDENT_REGISTRATION', required: true },
  { key: 'homeLanguageSurvey', type: 'HOME_LANGUAGE_SURVEY', required: (data) => data.grade !== 'PreK' },
  { key: 'immunizationRecord', type: 'IMMUNIZATION_RECORD', required: true },
  { key: 'releaseOfInformation', type: 'RELEASE_OF_INFORMATION', required: true },
  { key: 'currentIEP', type: 'CURRENT_IEP', required: true },
  { key: 'psychoeducationalReport', type: 'PSYCHO_ED_REPORT', required: true },
  { key: 'interimPlacementForm', type: 'INTERIM_PLACEMENT_FORM', required: (data) => data.nonSeisIep === 'Yes' },
  { key: 'transcripts', type: 'TRANSCRIPTS', required: (data) => ['9', '10', '11', '12'].includes(data.grade) },
]
```

**Checklist Item Lifecycle:**
1. Items created automatically when referral is submitted
2. Status: PENDING → ACCEPTED/REJECTED/MISSING
3. Items can have multiple file versions (tracked by `version` field)
4. SPED staff review and approve/reject each item
5. Rejection requires a reason; submitter can re-upload

### API Route Patterns

API routes follow Next.js App Router conventions in `app/api/`:

**Route Handlers:**
- `GET` - Retrieve resources (with role-based filtering)
- `POST` - Create new resources
- `PATCH` - Update existing resources
- `DELETE` - Remove resources (restricted to ADMIN+)

**Common Pattern:**
```typescript
// 1. Get user from Supabase session
const supabase = await createClient()
const { data: { user: supabaseUser } } = await supabase.auth.getUser()

// 2. Lookup user in Prisma
const user = await prisma.user.findUnique({
  where: { supabaseUserId: supabaseUser.id }
})

// 3. Check permissions
if (!hasPermission(user.role, 'permission:name')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// 4. Perform database operation with Prisma
const result = await prisma.model.create({ data: {...} })

// 5. Return JSON response
return NextResponse.json({ result }, { status: 201 })
```

**Key API Endpoints:**
- `/api/referrals` - List/create referrals
- `/api/referrals/[id]` - Get/update/delete specific referral
- `/api/referrals/[id]/status` - Update referral status
- `/api/referrals/[id]/checklist` - Manage document checklist
- `/api/referrals/[id]/checklist/[itemId]` - Update specific checklist item
- `/api/referrals/[id]/documents` - Upload/manage documents
- `/api/referrals/[id]/notes` - Add/view notes
- `/api/referrals/[id]/release-info` - Release of Information metadata
- `/api/referrals/lookup` - Public referral status lookup
- `/api/orders` - List/create orders
- `/api/orders/[id]` - Get/update/delete specific order
- `/api/orders/[id]/approve` - Approve order
- `/api/orders/[id]/reject` - Reject order
- `/api/orders/[id]/notes` - Add/view order notes
- `/api/reports/enrollment` - Enrollment projections report data
- `/api/users` - User management (ADMIN+ only)
- `/api/auth/signup` - User registration
- `/api/auth/user` - Current user info

### Form Validation

Forms use **React Hook Form** with **Zod** schemas:
- Schema definitions in `lib/validation/` (e.g., `order.ts`)
- Use `zodResolver` from `@hookform/resolvers/zod`
- Server-side validation should mirror client-side schemas
- Example schemas: `orderSchema` in `lib/validation/order.ts`

### Error Handling Patterns

**API Routes:**
```typescript
try {
  // Business logic
  return NextResponse.json({ data }, { status: 200 })
} catch (error) {
  console.error('Error description:', error)
  return NextResponse.json(
    { error: 'User-friendly error message' },
    { status: 500 }
  )
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (authenticated but lacks permission)
- `404` - Not Found
- `500` - Internal Server Error

### Key Utility Functions

**`lib/utils.ts`:**
- `generateConfirmationNumber()` - Creates unique referral confirmation codes (format: REF-YYYY-MM-DD-XXX)
- `generateOrderNumber()` - Creates unique order numbers (format: ORD-YYYY-MM-DD-XXX)
- `calculateDeadline(days)` - Computes deadline dates (default 30 days from now)
- `formatDate(date)` - Formats dates to YYYY-MM-DD
- `daysBetween(date1, date2)` - Calculates days between two dates
- `cn(...)` - Tailwind CSS class merger using clsx and tailwind-merge

**`lib/prisma.ts`:**
- Singleton Prisma client instance to prevent connection pool exhaustion in development

**`lib/storage.ts`:**
- `uploadFile()` - Uploads files to Supabase Storage with proper path structure

### Important Notes

1. **Path Aliases**: Use `@/` prefix for imports (e.g., `@/lib/prisma`)
2. **Prisma Workflow**: After schema changes, always run `npx prisma generate` to update the client
3. **JSON Fields**: `disabilities` and `specialEdServices` in Referral are stored as JSON
4. **Date Handling**: Use `date-fns` library for date operations
5. **Status Enums**:
   - Referral: SUBMITTED, UNDER_REVIEW, MISSING_DOCUMENTS, PENDING_ADDITIONAL_INFO, PENDING_APPROVAL, APPROVED, ACCEPTED_AWAITING_PLACEMENT, REJECTED, ON_HOLD, COMPLETED
   - Order: NEW, SHIPPED, RECEIVED, COMPLETED, CANCELLED
   - Checklist: PENDING, ACCEPTED, REJECTED, MISSING
   - **Note**: Order statuses were consolidated from 8 to 5 in February 2025:
     - NEW replaces PENDING and UNDER_REVIEW
     - SHIPPED replaces APPROVED and ORDERED
     - CANCELLED replaces REJECTED
     - COMPLETED is a new terminal status for orders delivered to teachers
6. **Primary Disability**: The `primaryDisability` field stores the disability code (e.g., '210', '220') marked as 'P' (Primary) in the disabilities JSON object. API routes automatically extract this when creating referrals.
7. **Silo Field**: Optional organizational grouping field (`silo`) used for internal tracking and enrollment projections
8. **Audit Trails**: Always create StatusHistory/OrderStatusHistory entries when changing status
9. **Middleware**: The middleware (`middleware.ts`) runs on all routes except static assets - it refreshes Supabase sessions
10. **UI Components**: This project uses **shadcn/ui** components (New York style) located in `components/ui/`. The configuration is in `components.json`.
11. **Document Checklist**: Referrals have a dynamic checklist system (`DocumentChecklistItem`) with conditional requirements based on student data (e.g., transcripts required for grades 9-12, home language survey not required for PreK).
12. **FERPA Compliance**: This system handles student records subject to FERPA regulations. See `docs/FERPA-COMPLIANCE-MASTER-PLAN.md` for detailed compliance requirements and implementation guidelines when working with student data.

### Environment Variables

Required environment variables (create `.env.local`):
```
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
```

**Deployment:**
- The application is configured for Netlify deployment (see `netlify.toml`)
- Uses `@netlify/plugin-nextjs` for Next.js integration
- Ensure environment variables are set in Netlify dashboard

### Enrollment Projections Report

The Enrollment Projections dashboard (`/dashboard/reports/enrollment`) replaces the manual Google Sheet workflow staff previously used for tracking and projections.

**Features:**
- Real-time aggregation of referral data from the database
- Filtering by date range and status
- Automated breakdowns by:
  - Grade level
  - Primary disability (with human-readable labels)
  - Silo (organizational grouping)
  - Placement type (FRA/SDC)
  - Status
- Export to CSV for external sharing
- Accessible only to SPED_STAFF, ADMIN, and SUPER_ADMIN roles

**API Endpoint:** `GET /api/reports/enrollment?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&status=STATUS`

## Common Development Workflows

### Adding a New API Endpoint

1. Create route handler in `app/api/[resource]/route.ts`
2. Import Prisma client from `@/lib/prisma`
3. Import Supabase client from `@/lib/supabase/server`
4. Add permission check using `hasPermission()` from `@/lib/auth/permissions`
5. Implement business logic with Prisma queries
6. Return JSON response with appropriate status code

### Adding a New Form

1. Create Zod validation schema in `lib/validation/[resource].ts`
2. Build form component using React Hook Form + `zodResolver`
3. Use shadcn/ui components from `components/ui/` for form elements
4. Handle form submission with API route
5. Show success/error feedback to user

### Modifying the Database Schema

1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name` to create migration
3. Run `npx prisma generate` to update Prisma Client types
4. Update relevant TypeScript types/interfaces
5. Update API routes and components that use modified models
6. Test changes with `npm run db:seed` to verify seed scripts still work

### Testing Locally

**Manual testing with seeded data:**
```bash
# Reset database and seed with test data
npx prisma migrate reset
npm run db:seed                # Seed users
npm run db:seed-referrals      # Seed referral test data
npm run db:seed-orders         # Seed order test data
npm run dev                    # Start dev server
```

**Database inspection:**
```bash
npx prisma studio  # Opens GUI at http://localhost:5555
```

### Project Structure

```
app/
├── api/                    # API route handlers
│   ├── referrals/         # Referral CRUD operations
│   ├── orders/            # Order CRUD operations
│   └── reports/           # Reporting endpoints
│       └── enrollment/    # Enrollment projections API
├── auth/                  # Auth pages (login, signup, callback)
├── dashboard/             # Protected dashboard pages
│   ├── referrals/        # Referral management UI
│   ├── orders/           # Order management UI
│   ├── reports/          # Reports and analytics
│   │   └── enrollment/   # Enrollment projections dashboard
│   ├── my-referrals/     # User's own referrals
│   └── my-orders/        # User's own orders
├── components/            # Shared form components
└── referrals/status/     # Public referral status lookup

lib/
├── auth/                  # Auth utilities (permissions, hooks)
├── supabase/             # Supabase client factories
├── validation/           # Zod schemas
├── prisma.ts             # Prisma singleton
├── storage.ts            # File upload utilities
└── utils.ts              # General utilities

prisma/
├── schema.prisma         # Database schema
└── seed.ts              # Database seeding script

scripts/
├── seed-referrals.ts    # Referral-specific seeding
└── seed-orders.ts       # Order-specific seeding

docs/
├── FERPA-COMPLIANCE-MASTER-PLAN.md  # FERPA compliance guidelines
└── FERPA-COMPLIANCE-ASSESSMENT.md   # Compliance assessment
```

## Data Model Relationships

**Critical relationships to understand:**

**Referral Workflow Chain:**
```
Referral (1) → (N) DocumentChecklistItem → (N) DocumentFile
         (1) → (N) StatusHistory
         (1) → (N) Note
         (1) → (N) Document
         (N) → (1) User (submittedBy)
         (N) → (1) User (assignedTo)
```

**Order Workflow Chain:**
```
Order (1) → (N) OrderStatusHistory
      (1) → (N) OrderNote
      (1) → (N) OrderAttachment
      (N) → (1) User (requestedBy)
      (N) → (1) User (approvedBy)
```

**Key cascading behaviors:**
- Deleting a Referral cascades to all related checklist items, documents, notes, and status history
- Deleting an Order cascades to all related notes, attachments, and status history
- User deletions are restricted if they have associated referrals/orders (use soft delete instead)
