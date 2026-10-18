(function () {
  'use strict';
  var ML = window.ML, D = ML.data;
  var KEY = 'movelist_v1';
  var form = document.getElementById('form');
  var params = new URLSearchParams(location.search);
  var TEST = params.get('t');           // テスト用：入力をURLで渡す（保存しない）
  var done = {};
  var current = [];

  /* ---------- 保存（端末内のみ） ---------- */
  function save(s) {
    if (TEST) return;
    try { localStorage.setItem(KEY, JSON.stringify({ s: s, done: done })); } catch (e) { }
  }
  function restore() {
    try { var j = JSON.parse(localStorage.getItem(KEY) || 'null'); return j && typeof j === 'object' ? j : null; } catch (e) { return null; }
  }

  /* ---------- フォーム ⇔ 状態 ---------- */
  function readForm() {
    var f = form.elements;
    function radio(n) { var el = form.querySelector('input[name="' + n + '"]:checked'); return el ? el.value : ''; }
    return {
      date: f.date.value, type: radio('type'), cur: radio('cur'), next: radio('next'), family: radio('family'),
      mynum: f.mynum.checked, license: f.license.checked, car: f.car.checked, bike: f.bike.checked, dog: f.dog.checked,
      uses: { elec: f.u_elec.checked, gas: f.u_gas.checked, water: f.u_water.checked, net: f.u_net.checked, nhk: f.u_nhk.checked, paper: f.u_paper.checked, post: f.u_post.checked }
    };
  }
  function writeForm(s) {
    var f = form.elements;
    if (s.date) f.date.value = s.date;
    ['type', 'cur', 'next', 'family'].forEach(function (n) {
      var el = form.querySelector('input[name="' + n + '"][value="' + s[n] + '"]'); if (el) el.checked = true;
    });
    ['mynum', 'license', 'car', 'bike', 'dog'].forEach(function (n) { if (typeof s[n] === 'boolean') f[n].checked = s[n]; });
    if (s.uses) Object.keys(s.uses).forEach(function (k) { if (f['u_' + k]) f['u_' + k].checked = !!s.uses[k]; });
  }

  /* ---------- 表示 ---------- */
  function fmt(ymd) { var p = ymd.split('-'); return (+p[1]) + '/' + (+p[2]) + '(' + D.weekday(ymd) + ')'; }
  function todayYMD() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var BADGE = { law: '法定期限', soft: '法令は日数なし', guide: '目安' };

  function render() {
    var s = readForm();
    save(s);
    var abroad = s.type === 'abroad', hasDate = !!D.parseYMD(s.date);
    document.getElementById('abroadMsg').hidden = !abroad;
    document.getElementById('needDate').hidden = abroad || hasDate;
    var result = document.getElementById('result');
    result.hidden = abroad || !hasDate;
    current = D.build(s);
    var root = document.getElementById('groups');
    root.textContent = '';
    if (result.hidden) { dumpTest(s); return; }

    var today = todayYMD();
    var nLaw = current.filter(function (x) { return x.kind === 'law'; }).length;
    document.getElementById('summary').textContent = '引越し日 ' + s.date.replace(/-/g, '/') + '（' + D.weekday(s.date) + '）｜全' + current.length + '項目（うち法定期限 ' + nLaw + '件）';

    D.GROUPS.forEach(function (g) {
      var items = current.filter(function (x) { return x.group === g.id; });
      if (!items.length) return;
      var sec = el('section', 'group card');
      sec.id = 'grp-' + g.id;
      var h = el('h3', 'group-title');
      h.appendChild(el('span', '', g.label));
      var dates = items.map(function (x) { return x.date; }).sort();
      h.appendChild(el('span', 'group-dates', dates[0] === dates[dates.length - 1] ? fmt(dates[0]) : fmt(dates[0]) + '〜' + fmt(dates[dates.length - 1])));
      sec.appendChild(h);
      var ul = el('ul', 'items');
      items.forEach(function (it) {
        var li = el('li', 'item kind-' + it.kind + (done[it.id] ? ' done' : ''));
        var lab = el('label', 'item-main');
        var cb = el('input'); cb.type = 'checkbox'; cb.checked = !!done[it.id]; cb.dataset.id = it.id;
        cb.addEventListener('change', function () { if (cb.checked) done[it.id] = true; else delete done[it.id]; li.classList.toggle('done', cb.checked); save(readForm()); });
        lab.appendChild(cb);
        lab.appendChild(el('span', 'item-title', it.title));
        li.appendChild(lab);
        var meta = el('div', 'item-meta');
        meta.appendChild(el('span', 'badge ' + it.kind, BADGE[it.kind]));
        meta.appendChild(el('span', 'item-date', fmt(it.date) + (it.kind === 'law' ? ' まで' : ' ごろ')));
        if (it.date < today) meta.appendChild(el('span', 'late', '日付を過ぎています'));
        li.appendChild(meta);
        if (it.due) li.appendChild(el('p', 'item-due', '期限：' + it.due));
        if (it.detail) li.appendChild(el('p', 'item-detail', it.detail));
        if (it.basis.length) {
          var src = el('ul', 'basis');
          it.basis.forEach(function (b) {
            var bl = el('li'); var a = el('a', '', b.label); a.href = b.url; a.target = '_blank'; a.rel = 'noopener';
            bl.appendChild(a); src.appendChild(bl);
          });
          li.appendChild(src);
        }
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      root.appendChild(sec);
      var ad = ML.ads.slot(g.id);
      if (ad) root.appendChild(ad);
    });
    dumpTest(s);
  }

  /* ---------- .ics ---------- */
  function icsEscape(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(line) {
    // 1行75オクテット以内（RFC 5545 3.1）。マルチバイト文字の途中では切らない
    var out = [], cur = '', bytes = 0, limit = 75;
    for (var ch of line) {
      var b = new TextEncoder().encode(ch).length;
      if (bytes + b > limit) { out.push(cur); cur = ' '; bytes = 1; limit = 75; }
      cur += ch; bytes += b;
    }
    out.push(cur);
    return out.join('\r\n');
  }
  function stamp() { return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function buildIcs(items, s) {
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MoveList//Hikkoshi Yarukoto List//JA', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEscape('引越しやることリスト')];
    var now = stamp();
    items.forEach(function (it) {
      var desc = (it.kind === 'law' ? '法定期限' : it.kind === 'soft' ? '法令上の義務（日数の定めなし）／日付は目安' : '目安の日付') + '\n'
        + (it.due ? '期限：' + it.due + '\n' : '') + it.detail
        + (it.basis.length ? '\n\n出典：\n' + it.basis.map(function (b) { return b.label + ' ' + b.url; }).join('\n') : '');
      L.push('BEGIN:VEVENT');
      L.push('UID:' + it.id + '-' + s.date.replace(/-/g, '') + '@movelist');
      L.push('DTSTAMP:' + now);
      L.push('DTSTART;VALUE=DATE:' + it.date.replace(/-/g, ''));
      L.push('DTEND;VALUE=DATE:' + D.addDays(it.date, 1).replace(/-/g, ''));
      L.push('SUMMARY:' + icsEscape('【' + BADGE[it.kind] + '】' + it.title));
      L.push('DESCRIPTION:' + icsEscape(desc));
      L.push('TRANSP:TRANSPARENT');
      L.push('END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }
  function downloadIcs() {
    var s = readForm();
    if (!current.length) return;
    var blob = new Blob([buildIcs(current, s)], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hikkoshi-yarukoto-' + s.date + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  /* ---------- テスト出力 ---------- */
  function dumpTest(s) {
    if (!TEST) return;
    var out = document.getElementById('testOut');
    out.textContent = JSON.stringify({
      items: current.map(function (x) { return { id: x.id, date: x.date, kind: x.kind, group: x.group }; }),
      shown: !document.getElementById('result').hidden, abroad: !document.getElementById('abroadMsg').hidden,
      ics: current.length ? buildIcs(current, s) : ''
    });
    document.documentElement.setAttribute('data-test-ready', '1');
  }

  /* ---------- 起動 ---------- */
  var saved = TEST ? null : restore();
  if (TEST) {
    try { writeForm(JSON.parse(decodeURIComponent(escape(atob(TEST.replace(/-/g, '+').replace(/_/g, '/')))))); } catch (e) { }
  } else if (saved && saved.s) {
    writeForm(saved.s); done = saved.done || {};
  }
  form.addEventListener('change', render);
  form.addEventListener('input', function (e) { if (e.target.type === 'date') render(); });
  document.getElementById('btnIcs').addEventListener('click', downloadIcs);
  document.getElementById('btnPrint').addEventListener('click', function () { window.print(); });
  document.getElementById('btnReset').addEventListener('click', function () {
    if (!Object.keys(done).length) return;
    if (window.confirm('チェックを全部外しますか？')) { done = {}; render(); }
  });
  ML.ads.load().then(function () {
    render();
    if (!TEST) ML.ads.interstitial();
    var sc = params.get('scroll');
    if (sc) { var t = document.getElementById(sc); if (t) t.scrollIntoView(); }
  });
  render();
})();
