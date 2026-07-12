import bcrypt from 'bcrypt';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { usersRepository, type UserWithEmployee } from '../repositories/users.repository';
import { ConflictError, NotFoundError } from '../utils/errors';
import { buildPaginationMeta, resolvePagination } from '../utils/pagination';
import type { PaginationMeta } from '../interfaces/api-response.interface';
import type {
  AssignRoleInput,
  CreateUserInput,
  UpdateUserInput,
  UsersListQuery,
} from '../validators/users';

const BCRYPT_ROUNDS = 12;

interface ListResult {
  items: UserWithEmployee[];
  meta: PaginationMeta;
}

export const usersService = {
  async list(query: UsersListQuery): Promise<ListResult> {
    const pagination = resolvePagination(query);
    const { items, total } = await usersRepository.findMany(
      {
        search: query.search,
        role: query.role as UserWithEmployee['role'] | undefined,
        isActive: query.isActive,
        departmentId: query.departmentId,
      },
      pagination,
    );
    return { items, meta: buildPaginationMeta(total, pagination.page, pagination.limit) };
  },

  async get(id: string): Promise<UserWithEmployee> {
    const user = await usersRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async create(input: CreateUserInput, actorId?: string): Promise<UserWithEmployee> {
    if (await usersRepository.emailExists(input.email)) {
      throw new ConflictError('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          role: input.role as UserWithEmployee['role'],
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
      await tx.employee.create({
        data: {
          userId: user.id,
          employeeCode: `EMP-${user.id.slice(0, 8).toUpperCase()}`,
          designation: input.designation,
          departmentId: input.departmentId,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
      await tx.activityLog.create({
        data: {
          userId: actorId,
          action: 'user.create',
          entityType: 'user',
          entityId: user.id,
        },
      });
      return user.id;
    });

    return this.get(created);
  },

  async update(id: string, input: UpdateUserInput, actorId?: string): Promise<UserWithEmployee> {
    const existing = await usersRepository.findById(id);
    if (!existing) throw new NotFoundError('User not found');

    const userData: Record<string, unknown> = { updatedBy: actorId };
    if (input.firstName !== undefined) userData.firstName = input.firstName;
    if (input.lastName !== undefined) userData.lastName = input.lastName;
    if (input.phone !== undefined) userData.phone = input.phone;
    if (input.role !== undefined) userData.role = input.role;
    if (input.isActive !== undefined) userData.isActive = input.isActive;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { ...userData, version: { increment: 1 } },
      });
      if (input.designation !== undefined || input.departmentId !== undefined) {
        await tx.employee.update({
          where: { userId: id },
          data: {
            ...(input.designation !== undefined ? { designation: input.designation } : {}),
            ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
            updatedBy: actorId,
            version: { increment: 1 },
          },
        });
      }
      await tx.activityLog.create({
        data: {
          userId: actorId,
          action: 'user.update',
          entityType: 'user',
          entityId: id,
          metadata: userData as Prisma.InputJsonValue,
        },
      });
    });

    return this.get(id);
  },

  async remove(id: string, actorId?: string): Promise<void> {
    const existing = await usersRepository.findById(id);
    if (!existing) throw new NotFoundError('User not found');
    await usersRepository.softDelete(id, actorId);
    await prisma.activityLog.create({
      data: { userId: actorId, action: 'user.delete', entityType: 'user', entityId: id },
    });
  },

  async assignRole(
    id: string,
    input: AssignRoleInput,
    actorId?: string,
  ): Promise<UserWithEmployee> {
    const existing = await usersRepository.findById(id);
    if (!existing) throw new NotFoundError('User not found');
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          role: input.role as UserWithEmployee['role'],
          updatedBy: actorId,
          version: { increment: 1 },
        },
      });
      await tx.activityLog.create({
        data: {
          userId: actorId,
          action: 'user.assign_role',
          entityType: 'user',
          entityId: id,
          metadata: { role: input.role },
        },
      });
    });
    return this.get(id);
  },
};
