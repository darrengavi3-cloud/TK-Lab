import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import JSZip from 'jszip';

const root = path.resolve(decodeURIComponent(new URL('..', import.meta.url).pathname));
const sourcePath = '/Users/bobiaisi01/Desktop/两晋金石录（2025.06.21更新）.docx';
const sourceName = path.basename(sourcePath);
const outData = path.join(root, 'data');
const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
const xml = await JSZip.loadAsync(fs.readFileSync(sourcePath)).then(zip => zip.file('word/document.xml').async('string'));

function decodeXml(value) {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function attrValue(tag, name) {
  const match = String(tag || '').match(new RegExp(`\\bw:${name}\\s*=\\s*["']([^"']*)["']`));
  return match ? match[1] : '';
}

function enabled(value) {
  return !/^(?:0|false|off|none)$/i.test(String(value || '1'));
}

function explicitStrike(xmlPart) {
  const tags = [...String(xmlPart || '').matchAll(/<w:(strike|dstrike)\b[^>]*\/?>(?:<\/w:\1>)?/gi)];
  if (!tags.length) return null;
  return tags.some(tag => enabled(attrValue(tag[0], 'val')));
}

function textFromRun(runXml) {
  if (/<w:delText\b/i.test(runXml) || /<w:del\b/i.test(runXml)) return '';
  const chunks = [];
  for (const match of runXml.matchAll(/<w:(t|tab|br|cr)\b[^>]*>([\s\S]*?)<\/w:\1>|<w:(tab|br|cr)\b[^>]*\/?>(?:<\/w:\3>)?/gi)) {
    const tag = match[1] || match[3];
    chunks.push(tag === 't' ? decodeXml(match[2]) : (tag === 'tab' ? '\t' : '\n'));
  }
  return chunks.join('');
}

function paragraphInfo(paragraphXml, number) {
  const pPr = paragraphXml.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/i)?.[0] || '';
  const paragraphStrike = explicitStrike(pPr);
  const pieces = [];
  const runPattern = /<w:r\b[\s\S]*?<\/w:r>/gi;
  for (const match of paragraphXml.matchAll(runPattern)) {
    const runXml = match[0];
    if (/<w:delText\b|<w:del\b/i.test(runXml)) continue;
    const rPr = runXml.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/i)?.[0] || '';
    const runStrike = explicitStrike(rPr);
    const text = textFromRun(runXml);
    if (!text) continue;
    pieces.push({ text, strike: runStrike === null ? paragraphStrike === true : runStrike });
  }
  const normalText = pieces.filter(piece => !piece.strike).map(piece => piece.text).join('');
  const struckText = pieces.filter(piece => piece.strike).map(piece => piece.text).join('');
  return {
    paragraph: number,
    text: normalText.replace(/\s+/g, ' ').trim(),
    struckText: struckText.replace(/\s+/g, ' ').trim(),
    strike: Boolean(struckText),
  };
}

const paragraphs = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/gi)].map((match, index) => paragraphInfo(match[0], index + 1));
const strikeParagraphs = paragraphs.filter(item => item.strike);
const lines = paragraphs.filter(item => item.text).map(item => ({ ...item, text: item.text.replace(/\s+/g, ' ').trim() }));

const eras = [
  ['泰始', 266], ['咸宁', 275], ['太康', 280], ['元康', 291], ['永康', 300], ['永宁', 301],
  ['太安', 302], ['永兴', 304], ['光熙', 306], ['永嘉', 307], ['建兴', 313], ['建武', 317],
  ['太兴', 318], ['永昌', 322], ['太宁', 323], ['咸和', 326], ['咸康', 335], ['建元', 343],
  ['永和', 345], ['升平', 357], ['隆和', 362], ['兴宁', 363], ['太和', 366], ['咸安', 371],
  ['宁康', 373], ['太元', 376], ['隆安', 397], ['元兴', 402], ['义熙', 405], ['元熙', 419],
];

