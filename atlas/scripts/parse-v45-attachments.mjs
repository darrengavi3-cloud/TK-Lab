import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const xlsxPath = process.env.V45_XLSX || '/Users/bobiaisi01/Desktop/三国职官表（点校整理本）.xlsx';
const docxPath = process.env.V45_DOCX || '/Users/bobiaisi01/Desktop/晋人官职.docx';

const xlsxContext = { window:{}, self:{}, console, setTimeout, clearTimeout };
xlsxContext.globalThis = xlsxContext;
vm.createContext(xlsxContext);
new vm.Script(fs.readFileSync(path.join(root, 'assets/vendor/xlsx/xlsx.full.min.js'), 'utf8')).runInContext(xlsxContext);
const XLSX = xlsxContext.window.XLSX;

const candidates = [];
const sheetStats = [];
const workbook = XLSX.read(fs.readFileSync(xlsxPath), { type:'buffer' });
for (const sheetName of workbook.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header:1, defval:'' });
  sheetStats.push({ sheet: sheetName, rows: rows.length });
  rows.slice(1).forEach((row, rowIndex) => {
    const text = String(row.join(' ')||'').trim();
    if (!text) return;
    const office = String(row[1]||row[2]||row[0]||'').trim();
    const people = String(row[5]||row[6]||row[4]||'').trim();
    candidates.push({
      id: `attach:xlsx:${sheetName}:${rowIndex+2}`,
      source: '《三国职官表（点校整理本）》',
      sheet: sheetName,
      row: rowIndex + 2,
      office: office || '（未命名官）',
      rank: String(row[2]||row[3]||'').trim(),
      count: String(row[3]||row[1]||'').trim(),
      duty: String(row[4]||row[5]||'').trim(),
      people: people || '',
      note: String(row[7]||row[6]||'').trim(),
      researchStatus: '存疑',
      verification: '附件仅作候选索引；员额、任期与人物关系须以正史逐条复核。'
    });
  });
}

const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));
const xml = await zip.file('word/document.xml').async('string');
const docxText = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join('');
const pattern = /([\u3400-\u9fff]{2,9})(?:為|爲|拜|除|授|遷|轉|领|領|兼|署|辟)((?:太宰|太傅|太保|太尉|司徒|司空|丞相|相国|大司马|大将军|将军|尚书令|尚书仆射|尚书|中书监|中书令|侍中|散骑常侍|黄门侍郎|御史中丞|太常|光禄勋|卫尉|太仆|廷尉|大鸿胪|宗正|大司农|少府|司隶校尉|中领军|中护军|校尉|太守|刺史|县令|县长|博士|郎中|令|丞|长史|司马|主簿|参军|祭酒|掾|属))/g;
const docxCandidates = [];
for (const match of docxText.matchAll(pattern)) {
  docxCandidates.push({
    id: `attach:docx:jin:${docxCandidates.length + 1}`,
    source: '《晋人官职》',
    person: match[1],
    office: match[2],
    researchStatus: '待考',
    verification: '附件原文摘取为候选；同名异人与起止年须按《晋书》本传、纪、志复核。'
  });
}
const officeKeywords = ['太宰','太傅','太保','太尉','司徒','司空','丞相','相国','大司马','大将军','骠骑将军','车骑将军','卫将军','镇北大将军','尚书令','尚书仆射','尚书','中书监','中书令','侍中','散骑常侍','黄门侍郎','御史中丞','太常','光禄大夫','光禄勋','卫尉','太仆','廷尉','宗正','大司农','少府','司隶校尉','中领军','中护军','校尉','太守','刺史','博士','郎中','长史','司马','主簿','参军','祭酒','掾','属','令','丞'];
const officePatternParts = officeKeywords.slice().sort((a,b)=>b.length-a.length).join('|');
const officeSplit = new RegExp('(' + officePatternParts + ')', 'g');
const officeSegments = docxText.split(officeSplit);
for (let index = 1; index < officeSegments.length; index += 2) {
  const office = officeSegments[index];
  const segment = String(officeSegments[index+1]||'').replace(/^[，。；、\s]+/,'').slice(0,80);
  if (!segment) continue;
  docxCandidates.push({
    id: `attach:docx:jin:roster:${docxCandidates.length + 1}`,
    source: '《晋人官职》',
    person: segment,
    office,
    researchStatus: '待考',
    verification: '按官名切分的名录片段；人名与任年须逐条复核，片段内可能含多名人物。'
  });
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: '两份附件仅作资料索引；所有官职、员额、任期仍须回查正史。',
  sheets: sheetStats,
  xlsxCandidates: candidates,
  docxCandidates,
  docxRawText: docxText,
  summary: {
    xlsxSheets: sheetStats.length,
    xlsxCandidates: candidates.length,
    docxCandidates: docxCandidates.length,
    docxTextLength: docxText.length,
    allPending: candidates.every(c => c.researchStatus === '存疑') && docxCandidates.every(c => c.researchStatus === '待考')
  }
};

fs.writeFileSync(path.join(root, 'data/v45-attachment-candidates.json'), JSON.stringify(output, null, 2) + '\n');
console.log(`附件结构化：xlsx ${candidates.length} 条候选 / ${sheetStats.length} 张表；docx ${docxCandidates.length} 条候选 / ${docxText.length} 字`);
