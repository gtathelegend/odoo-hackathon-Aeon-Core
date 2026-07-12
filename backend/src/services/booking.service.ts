import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { bookingRepository } from '../repositories/booking.repository';
import { buildPaginationMeta } from '../utils/pagination';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { notify, broadcastActivity } from './notifications.service';
import { logger } from '../config/logger';
import type {
  AvailabilityQuery,
  BookingActionInput,
  BookingListQuery,
  CreateBookingInput,
  UpdateBookingInput,
} from '../validators/booking';

interface Actor {
  id: string;
}

/** Booking state transitions allowed by the workflow. */
const BOOKING_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ACTIVE', 'CANCELLED', 'NO_SHOW'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

function canBookingTransition(from: string, to: string): boolean {
  return BOOKING_TRANSITIONS[from]?.includes(to) ?? false;
}

async function assertNoOverlap(
  tx: Prisma.TransactionClient,
  params: {
    assetId?: string | null;
    sharedResourceId?: string | null;
    startTime: Date;
    endTime: Date;
    excludeBookingId?: string;
  },
): Promise<void> {
  const conflicts = await bookingRepository.findOverlapping(tx, params);
  if (conflicts.length > 0) {
    throw new ConflictError('Booking window conflicts with existing bookings', {
      conflicts: conflicts.map((c) => ({
        id: c.id,
        status: c.status,
        startTime: c.startTime,
        endTime: c.endTime,
        holder: c.employee?.user
          ? `${c.employee.user.firstName} ${c.employee.user.lastName}`.trim()
          : null,
      })),
    });
  }
}

