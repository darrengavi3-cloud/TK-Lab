(function (global) {
  'use strict';
  global.SGZ_READER_COMPONENTS = Object.freeze({
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
    PersonIdentityFacts: {
      props: ['person', 'lifespan', 'office', 'peerage'],
      template: `<dl class="v69-person-facts" aria-label="人物身份资料">
        <div v-if="person.zi"><dt>表字</dt><dd>{{person.zi}}</dd></div>
        <div class="v69-person-lifespan"><dt>生卒</dt><dd>{{lifespan}}</dd></div>
        <div v-if="person.birthplace"><dt>籍贯</dt><dd>{{person.birthplace}}</dd></div>
        <div v-if="office"><dt>官职</dt><dd>{{office}}</dd></div>
        <div v-if="peerage"><dt>爵位</dt><dd>{{peerage}}</dd></div>
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
