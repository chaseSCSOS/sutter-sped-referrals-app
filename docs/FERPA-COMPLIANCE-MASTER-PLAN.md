# FERPA Compliance Master Plan
## For SPED Referrals Management System

**Last Updated:** January 30, 2026
**Status:** Action Plan for Production Launch

---

## Understanding Your FERPA Obligations

### What You're Building

A system where:
1. **External schools/organizations** submit special education referral packets (student info, IEPs, evaluations, documents)
2. **Your SPED district staff** receives, reviews, and manages these referrals
3. **Teachers** in your district submit material/supply orders (separate workflow)

### Does FERPA Apply?

**YES**, but your obligations are specific:

**You are NOT responsible for:**
- ❌ Getting parent consent to receive the referral (that's the submitting school's job)
- ❌ Sending annual FERPA notices to parents (that's each student's home school's job)
- ❌ Managing parent access requests initially (parents go to their home school first)

**You ARE responsible for:**
- ✅ **Protecting the data** once you receive it (security, encryption, access controls)
- ✅ **Limiting access** to staff with legitimate educational interest
- ✅ **Tracking who accesses** student records (audit logs)
- ✅ **Securing vendor agreements** (Supabase, Netlify)
- ✅ **Having a breach response plan** (California law requires this)
- ✅ **Allowing authorized access** if parents contact you directly

### California AB 1584 Additional Requirements

California requires written agreements with ANY technology vendor that stores student data, including:
- Prohibition on selling student data
- Prohibition on targeted advertising
- Data security provisions
- Data deletion upon request

---

## Master Plan: 8 Required Actions

Here's what you need to do, in order of priority:

---

## ✅ Action 1: Fix File Storage Security (CRITICAL - Week 1)

### Current Problem

Your `lib/storage.ts` file uses `getPublicUrl()` which creates **unauthenticated public URLs**:

```typescript
// THIS IS A SECURITY RISK - lib/storage.ts:40-42
const { data: urlData } = supabase.storage
  .from(bucket)
  .getPublicUrl(data.path)
```

**Risk:** Anyone with the URL can access IEPs, psycho reports, and other FERPA-protected documents.

### What You Need to Do

**Step 1.1: Make the Supabase bucket private**

1. Go to Supabase Dashboard → Storage → `referral-documents` bucket
2. Set to **Private** (not public)

**Step 1.2: Update storage.ts to use signed URLs**

Replace the `uploadFile` function:

```typescript
// lib/storage.ts - UPDATED VERSION
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface UploadResult {
  path?: string
  error?: string
}

/**
 * Uploads a file to Supabase Storage (FERPA-compliant)
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<UploadResult> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Upload error:', error)
      return { error: error.message }
    }

    // Return just the path - NO public URL
    return { path: data.path }
  } catch (error) {
    console.error('Upload exception:', error)
    return { error: 'Failed to upload file' }
  }
}

/**
 * Gets a secure, time-limited URL for accessing a document
 * Only use this AFTER verifying user has permission
 */
export async function getSecureDocumentUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      console.error('Signed URL error:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.error('Signed URL exception:', error)
    return null
  }
}

/**
 * Download file as blob (for server-side operations)
 */
export async function downloadFile(
  bucket: string,
  path: string
): Promise<Blob | null> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path)

    if (error) {
      console.error('Download error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Download exception:', error)
    return null
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path])
    return !error
  } catch (error) {
    console.error('Delete exception:', error)
    return false
  }
}
```

**Step 1.3: Update API routes that serve documents**

When a user requests a document, check permissions THEN generate signed URL:

```typescript
// Example: app/api/referrals/[id]/documents/[docId]/download/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { getSecureDocumentUrl } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: referralId, docId } = await params

    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: supabaseUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 2. Check if user has permission to view this referral
    const referral = await prisma.referral.findUnique({
      where: { id: referralId },
    })

    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    // Check permissions based on role
    if (!hasPermission(user.role, 'referrals:view-all')) {
      // If not SPED staff/admin, can only view own submissions
      if (referral.submittedByUserId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // 3. Get the document
    const document = await prisma.document.findUnique({
      where: { id: docId },
    })

    if (!document || document.referralId !== referralId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // 4. Generate signed URL (1 hour expiration)
    const signedUrl = await getSecureDocumentUrl(
      'referral-documents',
      document.filePath,
      3600 // 1 hour
    )

    if (!signedUrl) {
      return NextResponse.json({ error: 'Failed to generate access URL' }, { status: 500 })
    }

    // 5. Return the signed URL
    return NextResponse.json({
      url: signedUrl,
      fileName: document.fileName,
      expiresIn: 3600
    })
  } catch (error) {
    console.error('Document access error:', error)
    return NextResponse.json({ error: 'Failed to access document' }, { status: 500 })
  }
}
```

**Step 1.4: Update frontend to use the new API**

```typescript
// Example: In your document viewer component
async function viewDocument(referralId: string, documentId: string) {
  try {
    // Call API to get signed URL
    const response = await fetch(
      `/api/referrals/${referralId}/documents/${documentId}/download`
    )

    if (!response.ok) {
      throw new Error('Access denied')
    }

    const { url } = await response.json()

    // Open in new tab or download
    window.open(url, '_blank')
  } catch (error) {
    console.error('Failed to access document:', error)
    alert('You do not have permission to access this document')
  }
}
```

**Testing:**
1. Try accessing a document URL directly without authentication → Should fail
2. Try accessing as authorized user → Should work
3. Wait 1 hour and try again → URL should expire
4. Try accessing as wrong user → Should be denied

**Deadline:** Complete before ANY production data is uploaded

---

## ✅ Action 2: Execute Vendor Agreements (CRITICAL - Week 2)

### Why This Matters

California law (AB 1584) requires written agreements with ANY vendor storing student data. Without these, you're not compliant.

### What You Need to Do

**Step 2.1: Contact Supabase**

1. Email Supabase support: support@supabase.com
2. Subject: "FERPA/AB 1584 Compliance - Data Processing Agreement Request"
3. Message template:

```
Hello,

We are a California school district using Supabase to store student education
records protected under FERPA and California AB 1584.

We need to execute a Data Processing Agreement (DPA) that includes:
- FERPA compliance commitments
- Data security provisions (encryption at rest/transit)
- Prohibition on secondary use of student data
- Data deletion upon request
- Breach notification within 24 hours
- Commitment not to sell or use data for advertising

Can you provide:
1. Your standard DPA/BAA for educational institutions?
2. SOC 2 Type II certification (if available)?
3. Documentation of encryption standards (at rest and in transit)?

Our organization: [Your District Name]
Project: Special Education Referrals Management System

Thank you,
[Your Name]
```

**Step 2.2: Review Supabase's Existing Terms**

While waiting for response:
1. Go to https://supabase.com/privacy
2. Go to https://supabase.com/security
3. Look for:
   - ✅ SOC 2 Type II certification
   - ✅ Encryption at rest (AES-256)
   - ✅ Encryption in transit (TLS 1.2+)
   - ✅ Data deletion capabilities
   - ✅ Subprocessor list

**Step 2.3: Document Compliance**

Create a file: `docs/vendor-compliance/supabase-compliance.md`

```markdown
# Supabase Compliance Documentation

## Agreement Status
- [ ] DPA executed: [Date]
- [ ] DPA on file: [Location]
- [ ] Annual review scheduled: [Date]

## Security Certifications
- SOC 2 Type II: [Yes/No] - [Certificate Date]
- Last verified: [Date]

## Encryption Standards
- At rest: AES-256 (verified [Date])
- In transit: TLS 1.3 (verified [Date])

## Data Location
- Primary region: [e.g., us-west-1]
- Backup regions: [List]
- Data residency: United States

## Subprocessors
- AWS (infrastructure)
- [Others listed in Supabase docs]

## Contact Information
- Primary contact: [Supabase account manager]
- Security contact: security@supabase.com
- Support: support@supabase.com

## Review History
- [Date]: Initial compliance review
- [Date]: Annual review
```

**Step 2.4: Netlify Agreement (if using)**

If hosting on Netlify, same process:
1. Contact Netlify support
2. Request DPA for educational use
3. Document compliance

**Alternative:** If Supabase/Netlify can't provide adequate agreements, you may need to:
- Switch to vendors with education-specific agreements (e.g., AWS GovCloud, Azure for Education)
- Self-host (more complex)

**Deadline:** Complete before production launch

---

## ✅ Action 3: Add Access Logging (HIGH - Week 3)

### Why This Matters

FERPA requires maintaining records of who accesses student data. This is both for compliance AND security monitoring.

### What You Need to Do

**Step 3.1: Add database schema for access logs**

```prisma
// prisma/schema.prisma - ADD THIS MODEL

model AccessLog {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation("AccessLogs", fields: [userId], references: [id])
  referralId  String?
  referral    Referral? @relation("ReferralAccessLogs", fields: [referralId], references: [id])

  action      String   // 'VIEW', 'EDIT', 'EXPORT', 'DELETE', 'DOWNLOAD_DOCUMENT'
  resourceType String  // 'REFERRAL', 'DOCUMENT', 'ORDER'
  resourceId  String   // ID of the specific resource

  ipAddress   String?
  userAgent   String?
  timestamp   DateTime @default(now())

  @@index([userId])
  @@index([referralId])
  @@index([timestamp])
  @@index([action])
}

// ADD to User model
model User {
  // ... existing fields ...
  accessLogs  AccessLog[] @relation("AccessLogs")
}

// ADD to Referral model
model Referral {
  // ... existing fields ...
  accessLogs  AccessLog[] @relation("ReferralAccessLogs")
}
```

Run migration:
```bash
npx prisma migrate dev --name add_access_logging
```

**Step 3.2: Create logging utility**

```typescript
// lib/audit/access-logger.ts
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export type AccessAction =
  | 'VIEW'
  | 'EDIT'
  | 'EXPORT'
  | 'DELETE'
  | 'DOWNLOAD_DOCUMENT'
  | 'VIEW_CHECKLIST'
  | 'UPDATE_STATUS'

export async function logAccess(
  userId: string,
  action: AccessAction,
  resourceType: 'REFERRAL' | 'DOCUMENT' | 'ORDER',
  resourceId: string,
  request: NextRequest,
  referralId?: string
) {
  try {
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const userAgent = request.headers.get('user-agent') || 'unknown'

    await prisma.accessLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        referralId: referralId || (resourceType === 'REFERRAL' ? resourceId : null),
        ipAddress,
        userAgent,
      }
    })
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Access logging error:', error)
  }
}
```

**Step 3.3: Add logging to API routes**

```typescript
// Example: app/api/referrals/[id]/route.ts

import { logAccess } from '@/lib/audit/access-logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // ... authentication code ...

    const referral = await prisma.referral.findUnique({
      where: { id },
      include: { documents: true, statusHistory: true }
    })

    // LOG THE ACCESS
    await logAccess(
      user.id,
      'VIEW',
      'REFERRAL',
      id,
      request,
      id
    )

    return NextResponse.json({ referral })
  } catch (error) {
    // ...
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // ... authentication and update code ...

    // LOG THE EDIT
    await logAccess(
      user.id,
      'EDIT',
      'REFERRAL',
      id,
      request,
      id
    )

    return NextResponse.json({ referral: updated })
  } catch (error) {
    // ...
  }
}
```

**Apply to these routes:**
- ✅ `app/api/referrals/[id]/route.ts` - GET, PATCH
- ✅ `app/api/referrals/[id]/documents/[docId]/download/route.ts` - GET
- ✅ `app/api/referrals/[id]/status/route.ts` - PATCH
- ✅ `app/api/reports/enrollment/route.ts` - GET (for exports)
- ✅ Any other routes that access student data

**Step 3.4: Create admin access log viewer**

```typescript
// app/dashboard/admin/access-logs/page.tsx
import { prisma } from '@/lib/prisma'

export default async function AccessLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; referralId?: string; days?: string }>
}) {
  const params = await searchParams
  const days = parseInt(params.days || '30')
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const logs = await prisma.accessLog.findMany({
    where: {
      timestamp: { gte: startDate },
      ...(params.userId && { userId: params.userId }),
      ...(params.referralId && { referralId: params.referralId }),
    },
    include: {
      user: { select: { name: true, email: true, role: true } },
      referral: { select: { confirmationNumber: true, studentName: true } }
    },
    orderBy: { timestamp: 'desc' },
    take: 500,
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Access Logs</h1>

      {/* Add filters for user, referral, date range */}

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Timestamp</th>
            <th className="p-2 text-left">User</th>
            <th className="p-2 text-left">Action</th>
            <th className="p-2 text-left">Resource</th>
            <th className="p-2 text-left">Referral</th>
            <th className="p-2 text-left">IP Address</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t">
              <td className="p-2">{log.timestamp.toLocaleString()}</td>
              <td className="p-2">
                {log.user.name} ({log.user.role})
              </td>
              <td className="p-2">{log.action}</td>
              <td className="p-2">
                {log.resourceType} ({log.resourceId.slice(0, 8)}...)
              </td>
              <td className="p-2">
                {log.referral?.confirmationNumber || 'N/A'}
              </td>
              <td className="p-2">{log.ipAddress}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Deadline:** Complete before or shortly after production launch

---

## ✅ Action 4: Create Data Breach Response Plan (HIGH - Week 3-4)

### Why This Matters

California law requires breach notification. You need a plan BEFORE a breach occurs.

### What You Need to Do

**Step 4.1: Create the plan document**

Create: `docs/policies/data-breach-response-plan.md`

```markdown
# Data Breach Response Plan
## SPED Referrals System

**Effective Date:** [Date]
**Last Updated:** [Date]
**Next Review:** [One year from effective date]

---

## 1. PURPOSE

This plan outlines procedures for responding to unauthorized access or disclosure
of student education records in the SPED Referrals Management System.

---

## 2. DEFINITIONS

**Data Breach:** Unauthorized access to or disclosure of student education records
containing personally identifiable information (PII).

**PII in our system includes:**
- Student names, dates of birth
- Disability information
- IEP documents
- Psychoeducational reports
- Parent/guardian contact information
- School attendance records

---

## 3. BREACH RESPONSE TEAM

**Incident Commander:** [SPED Director Name] - [Phone] - [Email]
**Technical Lead:** [IT Director/Developer] - [Phone] - [Email]
**Legal Counsel:** [District Legal] - [Phone] - [Email]
**Communications:** [District Communications Director] - [Phone] - [Email]

---

## 4. RESPONSE PROCEDURES

### Phase 1: Detection & Containment (0-2 hours)

**Who detects:**
- System administrators monitoring access logs
- Staff reporting suspicious activity
- Automated security alerts
- External notification

**Immediate actions:**
1. **Contain the breach**
   - If unauthorized access: Disable affected user accounts
   - If system compromise: Take system offline if necessary
   - If data exfiltration: Block IP addresses
   - If vendor breach: Contact vendor immediately

2. **Notify Incident Commander**
   - Call: [Phone number]
   - Email: [Email address]
   - Available 24/7? [Yes/No - if no, specify escalation]

3. **Preserve evidence**
   - DO NOT delete logs
   - Screenshot any evidence
   - Document timeline
   - Save all related emails

### Phase 2: Assessment (2-24 hours)

**Incident Commander convenes response team to determine:**

1. **What happened?**
   - Type of breach (unauthorized access, accidental disclosure, etc.)
   - How did it occur?
   - When did it occur?
   - Is it still ongoing?

2. **What data was affected?**
   - Which students' records?
   - What specific data fields? (Check AccessLog table)
   - How many students affected?
   - Was data viewed only, or downloaded/copied?

3. **Who had unauthorized access?**
   - External attacker?
   - Unauthorized staff member?
   - Accidental disclosure to wrong person?
   - Vendor breach?

4. **Document everything**
   - Create incident report document
   - Timeline of events
   - List of affected students
   - Evidence collected

### Phase 3: Notification (24-72 hours)

**Internal Notification (Immediate):**
- Superintendent: Within 2 hours
- School Board: Within 24 hours
- IT Department: Immediately

**External Notification:**

**California Law Requirements (Civil Code § 1798.82):**
- Must notify affected individuals "without unreasonable delay"
- Must include:
  - Date or estimated date of breach
  - Type of information compromised
  - Contact information for questions
  - General description of incident

**Notification Template:**

```
Subject: Important Notice Regarding Student Records Security Incident

Dear [School District/Parent - if contacted directly],

We are writing to inform you of a security incident involving student education
records in our SPED Referrals system.

WHAT HAPPENED:
On [DATE], we discovered that [DESCRIPTION]. We immediately took steps to
[CONTAINMENT ACTIONS].

INFORMATION INVOLVED:
The following student information may have been accessed:
- Student name(s)
- [Other specific data elements]

This incident affected [NUMBER] student record(s).

ACTIONS TAKEN:
- [Immediate containment steps]
- [Investigation steps]
- [Enhanced security measures implemented]

WHAT WE ARE DOING:
- We have [fixed the vulnerability/enhanced security/etc.]
- We are conducting a thorough review of all security procedures
- We have [reported to appropriate authorities if applicable]

YOUR OPTIONS:
[If SSN or financial data involved, offer credit monitoring]
[Provide information on how to access records]

If you have questions about this incident, please contact:
[Name]
[Phone]
[Email]

We sincerely apologize for this incident and take the security of student
information very seriously.

Sincerely,
[SPED Director Name]
[Title]
```

**Notification to Submitting Schools:**
If the breach affects referrals from external schools, notify those schools
immediately so they can inform parents.

**FERPA Logging Requirement:**
Even though FERPA doesn't require direct notification, you MUST log the
unauthorized disclosure in the system:

```typescript
// Add to AccessLog or create separate UnauthorizedDisclosure table
await prisma.accessLog.create({
  data: {
    userId: 'SYSTEM',
    action: 'UNAUTHORIZED_ACCESS',
    resourceType: 'REFERRAL',
    resourceId: affectedReferralId,
    timestamp: breachDate,
    ipAddress: 'BREACH_INCIDENT',
    userAgent: 'Details: [breach description]'
  }
})
```

### Phase 4: Remediation (1-7 days)

1. **Fix the vulnerability**
   - Patch security flaw
   - Update access controls
   - Change compromised credentials
   - Update configurations

2. **Implement additional controls**
   - Enhanced monitoring
   - Additional access restrictions
   - Stronger authentication
   - More frequent audits

3. **Update policies and procedures**
   - Revise security policies
   - Update training materials
   - Add new controls

4. **Verify fix effectiveness**
   - Test the remediation
   - Conduct security review
   - External audit if warranted

### Phase 5: Documentation (7-30 days)

1. **Complete incident report**
   - Full timeline
   - Root cause analysis
   - Response actions taken
   - Lessons learned
   - Recommendations

2. **Update FERPA disclosure logs**
   - Document in each affected student's record (via AccessLog)
   - Include date, nature of disclosure, recipients

3. **File with authorities if required**
   - U.S. Department of Education (if required)
   - California Attorney General (if >500 residents affected)

4. **Retain documentation**
   - Keep all incident documentation for 7 years
   - Store securely with restricted access

---

## 5. POST-INCIDENT REVIEW

Within 30 days of resolution:

1. **Conduct root cause analysis**
   - What allowed this to happen?
   - Was it preventable?
   - Are there systemic issues?

2. **Update security measures**
   - Implement recommendations
   - Enhance monitoring
   - Update policies

3. **Retrain staff if needed**
   - Security awareness
   - Proper procedures
   - Incident reporting

4. **Update this plan**
   - Incorporate lessons learned
   - Improve response procedures

---

## 6. COMMON BREACH SCENARIOS & RESPONSES

### Scenario 1: Unauthorized Staff Access
**Example:** Teacher accesses referral they shouldn't see

**Response:**
- Review AccessLog to confirm unauthorized access
- Disable staff member's account
- Interview staff member
- Notify Incident Commander
- Determine if data was copied/shared
- If shared externally → full breach response
- If viewed only → document, retrain staff, disciplinary action
- Log the disclosure in the system

### Scenario 2: Lost/Stolen Device
**Example:** Staff laptop with cached student data is stolen

**Response:**
- Report to police immediately
- Assess what data was on device
- Was device encrypted? (Required!)
- Remotely wipe if possible
- Assume data compromised if not encrypted
- Notify affected individuals
- Full breach response

### Scenario 3: Email to Wrong Recipient
**Example:** Staff accidentally emails referral info to wrong person

**Response:**
- Contact recipient immediately to delete email
- Request confirmation of deletion
- If recipient is another school → likely OK, document
- If recipient is unauthorized → breach response
- Retrain staff on secure communication

### Scenario 4: Supabase/Vendor Breach
**Example:** Supabase notifies you of their security incident

**Response:**
- Get details from vendor (what data, when, who)
- Assess impact on your students
- Vendor should assist with notification
- Full breach response
- Review vendor agreement
- Consider alternative vendor

### Scenario 5: Ransomware Attack
**Example:** System encrypted by ransomware

**Response:**
- DO NOT PAY RANSOM initially
- Take system offline immediately
- Contact FBI (ransomware is federal crime)
- Assess if data was exfiltrated (not just encrypted)
- If exfiltrated → assume breach, notify
- Restore from backups
- Full security audit before bringing back online

---

## 7. PREVENTION MEASURES

**Technical Controls:**
- ✅ Signed URLs for document access (not public URLs)
- ✅ Access logging for all student data access
- ✅ Role-based access controls
- ✅ Encryption at rest and in transit
- ✅ Regular security updates
- ✅ Automated backups (Supabase)

**Administrative Controls:**
- ✅ Staff training on FERPA requirements
- ✅ Annual security awareness training
- ✅ Quarterly access log reviews
- ✅ Regular vendor compliance reviews
- ✅ Incident response drills (annually)

**Monitoring:**
- ✅ Review AccessLog weekly for anomalies
- ✅ Monitor failed login attempts
- ✅ Alert on bulk data exports
- ✅ Alert on access outside normal hours

---

## 8. CONTACT INFORMATION

**Internal:**
- Incident Commander: [Name, Phone, Email]
- Technical Lead: [Name, Phone, Email]
- Legal Counsel: [Name, Phone, Email]

**External:**
- Supabase Security: security@supabase.com
- Netlify Security: security@netlify.com
- FBI Cyber Division: [Local office number]

**Regulatory:**
- California Attorney General - Privacy Unit: (916) 210-6276
- U.S. Dept of Education - FERPA Office: (202) 260-3887

---

## 9. TESTING & REVIEW

**Annual Table-Top Exercise:**
- Date: [Schedule annually]
- Participants: Breach response team
- Scenario: [Simulated breach]
- Document lessons learned

**Annual Plan Review:**
- Review date: [Schedule annually]
- Update contact information
- Update procedures based on lessons learned
- Obtain approval from [Superintendent/Board]

---

**Plan Approval:**

[SPED Director Signature] _________________________ Date: _______
[IT Director Signature] ___________________________ Date: _______
[Superintendent Signature] ________________________ Date: _______
```

**Step 4.2: Identify and train response team**

1. Schedule meeting with: SPED Director, IT Director/Developer, Legal, Communications
2. Review the plan together
3. Assign roles
4. Exchange 24/7 contact information
5. Document in plan

**Step 4.3: Create notification templates**

Save these in `docs/policies/breach-notification-templates/`:
- `template-to-schools.md` (for submitting organizations)
- `template-to-parents.md` (if schools request you notify parents directly)
- `template-internal.md` (for superintendent/board)

**Deadline:** Complete before production launch

---

## ✅ Action 5: Verify Supabase Encryption (MEDIUM - Week 4)

### Why This Matters

FERPA requires "reasonable methods" to protect data. Encryption is considered essential.

### What You Need to Do

**Step 5.1: Verify PostgreSQL encryption**

1. Log into Supabase Dashboard
2. Go to Settings → Database
3. Confirm: "Encryption at rest: Enabled"
4. Should show: AES-256 encryption

**Step 5.2: Verify Storage encryption**

1. Supabase Dashboard → Storage
2. Supabase Storage uses AES-256 by default for all files
3. Verify in documentation: https://supabase.com/docs/guides/storage/security

**Step 5.3: Verify connection encryption**

1. Check `DATABASE_URL` in `.env` - should have `sslmode=require` or similar
2. All Supabase connections use TLS 1.3 by default

**Step 5.4: Document findings**

Add to `docs/vendor-compliance/supabase-compliance.md`:

```markdown
## Encryption Verification

**Verified Date:** [Date]
**Verified By:** [Name]

### Database (PostgreSQL)
- Encryption at rest: ✅ Enabled (AES-256)
- Encryption in transit: ✅ TLS 1.3
- Connection string SSL mode: require

### Storage
- Encryption at rest: ✅ Enabled (AES-256)
- Encryption in transit: ✅ TLS 1.3
- Bucket security: Private (signed URLs only)

### Backups
- Backup encryption: ✅ Enabled
- Backup location: [Region]
- Backup retention: [Days]

**Screenshots saved:** docs/vendor-compliance/screenshots/[date]/
```

**Deadline:** Complete during vendor agreement phase (Week 2-4)

---

## ✅ Action 6: Verify External Schools Have Authorization (MEDIUM - Week 5)

### Why This Matters

While YOU don't need parent consent to receive referrals, you need to verify that the SUBMITTING school is authorized to share the information.

### What You Need to Do

**Step 6.1: Add terms to submission form**

Update the referral submission form to include:

```typescript
// Add to interim referral form before submit button

<div className="border-t pt-6 mt-6">
  <h3 className="text-lg font-semibold mb-4">Authorization</h3>

  <div className="space-y-4">
    <Checkbox name="authorization" required>
      <span className="font-medium">
        I certify that I am an authorized representative of the submitting
        school/organization and have obtained all necessary permissions to
        share this student's education records for special education placement
        purposes.
      </span>
    </Checkbox>

    <div className="bg-blue-50 p-4 rounded">
      <p className="text-sm text-gray-700">
        <strong>Note:</strong> Under FERPA, you must have proper authorization
        (typically parent consent) to share student education records. By
        submitting this referral, you confirm that you have met all legal
        requirements to disclose this information.
      </p>
    </div>

    <div className="space-y-2">
      <label className="block text-sm font-medium">
        Submitter Name <span className="text-red-500">*</span>
      </label>
      <Input
        name="submitterName"
        required
        placeholder="Your full name"
      />

      <label className="block text-sm font-medium mt-4">
        Submitter Title <span className="text-red-500">*</span>
      </label>
      <Input
        name="submitterTitle"
        required
        placeholder="e.g., Special Education Coordinator"
      />

      <label className="block text-sm font-medium mt-4">
        Organization <span className="text-red-500">*</span>
      </label>
      <Input
        name="submitterOrganization"
        required
        placeholder="School/district name"
      />
    </div>
  </div>
</div>
```

**Step 6.2: Store authorization info**

Add to Referral model:

```prisma
// prisma/schema.prisma - ADD to Referral model

model Referral {
  // ... existing fields ...

  // Submitter Authorization
  submitterName         String?
  submitterTitle        String?
  submitterOrganization String?
  authorizationConfirmed Boolean @default(false)
  submissionIpAddress   String?
  submissionTimestamp   DateTime @default(now())
}
```

**Step 6.3: Capture on submission**

```typescript
// app/api/referrals/route.ts - in POST handler

const referral = await prisma.referral.create({
  data: {
    // ... existing fields ...

    // Authorization tracking
    submitterName: data.submitterName,
    submitterTitle: data.submitterTitle,
    submitterOrganization: data.submitterOrganization,
    authorizationConfirmed: data.authorization === true,
    submissionIpAddress: request.headers.get('x-forwarded-for') || 'unknown',
  }
})
```

**Why this helps:**
- Creates audit trail of who submitted
- Documents that submitter confirmed authorization
- Provides evidence of good faith compliance
- If submitter DIDN'T have authorization, that's THEIR FERPA violation, not yours

**Deadline:** Before production launch recommended, but can add shortly after

---

## ✅ Action 7: Add HTTPS Enforcement (LOW - Week 6)

### Why This Matters

Data in transit must be encrypted. While hosting providers usually handle this, enforce it in code.

### What You Need to Do

**Step 7.1: Update middleware**

```typescript
// middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // 1. Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    const proto = request.headers.get('x-forwarded-proto')
    if (proto !== 'https') {
      const url = request.nextUrl.clone()
      url.protocol = 'https:'
      return NextResponse.redirect(url, 301)
    }
  }

  // 2. Update Supabase session
  const response = await updateSession(request)

  // 3. Add security headers
  const headers = response.headers

  // Force HTTPS for 1 year (HSTS)
  headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  )

  // Prevent embedding in iframes (clickjacking protection)
  headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff')

  // XSS protection
  headers.set('X-XSS-Protection', '1; mode=block')

  // Referrer policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Step 7.2: Test**

