import type { Prisma, User, UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import type { ResolvedPagination } from '../interfaces/pagination.interface';

export interface UserListFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  departmentId?: string;
}

export interface UserWithEmployee extends User {
  employee: {
    id: string;
    employeeCode: string;
    designation: string | null;
    departmentId: string | null;
    department: { id: string; name: string; code: string } | null;
  } | null;
}

/** Users repository — CRUD, listing, soft-delete and role updates. */
export const usersRepository = {
  findById(id: string): Promise<UserWithEmployee | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        employee: {
          include: { department: { select: { id: true, name: true, code: true } } },
        },
      },
    });
  },

  findMany(
    filters: UserListFilters,
    pagination: ResolvedPagination,
  ): Promise<{ items: UserWithEmployee[]; total: number }> {
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (filters.role) where.role = filters.role;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.departmentId) {
      where.employee = { departmentId: filters.departmentId };
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = pagination.sortBy
      ? { [pagination.sortBy]: pagination.sortOrder }
      : { createdAt: 'desc' };

    return prisma
      .$transaction([
        prisma.user.findMany({
          where,
          include: {
            employee: {
              include: { department: { select: { id: true, name: true, code: true } } },
            },
          },
          skip: pagination.skip,
          take: pagination.limit,
          orderBy,
        }),
        prisma.user.count({ where }),
      ])
      .then(([items, total]) => ({ items, total }));
  },

  create(data: Prisma.UserUncheckedCreateInput): Promise<User> {
    return prisma.user.create({ data });
  },

  update(id: string, data: Prisma.UserUncheckedUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    });
  },

  softDelete(id: string, actorId?: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });
  },

  emailExists(email: string, excludeId?: string): Promise<boolean> {
    return prisma.user
      .findFirst({
        where: {
          email: email.toLowerCase(),
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true },
      })
      .then((row) => Boolean(row));
  },
};
