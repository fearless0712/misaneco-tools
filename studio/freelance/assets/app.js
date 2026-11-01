/* フリーランス・個人事業主スタジオ：画面の部分。計算は logic.js（源泉徴収・インボイス・支払期日・家事按分）、見本は data.js。
   データは localStorage だけに保存（外部送信なし）。動きは requestAnimationFrame（30コマ/秒まで、見えないときは止める）。
   ?demo=1 … 作業時間を記録（時給×時間）→ 請求書（源泉徴収・消費税・差引請求額・支払期日）→ 入金を記録 → 経費を按分して記録 → ダッシュボード を自動で操作（保存しない）
   ?capture=1 … 時計を外から進める（window.__studio.advance(ms)）。録画でコマ落ちしないように
   ?today=2026-10-29 … 「今日」を固定（見本・録画用） */
(function () {
  'use strict';
  var K = window.FRL, DATA = window.FRDATA;
  var Q = new URLSearchParams(location.search);
  var DEMO = Q.get('demo') === '1', CAPTURE = Q.get('capture') === '1';
  var KEY = 'freelance-studio-v1';
  var TODAY = K.D(Q.get('today')) || K.todayN();
  var MK = K.ym(TODAY);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var yen = K.yen, n0 = K.n0, has = K.has, D = K.D;
  var TAX_LINE = '源泉徴収・消費税の扱いは、国税庁の案内で確認してください。';

  // ================= 保存 =================
  var S, storageOk = true;
  function fresh() { return DATA.sample(TODAY); }
  function valid(o) { return o && o.v === 1 && o.me && Array.isArray(o.clients) && Array.isArray(o.jobs) && Array.isArray(o.docs) && Array.isArray(o.times) && Array.isArray(o.exps) && Array.isArray(o.rules); }
  function load() {
    if (DEMO) return fresh();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw); if (valid(o)) return o; }
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
    if (!DEMO && !storageOk) msg.push('このブラウザでは保存できません（プライベートモードなど）。ページを閉じると入力は消えます。設定の「バックアップを保存」でファイルに残せます。');
    w.hidden = !msg.length; w.textContent = msg.join(' ');
  }
  function uid(p) { S.seq = (S.seq || 3000) + 1; return p + S.seq; }
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
  var FMT = { yen: function (v) { return yen(Math.round(v)); }, n: function (v) { return K.num(Math.round(v)); }, h: function (v) { return (Math.round(v * 10) / 10).toLocaleString('ja-JP'); } };
  function animate(root) {
    $$('[data-k]', root).forEach(function (el) {
      var k = el.getAttribute('data-k'), v = parseFloat(el.getAttribute('data-v')), f = FMT[el.getAttribute('data-f') || 'yen'];
      if (isNaN(v)) { el.textContent = '—'; return; }
      var from = shown.hasOwnProperty(k) ? shown[k] : 0; shown[k] = v;
      if (from === v) { el.textContent = f(v); return; }
      tween(1000, function (p) { el.textContent = f(from + (v - from) * p); });
    });
    $$('[data-w]', root).forEach(function (el) {
      var k = 'w:' + el.getAttribute('data-wk'), v = Math.max(0, Math.min(1, parseFloat(el.getAttribute('data-w')) || 0));
      var from = shown.hasOwnProperty(k) ? shown[k] : 0; shown[k] = v;
      tween(1100, function (p) { el.style.width = ((from + (v - from) * p) * 100).toFixed(2) + '%'; });
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
  function dd(n) { return n === null || n === undefined || n === '' ? '<span class="dim">—</span>' : K.mdw(D(n)); }
  function stTag(p) { return '<span class="st-' + p.st + '">' + K.ST_LABEL[p.st] + '</span>'; }

  // ================= 集計（アプリ全体） =================
  function client(id) { return S.clients.filter(function (c) { return c.id === id; })[0]; }
  function job(id) { return S.jobs.filter(function (j) { return j.id === id; })[0]; }
  function docOf(id) { return S.docs.filter(function (d) { return d.id === id; })[0]; }
  function cname(id) { var c = client(id); return c ? c.name.replace(/（架空）/, '') : '（取引先なし）'; }
  function R() { return S.me.round || 'floor'; }
  function tot(d) { return K.invTotals(d, R()); }
  function ps(d) { return K.payState(d, TODAY, R()); }
  function invs() { return S.docs.filter(function (d) { return d.kind === 'inv'; }); }
  function inMonth(s, m) { return has(s) && K.ym(D(s)) === m; }
  function monthInv(m) { return invs().filter(function (d) { return inMonth(d.issue, m); }); }
  function monthSales(m) { return monthInv(m).reduce(function (s, d) { return s + tot(d).sub; }, 0); }
  function monthWh(m) { return monthInv(m).reduce(function (s, d) { return s + tot(d).wh; }, 0); }
  function monthPaid(m) { var s = 0, n = 0; invs().forEach(function (d) { (d.payments || []).forEach(function (p) { if (inMonth(p.date, m)) { s += Math.round(n0(p.amt)); n++; } }); }); return { sum: s, n: n }; }
  function receivable() { var r = { sum: 0, n: 0, late: 0, lateSum: 0 }; invs().forEach(function (d) { var p = ps(d); if (p.rest > 0) { r.sum += p.rest; r.n++; if (p.st === 'late') { r.late++; r.lateSum += p.rest; } } }); return r; }
  function monthExps(m) { return S.exps.filter(function (e) { return inMonth(e.date, m); }); }
  function expB(e) { return K.expBiz(e, S.rules); }
  function monthExp(m) { var b = 0, a = 0; monthExps(m).forEach(function (e) { b += expB(e).biz; a += Math.round(n0(e.amt)); }); return { biz: b, all: a }; }
  function hoursMonth(m) { return S.times.filter(function (t) { return inMonth(t.date, m); }).reduce(function (s, t) { return s + (+t.hours || 0); }, 0); }
  function unbilled(jid) { return S.times.filter(function (t) { return t.job === jid && !t.billed; }); }

  var view = 'dash', RENDER = {};
  var TITLES = { dash: 'ダッシュボード', client: '取引先と案件', time: '作業時間', inv: '見積・請求', pay: '入金', exp: '経費と家事按分', set: '設定' };
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
  var FLOW_X = [40, 136, 232, 328, 424, 520];
  RENDER.dash = function () {
    var el = $('#v-dash'), sales = monthSales(MK), wh = monthWh(MK), paid = monthPaid(MK), rc = receivable(), ex = monthExp(MK), mi = monthInv(MK);
    var prevM = K.ym(K.firstOfMonth(TODAY) - 1), ps0 = monthSales(prevM);
    var h = '<div class="grid g4">';
    h += kpi('今月の売上（請求ベース・税抜）', cnt('d-s', sales), '', '請求 ' + mi.length + '件・源泉徴収 ' + yen(wh), 'k-s', Math.min(1, sales / Math.max(1, sales, ps0 * 1.4)));
    h += kpi('入金済み（今月）', cnt('d-p', paid.sum), '', paid.n + '件', 'k-p', Math.min(1, paid.sum / Math.max(1, paid.sum + rc.sum)));
    h += kpi('入金予定（未入金の残り）', cnt('d-r', rc.sum), rc.late ? 'rd' : 'bl', rc.late ? '<span class="bad">期日すぎ ' + rc.late + '件・' + yen(rc.lateSum) + '</span>' : rc.n + '件・期日すぎなし', 'k-r', Math.min(1, rc.sum / Math.max(1, paid.sum + rc.sum)), 'bl');
    h += kpi('経費（今月・仕事の分）', cnt('d-e', ex.biz), '', '支払った額 ' + yen(ex.all) + '（按分の前）', 'k-e', ex.all ? ex.biz / ex.all : 0);
    h += '</div>';
    // FLOW
    var flow = [
      { lab: '取引先', v: S.clients.length, f: 'n', u: '社' },
      { lab: '案件', v: S.jobs.filter(function (j) { return j.status === '進行中'; }).length, f: 'n', u: '件' },
      { lab: '作業時間', v: Math.round(hoursMonth(MK)), f: 'n', u: 'h' },
      { lab: '見積・請求', v: mi.length, f: 'n', u: '件' },
      { lab: '入金', v: Math.round(paid.sum / 10000), f: 'n', u: '万' },
      { lab: '経費', v: Math.round(ex.biz / 10000), f: 'n', u: '万' }
    ];
    h += '<div class="panel flow mt"><div class="ph"><h2><b>FLOW</b>取引先 → 案件 → 作業時間 → 見積・請求 → 入金 → 経費</h2><span class="tag">' + K.ymd(TODAY).m + '月</span></div>';
    h += '<svg viewBox="0 0 560 96" id="flowSvg" role="img" aria-label="取引先から経費までのつながり">';
    h += '<defs><linearGradient id="fl" x1="0" x2="1"><stop offset="0" stop-color="#c2f04a"/><stop offset="1" stop-color="#6aa8ff"/></linearGradient></defs>';
    h += '<line x1="40" y1="34" x2="520" y2="34" stroke="#1c261f" stroke-width="6" stroke-linecap="round"/>';
    h += '<line x1="40" y1="34" x2="520" y2="34" stroke="url(#fl)" stroke-width="2" stroke-linecap="round" opacity=".9"/>';
    for (var j = 0; j < 9; j++) h += '<circle class="fd" r="2.6" cy="34" cx="40" fill="#fff"/><circle class="fh" r="7" cy="34" cx="40" fill="#c2f04a" opacity=".22"/>';
    flow.forEach(function (f, i) {
      var x = FLOW_X[i];
      h += '<circle class="fn" cx="' + x + '" cy="34" r="13" fill="#07090a" stroke="' + (i < 3 ? '#c2f04a' : '#6aa8ff') + '" stroke-width="2"/>';
      h += '<circle class="fr" cx="' + x + '" cy="34" r="13" fill="none" stroke="#fff" stroke-width="1.5" opacity="0"/>';
      h += '<text x="' + x + '" y="38" text-anchor="middle" font-family="JetBrains Mono" font-size="11" fill="#fff">' + (i + 1) + '</text>';
      h += '<text class="nlab" x="' + x + '" y="66" text-anchor="middle">' + f.lab + '</text>';
      h += '<text class="ncnt" x="' + x + '" y="84" text-anchor="middle"><tspan data-k="f-' + i + '" data-v="' + f.v + '" data-f="' + f.f + '"></tspan>' + f.u + '</text>';
    });
    h += '</svg></div>';
    // 入金期日（14日）・実質時給
    h += '<div class="grid g32 mt">';
    h += '<div class="panel st" id="dashDue"><div class="ph"><h2><b>01</b>これから14日の入金期日</h2><span class="tag">' + K.md(TODAY) + '〜' + K.md(TODAY + 13) + '</span></div>' + agenda14() + '</div>';
    h += '<div class="panel" id="dashEff"><div class="ph"><h2><b>02</b>案件ごとの実質時給</h2><span class="tag">金額 ÷ かかった時間</span></div>' + effBars() + '</div></div>';
    // 今月のまとめ・最近の動き
    var tx = mi.reduce(function (s, d) { return s + tot(d).tax; }, 0);
    h += '<div class="grid g2 mt"><div class="panel"><div class="ph"><h2><b>03</b>今月のまとめ</h2><span class="tag">請求日・支払日で数える</span></div><div class="sumgrid">';
    h += '<div><span>売上（税抜）</span><b>' + yen(sales) + '</b></div><div><span>消費税（請求書の合計）</span><b>' + yen(tx) + '</b></div>';
    h += '<div><span>源泉徴収される額</span><b>' + yen(wh) + '</b></div><div><span>経費（仕事の分）</span><b>' + yen(ex.biz) + '</b></div>';
    h += '</div><p class="src mt">源泉徴収された額は、確定申告で精算する税の前払いにあたります。' + TAX_LINE + '</p></div>';
    h += '<div class="panel feed"><div class="ph"><h2><b>04</b>最近の動き</h2></div><div class="list">';
    S.log.slice(0, 5).forEach(function (l) { h += '<div class="li"><span class="m">' + esc(K.md(D(l.t))) + '</span><span class="x">' + esc(l.msg) + '</span></div>'; });
    h += '</div></div></div>';
    el.innerHTML = h;
    flowEls = { d: $$('.fd', el), h: $$('.fh', el), r: $$('.fr', el) };
    animate(el);
  };
  function agenda14() {
    var ev = {}, late = [];
    invs().forEach(function (d) {
      var p = ps(d); if (p.rest <= 0 || p.due === null) return;
      if (p.st === 'late') late.push({ d: d, p: p });
      else if (p.due >= TODAY && p.due <= TODAY + 13) (ev[p.due] = ev[p.due] || []).push({ d: d, p: p });
    });
    var h = '<div class="agenda">';
    if (late.length) {
      h += '<div class="ag"><span class="agd"><b class="late-t">期日すぎ</b></span><span class="age">';
      late.forEach(function (x) { h += '<em class="late">' + esc(cname(x.d.client)) + ' ' + yen(x.p.rest) + '（' + (-x.p.left) + '日すぎ）</em>'; });
      h += '</span></div>';
    }
    var shownN = 0;
    for (var i = 0; i < 14; i++) {
      var n = TODAY + i, e = ev[n] || [], off = K.offReason(n);
      if (!e.length && i) continue;
      shownN++;
      var sum = e.reduce(function (s, x) { return s + x.p.rest; }, 0);
      h += '<div class="ag' + (i === 0 ? ' today' : '') + '"><span class="agd"><b>' + K.md(n) + '</b>' + K.WD[K.wday(n)] + (i === 0 ? '<small>今日</small>' : off ? '<small class="offc">休み</small>' : '<small>' + i + '日後</small>') + '</span><span class="age">';
      e.forEach(function (x) { h += '<em class="due">' + esc(cname(x.d.client)) + ' ' + yen(x.p.rest) + '</em>'; });
      if (!e.length) h += '<span class="note">入金の期日なし</span>';
      if (sum) h += '<span class="amt">計 ' + yen(sum) + '</span>';
      h += '</span></div>';
    }
    if (shownN <= 1 && !late.length) h += '<p class="note">これから14日に期日の来る請求はありません。</p>';
    h += '</div><p class="src mt">期日は請求日と取引先の締め日・支払サイトから計算（土日祝・12/31〜1/3は前営業日など）。金額は源泉徴収を引いた残り。</p>';
    return h;
  }
  function effBars() {
    var L = S.jobs.filter(function (j) { return j.status !== '見積中'; }).map(function (j) { return { j: j, s: K.jobStats(j, S.times) }; }).filter(function (x) { return x.s.eff !== null; });
    L.sort(function (a, b) { return b.s.eff - a.s.eff; });
    var goal = Math.round(n0(S.me.goal)) || 0, mx = Math.max.apply(null, L.map(function (x) { return x.s.eff; }).concat([goal * 1.25, 1]));
    var h = '<div class="eff">';
    L.forEach(function (x) {
      var low = goal && x.s.eff < goal;
      h += '<div class="row' + (low ? ' low' : '') + '"><span>' + esc(x.j.name) + '<small>' + esc(cname(x.j.client)) + '・' + K.hrs(x.s.hours) + (x.j.kind === 'hourly' ? '・時給' : '・固定 ' + yen(x.s.revenue)) + '</small></span><div class="tr"><i data-w="' + (x.s.eff / mx) + '" data-wk="ef' + x.j.id + '"></i>' + (goal ? '<b class="goal" style="left:' + (goal / mx * 100).toFixed(1) + '%"></b>' : '') + '</div><em>' + cnt('ef-' + x.j.id, x.s.eff) + '</em></div>';
    });
    if (!L.length) h += '<p class="note">作業時間を記録すると、案件ごとの実質時給が出ます。</p>';
    h += '</div><p class="src mt">黄色の線は目標の時給 ' + (goal ? yen(goal) : '（設定で入れる）') + '。固定の案件は 金額（税抜）÷かかった時間、1円未満切り捨て。見積中の案件は入れていません。</p>';
    return h;
  }
  var flowPulse = -1, flowPulseT = 0;
  function drawFlow(t) {
    if (!flowEls || !flowEls.d.length || !document.body.contains(flowEls.d[0])) { flowEls = null; return; }
    var L = 480, n = flowEls.d.length, N = FLOW_X.length, near = [0, 0, 0, 0, 0, 0];
    for (var i = 0; i < n; i++) {
      var p = ((t / 5200) + i / n) % 1, x = 40 + p * L;
      flowEls.d[i].setAttribute('cx', x.toFixed(1)); flowEls.h[i].setAttribute('cx', x.toFixed(1));
      flowEls.h[i].setAttribute('fill', p < .5 ? '#c2f04a' : '#6aa8ff');
      for (var k = 0; k < N; k++) { var d0 = Math.abs(x - FLOW_X[k]); if (d0 < 14) near[k] = Math.max(near[k], 1 - d0 / 14); }
    }
    for (var k2 = 0; k2 < N; k2++) {
      var on = flowPulse === k2 ? Math.max(0, 1 - (t - flowPulseT) / 1400) : 0, a = Math.max(near[k2] * .6, on);
      flowEls.r[k2].setAttribute('opacity', a.toFixed(2)); flowEls.r[k2].setAttribute('r', (13 + a * 7).toFixed(1));
    }
  }

  // ================= 2) 取引先と案件 =================
  var CLOSE_OPTS = [['end', '末日'], ['5', '5日'], ['10', '10日'], ['15', '15日'], ['20', '20日'], ['25', '25日'], ['none', '締めなし']];
  var SITE_OPTS = [['m0end', '当月末'], ['m1end', '翌月末'], ['m2end', '翌々月末'], ['m1d', '翌月○日'], ['m2d', '翌々月○日'], ['days', '○日後']];
  var ADJ_OPTS = [['prev', '前営業日'], ['next', '翌営業日'], ['none', 'そのまま']];
  var clNew = null, jbNew = null;
  RENDER.client = function () {
    var h = '<div class="panel"><div class="ph"><h2><b>NEW</b>取引先を追加</h2><span class="tag">締め日と支払サイトから、請求書の支払期日が自動で出ます</span></div><div class="form">';
    h += fld('取引先の名前', '<input id="clName" placeholder="例：株式会社〇〇">', 'wide') + fld('締め日', '<select id="clClose">' + opts(CLOSE_OPTS, 'end') + '</select>') + fld('支払サイト', '<select id="clSite">' + opts(SITE_OPTS, 'm1end') + '</select>');
    h += fld('○日（○日・○日後のとき）', '<input id="clN" class="num" inputmode="numeric" value="30">') + fld('源泉徴収', '<select id="clWh">' + opts([['0', '対象外'], ['1', '対象（報酬から引かれる）']], '0') + '</select>');
    h += '<div class="btns"><button class="btn" id="clAdd" data-act="cl-add">取引先を追加</button></div></div></div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>01</b>取引先（支払条件・源泉徴収）</h2><span class="tag">今日請求したときの期日</span></div><div class="tw"><table id="clTbl"><thead><tr><th>取引先</th><th>締め日</th><th>支払サイト</th><th>○日</th><th class="hide-n">休みのとき</th><th>源泉徴収</th><th>支払条件</th><th>今日請求すると</th></tr></thead><tbody>';
    S.clients.forEach(function (c) {
      var r = K.calcDue(TODAY, c);
      h += '<tr' + (c.id === clNew ? ' class="new"' : '') + '><td>' + esc(c.name) + '<small>' + esc(c.memo || '') + '</small></td>';
      h += '<td><select data-bind="cl:' + c.id + ':close">' + opts(CLOSE_OPTS, c.close) + '</select></td>';
      h += '<td><select data-bind="cl:' + c.id + ':site">' + opts(SITE_OPTS, c.site) + '</select></td>';
      h += '<td><input class="num sm" style="width:58px" data-bind="cl:' + c.id + ':n" value="' + esc(c.n) + '"' + (K.SITES[c.site] && K.SITES[c.site].n ? '' : ' disabled') + '></td>';
      h += '<td class="hide-n"><select data-bind="cl:' + c.id + ':adj">' + opts(ADJ_OPTS, c.adj || 'prev') + '</select></td>';
      h += '<td><select data-bind="cl:' + c.id + ':wh">' + opts([['0', '対象外'], ['1', '対象']], c.wh ? '1' : '0') + '</select></td>';
      h += '<td class="nowrap">' + esc(K.payText(c)) + '</td>';
      h += '<td class="nowrap mono">' + (r ? K.mdw(r.due) : '—') + (r && r.memo ? '<small>' + esc(r.memo) + '</small>' : '') + '</td></tr>';
    });
    h += '</tbody></table></div><p class="src mt">例：末日締め・翌月末払い ＝ その月の末日で締めて、翌月の末日に支払い。期日が土日祝・12/31〜1/3に当たるときは「休みのとき」に合わせてずらします（支払期日の計算ツールと同じ）。源泉徴収の対象かどうかは仕事の中身と相手で変わります。' + TAX_LINE + '</p></div>';
    // 案件
    h += '<div class="panel mt"><div class="ph"><h2><b>NEW</b>案件を追加</h2><span class="tag">単価は固定（1件いくら）か時給</span></div><div class="form">';
    h += fld('取引先', '<select id="jbClient">' + opts(S.clients.map(function (c) { return [c.id, c.name]; }), (S.clients[0] || {}).id) + '</select>', 'wide') + fld('案件名', '<input id="jbName" placeholder="例：サイトのリニューアル">', 'wide');
    h += fld('単価の種類', '<select id="jbKind">' + opts([['fixed', '固定（1件いくら）'], ['hourly', '時給']], 'fixed') + '</select>') + fld('金額・時給（税抜）', '<input id="jbPrice" class="num" inputmode="numeric" placeholder="例：200000">');
    h += '<div class="btns"><button class="btn" id="jbAdd" data-act="jb-add">案件を追加</button></div></div></div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>02</b>案件</h2><span class="tag">実質時給 ＝ 金額 ÷ かかった時間</span></div><div class="tw"><table id="jbTbl"><thead><tr><th>案件</th><th>取引先</th><th>単価の種類</th><th class="r">金額・時給</th><th>状態</th><th class="r">かかった時間</th><th class="r">実質時給</th></tr></thead><tbody>';
    var goal = Math.round(n0(S.me.goal)) || 0;
    S.jobs.forEach(function (j) {
      var s = K.jobStats(j, S.times);
      h += '<tr' + (j.id === jbNew ? ' class="new"' : '') + '><td>' + esc(j.name) + '</td><td>' + esc(cname(j.client)) + '</td>';
      h += '<td><select data-bind="jb:' + j.id + ':kind">' + opts([['fixed', '固定'], ['hourly', '時給']], j.kind) + '</select></td>';
      h += '<td class="r"><input class="num" style="width:96px" data-bind="jb:' + j.id + ':' + (j.kind === 'hourly' ? 'rate' : 'price') + '" value="' + esc(j.kind === 'hourly' ? j.rate : j.price) + '"></td>';
      h += '<td><select data-bind="jb:' + j.id + ':status">' + opts(['見積中', '進行中', '完了'], j.status) + '</select></td>';
      h += '<td class="r mono">' + K.hrs(s.hours) + '</td><td class="r mono' + (goal && s.eff !== null && s.eff < goal ? ' late-t' : '') + '">' + (s.eff === null ? '—' : yen(s.eff)) + '</td></tr>';
    });
    h += '</tbody></table></div></div>';
    $('#v-client').innerHTML = h;
  };
  function addClient() {
    var name = $('#clName').value.trim(); if (!name) { toast('取引先の名前を入れてください'); return; }
    var cv = $('#clClose').value, c = { id: uid('c'), name: name, hon: '御中', close: cv === 'end' || cv === 'none' ? cv : +cv, site: $('#clSite').value, n: Math.max(1, Math.round(n0($('#clN').value))) || 30, adj: 'prev', wh: $('#clWh').value === '1', memo: '' };
    S.clients.push(c); clNew = c.id; log('取引先：' + c.name + '（' + K.payText(c) + '）'); commit(); toast('取引先を追加しました（' + K.payText(c) + '）');
  }
  function addJob() {
    var name = $('#jbName').value.trim(); if (!name) { toast('案件名を入れてください'); return; }
    var kind = $('#jbKind').value, v = Math.round(n0($('#jbPrice').value));
    var j = { id: uid('j'), client: $('#jbClient').value, name: name, kind: kind, price: kind === 'fixed' ? v : 0, rate: kind === 'hourly' ? v : 0, status: '進行中' };
    S.jobs.push(j); jbNew = j.id; log('案件：' + j.name + '（' + (kind === 'hourly' ? '時給 ' + yen(v) : '固定 ' + yen(v)) + '）'); commit(); toast('案件を追加しました');
  }

  // ================= 3) 作業時間 =================
  var tmNew = null, tmJob = null;
  RENDER.time = function () {
    var active = S.jobs.filter(function (j) { return j.status !== '完了'; });
    if (!tmJob || !job(tmJob)) tmJob = (active[0] || S.jobs[0] || {}).id;
    var h = '<div class="panel"><div class="ph"><h2><b>NEW</b>作業時間を記録</h2><span class="tag">時給の案件は、時間 × 時給が請求額になります</span></div><div class="form">';
    h += fld('案件', '<select id="tmJob">' + opts(active.map(function (j) { return [j.id, j.name + '（' + cname(j.client) + '）']; }), tmJob) + '</select>', 'wide');
    h += fld('日付', '<input type="date" id="tmDate" value="' + K.iso(TODAY) + '">') + fld('時間（1.5 や 1:30）', '<input id="tmHours" class="num" inputmode="decimal" placeholder="1.5">') + fld('メモ', '<input id="tmMemo" placeholder="例：修正の対応">', 'wide');
    var j0 = job(tmJob);
    h += '<div class="btns"><button class="btn" id="tmAdd" data-act="tm-add">記録する</button><span class="note" id="tmPrev">' + (j0 && j0.kind === 'hourly' ? '時給 ' + yen(j0.rate) : '固定の案件（実質時給の計算に使います）') + '</span></div></div></div>';
    // 時給の案件：まだ請求していない時間
    var hj = S.jobs.filter(function (j) { return j.kind === 'hourly'; });
    h += '<div class="panel mt st" id="tmUnbilled"><div class="ph"><h2><b>01</b>時給の案件：まだ請求していない時間</h2><span class="tag">時間 × 時給（1円未満は四捨五入）</span></div><div class="list">';
    hj.forEach(function (j) {
      var L = unbilled(j.id), hh = K.clean(L.reduce(function (s, t) { return s + (+t.hours || 0); }, 0)), amt = K.timeAmount(hh, j.rate);
      h += '<div class="li"><span class="x">' + esc(j.name) + '<small>' + esc(cname(j.client)) + '・' + L.length + '回</small></span><span class="r">' + cnt('ub-h-' + j.id, hh, 'h') + '時間 × ' + yen(j.rate) + ' ＝ <b>' + cnt('ub-' + j.id, amt) + '</b></span>' + (L.length ? '<button class="btn st" id="tmBill-' + j.id + '" data-act="tm-bill" data-id="' + j.id + '">請求書を作る</button>' : '') + '</div>';
    });
    if (!hj.length) h += '<p class="note">時給の案件はまだありません（取引先と案件の画面で「時給」を選ぶと出ます）。</p>';
    h += '</div></div>';
    // 記録
    var L2 = S.times.slice().sort(function (a, b) { return D(b.date) - D(a.date) || (a.id < b.id ? 1 : -1); });
    h += '<div class="panel mt"><div class="ph"><h2><b>02</b>記録</h2><span class="tag">新しい順</span></div><div class="tw"><table id="tmTbl"><thead><tr><th>日付</th><th>案件</th><th class="r">時間</th><th class="hide-n">メモ</th><th class="r">金額（時給）</th><th>請求</th><th></th></tr></thead><tbody>';
    L2.slice(0, 40).forEach(function (t) {
      var j = job(t.job) || {}, hr = j.kind === 'hourly';
      h += '<tr' + (t.id === tmNew ? ' class="new"' : '') + '><td class="mono nowrap">' + K.mdw(D(t.date)) + '</td><td>' + esc(j.name || '') + '</td><td class="r mono">' + K.hrs(+t.hours || 0) + '</td><td class="hide-n">' + esc(t.memo || '') + '</td>';
      h += '<td class="r mono">' + (hr ? yen(K.timeAmount(t.hours, j.rate)) : '<span class="dim">固定</span>') + '</td><td>' + (hr ? (t.billed ? '<span class="st-done">請求済み</span>' : '<span class="st-open">まだ</span>') : '<span class="dim">—</span>') + '</td>';
      h += '<td>' + (t.billed ? '' : '<button class="ghost sm" data-act="tm-del" data-id="' + t.id + '">消す</button>') + '</td></tr>';
    });
    h += '</tbody></table></div></div>';
    $('#v-time').innerHTML = h;
    animate($('#v-time'));
  };
  function addTime() {
    var hv = K.hours($('#tmHours').value), jid = $('#tmJob').value, j = job(jid);
    if (!j) { toast('案件を選んでください'); return; }
    if (hv === null || hv <= 0 || hv > 24) { toast('時間は 1.5 や 1:30 の形で入れてください（24時間まで）'); return; }
    var t = { id: uid('t'), job: jid, date: $('#tmDate').value || K.iso(TODAY), hours: hv, memo: $('#tmMemo').value.trim() };
    S.times.push(t); tmNew = t.id; tmJob = jid;
    var msg = j.kind === 'hourly' ? K.hrs(hv) + ' × ' + yen(j.rate) + ' ＝ ' + yen(K.timeAmount(hv, j.rate)) : K.hrs(hv) + '（実質時給 ' + yen(K.jobStats(j, S.times).eff) + '）';
    log('作業時間：' + j.name + ' ' + K.hrs(hv) + (t.memo ? '（' + t.memo + '）' : '')); commit(); toast('記録しました：' + msg);
  }
  function billTimes(jid) {
    var j = job(jid), L = unbilled(jid); if (!j || !L.length) return;
    var hh = K.clean(L.reduce(function (s, t) { return s + (+t.hours || 0); }, 0)), ds = L.map(function (t) { return D(t.date); });
    var from = Math.min.apply(null, ds), to = Math.max.apply(null, ds), c = client(j.client);
    S.draft = { kind: 'inv', client: j.client, issue: K.iso(TODAY), job: jid, wh: !!(c && c.wh), timeIds: L.map(function (t) { return t.id; }), editing: '',
      items: [{ date: K.iso(to), item: j.name + ' 作業時間（' + K.md(from) + '〜' + K.md(to) + '）', qty: hh, unit: '時間', price: j.rate, rate: 10 }] };
    save(); go('inv'); toast(K.hrs(hh) + ' × ' + yen(j.rate) + ' を請求書に入れました');
  }

  // ================= 4) 見積・請求 =================
  function newDraft(kind) {
    var c = S.clients[0] || {};
    return { kind: kind || 'inv', client: c.id || '', issue: K.iso(TODAY), job: '', wh: !!c.wh, timeIds: [], editing: '', items: [{ date: K.iso(TODAY), item: '', qty: 1, unit: '式', price: '', rate: 10 }] };
  }
  function draftDoc() {
    var d = S.draft, c = client(d.client) || {};
    var x = { kind: d.kind, client: d.client, to: c.name || '', hon: c.hon || '御中', issue: d.issue, items: d.items, wh: !!d.wh, no: '', due: '' };
    if (d.editing) { var o = docOf(d.editing); if (o) x.no = o.no; }
    if (!x.no) x.no = (d.kind === 'est' ? (S.me.estPrefix || 'M-') + pad4((S.estSeq || 0) + 1) : (S.me.invPrefix || 'H-') + pad4((S.invSeq || 0) + 1)) + '（発行前）';
    var r = d.kind === 'inv' ? K.calcDue(d.issue, c) : null;
    x.dueInfo = r; x.due = d.kind === 'inv' ? (r ? K.iso(r.due) : '') : (D(d.issue) !== null ? K.iso(D(d.issue) + 30) : '');
    return x;
  }
  function pad4(n) { return ('000' + n).slice(-4); }
  RENDER.inv = function () {
    if (!S.draft) S.draft = newDraft('inv');
    var d = S.draft, est = d.kind === 'est', c = client(d.client) || {};
    var h = '<div class="panel"><div class="ph"><h2><b>' + (d.editing ? 'EDIT' : 'NEW') + '</b>' + (est ? '見積書' : '請求書') + (d.editing ? '（発行済みを開いています）' : 'を作る') + '</h2><div class="btns"><div class="doc-kind"><button data-act="dk" data-k="inv" class="' + (est ? '' : 'on') + '">請求書</button><button data-act="dk" data-k="est" class="' + (est ? 'on' : '') + '">見積書</button></div><button class="ghost" id="ivNew" data-act="iv-new">新しく作る</button></div></div>';
    h += '<div class="form">';
    h += fld('取引先', '<select id="ivClient" data-bind="dr:client">' + opts(S.clients.map(function (x) { return [x.id, x.name]; }), d.client) + '</select>', 'wide');
    h += fld(est ? '見積日' : '請求日', '<input type="date" id="ivIssue" data-bind="dr:issue" value="' + esc(d.issue) + '">');
    h += fld('案件（任意）', '<select id="ivJob" data-bind="dr:job">' + opts([['', '（選ばない）']].concat(S.jobs.filter(function (j) { return j.client === d.client; }).map(function (j) { return [j.id, j.name]; })), d.job) + '</select>');
    h += fld('源泉徴収', '<select id="ivWh" data-bind="dr:wh">' + opts([['1', '引く（10.21%）'], ['0', '引かない']], d.wh ? '1' : '0') + '</select>');
    h += '</div><p class="mini mt">この取引先の設定：' + esc(K.payText(c)) + '・源泉徴収 ' + (c.wh ? '対象' : '対象外') + '</p>';
    h += '<div class="tw mt"><table class="lines" id="ivLines"><colgroup><col class="hide-n" style="width:118px"><col><col style="width:62px"><col class="hide-n" style="width:58px"><col style="width:104px"><col style="width:66px"><col style="width:96px"><col style="width:30px"></colgroup><thead><tr><th class="hide-n">日付</th><th>品目</th><th>数量</th><th class="hide-n">単位</th><th>単価（税抜）</th><th>税率</th><th class="r">金額</th><th></th></tr></thead><tbody>';
    d.items.forEach(function (it, i) {
      h += '<tr><td class="hide-n"><input type="date" data-bind="ln:' + i + ':date" value="' + esc(it.date) + '"></td><td><input id="ivItem-' + i + '" data-bind="ln:' + i + ':item" value="' + esc(it.item) + '" placeholder="例：ロゴ制作"></td>';
      h += '<td><input class="num" data-bind="ln:' + i + ':qty" value="' + esc(it.qty) + '"></td><td class="hide-n"><input data-bind="ln:' + i + ':unit" value="' + esc(it.unit) + '"></td>';
      h += '<td><input class="num" id="ivPrice-' + i + '" inputmode="numeric" data-bind="ln:' + i + ':price" value="' + esc(it.price) + '" placeholder="0"></td>';
      h += '<td><select data-bind="ln:' + i + ':rate">' + opts([['10', '10%'], ['8', '8%※']], it.rate) + '</select></td><td class="amt" id="ivAmt-' + i + '"></td>';
      h += '<td class="del">' + (d.items.length > 1 ? '<button class="x" data-act="ln-del" data-i="' + i + '" aria-label="この行を消す">×</button>' : '') + '</td></tr>';
    });
    h += '</tbody></table></div><div class="btns mt"><button class="ghost" data-act="ln-add">＋ 行を足す</button><span class="note">1行の金額は 数量×単価 を四捨五入。消費税は税率ごとに合計してから1回だけ端数処理（' + K.ROUND_LABEL[R()] + '）。</span></div></div>';
    h += '<div class="grid g23 mt"><div class="panel" id="invTot"></div><div class="panel docp" id="invDocP"><div class="ph"><h2><b>' + (est ? 'EST' : 'INV') + '</b>' + (est ? '見積書' : '請求書') + 'のプレビュー</h2><div class="btns"><button class="btn" id="ivIssueBtn" data-act="iv-issue">' + (d.editing ? '上書きして保存' : '発行して一覧に入れる') + '</button><button class="ghost" data-act="print">印刷</button></div></div><div id="invDoc"></div><p class="sub2">インボイス（適格請求書）の記載事項 6つ</p><ul class="chk" id="invChk"></ul></div></div>';
    // 一覧
    var L = S.docs.slice().sort(function (a, b) { return D(b.issue) - D(a.issue) || (a.no < b.no ? 1 : -1); });
    h += '<div class="panel mt"><div class="ph"><h2><b>01</b>発行した見積書・請求書</h2><span class="tag">新しい順</span></div><div class="tw"><table id="docTbl"><thead><tr><th>番号</th><th>種類</th><th>取引先</th><th>日付</th><th class="r">差引請求額</th><th>期日・有効期限</th><th>状態</th><th></th></tr></thead><tbody>';
    L.forEach(function (x) {
      var t = tot(x), p = x.kind === 'inv' ? ps(x) : null;
      h += '<tr' + (x.id === docNew ? ' class="new"' : p && p.st === 'late' ? ' class="late"' : '') + '><td class="mono nowrap">' + esc(x.no) + '</td><td>' + (x.kind === 'est' ? '見積' : '請求') + '</td><td>' + esc(cname(x.client)) + '</td><td class="mono nowrap">' + K.md(D(x.issue)) + '</td>';
      h += '<td class="r mono">' + yen(t.net) + (t.wh ? '<small>源泉 ' + yen(t.wh) + '</small>' : '') + '</td><td class="mono nowrap due">' + dd(x.due) + '</td><td>' + (p ? stTag(p) : '<span class="dim">見積</span>') + '</td>';
      h += '<td class="nowrap"><button class="ghost sm" data-act="doc-open" data-id="' + x.id + '">開く</button>' + (x.kind === 'est' ? ' <button class="ghost sm" data-act="est-inv" data-id="' + x.id + '">請求書にする</button>' : '') + '</td></tr>';
    });
    h += '</tbody></table></div></div>';
    $('#v-inv').innerHTML = h;
    refreshInv(true);
  };
  function refreshInv(first) {
    var d = S.draft; if (!d) return;
    var x = draftDoc(), t = tot(x), c = t.calc, est = d.kind === 'est', me = S.me;
    // 行の金額
    d.items.forEach(function (it, i) {
      var q = K.has(it.qty) ? K.toNum(it.qty) : 1, p = K.toNum(it.price), el = $('#ivAmt-' + i);
      if (el) el.textContent = p === null || q === null ? '' : yen(Math.round(K.clean(q * p)));
    });
    // 合計
    var h = '<div class="ph"><h2><b>SUM</b>合計と源泉徴収</h2><span class="tag">税抜で書く' + (est ? '見積書' : '請求書') + '</span></div><div class="tot">';
    h += '<div class="r"><span>小計（税抜）</span><span>' + cnt('iv-sub', t.sub) + '</span></div>';
    c.rates.forEach(function (r) { h += '<div class="r"><span>' + r + '%対象 ' + yen(c.by[r].base) + ' の消費税</span><span>' + cnt('iv-tax' + r, c.by[r].tax) + '</span></div>'; });
    h += '<div class="r"><span>合計（税込）</span><span>' + cnt('iv-total', t.total) + '</span></div>';
    if (d.wh) h += '<div class="r wh"><span>源泉徴収税額<small>' + esc(K.whFormula(t.sub)) + '</small></span><span>−' + cnt('iv-wh', t.wh) + '</span></div>';
    h += '<div class="r em"><span>差引請求額</span><span>' + cnt('iv-net', t.net) + '</span></div></div>';
    if (est) h += '<div class="duebox" id="ivDue"><b>' + (x.due ? K.mdw(D(x.due)) : '—') + '</b>見積の有効期限<small>見積日から30日</small></div>';
    else {
      var r = x.dueInfo, cl = client(d.client) || {};
      h += '<div class="duebox" id="ivDue"><b>' + (r ? K.mdw(r.due) : '—') + '</b>支払期日（自動）';
      if (r) h += '<small>' + esc(K.payText(cl)) + '：締め日 ' + K.mdw(r.closing) + ' → ' + K.mdw(r.raw) + (r.memo ? '（' + esc(r.memo) + '）' : '') + (r.outOfRange ? '・祝日データの範囲外' : '') + '</small>';
      h += '</div>';
    }
    h += '<p class="taxline">' + TAX_LINE + '</p>';
    $('#invTot').innerHTML = h; animate($('#invTot'));
    // 書面
    var g = '<div class="doc" id="ivDoc"><div class="d-title">' + (est ? '御見積書' : '請求書') + '</div><div class="d-top"><div><div class="d-to">' + esc(x.to) + ' ' + esc(x.hon) + '</div>';
    g += '<div class="d-total">' + (est ? 'お見積金額' : 'ご請求金額（差引）') + '<b>' + yen(t.net) + '</b></div>';
    g += '<div class="d-sm">' + (est ? '有効期限' : 'お支払期日') + '：' + (x.due ? K.jd(D(x.due)) : '—') + '</div></div>';
    g += '<div class="d-from">No. ' + esc(x.no) + '<br>' + (est ? '見積日' : '請求日') + '：' + K.jd(D(x.issue)) + '<br><b>' + esc(me.trade || '') + '</b><br>' + esc(me.name || '') + '<br>' + esc(me.addr || '') + '<br>' + esc(me.tel || '') + '<br>登録番号：' + esc(K.regNoClean(me.reg)) + '</div></div>';
    g += '<table><thead><tr><th>日付</th><th>品目</th><th class="r">数量</th><th class="r">単価</th><th class="r">金額</th></tr></thead><tbody>';
    c.rows.forEach(function (it) { g += '<tr><td>' + (D(it.date) !== null ? K.md(D(it.date)) : '') + '</td><td>' + esc(it.item) + (it.rate === 8 ? ' ※' : '') + '</td><td class="r">' + (Math.round(it.qty * 100) / 100).toLocaleString('ja-JP') + esc(it.unit) + '</td><td class="r">' + K.num(it.price) + '</td><td class="r">' + K.num(it.amt) + '</td></tr>'; });
    c.rates.forEach(function (r) { g += '<tr><td></td><td colspan="3">' + r + '%対象 ' + K.num(c.by[r].base) + '円　消費税（' + r + '%）</td><td class="r">' + K.num(c.by[r].tax) + '</td></tr>'; });
    g += '<tr><td></td><td colspan="3"><b>合計（税込）</b></td><td class="r"><b>' + K.num(t.total) + '</b></td></tr>';
    if (d.wh) g += '<tr class="d-wh"><td></td><td colspan="3">源泉徴収税額（' + K.num(t.sub) + '円に対して）</td><td class="r">−' + K.num(t.wh) + '</td></tr>';
    g += '<tr class="d-net"><td></td><td colspan="3">差引' + (est ? 'お見積' : 'ご請求') + '金額</td><td class="r">' + K.num(t.net) + '</td></tr></tbody></table>';
    if (c.rates.indexOf(8) >= 0) g += '<div class="d-sm">※は軽減税率（8%）の対象です。</div>';
    if (!est) g += '<div class="d-bank">お振込先：' + esc(me.bank || '') + '</div>';
    g += '</div>';
    $('#invDoc').innerHTML = g;
    var ck = K.invChecks(x, c, me), k = '';
    ck.forEach(function (z, i) { k += '<li class="' + (z.ok ? '' : 'ng') + '"><i>' + (z.ok ? '✓' : '!') + '</i><span>' + (i + 1) + '. ' + z.k + '<small>' + esc(z.v) + '</small></span></li>'; });
    $('#invChk').innerHTML = k + '<li><i>・</i><span class="mini">記載事項は国税庁「インボイス制度について」の6項目。消費税の端数処理は1枚につき税率ごとに1回（同「Q&A」問57）。</span></li>';
  }
  var docNew = null;
  function issueDoc() {
    var d = S.draft, x = draftDoc(), c = client(d.client);
    if (!c) { toast('取引先を選んでください'); return; }
    var items = d.items.filter(function (it) { return has(it.item) && K.toNum(it.price) !== null; }).map(function (it) { return { date: it.date, item: String(it.item).trim(), qty: K.has(it.qty) ? K.toNum(it.qty) : 1, unit: it.unit, price: K.toNum(it.price), rate: +it.rate === 8 ? 8 : 10 }; });
    if (!items.length) { toast('品目と単価を入れてください'); return; }
    var o = d.editing ? docOf(d.editing) : null;
    if (!o) {
      o = { id: uid('i'), kind: d.kind, payments: [] };
      if (d.kind === 'est') { S.estSeq = (S.estSeq || 0) + 1; o.no = (S.me.estPrefix || 'M-') + pad4(S.estSeq); }
      else { S.invSeq = (S.invSeq || 0) + 1; o.no = (S.me.invPrefix || 'H-') + pad4(S.invSeq); }
      S.docs.push(o);
    }
    o.client = d.client; o.to = c.name; o.hon = c.hon || '御中'; o.issue = d.issue; o.items = items; o.wh = !!d.wh; o.job = d.job || ''; o.due = x.due; o.memo = '';
    (d.timeIds || []).forEach(function (tid) { var t = S.times.filter(function (y) { return y.id === tid; })[0]; if (t) t.billed = o.id; });
    var t = tot(o);
    log((o.kind === 'est' ? '見積：' : '請求：') + c.name + '・差引 ' + yen(t.net) + (o.kind === 'inv' ? '（期日 ' + K.md(D(o.due)) + '）' : ''));
    docNew = o.id; S.draft = { kind: o.kind, client: o.client, issue: o.issue, job: o.job, wh: o.wh, timeIds: [], editing: o.id, items: JSON.parse(JSON.stringify(o.items)) };
    commit(); toast((o.kind === 'est' ? '見積書 ' : '請求書 ') + o.no + ' を保存しました' + (o.kind === 'inv' ? '（支払期日 ' + K.mdw(D(o.due)) + '）' : ''));
  }

  // ================= 5) 入金 =================
  var payNew = null;
  RENDER.pay = function () {
    var rc = receivable(), pm = monthPaid(MK);
    var L = invs().slice().sort(function (a, b) { var pa = ps(a), pb = ps(b), ra = pa.rest > 0 ? 0 : 1, rb = pb.rest > 0 ? 0 : 1; return ra - rb || (ra ? D(b.issue) - D(a.issue) : (pa.due - pb.due)); });
    var h = '<div class="grid g4">';
    h += kpi('未入金の残り', cnt('p-r', rc.sum), 'bl', rc.n + '件', 'p-r', Math.min(1, rc.sum / Math.max(1, rc.sum + pm.sum)), 'bl');
    h += kpi('期日すぎ', cnt('p-l', rc.lateSum), rc.late ? 'rd' : '', rc.late ? '<span class="bad">' + rc.late + '件・取引先に確認を</span>' : 'なし', 'p-l', rc.sum ? rc.lateSum / rc.sum : 0);
    h += kpi('今月の入金', cnt('p-m', pm.sum), '', pm.n + '件', 'p-m', Math.min(1, pm.sum / Math.max(1, rc.sum + pm.sum)));
    var next = L.filter(function (d) { var p = ps(d); return p.rest > 0 && p.st !== 'late'; })[0], np = next ? ps(next) : null;
    h += kpi('次の入金期日', np ? '<span>' + K.mdw(np.due) + '</span>' : '<span>—</span>', 'bl', np ? esc(cname(next.client)) + '・' + yen(np.rest) : '未入金の請求はありません', 'p-n', np ? Math.max(.08, 1 - Math.max(0, np.left) / 30) : 0, 'bl');
    h += '</div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>01</b>請求書ごとの入金</h2><span class="tag">期日すぎは赤</span></div><div class="tw"><table id="payTbl"><thead><tr><th class="hide-n">番号</th><th>取引先</th><th>期日</th><th class="r hide-n">差引請求額</th><th class="r hide-n">入金済み</th><th class="r">残り</th><th>状態</th><th class="hide-n">入金日</th><th>入金額</th><th></th></tr></thead><tbody>';
    L.forEach(function (d) {
      var p = ps(d), done = p.rest <= 0;
      h += '<tr class="' + (d.id === payNew ? 'new' : p.st === 'late' ? 'late' : done ? 'paid' : '') + '"><td class="mono nowrap hide-n">' + esc(d.no) + '</td><td class="cn">' + esc(cname(d.client)) + '<small>' + esc(d.no) + '</small></td><td class="mono nowrap due">' + dd(d.due) + (p.st === 'late' ? '<small class="late-t">' + (-p.left) + '日すぎ</small>' : !done && p.left !== null ? '<small>あと' + p.left + '日</small>' : '') + '</td>';
      h += '<td class="r mono hide-n">' + yen(p.net) + '</td><td class="r mono hide-n">' + yen(p.got) + '</td><td class="r mono">' + (done ? '<span class="dim">0</span>' : '<b>' + yen(p.rest) + '</b>') + '</td><td class="nowrap">' + stTag(p) + '</td>';
      if (done) { var pl = d.payments || [], lp = pl[pl.length - 1]; h += '<td class="hide-n"></td><td class="mono nowrap">' + (lp ? K.md(D(lp.date)) + ' 入金' : '') + '</td><td></td>'; }
      else h += '<td class="hide-n"><input type="date" id="pdate-' + d.id + '" value="' + K.iso(TODAY) + '" style="width:128px"></td><td><input class="num" id="pamt-' + d.id + '" value="' + p.rest + '" style="width:88px"></td><td><button class="btn sm-b" id="pay-' + d.id + '" data-act="pay" data-id="' + d.id + '">入金を記録</button></td>';
      h += '</tr>';
    });
    h += '</tbody></table></div><p class="src mt">入金が差引請求額より少ないとき（振込手数料が引かれたなど）は「一部入金」として残ります。源泉徴収の分は、取引先が税務署に納めるので入金されません。</p></div>';
    // 入金の記録
    var P = []; invs().forEach(function (d) { (d.payments || []).forEach(function (p) { P.push({ d: d, p: p }); }); });
    P.sort(function (a, b) { return D(b.p.date) - D(a.p.date); });
    h += '<div class="panel mt feed"><div class="ph"><h2><b>02</b>入金の記録</h2></div><div class="list">';
    P.slice(0, 8).forEach(function (x) { h += '<div class="li"><span class="m">' + K.md(D(x.p.date)) + '</span><span class="x">' + esc(cname(x.d.client)) + '<small>' + esc(x.d.no) + '</small></span><span class="r">' + yen(n0(x.p.amt)) + '</span></div>'; });
    if (!P.length) h += '<p class="note">まだ入金の記録はありません。</p>';
    h += '</div></div>';
    $('#v-pay').innerHTML = h; animate($('#v-pay'));
  };
  function addPay(id) {
    var d = docOf(id); if (!d) return;
    var amt = Math.round(n0($('#pamt-' + id).value)), dt = $('#pdate-' + id).value || K.iso(TODAY);
    if (amt <= 0) { toast('入金額を入れてください'); return; }
    d.payments = (d.payments || []).concat([{ date: dt, amt: amt }]); payNew = id;
    var p = ps(d);
    log('入金：' + cname(d.client) + ' ' + yen(amt) + '（' + d.no + '）'); commit();
    toast(p.rest > 0 ? '入金を記録しました（残り ' + yen(p.rest) + '）' : '入金を記録しました（' + d.no + ' は入金済み）');
  }

  // ================= 6) 経費と家事按分 =================
  var exNew = null;
  RENDER.exp = function () {
    var h = '<div class="panel"><div class="ph"><h2><b>01</b>家事按分の割合</h2><span class="tag">家賃・通信費など、仕事と生活で使うもの</span></div><div class="tw"><table id="rlTbl"><thead><tr><th>名前</th><th>分け方</th><th>仕事の分</th><th>全体</th><th>単位</th><th>手入力（%）</th><th class="r">割合</th><th class="hide-n">根拠のメモ</th></tr></thead><tbody>';
    S.rules.forEach(function (r) {
      var q = K.ratio(r), man = r.basis === 'manual';
      h += '<tr><td><input data-bind="rl:' + r.id + ':name" value="' + esc(r.name) + '" style="min-width:110px"></td><td><select data-bind="rl:' + r.id + ':basis">' + opts([['area', '面積'], ['time', '時間'], ['usage', '使用量・回数'], ['manual', '手入力（%）']], r.basis) + '</select></td>';
      h += '<td><input class="num" style="width:64px" data-bind="rl:' + r.id + ':part" value="' + esc(r.part) + '"' + (man ? ' disabled' : '') + '></td><td><input class="num" style="width:64px" data-bind="rl:' + r.id + ':whole" value="' + esc(r.whole) + '"' + (man ? ' disabled' : '') + '></td>';
      h += '<td><input style="width:56px" data-bind="rl:' + r.id + ':unit" value="' + esc(r.unit) + '"' + (man ? ' disabled' : '') + '></td><td><input class="num" style="width:64px" data-bind="rl:' + r.id + ':pct" value="' + esc(r.pct) + '"' + (man ? '' : ' disabled') + '></td>';
      h += '<td class="r"><span class="rule-pct" id="rlPct-' + r.id + '">' + (q.err ? '<span class="err">' + esc(q.err) + '</span>' : K.pctText(q.pct)) + '</span></td><td class="hide-n"><input data-bind="rl:' + r.id + ':note" value="' + esc(r.note) + '" style="min-width:150px"></td></tr>';
    });
    h += '</tbody></table></div><div class="btns mt"><button class="ghost" data-act="rl-add">＋ 割合を足す</button><span class="note">面積・時間などの割合（仕事の分 ÷ 全体）か、手入力の%。経費にできる目安 ＝ 金額 × 割合（1円未満切り捨て）。家事按分 計算ツールと同じ考え方です。</span></div></div>';
    // 記録
    h += '<div class="panel mt"><div class="ph"><h2><b>NEW</b>経費を記録</h2><span class="tag">按分を選ぶと仕事の分を自動で計算</span></div><div class="form">';
    h += fld('日付', '<input type="date" id="exDate" value="' + K.iso(TODAY) + '">') + fld('内容', '<input id="exItem" placeholder="例：光回線">', 'wide') + fld('科目', '<select id="exAcc">' + opts(K.ACCS, '通信費') + '</select>');
    h += fld('金額（税込）', '<input id="exAmt" class="num" inputmode="numeric" placeholder="0">') + fld('家事按分', '<select id="exRule">' + opts([['', 'なし（全部仕事）']].concat(S.rules.map(function (r) { var q = K.ratio(r); return [r.id, r.name + '（' + K.pctText(q.pct) + '）']; })), '') + '</select>', 'wide');
    h += '<div class="btns"><button class="btn" id="exAdd" data-act="ex-add">記録する</button><span class="calc-line" id="exPrev"></span></div></div></div>';
    // 今月
    var L = monthExps(MK).slice().sort(function (a, b) { return D(b.date) - D(a.date) || (a.id < b.id ? 1 : -1); }), sa = 0, sb = 0;
    h += '<div class="grid g32 mt"><div class="panel"><div class="ph"><h2><b>02</b>今月の経費</h2><span class="tag">' + K.ymd(TODAY).m + '月</span></div><div class="tw"><table id="exTbl"><thead><tr><th>日付</th><th>内容</th><th class="hide-n">科目</th><th class="r">金額</th><th class="r">割合</th><th class="r">仕事の分</th><th></th></tr></thead><tbody>';
    L.forEach(function (e) {
      var b = expB(e), rl = S.rules.filter(function (r) { return r.id === e.rule; })[0]; sa += Math.round(n0(e.amt)); sb += b.biz;
      h += '<tr' + (e.id === exNew ? ' class="new"' : '') + '><td class="mono nowrap">' + K.md(D(e.date)) + '</td><td>' + esc(e.item) + (rl ? '<small>' + esc(rl.name) + '</small>' : '') + '</td><td class="hide-n">' + esc(e.acc) + '</td><td class="r mono">' + yen(n0(e.amt)) + '</td><td class="r mono">' + (rl ? K.pctText(b.pct) : '100%') + '</td><td class="r mono"><b>' + yen(b.biz) + '</b></td><td><button class="ghost sm" data-act="ex-del" data-id="' + e.id + '">消す</button></td></tr>';
    });
    h += '<tr class="sum"><td></td><td>合計</td><td class="hide-n"></td><td class="r mono">' + yen(sa) + '</td><td></td><td class="r mono">' + yen(sb) + '</td><td></td></tr></tbody></table></div></div>';
    var by = {}; L.forEach(function (e) { by[e.acc] = (by[e.acc] || 0) + expB(e).biz; });
    var ks = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }), mx = Math.max.apply(null, ks.map(function (k) { return by[k]; }).concat([1]));
    h += '<div class="panel st"><div class="ph"><h2><b>03</b>科目ごと（仕事の分）</h2></div><div class="hbars">';
    ks.forEach(function (k) { h += '<div class="row"><span>' + esc(k) + '</span><div class="tr"><i data-w="' + (by[k] / mx) + '" data-wk="ex' + k + '"></i></div><em>' + yen(by[k]) + '</em></div>'; });
    h += '</div><p class="src mt">割合は使った実態に合わせて決め、根拠をメモに残しておきます。' + TAX_LINE + '</p></div></div>';
    $('#v-exp').innerHTML = h; animate($('#v-exp')); exPreview();
  };
  function exPreview() {
    var el = $('#exPrev'); if (!el) return;
    var a = Math.round(n0($('#exAmt').value)), rid = $('#exRule').value;
    if (!a) { el.textContent = ''; return; }
    var b = K.expBiz({ amt: a, rule: rid }, S.rules);
    el.textContent = rid ? yen(a) + ' × ' + K.pctText(b.pct) + ' ＝ 仕事の分 ' + yen(b.biz) + '（私用 ' + yen(b.priv) + '）' : '仕事の分 ' + yen(a) + '（全部）';
  }
  function addExp() {
    var item = $('#exItem').value.trim(), a = Math.round(n0($('#exAmt').value));
    if (!item || a <= 0) { toast('内容と金額を入れてください'); return; }
    var e = { id: uid('x'), date: $('#exDate').value || K.iso(TODAY), item: item, acc: $('#exAcc').value, amt: a, rule: $('#exRule').value };
    S.exps.push(e); exNew = e.id; var b = expB(e);
    log('経費：' + item + ' ' + yen(a) + (e.rule ? '（仕事の分 ' + yen(b.biz) + '）' : '')); commit(); toast('経費を記録しました（仕事の分 ' + yen(b.biz) + '）');
  }

  // ================= 7) 設定 =================
  RENDER.set = function () {
    var m = S.me, ok = K.regNoOk(m.reg);
    var h = '<div class="grid g2"><div class="panel"><div class="ph"><h2><b>01</b>自分の情報（請求書に入る）</h2><span class="tag">見本は架空</span></div><div class="form">';
    h += fld('名前', '<input data-bind="me:name" value="' + esc(m.name) + '">') + fld('屋号', '<input data-bind="me:trade" value="' + esc(m.trade) + '">');
    h += fld('登録番号（T＋13けた）', '<input data-bind="me:reg" value="' + esc(m.reg) + '">') + fld('電話', '<input data-bind="me:tel" value="' + esc(m.tel) + '">');
    h += fld('住所', '<input data-bind="me:addr" value="' + esc(m.addr) + '">', 'wide') + fld('振込先', '<input data-bind="me:bank" value="' + esc(m.bank) + '">', 'wide');
    h += '</div><p class="mini mt" id="regOk">' + (ok ? '✓ 登録番号の形（T＋13けた）は合っています。' : '登録番号は T と13けたの数字で入れてください（請求書の6項目の1つです）。') + '</p></div>';
    h += '<div class="panel"><div class="ph"><h2><b>02</b>計算の決まり</h2></div><div class="form">';
    h += fld('消費税の端数処理', '<select data-bind="me:round">' + opts([['floor', '切り捨て'], ['round', '四捨五入'], ['ceil', '切り上げ']], m.round) + '</select>') + fld('目標の時給', '<input class="num" data-bind="me:goal" value="' + esc(m.goal || '') + '">');
    h += fld('請求書番号の頭', '<input data-bind="me:invPrefix" value="' + esc(m.invPrefix || 'H-') + '">') + fld('見積書番号の頭', '<input data-bind="me:estPrefix" value="' + esc(m.estPrefix || 'M-') + '">');
    h += '</div><ul class="chk mt">';
    h += '<li><i>1</i><span>源泉徴収：100万円以下は10.21%、超える部分は20.42%（＋102,100円）。1円未満切り捨て<small>国税庁 タックスアンサーNo.2795。令和9年1月以後も合計の税率は同じ</small></span></li>';
    h += '<li><i>2</i><span>源泉徴収の対象は、消費税と分けて書いた請求書なら税抜の額<small>国税庁 タックスアンサーNo.2795</small></span></li>';
    h += '<li><i>3</i><span>消費税は1枚の請求書につき税率ごとに1回だけ端数処理<small>国税庁「適格請求書等保存方式に関するQ&A」問57</small></span></li>';
    h += '<li><i>4</i><span>インボイスの記載事項6つ（相手の名前・自分の名前と登録番号・日付・内容・税率ごとの合計と税率・税率ごとの消費税）<small>国税庁「インボイス制度について」</small></span></li>';
    h += '<li><i>5</i><span>支払期日：締め日と支払サイト、土日祝・12/31〜1/3はずらす<small>支払期日の計算ツールと同じ。祝日は内閣府の2026年・2027年</small></span></li>';
    h += '</ul><p class="taxline">' + TAX_LINE + '</p></div></div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>03</b>バックアップ</h2><span class="tag">このブラウザの外に、ファイルで残す</span></div><div class="btns"><button class="btn" id="bkSave" data-act="bk-save">バックアップを保存（.json）</button><button class="btn st" id="bkLoad" data-act="bk-load">バックアップから戻す</button><button class="ghost" data-act="reset">見本データに戻す</button></div>';
    h += '<p class="src mt">データはこのブラウザ（localStorage）にだけあります。ブラウザのデータを消すと消えるので、ときどきバックアップを保存してください。戻すと今の入力は置き換わります。</p></div>';
    $('#v-set').innerHTML = h;
  };
  function backupSave() {
    try {
      var o = ymdStr(TODAY), blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), u = URL.createObjectURL(blob), ln = document.createElement('a');
      ln.href = u; ln.download = 'フリーランススタジオ_バックアップ_' + o + '.json'; document.body.appendChild(ln); ln.click();
      setTimeout(function () { URL.revokeObjectURL(u); ln.remove(); }, 3000); toast('バックアップを保存しました');
    } catch (e) { toast('保存できませんでした'); }
  }
  function ymdStr(n) { return K.iso(n).replace(/-/g, ''); }
  function backupLoad(file) {
    var fr = new FileReader();
    fr.onload = function () {
      var o; try { o = JSON.parse(String(fr.result)); } catch (e) { toast('バックアップのファイルとして読めませんでした'); return; }
      if (!valid(o)) { toast('このスタジオのバックアップではないようです'); return; }
      if (!window.confirm('今の入力を、バックアップの内容に置き換えますか？')) return;
      S = o; shown = {}; save(); $('#coName').textContent = S.me.trade || S.me.name; go(view); toast('バックアップから戻しました');
    };
    fr.readAsText(file);
  }

  // ================= 入力の受け取り =================
  function onBind(el, final) {
    var b = el.getAttribute('data-bind').split(':'), v = el.value;
    switch (b[0]) {
      case 'me': {
        var k = b[1]; S.me[k] = k === 'goal' ? Math.round(n0(v)) : v;
        if (k === 'trade') $('#coName').textContent = v || S.me.name;
        if (k === 'reg') { var rk = $('#regOk'); if (rk) rk.textContent = K.regNoOk(v) ? '✓ 登録番号の形（T＋13けた）は合っています。' : '登録番号は T と13けたの数字で入れてください（請求書の6項目の1つです）。'; }
        save(); return;
      }
      case 'cl': {
        var c = client(b[1]), f = b[2];
        if (f === 'close') c.close = v === 'end' || v === 'none' ? v : +v;
        else if (f === 'n') c.n = Math.max(1, Math.round(n0(v))) || 1;
        else if (f === 'wh') c.wh = v === '1';
        else c[f] = v;
        save(); if (final) render(); return;
      }
      case 'jb': { var j = job(b[1]), g = b[2]; if (g === 'price' || g === 'rate') j[g] = Math.round(n0(v)); else j[g] = v; save(); if (final) render(); return; }
      case 'rl': {
        var r = S.rules.filter(function (x) { return x.id === b[1]; })[0]; r[b[2]] = v; save();
        if (final) render(); else { var q = K.ratio(r), pe = $('#rlPct-' + r.id); if (pe) pe.innerHTML = q.err ? '<span class="err">' + esc(q.err) + '</span>' : K.pctText(q.pct); }
        return;
      }
      case 'ln': { var it = S.draft.items[+b[1]]; it[b[2]] = b[2] === 'rate' ? +v : v; save(); refreshInv(); return; }
      case 'dr': {
        var d = S.draft, k2 = b[1];
        if (k2 === 'client') { d.client = v; var cc = client(v); d.wh = !!(cc && cc.wh); d.job = ''; }
        else if (k2 === 'wh') d.wh = v === '1';
        else if (k2 === 'job') { d.job = v; var jj = job(v); if (jj && jj.kind === 'fixed' && d.items.length === 1 && !has(d.items[0].item) && !has(d.items[0].price)) { d.items[0].item = jj.name; d.items[0].price = jj.price; } }
        else d[k2] = v;
        save(); if (final) render(); else refreshInv(); return;
      }
    }
  }
  document.addEventListener('input', function (ev) {
    var el = ev.target;
    if (el.id === 'exAmt') { exPreview(); return; }
    if (!el.getAttribute || !el.hasAttribute('data-bind')) return;
    if (el.tagName === 'SELECT' || el.type === 'date') return; // change で受ける
    onBind(el, false);
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target; if (!el.getAttribute) return;
    if (el.id === 'bkFile') { if (el.files && el.files[0]) backupLoad(el.files[0]); el.value = ''; return; }
    if (el.id === 'exRule' || el.id === 'exAmt') { exPreview(); return; }
    if (el.id === 'tmJob') { tmJob = el.value; var j = job(tmJob), p = $('#tmPrev'); if (p) p.textContent = j && j.kind === 'hourly' ? '時給 ' + yen(j.rate) : '固定の案件（実質時給の計算に使います）'; return; }
    if (!el.hasAttribute('data-bind')) return;
    var bk = el.getAttribute('data-bind');
    // 明細の行（日付・税率）は再描画しない（入力中のカーソルを守る）
    if (/^ln:/.test(bk)) { onBind(el, false); return; }
    onBind(el, true);
  });
  document.addEventListener('click', function (ev) {
    var nb = ev.target.closest && ev.target.closest('#nav button'); if (nb) { go(nb.getAttribute('data-view')); return; }
    var b = ev.target.closest && ev.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'TEXTAREA' || b.tagName === 'INPUT') return;
    if (b.disabled) return;
    var a = b.getAttribute('data-act'), id = b.getAttribute('data-id');
    switch (a) {
      case 'reset':
        if (!DEMO && !window.confirm('今の入力を消して、見本データ（架空）に戻しますか？')) return;
        S = fresh(); shown = {}; clNew = jbNew = tmNew = docNew = payNew = exNew = null; save(); $('#coName').textContent = S.me.trade; go(view); toast('見本データに戻しました'); return;
      case 'cl-add': addClient(); return;
      case 'jb-add': addJob(); return;
      case 'tm-add': addTime(); return;
      case 'tm-del': S.times = S.times.filter(function (t) { return t.id !== id; }); commit(); return;
      case 'tm-bill': billTimes(id); return;
      case 'dk': { var k = b.getAttribute('data-k'); if (S.draft.kind !== k) { S.draft.kind = k; S.draft.editing = ''; S.draft.timeIds = []; } commit(); return; }
      case 'iv-new': S.draft = newDraft(S.draft ? S.draft.kind : 'inv'); docNew = null; commit(); return;
      case 'ln-add': S.draft.items.push({ date: S.draft.issue, item: '', qty: 1, unit: '式', price: '', rate: 10 }); commit(); return;
      case 'ln-del': S.draft.items.splice(+b.getAttribute('data-i'), 1); commit(); return;
      case 'iv-issue': issueDoc(); return;
      case 'doc-open': { var o = docOf(id); S.draft = { kind: o.kind, client: o.client, issue: o.issue, job: o.job || '', wh: !!o.wh, timeIds: [], editing: o.id, items: JSON.parse(JSON.stringify(o.items)) }; docNew = o.id; commit(); $('#main').scrollTop = 0; return; }
      case 'est-inv': { var e = docOf(id), c = client(e.client); S.draft = { kind: 'inv', client: e.client, issue: K.iso(TODAY), job: e.job || '', wh: !!(c && c.wh), timeIds: [], editing: '', items: JSON.parse(JSON.stringify(e.items)).map(function (it) { it.date = K.iso(TODAY); return it; }) }; docNew = null; commit(); $('#main').scrollTop = 0; toast('見積の明細で請求書を作りました（まだ保存していません）'); return; }
      case 'pay': addPay(id); return;
      case 'rl-add': S.rules.push({ id: uid('r'), name: '新しい割合', basis: 'manual', part: '', whole: '', unit: '', pct: '50', note: '' }); commit(); return;
      case 'ex-add': addExp(); return;
      case 'ex-del': S.exps = S.exps.filter(function (e) { return e.id !== id; }); commit(); return;
      case 'bk-save': backupSave(); return;
      case 'bk-load': $('#bkFile').click(); return;
      case 'print': window.print(); return;
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
    return moveTo(el).then(function () { ripple(); el.classList.add('typing'); return wait(240); }).then(function () { el.value = v; el.classList.remove('typing'); el.dispatchEvent(new Event('change', { bubbles: true })); return wait(140); });
  }
  function nav(v) { return click('#nav button[data-view="' + v + '"]').then(function () { return wait(160); }); }
  function pulse(k) { flowPulse = k; flowPulseT = now(); }
  function runDemo() {
    demoOn = true; curInit();
    var payTarget = null;
    wait(1100)
      .then(function () { pulse(2); return nav('time'); })
      .then(function () { return pick('#tmJob', 'j4'); })
      .then(function () { return type('#tmHours', '3.5', 60); })
      .then(function () { return type('#tmMemo', '検索画面の改修', 34); })
      .then(function () { return click('#tmAdd'); })
      .then(function () { return moveTo($('#tmUnbilled'), 420); })
      .then(function () { return wait(1200); })
      .then(function () { pulse(3); return nav('inv'); })
      .then(function () { return pick('#ivClient', 'c1'); })
      .then(function () { return type('#ivItem-0', 'ロゴ制作 残金（50%）', 34); })
      .then(function () { return type('#ivPrice-0', '150000', 70); })
      .then(function () { return moveTo($('#invTot .r.wh') || $('#invTot'), 420); })
      .then(function () { return wait(1500); })
      .then(function () { return moveTo($('#ivDue'), 360); })
      .then(function () { return wait(1100); })
      .then(function () { return click('#ivIssueBtn'); })
      .then(function () { return wait(700); })
      .then(function () {
        pulse(4);
        var L = invs().filter(function (d) { var p = ps(d); return p.rest > 0 && p.st !== 'late'; }).sort(function (a, b) { return D(a.due) - D(b.due); });
        payTarget = L[0] ? L[0].id : null; return nav('pay');
      })
      .then(function () { return payTarget ? click('#pay-' + payTarget) : null; })
      .then(function () { return wait(1100); })
      .then(function () { pulse(5); return nav('exp'); })
      .then(function () { return type('#exItem', 'スマホの機種代（分割）', 30); })
      .then(function () { return type('#exAmt', '3300', 70); })
      .then(function () { return pick('#exRule', 'r4'); })
      .then(function () { return wait(700); })
      .then(function () { return click('#exAdd'); })
      .then(function () { return wait(900); })
      .then(function () { pulse(0); return nav('dash'); })
      .then(function () { return wait(2600); })
      .then(function () { cur.el.style.display = 'none'; demoOn = false; window.__studio.demoDone = true; });
  }

  // ================= 起動 =================
  S = load();
  if (S.me.goal === undefined) S.me.goal = 5000;
  $('#coName').textContent = S.me.trade || S.me.name;
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
