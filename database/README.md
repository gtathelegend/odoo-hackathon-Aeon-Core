# AssetFlow Database

Production PostgreSQL database for AssetFlow, hosted on **Neon** (serverless
Postgres) and managed with **Prisma**.

- Prisma schema: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)
- Migrations: [`backend/prisma/migrations/`](../backend/prisma/migrations)
- Seed script: [`backend/prisma/seed.ts`](../backend/prisma/seed.ts)
- Pure SQL schema: [`database/schema.sql`](./schema.sql)

## Connection

The connection string is supplied through environment variables in
`backend/.env` (never hardcoded):

- `DATABASE_URL` — pooled Neon connection used by the application at runtime.
- `DIRECT_URL` — direct (non-pooled) Neon connection used by Prisma Migrate.

```
DATABASE_URL="postgresql://<user>:<pass>@<host>-pooler.<region>.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://<user>:<pass>@<host>.<region>.aws.neon.tech/neondb?sslmode=require"
```

## Schema Overview

The schema follows Third Normal Form with UUID primary keys, soft deletes,
timestamp auditing, row versioning and referential integrity throughout.

### Global columns

Business tables share a standard column set:

| Column      | Purpose                                        |
| ----------- | ---------------------------------------------- |
| `id`        | UUID primary key                               |
| `createdAt` | Row creation timestamp                         |
| `updatedAt` | Auto-updated modification timestamp            |
| `deletedAt` | Soft-delete marker (NULL = live row)           |
| `createdBy` | UUID of the acting user at creation            |
| `updatedBy` | UUID of the acting user at last update         |
| `version`   | Optimistic-locking row version                 |
| `isActive`  | Active/inactive flag                           |

Actor columns (`createdBy`, `updatedBy`, `performedBy`, `requestedBy`, ...)
store UUID identifiers rather than hard foreign keys to `users`, to avoid an
unmanageable fan-out of back-relations while preserving who-did-what auditing.
Core domain relationships use enforced foreign keys.

Immutable `*_histories` and `*_logs` tables are append-only and intentionally
omit soft-delete / versioning columns.

### Domains and tables

| Domain        | Tables |
| ------------- | ------ |
| Users         | `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `refresh_tokens` |
| Organization  | `departments`, `department_hierarchies`, `employees`, `employee_profiles` |
| Assets        | `assets`, `asset_categories`, `asset_category_fields`, `asset_attachments`, `asset_histories`, `asset_locations`, `asset_status_histories`, `qr_codes` |
| Allocation    | `allocations`, `allocation_histories`, `transfer_requests`, `transfer_approvals`, `return_requests` |
| Booking       | `bookings`, `booking_histories`, `booking_reminders`, `booking_conflicts`, `shared_resources` |
| Maintenance   | `maintenance_requests`, `maintenance_assignments`, `maintenance_histories`, `maintenance_attachments`, `maintenance_resolutions` |
| Audit         | `audit_cycles`, `audit_assignments`, `audit_records`, `audit_discrepancies`, `audit_histories` |
| Reports       | `saved_reports`, `report_exports`, `dashboard_widgets` |
| Notifications | `notifications`, `notification_templates`, `notification_preferences`, `notification_deliveries` |
| Activity      | `activity_logs`, `system_logs`, `login_histories` |
| AI            | `assistant_conversations`, `assistant_messages`, `assistant_prompts`, `assistant_feedback` |
| Files         | `file_storage`, `file_metadata` |
| Settings      | `organization_settings`, `application_settings`, `theme_settings` |

## Relationships

The core ownership chain enforces referential integrity end to end:

```
Department → Employee → Allocation → Asset
                      → Booking     → SharedResource
Asset → MaintenanceRequest → MaintenanceResolution
Asset → AuditRecord ← AuditCycle → AuditDiscrepancy
User  → Role (via user_roles) → Permission (via role_permissions)
```

Delete behavior:

- `Cascade` for owned children (history, attachments, deliveries, join rows).
- `Restrict` for referenced masters that must not disappear (asset category,
  allocated asset/employee).
- `SetNull` for optional links (asset location/department, log user).

## Enums

`UserRole`, `AssetStatus`, `AllocationStatus`, `BookingStatus`,
`MaintenanceStatus`, `AuditStatus`, `NotificationStatus`, `Priority`,
`Condition`, `DepartmentStatus`, `ApprovalStatus`, `Theme`, `Language`,
`NotificationChannel`.

## Constraints

- **Unique:** `users.email`, `assets.assetTag`, `assets.serialNumber`,
  department/category/location codes, `qr_codes.code`, and composite uniques on
  join and audit-record tables.
- **Check:** non-negative `assets.purchaseCost`/`currentValue`,
  `bookings.endTime > startTime`,
  `allocations.expectedReturnDate > allocationDate`,
  `maintenance_resolutions.cost >= 0`, positive `shared_resources.capacity`,
  `assistant_feedback.rating` in 1..5, and self-conflict prevention on
  `booking_conflicts`.

## Indexing

Indexes cover foreign keys, status/enum columns, asset tag and serial, email,
booking time windows, created dates, and composite hot paths such as
`(status, categoryId)`, `(departmentId, status)`,
`(assetId, startTime, endTime)` and `(userId, status)`.

## Commands

Run from `backend/`:

```bash
# Generate the Prisma Client
npm run prisma:generate

# Create + apply a migration in development
npm run prisma:migrate

# Apply committed migrations (CI / production)
npx prisma migrate deploy

# Seed realistic sample data (idempotent)
npm run prisma:seed

# Regenerate the pure SQL schema (database/schema.sql)
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > ../database/schema.sql
```

### Reset

```bash
# Drop, recreate, re-apply migrations and re-seed (DESTRUCTIVE)
npx prisma migrate reset
```

### Initialize a fresh database from pure SQL

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

## Backup Strategy

- **Point-in-time recovery:** Neon retains history and supports PITR and
  instant restore from the console.
- **Branching:** create a Neon branch to snapshot state before risky
  migrations, then discard or promote it.
- **Logical dumps:** schedule `pg_dump "$DIRECT_URL"` for portable, off-site
  backups; store artifacts in object storage.
- **Migrations as source of truth:** `backend/prisma/migrations/` is committed
  to version control so any environment can be rebuilt deterministically.

## Seed Accounts

All seeded users share the password `Password123!` (development only).

| Email                  | Role            |
| ---------------------- | --------------- |
| admin@assetflow.io     | ADMIN           |
| manager@assetflow.io   | ASSET_MANAGER   |
| ithead@assetflow.io    | DEPARTMENT_HEAD |
| hrhead@assetflow.io    | DEPARTMENT_HEAD |
| liam@assetflow.io      | EMPLOYEE        |
