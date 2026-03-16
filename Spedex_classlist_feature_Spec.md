
SPEDEX
Class List & Placement Manager


Feature Requirements & Implementation Specification

Prepared for SPEDEX Development Team
2026–2027 School Year

Version 1.0  •  Confidential  •  SPED Program Internal
 
1. Overview & Purpose

This document defines the requirements for the SPEDEX Class List & Placement Manager feature. It replaces a multi-sheet Excel workbook currently used as the master placement roster for the entire Special Education department across all program silos, school sites, and grade bands.

The spreadsheet being replaced covers 13 active sheets, 7 program silos, 16+ school sites, and tracks over 300 students annually. It is the current source of truth for student placement, staff assignments, referral status, year-end transitions, and transportation logistics.

This feature must eliminate manual duplication of data, replace free-text status tracking with structured fields, and introduce planning and workflow tools that do not currently exist anywhere in the team’s toolset.

2. Program Silos & Site Coverage

The system must support all seven program types. Each program has distinct grade bands, site assignments, and in some cases a different student data schema.

Program	Grade Band	Sites	Key Notes
ASD-Elem	Pre-TK, TK, K–5	Apricot, Riverbend, Lincrest, Lincoln, Park Ave	Largest program; AM/PM early childhood sessions; highest transfer volume
ASD-MidHS	6–8, 9–12	Gray Ave, Barry, Riverbend, YCHS, SUHS	Period-attendance and self-contained classrooms tracked differently
SD	PS–TK, K–2, 3–5, 6–8, 9–12	Butte Vista, YCHS, SUHS	Significant Disabilities; high 1:1 para burden
NC	K–2, 3–5, 6–8, 9–12	Butte Vista, Andros Karperos, YCHS	Non-Categorical; includes behavior-flagged students (*)
DHH	Pre-3, 4–8, 9–12	Tierra Buena, YCHS; SCSOS Itinerant (0–22)	Requires signing paras and interpreters tracked separately from class paras
ATP	18–22 (adult)	Feather River Academy, Yuba College	Different schema: tracks DOB, calculated age-out date, no grade level
MD	K–8, 9–12	Butte Vista, River Valley HS	Multiple Disabilities; medically complex students; LVN staff tracked

In addition to YCUSD, the system must support students with the following Districts of Residence (DOR):

LOUSD, ENHS, Franklin, Brittan, Meridian, PG/PGUSD, MJUSD, SUHS, Marcum, Nuestro, Winship-Robbins
Note: No Aeries or SEIS API integration is available. All SEIS/Aeries confirmation status must be managed via manual toggles with timestamps inside SPEDEX.

3. Core Data Model

The data architecture must be fully normalized. No data should exist in more than one place. All counts, statuses, and summaries must be computed from records, never manually entered.
3.1 Entities & Relationships

The following hierarchy defines the primary entities:

