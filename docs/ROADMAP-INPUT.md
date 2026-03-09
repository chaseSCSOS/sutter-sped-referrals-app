# SPEDex Roadmap Input

Last updated: 2026-03-07
Related context: `docs/LLM-PROJECT-CONTEXT.md`

## Purpose

Use this document as structured input for roadmap planning. It is designed for both humans and LLMs to:

- connect current product capabilities to real operational workflows
- identify gaps between current-state and target-state digitization
- prioritize initiatives with clear sequencing and dependencies
- define measurable outcomes

---

## Desired Outcomes (12-month horizon)

1. Referrals move from submission to decision faster, with fewer back-and-forth cycles.
2. Orders move from request to fulfillment with clear ownership and status clarity.
3. Admin operations (users, settings, catalog) become predictable and low-friction.
4. Reporting supports enrollment planning without spreadsheet reconciliation.
5. FERPA/compliance posture improves from partially compliant toward production-grade.

---

## Workflow Digitization Tie-In Map

| Legacy workflow / artifact | Current digital implementation | Data/API foundation | Gap to close | Candidate roadmap theme |
|---|---|---|---|---|
| Referral packet intake (multiple program types) | Public form selection + 3 referral forms | `Referral`, `FormType`, `POST /api/referrals` | Validation consistency, submission quality checks, guided remediation | Intake quality + submitter UX |
| Referral status calls/emails | Public confirmation + status lookup page | `confirmationNumber`, `GET /api/referrals/lookup` | More actionable progress messaging and next-step guidance | Submitter transparency |
| Manual review queue | Staff referrals list + detail + assignment + checklist | `referrals:view-all`, checklist routes, status routes | Assignment load balancing, SLA visibility, queue prioritization | Review efficiency |
| Missing-document loops | Checklist item status + re-upload path | `DocumentChecklistItem`, `POST /api/referrals/[id]/documents` | Better structured rejection reasons + submitter task list | Remediation workflow |
| Class list spreadsheet | Class List page with filters + CSV | `GET /api/referrals`, class-list UI | Data normalization and ownership model (silo/teacher consistency) | Reporting reliability |
| Enrollment projections spreadsheet view | Enrollment report page + API aggregates | `GET /api/reports/enrollment` | Snapshotting, trend lines, forecasting confidence | Planning intelligence |
| Supply order emails/threads | My Orders / All Orders / Order detail and status history | `Order`, `OrderItem`, order APIs | richer status model (approval/procurement stages), procurement handoff clarity | Order operations |
| Protocol assessment ordering | Submit-protocol page + catalog-backed line items | `Assessment*` models + orderType | Catalog governance and adoption controls | Catalog governance |
| User account requests via ad hoc process | Signup + pending approval + admin user management | `User`, `/api/users*`, invitations | Approval SLA and role governance audit trails | Admin governance |
| Broadcast operational updates | Staff changelog page from markdown source | `/dashboard/changelog` + `USER-CHANGES.md` | release ops cadence and update discoverability | Communication ops |

---

## Priority Themes

## Theme A: Referral Throughput and Quality

Goal: Reduce referral cycle time and reduce avoidable rework.

## Theme B: Order Workflow Maturity

Goal: Improve request-to-fulfillment visibility and accountability.

## Theme C: Governance, Compliance, and Risk Reduction

Goal: Strengthen FERPA-aligned controls and operational resilience.

## Theme D: Decision Support and Planning

Goal: Upgrade reporting from static exports to reliable operational intelligence.

---

## Initiative Backlog (Prioritized)

Scoring key:

- Impact: `H` / `M` / `L`
- Effort: `H` / `M` / `L`
- Priority bucket: `Now` (0-3 mo), `Next` (3-6 mo), `Later` (6-12 mo)

