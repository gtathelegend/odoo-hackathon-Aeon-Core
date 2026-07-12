import { prisma } from '../config/database';
import { NotImplementedError } from '../utils/errors';

/**
 * Placeholder repository factory. Repositories are the *only* layer allowed
 * to touch Prisma directly. Concrete queries are implemented by later prompts;
 * these stubs throw NotImplementedError so accidental early usage is caught
 * loudly rather than silently returning empty data.
 */
export interface PlaceholderRepository {
  findById: (id: string) => Promise<never>;
  findMany: () => Promise<never>;
  create: (data: unknown) => Promise<never>;
  update: (id: string, data: unknown) => Promise<never>;
  delete: (id: string) => Promise<never>;
}

function notImplemented(feature: string, operation: string) {
  return async (): Promise<never> => {
    throw new NotImplementedError(`${feature}Repository.${operation}: Not implemented`);
  };
}

export function createPlaceholderRepository(feature: string): PlaceholderRepository {
  return {
    findById: notImplemented(feature, 'findById'),
    findMany: notImplemented(feature, 'findMany'),
    create: notImplemented(feature, 'create'),
    update: notImplemented(feature, 'update'),
    delete: notImplemented(feature, 'delete'),
  };
}

/** Prisma client re-exported so future repositories have a single import. */
export { prisma };
