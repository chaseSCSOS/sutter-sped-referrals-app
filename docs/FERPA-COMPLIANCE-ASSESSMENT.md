# FERPA Compliance Assessment & Action Plan

**Document Created:** January 30, 2026
**System:** SPED Referrals and Orders Management System
**Location:** California

---

## Executive Summary

This document assesses the current FERPA (Family Educational Rights and Privacy Act) compliance status of the SPED Referrals and Orders Management System and provides a comprehensive action plan for achieving full compliance.

**Current Status:** ⚠️ **PARTIALLY COMPLIANT - IMMEDIATE ACTION REQUIRED**

The system has several strong foundations (access controls, audit trails) but has **critical gaps** that must be addressed before handling live student data, particularly regarding data security, parent consent, and third-party agreements.

---

## Table of Contents

1. [FERPA Overview](#ferpa-overview)
2. [Does FERPA Apply to This System?](#does-ferpa-apply-to-this-system)
3. [California-Specific Requirements](#california-specific-requirements)
4. [Current Compliance Status](#current-compliance-status)
5. [Critical Compliance Gaps](#critical-compliance-gaps)
6. [Action Plan](#action-plan)
7. [Technical Implementation Checklist](#technical-implementation-checklist)
8. [Policy & Procedure Requirements](#policy--procedure-requirements)
9. [Third-Party Service Agreements](#third-party-service-agreements)
10. [Ongoing Compliance Maintenance](#ongoing-compliance-maintenance)

---

## FERPA Overview

### What is FERPA?

The Family Educational Rights and Privacy Act (20 U.S.C. § 1232g; 34 CFR Part 99) is a federal law that protects the privacy of student education records. It applies to all schools that receive funds under an applicable program of the U.S. Department of Education.

### Key FERPA Rights

1. **Right to Inspect and Review** - Parents/eligible students can inspect education records
2. **Right to Request Amendment** - Parents/eligible students can request corrections
3. **Right to Control Disclosure** - Written consent generally required before disclosure
4. **Right to File Complaints** - With the U.S. Department of Education

### What are "Education Records" Under FERPA?

Education records include records directly related to a student and maintained by an educational agency or institution. This includes:

- ✅ Student names and demographic information
- ✅ Disability information and IEP documents
- ✅ Special education evaluations and assessments
- ✅ Referral information and placement decisions
- ✅ Contact information for parents/guardians
- ✅ School attendance and placement records

**Your system stores ALL of these types of records, making FERPA compliance mandatory.**

---

## Does FERPA Apply to This System?

### Answer: **YES - FERPA FULLY APPLIES**

Your system collects and maintains the following personally identifiable information (PII) from education records:

**From Referral Model:**
- Student name, date of birth, age, gender
- Disability information (primary disability, multiple disabilities)
- IEP documents and psychoeducational reports
- Special education services and placement information
- Parent/guardian names and contact information
- School attendance and residence information
- Native language, ethnicity, foster youth status
- Educational history and transcripts

**FERPA Classification:** These are "education records" containing "personally identifiable information" and are subject to full FERPA protections.

---

## California-Specific Requirements

### AB 1584 (2014) - Student Online Personal Information Protection Act (SOPIPA)

California law provides **additional** protections beyond FERPA:

1. **Contractual Requirements**: School districts must ensure contracts with service providers include:
   - Prohibition on selling student information
   - Prohibition on targeted advertising using student data
   - Data deletion upon request
   - Data security provisions

2. **Data Minimization**: Collect only data necessary for educational purposes

3. **Transparency**: Clear privacy policies accessible to parents

### AB 1584 Requirements for Your System:

✅ **Required Actions:**
1. Execute written agreements with all third-party vendors (Supabase, Netlify)
2. Include mandated privacy terms in vendor contracts
3. Maintain data inventory documenting what student data is collected and why
4. Provide privacy policy to external organizations submitting referrals

---

## Current Compliance Status

### ✅ **STRENGTHS - What You're Doing Right**

#### 1. Access Controls (STRONG)
- ✅ Role-based permissions system (`lib/auth/permissions.ts`)
- ✅ Authentication via Supabase Auth
- ✅ Authorization checks on all API routes
- ✅ Separation of roles (EXTERNAL_ORG, TEACHER, SPED_STAFF, ADMIN, SUPER_ADMIN)
- ✅ Users can only view records they have legitimate educational interest in

**Evidence:**
```typescript
// From lib/auth/permissions.ts
export const PERMISSIONS = {
  'referrals:view-own': ['EXTERNAL_ORG', 'TEACHER', 'SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'referrals:view-all': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'referrals:update': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
}
```

#### 2. Audit Trails (STRONG)
- ✅ Status changes tracked (`StatusHistory`, `OrderStatusHistory`)
- ✅ Changed by user recorded
- ✅ Timestamps on all changes
- ✅ Reason fields for status changes

**Evidence:** Status updates create audit entries (see `app/api/referrals/[id]/status/route.ts:69-77`)

#### 3. Data Accuracy Mechanisms (PARTIAL)
- ✅ Status tracking shows who last reviewed (`lastReviewedBy`, `lastReviewedAt`)
- ✅ Document verification workflow with review/rejection capability
- ⚠️ No parent amendment request mechanism yet

#### 4. Secure Authentication (STRONG)
- ✅ Supabase Auth with SSR (Server-Side Rendering)
- ✅ Session management via secure cookies
- ✅ Middleware refreshes sessions on every request

---

## Critical Compliance Gaps

### 🚨 **CRITICAL - Must Fix Before Production**

#### 1. **Data Security - File Storage**

**Issue:** Documents are accessed via `getPublicUrl()` in `lib/storage.ts:40-42`

```typescript
// CURRENT CODE - POTENTIALLY NON-COMPLIANT
const { data: urlData } = supabase.storage
  .from(bucket)
  .getPublicUrl(data.path)
```

**FERPA Risk:** Public URLs allow anyone with the URL to access FERPA-protected documents without authentication.

**Required Fix:** Use signed URLs with expiration and authentication checks.

**Impact:** HIGH - This is a potential data breach waiting to happen.

---

#### 2. **Missing Data Breach Response Plan**

**Issue:** No documented data breach notification procedures.

**FERPA Requirement:** While FERPA doesn't mandate breach notification, California law (Civil Code § 1798.82) DOES require notification when personal information is compromised.

**Required Actions:**
1. Develop incident response plan
2. Identify breach notification team
3. Create parent/guardian notification templates
4. Establish 180-day complaint timeline tracking
5. Document all unauthorized disclosures

**Impact:** HIGH - Legal liability if breach occurs without plan.

---

#### 3. **No Parent Consent Mechanism**

**Issue:** No system for obtaining or tracking parent consent for referrals.

**FERPA Requirement:** Generally need written consent before disclosing PII from education records. Exceptions exist for:
- School officials with legitimate educational interest ✅ (covered by your roles)
- Schools to which student is transferring ✅ (covered by referral purpose)
- Certain authorized representatives

**Required for External Organizations:**
When external organizations (EXTERNAL_ORG role) submit referrals, you need proof they have parent authorization to share this information.

**Required Actions:**
1. Add consent tracking to Referral model
2. Require consent documentation upload or digital signature
3. Track consent date and scope
4. Implement consent expiration

**Impact:** MEDIUM-HIGH - Without consent tracking, you cannot prove compliance.

---

#### 4. **Missing Third-Party Agreements**

**Issue:** No Data Processing Agreements (DPA) or Business Associate Agreements documented with:
- Supabase (database & storage provider)
- Netlify (hosting provider)

**FERPA Requirement:** Schools must use "reasonable methods" to ensure service providers protect student data.

**California AB 1584 Requirement:** Written contracts must include specific privacy provisions.

**Required Actions:**
1. Execute DPA with Supabase that includes:
   - Commitment to FERPA compliance
   - Data security requirements
   - Prohibition on secondary use
   - Data deletion upon request
   - Breach notification obligations
2. Execute similar agreement with Netlify
3. Document all third-party vendors accessing student data
4. Maintain vendor compliance files

**Impact:** HIGH - Regulatory compliance requirement, potential loss of federal funding.

---

#### 5. **No Annual FERPA Notification**

**Issue:** No mechanism to notify parents of their FERPA rights.

**FERPA Requirement:** Schools must annually notify eligible students and parents of their rights under FERPA (34 CFR § 99.7).

**Required Actions:**
1. Create FERPA rights notice content
2. Implement notification during referral submission
3. Track acknowledgment of receipt
4. Provide Spanish translation (California requirement for Spanish-speaking families)

**Impact:** MEDIUM - Required for compliance, but less urgent than data security issues.

---

#### 6. **No Data Retention and Destruction Policy**

**Issue:** No documented policy for how long records are kept or how they're destroyed.

**FERPA/IDEA Requirement:** Must inform parents when information is no longer needed and destroy upon request (for special education records under IDEA Part B).

**Required Actions:**
1. Define retention periods by record type
2. Implement automated retention tracking
3. Create secure deletion procedures
4. Add "request destruction" feature for parents
5. Log all deletions for compliance

**Impact:** MEDIUM - Required under IDEA for special education records.

---

### ⚠️ **IMPORTANT - Should Address Soon**

#### 7. **Encryption at Rest - Needs Verification**

**Issue:** Relying on Supabase default encryption without verification.

**FERPA Guidance:** U.S. Department of Education states unencrypted data containing FERPA-protected information is insecure.

**Required Actions:**
1. Verify Supabase encryption settings for PostgreSQL
2. Verify Supabase Storage encryption (should be AES-256)
3. Document encryption standards in security policy
4. Consider additional field-level encryption for highly sensitive data (SSN if collected, disability details)

**Impact:** MEDIUM - Likely already encrypted via Supabase, but must verify and document.

---

#### 8. **No Forced HTTPS for All Connections**

**Issue:** While Next.js production typically uses HTTPS, it's not enforced in code.

**FERPA Requirement:** Data in transit must be encrypted.

**Required Actions:**
1. Add HTTPS enforcement in middleware
2. Set HSTS headers (HTTP Strict Transport Security)
3. Verify all API calls use HTTPS
4. Document in security policy

**Impact:** MEDIUM - Likely handled by hosting, but should be enforced.

---

#### 9. **Insufficient Access Logging**

**Issue:** Status changes are logged, but not all data access.

**FERPA Requirement:** Must maintain record of disclosures (34 CFR § 99.32).

**Current State:** ✅ Status changes logged, ⚠️ Document views not logged

**Required Actions:**
1. Log all document downloads/views
2. Log referral views by user
3. Track export of enrollment reports
4. Implement access log retention (5+ years recommended)
5. Provide access log review interface for admins

**Impact:** MEDIUM - Required to demonstrate "reasonable methods" for security.

---

#### 10. **No User Data Access Request Mechanism**

**Issue:** No way for parents to request copies of their child's records electronically.

**FERPA Right:** Parents have right to inspect and review education records (34 CFR § 99.10).

**Required Actions:**
1. Add "Request Records" feature for external organizations
2. Implement secure record export (PDF or encrypted ZIP)
3. Track all access requests
4. Ensure 45-day response timeline compliance

**Impact:** LOW-MEDIUM - Required right, but can initially be handled manually.

---

## Action Plan

### Phase 1: Critical Security Fixes (Week 1-2) 🚨

**Priority: IMMEDIATE - Do not launch with live data until complete**

| Task | Description | Responsible | Status |
|------|-------------|-------------|--------|
| 1.1 | Replace `getPublicUrl()` with signed URLs | Dev Team | ⏳ Not Started |
| 1.2 | Implement document access authentication | Dev Team | ⏳ Not Started |
| 1.3 | Add document access logging | Dev Team | ⏳ Not Started |
| 1.4 | Set URL expiration (1 hour recommended) | Dev Team | ⏳ Not Started |

**Technical Details:** See [Technical Implementation Checklist](#technical-implementation-checklist)

---

### Phase 2: Third-Party Compliance (Week 2-3) 📄

**Priority: HIGH - Legal requirement before production**

| Task | Description | Responsible | Status |
|------|-------------|-------------|--------|
| 2.1 | Review Supabase terms for FERPA compliance | Legal/Admin | ⏳ Not Started |
| 2.2 | Execute Data Processing Agreement with Supabase | Legal/Admin | ⏳ Not Started |
| 2.3 | Execute similar agreement with Netlify | Legal/Admin | ⏳ Not Started |
| 2.4 | Document vendor compliance in files | Admin | ⏳ Not Started |
| 2.5 | Verify Supabase encryption settings | Dev/Admin | ⏳ Not Started |

---

### Phase 3: Consent & Notification (Week 3-4) 📋

**Priority: HIGH - Required for legitimate data collection**

| Task | Description | Responsible | Status |
|------|-------------|-------------|--------|
| 3.1 | Add consent tracking to database | Dev Team | ⏳ Not Started |
| 3.2 | Create FERPA rights notice content | Legal/Admin | ⏳ Not Started |
| 3.3 | Implement consent checkbox in referral form | Dev Team | ⏳ Not Started |
| 3.4 | Add consent document upload option | Dev Team | ⏳ Not Started |
| 3.5 | Create Spanish translation of notices | Translation | ⏳ Not Started |

**Database Schema Addition:**
```sql
-- Add to Referral model
parentConsentObtained     Boolean   @default(false)
parentConsentDate         DateTime?
parentConsentMethod       String?   -- 'DIGITAL_SIGNATURE', 'UPLOADED_FORM', 'VERBAL_RECORDED'
parentConsentDocumentPath String?
```

---

### Phase 4: Data Breach Response Plan (Week 4) 🚨

**Priority: HIGH - Required before production**

| Task | Description | Responsible | Status |
|------|-------------|-------------|--------|
| 4.1 | Develop incident response plan document | Legal/Admin | ⏳ Not Started |
| 4.2 | Identify breach response team members | Admin | ⏳ Not Started |
| 4.3 | Create notification templates | Legal | ⏳ Not Started |
| 4.4 | Establish breach logging system | Dev Team | ⏳ Not Started |
| 4.5 | Train staff on breach procedures | Admin | ⏳ Not Started |

**Required Plan Components:**
1. Detection and assessment procedures
2. Containment steps
3. Investigation process
4. Notification timelines (California law: "without unreasonable delay")
5. Remediation procedures
6. Documentation requirements

---

### Phase 5: Enhanced Access Controls (Week 5-6) 🔐

**Priority: MEDIUM-HIGH - Improve security posture**

| Task | Description | Responsible | Status |
|------|-------------|-------------|--------|
| 5.1 | Implement comprehensive access logging | Dev Team | ⏳ Not Started |
| 5.2 | Add access log viewer for admins | Dev Team | ⏳ Not Started |
| 5.3 | Enforce HTTPS in middleware | Dev Team | ⏳ Not Started |
| 5.4 | Add HSTS security headers | Dev Team | ⏳ Not Started |
| 5.5 | Implement session timeout (30 min recommended) | Dev Team | ⏳ Not Started |

---

### Phase 6: Data Management Features (Week 7-8) 🗂️

**Priority: MEDIUM - Required FERPA rights support**

| Task | Description | Responsible | Status |
|------|-------------|-------------|--------|
| 6.1 | Create data retention policy document | Legal/Admin | ⏳ Not Started |
| 6.2 | Implement retention tracking | Dev Team | ⏳ Not Started |
| 6.3 | Add secure data deletion feature | Dev Team | ⏳ Not Started |
| 6.4 | Create parent amendment request form | Dev Team | ⏳ Not Started |
| 6.5 | Build record export feature | Dev Team | ⏳ Not Started |

---

### Phase 7: Ongoing Compliance (Continuous) ♻️

**Priority: MEDIUM - Maintain compliance**

| Task | Description | Frequency |
|------|-------------|-----------|
| 7.1 | Review vendor compliance documentation | Annually |
| 7.2 | Send annual FERPA notification | Annually |
| 7.3 | Audit access logs | Quarterly |
| 7.4 | Review and update security policies | Annually |
| 7.5 | Train new staff on FERPA requirements | As needed |
| 7.6 | Test incident response procedures | Annually |

---

## Technical Implementation Checklist

### 1. Secure File Access Implementation

**Current Non-Compliant Code:**
```typescript
// lib/storage.ts - LINE 40-42 - DO NOT USE IN PRODUCTION
const { data: urlData } = supabase.storage
  .from(bucket)
  .getPublicUrl(data.path)
```

**Compliant Implementation:**

```typescript
// lib/storage.ts - UPDATED VERSION
/**
 * Get authenticated access URL for FERPA-protected document
 * @param bucket - Storage bucket name
 * @param path - File path
 * @param userId - User requesting access (for audit log)
 * @param referralId - Associated referral ID
 * @returns Signed URL with 1-hour expiration
 */
export async function getSecureDocumentUrl(
  bucket: string,
  path: string,
  userId: string,
  referralId: string
): Promise<string | null> {
  try {
    // 1. Log the access attempt
    await prisma.documentAccessLog.create({
      data: {
        userId,
        referralId,
        filePath: path,
        accessedAt: new Date(),
        ipAddress: '...', // Get from request headers
      }
    })

    // 2. Create signed URL (1 hour expiration)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600) // 1 hour

    if (error) {
      console.error('Signed URL error:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.error('Secure document access error:', error)
    return null
  }
}
```

**Required Database Schema:**
```prisma
model DocumentAccessLog {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  referralId  String
  referral    Referral @relation(fields: [referralId], references: [id])
  filePath    String
  accessedAt  DateTime @default(now())
  ipAddress   String?
  userAgent   String?

  @@index([userId])
  @@index([referralId])
  @@index([accessedAt])
}
```

---

### 2. Consent Tracking Implementation

**Database Schema Addition:**
```prisma
// Add to Referral model in schema.prisma
model Referral {
  // ... existing fields ...

  // FERPA Consent Tracking
  parentConsentObtained     Boolean   @default(false)
  parentConsentDate         DateTime?
  parentConsentMethod       String?   // 'DIGITAL_SIGNATURE', 'UPLOADED_FORM', 'VERBAL_RECORDED'
  parentConsentDocumentPath String?
  consentScope              String?   // What the consent covers
  consentExpirationDate     DateTime?

  // ... rest of model ...
}
```

**UI Implementation:**
```typescript
// Add to referral submission form
<div className="consent-section">
  <h3>Parent/Guardian Consent (Required)</h3>
  <p className="text-sm text-gray-600">
    Under FERPA, we need verification that the parent/guardian has authorized
    the sharing of student information for this special education referral.
  </p>

  <div className="space-y-4">
    <RadioGroup name="consentMethod" required>
      <Radio value="DIGITAL_SIGNATURE">
        I have parent/guardian consent (digital signature)
      </Radio>
      <Radio value="UPLOADED_FORM">
        I have a signed consent form (will upload)
      </Radio>
    </RadioGroup>

    {consentMethod === 'UPLOADED_FORM' && (
      <FileUpload
        name="consentDocument"
        accept=".pdf,.jpg,.png"
        required
      />
    )}

    <Checkbox name="ferpaAcknowledgment" required>
      I acknowledge that this information is protected under FERPA and will
      be used solely for special education placement purposes.
    </Checkbox>
  </div>

  <details className="mt-4">
    <summary className="cursor-pointer text-blue-600">
      View FERPA Rights Notice
    </summary>
    <div className="mt-2 p-4 bg-gray-50 rounded">
      {/* FERPA rights content */}
    </div>
  </details>
</div>
```

---

### 3. Enhanced Access Logging

**API Route Middleware:**
```typescript
// lib/middleware/access-logger.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function logReferralAccess(
  userId: string,
  referralId: string,
  action: 'VIEW' | 'EDIT' | 'EXPORT' | 'DELETE',
  request: NextRequest
) {
  const ipAddress = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  await prisma.accessLog.create({
    data: {
      userId,
      referralId,
      action,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    }
  })
}
```

**Apply to All API Routes:**
```typescript
// app/api/referrals/[id]/route.ts
export async function GET(request: NextRequest, { params }: RouteParams) {
  // ... authentication ...

  // LOG THE ACCESS
  await logReferralAccess(user.id, id, 'VIEW', request)

  // ... return referral data ...
}
```

---

### 4. HTTPS Enforcement

**Middleware Update:**
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production' &&
      request.headers.get('x-forwarded-proto') !== 'https') {
    return NextResponse.redirect(
      `https://${request.headers.get('host')}${request.nextUrl.pathname}`,
      301
    )
  }

  // Add security headers
  const response = await updateSession(request)

  // HSTS: Force HTTPS for 1 year
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  )

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block')

  return response
}
```

---

### 5. Session Timeout Implementation

**Auth Hook Update:**
```typescript
// lib/auth/hooks.ts
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes in milliseconds

export function useSessionTimeout() {
  const router = useRouter()

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const resetTimeout = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        // Log out user
        router.push('/auth/login?timeout=true')
      }, SESSION_TIMEOUT)
    }

    // Reset on user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, resetTimeout)
    })

    // Initial timeout
    resetTimeout()

    // Cleanup
    return () => {
      clearTimeout(timeoutId)
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout)
      })
    }
  }, [router])
}
```

---

## Policy & Procedure Requirements

### 1. Data Security Policy (Required Document)

Create `docs/policies/data-security-policy.md` with:

**Required Sections:**
1. **Purpose and Scope**
   - Applies to all staff accessing SPED referral system
   - Covers student education records protected by FERPA

2. **Data Classification**
   - Level 1: Public (none in this system)
   - Level 2: Internal Use Only (aggregate reports)
   - Level 3: FERPA-Protected (all student records)

3. **Access Controls**
   - Role-based access (document the 5 roles)
   - Principle of least privilege
   - Password requirements (defer to Supabase Auth)
   - Multi-factor authentication (recommended for ADMIN/SUPER_ADMIN)

4. **Data Encryption**
   - At rest: AES-256 (Supabase PostgreSQL & Storage)
   - In transit: TLS 1.2+ (HTTPS)
   - Backups: Encrypted (verify with Supabase)

5. **Incident Response**
   - Definition of data breach
   - Reporting procedures
   - Notification timelines
   - Remediation steps

6. **Data Retention and Disposal**
   - Retention periods by record type
   - Secure deletion procedures
   - Parent destruction requests

7. **Audit and Monitoring**
   - Access log retention: 7 years
   - Regular security reviews: Quarterly
   - Compliance audits: Annually

8. **Training Requirements**
   - All users must complete FERPA training
   - Annual refresher training
   - Document training completion

---

### 2. FERPA Notice to Parents (Required Content)

Create `docs/notices/ferpa-rights-notice.md` in English and Spanish:

**Required Content:**

> **Notice of Rights Under the Family Educational Rights and Privacy Act (FERPA)**
>
> The Family Educational Rights and Privacy Act (FERPA) affords parents and students who are 18 years of age or older ("eligible students") certain rights with respect to the student's education records. These rights are:
>
> 1. **The right to inspect and review the student's education records** within 45 days after the day the [School District] receives a request for access.
>
> 2. **The right to request the amendment of the student's education records** that the parent or eligible student believes are inaccurate, misleading, or otherwise in violation of the student's privacy rights under FERPA.
>
> 3. **The right to provide written consent before the district discloses personally identifiable information** (PII) from the student's education records, except to the extent that FERPA authorizes disclosure without consent.
>
> 4. **The right to file a complaint** with the U.S. Department of Education concerning alleged failures by the District to comply with the requirements of FERPA. The name and address of the Office that administers FERPA is:
>
> Family Policy Compliance Office
> U.S. Department of Education
> 400 Maryland Avenue, SW
> Washington, DC 20202
>
> **How We Protect Your Child's Information:**
> - All information is stored securely with encryption
> - Access is limited to authorized school personnel with a legitimate educational interest
> - We maintain detailed records of who accesses your child's information
> - Information is never sold or used for marketing purposes
>
> **Your Options:**
> - Request to inspect your child's education records
> - Request corrections to inaccurate information
> - Request a copy of records we maintain
> - Request deletion of information when no longer needed (for certain records)
>
> **For Questions or to Exercise Your Rights:**
> Contact [SPED Director Name] at [phone] or [email]

**Implementation:** Display this notice:
- During referral submission
- In external organization account dashboard
- In annual email to all external organization users

---

### 3. Data Breach Response Plan (Required Document)

Create `docs/policies/data-breach-response-plan.md`:

**Required Components:**

#### A. Breach Definition
A security breach that compromises the security, confidentiality, or integrity of student education records.

**Examples:**
- Unauthorized access to student records
- Accidental disclosure to unauthorized party
- Lost/stolen device containing student data
- Malware/ransomware attack
- Misconfigured permissions allowing unauthorized access

#### B. Breach Response Team
- **Incident Commander:** [SPED Director]
- **Technical Lead:** [IT Director/Lead Developer]
- **Legal Advisor:** [District Legal Counsel]
- **Communications Lead:** [District Communications Director]
- **Privacy Officer:** [Designated FERPA Compliance Officer]

#### C. Response Procedures

**Step 1: Detection and Assessment (0-2 hours)**
1. Identify the breach source and scope
2. Contain the breach immediately (disable access, isolate systems)
3. Document everything (who, what, when, where, how)
4. Notify Incident Commander

**Step 2: Investigation (2-24 hours)**
1. Determine:
   - What data was accessed/disclosed?
   - How many students affected?
   - Who had unauthorized access?
   - Was data copied or just viewed?
2. Document timeline of events
3. Preserve evidence (logs, screenshots)

**Step 3: Notification (24-72 hours)**

**Internal Notification:**
- Superintendent: Immediate
- School Board: Within 24 hours
- IT Department: Immediate

**Legal Requirements - California Civil Code § 1798.82:**
- Affected individuals: "Without unreasonable delay"
- Notification must include:
  - Date of breach
  - Types of information compromised
  - Steps being taken
  - Contact information for questions

**FERPA Logging Requirement:**
- Record the disclosure in each affected student's education record
- Include date, nature of disclosure, parties involved

**Template Notification:**
```
Subject: Important Notice Regarding Your Child's Education Records

