import { z } from 'zod';

const uuid = z.string().uuid();
const isoDate = z.coerce.date();
const statusEnum = z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED']);
const conditionEnum = z.enum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']);
const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const createCycleSchema = z.object({
  name: z.string().min(1).max(200),
  code: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/i, 'code must be alphanumeric with dashes/underscores'),
  scope: z.string().max(500).optional(),
  departmentId: uuid.optional().nullable(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  assetIds: z.array(uuid).optional(),
});
export type CreateCycleInput = z.infer<typeof createCycleSchema>;

export const updateCycleSchema = createCycleSchema.partial().extend({
  status: statusEnum.optional(),
});
export type UpdateCycleInput = z.infer<typeof updateCycleSchema>;

export const cycleListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: statusEnum.optional(),
  departmentId: uuid.optional(),
});
export type CycleListQuery = z.infer<typeof cycleListQuerySchema>;

export const verifyRecordSchema = z.object({
  foundCondition: conditionEnum,
  foundLocationId: uuid.optional().nullable(),
  isVerified: z.boolean().default(true),
  note: z.string().max(1000).optional(),
});
export type VerifyRecordInput = z.infer<typeof verifyRecordSchema>;

export const createDiscrepancySchema = z.object({
  type: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  severity: priorityEnum.default('MEDIUM'),
});
export type CreateDiscrepancyInput = z.infer<typeof createDiscrepancySchema>;

export const resolveDiscrepancySchema = z.object({
  note: z.string().max(1000).optional(),
});
export type ResolveDiscrepancyInput = z.infer<typeof resolveDiscrepancySchema>;

export const cycleIdParamSchema = z.object({ id: uuid });
export const recordIdParamSchema = z.object({ id: uuid, recordId: uuid });
export const discrepancyIdParamSchema = z.object({ id: uuid, recordId: uuid, discrepancyId: uuid });
