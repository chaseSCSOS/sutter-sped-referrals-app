# Interim Packet Backend + Form Alignment Design

Document Version: 1.0
Created: 2026-01-26
Clarification Rounds: 1
Quality Score: 92/100

## Background
The SPED interim referral packet includes a checklist page, Form 31 (interim placement form), and a full Release of Information (ROI) form. The web app currently captures most of the Form 31 data but does not include IEP/Psycho report dates and does not implement the backend document checklist workflow required by the packet. Signatures for non‑submitter parties must be collected via uploaded signed documents rather than in‑app signatures.

## Goals
1. Align the digital referral with the packet, adding missing non‑signature fields.
2. Provide SPED staff a document checklist workflow with auditability.
3. Track IEP/Psycho report dates in structured fields.
4. Manage Release of Information as a required checklist item with optional structured metadata.
5. Handle Non‑SEIS Interim Placement Form as a conditional required document.

## Non‑Goals
- No digital signature capture for non‑submitter parties.
- No workflow automation beyond checklist status and resubmission.
- No advanced analytics or reporting in this phase.

## Actors & Permissions
- Submitting organization: create referral, upload documents, view checklist status and reasons.
- SPED staff: view all referrals, update checklist status, add rejection reasons, optionally record ROI metadata.
- Admin: same as SPED staff (optional extended oversight).

## Form Changes (Non‑Signature)
Add to referral submission form:
- Current IEP Date (date)
- Current Psychoeducational Report Date (date)
- Non‑SEIS IEP? (Yes/No)

## Document Checklist Workflow

### Checklist Items (derived from packet)
Required by default:
- Student Registration Form
- Current Immunization Record
- Signed Authorization for Release of Information
- Current IEP (plus IEP Date)
- Current Psychoeducational Report (plus Report Date)

Conditional:
- Home Language Survey (required unless grade == PreK)
- Transcripts (required if grade in 9–12)
- Interim Placement Form (required if Non‑SEIS IEP == Yes)

### Item Statuses
- pending: submitted, not reviewed
- accepted: verified
- rejected: invalid/incorrect/illegible (requires reason)
- missing: required but not submitted

### Workflow
1. On referral submission, generate checklist items based on conditional rules.
2. Uploads attach to the checklist item (allow multiple versions/files).
3. SPED staff reviews each item and sets status.
4. If rejected, SPED staff must include a reason; submitting org can re‑upload.
5. Preserve version history for audit trail.

## Release of Information (ROI) Management

### Required Document
- The signed ROI form is a required checklist item.

### Optional Structured Metadata
- Disclosing party (name/address/phone/fax)
- Receiving party (name/address/phone/fax)
- Purpose of request
- Information requested
- Effective date / expiration date
- Signed by / signed date (if readable from upload)

### Workflow
- Submitting org uploads signed ROI form.
- SPED staff reviews and sets status.
- Optional: SPED staff keys in structured metadata for reporting/search.

## Non‑SEIS Interim Placement Form
- Add Non‑SEIS IEP? (Yes/No) field.
- If Yes: Interim Placement Form becomes required checklist item.
- Submitting org uploads the signed form; SPED staff verifies.
- If No: mark as Not Required.

## Data Model Changes

### Referral (add fields)
- currentIepDate: Date
- currentPsychoeducationalReportDate: Date
- nonSeisIep: Boolean

### DocumentChecklistItem (new)
- id, referralId
- type (enum)
- required (boolean)
- status (enum)
- reviewedBy (userId)
- reviewedAt (timestamp)
- rejectionReason (text)
- version (int)
- createdAt, updatedAt

### DocumentFile (new or extend existing)
- id, checklistItemId
- filePath, fileName
- uploadedBy, uploadedAt

### ReleaseOfInformationMetadata (optional)
- referralId
- disclosingParty*, receivingParty*, purpose, infoRequested
- effectiveDate, expirationDate
- signedBy, signedDate

## API Surface (High‑Level)
- POST /api/referrals: create referral and checklist items
- GET /api/referrals/:id/checklist: list items + statuses
- POST /api/referrals/:id/documents: upload for a checklist item
- PATCH /api/referrals/:id/documents/:itemId: update status/reason (SPED only)
- PATCH /api/referrals/:id/release-info: save ROI metadata (SPED only)

## UI Changes
- Submission form: add IEP date, psycho report date, Non‑SEIS IEP field.
- Submitting org: checklist list with status + rejection reasons + re‑upload action.
- SPED staff: checklist review UI with filters and bulk status updates.

## Error Handling & Edge Cases
- Required doc missing at submit: status = missing.
- Reupload after rejection: increment version and keep history.
- Conditional items (home language survey / transcripts / non‑SEIS) must update if grade or nonSeisIep changes.

## Acceptance Criteria
- Checklist items are generated deterministically from grade/EL/Non‑SEIS rules.
- SPED can mark status and provide rejection reasons.
- Submitting org can re‑upload rejected docs.
- IEP/Psycho dates stored and visible to SPED staff.
- ROI and Non‑SEIS interim placement are handled as required checklist items.

## Implementation Phases

### Phase 1 — Data + API
- Add fields to Referral
- Create DocumentChecklistItem + DocumentFile
- Implement checklist generation
- Add upload and status update endpoints

### Phase 2 — UI for Submitter
- Add missing form fields
- Show checklist + status + re‑upload

### Phase 3 — SPED UI
- Checklist review view
- Status updates + reasons
- Optional ROI metadata editor

---

Notes:
- This spec assumes signatures from non‑submitter parties are captured via uploaded signed documents, not digital signatures.
- The ROI structured metadata is optional but recommended for search and compliance.
