import { z } from 'zod';

const uuid = z.string().uuid();
const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const channelEnum = z.enum(['IN_APP', 'EMAIL', 'SMS', 'PUSH']);

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  unreadOnly: z.coerce.boolean().optional(),
  priority: priorityEnum.optional(),
  type: z.string().max(80).optional(),
  search: z.string().max(200).optional(),
});
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

export const notificationIdParamSchema = z.object({ id: uuid });

export const preferenceUpdateSchema = z.object({
  channel: channelEnum,
  category: z.string().min(1).max(80).default('all'),
  enabled: z.boolean(),
});
export type PreferenceUpdateInput = z.infer<typeof preferenceUpdateSchema>;

export const bulkPreferencesSchema = z.object({
  preferences: z.array(preferenceUpdateSchema).min(1).max(50),
});
export type BulkPreferencesInput = z.infer<typeof bulkPreferencesSchema>;
