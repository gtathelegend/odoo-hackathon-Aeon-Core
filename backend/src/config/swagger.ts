import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import type { Options } from 'swagger-jsdoc';
import { env } from './env';
import { SERVICE_NAME, SERVICE_VERSION } from '../constants';

/**
 * Swagger / OpenAPI configuration. Route-level JSDoc blocks are picked up
 * automatically from src/routes/**\/*.ts so future modules only need to
 * annotate their endpoints to appear in /api/docs.
 */
const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: SERVICE_NAME,
      version: SERVICE_VERSION,
      description:
        'AssetFlow REST API — enterprise asset and shared-resource management. ' +
        'Business endpoints are added incrementally by feature module.',
      contact: { name: 'AssetFlow' },
      license: { name: 'MIT' },
    },
    servers: [{ url: `http://localhost:${env.PORT}${env.API_PREFIX}/v1`, description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
            meta: { type: 'object' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'object' },
            code: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Health', description: 'Liveness, readiness and version probes' },
      { name: 'Auth', description: 'Authentication (added in later prompts)' },
      { name: 'Users', description: 'User management (added in later prompts)' },
      { name: 'Departments', description: 'Departments (added in later prompts)' },
      { name: 'Assets', description: 'Assets (added in later prompts)' },
      { name: 'Allocation', description: 'Allocations (added in later prompts)' },
      { name: 'Booking', description: 'Bookings (added in later prompts)' },
      { name: 'Maintenance', description: 'Maintenance (added in later prompts)' },
      { name: 'Audit', description: 'Audits (added in later prompts)' },
      { name: 'Reports', description: 'Reports (added in later prompts)' },
      { name: 'Notifications', description: 'Notifications (added in later prompts)' },
      { name: 'Assistant', description: 'AI assistant (added in later prompts)' },
      { name: 'Dashboard', description: 'Dashboards (added in later prompts)' },
      { name: 'Settings', description: 'Settings (added in later prompts)' },
    ],
  },
  apis: [
    path.resolve(__dirname, '../routes/**/*.{ts,js}'),
    path.resolve(__dirname, '../controllers/**/*.{ts,js}'),
  ],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
export const SWAGGER_PATH = '/api/docs';
