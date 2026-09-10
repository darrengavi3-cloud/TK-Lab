/* 史源表：把已发布条目按典籍卷次倒排。
 *
 * 本模块不产生任何新的史学判断，只做两件机械的事：
 *   一、把各模块已有的引文串解析成「书名 + 卷次 + 篇名／证据层」；
 *   二、按卷聚合，给出每卷支撑了本库哪些条目。
 *
 * 凡不能确切解析出卷次的引文，一律进入「未归卷」并保留原串，不作猜测——
 * 把条目挂到错误的卷上，比不挂更糟。
 */
(function(global){
  'use strict';

  const CN_DIGITS = { 零:0, 〇:0, 一:1, 二:2, 三:3, 四:4, 五:5, 六:6, 七:7, 八:8, 九:9, 壹:1, 贰:2, 叁:3, 肆:4, 伍:5, 陆:6, 柒:7, 捌:8, 玖:9 };

  /* 只覆盖正史卷次的实际范围（个位到三位），不做通用中文数字解析。 */
  function chineseNumeral(text){
    const raw = String(text || '').trim();
    if(!raw) return null;
    if(/^\d+$/.test(raw)) return Number(raw);
    if(!/^[零〇一二三四五六七八九十百壹贰叁肆伍陆柒捌玖]+$/.test(raw)) return null;
    let total = 0;
    let section = 0;
    let seen = false;
    for(const character of raw){
      if(character === '百'){
        section = (section || 1) * 100;
        total += section;
        section = 0;
        seen = true;
        continue;
      }
      if(character === '十'){
        section = (section || 1) * 10;
        total += section;
        section = 0;
        seen = true;
        continue;
      }
      const digit = CN_DIGITS[character];
      if(digit === undefined) return null;
      section = digit;
      seen = true;
    }
    total += section;
    return seen && total > 0 ? total : null;
  }

  const WORK = /《([^》]{1,20})》/;
  const VOLUME = /卷\s*([0-9]{1,3}|[零〇一二三四五六七八九十百壹贰叁肆伍陆柒捌玖]{1,6})/;

  /* 部分引文把裴注所引之书并进书名，写作《三國志 裴注引英雄記》。这是既有引文
     的写法，不改数据；解析时按其字面拆开：本书归卷，引书记作 citedWork。 */
  const EMBEDDED_PEI = /^(.+?)\s*裴注引\s*(.+)$/;

  /* 同一部书在库中并存简繁两种字面（三国志／三國志、晋书／晉書……）。归卷时按
     同一部书合并，否则一部正史会被劈成两半；这是字形归并，不是版本判断。
     只列库中实际出现的书名，不做通用简繁转换。 */
  const WORK_ALIASES = {
    三國志: '三国志', 晉書: '晋书', 後漢書: '后汉书',
    全三國文: '全三国文', 全晉文: '全晋文', 隸續: '隶续', 隸釋: '隶释',
    資治通鑑: '资治通鉴', 水經注: '水经注', 通典: '通典'
  };

  /* 证据层只认引文自己写明的字样，写不明就留空，绝不从篇名推断。 */
  function evidenceLayerOf(tail){
    const text = String(tail || '');
    if(!text) return '';
    if(/裴松之注|裴注/.test(text)) return '裴注';
    if(/^正文$/.test(text.trim())) return '正文';
    return '';
  }

  function normalizeWork(name){
    return String(name || '')
      .replace(/^[（(【\[]+|[）)】\]]+$/g, '')
      .trim();
  }

  /* 解析一条引文串。返回 { hits: [...], unparsed: [...] }。
     一串可含多卷（以「；」分隔），后段可省略书名，沿用前段。 */
  function parseCitation(raw){
    const text = String(raw || '').trim();
    const result = { hits: [], unparsed: [] };
    if(!text) return result;
    const segments = text.split(/[；;]+/).map(part => part.trim()).filter(Boolean);
    let currentWork = '';
    let currentCitedWork = '';
    for(const segment of segments){
      const volumeMatch = VOLUME.exec(segment);
      const volume = volumeMatch ? chineseNumeral(volumeMatch[1]) : null;
      /* 只有出现在「卷」之前的《…》才是书名；卷次之后的《…》是篇名，
         例如「卷一《武帝纪》」——把它当书名会凭空造出一部书。 */
      const head = volumeMatch ? segment.slice(0, volumeMatch.index) : segment;
      const workMatch = WORK.exec(head);
      if(workMatch){
        let name = normalizeWork(workMatch[1]);
        const embedded = EMBEDDED_PEI.exec(name);
        if(embedded){
          name = normalizeWork(embedded[1]);
          currentCitedWork = normalizeWork(embedded[2]);
        }else{
          currentCitedWork = '';
        }
        currentWork = WORK_ALIASES[name] || name;
      }
      if(!currentWork || volume === null){
        result.unparsed.push(segment);
        continue;
      }
      const tail = segment.slice(volumeMatch.index + volumeMatch[0].length).replace(/^[·・:：、,，\s]+/, '').trim();
      result.hits.push({
        work: currentWork,
        volume,
        volumeId: `${currentWork}#${volume}`,
        detail: tail,
        citedWork: currentCitedWork,
        evidenceLayer: currentCitedWork ? '裴注' : evidenceLayerOf(tail),
        citation: segment
      });
    }
    return result;
  }

  const KIND_LABELS = { appointment: '任官', battle: '战事', shihuo: '食货', epigraphy: '金石', fangzhen: '州镇' };

  /* 把 { kind, id, title, meta, citations[] } 的条目列表倒排成卷次视图。 */
  function buildSourceVolumes(entries){
    const volumes = new Map();
    const unattributed = [];
    let citationCount = 0;
    let resolvedCitations = 0;
    for(const entry of entries || []){
      const texts = (entry.citations || []).filter(Boolean);
      if(!texts.length){
        unattributed.push({ ...entry, reason: '条目未附引文' });
        continue;
      }
      let matched = false;
      const leftovers = [];
      for(const text of texts){
        citationCount += 1;
        const parsed = parseCitation(text);
        if(parsed.hits.length) resolvedCitations += 1;
        for(const hit of parsed.hits){
          matched = true;
          if(!volumes.has(hit.volumeId)){
            volumes.set(hit.volumeId, {
              id: hit.volumeId,
              work: hit.work,
              volume: hit.volume,
              label: `${hit.work} 卷${hit.volume}`,
              entries: [],
              kinds: {},
              layers: {}
            });
          }
          const bucket = volumes.get(hit.volumeId);
          bucket.entries.push({
            kind: entry.kind,
            kindLabel: KIND_LABELS[entry.kind] || entry.kind,
            id: entry.id,
            title: entry.title,
            meta: entry.meta || '',
            detail: hit.detail,
            citedWork: hit.citedWork || '',
            evidenceLayer: hit.evidenceLayer,
            citation: hit.citation
          });
          bucket.kinds[entry.kind] = (bucket.kinds[entry.kind] || 0) + 1;
          const layerKey = hit.evidenceLayer || '未标注';
          bucket.layers[layerKey] = (bucket.layers[layerKey] || 0) + 1;
        }
        if(!parsed.hits.length) leftovers.push(text);
      }
      if(!matched){
        unattributed.push({ ...entry, reason: '引文未写明卷次', citationTexts: leftovers });
      }
    }
    const works = new Map();
    for(const bucket of volumes.values()){
      bucket.entryCount = bucket.entries.length;
      if(!works.has(bucket.work)) works.set(bucket.work, { work: bucket.work, volumes: 0, entries: 0 });
      const workRow = works.get(bucket.work);
      workRow.volumes += 1;
      workRow.entries += bucket.entryCount;
    }
    const volumeList = [...volumes.values()].sort((a, b) => (a.work === b.work ? a.volume - b.volume : a.work.localeCompare(b.work, 'zh-Hans-CN')));
    return {
      works: [...works.values()].sort((a, b) => b.entries - a.entries || a.work.localeCompare(b.work, 'zh-Hans-CN')),
      volumes: volumeList,
      unattributed,
      summary: {
        volumes: volumeList.length,
        entries: volumeList.reduce((total, bucket) => total + bucket.entryCount, 0),
        citations: citationCount,
        resolvedCitations,
        unattributed: unattributed.length
      }
    };
  }

  function selectSourceVolumes(volumes, { work = 'all', kind = 'all', query = '' } = {}) {
    const normalize = value => String(value || '').normalize('NFKC').toLowerCase().trim();
    const keyword = normalize(query);
    return (volumes || []).flatMap(volume => {
      if (work !== 'all' && volume.work !== work) return [];
      const volumeMatches = !keyword || normalize(volume.label).includes(keyword);
      const entries = volume.entries.filter(entry => (kind === 'all' || entry.kind === kind)
        && (volumeMatches || normalize(entry.title).includes(keyword) || normalize(entry.detail).includes(keyword)));
      if (!entries.length) return [];
      const kinds = {}, layers = {};
      for (const entry of entries) {
        kinds[entry.kind] = (kinds[entry.kind] || 0) + 1;
        const layer = entry.evidenceLayer || '未标注';
        layers[layer] = (layers[layer] || 0) + 1;
      }
      return [{ ...volume, entries, entryCount: entries.length, kinds, layers }];
    });
  }

  function paginateSourceVolumes(volumes, requestedPage) {
    const pageSize = 12, total = volumes.length, pages = Math.max(1, Math.ceil(total / pageSize));
    const number = Number(requestedPage);
    const page = Math.min(pages, Math.max(1, Number.isFinite(number) ? Math.floor(number) : 1));
    return { page, pages, total, rows: volumes.slice((page - 1) * pageSize, page * pageSize) };
  }

  function sourceEntryRoute(entry, appointments = []) {
    const params = new URLSearchParams();
    if (entry.kind === 'appointment') {
      const fact = appointments.find(row => row.appointmentId === entry.id);
      if (!fact?.personId) return '';
      params.set('person', fact.personId);
      return '#people?' + params;
    }
    const module = { battle: 'battle', shihuo: 'shihuo', epigraphy: 'jinshi' }[entry.kind];
    if (!module || !entry.id) return '';
    params.set('id', entry.id);
    if (module === 'shihuo') { params.set('scope', 'all'); params.set('discussion', '1'); }
    return '#' + module + '?' + params;
  }

  global.SGZ_UI_MODULES = global.SGZ_UI_MODULES || {};
  global.SGZ_UI_MODULES.shiyuan = { chineseNumeral, parseCitation, buildSourceVolumes, selectSourceVolumes, paginateSourceVolumes, sourceEntryRoute, KIND_LABELS };
})(typeof window !== 'undefined' ? window : globalThis);