1. Deploy to production
2. Try accessing via http:// → Should redirect to https://
3. Check headers in browser dev tools → Should see security headers

**Deadline:** Anytime before production, low priority

---

## ✅ Action 8: Create Simple Security Policy (LOW - Week 6-7)

### Why This Matters

Document your security practices for audits, compliance reviews, and training.

### What You Need to Do

Create: `docs/policies/data-security-policy.md`

```markdown
# Data Security Policy
## SPED Referrals Management System

**Effective Date:** [Date]
**Last Review:** [Date]
**Next Review:** [One year from now]

---

## 1. PURPOSE

This policy establishes security requirements for protecting student education
records in the SPED Referrals Management System, in compliance with FERPA and
California AB 1584.

---

## 2. SCOPE

Applies to:
- All staff accessing the SPED Referrals system
- All student education records in the system
- All external organizations submitting referrals

---

## 3. DATA CLASSIFICATION

All data in this system is classified as **FERPA-Protected Education Records**.

Includes:
- Student names, DOB, demographic information
- Disability information and IEP documents
- Psychoeducational evaluations
- Parent/guardian contact information
- School records and placement information

---

## 4. ACCESS CONTROL

### 4.1 Role-Based Access

**EXTERNAL_ORG (Submitting Schools):**
- Can: Submit new referrals
- Can: View their own submitted referrals
- Cannot: View other organizations' referrals
- Cannot: View SPED district internal information

**TEACHER (District Teachers):**
- Can: Submit material orders
- Can: View their own orders
- Cannot: Access referral information
- Cannot: Access other teachers' orders

**SPED_STAFF (SPED Staff):**
- Can: View all referrals
- Can: Update referral status
- Can: Review documents
- Can: Add notes and status updates
- Can: Approve orders

**ADMIN:**
- All SPED_STAFF permissions
- Can: Access enrollment reports
- Can: View access logs
- Can: Manage some system settings

**SUPER_ADMIN (IT/System Administrators):**
- Full system access
- Can: Manage user accounts
- Can: Access all system features
- Can: View audit logs
- Should: Only access student data when necessary for support

### 4.2 Account Management

- Each user must have individual account (no shared logins)
- Accounts created only after FERPA training completion
- Accounts disabled within 24 hours of staff departure
- Passwords managed by Supabase Auth (minimum 8 characters)
- MFA recommended for ADMIN and SUPER_ADMIN roles

---

## 5. DATA ENCRYPTION

### 5.1 Encryption at Rest
- Database: AES-256 encryption (Supabase PostgreSQL)
- File storage: AES-256 encryption (Supabase Storage)
- Backups: Encrypted automatically

### 5.2 Encryption in Transit
- All connections: TLS 1.3
- HTTPS enforced for all web traffic
- Database connections: SSL required

---

## 6. ACCESS LOGGING

All access to student records is logged, including:
- User accessing the record
- Type of access (view, edit, download)
- Timestamp
- IP address

Logs retained for 7 years and reviewed quarterly.

---

## 7. INCIDENT RESPONSE

See separate document: `data-breach-response-plan.md`

All suspected security incidents must be reported immediately to:
- [Incident Commander Name] - [Phone] - [Email]

---

## 8. DATA RETENTION

**Referral Records:**
- Retained while student is in district
- After graduation/transfer: Retained per district policy
- Deleted upon request if no longer needed (per IDEA)

**Access Logs:**
- Retained for 7 years

**Orders:**
- Retained per district fiscal policy

---

## 9. THIRD-PARTY VENDORS

All vendors storing student data must:
- Execute Data Processing Agreement
- Provide SOC 2 Type II certification or equivalent
- Use encryption at rest and in transit
- Notify us of breaches within 24 hours
- Delete data upon request

Current vendors:
- Supabase (database and storage)
- Netlify (hosting)

Vendor compliance reviewed annually.

---

## 10. STAFF RESPONSIBILITIES

All staff with system access must:
- Complete FERPA training before access granted
- Complete annual refresher training
- Only access records for legitimate educational purposes
- Never share login credentials
- Never email unencrypted student information
- Log out when leaving workstation
- Report security incidents immediately
- Use system only on secure networks (no public WiFi for accessing student data)

---

## 11. PROHIBITED ACTIONS

Staff must NEVER:
- Access student records without legitimate educational need
- Share student information with unauthorized persons
- Use student data for non-educational purposes
- Copy student data to personal devices
- Email student information to personal email
- Take screenshots of student data (unless for authorized purpose)
- Use public WiFi to access student data

Violations may result in:
- Immediate account suspension
- Disciplinary action
- Criminal prosecution (in severe cases)

---

## 12. TRAINING REQUIREMENTS

**Before Access Granted:**
- FERPA training (online or in-person)
- System security training
- Sign confidentiality agreement

**Annual:**
- FERPA refresher
- Security awareness training
- Review of this policy

**As Needed:**
- Incident response training
- New feature training

---

## 13. COMPLIANCE MONITORING

**Quarterly:**
- Access log review
- User account audit
- Security update check

**Annually:**
- Vendor compliance review
- Policy review and update
- External audit (if required)
- Incident response drill

---

## 14. POLICY VIOLATIONS

Report suspected violations to:
- [SPED Director] - [Email/Phone]
- [HR Director] - [Email/Phone]

All reports investigated promptly.

---

**Policy Approval:**

[SPED Director Signature] _________________________ Date: _______
[IT Director Signature] ___________________________ Date: _______
[Superintendent Signature] ________________________ Date: _______
```

