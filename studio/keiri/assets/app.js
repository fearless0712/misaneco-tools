/* 経理・事務スタジオ：画面の部分。計算は logic.js（既存ツールと同じルール）、見本は data.js。
   データは localStorage だけに保存（外部送信なし）。動きは requestAnimationFrame（30コマ/秒まで、見えないときは止める）。
   ?demo=1 … 銀行明細の取り込み→仕訳が自動で付く→請求書を作る→入金を照合→未入金が減る→月次まとめ を自動で操作（保存しない）
   ?capture=1 … 時計を外から進める（window.__studio.advance(ms)）。録画でコマ落ちしないように
   ?today=2026-10-22 … 「今日」を固定（見本・録画用） */
(function () {
  'use strict';
  var K = window.KL, DATA = window.KDATA;
  var Q = new URLSearchParams(location.search);
  var DEMO = Q.get('demo') === '1', CAPTURE = Q.get('capture') === '1';
  var KEY = 'keiri-studio-v1';
  var TODAY = K.D(Q.get('today')) || K.todayN();
  var MK = K.ym(TODAY);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var yen = K.yen, pct = K.pct, n0 = K.n0, has = K.has, D = K.D;

  // ================= 保存 =================
  var S, storageOk = true;
  function blankDraft() { return { partner: '', hon: '御中', issue: K.iso(TODAY), items: [{ date: K.iso(TODAY), item: '', qty: '', unit: '式', price: '', rate: 10 }, { date: K.iso(TODAY), item: '', qty: '', unit: '', price: '', rate: 10 }] }; }
  function fresh() { var o = DATA.sample(TODAY); o.draft = blankDraft(); return o; }
  function load() {
    if (DEMO) return fresh();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw); if (o && o.v === 1 && o.company && o.tx && o.invoices) { if (!o.draft) o.draft = blankDraft(); return o; } }
    } catch (e) { storageOk = false; }
    return fresh();
  }
  function save() {
    if (DEMO) return;
    try { localStorage.setItem(KEY, JSON.stringify(S)); storageOk = true; }
    catch (e) { storageOk = false; }
    showWarn();
  }
  function showWarn() {
    var w = $('#warn'), msg = [];
    if (!DEMO && !storageOk) msg.push('このブラウザでは保存できません（プライベートモードなど）。ページを閉じると入力は消えます。');
    w.hidden = !msg.length; w.textContent = msg.join(' ');
  }
  function uid(p) { S.seq = (S.seq || 1000) + 1; return p + S.seq; }
  function log(msg) { S.log.unshift({ t: K.iso(TODAY), msg: msg }); S.log = S.log.slice(0, 30); }

  // ================= 時計・動き =================
  var vt = 0;
  function now() { return CAPTURE ? vt : performance.now(); }
  var tweens = [], timers = [], running = false, lastTs = -1, demoOn = false;
  function ease(p) { return 1 - Math.pow(1 - p, 3); }
  function easeIO(p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function tween(dur, fn, done, ez) { var t = { t0: now(), dur: dur, fn: fn, done: done, ez: ez || ease }; tweens.push(t); fn(0); kick(); return t; }
  function wait(ms) { return new Promise(function (res) { timers.push({ at: now() + ms, res: res }); kick(); }); }
  function needLoop() { return tweens.length || timers.length || demoOn || (view === 'dash' && flowEls); }
  function frame() {
    var t = now();
    var ts = tweens.slice(); tweens = [];
    ts.forEach(function (x) { var p = Math.min(1, (t - x.t0) / x.dur); x.fn(x.ez(p)); if (p < 1) tweens.push(x); else if (x.done) x.done(); });
    var due = timers.filter(function (x) { return x.at <= t; }); timers = timers.filter(function (x) { return x.at > t; });
    due.forEach(function (x) { x.res(); });
    if (view === 'dash') drawFlow(t);
  }
  function loop(ts) {
    if (!running) return;
    if (document.hidden) { running = false; return; }
    if (lastTs < 0 || ts - lastTs >= 33) { lastTs = ts; frame(); }   // 30コマ/秒まで
    if (needLoop()) requestAnimationFrame(loop); else running = false;
  }
  function kick() { if (CAPTURE || running || document.hidden) return; running = true; lastTs = -1; requestAnimationFrame(loop); }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  window.__studio = {
    advance: function (ms) { vt += ms; frame(); return new Promise(function (r) { setTimeout(r, 0); }); },
    ready: null, demoDone: false,
    state: function () { return JSON.parse(JSON.stringify(S)); }, view: function () { return view; }
  };

  // 数字のカウントアップ・バーの伸び（前の値から新しい値へ）
  var shown = {};
  var FMT = { yen: function (v) { return yen(v); }, pct: function (v) { return pct(v); }, n: function (v) { return K.num(v); }, hm: function (v) { return K.hm(Math.round(v)); } };
  function animate(root) {
    $$('[data-k]', root).forEach(function (el) {
      var k = el.getAttribute('data-k'), v = parseFloat(el.getAttribute('data-v')), f = FMT[el.getAttribute('data-f') || 'yen'];
      if (isNaN(v)) { el.textContent = '—'; return; }
      var from = shown.hasOwnProperty(k) ? shown[k] : 0; shown[k] = v;
      if (from === v) { el.textContent = f(v); return; }
      tween(1100, function (p) { el.textContent = f(from + (v - from) * p); });
    });
    $$('[data-w]', root).forEach(function (el) {
      var k = 'w:' + el.getAttribute('data-wk'), v = Math.max(0, Math.min(1, parseFloat(el.getAttribute('data-w')) || 0));
      var from = shown.hasOwnProperty(k) ? shown[k] : 0; shown[k] = v;
      tween(1100, function (p) { el.style.width = ((from + (v - from) * p) * 100).toFixed(2) + '%'; });
    });
    $$('[data-h]', root).forEach(function (el) {
      var k = 'h:' + el.getAttribute('data-hk'), v = Math.max(0, Math.min(1, parseFloat(el.getAttribute('data-h')) || 0));
      var from = shown.hasOwnProperty(k) ? shown[k] : 0; shown[k] = v;
      tween(1200, function (p) { el.style.height = ((from + (v - from) * p) * 100).toFixed(2) + '%'; });
    });
    $$('[data-arc]', root).forEach(function (el) {
      var k = 'a:' + el.getAttribute('data-ak'), v = Math.max(0, Math.min(1, parseFloat(el.getAttribute('data-arc')) || 0)), L = parseFloat(el.getAttribute('data-len'));
      var from = shown.hasOwnProperty(k) ? shown[k] : 0; shown[k] = v;
      tween(1100, function (p) { var x = from + (v - from) * p; el.setAttribute('stroke-dasharray', (x * L).toFixed(1) + ' ' + L.toFixed(1)); });
    });
  }
  function cnt(k, v, f, cls) { return '<span class="' + (cls || '') + '" data-k="' + esc(k) + '" data-v="' + (v === null || v === undefined || v === '' ? 'x' : v) + '" data-f="' + (f || 'yen') + '"></span>'; }
  function toast(msg) {
    var el = $('#toast'); el.textContent = msg;
    tween(2600, function (p) { el.style.opacity = p < .1 ? p * 10 : (p > .85 ? (1 - p) / .15 : 1); }, null, function (p) { return p; });
  }
  function fld(lab, input, cls) { return '<label class="f' + (cls ? ' ' + cls : '') + '">' + lab + input + '</label>'; }
  function opts(list, cur) { return list.map(function (x) { var v = typeof x === 'object' ? x[0] : x, t = typeof x === 'object' ? x[1] : x; return '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join(''); }
  function kpi(lab, valHtml, cls, sub, wk, w, sparkCls) {
    return '<div class="panel kpi"><div class="lab">' + lab + '</div><div class="val ' + (cls || '') + '">' + valHtml + '</div><div class="sub">' + sub + '</div><div class="spark ' + (sparkCls || '') + '"><i data-w="' + (w || 0) + '" data-wk="' + wk + '"></i></div></div>';
  }
  var PILL = { '入金済み': 'ok', '手数料差引': 'ok', '要確認': 'warn', '未入金': 'info', '期日超過': 'bad', '未分類': 'bad', '照合の候補': 'info', '注意': 'warn' };
  function pill(st) { return st ? '<span class="pill ' + (PILL[st] || 'mut') + '">' + esc(st) + '</span>' : ''; }
  function sgn(x) { return (x > 0 ? '+' : '') + K.num(x); }
  function dlt(cur, prev, costUp) { if (!prev) return '<span class="delta">—</span>'; var r = (cur - prev) / Math.abs(prev); return '<span class="delta ' + (costUp ? (r > 0 ? 'up' : 'dn') : (r >= 0 ? 'sup' : 'sdn')) + '">' + (r > 0 ? '+' : '') + pct(r) + '</span>'; }

  // ================= 集計（アプリ全体） =================
  var C = function () { return S.company; };
  function rules() { return K.parseRules(C().rules); }
  function invCalc(v) { return K.invCalc(v, { taxin: v.taxin, round: v.round }); }
  function invTotal(v) { return invCalc(v).total; }
  function txById(id) { return S.tx.filter(function (e) { return e.id === id; })[0]; }
  function invById(id) { return S.invoices.filter(function (v) { return v.id === id; })[0]; }
  function isPaid(v) { return K.paidDone(v); }
  function eligibleDeps() { return S.tx.filter(function (e) { return e.dir === 'in' && e.src === '普通預金' && !(e.inv && e.inv.length) && e.acc === '売上高'; }); }
  function recon() {
    var invs = S.invoices.filter(function (v) { return !v.paid; }).map(function (v) { return { id: v.id, no: v.no, partner: v.partner, amount: invTotal(v), date: D(v.issue), due: D(v.due), ref: v }; });
    var deps = eligibleDeps().map(function (e) { return { id: e.id, date: D(e.date), desc: e.name, amount: e.amt, ref: e }; });
    return K.match(invs, deps, { feeMax: n0(C().feeMax), today: TODAY, nameMap: K.parseNameMap(C().namemap) });
  }
  function invStatus(v) { if (v.paid) return v.paid.status; return K.invLate(v, TODAY) ? '期日超過' : '未入金'; }
  function isLate(v) { return K.invLate(v, TODAY); } // 未入金・要確認で期日を過ぎた
  function statusPills(v) { var s = invStatus(v); return pill(s) + (s === '要確認' && isLate(v) ? ' ' + pill('期日超過') : ''); }
  function remainOf(v) { return K.invRemain(v, invTotal(v)); }
  // 未入金：入金済み・手数料差引でない請求書。要確認（入金が足りない）は残り＝請求額−入金額で数え、期日を過ぎていれば期日超過にも入れる
  function unpaid() { return K.openInvoices(S.invoices, invTotal, TODAY); }
  function months6() { var out = []; for (var i = 5; i >= 0; i--) out.push(K.ym(K.addMonths(TODAY, -i))); return out; }
  var _sd = null;
  function SD() { if (!_sd) _sd = K.sumData(S.tx, months6().concat([K.ym(K.addMonths(TODAY, -6))])); return _sd; }
  function monthStat(m) {
    var sd = SD(), inv = S.invoices.filter(function (v) { return K.ym(D(v.issue)) === m; });
    var sales = inv.reduce(function (a, v) { return a + invTotal(v); }, 0);
    var exp = 0, by = {};
    if (sd.M['売上高'].hasOwnProperty(m)) K.EXP.forEach(function (a) { var x = sd.M[a][m] || 0; if (x) { by[a] = x; exp += x; } });
    var cash = sd.M['売上高'].hasOwnProperty(m) ? sd.M['売上高'][m] : 0;
    return { m: m, sales: sales, n: inv.length, exp: exp, by: by, profit: sales - exp, cash: cash };
  }
  function monthTx(m) { return S.tx.filter(function (e) { return K.ym(D(e.date)) === m; }); }
  function kintaiRes() {
    var c = C();
    return K.kintai(S.kintai.filter(function (r) { return K.ym(D(r.date)) === MK; }).map(function (r) { return { id: r.id, who: r.no + ' ' + r.name, date: r.date, s: r.s, e: r.e, brk: r.brk }; }),
      { day: c.kday, week: c.kweek, ws: c.kws, hol: c.khol, brk: c.kbrk, ot: c.kot, extra: c.kextra });
  }
  function closeOf(m) { return S.close[m] || (S.close[m] = {}); }
  function steps(m) {
    var tx = monthTx(m), cl = S.close[m] || {};
    var bankIn = tx.some(function (e) { return e.src === '普通預金'; });
    var bad = tx.filter(function (e) { return K.state(e); }).length;
    var inv = S.invoices.filter(function (v) { return K.ym(D(v.issue)) === m; });
    var invOk = inv.length > 0 && inv.every(function (v) { return K.invChecks(v, invCalc(v), C()).every(function (x) { return x.ok; }); });
    var wait2 = eligibleDeps().filter(function (e) { return K.ym(D(e.date)) === m; }).length;
    return [
      { k: 'imp', t: '明細の取り込み', s: bankIn ? '銀行・カード' : '銀行の明細がまだ', ok: bankIn },
      { k: 'jr', t: '仕訳（未分類・要確認なし）', s: bad ? '残り ' + bad + '行' : tx.length + '行', ok: tx.length > 0 && !bad },
      { k: 'inv', t: '請求書（記載事項6つ）', s: inv.length + '枚', ok: invOk },
      { k: 'rec', t: '入金の照合', s: wait2 ? '待ち ' + wait2 + '件' : '待ちなし', ok: bankIn && !wait2 },
      { k: 'kin', t: '勤怠の締め', s: cl.kintai ? '締めた' : 'まだ', ok: !!cl.kintai },
      { k: 'mon', t: '月次まとめの確認', s: cl.mon ? '確認した' : 'まだ', ok: !!cl.mon }
    ];
  }

  // ================= 画面の切りかえ =================
  var view = 'dash';
  var TITLES = { dash: 'ダッシュボード', imp: '明細の取り込みと仕訳', inv: '請求書', rec: '入金の照合', kin: '勤怠の集計', mon: '月次まとめ', set: '設定' };
  var RENDER = {};
  function go(v) {
    view = v;
    $$('#nav button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-view') === v); });
    $$('.view').forEach(function (s) { s.classList.toggle('on', s.id === 'v-' + v); });
    $('#viewTitle').textContent = TITLES[v];
    $('#main').scrollTop = 0;
    render();
    var nb = $('#nav button[data-view="' + v + '"]'); if (nb && window.innerWidth <= 760) { var nav = $('#nav'); nav.scrollLeft = Math.max(0, nb.offsetLeft - 60); }
  }
  function render() { _sd = null; RENDER[view](); kick(); }
  function commit() { save(); render(); }

  // ================= 1) ダッシュボード =================
  var flowEls = null;
  var FLOW_X = [40, 160, 280, 400, 520];
  RENDER.dash = function () {
    var el = $('#v-dash'), ms = months6(), st = ms.map(monthStat), cur = st[5], prev = st[4], up = unpaid();
    var tx = monthTx(MK), auto = tx.filter(function (e) { return !e.manual && !K.state(e); }).length, okN = tx.filter(function (e) { return !K.state(e); }).length;
    var paidN = S.invoices.filter(function (v) { return v.paid && K.ym(D(v.paid.date)) === MK; }).length;
    var sp = steps(MK), done = sp.filter(function (x) { return x.ok; }).length;
    var h = '<div class="grid g4">';
    h += kpi('今月の売上（請求書・税込）', cnt('d-s', cur.sales), '', '請求書 ' + cur.n + '枚・前月 ' + yen(prev.sales), 'k-s', Math.min(1, cur.sales / Math.max(1, prev.sales)));
    h += kpi('今月の経費（事業分・税込）', cnt('d-e', cur.exp), 'st', '前月比 ' + dlt(cur.exp, prev.exp, true) + '・前月 ' + yen(prev.exp), 'k-e', Math.min(1, cur.exp / Math.max(1, prev.exp)), 'st');
    h += kpi('今月の利益（目安）', cnt('d-p', cur.profit), cur.profit < 0 ? 'rd' : 'gr', '利益率 ' + (cur.sales ? pct(cur.profit / cur.sales) : '—') + '・売上−経費', 'k-p', cur.sales ? Math.max(0, cur.profit / cur.sales) : 0);
    h += kpi('未入金', cnt('d-u', up.sum), up.late.length ? 'rd' : '', up.list.length + '件' + (up.late.length ? '・<span class="bad">期日超過 ' + up.late.length + '件 ' + yen(up.lateSum) + '</span>' : ''), 'k-u', Math.min(1, up.sum / Math.max(1, up.sum + cur.sales)));
    h += '</div>';
    var flow = [
      { lab: '明細の取り込み', k: 'f-1', v: tx.length, f: 'n', u: '行' }, { lab: '仕訳', k: 'f-2', v: tx.length ? Math.round(okN / tx.length * 100) : 0, f: 'n', u: '%済' },
      { lab: '請求書', k: 'f-3', v: cur.n, f: 'n', u: '枚' }, { lab: '入金の照合', k: 'f-4', v: paidN, f: 'n', u: '件' }, { lab: '月次まとめ', k: 'f-5', v: cur.profit, f: 'yen', u: '' }
    ];
    h += '<div class="panel flow mt"><div class="ph"><h2><b>FLOW</b>明細の取り込み → 仕訳 → 請求書 → 入金の照合 → 月次まとめ</h2><span class="tag">' + K.ymd(TODAY).m + '月</span></div>';
    h += '<svg viewBox="0 0 560 96" id="flowSvg" role="img" aria-label="明細の取り込みから月次まとめまでのつながり">';
    h += '<defs><linearGradient id="fl" x1="0" x2="1"><stop offset="0" stop-color="#5fd3b0"/><stop offset="1" stop-color="#f0b54a"/></linearGradient></defs>';
    h += '<line x1="40" y1="34" x2="520" y2="34" stroke="#1f2c41" stroke-width="6" stroke-linecap="round"/>';
    h += '<line x1="40" y1="34" x2="520" y2="34" stroke="url(#fl)" stroke-width="2" stroke-linecap="round" opacity=".9"/>';
    for (var j = 0; j < 9; j++) h += '<circle class="fd" r="2.6" cy="34" cx="40" fill="#fff"/><circle class="fh" r="7" cy="34" cx="40" fill="#5fd3b0" opacity=".22"/>';
    flow.forEach(function (f, i) {
      var x = FLOW_X[i];
      h += '<circle class="fn" cx="' + x + '" cy="34" r="13" fill="#070b14" stroke="' + (i < 3 ? '#5fd3b0' : '#f0b54a') + '" stroke-width="2"/>';
      h += '<circle class="fr" cx="' + x + '" cy="34" r="13" fill="none" stroke="#fff" stroke-width="1.5" opacity="0"/>';
      h += '<text x="' + x + '" y="38" text-anchor="middle" font-family="JetBrains Mono" font-size="11" fill="#fff">' + (i + 1) + '</text>';
      h += '<text class="nlab" x="' + x + '" y="66" text-anchor="middle">' + f.lab + '</text>';
      h += '<text class="ncnt" x="' + x + '" y="84" text-anchor="middle"><tspan data-k="' + f.k + '" data-v="' + f.v + '" data-f="' + f.f + '"></tspan>' + f.u + '</text>';
    });
    h += '</svg></div>';
    // グラフと締め作業
    var mx = Math.max.apply(null, st.map(function (m) { return Math.max(m.sales, m.exp); }).concat([1]));
    h += '<div class="grid g32 mt">';
    h += '<div class="panel"><div class="ph"><h2><b>01</b>売上と経費（6か月）</h2><div class="legend"><span><i style="background:#5fd3b0"></i>売上</span><span><i style="background:#f0b54a"></i>経費</span></div></div><div class="chart">';
    st.forEach(function (m, i) {
      h += '<div class="col' + (i === 5 ? ' now' : '') + '"><span class="pf' + (m.profit < 0 ? ' neg' : '') + '">' + (m.profit >= 0 ? '+' : '−') + K.num(Math.abs(m.profit) / 10000, 0) + '万</span><div class="bars"><div class="bar b1" data-h="' + (m.sales / mx) + '" data-hk="ds' + i + '" title="売上 ' + yen(m.sales) + '"></div><div class="bar b3" data-h="' + (m.exp / mx) + '" data-hk="de' + i + '" title="経費 ' + yen(m.exp) + '"></div></div><span class="m">' + K.ymd(D(m.m + '-01')).m + '月</span></div>';
    });
    h += '</div><p class="src">上の数字は利益の目安（売上−経費、万円）。売上は請求書の日付、経費は明細の日付で数えています。</p></div>';
    h += '<div class="panel st"><div class="ph"><h2><b>02</b>今月の締め作業</h2><span class="tag">' + done + '/6</span></div>';
    h += ringHtml(done / 6, 'dr', done + '<small>/6</small>', '進み具合');
    h += stepsHtml(sp) + '</div></div>';
    // 未入金・気をつけること
    var R = recon(), late = up.late;
    var bad = S.tx.filter(function (e) { return K.state(e); }), kr = kintaiRes(), overP = kr.sums.filter(function (s) { return s.over; });
    var ngInv = S.invoices.filter(function (v) { return K.ym(D(v.issue)) === MK && !K.invChecks(v, invCalc(v), C()).every(function (x) { return x.ok; }); });
    var cand = R.invs.filter(function (v) { return v.dep.length; }).length;
    h += '<div class="grid g2 mt">';
    h += '<div class="panel"><div class="ph"><h2><b>03</b>未入金の請求書</h2><span class="tag">期日の近い順</span></div><div class="list">';
    up.list.slice().sort(function (a, b) { return D(a.due) - D(b.due); }).slice(0, 6).forEach(function (v) {
      var rem = D(v.due) - TODAY;
      h += '<div class="li"><span class="days ' + (isLate(v) ? 'bad' : rem <= 10 ? 'warn' : 'ok') + '">' + (rem < 0 ? rem : '+' + rem) + '日</span><span class="x">' + esc(v.partner) + '<small>' + esc(v.no) + '・期日 ' + K.md(D(v.due)) + (K.paidCheck(v) ? '・請求 ' + yen(invTotal(v)) + '−入金 ' + yen(K.invGot(v, invTotal(v))) : '') + '</small></span><span class="r">' + yen(remainOf(v)) + '</span>' + statusPills(v) + '</div>';
    });
    if (!up.list.length) h += '<p class="note">未入金の請求書はありません。</p>';
    h += '</div></div>';
    h += '<div class="panel st"><div class="ph"><h2><b>04</b>気をつけること</h2></div><div class="list">';
    h += '<div class="li"><span class="days ' + (bad.length ? 'bad' : 'ok') + '">' + bad.length + '</span><span class="x">未分類・要確認の明細<small>' + esc(bad.slice(0, 3).map(function (e) { return e.name; }).join('・')) + '</small></span></div>';
    h += '<div class="li"><span class="days ' + (cand ? 'warn' : 'ok') + '">' + cand + '</span><span class="x">照合を待っている入金<small>' + (cand ? '入金の照合で「確定」' : '') + '</small></span></div>';
    h += '<div class="li"><span class="days ' + (late.length ? 'bad' : 'ok') + '">' + late.length + '</span><span class="x">期日を過ぎた請求書<small>' + esc(late.map(function (v) { return v.partner; }).join('・')) + '</small></span><span class="r">' + yen(up.lateSum) + '</span></div>';
    h += '<div class="li"><span class="days ' + (overP.length || kr.skipped.length ? 'bad' : 'ok') + '">' + (overP.length + kr.skipped.length) + '</span><span class="x">勤怠の注意<small>時間外の上限超え ' + overP.length + '人・打刻もれ ' + kr.skipped.length + '件</small></span></div>';
    h += '<div class="li"><span class="days ' + (ngInv.length ? 'bad' : 'ok') + '">' + ngInv.length + '</span><span class="x">記載事項が足りない請求書（今月）</span></div>';
    h += '</div></div></div>';
    h += '<div class="panel mt feed"><div class="ph"><h2><b>05</b>最近の動き</h2></div><div class="list">';
    S.log.slice(0, 5).forEach(function (l) { h += '<div class="li"><span class="m">' + esc(K.md(D(l.t))) + '</span><span class="x">' + esc(l.msg) + '</span></div>'; });
    h += '</div></div>';
    el.innerHTML = h;
    flowEls = { d: $$('.fd', el), h: $$('.fh', el), r: $$('.fr', el) };
    animate(el);
  };
  function ringHtml(v, k, big, lab) {
    var r = 30, L = 2 * Math.PI * r;
    return '<div class="ring"><svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="' + r + '" fill="none" stroke="#16233a" stroke-width="8"/><circle cx="38" cy="38" r="' + r + '" fill="none" stroke="#5fd3b0" stroke-width="8" stroke-linecap="round" transform="rotate(-90 38 38)" stroke-dasharray="0 ' + L.toFixed(1) + '" data-arc="' + v + '" data-ak="' + k + '" data-len="' + L.toFixed(1) + '"/></svg><div><div class="big-num">' + big + '</div><div class="note">' + lab + '</div></div></div>';
  }
  function stepsHtml(sp) {
    return '<div class="steps">' + sp.map(function (x, i) { return '<div class="step' + (x.ok ? ' done' : '') + '"><span class="ck">✓</span><span class="t">' + (i + 1) + '. ' + x.t + '</span><em>' + esc(x.s) + '</em></div>'; }).join('') + '</div>';
  }
  var flowPulse = -1, flowPulseT = 0;
  function drawFlow(t) {
    if (!flowEls || !flowEls.d.length || !document.body.contains(flowEls.d[0])) { flowEls = null; return; }
    var L = 480, n = flowEls.d.length, near = [0, 0, 0, 0, 0];
    for (var i = 0; i < n; i++) {
      var p = ((t / 4000) + i / n) % 1, x = 40 + p * L;
      flowEls.d[i].setAttribute('cx', x.toFixed(1)); flowEls.h[i].setAttribute('cx', x.toFixed(1));
      flowEls.h[i].setAttribute('fill', p < .5 ? '#5fd3b0' : '#f0b54a');
      for (var k = 0; k < 5; k++) { var dd = Math.abs(x - FLOW_X[k]); if (dd < 14) near[k] = Math.max(near[k], 1 - dd / 14); }
    }
    for (var k2 = 0; k2 < 5; k2++) {
      var on = flowPulse === k2 ? Math.max(0, 1 - (t - flowPulseT) / 1400) : 0, a = Math.max(near[k2] * .6, on);
      flowEls.r[k2].setAttribute('opacity', a.toFixed(2)); flowEls.r[k2].setAttribute('r', (13 + a * 7).toFixed(1));
    }
  }

  // ================= 2) 明細の取り込みと仕訳 =================
  var jrMonth = null, jrOnly = 'all', jrQ = '', newTx = {};
  function impPreview(text, name) {
    var aoa = K.parseCSV(text); if (!aoa.length) return null;
    var mp = K.guessCols(aoa, K.detectHeader(aoa), name), hd = mp.head;
    var col = function (i) { return i >= 0 ? hd[i] : '（なし）'; };
    return { aoa: aoa, map: mp, html: '<div class="mapline"><span>日付：<b>' + esc(col(mp.d)) + '</b></span><span>摘要：<b>' + esc(col(mp.m)) + '</b></span><span>出金：<b>' + esc(col(mp.a)) + '</b></span><span>入金：<b>' + esc(col(mp.a2)) + '</b></span><span>支払い元：<b>' + esc(mp.src) + '</b></span><span>明細 <b>' + Math.max(0, aoa.length - mp.h - 1) + '</b>行</span></div>' };
  }
  RENDER.imp = function () {
    var ms = months6(); if (!jrMonth || ms.indexOf(jrMonth) < 0) jrMonth = MK;
    var tx = monthTx(jrMonth), bad = tx.filter(function (e) { return K.state(e); }).length, ok = tx.length - bad;
    var expT = tx.filter(function (e) { return e.dir === 'out' && K.isExp(e.acc); }).reduce(function (a, e) { return a + K.biz(e); }, 0);
    var h = '<div class="grid g4">';
    h += kpi(K.ymd(D(jrMonth + '-01')).m + '月の明細', cnt('j-n', tx.length, 'n') + '<small>行</small>', 'st', '銀行・カード', 'jk1', 1, 'st');
    h += kpi('自動で振り分け済み', cnt('j-o', ok, 'n') + '<small>行</small>', 'gr', 'キーワードのルールで判定', 'jk2', tx.length ? ok / tx.length : 0);
    h += kpi('未分類・要確認', cnt('j-b', bad, 'n') + '<small>行</small>', bad ? 'rd' : '', '入金は「入金の照合」で確定', 'jk3', tx.length ? bad / tx.length : 0);
    h += kpi('経費の合計（事業分）', cnt('j-e', expT), 'st', '事業の割合をかけた額', 'jk4', 1, 'st');
    h += '</div>';
    var pend = S.pending, text = pend ? pend.text : '', name = pend ? pend.name : '明細.csv', pv = text ? impPreview(text, name) : null;
    h += '<div class="grid g23 mt"><div class="panel st"><div class="ph"><h2><b>IMPORT</b>銀行・カードの明細（CSV）</h2><span class="tag">' + esc(name) + '</span></div>';
    h += '<textarea class="csv" id="impText" spellcheck="false" placeholder="ここにCSVを貼るか、ファイルを選んでください（日付・摘要・金額の列があれば読めます）">' + esc(text) + '</textarea>';
    h += '<div id="impMap">' + (pv ? pv.html : '') + '</div>';
    h += '<div class="btns mt"><button class="btn" data-act="imp-load" id="impLoad">読み込んで仕訳する</button><label class="ghost" style="cursor:pointer">ファイルを選ぶ<input type="file" id="impFile" accept=".csv,.txt,.tsv" hidden></label></div>';
    h += '<p class="src mt">列の見当（日付・摘要・出金・入金）と、銀行かカードかの判定は KichoAuto と同じ。Shift_JIS のCSVも読めます（CSV文字化けなおしと同じ見分け方）。同じ日付・摘要・金額の行は二重に入れません。</p></div>';
    h += '<div class="panel"><div class="ph"><h2><b>RULE</b>科目の決め方（キーワード = 科目, 割合%）</h2></div>';
    h += '<textarea data-bind="co:rules" id="rulesText" spellcheck="false" style="min-height:190px;font-family:var(--mono);font-size:12px">' + esc(C().rules) + '</textarea>';
    h += '<div class="btns mt"><button class="btn st" data-act="rules-apply">この設定で振り分け直す</button><button class="ghost" data-act="rules-reset">最初の設定に戻す</button></div>';
    h += '<p class="src mt">上の行が優先。手で科目を直すと、そのお店の行が上に足され、同じお店の未分類もまとめて直ります（KichoAuto と同じ）。例）自宅兼事務所の電気代を30%だけ経費にする → 電力 = 水道光熱費, 30%</p></div></div>';
    // 仕訳
    h += '<div class="panel mt"><div class="ph"><h2><b>JOURNAL</b>明細と科目（借方を選べます）</h2><div class="btns"><select id="jrMonth" style="width:auto">' + opts(ms.map(function (m) { return [m, m.replace('-', '年') + '月']; }), jrMonth) + '</select><select id="jrOnly" style="width:auto">' + opts([['all', 'すべて'], ['chk', '未分類・要確認だけ']], jrOnly) + '</select><input id="jrQ" placeholder="摘要で探す" value="' + esc(jrQ) + '" style="width:130px"><button class="ghost" data-act="jr-csv">仕訳帳をCSVで保存</button></div></div>';
    var q = K.nfkc(jrQ).toLowerCase().trim();
    var rows = tx.filter(function (e) { return (jrOnly === 'all' || K.state(e)) && (!q || K.nfkc(e.name).toLowerCase().indexOf(q) >= 0); });
    h += '<div class="tw"><table id="jrTbl"><thead><tr><th>日付</th><th>摘要</th><th class="hide-n">入出金</th><th class="r">金額</th><th class="hide-n">支払い元</th><th>借方科目</th><th class="hide-n">事業の割合</th><th class="r hide-n">経費になる額</th><th>状態</th></tr></thead><tbody>';
    rows.forEach(function (e) {
      var stt = K.state(e), exp = e.dir === 'out' && K.isExp(e.acc);
      h += '<tr class="' + (stt ? 's-warn' : '') + (newTx[e.id] ? ' new' : '') + '"><td class="mono nowrap">' + K.md(D(e.date)) + '</td><td>' + esc(e.name) + (e.inv && e.inv.length ? '<small>' + esc(e.inv.map(function (id) { var v = invById(id); return v ? v.no + ' の入金' : ''; }).join('・')) + '</small>' : '') + '</td><td class="hide-n">' + (e.dir === 'out' ? '出金' : '入金') + '</td><td class="r mono">' + K.num(e.amt) + '</td><td class="hide-n"><small>' + esc(e.src) + '</small></td>';
      h += '<td class="acc"><select data-acc="' + e.id + '" id="acc-' + e.id + '">' + opts(K.ACCS, e.acc) + '</select></td>';
      h += '<td class="pct hide-n">' + (exp ? '<input class="num" data-pct="' + e.id + '" value="' + e.pct + '">%' : '') + '</td><td class="r mono hide-n">' + (exp ? K.num(K.biz(e)) : '') + '</td><td>' + (stt ? pill(stt === '未分類' ? '未分類' : '要確認') : '<span class="st-ok">✓</span>') + '</td></tr>';
    });
    if (!rows.length) h += '<tr><td colspan="9" class="note">該当する明細はありません。</td></tr>';
    h += '</tbody></table></div><p class="note mt">「要確認」は銀行への入金（売上か、借入れ・立替の戻りか）とカードの返金。請求書の入金は「入金の照合」で確定すると売掛金の回収になります。</p></div>';
    $('#v-imp').innerHTML = h;
    animate($('#v-imp'));
    newTx = {};
  };
  function doImport() {
    var ta = $('#impText'), text = ta ? ta.value : '', name = S.pending ? S.pending.name : (impName || '明細.csv');
    var aoa = K.parseCSV(text); if (!aoa.length) { toast('CSVが空です'); return; }
    var r = K.readStatement(aoa, name, rules());
    if (!r.entries.length) { toast('日付・摘要・金額が読める行がありません'); return; }
    var sig = function (e) { return [e.date, e.name, e.amt, e.dir, e.src].join('|'); }, have = {};
    S.tx.forEach(function (e) { have[sig(e)] = 1; });
    var add = r.entries.filter(function (e) { return !have[sig(e)]; }), dup = r.entries.length - add.length;
    add.forEach(function (e) { e.id = uid('t'); newTx[e.id] = 1; S.tx.push(e); });
    S.tx.sort(function (a, b) { return D(a.date) - D(b.date); });
    var bad = add.filter(function (e) { return K.state(e) === '未分類'; }).length, chk = add.filter(function (e) { return K.state(e) === '要確認'; }).length;
    S.pending = null; impName = '';
    if (add.length) jrMonth = K.ym(D(add[add.length - 1].date));
    log('明細を取り込んだ：' + name + '（' + add.length + '行・自動 ' + (add.length - bad - chk) + '）');
    commit();
    toast(add.length + '行を仕訳しました（自動 ' + (add.length - bad - chk) + '・未分類 ' + bad + '・要確認 ' + chk + '）' + (dup ? '／同じ行 ' + dup + ' をとばしました' : '') + (r.skipped ? '／読めない行 ' + r.skipped : ''));
  }
  var impName = '';
  function setAcc(id, acc) {
    var e = txById(id); if (!e) return;
    e.acc = acc; e.manual = true; e.status = e.status === '入金' ? '' : e.status;
    var n = 0;
    S.tx.forEach(function (x) { if (x !== e && !x.manual && x.key === e.key && x.dir === e.dir && x.acc === '未分類') { x.acc = acc; n++; } });
    var added = '';
    if (e.dir === 'out' && acc !== '未分類' && !rules().some(function (r) { return r.k === e.key; })) {
      var lines = C().rules.split('\n'), at = lines.findIndex(function (l) { return l.trim() && l.trim().charAt(0) !== '#'; }); if (at < 0) at = lines.length;
      lines.splice(at, 0, e.key + ' = ' + acc); C().rules = lines.join('\n'); added = e.key + ' = ' + acc;
    }
    log('科目を直した：' + e.name + ' → ' + acc);
    commit();
    toast((added ? '「' + added + '」をルールに足しました' : '科目を「' + acc + '」にしました') + (n ? '（同じお店の' + n + '行も）' : ''));
  }
  function journalCSV() {
    var q = function (v) { v = String(v === null || v === undefined ? '' : v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var rows = [['日付', '借方科目', '借方金額', '貸方科目', '貸方金額', '摘要', '元のファイル', '状態']];
    S.tx.forEach(function (e) { K.lines(e).forEach(function (l) { rows.push(l.concat([e.file, K.state(e)])); }); });
    return '\uFEFF' + rows.map(function (r) { return r.map(q).join(','); }).join('\r\n');
  }

  // ================= 3) 請求書 =================
  var selInv = null, newInv = '';
  function draftAsInv() { var d = S.draft; return { partner: d.partner, hon: d.hon, issue: d.issue, due: K.iso(K.dueOf(D(d.issue), C().due)), items: d.items.map(function (it) { return Object.assign({}, it, { date: d.issue }); }), taxin: C().taxin, round: C().round, no: nextNo() }; }
  function nextNo() { var mx = 0; S.invoices.forEach(function (v) { var m = /(\d+)$/.exec(v.no || ''); if (m) mx = Math.max(mx, +m[1]); }); return C().prefix + String(mx + 1).padStart(4, '0'); }
  function partners() { var o = {}; DATA.CLIENTS.forEach(function (c) { o[c.p] = 1; }); S.invoices.forEach(function (v) { o[v.partner] = 1; }); return Object.keys(o); }
  function docHtml(v, calc, isDraft) {
    var c = C(), has8 = calc.rates.indexOf(8) >= 0;
    var rows = calc.items.map(function (it) { return '<tr><td>' + esc(it.date ? K.slash(D(it.date)) : '') + '</td><td>' + esc(it.item) + (it.rate === 8 ? ' ※' : '') + '</td><td class="r">' + K.num(it.qty, 2) + esc(it.unit) + '</td><td class="r">' + K.num(it.price, 2) + '</td><td class="r">' + it.rate + '%</td><td class="r">' + K.num(it.amt) + '</td></tr>'; }).join('');
    if (!rows) rows = '<tr><td colspan="6" class="d-sm">（明細を入れると、ここに出ます）</td></tr>';
    var sums = calc.rates.map(function (r) { return '<tr><td>' + r + '%対象（' + (calc.taxin ? '税込' : '税抜') + '）</td><td class="r">' + K.num(calc.by[r].base) + '円</td><td>消費税（' + r + '%）</td><td class="r">' + K.num(calc.by[r].tax) + '円</td></tr>'; }).join('');
    return '<div class="d-title">請求書</div><div class="d-top"><div><div class="d-to">' + esc(v.partner || '（取引先）') + ' ' + esc(v.hon) + '</div><p class="d-sm" style="margin:8px 0 0">下記のとおりご請求申し上げます。</p>' +
      '<div class="d-total">ご請求金額（税込）<b>¥' + K.num(calc.total) + '</b></div><div class="d-sm">お支払期限：' + K.jd(D(v.due)) + '</div></div>' +
      '<div class="d-from"><div class="d-sm">請求書番号：' + esc(v.no) + (isDraft ? '（発行時）' : '') + '<br>請求日：' + K.jd(D(v.issue)) + '</div><div style="margin-top:6px"><b>' + esc(c.name) + '</b><br><span class="d-sm">' + esc(c.addr) + '<br>' + esc(c.tel) + (c.reg ? '<br><span class="hl">登録番号：' + esc(K.regNoClean(c.reg)) + '</span>' : '') + '</span></div></div></div>' +
      '<table><thead><tr><th>日付</th><th>品目</th><th class="r">数量</th><th class="r">単価</th><th class="r">税率</th><th class="r">金額' + (calc.taxin ? '（税込）' : '（税抜）') + '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<table><tbody>' + sums + '<tr><td colspan="3"><b>合計（税込）</b></td><td class="r"><b>' + K.num(calc.total) + '円</b></td></tr></tbody></table>' +
      (has8 ? '<div class="d-sm">※は軽減税率（8%）の対象です。</div>' : '') + (c.bank ? '<div class="d-box"><b>お振込先</b><br>' + esc(c.bank) + '</div>' : '') + (c.note ? '<div class="d-box">' + esc(c.note) + '</div>' : '');
  }
  function chkHtml(v, calc) {
    var ck = K.invChecks(v, calc, C());
    return '<ul class="chk">' + ck.map(function (x, i) { return '<li class="' + (x.ok ? '' : 'ng') + '"><i>' + (x.ok ? '✓' : '!') + '</i><span>' + (i + 1) + '. ' + esc(x.k) + '<small>' + esc(x.v) + '</small></span></li>'; }).join('') + '</ul>';
  }
  function invPreview() {
    var v = selInv ? invById(selInv) : null, isDraft = !v; if (!v) v = draftAsInv();
    var calc = invCalc(v);
    var box = $('#invDoc'); if (box) box.innerHTML = docHtml(v, calc, isDraft);
    var ck = $('#invChk'); if (ck) ck.innerHTML = chkHtml(v, calc);
    var fn = $('#invFile'); if (fn) fn.textContent = K.fileName(D(v.issue), v.partner, calc.total);
    var dt = $('#invDueT'); if (dt) dt.textContent = K.jd(D(draftAsInv().due));
    var dc = draftAsInv(), dcal = invCalc(dc);
    dc.items.forEach(function (it, i) { var a = $('#ia-' + i); if (a) { var q = has(it.qty) ? K.toNum(it.qty) : 1, p = K.toNum(it.price); a.textContent = has(it.item) && p !== null ? K.num(Math.round((q === null ? 1 : q) * p)) : ''; } });
    var tt = $('#invTot');
    if (tt) {
      var rows = dcal.rates.map(function (r) { return '<div class="r"><span>' + r + '%対象 ' + K.num(dcal.by[r].base) + '</span><span>消費税 ' + K.num(dcal.by[r].tax) + '</span></div>'; }).join('');
      tt.innerHTML = rows + '<div class="r em"><span>ご請求金額（税込）</span><span>' + yen(dcal.total) + '</span></div>';
    }
  }
  RENDER.inv = function () {
    var d = S.draft, c = C(), up = unpaid();
    var thisM = S.invoices.filter(function (v) { return K.ym(D(v.issue)) === MK; });
    var h = '<div class="grid g4">';
    h += kpi('今月の請求書', cnt('i-n', thisM.length, 'n') + '<small>枚</small>', 'st', '合計 ' + yen(thisM.reduce(function (a, v) { return a + invTotal(v); }, 0)), 'ik1', Math.min(1, thisM.length / 6), 'st');
    h += kpi('未入金', cnt('i-u', up.sum), up.late.length ? 'rd' : '', up.list.length + '件・期日超過 ' + up.late.length + '件', 'ik2', Math.min(1, up.list.length / Math.max(1, S.invoices.length)));
    h += kpi('端数処理', '<span style="font-size:20px">' + esc(K.ROUND_LABEL[c.round]) + '</span>', 'gr', '税率ごとに1回・' + (c.taxin === 'in' ? '税込の明細' : '税抜の明細'), 'ik3', 1);
    h += kpi('登録番号', '<span style="font-size:17px">' + esc(K.regNoClean(c.reg) || '未入力') + '</span>', K.regNoOk(c.reg) ? 'st' : 'rd', K.regNoOk(c.reg) ? 'T＋13桁（見本の番号）' : '「設定」で入れてください', 'ik4', K.regNoOk(c.reg) ? 1 : 0, 'st');
    h += '</div>';
    h += '<div class="est-mini" id="invMini"><span>' + esc(d.partner || '新しい請求書') + '</span><span class="em-t">合計 <span>' + yen(invCalc(draftAsInv()).total) + '</span></span></div>';
    h += '<div class="grid g2 mt"><div class="panel"><div class="ph"><h2><b>NEW</b>請求書を作る</h2><span class="tag">番号 ' + esc(nextNo()) + '</span></div><div class="form">';
    h += fld('取引先', '<input id="ni-partner" list="ptList" data-bind="dr:partner" value="' + esc(d.partner) + '" placeholder="例：株式会社デモ企画">', 'wide') + fld('敬称', '<select data-bind="dr:hon">' + opts(['御中', '様'], d.hon) + '</select>') + fld('請求日', '<input type="date" data-bind="dr:issue" value="' + esc(d.issue) + '">');
    h += '</div><datalist id="ptList">' + partners().map(function (p) { return '<option value="' + esc(p) + '">'; }).join('') + '</datalist>';
    h += '<p class="note">お支払期限：<b id="invDueT"></b>（設定：' + esc({ eom0: '当月末', eom1: '翌月末', eom2: '翌々月末', d30: '30日後' }[c.due]) + '）</p>';
    h += '<div class="tw"><table class="lines" id="invLines"><colgroup><col style="width:29%"><col style="width:9%"><col style="width:9%"><col style="width:16%"><col style="width:15%"><col style="width:15%"><col style="width:7%"></colgroup><thead><tr><th>品目</th><th class="r">数量</th><th>単位</th><th class="r">単価</th><th>税率</th><th class="r">金額</th><th></th></tr></thead><tbody>';
    d.items.forEach(function (it, i) {
      var b = function (k, cls, ph) { return '<input' + (cls ? ' class="' + cls + '"' : '') + ' data-bind="di:' + i + ':' + k + '" value="' + esc(it[k]) + '"' + (ph ? ' placeholder="' + ph + '"' : '') + '>'; };
      h += '<tr><td>' + b('item', '', '品目') + '</td><td>' + b('qty', 'num', '1') + '</td><td>' + b('unit') + '</td><td>' + b('price', 'num') + '</td><td><select data-bind="di:' + i + ':rate">' + opts([[10, '10%'], [8, '8%'], [0, '0%']], it.rate) + '</select></td><td class="amt" id="ia-' + i + '"></td><td><button class="ghost sm" data-act="di-del" data-i="' + i + '" aria-label="行を消す">×</button></td></tr>';
    });
    h += '</tbody></table></div><div class="btns mt"><button class="ghost" data-act="di-add">行を足す</button></div>';
    h += '<div class="tot mt" id="invTot"></div>';
    h += '<div class="btns mt"><button class="btn big" data-act="inv-issue" id="invIssue">発行して一覧に入れる</button><button class="ghost" data-act="inv-clear">入力を消す</button></div>';
    h += '<p class="tax-note">1行ごとの金額は四捨五入、消費税は1枚の請求書につき税率ごとに1回だけ端数処理します（請求書一括作成と同じ）。最終確認は国税庁の案内・税理士へ。</p></div>';
    h += '<div class="panel st"><div class="ph"><h2><b>PREVIEW</b>' + (selInv ? '発行した請求書' : 'できあがり（見本）') + '</h2>' + (selInv ? '<button class="ghost sm" data-act="inv-back">作成中に戻る</button>' : '') + '</div><div class="doc" id="invDoc"></div>';
    h += '<p class="sub2">インボイス（適格請求書）の記載事項 6つ</p><div id="invChk"></div><p class="src mt">保存用のファイル名（電帳リネームと同じ形）：<span class="mono" id="invFile"></span></p><p class="tax-note">記載事項は国税庁「適格請求書等保存方式の概要」の6項目。最終確認は国税庁の案内・税理士へ。</p></div></div>';
    // 一覧
    var list = S.invoices.slice().sort(function (a, b) { return D(b.issue) - D(a.issue) || (a.no < b.no ? 1 : -1); });
    h += '<div class="panel mt"><div class="ph"><h2><b>LIST</b>請求書の一覧</h2><span class="tag">新しい順・' + list.length + '枚</span></div><div class="tw"><table id="invTbl"><thead><tr><th>番号</th><th>請求日</th><th>取引先</th><th class="r">請求額（税込）</th><th class="r hide-n">うち消費税</th><th>期日</th><th>状態</th><th></th></tr></thead><tbody>';
    list.slice(0, invMore ? 200 : 12).forEach(function (v) {
      var cal = invCalc(v);
      h += '<tr class="' + (isLate(v) ? 's-bad' : '') + (v.id === newInv ? ' flash' : '') + (v.id === selInv ? ' sel' : '') + '"><td class="mono nowrap">' + esc(v.no) + '</td><td class="mono nowrap">' + K.slash(D(v.issue)) + '</td><td>' + esc(v.partner) + '</td><td class="r mono">' + K.num(cal.total) + '</td><td class="r mono hide-n">' + K.num(cal.tax) + '</td><td class="mono nowrap">' + K.md(D(v.due)) + '</td><td>' + statusPills(v) + '</td><td><button class="ghost sm" data-act="inv-open" data-id="' + v.id + '">見る</button></td></tr>';
    });
    h += '</tbody></table></div>' + (list.length > 12 && !invMore ? '<button class="ghost mt" data-act="inv-more">すべて表示</button>' : '') + '</div>';
    $('#v-inv').innerHTML = h;
    invPreview();
    animate($('#v-inv'));
    newInv = '';
  };
  var invMore = false;
  function issueInv() {
    var d = S.draft;
    if (!has(d.partner)) { toast('取引先を入れてください'); return; }
    var v = draftAsInv(), cal = invCalc(v);
    if (!cal.items.length) { toast('品目と単価を入れてください'); return; }
    v.id = uid('i'); v.paid = null; v.items = d.items.filter(function (it) { return has(it.item) && K.toNum(it.price) !== null; }).map(function (it) { return { date: d.issue, item: it.item, qty: it.qty, unit: it.unit, price: it.price, rate: +it.rate }; });
    S.invoices.push(v); newInv = v.id; selInv = v.id;
    log('請求書を発行：' + v.no + ' ' + v.partner + '（' + yen(cal.total) + '）');
    S.draft = blankDraft();
    commit();
    toast('請求書 ' + v.no + ' を発行しました（' + yen(cal.total) + '）');
  }

  // ================= 4) 入金の照合 =================
  function confirmInv(inv, deps, how, diff, status) {
    K.applyPaid(inv, deps, how, diff, status); // 入金の行を売掛金の回収に（取り消せるように元の値を残す）
    if (diff > 0 && status === '手数料差引') S.tx.push({ id: (inv.paid.feeTx = uid('t')), date: inv.paid.date, name: '振込手数料（差引）' + inv.partner, key: '振込手数料', amt: diff, dir: 'out', src: '売掛金', file: '入金の照合', manual: true, acc: '支払手数料', pct: 100, status: '' });
  }
  function recConfirmAll() {
    var R = recon(), n = 0, sum = 0;
    R.invs.forEach(function (v) {
      if (!v.dep.length || (v.status !== '入金済み' && v.status !== '手数料差引')) return;
      confirmInv(v.ref, v.dep.map(function (d) { return d.ref; }), v.how, v.diff, v.status); n++; sum += v.amount;
    });
    if (!n) { toast('確定できる組み合わせはありません'); return; }
    log('入金を照合：' + n + '件（' + yen(sum) + '）');
    commit(); toast(n + '件の入金を確定しました（未入金 −' + yen(sum) + '）');
  }
  function recManual(invId, depId) {
    var v = invById(invId); if (!v) return;
    var e = txById(depId); if (!e) return;
    var deps = [e];
    if (K.paidCheck(v)) { deps = v.paid.deps.map(txById).filter(Boolean).concat([e]); K.undoPaid(v, S.tx); } // 要確認の請求書：残りの入金を足す
    var amt = invTotal(v), got = deps.reduce(function (a, d) { return a + d.amt; }, 0), ms = K.manualStatus(amt, got, C().feeMax), diff = ms.diff, status = ms.status;
    confirmInv(v, deps, deps.length > 1 ? '手で確定（入金' + deps.length + '件）' : '手で確定', diff, status);
    if (status === '要確認') v.paid.note = '入金 ¥' + K.num(got) + '・残り ¥' + K.num(diff);
    // 振込名義を登録（入金消込チェッカーと同じ）
    var nm = K.parseNameMap(C().namemap), key = K.kanaKey(e.name);
    if (key && nm.get(key) !== v.partner) C().namemap = C().namemap.replace(/\s*$/, '\n') + K.nfkc(e.name).replace(/^(振込|フリコミ)\s*/, '').trim() + ' = ' + v.partner + '\n';
    log('入金を手で確定：' + v.no + ' ' + v.partner);
    commit(); toast(v.no + ' を「' + status + '」にしました（' + (status === '要確認' ? '残り ' + yen(diff) + ' は未入金のまま・' : '') + '振込名義を登録）');
  }
  function recUndo(invId) { // 要確認の確定を取り消す（入金の行も確定前に戻す）
    var v = invById(invId); if (!v || !K.paidCheck(v)) return;
    if (!DEMO && !window.confirm(v.no + '（' + v.partner + '）の入金の確定を取り消しますか？')) return;
    K.undoPaid(v, S.tx);
    log('入金の確定を取り消し：' + v.no + ' ' + v.partner);
    commit(); toast(v.no + ' の確定を取り消しました（未入金に戻しました）');
  }
  RENDER.rec = function () {
    var R = recon(), up = unpaid(), chk = S.invoices.filter(K.paidCheck).sort(function (a, b) { return D(a.due) - D(b.due); }), cand = R.invs.filter(function (v) { return v.dep.length && (v.status === '入金済み' || v.status === '手数料差引'); });
    var unk = R.deps.filter(function (d) { return !d.inv.length; });
    var h = '<div class="grid g4">';
    h += kpi('未入金', cnt('r-u', up.sum), '', up.list.length + '件（確定前の候補を含む' + (chk.length ? '・要確認 ' + chk.length + '件は残りの額' : '') + '）', 'rk1', Math.min(1, up.list.length / Math.max(1, S.invoices.length)), 'st');
    h += kpi('照合の候補', cnt('r-c', cand.length, 'n') + '<small>件</small>', cand.length ? 'gr' : 'st', yen(cand.reduce(function (a, v) { return a + v.amount; }, 0)) + '・「確定」で入金済みに', 'rk2', cand.length ? 1 : 0);
    h += kpi('期日超過', cnt('r-l', up.late.length, 'n') + '<small>件</small>', up.late.length ? 'rd' : '', yen(up.lateSum), 'rk3', up.late.length ? 1 : 0);
    h += kpi('合わない入金', cnt('r-x', unk.length, 'n') + '<small>件</small>', unk.length ? 'rd' : 'st', '請求書が見つからない入金', 'rk4', unk.length ? 1 : 0, 'st');
    h += '</div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>MATCH</b>請求書と入金の突き合わせ</h2><div class="btns"><button class="btn" data-act="rec-confirm" id="recConfirm"' + (cand.length ? '' : ' disabled') + '>照合を確定する（' + cand.length + '件）</button></div></div>';
    h += '<div class="tw"><table id="recTbl"><thead><tr><th>状態</th><th>番号</th><th>取引先</th><th class="hide-n">請求日</th><th>期日</th><th class="r">請求額</th><th>対応する入金（選び直せます）</th><th>根拠・メモ</th></tr></thead><tbody>';
    var deps = eligibleDeps();
    chk.forEach(function (v) { // 要確認で確定した請求書（入金が足りない）：残りを未入金に数えたまま表に残す
      var tot = invTotal(v), got = K.invGot(v, tot);
      var sel = '<select data-recinv="' + v.id + '"><option value="">（残りの入金を足す）</option>' + deps.map(function (e) { return '<option value="' + e.id + '">' + K.md(D(e.date)) + ' ' + esc(e.name.slice(0, 16)) + ' ¥' + K.num(e.amt) + '</option>'; }).join('') + '</select>';
      h += '<tr class="' + (isLate(v) ? 's-bad' : 's-ord') + '" data-chk="' + v.id + '"><td>' + statusPills(v) + '</td><td class="mono nowrap">' + esc(v.no) + '</td><td>' + esc(v.partner) + '</td><td class="mono hide-n nowrap">' + K.md(D(v.issue)) + '</td><td class="mono nowrap">' + K.md(D(v.due)) + '</td><td class="r mono">' + K.num(tot) + '</td><td>' + sel + ' <button class="ghost sm" data-act="rec-undo" data-id="' + v.id + '">確定を取り消す</button></td><td><small style="white-space:normal">' + esc('入金 ¥' + K.num(got) + '（' + v.paid.deps.length + '件）・残り ¥' + K.num(tot - got) + 'は未入金に数えています') + '</small></td></tr>';
    });
    R.invs.slice().sort(function (a, b) { return (b.dep.length ? 1 : 0) - (a.dep.length ? 1 : 0) || (a.due || 0) - (b.due || 0); }).forEach(function (v) {
      var label = v.dep.length && !v.weak ? v.status : (v.dep.length ? '要確認' : v.status);
      var sel = '<select data-recinv="' + v.id + '"><option value="">（入金なし）</option>' + deps.map(function (e) { return '<option value="' + e.id + '"' + (v.dep.some(function (d) { return d.id === e.id; }) ? ' selected' : '') + '>' + K.md(D(e.date)) + ' ' + esc(e.name.slice(0, 16)) + ' ¥' + K.num(e.amt) + '</option>'; }).join('') + '</select>';
      h += '<tr class="' + (v.dep.length ? 's-ord' : (label === '期日超過' ? 's-bad' : '')) + '"><td>' + pill(label) + (v.dep.length ? '<small>候補</small>' : '') + '</td><td class="mono nowrap">' + esc(v.no) + '</td><td>' + esc(v.partner) + '</td><td class="mono hide-n nowrap">' + K.md(v.date) + '</td><td class="mono nowrap">' + K.md(v.due) + '</td><td class="r mono">' + K.num(v.amount) + '</td><td>' + sel + '</td><td><small style="white-space:normal">' + esc([v.how, v.diff ? '差額 ¥' + K.num(v.diff) + '（振込手数料として仕訳）' : '', v.note].filter(Boolean).join(' ／ ')) + '</small></td></tr>';
    });
    if (!R.invs.length && !chk.length) h += '<tr><td colspan="8" class="note">未入金の請求書はありません。</td></tr>';
    h += '</tbody></table></div><p class="note mt">順番：①取引先が分かって金額がぴったり → ②振込手数料（' + K.num(n0(C().feeMax)) + '円まで）を引いた金額 → ③何枚かをまとめて入金 → ④金額だけ一致（要確認）。取引先は、登録した振込名義・名前のカナで見分けます（入金消込チェッカーと同じ）。差し引かれた手数料は「支払手数料」として仕訳します。入金が請求額に足りず「要確認」で確定した請求書は、残り（請求額−入金額）を未入金・期日超過に数えたままこの表に残ります。残りの入金を選ぶと足し、「確定を取り消す」で確定前に戻せます。</p></div>';
    h += '<div class="grid g2 mt"><div class="panel st"><div class="ph"><h2><b>UNKNOWN</b>合わない入金</h2></div><div class="list">';
    unk.forEach(function (d) { h += '<div class="li"><span class="m">' + K.md(d.date) + '</span><span class="x">' + esc(d.desc) + '<small>' + esc(d.pp ? '推定：' + d.pp.p : (d.cands ? '同じ金額の請求書が' + d.cands.length + '枚' : '取引先が分からない')) + '</small></span><span class="r">' + yen(d.amount) + '</span></div>'; });
    if (!unk.length) h += '<p class="note">取り込んだ入金は、すべてどれかの請求書に当てはまりました。</p>';
    h += '</div></div>';
    var paid = S.invoices.filter(function (v) { return v.paid; }).sort(function (a, b) { return D(b.paid.date) - D(a.paid.date); }).slice(0, 6);
    h += '<div class="panel"><div class="ph"><h2><b>DONE</b>確定した入金（新しい順）</h2></div><div class="list">';
    paid.forEach(function (v) { h += '<div class="li"><span class="m">' + K.md(D(v.paid.date)) + '</span><span class="x">' + esc(v.partner) + '<small>' + esc(v.no + '・' + v.paid.how + (v.paid.diff ? '・差額 ¥' + K.num(v.paid.diff) : '')) + '</small></span>' + pill(v.paid.status) + '</div>'; });
    h += '</div></div></div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>NAME</b>振込名義の登録（振込名義 = 取引先名）</h2></div><textarea data-bind="co:namemap" spellcheck="false" style="font-family:var(--mono);font-size:12px">' + esc(C().namemap) + '</textarea><p class="src mt">会社名と振込名義が違う取引先は、ここに書くと次から自動で見分けます。上の表で入金を手で選ぶと、自動で足されます。</p></div>';
    $('#v-rec').innerHTML = h;
    animate($('#v-rec'));
  };

  // ================= 5) 勤怠の集計 =================
  var kinWho = '', kinEdit = null;
  RENDER.kin = function () {
    var R = kintaiRes(), c = C(), sums = R.sums;
    var people = sums.map(function (s) { return s.who; });
    if (people.indexOf(kinWho) < 0) kinWho = people[0] || '';
    var tot = function (k) { return sums.reduce(function (a, s) { return a + s[k]; }, 0); }, over = sums.filter(function (s) { return s.over; }).length;
    var h = '<div class="grid g4">';
    h += kpi('総実働（' + K.ymd(TODAY).m + '月）', cnt('k-w', tot('work'), 'hm'), 'st', sums.length + '人・' + tot('days') + '日分', 'kk1', 1, 'st');
    h += kpi('総時間外', cnt('k-o', tot('ot'), 'hm'), over ? 'rd' : '', '上限 ' + c.kot + '時間/月を超えた人 ' + over + '人', 'kk2', Math.min(1, tot('ot') / Math.max(1, R.otLim * Math.max(1, sums.length))));
    h += kpi('深夜（22〜5時）', cnt('k-n', tot('night'), 'hm'), 'st', '法定休日 ' + K.hm(tot('hol')), 'kk3', Math.min(1, tot('night') / Math.max(1, tot('work'))), 'st');
    h += kpi('打刻もれ', cnt('k-s', R.skipped.length, 'n') + '<small>件</small>', R.skipped.length ? 'rd' : 'gr', '集計から外しています', 'kk4', R.skipped.length ? 1 : 0);
    h += '</div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>SUM</b>個人別（' + K.ymd(TODAY).m + '月）</h2><div class="btns"><button class="btn st" data-act="kin-close" id="kinClose">' + ((S.close[MK] || {}).kintai ? '締めた（' + K.ymd(TODAY).m + '月）' : '今月の勤怠を締める') + '</button></div></div>';
    h += '<div class="tw"><table id="kinTbl"><thead><tr><th>名前</th><th class="r">出勤日数</th><th class="r">実働</th><th class="r">時間外</th><th class="r hide-n">うち週の上限超え</th><th class="r">深夜</th><th class="r hide-n">法定休日</th><th>注意</th></tr></thead><tbody>';
    sums.forEach(function (s) {
      h += '<tr class="' + (s.over ? 's-bad' : '') + (s.who === kinWho ? ' sel' : '') + '"><td><button class="ghost sm" data-act="kin-who" data-w="' + esc(s.who) + '">' + esc(s.who) + '</button></td><td class="r mono">' + s.days + '</td><td class="r mono">' + K.hm(s.work) + '</td><td class="r mono">' + (s.over ? '<b style="color:var(--red)">' + K.hm(s.ot) + '</b>' : K.hm(s.ot)) + '</td><td class="r mono hide-n">' + K.hm(s.otw) + '</td><td class="r mono">' + K.hm(s.night) + '</td><td class="r mono hide-n">' + K.hm(s.hol) + '</td><td>' + [s.over ? pill('注意') + ' 時間外が' + K.hm(R.otLim) + '超' : '', s.warn ? s.warn + '日' : ''].filter(Boolean).join('・') + '</td></tr>';
    });
    h += '</tbody></table></div>';
    if (R.skipped.length) h += '<p class="err mt">打刻もれ（集計から外しました）：' + R.skipped.map(function (x) { return esc(x.msg) + ' <button class="ghost sm" data-act="kin-fix" data-id="' + esc(x.id) + '">直す</button>'; }).join('、') + '</p>';
    h += '<p class="note mt">ルール（勤怠集計と同じ）：休憩の列が空なら 6時間超45分・8時間超60分を引く／1日' + esc(c.kday) + '・週' + esc(c.kweek) + 'を超えた分が時間外（週の始まり ' + K.WD[n0(c.kws)] + '曜）／深夜は22:00〜5:00／法定休日 ' + (n0(c.khol) < 0 ? 'なし' : K.WD[n0(c.khol)] + '曜') + '／注意＝休憩が足りない・実働12時間超・7日以上連続出勤。</p></div>';
    // 日別
    var days = R.recs.filter(function (r) { return r.who === kinWho; });
    h += '<div class="grid g32 mt"><div class="panel st"><div class="ph"><h2><b>DAY</b>' + esc(kinWho) + ' の日別</h2></div><div class="tw"><table><thead><tr><th>日付</th><th>出勤</th><th>退勤</th><th class="r">休憩</th><th class="r">実働</th><th class="r">時間外</th><th class="r">深夜</th><th>注意</th></tr></thead><tbody>';
    days.forEach(function (r) { h += '<tr class="' + (r.w.length ? 's-warn' : '') + (r.id === kinNew ? ' flash' : '') + '"><td class="mono nowrap">' + K.mdw(r.d) + (r.hol ? '<small>法定休日</small>' : '') + '</td><td class="mono">' + K.hm(r.S) + '</td><td class="mono">' + K.hm(r.E) + '</td><td class="r mono">' + K.hm(r.brk) + '</td><td class="r mono">' + K.hm(r.work) + '</td><td class="r mono">' + (r.otd + r.otw ? K.hm(r.otd + r.otw) : '') + '</td><td class="r mono">' + (r.night ? K.hm(r.night) : '') + '</td><td><small style="white-space:normal;color:var(--red)">' + esc(r.w.join('・')) + '</small></td></tr>'; });
    if (!days.length) h += '<tr><td colspan="8" class="note">まだ記録がありません。</td></tr>';
    h += '</tbody></table></div></div>';
    var e = kinEdit || { no: '', date: K.iso(TODAY), s: '9:00', e: '18:00', brk: '' };
    var staff = {}; S.kintai.forEach(function (r) { staff[r.no] = r.name; });
    h += '<div class="panel"><div class="ph"><h2><b>PUNCH</b>出退勤を入れる</h2></div><div class="form">';
    h += fld('名前', '<select id="kn-who">' + opts(Object.keys(staff).map(function (k) { return [k, k + ' ' + staff[k]]; }), e.no || (kinWho.split(' ')[0])) + '</select>', 'wide') + fld('日付', '<input type="date" id="kn-date" value="' + esc(e.date) + '">');
    h += fld('出勤', '<input id="kn-s" value="' + esc(e.s) + '" placeholder="9:00">') + fld('退勤', '<input id="kn-e" value="' + esc(e.e) + '" placeholder="18:00">') + fld('休憩（分・空なら自動）', '<input class="num" id="kn-b" value="' + esc(e.brk) + '">');
    h += '<button class="btn" data-act="kin-add">記録する</button></div><p class="note mt">同じ人・同じ日の記録は置きかえます。退勤が出勤より前（例 26:00 → 2:00）は日をまたいだ勤務として数えます。</p></div></div>';
    $('#v-kin').innerHTML = h;
    animate($('#v-kin'));
    kinNew = '';
  };
  var kinNew = '';

  // ================= 6) 月次まとめ =================
  var monSel = null;
  RENDER.mon = function () {
    var ms = months6(); if (!monSel || ms.indexOf(monSel) < 0) monSel = MK;
    var all = ms.map(monthStat), i0 = ms.indexOf(monSel), cur = all[i0], prev = i0 > 0 ? all[i0 - 1] : monthStat(K.ym(K.addMonths(D(monSel + '-01'), -1)));
    var h = '<div class="btns" style="margin-bottom:12px"><select id="monSel" style="width:auto">' + opts(ms.map(function (m) { return [m, m.replace('-', '年') + '月']; }), monSel) + '</select><span class="note">売上は請求書の日付（税込）、経費は明細の日付（事業分・税込）で数えた目安です。</span></div>';
    h += '<div class="grid g4">';
    h += kpi('売上（請求書）', cnt('m-s', cur.sales), '', '前月比 ' + dlt(cur.sales, prev.sales) + '・' + cur.n + '枚', 'mk1', Math.min(1, cur.sales / Math.max(1, Math.max(cur.sales, prev.sales))));
    h += kpi('経費（事業分）', cnt('m-e', cur.exp), 'st', '前月比 ' + dlt(cur.exp, prev.exp, true), 'mk2', Math.min(1, cur.exp / Math.max(1, Math.max(cur.exp, prev.exp))), 'st');
    h += kpi('利益（目安）', cnt('m-p', cur.profit), cur.profit < 0 ? 'rd' : 'gr', '前月 ' + yen(prev.profit) + '・差 ' + sgn(cur.profit - prev.profit), 'mk3', cur.sales ? Math.max(0, cur.profit / cur.sales) : 0);
    h += kpi('利益率', cnt('m-r', cur.sales ? cur.profit / cur.sales : 0, 'pct'), 'st', '前月 ' + (prev.sales ? pct(prev.profit / prev.sales) : '—'), 'mk4', cur.sales ? Math.max(0, cur.profit / cur.sales) : 0, 'st');
    h += '</div>';
    var mx = Math.max.apply(null, all.map(function (m) { return Math.max(m.sales, m.exp); }).concat([1]));
    h += '<div class="grid g32 mt"><div class="panel"><div class="ph"><h2><b>01</b>6か月の推移</h2><div class="legend"><span><i style="background:#5fd3b0"></i>売上</span><span><i style="background:#f0b54a"></i>経費</span></div></div><div class="chart" id="monChart">';
    all.forEach(function (m, i) { h += '<div class="col' + (m.m === monSel ? ' now' : '') + '"><span class="pf' + (m.profit < 0 ? ' neg' : '') + '">' + (m.profit >= 0 ? '+' : '−') + K.num(Math.abs(m.profit) / 10000, 0) + '万</span><div class="bars"><div class="bar b1" data-h="' + (m.sales / mx) + '" data-hk="ms' + i + '" title="売上 ' + yen(m.sales) + '"></div><div class="bar b3" data-h="' + (m.exp / mx) + '" data-hk="me' + i + '" title="経費 ' + yen(m.exp) + '"></div></div><span class="m">' + K.ymd(D(m.m + '-01')).m + '月</span></div>'; });
    h += '</div></div>';
    var top = Object.keys(cur.by).sort(function (a, b) { return cur.by[b] - cur.by[a]; }), tmx = top.length ? cur.by[top[0]] : 1;
    h += '<div class="panel st"><div class="ph"><h2><b>02</b>経費の内訳（多い順）</h2></div><div class="hbars">';
    top.slice(0, 7).forEach(function (a, i) { h += '<div class="row"><span>' + esc(a) + '</span><span class="tr"><i data-w="' + (cur.by[a] / tmx) + '" data-wk="hb' + i + '"></i></span><em>' + K.num(cur.by[a]) + '</em></div>'; });
    if (!top.length) h += '<p class="note">この月の経費はまだありません。</p>';
    h += '</div></div></div>';
    // 科目別の表
    var accs = K.EXP.filter(function (a) { return cur.by[a] || prev.by[a]; });
    h += '<div class="grid g32 mt"><div class="panel"><div class="ph"><h2><b>03</b>科目別の集計</h2><span class="tag">' + esc(prev.m) + ' → ' + esc(cur.m) + '</span></div><div class="tw"><table id="monTbl"><thead><tr><th>科目</th><th class="r">前月</th><th class="r">今月</th><th class="r">差</th><th class="r">前月比</th></tr></thead><tbody>';
    h += '<tr><td><b>売上高（請求書）</b></td><td class="r mono">' + K.num(prev.sales) + '</td><td class="r mono">' + K.num(cur.sales) + '</td><td class="r mono">' + sgn(cur.sales - prev.sales) + '</td><td class="r">' + dlt(cur.sales, prev.sales) + '</td></tr>';
    accs.forEach(function (a) { var x = cur.by[a] || 0, y = prev.by[a] || 0; h += '<tr><td>' + esc(a) + '</td><td class="r mono">' + K.num(y) + '</td><td class="r mono">' + K.num(x) + '</td><td class="r mono">' + sgn(x - y) + '</td><td class="r">' + dlt(x, y, true) + '</td></tr>'; });
    h += '<tr class="sum"><td>経費の合計</td><td class="r mono">' + K.num(prev.exp) + '</td><td class="r mono">' + K.num(cur.exp) + '</td><td class="r mono">' + sgn(cur.exp - prev.exp) + '</td><td class="r">' + dlt(cur.exp, prev.exp, true) + '</td></tr>';
    h += '<tr class="sum"><td>利益（目安）</td><td class="r mono">' + K.num(prev.profit) + '</td><td class="r mono">' + K.num(cur.profit) + '</td><td class="r mono">' + sgn(cur.profit - prev.profit) + '</td><td class="r">' + dlt(cur.profit, prev.profit) + '</td></tr>';
    if (cur.cash || prev.cash) h += '<tr><td><small>参考：請求書のない入金（売上高）</small></td><td class="r mono">' + K.num(prev.cash) + '</td><td class="r mono">' + K.num(cur.cash) + '</td><td></td><td></td></tr>';
    h += '</tbody></table></div><p class="src mt">経費は KichoAuto と同じ集計（青色申告決算書の経費の科目・事業の割合をかけた額、カードの返金は差し引く）。税込の金額のままの目安です。最終確認は国税庁の案内・税理士へ。</p></div>';
    var sp = steps(monSel), dn = sp.filter(function (x) { return x.ok; }).length;
    h += '<div class="panel st"><div class="ph"><h2><b>04</b>締め作業（' + K.ymd(D(monSel + '-01')).m + '月）</h2><span class="tag">' + dn + '/6</span></div>' + ringHtml(dn / 6, 'mr', dn + '<small>/6</small>', '進み具合') + stepsHtml(sp);
    h += '<div class="btns mt"><button class="btn" data-act="mon-done" id="monDone">' + ((S.close[monSel] || {}).mon ? '確認済み' : '月次まとめを確認した') + '</button></div></div></div>';
    // 固定費
    var subs = K.recurring(S.tx.filter(function (e) { return e.dir === 'out' && K.isExp(e.acc); }));
    h += '<div class="panel mt"><div class="ph"><h2><b>05</b>毎月の固定費（候補）</h2><span class="tag">同じお店・ほぼ同じ金額が3か月以上</span></div><div class="tw"><table><thead><tr><th>お店</th><th>科目</th><th class="r">1回の金額（目安）</th><th class="r">月数</th><th class="r">1年あたり</th><th>状態</th></tr></thead><tbody>';
    subs.slice(0, 8).forEach(function (s) { h += '<tr><td>' + esc(s.name) + '</td><td>' + esc(s.acc) + '</td><td class="r mono">' + K.num(s.amt) + '</td><td class="r mono">' + s.months + '</td><td class="r mono">' + (s.stopped ? '—' : K.num(s.year)) + '</td><td>' + (s.stopped ? pill('要確認') + ' 最近の支払いなし' : '<span class="pill ok">続いている</span>') + '</td></tr>'; });
    if (!subs.length) h += '<tr><td colspan="6" class="note">見つかりませんでした。</td></tr>';
    h += '</tbody></table></div><p class="src mt">見つけ方は MoneyLens と同じ。使っていないサービスがないか、月に1回見直すと経費が減らせます。</p></div>';
    $('#v-mon').innerHTML = h;
    animate($('#v-mon'));
  };

  // ================= 7) 設定 =================
  RENDER.set = function () {
    var c = C();
    var h = '<div class="grid g2"><div class="panel"><div class="ph"><h2><b>COMPANY</b>会社と請求書の設定</h2></div><div class="form">';
    h += fld('会社・屋号の名前', '<input data-bind="co:name" value="' + esc(c.name) + '">', 'wide') + fld('登録番号（T＋13桁）', '<input data-bind="co:reg" value="' + esc(c.reg) + '">') + fld('電話', '<input data-bind="co:tel" value="' + esc(c.tel) + '">');
    h += fld('住所', '<input data-bind="co:addr" value="' + esc(c.addr) + '">', 'wide') + fld('振込先', '<input data-bind="co:bank" value="' + esc(c.bank) + '">', 'wide') + fld('請求書の備考', '<input data-bind="co:note" value="' + esc(c.note) + '">', 'wide');
    h += fld('明細の金額', '<select data-bind="co:taxin">' + opts([['ex', '税抜'], ['in', '税込']], c.taxin) + '</select>') + fld('消費税の端数', '<select data-bind="co:round">' + opts([['floor', '切り捨て'], ['round', '四捨五入'], ['ceil', '切り上げ']], c.round) + '</select>') + fld('支払期限', '<select data-bind="co:due">' + opts([['eom0', '当月末'], ['eom1', '翌月末'], ['eom2', '翌々月末'], ['d30', '30日後']], c.due) + '</select>');
    h += fld('請求書番号の頭', '<input data-bind="co:prefix" value="' + esc(c.prefix) + '">') + fld('差し引かれる振込手数料（円まで）', '<input class="num" data-bind="co:feeMax" value="' + esc(c.feeMax) + '">');
    h += '</div><p class="note mt">端数処理・税込/税抜は、これから作る請求書に使います（発行済みの請求書は発行したときの設定のまま）。</p></div>';
    h += '<div class="panel st"><div class="ph"><h2><b>TIME</b>勤怠の設定</h2></div><div class="form">';
    h += fld('1日の所定（時間外の境目）', '<input data-bind="co:kday" value="' + esc(c.kday) + '">') + fld('1週の上限', '<input data-bind="co:kweek" value="' + esc(c.kweek) + '">') + fld('時間外の上限（時間/月）', '<input class="num" data-bind="co:kot" value="' + esc(c.kot) + '">');
    h += fld('週の始まり', '<select data-bind="co:kws">' + opts([[0, '日曜日'], [1, '月曜日']], c.kws) + '</select>') + fld('法定休日', '<select data-bind="co:khol">' + opts([[0, '日曜日'], [6, '土曜日'], [-1, '決めない']], c.khol) + '</select>') + fld('休憩が空のとき', '<select data-bind="co:kbrk">' + opts([['law', '自動で引く（6時間超45分・8時間超60分）'], ['none', '引かない']], c.kbrk) + '</select>', 'wide');
    h += fld('休日にする日（2026/11/3, …）', '<input data-bind="co:kextra" value="' + esc(c.kextra) + '">', 'wide');
    h += '</div><p class="note mt">勤怠集計と同じ初期値です。就業規則・労使協定に合わせて変えてください。</p></div></div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>LAW</b>インボイスの記載事項と端数処理</h2><span class="tag">国税庁の案内にもとづく</span></div><ul class="chk">';
    ['発行する事業者の名前と登録番号', '取引の年月日', '取引の内容（軽減税率の対象なら、その旨）', '税率ごとに分けて合計した金額（税抜か税込）と適用税率', '税率ごとに分けた消費税額', '受け取る事業者の名前'].forEach(function (t, i) { h += '<li><i>' + (i + 1) + '</i><span>' + t + '</span></li>'; });
    h += '</ul><p class="note mt">消費税の端数処理は、1枚の請求書につき税率ごとに1回。1行ごとに端数処理して合計するやり方は認められていません。切り捨て・四捨五入・切り上げは事業者が選べます。</p><p class="src">出典：国税庁「適格請求書等保存方式の概要」・「消費税の仕入税額控除制度における適格請求書等保存方式に関するQ&A」。最終確認は国税庁の案内・税理士へ。</p></div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>DATA</b>データ</h2></div><p class="note">データはこのブラウザ（localStorage）にだけ保存しています。外部には送信しません。ブラウザのデータを消すと、入力も消えます。</p><div class="btns"><button class="btn" data-act="reset">見本データに戻す</button><span class="note">今の入力は消えて、架空の「サンプル商事（架空）」の見本に戻ります。</span></div></div>';
    $('#v-set').innerHTML = h;
  };

  // ================= 入力の受けとり =================
  function onBind(el, final) {
    var b = el.getAttribute('data-bind').split(':'), v = el.value;
    switch (b[0]) {
      case 'dr': S.draft[b[1]] = v; save(); invPreview(); var mi = $('#invMini span'); if (mi && b[1] === 'partner') mi.textContent = v || '新しい請求書'; return;
      case 'di': S.draft.items[+b[1]][b[2]] = b[2] === 'rate' ? +v : v; save(); invPreview(); var mt = $('#invMini .em-t span'); if (mt) mt.textContent = yen(invCalc(draftAsInv()).total); return;
      case 'co':
        var k = b[1], c = C();
        if (k === 'feeMax' || k === 'kot') c[k] = n0(v);
        else if (k === 'kws' || k === 'khol') c[k] = +v;
        else c[k] = v;
        if (k === 'name') $('#coName').textContent = v;
        save(); if (final && k !== 'rules' && k !== 'namemap') render(); return;
    }
  }
  document.addEventListener('input', function (ev) {
    var el = ev.target;
    if (el.id === 'impText') { var pv = impPreview(el.value, S.pending ? S.pending.name : (impName || '明細.csv')); $('#impMap').innerHTML = pv ? pv.html : ''; if (S.pending) S.pending.text = el.value; else if (el.value) S.pending = { name: impName || '貼り付けた明細.csv', text: el.value }; save(); return; }
    if (el.id === 'jrQ') { jrQ = el.value; var pos = el.selectionStart; render(); var q = $('#jrQ'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (e) { /* なし */ } } return; }
    if (!el.getAttribute || !el.hasAttribute('data-bind')) return;
    if (el.tagName === 'SELECT' || el.type === 'date') return; // change で受ける
    onBind(el, false);
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (!el.getAttribute) return;
    if (el.hasAttribute('data-acc')) { setAcc(el.getAttribute('data-acc'), el.value); return; }
    if (el.hasAttribute('data-pct')) { var e = txById(el.getAttribute('data-pct')); if (e) { e.pct = Math.min(100, Math.max(0, Math.round(n0(el.value)))); e.manual = true; commit(); } return; }
    if (el.hasAttribute('data-recinv')) {
      var iv = invById(el.getAttribute('data-recinv'));
      if (el.value) recManual(iv.id, el.value);
      return;
    }
    if (el.id === 'jrMonth') { jrMonth = el.value; render(); return; }
    if (el.id === 'jrOnly') { jrOnly = el.value; render(); return; }
    if (el.id === 'monSel') { monSel = el.value; render(); return; }
    if (el.id === 'impFile') {
      var f = el.files && el.files[0]; if (!f) return;
      f.arrayBuffer().then(function (buf) {
        var r = K.decode(new Uint8Array(buf)); impName = f.name; S.pending = { name: f.name, text: r.text }; save(); render();
        toast(f.name + ' を読みました（' + r.enc.label + '）。「読み込んで仕訳する」を押してください');
      }, function () { toast('ファイルを読めませんでした'); });
      return;
    }
    if (!el.hasAttribute('data-bind')) return;
    if (el.getAttribute('data-bind') === 'co:rules') { save(); return; }
    onBind(el, true);
  });
  document.addEventListener('click', function (ev) {
    var nb = ev.target.closest && ev.target.closest('#nav button'); if (nb) { go(nb.getAttribute('data-view')); return; }
    var b = ev.target.closest && ev.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'TEXTAREA') return;
    if (b.disabled) return;
    var a = b.getAttribute('data-act'), id = b.getAttribute('data-id');
    switch (a) {
      case 'reset':
        if (!DEMO && !window.confirm('今の入力を消して、見本データ（架空）に戻しますか？')) return;
        S = fresh(); shown = {}; selInv = null; jrMonth = null; monSel = null; kinEdit = null; save(); $('#coName').textContent = S.company.name; go(view); toast('見本データに戻しました'); return;
      case 'imp-load': doImport(); return;
      case 'rules-apply': { var R = rules(), n = 0; S.tx.forEach(function (e) { if (!e.manual) { var was = e.acc; K.classify(e, R); if (was !== e.acc) n++; } }); log('ルールで振り分け直した（' + n + '行が変わった）'); commit(); toast('振り分け直しました（' + R.length + '個のキーワード・' + n + '行が変わった。手で選んだ行はそのまま）'); return; }
      case 'rules-reset': if (!DEMO && !window.confirm('科目の決め方を最初の設定に戻しますか？（足したキーワードは消えます）')) return; C().rules = K.DEFAULT_RULES; commit(); toast('最初の設定に戻しました'); return;
      case 'jr-csv': {
        try { var blob = new Blob([journalCSV()], { type: 'text/csv' }), u = URL.createObjectURL(blob), ln = document.createElement('a'); ln.href = u; ln.download = '仕訳帳.csv'; document.body.appendChild(ln); ln.click(); setTimeout(function () { URL.revokeObjectURL(u); ln.remove(); }, 3000); toast('仕訳帳.csv を保存しました（Excelで開けるUTF-8・BOM付き）'); } catch (e) { toast('保存できませんでした'); }
        return;
      }
      case 'di-add': S.draft.items.push({ date: S.draft.issue, item: '', qty: '', unit: '', price: '', rate: 10 }); save(); render(); return;
      case 'di-del': S.draft.items.splice(+b.getAttribute('data-i'), 1); if (!S.draft.items.length) S.draft.items.push({ date: S.draft.issue, item: '', qty: '', unit: '', price: '', rate: 10 }); save(); render(); return;
      case 'inv-issue': issueInv(); return;
      case 'inv-clear': S.draft = blankDraft(); selInv = null; save(); render(); return;
      case 'inv-open': selInv = id; render(); var dc = $('#invDoc'); if (dc && !DEMO) dc.scrollIntoView({ block: 'start' }); return;
      case 'inv-back': selInv = null; render(); return;
      case 'inv-more': invMore = true; render(); return;
      case 'rec-confirm': recConfirmAll(); return;
      case 'rec-undo': recUndo(id); return;
      case 'kin-who': kinWho = b.getAttribute('data-w'); render(); return;
      case 'kin-fix': { var r0 = S.kintai.filter(function (r) { return r.id === id; })[0]; if (r0) { kinEdit = { no: r0.no, date: r0.date, s: r0.s, e: r0.e, brk: r0.brk }; kinWho = r0.no + ' ' + r0.name; render(); var ke = $('#kn-e'); if (ke) ke.focus(); } return; }
      case 'kin-add': {
        var no = $('#kn-who').value, nm = (S.kintai.filter(function (r) { return r.no === no; })[0] || {}).name || '', dt = $('#kn-date').value;
        var rec = { id: uid('w'), no: no, name: nm, date: dt, s: $('#kn-s').value.trim(), e: $('#kn-e').value.trim(), brk: $('#kn-b').value.trim() };
        if (D(dt) === null || (!has(rec.s) && !has(rec.e))) { toast('日付と出勤・退勤を入れてください'); return; }
        if (K.ym(D(dt)) !== MK) { toast('今月（' + K.ymd(TODAY).m + '月）の日付を入れてください'); return; }
        S.kintai = S.kintai.filter(function (r) { return !(r.no === no && r.date === dt); }); S.kintai.push(rec); S.kintai.sort(function (x, y) { return D(x.date) - D(y.date); });
        kinEdit = null; kinNew = rec.id; kinWho = no + ' ' + nm; log('勤怠：' + nm + ' ' + K.md(D(dt)) + ' ' + rec.s + '〜' + rec.e); commit(); toast('記録しました'); return;
      }
      case 'kin-close': { var sk = kintaiRes().skipped.length; closeOf(MK).kintai = true; log('勤怠を締めた（' + K.ymd(TODAY).m + '月' + (sk ? '・打刻もれ ' + sk + '件あり' : '') + '）'); commit(); toast(sk ? '締めました（打刻もれ ' + sk + '件は集計から外れています）' : '今月の勤怠を締めました'); return; }
      case 'mon-done': closeOf(monSel).mon = true; log('月次まとめを確認した（' + monSel + '）'); commit(); toast('月次まとめを確認済みにしました'); return;
    }
  });

  // ================= 自動デモ（?demo=1） =================
  // 実際のボタン・入力欄を、カーソルを動かして操作する（画面の部品を押して、アプリの機能をそのまま動かす）
  var cur = { x: 0, y: 0, el: null, ring: null };
  function curInit() { cur.el = $('#cursor'); cur.ring = $('#cursor .ring'); cur.el.style.display = 'block'; cur.x = window.innerWidth * 0.62; cur.y = window.innerHeight * 0.78; curPlace(); }
  function curPlace() { cur.el.style.transform = 'translate(' + cur.x.toFixed(1) + 'px,' + cur.y.toFixed(1) + 'px)'; }
  function scrollTo(el) {
    var m = $('#main'), r = el.getBoundingClientRect(), mr = m.getBoundingClientRect();
    if (r.top > mr.top + 70 && r.bottom < mr.bottom - 50) return Promise.resolve();
    var target = m.scrollTop + (r.top - mr.top) - mr.height * 0.38;
    target = Math.max(0, Math.min(m.scrollHeight - m.clientHeight, target));
    var from = m.scrollTop; if (Math.abs(target - from) < 4) return Promise.resolve();
    return new Promise(function (res) { tween(420, function (p) { m.scrollTop = from + (target - from) * p; }, res, easeIO); });
  }
  function moveTo(el, dur) {
    if (!el) return Promise.resolve();
    return scrollTo(el).then(function () {
      var r = el.getBoundingClientRect(), tx = r.left + Math.min(r.width * 0.5, 60), ty = r.top + Math.min(r.height * 0.6, 40), fx = cur.x, fy = cur.y;
      return new Promise(function (res) { tween(dur || 280, function (p) { cur.x = fx + (tx - fx) * p; cur.y = fy + (ty - fy) * p; curPlace(); }, res, easeIO); });
    });
  }
  function ripple() { tween(420, function (p) { cur.ring.style.opacity = (1 - p).toFixed(2); cur.ring.style.transform = 'scale(' + (0.4 + p * 1.2).toFixed(2) + ')'; }); }
  function click(sel2) {
    var el = typeof sel2 === 'string' ? $(sel2) : sel2; if (!el) return Promise.resolve();
    return moveTo(el).then(function () { ripple(); return wait(90); }).then(function () { el.click(); return wait(130); });
  }
  function type(sel2, text, per) {
    var el = typeof sel2 === 'string' ? $(sel2) : sel2; if (!el) return Promise.resolve();
    return moveTo(el, 220).then(function () {
      ripple(); el.classList.add('typing'); el.value = '';
      var i = 0;
      function step() {
        if (i >= text.length) { el.classList.remove('typing'); el.dispatchEvent(new Event('change', { bubbles: true })); return wait(50); }
        i++; el.value = text.slice(0, i); el.dispatchEvent(new Event('input', { bubbles: true }));
        return wait(per || 30).then(step);
      }
      return step();
    });
  }
  function pick(sel2, v) {
    var el = typeof sel2 === 'string' ? $(sel2) : sel2; if (!el) return Promise.resolve();
    return moveTo(el).then(function () { ripple(); el.classList.add('typing'); return wait(260); }).then(function () { el.value = v; el.classList.remove('typing'); el.dispatchEvent(new Event('change', { bubbles: true })); return wait(150); });
  }
  function nav(v) { return click('#nav button[data-view="' + v + '"]').then(function () { return wait(180); }); }
  function pulse(k) { flowPulse = k; flowPulseT = now(); }
  function runDemo() {
    demoOn = true; curInit();
    var unc = null;
    wait(1200)
      .then(function () { pulse(0); return nav('imp'); })
      .then(function () { return moveTo($('#impText'), 380); })
      .then(function () { return wait(450); })
      .then(function () { return click('#impLoad'); })
      .then(function () { return wait(500); })
      .then(function () { pulse(1); unc = S.tx.filter(function (e) { return K.state(e) === '未分類' && K.ym(D(e.date)) === MK; })[0]; return unc ? moveTo($('#acc-' + unc.id), 420) : null; })
      .then(function () { return wait(350); })
      .then(function () { return unc ? pick('#acc-' + unc.id, '諸会費') : null; })
      .then(function () { return wait(700); })
      .then(function () { pulse(2); return nav('inv'); })
      .then(function () { return type('#ni-partner', '株式会社デモ企画', 32); })
      .then(function () { return type('[data-bind="di:0:item"]', 'LP追加制作', 32); })
      .then(function () { return type('[data-bind="di:0:qty"]', '1', 40); })
      .then(function () { return type('[data-bind="di:0:price"]', '120000', 35); })
      .then(function () { var u = $('[data-bind="di:1:unit"]'); if (u) { u.value = '箱'; u.dispatchEvent(new Event('input', { bubbles: true })); } return type('[data-bind="di:1:item"]', '打ち合わせ用 茶菓子', 22); })
      .then(function () { return type('[data-bind="di:1:qty"]', '2', 40); })
      .then(function () { return type('[data-bind="di:1:price"]', '1500', 35); })
      .then(function () { return pick('[data-bind="di:1:rate"]', '8'); })
      .then(function () { return moveTo($('#invChk'), 380); })
      .then(function () { return wait(700); })
      .then(function () { return click('#invIssue'); })
      .then(function () { return wait(800); })
      .then(function () { pulse(3); return nav('rec'); })
      .then(function () { return moveTo($('#recTbl'), 380); })
      .then(function () { return wait(1100); })
      .then(function () { return click('#recConfirm'); })
      .then(function () { return wait(1000); })
      .then(function () { pulse(4); return nav('mon'); })
      .then(function () { return moveTo($('#monTbl'), 450); })
      .then(function () { return wait(900); })
      .then(function () { return click('#monDone'); })
      .then(function () { return wait(500); })
      .then(function () { return nav('dash'); })
      .then(function () { return wait(2200); })
      .then(function () { cur.el.style.display = 'none'; demoOn = false; window.__studio.demoDone = true; });
  }

  // ================= 起動 =================
  S = load();
  $('#coName').textContent = S.company.name;
  $('#todayLabel').textContent = '今日 ' + K.slash(TODAY) + '（' + K.WD[K.wday(TODAY)] + '）';
  showWarn();
  if (!DEMO) save();
  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  window.__studio.ready = fontsReady.then(function () {
    go('dash');
    if (DEMO) runDemo();
    return true;
  });
})();
