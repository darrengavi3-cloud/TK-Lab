(function(global){
  'use strict';

  const SCHEMA_VERSION = 10;
  const ENTITY_TYPES = Object.freeze({
    polity:'政权', office:'官职', title:'爵位', person:'人物', appointment:'任官',
    jurisdiction:'辖区', source:'史料', period:'时期', periodSnapshot:'时期快照',
    controlClaim:'控制断言', mapBoundary:'地图边界', event:'沿革事件', epigraphicRecord:'金石材料',
    seatPolicy:'员额规则', residence:'府署', kaifuPolicy:'开府资格', hydronym:'古水名',
    volumeCoverage:'逐卷覆盖', personSnapshot:'人物快照', peerageEvent:'封爵事件'
  });
  const CONFIDENCE = Object.freeze(['确定','推定','存疑','争议']);
  const SOURCE_LEVELS = Object.freeze(['一手史料','文档考据','二手索引','地图几何','待核']);
  const SERVICE_DOMAINS = Object.freeze(['文官','武官','文武兼','待考']);
  const INSTITUTION_TYPES = Object.freeze(['朝廷机关','丞相府','三公府','将军府','都督府','州府','郡府','县署','东宫','王府','属国机构','部族机构','待考']);
  const KAIFU_QUALIFICATIONS = Object.freeze(['法定开府','加号开府','特诏开府','事实见府属','待考']);
  const HISTORY_SNAPSHOT_STATUS = Object.freeze(['通过','通过（示意）','待核','存在冲突']);
  const EVIDENCE_STATUS = Object.freeze(['确定','推定','存疑','争议']);
  const REVIEW_STATES = Object.freeze(['未审','复核中','已核','排除']);
  const READER_VISIBILITY = Object.freeze(['可见','仅审校','排除']);
  const READING_META_FIELDS = Object.freeze([
    'rawRecord','readerSummary','evidence','sourceIds','sourceTitle','sourceDocument','sourceUrl','sourceLevel','sourceLocator','sourceExcerpt',
    'source','sources','bioSource','portraitSource','bibliography','confidence','status','researchStatus','auditStatus',
    'evidenceStatus','reviewState','uncertaintyReason','readerVisibility','archiveKind','archiveScope','importBatch','sourceTenureText','verificationState','evidenceNote','footnotes'
  ]);
  const READING_META_FIELD_SET = new Set(READING_META_FIELDS);
  const READER_INTERNAL_FIELDS = Object.freeze([
    'workbookSource','workbookSources','sourceRefs','readerVisible','readerEligibility','researchDisposition','candidateReason','rawName','officeRaw','titleRaw',
    'homonymGroupId','homonymStatus','externalSearchLog','sourceVerification','candidateDisposition','inscriptionVariants','disposition','dispositionReason',
    'sourcePersonId','sourceRecordId','sourceCitation','fieldWarnings','successionRaw','polityRaw','datasets','sourcePath','rawTitle','rawRank','titleAnnotations','rankAnnotations'
  ]);
  const READER_INTERNAL_FIELD_SET = new Set(READER_INTERNAL_FIELDS);

  function clone(value){ return JSON.parse(JSON.stringify(value)); }
  function text(value){ return String(value == null ? '' : value).trim(); }
  function readerSummaryText(value){
    return text(value)
      .replace(/据(?:研究文档|整理记录)录入[；。]?/g,'')
      .replace(/存疑、未详与未上任等措辞均保留，不据此推定常设官署[；。]?/g,'')
      .replace(/研究文档同条已合并，不重复导入[；。]?/g,'')
      .replace(/待逐字拓本复核/g,'释读尚需结合拓本')
      .replace(/待确认是否转入食货志/g,'材料类型介于金石与经济简牍之间')
      .replace(/[；，、]{2,}/g,'；')
      .replace(/\s{2,}/g,' ')
      .replace(/^\s*[；，、]|[；，、]\s*$/g,'')
      .trim();
  }
  // V55：阅读投影不得改写史料原文、证据状态或“待考”等审校词。
  // 需要精简文案时显式调用 readerSummaryText，并与 rawRecord/evidence 分栏显示。
  function readingText(value){ return text(value); }
  function titleParts(value){
    const rawTitle=text(value);
    const titleAnnotations=[];
    const leading=[];
    let displayTitle=rawTitle.replace(/^((?:【[^】]+】\s*)+)/,match=>{
      leading.push(...Array.from(match.matchAll(/【([^】]+)】/g),item=>text(item[1])));
      return '';
    });
    displayTitle=displayTitle.replace(/（([^（）]*)）|\(([^()]*)\)/g,(match,cn,ascii)=>{
      const annotation=text(cn||ascii);
      if(annotation) titleAnnotations.push(annotation);
      return '';
    }).replace(/\s{2,}/g,' ').trim();
    titleAnnotations.unshift(...leading);
    return {
      rawTitle,
      displayTitle:displayTitle||rawTitle,
      titleAnnotations:Array.from(new Set(titleAnnotations.filter(Boolean)))
    };
  }
  function displayTitleFor(value){
    if(value&&typeof value==='object'){
      return text(value.displayTitle)||titleParts(value.rawTitle||value.name||value.title||value.officeName).displayTitle;
    }
    return titleParts(value).displayTitle;
  }
  function slug(value){
    return text(value).toLowerCase().replace(/蜀汉|季汉/g,'汉').replace(/[\s·／/（）()—–-]+/g,'_').replace(/[^\w\u3400-\u9fff_]/g,'').replace(/^_+|_+$/g,'') || 'unknown';
  }
  function stableId(type, parts){ return [type].concat((parts||[]).map(slug)).join(':'); }
  function hashId(value){
    let hash=2166136261;
    const input=String(value||'');
    for(let index=0;index<input.length;index+=1){
      hash^=input.charCodeAt(index);
      hash=Math.imul(hash,16777619);
    }
    return (hash>>>0).toString(36).padStart(7,'0');
  }
  function polityCode(value){
    const input=text(value).toLowerCase();
    if(input==='shu') return 'han';
    if(['han','wei','wu','jin'].includes(input)) return input;
    const raw=normalizePolity(value);
    if(raw==='汉'||raw==='汉廷') return 'han';
    if(raw==='魏') return 'wei';
    if(raw==='吴') return 'wu';
    if(raw==='晋') return 'jin';
    return slug(raw||'unresolved');
  }
  function personIdFor(name,context){
    const displayName=text(name);
    const scope=context||{};
    const resolver=global.SGZ_PERSON_IDENTITIES&&global.SGZ_PERSON_IDENTITIES.resolve;
    let resolved=null;
    if(typeof resolver==='function'){
      resolved=resolver(displayName,scope);
      if(scope.preservePersonId!==true&&resolved&&text(resolved.personId||resolved.id)) return text(resolved.personId||resolved.id);
    }
    if(text(scope.personId)) return global.SGZ_PERSON_IDENTITIES?.canonicalPersonId?.(scope.personId)||text(scope.personId);
    if(resolved&&text(resolved.personId||resolved.id)) return text(resolved.personId||resolved.id);
    const polity=polityCode(scope.polity||scope.factionKey);
    const discriminator=text(scope.homonymDiscriminator||scope.sourcePersonKey||'default');
    return `person:${polity}:${hashId([displayName,discriminator].join('|'))}`;
  }
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
  function normalizeEvidenceStatus(value){
    const raw=text(value);
    if(EVIDENCE_STATUS.includes(raw)) return raw;
    if(['高','较高','确定'].includes(raw)) return '确定';
    if(['中','推定'].includes(raw)) return '推定';
    if(['低','待考','存疑','待核','待补'].includes(raw)) return '存疑';
    return '';
  }
  function normalizeReviewState(value){
    const raw=text(value);
    if(REVIEW_STATES.includes(raw)) return raw;
    if(['已审','已复核','通过'].includes(raw)) return '已核';
    if(['审核中','待复核','待审核','待确认'].includes(raw)) return '复核中';
    if(['排除','已排除'].includes(raw)) return '排除';
    return '未审';
  }
  function normalizeReaderVisibility(value){
    const raw=text(value);
    if(READER_VISIBILITY.includes(raw)) return raw;
    if(['visible','reader','可见'].includes(raw)) return '可见';
    if(['reviewOnly','review','仅审校'].includes(raw)) return '仅审校';
    if(['excluded','排除'].includes(raw)) return '排除';
    return '可见';
  }
  function normalizeAuditState(source){
    const row=source||{};
    const evidenceStatus=normalizeEvidenceStatus(row.evidenceStatus||row.researchStatus||row.confidence||row.status);
    const reviewState=normalizeReviewState(row.reviewState||row.reviewStatus||row.auditStatus||row.verificationState);
    const readerVisibility=normalizeReaderVisibility(row.readerVisibility||row.visibilityStatus);
    return {
      evidenceStatus,
      reviewState:readerVisibility==='排除'?'排除':reviewState,
      uncertaintyReason:text(row.uncertaintyReason||row.reviewReason||row.disputeNote||''),
      readerVisibility
    };
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
    row.year=row.year!==null&&row.year!==''&&row.year!==undefined&&Number.isFinite(Number(row.year))?Number(row.year):null;
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
    const titleMeta=titleParts(row.rawTitle||row.title);
    Object.assign(row,titleMeta);
    row.title=titleMeta.displayTitle;
    row.personId=personIdFor(row.commander,{personId:row.personId,polity:row.polity,homonymDiscriminator:row.homonymDiscriminator});
    row.officeId=text(row.officeId)||stableId('office',[row.polity,row.title]);
    row.jurisdictionId=text(row.jurisdictionId)||stableId('jurisdiction',[row.polity,row.jurisdiction]);
    row.administrativeUnitId=text(row.administrativeUnitId||row.unitId)||row.jurisdictionId;
    row.administrativeUnitName=text(row.administrativeUnitName||row.jurisdiction);
    row.unitId=row.administrativeUnitId;
    row.startYear=row.startYear!==null&&row.startYear!==''&&row.startYear!==undefined&&Number.isFinite(Number(row.startYear))?Number(row.startYear):null;
    row.endYear=row.endYear!==null&&row.endYear!==''&&row.endYear!==undefined&&Number.isFinite(Number(row.endYear))?Number(row.endYear):null;
    row.seatName=text(row.seatName||row.seat);
    row.rawRecord=clone(row.rawRecord||{
      commander:text(row.commander),title:text(row.title),jurisdiction:text(row.jurisdiction),seat:text(row.seat),
      tenureText:text(row.sourceTenureText||row.tenureText),note:text(row.note)
    });
    row.readerSummary=text(row.readerSummary)||readerSummaryText(row.note||row.sourceTenureText||row.tenureText);
    row.seatHistory=Array.isArray(row.seatHistory)?row.seatHistory.map(item=>clone(item)):(text(row.seat)?[{
      seat:text(row.seat),validFrom:Number.isFinite(Number(row.startYear))?Number(row.startYear):null,
      validTo:Number.isFinite(Number(row.endYear))?Number(row.endYear):null,status:text(row.seatStatus)||'随本条职任记录',sourceTitle:text(row.sourceTitle)
    }]:[]);
    row.evidence=normalizeEvidence(row);
    row.researchStatus=text(row.researchStatus)||normalizeConfidence(row.confidence);
    Object.assign(row,normalizeAuditState(row));
    row.aliases=Array.isArray(row.aliases)?row.aliases.map(text).filter(Boolean):[];
    return row;
  }
  function normalizeSeatPolicy(record,index){
    const row=clone(record||{});
    row.entityType='seatPolicy';
    row.id=text(row.id)||stableId('seatPolicy',[row.officeId,row.validFrom,row.validTo,index]);
    row.officeId=text(row.officeId);
    row.validFrom=Number.isFinite(Number(row.validFrom))?Number(row.validFrom):null;
    row.validTo=Number.isFinite(Number(row.validTo))?Number(row.validTo):null;
    row.authorizedCount=Number.isFinite(Number(row.authorizedCount))?Number(row.authorizedCount):null;
    row.displayCapacity=Number.isFinite(Number(row.displayCapacity))?Number(row.displayCapacity):row.authorizedCount;
    row.rule=text(row.rule); row.note=text(row.note); row.sourceId=text(row.sourceId);
    row.ownerOfficeName=text(row.ownerOfficeName); row.officeName=text(row.officeName);
    row.sourceText=text(row.sourceText); row.countStatus=text(row.countStatus)||'待考';
    row.evidence=row.evidence&&typeof row.evidence==='object'?normalizeEvidence(row.evidence):normalizeEvidence(row);
    return row;
  }
  function normalizeResidence(record,index){
    const row=clone(record||{});
    row.entityType='residence';
    row.id=text(row.id)||stableId('residence',[row.ownerOfficeId,row.name,index]);
    row.ownerOfficeId=text(row.ownerOfficeId); row.ownerOfficeName=text(row.ownerOfficeName); row.polity=normalizePolity(row.polity);
    row.ownerPersonId=text(row.ownerPersonId); row.ownerPersonName=text(row.ownerPersonName); row.ownerAppointmentId=text(row.ownerAppointmentId);
    row.kaifuPolicyId=text(row.kaifuPolicyId); row.name=text(row.name)||'未命名府署';
    row.residenceType=text(row.residenceType)||'未详'; row.backgroundStyle=text(row.backgroundStyle)||'plain';
    row.validFrom=Number.isFinite(Number(row.validFrom))?Number(row.validFrom):null;
    row.validTo=Number.isFinite(Number(row.validTo))?Number(row.validTo):null;
    row.roles=Array.isArray(row.roles)?row.roles.map((role,roleIndex)=>normalizeResidenceRole(role,roleIndex,row)):[];
    row.evidence=row.evidence&&typeof row.evidence==='object'?normalizeEvidence(row.evidence):normalizeEvidence(row);
    row.researchStatus=text(row.researchStatus)||normalizeConfidence(row.confidence);
    Object.assign(row,normalizeAuditState(row));
    row.note=text(row.note); return row;
  }
  function normalizeResidenceRole(record,index,residence){
    const row=clone(record||{});
    row.id=text(row.id)||stableId('residenceRole',[residence&&residence.id,row.officeName||row.name,index]);
    row.officeId=text(row.officeId); row.officeName=text(row.officeName||row.name)||'未详属官';
    row.serviceDomain=SERVICE_DOMAINS.includes(text(row.serviceDomain))?text(row.serviceDomain):inferServiceDomain(row);
    row.institutionType=INSTITUTION_TYPES.includes(text(row.institutionType))?text(row.institutionType):text(residence&&residence.residenceType)||'待考';
    row.authorizedCount=Number.isFinite(Number(row.authorizedCount))?Number(row.authorizedCount):null;
    row.displayCapacity=Number.isFinite(Number(row.displayCapacity))?Number(row.displayCapacity):row.authorizedCount;
    row.sourceText=text(row.sourceText); row.countStatus=text(row.countStatus)||'待考'; row.note=text(row.note);
    return row;
  }
  function normalizeKaifuPolicy(record,index){
    const row=clone(record||{});
    row.entityType='kaifuPolicy';
    row.id=text(row.id)||stableId('kaifuPolicy',[row.polity,row.officeName,row.validFrom,row.personId,index]);
    row.polity=normalizePolity(row.polity); row.officeId=text(row.officeId); row.officeName=text(row.officeName);
    row.personId=text(row.personId); row.personName=text(row.personName); row.appointmentId=text(row.appointmentId);
    row.qualificationType=KAIFU_QUALIFICATIONS.includes(text(row.qualificationType))?text(row.qualificationType):'待考';
    row.additionalTitle=text(row.additionalTitle); row.validFrom=Number.isFinite(Number(row.validFrom))?Number(row.validFrom):null;
    row.validTo=Number.isFinite(Number(row.validTo))?Number(row.validTo):null;
    row.sourceTenureText=text(row.sourceTenureText); row.evidence=normalizeEvidence(row.evidence||row);
    row.researchStatus=text(row.researchStatus)||normalizeConfidence(row.confidence||row.status);
    Object.assign(row,normalizeAuditState(row));
    row.note=text(row.note); return row;
  }
  function normalizeHydronym(record,index){
    const row=clone(record||{});
    row.entityType='hydronym'; row.ancientName=text(row.ancientName||row.name)||'未命名水体';
    row.id=text(row.id)||stableId('hydronym',[row.ancientName,index]);
    row.aliases=Array.isArray(row.aliases)?row.aliases.map(text).filter(Boolean):[];
    row.geometryRefs=Array.isArray(row.geometryRefs)?row.geometryRefs.map(text).filter(Boolean):[];
    row.sourceIds=Array.isArray(row.sourceIds)?row.sourceIds.map(text).filter(Boolean):[];
    row.sourceLocators=Array.isArray(row.sourceLocators)?row.sourceLocators.map(text).filter(Boolean):[];
    row.labelAnchor=Array.isArray(row.labelAnchor)&&row.labelAnchor.length===2?row.labelAnchor.map(Number):null;
    row.priority=Number.isFinite(Number(row.priority))?Number(row.priority):0;
    row.minZoom=Number.isFinite(Number(row.minZoom))?Number(row.minZoom):7;
    row.researchStatus=text(row.researchStatus)||normalizeConfidence(row.confidence||row.status);
    row.geometrySource=clone(row.geometrySource||{}); row.evidence=clone(row.evidence||{}); row.note=text(row.note);
    return row;
  }
  function normalizePerson(record,index){
    const row=clone(record||{}); row.entityType='person'; row.name=text(row.name)||'未详人物';
    row.personId=personIdFor(row.name,{...row,personId:row.personId}); row.id=row.personId;
    row.aliases=Array.isArray(row.aliases)?Array.from(new Set(row.aliases.map(text).filter(Boolean))):[];
    row.sourceIds=Array.isArray(row.sourceIds)?row.sourceIds.map(text).filter(Boolean):[];
    row.researchStatus=text(row.researchStatus)||normalizeConfidence(row.confidence||row.status);
    Object.assign(row,normalizeAuditState(row));
    row.homonymStatus=text(row.homonymStatus)||'已按稳定 ID 区分';
    row.sourceIndex=Number.isFinite(Number(row.sourceIndex))?Number(row.sourceIndex):index;
    return row;
  }
  function normalizeAppointment(record,index){
    const row=clone(record||{}); row.entityType='appointment';
    row.polity=normalizePolity(row.polity); row.personId=personIdFor(row.person||row.name,{...row,personId:row.personId});
    row.officeId=text(row.officeId)||stableId('office',[row.polity,row.officeName||row.title]);
    row.id=text(row.id)||stableId('appointment',[row.personId,row.officeId,row.jurisdictionId,row.startYear,row.sourceLocator,index]);
    row.officeName=text(row.officeName||row.title);
    const officeTitleMeta=titleParts(row.rawTitle||row.officeName);
    Object.assign(row,officeTitleMeta);
    row.officeName=officeTitleMeta.displayTitle;
    row.jurisdictionId=text(row.jurisdictionId); row.jurisdiction=text(row.jurisdiction);
    row.startYear=Number.isFinite(Number(row.startYear))?Number(row.startYear):null;
    row.endYear=Number.isFinite(Number(row.endYear))?Number(row.endYear):null;
    row.sourceTenureText=text(row.sourceTenureText); row.evidence=normalizeEvidence(row.evidence||row);
    row.researchStatus=text(row.researchStatus)||normalizeConfidence(row.confidence||row.status);
    Object.assign(row,normalizeAuditState(row));
    return row;
  }
  function normalizePersonSnapshot(record,index){
    const row=clone(record||{}); row.entityType='personSnapshot';
    row.snapshotId=text(row.snapshotId||row.id)||stableId('snapshot260',[row.personId,row.year,index]); row.id=row.snapshotId;
    row.personId=text(row.personId)?personIdFor(row.name,{...row,personId:row.personId}):''; row.name=text(row.name)||'未详人物';
    row.year=Number.isFinite(Number(row.year))?Number(row.year):260;
    row.polity=normalizePolity(row.polity); row.zi=text(row.zi); row.birthplace=text(row.birthplace); row.residence=text(row.residence);
    row.office=text(row.office); row.family=text(row.family); row.readerVisible=row.readerVisible!==false;
    return row;
  }
  function normalizePeerageEvent(record,index){
    const row=clone(record||{}); row.entityType='peerageEvent';
    row.eventId=text(row.eventId||row.id)||stableId('peerage',[row.sourceRecordId,row.rawRecipient,row.grantDate,index]); row.id=row.eventId;
    row.recipientPersonIds=Array.isArray(row.recipientPersonIds)?Array.from(new Set(row.recipientPersonIds.map(text).filter(Boolean))):[];
    row.year=Number.isFinite(Number(row.year))?Number(row.year):null;
    ['rawRecipient','grantDate','officeAtGrant','reason','rank','title','fiefHouseholds','fief','titleEvolution','succession','category','sourceCitation'].forEach(key=>{ row[key]=text(row[key]); });
    const titleMeta=titleParts(row.title);
    row.rawTitle=titleMeta.rawTitle;
    row.displayTitle=titleMeta.displayTitle;
    row.titleAnnotations=titleMeta.titleAnnotations;
    const rankMeta=titleParts(row.rank);
    row.rawRank=rankMeta.rawTitle;
    row.displayRank=rankMeta.displayTitle;
    row.rankAnnotations=rankMeta.titleAnnotations;
    row.readerVisible=row.readerVisible!==false;
    return row;
  }
  function normalizeEpigraphicRecord(record,index){
    const row=clone(record||{});
    row.entityType='epigraphicRecord';
    row.id=text(row.id)||stableId('epigraphic',[row.name||'待补',row.year||row.yearText||'',index]);
    row.name=text(row.name)||'未命名金石材料';
    row.type=text(row.type)||'其他';
    row.year=row.year!==null&&row.year!==''&&row.year!==undefined&&Number.isFinite(Number(row.year))?Number(row.year):null;
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
    row.rawRecord=clone(row.rawRecord||{
      title:text(row.rawTitle||row.title||row.name),dateText:text(row.rawDateText||row.yearText),
      findspot:text(row.rawFindspot||row.findspot||row.place),sourceLocator:row.sourceLocator
    });
    row.readerSummary=text(row.readerSummary)||readerSummaryText(row.note||row.inscriptionStatus||row.disputeNote);
    row.evidence=row.evidence&&typeof row.evidence==='object'?normalizeEvidence(row.evidence):normalizeEvidence(row);
    Object.assign(row,normalizeAuditState(row));
    return row;
  }
  function inferServiceDomain(row){
    const category=text(row&&row.category),name=text(row&&row.name||row&&row.officeName);
    if(['大将军／大司马','将军武职','都督军事','属国护官'].includes(category)) return '武官';
    if(category==='幕府属官'){
      if(/长史|主簿|记室|舍人|掾|曹|祭酒|从事/.test(name)) return '文官';
      if(/司马|参军|军师|督/.test(name)) return '文武兼';
      return '待考';
    }
    if(category==='州郡属官'&&/督军|兵曹/.test(name)) return '文武兼';
    if(category==='部族首领') return '文武兼';
    if(category) return '文官';
    return '待考';
  }
  function inferInstitutionType(row,parent){
    const category=text(row&&row.category),name=text(row&&row.name),parentCategory=text(parent&&parent.category),parentName=text(parent&&parent.name);
    if(category==='太子官属'||/太子/.test(parentName)) return '东宫';
    if(['诸王官属','王国官属'].includes(category)||/王府|王国/.test(parentName)) return '王府';
    if(category==='州郡属官'){
      if(parentCategory==='郡国守相'||/^郡|郡丞|督邮|五官掾/.test(name)) return '郡府';
      return '州府';
    }
    if(category==='州牧刺史') return '州府';
    if(category==='郡国守相') return '郡府';
    if(category==='县邑令长') return '县署';
    if(category==='部族首领') return '部族机构';
    if(category==='属国护官') return '属国机构';
    if(category==='幕府属官'){
      if(parentCategory==='丞相／相国'||/丞相|相国/.test(parentName)) return '丞相府';
      if(parentCategory==='三公'||/太傅|太保|太尉|司徒|司空|太宰/.test(parentName)) return '三公府';
      if(parentCategory==='都督军事'||/都督/.test(parentName)) return '都督府';
      if(parentCategory==='州牧刺史') return '州府';
      if(parentCategory==='郡国守相') return '郡府';
      return '将军府';
    }
    return '朝廷机关';
  }
  function normalizeNode(node,factionKey,type){
    const row=clone(node||{});
    const entityType=type==='noble'?'title':(row.kind==='root'?'institution':'office');
    row.entityType=entityType;
    const titleMeta=titleParts(row.rawTitle||row.name);
    Object.assign(row,titleMeta);
    row.name=titleMeta.displayTitle;
    row.entityId=text(row.entityId)||stableId(entityType,[factionKey,row.key||row.name]);
    row.evidence=row.evidence&&typeof row.evidence==='object' ? normalizeEvidence(row.evidence) : normalizeEvidence({
      sourceTitle:row.sources,sourceLevel:row.sourceLevel,confidence:row.confidence
    });
    row.researchStatus=text(row.researchStatus)||normalizeConfidence(row.confidence);
    row.aliasList=Array.isArray(row.aliasList)?row.aliasList.map(text).filter(Boolean):text(row.aliases).split(/[、,，/]/).map(text).filter(Boolean);
    row.serviceDomain=SERVICE_DOMAINS.includes(text(row.serviceDomain))?text(row.serviceDomain):inferServiceDomain(row);
    row.institutionType=INSTITUTION_TYPES.includes(text(row.institutionType))?text(row.institutionType):'';
    row.figures=Array.isArray(row.figures)?row.figures.map((figure,index)=>{
      const person=typeof figure==='string'?{name:figure}:clone(figure||{});
      person.name=text(person.name)||'未详人物';
      person.personId=personIdFor(person.name,{personId:person.personId,polity:factionKey,factionKey,homonymDiscriminator:person.homonymDiscriminator});
      person.appointmentId=text(person.appointmentId)||stableId('appointment',[person.personId,row.entityId,person.startYear,person.endYear,index]);
      return person;
    }):[];
    return row;
  }
  function normalizeOfficeClassifications(nodes){
    const rows=nodes||[],byKey=new Map(rows.map(row=>[row.key,row]));
    rows.forEach(row=>{
      if(row.kind!=='office') return;
      const parent=byKey.get(row.parent);
      if(!INSTITUTION_TYPES.includes(text(row.institutionType))) row.institutionType=inferInstitutionType(row,parent);
      if(!SERVICE_DOMAINS.includes(text(row.serviceDomain))) row.serviceDomain=inferServiceDomain(row);
    });
    return rows;
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
        out.trees[factionKey][type]=normalizeOfficeClassifications((out.trees[factionKey][type]||[]).map(node=>normalizeNode(node,factionKey,type)));
      });
    });
    out.fangzhenRecords=(out.fangzhenRecords||fallback.fangzhenRecords||[]).map(normalizeFangzhen);
    out.epigraphicRecords=(out.epigraphicRecords||fallback.epigraphicRecords||[]).map(normalizeEpigraphicRecord);
    out.seatPolicies=(out.seatPolicies||fallback.seatPolicies||[]).map(normalizeSeatPolicy);
    out.residences=(out.residences||fallback.residences||[]).map(normalizeResidence);
    out.kaifuPolicies=(out.kaifuPolicies||fallback.kaifuPolicies||[]).map(normalizeKaifuPolicy);
    out.hydronyms=(out.hydronyms||fallback.hydronyms||[]).map(normalizeHydronym);
    out.personRecords=(out.personRecords||fallback.personRecords||[]).map(normalizePerson);
    out.appointments=(out.appointments||fallback.appointments||[]).map(normalizeAppointment);
    out.personSnapshots=(out.personSnapshots||fallback.personSnapshots||[]).map(normalizePersonSnapshot);
    out.peerageEvents=(out.peerageEvents||fallback.peerageEvents||[]).map(normalizePeerageEvent);
    out.volumeCoverage=clone(out.volumeCoverage||fallback.volumeCoverage||[]);
    out.researchMeta=Object.assign({modelId:'sgz-research-model-v10',historicalScope:'168—316',migrationPolicy:'preserve-and-annotate',compatibleFrom:[7,8,9]},out.researchMeta||{});
    out.researchMeta.schemaVersion=SCHEMA_VERSION;
    return out;
  }
  function buildIndexes(payload){
    const byEntityId=new Map(), people=new Map(), offices=new Map(), jurisdictions=new Map(), sources=new Map();
    (payload.personRecords||[]).map(normalizePerson).forEach(person=>people.set(person.personId,{...person,id:person.personId,appointments:[]}));
    Object.entries(payload.trees||{}).forEach(([factionKey,group])=>['office','noble'].forEach(type=>(group[type]||[]).forEach(raw=>{
      const node=normalizeNode(raw,factionKey,type); byEntityId.set(node.entityId,{...node,factionKey,treeType:type});
      if(node.kind!=='root') offices.set(node.entityId,{...node,factionKey,treeType:type});
      (node.figures||[]).forEach(person=>{
        const id=personIdFor(person.name,{personId:person.personId,polity:factionKey,factionKey});
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
    (payload.appointments||[]).map(normalizeAppointment).forEach(record=>{
      if(!people.has(record.personId)) people.set(record.personId,{id:record.personId,personId:record.personId,name:text(record.person||record.name)||'未详人物',aliases:[],appointments:[]});
      people.get(record.personId).appointments.push({source:'appointment',...record});
      if(record.evidence.title||record.evidence.url) sources.set(record.evidence.id,record.evidence);
    });
    (payload.personSnapshots||[]).map(normalizePersonSnapshot).filter(record=>record.personId).forEach(record=>{
      if(!people.has(record.personId)) people.set(record.personId,{id:record.personId,personId:record.personId,name:record.name,aliases:[],appointments:[],snapshots:[],peerageEvents:[]});
      if(!people.get(record.personId).snapshots) people.get(record.personId).snapshots=[];
      people.get(record.personId).snapshots.push(record);
    });
    (payload.peerageEvents||[]).map(normalizePeerageEvent).forEach(record=>record.recipientPersonIds.forEach(personId=>{
      if(!people.has(personId)) people.set(personId,{id:personId,personId,name:'未详人物',aliases:[],appointments:[],snapshots:[],peerageEvents:[]});
      if(!people.get(personId).peerageEvents) people.get(personId).peerageEvents=[];
      people.get(personId).peerageEvents.push(record);
    }));
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
      if(key.startsWith('_')) return;
      out[key]=projectForReading(item);
    });
    const auditState=normalizeAuditState(value);
    out.evidenceStatus=out.evidenceStatus||auditState.evidenceStatus;
    out.reviewState=out.reviewState||auditState.reviewState;
    out.uncertaintyReason=out.uncertaintyReason||auditState.uncertaintyReason;
    out.readerVisibility=out.readerVisibility||auditState.readerVisibility;
    if(!text(out.readerSummary)) out.readerSummary=readerSummaryText(value.readerSummary||value.summary||value.note||value.detail);
    return out;
  }

  // V60：读者投影只保留可阅读的事实字段；出处、审校和导入候选字段仍留在原始数据及审校模式。
  function projectForReader(value){
    if(Array.isArray(value)) return value.map(projectForReader);
    if(typeof value==='string') return readingText(value);
    if(!value || typeof value!=='object') return value;
    const out={};
    Object.entries(value).forEach(([key,item])=>{
      if(key.startsWith('_') || READING_META_FIELD_SET.has(key) || READER_INTERNAL_FIELD_SET.has(key)) return;
      out[key]=projectForReader(item);
    });
    return out;
  }

  global.SGZResearchModel=Object.freeze({
    schemaVersion:SCHEMA_VERSION,entityTypes:ENTITY_TYPES,confidenceLevels:CONFIDENCE,sourceLevels:SOURCE_LEVELS,
    serviceDomains:SERVICE_DOMAINS,institutionTypes:INSTITUTION_TYPES,kaifuQualifications:KAIFU_QUALIFICATIONS,
    historySnapshotStatuses:HISTORY_SNAPSHOT_STATUS,evidenceStatuses:EVIDENCE_STATUS,reviewStates:REVIEW_STATES,readerVisibilities:READER_VISIBILITY,stableId,normalizePolity,normalizeConfidence,normalizeEvidenceStatus,normalizeReviewState,normalizeReaderVisibility,normalizeAuditState,
    personIdFor,hashId,
    normalizeEvidence,normalizeSource,normalizeControlClaim,normalizePeriodSnapshot,buildHistoryIndex,
    readingMetaFields:READING_META_FIELDS,readerInternalFields:READER_INTERNAL_FIELDS,readingText,readerSummaryText,titleParts,displayTitleFor,projectForReading,projectForReader,
    normalizeFangzhen,normalizeSeatPolicy,normalizeResidence,normalizeResidenceRole,normalizeKaifuPolicy,normalizeHydronym,
    normalizePerson,normalizeAppointment,normalizePersonSnapshot,normalizePeerageEvent,normalizeEpigraphicRecord,normalizeNode,normalizeOfficeClassifications,
    inferServiceDomain,inferInstitutionType,migrate,buildIndexes,recordsAtYear
  });
})(window);