**Deadline:** Before production launch, but lower priority than technical fixes

---

## Summary: Your 8-Week Implementation Plan

| Week | Action | Priority | Status |
|------|--------|----------|--------|
| 1 | Fix file storage security (signed URLs) | 🚨 CRITICAL | ⏳ |
| 2 | Execute vendor agreements (Supabase, Netlify) | 🚨 CRITICAL | ⏳ |
| 3 | Add access logging | ⚠️ HIGH | ⏳ |
| 3-4 | Create breach response plan | ⚠️ HIGH | ⏳ |
| 4 | Verify encryption settings | 📋 MEDIUM | ⏳ |
| 5 | Add authorization checkboxes to submission | 📋 MEDIUM | ⏳ |
| 6 | Add HTTPS enforcement | 📌 LOW | ⏳ |
| 6-7 | Create security policy document | 📌 LOW | ⏳ |

---

## What You DON'T Need to Do

Based on your specific use case, you do NOT need:

- ❌ **Parent consent forms** - That's the submitting school's responsibility
- ❌ **Annual FERPA notices to parents** - You're not the student's home school
- ❌ **Parent access request portal** - Parents request from their home school first
- ❌ **Field-level encryption** - Database-level encryption is sufficient
- ❌ **Complex DLP solutions** - Access controls are sufficient for your scale
- ❌ **Extensive policy documentation** - Simple, focused policies are better

