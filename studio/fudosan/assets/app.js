/* 不動産スタジオ：画面の部分。計算は logic.js（Excel版と同じルール）、見本は data.js。
   データは localStorage だけに保存（外部送信なし）。動きは requestAnimationFrame（30コマ/秒まで、見えないときは止める）。
   ?demo=1 … 反響を入れて連絡→媒介契約を結ぶ（レインズの期限が出る）→申込を記録→契約書の下書き→決済の予定→ダッシュボード を自動で操作（保存しない）
   ?capture=1 … 時計を外から進める（window.__studio.advance(ms)）。録画でコマ落ちしないように
   ?today=2026-10-22 … 「今日」を固定（見本・録画用） */
(function () {
  'use strict';
  var K = window.FL, DATA = window.FDATA;
  var Q = new URLSearchParams(location.search);
  var DEMO = Q.get('demo') === '1', CAPTURE = Q.get('capture') === '1';
  if (DEMO || CAPTURE) document.documentElement.classList.add('is-demo');
  var KEY = 'fudosan-studio-v1';
  var TODAY = K.D(Q.get('today')) || K.todayN();
  var MK = K.ym(TODAY);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var yen = K.yen, pct = K.pct, n0 = K.n0, has = K.has, D = K.D;
  var NO_SPECIAL = '<div class="warnbox mt"><b>注意</b>権利金・長期の空家等の特例は計算していません。該当するときは告示と専門家で確認を。</div>';
  var DRAFT_NOTE = '契約書・重要事項説明書はどちらも「下書き」です。宅地建物取引士が内容を確認してから使ってください。法令・告示・標準約款は改正されるので、最新の内容は国土交通省・e-Gov法令検索などの公的情報で確認してください。';

  // ================= 保存 =================
  var S, storageOk = true;
  function fresh() { return DATA.sample(TODAY); }
  function load() {
    if (DEMO) return fresh();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw); if (o && o.v === 1 && o.company && o.leads && o.baikai && o.leases) return o; }
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
  function uid(p) { S.seq = (S.seq || 2000) + 1; return p + S.seq; }
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
  var FMT = { yen: function (v) { return yen(Math.round(v)); }, pct: function (v) { return pct(v); }, n: function (v) { return K.num(Math.round(v)); } };
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
  var PILL = { '専属専任': 'acc', '専任': 'info', '一般': 'mut', '契約': 'ok', '決済済み': 'ok', '申込': 'warn', '失注': 'mut', '新規': 'bad', '追客中': 'info', '来店予約': 'warn', '来店済み': 'ok', '保留': 'mut', '確認済み': 'ok', '要注意': 'bad', '対象外': 'mut', '未確認': 'mut', '普通借家': 'info', '定期借家': 'acc', '案内': 'info', '成約': 'ok', '公開中': 'info', '書面による購入申込みあり': 'warn', '売主都合で一時紹介停止中': 'mut', '下書き': 'warn' };
  function pill(st) { return st ? '<span class="pill ' + (PILL[st] || 'mut') + '">' + esc(st) + '</span>' : ''; }
  function dd(n) { return n === null || n === undefined || n === '' ? '<span class="dim">—</span>' : K.mdw(D(n)); }

  // ================= 集計（アプリ全体） =================
  var C = function () { return S.company; };
  function cal() { var c = C(); return K.makeCal({ off: c.off, holidays: c.holidays, extra: K.parseDates(c.extra) }); }
  function prop(id) { return S.props.filter(function (p) { return p.id === id; })[0]; }
  function lead(id) { return S.leads.filter(function (l) { return l.id === id; })[0]; }
  function bk(id) { return S.baikai.filter(function (m) { return m.id === id; })[0]; }
  function deal(id) { return S.deals.filter(function (x) { return x.id === id; })[0]; }
  function lease(id) { return S.leases.filter(function (x) { return x.id === id; })[0]; }
  function activeBk(pid) { return S.baikai.filter(function (m) { return m.prop === pid && !m.closed; })[0]; }
  function bkInfo(m) { return K.baikaiCheck(m, TODAY, cal(), { startNext: C().startNext }); }
  function lt(l) { return K.leadTask(l, TODAY, n0(C().gap) || 14); }
  function leaseInfo(l) { return K.leaseCalc(l, TODAY, { renewMonths: n0(C().renewMonths), soon: n0(C().soon) }); }
  function fee(d) { return K.dealFee(d, C().taxRate); }
  function feeCap(d) { return K.dealFeeCap(d, C().taxRate); }
  function pname(id) { var p = prop(id); return p ? p.name.replace(/^サンプル：/, '') : ''; }
  function dealName(d) { return d.prop ? pname(d.prop) : (d.name || '').replace(/^サンプル：/, ''); }
  function months6() { var out = []; for (var i = 5; i >= 0; i--) out.push(K.ym(K.addMonths(TODAY, -i))); return out; }
  // 今日やること：反響（A）・媒介（I）・賃貸の更新（D）・案内の予定
  function tasks() {
    var out = [];
    S.leads.forEach(function (l) {
      var t = lt(l); if (!t.text) return;
      out.push({ v: 'lead', id: l.id, kind: '追客', who: l.name, text: t.text, lvl: K.leadLevel(l, t, n0(C().firstGoal)), due: D(l.next) !== null ? D(l.next) : D(l.date) });
    });
    S.baikai.forEach(function (m) {
      var r = bkInfo(m);
      r.msgs.forEach(function (x) {
        var due = /登録/.test(x.t) ? r.reg : /業務報告/.test(x.t) ? r.nextRep : /満了|有効期間/.test(x.t) ? r.expiry : TODAY;
        out.push({ v: 'baikai', id: m.id, kind: '媒介', who: pname(m.prop), text: x.t + (/業務報告（/.test(x.t) && r.repAdvance ? '・休業日なので ' + K.md(r.repAdvance) + ' までに' : ''), lvl: x.lvl, due: due });
      });
    });
    S.leases.forEach(function (l) {
      var r = leaseInfo(l); if (!r.text) return;
      out.push({ v: 'lease', id: l.id, kind: '更新', who: l.bld.replace(/（架空）/, '') + ' ' + l.room, text: r.text, lvl: r.lvl, due: r.fEnd !== null ? (/通知の期間に入ります/.test(r.text) ? r.fStart : r.fEnd) : r.end });
    });
    S.visits.forEach(function (v) {
      var d0 = D(v.date); if (v.type !== '案内' || d0 < TODAY || d0 > TODAY + 2) return;
      var l = lead(v.lead); out.push({ v: 'visit', id: v.id, kind: '案内', who: (l ? l.name : ''), text: '案内の予定 ' + K.mdw(d0) + '・' + pname(v.prop), lvl: 'info', due: d0 });
    });
    var rank = { bad: 0, warn: 1, info: 2 };
    out.sort(function (a, b) { return (rank[a.lvl] - rank[b.lvl]) || ((a.due || 0) - (b.due || 0)); });
    return out;
  }
  function inMonth(s, m) { return has(s) && K.ym(D(s)) === m; }
  function monthDeals(m) { return S.deals.filter(function (d) { return d.status !== '申込' && inMonth(d.contract, m); }); }
  function feeMonth(m) { var L = S.deals.filter(function (d) { return d.status !== '申込' && inMonth(d.settle, m); }); var got = 0, exp = 0; L.forEach(function (d) { if (d.paid) got += n0(d.paid.amt); else exp += fee(d); }); return { list: L, got: got, exp: exp, sum: got + exp }; }
  var view = 'dash', RENDER = {};
  var TITLES = { dash: 'ダッシュボード', lead: '反響・追客', survey: '物件調査', baikai: '媒介契約（期限・報酬）', visit: '案内・申込', draft: '契約書・重説（下書き）', settle: '決済・報酬', lease: '賃貸の更新', sim: '収支シミュレーション', set: '設定' };
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
  var FLOW_X = [36, 106, 176, 246, 316, 386, 456, 526];
  RENDER.dash = function () {
    var el = $('#v-dash'), T = tasks(), bad = T.filter(function (x) { return x.lvl === 'bad'; }).length;
    var regs = S.baikai.filter(function (m) { return !m.closed && K.isSen(m.kind) && !has(m.reins); }).map(function (m) { return { m: m, r: bkInfo(m) }; }).filter(function (x) { return x.r.reg !== null; }).sort(function (a, b) { return a.r.reg - b.r.reg; });
    var md0 = monthDeals(MK), fm = feeMonth(MK), fp = feeMonth(K.ym(K.addMonths(TODAY, -1)));
    var h = '<div class="grid g4">';
    h += kpi('今日やること', cnt('d-t', T.length, 'n') + '<small>件</small>', bad ? 'rd' : '', bad ? '<span class="bad">期限切れ・連絡もれ ' + bad + '件</span>' : '期限切れなし', 'k-t', Math.min(1, T.length / 15));
    var rg = regs[0], rgDays = rg ? rg.r.reg - TODAY : null;
    h += kpi('レインズ登録の期限', rg ? (rgDays < 0 ? '<span>' + (-rgDays) + '日過ぎ</span>' : rgDays === 0 ? '<span>今日</span>' : '<span>あと' + rgDays + '日</span>') : '<span>—</span>', rg && rgDays <= 0 ? 'rd' : 'sk', rg ? esc(pname(rg.m.prop)) + '・' + K.mdw(rg.r.reg) + '（' + rg.m.kind + '）' : '登録待ちの専任媒介はありません', 'k-r', rg ? Math.max(0.08, 1 - Math.max(0, rgDays) / 7) : 0, 'sk');
    h += kpi('今月の成約', cnt('d-c', md0.length, 'n') + '<small>件</small>', 'gr', '売買 ' + md0.filter(function (d) { return d.kind === '売買'; }).length + '件・賃貸 ' + md0.filter(function (d) { return d.kind === '賃貸'; }).length + '件（契約日）', 'k-c', Math.min(1, md0.length / 5));
    h += kpi('今月の報酬見込み（税込）', cnt('d-f', fm.sum), 'gr', '受領 ' + yen(fm.got) + '・これから ' + yen(fm.exp), 'k-f', Math.min(1, fm.sum / Math.max(1, fm.sum, fp.sum * 1.6)));
    h += '</div>';
    // FLOW
    var open = S.leads.filter(function (l) { return K.LEAD_OPEN.indexOf(l.status) >= 0; }).length;
    var sv = S.props.map(function (p) { return K.surveyProgress(p, DATA.ITEMS); }), svAll = sv.reduce(function (a, x) { return a + x.total; }, 0), svDone = sv.reduce(function (a, x) { return a + x.done; }, 0);
    var flow = [
      { lab: '反響', v: S.leads.filter(function (l) { return inMonth(l.date, MK); }).length, f: 'n', u: '件' },
      { lab: '追客', v: open, f: 'n', u: '人' },
      { lab: '物件調査', v: svAll ? Math.round(svDone / svAll * 100) : 0, f: 'n', u: '%' },
      { lab: '媒介', v: S.baikai.filter(function (m) { return !m.closed; }).length, f: 'n', u: '件' },
      { lab: '案内・申込', v: S.visits.filter(function (v) { return inMonth(v.date, MK); }).length, f: 'n', u: '件' },
      { lab: '契約', v: md0.length, f: 'n', u: '件' },
      { lab: '決済・報酬', v: Math.round(fm.sum / 10000), f: 'n', u: '万' },
      { lab: '賃貸の更新', v: S.leases.filter(function (l) { return leaseInfo(l).text; }).length, f: 'n', u: '件' }
    ];
    h += '<div class="panel flow mt"><div class="ph"><h2><b>FLOW</b>反響 → 追客 → 物件調査 → 媒介 → 案内・申込 → 契約 → 決済・報酬 → 賃貸の更新</h2><span class="tag">' + K.ymd(TODAY).m + '月</span></div>';
    h += '<svg viewBox="0 0 562 96" id="flowSvg" role="img" aria-label="反響から賃貸の更新までのつながり">';
    h += '<defs><linearGradient id="fl" x1="0" x2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs>';
    h += '<line x1="36" y1="34" x2="526" y2="34" stroke="#1f2541" stroke-width="6" stroke-linecap="round"/>';
    h += '<line x1="36" y1="34" x2="526" y2="34" stroke="url(#fl)" stroke-width="2" stroke-linecap="round" opacity=".9"/>';
    for (var j = 0; j < 10; j++) h += '<circle class="fd" r="2.6" cy="34" cx="36" fill="#fff"/><circle class="fh" r="7" cy="34" cx="36" fill="#a78bfa" opacity=".22"/>';
    flow.forEach(function (f, i) {
      var x = FLOW_X[i];
      h += '<circle class="fn" cx="' + x + '" cy="34" r="13" fill="#080a16" stroke="' + (i < 4 ? '#a78bfa' : '#38bdf8') + '" stroke-width="2"/>';
      h += '<circle class="fr" cx="' + x + '" cy="34" r="13" fill="none" stroke="#fff" stroke-width="1.5" opacity="0"/>';
      h += '<text x="' + x + '" y="38" text-anchor="middle" font-family="JetBrains Mono" font-size="11" fill="#fff">' + (i + 1) + '</text>';
      h += '<text class="nlab" x="' + x + '" y="66" text-anchor="middle">' + f.lab + '</text>';
      h += '<text class="ncnt" x="' + x + '" y="84" text-anchor="middle"><tspan data-k="f-' + i + '" data-v="' + f.v + '" data-f="' + f.f + '"></tspan>' + f.u + '</text>';
    });
    h += '</svg></div>';
    // 今日やること・14日間の期限
    h += '<div class="grid g32 mt">';
    h += '<div class="panel" id="dashTasks"><div class="ph"><h2><b>01</b>今日やること</h2><span class="tag">期限切れ → 期限の近い順</span></div><div class="list">';
    T.slice(0, 9).forEach(function (x) {
      var dl = x.due !== null && x.due !== undefined ? x.due - TODAY : null;
      h += '<div class="li tk" data-go="' + x.v + '"><span class="days ' + (x.lvl === 'bad' ? 'bad' : x.lvl === 'warn' ? 'warn' : 'ok') + '">' + (dl === null ? '' : dl === 0 ? '今日' : (dl > 0 ? '+' : '') + dl + '日') + '</span><span class="kd k-' + x.v + '">' + x.kind + '</span><span class="x">' + esc(x.text) + '<small>' + esc(x.who) + '</small></span></div>';
    });
    if (!T.length) h += '<p class="note">今日やることはありません。</p>';
    if (T.length > 9) h += '<p class="note">ほか ' + (T.length - 9) + '件（各画面で確認できます）</p>';
    h += '</div></div>';
    h += '<div class="panel st"><div class="ph"><h2><b>02</b>これからの期限（14日）</h2><span class="tag">' + K.md(TODAY) + '〜</span></div>' + strip14() + '</div></div>';
    // 反響と契約（6か月）・媒介の状況
    var ms = months6(), st = ms.map(function (m) { var L = S.leads.filter(function (l) { return inMonth(l.date, m); }); return { m: m, n: L.length, won: L.filter(function (l) { return l.status === '契約'; }).length, fee: feeMonth(m).sum }; });
    var mx = Math.max.apply(null, st.map(function (x) { return x.n; }).concat([1]));
    h += '<div class="grid g2 mt">';
    h += '<div class="panel"><div class="ph"><h2><b>03</b>反響と成約（6か月）</h2><div class="legend"><span><i style="background:#a78bfa"></i>反響</span><span><i style="background:#38bdf8"></i>成約</span></div></div><div class="chart">';
    st.forEach(function (m, i) {
      h += '<div class="col' + (i === 5 ? ' now' : '') + '"><span class="pf">' + (m.n ? Math.round(m.won / m.n * 100) + '%' : '—') + '</span><div class="bars"><div class="bar b1" data-h="' + (m.n / mx) + '" data-hk="dn' + i + '" title="反響 ' + m.n + '件"></div><div class="bar b2" data-h="' + (m.won / mx) + '" data-hk="dw' + i + '" title="成約 ' + m.won + '件"></div></div><span class="m">' + K.ymd(D(m.m + '-01')).m + '月</span></div>';
    });
    h += '</div><p class="src">上の数字は成約率（成約÷反響）。反響の月で数えています（Excel版「反響・追客管理表」の集計と同じ）。</p></div>';
    h += '<div class="panel st"><div class="ph"><h2><b>04</b>媒介契約の状況</h2><span class="tag">有効期間の経過</span></div><div class="prog">';
    S.baikai.filter(function (m) { return !m.closed; }).forEach(function (m) {
      var r = bkInfo(m), tot = r.expiry - D(m.date) + 1, used = Math.max(0, Math.min(1, (TODAY - D(m.date) + 1) / tot));
      h += '<div class="row' + (r.msgs.some(function (x) { return x.lvl === 'bad'; }) ? ' alert' : '') + '"><div class="t"><span>' + pill(m.kind) + ' ' + esc(pname(m.prop)) + '</span><em>満了 ' + K.md(r.expiry) + '・あと' + r.remain + '日</em></div><div class="track"><i data-w="' + used + '" data-wk="bk' + m.id + '"></i></div><div class="t2">' + (K.isSen(m.kind) ? (has(m.reins) ? '<span class="okc">✓ レインズ登録 ' + K.md(D(m.reins)) + '</span>' : '<span class="wc">レインズ登録 期限 ' + K.mdw(r.reg) + '</span>') + '・次の報告 ' + K.md(r.nextRep) : '一般媒介（レインズ登録・定期報告の義務なし）') + '</div></div>';
    });
    h += '</div></div></div>';
    h += '<div class="panel mt feed"><div class="ph"><h2><b>05</b>最近の動き</h2></div><div class="list">';
    S.log.slice(0, 5).forEach(function (l) { h += '<div class="li"><span class="m">' + esc(K.md(D(l.t))) + '</span><span class="x">' + esc(l.msg) + '</span></div>'; });
    h += '</div></div>';
    el.innerHTML = h;
    flowEls = { d: $$('.fd', el), h: $$('.fh', el), r: $$('.fr', el) };
    animate(el);
  };
  function strip14() {
    var cl = cal(), ev = {};
    function add(n, cls, t) { if (n === null || n === undefined || n < TODAY || n > TODAY + 13) return; (ev[n] = ev[n] || []).push([cls, t]); }
    S.baikai.forEach(function (m) { if (m.closed) return; var r = bkInfo(m); if (K.isSen(m.kind) && !has(m.reins)) add(r.reg, 'e-reg', 'レインズ ' + pname(m.prop)); if (K.isSen(m.kind)) add(r.repAdvance || r.nextRep, 'e-rep', '業務報告 ' + pname(m.prop)); add(r.expiry, 'e-exp', '媒介満了 ' + pname(m.prop)); });
    S.leads.forEach(function (l) { if (K.LEAD_OPEN.indexOf(l.status) >= 0) add(D(l.next), 'e-lead', '連絡 ' + l.name.replace(/様（架空）/, '様')); });
    S.visits.forEach(function (v) { var l = lead(v.lead); if (v.type === '案内') add(D(v.date), 'e-vis', '案内 ' + (l ? l.name.replace(/様（架空）/, '様') : '')); });
    S.deals.forEach(function (d) { if (d.status === '契約' && !d.paid) add(D(d.settle), 'e-set', '決済 ' + dealName(d)); });
    S.leases.forEach(function (l) { var r = leaseInfo(l); add(r.notice, 'e-lse', '更新案内 ' + l.room); add(r.fEnd, 'e-lse', '定期借家 通知締切 ' + l.room); });
    var h = '<div class="agenda">', shownN = 0;
    for (var i = 0; i < 14 && shownN < 8; i++) {
      var n = TODAY + i, off = K.offReason(n, cl), e = ev[n] || [];
      if (!e.length && i) continue;
      shownN++;
      h += '<div class="ag' + (i === 0 ? ' today' : '') + (off ? ' off' : '') + '"><span class="agd"><b>' + K.md(n) + '</b>' + K.WD[K.wday(n)] + (i === 0 ? '<small>今日</small>' : off ? '<small class="offc">休業日</small>' : '<small>' + i + '日後</small>') + '</span><span class="age">';
      e.forEach(function (x) { h += '<em class="' + x[0] + '">' + esc(x[1]) + '</em>'; });
      if (!e.length) h += '<span class="note">期限なし</span>';
      h += '</span></div>';
    }
    h += '</div><div class="legend mt"><span><i class="e-reg"></i>レインズ登録</span><span><i class="e-rep"></i>業務報告</span><span><i class="e-lead"></i>追客</span><span><i class="e-vis"></i>案内</span><span><i class="e-set"></i>決済</span><span><i class="e-lse"></i>賃貸</span></div>';
    return h;
  }
  var flowPulse = -1, flowPulseT = 0;
  function drawFlow(t) {
    if (!flowEls || !flowEls.d.length || !document.body.contains(flowEls.d[0])) { flowEls = null; return; }
    var L = 490, n = flowEls.d.length, N = FLOW_X.length, near = [0, 0, 0, 0, 0, 0, 0, 0];
    for (var i = 0; i < n; i++) {
      var p = ((t / 5200) + i / n) % 1, x = 36 + p * L;
      flowEls.d[i].setAttribute('cx', x.toFixed(1)); flowEls.h[i].setAttribute('cx', x.toFixed(1));
      flowEls.h[i].setAttribute('fill', p < .5 ? '#a78bfa' : '#38bdf8');
      for (var k = 0; k < N; k++) { var d0 = Math.abs(x - FLOW_X[k]); if (d0 < 14) near[k] = Math.max(near[k], 1 - d0 / 14); }
    }
    for (var k2 = 0; k2 < N; k2++) {
      var on = flowPulse === k2 ? Math.max(0, 1 - (t - flowPulseT) / 1400) : 0, a = Math.max(near[k2] * .6, on);
      flowEls.r[k2].setAttribute('opacity', a.toFixed(2)); flowEls.r[k2].setAttribute('r', (13 + a * 7).toFixed(1));
    }
  }

  // ================= 2) 反響・追客 =================
  var ldOnly = 'open', ldNew = null;
  RENDER.lead = function () {
    var c = C(), names = S.leads.map(function (l) { return l.staff; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; });
    var h = '<div class="panel"><div class="ph"><h2><b>NEW</b>新しい反響（問い合わせ）</h2><span class="tag">入れると「今日やること」に出ます</span></div><div class="form">';
    h += fld('反響日', '<input type="date" id="ldDate" value="' + K.iso(TODAY) + '">') + fld('反響元', '<select id="ldSrc">' + opts(DATA.SOURCES, '自社サイト') + '</select>') + fld('売買／賃貸', '<select id="ldKind">' + opts(['売買', '賃貸'], '賃貸') + '</select>');
    h += fld('お客様名', '<input id="ldName" placeholder="例：山田様">') + fld('希望・物件', '<input id="ldWant" placeholder="例：2LDK・駅10分以内">', 'wide') + fld('担当', '<select id="ldStaff">' + opts(DATA.STAFF, '担当A') + '</select>');
    h += '<div class="btns"><button class="btn" id="ldAdd" data-act="ld-add">反響を追加</button></div></div></div>';
    var L = S.leads.filter(function (l) { return ldOnly === 'all' || K.LEAD_OPEN.indexOf(l.status) >= 0 || l.id === ldNew; }).map(function (l) { return { l: l, t: lt(l) }; });
    L.sort(function (a, b) { return (b.t.text ? 1 : 0) - (a.t.text ? 1 : 0) || D(b.l.date) - D(a.l.date); });
    h += '<div class="panel mt"><div class="ph"><h2><b>01</b>反響一覧</h2><div class="btns"><select id="ldOnly" class="sm">' + opts([['open', '追客中の人だけ'], ['all', 'すべて（終わった人も）']], ldOnly) + '</select></div></div><div class="tw"><table id="ldTbl"><thead><tr><th>反響日</th><th>反響元</th><th>お客様・希望</th><th>担当</th><th>状態</th><th>初回</th><th>最後の連絡</th><th>次の予定</th><th>今日やること</th><th></th></tr></thead><tbody>';
    L.slice(0, 40).forEach(function (x) {
      var l = x.l, t = x.t, lv = K.leadLevel(l, t, n0(c.firstGoal));
      h += '<tr class="' + (l.id === ldNew ? 'new ' : '') + (lv === 'bad' ? 's-bad' : lv === 'warn' ? 's-warn' : (l.status === '失注' || l.status === '契約') ? 'done' : '') + '"><td class="mono">' + K.md(D(l.date)) + '<small>' + t.days + '日前</small></td><td>' + esc(l.src) + '<small>' + l.kind + '</small></td><td>' + esc(l.name) + '<small>' + esc(l.want) + '</small></td><td>' + esc(l.staff) + '</td>';
      h += '<td><select data-ls="' + l.id + '" class="sm">' + opts(K.LEAD_ST, l.status) + '</select></td><td class="mono">' + (has(l.first) ? K.md(D(l.first)) + '<small>' + (t.first === 0 ? '当日' : t.first + '日後') + '</small>' : '<span class="dim">—</span>') + '</td><td class="mono">' + (has(l.last) ? K.md(D(l.last)) + '<small>' + t.since + '日前</small>' : '<span class="dim">—</span>') + '</td>';
      h += '<td><input type="date" data-ln="' + l.id + '" value="' + esc(l.next) + '" class="sm"></td><td class="tk-t ' + lv + '">' + esc(t.text) + '</td><td>' + (K.LEAD_OPEN.indexOf(l.status) >= 0 ? '<button class="ghost sm" id="call-' + l.id + '" data-act="ld-call" data-id="' + l.id + '">今日連絡した</button>' : '') + '</td></tr>';
    });
    if (!L.length) h += '<tr><td colspan="10" class="note">追客中のお客様はいません。</td></tr>';
    h += '</tbody></table></div><p class="src mt">今日やることの出し方は Excel版「反響・追客管理表」と同じ：初回連絡がまだ → 次の連絡予定日が今日か過ぎた → 最後の連絡から' + esc(c.gap) + '日以上（連絡もれ） → 次の予定が空。「今日連絡した」で最後の連絡日を今日に、次の予定を3日後にします。</p></div>';
    h += '<div class="grid g2 mt">' + statTbl('02', '反響元別', K.leadStats(S.leads, 'src', DATA.SOURCES)) + statTbl('03', '担当別', K.leadStats(S.leads, 'staff', names), 'st') + '</div>';
    h += '<p class="note mt">お客様の個人情報を扱うときは、パソコンの共有範囲・パスワードに気をつけてください。表示しているお客様はすべて架空です。</p>';
    $('#v-lead').innerHTML = h;
  };
  function statTbl(no, title, rows, cls) {
    var h = '<div class="panel ' + (cls || '') + '"><div class="ph"><h2><b>' + no + '</b>' + title + '（すべての期間）</h2></div><div class="tw"><table><thead><tr><th>' + title.replace('別', '') + '</th><th class="r">反響</th><th class="r">来店</th><th class="r">成約</th><th class="r">来店率</th><th class="r">成約率</th></tr></thead><tbody>';
    rows.filter(function (r) { return r.n; }).forEach(function (r) { h += '<tr><td>' + esc(r.name) + '</td><td class="r mono">' + r.n + '</td><td class="r mono">' + r.visit + '</td><td class="r mono">' + r.won + '</td><td class="r mono">' + pct(r.visitRate, 0) + '</td><td class="r mono">' + pct(r.winRate, 0) + '</td></tr>'; });
    return h + '</tbody></table></div><p class="src">来店＝状態が「来店済み・申込・契約」。率は反響数に対する割合。</p></div>';
  }

  // ================= 3) 物件調査 =================
  var svProp = null, svOnly = 'all';
  RENDER.survey = function () {
    if (!svProp || !prop(svProp)) svProp = S.props[0].id;
    var p = prop(svProp), pr = K.surveyProgress(p, DATA.ITEMS);
    var h = '<div class="grid g32"><div class="panel"><div class="ph"><h2><b>PROPERTY</b>調べる物件</h2></div><div class="form">';
    h += fld('物件', '<select id="svProp">' + opts(S.props.map(function (x) { return [x.id, x.name]; }), svProp) + '</select>', 'wide') + fld('種類', '<select data-bind="pp:' + p.id + ':type">' + opts(['土地', '戸建', 'マンション'], p.type) + '</select>') + fld('所在地（表示用）', '<input data-bind="pp:' + p.id + ':addr" value="' + esc(p.addr) + '">', 'wide');
    h += '</div><p class="note mt">種類に合わない項目は自動で外れます（Excel版セットの「物件調査チェック」と同じ65項目）。</p></div>';
    h += '<div class="panel st"><div class="ph"><h2><b>01</b>進み具合</h2><span class="tag">' + pr.done + '/' + pr.total + '</span></div>' + ringHtml(pr.rate, 'sv' + p.id, Math.round(pr.rate * 100) + '<small>%</small>', '確認済み・要注意・対象外') + '<div class="list"><div class="li"><span class="days ' + (pr.warn ? 'bad' : 'ok') + '">' + pr.warn + '</span><span class="x">要注意の項目<small>重説の下書きで先頭に出します</small></span></div><div class="li"><span class="days ' + (pr.total - pr.done ? 'warn' : 'ok') + '">' + (pr.total - pr.done) + '</span><span class="x">まだ確認していない項目</span></div></div></div></div>';
    var groups = {};
    pr.list.forEach(function (i) { var it = DATA.ITEMS[i]; (groups[it[0]] = groups[it[0]] || []).push(i); });
    h += '<div class="panel mt"><div class="ph"><h2><b>02</b>調査チェック（窓口ごと）</h2><select id="svOnly" class="sm">' + opts([['all', 'すべての項目'], ['todo', 'まだの項目だけ'], ['warn', '要注意だけ']], svOnly) + '</select></div><div class="tw"><table id="svTbl" class="sv"><tbody>';
    Object.keys(groups).forEach(function (g) {
      var rows = groups[g].filter(function (i) { var s = p.survey[i]; return svOnly === 'all' || (svOnly === 'todo' && !(s && s.st)) || (svOnly === 'warn' && s && s.st === '要注意'); });
      if (!rows.length) return;
      h += '<tr class="grp"><td colspan="3">' + esc(g) + '</td></tr>';
      rows.forEach(function (i) {
        var it = DATA.ITEMS[i], s = p.survey[i] || {};
        h += '<tr class="' + (s.st === '要注意' ? 's-bad' : '') + '"><td><b class="it">' + esc(it[1]) + '</b><small class="wrap">' + esc(it[2]) + '</small><span class="kb">重説：' + esc(it[3]) + '</span></td><td class="nowrap">';
        ['確認済み', '要注意', '対象外'].forEach(function (st) { h += '<button class="seg' + (s.st === st ? ' on ' + (st === '要注意' ? 'bad' : st === '確認済み' ? 'ok' : 'mut') : '') + '" data-act="sv" data-i="' + i + '" data-st="' + st + '" id="sv-' + i + '-' + (st === '確認済み' ? 'ok' : st === '要注意' ? 'ng' : 'na') + '">' + st + '</button>'; });
        h += '</td><td><input data-bind="sv:' + i + '" value="' + esc(s.memo || '') + '" placeholder="結果のメモ"></td></tr>';
      });
    });
    h += '</tbody></table></div><p class="src mt">調査項目は一般的な例です。窓口の名前や取れる書類は自治体によって違います。調査結果の確認と、重要事項説明書の作成・説明は宅地建物取引士が行ってください。</p></div>';
    $('#v-survey').innerHTML = h;
    animate($('#v-survey'));
  };
  function ringHtml(v, k, big, lab) {
    var r = 30, L = 2 * Math.PI * r;
    return '<div class="ring"><svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="' + r + '" fill="none" stroke="#1a1f3a" stroke-width="8"/><circle cx="38" cy="38" r="' + r + '" fill="none" stroke="#a78bfa" stroke-width="8" stroke-linecap="round" transform="rotate(-90 38 38)" stroke-dasharray="0 ' + L.toFixed(1) + '" data-arc="' + v + '" data-ak="' + k + '" data-len="' + L.toFixed(1) + '"/></svg><div><div class="big-num">' + big + '</div><div class="note">' + lab + '</div></div></div>';
  }

  // ================= 4) 媒介契約（期限・報酬） =================
  var bkSel = null, feeIn = { price: 32800000, akiya: false, rent: 80000, res: true, consent: false };
  RENDER.baikai = function () {
    var free = S.props.filter(function (p) { return !activeBk(p.id) && !S.baikai.some(function (m) { return m.prop === p.id && m.closed; }); });
    var h = '<div class="panel"><div class="ph"><h2><b>NEW</b>媒介契約を結んだ</h2><span class="tag">契約日を入れると、レインズ登録の期限と業務報告の日が出ます</span></div><div class="form">';
    h += fld('物件', '<select id="bkProp">' + opts(free.map(function (p) { return [p.id, p.name]; }), free[0] ? free[0].id : '') + '</select>', 'wide') + fld('依頼者（売主）', '<input id="bkOwner" placeholder="例：売主E様">') + fld('種類', '<select id="bkKind">' + opts(['専属専任', '専任', '一般'], '専任') + '</select>') + fld('契約日', '<input type="date" id="bkDate" value="' + K.iso(TODAY) + '">');
    h += '<div class="btns"><button class="btn" id="bkAdd" data-act="bk-add"' + (free.length ? '' : ' disabled') + '>登録する</button></div></div></div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>01</b>媒介一覧</h2><span class="tag">Excel版「媒介契約 期限・報酬管理表」の確認の列と同じ</span></div><div class="tw"><table id="bkTbl"><thead><tr><th>物件・依頼者</th><th>種類</th><th>契約日</th><th>満了日</th><th>レインズ登録</th><th>次の業務報告</th><th>取引状況</th><th>確認</th></tr></thead><tbody>';
    S.baikai.forEach(function (m) {
      var r = bkInfo(m), badR = r.msgs.some(function (x) { return x.lvl === 'bad'; });
      h += '<tr class="click ' + (m.id === bkSel ? 'sel ' : '') + (m.closed ? 'done' : badR ? 's-bad' : r.msgs.length ? 's-warn' : '') + '" data-act="bk-sel" data-id="' + m.id + '"><td>' + esc(pname(m.prop)) + '<small title="' + esc(m.memo) + '">' + esc(m.owner) + (m.closed && m.memo ? '・' + esc(m.memo) : '') + '</small></td><td>' + pill(m.kind) + '</td><td class="mono">' + K.mdw(D(m.date)) + '</td><td class="mono">' + K.md(r.expiry) + '<small>' + (m.closed ? '成約' : (has(m.end) ? '契約書の日・' : '') + 'あと' + r.remain + '日') + '</small></td>';
      h += '<td class="mono">' + (K.isSen(m.kind) ? (has(m.reins) ? '<span class="okc">✓ ' + K.md(D(m.reins)) + '</span><small>期限 ' + K.md(r.reg) + '</small>' : '<span class="wc">期限 ' + K.mdw(r.reg) + '</span>') : '<span class="dim">義務なし</span>') + '</td>';
      h += '<td class="mono">' + (K.isSen(m.kind) && !m.closed ? K.mdw(r.nextRep) + (r.repAdvance ? '<small>休業日→' + K.md(r.repAdvance) + 'までに</small>' : '') : '<span class="dim">—</span>') + '</td><td>' + (m.status ? pill(m.status) : '') + '</td><td class="tk-t ' + (badR ? 'bad' : 'warn') + '">' + esc(r.text) + '</td></tr>';
    });
    h += '</tbody></table></div><p class="src mt">行を押すと、日数の数え方（カレンダー）と記録のボタンが出ます。満了日は、契約書に日付がなければ' + (C().startNext ? '契約日の翌日から起算し（民法140条）' : '契約日から起算し（民法140条ただし書）') + '、3か月後の応当日の前日（応当日がない月は末日・民法143条）としています。専任・専属専任は3か月を超えられません（宅建業法34条の2第3項）。</p></div>';
    var m = bk(bkSel);
    if (m) h += bkDetail(m);
    // 報酬の上限
    var fs = K.feeSale(feeIn.price, feeIn.akiya, C().taxRate), p = n0(feeIn.price), fr = K.feeRent(feeIn.rent, feeIn.res, feeIn.consent, C().taxRate);
    var p1 = Math.min(p, 2e6) * 0.05, p2 = Math.max(0, Math.min(p, 4e6) - 2e6) * 0.04, p3 = Math.max(0, p - 4e6) * 0.03;
    h += '<div class="grid g2 mt"><div class="panel" id="feeBox"><div class="ph"><h2><b>02</b>売買の媒介報酬の上限</h2><span class="tag">依頼者の一方から</span></div><div class="form">';
    h += fld('売買代金（税抜・円）', '<input class="num" id="feePrice" data-fee="price" value="' + esc(feeIn.price) + '">', 'wide') + fld('低廉な空家等の特例（800万円以下）', '<select data-fee="akiya">' + opts([['0', '使わない'], ['1', '使う（事前に説明・合意）']], feeIn.akiya ? '1' : '0') + '</select>', 'wide');
    h += '</div><div class="tot mt"><div class="r"><span>200万円以下の部分 × 5%</span><span>' + yen(p1) + '</span></div><div class="r"><span>200万円超〜400万円の部分 × 4%</span><span>' + yen(p2) + '</span></div><div class="r"><span>400万円を超える部分 × 3%</span><span>' + yen(p3) + '</span></div>';
    h += '<div class="r"><span>通常の上限（税抜）</span><span>' + yen(fs.normal) + '</span></div>' + (fs.special !== null ? '<div class="r"><span>特例の上限（税抜・30万円まで）</span><span>' + yen(fs.special) + '</span></div>' : '') + '<div class="r em"><span>上限（消費税込み）</span><span id="feeOut">' + yen(fs.capTax) + '</span></div>';
    if (fs.quick !== null) h += '<div class="r gp"><span>速算式：代金×3%＋6万円（税抜）</span><span>' + yen(fs.quick) + '</span></div>';
    h += '</div><p class="src mt">報酬告示（昭和45年建設省告示第1552号・令和6年国土交通省告示第949号による改正、2024年7月1日施行）の第二・第七。両手のときは売主・買主それぞれから上限まで。800万円以下で特例を使うときは、媒介契約の前に依頼者へ説明し合意しておく必要があります。</p></div>';
    h += '<div class="panel st"><div class="ph"><h2><b>03</b>賃貸の媒介報酬の上限</h2><span class="tag">告示 第四</span></div><div class="form">';
    h += fld('借賃（月額・税抜）', '<input class="num" data-fee="rent" value="' + esc(feeIn.rent) + '">') + fld('居住用の建物', '<select data-fee="res">' + opts([['1', 'はい'], ['0', 'いいえ（事業用など）']], feeIn.res ? '1' : '0') + '</select>') + fld('依頼者の承諾', '<select data-fee="consent">' + opts([['0', 'なし'], ['1', 'あり（媒介の依頼を受けるときに）']], feeIn.consent ? '1' : '0') + '</select>', 'wide');
    h += '</div><div class="tot mt"><div class="r"><span>貸主・借主の合計（1か月分×1.1）</span><span>' + yen(fr.total) + '</span></div><div class="r em"><span>依頼者の一方から</span><span>' + yen(fr.onePerSide) + '</span></div></div><p class="src mt">居住用の建物は、承諾がない限り依頼者の一方から借賃の0.55か月分まで。</p>' + NO_SPECIAL + '</div></div>';
    $('#v-baikai').innerHTML = h;
    animate($('#v-baikai'));
  };
  function bkDetail(m) {
    var r = bkInfo(m), cl = cal(), sched = K.reportSchedule(m.kind, m.date, r.expiry, cl), mark = {};
    function add(n, cls, t) { if (n === null) return; (mark[n] = mark[n] || []).push([cls, t]); }
    add(D(m.date), 'm-start', '契約日');
    r.regCount.forEach(function (n, i) { add(n, 'm-count', '数え' + (i + 1)); });
    if (r.reg !== null) add(r.reg, 'm-reg', '登録期限');
    sched.slice(0, 4).forEach(function (x) { add(x.due, 'm-rep', '報告' + x.n); if (x.advance) add(x.advance, 'm-adv', '報告' + x.n + 'の目安'); });
    (m.reports || []).forEach(function (s) { add(D(s), 'm-done', '報告済み'); });
    if (has(m.reins)) add(D(m.reins), 'm-done', '登録済み');
    var d0 = D(m.date), first = K.firstOfMonth(d0), h = '<div class="panel mt" id="bkDetail"><div class="ph"><h2><b>DETAIL</b>' + esc(pname(m.prop)) + '（' + m.kind + '）</h2><span class="tag">契約日の翌日から数える・休業日（灰色）は数えない</span></div><div class="grid g32"><div id="bkCal" class="mcal">';
    for (var mo = 0; mo < 2; mo++) {
      var f = K.addMonths(first, mo), o = K.ymd(f), dim = K.daysIn(o.y, o.m);
      h += '<div class="mon"><div class="mh">' + o.y + '年' + o.m + '月</div><div class="mg">' + K.WD.map(function (w, i) { return '<b class="' + (i === 0 ? 'sun' : i === 6 ? 'sat' : '') + '">' + w + '</b>'; }).join('');
      for (var b = 0; b < K.wday(f); b++) h += '<span class="blank"></span>';
      for (var dI = 0; dI < dim; dI++) {
        var n = f + dI, mk = mark[n] || [], off = K.offReason(n, cl);
        h += '<span class="' + (off ? 'off ' : '') + (n === TODAY ? 'today ' : '') + mk.map(function (x) { return x[0]; }).join(' ') + '" title="' + esc(off) + '"><i>' + (dI + 1) + '</i>' + (mk.length ? '<em>' + esc(mk[mk.length - 1][1]) + '</em>' : '') + '</span>';
      }
      h += '</div></div>';
    }
    h += '</div><div><div class="tot"><div class="r"><span>有効期間の満了（上限）</span><span>' + K.jd(r.limit) + '</span></div>';
    if (K.isSen(m.kind)) {
      h += '<div class="r"><span>レインズ登録の期限（休業日を除いて' + K.KIND[m.kind].reg + '日目）</span><span>' + K.mdw(r.reg) + '</span></div><div class="r"><span>業務報告（' + K.KIND[m.kind].repName + '）</span><span>次 ' + K.mdw(r.nextRep) + '</span></div>';
    } else h += '<div class="r"><span>一般媒介</span><span>レインズ登録・定期報告の義務なし</span></div>';
    h += '</div><div class="btns mt">';
    if (K.isSen(m.kind) && !has(m.reins)) h += '<button class="btn" id="bkReins" data-act="bk-reins" data-id="' + m.id + '">レインズに登録した（今日）</button>';
    if (K.isSen(m.kind) && !m.closed) h += '<button class="btn sk" id="bkReport" data-act="bk-report" data-id="' + m.id + '">業務報告を送った（今日）</button>';
    h += '</div>';
    if (K.isSen(m.kind)) {
      h += '<div class="form mt">' + fld('取引状況（レインズ）', '<select data-bind="bk:' + m.id + ':status">' + opts(['公開中', '書面による購入申込みあり', '売主都合で一時紹介停止中'], m.status || '公開中') + '</select>', 'wide') + '</div>';
      if (has(m.statusDate) && (!has(m.reflect) || D(m.reflect) < D(m.statusDate))) h += '<div class="btns mt"><button class="btn sk" id="bkReflect" data-act="bk-reflect" data-id="' + m.id + '">レインズに反映した（今日）</button><span class="note">' + K.md(D(m.statusDate)) + 'に「' + esc(m.status) + '」へ変更</span></div>';
    }
    h += '<p class="src mt">根拠：宅地建物取引業法34条の2（有効期間3か月・指定流通機構への登録・業務の報告）、同法施行規則15条の10（専任7日・専属専任5日、休業日数は算入しない）、15条の11（取引状況の登録）、民法140条（初日不算入：契約日の翌日から起算）・141条・143条（3か月後の応当日の前日に満了、応当日がない月は末日。例：1/15締結→4/15、11/30締結→2/28〈うるう年は2/29〉）。祝日は内閣府「国民の祝日について」の2026年・2027年。</p></div></div></div>';
    return h;
  }

  // ================= 5) 案内・申込 =================
  RENDER.visit = function () {
    var ld = S.leads.filter(function (l) { return K.LEAD_OPEN.indexOf(l.status) >= 0; });
    var h = '<div class="panel"><div class="ph"><h2><b>NEW</b>案内・申込を記録</h2><span class="tag">書面の申込は、専任媒介の取引状況（レインズ）も変えます</span></div><div class="form">';
    h += fld('日付', '<input type="date" id="vsDate" value="' + K.iso(TODAY) + '">') + fld('お客様', '<select id="vsLead">' + opts(ld.map(function (l) { return [l.id, l.name + '（' + l.want + '）']; }), ld[0] ? ld[0].id : '') + '</select>', 'wide') + fld('物件', '<select id="vsProp">' + opts(S.props.filter(function (p) { return !S.baikai.some(function (m) { return m.prop === p.id && m.closed; }); }).map(function (p) { return [p.id, p.name]; }), '') + '</select>', 'wide');
    h += fld('種類', '<select id="vsType">' + opts(['案内', '申込'], '案内') + '</select>') + fld('申込の書面', '<select id="vsWritten">' + opts([['1', '書面で受けた（買付証明書など）'], ['0', '口頭のみ']], '1') + '</select>', 'wide') + fld('結果・メモ', '<input id="vsMemo" placeholder="例：前向きに検討中">', 'wide');
    h += '<div class="btns"><button class="btn" id="vsAdd" data-act="vs-add">記録する</button></div></div></div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>01</b>案内・申込の記録</h2></div><div class="tw"><table id="vsTbl"><thead><tr><th>日付</th><th>種類</th><th>お客様</th><th>物件</th><th>結果・メモ</th></tr></thead><tbody>';
    S.visits.slice().sort(function (a, b) { return D(b.date) - D(a.date); }).forEach(function (v) {
      var l = lead(v.lead);
      h += '<tr class="' + (v.id === vsNew ? 'new' : '') + '"><td class="mono">' + K.mdw(D(v.date)) + (D(v.date) > TODAY ? '<small>予定</small>' : '') + '</td><td>' + pill(v.type) + (v.type === '申込' ? '<small>' + (v.written ? '書面あり' : '口頭') + '</small>' : '') + '</td><td>' + esc(l ? l.name : v.memo) + '</td><td>' + esc(pname(v.prop)) + '</td><td>' + esc(v.result) + '</td></tr>';
    });
    h += '</tbody></table></div><p class="src mt">2025年1月から、専任媒介の物件は取引状況（公開中・書面による購入申込みあり・売主都合で一時紹介停止中）もレインズに登録します（宅建業法施行規則15条の11）。売主は登録証明書のQRコードから確認できます。</p></div>';
    $('#v-visit').innerHTML = h;
  };
  var vsNew = null;

  // ================= 6) 契約書・重説（下書き） =================
  var drSel = null;
  RENDER.draft = function () {
    var L = S.deals.filter(function (d) { return d.status !== '決済済み'; });
    if (!drSel || !deal(drSel) || deal(drSel).status === '決済済み') drSel = L[0] ? L[0].id : null;
    var d = deal(drSel);
    var h = '<div class="warnbox"><b>下書き</b>' + esc(DRAFT_NOTE) + '</div>';
    if (!d) { $('#v-draft').innerHTML = h + '<p class="note mt">申込・契約の取引がありません。「案内・申込」で申込を記録してください。</p>'; return; }
    var cap = feeCap(d), f = fee(d), over = has(d.fee) && n0(d.fee) > cap, p = prop(d.prop);
    h += '<div class="grid g23 mt"><div class="panel"><div class="ph"><h2><b>DEAL</b>取引の条件</h2></div><div class="form">';
    h += fld('取引', '<select id="drDeal">' + opts(L.map(function (x) { return [x.id, dealName(x) + '（' + x.status + '）']; }), drSel) + '</select>', 'wide');
    if (d.kind === '売買') h += fld('売買代金（税抜・円）', '<input class="num" data-bind="dl:' + d.id + ':price" value="' + esc(d.price) + '">') + fld('手付金（円）', '<input class="num" data-bind="dl:' + d.id + ':deposit" value="' + esc(d.deposit) + '">');
    else h += fld('賃料（月額・円）', '<input class="num" data-bind="dl:' + d.id + ':rent" value="' + esc(d.rent) + '">');
    h += fld('買主・借主', '<input data-bind="dl:' + d.id + ':buyer" value="' + esc(d.buyer) + '">') + fld('売主・貸主', '<input data-bind="dl:' + d.id + ':seller" value="' + esc(d.seller) + '">');
    h += fld('契約日（予定）', '<input type="date" data-bind="dl:' + d.id + ':contract" value="' + esc(d.contract || K.iso(TODAY + 7)) + '">') + fld('決済・引渡し（予定）', '<input type="date" id="drSettle" data-bind="dl:' + d.id + ':settle" value="' + esc(d.settle) + '">');
    h += fld('報酬を受ける側', '<select data-bind="dl:' + d.id + ':side">' + opts(['両手', '売主側', '買主側'], d.side) + '</select>') + (d.kind === '売買' ? fld('低廉な空家等の特例', '<select data-bind="dl:' + d.id + ':akiya">' + opts([['0', '使わない'], ['1', '使う']], d.akiya ? '1' : '0') + '</select>') : '');
    h += fld('約定報酬（税込・空なら上限）', '<input class="num" data-bind="dl:' + d.id + ':fee" value="' + esc(d.fee) + '" placeholder="' + K.num(cap) + '">', 'wide');
    h += '</div><div class="tot mt"><div class="r"><span>報酬の上限（税込）</span><span>' + yen(cap) + '</span></div><div class="r em"><span>報酬（税込）</span><span id="drFee">' + yen(f) + '</span></div></div>';
    if (over) h += '<p class="err mt">約定報酬が報酬告示の上限（' + yen(cap) + '）を超えています。</p>';
    if (d.kind === '賃貸') h += NO_SPECIAL;
    h += '<div class="btns mt">' + (d.status === '申込' ? '<button class="btn" id="drContract" data-act="dr-contract" data-id="' + d.id + '">契約を記録（契約日＝今日）</button>' : '<span class="pill ok">契約済み ' + (d.contract ? K.md(D(d.contract)) : '') + '</span>') + '<button class="ghost" data-act="print">印刷・PDFにする</button></div></div>';
    h += '<div class="doc" id="drDoc">' + docHtml(d, p, cap, f) + '</div></div>';
    $('#v-draft').innerHTML = h;
  };
  function docHtml(d, p, cap, f) {
    var c = C(), sale = d.kind === '売買', h = '<div class="d-stamp">下書き</div><div class="d-title">' + (sale ? '不動産売買契約書' : '建物賃貸借契約書') + '<small>（下書き）</small></div>';
    h += '<table><tbody><tr><th>物件の表示</th><td>' + esc(dealName(d)) + (p ? '<br>' + esc(p.addr) + '・' + esc(p.type) : '') + '</td></tr>';
    h += '<tr><th>' + (sale ? '売主' : '貸主') + '</th><td>' + esc(d.seller) + '</td></tr><tr><th>' + (sale ? '買主' : '借主') + '</th><td>' + esc(d.buyer) + '</td></tr>';
    if (sale) {
      var dep = n0(d.deposit), pr = n0(d.price);
      h += '<tr><th>売買代金</th><td class="r">' + yen(pr) + '</td></tr><tr><th>手付金（契約時）</th><td class="r">' + yen(dep) + '</td></tr><tr><th>残代金（決済時）</th><td class="r">' + yen(pr - dep) + '</td></tr>';
    } else h += '<tr><th>賃料（月額）</th><td class="r">' + yen(n0(d.rent)) + '</td></tr>';
    h += '<tr><th>契約日</th><td>' + (d.contract ? K.jd(D(d.contract)) : '（未定）') + '</td></tr><tr><th>' + (sale ? '決済・引渡し' : '入居日') + '</th><td>' + (d.settle ? K.jd(D(d.settle)) : '（未定）') + '</td></tr>';
    h += '<tr><th>媒介業者</th><td>' + esc(c.name) + '（' + esc(c.license) + '）</td></tr><tr><th>報酬（税込）</th><td class="r">' + yen(f) + '<small>上限 ' + yen(cap) + '・' + esc(d.side) + '</small></td></tr></tbody></table>';
    h += '<p class="d-sm">条文の本文は、お店で使っている契約書の書式（業界団体の書式、賃貸なら国土交通省の賃貸住宅標準契約書など）に合わせて入れてください。このページは主な条件の確認用の下書きです。</p>';
    // 重要事項の材料（物件調査から）
    if (p) {
      var pr2 = K.surveyProgress(p, DATA.ITEMS), by = {};
      pr2.list.forEach(function (i) { var it = DATA.ITEMS[i]; (by[it[3]] = by[it[3]] || []).push(i); });
      h += '<div class="d-sec">重要事項説明書（下書き）の材料 <small>物件調査 ' + pr2.done + '/' + pr2.total + '・要注意 ' + pr2.warn + '</small></div>';
      var warn = pr2.list.filter(function (i) { return (p.survey[i] || {}).st === '要注意'; });
      if (warn.length) { h += '<div class="d-box bad"><b>要注意（先に確認）</b><ul>'; warn.forEach(function (i) { h += '<li>' + esc(DATA.ITEMS[i][1]) + '：' + esc((p.survey[i] || {}).memo || '（メモなし）') + '</li>'; }); h += '</ul></div>'; }
      h += '<table class="d-sv"><tbody>';
      Object.keys(by).forEach(function (k) {
        var L = by[k], dn = L.filter(function (i) { return (p.survey[i] || {}).st; }).length;
        h += '<tr><th>' + esc(k) + '</th><td>' + dn + '/' + L.length + ' 確認' + (dn < L.length ? '<span class="d-todo">未確認 ' + (L.length - dn) + '件</span>' : '') + '<small>' + L.filter(function (i) { return (p.survey[i] || {}).memo; }).map(function (i) { return esc(DATA.ITEMS[i][1] + '：' + p.survey[i].memo); }).join(' ／ ') + '</small></td></tr>';
      });
      h += '</tbody></table>';
    }
    h += '<p class="d-sm d-law">' + esc(DRAFT_NOTE) + '</p>';
    return h;
  }

  // ================= 7) 決済・報酬 =================
  RENDER.settle = function () {
    var fm = feeMonth(MK), ms = months6(), st = ms.map(function (m) { return { m: m, f: feeMonth(m) }; }), mx = Math.max.apply(null, st.map(function (x) { return x.f.sum; }).concat([1]));
    var h = '<div class="grid g4">' + kpi('今月の報酬見込み（税込）', cnt('s-f', fm.sum), 'gr', '決済日が今月の取引 ' + fm.list.length + '件', 's-f', Math.min(1, fm.sum / mx));
    h += kpi('受領済み', cnt('s-g', fm.got), '', '今月', 's-g', fm.sum ? fm.got / fm.sum : 0) + kpi('これから', cnt('s-e', fm.exp), 'sk', '決済の予定どおりなら', 's-e', fm.sum ? fm.exp / fm.sum : 0, 'sk');
    var waiting = S.deals.filter(function (d) { return d.status !== '決済済み'; });
    h += kpi('決済待ちの取引', cnt('s-w', waiting.length, 'n') + '<small>件</small>', '', '申込・契約済み', 's-w', Math.min(1, waiting.length / 6)) + '</div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>01</b>取引と報酬</h2></div><div class="tw"><table id="stTbl"><thead><tr><th>取引</th><th>状態</th><th>契約日</th><th>決済日</th><th class="r">上限</th><th class="r">報酬（税込）</th><th></th></tr></thead><tbody>';
    S.deals.slice().sort(function (a, b) { return (D(b.settle) || 0) - (D(a.settle) || 0); }).forEach(function (d) {
      h += '<tr class="' + (d.id === stNew ? 'new' : '') + '"><td>' + esc(dealName(d)) + '<small>' + d.kind + '・' + d.side + (d.kind === '売買' ? '・' + yen(n0(d.price)) : '・賃料 ' + yen(n0(d.rent))) + '</small></td><td>' + pill(d.status) + '</td><td class="mono">' + (d.contract ? K.md(D(d.contract)) : '—') + '</td><td class="mono">' + (d.settle ? K.mdw(D(d.settle)) : '—') + '</td><td class="r mono">' + K.num(feeCap(d)) + '</td><td class="r mono">' + (d.paid ? '<span class="okc">' + K.num(d.paid.amt) + '</span><small>' + K.md(D(d.paid.date)) + ' 受領</small>' : K.num(fee(d))) + '</td>';
      h += '<td>' + (d.status === '契約' && !d.paid ? '<button class="ghost sm" id="paid-' + d.id + '" data-act="st-paid" data-id="' + d.id + '">決済・受領を記録</button>' : '') + '</td></tr>';
    });
    h += '</tbody></table></div><p class="src mt">報酬は、空欄なら報酬告示の上限（売買：代金の区分ごとの割合、賃貸：借賃1か月分×1.1）で見込みます。実際の約定報酬は「契約書・重説（下書き）」で入れてください。</p>' + NO_SPECIAL + '</div>';
    h += '<div class="panel st mt"><div class="ph"><h2><b>02</b>報酬（決済の月・6か月）</h2></div><div class="chart">';
    st.forEach(function (x, i) { h += '<div class="col' + (i === 5 ? ' now' : '') + '"><span class="pf">' + (x.f.sum ? K.num(x.f.sum / 10000, 0) + '万' : '') + '</span><div class="bars"><div class="bar b2 w" data-h="' + (x.f.sum / mx) + '" data-hk="sf' + i + '"></div></div><span class="m">' + K.ymd(D(x.m + '-01')).m + '月</span></div>'; });
    h += '</div></div>';
    $('#v-settle').innerHTML = h;
    animate($('#v-settle'));
  };
  var stNew = null;

  // ================= 8) 賃貸の更新 =================
  RENDER.lease = function () {
    var R = S.leases.map(function (l) { return { l: l, r: leaseInfo(l) }; }), soon = n0(C().soon);
    var cntOf = function (re) { return R.filter(function (x) { return re.test(x.r.text); }).length; };
    var h = '<div class="grid g4">' + kpi('更新の案内を出す時期', cnt('l-a', cntOf(/更新の案内/), 'n') + '<small>件</small>', 'sk', '満了の' + esc(C().renewMonths) + 'か月前から', 'l-a', 0.5, 'sk');
    h += kpi('定期借家：通知の期間', cnt('l-b', cntOf(/終了の通知を出す期間/), 'n') + '<small>件</small>', '', '満了の1年前〜6か月前', 'l-b', 0.5);
    h += kpi('期限切れ', cnt('l-c', R.filter(function (x) { return x.r.lvl === 'bad'; }).length, 'n') + '<small>件</small>', R.some(function (x) { return x.r.lvl === 'bad'; }) ? 'rd' : 'gr', '満了・通知の締切を過ぎた', 'l-c', 0.2);
    h += kpi('家賃の合計（月額）', cnt('l-d', S.leases.reduce(function (a, l) { return a + n0(l.rent); }, 0)), '', S.leases.length + '件の契約', 'l-d', 1) + '</div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>01</b>契約一覧</h2><span class="tag">Excel版「賃貸契約 更新・期限管理表」と同じ計算</span></div><div class="tw"><table id="leTbl"><thead><tr><th>物件・部屋</th><th>入居者</th><th>種類</th><th>契約期間</th><th>満了日</th><th>案内・通知</th><th>保険／保証</th><th>次にやること</th><th></th></tr></thead><tbody>';
    R.forEach(function (x) {
      var l = x.l, r = x.r;
      h += '<tr class="' + (r.lvl === 'bad' ? 's-bad' : r.lvl === 'warn' ? 's-warn' : '') + '"><td>' + esc(l.bld) + '<small>' + esc(l.room) + '号室・家賃 ' + yen(n0(l.rent)) + '</small></td><td>' + esc(l.tenant) + '</td><td>' + pill(l.type) + '</td><td class="mono">' + K.slash(D(l.start)) + '<small>' + l.months + 'か月</small></td><td class="mono">' + K.slash(r.end) + '<small>あと' + r.remain + '日</small></td>';
      h += '<td class="mono">' + (l.type === '定期借家' ? (r.fStart !== null ? K.slash(r.fStart) + '〜' + K.slash(r.fEnd) + '<small>終了の通知（1年前〜締切・早めに）</small>' : '—') : K.slash(r.notice) + '<small>更新の案内</small>') + '</td><td class="mono">' + (r.ins !== null ? '保険 あと' + r.ins + '日' : '—') + '<small>' + (r.guar !== null ? '保証 あと' + r.guar + '日' : '') + '</small></td><td class="tk-t ' + r.lvl + '">' + esc(r.text) + (l.done ? '<small>案内済み</small>' : '') + '</td>';
      h += '<td>' + (r.main && !l.done && !/過ぎて/.test(r.main) ? '<button class="ghost sm" data-act="le-done" data-id="' + l.id + '">案内・通知を出した</button>' : '') + '</td></tr>';
    });
    h += '</tbody></table></div><p class="src mt">契約満了日＝契約開始日から期間（月）たった日の前日（民法143条）。更新案内の期限＝満了日の' + esc(C().renewMonths) + 'か月前（設定で変えられます）。定期借家（期間1年以上）は満了の1年前から6か月前までが、借主へ終了を通知する期間です（借地借家法38条6項）。締切は満了日の6か月前の応当日（その月にない日なら月末）として出しています。締切の当日に頼らず、余裕をもって早めに通知してください。締切を過ぎてから通知したときは、通知の日から6か月たつまで終了を借主に主張できません（同項ただし書）。火災保険・保証会社は' + soon + '日以内なら表示します。</p></div>';
    // 月別の満了件数・更新料
    var mm = []; for (var i = 0; i < 12; i++) { var f = K.addMonths(TODAY, i), m = K.ym(f), L = R.filter(function (x) { return x.r.end !== null && K.ym(x.r.end) === m; }); mm.push({ m: m, n: L.length, fee: L.reduce(function (a, x) { return a + n0(x.l.fee); }, 0) }); }
    var mx = Math.max.apply(null, mm.map(function (x) { return x.n; }).concat([1]));
    h += '<div class="panel mt st"><div class="ph"><h2><b>02</b>月別の満了件数と更新料（12か月）</h2></div><div class="chart">';
    mm.forEach(function (x, i) { h += '<div class="col' + (i === 0 ? ' now' : '') + '"><span class="pf">' + (x.fee ? K.num(x.fee / 10000, 1) + '万' : '') + '</span><div class="bars"><div class="bar b2 w" data-h="' + (x.n / mx) + '" data-hk="lm' + i + '"></div></div><span class="m">' + K.ymd(D(x.m + '-01')).m + '月</span></div>'; });
    h += '</div><p class="src">棒は満了する契約の件数、上の数字は更新料の合計（見込み）。</p></div>';
    $('#v-lease').innerHTML = h;
    animate($('#v-lease'));
  };

  // ================= 9) 収支シミュレーション =================
  var SIMF = [['■ 物件'], ['price', '物件価格', 'yen'], ['cost', '購入時の諸費用', 'yen'], ['equity', '自己資金', 'yen'], ['■ ローン'], ['rate', '金利（年）', 'pct'], ['term', '返済期間（年）', 'n'], ['■ 家賃'], ['rent', '満室時の家賃（月額）', 'yen'], ['vac', '空室率', 'pct'], ['drop', '家賃の下落（年）', 'pct'], ['■ 運営費'], ['kanri', '管理費・修繕積立金（月額）', 'yen'], ['itaku', '管理委託料（家賃に対して）', 'pct'], ['tax', '固定資産税・都市計画税（年）', 'yen'], ['ins', '火災・地震保険（年）', 'yen'], ['repair', '修繕・原状回復（年）', 'yen'], ['other', 'その他（年）', 'yen'], ['■ 売却とストレス'], ['sellyr', '売却する年（1〜35）', 'n'], ['sellcap', '売却時の表面利回り', 'pct'], ['sellcost', '売却時の費用', 'pct'], ['srate', '金利の上乗せ', 'pct'], ['svac', '空室率の上乗せ', 'pct']];
  RENDER.sim = function () {
    var x = S.sim, r = K.sim(x);
    var h = '<div class="grid g23 simg"><div class="panel"><div class="ph"><h2><b>INPUT</b>' + esc(x.name) + '</h2></div><div class="form sim">';
    SIMF.forEach(function (f) {
      if (f.length === 1) { h += '<div class="fh">' + f[0] + '</div>'; return; }
      var v = x[f[0]], shownV = f[2] === 'pct' ? K.clean(v * 100) : v;
      h += fld(f[1] + (f[2] === 'pct' ? '（%）' : f[2] === 'yen' ? '（円）' : ''), '<input class="num" data-bind="sim:' + f[0] + ':' + f[2] + '" value="' + esc(shownV) + '">');
    });
    h += '</div></div><div>';
    h += '<div class="grid g2"><div class="panel kpi"><div class="lab">手残り（月額・税引前）</div><div class="val ' + (r.cfM < 0 ? 'rd' : 'gr') + '">' + cnt('sm-cf', Math.round(r.cfM)) + '</div><div class="sub">年額 ' + yen(Math.round(r.cf)) + '</div></div>';
    h += '<div class="panel kpi"><div class="lab">返済余力（DSCR）</div><div class="val ' + (r.dscr < 1.2 ? 'rd' : 'gr') + '">' + K.num(r.dscr, 2) + '</div><div class="sub">NOI÷返済。1.2以上が一つの目安</div></div></div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>01</b>1年目の結果</h2></div><div class="tot">';
    [['借入額', yen(Math.round(r.loan))], ['表面利回り', pct(r.gross, 2)], ['実質利回り（NOI利回り）', pct(r.net, 2)], ['年間の家賃収入（空室を引いた後）', yen(Math.round(r.income))], ['年間の運営費', yen(Math.round(r.opex))], ['NOI（家賃収入−運営費）', yen(Math.round(r.noi))], ['ローン返済（月額・元利均等）', yen(Math.round(r.pay))], ['自己資金の回収率（年）', pct(r.coc, 1)], ['損益分岐の入居率', pct(r.be, 1)]].forEach(function (a) { h += '<div class="r"><span>' + a[0] + '</span><span>' + a[1] + '</span></div>'; });
    h += '</div></div><div class="grid g2 mt"><div class="panel st"><div class="ph"><h2><b>02</b>ストレステスト</h2></div><div class="tot"><div class="r"><span>金利上乗せ後の返済（年）</span><span>' + yen(Math.round(r.sPayY)) + '</span></div><div class="r"><span>空室上乗せ後のNOI</span><span>' + yen(Math.round(r.sNoi)) + '</span></div><div class="r em"><span>両方起きたとき（年）</span><span class="' + (r.sCf < 0 ? 'neg' : '') + '">' + yen(Math.round(r.sCf)) + '</span></div></div></div>';
    h += '<div class="panel"><div class="ph"><h2><b>03</b>' + Math.round(n0(x.sellyr)) + '年目に売却</h2></div><div class="tot"><div class="r"><span>売却価格（想定）</span><span>' + yen(Math.round(r.sellPrice)) + '</span></div><div class="r"><span>ローン残高</span><span>' + yen(Math.round(r.sellBal)) + '</span></div><div class="r"><span>売却で残るお金</span><span>' + yen(Math.round(r.sellNet)) + '</span></div><div class="r"><span>売却までの手残り合計</span><span>' + yen(Math.round(r.cumCf)) + '</span></div><div class="r em"><span>最終的な損益</span><span>' + yen(Math.round(r.total)) + '</span></div></div></div></div>';
    // 35年
    var Y = r.years, mxA = Math.max.apply(null, Y.map(function (y) { return Math.abs(y.cf); }).concat([1])), mxC = Math.max.apply(null, Y.map(function (y) { return Math.abs(y.cum); }).concat([1]));
    h += '<div class="panel mt"><div class="ph"><h2><b>04</b>35年の手残り（年）と累計</h2><div class="legend"><span><i style="background:#a78bfa"></i>手残り（年）</span><span><i style="background:#38bdf8"></i>累計</span></div></div><svg viewBox="0 0 560 150" class="y35" role="img" aria-label="35年の手残り"><line x1="0" y1="75" x2="560" y2="75" stroke="#2a3154"/>';
    var pts = [];
    Y.forEach(function (y, i) { var bx = 4 + i * 16, hh = Math.abs(y.cf) / mxA * 60; h += '<rect x="' + bx + '" y="' + (y.cf >= 0 ? 75 - hh : 75).toFixed(1) + '" width="11" height="' + Math.max(0.5, hh).toFixed(1) + '" fill="' + (y.cf >= 0 ? '#a78bfa' : '#ff6b81') + '" opacity=".85"><title>' + y.y + '年目 ' + yen(Math.round(y.cf)) + '</title></rect>'; pts.push((bx + 5.5).toFixed(1) + ',' + (75 - y.cum / mxC * 66).toFixed(1)); });
    h += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#38bdf8" stroke-width="2"/><text x="4" y="146" class="ax">1年</text><text x="530" y="146" class="ax">35年</text></svg><p class="src">税引前の概算です。所得税・住民税、減価償却、ローンの手数料・保証料、金利の見直し、大規模修繕は含みません。元利均等返済・固定金利で計算（Excel版「投資用不動産 収支シミュレーター」と同じ）。投資の判断はご自身で、税金は税理士などの専門家にご確認ください。</p></div>';
    h += '</div></div>';
    $('#v-sim').innerHTML = h;
    animate($('#v-sim'));
  };

  // ================= 10) 設定 =================
  RENDER.set = function () {
    var c = C();
    var h = '<div class="grid g2"><div class="panel"><div class="ph"><h2><b>COMPANY</b>お店の情報</h2></div><div class="form">';
    h += fld('会社・屋号の名前', '<input data-bind="co:name" value="' + esc(c.name) + '">', 'wide') + fld('免許番号', '<input data-bind="co:license" value="' + esc(c.license) + '">', 'wide') + fld('電話', '<input data-bind="co:tel" value="' + esc(c.tel) + '">') + fld('住所', '<input data-bind="co:addr" value="' + esc(c.addr) + '">', 'wide');
    h += '</div></div><div class="panel st"><div class="ph"><h2><b>DAYS</b>休業日（レインズ登録の期限に使う）</h2></div><div class="wdays">';
    K.WD.forEach(function (w, i) { h += '<button class="seg' + (c.off.indexOf(i) >= 0 ? ' on mut' : '') + '" data-act="set-off" data-w="' + i + '">' + w + '</button>'; });
    h += '</div><div class="form mt">' + fld('祝日', '<select data-bind="co:holidays">' + opts([['1', '休む（2026・2027年の国民の祝日）'], ['0', '休まない']], c.holidays ? '1' : '0') + '</select>', 'wide') + fld('ほかの休業日（夏季・年末年始など）', '<textarea data-bind="co:extra">' + esc(c.extra) + '</textarea>', 'wide') + '</div></div></div>';
    h += '<div class="grid g2 mt"><div class="panel"><div class="ph"><h2><b>RULES</b>期限の決め方</h2></div><div class="form">';
    h += fld('媒介の有効期間の数え方', '<select data-bind="co:startNext">' + opts([['1', '契約日の翌日から（民法140条・ふつうはこちら。例：1/15締結→4/15満了）'], ['0', '契約日の午前0時から始まると定めた契約（140条ただし書。例：1/15〜4/14）']], c.startNext ? '1' : '0') + '</select>', 'wide');
    h += fld('連絡もれとみなす日数', '<input class="num" data-bind="co:gap" value="' + esc(c.gap) + '">') + fld('初回連絡の目標（日）', '<input class="num" data-bind="co:firstGoal" value="' + esc(c.firstGoal) + '">') + fld('更新案内（満了の何か月前）', '<input class="num" data-bind="co:renewMonths" value="' + esc(c.renewMonths) + '">') + fld('「もうすぐ」とする日数', '<input class="num" data-bind="co:soon" value="' + esc(c.soon) + '">');
    h += '</div></div><div class="panel"><div class="ph"><h2><b>LAW</b>計算の根拠</h2><span class="tag">最新は公的情報で確認</span></div><ul class="chk">';
    ['レインズ登録：専任7日・専属専任5日以内、休業日は数えない（宅建業法34条の2第5項・同施行規則15条の10）', '業務報告：専任2週間に1回以上・専属専任1週間に1回以上（同法34条の2第9項）', '有効期間：専任・専属専任は3か月を超えられない（同法34条の2第3項）。満了日は民法140条（初日不算入）・141条・143条（応当日の前日、応当日がない月は末日）で計算', '取引状況の登録：公開中・書面による購入申込みあり・売主都合で一時紹介停止中（同施行規則15条の11、2025年1月から）', '報酬の上限：報酬告示（令和6年国土交通省告示第949号による改正、2024年7月1日施行）', '定期借家の終了通知：期間1年以上は満了の1年前から6か月前まで（借地借家法38条6項）。締切は満了日の6か月前の応当日（ない月は末日）'].forEach(function (t, i) { h += '<li><i>' + (i + 1) + '</i><span>' + t + '</span></li>'; });
    h += '</ul><p class="note mt">法令・告示・通達は改正されます。使う前に、e-Gov法令検索・国土交通省などの公的情報で最新の内容を確認してください。個別の判断は、所属の業界団体や専門家にご確認ください。</p></div></div>';
    h += '<div class="panel mt"><div class="ph"><h2><b>DATA</b>データ</h2></div><p class="note">データはこのブラウザ（localStorage）にだけ保存しています。外部には送信しません。ブラウザのデータを消すと、入力も消えます。</p><div class="btns"><button class="btn" data-act="reset">見本データに戻す</button><span class="note">今の入力は消えて、架空の「サンプル不動産（架空）」の見本に戻ります。</span></div></div>';
    $('#v-set').innerHTML = h;
  };

  // ================= 操作 =================
  function addLead() {
    var name = $('#ldName').value.trim(); if (!name) { toast('お客様名を入れてください'); return; }
    var l = { id: uid('l'), date: $('#ldDate').value || K.iso(TODAY), src: $('#ldSrc').value, kind: $('#ldKind').value, name: name, contact: '', want: $('#ldWant').value.trim(), staff: $('#ldStaff').value, status: '新規', first: '', last: '', next: '', amount: '', lost: '', memo: '' };
    S.leads.unshift(l); ldNew = l.id; log('反響：' + l.name + '（' + l.src + '・' + l.kind + '）'); commit(); toast('反響を追加しました（今日やることに出ます）');
    return l;
  }
  function callLead(id) {
    var l = lead(id); if (!l) return;
    if (!has(l.first)) l.first = K.iso(TODAY);
    l.last = K.iso(TODAY); l.next = K.iso(TODAY + 3); if (l.status === '新規') l.status = '追客中';
    log('追客：' + l.name + 'に連絡（次は ' + K.md(TODAY + 3) + '）'); commit(); toast(l.name + '：連絡を記録・次の予定 ' + K.mdw(TODAY + 3));
  }
  function addBk() {
    var pid = $('#bkProp').value, p = prop(pid); if (!p) return;
    var m = { id: uid('m'), prop: pid, owner: $('#bkOwner').value.trim() || '売主（未入力）', kind: $('#bkKind').value, date: $('#bkDate').value || K.iso(TODAY), end: '', reins: '', lastReport: '', status: K.isSen($('#bkKind').value) ? '公開中' : '', statusDate: '', reflect: '', staff: '担当A', memo: '', closed: false, reports: [] };
    S.baikai.unshift(m); bkSel = m.id;
    var r = bkInfo(m); log('媒介：' + pname(pid) + '（' + m.kind + '）' + (r.reg !== null ? '・レインズ登録の期限 ' + K.md(r.reg) : ''));
    commit(); toast(m.kind + '媒介を登録しました' + (r.reg !== null ? '：レインズ登録の期限は ' + K.mdw(r.reg) : ''));
    var dt = $('#bkDetail'); if (dt && !DEMO) dt.scrollIntoView({ block: 'start' });
  }
  function addVisit() {
    var lid = $('#vsLead').value, pid = $('#vsProp').value, type = $('#vsType').value, written = $('#vsWritten').value === '1', l = lead(lid), p = prop(pid);
    if (!p) { toast('物件を選んでください'); return; }
    var v = { id: uid('v'), date: $('#vsDate').value || K.iso(TODAY), lead: lid, prop: pid, type: type, written: type === '申込' && written, result: $('#vsMemo').value.trim() || (type === '申込' ? (written ? '書面で申込を受けた' : '口頭で申込') : '案内'), memo: '' };
    S.visits.push(v); vsNew = v.id;
    var msg = type + '：' + (l ? l.name : '') + '・' + pname(pid);
    if (type === '申込') {
      if (l) l.status = '申込';
      var m = activeBk(pid);
      if (m && K.isSen(m.kind) && v.written) { m.status = '書面による購入申込みあり'; m.statusDate = K.iso(TODAY); m.reflect = ''; }
      var d = { id: uid('d'), kind: l && l.kind === '賃貸' ? '賃貸' : '売買', prop: pid, lead: lid, name: p.name, buyer: l ? l.name : '', seller: m ? m.owner : '', price: p.price, rent: 0, side: m ? '両手' : '買主側', akiya: p.akiya && p.price <= 8e6, residential: true, consent: false, deposit: Math.round(p.price * 0.05 / 100000) * 100000, contract: '', settle: '', fee: '', paid: null, status: '申込' };
      S.deals.unshift(d); drSel = d.id;
      msg += m && K.isSen(m.kind) && v.written ? '（レインズの取引状況を「書面による購入申込みあり」に）' : '';
    }
    log(msg); commit(); toast(type === '申込' ? '申込を記録しました。契約書の下書きが作れます' : '案内を記録しました');
  }
  function contractDeal(id) {
    var d = deal(id); if (!d) return;
    d.status = '契約'; d.contract = K.iso(TODAY); if (!d.settle) d.settle = K.iso(TODAY + 30);
    var l = lead(d.lead); if (l) { l.status = '契約'; l.amount = fee(d); }
    var m = activeBk(d.prop); if (m) { m.closed = true; m.memo = K.md(TODAY) + ' 売買契約'; }
    log('契約：' + dealName(d) + '・報酬 ' + yen(fee(d)) + '（決済 ' + K.md(D(d.settle)) + '）'); commit(); toast('契約を記録しました（決済の予定 ' + K.mdw(D(d.settle)) + '）');
  }
  function paidDeal(id) {
    var d = deal(id); if (!d) return;
    d.paid = { date: K.iso(TODAY), amt: fee(d) }; d.status = '決済済み'; if (!d.settle || D(d.settle) > TODAY) d.settle = K.iso(TODAY); stNew = d.id;
    log('決済：' + dealName(d) + '・報酬 ' + yen(d.paid.amt) + ' を受領'); commit(); toast('決済・報酬の受領を記録しました');
  }
  function onBind(el, final) {
    var b = el.getAttribute('data-bind').split(':'), v = el.value;
    switch (b[0]) {
      case 'co': {
        var c = C(), k = b[1];
        if (k === 'holidays' || k === 'startNext') c[k] = v === '1';
        else if (['gap', 'firstGoal', 'renewMonths', 'soon'].indexOf(k) >= 0) c[k] = n0(v);
        else c[k] = v;
        if (k === 'name') $('#coName').textContent = v;
        save(); return;
      }
      case 'sim': { var x = n0(v); S.sim[b[1]] = b[2] === 'pct' ? K.clean(x / 100) : x; save(); if (final) render(); return; }
      case 'pp': { var p = prop(b[1]); p[b[2]] = v; save(); if (final) render(); return; }
      case 'sv': { var pp = prop(svProp), s = pp.survey[b[1]] || (pp.survey[b[1]] = { st: '', memo: '' }); s.memo = v; save(); return; }
      case 'bk': { var m = bk(b[1]); if (b[2] === 'status' && m.status !== v) { m.status = v; m.statusDate = K.iso(TODAY); log('取引状況：' + pname(m.prop) + 'を「' + v + '」に'); } save(); if (final) render(); return; }
      case 'dl': { var d = deal(b[1]), f = b[2]; if (f === 'akiya') d[f] = v === '1'; else if (['price', 'deposit', 'rent'].indexOf(f) >= 0) d[f] = n0(v); else d[f] = v; save(); if (final) render(); return; }
    }
  }
  document.addEventListener('input', function (ev) {
    var el = ev.target;
    if (!el.getAttribute || !el.hasAttribute('data-bind')) return;
    if (el.tagName === 'SELECT' || el.type === 'date') return; // change で受ける
    onBind(el, false);
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target; if (!el.getAttribute) return;
    if (el.hasAttribute('data-ls')) { var l = lead(el.getAttribute('data-ls')); l.status = el.value; log('状態：' + l.name + '→' + el.value); commit(); return; }
    if (el.hasAttribute('data-ln')) { var l2 = lead(el.getAttribute('data-ln')); l2.next = el.value; commit(); return; }
    if (el.hasAttribute('data-fee')) { var k = el.getAttribute('data-fee'); feeIn[k] = (k === 'akiya' || k === 'res' || k === 'consent') ? el.value === '1' : n0(el.value); render(); return; }
    if (el.id === 'ldOnly') { ldOnly = el.value; render(); return; }
    if (el.id === 'svProp') { svProp = el.value; render(); return; }
    if (el.id === 'svOnly') { svOnly = el.value; render(); return; }
    if (el.id === 'drDeal') { drSel = el.value; render(); return; }
    if (el.id === 'bkProp' || el.id === 'bkKind' || el.id === 'vsType' || el.id === 'vsLead' || el.id === 'vsProp' || el.id === 'ldKind') return;
    if (!el.hasAttribute('data-bind')) return;
    onBind(el, true);
  });
  document.addEventListener('click', function (ev) {
    var nb = ev.target.closest && ev.target.closest('#nav button'); if (nb) { go(nb.getAttribute('data-view')); return; }
    var tk = ev.target.closest && ev.target.closest('[data-go]'); if (tk) { go(tk.getAttribute('data-go')); return; }
    var b = ev.target.closest && ev.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'TEXTAREA' || b.tagName === 'INPUT') return;
    if (b.disabled) return;
    var a = b.getAttribute('data-act'), id = b.getAttribute('data-id');
    switch (a) {
      case 'reset':
        if (!DEMO && !window.confirm('今の入力を消して、見本データ（架空）に戻しますか？')) return;
        S = fresh(); shown = {}; bkSel = null; drSel = null; ldNew = null; vsNew = null; stNew = null; save(); $('#coName').textContent = S.company.name; go(view); toast('見本データに戻しました'); return;
      case 'ld-add': addLead(); return;
      case 'ld-call': callLead(id); return;
      case 'sv': { var p = prop(svProp), i = b.getAttribute('data-i'), st = b.getAttribute('data-st'), s = p.survey[i] || (p.survey[i] = { st: '', memo: '' }); s.st = s.st === st ? '' : st; commit(); return; }
      case 'bk-add': addBk(); return;
      case 'bk-sel': bkSel = bkSel === id ? null : id; render(); if (bkSel && !DEMO) { var dt = $('#bkDetail'); if (dt) dt.scrollIntoView({ block: 'start' }); } return;
      case 'bk-reins': { var m = bk(id); m.reins = K.iso(TODAY); var r = bkInfo(m); log('レインズ登録：' + pname(m.prop) + '（期限 ' + K.md(r.reg) + '）'); commit(); toast('レインズ登録を記録しました（期限 ' + K.mdw(r.reg) + '）'); return; }
      case 'bk-report': { var m2 = bk(id); m2.lastReport = K.iso(TODAY); m2.reports = (m2.reports || []).concat([K.iso(TODAY)]); log('業務報告：' + pname(m2.prop) + '（' + m2.kind + '）'); commit(); toast('業務報告を記録しました（次は ' + K.mdw(bkInfo(m2).nextRep) + 'まで）'); return; }
      case 'bk-reflect': { var m3 = bk(id); m3.reflect = K.iso(TODAY); log('レインズの取引状況を反映：' + pname(m3.prop)); commit(); toast('取引状況の反映を記録しました'); return; }
      case 'set-off': { var c = C(), w = +b.getAttribute('data-w'), ix = c.off.indexOf(w); if (ix >= 0) c.off.splice(ix, 1); else if (c.off.length < 6) c.off.push(w); c.off.sort(); commit(); return; }
      case 'vs-add': addVisit(); return;
      case 'dr-contract': contractDeal(id); return;
      case 'st-paid': paidDeal(id); return;
      case 'le-done': { var le = lease(id); le.done = true; log('賃貸：' + le.bld + ' ' + le.room + 'の案内・通知を出した'); commit(); return; }
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
    var newLead = null, newDeal = null;
    wait(1100)
      .then(function () { pulse(0); return nav('lead'); })
      .then(function () { return pick('#ldKind', '売買'); })
      .then(function () { return type('#ldName', 'デモ 太郎様（架空）', 30); })
      .then(function () { return type('#ldWant', '中古戸建・2,000万円台', 28); })
      .then(function () { return click('#ldAdd'); })
      .then(function () { newLead = S.leads[0].id; return wait(650); })
      .then(function () { pulse(1); return click('#call-' + newLead); })
      .then(function () { return wait(650); })
      .then(function () { pulse(3); return nav('baikai'); })
      .then(function () { return pick('#bkProp', 'p5'); })
      .then(function () { return type('#bkOwner', '売主E様（架空）', 30); })
      .then(function () { return pick('#bkKind', '専属専任'); })
      .then(function () { return click('#bkAdd'); })
      .then(function () { return moveTo($('#bkCal'), 420); })
      .then(function () { return wait(1300); })
      .then(function () { return click('#bkReins'); })
      .then(function () { return wait(600); })
      .then(function () { pulse(4); return nav('visit'); })
      .then(function () { return pick('#vsLead', newLead); })
      .then(function () { return pick('#vsProp', 'p5'); })
      .then(function () { return pick('#vsType', '申込'); })
      .then(function () { return click('#vsAdd'); })
      .then(function () { newDeal = S.deals[0].id; return wait(650); })
      .then(function () { pulse(5); return nav('draft'); })
      .then(function () { return pick('#drSettle', K.iso(TODAY + 8)); })
      .then(function () { return moveTo($('#drDoc'), 420); })
      .then(function () { return wait(1100); })
      .then(function () { return click('#drContract'); })
      .then(function () { return wait(600); })
      .then(function () { pulse(6); return nav('settle'); })
      .then(function () { return moveTo($('#stTbl tr.new') || $('#stTbl'), 420); })
      .then(function () { return wait(900); })
      .then(function () { pulse(7); return nav('dash'); })
      .then(function () { return wait(2400); })
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
