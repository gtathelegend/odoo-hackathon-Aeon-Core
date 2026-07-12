import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('GET /api/v1/health', () => {
  it('returns a standardized success envelope', async () => {
    const res = await request(app).get('/api/v1/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBeDefined();
    expect(res.body.data.service).toBeDefined();
    expect(res.body.data.version).toBeDefined();
    expect(res.body.data.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(res.body.data.memory).toBeDefined();
    expect(res.body.data.database).toBeDefined();
  });
});

describe('GET /api/v1/version', () => {
  it('reports service, API and node versions', async () => {
    const res = await request(app).get('/api/v1/version');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toBeDefined();
    expect(res.body.data.version).toBeDefined();
    expect(res.body.data.node).toBeDefined();
  });
});

describe('GET /api/v1/status', () => {
  it('reports extended runtime status', async () => {
    const res = await request(app).get('/api/v1/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pid).toBeDefined();
    expect(res.body.data.uptimeSec).toBeGreaterThanOrEqual(0);
  });
});

describe('unmatched routes', () => {
  it('return a standardized 404 envelope', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Route not found');
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('feature route placeholders', () => {
  // Routes that haven't been implemented yet still respond with 501.
  // (assets, asset-categories, asset-locations moved to real handlers in
  // Prompt 5 and require auth.)
  it('respond with 501 Not Implemented', async () => {
    const res = await request(app).get('/api/v1/reports');
    expect(res.status).toBe(501);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_IMPLEMENTED');
  });
});