Dear Parent/Guardian,

We are writing to inform you of a security incident that may have involved your
child's education records. On [DATE], we discovered that [DESCRIPTION OF BREACH].

INFORMATION INVOLVED:
[List specific data elements: name, DOB, disability information, etc.]

ACTIONS TAKEN:
[Describe containment and remediation steps]

YOUR OPTIONS:
[Describe what parents can do if concerned]

CONTACT:
For questions, contact [NAME] at [PHONE/EMAIL]

We sincerely apologize for this incident and are committed to protecting your
child's information.

Sincerely,
[SPED Director Name]
```

**Step 4: Remediation (1-7 days)**
1. Fix the vulnerability
2. Implement additional controls
3. Update policies as needed
4. Conduct security review

**Step 5: Documentation (7-30 days)**
1. Complete incident report
2. Update FERPA disclosure logs
3. File with Department of Education if required
4. Retain all documentation for 5 years

#### D. Post-Incident Review
- Conduct root cause analysis
- Update security policies
- Implement preventive measures
- Retrain staff if needed

---

## Third-Party Service Agreements

### Required Agreement with Supabase

**Status:** ⚠️ **MUST EXECUTE BEFORE PRODUCTION**

**Required Contract Terms (Per California AB 1584):**

1. **FERPA Compliance**
   - Vendor acknowledges data is FERPA-protected
   - Vendor agrees to comply with FERPA requirements
   - Vendor will not use data for any purpose other than providing the service

2. **Data Security**
   - Encryption at rest (AES-256 minimum)
   - Encryption in transit (TLS 1.2+ minimum)
   - Regular security audits (SOC 2 Type II recommended)
   - Vulnerability management
   - Access controls and logging

3. **Prohibited Uses**
   - No selling of student information
   - No targeted advertising using student data
   - No data mining for non-educational purposes
   - No disclosure to third parties without consent

4. **Data Ownership and Portability**
   - School district retains ownership of all student data
   - Vendor will provide data export on request
   - Data deletion within 30 days of request

5. **Breach Notification**
   - Vendor must notify district within 24 hours of breach discovery
   - Vendor must cooperate with investigation
   - Vendor must assist with required notifications

6. **Audit Rights**
   - District can audit vendor's security practices
   - Vendor must provide compliance documentation
   - Annual compliance certification

7. **Data Deletion on Termination**
   - All student data deleted within 30 days of service termination
   - Vendor provides certification of deletion
   - Includes all backups and archives

8. **Subprocessors**
   - List of all subprocessors disclosed
   - School approval required for new subprocessors
   - Subprocessors must have equivalent data protection

**Action Item:** Contact Supabase to execute Enterprise Agreement with these terms, or review existing Supabase Terms of Service for compliance.

**Supabase Documentation to Review:**
- https://supabase.com/security
- https://supabase.com/privacy
- SOC 2 Type II certification status

---

### Required Agreement with Netlify

**Similar terms required.** Netlify's role is hosting/delivery, less direct data access than Supabase, but still requires DPA.

**Action Item:** Contact Netlify about Enterprise plan with compliance guarantees.

---

## Ongoing Compliance Maintenance

### Annual Tasks (Every Year)

1. **FERPA Notice Distribution** (Start of school year)
   - Send to all external organizations via email
   - Post on website
   - Include in new user onboarding
   - Document distribution

2. **Staff Training** (Before school year starts)
   - All new users complete FERPA training
   - Refresher for existing users
   - Document completion with certificates
   - Test knowledge with quiz

3. **Vendor Compliance Review** (Summer)
   - Review Supabase/Netlify compliance documentation
   - Request updated SOC 2 reports
   - Verify terms still adequate
   - Document review

4. **Policy Review** (End of school year)
   - Review data security policy
   - Review incident response plan
   - Update based on incidents or changes
   - Obtain approval from school board

5. **Compliance Audit** (Mid-year)
   - Review access logs for anomalies
   - Verify role assignments are appropriate
   - Check for inactive accounts to disable
   - Test data export/deletion procedures
   - Document findings

---

### Quarterly Tasks (Every 3 Months)

1. **Access Log Review**
   - Review access logs for unusual patterns
   - Verify all access was authorized
   - Check for failed login attempts
   - Follow up on any concerns

2. **Security Update Check**
   - Review Supabase security advisories
   - Check for application security updates
   - Apply patches as needed
   - Test after updates

3. **User Account Audit**
   - Review all active accounts
   - Disable accounts for departed staff
   - Verify role assignments
   - Check for shared accounts (prohibited)

---

### Monthly Tasks (Every Month)

1. **Backup Verification**
   - Confirm backups are running (Supabase handles)
   - Verify backup encryption
   - Test restoration process quarterly

2. **Incident Log Review**
   - Review any security incidents
   - Check for patterns
   - Update procedures as needed

---

### As-Needed Tasks

1. **New User Onboarding**
   - Complete FERPA training before access
   - Sign confidentiality agreement
   - Receive role assignment based on job duties
   - Document training completion

2. **User Offboarding**
   - Disable account immediately upon departure
   - Transfer assigned referrals to other staff
   - Document account closure
   - Retrieve any printed materials

3. **Parent Request Handling**
   - Respond within 45 days (FERPA requirement)
   - Provide records in requested format
   - Log the disclosure
   - Charge reasonable copy fees if applicable

---

## Summary of Next Steps

### BEFORE LAUNCHING WITH LIVE DATA:

1. ✅ **Week 1-2: Fix file access security**
   - Implement signed URLs
   - Add access logging
   - Test thoroughly

2. ✅ **Week 2-3: Execute vendor agreements**
   - Contact Supabase for DPA
   - Contact Netlify for DPA
   - Review and sign agreements

3. ✅ **Week 3-4: Implement consent tracking**
   - Update database schema
   - Add to referral form
   - Create FERPA notice

4. ✅ **Week 4: Create breach response plan**
   - Assemble response team
   - Document procedures
   - Create notification templates

### AFTER LAUNCH (Ongoing):

5. ✅ **Week 5-6: Enhanced security**
   - Comprehensive access logging
   - HTTPS enforcement
   - Session timeout

6. ✅ **Week 7-8: Data management**
   - Retention policy
   - Amendment request process
   - Record export feature

7. ✅ **Continuous: Maintain compliance**
   - Annual notifications
   - Quarterly audits
   - Staff training

---

## Resources and References

### Federal Resources

- **FERPA Law:** 20 U.S.C. § 1232g
- **FERPA Regulations:** 34 CFR Part 99
- **Student Privacy Policy Office:** https://studentprivacy.ed.gov/
- **FERPA FAQs:** https://studentprivacy.ed.gov/frequently-asked-questions
- **File Complaint:** https://studentprivacy.ed.gov/file-a-complaint

### California Resources

- **California Department of Education - Data Privacy:** https://www.cde.ca.gov/ds/ed/dataprivacy.asp
- **California AB 1584:** Student Online Personal Information Protection Act
- **California Civil Code § 1798.82:** Breach Notification Law

### Best Practices

- **NIST Cybersecurity Framework:** https://www.nist.gov/cyberframework
- **CoSN Trusted Learning Environment (TLE) Seal:** https://www.cosn.org/focus-areas/trusted-learning-environment/tle-seal/

---

## Conclusion

Your SPED Referrals system handles highly sensitive student education records protected by FERPA. While you have strong foundations with access controls and audit trails, **critical security gaps must be addressed before launching with live student data.**

**Priority actions:**
1. Fix document access security (signed URLs)
2. Execute vendor agreements with Supabase/Netlify
3. Implement consent tracking
4. Create breach response plan

**Compliance is not a one-time checklist—it requires ongoing commitment** to protecting student privacy, training staff, monitoring access, and responding promptly to any incidents.

**Questions?** Consult with your district's legal counsel or privacy officer to ensure this plan meets your specific needs.

---

**Document Version:** 1.0
**Last Updated:** January 30, 2026
**Next Review:** Before production launch and annually thereafter