---

## Testing Your Compliance

Before launch, test these scenarios:

### Test 1: File Security
- [ ] Upload a document to a referral
- [ ] Try accessing the file path directly → Should fail (404 or 403)
- [ ] Access via API as authorized user → Should work
- [ ] Wait for URL to expire → Should fail after expiration

### Test 2: Access Controls
- [ ] Create test user with EXTERNAL_ORG role
- [ ] Try to access another organization's referral → Should be denied
- [ ] Create test user with TEACHER role
- [ ] Try to access referrals → Should be denied
- [ ] Create test user with SPED_STAFF role
- [ ] Try to access all referrals → Should work

### Test 3: Access Logging
- [ ] View a referral
- [ ] Check AccessLog table → Should have entry
- [ ] Download a document
- [ ] Check AccessLog table → Should have entry
- [ ] View access logs in admin interface → Should see your actions

### Test 4: HTTPS Enforcement
- [ ] Try accessing via http:// → Should redirect to https://
- [ ] Check response headers → Should include security headers

---

## Getting Help

**Technical Questions:**
- Contact me (the developer) or your IT team

**Legal/Compliance Questions:**
- Contact your district legal counsel
- California Dept of Education Data Privacy Office: (916) 319-0800
- U.S. Dept of Education FERPA Office: (202) 260-3887

