import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import test from "node:test";

const distRoot = new URL("../dist/", import.meta.url);
const releaseManifestUrl = new URL("../release-metadata/deployment-manifest.json", import.meta.url);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    if (entry.isDirectory()) files.push(...await walk(target));
    else files.push(target);
  }
  return files;
}

test("post-prune deployment manifest matches every packaged file", async () => {
  const manifestUrl = new URL("deployment-manifest.json", distRoot);
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  const recordedManifest = JSON.parse(await readFile(releaseManifestUrl, "utf8"));
  assert.deepEqual(recordedManifest, manifest, "Git release metadata drifted from the final deployment manifest");
  const expected = new Map(manifest.files.map((entry) => [entry.path, entry]));
  const packaged = (await walk(distRoot))
    .filter((url) => url.href !== manifestUrl.href)
    .map((url) => ({
      url,
      relative: decodeURIComponent(url.pathname.slice(distRoot.pathname.length)),
    }))
    .sort((left, right) => left.relative.localeCompare(right.relative, "en"));

  assert.equal(manifest.manifestKind, "post-prune-deployment");
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(expected.size, packaged.length);

  let totalBytes = 0;
  for (const file of packaged) {
    const entry = expected.get(file.relative);
    assert.ok(entry, `manifest missing ${file.relative}`);
    const [buffer, info] = await Promise.all([readFile(file.url), stat(file.url)]);
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    assert.equal(entry.bytes, info.size, `size mismatch: ${file.relative}`);
    assert.equal(entry.sha256, sha256, `hash mismatch: ${file.relative}`);
    totalBytes += info.size;
  }

  assert.equal(manifest.summary.fileCount, packaged.length);
  assert.equal(manifest.summary.totalBytes, totalBytes);
  const aggregate = createHash("sha256")
    .update(manifest.files.map((entry) => `${entry.path}\0${entry.bytes}\0${entry.sha256}\n`).join(""))
    .digest("hex");
  assert.equal(manifest.aggregateSha256, aggregate);
});


test("optimized decoration keeps a declared, byte-exact fallback for older reader CSS", async () => {
  const [original, fallback, optimized, css, rawManifest] = await Promise.all([
    readFile(new URL("../public/legacy/assets/ui/court-ink-palace.png", import.meta.url)),
    readFile(new URL("client/legacy/assets/ui/court-ink-palace.png", distRoot)),
    readFile(new URL("client/legacy/assets/ui/court-ink-palace.webp", distRoot)),
    readFile(new URL("client/legacy/assets/ui/base.css", distRoot), "utf8"),
    readFile(new URL("deployment-manifest.json", distRoot), "utf8"),
  ]);
  assert.deepEqual(fallback, original);
  assert.ok(optimized.length < original.length);
  assert.match(css, /court-ink-palace\.webp/);
  const entries = JSON.parse(rawManifest).files;
  for (const extension of ["png", "webp"]) assert.ok(entries.some(row => row.path === "client/legacy/assets/ui/court-ink-palace." + extension));
});
