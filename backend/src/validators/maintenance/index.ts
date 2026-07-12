import { z } from 'zod';

const uuid = z.string().uuid();
const isoDate = z.coerce.date();
const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const conditionEnum = z.enum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']);
const statusEnum = z.enum([
  'PENDING',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
  'CANCELLED',
]);

export const createMaintenanceSchema = z.object({
  assetId: uuid,
  issueType: z.string().max(120).optional(),
  description: z.string().min(1).max(2000),
  priority: priorityEnum.optional(),
  reportedCondition: conditionEnum.optional(),
  dueDate: isoDate.optional(),
});
export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;

export const assignMaintenanceSchema = z.object({
  technicianId: uuid,
  note: z.string().max(500).optional(),
});
export type AssignMaintenanceInput = z.infer<typeof assignMaintenanceSchema>;

export const resolveMaintenanceSchema = z.object({
  resolutionNotes: z.string().min(1).max(2000),
  cost: z.union([z.string(), z.number()]).optional(),
  partsReplaced: z.string().max(500).optional(),
});
export type ResolveMaintenanceInput = z.infer<typeof resolveMaintenanceSchema>;

export const maintenanceActionSchema = z.object({
  action: z.enum(['start', 'reject', 'cancel']),
  reason: z.string().max(500).optional(),
});
export type MaintenanceActionInput = z.infer<typeof maintenanceActionSchema>;

export const maintenanceListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  assetId: uuid.optional(),
  employeeId: uuid.optional(),
});
export type MaintenanceListQuery = z.infer<typeof maintenanceListQuerySchema>;

export const idParamSchema = z.object({ id: uuid });
