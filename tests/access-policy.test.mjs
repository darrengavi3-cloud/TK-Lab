import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateSiteAccess } from '../scripts/validate-site-access.mjs';

const hostingUrl = new URL("../.openai/hosting.json", import.meta.url);
const accessUrl = new URL("../release-metadata/access-policy.json", import.meta.url);

test("records an owner-only Sites access check; release requires freshness", async () => {
  const hosting = JSON.parse(await readFile(hostingUrl, "utf8"));
  const access = JSON.parse(await readFile(accessUrl, "utf8"));
  validateSiteAccess(access, hosting.project_id, { requireFresh: process.env.REQUIRE_FRESH_SITE_ACCESS === '1' });
});

test('release access rejects expired, future, malformed and widened snapshots', async () => {
  const access = JSON.parse(await readFile(accessUrl, 'utf8'));
  const now = Date.parse(access.checkedAt);
  const sixHours = 6 * 60 * 60 * 1000;
  validateSiteAccess(access, access.projectId, { now: now + sixHours, requireFresh: true });
  assert.throws(() => validateSiteAccess(access, access.projectId, { now: now + sixHours + 1, requireFresh: true }), /stale/);
  validateSiteAccess(access, access.projectId, { now: now + sixHours + 1 });
  assert.throws(() => validateSiteAccess(access, access.projectId, { now: now - 1 }), /future/);
  assert.throws(() => validateSiteAccess({ ...access, checkedAt: 'unknown' }, access.projectId), /invalid/);
  for (const change of [{ allowedUserCount: 2 }, { externalVisitorCount: 1 }, { workspaceWideAccess: true }, { ownerOnly: false }, { accessMode: 'public' }]) {
    assert.throws(() => validateSiteAccess({ ...access, ...change }, access.projectId));
  }
});