•	Program  →  Classrooms  →  Student Enrollments + Staff Assignments
•	Student  →  Enrollment History + Transfer Log + Transport Record + Transition Pipeline Record
•	Staff  →  Position Record (PC#) + Classroom Assignment + 1:1 Student Link (if applicable)
•	Para  →  either Class Para (linked to classroom) or 1:1 Para (linked to student; follows student on transfer)
3.2 Classroom Record

Each classroom must store the following structured fields:

Field	Type	Notes
program_silo	Enum: ASD-Elem, ASD-MidHS, SD, NC, DHH, ATP, MD	Required
site_name	String (from site lookup table)	Required
grade_band	Enum: Pre-TK, TK, K-2, 3-5, 6-8, 9-12, 18-22, Mixed	Required
session_number	String (Aeries session ID)	e.g. 8107, 2102
teacher_id	FK → Staff	Required; OPEN if vacant
position_control_number	String (PC#)	Tied to the teacher role
credentials	String / multi-select	e.g. ECE, M/M, Intern
session_type	Enum: AM, PM, Full Day, Period Attendance, Self-Contained	
is_open_position	Boolean	Triggers vacancy flag in staffing views
school_year	String (e.g. 2026-2027)	Required; enables year-over-year history
3.3 Student Enrollment Record

Field	Type	Notes
student_name_last	String	Last, First format stored separately
student_name_first	String	Supports preferred name / nickname
disability_code	Multi-select Enum	AUT, ID, MD, ASD, OHI, ED, SLD, SLI, Deaf, HH, EMD, ASD/D, ID/AUT, Aut/SLI, etc.
grade	Enum	17=Preschool, 17.5=TK-eligible, 18=Kinder-eligible, K, 1–12, 12+ (extended)
district_of_residence	Enum	YCUSD, LOUSD, ENHS, Franklin, Brittan, Meridian, PGUSD, MJUSD, SUHS, Marcum, Nuestro, Winship-Robbins
enrollment_status	Enum (see §3.4)	Primary status field. Replaces notes-based status tracking.
classroom_id	FK → Classroom	Current placement
requires_1_to_1	Boolean	
one_to_one_status	Enum: Assigned, Vacant, Temporary, Not Required	Only relevant when requires_1_to_1 = true
one_to_one_para_id	FK → Staff (nullable)	Null when vacant
seis_confirmed	Boolean	Manual toggle; no API available
aeries_confirmed	Boolean	Manual toggle; no API available
seis_confirmed_by	FK → User + Timestamp	Audit trail for confirmation
transfer_from_teacher	String (nullable)	Populated on inbound transfers; displayed in student record history
notes	Free text	For genuinely unstructured commentary only. NOT for status, transfers, or flags.
date_of_birth	Date (ATP only)	Required for ATP; used to auto-calculate age-out date
age_out_date	Date (ATP, computed)	Auto-calculated from DOB: Jan–Sep birthday = June age-out; Oct–Dec = December age-out
3.4 Enrollment Status Enum

This single enum replaces all free-text status annotations currently embedded in the NOTES column. Every student must have exactly one status at any time.

Status Value	Meaning
ACTIVE	Placed and attending. Confirmed in SEIS and Aeries.
REFERRAL_PENDING	Referral received; not yet placed; not yet in SEIS/Aeries.
REFERRAL_NOT_RECEIVED	Placement anticipated but referral paperwork has not arrived.
REFERRAL_ON_HOLD	Referral process is paused (e.g., parent request to wait).
PLACED_NOT_IN_SYSTEMS	Student placed in classroom but not yet confirmed in SEIS/Aeries.
HOME_INSTRUCTION	Student receiving instruction at home; not attending classroom.
RTD_IN_PROGRESS	Return to District initiated; multi-step checklist in progress.
EXITED	Student has completed exit process (RTD, graduation, age-out, or transfer out of program).
3.5 Staff Record

•	Fields: name, role (Teacher / Class Para / 1:1 Para / Interpreter / LVN / Signing Para), PC#, credentials, assigned_classroom_id, assigned_student_id (1:1 only), is_vacancy (boolean)
•	Vacancy logic: When a staff record is marked as a vacancy or deleted, the system auto-creates a VACANCY record retaining the PC# and role type.
•	1:1 para transfers: 1:1 paras are linked to a student, not a classroom. When a student transfers, the para assignment transfers with them. A vacancy is automatically created in the originating classroom.

4. Student Status Lifecycle

Students move through the following states. All state transitions must be logged with a timestamp and the user who made the change.

Transition	Trigger	System Action
New Referral → REFERRAL_PENDING	Manual intake in Referral Queue	Create student record; add to referral queue view
REFERRAL_PENDING → ACTIVE	Coordinator assigns to classroom	Create enrollment; update classroom count; SEIS/Aeries status set to unconfirmed
ACTIVE → Transfer	Coordinator initiates transfer workflow	Create transfer event record; move enrollment; if 1:1 para assigned, move para; create vacancy in origin classroom
ACTIVE → RTD_IN_PROGRESS	RTD initiated by coordinator	Create RTD checklist record; student remains in classroom until checklist complete
RTD_IN_PROGRESS → EXITED	All RTD checklist steps completed	Remove from classroom enrollment; flag SEIS and Aeries exits as pending
ACTIVE → EXITED (Age-Out)	Age-out date reached (ATP only)	Surface in age-out queue; coordinator completes SEIS/Aeries exits
Any status → HOME_INSTRUCTION	Manual toggle	Student remains on classroom roster with HOME_INSTRUCTION flag visible

5. Features to Build

5.1 Classroom Roster View
The primary working view. Displays all classrooms within a program silo, with one card per classroom.

•	Teacher name, PC#, credentials, site, grade band, session number
•	Class paras listed with names and PC#s
•	1:1 paras listed with name, PC#, and the student they are assigned to
•	Student list with: name, disability code, grade, DOR, enrollment status badge, 1:1 flag
•	Enrollment count: Total enrolled / Confirmed in SEIS / Confirmed in Aeries
•	1:1 coverage indicator: X students requiring 1:1, Y assigned, Z vacant
•	OPEN POSITION badge when teacher or para position is vacant
•	Ability to filter by site, grade band, DOR, status, or 1:1 vacancy
5.2 Sandbox / Planning Mode
The highest-priority net-new feature. Eliminates the copy-sheet planning anti-pattern. Multiple draft scenarios can be created and compared without touching live data.

•	Any coordinator can create a named Planning Draft for a future school year or reorganization scenario
•	Draft starts as a full clone of current live data
•	In draft mode: move students between classrooms, reassign paras, create new classrooms, open/close positions, rename teachers as OPEN
•	Multiple simultaneous drafts supported (e.g., “Scenario A: Open new K-2 at RB” vs “Scenario B: Merge Riverbend classrooms”)
•	Diff view shows all changes from live state: student moves, para reassignments, count changes, new vacancies, new 1:1 gaps
•	PC# Change Log auto-generated from the draft diff. No manual typing required.
•	PAR Needs list auto-generated: any new position in the draft without a PC# is flagged as needing a Position Authorization Request
•	Publish action: draft can be applied immediately or staged for a future effective date
•	Caseload balance view updates live as students are moved in draft mode: shows per-classroom count and 1:1 burden side by side
Note: This replaces the duplicate ASD-Elem reorganization sheet and the manually typed PC# change log table.
5.3 Transfer Workflow
Student transfers are structured events, not free-text notes. Both origin and destination classrooms carry the transfer in their history.

•	Fields: student_id, from_classroom_id, to_classroom_id, effective_date, reason (Enum), initiated_by (user), notes
•	Transfer reason enum: Grade Promotion, Caseload Balance, Behavior/Placement Change, Program Change, Parent Request, Other
•	On transfer: 1:1 para (if assigned) automatically moves with the student; vacancy auto-created in origin classroom
•	Both classrooms show the transfer event in their history with date and reason
•	SEIS/Aeries confirmation status resets to unconfirmed on transfer (must be re-confirmed in new placement context)
5.4 Referral Queue
A dedicated intake view for students in pre-placement states. Referrals are first-class records, not notes on a placed student.

•	Fields: student name, DOR, disability category (initial), grade, referral_received_date, status (REFERRAL_PENDING / REFERRAL_NOT_RECEIVED / REFERRAL_ON_HOLD), assigned_coordinator, hold_reason (if on hold), notes
•	Referrals that have not moved in 14 days auto-surface as stale with a visual flag
•	When placement is decided: referral converts to an enrollment record; student is assigned to a classroom; status becomes PLACED_NOT_IN_SYSTEMS
•	Referral history is retained on the student record after placement
5.5 Para Coverage Analyzer
Surfaces 1:1 coverage gaps across the entire program. No more manually reading through class lists to find unmatched 1:1 needs.

•	Program-level dashboard: total students requiring 1:1, total assigned, total vacant
•	Per-classroom breakdown: students with 1:1 required listed, with assigned para name or VACANT badge
•	Filter to show only classrooms with open 1:1 positions
•	In sandbox mode, this view updates live as students are moved or paras reassigned
5.6 SEIS / Aeries Manual Confirmation
No API access is available. Confirmation is managed as structured manual toggles per student.

•	Per-student: SEIS Confirmed toggle + Aeries Confirmed toggle
•	Each confirmation records: confirmed_by (user), confirmed_at (timestamp)
•	Classroom view shows count: N of M students confirmed in SEIS, N of M confirmed in Aeries
•	Program-level view surfaces all students not yet confirmed in either system as an actionable list
•	Students with status REFERRAL_PENDING or PLACED_NOT_IN_SYSTEMS automatically appear in the unconfirmed list
•	Confirmation status resets to unconfirmed when a student is transferred to a new classroom
Note: All confirmations must be timestamped and attributed to a user. This provides an audit trail equivalent to the manual “In SEIS/AERIES” count previously in the spreadsheet.
5.7 Year-End Transition Pipeline
Replaces the PromotingGradsRTD sheet with structured per-student checklists and a pipeline view by cohort type.

5.7.1 Cohort Types Supported
•	ATP Age-Outs (December) — students aging out mid-year
•	ATP Age-Outs (June) — students aging out at end of year
•	High School Graduates — 12th graders completing CC, Diploma, or Alt Pathway
•	HS Promoting to ATP — 12th graders entering ATP next year
•	Middle School Promoting to High School
•	5th Grade Promoting to Middle School
•	RTD (Return to District) — students exiting to gen ed or home district

5.7.2 RTD Checklist
Each RTD student has a structured 8-step checklist. Steps are individually completable with timestamp and user.

•	DOR Notified
•	Parent Notified
•	2nd Staffing Completed
•	Transition IEP Held
•	RTD Packet Completed and Turned into SPED Office
•	Packet Signed by Administrator and Scanned to DOR
•	Aeries Exit & 200 Completed
•	SEIS Exit Completed

If a checklist step is overdue based on configured deadlines, it surfaces as flagged in the pipeline view.

5.7.3 HS-to-ATP Promotion
Tracks: current teacher, program silo, course of study (CC / Diploma / Alt Pathway), projected ATP classroom, ATP caseload count. Caseload counts update automatically as students are assigned.

5.7.4 ATP Age-Out Automation
Age-out date is calculated automatically from date of birth. Rule: if birthday falls January–September, student finishes in June; if October–December, student finishes in December of the year they turn 22. Students appear in their respective queue (December or June) automatically.
5.8 Transportation Management
Transportation data is currently tracked across three separate sheets with safety-critical flags buried in name strings. This must be replaced with structured fields.

5.8.1 Student Transport Record
•	Fields: student_id, school_site, district_of_residence, transport_type (AM Only, PM Only, Full Day, Other District), bus_number, am_pm_flag, special_transport_notes
•	Safety flags as structured booleans: is_wheelchair, needs_car_seat, needs_safety_vest, needs_safety_lock, needs_bus_aide, rider_at_home, reduced_day_schedule
•	Transport records filter by school site, by DOR, and by any safety flag
•	Bus roster exports always reflect current safety flags — no manual annotation required
•	Pending transport status: flag students where transport is unconfirmed (replaces “does he ride bus?” notes)

5.8.2 Early Childhood AM/PM Log (AMPM)
•	Per-classroom: assigned bus numbers (AM and PM separately)
•	Staff shift schedule: arrive, break, lunch, depart times per para
•	Daily bus arrival log: per-site entries for AM arrive, AM depart, PM arrive, PM depart
•	Operational concerns log: timestamped entries (not cell text) for documenting bus inconsistencies, staffing issues, safety observations
5.9 Staffing & Position Control
•	PC# tracked on every teacher and para position
•	When a staff member is removed or marked as leaving, system auto-creates a VACANCY record preserving the PC# and role type
•	PC# Change Log view: shows all position changes this planning cycle with reason and action needed — auto-generated from sandbox diffs and manual staff changes
•	PAR Needs list: positions in sandbox drafts or current data that have no assigned PC# are listed as requiring Position Authorization Request
•	Credential tracking on teacher positions (ECE, M/M, Intern, DHH-specific, etc.)
•	DHH-specific: signing paras and interpreters tracked as separate role types from class paras; PC# tracked individually
5.10 Audit Log
All record changes must be logged. This is non-negotiable for a system tracking student placements.

•	Logged events: student status change, enrollment create/transfer/exit, para assignment change, SEIS/Aeries confirmation toggle, staff record create/update/vacancy, sandbox draft publish
•	Each log entry: entity type, entity ID, field changed, old value, new value, changed_by (user), changed_at (timestamp)
•	Audit log viewable per student, per classroom, per staff member, and as a program-wide feed

6. Required Views

The following views must be accessible from SPEDEX. Each view is a filtered/composed rendering of the underlying data model — not a separate copy of data.

View Name	Description
By Program	All classrooms within a program silo. Mirrors the spreadsheet tabs (ASD-Elem, ASD-MidHS, SD, NC, DHH, ATP, MD). Default landing view.
By Site	All classrooms at a given school campus, across all program silos at that site.
By Teacher	One teacher’s classroom, student roster, para assignments, and caseload history.
Student Profile	Full student record: current placement, enrollment history, transfer log, transport record, SEIS/Aeries status, transition pipeline status, notes.
Referral Queue	All students in pre-placement states. Filterable by status, DOR, coordinator. Surfaces stale referrals.
Para Coverage	Program-wide 1:1 coverage summary with per-classroom drill-down. Shows assigned vs vacant 1:1 positions.
Staffing Gaps	Open teacher positions, open para positions, unmatched 1:1 needs. Includes PC# and PAR status.
SEIS/Aeries Status	All students with unconfirmed SEIS or Aeries status. Grouped by classroom. Shows last confirmed date.
Transition Pipeline	Year-end planning view. Segmented by cohort type (age-outs, graduates, promoters, RTDs). Shows checklist completion per student.
Transportation Roster	Student transport records grouped by school site and by DOR. Filterable by any safety flag.
Sandbox / Planning Draft	Draft workspace for year-end reorganization. Shows diff vs live data. Includes auto-generated PC# change log and PAR needs list.
Caseload Balance	All classrooms in a program sorted by enrollment count and 1:1 burden. Updates live in sandbox mode.

7. What NOT to Recreate from the Spreadsheet

The following patterns exist in the current spreadsheet and must not be replicated in SPEDEX. Each represents a structural deficiency that caused downstream data quality problems.

Anti-Pattern	Why It Must Not Be Recreated
Horizontal multi-column layout per classroom	Not a data model — a display hack. Makes data unqueryable and unfiltered. Use normalized records with rendering-layer views.
Duplicate sheets for planning	Creates two diverging copies of live data with no diff mechanism. Use Sandbox/Planning Mode instead.
Free-text NOTES as status mechanism	Cannot be filtered, counted, or aggregated. Use structured enrollment_status enum plus typed fields for transfer source, 1:1 flag, hold reason.
Manual enrollment counts	Go stale immediately on any roster change. All counts must be computed from enrollment records in real time.
Safety flags embedded in student name strings	e.g., “Witthans (!!) SAFETY VEST”. Safety-critical data must be structured boolean fields, not text annotations in a name column.
Operational concerns as cell prose	Bus concern narratives written into spreadsheet cells are invisible to anyone not looking at that cell. Use a timestamped operational log.
No edit attribution	Current spreadsheet has no record of who changed what or when. Every write in SPEDEX must be attributed to a user with a timestamp.
Catch-all notes for transfer tracking	“From B. Houston” in a notes field has no corresponding record in the origin classroom. Transfers must be structured events with both sides of the move recorded.

8. Automation Opportunities

The following manual processes in the current spreadsheet can be fully or partially automated in SPEDEX.

Manual Process (Spreadsheet)	Automation Level	SPEDEX Implementation
Counting students per classroom	Full	Computed from enrollment records in real time
Counting SEIS/Aeries confirmations	Full	Computed from confirmation toggle state
ATP age-out date calculation	Full	Calculated from DOB using Jan-Sep/Oct-Dec rule
1:1 para moving when student transfers	Full	Para assignment follows student; origin vacancy auto-created
Vacancy creation on staff departure	Full	Triggered when staff record is removed or marked as leaving
PC# change log for reorganization	Full	Auto-generated from sandbox draft diff
PAR needs list (positions without PC#)	Full	Auto-generated from any position record missing a PC#
Year-end age-out queue population	Full	ATP students populate December and June queues automatically
Surfacing stale referrals	Full	Referrals with no status change in 14 days auto-flagged
Caseload balance view	Full	Computed from all enrollment records; live in sandbox mode
SEIS/Aeries confirmation tracking	Partial — manual toggle	No API. Manual confirm per student with timestamp/user attribution.
Student placement history	Full	All transfers auto-logged; full history on student profile

9. Field Definitions & Glossary

Standard definitions for domain-specific terms and abbreviations used throughout this document and throughout the program’s existing vocabulary.

Term	Definition
DOR	District of Residence — the school district the student is enrolled in (not necessarily where the SPED program is located).
SEIS	Special Education Information System — California’s state IEP management system. Student must be active in SEIS to be in compliant placement.
Aeries	Student information system (SIS) used by YCUSD. Students must be enrolled in Aeries for attendance and records tracking.
PC#	Position Control Number — a district-assigned identifier for each funded staff position. Required for payroll and HR.
PAR	Position Authorization Request — paperwork required to fund a new staff position that does not yet have a PC#.
RTD	Return to District — the process of a student exiting a specialized SPED program and returning to their home district’s general education.
1:1	One-to-one paraeducator — a dedicated para assigned to a single student. Distinct from a class para who supports all students in the classroom.
ATP	Adult Transition Program — post-secondary SPED program for students aged 18–22 who have not yet aged out of IDEA entitlement.
DHH	Deaf/Hard of Hearing — program silo serving students with hearing disabilities. Requires signing paras and ASL interpreters.
D1	Primary disability code. Multi-disability students may have compound codes (e.g., AUT/ID, ID/AUT, Aut/SLI).
Session#	Aeries classroom session identifier. Each classroom has a unique session number used for attendance and reporting.
CC	Certificate of Completion — non-diploma credential issued to students who complete a special education program without meeting diploma requirements.
ESY	Extended School Year — summer SPED services for qualifying students. Relevant to age-out timing calculations in ATP.
SCSOS	Sutter County Superintendent of Schools — administers the DHH Itinerant program for students ages 0–22.
OPEN	Vacant staff position. When a teacher or para slot has no assigned staff, it is marked OPEN and retains its PC# for hiring purposes.

10. Out of Scope

The following are explicitly out of scope for this feature. They may be addressed in future phases.

•	Direct API integration with SEIS or Aeries (no API access available)
•	IEP document management or goal tracking
•	Attendance tracking beyond what the AMPM bus log already captures
•	Payroll or HR system integration
•	Student assessment or progress monitoring data
•	Parent portal or communication features
•	Route optimization for transportation

11. Open Questions Before Implementation

The following questions must be answered before or during early implementation. The answers materially affect data model decisions.

Question	Why It Matters
Is there a single canonical student ID (e.g., Aeries student ID) that should serve as the primary key?	Determines whether the transport sheet’s student IDs (e.g., 104078) can be used to deduplicate and link records across sheets.
What is the maximum student-to-classroom ratio enforced by district policy?	Needed to configure the caseload balance view’s warning threshold.
Should sandbox drafts require an approval step before publishing, or can any coordinator publish?	Determines whether to build an approval/review workflow or a simpler single-step publish action.
Are there any multi-silo students (e.g., a student served by both DHH Itinerant and an ASD classroom)?	If yes, the enrollment model needs to support a student having concurrent placements in different programs.
How many school years of historical data should the system retain and make visible?	Affects database schema design and whether past-year placement records need to be migrated or can be created fresh.
Should the AMPM bus arrival log be tied to specific students or tracked at the classroom level only?	Current spreadsheet tracks it at the classroom level. Student-level would enable per-student transport history but adds data entry burden.

