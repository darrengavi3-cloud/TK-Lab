import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  assert.match(html, /<iframe[^>]+src="\/legacy\/index\.html"/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("packages the V34 court, biography, and map assets", async () => {
  const [page, layout, legacy, biographies, evidence, palace] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/legacy/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/legacy/data/person-biographies.js", import.meta.url), "utf8"),
    readFile(new URL("../public/legacy/data/history-evidence.json", import.meta.url), "utf8"),
    readFile(new URL("../public/legacy/assets/ui/court-ink-palace.png", import.meta.url)),
  ]);

  assert.match(page, /src="\/legacy\/index\.html"/);
  assert.match(layout, /中华三国志·职官谱/);
  assert.match(legacy, /courtHierarchy|朝堂谱系|PERSON_BIOGRAPHIES/);
  assert.match(biographies, /曹操|诸葛亮|司马懿/);
  assert.match(evidence, /yongjia-yangzhou-recalibration|jinshu_juan15/);
  assert.ok(palace.byteLength > 100_000);
});
