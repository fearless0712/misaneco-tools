/* Trading Studio - calculations (browser + node). No network, no signals.
   Everything here is pure: trades in, numbers out. The screen (app.js) and the tests (test.js) both use it.
   A trade: { id, open:'YYYY-MM-DD HH:MM:SS'|'', close:'YYYY-MM-DD HH:MM:SS'|'', symbol, side:'long'|'short'|'',
              qty, entry, exit, sl, gross, fees, risk, tags:[...], note }
   net = gross - fees (fees: positive = cost).  R multiple = net / risk (only when risk > 0). */
(function (root) {
  'use strict';

  // ---------------- numbers ----------------
  function r2(x) { return Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * 100) / 100; }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  // "1,234.50" "1 234.50" "(12.50)" "-$5" "1.234,50" (dec=',') -> number; '' -> null; junk -> NaN
  function parseNum(s, dec) {
    if (s === null || s === undefined) return null;
    if (typeof s === 'number') return isFinite(s) ? s : NaN;
    var t = String(s).replace(/[   \s']/g, '').replace(/[−–]/g, '-');
    if (t === '' || t === '-') return null;
    var neg = false;
    if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
    t = t.replace(/^([+-]?)[A-Za-z$€£¥₣]{0,4}/, '$1').replace(/[A-Za-z$€£¥%]{1,4}$/, '');
    if (t.charAt(0) === '-') { neg = !neg; t = t.slice(1); } else if (t.charAt(0) === '+') t = t.slice(1);
    if (t.charAt(0) === '-') { neg = !neg; t = t.slice(1); }
    var hasDot = t.indexOf('.') >= 0, hasCom = t.indexOf(',') >= 0;
    if (dec === ',') t = t.replace(/\./g, '').replace(',', '.');
    else if (dec === '.') t = t.replace(/,/g, '');
    else if (hasDot && hasCom) t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
    else if (hasCom) t = /^\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.');
    if (!/^\d+(\.\d+)?$|^\.\d+$/.test(t)) return NaN;
    var v = parseFloat(t);
    return neg ? -v : v;
  }

  // ---------------- dates (kept as plain local text, no timezone conversion) ----------------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mkTs(y, mo, d, h, mi, s) { return y + '-' + pad(mo) + '-' + pad(d) + ' ' + pad(h || 0) + ':' + pad(mi || 0) + ':' + pad(s || 0); }
  function validYMD(y, mo, d) { if (mo < 1 || mo > 12 || d < 1) return false; var dt = new Date(Date.UTC(y, mo - 1, d)); return dt.getUTCDate() === d; }
  // order: 'auto'|'dmy'|'mdy' for dates that do not start with the year
  function parseDate(s, order) {
    if (s === null || s === undefined) return null;
    var t = String(s).trim(); if (!t) return null;
    var m = /^(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,]\d+)?)?\s*([AaPp][Mm])?)?\s*(?:Z|[+-]\d{2}:?\d{2}|UTC.*)?$/.exec(t);
    var y, mo, d, h = 0, mi = 0, sec = 0, ap;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; h = +(m[4] || 0); mi = +(m[5] || 0); sec = +(m[6] || 0); ap = m[7]; }
    else {
      m = /^(\d{1,2})[-.\/](\d{1,2})[-.\/](\d{2}|\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,]\d+)?)?\s*([AaPp][Mm])?)?\s*(?:Z|[+-]\d{2}:?\d{2}|UTC.*)?$/.exec(t);
      if (!m) return null;
      var a = +m[1], b = +m[2];
      y = +m[3]; if (y < 100) y += 2000;
      var ord = order === 'mdy' || order === 'dmy' ? order : (a > 12 ? 'dmy' : b > 12 ? 'mdy' : 'dmy');
      if (ord === 'dmy') { d = a; mo = b; } else { mo = a; d = b; }
      h = +(m[4] || 0); mi = +(m[5] || 0); sec = +(m[6] || 0); ap = m[7];
    }
    if (ap) { ap = ap.toLowerCase(); if (h < 1 || h > 12) return null; if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0; }
    if (!validYMD(y, mo, d) || h > 23 || mi > 59 || sec > 59) return null;
    return mkTs(y, mo, d, h, mi, sec);
  }
  // guess 'dmy' or 'mdy' from many date strings (null when every value fits both)
  function guessOrder(list) {
    var dmy = false, mdy = false;
    (list || []).forEach(function (s) {
      var m = /^(\d{1,2})[-.\/](\d{1,2})[-.\/]\d{2,4}/.exec(String(s || '').trim());
      if (!m) return; if (+m[1] > 12) dmy = true; if (+m[2] > 12) mdy = true;
    });
    return dmy && !mdy ? 'dmy' : mdy && !dmy ? 'mdy' : null;
  }
  function tsMs(ts) { var m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(ts || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : NaN; }
  function msTs(ms) { var d = new Date(ms); return mkTs(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()); }
  function shiftTs(ts, hours) { var ms = tsMs(ts); return isNaN(ms) ? ts : msTs(ms + hours * 3600000); }
  function dayOf(ts) { return (ts || '').slice(0, 10); }
  function hourOf(ts) { var h = parseInt((ts || '').slice(11, 13), 10); return isNaN(h) ? null : h; }
  function weekday(ts) { var ms = tsMs(ts.length === 10 ? ts + ' 00:00:00' : ts); return isNaN(ms) ? null : (new Date(ms).getUTCDay() + 6) % 7; } // 0 = Monday
  var WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function addDays(day, n) { var ms = tsMs(day + ' 00:00:00') + n * 86400000; return msTs(ms).slice(0, 10); }

  // ---------------- trades ----------------
  function net(t) { return r2((+t.gross || 0) - (+t.fees || 0)); }
  function rMult(t) { return t.risk > 0 ? net(t) / t.risk : null; }
  function when(t) { return t.close || t.open || ''; }
  function sortTrades(list) { return list.slice().sort(function (a, b) { var x = when(a), y = when(b); return x < y ? -1 : x > y ? 1 : (a.seqNo || 0) - (b.seqNo || 0); }); }
  // money lost if the stop had been hit, from the trade's own numbers (profit moves in line with price)
  function deriveRisk(entry, exit, sl, gross) {
    if (!isNum(entry) || !isNum(exit) || !isNum(sl) || !isNum(gross) || sl <= 0 || entry === exit || sl === entry) return null;
    var move = Math.abs(exit - entry); if (!gross) return null;
    return r2(Math.abs(gross) * Math.abs(entry - sl) / move);
  }
  function tagsOf(s) {
    if (Array.isArray(s)) return s.map(function (x) { return String(x).trim(); }).filter(Boolean);
    return String(s || '').split(/[,;|#]/).map(function (x) { return x.trim(); }).filter(Boolean).filter(function (x, i, a) { return a.indexOf(x) === i; });
  }

  // ---------------- core statistics ----------------
  function stats(trades, startBalance) {
    var list = sortTrades(trades), start = +startBalance || 0;
    var n = list.length, wins = 0, losses = 0, be = 0, gw = 0, gl = 0, total = 0, fees = 0;
    var rs = [], rsum = 0, bestW = null, worstL = null;
    var eq = start, peak = start, peakAt = '', mdd = 0, mddPct = 0, mddPeak = '', mddLow = '', ddNow = 0;
    var curL = 0, curW = 0, maxL = 0, maxW = 0, holdSum = 0, holdN = 0;
    var curve = [{ t: list.length ? '' : '', eq: start }];
    list.forEach(function (t) {
      var v = net(t);
      total += v; fees += +t.fees || 0;
      if (v > 0) { wins++; gw += v; curW++; curL = 0; } else if (v < 0) { losses++; gl += -v; curL++; curW = 0; } else { be++; curW = 0; curL = 0; }
      if (curL > maxL) maxL = curL; if (curW > maxW) maxW = curW;
      if (bestW === null || v > bestW) bestW = v; if (worstL === null || v < worstL) worstL = v;
      var r = rMult(t); if (r !== null) { rs.push(r); rsum += r; }
      eq = r2(eq + v); curve.push({ t: when(t), eq: eq });
      if (eq > peak) { peak = eq; peakAt = when(t); }
      var dd = peak - eq;
      if (dd > mdd + 1e-9) { mdd = dd; mddPct = peak > 0 ? dd / peak * 100 : 0; mddPeak = peakAt; mddLow = when(t); }
      if (t.open && t.close) { var h = (tsMs(t.close) - tsMs(t.open)) / 60000; if (h >= 0) { holdSum += h; holdN++; } }
    });
    ddNow = peak - eq;
    var res = {
      n: n, wins: wins, losses: losses, be: be,
      winRate: n ? wins / n * 100 : null,
      net: r2(total), fees: r2(fees), grossWin: r2(gw), grossLoss: r2(gl),
      pf: gl > 0 ? gw / gl : (gw > 0 ? Infinity : null),
      avgWin: wins ? gw / wins : null, avgLoss: losses ? gl / losses : null,
      expectancy: n ? total / n : null,
      rCount: rs.length, avgR: rs.length ? rsum / rs.length : null, rs: rs,
      maxDD: r2(mdd), maxDDPct: mddPct, ddPeak: mddPeak, ddLow: mddLow, ddNow: r2(ddNow), ddNowPct: peak > 0 ? ddNow / peak * 100 : 0,
      maxLossStreak: maxL, maxWinStreak: maxW, curLossStreak: curL,
      best: bestW, worst: worstL, start: start, balance: r2(start + total), peak: r2(peak),
      avgHoldMin: holdN ? holdSum / holdN : null, curve: curve
    };
    res.payoff = res.avgWin !== null && res.avgLoss ? res.avgWin / res.avgLoss : null;
    return res;
  }

  // ---------------- breakdowns ----------------
  var KEYS = {
    hour: function (t) { var h = hourOf(t.open || t.close); return h === null ? [] : [pad(h) + ':00']; },
    weekday: function (t) { var w = weekday(t.open || t.close); return w === null ? [] : [WD[w]]; },
    symbol: function (t) { return [String(t.symbol || '(none)').toUpperCase()]; },
    setup: function (t) { var g = tagsOf(t.tags); return g.length ? g : ['(no setup)']; },
    side: function (t) { return [t.side === 'short' ? 'Short' : t.side === 'long' ? 'Long' : '(unknown)']; }
  };
  function breakdown(trades, key) {
    var f = KEYS[key], g = {}, order = [];
    trades.forEach(function (t) {
      f(t).forEach(function (k) {
        if (!g[k]) { g[k] = []; order.push(k); }
        g[k].push(t);
      });
    });
    var rows = order.map(function (k) {
      var s = stats(g[k], 0);
      return { key: k, n: s.n, wins: s.wins, winRate: s.winRate, net: s.net, avgR: s.avgR, pf: s.pf, expectancy: s.expectancy };
    });
    if (key === 'hour' || key === 'weekday') {
      var ix = key === 'hour' ? function (k) { return +k.slice(0, 2); } : function (k) { return WD.indexOf(k); };
      rows.sort(function (a, b) { return ix(a.key) - ix(b.key); });
    } else rows.sort(function (a, b) { return b.net - a.net || (a.key < b.key ? -1 : 1); });
    return rows;
  }

  // ---------------- daily ----------------
  // trading day of a time when the new day starts at `startHour` o'clock
  function tradeDay(ts, startHour) { return dayOf(startHour ? shiftTs(ts, -startHour) : ts); }
  function daily(trades, startHour) {
    var m = {};
    sortTrades(trades).forEach(function (t) {
      var d = tradeDay(when(t), startHour || 0); if (!d) return;
      if (!m[d]) m[d] = { day: d, n: 0, net: 0, wins: 0, losses: 0 };
      var v = net(t); m[d].n++; m[d].net = r2(m[d].net + v); if (v > 0) m[d].wins++; else if (v < 0) m[d].losses++;
    });
    return m;
  }

  // ---------------- prop-firm style rules (numbers are your own; closed trades only) ----------------
  // cfg: { size, from:'YYYY-MM-DD'|'', dailyPct, dailyBasis:'initial'|'dayStart', maxPct, maxType:'static'|'trailing',
  //        trailLock:bool, targetPct, minDays, dayStartHour }
  function prop(trades, cfg, today) {
    var size = +cfg.size, H = +cfg.dayStartHour || 0;
    var list = sortTrades(trades).filter(function (t) { var w = when(t); return w && (!cfg.from || tradeDay(w, H) >= cfg.from); });
    var bal = size, hw = size, maxAmt = size * (+cfg.maxPct || 0) / 100;
    var floorOf = function (h) { if (cfg.maxType !== 'trailing') return size - maxAmt; var f = h - maxAmt; return cfg.trailLock ? Math.min(f, size) : f; };
    var days = [], cur = null, breaches = [], lowestRoom = Infinity, minBal = size;
    function limitFor(dayStart) { return (cfg.dailyBasis === 'dayStart' ? dayStart : size) * (+cfg.dailyPct || 0) / 100; }
    list.forEach(function (t) {
      var d = tradeDay(when(t), H);
      if (!cur || cur.day !== d) { cur = { day: d, startBal: bal, low: bal, net: 0, n: 0 }; cur.limit = limitFor(bal); days.push(cur); }
      var v = net(t); bal = r2(bal + v); cur.net = r2(cur.net + v); cur.n++;
      if (bal < cur.low) cur.low = bal;
      if (bal < minBal) minBal = bal;
      var fl = floorOf(hw);
      if (bal <= fl + 1e-9 && !breaches.some(function (b) { return b.rule === 'max'; })) breaches.push({ rule: 'max', day: d, at: when(t), balance: bal, floor: r2(fl) });
      lowestRoom = Math.min(lowestRoom, bal - fl);
      if (bal > hw) hw = bal;
    });
    days.forEach(function (x) {
      x.used = r2(Math.max(0, x.startBal - x.low));
      x.usedPct = x.limit > 0 ? x.used / x.limit * 100 : 0;
      x.hit = x.limit > 0 && x.used >= x.limit - 1e-9;
      if (x.hit) breaches.push({ rule: 'daily', day: x.day, used: x.used, limit: r2(x.limit) });
    });
    breaches.sort(function (a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : 0; });
    var todayDay = today ? tradeDay(today.length === 10 ? today + ' 12:00:00' : today, 0) : '';
    var last = days.length ? days[days.length - 1] : null;
    var td = last && last.day === todayDay ? last : { day: todayDay, startBal: bal, low: bal, net: 0, n: 0, used: 0, limit: limitFor(bal) };
    var floorNow = floorOf(hw), profit = r2(bal - size), target = size * (+cfg.targetPct || 0) / 100;
    var worst = days.reduce(function (w, x) { return !w || x.used > w.used ? x : w; }, null);
    var tradingDays = days.length;
    return {
      size: size, balance: bal, profit: profit, highWater: r2(hw), days: days, breaches: breaches, worstDay: worst,
      floor: r2(floorNow), maxRoom: r2(bal - floorNow), maxAmt: r2(maxAmt), maxUsedPct: maxAmt > 0 ? Math.max(0, (maxAmt - (bal - floorNow)) / maxAmt * 100) : 0,
      today: { day: td.day, net: td.net, used: td.used, limit: r2(td.limit), room: r2(Math.max(0, td.limit - td.used)), usedPct: td.limit > 0 ? td.used / td.limit * 100 : 0 },
      target: r2(target), targetProgress: target > 0 ? Math.max(0, profit) / target * 100 : null, targetHit: target > 0 && profit >= target - 1e-9,
      tradingDays: tradingDays, minDays: +cfg.minDays || 0, daysMet: tradingDays >= (+cfg.minDays || 0),
      n: list.length, ok: breaches.length === 0,
      status: breaches.length ? 'limit' : (target > 0 && profit >= target - 1e-9 && tradingDays >= (+cfg.minDays || 0)) ? 'met' : 'within'
    };
  }
  var PRESETS = [
    { id: 'ex1', name: 'Example A - two-phase style', dailyPct: 5, dailyBasis: 'initial', maxPct: 10, maxType: 'static', trailLock: false, targetPct: 8, minDays: 4, dayStartHour: 0 },
    { id: 'ex2', name: 'Example B - one-phase, trailing', dailyPct: 4, dailyBasis: 'dayStart', maxPct: 6, maxType: 'trailing', trailLock: true, targetPct: 10, minDays: 3, dayStartHour: 0 },
    { id: 'ex3', name: 'Example C - funded account', dailyPct: 5, dailyBasis: 'dayStart', maxPct: 10, maxType: 'static', trailLock: false, targetPct: 0, minDays: 0, dayStartHour: 0 }
  ];

  // ---------------- drawdown recovery ----------------
  function recoveryPct(ddPct) { if (!(ddPct >= 0) || ddPct >= 100) return null; return ddPct / (100 - ddPct) * 100; }

  // ---------------- Monte Carlo (fixed seed) ----------------
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pctile(sorted, p) { if (!sorted.length) return null; var i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo); }
  // o: { rs:[R...], riskPct, trades, runs, ruinPct, seed }  Each run draws trades from your own R list (with replacement).
  function ruin(o) {
    var rs = (o.rs || []).filter(isNum), f = (+o.riskPct || 0) / 100, N = Math.max(1, Math.floor(+o.trades || 100)), M = Math.max(1, Math.floor(+o.runs || 1000));
    var lvl = 1 - (+o.ruinPct || 50) / 100;
    if (!rs.length || !(f > 0)) return null;
    var rnd = mulberry32(o.seed === undefined ? 12345 : o.seed), ruined = 0, ends = [], dds = [];
    for (var k = 0; k < M; k++) {
      var eq = 1, pk = 1, md = 0, dead = false;
      for (var i = 0; i < N; i++) {
        eq = eq * (1 + f * rs[Math.floor(rnd() * rs.length)]);
        if (eq > pk) pk = eq;
        var dd = 1 - eq / pk; if (dd > md) md = dd;
        if (eq <= lvl + 1e-12) { dead = true; break; }
      }
      if (dead) ruined++;
      ends.push((eq - 1) * 100); dds.push(md * 100);
    }
    ends.sort(function (a, b) { return a - b; }); dds.sort(function (a, b) { return a - b; });
    return { pRuin: ruined / M * 100, ruined: ruined, runs: M, trades: N, medianEnd: pctile(ends, 0.5), p5End: pctile(ends, 0.05), p95End: pctile(ends, 0.95), medianDD: pctile(dds, 0.5), p95DD: pctile(dds, 0.95) };
  }

  // ---------------- text decoding & tables ----------------
  function decodeBytes(u8) {
    if (u8.length >= 2 && u8[0] === 0xFF && u8[1] === 0xFE) return new TextDecoder('utf-16le').decode(u8.subarray(2));
    if (u8.length >= 2 && u8[0] === 0xFE && u8[1] === 0xFF) return new TextDecoder('utf-16be').decode(u8.subarray(2));
    // UTF-16 without BOM: many zero bytes at odd positions
    var z = 0, k = Math.min(u8.length, 400); for (var i = 1; i < k; i += 2) if (u8[i] === 0) z++;
    if (k > 20 && z > k / 4) return new TextDecoder('utf-16le').decode(u8);
    var s = u8.length >= 3 && u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF ? u8.subarray(3) : u8;
    try { return new TextDecoder('utf-8', { fatal: true }).decode(s); } catch (e) { return new TextDecoder('windows-1252').decode(s); }
  }
  function detectDelim(text) {
    var line = String(text).split(/\r?\n/).filter(function (l) { return l.trim(); })[0] || '';
    var best = ',', bc = -1;
    ['\t', ';', ','].forEach(function (d) { var c = 0, q = false; for (var i = 0; i < line.length; i++) { var ch = line.charAt(i); if (ch === '"') q = !q; else if (!q && ch === d) c++; } if (c > bc) { bc = c; best = d; } });
    return bc > 0 ? best : ',';
  }
  function parseCSV(text, delim) {
    text = String(text).replace(/^﻿/, '');
    var d = delim || detectDelim(text), rows = [], row = [], f = '', q = false, i = 0, c;
    for (; i < text.length; i++) {
      c = text.charAt(i);
      if (q) { if (c === '"') { if (text.charAt(i + 1) === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"' && f.trim() === '') { q = true; f = ''; }
      else if (c === d) { row.push(f.trim()); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text.charAt(i + 1) === '\n') i++; row.push(f.trim()); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f !== '' || row.length) { row.push(f.trim()); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x !== ''; }); });
  }
  function decodeEnt(s) {
    return s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
      .replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(+n); }).replace(/&#x([0-9a-f]+);/gi, function (m, n) { return String.fromCharCode(parseInt(n, 16)); });
  }
  // rows of cell text from every <tr> of an HTML report (MT4 / MT5 "save as report"). Text only; nothing is loaded.
  function htmlRows(html) {
    var out = [], trs = String(html).replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').split(/<tr[\s>]/i).slice(1);
    trs.forEach(function (tr) {
      tr = tr.split(/<\/tr>/i)[0];
      var cells = [], re = /<t([dh])\b[^>]*>([\s\S]*?)(?=<t[dh]\b|$)/gi, m;
      while ((m = re.exec(tr))) cells.push(decodeEnt(m[2].replace(/<\/t[dh]>[\s\S]*$/i, '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim());
      if (cells.length) out.push(cells);
    });
    return out;
  }
  function looksHTML(text) { return /<table[\s>]/i.test(String(text).slice(0, 200000)); }

  // ---------------- column mapping ----------------
  var FIELDS = [
    ['open', 'Open time'], ['close', 'Close time'], ['symbol', 'Symbol'], ['side', 'Side (buy/sell)'], ['qty', 'Size / volume'],
    ['entry', 'Entry price'], ['exit', 'Exit price'], ['sl', 'Stop loss price'], ['gross', 'Profit (before costs)'], ['net', 'Net profit'],
    ['commission', 'Commission (negative = cost)'], ['swap', 'Swap (negative = cost)'], ['taxes', 'Taxes (negative = cost)'], ['fees', 'Fees (positive = cost)'],
    ['risk', 'Risk amount (1R)'], ['tags', 'Setup / tags'], ['note', 'Note'], ['ticket', 'Ticket / ID']
  ];
  var SYN = {
    open: ['open time', 'opening time', 'entry time', 'open date', 'opened', 'entry date', 'time opened', 'date opened', 'open'],
    close: ['close time', 'closing time', 'exit time', 'close date', 'closed', 'exit date', 'time closed', 'date closed', 'close date time'],
    symbol: ['symbol', 'item', 'instrument', 'ticker', 'market', 'pair', 'asset', 'contract', 'security'],
    side: ['type', 'side', 'direction', 'opening direction', 'action', 'buy sell', 'position side', 'trade type', 'long short'],
    qty: ['size', 'volume', 'lots', 'lot', 'quantity', 'qty', 'closing quantity', 'units', 'contracts', 'shares', 'closing volume', 'lot size'],
    entry: ['open price', 'entry price', 'entry', 'opening price', 'avg entry', 'average entry price', 'avg entry price', 'buy price'],
    exit: ['close price', 'closing price', 'exit price', 'exit', 'avg exit', 'average exit price', 'avg exit price', 'sell price'],
    sl: ['s l', 'sl', 'stop loss', 'stop', 'stoploss', 'initial stop'],
    gross: ['profit', 'gross', 'gross profit', 'gross pnl', 'gross p l'],
    net: ['net', 'net profit', 'net pnl', 'net p l', 'pnl', 'p l', 'profit loss', 'result', 'realized pnl', 'realised pnl', 'realized p l', 'net amount'],
    commission: ['commission', 'commissions', 'comm'], swap: ['swap', 'swaps', 'rollover', 'financing'], taxes: ['taxes', 'tax'], fees: ['fees', 'fee', 'costs', 'cost'],
    risk: ['risk', 'risk amount', 'initial risk', '1r', 'risked'],
    tags: ['setup', 'setups', 'strategy', 'tag', 'tags', 'playbook', 'pattern'],
    note: ['note', 'notes', 'comment', 'comments', 'memo', 'journal'],
    ticket: ['ticket', 'order', 'position', 'id', 'deal', 'trade id', 'position id', 'order id', 'trade', 'trade no']
  };
  var CUR = /\s(usd|eur|gbp|jpy|aud|cad|chf|nzd|sgd|hkd|account currency|acc ccy)$/;
  function normHead(s) { return String(s || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[$€£¥]/g, ' ').replace(/&/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim().replace(CUR, '').trim(); }
  // headers -> [field|''] ; "Time"/"Price" twice = open then close (MT4 / MT5 layout)
  function autoMap(headers) {
    var used = {}, out = headers.map(function () { return ''; }), nh = headers.map(normHead);
    var tcount = 0, pcount = 0;
    nh.forEach(function (h, i) {
      var f = '';
      if (h === 'time' || h === 'date' || h === 'date time' || h === 'datetime') { f = tcount++ === 0 ? 'open' : 'close'; }
      else if (h === 'price') { f = pcount++ === 0 ? 'entry' : 'exit'; }
      else Object.keys(SYN).some(function (k) { if (SYN[k].indexOf(h) >= 0) { f = k; return true; } return false; });
      if (f && !used[f]) { used[f] = 1; out[i] = f; }
    });
    // only a "close" date column -> fine. Only "Time" once and also "close" -> keep
    return out;
  }
  // MT4 history copied from the terminal has no header row. Known positional layouts:
  var LAYOUTS = {
    mt4: { name: 'MT4 history / statement', cols: ['ticket', 'open', 'side', 'qty', 'symbol', 'entry', 'sl', '', 'close', 'exit', 'commission', 'taxes', 'swap', 'gross'] },
    mt4b: { name: 'MT4 history (no taxes column)', cols: ['ticket', 'open', 'side', 'qty', 'symbol', 'entry', 'sl', '', 'close', 'exit', 'commission', 'swap', 'gross'] },
    mt5: { name: 'MT5 report - Positions', cols: ['open', 'ticket', 'symbol', 'side', 'qty', 'entry', 'sl', '', 'close', 'exit', 'commission', 'swap', 'gross'] }
  };
  function isHeaderRow(r) {
    var m = autoMap(r).filter(Boolean).length, nums = r.filter(function (c) { return c !== '' && !isNaN(parseNum(c)); }).length;
    return m >= 3 && nums <= 1;
  }
  // choose header + data rows from raw rows (CSV or HTML). Returns { headers, rows, layout, headerless }
  function pickTable(rows) {
    for (var i = 0; i < rows.length && i < 400; i++) {
      if (isHeaderRow(rows[i])) {
        var h = rows[i], w = h.length, data = [];
        for (var j = i + 1; j < rows.length; j++) { if (rows[j].length === w) { if (isHeaderRow(rows[j])) { if (data.length) break; else continue; } data.push(rows[j]); } }
        var map = autoMap(h), nh = h.map(normHead), layout = 'generic';
        if (nh.indexOf('item') >= 0 && nh.indexOf('ticket') >= 0) layout = 'mt4';
        else if (nh.indexOf('position') >= 0 && nh.filter(function (x) { return x === 'time'; }).length === 2) layout = 'mt5';
        else if (nh.indexOf('opening direction') >= 0 || (nh.indexOf('closing time') >= 0 && nh.indexOf('net') >= 0)) layout = 'ctrader';
        return { headers: h, rows: data, map: map, layout: layout, headerless: false };
      }
    }
    // no header: match by column count
    var w0 = rows.length ? rows[0].length : 0, key = w0 === 14 ? 'mt4' : w0 === 13 ? 'mt4b' : '';
    var heads = []; for (var k = 0; k < w0; k++) heads.push('Column ' + (k + 1));
    return { headers: heads, rows: rows.filter(function (r) { return r.length === w0; }), map: key ? LAYOUTS[key].cols.slice() : heads.map(function () { return ''; }), layout: key || 'generic', headerless: true };
  }
  var LAYOUT_NAMES = { mt4: 'MT4 history / statement', mt4b: 'MT4 history (no taxes column)', mt5: 'MT5 report - Positions', ctrader: 'cTrader history', generic: 'Generic CSV' };
  function readTable(text) { return pickTable(looksHTML(text) ? htmlRows(text) : parseCSV(text)); }

  function sideOf(s) {
    var t = String(s || '').trim().toLowerCase();
    if (/^(buy|long|b|bought|bot)$/.test(t)) return 'long';
    if (/^(sell|short|s|sold|sld)$/.test(t)) return 'short';
    return null;
  }
  // rows + map -> { trades, skipped:[{row, why}] }. opt: { dec, order, shiftHours, existing:[trades] }
  function importRows(rows, map, opt) {
    opt = opt || {};
    var col = {}; map.forEach(function (f, i) { if (f && col[f] === undefined) col[f] = i; });
    var trades = [], skipped = [], seen = {};
    (opt.existing || []).forEach(function (t) { seen[dupKey(t)] = 1; });
    var g = function (r, f) { return col[f] === undefined ? '' : (r[col[f]] === undefined ? '' : r[col[f]]); };
    var N = function (r, f) { var v = parseNum(g(r, f), opt.dec); return v === null ? null : v; };
    var order = opt.order || 'auto';
    rows.forEach(function (r, ix) {
      var why = '';
      var sideRaw = g(r, 'side'), side = col.side === undefined ? '' : sideOf(sideRaw);
      if (col.side !== undefined && side === null) { skipped.push({ row: ix + 1, why: 'not a buy/sell row (' + (String(sideRaw).slice(0, 20) || 'empty') + ')' }); return; }
      var op = parseDate(g(r, 'open'), order), cl = parseDate(g(r, 'close'), order);
      if (col.close !== undefined && !cl) { skipped.push({ row: ix + 1, why: String(g(r, 'close')).trim() ? 'close time not readable' : 'no close time (open position)' }); return; }
      if (!op && !cl) { skipped.push({ row: ix + 1, why: 'no readable date' }); return; }
      if (opt.shiftHours) { if (op) op = shiftTs(op, +opt.shiftHours); if (cl) cl = shiftTs(cl, +opt.shiftHours); }
      var gross = N(r, 'gross'), netv = N(r, 'net'), comm = N(r, 'commission') || 0, sw = N(r, 'swap') || 0, tx = N(r, 'taxes') || 0, fe = N(r, 'fees') || 0;
      [gross, netv, comm, sw, tx, fe].forEach(function (v) { if (typeof v === 'number' && isNaN(v)) why = 'a money cell is not a number'; });
      if (why) { skipped.push({ row: ix + 1, why: why }); return; }
      if (gross === null && netv === null) { skipped.push({ row: ix + 1, why: 'no profit value' }); return; }
      var fees = r2(fe - comm - sw - tx), G;
      if (gross !== null && netv !== null) { G = gross; fees = r2(gross - netv); }
      else if (gross !== null) G = gross;
      else G = r2(netv + fees);
      var entry = N(r, 'entry'), exit = N(r, 'exit'), sl = N(r, 'sl'), qty = N(r, 'qty'), risk = N(r, 'risk');
      [entry, exit, sl, qty, risk].forEach(function (v, k) { if (typeof v === 'number' && isNaN(v)) { if (k === 0) entry = null; if (k === 1) exit = null; if (k === 2) sl = null; if (k === 3) qty = null; if (k === 4) risk = null; } });
      if (sl === 0) sl = null;
      var t = {
        open: op || '', close: cl || '', symbol: String(g(r, 'symbol') || '').trim().toUpperCase().replace(/\s+/g, '') || 'UNKNOWN', side: side || '',
        qty: qty, entry: entry, exit: exit, sl: sl, gross: r2(G), fees: fees,
        risk: risk !== null && risk > 0 ? r2(risk) : deriveRisk(entry, exit, sl, G),
        riskFrom: risk !== null && risk > 0 ? 'file' : (sl ? 'stop' : ''),
        tags: tagsOf(g(r, 'tags')), note: String(g(r, 'note') || '').trim().slice(0, 500), ticket: String(g(r, 'ticket') || '').trim()
      };
      var k = dupKey(t);
      if (seen[k]) { skipped.push({ row: ix + 1, why: 'already in your journal (duplicate)' }); return; }
      seen[k] = 1; trades.push(t);
    });
    return { trades: trades, skipped: skipped };
  }
  function dupKey(t) { return [t.ticket || '', t.open, t.close, String(t.symbol).toUpperCase(), r2(+t.gross || 0), t.qty === null || t.qty === undefined ? '' : +t.qty].join('|'); }

  // ---------------- export ----------------
  function csvCell(v) { var s = v === null || v === undefined ? '' : String(v); if (/^[=+\-@\t\r]/.test(s) && isNaN(+s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  var CSV_HEAD = ['Open time', 'Close time', 'Symbol', 'Side', 'Size', 'Entry', 'Exit', 'Stop loss', 'Profit', 'Fees', 'Net', 'Risk', 'R multiple', 'Setup', 'Note', 'Ticket'];
  function toCSV(trades) {
    var lines = [CSV_HEAD.join(',')];
    sortTrades(trades).forEach(function (t) {
      var r = rMult(t);
      lines.push([t.open, t.close, t.symbol, t.side, t.qty, t.entry, t.exit, t.sl, t.gross, t.fees, net(t), t.risk, r === null ? '' : Math.round(r * 100) / 100, tagsOf(t.tags).join('; '), t.note, t.ticket].map(csvCell).join(','));
    });
    return '﻿' + lines.join('\r\n') + '\r\n';
  }

  // ---------------- backup ----------------
  var APP = 'trading-studio', FORMAT = 1;
  function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function checkState(o) {
    if (!isObj(o)) return { ok: false, error: 'The file does not contain journal data.' };
    if (o.v !== 1) return { ok: false, error: 'Unknown data version (' + String(o.v) + ').' };
    if (!isObj(o.settings)) return { ok: false, error: 'Settings are missing.' };
    if (!Array.isArray(o.trades)) return { ok: false, error: 'The trade list is missing.' };
    for (var i = 0; i < o.trades.length; i++) {
      var t = o.trades[i];
      if (!isObj(t)) return { ok: false, error: 'Trade ' + (i + 1) + ' is not in the right shape.' };
      if (!isNum(+t.gross) || (!t.close && !t.open)) return { ok: false, error: 'Trade ' + (i + 1) + ' has no profit value or date.' };
    }
    var out = JSON.parse(JSON.stringify(o));
    if (!isObj(out.prop)) out.prop = null;
    if (!isObj(out.dayNotes)) out.dayNotes = {};
    out.trades.forEach(function (t, i) { t.tags = tagsOf(t.tags); if (!t.id) t.id = 't' + (i + 1); t.fees = +t.fees || 0; t.gross = +t.gross; });
    return { ok: true, data: out };
  }
  function makeBackup(state, nowIso) { return JSON.stringify({ app: APP, format: FORMAT, saved: nowIso || '', data: state }, null, 1); }
  function parseBackup(text) {
    if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'The file is empty.' };
    if (text.length > 30 * 1024 * 1024) return { ok: false, error: 'The file is too large.' };
    var o; try { o = JSON.parse(text.replace(/^﻿/, '')); } catch (e) { return { ok: false, error: 'This is not a Trading Studio backup (not JSON).' }; }
    if (!isObj(o) || o.app !== APP) return { ok: false, error: 'This is not a Trading Studio backup.' };
    if (o.format !== FORMAT) return { ok: false, error: 'Unknown backup format (' + String(o.format) + ').' };
    return checkState(o.data);
  }

  // ---------------- formatting ----------------
  var CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'SGD', 'HKD'];
  var fmts = {};
  function money(v, cur, signed) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    cur = CURRENCIES.indexOf(cur) >= 0 ? cur : 'USD';
    if (!fmts[cur]) fmts[cur] = new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, minimumFractionDigits: cur === 'JPY' ? 0 : 2, maximumFractionDigits: cur === 'JPY' ? 0 : 2 });
    var s = fmts[cur].format(Math.abs(v));
    var z = cur === 'JPY' ? Math.round(v) === 0 : Math.round(v * 100) === 0;
    if (z) return s;
    return (v < 0 ? '−' : signed ? '+' : '') + s;
  }
  function fx(v, d, suf) { if (v === null || v === undefined || isNaN(v)) return '—'; if (v === Infinity) return '∞'; var k = Math.pow(10, d); var x = Math.round(v * k) / k; return x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) + (suf || ''); }
  function fmtR(v) { if (v === null || v === undefined || isNaN(v)) return '—'; var x = Math.round(v * 100) / 100; return (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(2) + 'R'; }

  var api = {
    r2: r2, parseNum: parseNum, parseDate: parseDate, guessOrder: guessOrder, tsMs: tsMs, msTs: msTs, shiftTs: shiftTs, dayOf: dayOf, hourOf: hourOf, weekday: weekday, addDays: addDays, WD: WD, MON: MON, pad: pad,
    net: net, rMult: rMult, when: when, sortTrades: sortTrades, deriveRisk: deriveRisk, tagsOf: tagsOf,
    stats: stats, breakdown: breakdown, daily: daily, tradeDay: tradeDay, prop: prop, PRESETS: PRESETS, recoveryPct: recoveryPct,
    mulberry32: mulberry32, ruin: ruin, pctile: pctile,
    decodeBytes: decodeBytes, detectDelim: detectDelim, parseCSV: parseCSV, htmlRows: htmlRows, looksHTML: looksHTML,
    FIELDS: FIELDS, autoMap: autoMap, normHead: normHead, LAYOUTS: LAYOUTS, LAYOUT_NAMES: LAYOUT_NAMES, pickTable: pickTable, readTable: readTable, sideOf: sideOf, importRows: importRows, dupKey: dupKey,
    toCSV: toCSV, csvCell: csvCell, makeBackup: makeBackup, parseBackup: parseBackup, checkState: checkState,
    CURRENCIES: CURRENCIES, money: money, fx: fx, fmtR: fmtR
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TL = api;
})(typeof window !== 'undefined' ? window : this);
