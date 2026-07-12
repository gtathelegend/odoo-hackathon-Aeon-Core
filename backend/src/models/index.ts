/**
 * Domain model re-exports. Prisma generates the canonical entity types from
 * `prisma/schema.prisma`; feature modules should import from here so a single
 * location owns which entities are considered "public" domain models.
 */
export type {
  User,
  Role,
  Permission,
  Employee,
  Department,
  Asset,
  AssetCategory,
  AssetLocation,
  Allocation,
  Booking,
  SharedResource,
  MaintenanceRequest,
  AuditCycle,
  AuditRecord,
  Notification,
  ActivityLog,
} from '@prisma/client';
