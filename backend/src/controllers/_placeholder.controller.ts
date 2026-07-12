import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http';
import { MESSAGES } from '../constants/messages';
import { sendError } from '../utils/response';

/**
 * Placeholder controller factory. Every feature controller in this prompt
 * exports getAll/getById/create/update/delete that return 501 Not Implemented
 * so real handlers can be plugged in by subsequent prompts without touching
 * route registration.
 */
export interface PlaceholderController {
  getAll: (req: Request, res: Response) => void;
  getById: (req: Request, res: Response) => void;
  create: (req: Request, res: Response) => void;
  update: (req: Request, res: Response) => void;
  delete: (req: Request, res: Response) => void;
}

function notImplemented(feature: string, operation: string): (req: Request, res: Response) => void {
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
