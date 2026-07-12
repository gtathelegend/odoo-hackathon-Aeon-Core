import type { PaginatedResponse, ResolvedPagination } from './pagination.interface';

/**
 * Generic contract implemented by services. Services orchestrate business
 * logic and delegate persistence to repositories.
 */
export interface Service<
  TEntity,
  TCreateInput = Partial<TEntity>,
  TUpdateInput = Partial<TEntity>,
> {
  getById(id: string): Promise<TEntity | null>;
  getAll(params?: ResolvedPagination): Promise<PaginatedResponse<TEntity>>;
  create(data: TCreateInput): Promise<TEntity>;
  update(id: string, data: TUpdateInput): Promise<TEntity>;
  delete(id: string): Promise<void>;
}
