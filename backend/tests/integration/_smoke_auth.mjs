// Smoke test for the auth + users + departments module.
// Run with: node tests/integration/_smoke_auth.mjs
import assert from 'node:assert/strict';

const BASE = 'http://localhost:5000/api/v1';

async function call(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  return { status: res.status, body: json };
}

const results = [];
function t(name, ok, extra = '') {
  results.push({ name, ok, extra });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
}

const admin = await call('/auth/login', { method: 'POST', body: { email: 'admin@assetflow.io', password: 'Password123!' } });
t('admin login', admin.status === 200 && admin.body.data.tokens.accessToken.length > 20);
const adminToken = admin.body.data.tokens.accessToken;
const adminRefresh = admin.body.data.tokens.refreshToken;

const bad = await call('/auth/login', { method: 'POST', body: { email: 'admin@assetflow.io', password: 'wrong' } });
t('bad password → 401', bad.status === 401);

const me = await call('/auth/me', { headers: { Authorization: `Bearer ${adminToken}` } });
t('/auth/me returns admin', me.status === 200 && me.body.data.user.role === 'ADMIN');

const noAuth = await call('/users');
t('users without auth → 401', noAuth.status === 401);

const emp = await call('/auth/login', { method: 'POST', body: { email: 'liam@assetflow.io', password: 'Password123!' } });
t('employee login', emp.status === 200 && emp.body.data.user.role === 'EMPLOYEE');
const empToken = emp.body.data.tokens.accessToken;

const empUsers = await call('/users', { headers: { Authorization: `Bearer ${empToken}` } });
t('employee → /users blocked (403)', empUsers.status === 403);

const empCreateDept = await call('/departments', { method: 'POST', headers: { Authorization: `Bearer ${empToken}` }, body: { name: 'Nope', code: 'NOPE' } });
t('employee → POST /departments blocked (403)', empCreateDept.status === 403);

const empReadDept = await call('/departments', { headers: { Authorization: `Bearer ${empToken}` } });
t('employee → GET /departments allowed', empReadDept.status === 200);

const usersList = await call('/users?limit=5', { headers: { Authorization: `Bearer ${adminToken}` } });
t('admin → /users list', usersList.status === 200 && usersList.body.data.length > 0 && usersList.body.meta.total > 0, `count=${usersList.body.data.length}, total=${usersList.body.meta.total}`);

const tree = await call('/departments/tree', { headers: { Authorization: `Bearer ${adminToken}` } });
t('admin → /departments/tree', tree.status === 200 && tree.body.data.length >= 5, `count=${tree.body.data.length}`);

// Create + update + delete department
const code = `SMOKE${Date.now().toString(36).toUpperCase().slice(-6)}`;
const create = await call('/departments', { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` }, body: { name: 'Smoke Test', code } });
t('admin → POST /departments', create.status === 201 && create.body.data.code === code, `id=${create.body?.data?.id}`);
const newId = create.body.data.id;

const patch = await call(`/departments/${newId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}` }, body: { description: 'Updated by smoke test' } });
t('admin → PATCH /departments/:id', patch.status === 200 && patch.body.data.description === 'Updated by smoke test');

const dupe = await call('/departments', { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` }, body: { name: 'Dup', code } });
t('duplicate code → 409', dupe.status === 409);

const del = await call(`/departments/${newId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } });
t('admin → DELETE /departments/:id', del.status === 204);

// Refresh token flow
const rot = await call('/auth/refresh', { method: 'POST', body: { refreshToken: adminRefresh } });
t('refresh token → new access token', rot.status === 200 && rot.body.data.tokens.accessToken.length > 20);

// Rotated refresh token should not work again (single-use)
const rot2 = await call('/auth/refresh', { method: 'POST', body: { refreshToken: adminRefresh } });
t('reused refresh → 401', rot2.status === 401);

// Forgot password (dev mode returns the token)
const forgot = await call('/auth/forgot-password', { method: 'POST', body: { email: 'sofia@assetflow.io' } });
t('forgot-password → 200', forgot.status === 200);
const resetToken = forgot.body.data?.resetToken;
t('forgot returns dev reset token', typeof resetToken === 'string' && resetToken.length > 20);

if (resetToken) {
  const reset = await call('/auth/reset-password', { method: 'POST', body: { token: resetToken, password: 'NewPass123!' } });
  t('reset-password → 200', reset.status === 200);
  const loginNew = await call('/auth/login', { method: 'POST', body: { email: 'sofia@assetflow.io', password: 'NewPass123!' } });
  t('login with new password → 200', loginNew.status === 200);
  // Restore original for repeatability
  const restore1 = await call('/auth/forgot-password', { method: 'POST', body: { email: 'sofia@assetflow.io' } });
  const restore2 = await call('/auth/reset-password', { method: 'POST', body: { token: restore1.body.data.resetToken, password: 'Password123!' } });
  t('restore original password', restore2.status === 200);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
