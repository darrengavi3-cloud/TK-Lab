(function(global){
  'use strict';
  function escapeHtml(value){
    return String(value==null?'':value).replace(/[&<>"']/g,character=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[character]);
  }
  function safeHex(value,fallback='#625b52'){
    const color=String(value||'').trim();
    return /^#[0-9a-f]{6}$/i.test(color)?color:String(fallback);
  }
  function safeNumber(value,fallback=0,min=-360,max=360){
    const number=Number(value);
    return Number.isFinite(number)?Math.max(min,Math.min(max,number)):fallback;
  }
  global.MapSafeHtml=Object.freeze({escapeHtml,safeHex,safeNumber});
})(typeof window!=='undefined'?window:globalThis);
