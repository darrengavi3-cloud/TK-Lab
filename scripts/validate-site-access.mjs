import assert from 'node:assert/strict';

export function validateSiteAccess(access, projectId, { now = Date.now(), requireFresh = false } = {}) {
  assert.equal(access.projectId, projectId);
  assert.equal(access.accessMode, 'custom');
  assert.equal(access.ownerOnly, true);
  assert.equal(access.allowedUserCount, 1);
  assert.equal(access.externalVisitorCount, 0);
  assert.equal(access.workspaceWideAccess, false);
  const checkedAt = Date.parse(access.checkedAt);
  const age = now - checkedAt;
  assert.ok(Number.isFinite(checkedAt), 'access check timestamp is invalid');
  assert.ok(age >= 0, 'access check timestamp is in the future');
  if (requireFresh) assert.ok(age <= 6 * 60 * 60 * 1000, `access check is stale: ${age}ms`);
}
