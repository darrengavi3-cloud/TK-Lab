import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import test from "node:test";
import vm from "node:vm";

const legacyRoot = new URL("../dist/client/legacy/", import.meta.url);

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

function localReference(value) {
  const clean = String(value || "").split(/[?#]/, 1)[0].replace(/^\.\//, "");
  return clean && !/^(?:https?:|data:|#)/i.test(clean) ? clean : null;
}

test("deploys only the field-gated reader projection", async () => {
  const manifest = JSON.parse(await readFile(new URL("reader-bundle.json", legacyRoot), "utf8"));
  const codeIdentifierExceptions = new Set(manifest.readerProjection?.codeIdentifierExceptions || []);
  const recordedManifest = JSON.parse(await readFile(new URL("../release-metadata/reader-bundle.json", import.meta.url), "utf8"));
  const sourceLock = JSON.parse(await readFile(new URL("../release-metadata/canonical-sources.lock.json", import.meta.url), "utf8"));
  const html = await readFile(new URL("index.html", legacyRoot), "utf8");
  assert.equal(manifest.build, "reader");
  assert.deepEqual(recordedManifest, manifest, "Git release metadata drifted from the deployed reader manifest");
  assert.match(sourceLock.aggregateSha256, /^[0-9a-f]{64}$/);
  assert.match(html, /<meta\s+name="sgz-build"\s+content="reader"/);
  assert.match(html, /v63-reader-people\.js/);

  const bannedFiles = [
    "data/person-source-index.js",
    "data/v60-person-workbook-import.js",
    "data/v61-person-supplements.js",
    "data/v60-research-ledger.js",
    "data/v61-epigraphy-research.js",
    "data/person-entity-audit.js",
    "data/v63-person-registry.js",
    "data/person-zi-supplement.js",
    "assets/map/data/hydronym-audit.js",
    "data/v65-general-title-research.js",
    "data/v65-volume-review.js",
    "data/v65-fangzhen-audit.js",
    "data/v65-epigraphy-audit.js",
    "data/v66-peerage-stages.json",
    "data/v66-administrative-seat-periods.js",
    "data/v66-administrative-seat-periods.json",
    "data/v66-fangzhen-seat-audit.js",
    "data/v66-fangzhen-seat-audit.json",
  ];
  for (const relative of bannedFiles) {
    assert.equal(existsSync(new URL(relative, legacyRoot)), false, `reader build leaked ${relative}`);
  }

  const textFiles = (await walk(legacyRoot)).filter((url) => /\.(?:html|js|json|css|txt|md)$/i.test(url.pathname));
  for (const url of textFiles) {
    const text = await readFile(url, "utf8");
    const relative = decodeURIComponent(url.pathname.slice(legacyRoot.pathname.length));
    assert.doesNotMatch(text, /\/Users\//, `local path leaked in ${relative}`);
    if (relative.startsWith("data/") && !codeIdentifierExceptions.has(relative)) {
      assert.doesNotMatch(
        text,
        /\b(?:workbookSource|workbookSources|workbookHash|sheetName|sheetRow|externalSearchLog|searchLog|rowAudit|auditTrail|sourceRow|sourceRecordRow|sourceRecordId|sourceLocator|sourceExcerpt|sourceUrl|reviewDisposition|searchState|historicalDisposition|researchDisposition|readerEligibility|auditId|taskId)\b/,
        `review metadata leaked in ${relative}`,
      );
      assert.doesNotMatch(text, /\b(?:audit-only|review-only)\b/, `review status leaked in ${relative}`);
    }
    if (codeIdentifierExceptions.has(relative)) {
      assert.doesNotMatch(
        text,
        /window\.SGZ_(?:V60_PERSON_WORKBOOK_IMPORT|V61_PERSON_SUPPLEMENTS|V60_RESEARCH_LEDGER|V61_EPIGRAPHY_RESEARCH|V63_PERSON_REGISTRY|PERSON_SOURCE_INDEX)\s*=/,
        `review payload leaked through compatibility code in ${relative}`,
      );
    }
  }

  const readerPeopleSource = await readFile(new URL("data/v63-reader-people.js", legacyRoot), "utf8");
  const fangzhenReaderSource = await readFile(new URL("data/v66-fangzhen-reader.js", legacyRoot), "utf8");
  const peerageReaderSource = await readFile(new URL("data/v66-peerage-stages.js", legacyRoot), "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(readerPeopleSource, context, { filename: "v63-reader-people.js" });
  const readerPeople = context.window.SGZ_V63_READER_PEOPLE;
  assert.ok(readerPeople, "reader people payload is missing");
  const people = readerPeople.people || Object.values(readerPeople.byPersonId || readerPeople.peopleById || {});
  assert.equal(people.length, 2317, `expected the unified 2317-person roster, received ${people.length}`);
  assert.ok(people.every((person) => person.personId && person.name), "reader person lacks a stable id or name");
  assert.ok(people.every((person) => !("datasets" in person)), "reader person leaked source dataset labels");

  vm.runInContext(fangzhenReaderSource, context, { filename: "v66-fangzhen-reader.js" });
  const fangzhenReader = context.window.SGZ_V66_FANGZHEN_READER;
  assert.equal(fangzhenReader?.schemaVersion, "V66-reader");
  assert.equal(fangzhenReader?.records?.length, 45);
  assert.equal(fangzhenReader?.records?.length, fangzhenReader?.summary?.records);
  assert.equal(fangzhenReader?.summary?.verifiedSeats, 27);
  assert.equal(fangzhenReader?.verifiedSeatRecordIds?.length, 27);
  const seatFields = ["seat", "seatName", "seatType", "seatPeriodId", "administrativeUnitId", "seatValidFromYear", "seatValidToYear"];
  assert.ok(fangzhenReader.records.every((record) => {
    const present = seatFields.filter((field) => record[field] !== undefined);
    return record.id && (present.length === 0 || present.length === seatFields.length);
  }), "reader fangzhen seat fields are not all-or-none");
  const polityCounts = Object.groupBy(fangzhenReader.records, (record) => record.polity);
  assert.equal(polityCounts["魏"]?.length, 1);
  assert.equal(polityCounts["汉"]?.length, 11);
  assert.equal(polityCounts["吴"]?.length, 1);
  assert.equal(polityCounts["晋"]?.length, 32);
  assert.equal(fangzhenReader.records.find((record) => record.id === "fz_wei_cishi_5_0")?.seatName, undefined);
  assert.ok(fangzhenReader.records.find((record) => record.id === "fz_han_lvbu_yan")?.seatName);
  assert.doesNotMatch(fangzhenReaderSource, /治所未详|审校记录未发布|sourceLocator|sourceExcerpt|sourceUrl|publicationStatus/);

  vm.runInContext(peerageReaderSource, context, { filename: "v66-peerage-stages.js" });
  const peerageReader = context.window.SGZ_V66_PEERAGE_STAGES;
  assert.equal(peerageReader?.schemaVersion, "V66-reader");
  assert.equal(peerageReader?.nodes?.length, 13);
  assert.equal(peerageReader?.events?.length, 194);
  assert.equal(peerageReader?.summary?.linkedPeople, 166);
  assert.ok(peerageReader.events.every((event) => {
    const verifiedIndexes = new Set((event.rankStages || []).map((stage) => Number(stage.stageIndex)));
    return (event.titleStages || []).every((stage) => verifiedIndexes.has(Number(stage.stageIndex)));
  }), "reader peerage title stage escaped its verified rank-stage gate");
  const caorui = peerageReader.events.find((event) => event.eventId === "peerage:239");
  assert.equal((caorui?.titleStages || []).map((stage) => stage.title).join("|"), "齐公|平原王");
  assert.equal((caorui?.rankStages || []).map((stage) => `${stage.year}:${stage.title}:${stage.peerageNodeId}`).join("|"), "221:齐公:peerage:wei:rank:gong|222:平原王:peerage:wei:rank:wang");
  assert.ok(!(caorui?.rankStages || []).some((stage) => stage.title === "武德侯"), "review-only 武德侯 stage escaped into the reader timeline source");
  assert.doesNotMatch(peerageReaderSource, /sourceCitation|sourceRecordId|searchState|historicalDisposition|publicationStatus|review-only/);

  assert.doesNotMatch(html, /V60 全量人物|260 年人物纪|曹魏封爵人物|peopleDataset/);
  assert.match(html, /peoplePrimaryPeerageTimeline/);
  assert.match(html, /stage\.publicationStatus!==['"]review-only['"]/);
  assert.match(html, /返回爵制节点/);
  assert.doesNotMatch(html, /治所未详/);
  assert.doesNotMatch(html, /battleBranchGroups|battleCampaignGroups|battlePeriodId|battleDensity|battleView/);
});

test("renders imported text only through text bindings", async () => {
  const html = await readFile(new URL("index.html", legacyRoot), "utf8");
  assert.doesNotMatch(html, /\bv-html\b/);
  assert.doesNotMatch(html, /\.innerHTML\s*=/);
  assert.doesNotMatch(html, /insertAdjacentHTML\s*\(/);
  assert.match(html, /highlightMatchFragments|highlightTextFragments/);

  const malicious = `<img src=x onerror="globalThis.__executed=true"><script>globalThis.__executed=true<\/script>`;
  const jinshiModule = await import(new URL("assets/app/jinshi.js", legacyRoot));
  const fragments = jinshiModule.highlightTextFragments(malicious, "img");
  assert.equal(fragments.map((fragment) => fragment.text).join(""), malicious);
  assert.equal(globalThis.__executed, undefined);
});

test("keeps the synchronous first-view payload within 800 KiB compressed", async () => {
  const html = await readFile(new URL("index.html", legacyRoot), "utf8");
  const head = html.match(/<head[\s\S]*?<\/head>/i)?.[0] || "";
  const references = new Set();
  for (const match of head.matchAll(/<(script|link)\b([^>]*?)>/gi)) {
    const [, tagName, attributes] = match;
    if (tagName.toLowerCase() === "link" && !/\brel=["']stylesheet["']/i.test(attributes)) continue;
    if (/\b(?:async|defer)\b/i.test(attributes) || /\btype=["']module["']/i.test(attributes)) continue;
    const reference = attributes.match(/\b(?:src|href)=["']([^"']+)["']/i)?.[1];
    const local = localReference(reference);
    if (local) references.add(local);
  }

  const buffers = [Buffer.from(html)];
  for (const relative of references) {
    const url = new URL(relative, legacyRoot);
    assert.ok((await stat(url)).isFile(), `missing first-view resource ${relative}`);
    buffers.push(await readFile(url));
  }
  const gzipBytes = gzipSync(Buffer.concat(buffers), { level: 9 }).length;
  assert.ok(gzipBytes <= 800 * 1024, `first-view payload is ${gzipBytes} compressed bytes`);
  assert.doesNotMatch(head, /xlsx\.full\.min\.js/i, "SheetJS must load only in review import flows");
});

test("reader manifest entries remain internally self-consistent before site optimization", async () => {
  const manifest = JSON.parse(await readFile(new URL("reader-bundle.json", legacyRoot), "utf8"));
  assert.equal(manifest.fileCount, manifest.files.length);
  const lines = manifest.files.map((entry) => `${entry.path}\0${entry.bytes}\0${entry.sha256}\n`).join("");
  assert.equal(createHash("sha256").update(lines).digest("hex"), manifest.aggregateSha256);
});
