import fs from 'node:fs';
import { JIN_TAISHI_FIRST_YEAR } from './epigraphy-year-publication.mjs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import JSZip from 'jszip';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourcePath='/Users/bobiaisi01/Desktop/两晋金石录（2025.06.21更新）.docx';
const sourceName=path.basename(sourcePath);
const outData=path.join(root,'data');
const sourceBuffer=fs.readFileSync(sourcePath);
const sourceHash=crypto.createHash('sha256').update(sourceBuffer).digest('hex');
const xml=await JSZip.loadAsync(sourceBuffer).then(zip=>zip.file('word/document.xml').async('string'));

function decodeXml(value){
  return String(value||'').replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16)))
    .replace(/&#(\d+);/g,(_,dec)=>String.fromCodePoint(Number(dec))).replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
}
function attrValue(tag,name){const match=String(tag||'').match(new RegExp(`\\bw:${name}\\s*=\\s*["']([^"']*)["']`));return match?match[1]:'';}
function enabled(value){return !/^(?:0|false|off|none)$/i.test(String(value||'1'));}
function explicitToggle(xmlPart,tagName){
  const tags=[...String(xmlPart||'').matchAll(new RegExp(`<w:${tagName}\\b[^>]*\\/?>(?:<\\/w:${tagName}>)?`,'gi'))];
  if(!tags.length)return null;
  return tags.some(tag=>enabled(attrValue(tag[0],'val')));
}
function textFromXml(xmlPart){
  const chunks=[];
  for(const match of String(xmlPart||'').matchAll(/<w:(t|delText)\b[^>]*>([\s\S]*?)<\/w:\1>|<w:(tab|br|cr)\b[^>]*\/?>(?:<\/w:\3>)?/gi)){
    const tag=match[1]||match[3];
    chunks.push(tag==='t'||tag==='delText'?decodeXml(match[2]):(tag==='tab'?'\t':'\n'));
  }
  return chunks.join('');
}
function paragraphInfo(paragraphXml,number){
  const deletedBlocks=[...paragraphXml.matchAll(/<w:del\b[\s\S]*?<\/w:del>/gi)].map(match=>textFromXml(match[0])).join('');
  const visibleXml=paragraphXml.replace(/<w:del\b[\s\S]*?<\/w:del>/gi,'');
  const pPr=visibleXml.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/i)?.[0]||'';
  const paragraphStrike=explicitToggle(pPr,'strike')===true||explicitToggle(pPr,'dstrike')===true;
  const paragraphBold=explicitToggle(pPr,'b')===true;
  const styleId=attrValue(pPr.match(/<w:pStyle\b[^>]*\/?>(?:<\/w:pStyle>)?/i)?.[0]||'','val');
  const pieces=[];
  for(const match of visibleXml.matchAll(/<w:r\b[\s\S]*?<\/w:r>/gi)){
    const runXml=match[0];
    if(/<w:delText\b/i.test(runXml))continue;
    const rPr=runXml.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/i)?.[0]||'';
    const runStrike=[explicitToggle(rPr,'strike'),explicitToggle(rPr,'dstrike')].some(value=>value===true);
    const runBold=explicitToggle(rPr,'b');
    const sizeTag=rPr.match(/<w:sz\b[^>]*\/?>(?:<\/w:sz>)?/i)?.[0]||'';
    const size=Number(attrValue(sizeTag,'val'))/2||0;
    const text=textFromXml(runXml);
    if(text)pieces.push({text,strike:runStrike||paragraphStrike,bold:runBold===null?paragraphBold:runBold,size});
  }
  const normalPieces=pieces.filter(piece=>!piece.strike);
  const normalText=normalPieces.map(piece=>piece.text).join('');
  const struckText=pieces.filter(piece=>piece.strike).map(piece=>piece.text).join('');
  const visibleChars=Math.max(1,normalPieces.reduce((sum,piece)=>sum+piece.text.replace(/\s/g,'').length,0));
  const boldChars=normalPieces.filter(piece=>piece.bold).reduce((sum,piece)=>sum+piece.text.replace(/\s/g,'').length,0);
  return {paragraph:number,text:normalText.replace(/[\t ]+/g,' ').replace(/\n{3,}/g,'\n\n').trim(),lineText:normalText.replace(/\s+/g,' ').trim(),struckText:struckText.replace(/\s+/g,' ').trim(),deletedText:deletedBlocks.replace(/\s+/g,' ').trim(),strike:Boolean(struckText),styleId,boldRatio:boldChars/visibleChars,maxFontSize:Math.max(0,...normalPieces.map(piece=>piece.size))};
}

