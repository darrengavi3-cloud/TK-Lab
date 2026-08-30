import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const hostingUrl = new URL("../.openai/hosting.json", import.meta.url);
const accessUrl = new URL("../release-metadata/access-policy.json", import.meta.url);

test("records a fresh owner-only Sites access check", async () => {
  const hosting = JSON.parse(await readFile(hostingUrl, "utf8"));
  const access = JSON.parse(await readFile(accessUrl, "utf8"));
  const checkedAt = Date.parse(access.checkedAt);
  const age = Date.now() - checkedAt;

  assert.equal(access.projectId, hosting.project_id);
  assert.equal(access.accessMode, "custom");
  assert.equal(access.ownerOnly, true);
  assert.equal(access.allowedUserCount, 1);
  assert.equal(access.externalVisitorCount, 0);
  assert.equal(access.workspaceWideAccess, false);
  assert.ok(Number.isFinite(checkedAt), "access check timestamp is invalid");
  assert.ok(age >= 0 && age <= 6 * 60 * 60 * 1000, `access check is stale: ${age}ms`);
});
