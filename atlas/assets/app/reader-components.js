(function (global) {
  'use strict';
  global.SGZ_READER_COMPONENTS = Object.freeze({
    ReaderCitations: {
      props: { citations: { type: Array, default: () => [] } },
      template: `<section v-if="citations.length" class="reader-citations" aria-label="原典回查">
        <h3>原典回查 <small>{{citations.length}} 条引文</small></h3>
        <details v-for="(citation,index) in citations" :key="citation.url+'|'+index">
          <summary><span>{{citation.title}}</span><small>展开节录</small></summary>
          <blockquote>{{citation.quote}}</blockquote>
          <p v-if="citation.note">{{citation.note}}</p>
          <a :href="citation.url" target="_blank" rel="noopener noreferrer">阅读原典全文 ↗</a>
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