const paragraphs=[...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/gi)].map((match,index)=>paragraphInfo(match[0],index+1));
const strikeParagraphs=paragraphs.filter(item=>item.strike);
const deletedParagraphs=paragraphs.filter(item=>item.deletedText);
const lines=paragraphs.filter(item=>item.lineText).map((item,index)=>({...item,lineIndex:index}));

const eras=[['泰始',JIN_TAISHI_FIRST_YEAR],['咸宁',275],['太康',280],['元康',291],['永康',300],['永宁',301],['太安',302],['永兴',304],['光熙',306],['永嘉',307],['建兴',313],['建武',317],['太兴',318],['永昌',322],['太宁',323],['咸和',326],['咸康',335],['建元',343],['永和',345],['升平',357],['隆和',362],['兴宁',363],['太和',366],['咸安',371],['宁康',373],['太元',376],['隆安',397],['元兴',402],['义熙',405],['元熙',419]];
const eraNames=eras.map(([name])=>name).join('|');
function chineseNumber(value){
  const raw=String(value||'');
  if(/^\d+$/.test(raw))return Number(raw);
  const digit={元:1,〇:0,零:0,一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
  if(raw==='元')return 1;
  if(raw.includes('十')){const [left,right]=raw.split('十');return (left?digit[left]:1)*10+(right?digit[right]:0);}
  return raw.length===1?digit[raw]??null:null;
}
function yearInfo(value){
  const text=String(value||'');
  const match=text.match(new RegExp(`(${eraNames})\\s*([元〇零一二三四五六七八九十百0-9]+)年`));
  if(match){const era=eras.find(([name])=>name===match[1]);const number=chineseNumber(match[2]);if(era&&number)return {yearText:match[0],year:era[1]+number-1,status:'已结构化'};return {yearText:match[0],year:null,status:'待考'};}
  const common=text.match(/(?:公元)?\s*((?:2|3|4)\d{2})\s*年/);
  return {yearText:common?common[0].trim():'年代未详',year:common?Number(common[1]):null,status:common?'已结构化':'待考'};
}

const materialPattern=/(碑|志|誌|铭|銘|砖|磚|墓|摩崖|石刻|碣|券|镜|鏡|阙|闕|题名|題名|题刻|題刻|墓版|墓表|残石|殘石|造像|经幢|經幢|刻石|祠堂颂|祠堂頌)/;
const markerPattern=/^(?:[（(【\[])?(?:碑阳|碑陽|碑阴|碑陰|背阴|背陰|志阳|志陽|志阴|志陰|碑额|碑額|额题|額題|志盖|誌蓋|释文|釋文|铭文|銘文|碑文|正文|砖志|磚誌|棺柩铭文|棺柩銘文)[）)】\]]?[：:]?/;
const notePattern=/^(?:注|案|按|见|見|据|據|出典|附|说明|說明|校记|校記|辨|考释|考釋|跋)[：:、]?/;
const pseudoPattern=/(伪刻|偽刻|伪碑|偽碑|疑伪|疑偽|非晋碑|非晉碑|当削|當削|伪作|偽作)/;
const nonJinPattern=/^(?:魏雏碑|魏雛碑|吴故|吳故|后赵|後趙|晋石勒|晉石勒)/;
const sectionPattern=/^(西晋|西晉|东晋|東晉|前凉|前涼|后凉|後涼|前赵|前趙|后赵|後趙|成汉|成漢|前燕|后燕|後燕|南凉|南涼|北凉|北涼|后秦|後秦|西秦|北魏|十六国|十六國)$/;

function splitHeadingText(text){
  const value=String(text||'').trim();
  const matches=[...value.matchAll(/(?:^|[。；;）)])\s*(\d{1,3})[.、．)]\s*/g)].map(match=>match.index+match[0].lastIndexOf(match[1]));
  if(matches.length<2)return [value];
  return matches.map((start,index)=>value.slice(start,matches[index+1]??value.length).trim()).filter(Boolean);
}
function isHeading(text,meta={}){
  const value=String(text||'').trim();
  if(!value||value.length>180||sectionPattern.test(value)||markerPattern.test(value)||notePattern.test(value))return false;
  if(/发掘|發掘|简报|簡報|报告|報告|收获|收穫|考古调查|考古調查|新发现的|新發現的|发现\d+年前|發現\d+年前|出土近代/.test(value))return false;
  if(/^\d+[.、．)]/.test(value))return materialPattern.test(value)&&!(value.length>76&&/(?:出土|发掘|發掘|有“|有「)/.test(value));
  if(value.length>90||/[。；;，,:：]/.test(value)||/(?:所记|所記|录文|錄文|跋尾|重录|重錄|出土于|出土於|案《)/.test(value))return false;
  return materialPattern.test(value)&&(meta.boldRatio>=.72||meta.maxFontSize>=12.5||/^Heading/i.test(meta.styleId||''));
}
function cleanTitle(value,date){
  let title=String(value||'').replace(/^\d+[.、．)]\s*/,'').trim();
  title=title.split(markerPattern)[0].trim();
  const original=title;
  title=title.replace(new RegExp(`[（(][^）)]*(?:${eraNames})[^）)]*年[^）)]*[）)]`,'g'),'');
  title=title.replace(new RegExp(`(?:${eraNames})\\s*[元〇零一二三四五六七八九十百0-9]+年(?:[元〇零一二三四五六七八九十百0-9]+月)?`,'g'),'');
  title=title.replace(/[（(](?:金石录|金石錄|复斋碑录|復齋碑錄|\d{4})[）)]/g,'').replace(/[（(]\s*[）)]/g,'');
  const cut=title.search(/[。；;：:]/);if(cut>0)title=title.slice(0,cut);
  title=title.replace(/^[—–·，,\s]+|[—–·，,\s]+$/g,'').trim();
  if(title.replace(/[“”「」『』]/g,'').length<=2&&date?.yearText&&date.yearText!=='年代未详')return original.replace(/[（(]\s*[）)]/g,'').trim();
  return title;
}
function materialType(title){
  const value=String(title||'');if(/摩崖/.test(value))return '摩崖';if(/砖|磚/.test(value))return '砖瓦题记';if(/墓|志|誌/.test(value))return '墓志';if(/镜|鏡|券/.test(value))return '器物铭';if(/碑|铭|銘|碣|刻|题名|題名|造像|颂|頌/.test(value))return '碑刻';return '其他';
}

