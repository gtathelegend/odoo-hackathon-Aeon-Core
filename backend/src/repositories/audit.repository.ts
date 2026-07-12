import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

const cycleInclude = {
  assignments: true,
  _count: { select: { records: true } },
} satisfies Prisma.AuditCycleInclude;

const cycleDetailInclude = {
  assignments: true,
  history: { orderBy: { createdAt: 'desc' as const }, take: 50 },
  records: {
    include: {
      asset: { select: { id: true, assetTag: true, name: true, status: true } },
      discrepancies: { where: { deletedAt: null } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.AuditCycleInclude;

export const auditRepository = {
  cycleInclude,
  cycleDetailInclude,

  findCycleList(params: { skip: number; take: number; status?: string; departmentId?: string }) {
    const where: Prisma.AuditCycleWhereInput = { deletedAt: null };
    if (params.status) where.status = params.status as Prisma.AuditCycleWhereInput['status'];
    if (params.departmentId) where.departmentId = params.departmentId;
    return Promise.all([
      prisma.auditCycle.findMany({
        where,
        include: cycleInclude,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.auditCycle.count({ where }),
    ]);
  },

  findCycleById(id: string) {
    return prisma.auditCycle.findFirst({
      where: { id, deletedAt: null },
      include: cycleDetailInclude,
    });
  },

  findCycleByCode(code: string) {
    return prisma.auditCycle.findFirst({
      where: { code: { equals: code, mode: 'insensitive' }, deletedAt: null },
    });
  },

  findRecordById(recordId: string) {
    return prisma.auditRecord.findFirst({
      where: { id: recordId, deletedAt: null },
      include: {
        auditCycle: { select: { id: true, status: true, code: true, name: true } },
        asset: { select: { id: true, assetTag: true, name: true } },
        discrepancies: { where: { deletedAt: null } },
      },
    });
  },
};
