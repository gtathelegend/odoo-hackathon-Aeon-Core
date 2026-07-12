# Implementation Task List: AssetFlow ERP

## Overview

This task list translates `requirements.md` and `design.md` into an execution-ready plan for building AssetFlow as an Odoo 17 module. Tasks are grouped by foundation, business capability, and cross-cutting concerns so the team can implement in dependency order while preserving requirement traceability.

---

## Phase 1: Module Foundation and Security

- [ ] Create the Odoo module scaffold `assetflow_erp` with manifest, init files, menu roots, data folders, and dependency declarations.
- [ ] Define security groups for Employee, Department Head, Asset Manager, and Admin in `security/security.xml`.
- [ ] Configure `ir.model.access.csv` entries for all core models.
- [ ] Add record rules for employee-scoped, department-scoped, and global views.
- [ ] Seed the `AF-XXXX` asset tag sequence in `data/asset_sequence.xml`.
- [ ] Register scheduled actions for overdue checks, booking transitions, reminders, retries, and session cleanup.
- [ ] Add base mixins or shared helpers for activity logging, notification dispatch, and state transition validation.

### Acceptance Coverage

- [ ] Requirement 2
- [ ] Requirement 16.8
- [ ] Requirement 18.1, 18.2

---

## Phase 2: Authentication, User Roles, and Employee Administration

- [ ] Extend `res.users` with AssetFlow role metadata, failed login counters, lockout timestamp, and last activity tracking.
- [ ] Implement signup flow that always creates Employee users and validates password/email rules.
- [ ] Add generic authentication failure messaging and 5-attempt lockout behavior.
- [ ] Implement 30-minute inactive-session expiration checks.
- [ ] Extend `hr.employee` for directory management, active status, and department assignment validation.
- [ ] Build the Employee Directory views with pagination, role promotion actions, and deactivation flows.
- [ ] Implement self-deactivation prevention and inactive-holder protections.
- [ ] Log failed access and role-change attempts in the Activity Log.

### Acceptance Coverage

- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 6
- [ ] Requirement 16.1

---

## Phase 3: Department and Category Management

- [ ] Extend `hr.department` to support active/inactive status, department-head assignment, and hierarchy metadata.
- [ ] Enforce unique department names, circular-reference prevention, and 5-level hierarchy limit.
- [ ] Implement department deactivation warnings for active allocations and reassignment flags.
- [ ] Build admin-only department tree, form, and list views.
- [ ] Create `asset.category` and `asset.category.field` models for category metadata and custom fields.
- [ ] Enforce unique category names, a 20-custom-field maximum, and deactivation-instead-of-delete behavior.
- [ ] Add maintenance interval and useful life settings to categories for report calculations.

### Acceptance Coverage

- [ ] Requirement 4
- [ ] Requirement 5
- [ ] Requirement 18.6, 18.7

---

## Phase 4: Asset Registration, Directory, and Lifecycle Core

- [ ] Build the `asset.asset` model with required metadata fields, attachments, bookable flag, and computed current holder.
- [ ] Implement asset tag auto-generation using the seeded sequence.
- [ ] Enforce required-field validation, cost bounds, attachment file constraints, and serial number uniqueness.
- [ ] Prevent hard deletion of asset records and enforce retire/dispose paths instead.
- [ ] Implement the lifecycle state machine and immutable transition history logging.
- [ ] Add asset directory views with search across tag, name, serial number, category, and location.
- [ ] Implement filters by state, category, department, and location with AND semantics.
- [ ] Build the asset detail page showing registration data, holder, allocation history, maintenance history, bookings, and audit records.
- [ ] Apply department-scoped visibility rules for Department Heads.

### Acceptance Coverage

- [ ] Requirement 7
- [ ] Requirement 8
- [ ] Requirement 9
- [ ] Requirement 18.1, 18.2, 18.3, 18.8

---

## Phase 5: Asset Allocation and Transfer Workflows

- [ ] Create the `asset.allocation` model with holder type, holder references, expected return date, return condition, and overdue status.
- [ ] Validate future expected return dates and inactive-holder rejection rules.
- [ ] Ensure only Available assets can be allocated and transition state to Allocated on success.
- [ ] Implement return processing that closes allocations, records return condition, and reverts asset state to Available.
- [ ] Build daily overdue detection and in-app notification delivery for overdue assets.
- [ ] Create the `asset.transfer` model with requester, current holder, recipient, reason, status, and review metadata.
- [ ] Enforce transfer progression `Requested -> Approved -> Re-allocated` or `Requested -> Rejected`.
- [ ] Prevent self-approval and invalid recipients.
- [ ] Close previous allocations and create successor allocations on transfer completion.

### Acceptance Coverage

- [ ] Requirement 10
- [ ] Requirement 11
- [ ] Requirement 16.2
- [ ] Requirement 17.1, 17.3, 17.4

---

## Phase 6: Resource Booking and Conflict Resolution

