/* Trading Studio - screens. Calculations are in logic.js (tested), position size in ps.js (same file as /position-size/).
   Data is kept in localStorage only (nothing is sent). Motion uses requestAnimationFrame, max 30 fps, stops when idle or hidden.
   ?demo=1     plays an automatic tour that clicks the real buttons (nothing is saved)
   ?capture=1  the clock is driven from outside (window.__studio.advance(ms)) for frame-exact recording
   ?today=2026-10-31  fixes "today" (sample / recording) */
(function () {
  'use strict';
  var TL = window.TL, PS = window.PS, DATA = window.TDATA;
  var ED = window.TS_EDITION === 'full' ? 'full' : 'web', VER = window.TS_VERSION || '1.0.0';
  var Q = new URLSearchParams(location.search);
  var DEMO = Q.get('demo') === '1', CAPTURE = Q.get('capture') === '1';
  var KEY = ED === 'full' ? 'trading-studio-full-v1' : 'trading-studio-v1';
  function localToday() { var d = new Date(); return d.getFullYear() + '-' + TL.pad(d.getMonth() + 1) + '-' + TL.pad(d.getDate()); }
  var TODAY = /^\d{4}-\d{2}-\d{2}$/.test(Q.get('today') || '') ? Q.get('today') : localToday();
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ================= storage =================
  var S, storageOk = true;
  function load() {
    if (DEMO) return DATA.sample(TODAY);
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var c = TL.checkState(JSON.parse(raw)); if (c.ok) return fill(c.data); }
    } catch (e) { storageOk = false; }
    return DATA.sample(TODAY);
  }
  function fill(o) {
    var base = DATA.empty();
    o.settings = Object.assign(base.settings, o.settings || {});
    o.prop = Object.assign(base.prop, o.prop || {});
    o.risk = Object.assign(base.risk, o.risk || {});
    o.dayNotes = o.dayNotes || {};
    if (typeof o.seq !== 'number') o.seq = 100 + o.trades.length;
    return o;
  }
  function save() {
    if (DEMO) return;
    try { localStorage.setItem(KEY, JSON.stringify(S)); storageOk = true; } catch (e) { storageOk = false; }
    showWarn();
  }
  function showWarn() {
    var w = $('#warn'), html = '';
    if (!DEMO && !storageOk) html = 'This browser cannot save (private mode or storage blocked). Your entries will be lost when you close the page. Export a backup in Settings &amp; data.';
    else if (!DEMO && S.sample) html = 'You are looking at a <b>fictional sample</b>. <button class="ghost sm" data-act="start-empty">Start my own journal</button>';
    w.hidden = !html; w.innerHTML = html;
    $('#chipFict').hidden = !S.sample; $('#sideFict').hidden = !S.sample;
  }
  function uid() { S.seq = (S.seq || 100) + 1; return 't' + S.seq; }
  function cur() { return S.settings.currency; }
  function M(v, signed) { return TL.money(v, cur(), signed); }
  function cls(v) { return v > 0 ? 'pos' : v < 0 ? 'neg' : ''; }

  // ================= clock & motion =================
  var vt = 0;
  function now() { return CAPTURE ? vt : performance.now(); }
  var tweens = [], timers = [], running = false, lastTs = -1;
  function ease(p) { return 1 - Math.pow(1 - p, 3); }
  function easeIO(p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function tween(dur, fn, done, ez) { var t = { t0: now(), dur: dur, fn: fn, done: done, ez: ez || ease }; tweens.push(t); fn(0); kick(); return t; }
  function wait(ms) { return new Promise(function (res) { timers.push({ at: now() + ms, res: res }); kick(); }); }
  function frame() {
    var t = now(), ts = tweens.slice(); tweens = [];
    ts.forEach(function (x) { var p = Math.min(1, (t - x.t0) / x.dur); x.fn(x.ez(p)); if (p < 1) tweens.push(x); else if (x.done) x.done(); });
    var due = timers.filter(function (x) { return x.at <= t; }); timers = timers.filter(function (x) { return x.at > t; });
    due.forEach(function (x) { x.res(); });
  }
  function loop(ts) {
    if (!running) return;
    if (document.hidden) { running = false; return; }
    if (lastTs < 0 || ts - lastTs >= 33) { lastTs = ts; frame(); }
    if (tweens.length || timers.length) requestAnimationFrame(loop); else running = false;
  }
  function kick() { if (CAPTURE || running || document.hidden) return; running = true; lastTs = -1; requestAnimationFrame(loop); }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  window.__studio = {
    advance: function (ms) { vt += ms; frame(); return new Promise(function (r) { setTimeout(r, 0); }); },
    ready: null, demoDone: false,
    state: function () { return JSON.parse(JSON.stringify(S)); }, view: function () { return view; }
  };
  var shown = {};
  var FMT = {
    money: function (v) { return M(v); }, moneyS: function (v) { return M(v, true); },
    pct1: function (v) { return TL.fx(v, 1, '%'); }, n0: function (v) { return TL.fx(v, 0); }, n2: function (v) { return TL.fx(v, 2); }, r: function (v) { return TL.fmtR(v); }
  };
  function animate(root) {
    $$('[data-v]', root).forEach(function (el) {
      var k = el.getAttribute('data-k'), to = parseFloat(el.getAttribute('data-v')), f = FMT[el.getAttribute('data-f')];
      if (!isFinite(to) || !f) return;
      var from = shown[k] === undefined ? 0 : shown[k]; shown[k] = to;
      if (from === to) { el.textContent = f(to); return; }
      tween(750, function (p) { el.textContent = f(from + (to - from) * p); }, function () { el.textContent = f(to); });
    });
    $$('[data-w]', root).forEach(function (el) {
      var to = Math.max(0, Math.min(100, parseFloat(el.getAttribute('data-w')) || 0));
      tween(800, function (p) { el.style.width = (to * p).toFixed(2) + '%'; });
    });
    $$('path.draw', root).forEach(function (el) {
      var L = el.getTotalLength ? el.getTotalLength() : 0; if (!L) return;
      el.style.strokeDasharray = L; tween(1100, function (p) { el.style.strokeDashoffset = (L * (1 - p)).toFixed(1); }, function () { el.style.strokeDasharray = 'none'; }, easeIO);
    });
    $$('.fade', root).forEach(function (el) { tween(900, function (p) { el.style.opacity = p.toFixed(2); }); });
  }
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg;
    tween(200, function (p) { t.style.opacity = p; });
    wait(2200).then(function () { tween(300, function (p) { t.style.opacity = 1 - p; }); });
  }
  function download(name, text, type) {
    if (DEMO) { toast('Demo: nothing is downloaded'); return; }
    var b = new Blob([text], { type: type || 'text/plain' }), u = URL.createObjectURL(b), a = document.createElement('a');
    a.href = u; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1000);
  }

  // ================= navigation =================
  var view = 'dash';
  var TITLES = { dash: 'Dashboard', trades: 'Trades', import: 'Import CSV', prop: 'Prop rules', break: 'Breakdown', cal: 'Calendar', size: 'Position size', risk: 'Risk lab', set: 'Settings & data' };
  function go(v) {
    view = v;
    $$('#nav button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-view') === v); });
    $$('.view').forEach(function (s) { s.classList.toggle('on', s.id === 'v-' + v); });
    $('#viewTitle').textContent = TITLES[v];
    $('#main').scrollTop = 0;
    render();
  }
  function render() {
    var f = R[view]; if (f) f($('#v-' + view));
    animate($('#v-' + view));
  }
  function commit() { save(); render(); }

  // ================= charts =================
  function eqChart(st, W, H) {
    var c = st.curve, n = c.length; if (n < 2) return '<p class="note">Add or import trades to see the equity curve.</p>';
    var pl = 56, pr = 10, pt = 12, pb = 22, w = W - pl - pr, h = H - pt - pb;
    var lo = Infinity, hi = -Infinity; c.forEach(function (p) { if (p.eq < lo) lo = p.eq; if (p.eq > hi) hi = p.eq; });
    var pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.02 || 1; lo -= pad; hi += pad;
    var X = function (i) { return pl + w * i / (n - 1); }, Y = function (v) { return pt + h * (1 - (v - lo) / (hi - lo)); };
    var d = c.map(function (p, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.eq).toFixed(1); }).join(' ');
    var area = d + ' L' + X(n - 1).toFixed(1) + ' ' + (pt + h) + ' L' + pl + ' ' + (pt + h) + ' Z';
    var startY = Y(st.start), ddBand = '';
    if (st.maxDD > 0) {
      var i0 = -1, i1 = -1; c.forEach(function (p, i) { if (i0 < 0 && p.t === st.ddPeak && st.ddPeak) i0 = i; if (p.t === st.ddLow) i1 = i; });
      if (!st.ddPeak) i0 = 0;
      if (i0 >= 0 && i1 > i0) ddBand = '<rect x="' + X(i0).toFixed(1) + '" y="' + pt + '" width="' + (X(i1) - X(i0)).toFixed(1) + '" height="' + h + '" fill="rgba(255,90,110,.09)"/><text class="lb" x="' + (X(i0) + 4).toFixed(1) + '" y="' + (pt + 12) + '" fill="#ff5a6e">max DD</text>';
    }
    var ticks = [lo + pad, (lo + hi) / 2, hi - pad].map(function (v) { return '<text class="ax" x="' + (pl - 6) + '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end">' + esc(TL.money(v, cur()).replace(/\.\d+$/, '')) + '</text><line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="rgba(255,255,255,.05)"/>'; }).join('');
    var first = TL.dayOf(c[1].t), last = TL.dayOf(c[n - 1].t);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" height="' + H + '" role="img" aria-label="Equity curve">' +
      '<defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(216,92,255,.35)"/><stop offset="1" stop-color="rgba(216,92,255,0)"/></linearGradient></defs>' + ticks + ddBand +
      '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + startY.toFixed(1) + '" y2="' + startY.toFixed(1) + '" stroke="#4d8dff" stroke-dasharray="4 4" stroke-width="1"/>' +
      '<path class="fade" d="' + area + '" fill="url(#eqg)" style="opacity:0"/><path class="draw" d="' + d + '" fill="none" stroke="#d85cff" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<circle cx="' + X(n - 1).toFixed(1) + '" cy="' + Y(c[n - 1].eq).toFixed(1) + '" r="3.5" fill="#fff"/>' +
      '<text class="ax" x="' + pl + '" y="' + (H - 6) + '">' + esc(first) + '</text><text class="ax" x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end">' + esc(last) + '</text></svg>';
  }
  function rHist(rs, W, H) {
    if (!rs.length) return '<p class="note">R multiples appear when trades have a risk amount (1R) or a stop-loss price.</p>';
    var bins = [], lo = -2, step = 0.5, nb = 12, mx = 0;
    for (var i = 0; i < nb; i++) bins.push(0);
    rs.forEach(function (r) { var k = Math.floor((r - lo) / step); k = Math.max(0, Math.min(nb - 1, k)); bins[k]++; });
    bins.forEach(function (b) { if (b > mx) mx = b; });
    var pl = 6, pb = 18, w = (W - pl * 2) / nb, h = H - pb - 6, s = '';
    bins.forEach(function (b, i) {
      var bh = mx ? h * b / mx : 0, x = pl + i * w, neg = lo + i * step < 0;
      s += '<rect x="' + (x + 2).toFixed(1) + '" y="' + (6 + h - bh).toFixed(1) + '" width="' + (w - 4).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="3" fill="' + (neg ? 'rgba(255,90,110,.75)' : 'rgba(47,224,160,.75)') + '"/>';
      if (i % 2 === 0) s += '<text class="ax" x="' + (x + 2).toFixed(1) + '" y="' + (H - 4) + '">' + (lo + i * step) + 'R</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" height="' + H + '" role="img" aria-label="R multiple distribution">' + s + '</svg>';
  }
  function widthOf(el, dflt) { var w = el && el.clientWidth; return Math.max(260, Math.floor((w || dflt) - 4)); }

  // ================= views =================
  var R = {};
  var tile = function (k, label, v, f, sub, color) { return '<div class="panel kpi"><div class="lab">' + label + '</div><div class="val ' + (color || '') + '" data-k="' + k + '" data-v="' + (isFinite(v) ? v : '') + '" data-f="' + f + '">' + (isFinite(v) ? FMT[f](v) : v === Infinity ? '∞' : '—') + '</div><div class="sub">' + sub + '</div></div>'; };
  function holdTxt(m) { if (m === null) return '—'; var h = Math.floor(m / 60), mm = Math.round(m % 60); return (h ? h + 'h ' : '') + mm + 'm'; }

  R.dash = function (el) {
    var st = TL.stats(S.trades, S.settings.startBalance), pr = TL.prop(S.trades, S.prop, TODAY);
    var html = '<div class="grid g4">' +
      tile('net', 'Net P&amp;L', st.net, 'moneyS', 'Balance ' + esc(M(st.balance)) + ' · after fees', cls(st.net)) +
      tile('wr', 'Win rate', st.winRate, 'pct1', st.wins + ' wins · ' + st.losses + ' losses · ' + st.be + ' even') +
      tile('pf', 'Profit factor', st.pf, 'n2', 'Gross win ' + esc(M(st.grossWin)) + ' / loss ' + esc(M(st.grossLoss))) +
      tile('ex', 'Expectancy / trade', st.expectancy, 'moneyS', 'Average net result per trade', cls(st.expectancy)) +
      tile('ar', 'Average R', st.avgR, 'r', st.rCount + ' of ' + st.n + ' trades have a risk amount', cls(st.avgR)) +
      tile('dd', 'Max drawdown', st.maxDD, 'money', TL.fx(st.maxDDPct, 2, '%') + ' from the peak (closed trades)', st.maxDD > 0 ? 'neg' : '') +
      tile('ls', 'Max losing streak', st.maxLossStreak, 'n0', 'Longest winning streak ' + st.maxWinStreak) +
      tile('n', 'Trades', st.n, 'n0', 'Average holding time ' + holdTxt(st.avgHoldMin)) +
      '</div><div class="grid g32 mt"><div class="panel"><div class="ph"><h2><b>//</b>Equity curve</h2><div class="legend"><span><i style="background:#d85cff"></i>Balance after each trade</span><span><i style="background:#4d8dff"></i>Start</span></div></div><div class="chart" id="eqChart"></div></div>' +
      '<div class="panel bl"><div class="ph"><h2><b>//</b>Your prop rules</h2><button class="ghost sm" data-go="prop">Open</button></div>' + propMini(pr) + '</div></div>' +
      '<div class="grid g2 mt"><div class="panel bl"><div class="ph"><h2><b>//</b>R multiple distribution</h2></div><div class="chart" id="rChart"></div></div>' +
      '<div class="panel"><div class="ph"><h2><b>//</b>Latest trades</h2><button class="ghost sm" data-go="trades">All trades</button></div>' + latest(5) + '</div></div>';
    el.innerHTML = html;
    $('#eqChart').innerHTML = eqChart(st, widthOf($('#eqChart'), 640), 230);
    $('#rChart').innerHTML = rHist(st.rs, widthOf($('#rChart'), 420), 150);
  };
  function statusTxt(pr) { return pr.status === 'limit' ? 'A limit was reached' : pr.status === 'met' ? 'Target and minimum days reached' : 'Within your limits'; }
  function propMini(pr) {
    if (!(pr.size > 0)) return '<p class="note">Set your account size in Prop rules.</p>';
    var tTone = pr.today.usedPct >= 100 ? 'bad' : pr.today.usedPct >= 60 ? 'warn' : 'ok';
    var mTone = pr.maxUsedPct >= 100 ? 'bad' : pr.maxUsedPct >= 60 ? 'warn' : 'ok';
    return '<div class="status ' + pr.status + '" style="margin-bottom:12px"><b>' + statusTxt(pr) + '</b><span class="note">closed trades since ' + esc(S.prop.from || 'the first trade') + '</span></div><div class="grid" style="gap:12px">' +
      gauge('Daily loss used today', M(pr.today.used) + ' of ' + M(pr.today.limit), pr.today.usedPct, tTone) +
      gauge('Max loss used', M(Math.max(0, pr.maxAmt - pr.maxRoom)) + ' of ' + M(pr.maxAmt), pr.maxUsedPct, mTone) +
      (pr.target > 0 ? gauge('Profit target', M(pr.profit, true) + ' of ' + M(pr.target), pr.targetProgress, 'goal') : '') +
      (pr.minDays > 0 ? gauge('Trading days (min ' + pr.minDays + ')', pr.tradingDays + (pr.tradingDays >= pr.minDays ? ' — met' : ' of ' + pr.minDays), pr.tradingDays / pr.minDays * 100, 'goal') : '') + '</div>';
  }
  function gauge(label, right, pct, tone) { return '<div class="gauge"><div class="t"><span>' + label + '</span><em>' + esc(right) + '</em></div><div class="track ' + tone + '"><i data-w="' + Math.min(100, pct || 0).toFixed(2) + '"></i></div></div>'; }
  function latest(n) {
    var l = TL.sortTrades(S.trades).slice(-n).reverse();
    if (!l.length) return '<p class="note">No trades yet.</p>';
    return l.map(function (t) { var v = TL.net(t), r = TL.rMult(t); return '<div class="li"><span class="m">' + esc(TL.when(t).slice(5, 10)) + ' ' + esc(TL.when(t).slice(11, 16)) + '</span><span class="x"><b>' + esc(t.symbol) + '</b> <span class="pill ' + (t.side || '') + '">' + (t.side || '—') + '</span> <small class="note">' + esc(TL.tagsOf(t.tags).join(', ')) + '</small></span><span class="v ' + cls(v) + '">' + esc(M(v, true)) + '</span><span class="v note" style="width:58px">' + esc(TL.fmtR(r)) + '</span></div>'; }).join('');
  }

  // ---- trades ----
  var editId = null, flashId = null, tFilter = '', showAll = false;
  function dtl(ts) { return ts ? ts.slice(0, 16).replace(' ', 'T') : ''; }
  function fromDtl(v) { return v ? TL.parseDate(v.replace('T', ' ')) || '' : ''; }
  function nv(x) { return x === null || x === undefined ? '' : String(x); }
  R.trades = function (el) {
    var t = editId ? S.trades.filter(function (x) { return x.id === editId; })[0] : null;
    var d = t || { open: TODAY + ' 09:00:00', close: TODAY + ' 10:00:00', symbol: '', side: 'long', qty: null, entry: null, exit: null, sl: null, gross: null, fees: null, risk: null, tags: [], note: '' };
    var f = function (id, label, val, extra) { return '<label class="f">' + label + '<input id="' + id + '" value="' + esc(val) + '" ' + (extra || 'inputmode="decimal" class="num" autocomplete="off"') + '></label>'; };
    var rows = TL.sortTrades(S.trades).reverse();
    var q = tFilter.trim().toLowerCase();
    if (q) rows = rows.filter(function (x) { return (x.symbol + ' ' + TL.tagsOf(x.tags).join(' ') + ' ' + (x.note || '') + ' ' + (x.side || '')).toLowerCase().indexOf(q) >= 0; });
    var total = rows.length; if (!showAll) rows = rows.slice(0, 60);
    el.innerHTML = '<div class="panel"><div class="ph"><h2><b>+</b>' + (t ? 'Edit trade' : 'Add a trade') + '</h2><button class="ghost sm" id="t-new">New trade</button></div>' +
      '<div class="form">' +
      '<label class="f">Open time<input id="t-open" type="datetime-local" value="' + esc(dtl(d.open)) + '"></label>' +
      '<label class="f">Close time<input id="t-close" type="datetime-local" value="' + esc(dtl(d.close)) + '"></label>' +
      f('t-symbol', 'Symbol', d.symbol, 'autocomplete="off" placeholder="e.g. EURUSD, AAPL, ES"') +
      '<label class="f">Side<select id="t-side"><option value="long"' + (d.side === 'long' ? ' selected' : '') + '>Long (buy)</option><option value="short"' + (d.side === 'short' ? ' selected' : '') + '>Short (sell)</option></select></label>' +
      f('t-qty', 'Size (lots, shares, contracts)', nv(d.qty)) + f('t-entry', 'Entry price', nv(d.entry)) + f('t-exit', 'Exit price', nv(d.exit)) + f('t-sl', 'Stop-loss price (optional)', nv(d.sl)) +
      f('t-gross', 'Profit / loss before fees', nv(d.gross)) + f('t-fees', 'Fees: commission + swap (cost = positive)', nv(d.fees)) +
      f('t-risk', 'Risk amount, 1R (empty = from the stop)', d.riskFrom === 'stop' ? '' : nv(d.risk)) +
      f('t-tags', 'Setup / tags (comma separated)', TL.tagsOf(d.tags).join(', '), 'autocomplete="off" placeholder="e.g. Pullback, London"') +
      '<label class="f wide">Note<textarea id="t-note" rows="2" placeholder="What did you see? What would you repeat or avoid?">' + esc(d.note) + '</textarea></label></div>' +
      '<p class="note" id="t-preview"></p><p class="err" id="t-err"></p><div class="btns"><button class="btn" id="t-save">' + (t ? 'Save changes' : 'Add trade') + '</button>' + (t ? '<button class="ghost" id="t-cancel">Cancel</button>' : '') + '</div></div>' +
      '<div class="panel mt"><div class="ph"><h2><b>//</b>Journal · ' + total + ' trades</h2><input id="t-filter" placeholder="Filter: symbol, setup, note" value="' + esc(tFilter) + '" style="max-width:260px"></div><div class="tw"><table><thead><tr><th>Closed</th><th>Symbol</th><th>Side</th><th class="r">Size</th><th class="r">Entry</th><th class="r">Exit</th><th class="r">Net</th><th class="r">R</th><th>Setup</th><th>Note</th><th></th></tr></thead><tbody>' +
      rows.map(function (x) { var v = TL.net(x); return '<tr data-id="' + esc(x.id) + '"' + (x.id === flashId ? ' class="flash"' : '') + '><td class="mono">' + esc(TL.when(x).slice(0, 16)) + '</td><td><b>' + esc(x.symbol) + '</b></td><td><span class="pill ' + esc(x.side) + '">' + esc(x.side || '—') + '</span></td><td class="r mono">' + esc(nv(x.qty)) + '</td><td class="r mono">' + esc(nv(x.entry)) + '</td><td class="r mono">' + esc(nv(x.exit)) + '</td><td class="r mono ' + cls(v) + '">' + esc(M(v, true)) + '</td><td class="r mono">' + esc(TL.fmtR(TL.rMult(x))) + '</td><td>' + esc(TL.tagsOf(x.tags).join(', ')) + '</td><td class="note" style="max-width:220px;overflow:hidden;text-overflow:ellipsis">' + esc(x.note) + '</td><td><button class="ghost sm" data-act="edit" data-id="' + esc(x.id) + '">Edit</button> <button class="ghost sm" data-act="del" data-id="' + esc(x.id) + '">Delete</button></td></tr>'; }).join('') +
      '</tbody></table></div>' + (total > rows.length ? '<p><button class="ghost" data-act="show-all">Show all ' + total + '</button></p>' : '') + (total ? '' : '<p class="note">No trades match.</p>') + '</div>';
    preview();
  };
  function formTrade() {
    var g = function (id) { return $('#' + id).value; }, N = function (id) { return TL.parseNum(g(id)); };
    var t = { open: fromDtl(g('t-open')), close: fromDtl(g('t-close')), symbol: g('t-symbol').trim().toUpperCase().replace(/\s+/g, ''), side: g('t-side'), qty: N('t-qty'), entry: N('t-entry'), exit: N('t-exit'), sl: N('t-sl'), gross: N('t-gross'), fees: N('t-fees'), risk: N('t-risk'), tags: TL.tagsOf(g('t-tags')), note: g('t-note').trim().slice(0, 1000) };
    var err = '';
    ['qty', 'entry', 'exit', 'sl', 'fees', 'risk'].forEach(function (k) { if (typeof t[k] === 'number' && isNaN(t[k])) err = 'Please enter numbers only.'; });
    if (typeof t.gross === 'number' && isNaN(t.gross)) err = 'Profit / loss must be a number (use - for a loss).';
    if (!t.close && !t.open) err = 'Enter the open or close time.';
    else if (t.open && t.close && t.close < t.open) err = 'The close time is before the open time.';
    if (!t.symbol) err = err || 'Enter a symbol.';
    if (t.gross === null) err = err || 'Enter the profit or loss.';
    if (t.fees === null) t.fees = 0;
    if (t.risk !== null && !(t.risk > 0)) t.risk = null;
    t.riskFrom = t.risk ? 'manual' : '';
    if (!t.risk) { var dr = TL.deriveRisk(t.entry, t.exit, t.sl, t.gross); if (dr) { t.risk = dr; t.riskFrom = 'stop'; } }
    return { t: t, err: err };
  }
  function preview() {
    var p = $('#t-preview'); if (!p) return;
    var f = formTrade(), t = f.t;
    if (t.gross === null || isNaN(t.gross)) { p.textContent = 'Net, risk and R appear here as you type.'; return; }
    var v = TL.net(t), r = TL.rMult(t);
    p.innerHTML = 'Net <b class="' + cls(v) + '">' + esc(M(v, true)) + '</b> · Risk ' + (t.risk ? esc(M(t.risk)) + (t.riskFrom === 'stop' ? ' (from the stop)' : '') : '—') + ' · <b>' + esc(TL.fmtR(r)) + '</b>';
  }
  function saveTrade() {
    var f = formTrade(); $('#t-err').textContent = f.err; if (f.err) return false;
    var t = f.t;
    if (editId) { var o = S.trades.filter(function (x) { return x.id === editId; })[0]; if (o) { Object.assign(o, t); flashId = o.id; } editId = null; toast('Trade saved'); }
    else { t.id = uid(); t.seqNo = S.seq; S.trades.push(t); flashId = t.id; toast('Trade added: ' + t.symbol + ' ' + M(TL.net(t), true)); }
    S.sample = S.sample && true; commit(); return true;
  }

  // ---- import ----
  var imp = { text: '', table: null, map: [], layout: 'auto', dec: 'auto', order: 'auto', shift: 0, result: null, fileName: '', msg: '' };
  function impParse() {
    imp.table = imp.text.trim() ? TL.readTable(imp.text) : null;
    imp.layout = 'auto'; imp.map = imp.table ? imp.table.map.slice() : [];
    if (imp.table) {
      var vals = []; imp.map.forEach(function (f, i) { if (f === 'open' || f === 'close') imp.table.rows.slice(0, 300).forEach(function (r) { vals.push(r[i]); }); });
      imp.guess = TL.guessOrder(vals);
    }
    impRun();
  }
  function impRun() {
    if (!imp.table || !imp.table.rows.length) { imp.result = null; return; }
    imp.result = TL.importRows(imp.table.rows, imp.map, { dec: imp.dec === 'auto' ? undefined : imp.dec, order: imp.order === 'auto' ? (imp.guess || 'auto') : imp.order, shiftHours: +imp.shift || 0, existing: S.trades });
  }
  function applyLayout(k) {
    imp.layout = k;
    if (k === 'auto') imp.map = imp.table.map.slice();
    else if (TL.LAYOUTS[k] && TL.LAYOUTS[k].cols.length === imp.table.headers.length) imp.map = TL.LAYOUTS[k].cols.slice();
    else if (k === 'header') imp.map = TL.autoMap(imp.table.headers);
    impRun();
  }
  R.import = function (el) {
    var tb = imp.table, res = imp.result;
    var html = '<div class="grid g2"><div class="panel"><div class="ph"><h2><b>1</b>Choose your file or paste</h2></div>' +
      '<div class="dropzone" id="imp-drop"><p style="margin:0 0 8px">CSV, TXT or an HTML report (MT4 / MT5 "Save as Report")</p><label class="btn bl" for="imp-file" style="display:inline-block">Choose a file</label><input id="imp-file" type="file" accept=".csv,.txt,.tsv,.htm,.html" class="sr"><p class="note" id="imp-fname">' + esc(imp.fileName) + '</p></div>' +
      '<label class="f mt">…or paste rows (for example, copied from the MT4 / MT5 history tab)<textarea id="imp-text" rows="5" spellcheck="false" wrap="off" placeholder="Paste here">' + esc(imp.text.length > 20000 ? imp.text.slice(0, 20000) : imp.text) + '</textarea></label>' +
      '<div class="btns mt"><button class="btn" id="imp-read">Read</button><button class="ghost" id="imp-example">Use the example (fictional MT4 history)</button></div><p class="note">The file is read inside this browser. Nothing is uploaded.</p></div>' +
      '<div class="panel bl"><div class="ph"><h2><b>?</b>Where to get the file</h2></div><div class="note" style="font-size:12.5px"><p><b>MT4 / MT5:</b> Account History (MT4) or History (MT5) → right-click → choose the period → Save as Report (HTML). You can also select rows and copy them.</p><p><b>cTrader:</b> History → export the closed positions to a CSV file.</p><p><b>Any other platform or broker:</b> export a CSV with one closed trade per row. In step 2 you tell Trading Studio which column is which.</p><p>Money columns: <b>commission, swap, taxes</b> are read as in MT4/MT5/cTrader (negative = cost). A <b>fees</b> column is read as a cost when positive.</p></div></div></div>';
    if (tb) {
      var opts = TL.FIELDS.map(function (f) { return '<option value="' + f[0] + '">' + esc(f[1]) + '</option>'; }).join('');
      var lay = [['auto', 'Detected: ' + TL.LAYOUT_NAMES[tb.layout] + (tb.headerless ? ' (no header row)' : '')], ['mt4', TL.LAYOUTS.mt4.name + ' - by position'], ['mt4b', TL.LAYOUTS.mt4b.name + ' - by position'], ['mt5', TL.LAYOUTS.mt5.name + ' - by position']];
      if (!tb.headerless) lay.push(['header', 'Match by column names']);
      html += '<div class="panel mt"><div class="ph"><h2><b>2</b>Check the columns</h2><span class="note">' + tb.rows.length + ' data rows found</span></div>' +
        '<div class="form"><label class="f">Column layout<select id="imp-layout">' + lay.map(function (o) { return '<option value="' + o[0] + '"' + (imp.layout === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>' +
        '<label class="f">Decimal mark<select id="imp-dec"><option value="auto">Automatic</option><option value=".">1,234.56 (dot)</option><option value=",">1.234,56 (comma)</option></select></label>' +
        '<label class="f">Date order (when the year is last)<select id="imp-order"><option value="auto">Automatic' + (imp.guess ? ' (' + (imp.guess === 'dmy' ? 'day/month' : 'month/day') + ')' : '') + '</option><option value="dmy">Day / month / year</option><option value="mdy">Month / day / year</option></select></label>' +
        '<label class="f">Shift times by (hours)<input id="imp-shift" class="num" inputmode="decimal" value="' + esc(imp.shift) + '"></label></div>' +
        '<div class="tw mt"><table class="map"><thead><tr><th>Column in your file</th><th>Means</th><th>First values</th></tr></thead><tbody>' +
        tb.headers.map(function (h, i) { var s = tb.rows.slice(0, 3).map(function (r) { return r[i]; }).filter(function (x) { return x !== '' && x !== undefined; }).join(' · '); return '<tr><td>' + esc(h || 'Column ' + (i + 1)) + '</td><td><select data-col="' + i + '"><option value="">(ignore)</option>' + opts + '</select></td><td class="sample-cell" title="' + esc(s) + '">' + esc(s) + '</td></tr>'; }).join('') +
        '</tbody></table></div></div>';
      html += '<div class="panel mt"><div class="ph"><h2><b>3</b>Import</h2></div>';
      if (res) {
        var ok = res.trades.length, sk = res.skipped.length, sum = res.trades.reduce(function (a, t) { return a + TL.net(t); }, 0), wr = res.trades.filter(function (t) { return t.risk; }).length;
        html += '<p style="margin:0 0 6px"><span class="big" id="imp-count">' + ok + '</span> trades ready · net ' + esc(M(sum, true)) + ' · ' + wr + ' with a risk amount · ' + sk + ' rows skipped</p>' +
          (sk ? '<div class="note">' + summarizeSkips(res.skipped) + '</div>' : '') +
          (S.sample ? '<label class="ck mt"><input type="checkbox" id="imp-clear" checked> Remove the fictional sample trades first</label>' : '') +
          '<div class="btns mt"><button class="btn" id="imp-go"' + (ok ? '' : ' disabled') + '>Import ' + ok + ' trades</button></div>';
        if (ok) html += '<div class="tw mt"><table><thead><tr><th>Closed</th><th>Symbol</th><th>Side</th><th class="r">Net</th><th class="r">Risk</th><th class="r">R</th></tr></thead><tbody>' + res.trades.slice(0, 6).map(function (t) { var v = TL.net(t); return '<tr><td class="mono">' + esc(TL.when(t).slice(0, 16)) + '</td><td>' + esc(t.symbol) + '</td><td>' + esc(t.side || '—') + '</td><td class="r mono ' + cls(v) + '">' + esc(M(v, true)) + '</td><td class="r mono">' + esc(t.risk ? M(t.risk) : '—') + '</td><td class="r mono">' + esc(TL.fmtR(TL.rMult(t))) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      } else html += '<p class="note">No data rows were found. Check the file or paste the rows again.</p>';
      html += '<p class="okmsg" id="imp-msg">' + esc(imp.msg) + '</p></div>';
    } else if (imp.msg) html += '<p class="okmsg mt" id="imp-msg">' + esc(imp.msg) + '</p>';
    el.innerHTML = html;
    if (tb) { $$('select[data-col]', el).forEach(function (s) { s.value = imp.map[+s.getAttribute('data-col')] || ''; }); $('#imp-dec').value = imp.dec; $('#imp-order').value = imp.order; }
  }
  function summarizeSkips(sk) {
    var g = {}; sk.forEach(function (s) { var k = s.why.replace(/\(.*\)/, '').trim(); g[k] = (g[k] || []); g[k].push(s.row); });
    return Object.keys(g).map(function (k) { return esc(k) + ': ' + g[k].length + ' (row ' + g[k].slice(0, 6).join(', ') + (g[k].length > 6 ? '…' : '') + ')'; }).join('<br>');
  }
  function doImport() {
    if (!imp.result || !imp.result.trades.length) return;
    var clear = $('#imp-clear') && $('#imp-clear').checked;
    if (clear) { S.trades = []; S.dayNotes = {}; S.sample = false; }
    var n = 0;
    imp.result.trades.forEach(function (t) { t.id = uid(); t.seqNo = S.seq; S.trades.push(t); n++; });
    imp.msg = n + (n === 1 ? ' trade' : ' trades') + ' imported.';
    imp.table = null; imp.result = null; imp.text = ''; imp.fileName = '';
    toast(n + (n === 1 ? ' trade' : ' trades') + ' imported');
    commit();
  }
  function readFile(file) {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { imp.msg = 'The file is too large (over 25 MB).'; render(); return; }
    var fr = new FileReader();
    fr.onload = function () { imp.text = TL.decodeBytes(new Uint8Array(fr.result)); imp.fileName = file.name; imp.msg = ''; impParse(); render(); };
    fr.readAsArrayBuffer(file);
  }

  // ---- prop ----
  R.prop = function (el) {
    var c = S.prop, pr = TL.prop(S.trades, c, TODAY);
    var num = function (id, label, v, hint) { return '<label class="f">' + label + '<input id="' + id + '" class="num" inputmode="decimal" value="' + esc(v) + '"' + (hint ? ' placeholder="' + hint + '"' : '') + '></label>'; };
    var days = pr.days.slice().reverse().slice(0, 25);
    el.innerHTML = '<div class="grid g32"><div class="panel"><div class="ph"><h2><b>//</b>Your rules</h2><span class="note">Enter the numbers from your own account. The presets are only examples.</span></div><div class="form">' +
      '<label class="f wide">Start from an example (editable)<select id="p-preset"><option value="custom">Custom (my own numbers)</option>' + TL.PRESETS.map(function (p) { return '<option value="' + p.id + '"' + (c.preset === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></label>' +
      num('p-size', 'Account size', c.size) + '<label class="f">Count trades from<input id="p-from" type="date" value="' + esc(c.from) + '"></label>' +
      num('p-daily', 'Daily loss limit (%)', c.dailyPct) + '<label class="f">Daily limit is a % of<select id="p-basis"><option value="initial">Account size</option><option value="dayStart">Day-start balance</option></select></label>' +
      num('p-max', 'Max loss (%)', c.maxPct) + '<label class="f">Max loss type<select id="p-type"><option value="static">Static</option><option value="trailing">Trailing (from high)</option></select></label>' +
      '<label class="ck" style="grid-column:1/-1"><input type="checkbox" id="p-lock"' + (c.trailLock ? ' checked' : '') + '> Trailing: the floor stops rising once it reaches the account size</label><p class="note" style="grid-column:1/-1;margin:0">Static: lowest allowed balance = account size − max loss. Trailing: highest closed balance − max loss.</p>' +
      num('p-target', 'Profit target (%) - 0 for none', c.targetPct) + num('p-days', 'Minimum trading days', c.minDays) + num('p-hour', 'New day starts at (hour 0-23)', c.dayStartHour) +
      '</div><p class="note mt">Checked on closed trades only. Open positions and floating profit or loss are not included, so your real equity can be lower during a trade.</p></div>' +
      '<div class="panel bl"><div class="ph"><h2><b>//</b>Status</h2></div>' + propMini(pr) +
      '<div class="mt">' + resRow('Balance (closed)', M(pr.balance)) + resRow('Lowest allowed balance now', M(pr.floor)) + resRow('Room to the max loss', M(pr.maxRoom)) + resRow('Room left today', M(pr.today.room)) + resRow('Worst day so far', pr.worstDay ? pr.worstDay.day + ' · ' + M(-pr.worstDay.used) + ' (' + TL.fx(pr.worstDay.usedPct, 0, '%') + ' of the limit)' : '—') + '</div></div></div>' +
      '<div class="panel mt"><div class="ph"><h2><b>//</b>Day by day</h2><span class="note">' + pr.tradingDays + ' trading days · ' + pr.n + ' trades</span></div>' +
      (pr.breaches.length ? '<p class="err">' + pr.breaches.map(function (b) { return b.rule === 'daily' ? esc(b.day) + ': daily loss ' + esc(M(b.used)) + ' reached the limit ' + esc(M(b.limit)) : esc(b.day) + ': balance ' + esc(M(b.balance)) + ' reached the max-loss floor ' + esc(M(b.floor)); }).join('<br>') + '</p>' : '') +
      '<div class="tw"><table><thead><tr><th>Day</th><th class="r">Trades</th><th class="r">Start balance</th><th class="r">Day result</th><th class="r">Biggest dip</th><th class="r">Limit</th><th style="min-width:120px">Used</th></tr></thead><tbody>' +
      days.map(function (d) { var tone = d.usedPct >= 100 ? 'bad' : d.usedPct >= 60 ? 'warn' : 'ok'; return '<tr' + (d.hit ? ' class="hit"' : '') + '><td class="mono">' + esc(d.day) + '</td><td class="r mono">' + d.n + '</td><td class="r mono">' + esc(M(d.startBal)) + '</td><td class="r mono ' + cls(d.net) + '">' + esc(M(d.net, true)) + '</td><td class="r mono">' + esc(d.used ? M(-d.used) : M(0)) + '</td><td class="r mono">' + esc(M(d.limit)) + '</td><td><div class="track ' + tone + '"><i data-w="' + Math.min(100, d.usedPct).toFixed(1) + '"></i></div></td></tr>'; }).join('') +
      '</tbody></table></div>' + (pr.days.length ? '' : '<p class="note">No closed trades in this period.</p>') + '</div>';
    $('#p-basis').value = c.dailyBasis; $('#p-type').value = c.maxType;
  };
  function resRow(a, b) { return '<div class="res-row"><span>' + a + '</span><span>' + esc(b) + '</span></div>'; }
  function readProp() {
    var c = S.prop, n = function (id, d) { var v = TL.parseNum($('#' + id).value); return v === null || isNaN(v) || v < 0 ? d : v; };
    c.size = n('p-size', c.size); c.from = $('#p-from').value || ''; c.dailyPct = n('p-daily', c.dailyPct); c.dailyBasis = $('#p-basis').value;
    c.maxPct = n('p-max', c.maxPct); c.maxType = $('#p-type').value; c.trailLock = $('#p-lock').checked; c.targetPct = n('p-target', c.targetPct);
    c.minDays = Math.floor(n('p-days', c.minDays)); c.dayStartHour = Math.min(23, Math.floor(n('p-hour', c.dayStartHour))); c.preset = 'custom';
  }

  // ---- breakdown ----
  var bkKey = 'setup';
  R.break = function (el) {
    var rows = TL.breakdown(S.trades, bkKey), mx = rows.reduce(function (m, r) { return Math.max(m, Math.abs(r.net)); }, 0) || 1;
    var keys = [['setup', 'Setup / tag'], ['symbol', 'Symbol'], ['hour', 'Hour opened'], ['weekday', 'Weekday'], ['side', 'Long / short']];
    el.innerHTML = '<div class="panel"><div class="ph"><h2><b>//</b>Split your results by</h2><div class="btns">' + keys.map(function (k) { return '<button class="ghost' + (k[0] === bkKey ? ' on' : '') + '" data-bk="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="bars">' + rows.map(function (r) { var w = Math.abs(r.net) / mx * 50; return '<div class="bar"><span class="k" title="' + esc(r.key) + '">' + esc(r.key) + '</span><span class="tr"><span class="z" style="left:50%"></span><i class="' + (r.net >= 0 ? 'p' : 'n') + '" style="' + (r.net >= 0 ? 'left:50%' : 'right:50%') + ';width:0" data-w="' + w.toFixed(2) + '"></i></span><span class="v ' + cls(r.net) + '">' + esc(M(r.net, true)) + '</span></div>'; }).join('') + '</div>' +
      (rows.length ? '' : '<p class="note">No trades yet.</p>') + '</div>' +
      '<div class="panel mt"><div class="tw"><table><thead><tr><th>' + esc(keys.filter(function (k) { return k[0] === bkKey; })[0][1]) + '</th><th class="r">Trades</th><th class="r">Win rate</th><th class="r">Net</th><th class="r">Per trade</th><th class="r">Average R</th><th class="r">Profit factor</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + esc(r.key) + '</td><td class="r mono">' + r.n + '</td><td class="r mono">' + esc(TL.fx(r.winRate, 1, '%')) + '</td><td class="r mono ' + cls(r.net) + '">' + esc(M(r.net, true)) + '</td><td class="r mono">' + esc(M(r.expectancy, true)) + '</td><td class="r mono">' + esc(TL.fmtR(r.avgR)) + '</td><td class="r mono">' + esc(TL.fx(r.pf, 2)) + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="note">' + (bkKey === 'setup' ? 'A trade with two tags counts in both rows.' : bkKey === 'hour' ? 'Hour of the open time, as written in your records.' : 'Small groups can look very good or very bad by chance. Look at the number of trades first.') + '</p></div>';
  };

  // ---- calendar ----
  var calMonth = null, selDay = null;
  R.cal = function (el) {
    if (!calMonth) calMonth = TODAY.slice(0, 7);
    var dm = TL.daily(S.trades, S.settings.dayStartHour), y = +calMonth.slice(0, 4), m = +calMonth.slice(5, 7);
    var first = calMonth + '-01', off = TL.weekday(first), start = TL.addDays(first, -off);
    var mx = 0; Object.keys(dm).forEach(function (k) { if (k.slice(0, 7) === calMonth) mx = Math.max(mx, Math.abs(dm[k].net)); });
    var cells = '', mNet = 0, gd = 0, rd = 0;
    for (var i = 0; i < 42; i++) {
      var d = TL.addDays(start, i), x = dm[d], inM = d.slice(0, 7) === calMonth, c = 'd';
      if (!inM && i >= 35) break;
      if (!inM) c += ' out';
      if (x && inM) { mNet += x.net; if (x.net > 0) gd++; else if (x.net < 0) rd++; var s = mx ? Math.abs(x.net) / mx : 0; c += x.net > 0 ? (s > 0.5 ? ' g2' : ' g') : x.net < 0 ? (s > 0.5 ? ' l2' : ' l') : ''; }
      if (d === TODAY) c += ' today'; if (d === selDay) c += ' sel';
      cells += '<button class="' + c + '" data-day="' + d + '"><span class="n">' + (+d.slice(8)) + (S.dayNotes[d] ? '<i class="memo" aria-label="note"></i>' : '') + '</span>' + (x ? '<span class="p ' + cls(x.net) + '">' + esc(M(x.net, true)) + '</span><span class="ps ' + cls(x.net) + '">' + esc(shortAmt(x.net)) + '</span><span class="c">' + x.n + ' trade' + (x.n > 1 ? 's' : '') + '</span>' : '') + '</button>';
    }
    var dayTrades = selDay ? TL.sortTrades(S.trades).filter(function (t) { return TL.tradeDay(TL.when(t), S.settings.dayStartHour) === selDay; }) : [];
    el.innerHTML = '<div class="grid g32"><div class="panel"><div class="ph"><h2><b>//</b>' + TL.MON[m - 1] + ' ' + y + '</h2><div class="btns"><button class="ghost sm" id="cal-prev">‹ Prev</button><button class="ghost sm" id="cal-next">Next ›</button></div></div>' +
      '<div class="cal">' + TL.WD.map(function (w) { return '<div class="h">' + w + '</div>'; }).join('') + cells + '</div>' +
      '<p class="note mt">Month: <b class="' + cls(mNet) + '">' + esc(M(mNet, true)) + '</b> · ' + gd + ' green days · ' + rd + ' red days</p></div>' +
      '<div class="panel bl"><div class="ph"><h2><b>//</b>' + (selDay ? esc(selDay) + ' (' + TL.WD[TL.weekday(selDay)] + ')' : 'Pick a day') + '</h2></div>' +
      (selDay ? (dayTrades.length ? dayTrades.map(function (t) { var v = TL.net(t); return '<div class="li"><span class="m">' + esc(TL.when(t).slice(11, 16)) + '</span><span class="x"><b>' + esc(t.symbol) + '</b> ' + esc(t.side) + ' <small class="note">' + esc(TL.tagsOf(t.tags).join(', ')) + '</small></span><span class="v ' + cls(v) + '">' + esc(M(v, true)) + '</span></div>'; }).join('') : '<p class="note">No trades on this day.</p>') +
        '<label class="f mt">Notes for this day (mood, rules followed, what to repeat)<textarea id="day-note" rows="5">' + esc(S.dayNotes[selDay] || '') + '</textarea></label><p class="note">Saved as you type.</p>' : '<p class="note">Click a day to see its trades and write a note.</p>') + '</div></div>';
  };

  function shortAmt(v) { var a = Math.abs(v), t = a >= 1000 ? (Math.round(a / 100) / 10) + 'k' : String(Math.round(a)); return (v > 0 ? '+' : v < 0 ? '\u2212' : '') + t; }
  // ---- position size (same calculation as /position-size/) ----
  var psv = null;
  R.size = function (el) {
    if (!psv) psv = { balance: String(TL.stats(S.trades, S.settings.startBalance).balance), riskMode: 'pct', risk: '1', pip: '0.0001', rate: '', side: 'buy', entry: '1.0850', stop: '1.0825', target: '', spread: '', step: '1000', lot: '100000', lev: '30' };
    var inp = function (k, label, ph) { return '<label class="f">' + label + '<input id="ps-' + k + '" class="num" inputmode="decimal" autocomplete="off" value="' + esc(psv[k]) + '" placeholder="' + esc(ph || '') + '"></label>'; };
    var sel = function (k, label, opts) { return '<label class="f">' + label + '<select id="ps-' + k + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (psv[k] === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>'; };
    el.innerHTML = '<div class="grid g32"><div class="panel"><div class="ph"><h2><b>//</b>Position size from your stop</h2><span class="note">Forex. Same calculation as the free position size calculator.</span></div><div class="form">' +
      inp('balance', 'Account balance', 'e.g. 10000') + sel('riskMode', 'How to set your risk', [['pct', '% of balance'], ['amt', 'Fixed amount']]) + inp('risk', psv.riskMode === 'amt' ? 'Amount you are willing to lose' : 'Risk per trade (% of balance)', 'e.g. 1') +
      sel('pip', 'Pair type (pip size)', [['0.0001', 'Most pairs (0.0001)'], ['0.01', 'JPY pairs (0.01)']]) + sel('side', 'Direction', [['buy', 'Buy (long)'], ['sell', 'Sell (short)']]) +
      inp('rate', 'Value of 1 quote-currency unit in your account currency (empty = same)', 'e.g. 1/150') + inp('entry', 'Entry price') + inp('stop', 'Stop-loss price') + inp('target', 'Take-profit (optional)') + inp('spread', 'Spread in pips (optional)') +
      sel('step', 'Smallest order size', [['1', '1 unit'], ['100', '100 units'], ['1000', '1,000 (micro)'], ['10000', '10,000 (mini)']]) + sel('lot', 'One lot is', [['100000', '100,000 units'], ['10000', '10,000 units'], ['1000', '1,000 units']]) + sel('lev', 'Leverage (margin estimate)', [['30', '30:1'], ['50', '50:1'], ['100', '100:1'], ['200', '200:1'], ['500', '500:1']]) +
      '</div></div><div class="panel bl"><div class="ph"><h2><b>//</b>Result</h2></div><div class="big" id="ps-units">—</div><p class="err" id="ps-err"></p><div id="ps-rows"></div><p class="note">It only sizes a trade you have already planned. It does not say whether to trade.</p></div></div>';
    psRun();
  };
  function psRun() {
    var r = PS.calc(psv), rows = $('#ps-rows'), u = $('#ps-units'), e = $('#ps-err'); if (!rows) return;
    e.textContent = ''; rows.innerHTML = '';
    if (r.state !== 'ok') { u.textContent = '—'; if (r.state === 'error') e.textContent = r.msg; return; }
    u.textContent = r.tooSmall ? '0 units' : PS.int(r.units) + ' units · ' + r.lots.toLocaleString('en-US') + ' lots';
    var p = function (n) { return (Math.round(n * 100) / 100) + '%'; };
    var L = [['Amount at risk', M(r.riskAmt) + ' (' + p(r.riskPct) + ')'], ['Stop distance', (Math.round(r.pips * 10) / 10) + ' pips'], ['Pip value per lot', M(r.pipValueLot)], ['Loss if the stop is hit', M(r.loss) + ' (' + p(r.lossPct) + ')'], ['Margin needed (' + r.lev + ':1)', M(r.margin)]];
    if (r.rr !== undefined) { L.push(['Profit at take-profit', M(r.profit)]); L.push(['Reward-to-risk', (Math.round(r.rr * 100) / 100) + ' : 1']); }
    rows.innerHTML = L.map(function (l) { return resRow(l[0], l[1]); }).join('');
    if (r.tooSmall) e.textContent = 'Even the smallest order would lose more than you allowed with this stop.';
    else if (r.targetErr) e.textContent = r.targetErr; else if (r.marginShort) e.textContent = 'The margin needed is larger than the balance.';
  }

  // ---- risk lab ----
  var mcRes = null, ddIn = null;
  R.risk = function (el) {
    var st = TL.stats(S.trades, S.settings.startBalance), rk = S.risk;
    if (ddIn === null) ddIn = String(Math.round(st.maxDDPct * 100) / 100);
    var dd = TL.parseNum(ddIn), need = dd !== null && !isNaN(dd) ? TL.recoveryPct(dd) : null;
    var tbl = [5, 10, 20, 25, 30, 40, 50, 60, 75, 90].map(function (x) { var n = TL.recoveryPct(x); return '<div class="bar"><span class="k">−' + x + '%</span><span class="tr"><i class="n" style="left:0;width:0;background:linear-gradient(90deg,rgba(255,90,110,.3),var(--loss))" data-w="' + Math.min(100, n / 900 * 100).toFixed(2) + '"></i></span><span class="v">+' + TL.fx(n, 1, '%') + '</span></div>'; }).join('');
    el.innerHTML = '<div class="grid g2"><div class="panel"><div class="ph"><h2><b>//</b>Drawdown recovery</h2></div><div class="form"><label class="f">Drawdown (%)<input id="rc-dd" class="num" inputmode="decimal" value="' + esc(ddIn) + '"></label></div>' +
      '<p style="margin:10px 0">Gain needed to get back: <span class="big ' + (need ? 'wrn' : '') + '">' + (need === null ? '—' : '+' + TL.fx(need, 2, '%')) + '</span></p><p class="note">Your current drawdown from the peak: ' + TL.fx(st.ddNowPct, 2, '%') + ' · largest: ' + TL.fx(st.maxDDPct, 2, '%') + '</p><div class="bars mt">' + tbl + '</div><p class="note">Formula: needed gain = drawdown ÷ (100 − drawdown). A 50% loss needs +100%.</p></div>' +
      '<div class="panel bl"><div class="ph"><h2><b>//</b>Risk of ruin from your own trades</h2></div><div class="form">' +
      '<label class="f">Risk per trade (% of balance)<input id="mc-risk" class="num" inputmode="decimal" value="' + esc(rk.riskPct) + '"></label>' +
      '<label class="f">Trades per run<input id="mc-trades" class="num" inputmode="decimal" value="' + esc(rk.trades) + '"></label>' +
      '<label class="f">Runs<select id="mc-runs">' + [500, 1000, 2000, 5000].map(function (x) { return '<option value="' + x + '"' + (+rk.runs === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
      '<label class="f">"Ruin" = a drop of (%)<input id="mc-ruin" class="num" inputmode="decimal" value="' + esc(rk.ruinPct) + '"></label></div>' +
      '<div class="btns mt"><button class="btn bl" id="mc-run"' + (st.rCount ? '' : ' disabled') + '>Run simulation</button><span class="note">' + st.rCount + ' R multiples from your journal</span></div>' +
      (st.rCount && st.rCount < 30 ? '<p class="wrn note">Fewer than 30 trades with a risk amount. The result will swing a lot.</p>' : '') +
      '<div id="mc-out" class="mt">' + mcHtml() + '</div><p class="note">Each run picks trades at random from your own R multiples (with replacement) and sizes every trade at the risk % of the current balance. Fixed seed: the same inputs give the same result. Past trades do not tell you what will happen next.</p></div></div>';
  };
  function mcHtml() {
    if (!mcRes) return '<p class="note">Press Run to simulate.</p>';
    var r = mcRes;
    return '<p style="margin:0">Runs that dropped ' + esc(S.risk.ruinPct) + '% or more: <span class="big ' + (r.pRuin > 10 ? 'neg' : r.pRuin > 1 ? 'wrn' : 'pos') + '" data-k="mcp" data-v="' + r.pRuin + '" data-f="pct1">' + TL.fx(r.pRuin, 1, '%') + '</span></p>' +
      resRow('Middle result after ' + r.trades + ' trades', sp(r.medianEnd)) + resRow('5% of runs ended below', sp(r.p5End)) + resRow('5% of runs ended above', sp(r.p95End)) + resRow('Typical largest drawdown', TL.fx(r.medianDD, 1, '%')) + resRow('Largest drawdown in 5% of runs', TL.fx(r.p95DD, 1, '%'));
  }
  function sp(v) { return (v > 0 ? '+' : v < 0 ? '\u2212' : '') + TL.fx(Math.abs(v), 1, '%'); }
  function runMC() {
    var st = TL.stats(S.trades, S.settings.startBalance), n = function (id, d, mx) { var v = TL.parseNum($('#' + id).value); return v === null || isNaN(v) || v <= 0 ? d : Math.min(mx, v); };
    S.risk.riskPct = n('mc-risk', 1, 50); S.risk.trades = Math.floor(n('mc-trades', 200, 2000)); S.risk.runs = +$('#mc-runs').value; S.risk.ruinPct = n('mc-ruin', 30, 99);
    mcRes = TL.ruin({ rs: st.rs, riskPct: S.risk.riskPct, trades: S.risk.trades, runs: S.risk.runs, ruinPct: S.risk.ruinPct, seed: 12345 });
    save(); render();
  }

  // ---- settings ----
  R.set = function (el) {
    var s = S.settings;
    el.innerHTML = '<div class="grid g2"><div class="panel"><div class="ph"><h2><b>//</b>Account</h2></div><div class="form">' +
      '<label class="f wide">Account name<input id="s-name" value="' + esc(s.account) + '"></label>' +
      '<label class="f">Account currency<select id="s-cur">' + TL.CURRENCIES.map(function (c) { return '<option' + (c === s.currency ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label>' +
      '<label class="f">Starting balance<input id="s-start" class="num" inputmode="decimal" value="' + esc(s.startBalance) + '"></label>' +
      '<label class="f">New day starts at (hour, for the calendar)<input id="s-hour" class="num" inputmode="decimal" value="' + esc(s.dayStartHour) + '"></label></div>' +
      '<p class="note mt">Amounts are shown in the account currency. Trading Studio does not convert currencies; enter results the way your broker reports them.</p></div>' +
      '<div class="panel bl"><div class="ph"><h2><b>//</b>Your data</h2></div><p class="note" style="margin-top:0">' + S.trades.length + ' trades · stored in this browser only.</p>' +
      '<div class="btns"><button class="btn bl" data-act="exp-csv">Export trades (CSV)</button><button class="btn bl" data-act="exp-json">Save a backup (JSON)</button></div>' +
      '<div class="btns mt"><label class="ghost" for="bk-file">Restore from a backup…</label><input id="bk-file" type="file" accept=".json,application/json" class="sr"></div><p class="err" id="bk-err"></p>' +
      '<div class="btns mt"><button class="ghost" data-act="start-empty">Start an empty journal</button><button class="ghost" data-act="reset">Load the fictional sample</button></div>' +
      '<p class="note">Clearing the browser\'s site data deletes the journal. Save a backup from time to time.</p>' +
      (ED === 'full' ? '<div class="mt"><div class="ph"><h2><b>?</b>Report a problem</h2></div><p class="note" style="margin-top:0">Copies the version, browser, screen and last error. Your trades and amounts are not included. Nothing is sent - paste it into your message to the shop.</p><div class="btns"><button class="ghost" data-act="copy-report">Copy info for a bug report</button><span class="note" id="rep-msg"></span></div><p class="note">Trading Studio v' + esc(VER) + ' · © 2026 MisaNeco Works</p></div>' : '') +
      '</div></div>';
  }
  function readSettings() {
    var s = S.settings, v = TL.parseNum($('#s-start').value), h = TL.parseNum($('#s-hour').value);
    s.account = $('#s-name').value.trim().slice(0, 80) || 'My account'; s.currency = $('#s-cur').value;
    if (v !== null && !isNaN(v) && v > 0) s.startBalance = v;
    if (h !== null && !isNaN(h)) s.dayStartHour = Math.max(0, Math.min(23, Math.floor(h)));
    $('#acctName').textContent = s.account;
  }

  // ================= events =================
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button,[data-act],[data-day]'); if (!b) return;
    var nb = e.target.closest('#nav button'); if (nb) { go(nb.getAttribute('data-view')); return; }
    if (b.hasAttribute('data-go')) { go(b.getAttribute('data-go')); return; }
    if (b.hasAttribute('data-bk')) { bkKey = b.getAttribute('data-bk'); render(); return; }
    if (b.hasAttribute('data-day')) { selDay = b.getAttribute('data-day'); render(); return; }
    var id = b.id, act = b.getAttribute('data-act');
    if (id === 't-save') { saveTrade(); return; }
    if (id === 't-new' || id === 't-cancel') { editId = null; render(); return; }
    if (id === 'imp-read') { imp.text = $('#imp-text').value; imp.fileName = ''; imp.msg = ''; impParse(); render(); return; }
    if (id === 'imp-example') { imp.text = DATA.exampleMT4(TODAY); imp.fileName = 'example (fictional MT4 history)'; imp.msg = ''; impParse(); render(); return; }
    if (id === 'imp-go') { doImport(); return; }
    if (id === 'cal-prev' || id === 'cal-next') { var y = +calMonth.slice(0, 4), m = +calMonth.slice(5) + (id === 'cal-next' ? 1 : -1); if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } calMonth = y + '-' + TL.pad(m); render(); return; }
    if (id === 'mc-run') { runMC(); return; }
    switch (act) {
      case 'edit': editId = b.getAttribute('data-id'); render(); $('#main').scrollTop = 0; return;
      case 'del':
        if (!DEMO && !window.confirm('Delete this trade?')) return;
        S.trades = S.trades.filter(function (x) { return x.id !== b.getAttribute('data-id'); }); commit(); return;
      case 'show-all': showAll = true; render(); return;
      case 'reset':
        if (!DEMO && !window.confirm('Replace everything with the fictional sample?')) return;
        S = DATA.sample(TODAY); afterLoad(); return;
      case 'start-empty':
        if (!DEMO && S.trades.length && !S.sample && !window.confirm('Delete all trades and start an empty journal?')) return;
        var keep = S.settings; S = DATA.empty(); if (!keep || keep.account === 'Sample account (fictional)') { } else S.settings = keep; afterLoad(); go('import'); return;
      case 'exp-csv': download('trading-studio-trades-' + TODAY + '.csv', TL.toCSV(S.trades), 'text/csv'); return;
      case 'exp-json': download('trading-studio-backup-' + TODAY + '.json', TL.makeBackup(S, new Date().toISOString()), 'application/json'); return;
      case 'copy-report': copyReport(); return;
    }
  });
  document.addEventListener('input', function (e) {
    var t = e.target, id = t.id;
    if (/^t-/.test(id) && id !== 't-filter') { preview(); return; }
    if (id === 't-filter') { tFilter = t.value; var pos = t.selectionStart; render(); var f = $('#t-filter'); f.focus(); try { f.setSelectionRange(pos, pos); } catch (x) {} return; }
    if (/^ps-/.test(id)) { psv[id.slice(3)] = t.value; psRun(); return; }
    if (id === 'day-note') { if (t.value.trim()) S.dayNotes[selDay] = t.value.slice(0, 4000); else delete S.dayNotes[selDay]; save(); return; }
  });
  document.addEventListener('change', function (e) {
    var t = e.target, id = t.id;
    if (t.hasAttribute('data-col')) { imp.map[+t.getAttribute('data-col')] = t.value; imp.layout = 'custom'; impRun(); render(); return; }
    if (id === 'imp-layout') { applyLayout(t.value); render(); return; }
    if (id === 'imp-dec' || id === 'imp-order') { imp[id.slice(4)] = t.value; impRun(); render(); return; }
    if (id === 'imp-shift') { var v = TL.parseNum(t.value); imp.shift = v === null || isNaN(v) ? 0 : Math.max(-24, Math.min(24, v)); impRun(); render(); return; }
    if (id === 'imp-file') { readFile(t.files[0]); t.value = ''; return; }
    if (id === 'p-preset') { var p = TL.PRESETS.filter(function (x) { return x.id === t.value; })[0]; if (p) { Object.keys(p).forEach(function (k) { if (k !== 'id' && k !== 'name') S.prop[k] = p[k]; }); S.prop.preset = p.id; } else S.prop.preset = 'custom'; commit(); return; }
    if (/^p-/.test(id)) { readProp(); commit(); return; }
    if (/^ps-/.test(id)) { psv[id.slice(3)] = t.value; if (id === 'ps-riskMode') render(); else psRun(); return; }
    if (/^s-/.test(id)) { readSettings(); commit(); return; }
    if (id === 'rc-dd') { ddIn = t.value; render(); return; }
    if (id === 'bk-file') { restore(t.files[0]); t.value = ''; return; }
  });
  // drag & drop on the import box
  document.addEventListener('dragover', function (e) { var z = e.target.closest && e.target.closest('#imp-drop'); if (z) { e.preventDefault(); z.classList.add('over'); } });
  document.addEventListener('dragleave', function (e) { var z = e.target.closest && e.target.closest('#imp-drop'); if (z) z.classList.remove('over'); });
  document.addEventListener('drop', function (e) { var z = e.target.closest && e.target.closest('#imp-drop'); if (z) { e.preventDefault(); readFile(e.dataTransfer.files[0]); } });
  var rsT = null;
  window.addEventListener('resize', function () { clearTimeout(rsT); rsT = setTimeout(function () { if (view === 'dash') R.dash($('#v-dash')); }, 200); });

  function restore(file) {
    if (!file) return;
    var fr = new FileReader();
    fr.onload = function () {
      var r = TL.parseBackup(String(fr.result));
      if (!r.ok) { $('#bk-err').textContent = r.error; return; }
      if (!window.confirm('Replace the current journal with this backup (' + r.data.trades.length + ' trades)?')) return;
      S = fill(r.data); afterLoad(); toast('Backup restored');
    };
    fr.readAsText(file);
  }
  function copyReport() {
    var R2 = window.TSREPORT, m = $('#rep-msg'); if (!R2) return;
    var txt = R2.makeReport({ version: VER, ua: navigator.userAgent, view: view, error: R2.lastError(), at: new Date().toISOString().slice(0, 16).replace('T', ' ') });
    var done = function () { m.textContent = 'Copied.'; }, fail = function () { m.textContent = 'Could not copy. Select and copy the text below.'; var ta = document.createElement('textarea'); ta.value = txt; ta.rows = 6; m.after(ta); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fail); else fail();
  }
  function afterLoad() {
    shown = {}; mcRes = null; ddIn = null; psv = null; editId = null; selDay = null; calMonth = null;
    $('#acctName').textContent = S.settings.account; save(); showWarn(); render();
  }

  // ================= automatic tour (?demo=1) =================
  var cur0 = { x: 0, y: 0, el: null, ring: null };
  function curInit() { cur0.el = $('#cursor'); cur0.ring = $('#cursor .ring'); cur0.el.style.display = 'block'; cur0.x = window.innerWidth * 0.6; cur0.y = window.innerHeight * 0.75; curPlace(); }
  function curPlace() { cur0.el.style.transform = 'translate(' + cur0.x.toFixed(1) + 'px,' + cur0.y.toFixed(1) + 'px)'; }
  function scrollTo(el) {
    var m = $('#main'), r = el.getBoundingClientRect(), mr = m.getBoundingClientRect();
    if (r.top > mr.top + 60 && r.bottom < mr.bottom - 40) return Promise.resolve();
    var target = Math.max(0, Math.min(m.scrollHeight - m.clientHeight, m.scrollTop + (r.top - mr.top) - mr.height * 0.35)), from = m.scrollTop;
    if (Math.abs(target - from) < 4) return Promise.resolve();
    return new Promise(function (res) { tween(450, function (p) { m.scrollTop = from + (target - from) * p; }, res, easeIO); });
  }
  function hScroll(el) { var n = el.closest('.nav'); if (!n) return; var r = el.getBoundingClientRect(), nr = n.getBoundingClientRect(); if (r.left < nr.left || r.right > nr.right) { var from = n.scrollLeft, to = from + r.left - nr.left - nr.width * 0.3; return new Promise(function (res) { tween(300, function (p) { n.scrollLeft = from + (to - from) * p; }, res, easeIO); }); } }
  function moveTo(el, dur) {
    return Promise.resolve(hScroll(el)).then(function () { return el.closest('.nav') ? null : scrollTo(el); }).then(function () {
      var r = el.getBoundingClientRect(), tx = r.left + Math.min(r.width * 0.5, 60), ty = r.top + r.height * 0.6, fx = cur0.x, fy = cur0.y;
      return new Promise(function (res) { tween(dur || 300, function (p) { cur0.x = fx + (tx - fx) * p; cur0.y = fy + (ty - fy) * p; curPlace(); }, res, easeIO); });
    });
  }
  function ripple() { tween(420, function (p) { cur0.ring.style.opacity = (1 - p).toFixed(2); cur0.ring.style.transform = 'scale(' + (0.4 + p * 1.2).toFixed(2) + ')'; }); }
  function click(sel) { var el = typeof sel === 'string' ? $(sel) : sel; if (!el) return Promise.resolve(); return moveTo(el).then(function () { ripple(); return wait(90); }).then(function () { el.click(); return wait(140); }); }
  function type(sel, text, per) {
    var el = $(sel); if (!el) return Promise.resolve();
    return moveTo(el, 240).then(function () {
      ripple(); el.classList.add('typing'); el.value = ''; var i = 0;
      function step() { if (i >= text.length) { el.classList.remove('typing'); el.dispatchEvent(new Event('change', { bubbles: true })); return wait(60); } i++; el.value = text.slice(0, i); el.dispatchEvent(new Event('input', { bubbles: true })); return wait(per || 40).then(step); }
      return step();
    });
  }
  function choose(sel, value) { var el = $(sel); if (!el) return Promise.resolve(); return moveTo(el, 300).then(function () { ripple(); return wait(120); }).then(function () { el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); return wait(200); }); }
  function nav(v) { return click('#nav button[data-view="' + v + '"]').then(function () { return wait(250); }); }
  function look(sel, ms) { var el = $(sel); return (el ? moveTo(el, 450) : Promise.resolve()).then(function () { return wait(ms || 900); }); }
  function runDemo() {
    curInit();
    wait(2200)
      .then(function () { return look('#eqChart', 1300); })
      .then(function () { return nav('trades'); })
      .then(function () { return type('#t-symbol', 'EURUSD'); })
      .then(function () { return type('#t-entry', '1.0842', 45); })
      .then(function () { return type('#t-exit', '1.0880', 45); })
      .then(function () { return type('#t-sl', '1.0822', 45); })
      .then(function () { return type('#t-gross', '190', 60); })
      .then(function () { return type('#t-fees', '3.5', 60); })
      .then(function () { return type('#t-tags', 'Pullback', 35); })
      .then(function () { return look('#t-preview', 900); })
      .then(function () { return click('#t-save'); })
      .then(function () { return wait(500); }).then(function () { var tr = $('#v-trades tr.flash'); return tr ? look('#v-trades tr.flash', 900) : null; })
      .then(function () { return nav('import'); })
      .then(function () { return click('#imp-example'); })
      .then(function () { return wait(400); }).then(function () { return look('#imp-layout', 1100); })
      .then(function () { return look('#imp-count', 900); })
      .then(function () { var c = $('#imp-clear'); return c && c.checked ? click(c) : null; })
      .then(function () { return click('#imp-go'); })
      .then(function () { return wait(900); })
      .then(function () { return nav('prop'); })
      .then(function () { return look('#v-prop .status', 1600); })
      .then(function () { return nav('break'); })
      .then(function () { return wait(1200); })
      .then(function () { return click('[data-bk="hour"]'); })
      .then(function () { return wait(1300); })
      .then(function () { return nav('cal'); })
      .then(function () { return click('[data-day="' + TL.addDays(TODAY, -3) + '"]'); })
      .then(function () { return look('#day-note', 1300); })
      .then(function () { return nav('risk'); })
      .then(function () { return click('#mc-run'); })
      .then(function () { return look('#mc-out', 1500); })
      .then(function () { return nav('dash'); })
      .then(function () { return wait(2800); })
      .then(function () { cur0.el.style.display = 'none'; window.__studio.demoDone = true; });
  }

  // ================= start =================
  S = load();
  $('#acctName').textContent = S.settings.account;
  $('#todayLabel').textContent = 'Today ' + TODAY + ' (' + TL.WD[TL.weekday(TODAY)] + ')';
  $$('.web-only').forEach(function (x) { x.hidden = ED !== 'web'; });
  showWarn();
  if (!DEMO) save();
  window.__studio.ready = Promise.resolve().then(function () { go('dash'); if (DEMO) runDemo(); return true; });
})();
