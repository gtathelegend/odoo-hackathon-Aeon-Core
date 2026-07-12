import type { Department, DepartmentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import type { ResolvedPagination } from '../interfaces/pagination.interface';

export interface DepartmentListFilters {
  status?: DepartmentStatus;
  parentId?: string | null;
  search?: string;
}

export interface DepartmentWithMeta extends Department {
  _count: { employees: number; children: number };
  parent: { id: string; name: string; code: string } | null;
}

/**
 * Departments repository. Owns Prisma queries for departments, their tree
 * hierarchy and derived counts.
 */
export const departmentsRepository = {
  findById(id: string): Promise<DepartmentWithMeta | null> {
    return prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        _count: { select: { employees: true, children: true } },
      },
    });
  },

  findByCode(code: string): Promise<Department | null> {
    return prisma.department.findFirst({
      where: { code: code.toUpperCase(), deletedAt: null },
    });
  },

  findMany(
    filters: DepartmentListFilters,
    pagination: ResolvedPagination,
  ): Promise<{ items: DepartmentWithMeta[]; total: number }> {
    const where: Prisma.DepartmentWhereInput = { deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.parentId === null) where.parentId = null;
    else if (filters.parentId) where.parentId = filters.parentId;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.DepartmentOrderByWithRelationInput = pagination.sortBy
      ? { [pagination.sortBy]: pagination.sortOrder }
      : { name: 'asc' };

    return prisma
      .$transaction([
        prisma.department.findMany({
          where,
          include: {
            parent: { select: { id: true, name: true, code: true } },
            _count: { select: { employees: true, children: true } },
          },
          skip: pagination.skip,
          take: pagination.limit,
          orderBy,
        }),
        prisma.department.count({ where }),
      ])
      .then(([items, total]) => ({ items, total }));
  },

  /** Load the full tree in a single query for the org chart view. */
  findAllTree(): Promise<DepartmentWithMeta[]> {
    return prisma.department.findMany({
      where: { deletedAt: null },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        _count: { select: { employees: true, children: true } },
      },
      orderBy: { name: 'asc' },
    });
  },

  create(data: Prisma.DepartmentUncheckedCreateInput): Promise<Department> {
    return prisma.department.create({ data });
  },

  update(id: string, data: Prisma.DepartmentUncheckedUpdateInput): Promise<Department> {
    return prisma.department.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    });
  },

  softDelete(id: string, actorId?: string): Promise<Department> {
    return prisma.department.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        status: 'ARCHIVED',
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });
  },

  /**
   * Detect a cycle if `id` were re-parented under `newParentId`. Walks up
   * the ancestor chain and reports true when it encounters `id`.
   */
  async wouldCreateCycle(id: string, newParentId: string | null | undefined): Promise<boolean> {
    if (!newParentId || id === newParentId) {
      return id === newParentId;
    }
    let cursor: string | null = newParentId;
    const visited = new Set<string>();
    while (cursor) {
      if (cursor === id) return true;
      if (visited.has(cursor)) return true;
      visited.add(cursor);
      const parent: { parentId: string | null } | null = await prisma.department.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      cursor = parent?.parentId ?? null;
    }
    return false;
  },

  /** True when the department has any active (non-deleted) child. */
  hasChildren(id: string): Promise<boolean> {
    return prisma.department
      .findFirst({ where: { parentId: id, deletedAt: null }, select: { id: true } })
      .then((row) => Boolean(row));
  },

  /** True when the department has any active employees. */
  hasEmployees(id: string): Promise<boolean> {
    return prisma.employee
      .findFirst({ where: { departmentId: id, deletedAt: null }, select: { id: true } })
      .then((row) => Boolean(row));
  },
};