**Vendor Questions:**
- Supabase Support: support@supabase.com
- Netlify Support: support@netlify.com

---

## Ongoing Compliance (After Launch)

### Quarterly (Every 3 Months)
- Review access logs for anomalies
- Check for inactive accounts to disable
- Verify backups are working
- Apply security updates

### Annually (Every Year)
- Review vendor compliance (get updated SOC 2 reports)
- Update security policy
- Train all staff on FERPA
- Test incident response plan
- Review this checklist and update

---

## Compliance Certification

When complete, create `docs/FERPA-COMPLIANCE-CERTIFICATION.md`:

```markdown
# FERPA Compliance Certification
## SPED Referrals System

**Date:** [Date]
**Certified By:** [SPED Director Name and Title]

This certifies that the SPED Referrals Management System has implemented
the following FERPA compliance measures:

- ✅ Secure file storage with signed URLs (no public access)
- ✅ Data Processing Agreements executed with all vendors
- ✅ Access logging for all student record access
- ✅ Data breach response plan documented and team trained
- ✅ Encryption verified (AES-256 at rest, TLS 1.3 in transit)
- ✅ Authorization verification for submitting organizations
- ✅ HTTPS enforced with security headers
- ✅ Data security policy documented

**Next Review Date:** [One year from certification]

Signature: _________________________ Date: _______
```

---

**Questions about this plan? Review it with your:**
1. SPED Director (overall compliance)
2. IT Director/Developer (technical implementation)
3. Legal Counsel (legal requirements)
4. Superintendent (final approval)

Good luck! 🚀
