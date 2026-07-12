import { prisma } from '../config/database';
import { assetsRepository } from '../repositories/assets.repository';
import { ASSET_STATUS } from '../constants/status';

/**
 * Analytics roll-ups for the asset dashboard. Everything here is scoped to
 * non-deleted assets. Numbers are refreshed on every request — realtime
 * dashboards should hit these directly rather than caching.
 */
export const assetAnalyticsService = {
  async summary() {
    const [statusRows, conditionRows, categoryRows, totalActive, overdue] = await Promise.all([
      assetsRepository.countByStatus(),
      assetsRepository.countByCondition(),
      assetsRepository.countByCategory(),
      assetsRepository.countTotalActive(),
      assetsRepository.countOverdueAllocations(),
    ]);

    const byStatus: Record<string, number> = Object.fromEntries(
      Object.values(ASSET_STATUS).map((s) => [s, 0]),
    );
    for (const r of statusRows) byStatus[r.status] = r._count._all;

    const byCondition: Record<string, number> = {};
    for (const r of conditionRows) byCondition[r.condition] = r._count._all;

    const categoryIds = categoryRows.map((r) => r.categoryId);
    const categories = await prisma.assetCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, code: true },
    });
    const categoryLookup = new Map(categories.map((c) => [c.id, c]));
    const byCategory = categoryRows
      .map((r) => ({
        categoryId: r.categoryId,
        name: categoryLookup.get(r.categoryId)?.name ?? 'Unknown',
        code: categoryLookup.get(r.categoryId)?.code ?? '—',
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalActive,
      overdueAllocations: overdue,
      byStatus,
      byCondition,
      byCategory,
      generatedAt: new Date().toISOString(),
    };
  },
};
