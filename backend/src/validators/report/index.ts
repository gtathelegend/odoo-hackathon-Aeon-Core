import { z } from 'zod';

const uuid = z.string().uuid();

/** Supported report dataset types. Adding a new dataset here + wiring it in
 *  `reports.service.runDataset()` is the only change needed to expose a new
 *  report. */
export const reportTypeEnum = z.enum([
  'assets',
  'allocations',
  'maintenance',
  'bookings',
  'audits',
]);
export type ReportType = z.infer<typeof reportTypeEnum>;

export const exportFormatEnum = z.enum(['csv', 'xlsx', 'pdf', 'json']);
export type ExportFormat = z.infer<typeof exportFormatEnum>;

/** Common filters shared by every dataset. Extra keys are ignored, so a UI
 *  can send a superset without breaking validation. */
export const reportFiltersSchema = z
  .object({
    status: z.string().max(40).optional(),
    priority: z.string().max(40).optional(),
    categoryId: uuid.optional(),
    departmentId: uuid.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    limit: z.coerce.number().int().positive().max(10_000).optional(),
  })
  .passthrough();
export type ReportFilters = z.infer<typeof reportFiltersSchema>;

/** Optional schedule declaration stored inside SavedReport.config. */
export const reportScheduleSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  hour: z.number().int().min(0).max(23).default(6),
  format: exportFormatEnum.default('csv'),
  recipientIds: z.array(uuid).optional(),
});
export type ReportSchedule = z.infer<typeof reportScheduleSchema>;

/** Payload for `POST /reports` — persist a saved report configuration. */
export const createSavedReportSchema = z.object({
  name: z.string().min(1).max(200),
  type: reportTypeEnum,
  isShared: z.boolean().default(false),
  filters: reportFiltersSchema.optional(),
  schedule: reportScheduleSchema.optional(),
});
export type CreateSavedReportInput = z.infer<typeof createSavedReportSchema>;

export const updateSavedReportSchema = createSavedReportSchema.partial();
export type UpdateSavedReportInput = z.infer<typeof updateSavedReportSchema>;

/** Query for listing saved reports. */
export const savedReportListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  type: reportTypeEnum.optional(),
  search: z.string().max(200).optional(),
  mineOnly: z.coerce.boolean().optional(),
});
export type SavedReportListQuery = z.infer<typeof savedReportListQuerySchema>;

/** Payload for running an ad-hoc report. */
export const runReportSchema = z.object({
  type: reportTypeEnum,
  filters: reportFiltersSchema.optional(),
  columns: z.array(z.string()).optional(),
});
export type RunReportInput = z.infer<typeof runReportSchema>;

/** Query params for exporting a run. */
export const exportQuerySchema = z.object({
  format: exportFormatEnum.default('csv'),
});
export type ExportQuery = z.infer<typeof exportQuerySchema>;

export const runAndExportSchema = runReportSchema.extend({
  format: exportFormatEnum.default('csv'),
});
export type RunAndExportInput = z.infer<typeof runAndExportSchema>;

export const reportIdParamSchema = z.object({ id: uuid });
