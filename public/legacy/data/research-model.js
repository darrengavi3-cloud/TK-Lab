(function(global){
  'use strict';

  const SCHEMA_VERSION = 7;
  const ENTITY_TYPES = Object.freeze({
    polity:'政权', office:'官职', title:'爵位', person:'人物', appointment:'任官',
    jurisdiction:'辖区', source:'史料', period:'时期', periodSnapshot:'时期快照',
    controlClaim:'控制断言', mapBoundary:'地图边界', event:'沿革事件', epigraphicRecord:'金石材料'
  });
  const CONFIDENCE = Object.freeze(['确定','推定','存疑','争议']);
  const SOURCE_LEVELS = Object.freeze(['一手史料','文档考据','二手索引','待核']);
  const HISTORY_SNAPSHOT_STATUS = Object.freeze(['通过','通过（示意）','待核','存在冲突']);
  const READING_META_FIELDS = Object.freeze([
    'evidence','sourceIds','sourceTitle','sourceDocument','sourceUrl','sourceLevel','sourceLocator','sourceExcerpt',
    'source','sources','bioSource','portraitSource','bibliography','confidence','status','researchStatus','auditStatus',
    'archiveKind','archiveScope','importBatch','sourceTenureText','verificationState','evidenceNote','footnotes'
  ]);
  const READING_META_FIELD_SET = new Set(READING_META_FIELDS);

  function clone(value){ return JSON.parse(JSON.stringify(value)); }
  function text(value){ return String(value == null ? '' : value).trim(); }
  function readingText(value){
    return text(value)
      .replace(/据(?:研究文档|整理记录)录入[；。]?/g,'')
      .replace(/存疑、未详与未上任等措辞均保留，不据此推定常设官署[；。]?/g,'')
      .replace(/研究文档同条已合并，不重复导入[；。]?/g,'')
      .replace(/待逐字拓本复核/g,'释读尚需结合拓本')
      .replace(/待确认是否转入食货志/g,'材料类型介于金石与经济简牍之间')
      .replace(/本项目/g,'')
      .replace(/履历归纳/g,'履历提要')
      .replace(/研究示意/g,'大致范围')
      .replace(/研究文档|文档考据/g,'整理记录')
      .replace(/来源文章/g,'相关整理')
      .replace(/来源型/g,'汇列')
      .replace(/研究结论/g,'说明')
      .replace(/研究状态/g,'状态')
      .replace(/录入边界/g,'范围')
      .replace(/已执行/g,'已完成')
      .replace(/史料校验|史实可信度|来源层级|史料状态|查看史料|边界可信度|史料证据卡|核心材料|资料来源|史料摘录|史料出处|数据审计|史料卡/g,'')
      .replace(/沿革年代待考/g,'沿革年代未详')
      .replace(/任期待考/g,'任期未详')
      .replace(/年代待考/g,'年代未详')
      .replace(/待补考/g,'未详')
      .replace(/待核|待补|待考/g,'未详')
      .replace(/资料置信度|置信度/g,'判断')
      .replace(/[；，、]{2,}/g,'；')
      .replace(/\s{2,}/g,' ')
      .replace(/^\s*[；，、]|[；，、]\s*$/g,'')
      .trim();
  }
  function slug(value){
    return text(value).toLowerCase().replace(/蜀汉|季汉/g,'汉').replace(/[\s·／/（）()—–-]+/g,'_').replace(/[^\w\u3400-\u9fff_]/g,'').replace(/^_+|_+$/g,'') || 'unknown';
  }
  function stableId(type, parts){ return [type].concat((parts||[]).map(slug)).join(':'); }
  function normalizePolity(value){
    const raw=text(value);
    if(raw==='东汉'||raw==='蜀汉'||raw==='季汉') return '汉';
    if(raw==='曹魏') return '魏';
    if(raw==='孙吴') return '吴';
    if(raw==='西晋'||raw==='东晋'||raw==='晋朝') return '晋';
    return raw;
  }
  function normalizeConfidence(value){
    const raw=text(value);
    if(['高','较高','确定'].includes(raw)) return '确定';
    if(['中','推定'].includes(raw)) return '推定';
    if(['低','待考','存疑'].includes(raw)) return '存疑';
    if(raw==='争议') return raw;
    return '推定';
  }
  function normalizeEvidence(source){
    const row=source||{};
    return {
      id:text(row.id)||stableId('source',[row.sourceTitle||row.title||'待核',row.sourceLocator||row.locator||'']),
      title:text(row.sourceTitle||row.title), level:SOURCE_LEVELS.includes(text(row.sourceLevel||row.level))?text(row.sourceLevel||row.level):'待核',
      locator:text(row.sourceLocator||row.locator), excerpt:text(row.sourceExcerpt||row.excerpt), url:text(row.sourceUrl||row.url),
      confidence:normalizeConfidence(row.confidence), note:text(row.evidenceNote||row.note)
    };
  }
  function normalizeSource(source){
    const row=source||{};
    return {
      id:text(row.id)||stableId('source',[row.title||row.sourceTitle||'待核',row.locator||row.sourceLocator||'']),
      title:text(row.title||row.sourceTitle), level:text(row.level||row.sourceLevel)||'待核',
      role:text(row.role||row.note), locator:text(row.locator||row.sourceLocator),
      url:text(row.url||row.sourceUrl), note:text(row.note||row.evidenceNote)
    };
  }
  function normalizeControlClaim(claim,periodId){
    const row=clone(claim||{});
    row.entityType='controlClaim';
    row.id=text(row.id)||stableId('claim',[periodId,row.subjectType,row.subject]);
    row.periodId=text(row.periodId)||text(periodId);
    row.subjectType=text(row.subjectType)||'控制关系';
    row.subject=text(row.subject)||'未命名对象';
    row.status=CONFIDENCE.includes(text(row.status))?text(row.status):normalizeConfidence(row.confidence||row.status);
    row.statement=text(row.statement||row.note);
    row.sourceIds=Array.isArray(row.sourceIds)?row.sourceIds.map(text).filter(Boolean):[];
    return row;
  }
  function normalizePeriodSnapshot(snapshot){
    const row=clone(snapshot||{});
    row.entityType='periodSnapshot';
    row.periodId=text(row.periodId||row.id)||'unknown';
    row.id=text(row.id)||stableId('period',[row.periodId]);
    row.year=Number.isFinite(Number(row.year))?Number(row.year):null;
    row.eraId=text(row.eraId);
    row.auditStatus=HISTORY_SNAPSHOT_STATUS.includes(text(row.auditStatus))?text(row.auditStatus):'待核';
    row.controlMode=text(row.controlMode)||'待核';
    row.polities=Array.isArray(row.polities)?Array.from(new Set(row.polities.map(normalizePolity).filter(Boolean))):[];
    row.administration=Object.assign({
      provinceCount:null,mappedCommanderyCount:null,referenceBenchmarks:[],geometryCoverage:'unknown',geometryConfidence:'推定',geometryBasis:''
    },row.administration||{});
    row.sourceIds=Array.isArray(row.sourceIds)?row.sourceIds.map(text).filter(Boolean):[];
    row.claims=Array.isArray(row.claims)?row.claims.map(claim=>normalizeControlClaim(claim,row.periodId)):[];
    row.caveats=Array.isArray(row.caveats)?row.caveats.map(text).filter(Boolean):[];
    return row;
  }
  function buildHistoryIndex(payload){
    const sourceMap=new Map(),periodMap=new Map(),jurisdictionMap=new Map();
    const sourceRows=payload&&Array.isArray(payload.sources)?payload.sources:[];
    sourceRows.map(normalizeSource).forEach(row=>sourceMap.set(row.id,row));
    const periodRows=payload&&Array.isArray(payload.periods)?payload.periods:[];
    periodRows.map(normalizePeriodSnapshot).forEach(row=>periodMap.set(row.periodId,row));
    const jurisdictionRows=payload&&Array.isArray(payload.jurisdictions)?payload.jurisdictions:[];
    jurisdictionRows.forEach(row=>jurisdictionMap.set(text(row.id)||stableId('jurisdiction',[row.name]),clone(row)));
    return {sources:sourceMap,periods:periodMap,jurisdictions:jurisdictionMap};
  }
  function normalizeFangzhen(record,index){
    const row=clone(record||{});
    row.id=text(row.id)||stableId('appointment',[normalizePolity(row.polity),row.commander,row.title,row.startYear||row.tenureText,index]);
    row.entityType='appointment';
    row.polity=normalizePolity(row.polity);
    row.personId=text(row.personId)||stableId('person',[row.commander]);
    row.officeId=text(row.officeId)||stableId('office',[row.polity,row.title]);
    row.jurisdictionId=text(row.jurisdictionId)||stableId('jurisdiction',[row.polity,row.jurisdiction]);
    row.evidence=normalizeEvidence(row);
    row.researchStatus=text(row.researchStatus)||normalizeConfidence(row.confidence);
    row.aliases=Array.isArray(row.aliases)?row.aliases.map(text).filter(Boolean):[];
    return row;
  }
  function normalizeEpigraphicRecord(record,index){
    const row=clone(record||{});
    row.entityType='epigraphicRecord';
    row.id=text(row.id)||stableId('epigraphic',[row.name||'待补',row.year||row.yearText||'',index]);
    row.name=text(row.name)||'未命名金石材料';
    row.type=text(row.type)||'其他';
    row.year=Number.isFinite(Number(row.year))?Number(row.year):null;
    row.yearText=text(row.yearText);
    row.polity=normalizePolity(row.polity);
    row.researchStatus=['待补','确定','推定','存疑','争议'].includes(text(row.researchStatus))?text(row.researchStatus):'待补';
    row.confidence=normalizeConfidence(row.confidence||row.researchStatus);
    row.sourceLevel=text(row.sourceLevel)||'待核';
    row.sourceTitle=text(row.sourceTitle);
    row.sourceDocument=text(row.sourceDocument||row.sourceTitle);
    row.sourceUrl=text(row.sourceUrl);
    row.sourceLocator=text(row.sourceLocator);
    row.archiveKind=['核心','扩展','争议'].includes(text(row.archiveKind))?text(row.archiveKind):'核心';
    row.disputeNote=text(row.disputeNote);
    return row;
  }
  function normalizeNode(node,factionKey,type){
    const row=clone(node||{});
    const entityType=type==='noble'?'title':(row.kind==='root'?'institution':'office');
    row.entityType=entityType;
    row.entityId=text(row.entityId)||stableId(entityType,[factionKey,row.key||row.name]);
    row.evidence=row.evidence&&typeof row.evidence==='object' ? normalizeEvidence(row.evidence) : normalizeEvidence({
      sourceTitle:row.sources,sourceLevel:row.sourceLevel,confidence:row.confidence
    });
    row.researchStatus=text(row.researchStatus)||normalizeConfidence(row.confidence);
    row.aliasList=Array.isArray(row.aliasList)?row.aliasList.map(text).filter(Boolean):text(row.aliases).split(/[、,，/]/).map(text).filter(Boolean);
    return row;
  }
  function migrate(payload,defaults){
    const source=clone(payload||{});
    const fallback=clone(defaults||{});
    const out=Object.assign({},fallback,source);
    out.schemaVersion=SCHEMA_VERSION;
    out.migratedFrom=Number(source.schemaVersion)||1;
    out.migratedAt=new Date().toISOString();
    out.trees=out.trees||fallback.trees||{};
    Object.keys(out.trees).forEach(factionKey=>{
      ['office','noble'].forEach(type=>{
        out.trees[factionKey][type]=(out.trees[factionKey][type]||[]).map(node=>normalizeNode(node,factionKey,type));
      });
    });
    out.fangzhenRecords=(out.fangzhenRecords||fallback.fangzhenRecords||[]).map(normalizeFangzhen);
    out.epigraphicRecords=(out.epigraphicRecords||fallback.epigraphicRecords||[]).map(normalizeEpigraphicRecord);
    out.researchMeta=Object.assign({modelId:'sgz-research-model-v7',historicalScope:'168—316',migrationPolicy:'preserve-and-annotate'},out.researchMeta||{});
    out.researchMeta.schemaVersion=SCHEMA_VERSION;
    return out;
  }
  function buildIndexes(payload){
    const byEntityId=new Map(), people=new Map(), offices=new Map(), jurisdictions=new Map(), sources=new Map();
    Object.entries(payload.trees||{}).forEach(([factionKey,group])=>['office','noble'].forEach(type=>(group[type]||[]).forEach(raw=>{
      const node=normalizeNode(raw,factionKey,type); byEntityId.set(node.entityId,{...node,factionKey,treeType:type});
      if(node.kind!=='root') offices.set(node.entityId,{...node,factionKey,treeType:type});
      (node.figures||[]).forEach(person=>{
        const id=text(person.personId)||stableId('person',[person.name]);
        if(!people.has(id)) people.set(id,{id,name:text(person.name),aliases:[],appointments:[]});
        people.get(id).appointments.push({source:'officeTree',factionKey,treeType:type,nodeKey:node.key,nodeName:node.name,...person});
      });
    })));
    (payload.fangzhenRecords||[]).map(normalizeFangzhen).forEach(record=>{
      if(!people.has(record.personId)) people.set(record.personId,{id:record.personId,name:text(record.commander),aliases:[],appointments:[]});
      people.get(record.personId).appointments.push({source:'fangzhen',...record});
      if(!jurisdictions.has(record.jurisdictionId)) jurisdictions.set(record.jurisdictionId,{id:record.jurisdictionId,name:text(record.jurisdiction),polity:record.polity,appointments:[]});
      jurisdictions.get(record.jurisdictionId).appointments.push(record);
      if(record.evidence.title||record.evidence.url) sources.set(record.evidence.id,record.evidence);
    });
    return {byEntityId,people,offices,jurisdictions,sources};
  }
  function recordsAtYear(records,year){
    const y=Number(year);
    return (records||[]).filter(row=>{
      const start=Number(row.startYear),end=Number(row.endYear);
      return (!Number.isFinite(start)||start<=y)&&(!Number.isFinite(end)||end>=y);
    });
  }

  function projectForReading(value){
    if(Array.isArray(value)) return value.map(projectForReading);
    if(typeof value==='string') return readingText(value);
    if(!value || typeof value!=='object') return value;
    const out={};
    Object.entries(value).forEach(([key,item])=>{
      if(READING_META_FIELD_SET.has(key)||key==='disputeNote'||key.startsWith('_')||/^source[A-Z_]/.test(key)) return;
      out[key]=projectForReading(item);
    });
    const dispute=readingText(value.disputeNote);
    if(dispute){
      const note=text(out.note);
      out.note=note ? note.replace(/[；。]+$/,'')+'；异说：'+dispute : '异说：'+dispute;
    }
    return out;
  }

  global.SGZResearchModel=Object.freeze({
    schemaVersion:SCHEMA_VERSION,entityTypes:ENTITY_TYPES,confidenceLevels:CONFIDENCE,sourceLevels:SOURCE_LEVELS,
    historySnapshotStatuses:HISTORY_SNAPSHOT_STATUS,stableId,normalizePolity,normalizeConfidence,
    normalizeEvidence,normalizeSource,normalizeControlClaim,normalizePeriodSnapshot,buildHistoryIndex,
    readingMetaFields:READING_META_FIELDS,readingText,projectForReading,
    normalizeFangzhen,normalizeEpigraphicRecord,normalizeNode,migrate,buildIndexes,recordsAtYear
  });
})(window);