export const bookingService = {
  async list(query: BookingListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const [items, total] = await bookingRepository.findList({
      page,
      limit,
      skip,
      status: query.status,
      employeeId: query.employeeId,
      assetId: query.assetId,
      sharedResourceId: query.sharedResourceId,
      from: query.from,
      to: query.to,
    });
    return { items, meta: buildPaginationMeta(total, page, limit) };
  },

  async getById(id: string) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new NotFoundError('Booking not found');
    return booking;
  },

  /**
   * Reserve a time window on an asset or shared resource. The whole reservation
   * runs under a Serializable transaction so two concurrent bookings on the
   * same resource can never both succeed.
   */
  async create(input: CreateBookingInput, actor: Actor) {
    // Validate resource existence.
    if (input.assetId) {
      const asset = await prisma.asset.findFirst({
        where: { id: input.assetId, deletedAt: null },
        select: { id: true, name: true },
      });
      if (!asset) throw new ValidationError('Asset not found');
    }
    if (input.sharedResourceId) {
      const resource = await prisma.sharedResource.findFirst({
        where: { id: input.sharedResourceId, deletedAt: null },
        select: { id: true, name: true },
      });
      if (!resource) throw new ValidationError('Shared resource not found');
    }
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, isActive: true, deletedAt: null },
      include: { user: { select: { id: true, isActive: true } } },
    });
    if (!employee || !employee.user?.isActive) {
      throw new ValidationError('Employee not found or inactive');
    }

    const created = await prisma.$transaction(
      async (tx) => {
        await assertNoOverlap(tx, {
          assetId: input.assetId ?? null,
          sharedResourceId: input.sharedResourceId ?? null,
          startTime: input.startTime,
          endTime: input.endTime,
        });
        const booking = await tx.booking.create({
          data: {
            assetId: input.assetId ?? null,
            sharedResourceId: input.sharedResourceId ?? null,
            employeeId: input.employeeId,
            status: 'CONFIRMED',
            startTime: input.startTime,
            endTime: input.endTime,
            purpose: input.purpose,
            notes: input.notes,
            createdBy: actor.id,
            updatedBy: actor.id,
          },
          include: bookingRepository.detailInclude,
        });
        await tx.bookingHistory.create({
          data: {
            bookingId: booking.id,
            action: 'CREATED',
            status: 'CONFIRMED',
            performedBy: actor.id,
          },
        });
        // Auto-reminder 30 minutes before start.
        const remindAt = new Date(input.startTime.getTime() - 30 * 60 * 1000);
        if (remindAt.getTime() > Date.now()) {
          await tx.bookingReminder.create({
            data: {
              bookingId: booking.id,
              remindAt,
              channel: 'IN_APP',
              createdBy: actor.id,
              updatedBy: actor.id,
            },
          });
        }
        await notify(
          {
            userId: employee.user.id,
            title: 'Booking confirmed',
            message: `Your booking is confirmed from ${input.startTime.toLocaleString()} to ${input.endTime.toLocaleString()}.`,
            type: 'BOOKING_CONFIRMED',
            entityType: 'booking',
            entityId: booking.id,
          },
          tx,
        );
        return booking;
      },
      { isolationLevel: 'Serializable' },
    );

    broadcastActivity('booking.created', { bookingId: created.id });
    logger.info('booking.created', { bookingId: created.id, actorId: actor.id });
    return created;
  },

  /**
   * Reschedule a booking. Overlap check is re-run for the new window.
   */
  async update(id: string, input: UpdateBookingInput, actor: Actor) {
    const existing = await bookingRepository.findById(id);
    if (!existing) throw new NotFoundError('Booking not found');
    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(existing.status)) {
      throw new ConflictError(`Cannot modify a ${existing.status.toLowerCase()} booking`);
    }
    const startTime = input.startTime ?? existing.startTime;
    const endTime = input.endTime ?? existing.endTime;
    if (endTime <= startTime) {
      throw new ValidationError('endTime must be after startTime');
    }

    return prisma.$transaction(
      async (tx) => {
        await assertNoOverlap(tx, {
          assetId: existing.assetId,
          sharedResourceId: existing.sharedResourceId,
          startTime,
          endTime,
          excludeBookingId: id,
        });
        const updated = await tx.booking.update({
          where: { id },
          data: {
            startTime,
            endTime,
            purpose: input.purpose,
            notes: input.notes,
            updatedBy: actor.id,
          },
          include: bookingRepository.detailInclude,
        });
        await tx.bookingHistory.create({
          data: {
            bookingId: id,
            action: 'RESCHEDULED',
            status: updated.status,
            performedBy: actor.id,
          },
        });
        return updated;
      },
      { isolationLevel: 'Serializable' },
    );
  },

  /**
   * Apply a lifecycle action (confirm/cancel/start/complete). Cancel is
   * permitted from most states; start/complete follow the workflow graph.
   */
  async transition(id: string, input: BookingActionInput, actor: Actor) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new NotFoundError('Booking not found');

    const targetMap: Record<BookingActionInput['action'], string> = {
      confirm: 'CONFIRMED',
      cancel: 'CANCELLED',
      start: 'ACTIVE',
      complete: 'COMPLETED',
    };
    const target = targetMap[input.action];
    if (!canBookingTransition(booking.status, target)) {
      throw new ConflictError(
        `Cannot ${input.action} a booking currently in ${booking.status.toLowerCase()}`,
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.booking.update({
        where: { id },
        data: { status: target as Prisma.BookingUpdateInput['status'], updatedBy: actor.id },
        include: bookingRepository.detailInclude,
      });
      await tx.bookingHistory.create({
        data: {
          bookingId: id,
          action: input.action.toUpperCase(),
          status: target as Prisma.BookingHistoryUncheckedCreateInput['status'],
          note: input.reason,
          performedBy: actor.id,
        },
      });
      return record;
    });

    broadcastActivity(`booking.${input.action}`, { bookingId: id });
    logger.info('booking.transition', { id, action: input.action, actorId: actor.id });
    return updated;
  },

  /** Return existing overlapping bookings for a proposed window. */
  async availability(query: AvailabilityQuery) {
    const conflicts = await bookingRepository.findOverlapping(prisma, {
      assetId: query.assetId ?? null,
      sharedResourceId: query.sharedResourceId ?? null,
      startTime: query.from,
      endTime: query.to,
    });
    return {
      available: conflicts.length === 0,
      conflicts,
    };
  },
};
