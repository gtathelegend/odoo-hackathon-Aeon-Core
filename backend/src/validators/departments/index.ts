import { z } from 'zod';
import { paginationQuerySchema } from '../common';

const codeSchema = z
  .string()
  .min(2)
  .max(20)
  .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, digits, dashes or underscores')
  .transform((v) => v.toUpperCase());

export const departmentsListQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  parentId: z.string().uuid().optional(),
  rootsOnly: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
});

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  code: codeSchema,
  description: z.string().max(500).optional(),
  parentId: z.string().uuid().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(120).trim().optional(),
  code: codeSchema.optional(),
  description: z.string().max(500).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
});

export type DepartmentsListQuery = z.infer<typeof departmentsListQuerySchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
