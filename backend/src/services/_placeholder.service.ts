import { NotImplementedError } from '../utils/errors';

/**
 * Placeholder service factory. Feature services expose getAll/getById/create/
 * update/delete methods that throw NotImplementedError until the concrete
 * business logic is added by a later prompt.
 */
export interface PlaceholderService {
  getAll: (...args: unknown[]) => Promise<never>;
  getById: (...args: unknown[]) => Promise<never>;
  create: (...args: unknown[]) => Promise<never>;
  update: (...args: unknown[]) => Promise<never>;
  delete: (...args: unknown[]) => Promise<never>;
}

function notImplemented(feature: string, operation: string) {
  return async (): Promise<never> => {
    throw new NotImplementedError(`${feature}.${operation}: Not implemented`);
  };
}

export function createPlaceholderService(feature: string): PlaceholderService {
  return {
    getAll: notImplemented(feature, 'getAll'),
    getById: notImplemented(feature, 'getById'),
    create: notImplemented(feature, 'create'),
    update: notImplemented(feature, 'update'),
    delete: notImplemented(feature, 'delete'),
  };
}
