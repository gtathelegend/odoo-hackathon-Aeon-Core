import { describe, expect, it } from 'vitest';
import {
  buildPaginationMeta,
  getSkip,
  resolvePagination,
} from '../../src/utils/pagination';

describe('pagination utilities', () => {
  it('applies defaults when no params are provided', () => {
    const resolved = resolvePagination();
    expect(resolved.page).toBe(1);
    expect(resolved.limit).toBe(20);
    expect(resolved.skip).toBe(0);
    expect(resolved.sortOrder).toBe('asc');
  });

  it('caps the limit at 100', () => {
    const resolved = resolvePagination({ limit: 500 });
    expect(resolved.limit).toBe(100);
  });

  it('computes the correct skip offset', () => {
    expect(getSkip(1, 20)).toBe(0);
    expect(getSkip(3, 25)).toBe(50);
  });

  it('builds pagination metadata correctly', () => {
    const meta = buildPaginationMeta(45, 2, 20);
    expect(meta.total).toBe(45);
    expect(meta.page).toBe(2);
    expect(meta.limit).toBe(20);
    expect(meta.totalPages).toBe(3);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.hasPreviousPage).toBe(true);
  });
});
