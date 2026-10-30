/* 車屋・バイク屋スタジオ：画面の部分。計算は logic.js（Excel版と同じルール）、見本は data.js。
   データは localStorage だけに保存（外部送信なし）。動きは requestAnimationFrame（30コマ/秒まで、見えないときは止める）。
   ?demo=1 … 車検が近いお客さま→案内文→ピット予約→整備見積→請求→入金→ダッシュボードを自動で操作（保存しない）
   ?capture=1 … 時計を外から進める（window.__studio.advance(ms)）。録画でコマ落ちしないように
   ?today=2026-10-22 … 「今日」を固定（見本・録画用） */
(function () {
  'use strict';
  var K = window.KL, DATA = window.KDATA;
  var Q = new URLSearchParams(location.search);
  var DEMO = Q.get('demo') === '1', CAPTURE = Q.get('capture') === '1';
  if (DEMO || CAPTURE) document.documentElement.classList.add('is-demo');
  var KEY = 'kuruma-studio-v1';
  var TODAY = K.D(Q.get('today')) || K.todayN();
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var yen = K.yen, pct = K.pct, n0 = K.n0, has = K.has, D = K.D;

  // ================= 保存 =================
  var S, storageOk = true;
  function load() {
    if (DEMO) return DATA.sample(TODAY);
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw); if (o && o.v === 1 && o.company && o.customers && o.jobs) return o; }
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
    if (!DEMO && !storageOk) msg.push('このブラウザでは保存できません（プライベートモードなど）。ページを閉じると入力は消えます。');
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
    yen: function (v) { return yen(v); }, pct: function (v) { return pct(v); }, n: function (v) { return K.num(v); }, n1: function (v) { return K.num(v, 1); }
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
  function cnt(k, v, f, cls) { return '<span class="' + (cls || '') + '" data-k="' + esc(k) + '" data-v="' + (v === null || v === undefined || v === '' ? 'x' : v) + '" data-f="' + (f || 'yen') + '"></span>'; }
  function toast(msg) {
    var el = $('#toast'); el.textContent = msg;
    tween(2600, function (p) { el.style.opacity = p < .1 ? p * 10 : (p > .85 ? (1 - p) / .15 : 1); }, null, function (p) { return p; });
  }
  function fld(lab, input, cls) { return '<label class="f' + (cls ? ' ' + cls : '') + '">' + lab + input + '</label>'; }
  function opts(list, cur) { return list.map(function (x) { var v = typeof x === 'object' ? x[0] : x, t = typeof x === 'object' ? x[1] : x; return '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join(''); }
  function trim(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function kpi(lab, valHtml, cls, sub, wk, w, sparkCls) {
    return '<div class="panel kpi"><div class="lab">' + lab + '</div><div class="val ' + (cls || '') + '">' + valHtml + '</div><div class="sub">' + sub + '</div><div class="spark ' + (sparkCls || '') + '"><i data-w="' + (w || 0) + '" data-wk="' + wk + '"></i></div></div>';
  }
  var PILL = { '期限切れ': 'exp', '急ぎ': 'bad', '案内時期': 'warn', 'OK': 'ok', '未入力': 'mut', '重なり': 'bad', '代車重なり': 'bad', '時間外': 'warn', '休業日': 'warn', '時刻を確認': 'warn', '入力不足': 'warn', 'キャンセル': 'mut',
    '入金済': 'ok', '一部入金': 'warn', '未入金': 'info', '遅れ': 'bad', '見積書': 'mut', '請求書': 'info', '要発注': 'bad', '発注済み': 'warn', '在庫がマイナス': 'bad', '品番が重複': 'bad', '品番なし': 'bad', '数量を確認': 'warn',
    '長期在庫': 'bad', '在庫': 'info', '売れた': 'ok', '日付を確認': 'warn', '予約': 'info', '入庫': 'warn', '完了': 'ok', '予約済': 'info', '1回目済': 'mut', '2回目済': 'mut', '他店・不要': 'mut', '貸出中': 'info', '空き': 'ok' };
  function pill(st) { return st ? '<span class="pill ' + (PILL[st] || 'mut') + '">' + esc(st) + '</span>' : ''; }
  var ST_LABEL = { '期限切れ': '期限切れ', '急ぎ': '急ぎ（1か月以内）', '案内時期': '案内時期（2か月以内）', 'OK': 'OK', '未入力': '未入力' };
  function stCls(st) { return st === '期限切れ' ? 's-exp' : (st === '急ぎ' ? 's-bad' : (st === '案内時期' ? 's-warn' : '')); }

  // ================= 集計（アプリ全体） =================
  var C = function () { return S.company; };
  function pitCfg() { var c = C(); return { open: n0(c.open), close: n0(c.close), step: Math.max(5, n0(c.step)), brs: has(c.brs) ? n0(c.brs) : null, bre: has(c.bre) ? n0(c.bre) : null, h1: c.h1, h2: c.h2, lifts: c.lifts.filter(has), cars: c.cars.filter(has), hols: c.hols || [] }; }
  function cc(c) { return K.custCalc(c, TODAY, n0(C().d1), n0(C().d2)); }
  function isNear(c, x) { x = x || cc(c); return (x.st === '期限切れ' || x.st === '急ぎ' || x.st === '案内時期') && c.guide !== '予約済' && c.guide !== '他店・不要'; }
  function jc(j) { return K.jobCalc(j); }
  function jobDue(j) { return K.dueDate(j.date, j.days); }
  function jobPay(j) { var x = jc(j); return K.payStatus(x.total, j.paid, jobDue(j), TODAY); }
  function invoices() { return S.jobs.filter(function (j) { return j.kind === '請求書'; }); }
  function uc(u) { return K.usedCalc(u, TODAY, n0(C().long)); }
  function custById(id) { return S.customers.filter(function (c) { return c.id === id; })[0]; }
  function custByName(n) { return S.customers.filter(function (c) { return c.name === n; })[0]; }
  function monthTotals(mk) {
    var inv = invoices().filter(function (j) { return K.monthKey(D(j.date)) === mk; });
    var svc = inv.reduce(function (a, j) { var x = jc(j); a.sales += x.base10; a.gross += x.gross; a.total += x.total; return a; }, { sales: 0, gross: 0, total: 0, n: inv.length });
    var sold = S.used.filter(function (u) { return uc(u).st === '売れた' && K.monthKey(D(u.sold)) === mk; });
    var us = sold.reduce(function (a, u) { var x = uc(u); a.sales += n0(u.price); a.gross += n0(x.gross); return a; }, { sales: 0, gross: 0, n: sold.length });
    var recv = S.jobs.filter(function (j) { return has(j.paid) && K.monthKey(D(j.paidDate)) === mk; }).reduce(function (a, j) { return a + n0(j.paid); }, 0);
    return { svc: svc, used: us, sales: svc.sales + us.sales, gross: svc.gross + us.gross, recv: recv };
  }

  // ================= 画面の切りかえ =================
  var view = 'dash';
  var TITLES = { dash: 'ダッシュボード', cust: '顧客と車検台帳', pit: 'ピット予約', job: '整備見積・請求', parts: '部品在庫', used: '中古車在庫', set: '設定' };
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
  function render() { RENDER[view](); kick(); }
  function commit() { save(); render(); }

  // ================= 1) ダッシュボード =================
  var flowEls = null;
  RENDER.dash = function () {
    var el = $('#v-dash'), mk = K.monthKey(TODAY), mt = monthTotals(mk), cfg = pitCfg();
    var near = S.customers.map(function (c) { return { c: c, x: cc(c) }; }).filter(function (o) { return isNear(o.c, o.x); }).sort(function (a, b) { return a.x.rem - b.x.rem; });
    var nExp = near.filter(function (o) { return o.x.st === '期限切れ'; }).length, nBad = near.filter(function (o) { return o.x.st === '急ぎ'; }).length;
    var inMonth = S.pits.filter(function (p) { return K.monthKey(D(p.date)) === mk && (p.state === '入庫' || p.state === '完了'); });
    var inCar = inMonth.length;
    // 6か月の粗利（整備・中古車）
    var mon = [];
    for (var i = 5; i >= 0; i--) { var m0 = K.addMonths(TODAY, -i), t = monthTotals(K.monthKey(m0)); mon.push({ m: m0, svc: t.svc.gross, used: t.used.gross }); }
    var mx = Math.max.apply(null, mon.map(function (m) { return Math.max(m.svc, m.used); }).concat([1]));
    var guided = S.customers.filter(function (c) { return c.guide === '1回目済' || c.guide === '2回目済'; }).length;
    var booked = S.pits.filter(function (p) { return p.state === '予約' && D(p.date) >= TODAY; }).length;
    var inNow = S.pits.filter(function (p) { return p.state === '入庫'; }).length;
    var ests = S.jobs.filter(function (j) { return j.kind === '見積書'; }).length;
    var flow = [
      { lab: '車検の案内', k: 'f-g', v: guided, f: 'n', u: '人' }, { lab: '予約', k: 'f-b', v: booked, f: 'n', u: '台' },
      { lab: '入庫', k: 'f-i', v: inNow, f: 'n', u: '台' }, { lab: '整備（見積）', k: 'f-e', v: ests, f: 'n', u: '件' },
      { lab: '請求', k: 'f-v', v: mt.svc.total, f: 'yen', u: '' }, { lab: '入金', k: 'f-p', v: mt.recv, f: 'yen', u: '' }
    ];
    var h = '<div class="grid g4">';
    h += kpi('今月の売上', cnt('d-sales', mt.sales), '', '整備 ' + yen(mt.svc.sales) + '・中古車 ' + yen(mt.used.sales), 'k-s', Math.min(1, mt.sales / 1500000));
    h += kpi('今月の粗利', cnt('d-gross', mt.gross), 'gr', '粗利率 ' + (mt.sales ? pct(mt.gross / mt.sales) : '—') + '・整備 ' + yen(mt.svc.gross), 'k-g', mt.sales ? Math.max(0, mt.gross / mt.sales) : 0, 'st');
    h += kpi('今月の入庫台数', cnt('d-in', inCar, 'n') + '<small>台</small>', 'st', 'ピット予約の「入庫」「完了」', 'k-i', Math.min(1, inCar / 30), 'st');
    h += kpi('車検が近い台数', cnt('d-near', near.length, 'n') + '<small>台</small>', near.length ? 'rd' : '', (nExp ? '<span class="bad">切れ ' + nExp + '</span>・' : '') + '急ぎ ' + nBad + '・案内時期 ' + (near.length - nExp - nBad), 'k-n', Math.min(1, near.length / Math.max(1, S.customers.length)));
    h += '</div>';
    // 流れ
    h += '<div class="panel flow mt"><div class="ph"><h2><b>FLOW</b>車検の案内 → 予約 → 入庫 → 整備 → 請求 → 入金</h2><span class="tag">今</span></div>';
    h += '<svg viewBox="0 0 560 96" id="flowSvg" role="img" aria-label="車検の案内から入金までのつながり">';
    h += '<defs><linearGradient id="fl" x1="0" x2="1"><stop offset="0" stop-color="#e0374f"/><stop offset="1" stop-color="#aebdcd"/></linearGradient></defs>';
    h += '<line x1="40" y1="34" x2="520" y2="34" stroke="#26292f" stroke-width="6" stroke-linecap="round"/>';
    h += '<line x1="40" y1="34" x2="520" y2="34" stroke="url(#fl)" stroke-width="2" stroke-linecap="round" opacity=".9"/>';
    for (var j = 0; j < 9; j++) h += '<circle class="fd" r="2.6" cy="34" cx="40" fill="#fff"/><circle class="fh" r="7" cy="34" cx="40" fill="#e0374f" opacity=".22"/>';
    flow.forEach(function (f, i) {
      var x = 40 + i * 96;
      h += '<circle class="fn" cx="' + x + '" cy="34" r="13" fill="#0c0d0f" stroke="' + (i < 3 ? '#e0374f' : '#aebdcd') + '" stroke-width="2"/>';
      h += '<circle class="fr" cx="' + x + '" cy="34" r="13" fill="none" stroke="#fff" stroke-width="1.5" opacity="0"/>';
      h += '<text x="' + x + '" y="38" text-anchor="middle" font-family="JetBrains Mono" font-size="11" fill="#fff">' + (i + 1) + '</text>';
      h += '<text class="nlab" x="' + x + '" y="66" text-anchor="middle">' + f.lab + '</text>';
      h += '<text class="ncnt" x="' + x + '" y="84" text-anchor="middle"><tspan data-k="' + f.k + '" data-v="' + f.v + '" data-f="' + f.f + '"></tspan>' + f.u + '</text>';
    });
    h += '</svg></div>';
    // グラフと今日のピット
    h += '<div class="grid g2 mt">';
    h += '<div class="panel"><div class="ph"><h2><b>01</b>粗利（6か月）</h2><div class="legend"><span><i style="background:#e0374f"></i>整備</span><span><i style="background:#aebdcd"></i>中古車</span></div></div><div class="chart">';
    mon.forEach(function (m, i) {
      h += '<div class="col' + (i === 5 ? ' now' : '') + '"><div class="bars"><div class="bar b1" data-h="' + (m.svc / mx) + '" data-hk="cs' + i + '" title="整備 ' + yen(m.svc) + '"></div><div class="bar b2" data-h="' + (m.used / mx) + '" data-hk="cu' + i + '" title="中古車 ' + yen(m.used) + '"></div></div><span class="m">' + K.ymd(m.m).m + '月</span></div>';
    });
    h += '</div></div>';
    var ns = K.nslots(cfg), anyHol = K.pitHoliday(TODAY, cfg);
    h += '<div class="panel st"><div class="ph"><h2><b>02</b>今日のピット</h2><span class="tag">' + K.mdw(TODAY) + (anyHol ? '・休業日' : '') + '</span></div><div class="prog">';
    cfg.lifts.forEach(function (l, li) {
      var free = K.pitFree(S.pits, TODAY, l, cfg), open = 0;
      for (var k = 0; k < ns; k++) if (K.slotOk(TODAY, cfg.open + k * cfg.step, cfg)) open++;
      var used = open - free, n = S.pits.filter(function (p) { return K.pitValid(p) && D(p.date) === TODAY && p.lift === l; }).length;
      h += '<div class="row' + (open && free === 0 ? ' full' : '') + '"><div class="t"><span>' + esc(l) + '</span><em>' + n + '件・空き ' + free + '枠</em></div><div class="track"><i data-w="' + (open ? used / open : 0) + '" data-wk="pl' + li + '"></i></div></div>';
    });
    h += '</div><div class="cars">' + cfg.cars.map(function (c) { var s = K.carState(S.pits, c, TODAY); return '<span class="pill ' + PILL[s.state] + '" title="' + esc(s.who) + '">' + esc(c) + '：' + s.state + '</span>'; }).join('') + '</div></div></div>';
    // 車検が近い・気をつけること
    h += '<div class="grid g2 mt">';
    h += '<div class="panel"><div class="ph"><h2><b>03</b>車検が近いお客さま</h2><span class="tag">満了日の近い順</span></div><div class="list">';
    near.slice(0, 6).forEach(function (o) {
      h += '<div class="li"><span class="days ' + (o.x.st === '期限切れ' ? 'exp' : o.x.st === '急ぎ' ? 'bad' : 'warn') + '">' + o.x.rem + '日</span><span class="x">' + esc(o.c.name) + '<small>' + esc(o.c.car) + '・満了 ' + K.md(o.x.exp) + '</small></span>' + pill(o.c.guide || o.x.st) + '</div>';
    });
    if (!near.length) h += '<p class="note">案内が必要なお客さまはいません。</p>';
    h += '</div></div>';
    var ol = K.orderList(S.parts, S.recs), longs = S.used.filter(function (u) { return uc(u).st === '長期在庫'; });
    var late = invoices().filter(function (j2) { return jobPay(j2).status === '遅れ'; });
    h += '<div class="panel st"><div class="ph"><h2><b>04</b>気をつけること</h2></div><div class="list">';
    h += '<div class="li"><span class="days ' + (ol.list.length ? 'bad' : 'ok') + '">' + ol.list.length + '</span><span class="x">部品の要発注<small>' + esc(ol.list.slice(0, 3).map(function (x) { return x.p.name; }).join('・')) + '</small></span><span class="r">' + yen(ol.money) + '</span></div>';
    h += '<div class="li"><span class="days ' + (longs.length ? 'bad' : 'ok') + '">' + longs.length + '</span><span class="x">中古車の長期在庫（' + n0(C().long) + '日超）<small>' + esc(longs.map(function (u) { return u.no + ' ' + uc(u).days + '日'; }).join('・')) + '</small></span></div>';
    h += '<div class="li"><span class="days ' + (late.length ? 'bad' : 'ok') + '">' + late.length + '</span><span class="x">入金の遅れ<small>' + esc(late.map(function (x) { return x.to; }).join('・')) + '</small></span><span class="r">' + yen(late.reduce(function (a, x) { return a + jobPay(x).remain; }, 0)) + '</span></div>';
    var ov = S.pits.filter(function (p, i2) { return K.pitJudge(S.pits, i2, cfg) === '重なり' && D(p.date) >= TODAY; }).length;
    h += '<div class="li"><span class="days ' + (ov ? 'bad' : 'ok') + '">' + ov + '</span><span class="x">ピットの重なり（今日以降）</span></div>';
    h += '</div></div></div>';
    h += '<div class="panel mt feed"><div class="ph"><h2><b>05</b>最近の動き</h2></div><div class="list">';
    S.log.slice(0, 5).forEach(function (l) { h += '<div class="li"><span class="m">' + esc(K.md(D(l.t))) + '</span><span class="x">' + esc(l.msg) + '</span></div>'; });
    h += '</div></div>';
    el.innerHTML = h;
    flowEls = { d: $$('.fd', el), h: $$('.fh', el), r: $$('.fr', el) };
    animate(el);
  };
  var flowPulse = -1, flowPulseT = 0;
  function drawFlow(t) {
    if (!flowEls || !flowEls.d.length || !document.body.contains(flowEls.d[0])) { flowEls = null; return; }
    var L = 480, n = flowEls.d.length, near = [0, 0, 0, 0, 0, 0];
    for (var i = 0; i < n; i++) {
      var p = ((t / 4000) + i / n) % 1, x = 40 + p * L;
      flowEls.d[i].setAttribute('cx', x.toFixed(1)); flowEls.h[i].setAttribute('cx', x.toFixed(1));
      flowEls.h[i].setAttribute('fill', p < .5 ? '#e0374f' : '#aebdcd');
      for (var k = 0; k < 6; k++) { var dd = Math.abs(x - (40 + k * 96)); if (dd < 14) near[k] = Math.max(near[k], 1 - dd / 14); }
    }
    for (var k2 = 0; k2 < 6; k2++) {
      var on = flowPulse === k2 ? Math.max(0, 1 - (t - flowPulseT) / 1400) : 0, a = Math.max(near[k2] * .6, on);
      flowEls.r[k2].setAttribute('opacity', a.toFixed(2)); flowEls.r[k2].setAttribute('r', (13 + a * 7).toFixed(1));
    }
  }

  // ================= 2) 顧客と車検台帳 =================
  var sel = {}, annMode = 'card', annOn = false, tplCustom = { card: null, line: null }, newCust = '';
  var PRESETS = {
    shaken: {
      title: '車検のご案内',
      card: '{名前} 様\n\nいつも当店をご利用いただき、ありがとうございます。\nお車（{車種}　{登録番号}）の車検の有効期間が、{満了日}で満了となります。\n\n{2か月前}ごろから、車検のご予約をお受けしています。\nご都合のよい日を、お電話でお知らせください。',
      line: '{名前} 様\n{店名}です。いつもありがとうございます。\n\n{車種}（{登録番号}）の車検の満了日は {満了日} です。\n{2か月前}ごろから、車検のご予約をお受けしています。\n\nご都合のよい日を、このメッセージへの返信か、お電話（{店の電話}）でお知らせください。'
    },
    tenken: {
      title: '点検のご案内',
      card: '{名前} 様\n\nいつも当店をご利用いただき、ありがとうございます。\nお車（{車種}　{登録番号}）の点検の時期が近づいてまいりました。\n次の点検の目安は {基準日} です。\n\n点検のご予約をお受けしています。\nご都合のよい日を、お電話でお知らせください。',
      line: '{名前} 様\n{店名}です。いつもありがとうございます。\n\n{車種}（{登録番号}）の点検の目安は {基準日} です。\n点検のご予約をお受けしています。\n\nご都合のよい日を、このメッセージへの返信か、お電話（{店の電話}）でお知らせください。'
    }
  };
  var SIGN = '{店名}\n{店の住所}\nTEL {店の電話}';
  function presetOf(c) { return K.nextYears(c.kind) === '車検なし' ? 'tenken' : 'shaken'; }
  function annText(c, mode) {
    var p = PRESETS[presetOf(c)], heads = ['名前', '車種', '登録番号', '満了日'];
    var rec = { '名前': c.name, '車種': c.car, '登録番号': c.plate, '満了日': c.exp };
    var v = K.varsFor(rec, heads, { dateCol: '満了日', shop: { name: C().name, tel: C().tel, addr: C().addr }, today: K.iso(TODAY) });
    var body = K.fill(tplCustom[mode] || p[mode], v);
    return { title: p.title, text: body.text, unknown: body.unknown, sign: K.cleanSign(K.fill(SIGN, v).text) };
  }
  function sortedCust() {
    return S.customers.map(function (c, i) { return { c: c, i: i, x: cc(c) }; })
      .sort(function (a, b) { return (a.x.exp === null) - (b.x.exp === null) || (a.x.exp - b.x.exp) || a.i - b.i; });
  }
  function selected() { return sortedCust().filter(function (o) { return sel[o.c.id]; }); }
  RENDER.cust = function () {
    var rows = sortedCust(), d1 = n0(C().d1), d2 = n0(C().d2);
    var g = K.guideList(S.customers, TODAY, d1, d2);
    var cn = { '期限切れ': 0, '急ぎ': 0, '案内時期': 0 };
    rows.forEach(function (o) { if (cn.hasOwnProperty(o.x.st) && o.c.guide !== '予約済' && o.c.guide !== '他店・不要') cn[o.x.st]++; });
    var h = '<div class="grid g4">';
    h += kpi('期限切れ', cnt('c-x', cn['期限切れ'], 'n') + '<small>台</small>', cn['期限切れ'] ? 'rd' : '', '満了日を過ぎた（予約済を除く）', 'ck1', cn['期限切れ'] / Math.max(1, rows.length));
    h += kpi('急ぎ（' + d2 + '日以内）', cnt('c-r', cn['急ぎ'], 'n') + '<small>台</small>', cn['急ぎ'] ? 'rd' : '', '2回目の案内の時期', 'ck2', cn['急ぎ'] / Math.max(1, rows.length));
    h += kpi('案内時期（' + d1 + '日以内）', cnt('c-y', cn['案内時期'], 'n') + '<small>台</small>', '', '1回目の案内の時期', 'ck3', cn['案内時期'] / Math.max(1, rows.length));
    h += kpi(K.ymd(TODAY).m + '月の案内', cnt('c-m', g.list.length, 'n') + '<small>人</small>', 'st', '予約済・他店・不要は除く', 'ck4', g.list.length / Math.max(1, rows.length), 'st');
    h += '</div>';
    var nSel = selected().length;
    h += '<div class="panel mt"><div class="ph"><h2><b>LEDGER</b>お客さまと車検の満了日（近い順）</h2><div class="btns"><button class="ghost" data-act="sel-month" id="selMonth">今月の案内を選ぶ</button><button class="ghost" data-act="sel-none">選択を外す</button><button class="btn" data-act="mk-ann" id="mkAnn"' + (nSel ? '' : ' disabled') + '>案内文を作る（' + nSel + '人）</button></div></div>';
    h += '<div class="tw"><table id="custTbl"><thead><tr><th></th><th>お客さま</th><th class="hide-n">車種・登録番号</th><th class="hide-n">区分</th><th>満了日</th><th class="r">残り</th><th>受けられる日<br><small>2か月前から</small></th><th class="hide-n">案内日<br><small>' + d1 + '日前／' + d2 + '日前</small></th><th>状態</th><th>案内状況</th><th class="hide-n">次の満了日<br><small>目安</small></th><th></th></tr></thead><tbody>';
    rows.forEach(function (o) {
      var c = o.c, x = o.x;
      h += '<tr class="' + stCls(x.st) + (sel[c.id] ? ' sel' : '') + (c.id === newCust ? ' flash' : '') + '" data-cid="' + c.id + '"><td><input type="checkbox" data-sel="' + c.id + '"' + (sel[c.id] ? ' checked' : '') + ' aria-label="' + esc(c.name) + 'を選ぶ"></td>';
      h += '<td class="nowrap">' + esc(c.name) + '<small>' + esc(c.tel) + '</small></td><td class="hide-n">' + esc(c.car) + '<small>' + esc(c.plate) + '</small></td><td class="hide-n"><small style="white-space:normal">' + esc(c.kind) + '</small></td>';
      h += '<td class="mono nowrap">' + (x.exp === null ? '—' : K.iso(x.exp).replace(/-/g, '/')) + (K.nextYears(c.kind) === '車検なし' ? '<small>点検の予定日</small>' : '') + '</td>';
      h += '<td class="r"><span class="days ' + (x.st === '期限切れ' ? 'exp' : x.st === '急ぎ' ? 'bad' : x.st === '案内時期' ? 'warn' : 'ok') + '">' + (x.rem === null ? '—' : x.rem + '日') + '</span></td>';
      h += '<td class="mono nowrap">' + (x.from2 === null || K.nextYears(c.kind) === '車検なし' ? '—' : K.mdw(x.from2)) + '</td>';
      h += '<td class="mono hide-n nowrap">' + (x.g1 === null ? '' : K.md(x.g1) + '／' + K.md(x.g2)) + '</td>';
      h += '<td>' + pill(x.st) + '</td><td><select data-bind="cu:' + c.id + ':guide" style="width:96px">' + opts([['', '（まだ）']].concat(K.GUIDE.map(function (gd) { return [gd, gd]; })), c.guide) + '</select></td>';
      h += '<td class="mono hide-n nowrap">' + (x.next === null ? (x.years === '車検なし' ? '<small>車検なし</small>' : '') : K.iso(x.next).replace(/-/g, '/')) + '</td><td><button class="ghost sm" data-act="del-cust" data-id="' + c.id + '" aria-label="消す">×</button></td></tr>';
    });
    h += '</tbody></table></div>';
    h += '<p class="note mt">色：<span class="pill exp">期限切れ</span> 満了日を過ぎた／<span class="pill bad">急ぎ</span> 残り' + d2 + '日以内／<span class="pill warn">案内時期</span> 残り' + d1 + '日以内。「受けられる日」は満了日の2か月前の同じ日（その日がない月は月末）。令和7年4月1日から、満了日の2か月前から車検を受けても、残りの有効期間は減りません（国土交通省）。</p></div>';
    // 案内文
    h += '<div class="panel mt st" id="annBox"><div class="ph"><h2><b>LETTER</b>案内文（差し込み）</h2><div class="tpl-tabs"><button class="' + (annMode === 'card' ? 'btn' : 'ghost') + '" data-act="ann-mode" data-m="card">はがき</button><button class="' + (annMode === 'line' ? 'btn' : 'ghost') + '" data-act="ann-mode" data-m="line">LINE・メール</button></div></div>';
    var list = selected();
    if (!annOn || !list.length) h += '<p class="note">上の表でお客さまにチェックを入れて「案内文を作る」を押すと、ここに案内文ができます（車検なしの区分は点検の案内）。送信はしません。コピーして使います。</p>';
    else {
      h += '<div class="cards" id="annCards">' + cardsHtml(list) + '</div><div class="btns mt"><button class="btn st" data-act="ann-copy">文をコピー</button><button class="btn" data-act="ann-done" id="annDone">案内済にする</button><button class="btn" data-act="to-pit" id="toPit">' + esc(list[0].c.name) + ' 様の予約を入れる →</button></div>';
      h += '<details class="mt"><summary class="note">ひな形を直す（{名前}{車種}{登録番号}{満了日}{2か月前}{1か月前}{店名}{店の電話} が使えます）</summary><textarea id="tplEdit" data-act="tpl" style="min-height:150px;margin-top:8px">' + esc(tplCustom[annMode] || PRESETS[presetOf(list[0].c)][annMode]) + '</textarea><button class="ghost mt" data-act="tpl-reset">ひな形に戻す</button></details>';
    }
    h += '<p class="src mt">お店の名前・電話・住所は「設定」で変えられます。中身が空の「TEL」の行ははがきに残しません。電子車検証では満了日が券面に書かれず ICタグに入るため（国土交通省 電子車検証特設サイト）、台帳で管理しておくと案内を見落としにくくなります。</p></div>';
    // 追加
    h += '<div class="panel mt"><div class="ph"><h2><b>NEW</b>お客さまを足す</h2></div><div class="form">';
    h += fld('お客さま名', '<input id="nc-name" placeholder="例：見本 太郎">') + fld('電話', '<input id="nc-tel">') + fld('車種', '<input id="nc-car" placeholder="例：軽乗用">') + fld('登録番号', '<input id="nc-plate">');
    h += fld('区分', '<select id="nc-kind">' + opts(K.PERIODS.map(function (p) { return p[0]; }), '自家用乗用') + '</select>', 'wide') + fld('車検満了日（車検なしは点検予定日）', '<input type="date" id="nc-exp">');
    h += '<button class="btn" data-act="add-cust">台帳に足す</button></div><p class="note mt">次の満了日の目安＝満了日＋区分の「2回目以降」の年数（国土交通省「自動車検査証の有効期間」）。実際の満了日は車検証で確かめてください。</p></div>';
    $('#v-cust').innerHTML = h;
    animate($('#v-cust'));
    newCust = '';
  };
  function cardsHtml(list) {
    return list.map(function (o) {
      var t = annText(o.c, annMode);
      return annMode === 'card' ? '<div class="card"><h3>' + esc(t.title) + '</h3>' + esc(t.text) + '<div class="sg">' + esc(t.sign) + '</div></div>' : '<div class="card line">' + esc(t.text) + '</div>';
    }).join('');
  }
  function annDone() {
    var list = selected(); if (!list.length) return;
    list.forEach(function (o) { var c = o.c; if (c.guide === '予約済' || c.guide === '他店・不要') return; c.guide = c.guide === '1回目済' ? '2回目済' : '1回目済'; });
    log('案内を出した：' + list.map(function (o) { return o.c.name; }).join('・'));
    commit(); toast('案内済にしました（' + list.length + '人）');
  }

  // ================= 3) ピット予約 =================
  var pitDay = null, pitDraft = null, pitNew = '';
  RENDER.pit = function () {
    var cfg = pitCfg(); if (pitDay === null) pitDay = TODAY;
    var d = pitDay, ns = K.nslots(cfg), rows = S.pits;
    var dayRows = rows.map(function (r, i) { return { r: r, i: i, j: K.pitJudge(rows, i, cfg) }; }).filter(function (o) { return D(o.r.date) === d; }).sort(function (a, b) { return (a.r.s || 0) - (b.r.s || 0) || a.i - b.i; });
    var free = cfg.lifts.map(function (l) { return K.pitFree(rows, d, l, cfg); }), totFree = free.reduce(function (a, x) { return a + x; }, 0);
    var over = dayRows.filter(function (o) { return o.j === '重なり'; }).length;
    var two = K.pitDays(rows, TODAY, cfg, 14);
    var freeCars = cfg.cars.length - cfg.cars.reduce(function (a, c) { return a + K.carsInUse(rows, c, d); }, 0);
    var h = '<div class="grid g4">';
    h += kpi('予約', cnt('p-n', dayRows.filter(function (o) { return K.pitValid(o.r); }).length, 'n') + '<small>件</small>', 'st', K.mdw(d) + (K.pitHoliday(d, cfg) ? '・休業日' : ''), 'pk1', 0, 'st');
    h += kpi('空き枠', cnt('p-f', totFree, 'n') + '<small>枠</small>', 'gr', cfg.step + '分ごと・' + cfg.lifts.length + '本のリフト', 'pk2', ns ? totFree / (ns * Math.max(1, cfg.lifts.length)) : 0, 'st');
    h += kpi('重なり', cnt('p-o', over, 'n') + '<small>件</small>', over ? 'rd' : '', '同じリフト・同じ時間', 'pk3', over ? 1 : 0);
    h += kpi('代車の空き', cnt('p-c', freeCars, 'n') + '<small>台</small>', freeCars < 0 ? 'rd' : 'st', '全' + cfg.cars.length + '台', 'pk4', cfg.cars.length ? Math.max(0, freeCars) / cfg.cars.length : 0, 'st');
    h += '</div>';
    // 2週間
    h += '<div class="panel mt st"><div class="ph"><h2><b>14DAYS</b>2週間の空き</h2><span class="tag">数字＝空き枠の合計</span></div><div class="two">';
    two.forEach(function (x) {
      h += '<div class="d' + (x.date === d ? ' on' : '') + (x.hol ? ' hol' : '') + '" data-act="pit-day" data-d="' + x.date + '"><div class="w">' + K.md(x.date) + '(' + K.WD[K.wday(x.date)] + ')</div><div class="n">' + (x.hol ? '休' : x.total) + '</div><div class="c">' + x.count + '件</div>' + (x.overlaps ? '<span class="o">重' + x.overlaps + '</span>' : '') + '</div>';
    });
    h += '</div></div>';
    // ピット表
    h += '<div class="panel mt"><div class="ph"><h2><b>PIT</b>ピット表（日×リフト）</h2><div class="btns"><button class="ghost sm" data-act="pit-prev">◀ 前の日</button><button class="ghost sm" data-act="pit-today">今日</button><button class="ghost sm" data-act="pit-next">次の日 ▶</button><input type="date" id="pitDate" value="' + K.iso(d) + '" style="width:auto"></div></div>';
    h += '<div class="tw"><table class="pit" id="pitTbl"><thead><tr><th style="width:56px"></th>' + cfg.lifts.map(function (l, i) { return '<th>' + esc(l) + '<small>空き ' + free[i] + '枠</small></th>'; }).join('') + '</tr></thead><tbody>';
    for (var k = 0; k < ns; k++) {
      var m = cfg.open + k * cfg.step;
      h += '<tr><td class="t">' + K.hhmm(m) + '</td>';
      cfg.lifts.forEach(function (l) {
        var c = K.pitCell(rows, d, l, k, cfg), isNew = (c.row && c.row.id === pitNew) ? ' new' : '';
        h += '<td class="' + c.kind + isNew + '" title="' + esc(c.text) + '">' + esc(c.text) + '</td>';
      });
      h += '</tr>';
    }
    h += '</tbody></table></div><p class="note">色：<span class="pill info">予約</span>（〃＝続き）／<span class="pill bad">重なり</span> 同じリフトの同じ時間に2件以上／斜線＝昼休み。キャンセルは表に出しません。</p></div>';
    // その日の予約
    h += '<div class="panel mt"><div class="ph"><h2><b>LIST</b>' + K.mdw(d) + ' の予約</h2></div><div class="tw"><table><thead><tr><th>時間</th><th>リフト</th><th>お客さま</th><th class="hide-n">作業</th><th class="hide-n">代車</th><th>状態</th><th>判定</th><th></th></tr></thead><tbody>';
    dayRows.forEach(function (o) {
      var r = o.r;
      h += '<tr class="' + (o.j === '重なり' || o.j === '代車重なり' ? 's-bad' : (r.state === 'キャンセル' ? 'cancel' : '')) + (r.id === pitNew ? ' flash' : '') + '"><td class="mono nowrap">' + K.hhmm(r.s) + '〜' + K.hhmm(r.e) + '</td><td>' + esc(r.lift) + '</td><td>' + esc(r.name) + '<small>' + esc(r.car_model) + '</small></td><td class="hide-n">' + esc(r.work) + '</td><td class="hide-n"><small>' + esc(r.car) + (has(r.ret) ? '〜' + K.md(D(r.ret)) : '') + '</small></td>';
      h += '<td><select data-bind="pt:' + r.id + ':state" style="width:92px">' + opts(['予約', '入庫', '完了', 'キャンセル'], r.state) + '</select></td><td>' + pill(o.j) + '</td><td class="nowrap"><button class="ghost sm" data-act="pit-job" data-id="' + r.id + '">見積 →</button> <button class="ghost sm" data-act="del-pit" data-id="' + r.id + '" aria-label="消す">×</button></td></tr>';
    });
    if (!dayRows.length) h += '<tr><td colspan="8" class="note">この日の予約はまだありません。</td></tr>';
    h += '</tbody></table></div></div>';
    // 予約を入れる
    var dr = pitDraft || { date: K.iso(d), s: cfg.open, e: cfg.open + 60, lift: cfg.lifts[0] || '', name: '', car_model: '', work: '', car: '', ret: '', state: '予約' };
    h += '<div class="panel mt" id="pitForm"><div class="ph"><h2><b>NEW</b>予約を入れる</h2>' + (pitDraft ? '<span class="tag">空いている時間を入れました</span>' : '') + '</div><div class="form">';
    h += fld('日付', '<input type="date" id="np-date" value="' + esc(dr.date) + '">') + fld('開始', '<input type="time" id="np-s" step="300" value="' + pad2(dr.s) + '">') + fld('終了', '<input type="time" id="np-e" step="300" value="' + pad2(dr.e) + '">');
    h += fld('リフト', '<select id="np-lift">' + opts(cfg.lifts, dr.lift) + '</select>') + fld('お客さま', '<input id="np-name" list="custList" value="' + esc(dr.name) + '">') + fld('車種', '<input id="np-car" value="' + esc(dr.car_model) + '">');
    h += fld('作業内容', '<input id="np-work" value="' + esc(dr.work) + '" placeholder="例：車検">', 'wide') + fld('代車', '<select id="np-dai">' + opts([['', '（なし）']].concat(cfg.cars.map(function (c) { return [c, c]; })), dr.car) + '</select>') + fld('代車の返却予定', '<input type="date" id="np-ret" value="' + esc(dr.ret) + '">');
    h += '<button class="btn" data-act="add-pit" id="addPit">予約を入れる</button></div><datalist id="custList">' + S.customers.map(function (c) { return '<option value="' + esc(c.name) + '">'; }).join('') + '</datalist>';
    h += '<p class="note mt">判定：同じリフトで時間が重なる→重なり／同じ代車の貸出期間が重なる→代車重なり／受付時間の外→時間外／定休日・臨時休業日→休業日。ちょうど境目（10:00終わりと10:00始まり）は重なりにしません（Excel版と同じ）。</p></div>';
    $('#v-pit').innerHTML = h;
    animate($('#v-pit'));
  };
  function pad2(m) { if (!has(m)) return ''; var h = Math.floor(m / 60), x = m % 60; return (h < 10 ? '0' : '') + h + ':' + (x < 10 ? '0' : '') + x; }
  function addPit() {
    var r = { id: uid('p'), date: $('#np-date').value, s: K.hm($('#np-s').value), e: K.hm($('#np-e').value), lift: $('#np-lift').value, name: $('#np-name').value.trim(), car_model: $('#np-car').value.trim(), work: $('#np-work').value.trim(), car: $('#np-dai').value, ret: $('#np-ret').value, state: '予約', memo: '' };
    if (D(r.date) === null || r.s === null || r.e === null || !r.lift || !r.name) { toast('日付・時間・リフト・お客さまを入れてください'); return null; }
    if (pitDraft && pitDraft.cust) r.cust = pitDraft.cust;
    S.pits.push(r); pitNew = r.id; pitDay = D(r.date); pitDraft = null;
    var c = r.cust ? custById(r.cust) : custByName(r.name);
    if (c && /車検|点検/.test(r.work)) c.guide = '予約済';
    var j = K.pitJudge(S.pits, S.pits.length - 1, pitCfg());
    log('ピット予約：' + r.name + ' ' + K.md(D(r.date)) + ' ' + K.hhmm(r.s) + '〜 ' + r.lift + (j ? '（' + j + '）' : ''));
    commit(); toast(j ? '予約を入れました（判定：' + j + '）' : '予約を入れました' + (c && c.guide === '予約済' ? '（台帳は「予約済」に）' : ''));
    return r;
  }
  function toPit() {
    var o = selected()[0]; if (!o) return;
    var c = o.c, cfg = pitCfg(), bike = /二輪|バイク|原付/.test(c.kind + c.car);
    var lifts = cfg.lifts.filter(function (l) { return bike ? /バイク/.test(l) : !/バイク/.test(l); });
    var f = K.findFree(S.pits, cfg, TODAY, 120, lifts.length ? lifts : cfg.lifts, 21);
    var work = presetOf(c) === 'tenken' ? '点検' : '車検（継続検査）';
    pitDraft = f ? { date: K.iso(f.date), s: f.s, e: f.e, lift: f.lift, name: c.name, car_model: c.car, work: work, car: '', ret: '', cust: c.id }
      : { date: K.iso(TODAY), s: cfg.open, e: cfg.open + 120, lift: cfg.lifts[0], name: c.name, car_model: c.car, work: work, car: '', ret: '', cust: c.id };
    pitDay = D(pitDraft.date);
    go('pit');
  }

  // ================= 4) 整備見積・請求 =================
  var curJob = null, payOpen = false, jobNew = false;
  function job() { var j = S.jobs.filter(function (x) { return x.id === curJob; })[0]; if (!j) { j = S.jobs[0]; curJob = j ? j.id : null; } return j; }
  function blankLegal() { return [{ label: '自動車重量税', amount: '' }, { label: '自賠責保険料', amount: '' }, { label: '検査手数料（印紙代・証紙代）', amount: '' }, { label: '', amount: '' }]; }
  function nextNo() { var y = K.ymd(TODAY).y, mx = 100; S.jobs.forEach(function (j) { var m = /-(\d+)$/.exec(j.no || ''); if (m) mx = Math.max(mx, +m[1]); }); return 'S-' + y + '-' + String(mx + 1).padStart(4, '0'); }
  function newJob(o) {
    var j = Object.assign({ id: uid('j'), no: nextNo(), kind: '見積書', to: '', honor: '様', car: '', plate: '', km: '', date: K.iso(TODAY), days: 30, rate: n0(C().rate), discount: 0, round: C().round,
      parts: [{ code: '', name: '', qty: '', unit: '', price: '', cost: '' }, { code: '', name: '', qty: '', unit: '', price: '', cost: '' }], work: [{ kind: '', name: '', hours: '', rate: '' }], legal: blankLegal(), paid: '', paidDate: '', memo: '' }, o || {});
    S.jobs.unshift(j); curJob = j.id; jobNew = true; return j;
  }
  function pitJob(id) {
    var r = S.pits.filter(function (x) { return x.id === id; })[0]; if (!r) return;
    var c = (r.cust && custById(r.cust)) || custByName(r.name), shaken = /車検/.test(r.work);
    var j = newJob({ to: r.name, car: r.car_model || (c ? c.car : ''), plate: c ? c.plate : '', pit: r.id, cust: c ? c.id : '',
      work: shaken ? [{ kind: '点検', name: '24か月点検整備', hours: 1.5, rate: '' }, { kind: '検査', name: '検査代行', hours: 1, rate: 10000 }] : [{ kind: '', name: r.work, hours: 1, rate: '' }],
      memo: shaken ? '車検（継続検査）と24か月点検。法定費用は公式の案内で確かめて入力。' : '' });
    if (r.state === '予約') r.state = '入庫';
    log('入庫・見積：' + r.name + '（' + r.work + '）→ ' + j.no);
    save(); go('job'); toast('入庫にして、見積を作りました');
  }
  RENDER.job = function () {
    var j = job(); if (!j) j = newJob();
    var x = jc(j), due = jobDue(j), inv = j.kind === '請求書', ps = inv ? jobPay(j) : null;
    var h = '<div class="btns" style="margin-bottom:12px"><label class="f" style="flex:1;min-width:200px">見積・請求を選ぶ<select data-act="pick-job">';
    S.jobs.forEach(function (o) { h += '<option value="' + o.id + '"' + (o.id === j.id ? ' selected' : '') + '>' + esc(o.no + '　' + o.kind + '　' + (o.to || '（宛先なし）')) + '</option>'; });
    h += '</select></label><button class="ghost" data-act="new-job">＋ 新しい見積</button><button class="ghost" data-act="del-job">これを消す</button></div>';
    h += '<div class="est-mini" id="estMini"></div>';
    h += '<div class="grid g32"><div class="panel"><div class="ph"><h2><b>' + (inv ? 'INV' : 'EST') + '</b>' + (inv ? '御請求書' : '御見積書') + '</h2><span class="doc-kind"><button class="' + (!inv ? 'on' : '') + '" data-act="kind" data-k="見積書">見積書</button><button class="' + (inv ? 'on' : '') + '" data-act="kind" data-k="請求書">請求書</button></span></div>';
    h += '<div class="form">';
    h += fld('宛先', '<input id="f-to" data-bind="job:to" value="' + esc(j.to) + '" placeholder="例：見本 太郎">') + fld('車種', '<input data-bind="job:car" value="' + esc(j.car) + '">') + fld('登録番号（車両）', '<input data-bind="job:plate" value="' + esc(j.plate) + '">') + fld('走行距離（km）', '<input class="num" data-bind="job:km" value="' + esc(j.km) + '">');
    h += fld(inv ? '請求番号' : '見積番号', '<input data-bind="job:no" value="' + esc(j.no) + '">') + fld(inv ? '請求日' : '見積日', '<input type="date" data-bind="job:date" value="' + esc(j.date) + '">') + fld(inv ? '支払までの日数' : '有効日数', '<input class="num" data-bind="job:days" value="' + esc(j.days) + '">') + fld(inv ? 'お支払期限' : '有効期限', '<input disabled id="f-due" value="' + (due === null ? '' : K.iso(due)) + '">');
    h += fld('工賃の標準レート（円/時）', '<input class="num" data-bind="job:rate" value="' + esc(j.rate) + '">') + fld('値引き（円）', '<input class="num" data-bind="job:discount" value="' + esc(j.discount) + '">') + fld('消費税の端数', '<select data-bind="job:round">' + opts(['切り捨て', '四捨五入', '切り上げ'], j.round) + '</select>');
    h += '</div>';
    // 部品
    h += '<div class="sub2">■ 部品</div><div class="tw"><table class="lines" id="jobParts"><colgroup><col style="width:15%"><col style="width:29%"><col style="width:9%"><col style="width:8%"><col style="width:12%"><col class="hide-n" style="width:11%"><col style="width:12%"><col style="width:6%"></colgroup><thead><tr><th>品番</th><th>品名</th><th class="r">数量</th><th>単位</th><th class="r">単価</th><th class="r hide-n" title="粗利の計算に使う仕入れ値">原価</th><th class="r">金額</th><th></th></tr></thead><tbody>';
    j.parts.forEach(function (l, i) {
      var b = function (k, cls, ph) { return '<input' + (cls ? ' class="' + cls + '"' : '') + ' data-bind="jp:' + i + ':' + k + '" value="' + esc(l[k]) + '"' + (ph ? ' placeholder="' + ph + '"' : '') + '>'; };
      h += '<tr><td>' + b('code', '', '品番') + '</td><td>' + b('name', '', '品名') + '</td><td>' + b('qty', 'num') + '</td><td>' + b('unit') + '</td><td>' + b('price', 'num') + '</td><td class="hide-n">' + b('cost', 'num') + '</td><td class="amt" id="pa-' + i + '">' + (x.parts[i] === null ? '' : K.num(x.parts[i])) + '</td><td><button class="ghost sm" data-act="del-line" data-t="parts" data-i="' + i + '">×</button></td></tr>';
    });
    h += '</tbody></table></div><div class="btns"><button class="ghost sm" data-act="add-line" data-t="parts" id="addPart">＋ 部品の行</button></div>';
    // 工賃
    h += '<div class="sub2">■ 工賃（作業時間×レート）</div><div class="tw"><table class="lines" id="jobWork"><colgroup><col style="width:13%"><col style="width:39%"><col style="width:12%"><col style="width:16%"><col style="width:14%"><col style="width:6%"></colgroup><thead><tr><th>区分</th><th>作業内容</th><th class="r">時間</th><th class="r">レート<br><small>空欄＝標準</small></th><th class="r">金額</th><th></th></tr></thead><tbody>';
    j.work.forEach(function (l, i) {
      var b = function (k, cls) { return '<input' + (cls ? ' class="' + cls + '"' : '') + ' data-bind="jw:' + i + ':' + k + '" value="' + esc(l[k]) + '">'; };
      h += '<tr><td>' + b('kind') + '</td><td>' + b('name') + '</td><td>' + b('hours', 'num') + '</td><td>' + b('rate', 'num') + '</td><td class="amt" id="wa-' + i + '">' + (x.work[i] === null ? '' : K.num(x.work[i])) + '</td><td><button class="ghost sm" data-act="del-line" data-t="work" data-i="' + i + '">×</button></td></tr>';
    });
    h += '</tbody></table></div><div class="btns"><button class="ghost sm" data-act="add-line" data-t="work">＋ 作業の行</button></div>';
    // 法定費用
    h += '<div class="sub2">■ 法定費用（消費税の対象外）</div><div class="tw"><table class="lines" id="jobLegal"><colgroup><col style="width:66%"><col style="width:34%"></colgroup><tbody>';
    j.legal.forEach(function (l, i) { h += '<tr><td><input data-bind="jl:' + i + ':label" value="' + esc(l.label) + '" placeholder="項目"></td><td><input class="num" data-bind="jl:' + i + ':amount" value="' + esc(l.amount) + '" placeholder="金額"></td></tr>'; });
    h += '</tbody></table></div><p class="note">法定費用の金額は入っていません（車両・期間で変わるため）。重量税・検査手数料は国土交通省・軽自動車検査協会、自賠責保険料は保険会社の案内で確かめて入れてください。</p>';
    h += fld('備考', '<textarea data-bind="job:memo" style="min-height:54px">' + esc(j.memo) + '</textarea>') + '</div>';
    // 合計
    h += '<div class="panel st"><div class="ph"><h2><b>SUM</b>合計（その場で計算）</h2>' + (inv ? pill(ps.status) : pill('見積書')) + '</div><div class="tot" id="jobTot"></div><div class="mt" id="jobAct"></div>';
    h += '<p class="note mt">10%対象（税抜）＝部品計＋工賃計－値引き。消費税はその合計に10%をかけて1回だけ端数処理（国税庁 インボイスQ&A 問57）。法定費用には消費税をかけずに別に足します（Excel版と同じ）。</p></div></div>';
    // 請求と入金の一覧
    var invs = invoices().slice().sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
    var unpaid = 0, lateN = 0; invs.forEach(function (o) { var p = jobPay(o); if (p.remain > 0) unpaid += p.remain; if (p.status === '遅れ') lateN++; });
    h += '<div class="panel mt"><div class="ph"><h2><b>BILLS</b>請求と入金</h2><span class="tag">未入金 ' + yen(unpaid) + (lateN ? '・遅れ ' + lateN + '件' : '') + '</span></div><div class="tw"><table><thead><tr><th>請求日</th><th>番号</th><th>宛先</th><th class="r">合計</th><th class="hide-n">期限</th><th class="r">入金</th><th class="r">残り</th><th>状態</th><th></th></tr></thead><tbody>';
    invs.forEach(function (o) {
      var p = jobPay(o), t = jc(o).total;
      h += '<tr class="' + (p.status === '遅れ' ? 's-bad' : '') + (o.id === flashJob ? ' flash' : '') + '"><td class="mono">' + K.md(D(o.date)) + '</td><td class="mono"><small>' + esc(o.no) + '</small></td><td>' + esc(o.to) + '</td><td class="r mono">' + yen(t) + '</td><td class="mono hide-n">' + (jobDue(o) === null ? '' : K.md(jobDue(o))) + (p.late ? ' <small style="color:#ff4d63;display:inline">' + p.late + '日遅れ</small>' : '') + '</td><td class="r mono">' + (has(o.paid) ? yen(n0(o.paid)) : '') + '</td><td class="r mono">' + yen(Math.max(0, p.remain)) + '</td><td>' + pill(p.status) + '</td><td><button class="ghost sm" data-act="open-job" data-id="' + o.id + '">開く</button></td></tr>';
    });
    h += '</tbody></table></div></div>';
    $('#v-job').innerHTML = h;
    jobTotals(false);
    flashJob = '';
    if (jobNew) { jobNew = false; }
  };
  var flashJob = '';
  function jobTotals(animateIt) {
    var j = job(); if (!j) return; var x = jc(j), box = $('#jobTot'); if (!box) return;
    var rows = [['部品 計', x.partsSum, 'jt-p'], ['工賃 計', x.workSum, 'jt-w'], ['値引き', -x.discount, 'jt-d'], ['10%対象（税抜）', x.base10, 'jt-b'], ['消費税（10%）', x.tax, 'jt-t'], ['法定費用（対象外）', x.legalSum, 'jt-l']];
    var h = rows.map(function (r) { return '<div class="r"><span>' + r[0] + '</span>' + cnt(r[2], r[1]) + '</div>'; }).join('');
    h += '<div class="r em"><span>' + (j.kind === '請求書' ? '御請求金額（税込）' : '御見積金額（税込）') + '</span>' + cnt('jt-total', x.total) + '</div>';
    h += '<div class="r gp"><span>粗利の目安（10%対象−部品の原価）</span>' + cnt('jt-g', x.gross) + '</div>';
    if (!animateIt) rows.concat([[0, x.total, 'jt-total'], [0, x.gross, 'jt-g']]).forEach(function (r) { shown[r[2]] = r[1]; });
    box.innerHTML = h;
    var mini = $('#estMini'); if (mini) { mini.innerHTML = '<span>税抜 ' + cnt('em-b', x.base10) + '</span><span>税 ' + cnt('em-t', x.tax) + '</span><span class="em-t">合計 ' + cnt('em-total', x.total) + '</span>'; if (!animateIt) { shown['em-b'] = x.base10; shown['em-t'] = x.tax; shown['em-total'] = x.total; } }
    [box, mini].forEach(function (el) { if (!el) return; if (animateIt) animate(el); else $$('[data-k]', el).forEach(function (s) { s.textContent = yen(parseFloat(s.getAttribute('data-v'))); }); });
    x.parts.forEach(function (a, i) { var c = $('#pa-' + i); if (c) c.textContent = a === null ? '' : K.num(a); });
    x.work.forEach(function (a, i) { var c = $('#wa-' + i); if (c) c.textContent = a === null ? '' : K.num(a); });
    var due = jobDue(j), fd = $('#f-due'); if (fd) fd.value = due === null ? '' : K.iso(due);
    // ボタン
    var act = $('#jobAct'), a = '';
    if (act) {
      if (j.kind === '見積書') a = '<button class="btn big" style="width:100%" data-act="to-inv" id="toInv">この内容で請求書にする →</button><p class="note">押すと、同じ明細のまま「御請求書」に切りかわり、請求日が今日になります。</p>';
      else {
        var p = jobPay(j);
        if (p.remain > 0 && !payOpen) a = '<button class="btn gr big" style="width:100%" data-act="pay-open" id="payOpen">入金を記録</button>';
        else if (p.remain > 0) a = '<div class="form"><label class="f">入金日<input type="date" id="pay-date" value="' + K.iso(TODAY) + '"></label><label class="f">入金額<input class="num" id="pay-amt" value="' + p.remain + '"></label><div class="btns"><button class="btn gr" data-act="pay-save" id="paySave">記録する</button><button class="ghost" data-act="pay-cancel">やめる</button></div></div>';
        else a = '<p class="linked">● 入金済み（' + (j.paidDate ? K.md(D(j.paidDate)) : '') + '）</p>';
      }
      act.innerHTML = a;
    }
    kick();
  }
  function toInvoice() {
    var j = job(); if (!j) return;
    if (jc(j).total <= 0) { toast('明細を入れてください'); return; }
    j.kind = '請求書'; j.date = K.iso(TODAY); j.days = n0(C().days) || 14; flashJob = j.id;
    log('請求書：' + j.to + ' ' + yen(jc(j).total) + '（' + j.no + '）');
    commit(); toast('請求書にしました（未入金に入りました）');
  }
  function savePay() {
    var j = job(); if (!j) return;
    var amt = n0($('#pay-amt').value), d = $('#pay-date').value;
    if (!D(d) || amt <= 0) { toast('入金日と入金額を入れてください'); return; }
    j.paid = n0(j.paid) + amt; j.paidDate = d; payOpen = false; flashJob = j.id;
    var r = j.pit && S.pits.filter(function (x) { return x.id === j.pit; })[0];
    if (r && jobPay(j).remain <= 0) r.state = '完了';
    log('入金：' + j.to + ' ' + yen(amt));
    commit(); toast('入金を記録しました' + (r ? '（ピットは「完了」に）' : ''));
  }

  // ================= 5) 部品在庫 =================
  var partFlash = '';
  function partsStart() { var o = K.ymd(TODAY); return K.D((o.m >= 4 ? o.y : o.y - 1) + '-04-01'); }
  RENDER.parts = function () {
    var res = K.partsCalc(S.parts, S.recs), ol = K.orderList(S.parts, S.recs);
    var money = res.reduce(function (a, r) { return a + (r.money === '' ? 0 : r.money); }, 0), onord = res.filter(function (r) { return r.onord > 0; }).length;
    var h = '<div class="grid g4">';
    h += kpi('要発注', cnt('pt-n', ol.list.length, 'n') + '<small>品目</small>', ol.list.length ? 'rd' : 'gr', '在庫＋発注中が発注点以下', 'pk-1', ol.list.length / Math.max(1, S.parts.length));
    h += kpi('発注の金額の目安', cnt('pt-m', ol.money), '', '頼む数×仕入れ単価（税抜）', 'pk-2', Math.min(1, ol.money / 100000));
    h += kpi('在庫金額', cnt('pt-s', money), 'st', S.parts.length + '品目（税抜）', 'pk-3', 0, 'st');
    h += kpi('発注中', cnt('pt-o', onord, 'n') + '<small>品目</small>', 'st', '頼んでまだ届いていない', 'pk-4', onord / Math.max(1, S.parts.length), 'st');
    h += '</div><div class="grid g32 mt"><div class="panel"><div class="ph"><h2><b>STOCK</b>部品一覧</h2><span class="tag">在庫＝使い始め＋入荷・入庫＋棚卸調整−出庫</span></div><div class="tw"><table><thead><tr><th>品番</th><th>品名</th><th class="r">在庫</th><th class="r">発注中</th><th class="r">発注点</th><th>判定</th><th class="r hide-n">在庫金額</th></tr></thead><tbody>';
    S.parts.forEach(function (p, i) {
      var r = res[i], bad = r.judge === '要発注' || r.judge === '在庫がマイナス' || r.judge === '品番が重複';
      h += '<tr class="' + (bad ? 's-bad' : (r.judge === '発注済み' ? 's-ord' : '')) + (p.code === partFlash ? ' flash' : '') + '"><td class="mono nowrap"><small style="color:#eef0f2;font-size:11.5px">' + esc(p.code) + '</small></td><td>' + esc(trim(p.name, 22)) + '<small>' + esc(p.place) + '・' + esc(p.supplier) + '</small></td><td class="r mono">' + K.num(r.stock, 2) + '<small>' + esc(p.unit) + '</small></td><td class="r mono">' + (r.onord ? K.num(r.onord) : '') + '</td><td class="r mono">' + esc(p.point) + '</td><td>' + pill(r.judge) + '</td><td class="r mono hide-n">' + (r.money === '' ? '' : yen(r.money)) + '</td></tr>';
    });
    h += '</tbody></table></div></div>';
    h += '<div><div class="panel st"><div class="ph"><h2><b>ORDER</b>発注リスト</h2><span class="tag">' + yen(ol.money) + '</span></div><div class="list">';
    ol.list.forEach(function (o) { h += '<div class="li"><span class="x">' + esc(o.p.name) + '<small>' + esc(o.p.supplier) + '・在庫' + K.num(o.r.stock) + '／発注点' + o.p.point + '</small></span><span class="r">' + o.r.need + esc(o.p.unit) + '</span><button class="ghost sm" data-act="order" data-code="' + esc(o.p.code) + '">発注した</button></div>'; });
    if (!ol.list.length) h += '<p class="note">要発注の部品はありません。</p>';
    h += '</div><p class="note">頼む数の目安＝「在庫＋発注中」が発注点を上回るまで、1回に頼む数の倍数で切り上げた数。「発注した」を押すと記録に「発注」が入り、リストから消えます。</p></div>';
    var best = K.partsBest(S.parts, S.recs, partsStart(), 5);
    h += '<div class="panel mt"><div class="ph"><h2><b>TOP</b>よく使う部品</h2><span class="tag">' + K.ymd(partsStart()).y + '年4月から</span></div><div class="list">';
    best.forEach(function (b) { h += '<div class="li"><span class="days ok">' + b.rank + '位</span><span class="x">' + esc(S.parts[b.i].name) + '</span><span class="r">' + K.num(b.total) + esc(S.parts[b.i].unit) + '</span></div>'; });
    h += '</div></div></div></div>';
    // 記録
    h += '<div class="panel mt"><div class="ph"><h2><b>LOG</b>入出庫を記録</h2></div><div class="form">';
    h += fld('日付', '<input type="date" id="nr-date" value="' + K.iso(TODAY) + '">') + fld('品番', '<select id="nr-code">' + opts(S.parts.map(function (p) { return [p.code, p.code + ' ' + p.name]; }), '') + '</select>', 'wide') + fld('区分', '<select id="nr-kind">' + opts(K.REC_KINDS, '出庫') + '</select>') + fld('数量', '<input class="num" id="nr-qty" value="1">');
    h += '<button class="btn" data-act="add-rec">記録する</button></div><div class="tw mt"><table><thead><tr><th>日付</th><th>品番</th><th>区分</th><th class="r">数量</th><th>確認</th><th></th></tr></thead><tbody>';
    S.recs.map(function (r, i) { return { r: r, i: i }; }).sort(function (a, b) { return a.r.date < b.r.date ? 1 : (a.r.date > b.r.date ? -1 : b.i - a.i); }).slice(0, 8).forEach(function (o) {
      var r = o.r; h += '<tr><td class="mono">' + (r.date ? K.md(D(r.date)) : '') + '</td><td class="mono">' + esc(r.code) + '</td><td>' + esc(r.kind) + '</td><td class="r mono">' + esc(r.qty) + '</td><td>' + pill(K.recCheck(r, S.parts)) + '</td><td><button class="ghost sm" data-act="del-rec" data-id="' + esc(r.id) + '">×</button></td></tr>';
    });
    h += '</tbody></table></div><p class="note">入荷＝発注した分が届いた／入庫＝発注せずに買った・もらった／出庫＝作業で使った／発注取消＝注文を取り消した／棚卸調整＝数え直した差（マイナスも可）。Excel版と同じ区分です。</p></div>';
    $('#v-parts').innerHTML = h;
    animate($('#v-parts'));
    partFlash = '';
  };

  // ================= 6) 中古車在庫 =================
  var usedFlash = '';
  RENDER.used = function () {
    var lg = n0(C().long), s = K.usedSummary(S.used, TODAY, lg);
    var h = '<div class="grid g4">';
    h += kpi('在庫', cnt('u-n', s.inst, 'n') + '<small>台</small>', 'st', '車 ' + s.car + '・バイク ' + s.bike + '・平均 ' + (s.instDays === '' ? '—' : K.num(s.instDays, 1) + '日'), 'uk1', 0, 'st');
    h += kpi('在庫の原価', cnt('u-c', s.instCost), '', '見込み粗利 ' + yen(s.instGross), 'uk2', s.instPrice ? s.instCost / s.instPrice : 0);
    h += kpi('長期在庫（' + lg + '日超）', cnt('u-l', s.long, 'n') + '<small>台</small>', s.long ? 'rd' : 'gr', '値下げ・販路の見直しを検討', 'uk3', s.inst ? s.long / s.inst : 0);
    h += kpi('売れた台の粗利', cnt('u-g', s.soldGross), 'gr', s.sold + '台・粗利率 ' + pct(s.soldRate) + '・平均 ' + (s.soldDays === '' ? '—' : K.num(s.soldDays, 1) + '日'), 'uk4', s.soldRate || 0, 'st');
    h += '</div>';
    var maxDays = Math.max.apply(null, S.used.map(function (u) { var x = uc(u); return x.days === '' ? 0 : x.days; }).concat([lg, 1]));
    h += '<div class="panel mt"><div class="ph"><h2><b>CARS</b>在庫一覧（原価＝仕入れ＋整備費＋諸費用）</h2><span class="tag">長期在庫の日数 ' + lg + '日</span></div><div class="tw"><table><thead><tr><th>管理番号</th><th>車名</th><th class="hide-n">仕入れ日</th><th class="r">原価</th><th class="r">販売価格</th><th class="r">粗利</th><th class="r">粗利率</th><th>在庫日数</th><th>状態</th><th></th></tr></thead><tbody>';
    var list = S.used.map(function (u, i) { return { u: u, i: i, x: uc(u) }; }).sort(function (a, b) { var ra = a.x.st === '売れた' ? 1 : 0, rb = b.x.st === '売れた' ? 1 : 0; return ra - rb || (ra ? (a.u.sold < b.u.sold ? 1 : -1) : (n0(b.x.days) - n0(a.x.days))) || a.i - b.i; });
    list.forEach(function (o) {
      var u = o.u, x = o.x;
      h += '<tr class="' + (x.st === '長期在庫' ? 's-bad' : (x.st === '日付を確認' ? 's-warn' : '')) + (u.id === usedFlash ? ' flash' : '') + '"><td class="mono">' + esc(u.no) + '<small>' + esc(u.type) + '</small></td><td>' + esc(u.name) + '<small>' + esc(u.year) + '年・' + K.num(n0(u.km)) + 'km</small></td><td class="mono hide-n">' + (u.buy ? K.md(D(u.buy)) : '') + '</td>';
      h += '<td class="r mono" title="仕入れ ' + yen(n0(u.cost0)) + '・整備 ' + yen(n0(u.maint)) + '・諸費用 ' + yen(n0(u.fee)) + '">' + (x.cost === '' ? '' : yen(x.cost)) + '</td><td class="r"><input class="num" style="width:96px" data-bind="uu:' + u.id + ':price" value="' + esc(u.price) + '"></td>';
      h += '<td class="r mono" style="' + (x.gross !== '' && x.gross < 0 ? 'color:#ff4d63' : '') + '">' + (x.gross === '' ? '' : yen(x.gross)) + '</td><td class="r mono">' + (x.rate === '' ? '' : pct(x.rate)) + '</td>';
      h += '<td class="mono nowrap"><span class="dbar' + (x.st === '長期在庫' ? ' long' : '') + '" style="width:' + Math.round(60 * Math.max(0, n0(x.days)) / maxDays) + 'px"></span>' + (x.days === '' ? '' : x.days + '日') + '</td><td>' + pill(x.st) + (x.st === '売れた' ? '<small>' + K.md(D(u.sold)) + '</small>' : '') + '</td>';
      h += '<td class="nowrap">' + (x.st === '在庫' || x.st === '長期在庫' ? '<button class="ghost sm" data-act="sold" data-id="' + u.id + '">売れた</button>' : '') + ' <button class="ghost sm" data-act="del-used" data-id="' + u.id + '" aria-label="消す">×</button></td></tr>';
    });
    h += '</tbody></table></div><p class="note">在庫日数＝売れていない台は「仕入れ日から今日まで」、売れた台は「仕入れ日から売れた日まで」。金額は税込か税抜のどちらかにそろえて入れてください。古物の帳簿など法律の決まりは、所轄の警察署・専門家にご確認ください。</p></div>';
    // 月別
    var mon = K.usedMonthly(S.used, TODAY, lg, partsStart()), mx = Math.max.apply(null, mon.map(function (m) { return Math.max(m.sales, 1); }));
    h += '<div class="grid g2 mt"><div class="panel st"><div class="ph"><h2><b>SOLD</b>売れた台（月別）</h2><div class="legend"><span><i style="background:#aebdcd"></i>売上</span><span><i style="background:#e0374f"></i>粗利</span></div></div><div class="chart">';
    mon.forEach(function (m, i) { h += '<div class="col' + (K.monthKey(m.month) === K.monthKey(TODAY) ? ' now' : '') + '"><div class="bars"><div class="bar b2" data-h="' + (m.sales / mx) + '" data-hk="us' + i + '" title="売上 ' + yen(m.sales) + '・' + m.n + '台"></div><div class="bar b1" data-h="' + (Math.max(0, m.gross) / mx) + '" data-hk="ug' + i + '" title="粗利 ' + yen(m.gross) + '"></div></div><span class="m">' + K.ymd(m.month).m + '</span></div>'; });
    h += '</div></div>';
    h += '<div class="panel"><div class="ph"><h2><b>NEW</b>仕入れた台を足す</h2></div><div class="form">';
    h += fld('管理番号', '<input id="nu-no" placeholder="例：C-008">') + fld('種別', '<select id="nu-type">' + opts(['車', 'バイク'], '車') + '</select>') + fld('車名・車種', '<input id="nu-name">', 'wide') + fld('仕入れ日', '<input type="date" id="nu-buy" value="' + K.iso(TODAY) + '">');
    h += fld('仕入れ価格', '<input class="num" id="nu-cost0">') + fld('整備費', '<input class="num" id="nu-maint">') + fld('諸費用', '<input class="num" id="nu-fee">') + fld('販売価格（予定）', '<input class="num" id="nu-price">');
    h += '<button class="btn" data-act="add-used">足す</button></div></div></div>';
    $('#v-used').innerHTML = h;
    animate($('#v-used'));
    usedFlash = '';
  };

  // ================= 7) 設定 =================
  RENDER.set = function () {
    var c = C();
    var h = '<div class="grid g2"><div class="panel"><div class="ph"><h2><b>SHOP</b>お店と計算の設定</h2></div><div class="form">';
    h += fld('お店の名前', '<input data-bind="co:name" value="' + esc(c.name) + '">', 'wide') + fld('電話（案内文に入る）', '<input data-bind="co:tel" value="' + esc(c.tel) + '">') + fld('登録番号（インボイス）', '<input data-bind="co:reg" value="' + esc(c.reg) + '">');
    h += fld('住所（案内文に入る）', '<input data-bind="co:addr" value="' + esc(c.addr) + '">', 'wide');
    h += fld('工賃の標準レート（円/時）', '<input class="num" data-bind="co:rate" value="' + esc(c.rate) + '">') + fld('消費税の端数（新しい見積）', '<select data-bind="co:round">' + opts(['切り捨て', '四捨五入', '切り上げ'], c.round) + '</select>') + fld('請求の支払までの日数', '<input class="num" data-bind="co:days" value="' + esc(c.days) + '">');
    h += fld('1回目の案内（満了日の何日前）', '<input class="num" data-bind="co:d1" value="' + esc(c.d1) + '">') + fld('2回目の案内（何日前）', '<input class="num" data-bind="co:d2" value="' + esc(c.d2) + '">') + fld('中古車の長期在庫（日）', '<input class="num" data-bind="co:long" value="' + esc(c.long) + '">');
    h += '</div></div><div class="panel st"><div class="ph"><h2><b>PIT</b>ピットの設定</h2></div><div class="form">';
    h += fld('受付の開始', '<input type="time" data-bind="co:open" value="' + pad2(c.open) + '">') + fld('受付の終了', '<input type="time" data-bind="co:close" value="' + pad2(c.close) + '">') + fld('枠の刻み（分）', '<select data-bind="co:step">' + opts([15, 20, 30, 60], c.step) + '</select>');
    h += fld('昼休み 開始', '<input type="time" data-bind="co:brs" value="' + pad2(c.brs) + '">') + fld('昼休み 終了', '<input type="time" data-bind="co:bre" value="' + pad2(c.bre) + '">');
    h += fld('定休日1', '<select data-bind="co:h1">' + opts(['なし'].concat(K.WD), c.h1) + '</select>') + fld('定休日2', '<select data-bind="co:h2">' + opts(['なし'].concat(K.WD), c.h2) + '</select>');
    h += fld('リフト（1行に1つ）', '<textarea data-bind="co:lifts">' + esc(c.lifts.join('\n')) + '</textarea>') + fld('代車（1行に1台）', '<textarea data-bind="co:cars">' + esc(c.cars.join('\n')) + '</textarea>') + fld('臨時休業日（1行に1日 2026-11-03）', '<textarea data-bind="co:hols">' + esc((c.hols || []).join('\n')) + '</textarea>', 'wide');
    h += '</div><p class="note mt">1日に表示できる枠は36まで（Excel版と同じ）。</p></div></div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>LAW</b>車検の有効期間（早見）</h2><span class="tag">国土交通省・2026年10月に確認</span></div><div class="tw"><table><thead><tr><th>区分</th><th class="r">初回</th><th class="r">2回目以降</th></tr></thead><tbody>';
    K.PERIODS.forEach(function (p) { h += '<tr><td>' + esc(p[0]) + '</td><td class="r mono">' + (p[1] === null ? '車検なし' : p[1] + '年') + '</td><td class="r mono">' + (p[2] === null ? '車検なし' : p[2] + '年') + '</td></tr>'; });
    h += '</tbody></table></div><p class="note">令和7年4月1日から、残りの有効期間を失わずに車検を受けられる期間が、満了日の「1か月前」から「2か月前」になりました。二輪は250cc超（小型二輪）が車検の対象で、軽二輪（125cc超〜250cc以下）と原付は車検なし。</p>';
    h += '<p class="src">出典：国土交通省 自動車検査登録総合ポータル「自動車検査証の有効期間」／国土交通省「車検を有効期間満了日の２か月前から受けられるのは令和７年４月１日からです」／国土交通省 電子車検証特設サイト／東北運輸局 宮城運輸支局「二輪車検査案内」。制度の判断は運輸支局・軽自動車検査協会にご確認ください。</p></div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>DATA</b>データ</h2></div><p class="note">データはこのブラウザ（localStorage）にだけ保存しています。外部には送信しません。ブラウザのデータを消すと、入力も消えます。</p><div class="btns"><button class="btn" data-act="reset">見本データに戻す</button><span class="note">今の入力は消えて、架空の「サンプル自動車（架空）」の見本に戻ります。</span></div></div>';
    $('#v-set').innerHTML = h;
  };

  // ================= 入力の受けとり =================
  function onBind(el, final) {
    var b = el.getAttribute('data-bind').split(':'), v = el.type === 'checkbox' ? el.checked : el.value, x, j;
    switch (b[0]) {
      case 'cu': x = custById(b[1]); if (x) { x[b[2]] = v; log('台帳：' + x.name + ' を「' + (v || 'まだ') + '」に'); } break;
      case 'pt': x = S.pits.filter(function (r) { return r.id === b[1]; })[0]; if (x) { x[b[2]] = v; log('ピット：' + x.name + ' を「' + v + '」に'); } break;
      case 'job': j = job(); j[b[1]] = v;
        if (b[1] === 'to' || b[1] === 'no') { var op = $('[data-act="pick-job"] option[value="' + j.id + '"]'); if (op) op.textContent = j.no + '　' + j.kind + '　' + (j.to || '（宛先なし）'); }
        save(); if (b[1] === 'date' || b[1] === 'round') { jobTotals(true); return; } jobTotals(true); return;
      case 'jp': j = job(); j.parts[+b[1]][b[2]] = v; save(); jobTotals(true); return;
      case 'jw': j = job(); j.work[+b[1]][b[2]] = v; save(); jobTotals(true); return;
      case 'jl': j = job(); j.legal[+b[1]][b[2]] = v; save(); jobTotals(true); return;
      case 'uu': x = S.used.filter(function (u) { return u.id === b[1]; })[0]; if (x) x[b[2]] = v; if (!final) { save(); return; } break;
      case 'co':
        var k = b[1], c = C();
        if (k === 'lifts' || k === 'cars') c[k] = String(v).split(/\r?\n/).map(function (s) { return s.trim(); }).filter(has);
        else if (k === 'hols') c.hols = String(v).split(/\r?\n/).map(function (s) { return s.trim().split(/\s/)[0]; }).filter(function (s) { return D(s) !== null; });
        else if (k === 'open' || k === 'close' || k === 'brs' || k === 'bre') c[k] = has(v) ? K.hm(v) : '';
        else if (k === 'rate' || k === 'days' || k === 'd1' || k === 'd2' || k === 'long' || k === 'step') c[k] = n0(v);
        else c[k] = v;
        if (k === 'name') $('#coName').textContent = v;
        save(); return;
    }
    commit();
  }
  document.addEventListener('input', function (ev) {
    var el = ev.target;
    if (el.id === 'tplEdit') { tplCustom[annMode] = el.value; var cards = $('#annCards'); if (cards) cards.innerHTML = cardsHtml(selected()); return; }
    if (!el.getAttribute || !el.hasAttribute('data-bind')) return;
    if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date' || el.type === 'time') return; // change で受ける
    var k = el.getAttribute('data-bind').split(':')[0];
    if (k === 'job' || k === 'jp' || k === 'jw' || k === 'jl' || k === 'co' || k === 'uu') onBind(el, false);
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.getAttribute && el.getAttribute('data-act') === 'pick-job') { curJob = el.value; payOpen = false; render(); return; }
    if (el.getAttribute && el.hasAttribute('data-sel')) { sel[el.getAttribute('data-sel')] = el.checked; render(); return; }
    if (el.id === 'pitDate') { var dn = D(el.value); if (dn !== null) { pitDay = dn; render(); } return; }
    if (el.id === 'np-name') { var c = custByName(el.value); if (c && !$('#np-car').value) $('#np-car').value = c.car; return; }
    if (!el.getAttribute || !el.hasAttribute('data-bind')) return;
    onBind(el, true);
  });
  document.addEventListener('click', function (ev) {
    var nb = ev.target.closest && ev.target.closest('#nav button'); if (nb) { go(nb.getAttribute('data-view')); return; }
    var b = ev.target.closest && ev.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'TEXTAREA') return;
    if (b.disabled) return;
    var a = b.getAttribute('data-act'), id = b.getAttribute('data-id'), j, cfg;
    switch (a) {
      case 'reset':
        if (!DEMO && !window.confirm('今の入力を消して、見本データ（架空）に戻しますか？')) return;
        S = DATA.sample(TODAY); curJob = null; sel = {}; annOn = false; pitDay = null; pitDraft = null; shown = {}; save(); $('#coName').textContent = S.company.name; go(view); toast('見本データに戻しました'); return;
      // 台帳
      case 'sel-month': sel = {}; K.guideList(S.customers, TODAY, n0(C().d1), n0(C().d2)).list.forEach(function (o) { sel[o.c.id] = true; }); render(); return;
      case 'sel-none': sel = {}; annOn = false; render(); return;
      case 'mk-ann': annOn = true; render(); var bx = $('#annBox'); if (bx && !DEMO) bx.scrollIntoView({ block: 'start' }); return;
      case 'ann-mode': annMode = b.getAttribute('data-m'); render(); return;
      case 'ann-copy': {
        var txt = selected().map(function (o) { var t = annText(o.c, annMode); return annMode === 'card' ? t.title + '\n\n' + t.text + '\n\n' + t.sign : t.text; }).join('\n\n――――――――――\n\n');
        try { navigator.clipboard.writeText(txt).then(function () { toast('コピーしました（' + selected().length + '人分）'); }, function () { toast('コピーできませんでした'); }); } catch (e) { toast('コピーできませんでした'); }
        return;
      }
      case 'ann-done': annDone(); return;
      case 'to-pit': toPit(); return;
      case 'tpl-reset': tplCustom[annMode] = null; render(); return;
      case 'add-cust': {
        var c = { id: uid('k'), name: $('#nc-name').value.trim(), tel: $('#nc-tel').value.trim(), car: $('#nc-car').value.trim(), plate: $('#nc-plate').value.trim(), kind: $('#nc-kind').value, first: '', exp: $('#nc-exp').value, guide: '', memo: '' };
        if (!c.name) { toast('お客さま名を入れてください'); return; }
        S.customers.push(c); newCust = c.id; log('台帳に追加：' + c.name); commit(); return;
      }
      case 'del-cust': S.customers = S.customers.filter(function (x) { return x.id !== id; }); delete sel[id]; commit(); return;
      // ピット
      case 'pit-prev': pitDay--; pitDraft = null; render(); return;
      case 'pit-next': pitDay++; pitDraft = null; render(); return;
      case 'pit-today': pitDay = TODAY; pitDraft = null; render(); return;
      case 'pit-day': pitDay = +b.getAttribute('data-d'); pitDraft = null; render(); return;
      case 'add-pit': addPit(); return;
      case 'del-pit': S.pits = S.pits.filter(function (x) { return x.id !== id; }); commit(); return;
      case 'pit-job': pitJob(id); return;
      // 見積・請求
      case 'new-job': newJob(); payOpen = false; save(); render(); return;
      case 'del-job': j = job(); if (!j || (!DEMO && !window.confirm('これを消しますか？'))) return; S.jobs = S.jobs.filter(function (x) { return x !== j; }); curJob = null; commit(); return;
      case 'open-job': curJob = id; payOpen = false; render(); $('#main').scrollTop = 0; return;
      case 'kind': j = job(); var kk = b.getAttribute('data-k'); if (kk === '請求書' && j.kind !== '請求書') { toInvoice(); return; } j.kind = kk; commit(); return;
      case 'add-line': j = job(); var t = b.getAttribute('data-t'); j[t].push(t === 'parts' ? { code: '', name: '', qty: '', unit: '', price: '', cost: '' } : { kind: '', name: '', hours: '', rate: '' }); save(); render(); return;
      case 'del-line': j = job(); var tt = b.getAttribute('data-t'); j[tt].splice(+b.getAttribute('data-i'), 1); commit(); return;
      case 'to-inv': toInvoice(); return;
      case 'pay-open': payOpen = true; jobTotals(false); var pa = $('#pay-amt'); if (pa && !DEMO) pa.focus(); return;
      case 'pay-cancel': payOpen = false; jobTotals(false); return;
      case 'pay-save': savePay(); return;
      // 部品
      case 'order': {
        var code = b.getAttribute('data-code'), o = K.orderList(S.parts, S.recs).list.filter(function (x) { return x.p.code === code; })[0]; if (!o) return;
        S.recs.push({ id: uid('r'), date: K.iso(TODAY), code: code, kind: '発注', qty: o.r.need }); partFlash = code; log('部品を発注：' + o.p.name + ' ' + o.r.need + o.p.unit); commit(); toast('発注を記録しました（発注リストから外れました）'); return;
      }
      case 'add-rec': {
        var r = { id: uid('r'), date: $('#nr-date').value, code: $('#nr-code').value, kind: $('#nr-kind').value, qty: $('#nr-qty').value };
        var chk = K.recCheck(r, S.parts); if (chk) { toast('確認：' + chk); return; }
        r.qty = n0(r.qty); S.recs.push(r); partFlash = r.code; log('部品：' + r.code + ' ' + r.kind + ' ' + r.qty); commit(); return;
      }
      case 'del-rec': S.recs = S.recs.filter(function (x) { return x.id !== id; }); commit(); return;
      // 中古車
      case 'sold': { var u = S.used.filter(function (x) { return x.id === id; })[0]; if (!u) return; u.sold = K.iso(TODAY); usedFlash = id; var gx = uc(u); log('中古車が売れた：' + u.no + ' ' + u.name + '（粗利 ' + yen(n0(gx.gross)) + '）'); commit(); toast('売れた日を今日にしました'); return; }
      case 'add-used': {
        var nu = { id: uid('u'), no: $('#nu-no').value.trim(), type: $('#nu-type').value, name: $('#nu-name').value.trim(), year: '', km: '', buy: $('#nu-buy').value, src: '', cost0: $('#nu-cost0').value, maint: $('#nu-maint').value, fee: $('#nu-fee').value, price: $('#nu-price').value, sold: '', memo: '' };
        if (!nu.no && !nu.name) { toast('管理番号か車名を入れてください'); return; }
        S.used.push(nu); usedFlash = nu.id; log('中古車を仕入れ：' + (nu.no || nu.name)); commit(); return;
      }
      case 'del-used': S.used = S.used.filter(function (x) { return x.id !== id; }); commit(); return;
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
    return scrollTo(el).then(function () {
      var r = el.getBoundingClientRect(), tx = r.left + Math.min(r.width * 0.5, 60), ty = r.top + r.height * 0.6, fx = cur.x, fy = cur.y;
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
  function setVal(sel2, v) { var f = $(sel2); if (f) { f.value = v; f.dispatchEvent(new Event('input', { bubbles: true })); } }
  function nav(v) { return click('#nav button[data-view="' + v + '"]').then(function () { return wait(180); }); }
  function pulse(k) { flowPulse = k; flowPulseT = now(); }
  function runDemo() {
    demoOn = true; curInit();
    // 車検が近い（急ぎ）で、まだ案内していないお客さま
    var target = sortedCust().filter(function (o) { return o.x.st === '急ぎ' && !o.c.guide; })[0] || sortedCust().filter(function (o) { return isNear(o.c, o.x); })[0];
    var pid = null;
    var PARTS = [['エンジンオイル 0W-20', '3', '1200', 'L', 'EO-0W20-4', 800], ['オイルフィルター', '1', '1500', '個', 'OF-K01', 650]];
    var p = wait(1800)
      .then(function () { pulse(0); return nav('cust'); })
      .then(function () { return click('[data-sel="' + target.c.id + '"]'); })
      .then(function () { return click('#mkAnn'); })
      .then(function () { return moveTo($('#annCards'), 420); })
      .then(function () { return wait(1500); })
      .then(function () { return click('#annDone'); })
      .then(function () { return wait(300); })
      .then(function () { pulse(1); return click('#toPit'); })
      .then(function () { return moveTo($('#np-work'), 420); })
      .then(function () { return wait(500); })
      .then(function () { return click('#addPit'); })
      .then(function () { pid = S.pits[S.pits.length - 1].id; var c = $('#pitTbl td.new'); return c ? moveTo(c, 420) : null; })
      .then(function () { return wait(1200); })
      .then(function () { pulse(2); return click('[data-act="pit-job"][data-id="' + pid + '"]'); })
      .then(function () { return wait(250); });
    PARTS.forEach(function (L, i) {
      p = p.then(function () {
        var row = function (k) { return '[data-bind="jp:' + i + ':' + k + '"]'; };
        setVal(row('code'), L[4]); setVal(row('unit'), L[3]); setVal(row('cost'), String(L[5]));
        return type(row('name'), L[0], 20).then(function () { return type(row('qty'), L[1], 40); }).then(function () { return type(row('price'), L[2], 40); });
      });
    });
    p.then(function () { pulse(3); return type('[data-bind="jl:0:amount"]', '6600', 36); })
      .then(function () { return type('[data-bind="jl:1:amount"]', '17540', 36); })
      .then(function () { return type('[data-bind="jl:2:amount"]', '1800', 36); })
      .then(function () { return moveTo($('#jobTot'), 360); })
      .then(function () { return wait(700); })
      .then(function () { pulse(4); return click('#toInv'); })
      .then(function () { return wait(800); })
      .then(function () { return click('#payOpen'); })
      .then(function () { return wait(200); })
      .then(function () { return click('#paySave'); })
      .then(function () { pulse(5); return wait(700); })
      .then(function () { return nav('dash'); })
      .then(function () { return wait(2800); })
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
