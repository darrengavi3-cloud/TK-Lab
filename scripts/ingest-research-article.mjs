#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const NOISE = /(?:评论|回复|点赞|收藏|分享|关注|相关推荐|相关阅读|热门文章|广告|登录|注册|作者简介|目录|上一篇|下一篇)/;
const EVIDENCE_NOTE = /^(?:注|按|考|补|疑|案|附)\s*[：:：]/;
const HISTORICAL_FACT = /(?:官|将军|太守|刺史|牧|卿|令|尉|郎|侍中|校尉|都督|任|拜|迁|除|置|省|复置|建|泰始|咸宁|太康|元康|永嘉)/;

function decodeEntities(value) {
  return String(value)
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function cleanText(value) {
  return decodeEntities(String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
}

function classify(text) {
  if (!text || NOISE.test(text)) return 'page-noise';
  if (EVIDENCE_NOTE.test(text)) return 'evidence-note';
  if (HISTORICAL_FACT.test(text)) return 'fact-candidate';
  return 'interpretation';
}

function extractHtmlBlocks(html) {
  let source = String(html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|nav|footer|aside|header|form|button|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '');
  const article = source.match(/<(article|main)[^>]*>[\s\S]*?<\/\1>/i);
  source = article ? article[0] : source;
  const blocks = [];
  const blockPattern = /<(h[1-6]|p|li|blockquote|caption|td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = blockPattern.exec(source))) {
    const text = cleanText(match[2]);
    if (text) blocks.push({ tag: match[1].toLowerCase(), text });
  }
  return blocks;
}

function extractTextBlocks(input) {
  return String(input || '').split(/\r?\n/).map(line => cleanText(line)).filter(Boolean)
    .map((text, index) => ({ tag: /^#{1,6}\s/.test(text) ? `h${Math.min(text.match(/^#+/)[0].length, 6)}` : 'p', text: text.replace(/^#{1,6}\s+/, ''), line: index + 1 }));
}

function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [key, ...rest] = arg.slice(2).split('=');
      options[key] = rest.join('=') || true;
    } else positional.push(arg);
  }
  return { input: positional[0], output: positional[1], options };
}

const { input, output, options } = parseArgs(process.argv.slice(2));
if (!input || !output) {
  console.error('用法：node scripts/ingest-research-article.mjs <文章.html|文章.md> <输出.json> [--url=https://…]');
  process.exit(2);
}

const raw = await fs.readFile(input, 'utf8');
const isHtml = /\.html?$/i.test(input) || /<\/?(?:article|main|p|h[1-6])\b/i.test(raw);
const blocks = isHtml ? extractHtmlBlocks(raw) : extractTextBlocks(raw);
const rows = blocks.map((block, index) => {
  const kind = classify(block.text);
  return {
    id: `block-${String(index + 1).padStart(4, '0')}`,
    sourceBlock: block.tag,
    locator: block.line ? `line:${block.line}` : `${block.tag}:${index + 1}`,
    text: block.text,
    kind,
    publishable: kind === 'fact-candidate' || kind === 'evidence-note',
    verificationState: '待核',
    note: kind === 'evidence-note' ? '注释保留为证据候选，不自动写入官职事实。' : ''
  };
});

const result = {
  schemaVersion: 1,
  extractedAt: new Date().toISOString(),
  extractionMethod: isHtml ? 'local-html-block-parser' : 'local-text-line-parser',
  source: {
    title: String(options.title || path.basename(input)),
    url: String(options.url || ''),
    input: path.basename(input),
    sourceLevel: '文档考据',
    role: '线索与补充考据'
  },
  policy: {
    commentsImported: false,
    pageNoiseImported: false,
    autoPromotionToFact: false,
    evidenceNotesKeptAsCandidates: true
  },
  blocks: rows,
  summary: {
    total: rows.length,
    factCandidates: rows.filter(row => row.kind === 'fact-candidate').length,
    evidenceNotes: rows.filter(row => row.kind === 'evidence-note').length,
    interpretations: rows.filter(row => row.kind === 'interpretation').length,
    pageNoise: rows.filter(row => row.kind === 'page-noise').length
  }
};

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result.summary));
