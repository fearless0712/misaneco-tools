/* 建設スタジオ：画面の部分。計算は logic.js（Excel版と同じルール）、見本は data.js。
   データは localStorage だけに保存（外部送信なし）。動きは requestAnimationFrame（30コマ/秒まで、見えないときは止める）。
   ?demo=1 … 見積→現場→工程→日報→請求→入金を自動で操作（保存しない）
   ?capture=1 … 時計を外から進める（window.__studio.advance(ms)）。録画でコマ落ちしないように
   ?today=2026-10-22 … 「今日」を固定（見本・録画用） */
(function () {
  'use strict';
  var K = window.KL, PC = window.PC, DATA = window.KDATA;
  var Q = new URLSearchParams(location.search);
  var DEMO = Q.get('demo') === '1', CAPTURE = Q.get('capture') === '1';
  var KEY = 'kensetsu-studio-v1';
  var TODAY = K.D(Q.get('today')) || K.todayN();
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var yen = K.yen, pct = K.pct, n0 = K.n0, has = K.has;

  // ================= 保存 =================
  var S, storageOk = true;
  function load() {
    if (DEMO) return DATA.sample(TODAY);
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw); if (o && o.v === 1 && o.company && o.sites) return o; }
    } catch (e) { storageOk = false; }
    return DATA.sample(TODAY);
  }
  function save() {
    if (DEMO) return;
    try { localStorage.setItem(KEY, JSON.stringify(S)); storageOk = true; }
    catch (e) { storageOk = false; }
    showWarn();
  }
  function showWarn() {
    var w = $('#warn'), msg = [];
    if (DEMO) { /* 自動デモ中は画面をすっきりさせる（見本データで動かし、保存はしない） */ }
    else if (!storageOk) msg.push('このブラウザでは保存できません（プライベートモードなど）。ページを閉じると入力は消えます。');
    var y = K.ymd(TODAY).y;
    if (y < K.HOL_FROM || y > K.HOL_TO) msg.push('祝日は ' + K.HOL_FROM + '〜' + K.HOL_TO + '年分だけ入っています。それ以外の年は「設定」の会社の休みに足してください。');
    w.hidden = !msg.length; w.textContent = msg.join(' ');
  }
  function uid(p) { S.seq = (S.seq || 100) + 1; return p + S.seq; }
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
  var FMT = {
    yen: function (v) { return yen(v); }, pct: function (v) { return pct(v); }, n: function (v) { return K.num(v); },
    n1: function (v) { return K.num(v, 1); }, n2: function (v) { return K.num(v, 2); }
  };
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
  }
  function cnt(k, v, f, cls) { return '<span class="' + (cls || '') + '" data-k="' + esc(k) + '" data-v="' + (v === null || v === undefined ? 'x' : v) + '" data-f="' + (f || 'yen') + '"></span>'; }
  function toast(msg) {
    var el = $('#toast'); el.textContent = msg;
    tween(2600, function (p) { el.style.opacity = p < .1 ? p * 10 : (p > .85 ? (1 - p) / .15 : 1); }, null, function (p) { return p; });
  }

  // ================= 集計（アプリ全体） =================
  function cal() { return K.makeCal({ off: S.company.off, holidays: S.company.holidays, company: S.company.companyHolidays }); }
  function rates() { var r = {}; S.people.forEach(function (p) { r[p.name] = n0(p.rate); }); return r; }
  function allCosts() { return S.costs.concat(K.laborCosts(S.reports, n0(S.company.limit), rates())); }
  function issued() { return S.bills.filter(function (b) { return b.issued; }); }
  function site(id) { return S.sites.filter(function (s) { return s.id === id; })[0]; }
  function siteName(id) { var s = site(id); return s ? s.name : ''; }
  function activeSites() { return S.sites.filter(function (s) { return s.status !== '見積中'; }); }

  // ================= 画面の切りかえ =================
  var view = 'dash';
  var TITLES = { dash: 'ダッシュボード', est: '見積', sched: '現場と工程表', daily: '日報・出面', bills: '請求・入金', due: '期限', paint: '塗装計算', subs: '外注支払', set: '設定' };
  var RENDER = {};
  function go(v) {
    view = v;
    $$('#nav button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-view') === v); });
    $$('.view').forEach(function (s) { s.classList.toggle('on', s.id === 'v-' + v); });
    $('#viewTitle').textContent = TITLES[v];
    $('#main').scrollTop = 0;
    render();
    var nb = $('#nav button[data-view="' + v + '"]'); if (nb && nb.scrollIntoView && window.innerWidth <= 760) { var nav = $('#nav'); nav.scrollLeft = Math.max(0, nb.offsetLeft - 60); }
  }
  function render() { RENDER[view](); kick(); }
  function commit() { save(); render(); }

  // ================= 1) ダッシュボード =================
  var flowEls = null;
  RENDER.dash = function () {
    var el = $('#v-dash'), c = cal();
    var mk = K.monthKey(TODAY), bills = issued();
    var monthSales = bills.filter(function (b) { return K.monthKey(K.D(b.date)) === mk; }).reduce(function (a, b) { return a + n0(b.amount); }, 0);
    var costs = allCosts(), act = activeSites();
    var ps = K.profitSummary(act, costs, n0(S.company.target));
    var bs = K.billSummary(bills, TODAY);
    var target = n0(S.company.target);
    // 月別（6か月）
    var start = K.addMonths(TODAY, -5), mon = K.billMonthly(bills, start, 6);
    var mx = Math.max.apply(null, mon.map(function (m) { return Math.max(m.billed, m.received); }).concat([1]));
    // 現場の進み具合
    var prog = act.map(function (s) {
      var ts = S.tasks.filter(function (t) { return t.site === s.id; });
      return { s: s, p: K.siteProgress(ts, c, TODAY), pr: K.siteProfit(s, costs, target) };
    }).filter(function (x) { return x.p.workdays > 0; }).sort(function (a, b) { return (a.s.status === '完了') - (b.s.status === '完了') || a.p.first - b.p.first; });
    // 今週
    var mon0 = TODAY - ((K.wday(TODAY) + 6) % 7), week = [];
    for (var i = 0; i < 7; i++) {
      var dn = mon0 + i, items = [];
      S.tasks.forEach(function (t) { var ti = K.taskInfo(t, c, TODAY); if (ti.start !== null && ti.end !== null && dn >= ti.start && dn <= ti.end && K.isWork(dn, c)) items.push({ t: t, late: ti.judge === '遅れ' }); });
      week.push({ n: dn, items: items });
    }
    var dl = K.deadlinesSorted(S.deadlines, TODAY, n0(S.company.yel), n0(S.company.red)).slice(0, 5);
    // 流れの件数
    var thisMonthReports = S.reports.filter(function (r) { return K.monthKey(K.D(r.date)) === mk; });
    var nk = K.dailyMonth(S.reports, n0(S.company.limit), TODAY);
    var ninkuMonth = Object.keys(nk.person).reduce(function (a, k) { return a + nk.person[k].ninku; }, 0);
    var recv = bills.filter(function (b) { return K.monthKey(K.D(b.paidDate)) === mk; }).reduce(function (a, b) { return a + n0(b.paid); }, 0);
    var lateTasks = S.tasks.filter(function (t) { return K.taskInfo(t, c, TODAY).judge === '遅れ'; }).length;
    var flow = [
      { lab: '見積', k: 'f-est', v: S.estimates.length, f: 'n', u: '件' },
      { lab: '工程', k: 'f-task', v: S.tasks.length, f: 'n', u: '本' },
      { lab: '日報', k: 'f-rep', v: ninkuMonth, f: 'n1', u: '人工' },
      { lab: '請求', k: 'f-bill', v: monthSales, f: 'yen', u: '' },
      { lab: '入金', k: 'f-paid', v: recv, f: 'yen', u: '' }
    ];
    var h = '';
    h += '<div class="grid g4">';
    h += kpi('今月の売上（請求・税込）', cnt('d-sales', monthSales), '', '請求 ' + bills.filter(function (b) { return K.monthKey(K.D(b.date)) === mk; }).length + '件', 'k-sales', Math.min(1, monthSales / Math.max(1, mx)));
    h += kpi('粗利（進行中・完了の現場／税抜）', cnt('d-profit', ps.profit), 'gr', '見積 ' + yen(ps.est) + '・原価 ' + yen(ps.cost), 'k-prof', ps.est ? Math.max(0, ps.profit / ps.est) : 0, 'cy');
    h += kpi('粗利率', cnt('d-margin', ps.margin, 'pct'), 'cy', '目標 ' + pct(target, 0) + (ps.under ? '・<span class="bad">目標未満 ' + ps.under + '現場</span>' : ''), 'k-marg', ps.margin || 0, 'cy');
    h += kpi('未入金', cnt('d-unpaid', bs.remain), bs.late ? 'rd' : '', bs.lateCount ? '<span class="bad">遅れ ' + bs.lateCount + '件 ' + yen(bs.late) + '</span>' : '遅れなし', 'k-unp', bills.length ? bs.remain / Math.max(1, mx * 2) : 0);
    h += '</div>';
    // 流れ
    h += '<div class="panel flow mt"><div class="ph"><h2><b>FLOW</b>見積 → 工程 → 日報 → 請求 → 入金</h2><span class="tag">今月</span></div>';
    h += '<svg viewBox="0 0 520 96" id="flowSvg" role="img" aria-label="見積から入金までのつながり">';
    h += '<defs><linearGradient id="fl" x1="0" x2="1"><stop offset="0" stop-color="#ff9142"/><stop offset="1" stop-color="#4cc9f0"/></linearGradient></defs>';
    h += '<line x1="44" y1="34" x2="476" y2="34" stroke="#1f2838" stroke-width="6" stroke-linecap="round"/>';
    h += '<line x1="44" y1="34" x2="476" y2="34" stroke="url(#fl)" stroke-width="2" stroke-linecap="round" opacity=".9"/>';
    for (var j = 0; j < 9; j++) h += '<circle class="fd" r="2.6" cy="34" cx="44" fill="#fff"/><circle class="fh" r="7" cy="34" cx="44" fill="#ff9142" opacity=".22"/>';
    flow.forEach(function (f, i) {
      var x = 44 + i * 108;
      h += '<circle class="fn" cx="' + x + '" cy="34" r="13" fill="#0b0f18" stroke="' + (i < 2 ? '#ff9142' : i === 2 ? '#f2c65a' : '#4cc9f0') + '" stroke-width="2"/>';
      h += '<circle class="fr" cx="' + x + '" cy="34" r="13" fill="none" stroke="#fff" stroke-width="1.5" opacity="0"/>';
      h += '<text x="' + x + '" y="38" text-anchor="middle" font-family="JetBrains Mono" font-size="11" fill="#fff">' + (i + 1) + '</text>';
      h += '<text class="nlab" x="' + x + '" y="66" text-anchor="middle">' + f.lab + '</text>';
      h += '<text class="ncnt" x="' + x + '" y="84" text-anchor="middle"><tspan data-k="' + f.k + '" data-v="' + f.v + '" data-f="' + f.f + '"></tspan>' + f.u + '</text>';
    });
    h += '</svg></div>';
    // グラフと進み具合
    h += '<div class="grid g2 mt">';
    h += '<div class="panel"><div class="ph"><h2><b>01</b>請求と入金（6か月）</h2><div class="legend"><span><i style="background:#ff9142"></i>請求</span><span><i style="background:#4cc9f0"></i>入金</span></div></div><div class="chart">';
    mon.forEach(function (m, i) {
      var o = K.ymd(m.month);
      h += '<div class="col' + (i === 5 ? ' now' : '') + '"><div class="bars"><div class="bar b1" data-h="' + (m.billed / mx) + '" data-hk="cb' + i + '" title="請求 ' + yen(m.billed) + '"></div><div class="bar b2" data-h="' + (m.received / mx) + '" data-hk="cr' + i + '" title="入金 ' + yen(m.received) + '"></div></div><span class="m">' + o.m + '月</span></div>';
    });
    h += '</div></div>';
    h += '<div class="panel cy"><div class="ph"><h2><b>02</b>現場の進み具合</h2><span class="tag">' + (lateTasks ? '遅れ ' + lateTasks + '工程' : '遅れなし') + '</span></div><div class="prog">';
    prog.slice(0, 5).forEach(function (x) {
      var cls = x.p.late ? 'late' : (x.s.status === '完了' || x.p.ratio >= 1 ? 'done' : '');
      h += '<div class="row ' + cls + '"><div class="t"><span>' + esc(x.s.name) + (x.p.late ? ' <span class="pill bad">遅れ</span>' : '') + '</span><em>' + Math.round(x.p.ratio * 100) + '%・' + (x.pr.total ? '粗利 ' + pct(x.pr.margin) : '原価なし') + '</em></div><div class="track"><i data-w="' + x.p.ratio + '" data-wk="pg' + x.s.id + '"></i></div></div>';
    });
    if (!prog.length) h += '<p class="note">工程のある現場はまだありません。</p>';
    h += '</div></div></div>';
    // 今週・期限・動き
    h += '<div class="grid g32 mt">';
    h += '<div class="panel"><div class="ph"><h2><b>03</b>今週の現場</h2><span class="tag">' + K.md(mon0) + '〜' + K.md(mon0 + 6) + '</span></div><div class="week">';
    week.forEach(function (d) {
      var off = !K.isWork(d.n, c), cls = (off ? ' off' : '') + (d.n === TODAY ? ' today' : '');
      h += '<div class="d' + cls + '"><div class="dh"><span>' + K.WD[K.wday(d.n)] + '</span><span>' + K.ymd(d.n).d + '</span></div>';
      d.items.slice(0, 3).forEach(function (it) { h += '<span class="dot" style="border-color:' + (it.late ? '#ff5d73' : siteColor(it.t.site)) + '" title="' + esc(siteName(it.t.site) + '：' + it.t.name) + '">' + esc(shortSite(it.t.site)) + '</span>'; });
      if (d.items.length > 3) h += '<span class="dot" style="border-color:#5d6880">+' + (d.items.length - 3) + '</span>';
      if (off && !d.items.length) h += '<span class="dot" style="border-color:transparent;color:#5d6880">' + (K.holidayName(d.n) || '休み') + '</span>';
      h += '</div>';
    });
    h += '</div></div>';
    h += '<div class="panel cy"><div class="ph"><h2><b>04</b>期限が近いもの</h2><span class="tag">近い順</span></div><div class="list">';
    dl.forEach(function (x) { h += '<div class="li"><span class="days ' + dCls(x.s.status) + '">' + (x.s.remain < 0 ? x.s.remain : x.s.remain) + '日</span><span class="x">' + esc(x.d.item) + '<small>' + esc(x.d.name) + '</small></span>' + pill(x.s.status) + '</div>'; });
    h += '</div></div></div>';
    h += '<div class="panel mt feed"><div class="ph"><h2><b>05</b>最近の動き</h2></div><div class="list">';
    S.log.slice(0, 5).forEach(function (l) { h += '<div class="li"><span class="m">' + esc(K.md(K.D(l.t))) + '</span><span class="x">' + esc(l.msg) + '</span></div>'; });
    h += '</div></div>';
    el.innerHTML = h;
    flowEls = { d: $$('.fd', el), h: $$('.fh', el), r: $$('.fr', el) };
    animate(el);
  };
  function kpi(lab, valHtml, cls, sub, wk, w, sparkCls) {
    return '<div class="panel kpi"><div class="lab">' + lab + '</div><div class="val ' + (cls || '') + '">' + valHtml + '</div><div class="sub">' + sub + '</div><div class="spark ' + (sparkCls || '') + '"><i data-w="' + (w || 0) + '" data-wk="' + wk + '"></i></div></div>';
  }
  var flowPulse = -1, flowPulseT = 0;
  function drawFlow(t) {
    if (!flowEls || !flowEls.d.length || !document.body.contains(flowEls.d[0])) { flowEls = null; return; }
    var L = 432, n = flowEls.d.length;
    var near = [0, 0, 0, 0, 0];
    for (var i = 0; i < n; i++) {
      var p = ((t / 3600) + i / n) % 1, x = 44 + p * L;
      flowEls.d[i].setAttribute('cx', x.toFixed(1)); flowEls.h[i].setAttribute('cx', x.toFixed(1));
      var col = p < .45 ? '#ff9142' : (p < .55 ? '#f2c65a' : '#4cc9f0'); flowEls.h[i].setAttribute('fill', col);
      for (var k = 0; k < 5; k++) { var dd = Math.abs(x - (44 + k * 108)); if (dd < 14) near[k] = Math.max(near[k], 1 - dd / 14); }
    }
    for (var k2 = 0; k2 < 5; k2++) {
      var on = flowPulse === k2 ? Math.max(0, 1 - (t - flowPulseT) / 1400) : 0;
      var a = Math.max(near[k2] * .6, on);
      flowEls.r[k2].setAttribute('opacity', a.toFixed(2)); flowEls.r[k2].setAttribute('r', (13 + a * 7).toFixed(1));
    }
  }
  var COLORS = ['#ff9142', '#4cc9f0', '#3ddc97', '#b18cff', '#f2c65a', '#ff7ab6', '#7ae0ff'];
  function siteColor(id) { var i = S.sites.map(function (s) { return s.id; }).indexOf(id); return COLORS[(i < 0 ? 0 : i) % COLORS.length]; }
  function shortSite(id) { var n = siteName(id); return n.split(/[ 　]/)[0]; }
  function dCls(st) { return st === '期限切れ' || st === '急ぎ' ? 'bad' : (st === '注意' ? 'warn' : 'ok'); }
  function pill(st) {
    var m = { '期限切れ': 'exp', '急ぎ': 'bad', '注意': 'warn', 'OK': 'ok', '遅れ': 'bad', '入金済': 'ok', '支払済': 'ok', '一部入金': 'warn', '一部支払': 'warn', '未入金': 'info', '未払い': 'info', '請求予定': 'mut', '完了': 'ok', '作業中': 'info', '未着手': 'mut', '目標未満': 'bad', '期限なし・未入力': 'mut' };
    return st ? '<span class="pill ' + (m[st] || 'mut') + '">' + esc(st) + '</span>' : '';
  }

  // ================= 2) 見積 =================
  var curEst = null;
  function est() { var e = S.estimates.filter(function (x) { return x.id === curEst; })[0]; if (!e) { e = S.estimates[0]; curEst = e ? e.id : null; } return e; }
  function newEst() {
    var no = 'M-' + K.ymd(TODAY).y + '-' + String(S.estimates.length + 101).padStart(4, '0');
    var e = { id: uid('e'), no: no, date: K.iso(TODAY), days: 30, to: '', title: '', site: '', rate: 0.05, discount: 0, round: S.company.round, lines: [{ kind: '', name: '', qty: '', unit: '', price: '', reduced: false }] };
    S.estimates.unshift(e); curEst = e.id; return e;
  }
  RENDER.est = function () {
    var e = est(); if (!e) e = newEst();
    var r = K.estimate(e), lim = K.validUntil(e.date, e.days);
    var h = '<div class="btns" style="margin-bottom:12px"><label class="f" style="flex:1;min-width:200px">見積を選ぶ<select data-act="pick-est">';
    S.estimates.forEach(function (x) { h += '<option value="' + x.id + '"' + (x.id === e.id ? ' selected' : '') + '>' + esc(x.no + '　' + (x.title || '（件名なし）')) + '</option>'; });
    h += '</select></label><button class="ghost" data-act="new-est">＋ 新しい見積</button><button class="ghost" data-act="del-est">この見積を消す</button></div>';
    h += '<div class="est-mini" id="estMini"></div>';
    h += '<div class="grid g32"><div class="panel"><div class="ph"><h2><b>EST</b>見積の内容</h2><span class="tag mono">' + esc(e.no) + '</span></div>';
    h += '<div class="form">';
    h += fld('宛先', '<input id="f-est-to" data-bind="est:to" value="' + esc(e.to) + '" placeholder="例：山田 太郎 様">');
    h += fld('件名（工事名）', '<input id="f-est-title" data-bind="est:title" value="' + esc(e.title) + '" placeholder="例：○○様邸 外壁塗装工事">', 'wide');
    h += fld('見積日', '<input type="date" data-bind="est:date" value="' + esc(e.date) + '">');
    h += fld('有効日数', '<input class="num" inputmode="numeric" data-bind="est:days" value="' + esc(e.days) + '">');
    h += fld('有効期限', '<input disabled id="f-est-lim" value="' + (lim === null ? '' : K.iso(lim)) + '">');
    h += fld('諸経費率（%）', '<input class="num" inputmode="decimal" data-bind="est:ratePct" value="' + esc(K.round(n0(e.rate) * 100, 4)) + '">');
    h += fld('値引き（円）', '<input class="num" inputmode="numeric" data-bind="est:discount" value="' + esc(e.discount) + '">');
    h += fld('消費税の端数', '<select data-bind="est:round">' + ['切り捨て', '四捨五入', '切り上げ'].map(function (x) { return '<option' + (x === e.round ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>');
    h += '</div>';
    h += '<div class="tw mt"><table class="lines" id="estLines"><colgroup><col style="width:14%"><col style="width:25%"><col style="width:10%"><col style="width:9%"><col style="width:13%"><col style="width:6%"><col style="width:16%"><col style="width:7%"></colgroup><thead><tr><th>工種</th><th>品名・仕様</th><th class="r">数量</th><th>単位</th><th class="r">単価</th><th title="軽減税率8%">軽減</th><th class="r">金額</th><th></th></tr></thead><tbody>';
    e.lines.forEach(function (l, i) {
      h += '<tr data-row="' + i + '"><td><input data-bind="line:' + i + ':kind" value="' + esc(l.kind) + '" placeholder="工種"></td><td><input data-bind="line:' + i + ':name" value="' + esc(l.name) + '" placeholder="品名"></td>';
      h += '<td><input class="num" inputmode="decimal" data-bind="line:' + i + ':qty" value="' + esc(l.qty) + '"></td><td><input data-bind="line:' + i + ':unit" value="' + esc(l.unit) + '" list="units" ></td>';
      h += '<td><input class="num" inputmode="numeric" data-bind="line:' + i + ':price" value="' + esc(l.price) + '"></td><td style="text-align:center"><input type="checkbox" data-bind="line:' + i + ':reduced"' + (l.reduced ? ' checked' : '') + '></td>';
      h += '<td class="amt" id="amt-' + i + '">' + (r.lines[i].amount === null ? '' : K.num(r.lines[i].amount)) + '</td><td><button class="ghost sm" data-act="del-line" data-i="' + i + '" aria-label="行を消す">×</button></td></tr>';
    });
    h += '</tbody></table><datalist id="units">' + '式,m,m2,m3,本,個,台,箇所,枚,缶,kg,人工,日,セット'.split(',').map(function (u) { return '<option value="' + u + '">'; }).join('') + '</datalist></div>';
    h += '<div class="btns mt"><button class="ghost" data-act="add-line" id="addLine">＋ 行を足す</button><span class="note">金額＝数量×単価（1円未満は四捨五入）。軽減にチェックした行は8%。</span></div></div>';
    // 合計
    h += '<div class="panel cy"><div class="ph"><h2><b>SUM</b>合計（その場で計算）</h2></div><div class="tot" id="estTot"></div>';
    h += '<div class="mt">';
    if (e.site && site(e.site)) h += '<p class="linked">● この見積から現場「' + esc(siteName(e.site)) + '」を作成済み</p>';
    else h += '<button class="btn big" style="width:100%" data-act="make-site" id="makeSite">この見積で現場を作る →</button><p class="note">押すと、現場・工程（工種ごと）・請求予定（着手金30%と完成）が自動でできます。</p>';
    h += '</div><p class="note mt">消費税は、税率ごとに合計した金額に税率をかけて、1回だけ端数処理します（国税庁 インボイスQ&A 問57）。諸経費と値引きは10%の対象として計算します。</p></div></div>';
    $('#v-est').innerHTML = h;
    estTotals(false);
  };
  function fld(lab, input, cls) { return '<label class="f' + (cls ? ' ' + cls : '') + '">' + lab + input + '</label>'; }
  function estTotals(animateIt) {
    var e = est(); if (!e) return; var r = K.estimate(e), box = $('#estTot'); if (!box) return;
    var rows = [['小計', r.subtotal, 'et-sub'], ['諸経費（' + K.round(n0(e.rate) * 100, 4) + '%・切り捨て）', r.overhead, 'et-ovh'], ['値引き', -r.discount, 'et-dis'], ['税抜合計', r.excl, 'et-excl'],
      ['10%対象（税抜）', r.base10, 'et-b10'], ['消費税（10%）', r.tax10, 'et-t10'], ['8%対象（税抜）', r.base8, 'et-b8'], ['消費税（8%）', r.tax8, 'et-t8']];
    var h = rows.map(function (x) { return '<div class="r"><span>' + x[0] + '</span>' + cnt(x[2], x[1]) + '</div>'; }).join('');
    h += '<div class="r em"><span>合計（税込）</span>' + cnt('et-total', r.total) + '</div>';
    if (!animateIt) rows.concat([[0, r.total, 'et-total']]).forEach(function (x) { shown[x[2]] = x[1]; });
    box.innerHTML = h;
    var mini = $('#estMini'); if (mini) { mini.innerHTML = '<span>税抜 ' + cnt('em-excl', r.excl) + '</span><span>消費税 ' + cnt('em-tax', r.tax) + '</span><span class="em-t">合計 ' + cnt('em-total', r.total) + '</span>'; if (!animateIt) { shown['em-excl'] = r.excl; shown['em-tax'] = r.tax; shown['em-total'] = r.total; } }
    if (animateIt) animate(mini);
    else $$('[data-k]', mini).forEach(function (el) { el.textContent = yen(parseFloat(el.getAttribute('data-v'))); });
    if (animateIt) animate(box); else $$('[data-k]', box).forEach(function (el) { el.textContent = yen(parseFloat(el.getAttribute('data-v'))); });
    r.lines.forEach(function (l, i) { var c = $('#amt-' + i); if (c) c.textContent = l.amount === null ? '' : K.num(l.amount); });
    var lim = K.validUntil(e.date, e.days), li = $('#f-est-lim'); if (li) li.value = lim === null ? '' : K.iso(lim);
    kick();
  }
  // 見積 → 現場・工程・請求予定
  function makeSite() {
    var e = est(); if (!e) return null;
    var r = K.estimate(e);
    if (r.excl <= 0) { toast('明細を入れてください'); return null; }
    var c = cal(), sid = uid('s');
    var name = (e.title || e.to || '新しい現場').replace(/工事$/, '').replace(/[ 　]+$/, '');
    var s = { id: sid, name: name, client: e.to, status: '着工前', est: r.excl, plan: '', estimate: e.id };
    S.sites.push(s); e.site = sid;
    // 工種ごとに1工程（日数は金額の目安：10万円ごとに1日、1〜6日）。前の工程の次の稼働日から並べる
    var kinds = [], amt = {};
    e.lines.forEach(function (l, i) { var a = r.lines[i].amount; if (a === null) return; var k = l.kind || l.name || '作業'; if (!(k in amt)) { kinds.push(k); amt[k] = 0; } amt[k] += a; });
    var d = TODAY; while (!K.isWork(d, c)) d++;
    var startN = d, lastEnd = d;
    kinds.concat(['片付け・引渡し']).forEach(function (k, i) {
      var days = i < kinds.length ? Math.max(1, Math.min(6, Math.round(amt[k] / 100000))) : 1;
      var t = { id: uid('t'), site: sid, name: k, who: '', start: K.iso(d), days: days, manualEnd: '', state: '未着手' };
      S.tasks.push(t);
      lastEnd = K.endDate(t.start, days, c); d = lastEnd + 1; while (!K.isWork(d, c)) d++;
    });
    // 請求予定：着手金30%（着工日に請求・2週間後に入金予定）、完成（引渡しの日に請求・翌月末入金予定）
    var first = Math.round(r.total * 0.3);
    S.bills.push({ id: uid('b'), issued: false, date: K.iso(startN), client: e.to, site: sid, kind: '着手金', amount: first, due: K.iso(startN + 14), paidDate: '', paid: '', deducted: '' });
    S.bills.push({ id: uid('b'), issued: false, date: K.iso(lastEnd), client: e.to, site: sid, kind: '完成', amount: r.total - first, due: K.iso(K.eomonth(lastEnd, 1)), paidDate: '', paid: '', deducted: '' });
    log('見積 ' + e.no + ' から現場「' + name + '」を作成（工程 ' + (kinds.length + 1) + '本・請求予定 2件）');
    newTasks[sid] = true;
    save();
    toast('現場・工程・請求予定を作りました');
    return s;
  }

  // ================= 3) 現場と工程表 =================
  var gStart = null, newTasks = {}, selSite = '';
  RENDER.sched = function () {
    var c = cal();
    if (gStart === null) gStart = TODAY - ((K.wday(TODAY) + 6) % 7) - 7;
    var h = '<div class="panel"><div class="ph"><h2><b>GANTT</b>工程表</h2><div class="btns"><button class="ghost sm" data-act="g-prev">◀ 前の週</button><button class="ghost sm" data-act="g-today">今日</button><button class="ghost sm" data-act="g-next">次の週 ▶</button></div></div>';
    h += '<div class="gantt" id="gantt"></div>';
    h += '<div class="gkey"><span><i style="background:#ff9142"></i>作業中</span><span><i style="background:#4cc9f0"></i>未着手</span><span><i style="background:#3d8f73"></i>完了</span><span><i style="background:#ff5d73"></i>遅れ（終了予定を過ぎて未完了）</span><span><i style="background:#2a3346"></i>期間中の休み</span><span><i style="background:#ff9142;width:2px"></i>今日</span></div></div>';
    // 現場の一覧
    var costs = allCosts(), tg = n0(S.company.target);
    h += '<div class="panel mt"><div class="ph"><h2><b>SITES</b>現場</h2></div><div class="tw"><table><thead><tr><th>現場</th><th class="hide-n">取引先</th><th>状態</th><th class="r">見積（税抜）</th><th class="r">原価</th><th class="r">粗利率</th><th class="r hide-n">期間</th></tr></thead><tbody>';
    S.sites.forEach(function (s) {
      var p = K.siteProfit(s, costs, tg), pr = K.siteProgress(S.tasks.filter(function (t) { return t.site === s.id; }), c, TODAY);
      h += '<tr class="' + (pr.late ? 'late' : '') + '"><td><span style="color:' + siteColor(s.id) + '">●</span> ' + esc(s.name) + '</td><td class="hide-n">' + esc(s.client) + '</td><td><select data-bind="site:' + s.id + ':status">' + ['見積中', '着工前', '施工中', '完了'].map(function (x) { return '<option' + (x === s.status ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></td>';
      h += '<td class="r mono">' + yen(n0(s.est)) + '</td><td class="r mono">' + yen(p.total) + '</td><td class="r mono">' + pct(p.margin) + ' ' + pill(p.judge === '目標未満' ? '目標未満' : '') + '</td><td class="r mono hide-n">' + (pr.first !== null ? K.md(pr.first) + '〜' + K.md(pr.last) : '') + '</td></tr>';
    });
    h += '</tbody></table></div></div>';
    // 工程の一覧（編集）
    h += '<div class="panel mt"><div class="ph"><h2><b>TASKS</b>工程（開始日と稼働日数 → 終了予定は自動）</h2><label class="f" style="flex-direction:row;align-items:center;gap:6px">現場<select data-act="sel-site"><option value="">すべて</option>' + S.sites.map(function (s) { return '<option value="' + s.id + '"' + (s.id === selSite ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></label></div>';
    h += '<div class="tw"><table><thead><tr><th>現場</th><th>工種・作業</th><th>担当</th><th>開始日</th><th class="r">日数</th><th>終了予定</th><th>状態</th><th></th><th></th></tr></thead><tbody>';
    S.tasks.filter(function (t) { return !selSite || t.site === selSite; }).forEach(function (t) {
      var ti = K.taskInfo(t, c, TODAY);
      h += '<tr class="' + (ti.judge === '遅れ' ? 'late' : '') + '"><td>' + esc(shortSite(t.site)) + '</td><td><input data-bind="task:' + t.id + ':name" value="' + esc(t.name) + '"></td><td><input data-bind="task:' + t.id + ':who" value="' + esc(t.who) + '" style="width:80px"></td>';
      h += '<td><input type="date" data-bind="task:' + t.id + ':start" value="' + esc(t.start) + '"></td><td><input class="num" style="width:54px" data-bind="task:' + t.id + ':days" value="' + esc(t.days) + '"></td>';
      h += '<td class="mono">' + (ti.end === null ? '—' : K.mdw(ti.end)) + '</td><td><select data-bind="task:' + t.id + ':state">' + ['未着手', '作業中', '完了'].map(function (x) { return '<option' + (x === t.state ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></td><td>' + pill(ti.judge) + '</td><td><button class="ghost sm" data-act="del-task" data-id="' + t.id + '">×</button></td></tr>';
    });
    h += '</tbody></table></div>';
    h += '<div class="form mt">' + fld('現場', '<select id="nt-site">' + S.sites.map(function (s) { return '<option value="' + s.id + '"' + (s.id === selSite ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select>') + fld('工種・作業', '<input id="nt-name" placeholder="例：下塗り">') + fld('開始日', '<input type="date" id="nt-start" value="' + K.iso(TODAY) + '">') + fld('稼働日数', '<input class="num" id="nt-days" value="2">') + '<button class="btn" data-act="add-task">工程を足す</button></div>';
    h += '<p class="note mt">開始日を1日目として、休みの曜日（' + esc(S.company.off) + '）・国民の祝日' + (S.company.holidays ? '' : '（休まない設定）') + '・会社の休みを除いて数えます。Excel版の工程表と同じ数え方です。</p></div>';
    $('#v-sched').innerHTML = h;
    drawGantt();
  };
  function drawGantt() {
    var box = $('#gantt'); if (!box) return;
    var c = cal(), W = Math.max(320, box.clientWidth), narrow = W < 600;
    var LW = narrow ? 116 : 210, days = narrow ? 28 : 42, cw = (W - LW) / days, RH = 24, HH = 40;
    var rows = [];
    var sites = S.sites.filter(function (s) { return S.tasks.some(function (t) { return t.site === s.id; }); });
    sites.sort(function (a, b) {
      var fa = K.siteProgress(S.tasks.filter(function (t) { return t.site === a.id; }), c, TODAY).first, fb = K.siteProgress(S.tasks.filter(function (t) { return t.site === b.id; }), c, TODAY).first;
      return (fa || 0) - (fb || 0);
    });
    sites.forEach(function (s) {
      var ts = S.tasks.filter(function (t) { return t.site === s.id; });
      var pr = K.siteProgress(ts, c, TODAY);
      if (pr.last !== null && pr.last < gStart && s.status === '完了') return;
      rows.push({ site: s });
      ts.forEach(function (t) { rows.push({ t: t, i: K.taskInfo(t, c, TODAY) }); });
    });
    var H = HH + rows.length * RH + 6;
    var x = function (n) { return LW + (n - gStart) * cw; };
    var g = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">';
    // 休みの列・日付
    for (var k = 0; k < days; k++) {
      var n = gStart + k, o = K.ymd(n), off = !K.isWork(n, c);
      if (off) g += '<rect x="' + x(n).toFixed(1) + '" y="' + 22 + '" width="' + cw.toFixed(1) + '" height="' + (H - 22) + '" fill="#131a28"/>';
      if (o.d === 1 || k === 0) g += '<text class="gm" x="' + (x(n) + 2).toFixed(1) + '" y="12">' + o.m + '月</text>';
      if (cw >= 13 || K.wday(n) === 1) g += '<text class="gd" x="' + (x(n) + cw / 2).toFixed(1) + '" y="34" text-anchor="middle" fill="' + (off ? '#5d6880' : '#8d97ab') + '">' + o.d + '</text>';
      if (K.wday(n) === 1) g += '<line x1="' + x(n).toFixed(1) + '" x2="' + x(n).toFixed(1) + '" y1="22" y2="' + H + '" stroke="#1f2838"/>';
    }
    g += '<line x1="' + LW + '" x2="' + W + '" y1="' + (HH - 2) + '" y2="' + (HH - 2) + '" stroke="#2c3850"/>';
    rows.forEach(function (r, i) {
      var y = HH + i * RH;
      if (r.site) {
        g += '<rect x="0" y="' + y + '" width="' + W + '" height="' + RH + '" fill="rgba(255,255,255,.025)"/>';
        g += '<circle cx="9" cy="' + (y + RH / 2) + '" r="3.5" fill="' + siteColor(r.site.id) + '"/><text class="gs" x="18" y="' + (y + 16) + '">' + esc(trim(r.site.name, narrow ? 9 : 16)) + '</text>';
        return;
      }
      var t = r.t, ti = r.i, late = ti.judge === '遅れ';
      g += '<text class="gl" x="18" y="' + (y + 16) + '" fill="' + (late ? '#ff8b9b' : '#c9d1df') + '">' + esc(trim(t.name, narrow ? 8 : 14)) + '</text>';
      if (ti.start === null || ti.end === null) return;
      var a = Math.max(ti.start, gStart), b = Math.min(ti.end, gStart + days - 1);
      if (b < a) return;
      var col = late ? '#ff5d73' : (t.state === '完了' ? '#3d8f73' : (t.state === '作業中' ? '#ff9142' : '#4cc9f0'));
      var x0 = x(ti.start), grow = newTasks[t.site] ? ' data-grow="' + x0.toFixed(1) + '"' : '';
      g += '<g' + grow + '>';
      g += '<rect x="' + x(a).toFixed(1) + '" y="' + (y + 7) + '" width="' + ((b - a + 1) * cw).toFixed(1) + '" height="' + (RH - 14) + '" rx="3" fill="#2a3346"/>';
      for (var n2 = a; n2 <= b; n2++) if (K.isWork(n2, c)) g += '<rect x="' + (x(n2) + .6).toFixed(1) + '" y="' + (y + 5) + '" width="' + Math.max(1, cw - 1.2).toFixed(1) + '" height="' + (RH - 10) + '" rx="2" fill="' + col + '"/>';
      g += '</g>';
    });
    // 今日の線
    if (TODAY >= gStart && TODAY < gStart + days) {
      var tx = x(TODAY) + cw / 2;
      g += '<line x1="' + tx.toFixed(1) + '" x2="' + tx.toFixed(1) + '" y1="16" y2="' + H + '" stroke="#ff9142" stroke-width="4" opacity=".18"/>';
      g += '<line x1="' + tx.toFixed(1) + '" x2="' + tx.toFixed(1) + '" y1="16" y2="' + H + '" stroke="#ff9142" stroke-width="1.5"/>';
      g += '<rect x="' + (tx - 15).toFixed(1) + '" y="2" width="30" height="14" rx="3" fill="#ff9142"/><text x="' + tx.toFixed(1) + '" y="12.5" text-anchor="middle" font-size="10" font-weight="700" fill="#1a0e04">今日</text>';
    }
    if (!rows.length) g += '<text class="gl" x="18" y="' + (HH + 18) + '">工程はまだありません</text>';
    g += '</svg>';
    box.innerHTML = g;
    // 新しく作った現場の帯は左から伸ばす
    $$('[data-grow]', box).forEach(function (el, i) {
      var x0 = el.getAttribute('data-grow');
      el.setAttribute('transform', 'translate(' + x0 + ',0) scale(0,1) translate(-' + x0 + ',0)');
      wait(i * 140).then(function () {
        tween(700, function (p) { el.setAttribute('transform', 'translate(' + x0 + ',0) scale(' + p.toFixed(3) + ',1) translate(-' + x0 + ',0)'); });
      });
    });
    newTasks = {};
  }
  function trim(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  // ================= 4) 日報・出面 =================
  var flashSite = '';
  RENDER.daily = function () {
    var lim = n0(S.company.limit), dc = K.dailyCalc(S.reports, lim), rt = rates();
    var costs = allCosts(), tg = n0(S.company.target);
    var h = '<div class="grid g32"><div class="panel"><div class="ph"><h2><b>REPORT</b>日報を入れる</h2><span class="tag">1人1日1行（2現場なら2行）</span></div><div class="form">';
    h += fld('日付', '<input type="date" id="dr-date" value="' + K.iso(TODAY) + '">');
    h += fld('氏名', '<select id="dr-person">' + S.people.map(function (p) { return '<option>' + esc(p.name) + '</option>'; }).join('') + '</select>');
    h += fld('現場', '<select id="dr-site">' + activeSites().map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }).join('') + '</select>', 'wide');
    h += fld('作業内容', '<input id="dr-work" placeholder="例：下塗り">');
    h += fld('開始', '<input type="time" id="dr-start" value="08:00">');
    h += fld('終了', '<input type="time" id="dr-end" value="17:00">');
    h += fld('休憩（分）', '<input class="num" id="dr-brk" value="60">');
    h += fld('人工（手入力・任意）', '<input class="num" id="dr-manual" placeholder="例：0.5">');
    h += '<button class="btn" data-act="add-report" id="addReport">日報を記録</button></div>';
    h += '<p class="note mt">実働＝終了−開始−休憩。人工は1人1日で1人工、2つの現場へ行った日は実働時間の割合で分けます（Excel版と同じ）。人工×その人の単価（設定）が現場の原価「人工」に入ります。</p></div>';
    // 現場の原価・粗利
    h += '<div class="panel cy"><div class="ph"><h2><b>COST</b>現場の原価と粗利（自動）</h2><span class="tag">目標 ' + pct(tg, 0) + '</span></div><div class="tw"><table><thead><tr><th>現場</th><th class="r">人工</th><th class="r">原価</th><th class="r">粗利</th><th class="r">粗利率</th></tr></thead><tbody>';
    activeSites().forEach(function (s) {
      var p = K.siteProfit(s, costs, tg);
      h += '<tr class="' + (s.id === flashSite ? 'flash' : (p.judge === '目標未満' ? 'late' : '')) + '"><td>' + esc(trim(s.name, 12)) + '</td><td class="r mono">' + cnt('dl-' + s.id, p.byKind['人工'], 'yen') + '</td><td class="r mono">' + cnt('dc-' + s.id, p.total) + '</td><td class="r mono">' + cnt('dp-' + s.id, p.profit) + '</td><td class="r mono">' + cnt('dm-' + s.id, p.margin, 'pct') + '</td></tr>';
    });
    h += '</tbody></table></div></div></div>';
    // 出面（今月）
    var mm = K.dailyMonth(S.reports, lim, TODAY), o = K.ymd(TODAY);
    h += '<div class="grid g2 mt"><div class="panel"><div class="ph"><h2><b>DEMEN</b>' + o.y + '年' + o.m + '月の出面</h2><span class="tag">区切り ' + lim + '時間</span></div><div class="tw"><table><thead><tr><th>氏名</th><th class="r">出勤日数</th><th class="r">実働</th><th class="r">区切り超え</th><th class="r">人工</th></tr></thead><tbody>';
    var tot = { d: 0, h: 0, o: 0, n: 0 };
    S.people.forEach(function (p) {
      var x = mm.person[p.name] || { days: 0, hours: 0, over: 0, ninku: 0 };
      tot.d += x.days; tot.h += x.hours; tot.o += x.over; tot.n += x.ninku;
      h += '<tr><td>' + esc(p.name) + '</td><td class="r mono">' + x.days + '日</td><td class="r mono">' + K.num(x.hours, 2) + 'h</td><td class="r mono">' + K.num(x.over, 2) + 'h</td><td class="r mono">' + cnt('dn-' + p.name, x.ninku, 'n2') + '</td></tr>';
    });
    h += '<tr class="sum"><td>合計</td><td class="r mono">' + tot.d + '日</td><td class="r mono">' + K.num(tot.h, 2) + 'h</td><td class="r mono">' + K.num(tot.o, 2) + 'h</td><td class="r mono">' + K.num(tot.n, 2) + '</td></tr></tbody></table></div><p class="note">区切り時間を超えた時間は残業の目安です。時間外労働の扱いは就業規則・36協定を確認し、必要に応じて社会保険労務士にご相談ください。</p></div>';
    // 最近の日報
    h += '<div class="panel"><div class="ph"><h2><b>LOG</b>最近の日報</h2><span class="tag">' + S.reports.length + '件</span></div><div class="tw"><table><thead><tr><th>日付</th><th>氏名</th><th>現場</th><th class="r">実働</th><th class="r">人工</th><th class="r">原価</th><th></th></tr></thead><tbody>';
    var idx = S.reports.map(function (r, i) { return i; }).sort(function (a, b) { return S.reports[b].date < S.reports[a].date ? -1 : (S.reports[b].date > S.reports[a].date ? 1 : b - a); }).slice(0, 10);
    idx.forEach(function (i) {
      var r = S.reports[i], x = dc[i], rate = rt[r.person];
      h += '<tr' + (r.id === lastReport ? ' class="flash"' : '') + '><td class="mono">' + K.md(K.D(r.date)) + '</td><td>' + esc(r.person) + '</td><td>' + esc(shortSite(r.site)) + '</td><td class="r mono">' + K.num(x.hours, 2) + '</td><td class="r mono">' + K.num(x.ninku, 2) + '</td><td class="r mono">' + (x.ninku === null || rate === undefined ? '' : yen(K.round(x.ninku * rate, 0))) + '</td><td><button class="ghost sm" data-act="del-report" data-id="' + r.id + '">×</button></td></tr>';
    });
    h += '</tbody></table></div></div></div>';
    // 材料・外注などの原価
    h += '<div class="panel mt"><div class="ph"><h2><b>COST+</b>材料・外注・その他の原価</h2></div><div class="form">';
    h += fld('日付', '<input type="date" id="nc-date" value="' + K.iso(TODAY) + '">') + fld('現場', '<select id="nc-site">' + activeSites().map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }).join('') + '</select>');
    h += fld('区分', '<select id="nc-kind">' + K.COST_KINDS.map(function (k) { return '<option>' + k + '</option>'; }).join('') + '</select>') + fld('内容', '<input id="nc-desc" placeholder="例：塗料一式">') + fld('数量', '<input class="num" id="nc-qty" value="1">') + fld('単価（税抜）', '<input class="num" id="nc-price">');
    h += '<button class="btn cy" data-act="add-cost">原価を記録</button></div><div class="tw mt"><table><thead><tr><th>日付</th><th>現場</th><th>区分</th><th>内容</th><th class="r">金額</th><th></th></tr></thead><tbody>';
    S.costs.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 8).forEach(function (cc) {
      h += '<tr><td class="mono">' + K.md(K.D(cc.date)) + '</td><td>' + esc(shortSite(cc.site)) + '</td><td>' + esc(cc.kind) + '</td><td>' + esc(cc.desc) + '</td><td class="r mono">' + yen(K.costAmount(cc)) + '</td><td><button class="ghost sm" data-act="del-cost" data-id="' + esc(cc.id) + '">×</button></td></tr>';
    });
    h += '</tbody></table></div><p class="note">金額は税抜で入れてください（見積金額も税抜）。金額＝数量×単価（1円未満は四捨五入）。</p></div>';
    $('#v-daily').innerHTML = h;
    animate($('#v-daily'));
    flashSite = '';
  };
  var lastReport = '';
  function addReport() {
    var r = { id: uid('r'), date: $('#dr-date').value, person: $('#dr-person').value, site: $('#dr-site').value, work: $('#dr-work').value, start: $('#dr-start').value, end: $('#dr-end').value, brk: $('#dr-brk').value, manual: $('#dr-manual').value };
    if (!K.D(r.date) || !r.person || !r.site || K.workHours(r) === null) { toast('日付・氏名・現場・開始・終了を入れてください'); return; }
    S.reports.push(r); lastReport = r.id; flashSite = r.site;
    var x = K.dailyCalc(S.reports, n0(S.company.limit)); var me = x[x.length - 1];
    log('日報：' + r.person + ' ' + siteName(r.site) + '（' + K.num(me.hours, 2) + '時間）');
    commit(); toast('日報を記録 → 原価・粗利を更新しました');
  }

  // ================= 5) 請求・入金 =================
  var payOpen = '';
  RENDER.bills = function () {
    var b = issued(), s = K.billSummary(b, TODAY), mk = K.monthKey(TODAY);
    var recv = b.filter(function (x) { return K.monthKey(K.D(x.paidDate)) === mk; }).reduce(function (a, x) { return a + n0(x.paid); }, 0);
    var planned = S.bills.filter(function (x) { return !x.issued; });
    var h = '<div class="grid g4">';
    h += kpi('未入金（請求済み）', cnt('b-unpaid', s.remain), s.late ? 'rd' : '', '請求済み ' + b.length + '件', 'bk1', Math.min(1, s.remain / 3000000));
    h += kpi('遅れ', cnt('b-late', s.late), s.late ? 'rd' : '', s.lateCount + '件（入金予定日を過ぎた）', 'bk2', Math.min(1, s.late / 3000000));
    h += kpi('今月の入金', cnt('b-recv', recv), 'gr', K.ymd(TODAY).m + '月', 'bk3', Math.min(1, recv / 3000000), 'cy');
    h += kpi('請求予定', cnt('b-plan', planned.reduce(function (a, x) { return a + n0(x.amount); }, 0)), 'cy', planned.length + '件（まだ請求していない）', 'bk4', 0, 'cy');
    h += '</div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>BILLS</b>請求と入金</h2><span class="tag">残り＝請求額−入金額−差し引かれた額</span></div><div class="bl">';
    var list = S.bills.slice().sort(function (a, c) { return (a.issued === c.issued ? 0 : (a.issued ? 1 : -1)) || (a.date < c.date ? 1 : (a.date > c.date ? -1 : 0)); });
    list.forEach(function (x) {
      var st = x.issued ? K.billStatus(x, TODAY) : { remain: n0(x.amount), status: '請求予定', late: null };
      h += '<div id="bill-' + x.id + '" class="bi' + (st.status === '遅れ' ? ' late' : '') + (x.id === flashBill ? ' flash' : '') + '">';
      h += '<div class="b-who"><span class="mono note">' + K.md(K.D(x.date)) + '・' + esc(x.kind) + '</span><b>' + esc(x.client) + '</b><small class="note">' + esc(siteName(x.site)) + '</small></div>';
      h += '<div class="b-amt"><span class="mono">' + yen(n0(x.amount)) + '</span><small class="note">入金予定 ' + (x.due ? K.md(K.D(x.due)) : '—') + (st.late ? ' <span style="color:#ff5d73">' + st.late + '日遅れ</span>' : '') + '</small>' + (has(x.paid) ? '<small class="note">入金 ' + yen(n0(x.paid)) + (n0(x.deducted) ? '・差引 ' + yen(n0(x.deducted)) : '') + '</small>' : '') + '</div>';
      h += '<div class="b-rem"><small class="note">残り</small><span class="mono">' + yen(st.remain) + '</span></div>';
      h += '<div class="b-st">' + pill(st.status);
      if (!x.issued) h += '<button class="btn cy" data-act="issue" data-id="' + x.id + '">請求書を出す</button>';
      else if (st.remain > 0) h += '<button class="btn gr" data-act="pay-open" data-id="' + x.id + '">入金を記録</button>';
      h += '</div>';
      if (payOpen === x.id) {
        h += '<div class="b-pay form"><label class="f">入金日<input type="date" id="pay-date" value="' + K.iso(TODAY) + '"></label><label class="f">入金額<input class="num" id="pay-amt" value="' + st.remain + '"></label><label class="f">差し引かれた額（手数料など）<input class="num" id="pay-ded" value=""></label><div class="btns"><button class="btn gr" data-act="pay-save" data-id="' + x.id + '" id="paySave">記録する</button><button class="ghost" data-act="pay-cancel">やめる</button></div></div>';
      }
      h += '</div>';
    });
    h += '</div></div>';
    // 取引先別
    h += '<div class="grid g2 mt"><div class="panel cy"><div class="ph"><h2><b>CLIENT</b>取引先別の残高</h2></div><div class="tw"><table><thead><tr><th>取引先</th><th class="r">請求</th><th class="r">入金</th><th class="r">残高</th><th class="r">うち遅れ</th></tr></thead><tbody>';
    K.byClient(b, TODAY).filter(function (x) { return x.balance !== 0 || x.billed > 0; }).sort(function (a, c) { return c.balance - a.balance; }).forEach(function (x) {
      h += '<tr class="' + (x.late ? 'late' : '') + '"><td>' + esc(x.client) + '</td><td class="r mono">' + yen(x.billed) + '</td><td class="r mono">' + yen(x.paid) + '</td><td class="r mono">' + yen(x.balance) + '</td><td class="r mono">' + (x.late ? yen(x.late) : '') + '</td></tr>';
    });
    h += '</tbody></table></div></div>';
    h += '<div class="panel"><div class="ph"><h2><b>NEW</b>請求を足す</h2></div><div class="form">' + fld('請求日', '<input type="date" id="nb-date" value="' + K.iso(TODAY) + '">') + fld('現場', '<select id="nb-site"><option value="">（現場なし）</option>' + S.sites.map(function (s2) { return '<option value="' + s2.id + '">' + esc(s2.name) + '</option>'; }).join('') + '</select>');
    h += fld('取引先', '<input id="nb-client" placeholder="現場を選ぶと自動">') + fld('区分', '<select id="nb-kind">' + '一括,着手金,中間（出来高）,完成,追加工事,その他'.split(',').map(function (k) { return '<option>' + k + '</option>'; }).join('') + '</select>') + fld('請求額（税込）', '<input class="num" id="nb-amt">') + fld('入金予定日', '<input type="date" id="nb-due">');
    h += '<button class="btn" data-act="add-bill">請求を記録</button></div><p class="note mt">状態：残りが0以下→入金済／入金予定日を過ぎて残りがある→遅れ／一部でも入金→一部入金／それ以外→未入金（Excel版と同じ）。</p></div></div>';
    $('#v-bills').innerHTML = h;
    animate($('#v-bills'));
    flashBill = '';
  };
  var flashBill = '';
  function issueBill(id) {
    var b = S.bills.filter(function (x) { return x.id === id; })[0]; if (!b) return;
    b.issued = true; b.date = K.iso(TODAY);
    if (!b.due || K.D(b.due) < TODAY) b.due = K.iso(TODAY + 14);
    flashBill = id; log('請求書：' + b.client + ' ' + b.kind + ' ' + yen(n0(b.amount)));
    commit(); toast('請求しました（未入金に加わりました）');
  }
  function savePay(id) {
    var b = S.bills.filter(function (x) { return x.id === id; })[0]; if (!b) return;
    var amt = n0($('#pay-amt').value), ded = n0($('#pay-ded').value), d = $('#pay-date').value;
    if (!K.D(d) || amt <= 0) { toast('入金日と入金額を入れてください'); return; }
    b.paid = n0(b.paid) + amt; b.paidDate = d; if (ded) b.deducted = n0(b.deducted) + ded;
    payOpen = ''; flashBill = id; log('入金：' + b.client + ' ' + yen(amt));
    commit(); toast('入金を記録しました（未入金が減りました）');
  }

  // ================= 6) 期限 =================
  RENDER.due = function () {
    var yel = n0(S.company.yel), red = n0(S.company.red);
    var all = S.deadlines.map(function (d, i) { return { d: d, i: i, s: K.deadlineStatus(d, TODAY, yel, red) }; })
      .sort(function (a, b) { return (a.s.remain === null) - (b.s.remain === null) || (a.s.remain - b.s.remain) || a.i - b.i; });
    var cnts = { '期限切れ': 0, '急ぎ': 0, '注意': 0, 'OK': 0 };
    all.forEach(function (x) { if (cnts.hasOwnProperty(x.s.status)) cnts[x.s.status]++; });
    var h = '<div class="grid g4">';
    h += kpi('期限切れ', cnt('du-x', cnts['期限切れ'], 'n'), cnts['期限切れ'] ? 'rd' : '', '期限を過ぎた', 'du1', cnts['期限切れ'] / Math.max(1, all.length));
    h += kpi('急ぎ（' + red + '日以内）', cnt('du-r', cnts['急ぎ'], 'n'), cnts['急ぎ'] ? 'rd' : '', '赤', 'du2', cnts['急ぎ'] / Math.max(1, all.length));
    h += kpi('注意（' + yel + '日以内）', cnt('du-y', cnts['注意'], 'n'), '', '黄', 'du3', cnts['注意'] / Math.max(1, all.length));
    h += kpi('OK', cnt('du-o', cnts['OK'], 'n'), 'gr', '登録 ' + all.length + '件', 'du4', cnts['OK'] / Math.max(1, all.length), 'cy');
    h += '</div><div class="panel mt"><div class="ph"><h2><b>DUE</b>許可・資格・保険・車検など（近い順）</h2><span class="tag">今日 ' + K.mdw(TODAY) + '</span></div><div class="tw"><table><thead><tr><th class="r">残り</th><th>項目</th><th class="hide-n">対象</th><th>有効期限</th><th>状態</th><th class="hide-n">準備を始める日</th><th></th></tr></thead><tbody>';
    all.forEach(function (x) {
      var prepLate = x.s.prepStart !== null && x.s.prepStart <= TODAY && x.s.status !== '期限切れ';
      h += '<tr class="' + (x.s.status === '期限切れ' || x.s.status === '急ぎ' ? 'late' : '') + '"><td class="r"><span class="days ' + dCls(x.s.status) + '">' + (x.s.remain === null ? '—' : x.s.remain + '日') + '</span></td><td>' + esc(x.d.item) + '<br><small class="note">' + esc(x.d.kind) + '</small></td><td class="hide-n">' + esc(x.d.target) + '・' + esc(x.d.name) + '</td>';
      h += '<td><input type="date" data-bind="dl:' + esc(x.d.id) + ':expiry" value="' + esc(x.d.expiry) + '"></td><td>' + pill(x.s.status) + '</td><td class="mono hide-n" style="' + (prepLate ? 'color:#ffb27a' : '') + '">' + (x.s.prepStart === null ? '' : K.md(x.s.prepStart) + (prepLate ? ' 準備中' : '')) + '</td><td><button class="ghost sm" data-act="del-dl" data-id="' + esc(x.d.id) + '">×</button></td></tr>';
    });
    h += '</tbody></table></div><p class="note">更新が済んだら、有効期限を新しい日付に書きかえます。建設業許可の有効期間は5年で、更新の申請は満了の30日前まで（国土交通省「建設業の許可とは」）。受付時期・書類は許可行政庁に確認してください。</p></div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>NEW</b>期限を足す</h2></div><div class="form">';
    h += fld('種類', '<select id="nd-kind">' + ['建設業許可', '資格・免許', '技能講習・特別教育', '保険', '車検', '自賠責保険', '機械の点検', 'その他'].map(function (k) { return '<option>' + k + '</option>'; }).join('') + '</select>') + fld('項目', '<input id="nd-item" placeholder="例：車検">') + fld('対象', '<select id="nd-target"><option>会社</option><option>人</option><option>車両</option><option>機械</option></select>') + fld('対象の名前', '<input id="nd-name" placeholder="例：軽トラ1号">') + fld('有効期限', '<input type="date" id="nd-exp">') + fld('準備日数（何日前から）', '<input class="num" id="nd-prep" value="30">');
    h += '<button class="btn" data-act="add-dl">期限を記録</button></div></div>';
    $('#v-due').innerHTML = h;
    animate($('#v-due'));
  };

  // ================= 7) 塗装計算 =================
  RENDER.paint = function () {
    var p = S.paint, r = PC.calc({ wall: { mode: p.mode, faces: p.faces, perimeter: p.perimeter, height: p.height, openings: p.openings }, roof: p.roof, coats: p.coats });
    var h = '<div class="grid g32"><div class="panel"><div class="ph"><h2><b>AREA</b>面積</h2><select data-bind="paint:mode" style="width:auto"><option value="faces"' + (p.mode === 'faces' ? ' selected' : '') + '>面ごとに入れる</option><option value="perimeter"' + (p.mode === 'perimeter' ? ' selected' : '') + '>外周×高さ</option></select></div>';
    if (p.mode === 'faces') {
      h += '<div class="tw"><table><thead><tr><th>外壁の面</th><th class="r">幅(m)</th><th class="r">高さ(m)</th></tr></thead><tbody>';
      p.faces.forEach(function (f, i) { h += '<tr><td><input data-bind="pf:' + i + ':name" value="' + esc(f.name) + '"></td><td><input class="num" data-bind="pf:' + i + ':w" value="' + esc(f.w) + '"></td><td><input class="num" data-bind="pf:' + i + ':h" value="' + esc(f.h) + '"></td></tr>'; });
      h += '</tbody></table></div>';
    } else {
      h += '<div class="form">' + fld('外周(m)', '<input class="num" data-bind="paint:perimeter" value="' + esc(p.perimeter) + '">') + fld('高さ(m)', '<input class="num" data-bind="paint:height" value="' + esc(p.height) + '">') + '</div>';
    }
    h += '<div class="tw mt"><table><thead><tr><th>開口部（引く）</th><th class="r">幅</th><th class="r">高さ</th><th class="r">数</th></tr></thead><tbody>';
    p.openings.forEach(function (f, i) { h += '<tr><td><input data-bind="po:' + i + ':name" value="' + esc(f.name) + '"></td><td><input class="num" data-bind="po:' + i + ':w" value="' + esc(f.w) + '"></td><td><input class="num" data-bind="po:' + i + ':h" value="' + esc(f.h) + '"></td><td><input class="num" data-bind="po:' + i + ':count" value="' + esc(f.count) + '"></td></tr>'; });
    h += '</tbody></table></div><div class="form mt">' + fld('屋根の面積(㎡)', '<input class="num" data-bind="paint:roof" value="' + esc(p.roof) + '">') + '</div>';
    h += '<div class="tw mt"><table><thead><tr><th>部位</th><th>工程</th><th>塗料</th><th class="r">塗布量/㎡</th><th class="r">回数</th><th class="r">ロス%</th><th class="r">1缶</th></tr></thead><tbody>';
    p.coats.forEach(function (c, i) {
      h += '<tr><td>' + (c.part === 'roof' ? '屋根' : '外壁') + '</td><td>' + esc(c.step) + '</td><td><input data-bind="pc:' + i + ':paint" value="' + esc(c.paint) + '"></td>';
      ['rate', 'times', 'loss', 'can'].forEach(function (k) { h += '<td><input class="num" style="width:62px" data-bind="pc:' + i + ':' + k + '" value="' + esc(c[k]) + '"></td>'; });
      h += '</tr>';
    });
    h += '</tbody></table></div><p class="note">塗布量・希釈率・缶の容量は、使う塗料のメーカーのカタログ値を入れてください（このツールは値を決めません）。見本の数字は架空の例です。</p></div>';
    h += '<div class="panel cy" id="paintRes">' + paintRes(r) + '</div></div>';
    $('#v-paint').innerHTML = h;
  };
  function paintRes(r) {
    if (r.state === 'error') return '<p class="err">' + esc(r.msg) + '</p>';
    if (r.state === 'empty') return '<p class="note">面積を入れると計算します。</p>';
    var h = '<div class="ph"><h2><b>RESULT</b>必要な量と缶数</h2></div><div class="grid g2"><div><div class="note">外壁（開口部を引いた面積）</div><div class="big-num">' + PC.fmt(r.wall.area || 0) + ' ㎡</div><div class="note">' + (r.wall.state === 'ok' ? PC.fmt(r.wall.gross) + ' − ' + PC.fmt(r.wall.openings) : '') + '</div></div><div><div class="note">屋根</div><div class="big-num">' + PC.fmt(r.roof) + ' ㎡</div></div></div>';
    h += '<div class="tw mt"><table><thead><tr><th>工程</th><th class="r">必要量</th><th class="r">缶数</th></tr></thead><tbody>';
    r.rows.forEach(function (x) { if (x.state !== 'ok') return; h += '<tr><td>' + (x.part === 'roof' ? '屋根' : '外壁') + '・' + esc(x.step) + '</td><td class="r mono">' + PC.fmt(x.need) + x.unit + '</td><td class="r mono">' + (x.cans === undefined ? '' : x.cans + '缶') + '</td></tr>'; });
    h += '</tbody></table></div><div class="tw mt"><table><thead><tr><th>塗料ごとにまとめると</th><th class="r">合計</th><th class="r">缶数</th></tr></thead><tbody>';
    r.groups.forEach(function (g) { h += '<tr><td>' + esc(g.paint) + '<br><small class="note">' + esc(g.steps.join('・')) + '</small></td><td class="r mono">' + PC.fmt(g.need) + g.unit + '</td><td class="r mono">' + (g.cans === undefined ? '' : g.cans + '缶' + (g.sumCans > g.cans ? '<br><small class="note">別々なら' + g.sumCans + '缶</small>' : '')) + '</td></tr>'; });
    h += '</tbody></table></div><p class="note">必要量＝面積×塗布量×回数×（1＋ロス率）。缶数は切り上げ。</p>';
    return h;
  }

  // ================= 8) 外注支払 =================
  RENDER.subs = function () {
    var P = {}; S.partners.forEach(function (p) { P[p.id] = p; });
    var rows = S.orders.map(function (o) { return { o: o, s: K.subStatus(o, P[o.partner], TODAY) }; });
    var unpaid = 0, late = 0, lateN = 0, thisMonth = 0, mk = K.monthKey(TODAY);
    rows.forEach(function (x) { if (x.s.unpaid > 0) unpaid += x.s.unpaid; if (x.s.status === '遅れ') { late += x.s.unpaid; lateN++; } if (x.s.due !== null && K.monthKey(x.s.due) === mk && x.s.unpaid > 0) thisMonth += x.s.unpaid; });
    var h = '<div class="grid g4">' + kpi('未払いの合計', cnt('s-unpaid', unpaid), '', '協力会社への支払', 'sk1', 0) + kpi('今月払う予定（未払い）', cnt('s-month', thisMonth), 'cy', K.ymd(TODAY).m + '月が支払予定日', 'sk2', 0, 'cy') + kpi('遅れ', cnt('s-late', late), late ? 'rd' : '', lateN + '件', 'sk3', 0) + kpi('協力会社', cnt('s-n', S.partners.length, 'n'), 'gr', '締め日・支払日のルール', 'sk4', 0, 'cy') + '</div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>PAY</b>発注と支払</h2><span class="tag">支払予定日は締め日と支払日から自動</span></div><div class="tw"><table><thead><tr><th>協力会社</th><th>内容</th><th class="r">請求額</th><th>請求日</th><th>支払予定</th><th class="r">未払い</th><th>状態</th><th></th></tr></thead><tbody>';
    rows.sort(function (a, b) { return (a.s.due || 0) - (b.s.due || 0); }).forEach(function (x) {
      var p = P[x.o.partner] || {};
      h += '<tr class="' + (x.s.status === '遅れ' ? 'late' : '') + '"><td>' + esc(p.name) + '<br><small class="note">' + esc(p.name ? K.ruleText(p) : '') + '</small></td><td>' + esc(x.o.desc) + '<br><small class="note">' + esc(siteName(x.o.site)) + '</small></td><td class="r mono">' + yen(n0(x.o.billAmount)) + (x.s.diff ? '<br><small class="note">発注との差 ' + yen(x.s.diff) + '</small>' : '') + '</td>';
      h += '<td class="mono">' + (x.o.billDate ? K.md(K.D(x.o.billDate)) : '') + '</td><td class="mono">' + (x.s.due === null ? '' : K.mdw(x.s.due)) + (x.o.dueOverride ? '<br><small class="note">変更</small>' : '') + '</td><td class="r mono">' + yen(x.s.unpaid || 0) + '</td><td>' + pill(x.s.status) + (x.s.late ? '<br><small style="color:#ff5d73">' + x.s.late + '日</small>' : '') + '</td>';
      h += '<td>' + (x.s.unpaid > 0 ? '<button class="btn gr" data-act="sub-pay" data-id="' + x.o.id + '">支払った</button>' : '') + '</td></tr>';
    });
    h += '</tbody></table></div><p class="note">請求日の日が締め日以下ならその月の締め、締め日より後なら次の月の締め。締めの月から支払月だけ進めた月の支払日（ない日は月末）。土日・祝日・金融機関の休業日の前後は計算していません。下請代金の支払期日など法律で決まりがある取引もあります。専門家・公的な窓口にご確認ください。</p></div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>RULE</b>協力会社の締め日・支払日</h2></div><div class="tw"><table><thead><tr><th>協力会社</th><th>業種</th><th class="r">締め日</th><th>支払月</th><th class="r">支払日</th><th>ルール</th></tr></thead><tbody>';
    S.partners.forEach(function (p) {
      h += '<tr><td>' + esc(p.name) + '</td><td>' + esc(p.trade) + '</td><td><input class="num" style="width:60px" data-bind="pt:' + p.id + ':close" value="' + esc(p.close) + '"></td><td><select data-bind="pt:' + p.id + ':month">' + ['当月', '翌月', '翌々月'].map(function (m) { return '<option' + (m === p.month ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></td><td><input class="num" style="width:60px" data-bind="pt:' + p.id + ':pay" value="' + esc(p.pay) + '"></td><td>' + esc(K.ruleText(p)) + '</td></tr>';
    });
    h += '</tbody></table></div><p class="note">末日は 31 と入れます。</p></div>';
    $('#v-subs').innerHTML = h;
    animate($('#v-subs'));
  };

  // ================= 9) 設定 =================
  RENDER.set = function () {
    var c = S.company;
    var h = '<div class="grid g2"><div class="panel"><div class="ph"><h2><b>SET</b>会社と計算の設定</h2></div><div class="form">';
    h += fld('会社名', '<input data-bind="co:name" value="' + esc(c.name) + '">', 'wide');
    h += fld('消費税の端数（新しい見積）', '<select data-bind="co:round">' + ['切り捨て', '四捨五入', '切り上げ'].map(function (x) { return '<option' + (x === c.round ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>');
    h += fld('目標の粗利率（%）', '<input class="num" data-bind="co:targetPct" value="' + K.round(n0(c.target) * 100, 2) + '">');
    h += fld('区切り時間（残業の目安）', '<input class="num" data-bind="co:limit" value="' + esc(c.limit) + '">');
    h += fld('休みの曜日', '<select data-bind="co:off">' + ['土日', '日曜のみ', 'なし'].map(function (x) { return '<option' + (x === c.off ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>');
    h += fld('国民の祝日', '<select data-bind="co:holidays"><option value="1"' + (c.holidays ? ' selected' : '') + '>休む</option><option value="0"' + (!c.holidays ? ' selected' : '') + '>休まない</option></select>');
    h += fld('黄（注意）にする日数', '<input class="num" data-bind="co:yel" value="' + esc(c.yel) + '">') + fld('赤（急ぎ）にする日数', '<input class="num" data-bind="co:red" value="' + esc(c.red) + '">');
    h += fld('会社の休み（1行に1日 2026-12-29）', '<textarea data-bind="co:companyHolidays">' + esc((c.companyHolidays || []).join('\n')) + '</textarea>', 'wide');
    h += '</div></div><div class="panel cy"><div class="ph"><h2><b>CREW</b>名簿と1人工の単価</h2></div><div class="tw"><table><thead><tr><th>氏名</th><th class="r">1人工の単価（円）</th><th></th></tr></thead><tbody>';
    S.people.forEach(function (p, i) { h += '<tr><td><input data-bind="pp:' + i + ':name" value="' + esc(p.name) + '"></td><td><input class="num" data-bind="pp:' + i + ':rate" value="' + esc(p.rate) + '"></td><td><button class="ghost sm" data-act="del-person" data-i="' + i + '">×</button></td></tr>'; });
    h += '</tbody></table></div><div class="btns mt"><button class="ghost" data-act="add-person">＋ 人を足す</button></div><p class="note">人工の単価の決め方や会計上の扱いは、税理士にご確認ください。</p></div></div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>DATA</b>データ</h2></div><p class="note">データはこのブラウザ（localStorage）にだけ保存しています。外部には送信しません。ブラウザのデータを消すと、入力も消えます。</p><div class="btns"><button class="btn" data-act="reset">見本データに戻す</button><span class="note">今の入力は消えて、架空の「サンプル塗装店」の見本に戻ります。</span></div></div>';
    $('#v-set').innerHTML = h;
  };

  // ================= 入力の受けとり =================
  function onBind(el, final) {
    var b = el.getAttribute('data-bind').split(':'), v = el.type === 'checkbox' ? el.checked : el.value;
    var e, x;
    switch (b[0]) {
      case 'est': e = est();
        if (b[1] === 'ratePct') e.rate = has(v) ? n0(v) / 100 : 0; else e[b[1]] = v;
        if (b[1] === 'title' || b[1] === 'to') { var opt = $('[data-act="pick-est"] option[value="' + e.id + '"]'); if (opt) opt.textContent = e.no + '　' + (e.title || '（件名なし）'); }
        save(); estTotals(true); return;
      case 'line': e = est(); e.lines[+b[1]][b[2]] = v; save(); estTotals(true); return;
      case 'site': x = site(b[1]); if (x) { x[b[2]] = v; log('現場「' + x.name + '」を ' + v + ' に'); } break;
      case 'task': x = S.tasks.filter(function (t) { return t.id === b[1]; })[0]; if (x) x[b[2]] = b[2] === 'days' ? v : v; if (!final && (b[2] === 'name' || b[2] === 'who')) { save(); return; } break;
      case 'dl': x = S.deadlines.filter(function (d) { return d.id === b[1]; })[0]; if (x) x[b[2]] = v; break;
      case 'paint': S.paint[b[1]] = v; if (b[1] === 'mode') break; save(); $('#paintRes').innerHTML = paintRes(PC.calc({ wall: { mode: S.paint.mode, faces: S.paint.faces, perimeter: S.paint.perimeter, height: S.paint.height, openings: S.paint.openings }, roof: S.paint.roof, coats: S.paint.coats })); return;
      case 'pf': case 'po': case 'pc':
        S.paint[{ pf: 'faces', po: 'openings', pc: 'coats' }[b[0]]][+b[1]][b[2]] = v; save();
        $('#paintRes').innerHTML = paintRes(PC.calc({ wall: { mode: S.paint.mode, faces: S.paint.faces, perimeter: S.paint.perimeter, height: S.paint.height, openings: S.paint.openings }, roof: S.paint.roof, coats: S.paint.coats })); return;
      case 'pt': x = S.partners.filter(function (p) { return p.id === b[1]; })[0]; if (x) x[b[2]] = b[2] === 'month' ? v : n0(v); if (!final) { save(); return; } break;
      case 'co':
        if (b[1] === 'targetPct') S.company.target = n0(v) / 100;
        else if (b[1] === 'holidays') S.company.holidays = v === '1';
        else if (b[1] === 'companyHolidays') S.company.companyHolidays = String(v).split(/\r?\n/).map(function (s) { return s.trim().split(/\s/)[0]; }).filter(function (s) { return K.D(s) !== null; });
        else if (b[1] === 'limit' || b[1] === 'yel' || b[1] === 'red') S.company[b[1]] = n0(v);
        else S.company[b[1]] = v;
        if (b[1] === 'name') $('#coName').textContent = v;
        save(); return;
      case 'pp': S.people[+b[1]][b[2]] = b[2] === 'rate' ? n0(v) : v; save(); return;
    }
    commit();
  }
  document.addEventListener('input', function (ev) {
    var el = ev.target; if (!el.getAttribute || !el.hasAttribute('data-bind')) return;
    var k = el.getAttribute('data-bind').split(':')[0];
    if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date') return; // change で受ける
    if (k === 'est' || k === 'line' || k === 'paint' || k === 'pf' || k === 'po' || k === 'pc' || k === 'co' || k === 'pp') onBind(el, false);
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.getAttribute && el.getAttribute('data-act') === 'pick-est') { curEst = el.value; render(); return; }
    if (el.getAttribute && el.getAttribute('data-act') === 'sel-site') { selSite = el.value; render(); return; }
    if (el.id === 'nb-site') { var s = site(el.value); if (s) $('#nb-client').value = s.client; return; }
    if (!el.getAttribute || !el.hasAttribute('data-bind')) return;
    onBind(el, true);
  });
  document.addEventListener('click', function (ev) {
    var nb = ev.target.closest && ev.target.closest('#nav button'); if (nb) { go(nb.getAttribute('data-view')); return; }
    var b = ev.target.closest && ev.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT') return;
    var a = b.getAttribute('data-act'), id = b.getAttribute('data-id'), e;
    switch (a) {
      case 'reset':
        if (!DEMO && !window.confirm('今の入力を消して、見本データ（架空）に戻しますか？')) return;
        S = DATA.sample(TODAY); curEst = null; shown = {}; save(); go(view); toast('見本データに戻しました'); return;
      case 'new-est': newEst(); save(); render(); return;
      case 'del-est': e = est(); if (!e || (!DEMO && !window.confirm('この見積を消しますか？（作った現場は残ります）'))) return; S.estimates = S.estimates.filter(function (x) { return x !== e; }); curEst = null; commit(); return;
      case 'add-line': e = est(); e.lines.push({ kind: '', name: '', qty: '', unit: '', price: '', reduced: false }); save(); render(); return;
      case 'del-line': e = est(); e.lines.splice(+b.getAttribute('data-i'), 1); if (!e.lines.length) e.lines.push({ kind: '', name: '', qty: '', unit: '', price: '', reduced: false }); commit(); return;
      case 'make-site': if (makeSite()) render(); return;
      case 'g-prev': gStart -= 7; render(); return;
      case 'g-next': gStart += 7; render(); return;
      case 'g-today': gStart = null; render(); return;
      case 'add-task': {
        var t = { id: uid('t'), site: $('#nt-site').value, name: $('#nt-name').value || '作業', who: '', start: $('#nt-start').value, days: $('#nt-days').value, manualEnd: '', state: '未着手' };
        if (!t.site || !K.D(t.start) || !(n0(t.days) >= 1)) { toast('現場・開始日・日数を入れてください'); return; }
        S.tasks.push(t); log('工程を追加：' + siteName(t.site) + ' ' + t.name); commit(); return;
      }
      case 'del-task': S.tasks = S.tasks.filter(function (t) { return t.id !== id; }); commit(); return;
      case 'add-report': addReport(); return;
      case 'del-report': S.reports = S.reports.filter(function (r) { return r.id !== id; }); commit(); return;
      case 'add-cost': {
        var c = { id: uid('c'), date: $('#nc-date').value, site: $('#nc-site').value, kind: $('#nc-kind').value, desc: $('#nc-desc').value, qty: $('#nc-qty').value, price: $('#nc-price').value };
        if (!c.site || !has(c.qty) || !has(c.price)) { toast('現場・数量・単価を入れてください'); return; }
        S.costs.push(c); flashSite = c.site; log('原価：' + siteName(c.site) + ' ' + c.kind + ' ' + yen(K.costAmount(c))); commit(); return;
      }
      case 'del-cost': S.costs = S.costs.filter(function (x) { return x.id !== id; }); commit(); return;
      case 'issue': issueBill(id); return;
      case 'pay-open': payOpen = id; render(); var pa = $('#pay-amt'); if (pa && !DEMO) pa.focus(); return;
      case 'pay-cancel': payOpen = ''; render(); return;
      case 'pay-save': savePay(id); return;
      case 'add-bill': {
        var nb2 = { id: uid('b'), issued: true, date: $('#nb-date').value, client: $('#nb-client').value || siteName($('#nb-site').value), site: $('#nb-site').value, kind: $('#nb-kind').value, amount: n0($('#nb-amt').value), due: $('#nb-due').value, paidDate: '', paid: '', deducted: '' };
        if (!K.D(nb2.date) || !(nb2.amount > 0)) { toast('請求日と請求額を入れてください'); return; }
        S.bills.push(nb2); log('請求書：' + nb2.client + ' ' + yen(nb2.amount)); commit(); return;
      }
      case 'add-dl': {
        var d = { id: uid('d'), kind: $('#nd-kind').value, item: $('#nd-item').value || $('#nd-kind').value, target: $('#nd-target').value, name: $('#nd-name').value, expiry: $('#nd-exp').value, prep: $('#nd-prep').value };
        S.deadlines.push(d); log('期限を追加：' + d.item); commit(); return;
      }
      case 'del-dl': S.deadlines = S.deadlines.filter(function (x) { return x.id !== id; }); commit(); return;
      case 'sub-pay': {
        var o = S.orders.filter(function (x) { return x.id === id; })[0]; if (!o) return;
        o.paid = n0(o.billAmount); o.paidDate = K.iso(TODAY); log('外注の支払：' + yen(n0(o.billAmount))); commit(); return;
      }
      case 'add-person': S.people.push({ name: '新しい人', rate: 20000 }); commit(); return;
      case 'del-person': S.people.splice(+b.getAttribute('data-i'), 1); commit(); return;
    }
  });
  window.addEventListener('resize', function () { if (view === 'sched') drawGantt(); });

  // ================= 自動デモ（?demo=1） =================
  // 実際のボタン・入力欄を、カーソルを動かして操作する（関数を直接呼ばず、画面の部品を押す）
  var cur = { x: 0, y: 0, el: null, ring: null };
  function curInit() {
    cur.el = $('#cursor'); cur.ring = $('#cursor .ring'); cur.el.style.display = 'block';
    cur.x = window.innerWidth * 0.62; cur.y = window.innerHeight * 0.78; curPlace();
  }
  function curPlace() { cur.el.style.transform = 'translate(' + cur.x.toFixed(1) + 'px,' + cur.y.toFixed(1) + 'px)'; }
  function scrollTo(el) {
    var m = $('#main'), r = el.getBoundingClientRect(), mr = m.getBoundingClientRect();
    if (r.top > mr.top + 70 && r.bottom < mr.bottom - 50) return Promise.resolve();   // 見えていればスクロールしない
    var target = m.scrollTop + (r.top - mr.top) - mr.height * 0.38;
    target = Math.max(0, Math.min(m.scrollHeight - m.clientHeight, target));
    var from = m.scrollTop; if (Math.abs(target - from) < 4) return Promise.resolve();
    return new Promise(function (res) { tween(420, function (p) { m.scrollTop = from + (target - from) * p; }, res, easeIO); });
  }
  function moveTo(el, dur) {
    return scrollTo(el).then(function () {
      var r = el.getBoundingClientRect(), tx = r.left + Math.min(r.width * 0.5, 60), ty = r.top + r.height * 0.6, fx = cur.x, fy = cur.y;
      return new Promise(function (res) { tween(dur || 280, function (p) { cur.x = fx + (tx - fx) * p; cur.y = fy + (ty - fy) * p; curPlace(); }, res, easeIO); });
    });
  }
  function ripple() { tween(420, function (p) { cur.ring.style.opacity = (1 - p).toFixed(2); cur.ring.style.transform = 'scale(' + (0.4 + p * 1.2).toFixed(2) + ')'; }); }
  function click(sel) {
    var el = typeof sel === 'string' ? $(sel) : sel; if (!el) return Promise.resolve();
    return moveTo(el).then(function () { ripple(); return wait(90); }).then(function () { el.click(); return wait(130); });
  }
  function type(sel, text, per) {
    var el = typeof sel === 'string' ? $(sel) : sel; if (!el) return Promise.resolve();
    return moveTo(el, 240).then(function () {
      ripple(); el.classList.add('typing'); el.value = '';
      var i = 0;
      function step() {
        if (i >= text.length) { el.classList.remove('typing'); el.dispatchEvent(new Event('change', { bubbles: true })); return wait(60); }
        i++; el.value = text.slice(0, i); el.dispatchEvent(new Event('input', { bubbles: true }));
        return wait(per || 34).then(step);
      }
      return step();
    });
  }
  function choose(sel, value) {
    var el = $(sel); if (!el) return Promise.resolve();
    return moveTo(el, 320).then(function () { ripple(); return wait(120); }).then(function () { el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); return wait(160); });
  }
  function nav(v) { return click('#nav button[data-view="' + v + '"]').then(function () { return wait(200); }); }
  function pulse(k) { flowPulse = k; flowPulseT = now(); }
  function runDemo() {
    demoOn = true; curInit();
    var sid = null;
    var LINES = [['足場 架設・解体', '180', '850'], ['外壁塗装 シリコン', '150', '2600'], ['付帯部 雨樋・破風', '1', '68000']];
    var p = wait(2000)
      .then(function () { pulse(0); return nav('est'); })
      .then(function () { return click('[data-act="new-est"]'); })
      .then(function () { var to = $('#f-est-to'); to.value = '高橋 様'; to.dispatchEvent(new Event('input', { bubbles: true })); return type('#f-est-title', '高橋様邸 外壁塗装工事', 30); });
    LINES.forEach(function (L, i) {
      p = p.then(function () { return i ? click('#addLine') : null; }).then(function () {
        var row = function (k) { return '[data-bind="line:' + i + ':' + k + '"]'; };
        [['kind', ['仮設工事', '外壁塗装', '付帯塗装'][i]], ['unit', ['m2', 'm2', '式'][i]]].forEach(function (kv) { var f = $(row(kv[0])); if (f) { f.value = kv[1]; f.dispatchEvent(new Event('input', { bubbles: true })); } });
        return type(row('name'), L[0], 24).then(function () { return type(row('qty'), L[1], 45); }).then(function () { return type(row('price'), L[2], 45); });
      });
    });
    p.then(function () { return wait(500); })
      .then(function () { return click('#makeSite'); })
      .then(function () { sid = est().site; pulse(1); return wait(700); })
      .then(function () { return nav('sched'); })
      .then(function () { return moveTo($('#gantt'), 500); })
      .then(function () { return wait(1600); })
      .then(function () { pulse(2); return nav('daily'); })
      .then(function () { return choose('#dr-person', '鈴木'); })
      .then(function () { return choose('#dr-site', sid); })
      .then(function () { return click('#addReport'); })
      .then(function () { return wait(400); })
      .then(function () { var tr = $('#v-daily tr.flash'); return tr ? moveTo(tr, 400) : null; })
      .then(function () { return wait(1100); })
      .then(function () { pulse(3); return nav('bills'); })
      .then(function () { var b = S.bills.filter(function (x) { return x.site === sid && !x.issued; })[0]; return click('[data-act="issue"][data-id="' + b.id + '"]').then(function () { return b.id; }); })
      .then(function (bid) { return wait(900).then(function () { return click('[data-act="pay-open"][data-id="' + bid + '"]'); }); })
      .then(function () { return wait(250); })
      .then(function () { return click('#paySave'); })
      .then(function () { pulse(4); return moveTo($('#v-bills .kpi'), 400); })
      .then(function () { return wait(900); })
      .then(function () { return nav('dash'); })
      .then(function () { return wait(2600); })
      .then(function () { cur.el.style.display = 'none'; demoOn = false; window.__studio.demoDone = true; });
  }

  // ================= 起動 =================
  S = load();
  $('#coName').textContent = S.company.name;
  $('#todayLabel').textContent = '今日 ' + K.iso(TODAY).replace(/-/g, '/') + '（' + K.WD[K.wday(TODAY)] + '）';
  showWarn();
  if (!DEMO) save();
  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  window.__studio.ready = fontsReady.then(function () {
    go('dash');
    if (DEMO) runDemo();
    return true;
  });
})();