function yearInfo(value) {
  const text = String(value || '');
  for (const [era, start] of eras) {
    const match = text.match(new RegExp(`${era}\\s*([元一二三四五六七八九十百0-9]+)年?`));
    if (!match) continue;
    const raw = match[1];
    const digits = /^\d+$/.test(raw) ? Number(raw) : null;
    const chinese = { 元: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    const number = digits ?? (raw.length === 1 ? chinese[raw] : raw === '十一' ? 11 : raw === '十二' ? 12 : raw === '十三' ? 13 : raw === '十四' ? 14 : raw === '十五' ? 15 : raw === '十六' ? 16 : raw === '十七' ? 17 : raw === '十八' ? 18 : raw === '十九' ? 19 : raw === '二十' ? 20 : null);
    if (!number) return { yearText: text, year: null, status: '待考' };
    return { yearText: text, year: start + number - 1, status: '已结构化' };
  }
  const year = text.match(/(?:晋|西晋|东晋)[^0-9一二三四五六七八九十]{0,8}([0-9]{3})年/);
  return { yearText: text, year: year ? Number(year[1]) : null, status: year ? '已结构化' : '待考' };
}

const materialPattern = /(碑|志|铭|砖|墓|摩崖|石刻|碣|券|镜|阙|题名|题刻|墓版|墓表|残石|造像|经幢|刻石|祠碑)/;
const notePattern = /^(?:注|案|按|见|据|出|附|录|录文|说明|校|辨|考释|右|此碑|图\d)[：:、]?/;
const markerPattern = /^(?:碑阳|碑阴|志阳|志阴|碑额|志盖|释文|铭文|碑文|正文|棺柩铭文)/;
const pseudoPattern = /(伪刻|伪碑|疑伪|非晋碑|当削|伪作)/;
const nonJinPattern = /^(?:魏雏碑|吴故|后赵|晋石勒)/;
const sectionPattern = /^(西晋|东晋|前凉|后凉|前赵|后赵|成汉|前燕|后燕|南凉|北凉|后秦|西秦|北魏|十六国)$/;

function splitHeadingText(text) {
  const matches = [...String(text).matchAll(/(?:^|[。；;）)])\s*(\d+)[.、)]\s*/g)].map(match => ({
    index: match.index + match[0].indexOf(match[1]),
  }));
  if (!matches.length) return [text];
  const chunks = [];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].index;
    const end = matches[i + 1]?.index ?? text.length;
    chunks.push(text.slice(start, end).trim());
  }
  return chunks;
}

function isHeading(text) {
  const value = String(text || '').trim();
  if (!value || value.length > 180 || sectionPattern.test(value) || markerPattern.test(value) || notePattern.test(value)) return false;
  if (/^\d+[.、)]/.test(value)) return true;
  if (value.length > 80 || /[。；;，,:：]/.test(value) || /(?:所记|录文|跋尾|重录|墓地|出土|案王|案《)/.test(value)) return false;
  if (!materialPattern.test(value)) return false;
  const titleSignal = /^晋/.test(value)
    || /[（(][^）)]*(?:年|晋|代)[^）)]*[）)]/.test(value)
    || /(?:碑|志|铭|砖|墓|碣|造像|题名|题刻|记)$/.test(value)
    || /(?:碑|志|铭|砖|墓|碣|造像|题名|题刻|记)\s+(?:泰始|咸宁|太康|元康|永嘉|建兴|太兴|咸和|咸康|永和|升平|隆安|义熙|元熙)/.test(value);
  return titleSignal;
}

const westStart = lines.findIndex(item => item.text === '西晋');
const eastStart = lines.findIndex(item => item.text === '东晋');
const nonJinStart = lines.findIndex((item, index) => index > eastStart && item.text === '前凉');
const headings = [];
for (let i = 0; i < lines.length; i += 1) {
  const item = lines[i];
  if (i <= westStart || i >= (nonJinStart > 0 ? nonJinStart : lines.length) || item.strike) continue;
  const section = i >= eastStart ? '东晋' : '西晋';
  if (section === '东晋' && eastStart < 0) continue;
  for (const chunk of splitHeadingText(item.text)) {
    if (isHeading(chunk)) headings.push({ ...item, text: chunk, section });
  }
}

function cleanTitle(value) {
  const source = String(value || '').replace(/^\d+[.、)]\s*/, '').trim();
  const cut = source.search(/[。；;：:]/);
  const bracket = source.indexOf('）');
  const compact = bracket > 0 && /（[^）]*(?:年|西晋|东晋)/.test(source) && source.slice(bracket + 1).trim() ? source.slice(0, bracket + 1) : source;
  return (cut > 0 ? compact.slice(0, Math.min(cut, compact.length)) : compact).replace(/[：:]+$/, '').trim();
}

function extractInscription(startIndex, endIndex) {
  const result = [];
  let active = false;
  for (let i = startIndex + 1; i < Math.min(endIndex, startIndex + 18); i += 1) {
    const value = lines[i]?.text || '';
    if (!value || lines[i].strike || sectionPattern.test(value)) continue;
    if (isHeading(value)) break;
    if (markerPattern.test(value) || /释文|铭文|碑文/.test(value)) active = true;
    if (active) {
      if (notePattern.test(value) || /^(?:注|案|按|见|据)/.test(value)) break;
      result.push(value);
    }
  }
  return result.join('\n').trim();
}

