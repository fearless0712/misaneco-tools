/* 広告枠：中身は ads.json だけで差し替える（コード変更不要）。
   - 各グループの下に関連カテゴリの枠（「広告」「PR」表記）。中身が空なら枠ごと出さない。
   - 全画面の広告は 1日1回まで（端末内の記録）。×ですぐ閉じられる。見なくてもツールは使える。
   - クリックを促す文言は書かない。 */
(function () {
  'use strict';
  var ML = window.ML = window.ML || {};
  var data = null, KEY = 'movelist_ad_day', shownThisLoad = false;

  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

  function load() {
    return fetch('ads.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (j) { data = j; return j; });
  }

  function pick(cat) {
    if (!data || !data.slots || !Array.isArray(data.slots[cat])) return null;
    var list = data.slots[cat].filter(function (a) { return a && a.enabled !== false && ((a.type === 'image' && a.img && a.href) || (a.type === 'html' && a.html)); });
    if (!list.length) return null;
    var total = list.reduce(function (s, a) { return s + Math.max(0, +a.weight || 1); }, 0), r = Math.random() * total;
    for (var i = 0; i < list.length; i++) { r -= Math.max(0, +list[i].weight || 1); if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }

  function fill(ad, el) {
    el.textContent = '';
    if (!ad) return false;
    if (ad.type === 'image') {
      var a = document.createElement('a');
      a.href = ad.href; a.target = '_blank'; a.rel = 'sponsored noopener';
      var img = document.createElement('img');
      img.src = ad.img; img.alt = ad.alt || ''; img.loading = 'lazy'; img.decoding = 'async';
      if (ad.width) img.width = ad.width; if (ad.height) img.height = ad.height;
      a.appendChild(img); el.appendChild(a);
      if (ad.text) { var p = document.createElement('p'); p.className = 'ad-text'; p.textContent = ad.text; el.appendChild(p); }
      return true;
    }
    if (ad.type === 'html') {
      /* サイト運営者が ads.json に貼るアフィリエイトのタグ（<a><img>）。<script> はCSPで動かない */
      el.innerHTML = ad.html;
      el.querySelectorAll('script').forEach(function (s) { s.remove(); });
      el.querySelectorAll('a').forEach(function (x) { x.target = '_blank'; if (!/sponsored/.test(x.rel)) x.rel = (x.rel + ' sponsored noopener').trim(); });
      return true;
    }
    return false;
  }

  /* グループ下の枠を作る。中身がなければ null（何も出さない） */
  function slot(groupId) {
    var cats = (data && data.placements && data.placements[groupId]) || [];
    for (var i = 0; i < cats.length; i++) {
      var ad = pick(cats[i]);
      if (!ad) continue;
      var box = document.createElement('aside');
      box.className = 'ad-slot';
      box.setAttribute('aria-label', '広告');
      var head = document.createElement('div');
      head.className = 'ad-label';
      head.textContent = '広告・PR｜' + ((data.categoryNames && data.categoryNames[cats[i]]) || '関連サービス');
      var body = document.createElement('div');
      body.className = 'ad-body';
      box.appendChild(head); box.appendChild(body);
      if (fill(ad, body)) return box;
    }
    return null;
  }

  function canInterstitial() {
    if (shownThisLoad) return false;
    try { return localStorage.getItem(KEY) !== today(); } catch (e) { return true; }
  }

  function interstitial() {
    if (!canInterstitial()) return;
    var ad = pick('interstitial');
    var modal = document.getElementById('adModal'), body = document.getElementById('adModalBody'), btn = document.getElementById('adClose');
    if (!ad || !modal || !fill(ad, body)) return;
    shownThisLoad = true;
    try { localStorage.setItem(KEY, today()); } catch (e) { }
    var prev = document.activeElement;
    modal.hidden = false; btn.focus();
    function close() {
      modal.hidden = true; body.textContent = '';
      btn.removeEventListener('click', close); document.removeEventListener('keydown', onKey); modal.removeEventListener('click', onBg);
      if (prev && prev.focus) prev.focus();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    function onBg(e) { if (e.target === modal) close(); }
    btn.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    modal.addEventListener('click', onBg);
  }

  ML.ads = { load: load, slot: slot, interstitial: interstitial };
})();
