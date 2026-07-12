import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import {
  departmentsRepository,
  type DepartmentWithMeta,
} from '../repositories/departments.repository';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { buildPaginationMeta, resolvePagination } from '../utils/pagination';
import type { PaginationMeta } from '../interfaces/api-response.interface';
import type {
  CreateDepartmentInput,
  DepartmentsListQuery,
  UpdateDepartmentInput,
} from '../validators/departments';

interface ListResult {
  items: DepartmentWithMeta[];
  meta: PaginationMeta;
}

async function assertParentExists(parentId: string): Promise<void> {
  const parent = await departmentsRepository.findById(parentId);
  if (!parent) throw new ValidationError('Parent department not found');
}

export const departmentsService = {
  async list(query: DepartmentsListQuery): Promise<ListResult> {
    const pagination = resolvePagination(query);
    const filters = {
      status: query.status,
      search: query.search,
      parentId: query.rootsOnly ? null : query.parentId,
    };
    const { items, total } = await departmentsRepository.findMany(filters, pagination);
    return { items, meta: buildPaginationMeta(total, pagination.page, pagination.limit) };
  },

  async tree(): Promise<DepartmentWithMeta[]> {
    return departmentsRepository.findAllTree();
  },

  async get(id: string): Promise<DepartmentWithMeta> {
    const dept = await departmentsRepository.findById(id);
    if (!dept) throw new NotFoundError('Department not found');
    return dept;
  },

  async create(input: CreateDepartmentInput, actorId?: string): Promise<DepartmentWithMeta> {
    if (await departmentsRepository.findByCode(input.code)) {
      throw new ConflictError(`A department with code ${input.code} already exists`);
    }
    if (input.parentId) await assertParentExists(input.parentId);

    const created = await departmentsRepository.create({
      name: input.name,
      code: input.code,
      description: input.description,
      parentId: input.parentId ?? undefined,
      status: input.status,
      createdBy: actorId,
      updatedBy: actorId,
    });
    await prisma.activityLog.create({
      data: {
        userId: actorId,
        action: 'department.create',
        entityType: 'department',
        entityId: created.id,
      },
    });
    return this.get(created.id);
  },

  async update(
    id: string,
    input: UpdateDepartmentInput,
    actorId?: string,
  ): Promise<DepartmentWithMeta> {
    const existing = await departmentsRepository.findById(id);
    if (!existing) throw new NotFoundError('Department not found');

    if (input.code && input.code !== existing.code) {
      const clash = await departmentsRepository.findByCode(input.code);
      if (clash) throw new ConflictError(`A department with code ${input.code} already exists`);
    }
    if (input.parentId !== undefined && input.parentId !== null) {
      await assertParentExists(input.parentId);
      if (await departmentsRepository.wouldCreateCycle(id, input.parentId)) {
        throw new ValidationError('Reparenting would create a hierarchy cycle');
      }
    }

    await departmentsRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      updatedBy: actorId,
    });
    await prisma.activityLog.create({
      data: {
        userId: actorId,
        action: 'department.update',
        entityType: 'department',
        entityId: id,
        metadata: input as unknown as Prisma.InputJsonValue,
      },
    });
    return this.get(id);
  },

  async remove(id: string, actorId?: string): Promise<void> {
    const existing = await departmentsRepository.findById(id);
    if (!existing) throw new NotFoundError('Department not found');
    if (await departmentsRepository.hasChildren(id)) {
      throw new ConflictError('Cannot delete a department with active child departments');
    }
    if (await departmentsRepository.hasEmployees(id)) {
      throw new ConflictError('Cannot delete a department with active employees');
    }
    await departmentsRepository.softDelete(id, actorId);
    await prisma.activityLog.create({
      data: {
        userId: actorId,
        action: 'department.delete',
        entityType: 'department',
        entityId: id,
      },
    });
  },
};
