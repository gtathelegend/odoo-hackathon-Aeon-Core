import { z } from 'zod';

const uuid = z.string().uuid();
const isoDateTime = z.coerce.date();
const statusEnum = z.enum(['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);

/** Either an assetId or a sharedResourceId is required — never both. */
const targetShape = z
  .object({
    assetId: uuid.optional(),
    sharedResourceId: uuid.optional(),
  })
  .refine(
    (v) => Boolean(v.assetId) !== Boolean(v.sharedResourceId),
    'Provide either assetId or sharedResourceId (exactly one)',
  );

export const createBookingSchema = z
  .object({
    assetId: uuid.optional(),
    sharedResourceId: uuid.optional(),
    employeeId: uuid,
    startTime: isoDateTime,
    endTime: isoDateTime,
    purpose: z.string().max(300).optional(),
    notes: z.string().max(1000).optional(),
  })
  .and(targetShape)
  .refine((v) => v.endTime > v.startTime, {
    message: 'endTime must be after startTime',
    path: ['endTime'],
  })
  .refine((v) => v.startTime > new Date(Date.now() - 60_000), {
    message: 'startTime must be in the future',
    path: ['startTime'],
  });
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const updateBookingSchema = z
  .object({
    startTime: isoDateTime.optional(),
    endTime: isoDateTime.optional(),
    purpose: z.string().max(300).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (v) => !(v.startTime && v.endTime) || v.endTime > v.startTime,
    'endTime must be after startTime',
  );
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

export const bookingListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: statusEnum.optional(),
  employeeId: uuid.optional(),
  assetId: uuid.optional(),
  sharedResourceId: uuid.optional(),
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
});
export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;

export const bookingActionSchema = z.object({
  action: z.enum(['confirm', 'cancel', 'start', 'complete']),
  reason: z.string().max(500).optional(),
});
export type BookingActionInput = z.infer<typeof bookingActionSchema>;

export const availabilityQuerySchema = z
  .object({
    assetId: uuid.optional(),
    sharedResourceId: uuid.optional(),
    from: isoDateTime,
    to: isoDateTime,
  })
  .refine((v) => Boolean(v.assetId) !== Boolean(v.sharedResourceId), 'Provide exactly one target')
  .refine((v) => v.to > v.from, 'to must be after from');
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const idParamSchema = z.object({ id: uuid });