const westStart=lines.findIndex(item=>/^(西晋|西晉)$/.test(item.lineText));
const eastStart=lines.findIndex(item=>/^(东晋|東晉)$/.test(item.lineText));
const nonJinStart=lines.findIndex((item,index)=>index>eastStart&&/^(前凉|前涼)$/.test(item.lineText));
const headings=[];
for(let index=0;index<lines.length;index+=1){
  const line=lines[index];
  if(index<=westStart||index>=(nonJinStart>0?nonJinStart:lines.length)||line.strike)continue;
  const section=index>=eastStart?'东晋':'西晋';
  splitHeadingText(line.lineText).forEach((chunk,chunkIndex)=>{if(isHeading(chunk,line))headings.push({...line,text:chunk,section,sourceLineIndex:index,chunkIndex});});
}
function rangeLines(heading,nextHeading){const end=nextHeading?nextHeading.sourceLineIndex:nonJinStart>0?nonJinStart:lines.length;return lines.slice(heading.sourceLineIndex+1,Math.max(heading.sourceLineIndex+1,end));}
function extractFindspot(rows){
  for(const row of rows.slice(0,24)){
    const value=row.lineText;
    const labeled=value.match(/(?:出土地(?:点|點)?|出土地点|出土地點|发现地|發現地|地点|地點|现藏地|現藏地)[：:]\s*([^。；;]+)/);if(labeled)return labeled[1].trim();
    const prose=value.match(/(?:出土于|出土於|发现于|發現於)\s*([^。；;，,]+)/);if(prose)return prose[1].trim();
  }
  return '';
}
function extractInscription(rows){
  const out=[];let active=false;
  for(const row of rows){
    const value=row.text||row.lineText;if(!value||row.strike||sectionPattern.test(row.lineText))continue;
    const marker=row.lineText.match(markerPattern);
    if(marker){active=true;const rest=value.replace(markerPattern,'').trim();out.push(marker[0].replace(/[：:]$/,'').trim());if(rest)out.push(rest);continue;}
    if(!active)continue;if(notePattern.test(row.lineText))break;out.push(value.trim());
  }
  return out.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}

