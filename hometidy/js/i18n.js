/* HomeTidy i18n: loads i18n/<lang>.json. Untranslated languages fall back to English and show a notice. */
(function(){
  'use strict';
  var HT = window.HT = window.HT || {};
  var LANGS = [
    {code:'ja', label:'日本語'},
    {code:'en', label:'English'},
    {code:'es', label:'Español'},
    {code:'pt', label:'Português'},
    {code:'ko', label:'한국어'},
    {code:'zh-Hans', label:'简体中文'},
    {code:'fr', label:'Français'},
    {code:'de', label:'Deutsch'}
  ];
  var dict = {}, fallback = {}, current = 'en', uiLang = 'en';

  function pickInitial(){
    var saved = null;
    try { saved = localStorage.getItem('ht_lang'); } catch(e){}
    var q = new URLSearchParams(location.search).get('lang');
    if (q) return normalize(q);
    if (saved) return normalize(saved);
    var navs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en'];
    for (var i=0;i<navs.length;i++){ var n = normalize(navs[i]); if (n) return n; }
    return 'en';
  }
  function normalize(tag){
    if (!tag) return null;
    var t = String(tag).toLowerCase();
    if (t.indexOf('zh') === 0) return 'zh-Hans';
    var base = t.split('-')[0];
    for (var i=0;i<LANGS.length;i++){ if (LANGS[i].code.toLowerCase() === base) return LANGS[i].code; }
    return null;
  }
  async function loadJSON(code){
    var r = await fetch('i18n/' + code + '.json', {cache:'no-cache'});
    if (!r.ok) throw new Error('i18n ' + code);
    return r.json();
  }
  function t(key, vars){
    var s = (dict[key] != null) ? dict[key] : (fallback[key] != null ? fallback[key] : key);
    if (vars) s = s.replace(/\{(\w+)\}/g, function(m,k){ return vars[k] != null ? vars[k] : m; });
    return s;
  }
  function apply(root){
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function(el){ el.textContent = t(el.getAttribute('data-i18n')); });
    root.querySelectorAll('[data-i18n-ph]').forEach(function(el){ el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
    root.querySelectorAll('[data-i18n-aria]').forEach(function(el){ el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
  }
  async function setLang(code){
    current = code;
    try { localStorage.setItem('ht_lang', code); } catch(e){}
    if (!fallback._loaded){ fallback = await loadJSON('en'); fallback._loaded = true; }
    var d = {};
    try { d = await loadJSON(code); } catch(e){ d = {}; }
    var untranslated = !d._meta || d._meta.status !== 'complete';
    if (untranslated){ dict = fallback; uiLang = 'en'; } else { dict = d; uiLang = code; }
    document.documentElement.lang = uiLang === 'zh-Hans' ? 'zh-Hans' : uiLang;
    document.title = t('pageTitle');
    var notice = document.getElementById('langNotice');
    if (notice){
      if (untranslated){
        notice.hidden = false;
        notice.textContent = (d._meta && d._meta.notice) ? d._meta.notice : 'This language is not supported yet. Showing English.';
      } else notice.hidden = true;
    }
    apply();
    var sel = document.getElementById('langSel');
    if (sel) sel.value = code;
    document.dispatchEvent(new CustomEvent('ht:lang', {detail:{lang:code, uiLang:uiLang}}));
  }
  function buildMenu(){
    var sel = document.getElementById('langSel');
    LANGS.forEach(function(l){
      var o = document.createElement('option');
      o.value = l.code;
      o.textContent = l.label + ((l.code==='ja'||l.code==='en') ? '' : ' (—)');
      sel.appendChild(o);
    });
    sel.addEventListener('change', function(){ setLang(sel.value); });
  }
  HT.i18n = {
    t: t, apply: apply, setLang: setLang,
    init: async function(){ buildMenu(); await setLang(pickInitial() || 'en'); },
    get lang(){ return current; },
    get uiLang(){ return uiLang; }
  };
  HT.t = t;
})();
