import type { RequestHandler } from 'express';
import { HTTP_STATUS } from '../constants/http';
import { MESSAGES } from '../constants/messages';
import { sendError } from '../utils/response';

/**
 * Placeholder controller factory. Every feature controller that hasn't yet
 * been implemented exports getAll/getById/create/update/delete that return
 * 501 Not Implemented so route registration remains intact while real handlers
 * are added incrementally by later prompts.
 */
export interface PlaceholderController {
  getAll: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  delete: RequestHandler;
}

function notImplemented(feature: string, operation: string): RequestHandler {
  return (_req, res) =>
    sendError(
      res,
      `${feature}.${operation}: ${MESSAGES.NOT_IMPLEMENTED}`,
      HTTP_STATUS.NOT_IMPLEMENTED,
      'NOT_IMPLEMENTED',
    );
}

export function createPlaceholderController(feature: string): PlaceholderController {
  return {
    getAll: notImplemented(feature, 'getAll'),
    getById: notImplemented(feature, 'getById'),
    create: notImplemented(feature, 'create'),
    update: notImplemented(feature, 'update'),
    delete: notImplemented(feature, 'delete'),
  };
}
