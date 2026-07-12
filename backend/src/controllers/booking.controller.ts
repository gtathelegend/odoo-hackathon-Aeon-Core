import type { Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';
import { AuthenticationError } from '../utils/errors';
import { bookingService } from '../services';
import type {
  AvailabilityQuery,
  BookingActionInput,
  BookingListQuery,
  CreateBookingInput,
  UpdateBookingInput,
} from '../validators/booking';

function requireUser(req: AuthenticatedRequest) {
  if (!req.user) throw new AuthenticationError('Authentication required');
  return req.user;
}

export const bookingController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const query = req.query as unknown as BookingListQuery;
    const result = await bookingService.list(query);
    sendSuccess(res, result.items, 'Bookings fetched', 200, result.meta);
  }),

  getById: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const { id } = req.params as { id: string };
    const booking = await bookingService.getById(id);
    sendSuccess(res, booking, 'Booking fetched');
  }),

  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const input = req.body as CreateBookingInput;
    const created = await bookingService.create(input, actor);
    sendCreated(res, created, 'Booking created');
  }),

  update: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const input = req.body as UpdateBookingInput;
    const updated = await bookingService.update(id, input, actor);
    sendSuccess(res, updated, 'Booking updated');
  }),

  action: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const input = req.body as BookingActionInput;
    const updated = await bookingService.transition(id, input, actor);
    sendSuccess(res, updated, `Booking ${input.action}d`);
  }),

  availability: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const query = req.query as unknown as AvailabilityQuery;
    const result = await bookingService.availability(query);
    sendSuccess(res, result, 'Availability computed');
  }),
};
