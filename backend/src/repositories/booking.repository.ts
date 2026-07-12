import type { BookingStatus, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';

const listInclude = {
  asset: { select: { id: true, assetTag: true, name: true } },
  sharedResource: { select: { id: true, name: true, code: true, resourceType: true } },
  employee: {
    select: {
      id: true,
      employeeCode: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  },
} satisfies Prisma.BookingInclude;

const detailInclude = {
  ...listInclude,
  history: { orderBy: { createdAt: 'desc' as const } },
  reminders: { orderBy: { remindAt: 'asc' as const } },
} satisfies Prisma.BookingInclude;

export interface BookingFilters {
  page: number;
  limit: number;
  skip: number;
  status?: string;
  employeeId?: string;
  assetId?: string;
  sharedResourceId?: string;
  from?: Date;
  to?: Date;
}

function buildWhere(filters: BookingFilters): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = { deletedAt: null };
  if (filters.status) where.status = filters.status as Prisma.BookingWhereInput['status'];
  if (filters.employeeId) where.employeeId = filters.employeeId;
  if (filters.assetId) where.assetId = filters.assetId;
  if (filters.sharedResourceId) where.sharedResourceId = filters.sharedResourceId;
  if (filters.from) where.endTime = { gt: filters.from };
  if (filters.to) {
    where.startTime = { ...(where.startTime as object), lt: filters.to };
  }
  return where;
}

/** Statuses that reserve capacity — used for overlap checks. */
const RESERVING_STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'ACTIVE'];

export const bookingRepository = {
  listInclude,
  detailInclude,

  findList(filters: BookingFilters) {
    const where = buildWhere(filters);
    return Promise.all([
      prisma.booking.findMany({
        where,
        include: listInclude,
        orderBy: { startTime: 'asc' },
        skip: filters.skip,
        take: filters.limit,
      }),
      prisma.booking.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.booking.findFirst({
      where: { id, deletedAt: null },
      include: detailInclude,
    });
  },

  /**
   * Find bookings that overlap the given time window for a resource.
   * Overlap definition: existing.startTime < window.endTime AND existing.endTime > window.startTime.
   * The `excludeBookingId` argument lets updates check "is anything but me overlapping".
   */
  findOverlapping(
    client: PrismaClient | Prisma.TransactionClient,
    params: {
      assetId?: string | null;
      sharedResourceId?: string | null;
      startTime: Date;
      endTime: Date;
      excludeBookingId?: string;
    },
  ) {
    const targetWhere: Prisma.BookingWhereInput = {};
    if (params.assetId) targetWhere.assetId = params.assetId;
    if (params.sharedResourceId) targetWhere.sharedResourceId = params.sharedResourceId;

    return client.booking.findMany({
      where: {
        ...targetWhere,
        deletedAt: null,
        status: { in: RESERVING_STATUSES },
        startTime: { lt: params.endTime },
        endTime: { gt: params.startTime },
        ...(params.excludeBookingId ? { NOT: { id: params.excludeBookingId } } : {}),
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        employeeId: true,
        employee: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  },

  /** Find bookings starting in the given window — used by scheduler transitions. */
  findStartingBetween(from: Date, to: Date) {
    return prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { in: ['CONFIRMED', 'PENDING'] },
        startTime: { gte: from, lt: to },
      },
      take: 200,
    });
  },
};
