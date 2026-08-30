import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the historical atlas shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>中华三国志·职官谱<\/title>/);
  assert.match(html, /<iframe[^>]+src="\/legacy\/index\.html\?v=65"/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("packages the current court, reader people, and map assets", async () => {
  const [page, layout, legacy, readerPeople, periods, palace] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/legacy/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/legacy/data/v63-reader-people.js", import.meta.url), "utf8"),
    readFile(new URL("../public/legacy/data/map-period-registry.js", import.meta.url), "utf8"),
    readFile(new URL("../public/legacy/assets/ui/court-ink-palace.png", import.meta.url)),
  ]);

  assert.match(page, /src="\/legacy\/index\.html\?v=65"/);
  assert.match(layout, /中华三国志·职官谱/);
  assert.match(legacy, /courtHierarchy|朝堂谱系|SGZ_V63_READER_PEOPLE/);
  assert.match(readerPeople, /曹操|诸葛亮|司马懿/);
  assert.match(periods, /huangjin|yongjia|HISTORY_MAP_REGISTRY/);
  assert.ok(palace.byteLength > 100_000);
});

test("packages the V63 field-gated full people reader projection", async () => {
  const legacyRoot = new URL("../dist/client/legacy/", import.meta.url);
  const [legacy, readerPeopleSource, readerManifestRaw] = await Promise.all([
    readFile(new URL("index.html", legacyRoot), "utf8"),
    readFile(new URL("data/v63-reader-people.js", legacyRoot), "utf8"),
    readFile(new URL("reader-bundle.json", legacyRoot), "utf8"),
  ]);
  const context = { window: {} };
  const vm = await import("node:vm");
  vm.runInNewContext(readerPeopleSource, context, { filename: "v63-reader-people.js" });
  const payload = context.window.SGZ_V63_READER_PEOPLE;
  const people = payload.people || Object.values(payload.byPersonId || payload.peopleById || {});
  const readerManifest = JSON.parse(readerManifestRaw);

  assert.match(legacy, /V60 全量人物/);
  assert.match(legacy, /260 年人物纪/);
  assert.match(legacy, /曹魏封爵人物/);
  assert.match(legacy, /v63-reader-people\.js/);
  assert.equal(readerManifest.build, "reader");
  assert.ok(people.length >= 1196);
  assert.equal(new Set(people.map((person) => person.personId)).size, people.length);
  assert.ok(people.every((person) => person.personId && person.name));
});

test("packages all 275 production portraits without the review workbooks", async () => {
  const legacyRoot = new URL("../dist/client/legacy/", import.meta.url);
  const [legacy, manifestRaw, fangzhenSource, jinshiSource] = await Promise.all([
    readFile(new URL("index.html", legacyRoot), "utf8"),
    readFile(new URL("data/portrait-manifest.json", legacyRoot), "utf8"),
    readFile(new URL("data/v62-jin-fangzhen-reader.js", legacyRoot), "utf8"),
    readFile(new URL("data/v62-jinshi-display.js", legacyRoot), "utf8"),
  ]);

  const manifest = JSON.parse(manifestRaw);
  const assets = Object.values(manifest.assetsById || {});
  const v62Assets = assets.filter((asset) => asset.portraitKind === "ui-illustration-v62");
  const dynastyCounts = Object.fromEntries(
    ["后汉", "魏", "季汉", "吴", "西晋"].map((dynasty) => [
      dynasty,
      v62Assets.filter((asset) => asset.polity === dynasty).length,
    ]),
  );

  assert.doesNotMatch(legacy, /v62-people-offices\.js/);
  assert.match(legacy, /v62-jin-fangzhen-reader\.js/);
  assert.match(legacy, /v62-jinshi-display\.js\?v=62/);
  assert.match(fangzhenSource, /SGZ_V62_JIN_FANGZHEN/);
  assert.match(jinshiSource, /SGZ_V62_JINSHI_DISPLAY/);
  assert.equal(assets.length, 275);
  assert.equal(v62Assets.length, 100);
  assert.deepEqual(dynastyCounts, { 后汉: 20, 魏: 20, 季汉: 20, 吴: 20, 西晋: 20 });

  await Promise.all(assets.filter((asset) => asset.status === "ready").map(async (asset) => {
    const relative = String(asset.assetPath || asset.src || "").replace(/^\.\//, "");
    const file = await stat(new URL(relative, legacyRoot));
    assert.ok(file.isFile() && file.size > 0, `missing portrait asset: ${relative}`);
  }));
});
