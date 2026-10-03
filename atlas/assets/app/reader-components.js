(function (global) {
  'use strict';
  global.SGZ_READER_COMPONENTS = Object.freeze({
    SgzPagination: {
      props: { page: Number, pageCount: Number, label: String },
      emits: ['page-delta'],
      template: `<nav class="sgz-pagination" :aria-label="label"><button type="button" :disabled="page<=1" @click="$emit('page-delta',-1)">上一页</button><span><slot /></span><button type="button" :disabled="page>=pageCount" @click="$emit('page-delta',1)">下一页</button></nav>`
    },
    ShihuoReadingDetail: {
      props: ['record'],
      template: `<article class="v83-food-detail">
        <header><p>{{record.polity}} · {{record.yearText||record.year||'年代未详'}}</p><h2>{{record.title}}</h2><span>{{record.category}}</span></header>
        <p class="v83-food-text">{{record.detail}}</p>
        <p v-if="record.readingClass==='discussion'" class="reader-quiet-note">本条为推算或有争议的记述，不作为确定数量。</p>
        <details v-if="record.discussion" class="v83-discussion"><summary>推算与讨论</summary><p>{{record.discussion}}</p></details>
        <section class="v83-food-source"><h3>出处</h3><p>{{record.sourceTitle||'出处尚待补充'}}</p><reader-citations :citations="record.citations||[]"/></section>
      </article>`
    },
    ReaderPortrait: {
      props: { src: String, alt: String, detail: Boolean },
      data() { return { failedVariant: false }; },
      watch: { src() { this.failedVariant = false; } },
      computed: {
        srcset() { return this.failedVariant ? undefined : global.SGZ_PORTRAIT_VARIANTS?.bySrc?.[this.src]?.srcset; },
        sizes() { return this.detail ? '(max-width: 760px) 80px, 100px' : '48px'; }
      },
      template: `<img :src="src" :srcset="srcset" :sizes="srcset ? sizes : undefined" :alt="alt" loading="lazy" decoding="async" @error="failedVariant = true" />`
    },
    ReaderCitations: {
      props: { citations: { type: Array, default: () => [] } },
      template: `<section v-if="citations.length" class="reader-citations" aria-label="原典回查">
        <h3>原典回查 <small>{{citations.length}} 条引文</small></h3>
        <details v-for="(citation,index) in citations" :key="citation.url+'|'+index">
          <summary><span>{{citation.title}}</span><small v-if="citation.role==='counter'">反证</small><small v-if="citation.role==='variant'">异说</small><small class="reader-citation-expand">{{citation.textScope==='full'?'展开原文':'展开节录'}}</small><small class="reader-citation-collapse">收起原文</small></summary>
          <blockquote v-if="citation.quote">{{citation.quote}}</blockquote>
          <p v-if="citation.note">{{citation.note}}</p>
          <a v-if="/^https?:/.test(citation.url||'')" :href="citation.url" target="_blank" rel="noopener noreferrer">阅读原典全文 ↗</a>
        </details>
      </section>`
    },
    PersonReadingSections: {
      props: {person:Object,timeline:{type:Array,default:()=>[]},citations:{type:Array,default:()=>[]},section:{type:String,default:'life'},onSection:Function,onOpenEvent:Function,typeLabel:Function},
      computed: {
        sections(){return [['life','生平'],['career','仕宦'],['relations','关系'],['sources','史料']];},
        career(){return this.timeline.map(group=>({...group,events:group.events.filter(event=>['appointment','peerage','fangzhen'].includes(event.eventType))})).filter(group=>group.events.length);},
        researchHref(){try{if(location.protocol==='file:')return '';let search='';if(parent!==window&&parent.location.origin===location.origin)search=parent.location.search;return '/admin/research?person='+encodeURIComponent(this.person.personId)+'&return='+encodeURIComponent('/'+search+location.hash);}catch{return '';}}
      },
      methods: {
        readableBio(){return !/^(?:—|-|未详|不详|待定|待考|\?|？)$/u.test(String(this.person.bio||'').trim())&&String(this.person.bio||'').trim();},
        choose(key){this.onSection?.(key);},
        tenure(event){const start=Number.isInteger(event.startYear)?event.startYear+'年':'？';const end=Number.isInteger(event.endYear)?event.endYear+'年':'？';return start==='？'&&end==='？'?'任期未详':start===end?start:start+'—'+end;},
        keyboard(event,index){if(event.isComposing)return;let next;if(event.key==='ArrowRight')next=(index+1)%4;else if(event.key==='ArrowLeft')next=(index+3)%4;else if(event.key==='Home')next=0;else if(event.key==='End')next=3;else return;event.preventDefault();this.choose(this.sections[next][0]);this.$nextTick(()=>this.$el.querySelectorAll('.sgz-person-sections button')[next]?.focus());},
        remember(){const selector={people:'.people-workbench',offices:'.court-scroll'}[location.hash.slice(1).split('?')[0]];global.SGZ_READING_HISTORY?.rememberReading({hash:location.hash,title:this.person.name+' · 人物记',scroll:document.querySelector(selector)?.scrollTop||0,drawerScroll:document.querySelector('.el-drawer__body')?.scrollTop||0});}
      },
      template: `<div class="sgz-person-reading">
        <nav class="sgz-person-sections" aria-label="人物阅读分区"><button v-for="([key,label],index) in sections" :key="key" type="button" :aria-pressed="section===key" @click="choose(key)" @keydown="keyboard($event,index)">{{label}}</button></nav>
        <section v-if="section==='life'" class="sgz-person-panel" aria-label="生平"><h3>人物生平</h3><p v-if="readableBio()" class="sgz-biography">{{person.bio}}</p><p v-else class="reader-quiet-note">独立小传尚待补充。</p>
          <div v-if="timeline.length" class="v69-person-life-timeline"><section v-for="group in timeline" :key="group.year" class="v69-person-life-year"><time>{{group.year}}</time><div class="v69-person-life-events"><button v-for="event in group.events" :key="event.eventId" type="button" @click="onOpenEvent(event)"><span class="v69-life-type">{{typeLabel(event)}}</span><strong>{{event.title}}</strong><small v-if="event.detail">{{event.detail}}</small></button></div></section></div>
        </section>
        <section v-else-if="section==='career'" class="sgz-person-panel" aria-label="仕宦"><h3>仕宦轨迹</h3><p class="reader-quiet-note">任官、封爵与州镇职任按原记录列出。起讫未详不推定连续任期；兼领与迁转以原文为据。</p>
          <div v-if="career.length" class="v69-person-life-timeline"><section v-for="group in career" :key="group.year" class="v69-person-life-year"><time>{{group.year}}</time><div class="v69-person-life-events"><article v-for="event in group.events" :key="event.eventId" class="sgz-career-record"><button type="button" @click="onOpenEvent(event)"><span class="v69-life-type">{{typeLabel(event)}}</span><strong>{{event.title}}</strong><small>{{tenure(event)}}</small><small v-if="event.detail">{{event.detail}}</small><small>打开原记录与证据</small></button><reader-citations :citations="event.citations||[]"/></article></div></section></div><p v-else class="reader-quiet-note">尚无可展开的仕宦经历。</p>
        </section>
        <section v-else-if="section==='relations'" class="sgz-person-panel" aria-label="关系"><h3>关系与归属</h3><p v-if="person.historicalAffiliations?.length">历史归属：{{person.historicalAffiliations.join('、')}}</p><p class="reader-quiet-note">宗族、师友与同僚关系尚无独立的公开记录。</p></section>
        <section v-else class="sgz-person-panel" aria-label="史料"><h3>史料与出处</h3><reader-citations :citations="citations"/><p v-if="!citations.length" class="reader-quiet-note">本人物尚无可展开的原文引证。</p></section>
        <a v-if="researchHref" class="sgz-research-link" :href="researchHref" target="_top" @click="remember">进入人物研究案卷 →</a>
      </div>`
    },
    PersonIdentityFacts: {
      props: ['person', 'lifespan', 'office', 'peerage'],
      template: `<dl class="v69-person-facts" aria-label="人物身份资料">
        <div v-if="person.zi"><dt>表字</dt><dd>{{person.zi}}</dd></div>
        <div class="v69-person-lifespan"><dt>生卒</dt><dd>{{lifespan}}</dd></div>
        <div v-if="person.birthplace"><dt>籍贯</dt><dd>{{person.birthplace}}</dd></div>
        <div v-if="office&&office.length"><dt>官职</dt><dd>
          <details class="v69-person-fact-list"><summary>{{office.length}} 任</summary>
            <div class="person-card-badges"><span v-for="item in office" :key="item" class="person-pill office">{{item}}</span></div>
          </details>
        </dd></div>
        <div v-if="peerage&&peerage.length"><dt>爵位</dt><dd>
          <details class="v69-person-fact-list"><summary>{{peerage.length}} 爵</summary>
            <div class="person-card-badges"><span v-for="item in peerage" :key="item" class="person-pill noble">{{item}}</span></div>
          </details>
        </dd></div>
        <div v-if="person.isRuler&&person.templeName"><dt>庙号</dt><dd>{{person.templeName}}</dd></div>
        <div v-if="person.posthumousTitle"><dt>谥号</dt><dd>{{person.posthumousTitle}}</dd></div>
      </dl>`
    },
    InscriptionApparatus: {
      props: ['record'],
      computed: {
        variants() {
          return (this.record.inscriptionVariants || []).filter(item =>
            item.note || (item.text || item.raw) && String(item.text || item.raw) !== this.record.inscription);
        },
        references() { return this.record.transcriptionReferences || []; }
      },
      template: `<section v-if="variants.length || references.length || record.transcriptionNote" class="reader-inscription-apparatus" aria-label="异文与著录">
        <h3>异文与著录</h3>
        <p v-if="record.transcriptionNote">{{record.transcriptionNote}}</p>
        <details v-for="(variant,index) in variants" :key="variant.type+'-'+index">
          <summary>{{variant.label || variant.type}}</summary>
          <p v-if="variant.note">{{variant.note}}</p>
          <pre v-if="variant.text || variant.raw">{{variant.text || variant.raw}}</pre>
          <p v-if="variant.source">{{variant.source}}</p>
        </details>
        <ul v-if="references.length"><li v-for="(reference,index) in references" :key="reference.url+'-'+index">
          <a :href="reference.url" target="_blank" rel="noopener noreferrer">{{reference.title}} ↗</a>
          <span v-if="reference.note">{{reference.note}}</span>
        </li></ul>
      </section>`
    },
    InscriptionAvailability: {
      props: ['record'],
      template: `<section v-if="!record.inscription" class="reader-availability" aria-label="释文收录状态">
        <span aria-hidden="true">文</span><div><h3>本条尚未收录释文</h3>
        <p>目前可查阅题名与著录资料。释文、注释和异文将在核对原典后补入。</p>
        <p v-if="record.readerSummary"><b>内容提要</b> {{record.readerSummary}}</p></div>
      </section>`
    }
  });
})(window);
