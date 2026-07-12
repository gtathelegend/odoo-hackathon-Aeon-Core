import { z } from 'zod';
import { ROLES } from '../../constants/roles';
import { paginationQuerySchema } from '../common';

const roleValues = Object.values(ROLES) as [string, ...string[]];

export const usersListQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  role: z.enum(roleValues).optional(),
  isActive: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
  departmentId: z.string().uuid().optional(),
});

export const createUserSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[\d\W]/, 'Password must include a digit or special character'),
  firstName: z.string().min(1).max(80).trim(),
  lastName: z.string().min(1).max(80).trim(),
  phone: z.string().max(40).optional(),
  role: z.enum(roleValues).default('EMPLOYEE'),
  departmentId: z.string().uuid().optional(),
  designation: z.string().max(120).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(80).trim().optional(),
  lastName: z.string().min(1).max(80).trim().optional(),
  phone: z.string().max(40).optional(),
  role: z.enum(roleValues).optional(),
  isActive: z.boolean().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  designation: z.string().max(120).optional(),
});

export const assignRoleSchema = z.object({
  role: z.enum(roleValues),
});

export type UsersListQuery = z.infer<typeof usersListQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
