import cors from 'cors';
import type { RequestHandler } from 'express';
import { serverConfig } from '../config/server';

/** Centralized CORS configuration. */
export const corsMiddleware: RequestHandler = cors({
  origin: serverConfig.cors.origin,
  credentials: serverConfig.cors.credentials,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
});
