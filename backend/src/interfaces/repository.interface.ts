import type { PaginatedResponse, ResolvedPagination } from './pagination.interface';

/**
 * Generic contract implemented by repositories. Concrete repositories may
 * narrow the id/data types via the generic parameters below.
 */
export interface Repository<
  TEntity,
  TCreateInput = Partial<TEntity>,
  TUpdateInput = Partial<TEntity>,
> {
  findById(id: string): Promise<TEntity | null>;
  findMany(params?: ResolvedPagination): Promise<PaginatedResponse<TEntity>>;
  create(data: TCreateInput): Promise<TEntity>;
  update(id: string, data: TUpdateInput): Promise<TEntity>;
  delete(id: string): Promise<void>;
}