const records=[];const excludedRecords=[];
for(let index=0;index<headings.length;index+=1){
  const heading=headings[index];const next=headings[index+1];const rows=rangeLines(heading,next);const rawTitle=heading.text;const date=yearInfo(rawTitle);
  const title=cleanTitle(rawTitle,date)||rawTitle.replace(/^\d+[.、．)]\s*/,'').trim();
  const rangeText=[rawTitle,...rows.slice(0,12).map(row=>row.lineText)].join('\n');const pseudo=pseudoPattern.test(rangeText);const nonJin=nonJinPattern.test(title);const outside=date.year!==null&&(date.year<266||date.year>420);
  if(pseudo||nonJin||outside){excludedRecords.push({paragraph:heading.paragraph,title,reason:pseudo?'明显伪刻或伪碑':nonJin?'非晋政权材料':'超出两晋年代'});continue;}
  const expectedSection=date.year===null?heading.section:(date.year>=317?'东晋':'西晋');const sectionConflict=date.year!==null&&expectedSection!==heading.section;
  const findspot=extractFindspot(rows);const inscription=extractInscription(rows);const sourceLocator=`第${heading.paragraph}段${heading.chunkIndex?`第${heading.chunkIndex+1}题`:''}`;
  const id=`jinshi-v55-${crypto.createHash('sha1').update(`${sourceHash}:${heading.paragraph}:${heading.chunkIndex}:${rawTitle}`).digest('hex').slice(0,16)}`;const researchStatus=sectionConflict?'存疑':date.status==='待考'?'存疑':'确定';
  records.push({id,entityType:'epigraphicRecord',sourceId:`source:docx:${sourceHash.slice(0,16)}`,source:sourceName,sourceHash,sourceLocator,sourceParagraph:heading.paragraph,rawTitle,title,name:title,type:materialType(title),materialType:materialType(title),sourceTitle:`《${sourceName.replace(/\.docx$/i,'')}》`,sourceDocument:sourceName,polity:'晋',period:expectedSection,archiveKind:expectedSection==='东晋'?'扩展':'核心',year:date.year,yearText:date.yearText,dateText:date.yearText,findspot,place:findspot,evidenceStatus:date.status==='待考'?'待考':'已整理',researchStatus,confidence:researchStatus==='确定'?'确定':'待考',sourceLevel:'文档考据',inscription,inscriptionStatus:inscription?'已录入源文释文':'源文未见明确释文标识',people:'',offices:'',rawRecord:{title:rawTitle,dateText:date.yearText,findspot,sourceLocator,paragraph:heading.paragraph,section:heading.section},readerSummary:[date.yearText,findspot,inscription?'有释文':'释文未见'].filter(Boolean).join(' · '),evidence:{sourceTitle:`《${sourceName.replace(/\.docx$/i,'')}》`,sourceLevel:'文档考据',confidence:researchStatus,sourceLocator,sourceExcerpt:rawTitle},disputeNote:sectionConflict?`标题年代与“${heading.section}”章节不一致，待人工复核。`:''});
}

const unique=[...new Map(records.map(record=>[`${record.sourceParagraph}:${record.rawRecord.title}:${record.rawRecord.section}`,record])).values()];
const audit={schemaVersion:'V55',source:sourceName,sourcePath,sourceHash,paragraphCount:paragraphs.length,textParagraphCount:lines.length,headingCount:headings.length,strikeParagraphCount:strikeParagraphs.length,strikeCharCount:strikeParagraphs.reduce((sum,item)=>sum+item.struckText.length,0),deletedParagraphCount:deletedParagraphs.length,deletedCharCount:deletedParagraphs.reduce((sum,item)=>sum+item.deletedText.length,0),excludedStrikethrough:strikeParagraphs.map(item=>({paragraph:item.paragraph,text:item.struckText})),excludedDeletedText:deletedParagraphs.map(item=>({paragraph:item.paragraph,text:item.deletedText})),excludedRecords,output:{recordCount:unique.length,coreCount:unique.filter(record=>record.archiveKind==='核心').length,extendedCount:unique.filter(record=>record.archiveKind==='扩展').length,recordsWithoutInscription:unique.filter(record=>!record.inscription).length,recordsWithFindspot:unique.filter(record=>record.findspot).length,structuredYears:unique.filter(record=>record.year!==null).length},rules:{deletion:'只排除 run 级 w:strike/w:dstrike 与 w:del/w:delText，保留同段正常文字',scope:'仅收录西晋、东晋章节；伪刻、非晋、超出两晋范围记录排除',year:'yearText 只保存题名中的年代短语；无法可靠结构化者保留“年代未详”并标待考',fields:'题名、年代、出土地与释文分别抽取；空字段显式保留，不以推测补造'}};
fs.writeFileSync(path.join(outData,'v46-jinshi-audit.json'),`${JSON.stringify(audit,null,2)}\n`);
const runtime=`/* Generated from ${sourceName}; V55 field-aligned run-level strike audit. */\nwindow.SGZ_EPIGRAPHIC_V46_JIN = ${JSON.stringify({schemaVersion:'V55',sourceAudit:audit,records:unique},null,2)};\n`;
fs.writeFileSync(path.join(outData,'epigraphic-v46-jin.js'),runtime);
console.log(JSON.stringify(audit.output,null,2));
