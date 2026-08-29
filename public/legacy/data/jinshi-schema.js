(function(global){
  'use strict';

  const columns = Object.freeze([
    { key:'displayTitle', label:'碑名', sourceField:'displayTitle', kind:'text' },
    { key:'materialType', label:'材料类型', sourceField:'materialType', kind:'text' },
    { key:'polity', label:'国别', sourceField:'polity', kind:'text' },
    { key:'archiveKind', label:'档案层级', sourceField:'archiveKind', kind:'status' },
    { key:'dateText', label:'年代', sourceField:'dateText', kind:'text' },
    { key:'findspot', label:'出土地', sourceField:'findspot', kind:'text' },
    { key:'people', label:'关联人物', sourceField:'people', kind:'text' },
    { key:'offices', label:'关联官职', sourceField:'offices', kind:'text' },
    { key:'form', label:'形制', sourceField:'form', kind:'text' },
    { key:'scriptStyle', label:'书体', sourceField:'scriptStyle', kind:'text' },
    { key:'inscription', label:'释文', sourceField:'inscription', kind:'longText' },
    { key:'note', label:'释读说明', sourceField:'note', kind:'longText' },
  ]);

  const sectionLabels = Object.freeze({
    '碑额':'碑额', '碑額':'碑额',
    '碑阳':'碑阳', '碑陽':'碑阳',
    '碑阴':'碑阴', '碑陰':'碑阴',
    '碑文':'碑文',
    '额题':'额题', '額題':'额题',
    '铭文':'铭文', '銘文':'铭文',
    '棺柩铭文':'棺柩铭文', '棺柩銘文':'棺柩铭文',
    '志盖':'志盖', '誌蓋':'志盖',
    '志阳':'志阳', '志陽':'志阳',
    '志阴':'志阴', '志陰':'志阴',
    '砖志':'砖志', '磚誌':'砖志',
    '释文':'释文', '釋文':'释文',
  });

  const sectionSlugs = Object.freeze({
    '正文':'body', '碑额':'stele-heading', '碑阳':'stele-obverse', '碑阴':'stele-reverse',
    '碑文':'stele-text', '额题':'heading-text', '铭文':'inscription', '棺柩铭文':'coffin-inscription',
    '志盖':'epitaph-cover', '志阳':'epitaph-obverse', '志阴':'epitaph-reverse',
    '砖志':'brick-epitaph', '释文':'transcription',
  });

  const titleOverrides = Object.freeze({
    '晋刘氏志（西晋）': Object.freeze({ displayTitle:'晋刘氏志' }),
    '渨安墓（大康三年）': Object.freeze({ displayTitle:'渨安墓' }),
    '太康六年砖铭（太康六年）': Object.freeze({ displayTitle:'太康六年砖铭' }),
    '元康元年砖（元康元年）': Object.freeze({ displayTitle:'元康元年砖' }),
    '元康五年砖（元康五年）': Object.freeze({ displayTitle:'元康五年砖' }),
    '晋建威将军竺使君碑（泰元三年）': Object.freeze({ displayTitle:'晋建威将军竺使君碑' }),
    '陆祎碑（泰宁三年）': Object.freeze({ displayTitle:'陆祎碑' }),
    '王企之墓誌（泰和二年）': Object.freeze({ displayTitle:'王企之墓誌' }),
    '王建之妻劉媚子墓誌（泰和六年）': Object.freeze({ displayTitle:'王建之妻劉媚子墓誌' }),
    '王康之妻何法登墓誌（泰元十四年）': Object.freeze({ displayTitle:'王康之妻何法登墓誌' }),
    '謝温墓誌（義熙二年）': Object.freeze({ displayTitle:'謝温墓誌' }),
    '“三日”铭文（“康”正书）': Object.freeze({ displayTitle:'“三日”铭文', variantLabel:'康正书' }),
    '“三日”铭文（“康”反书）': Object.freeze({ displayTitle:'“三日”铭文', variantLabel:'康反书' }),
    '刘阿如墓誌（永平元年）': Object.freeze({ displayTitle:'刘阿如墓誌' }),
    '当利里社碑（祀后土碑）': Object.freeze({ displayTitle:'当利里社碑', titleAliases:Object.freeze(['祀后土碑']) }),
    '【额】晋张君碑': Object.freeze({ displayTitle:'晋张君碑' }),
  });

  function text(value){ return String(value == null ? '' : value).trim(); }
  function uniqueTextList(value){
    return Array.from(new Set((Array.isArray(value) ? value : []).map(text).filter(Boolean)));
  }
  function lineBody(rawLine){ return String(rawLine).replace(/(?:\r\n|\n|\r)$/,''); }
  function canonicalSectionLabel(rawLine){
    const value=lineBody(rawLine).trim();
    const bracketed=value.match(/^【\s*([^【】]+?)\s*】$/);
    const candidate=bracketed ? bracketed[1].trim() : value;
    return sectionLabels[candidate] || '';
  }
  function splitLinesPreservingEndings(source){
    const value=String(source == null ? '' : source);
    const result=[];
    const pattern=/.*?(?:\r\n|\n|\r|$)/g;
    let match;
    while((match=pattern.exec(value)) && match[0]) result.push(match[0]);
    return result;
  }
  function parseTranscriptionSections(inscription){
    const source=String(inscription == null ? '' : inscription);
    if(!source) return [];
    const sections=[];
    const counts={};
    let active=null;
    const appendBody=rawLine=>{
      if(!active){
        counts['正文']=(counts['正文']||0)+1;
        active={ key:`body-${counts['正文']}`, label:'正文', marker:'', text:'', raw:'' };
      }
      active.text+=rawLine;
      active.raw+=rawLine;
    };
    const flush=()=>{
      if(active && active.raw) sections.push(Object.freeze({...active}));
      active=null;
    };
    splitLinesPreservingEndings(source).forEach(rawLine=>{
      const label=canonicalSectionLabel(rawLine);
      if(!label){ appendBody(rawLine); return; }
      flush();
      counts[label]=(counts[label]||0)+1;
      active={
        key:`${sectionSlugs[label]||'section'}-${counts[label]}`,
        label,
        marker:lineBody(rawLine),
        text:'',
        raw:rawLine,
      };
    });
    flush();
    return sections;
  }
  function reconstructTranscriptionSections(sections){
    return (Array.isArray(sections) ? sections : []).map(section=>String(section?.raw == null ? '' : section.raw)).join('');
  }
  function deriveTitlePresentation(name, raw){
    const original=text(name);
    const override=titleOverrides[original] || {};
    return {
      displayTitle:text(raw?.displayTitle || override.displayTitle || original),
      titleAliases:uniqueTextList([...(override.titleAliases||[]),...(Array.isArray(raw?.titleAliases)?raw.titleAliases:[])]),
      variantLabel:text(raw?.variantLabel || override.variantLabel),
    };
  }
  function normalizeInscriptionStatus(row){
    const raw=text(row.inscriptionStatus);
    if(raw.includes('残缺')) return '残缺';
    if(raw.includes('待校')) return '待校';
    if(raw.includes('源文未见') || raw.includes('待补') || raw.includes('未见')) return '源文未见';
    if(raw.includes('已录入') || text(row.inscription)) return '已录入';
    return '源文未见';
  }
  function normalize(raw){
    const row = { ...(raw || {}) };
    row.entityType = 'epigraphicRecord';
    row.name = text(row.name || row.title || row.displayName);
    const titlePresentation=deriveTitlePresentation(row.name,row);
    row.displayTitle=titlePresentation.displayTitle;
    row.titleAliases=titlePresentation.titleAliases;
    row.variantLabel=titlePresentation.variantLabel;
    row.materialType = text(row.materialType || row.type || '其他');
    row.type = row.materialType;
    row.polity = text(row.polity);
    row.archiveKind = text(row.archiveKind || (row.researchStatus === '争议' ? '争议' : '核心'));
    row.dateText = text(row.dateText || row.yearText || (row.year != null ? `${row.year}年` : '年代未详'));
    row.year = row.year !== null && row.year !== '' && row.year !== undefined && Number.isFinite(Number(row.year)) ? Number(row.year) : null;
    row.findspot = text(row.findspot || row.place || row.region);
    row.place = row.findspot;
    row.region = text(row.region || row.findspot);
    row.people = text(row.people);
    row.offices = text(row.offices);
    row.form = text(row.form);
    row.scriptStyle = text(row.scriptStyle);
    row.inscription = String(row.inscription == null ? '' : row.inscription);
    const suppliedSections=Array.isArray(row.transcriptionSections) ? row.transcriptionSections.map(item=>({...item})) : [];
    row.transcriptionSections=reconstructTranscriptionSections(suppliedSections)===row.inscription
      ? suppliedSections
      : parseTranscriptionSections(row.inscription);
    row.note = text(row.note);
    row.inscriptionStatus = normalizeInscriptionStatus(row);
    row.researchStatus = text(row.researchStatus || row.evidenceStatus || '待考');
    row.sourceDocument = text(row.sourceDocument || row.source || row.sourceTitle);
    row.sourceLocator = text(row.sourceLocator);
    row.inscriptionVariants = Array.isArray(row.inscriptionVariants) ? row.inscriptionVariants.map(item => ({...(item||{})})) : [];
    row.externalSearchLog = Array.isArray(row.externalSearchLog) ? row.externalSearchLog.map(item => ({...(item||{})})) : [];
    row.sourceVerification = row.sourceVerification && typeof row.sourceVerification === 'object' ? {...row.sourceVerification} : {};
    row.candidateDisposition = text(row.candidateDisposition || (row.inscription ? '采用' : '待复核'));
    row.rawRecord = row.rawRecord && typeof row.rawRecord === 'object' ? { ...row.rawRecord } : { title:text(row.rawTitle || row.title || row.name), dateText:row.dateText, findspot:row.findspot, sourceLocator:row.sourceLocator };
    row.readerSummary = text(row.readerSummary || [row.dateText,row.findspot,row.inscriptionStatus].filter(Boolean).join(' · '));
    row.evidence = row.evidence && typeof row.evidence === 'object' ? { ...row.evidence } : { sourceTitle:text(row.sourceTitle), sourceLevel:text(row.sourceLevel), confidence:text(row.confidence || row.researchStatus), sourceLocator:row.sourceLocator };
    return row;
  }

  global.SGZ_JINSHI_SCHEMA = Object.freeze({
    schemaVersion:'V62',
    modelId:'sgz-jinshi-record-v62',
    policy:'读者题名使用 displayTitle，原始 name 与 inscription 不覆写；释文章节只解析独立成行的白名单标记，并须能由 raw 片段无损重组。',
    columns,
    sectionLabels,
    parseTranscriptionSections,
    reconstructTranscriptionSections,
    deriveTitlePresentation,
    normalize,
  });
})(window);
