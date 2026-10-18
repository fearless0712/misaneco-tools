/* ModelCheck UI. All lookups run in the browser; only same-origin JSON is fetched. */
(function () {
  'use strict';
  var MC = window.MC;
  var D = null, IX = null, T = {}, ADS = null, lang = 'ja', current = null;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function fmt(s, v) { return String(s || '').replace(/\{(\w+)\}/g, function (_, k) { return v && v[k] != null ? v[k] : ''; }); }
  function t(k, v) { return fmt(T[k] != null ? T[k] : k, v); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function getJSON(u) { return fetch(u, { cache: 'no-cache', credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  function nm(m) { return m.name[lang] || m.name.en; }
  function unc() { return el('em', 'unc', t('unconfirmed')); }

  function pickLang() {
    var q = /[?&]lang=(ja|en)/.exec(location.search);
    if (q) return q[1];
    var s = store('mc_lang');
    if (s === 'ja' || s === 'en') return s;
    return (navigator.language || 'ja').toLowerCase().indexOf('ja') === 0 ? 'ja' : 'en';
  }

  function applyI18n() {
    document.documentElement.lang = lang;
    document.title = t('title');
    Array.prototype.forEach.call(document.querySelectorAll('[data-i]'), function (e) { e.textContent = t(e.getAttribute('data-i')); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ph]'), function (e) { e.placeholder = t(e.getAttribute('data-ph')); });
    $('howLink').href = lang === 'ja' ? 'https://support.apple.com/ja-jp/106343' : 'https://support.apple.com/en-us/106343';
    $('howLink2').href = lang === 'ja' ? 'https://support.apple.com/ja-jp/108044' : 'https://support.apple.com/en-us/108044';
    $('interClose').setAttribute('aria-label', t('adClose'));
    fillList();
    if (current) render(current); else renderAds(null);
  }

  function setLang(l) {
    lang = l; store('mc_lang', l);
    return getJSON('i18n/' + l + '.json').then(function (j) { T = j; applyI18n(); });
  }

  function fillList() {
    var s = $('inList'), keep = s.value;
    s.textContent = '';
    var o = el('option', null, t('listPh')); o.value = ''; s.appendChild(o);
    var byYear = {};
    D.models.forEach(function (m) { (byYear[m.year] = byYear[m.year] || []).push(m); });
    Object.keys(byYear).sort().reverse().forEach(function (y) {
      var g = document.createElement('optgroup'); g.label = y;
      byYear[y].forEach(function (m) { var op = el('option', null, nm(m)); op.value = m.id; g.appendChild(op); });
      s.appendChild(g);
    });
    s.value = keep;
  }

  function showTab(name) {
    ['model', 'part', 'list'].forEach(function (n) {
      $('tab-' + n).setAttribute('aria-selected', n === name ? 'true' : 'false');
      $('pane-' + n).hidden = n !== name;
    });
    hideMsg();
  }

  function hideMsg() { var m = $('msg'); m.hidden = true; m.textContent = ''; m.className = 'msg'; }
  function showMsg(text, isErr, extra) {
    var m = $('msg'); m.textContent = ''; m.className = 'msg' + (isErr ? ' err' : '');
    text.split('\n').forEach(function (line, i) { if (i) m.appendChild(document.createElement('br')); m.appendChild(document.createTextNode(line)); });
    if (extra) { m.appendChild(document.createElement('br')); m.appendChild(extra); }
    m.hidden = false;
  }

  function run(kind) {
    hideMsg();
    var r;
    if (kind === 'list') {
      var id = $('inList').value;
      if (!id) { showMsg(t('errEmpty'), true); return; }
      r = { type: 'found', via: 'list', model: IX.byId[id], entry: null };
    } else {
      var v = $(kind === 'part' ? 'inPart' : 'inModel').value;
      r = MC.lookup(D, IX, v);
      if (kind === 'model' && r.type === 'part-unverified') { /* user typed a part number in the model box: same guidance */ }
    }
    if (r.type === 'found') { current = r; render(r); maybeInterstitial(); return; }
    current = null; $('result').hidden = true; renderAds(null);
    if (r.type === 'empty') showMsg(t('errEmpty'), true);
    else if (r.type === 'invalid') showMsg(t('errInvalid'), true);
    else if (r.type === 'unknown') showMsg(t('errUnknown', { a: r.input }), true);
    else if (r.type === 'legacy') showMsg(t('errLegacy', { a: r.input, name: r.name }), false);
    else if (r.type === 'part-unverified') {
      var b = el('button', 'linkbtn', t('goModel')); b.type = 'button';
      b.addEventListener('click', function () { showTab('model'); $('how').open = true; $('inModel').focus(); });
      showMsg(t('partInfo', { p: r.input }) + '\n' + t('partHow'), false, b);
    }
  }

  function li(parent, text, cls) { var x = el('li', cls, text); parent.appendChild(x); return x; }
  function sec(title) { var s = el('section', 'sec'); s.appendChild(el('h2', null, title)); return s; }
  function link(href, text) { var a = el('a', null, text); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
  function kv(dl, k, v) { dl.appendChild(el('dt', null, k)); var dd = el('dd'); if (v == null || v === '') dd.appendChild(unc()); else if (typeof v === 'string') dd.textContent = v; else dd.appendChild(v); dl.appendChild(dd); }
  function joinNames(ids) { return ids.map(function (id) { return nm(IX.byId[id]); }).join(lang === 'ja' ? '、' : ', '); }

  function render(r) {
    var m = r.model, box = $('result');
    box.textContent = '';
    // head
    var h = el('div', 'res-head');
    h.appendChild(el('p', 'res-kicker', t('resModel')));
    h.appendChild(el('p', 'res-name', nm(m)));
    if (r.entry) {
      h.appendChild(el('p', 'res-sub', t('resFromModel', { a: r.entry.a })));
      var reg = r.entry.region && r.entry.region[lang];
      h.appendChild(el('p', 'res-sub', reg ? t('resRegion', { r: reg }) : t('resRegionNone')));
      if (r.entry.note) h.appendChild(el('p', 'note', t('noteA3716') + '：' + r.entry.note[lang]));
    }
    var dl = el('dl', 'kv');
    kv(dl, t('resYear'), m.year ? String(m.year) : null);
    kv(dl, t('resScreen'), m.displayInch ? t('inch', { v: m.displayInch }) : null);
    if (m.sizeMm) kv(dl, t('resSize'), t('resSizeVal', { h: m.sizeMm.h.toFixed(1), w: m.sizeMm.w.toFixed(1), d: String(m.sizeMm.d) }));
    else if (m.dimsFold) kv(dl, t('resSize'), t('foldSize', { o: m.dimsFold.open.join(' × '), c: m.dimsFold.closed.join(' × ') }));
    else kv(dl, t('resSize'), null);
    h.appendChild(dl);
    box.appendChild(h);

    // case
    var adv = MC.caseAdvice(D, m);
    var cs = sec(t('caseTitle'));
    var ok = el('div', 'ok');
    ok.appendChild(el('p', 'big', t('caseFit', { name: nm(m) })));
    if (adv.ng.length) ok.appendChild(el('p', 'ngshort', t('caseNgShort', { list: joinNames(adv.ng.map(function (x) { return x.id; })) })));
    if (m.foldable) ok.appendChild(el('p', null, t('foldNote')));
    cs.appendChild(ok);
    var feat = [t('camRear', { n: m.camera.rear }) + (m.camera.layout ? t('camLayout_' + m.camera.layout) : '')];
    if (m.buttons.action) feat.push(t('btnAction'));
    if (m.buttons.cameraControl) feat.push(t('btnCameraControl'));
    if (m.buttons.home) feat.push(t('btnHome'));
    cs.appendChild(el('p', 'note', feat.join(' / ')));
    if (adv.ng.length) {
      cs.appendChild(el('p', 'subh', t('caseNgHead')));
      var ul = el('ul', 'list');
      adv.ng.forEach(function (x) {
        var o = IX.byId[x.id], item = li(ul, '', 'ng-item');
        item.appendChild(el('b', null, nm(o) + '：'));
        item.appendChild(document.createTextNode(x.reasons.map(function (k) { return t('reason_' + k); }).join(lang === 'ja' ? '、' : ', ')));
        if (o.sizeMm && x.reasons.indexOf('size') >= 0) item.appendChild(el('span', 'note', ' (' + o.sizeMm.h.toFixed(1) + '×' + o.sizeMm.w.toFixed(1) + '×' + o.sizeMm.d + ' mm)'));
      });
      cs.appendChild(ul);
    }
    if (adv.same.length) {
      cs.appendChild(el('p', 'subh', t('caseSameHead')));
      cs.appendChild(el('p', 'samep', t('caseSameNote', { list: joinNames(adv.same), name: nm(m) })));
    }
    box.appendChild(cs);

    // charger
    var c = MC.charger(m), ch = sec(t('chgTitle'));
    var ok2 = el('div', 'ok');
    ok2.appendChild(el('p', 'big', c.usbW == null ? t('chgAdapterUnknown') : t(c.avs ? 'chgAdapterAvs' : 'chgAdapter', { w: c.usbW })));
    ok2.appendChild(el('p', 'big', t('chgCable_' + c.cable)));
    ch.appendChild(ok2);
    var q = el('div', 'quote');
    q.appendChild(el('p', 'small', t('chgOfficial')));
    var lines = (c.text && c.text[lang]) || [];
    if (!lines.length) q.appendChild(unc());
    lines.forEach(function (s) { q.appendChild(el('p', null, s)); });
    ch.appendChild(q);
    if (c.text && c.text.adapterNote) ch.appendChild(el('p', 'note', t('chgXNote')));
    ch.appendChild(el('p', 'subh', t('wlTitle')));
    var wl = el('ul', 'list');
    if (c.magsafe) { li(wl, c.magsafeMaxW ? t('wlMagsafe', { w: c.magsafeMaxW }) : t('wlMagsafe', { w: '?' })); if (c.magsafeAdapterW) li(wl, t('wlMagsafeAdapter', { w: c.magsafeAdapterW })); }
    else if (c.magsafe === false) li(wl, t('wlNoMagsafe'));
    else { var x = li(wl, 'MagSafe：'); x.appendChild(unc()); }
    if (c.qi2MaxW) li(wl, t('wlQi2', { w: c.qi2MaxW }));
    if (c.qiMaxW) li(wl, t('wlQiW', { w: c.qiMaxW })); else if (c.qiListed) li(wl, t('wlQi'));
    ch.appendChild(wl);
    box.appendChild(ch);

    // iOS
    var io = sec(t('iosTitle'));
    if (m.ios) io.appendChild(el('p', 'big', m.ios.supported ? t('iosYes', { v: m.ios.latest }) : t('iosNo', { v: m.ios.latest, last: m.ios.lastListed })));
    else io.appendChild(unc());
    box.appendChild(io);

    // sources
    var sr = sec(t('srcTitle')), sl = el('ul', 'srcs');
    var spec = m.specUrl ? (m.specUrl[lang] || m.specUrl.en) : null;
    if (spec) { var a1 = el('li'); a1.appendChild(link(spec, t('srcSpec', { name: nm(m) }))); sl.appendChild(a1); }
    var idUrl = lang === 'ja' ? D.sources.identify[0] : D.sources.identify[1];
    var a2 = el('li'); a2.appendChild(link(idUrl, t('srcId'))); sl.appendChild(a2);
    var a3 = el('li'); a3.appendChild(link(lang === 'ja' ? D.sources.fastCharge[0] : D.sources.fastCharge[1], t('srcFast'))); sl.appendChild(a3);
    if (m.ios && m.ios.src) { var a4 = el('li'); a4.appendChild(link(m.ios.src, t('srcIos'))); sl.appendChild(a4); }
    sr.appendChild(sl);
    box.appendChild(sr);

    var again = el('button', 'linkbtn again', t('again')); again.type = 'button';
    again.addEventListener('click', function () { window.scrollTo(0, 0); var i = $('inModel'); i.value = ''; showTab('model'); i.focus(); });
    box.appendChild(again);
    box.hidden = false;
    renderAds(m);
  }

  /* ---------- ads (A8 tags pasted into ads.json, sanitized) ---------- */
  var IMG_OK = /^https:\/\/([a-z0-9-]+\.)*a8\.net\//i;
  function safeUrl(u, forImg) {
    u = String(u || '').trim();
    if (!u) return null;
    if (/^(javascript|data|vbscript):/i.test(u)) return null;
    if (/^https:\/\//i.test(u)) return forImg ? (IMG_OK.test(u) ? u : null) : u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) || /^\/\//.test(u)) return null;
    return forImg ? u : null; // relative image (same site) allowed; relative links not needed
  }
  function sanitizeTag(html) {
    var doc = new DOMParser().parseFromString('<div>' + String(html || '') + '</div>', 'text/html');
    var out = document.createDocumentFragment(), count = 0;
    function walk(src, dst) {
      Array.prototype.forEach.call(src.childNodes, function (n) {
        if (n.nodeType === 3) { if (n.nodeValue.trim()) dst.appendChild(document.createTextNode(n.nodeValue)); return; }
        if (n.nodeType !== 1) return;
        var tag = n.tagName.toLowerCase();
        if (tag === 'a') {
          var href = safeUrl(n.getAttribute('href'), false);
          var a = document.createElement('a');
          if (href) { a.href = href; a.target = '_blank'; a.rel = 'nofollow sponsored noopener'; }
          walk(n, a); dst.appendChild(a); count++;
        } else if (tag === 'img') {
          var src2 = safeUrl(n.getAttribute('src'), true);
          if (!src2) return;
          var im = document.createElement('img');
          im.src = src2; im.alt = n.getAttribute('alt') || '';
          ['width', 'height'].forEach(function (k) { var v = n.getAttribute(k); if (v && /^\d{1,4}$/.test(v)) im.setAttribute(k, v); });
          im.loading = 'lazy'; im.decoding = 'async'; im.referrerPolicy = 'no-referrer-when-downgrade';
          dst.appendChild(im); count++;
        } else if (tag === 'br') {
          dst.appendChild(document.createElement('br'));
        } else if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object' || tag === 'embed') {
          return;
        } else {
          walk(n, dst);
        }
      });
    }
    walk(doc.body.firstChild, out);
    return count ? out : null;
  }

  function renderAds(m) {
    var box = $('ads');
    box.textContent = '';
    box.hidden = true;
    if (!ADS || !m) return;
    var slots = (ADS.slots || []).filter(function (s) { return s && s.tag && String(s.tag).trim(); });
    var made = 0, wrap = document.createDocumentFragment();
    slots.forEach(function (s) {
      var frag = sanitizeTag(s.tag);
      if (!frag) return;
      var d = el('div', 'ad-slot'); d.setAttribute('data-ad', s.id || '');
      d.appendChild(frag);
      var cap = s.caption && s.caption[lang];
      if (cap) d.appendChild(el('p', 'ad-cap', cap));
      wrap.appendChild(d); made++;
    });
    if (!made) return;
    var hd = el('div', 'adbox-h');
    hd.appendChild(el('h2', null, t('adHead')));
    hd.appendChild(el('span', 'adtag', (ADS.label && ADS.label[lang]) || t('adLabel')));
    box.appendChild(hd);
    box.appendChild(wrap);
    box.hidden = false;
  }

  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function maybeInterstitial() {
    if (!ADS || !ADS.interstitial || !ADS.interstitial.tag || !String(ADS.interstitial.tag).trim()) return;
    if (store('mc_inter') === today()) return;
    var frag = sanitizeTag(ADS.interstitial.tag);
    if (!frag) return;
    var body = $('interBody'); body.textContent = ''; body.appendChild(frag);
    $('interLabel').textContent = (ADS.label && ADS.label[lang]) || t('adLabel');
    $('inter').hidden = false;
    store('mc_inter', today());
    $('interClose').focus();
  }
  function closeInter() { $('inter').hidden = true; $('interBody').textContent = ''; }

  /* ---------- init ---------- */
  function bind() {
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.go'), function (b) {
      b.addEventListener('click', function () { run(b.getAttribute('data-go')); scrollToResult(); });
    });
    $('inModel').addEventListener('keydown', function (e) { if (e.key === 'Enter') { run('model'); scrollToResult(); } });
    $('inPart').addEventListener('keydown', function (e) { if (e.key === 'Enter') run('part'); });
    $('inList').addEventListener('change', function () { if ($('inList').value) run('list'); });
    $('langBtn').addEventListener('click', function () { setLang(lang === 'ja' ? 'en' : 'ja'); });
    $('interClose').addEventListener('click', closeInter);
    $('inter').addEventListener('click', function (e) { if (e.target === $('inter')) closeInter(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('inter').hidden) closeInter(); });
    window.addEventListener('hashchange', fromHash);
  }

  function scrollToResult() {
    var r = $('result');
    if (!r.hidden && r.scrollIntoView) { var y = r.getBoundingClientRect().top + window.pageYOffset - 56; window.scrollTo(0, Math.max(0, y)); }
  }

  function fromHash() {
    var h = decodeURIComponent((location.hash || '').slice(1));
    if (!h) return;
    if (/^id=/.test(h)) { $('inList').value = h.slice(3); showTab('list'); run('list'); return; }
    var c = MC.classify(h);
    if (c.kind === 'part') { showTab('part'); $('inPart').value = h; run('part'); }
    else { $('inModel').value = h; run('model'); }
  }

  lang = pickLang();
  Promise.all([getJSON('data/models.json'), getJSON('i18n/' + lang + '.json'), getJSON('ads.json').catch(function () { return null; })])
    .then(function (res) {
      D = res[0]; T = res[1]; ADS = res[2]; IX = MC.buildIndex(D);
      bind(); applyI18n(); fromHash();
      window.__mcReady = true;
    })
    .catch(function (e) { document.body.setAttribute('data-error', String(e)); });
})();
