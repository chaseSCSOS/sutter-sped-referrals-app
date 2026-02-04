# Sutter County SELPA - Interim Referral System

## Overview

A modern web application for digitizing the interim placement referral process for special education students. Replaces the manual PDF-to-Google-Sheets workflow with automated form submission, document management, and status tracking.

## Generated Files

This package includes:

1. **interim-referral-form.tsx** - Main React form component with all 106 fields
2. **schema.ts** - Zod validation schema with business rules
3. **api-route.ts** - Next.js API endpoint for form submission
4. **schema.prisma** - Database schema for PostgreSQL
5. **README.md** - This file with setup instructions

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod validation
- **Database**: PostgreSQL (via Prisma ORM)
- **File Storage**: Local filesystem → Laserfiche API (TODO)
- **Email**: Placeholder (integrate SendGrid, Resend, or similar)

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- Laserfiche API credentials (for document storage integration)
- Email service credentials (SendGrid, Resend, etc.)

## Quick Start

### 1. Create Next.js Project

```bash
npx create-next-app@latest sutter-sped-referrals
cd sutter-sped-referrals
```

When prompted:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- App Router: Yes
- Import alias: @/*

### 2. Install Dependencies

```bash
npm install react-hook-form @hookform/resolvers zod
npm install @prisma/client
npm install -D prisma
```

### 3. Set Up Database

Create a `.env` file in your project root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/sped_referrals"
```

Initialize Prisma:

```bash
npx prisma init
```

Replace the generated `prisma/schema.prisma` with the provided `schema.prisma` file.

Run migrations:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Copy Generated Files

Place the generated files in your Next.js project:

```
/app
  /components
    interim-referral-form.tsx
    schema.ts
  /api
    /referrals
      route.ts  (rename from api-route.ts)
```

### 5. Create a Form Page

Create `/app/referrals/new/page.tsx`:

```tsx
import InterimReferralForm from '@/app/components/interim-referral-form';

export default function NewReferralPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <InterimReferralForm />
    </div>
  );
}
```

### 6. Run the Development Server

```bash
npm run dev
```

Visit http://localhost:3000/referrals/new

## What Works Out of the Box

✅ **Form Component**: All 106 fields rendered with proper types
✅ **Validation**: Zod schema with conditional logic
✅ **Conditional Fields**: EL Start Date, Reclassification Date show/hide correctly
✅ **Repeatable Sections**: Special Ed Services can add/remove rows
✅ **File Uploads**: Multi-file upload with progress indicators
✅ **Disability Codes**: All 14 codes with P/S/N selection
✅ **Form Submission**: POST to API with FormData
✅ **Database Schema**: Prisma models for all entities

## What Needs Configuration

### 1. Email Notifications

Edit `/app/api/referrals/route.ts` and implement the `sendNotifications` function:

```typescript
import { Resend } from 'resend'; // or your email service
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendNotifications(referral: ReferralData, formData: any) {
  await resend.emails.send({
    from: 'noreply@sutter.k12.ca.us',
    to: ['amandac@sutter.k12.ca.us', 'leiab@sutter.k12.ca.us', 'janinef@sutter.k12.ca.us'],
    subject: `New Interim Referral - ${formData.studentName}`,
    html: `<p>New referral submitted...</p>`,
  });
}
```

### 2. Laserfiche Integration

Add Laserfiche API client and update file upload logic:

```typescript
async function uploadToLaserfiche(referralId: string, files: Record<string, string[]>) {
  // Use Laserfiche REST API to upload documents
  const laserFicheClient = new LaserFicheClient({
    baseUrl: process.env.LASERFICHE_URL,
    apiKey: process.env.LASERFICHE_API_KEY,
  });
  
  for (const [docType, filePaths] of Object.entries(files)) {
    for (const filePath of filePaths) {
      await laserFicheClient.uploadDocument({
        repositoryId: 'SPED',
        folderPath: `/Interim_Referrals/${referralId}`,
        filePath: filePath,
        metadata: {
          documentType: docType,
          referralId: referralId,
        },
      });
    }
  }
}
```

### 3. Authentication

Add authentication using NextAuth.js or your preferred solution:

```bash
npm install next-auth
```

Create `/app/api/auth/[...nextauth]/route.ts` and protect the form route.

### 4. County Staff Dashboard

Create a dashboard for county staff to review referrals:

```tsx
// /app/dashboard/page.tsx
import { ReferralList } from '@/app/components/referral-list';

export default async function DashboardPage() {
  // Fetch referrals from database
  const referrals = await prisma.referral.findMany({
    orderBy: { submittedAt: 'desc' },
  });
  
  return <ReferralList referrals={referrals} />;
}
```

## Database Queries

### Get All Pending Referrals

```typescript
const pending = await prisma.referral.findMany({
  where: {
    status: {
      in: ['SUBMITTED', 'UNDER_REVIEW', 'MISSING_DOCUMENTS']
    }
  },
  include: {
    documents: true,
    statusHistory: true,
  },
  orderBy: { submittedAt: 'desc' }
});
```

### Get Referrals Approaching Deadline

```typescript
const approaching = await prisma.referral.findMany({
  where: {
    status: { not: 'COMPLETED' },
    daysElapsed: { gte: 20 }
  }
});
```

### Update Referral Status

```typescript
await prisma.$transaction([
  prisma.referral.update({
    where: { id: referralId },
    data: { status: 'APPROVED' }
  }),
  prisma.statusHistory.create({
    data: {
      referralId,
      fromStatus: 'UNDER_REVIEW',
      toStatus: 'APPROVED',
      changedBy: 'staff@sutter.k12.ca.us',
      reason: 'All documents verified and placement authorized'
    }
  })
]);
```

## Deployment

### Option 1: Vercel (Recommended for Next.js)

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables (DATABASE_URL, etc.)
4. Deploy

### Option 2: Self-Hosted

```bash
npm run build
npm start
```

Use PM2 or similar process manager for production.

## Environment Variables

Create a `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sped_referrals"

# Email
RESEND_API_KEY="re_xxxxxxxxxxxx"
SENDGRID_API_KEY="SG.xxxxxxxxxxxx"

# Laserfiche
LASERFICHE_URL="https://api.laserfiche.com"
LASERFICHE_API_KEY="your-api-key"

# NextAuth (if using)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth (if using)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

## Folder Structure

```
/app
  /api
    /referrals
      route.ts              # Form submission API
  /components
    interim-referral-form.tsx
    schema.ts
    /dashboard
      referral-list.tsx     # County staff dashboard
      referral-detail.tsx   # Individual referral view
  /referrals
    /new
      page.tsx              # District-facing form
    /[id]
      page.tsx              # Referral detail page
      /confirmation
        page.tsx            # Success page after submission
  /dashboard
    page.tsx                # County staff main dashboard
/prisma
  schema.prisma
/uploads                    # Local file storage (gitignored)
```

## Testing

### Test Form Submission

1. Navigate to http://localhost:3000/referrals/new
2. Fill out all required fields
3. Upload test documents
4. Submit form
5. Check console for confirmation number
6. Verify database entry: `npx prisma studio`

### Test Validation

Try submitting form with:
- Missing required fields
- Invalid zip code (not 5 digits)
- No primary disability selected
- EL=Yes without EL Start Date

Should show appropriate error messages.

## Roadmap / TODO

### Phase 1: MVP (Current)
- ✅ Form component with all fields
- ✅ Validation schema
- ✅ Database schema
- ✅ File upload handling
- 🔲 Email notifications (placeholder ready)
- 🔲 Basic API endpoint

### Phase 2: County Dashboard
- 🔲 Referral list view
- 🔲 Referral detail view (Form 2)
- 🔲 Status management
- 🔲 Document verification UI
- 🔲 Notes/comments system
- 🔲 Deadline alerts

### Phase 3: Integrations
- 🔲 Laserfiche document storage
- 🔲 Email notifications (SendGrid/Resend)
- 🔲 Google SSO authentication
- 🔲 Automated deadline reminders

### Phase 4: Reporting
- 🔲 Compliance reports
- 🔲 Processing time analytics
- 🔲 District submission volumes
- 🔲 Excel/CSV export

### Phase 5: Ordering System
- 🔲 Order request form
- 🔲 Order tracking
- 🔲 Link orders to referrals
- 🔲 Spending reports

## Support

For issues or questions:
- Email: chase@sutter.k12.ca.us
- Internal wiki: [link to documentation]

## License

Internal use only - Sutter County Superintendent of Schools
