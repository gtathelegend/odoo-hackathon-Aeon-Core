import { z } from 'zod';

const uuid = z.string().uuid();
const isoDate = z.coerce.date();
const conditionEnum = z.enum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']);
const statusEnum = z.enum(['PENDING', 'ACTIVE', 'RETURNED', 'OVERDUE', 'CANCELLED']);

export const allocationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: statusEnum.optional(),
  employeeId: uuid.optional(),
  assetId: uuid.optional(),
  departmentId: uuid.optional(),
  overdueOnly: z.coerce.boolean().optional(),
  sortBy: z
    .enum(['allocationDate', 'expectedReturnDate', 'createdAt'])
    .optional()
    .default('allocationDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
export type AllocationListQuery = z.infer<typeof allocationListQuerySchema>;

export const extendAllocationSchema = z.object({
  expectedReturnDate: isoDate,
  reason: z.string().max(500).optional(),
});
export type ExtendAllocationInput = z.infer<typeof extendAllocationSchema>;

/** Same schema as asset-side allocation for the /allocation POST endpoint. */
export const createAllocationSchema = z.object({
  assetId: uuid,
  employeeId: uuid,
  expectedReturnDate: isoDate.optional(),
  allocationCondition: conditionEnum.optional(),
  notes: z.string().max(500).optional(),
});
export type CreateAllocationInput = z.infer<typeof createAllocationSchema>;

export const idParamSchema = z.object({ id: uuid });