function materialType(title) {
  const value=String(title||'');
  if (/摩崖/.test(value)) return '摩崖';
  if (/砖/.test(value)) return '砖瓦题记';
  if (/墓|志|誌/.test(value)) return '墓志';
  if (/碑|铭|碣|刻|题名|造像/.test(value)) return '碑刻';
  return '其他';
}

const records = [];
const excludedRecords = [];
for (let i = 0; i < headings.length; i += 1) {
  const heading = headings[i];
  const next = headings[i + 1]?.paragraph ?? lines.length + 1;
  const title = cleanTitle(heading.text);
  const pseudo = pseudoPattern.test(title);
  const nonJin = nonJinPattern.test(title);
  const info = yearInfo(title);
  const actualYear = info.year;
  const outside = actualYear !== null && (actualYear < 266 || actualYear > 420);
  if (pseudo || nonJin || outside) {
    excludedRecords.push({ paragraph: heading.paragraph, title, reason: pseudo ? '明显伪刻或伪碑' : nonJin ? '非晋政权材料' : '超出两晋年代' });
    continue;
  }
  const inscription = extractInscription(lines.findIndex(item => item.paragraph === heading.paragraph), lines.findIndex(item => item.paragraph === next));
  const id = `jinshi-v46-${crypto.createHash('sha1').update(`${sourceHash}:${heading.paragraph}:${title}`).digest('hex').slice(0, 16)}`;
  records.push({
    id,
    sourceId: `source:docx:${sourceHash.slice(0, 16)}`,
    source: sourceName,
    sourceHash,
    sourceLocator: `第${heading.paragraph}段`,
    sourceParagraph: heading.paragraph,
    title,
    name: title,
    type: materialType(title),
    sourceTitle: `《${sourceName.replace(/\.docx$/i, '')}》`,
    sourceDocument: sourceName,
    polity: '晋',
    period: actualYear !== null ? (actualYear >= 317 ? '东晋' : '西晋') : heading.section,
    archiveKind: actualYear !== null ? (actualYear >= 317 ? '扩展' : '核心') : (heading.section === '东晋' ? '扩展' : '核心'),
    year: actualYear,
    yearText: info.yearText || title,
    evidenceStatus: info.status === '待考' ? '待考' : '已整理',
    researchStatus: info.status === '待考' ? '存疑' : '确定',
    confidence: info.status === '待考' ? '低' : '中',
    sourceLevel: '文档考据',
    inscription,
    inscriptionStatus: inscription ? '已录入' : '未见明确释文段落',
  });
}

const unique = [...new Map(records.map(record => [`${record.sourceLocator.paragraph}:${record.title}`, record])).values()];
const audit = {
  schemaVersion: 'V46',
  source: sourceName,
  sourcePath,
  sourceHash,
  paragraphCount: paragraphs.length,
  textParagraphCount: lines.length,
  strikeParagraphCount: strikeParagraphs.length,
  strikeCharCount: strikeParagraphs.reduce((sum, item) => sum + item.struckText.length, 0),
  excludedStrikethrough: strikeParagraphs.map(item => ({ paragraph: item.paragraph, text: item.struckText })),
  excludedRecords,
  output: {
    recordCount: unique.length,
    coreCount: unique.filter(record => record.archiveKind === '核心').length,
    extendedCount: unique.filter(record => record.archiveKind === '扩展').length,
    recordsWithoutInscription: unique.filter(record => !record.inscription).length,
  },
  rules: {
    deletion: '只排除 run 级 w:strike/w:dstrike 与 w:del/w:delText，保留同段正常文字',
    scope: '仅收录西晋、东晋 section，伪刻、非晋、超出两晋范围记录排除',
    year: '无法可靠结构化的年代保留 yearText 并标记待考',
  },
};
fs.writeFileSync(path.join(outData, 'v46-jinshi-audit.json'), `${JSON.stringify(audit, null, 2)}\n`);
const runtime = `/* Generated from ${sourceName}; V46 run-level strike audit. */\nwindow.SGZ_EPIGRAPHIC_V46_JIN = ${JSON.stringify({ schemaVersion: 'V46', sourceAudit: audit, records: unique }, null, 2)};\n`;
fs.writeFileSync(path.join(outData, 'epigraphic-v46-jin.js'), runtime);
console.log(JSON.stringify(audit.output));
