import { z } from 'zod';
import { ASSET_STATUS } from '../../constants/status';

const conditionEnum = z.enum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']);
const statusEnum = z.nativeEnum(ASSET_STATUS);

const decimalString = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toFixed(2) : v))
  .refine(
    (v) => /^\d{1,10}(\.\d{1,2})?$/.test(v),
    'must be a positive number with up to 2 decimals',
  );

const uuid = z.string().uuid();
const optionalUuid = uuid.optional().nullable();
const isoDate = z.coerce.date();

// ---------- Categories ----------

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  code: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/i, 'code must be alphanumeric with dashes/underscores'),
  description: z.string().max(500).optional(),
  parentId: optionalUuid,
  maxAssets: z.coerce.number().int().positive().optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ---------- Locations ----------

export const createLocationSchema = z.object({
  name: z.string().min(1).max(150),
  code: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/i, 'code must be alphanumeric with dashes/underscores'),
  building: z.string().max(100).optional(),
  floor: z.string().max(50).optional(),
  room: z.string().max(50).optional(),
  parentId: optionalUuid,
});
export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = createLocationSchema.partial();
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

// ---------- Assets ----------

export const createAssetSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(1000).optional(),
  serialNumber: z.string().max(100).optional(),
  categoryId: uuid,
  locationId: optionalUuid,
  departmentId: optionalUuid,
  condition: conditionEnum.optional(),
  purchaseCost: decimalString.optional(),
  currentValue: decimalString.optional(),
  purchaseDate: isoDate.optional(),
  warrantyExpiry: isoDate.optional(),
  vendor: z.string().max(150).optional(),
  manufacturer: z.string().max(150).optional(),
  model: z.string().max(150).optional(),
  customFields: z.record(z.unknown()).optional(),
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const updateAssetSchema = createAssetSchema.partial().extend({
  version: z.coerce.number().int().nonnegative(),
});
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

// ---------- Directory filters ----------

export const assetListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'name', 'assetTag', 'status'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().min(1).max(200).optional(),
  status: statusEnum.optional(),
  condition: conditionEnum.optional(),
  categoryId: uuid.optional(),
  locationId: uuid.optional(),
  departmentId: uuid.optional(),
});
export type AssetListQuery = z.infer<typeof assetListQuerySchema>;

// ---------- Lifecycle actions ----------

export const transitionSchema = z.object({
  toStatus: statusEnum,
  reason: z.string().max(500).optional(),
  version: z.coerce.number().int().nonnegative(),
});
export type TransitionInput = z.infer<typeof transitionSchema>;

export const allocateSchema = z.object({
  employeeId: uuid,
  expectedReturnDate: isoDate.optional(),
  allocationCondition: conditionEnum.optional(),
  notes: z.string().max(500).optional(),
  version: z.coerce.number().int().nonnegative(),
});
export type AllocateInput = z.infer<typeof allocateSchema>;

export const returnSchema = z.object({
  returnCondition: conditionEnum,
  notes: z.string().max(500).optional(),
  version: z.coerce.number().int().nonnegative(),
});
export type ReturnInput = z.infer<typeof returnSchema>;

// ---------- Transfers ----------

export const createTransferSchema = z.object({
  toEmployeeId: optionalUuid,
  toDepartmentId: optionalUuid,
  reason: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
});
export type CreateTransferInput = z.infer<typeof createTransferSchema>;

export const decideTransferSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().max(500).optional(),
});
export type DecideTransferInput = z.infer<typeof decideTransferSchema>;

// ---------- Params ----------

export const assetIdParamSchema = z.object({ id: uuid });
export const categoryIdParamSchema = z.object({ id: uuid });
export const locationIdParamSchema = z.object({ id: uuid });
export const transferIdParamSchema = z.object({ id: uuid });
export const attachmentIdParamSchema = z.object({ id: uuid, attachmentId: uuid });
