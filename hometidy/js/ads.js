/* HomeTidy ads: content comes from ads.json (image banner + link, or HTML tag), per language, weighted.
   - The tool never requires viewing or clicking an ad.
   - Interstitial: at most once a day per browser (localStorage; falls back to once per page load). */
(function(){
  'use strict';
  var HT = window.HT = window.HT || {};
  var data = null, shownThisLoad = false, KEY = 'ht_ad_day';

  function today(){ var d = new Date(); return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate(); }
  async function load(){
    try { var r = await fetch('ads.json', {cache:'no-cache'}); if (r.ok) data = await r.json(); } catch(e){ data = null; }
    return data;
  }
  function pick(slot, lang){
    if (!data || !data.slots || !data.slots[slot]) return null;
    var list = data.slots[slot].filter(function(a){
      if (a.enabled === false) return false;
      var langs = a.lang || ['*'];
      return langs.indexOf('*') >= 0 || langs.indexOf(lang) >= 0;
    });
    if (!list.length){
      list = data.slots[slot].filter(function(a){ return a.enabled !== false && (a.lang||[]).indexOf(data.fallbackLang || 'en') >= 0; });
      if (!list.length) return null;
    }
    var total = list.reduce(function(s,a){ return s + Math.max(0, +a.weight || 1); }, 0), r = Math.random()*total;
    for (var i=0;i<list.length;i++){ r -= Math.max(0, +list[i].weight || 1); if (r <= 0) return list[i]; }
    return list[list.length-1];
  }
  function render(ad, el){
    el.textContent = '';
    if (!ad) return false;
    if (ad.type === 'image'){
      var a = document.createElement('a');
      a.href = ad.href; a.target = '_blank'; a.rel = 'sponsored noopener';
      var img = document.createElement('img');
      img.src = ad.img; img.alt = ad.alt || ''; if (ad.width) img.width = ad.width; if (ad.height) img.height = ad.height;
      img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer-when-downgrade';
      a.appendChild(img); el.appendChild(a);
      return true;
    }
    if (ad.type === 'html'){
      // Site-owner content from ads.json (e.g. affiliate <a><img> tags). <script> inside will NOT run (CSP + innerHTML).
      el.innerHTML = ad.html || '';
      el.querySelectorAll('a').forEach(function(a){ a.target = '_blank'; if (!/sponsored/.test(a.rel)) a.rel = (a.rel + ' sponsored noopener').trim(); });
      return !!ad.html;
    }
    return false;
  }
  function canInterstitial(){
    if (shownThisLoad) return false;
    try { return localStorage.getItem(KEY) !== today(); } catch(e){ return true; }
  }
  function markInterstitial(){
    shownThisLoad = true;
    try { localStorage.setItem(KEY, today()); } catch(e){}
  }
  function showBanner(lang){
    var box = document.getElementById('adBanner'), slot = document.getElementById('adBannerSlot');
    var ok = render(pick('banner', lang), slot);
    box.hidden = !ok;
    document.body.classList.toggle('has-banner', ok);
  }
  /* resolves when closed (or immediately if not shown) */
  function showInterstitial(lang){
    return new Promise(function(resolve){
      if (!canInterstitial()) return resolve(false);
      var ad = pick('interstitial', lang);
      var modal = document.getElementById('adModal'), slot = document.getElementById('adModalSlot'), btn = document.getElementById('adClose');
      if (!render(ad, slot)) return resolve(false);
      markInterstitial();
      var prev = document.activeElement;
      modal.hidden = false; btn.focus();
      function close(){
        modal.hidden = true; slot.textContent = '';
        btn.removeEventListener('click', close); document.removeEventListener('keydown', onKey);
        if (prev && prev.focus) prev.focus();
        resolve(true);
      }
      function onKey(e){ if (e.key === 'Escape') close(); }
      btn.addEventListener('click', close);
      document.addEventListener('keydown', onKey);
    });
  }
  HT.ads = { load:load, pick:pick, render:render, showBanner:showBanner, showInterstitial:showInterstitial, canInterstitial:canInterstitial };
})();