| ID | Initiative | Workflow(s) affected | Primary roles | Impact | Effort | Priority | Dependencies | Success metric |
|---|---|---|---|---|---|---|---|---|
| R1 | Referral Queue Prioritization + SLA indicators | referral review queue | SPED staff, admin | H | M | Now | none | median time `SUBMITTED -> UNDER_REVIEW` down 30% |
| R2 | Structured Rejection Reasons + Submitter Task Checklist | referral remediation | submitter, SPED staff | H | M | Now | R1 | re-submission acceptance rate up 25% |
| R3 | Assignment Rules Engine (staff load, role, silo) | referral triage | SPED staff, admin | H | H | Next | R1 | unassigned referrals >48h reduced to near-zero |
| R4 | Reviewer Workbench UX (bulk actions + keyboard flow) | referral processing | SPED staff | M | M | Next | R1 | referrals processed per reviewer/day up 20% |
| O1 | Extended Order Status Model (approval/procurement/received) | order fulfillment | teacher, SPED staff, admin | H | M | Now | none | status ambiguity tickets reduced 40% |
| O2 | Protocol Catalog Governance (lifecycle + ownership + deprecations) | protocol ordering | admin, SPED staff | M | M | Next | O1 | stale catalog items reduced 80% |
| O3 | Vendor/PO/Tracking workflow completeness | order ops | SPED staff, admin | M | M | Next | O1 | orders missing operational metadata reduced 50% |
| O4 | Requestor Notifications by milestone templates | order transparency | teacher/requestor | M | L | Now | O1 | requestor follow-up emails/calls reduced 30% |
| G1 | Compliance Hardening Sprint (file access controls, consent tracking model) | referrals + docs | admin, security stakeholders | H | H | Now | none | close top critical FERPA assessment gaps |
| G2 | Audit Trail Consolidation (who/what/when across referral+order actions) | cross-cutting | admin, compliance | H | M | Next | G1 | audit reconstruction time < 30 min/event |
| G3 | Data Retention and Archival Policy Enforcement | cross-cutting | admin | M | M | Later | G1 | documented retention policy enforced 100% |
| A1 | Enrollment Report v2 (snapshots + trend windows + cohort filters) | planning/reporting | SPED staff, admin | H | M | Next | data model review | report prep time reduced 50% |
| A2 | Class List Data Quality Rules (silo/assignment requiredness + validation) | class list operations | SPED staff, admin | M | L | Now | none | records missing key planning fields < 5% |
| A3 | Executive Dashboard Layer (monthly KPIs + bottleneck diagnostics) | decision support | leadership/admin | M | M | Later | A1 | monthly planning cycle time reduced 30% |
| U1 | Admin Approval Pipeline (queue, SLA, reminders) | onboarding governance | admin | M | M | Next | none | pending account age >7 days near-zero |
| U2 | Role Governance Guardrails (role change approvals + reason codes) | user admin | admin/super admin | M | L | Next | U1 | unauthorized role change incidents = 0 |
| P1 | API Reliability + Test Coverage uplift for core workflows | cross-cutting | engineering | H | H | Now | none | critical-path API test coverage >80% |
| P2 | Observability (structured logs, alerts, error budgets) | cross-cutting | engineering/admin | H | M | Next | P1 | MTTR reduced by 40% |

---

## Suggested Phasing

## Phase 1 (0-3 months): Stabilize and de-risk

Focus:

- R1, R2, O1, O4, G1, A2, P1

Why this first:

- directly improves throughput and clarity on active workflows
- addresses highest risk/compliance concerns
- creates clean baseline for automation and analytics

## Phase 2 (3-6 months): Automate and scale operations

Focus:

- R3, R4, O2, O3, G2, A1, U1, U2, P2

Why here:

- depends on cleaner baseline from Phase 1
- increases operational leverage and planning confidence

## Phase 3 (6-12 months): Institutionalize intelligence

Focus:

- G3, A3 and deeper integration opportunities (district systems/procurement exports)

Why here:

- best value after process standardization and data quality improvements

---

## KPI Framework (Recommended)

## Referral KPIs

- Submission quality:
  - `% referrals requiring missing-doc cycle`
- Throughput:
  - median days `SUBMITTED -> UNDER_REVIEW`
  - median days `SUBMITTED -> final decision`
- Review efficiency:
  - referrals reviewed per staff per week
- Submitter experience:
  - average re-submission count per referral

## Order KPIs

- Throughput:
  - median days `NEW -> SHIPPED`
  - median days `NEW -> RECEIVED`
- Operational completeness:
  - `% orders with vendor/PO/tracking populated`
- Transparency:
  - requestor follow-up volume per 100 orders

## Governance / Compliance KPIs

- `% privileged actions with complete audit metadata`
- `% active workflows with documented consent/authorization artifacts`
- incident detection and resolution SLA

## Reporting KPIs

- time to produce monthly enrollment planning packet
- discrepancy rate between class list exports and planning workbook

---

## Assumptions and Open Questions

1. Is SPED staff assignment intended to remain manual-first, or move to auto-routing by default?
2. Should order workflow include explicit approval state before procurement begins?
3. Which FERPA compliance actions are mandatory before expanding user base?
4. Is there a target monthly referral volume that should define scaling requirements?
5. Should class list and enrollment reporting be considered system-of-record outputs (not just exports)?

---

## LLM Prompt Starter (Use with this file)

Use this prompt with an LLM:

```
Using docs/LLM-PROJECT-CONTEXT.md and docs/ROADMAP-INPUT.md, produce:
1) a 2-quarter roadmap proposal,
2) an initiative sequence with dependencies,
3) a risk register,
4) KPI targets with baseline assumptions,
5) a recommended implementation plan (epics + milestones) for engineering and operations.

Constraints:
- preserve existing role model and core workflows
- prioritize FERPA/compliance risk reduction early
- optimize for measurable cycle-time improvements in referral and order workflows
```

