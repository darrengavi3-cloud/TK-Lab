import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDirectory, "..");
const canonicalRoot = path.join(siteRoot, "atlas");
const sourceRoot = path.join(canonicalRoot, "exports", "观史台-读者版");
const sourceManifestPath = path.join(sourceRoot, "reader-bundle.json");
const sourceLockPath = path.join(canonicalRoot, "sources.lock.json");
const destinationRoot = path.join(siteRoot, "public", "legacy");
const stagingRoot = path.join(siteRoot, "public", `.legacy-reader-stage-${process.pid}`);
const releaseMetadataRoot = path.join(siteRoot, "release-metadata");

function fail(message) {
  throw new Error(`读者版同步失败：${message}`);
}

function digest(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function normalizedRelativePath(value) {
  const relative = String(value || "").replaceAll("\\", "/");
  if (!relative || relative.startsWith("/") || relative.includes("../")) {
    fail(`清单包含不安全路径：${value}`);
  }
  return relative;
}

function walk(directory, base = directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, "en"))
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return walk(target, base);
      if (!entry.isFile()) return [];
      return [path.relative(base, target).split(path.sep).join("/")];
    });
}

if (!existsSync(sourceManifestPath)) {
  fail("缺少 exports/观史台-读者版/reader-bundle.json；请先运行规范源 release:check");
}
if (!existsSync(sourceLockPath)) {
  fail("缺少规范源 sources.lock.json；不得发布未锁定的输入");
}

const manifest = JSON.parse(readFileSync(sourceManifestPath, "utf8"));
if (manifest.build !== "reader" || !Array.isArray(manifest.files)) {
  fail("reader-bundle.json 不是可发布的读者构建清单");
}

const expected = new Map();
for (const entry of manifest.files) {
  const relative = normalizedRelativePath(entry.path);
  if (expected.has(relative)) fail(`清单路径重复：${relative}`);
  expected.set(relative, entry);
}

const actualSourceFiles = walk(sourceRoot).filter((relative) => relative !== "reader-bundle.json");
if (actualSourceFiles.length !== expected.size) {
  fail(`源目录与清单数量不一致：${actualSourceFiles.length}/${expected.size}`);
}
for (const relative of actualSourceFiles) {
  const entry = expected.get(relative);
  if (!entry) fail(`源目录存在清单外文件：${relative}`);
  const buffer = readFileSync(path.join(sourceRoot, relative));
  if (buffer.length !== entry.bytes) fail(`源文件大小不符：${relative}`);
  if (digest(buffer) !== entry.sha256) fail(`源文件哈希不符：${relative}`);
}

rmSync(stagingRoot, { recursive: true, force: true });
mkdirSync(stagingRoot, { recursive: true });
for (const relative of actualSourceFiles) {
  const target = path.join(stagingRoot, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(path.join(sourceRoot, relative), target);
}
copyFileSync(sourceManifestPath, path.join(stagingRoot, "reader-bundle.json"));

for (const relative of actualSourceFiles) {
  const entry = expected.get(relative);
  const target = path.join(stagingRoot, relative);
  const info = statSync(target);
  const buffer = readFileSync(target);
  if (!info.isFile() || info.size !== entry.bytes || digest(buffer) !== entry.sha256) {
    fail(`暂存副本校验失败：${relative}`);
  }
}

rmSync(destinationRoot, { recursive: true, force: true });
renameSync(stagingRoot, destinationRoot);
mkdirSync(releaseMetadataRoot, { recursive: true });
copyFileSync(sourceLockPath, path.join(releaseMetadataRoot, "canonical-sources.lock.json"));
copyFileSync(sourceManifestPath, path.join(releaseMetadataRoot, "reader-bundle.json"));
console.log(`已同步读者版：${actualSourceFiles.length + 1} 个文件，来源哈希 ${manifest.aggregateSha256}`);
