/* ChargeCheck UI. All judging is local. Only same-origin JSON is fetched. */
(function () {
  'use strict';
  var L = window.ChargeLogic, I = window.I18N;
  var DATA = {}, lang = 'ja', state = { devices: [], chargers: [], cables: [] }, judged = false;
  var STORE = 'chargecheck.v1';

  function $(s, el) { return (el || document).querySelector(s); }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function t(k, p) { var s = I.T[lang][k]; if (s == null) s = I.T.ja[k] || k; return I.fmt(s, p); }
  function nm(o) { return (o && (o[lang] || o.ja)) || ''; }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  function load(name) { return fetch('data/' + name, { credentials: 'same-origin' }).then(function (r) { return r.json(); }); }

  function save() { try { localStorage.setItem(STORE, JSON.stringify({ lang: lang, s: state })); } catch (e) {} }
  function restore() {
    try {
      var v = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (v) { lang = v.lang === 'en' ? 'en' : 'ja'; if (v.s) state = v.s; }
    } catch (e) {}
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'ja') lang = q;
  }

  // ---------- inputs
  var CATS = ['iphone', 'ipad', 'airpods', 'watch', 'mac'];
  function renderInputs() {
    var box = $('#devices'); box.textContent = '';
    CATS.forEach(function (cat) {
      var list = DATA.devices.filter(function (d) { return d.cat === cat; });
      var n = list.filter(function (d) { return state.devices.indexOf(d.id) >= 0; }).length;
      var det = el('details', { class: 'cat' });
      if (n) det.open = true;
      var sum = el('summary', {}, [el('span', { class: 'cat-name', text: t('cat_' + cat) }),
        el('span', { class: 'cat-count', text: n ? t('selected', { n: n }) : String(list.length) })]);
      det.appendChild(sum);
      var grid = el('div', { class: 'opts' });
      list.forEach(function (d) { grid.appendChild(opt('devices', d.id, nm(d.name), portLabel(d))); });
      det.appendChild(grid);
      box.appendChild(det);
    });
    var cb = $('#chargers'); cb.textContent = '';
    DATA.acc.chargers.forEach(function (c) { cb.appendChild(opt('chargers', c.id, nm(c.label), c.port === 'A' ? 'USB-A' : 'USB-C')); });
    var cc = $('#cables'); cc.textContent = '';
    DATA.acc.cables.forEach(function (c) { cc.appendChild(opt('cables', c.id, nm(c.label), '')); });
    updateCount();
  }
  function portLabel(d) {
    if (d.cat === 'watch') return t('port_watch');
    var p = t('port_' + d.port);
    if (d.cat === 'mac' && d.magsafe3) p += ' / MagSafe 3';
    if (d.cat === 'iphone' && d.magsafe) p += ' / MagSafe';
    return p;
  }
  function opt(group, id, label, sub) {
    var input = el('input', { type: 'checkbox', value: id, 'data-group': group, id: group + '-' + id });
    input.checked = state[group].indexOf(id) >= 0;
    input.addEventListener('change', function () {
      var arr = state[group], i = arr.indexOf(id);
      if (input.checked && i < 0) arr.push(id); else if (!input.checked && i >= 0) arr.splice(i, 1);
      save(); updateCount();
      if (judged) renderResults();
    });
    return el('label', { class: 'opt', for: group + '-' + id }, [input, el('span', { class: 'opt-text' }, [
      el('span', { class: 'opt-label', text: label }), sub ? el('span', { class: 'opt-sub', text: sub }) : null])]);
  }
  function updateCount() {
    var n = state.devices.length;
    $('#sel-count').textContent = n ? t('selected', { n: n }) : t('none_selected');
    document.querySelectorAll('details.cat').forEach(function (det, i) {
      var cat = CATS[i], list = DATA.devices.filter(function (d) { return d.cat === cat; });
      var k = list.filter(function (d) { return state.devices.indexOf(d.id) >= 0; }).length;
      det.querySelector('.cat-count').textContent = k ? t('selected', { n: k }) : String(list.length);
    });
  }

  // ---------- results
  function srcLink(sid) {
    var s = byId(DATA.sources, sid); if (!s) return null;
    var url = s.url[lang] || s.url.ja;
    return el('a', { href: url, rel: 'noopener noreferrer', target: '_blank', text: nm(s.title) });
  }
  function quoteBlock(label, q, sid) {
    if (!q) return null;
    var text = q[lang] || null, note = '';
    if (!text && lang === 'ja' && q.en) { text = q.en; note = t('quote_ja_missing'); }
    if (!text && lang === 'en' && q.ja) text = q.ja;
    if (!text) return null;
    var parts = text.split('／').map(function (x) { return x.trim(); });
    text = parts[0] + (parts.length > 1 ? '\n・' + parts.slice(1).join('\n・') : '');
    var bq = el('blockquote', { class: 'quote' }, [el('span', { class: 'q-label', text: label + (note ? ' ' + note : '') }), el('span', { class: 'q-text', text: text })]);
    if (sid) { var a = srcLink(sid); if (a) bq.appendChild(el('span', { class: 'q-src' }, ['— ', a])); }
    return bq;
  }
  function chosen(group, list) { return state[group].map(function (id) { return byId(list, id); }).filter(Boolean); }

  function renderResults() {
    var out = $('#results'); out.textContent = '';
    var devs = chosen('devices', DATA.devices), chs = chosen('chargers', DATA.acc.chargers), cbs = chosen('cables', DATA.acc.cables);
    $('#result-sec').hidden = false;
    if (!devs.length) { out.appendChild(el('p', { class: 'muted', text: t('need_select') })); $('#suggest').hidden = true; renderAds(false); return; }
    var results = devs.map(function (d) { return L.judge(d, chs, cbs); });
    devs.forEach(function (d, i) { out.appendChild(card(d, results[i])); });
    renderSuggest(devs, results, cbs);
    renderAds(true);
  }

  function card(d, r) {
    var c = el('article', { class: 'card st-' + r.status, 'data-device': d.id, 'data-status': r.status });
    c.appendChild(el('div', { class: 'card-head' }, [el('h3', { text: nm(d.name) }), el('span', { class: 'badge b-' + r.status, text: t('status_' + r.status) })]));
    if (r.charger) {
      var ch = byId(DATA.acc.chargers, r.charger), cb = byId(DATA.acc.cables, r.cable);
      c.appendChild(el('p', { class: 'combo' }, [el('span', { class: 'combo-label', text: t('best_combo') + '：' }), nm(ch.label) + ' ＋ ' + nm(cb.label)]));
    }
    var ul = el('ul', { class: 'reasons' });
    r.reasons.forEach(function (x) {
      var p = Object.assign({}, x.params);
      if (p.cables) p.cables = p.cables.map(function (id) { return nm(byId(DATA.acc.cables, id).label); }).join(lang === 'ja' ? '、' : ', ');
      if (p.port) p.port = p.port === 'A' ? 'USB-A' : p.port === 'C' ? 'USB-C' : t('port_' + p.port);
      if (p.hosts) p.hosts = p.hosts.split('/').map(function (h) { return 'USB-' + h; }).join('/');
      ul.appendChild(el('li', { text: t('r_' + x.key, p) }));
    });
    c.appendChild(ul);
    var det = el('details', { class: 'evidence' }, [el('summary', { text: t('official') + ' / ' + t('sources') })]);
    var shown = {};
    (r.rules || []).forEach(function (rid) {
      var rule = byId(DATA.rules, rid); if (!rule || shown[rid]) return; shown[rid] = 1;
      var b = quoteBlock(t('official'), rule.quote, rule.source); if (b) det.appendChild(b);
    });
    var specSrc = d.sources[0];
    if (d.cat === 'mac') {
      det.appendChild(quoteBlock(t('official'), d.specQuote, 'mac_adapter') || el('span'));
      if (d.fastQuote && d.fastQuote.ja) det.appendChild(quoteBlock(t('official'), d.fastQuote, 'mac_fast'));
    } else {
      var lab = (d.cat === 'iphone' || d.cat === 'ipad' || d.id === 'airpods-max-2') ? t('spec') : t('official');
      var sq = quoteBlock(lab, d.specQuote, d.cat === 'watch' ? 'watch_fast' : specSrc); if (sq) det.appendChild(sq);
      if (d.magsafe && d.magsafe.specQuote) { var mq = quoteBlock(t('spec'), d.magsafe.specQuote, specSrc); if (mq) det.appendChild(mq); }
    }
    if (d.bundled) det.appendChild(el('p', { class: 'small', text: nm(d.bundled) }));
    var srcs = el('p', { class: 'small srcs' }, [t('sources') + '：']);
    d.sources.forEach(function (sid, i) { var a = srcLink(sid); if (a) { if (i) srcs.appendChild(document.createTextNode(' / ')); srcs.appendChild(a); } });
    det.appendChild(srcs);
    c.appendChild(det);
    return c;
  }

  function renderSuggest(devs, results, cbs) {
    var s = L.suggest(devs, results, cbs), box = $('#suggest-body'); box.textContent = '';
    $('#suggest').hidden = false;
    var lead = s.allFast ? 's_allfast' : s.allCharge ? 's_allcharge' : 's_some_no';
    box.appendChild(el('p', { class: 'sg-lead', text: t(lead) }));
    if (!s.allFast) {
      var ul = el('ul', { class: 'sg' });
      var names = s.single.drivers.map(function (id) { return nm(byId(DATA.devices, id).name); }).join(lang === 'ja' ? '、' : ', ');
      ul.appendChild(el('li', {}, [el('strong', { text: t('s_single', { w: s.single.w }) }), s.single.avs ? el('span', { class: 'small block', text: t('s_single_avs') }) : null,
        el('span', { class: 'small block', text: t('s_driver', { names: names }) })]));
      if (devs.length > 1) ul.appendChild(el('li', {}, [el('strong', { text: t('s_multi', { ports: s.multi.ports, sum: s.multi.sum }) }), el('span', { class: 'small block', text: t('s_multi_note') })]));
      box.appendChild(ul);
      if (s.cableNeeds.length) {
        box.appendChild(el('h3', { class: 'h-small', text: t('s_cables') }));
        var cl = el('ul', { class: 'sg' });
        s.cableNeeds.forEach(function (x) { cl.appendChild(el('li', { text: t('s_cable_item', { device: nm(byId(DATA.devices, x.device).name), cable: nm(byId(DATA.acc.cables, x.cable).label) }) })); });
        box.appendChild(cl);
      }
    }
    box.appendChild(el('p', { class: 'small muted', text: t('s_generic') }));
  }

  // ---------- ads (ads.json; hidden when empty)
  function validAd(a) { return a && /^https:\/\//.test(a.href || '') && /^https:\/\//.test(a.img || ''); }
  function adNode(a) {
    var img = el('img', { src: a.img, alt: a.alt || '', width: a.imgW || '', height: a.imgH || '', loading: 'lazy' });
    var link = el('a', { href: a.href, rel: 'sponsored noopener', target: '_blank', class: 'ad-link' }, [img]);
    var wrap = el('div', { class: 'ad-item' }, [link]);
    if (/^https:\/\//.test(a.pixel || '')) wrap.appendChild(el('img', { src: a.pixel, alt: '', width: '1', height: '1', class: 'ad-pixel' }));
    return wrap;
  }
  function labels() { return el('div', { class: 'ad-labels' }, [el('span', { class: 'ad-tag', text: t('ad_label') }), el('span', { class: 'ad-tag', text: t('pr_label') })]); }
  function renderAds(show) {
    var sec = $('#ad-inline'); sec.textContent = ''; sec.hidden = true;
    var items = (DATA.ads && DATA.ads.inline && DATA.ads.inline.items || []).filter(validAd);
    if (!show || !items.length) return;
    sec.appendChild(labels());
    sec.appendChild(el('p', { class: 'ad-title', text: t('ad_box_title') }));
    items.forEach(function (a) { sec.appendChild(adNode(a)); });
    sec.hidden = false;
  }
  function maybeInterstitial() {
    var items = (DATA.ads && DATA.ads.interstitial && DATA.ads.interstitial.items || []).filter(validAd);
    if (!items.length) return;
    var today = new Date().toISOString().slice(0, 10), k = 'chargecheck.ad.day';
    try { if (localStorage.getItem(k) === today) return; localStorage.setItem(k, today); } catch (e) { return; }
    var dlg = $('#ad-full'), body = $('#ad-full-body'); body.textContent = '';
    body.appendChild(labels()); body.appendChild(adNode(items[0]));
    dlg.hidden = false; $('#ad-close').focus();
  }
  function closeInterstitial() { $('#ad-full').hidden = true; }

  // ---------- safety & sources
  function renderSafety() {
    var b = $('#safety-body'); b.textContent = '';
    function q(rid) { var r = byId(DATA.rules, rid); return r ? quoteBlock(t('official'), r.quote, r.source) : null; }
    b.appendChild(el('p', { text: t('safety_mfi') }));
    [q('mfi'), q('mfi_risk'), q('third_party')].forEach(function (x) { if (x) b.appendChild(x); });
    b.appendChild(el('h3', { class: 'h-small', text: t('safety_heat') }));
    b.appendChild(el('p', { text: t('safety_heat_text') }));
    [q('heat_charge'), q('heat_action'), q('iphone_temp')].forEach(function (x) { if (x) b.appendChild(x); });
    b.appendChild(el('h3', { class: 'h-small', text: t('safety_wet') }));
    [q('wet'), q('vent'), q('ipad_heat')].forEach(function (x) { if (x) b.appendChild(x); });
    var sl = $('#sources-list'); sl.textContent = '';
    DATA.sources.forEach(function (s) { var a = srcLink(s.id); if (a) sl.appendChild(el('li', {}, [a])); });
    $('#checked').textContent = t('checked', { d: DATA.devicesMeta.checked });
  }

  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (n) { n.textContent = t(n.getAttribute('data-i18n'), { n: DATA.devices.length }); });
    document.title = t('title');
    renderInputs(); renderSafety();
    if (judged) renderResults();
  }

  function init() {
    restore();
    Promise.all([load('devices.json'), load('accessories.json'), load('sources.json'), load('rules.json'),
      fetch('ads.json', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })])
      .then(function (v) {
        DATA.devices = v[0].devices; DATA.devicesMeta = v[0]; DATA.acc = v[1]; DATA.sources = v[2].sources; DATA.rules = v[3].rules; DATA.ads = v[4];
        ['devices', 'chargers', 'cables'].forEach(function (g) { if (!Array.isArray(state[g])) state[g] = []; });
        applyLang();
        $('#lang').addEventListener('click', function () { lang = lang === 'ja' ? 'en' : 'ja'; save(); applyLang(); });
        $('#judge').addEventListener('click', function () { judged = true; renderResults(); $('#result-sec').scrollIntoView({ behavior: 'smooth' }); maybeInterstitial(); });
        $('#reset').addEventListener('click', function () { state = { devices: [], chargers: [], cables: [] }; save(); renderInputs(); if (judged) renderResults(); });
        $('#clear').addEventListener('click', function () { try { localStorage.removeItem(STORE); } catch (e) {} state = { devices: [], chargers: [], cables: [] }; renderInputs(); });
        $('#ad-close').addEventListener('click', closeInterstitial);
        $('#ad-full').addEventListener('click', function (e) { if (e.target.id === 'ad-full') closeInterstitial(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeInterstitial(); });
        document.body.setAttribute('data-ready', '1');
      });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