- [ ] Create the `asset.booking` model with start/end time, status, purpose, reminder tracking, and ownership fields.
- [ ] Enforce bookable-asset restriction, future start time, and 15-minute minimum duration.
- [ ] Implement overlap validation using half-open interval logic.
- [ ] Set successful bookings to `Upcoming` and reserve the asset.
- [ ] Build automatic time-driven transitions for `Upcoming -> Ongoing -> Completed`.
- [ ] Implement booking cancellation and reschedule flows with overlap re-validation.
- [ ] Add reminder notifications at least 30 minutes before booking start.
- [ ] Build the calendar interface for shared resources.
- [ ] Implement the `conflict.resolver` wizard for allocation conflicts and booking overlaps.
- [ ] Add suggested next available slot logic within a 7-day search window.
- [ ] Pre-populate transfer or booking forms when the user selects a guided resolution action.

### Acceptance Coverage

- [ ] Requirement 12
- [ ] Requirement 17

---

## Phase 7: Maintenance Workflow

- [ ] Create the `maintenance.request` model with issue description, priority, attachments, technician assignment, and resolution notes.
- [ ] Enforce issue-length limits and optional attachment size validation.
- [ ] Prevent new maintenance requests when an open request already exists for the same asset.
- [ ] Reject requests for assets whose current state cannot enter `Under_Maintenance`.
- [ ] Implement manager approval and rejection actions.
- [ ] Implement technician assignment, work start, and resolution actions.
- [ ] Transition the asset to `Under_Maintenance` on approval and back to `Available` on resolution.
- [ ] Notify requesters and technicians on each status change.
- [ ] Surface full maintenance history on the asset detail view.

### Acceptance Coverage

- [ ] Requirement 13
- [ ] Requirement 16.2

---

## Phase 8: Audit Cycles

- [ ] Create the `audit.cycle` model with scope, date range, auditors, status, and discrepancy report output.
- [ ] Create the `audit.mark` model for `Verified`, `Missing`, and `Damaged` marks.
- [ ] Enforce scope membership and open-cycle-only marking rules.
- [ ] Build cycle creation and mark-entry views for Admins, Asset Managers, and assigned auditors.
- [ ] Generate discrepancy reports listing Missing, Damaged, and Unverified in-scope assets on closure.
- [ ] Lock closed cycles against further edits.
- [ ] Transition eligible missing assets to `Lost` and flag exceptions for manual review.
- [ ] Update damaged assets’ condition to `Damaged`.
- [ ] Retain closed audit cycles and reports for at least 12 months.

### Acceptance Coverage

- [ ] Requirement 14
- [ ] Requirement 18.5

---

## Phase 9: Dashboard, Reports, Logs, and Notifications

- [ ] Build the KPI dashboard transient/service model and OWL or QWeb dashboard views.
- [ ] Implement KPI cards for Available, Allocated, Maintenance Today, Active Bookings, Pending Transfers, and Upcoming Returns.
- [ ] Apply role-based data scopes for Employee, Department Head, Asset Manager, and Admin views.
- [ ] Highlight overdue returns distinctly and preserve stale values on partial card load failures.
- [ ] Add role-appropriate quick actions to the dashboard.
- [ ] Create the `asset.activity.log` model and centralized logging helper.
- [ ] Capture all required state-changing events and failed access attempts.
- [ ] Create the `asset.notification` model with unread state, retry count, and delivery status.
- [ ] Add global unread notification indicator and notification center views.
- [ ] Implement reports for Utilization Trends, Maintenance Frequency, Assets Due for Maintenance, Assets Due for Retirement, Department Allocation Summary, and Booking Heatmap.
- [ ] Enforce department-scoped reporting for Department Heads.
- [ ] Add CSV and PDF export flows with the 30-second generation target.

### Acceptance Coverage

- [ ] Requirement 3
- [ ] Requirement 15
- [ ] Requirement 16

---

## Phase 10: Quality, Performance, and Release Readiness

- [ ] Add SQL indexes for search-heavy and time-window-heavy models.
- [ ] Write unit tests for transitions, overlap detection, hierarchy checks, and uniqueness guards.
- [ ] Write integration tests for authentication, role promotion, allocation conflicts, transfer completion, booking automation, maintenance workflow, and audit closure.
- [ ] Write security tests for record-rule isolation and forbidden actions.
- [ ] Write performance tests for dashboard aggregation, directory search, report exports, and booking overlap checks.
- [ ] Prepare demo seed data covering all major roles and workflows.
- [ ] Validate requirement traceability from tests back to `requirements.md`.
- [ ] Finalize packaging, install instructions, and deployment notes.

### Acceptance Coverage

- [ ] Requirement 3.2
- [ ] Requirement 8.2
- [ ] Requirement 15.5
- [ ] Requirement 18

---

## Suggested Delivery Order

1. Foundation, security, and authentication
2. Organization setup and employee administration
3. Asset core, lifecycle, and directory
4. Allocation, transfer, and conflict engine
5. Booking and maintenance workflows
6. Audit cycles
7. Dashboard, reports, logs, and notifications
8. Test hardening, performance tuning, and release prep

---

## Definition of Done

- [ ] Every requirement in `requirements.md` maps to at least one implementation task and one verification path.
- [ ] All role-based restrictions are enforced both in the UI and at the model/controller layer.
- [ ] All scheduled automations are registered, idempotent, and tested.
- [ ] Activity logs and notifications are generated for all required events.
- [ ] Core workflows are demoable end-to-end on a clean Odoo 17 instance.
