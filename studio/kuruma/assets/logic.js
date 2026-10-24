/* 車屋・バイク屋スタジオの計算部分（ブラウザ・node 共通）
   Excel版（~/30日チャレンジ/車屋バイク屋/01〜06）と同じ計算ルールで計算する。
   日付は「1970-01-01 を 0 とする通し番号（日）」で扱い、保存は "2026-10-22" の文字列。時刻は「0時からの分」（540＝9:00）。 */
(function (root) {
  'use strict';
  var WD = ['日', '月', '火', '水', '木', '金', '土'];

  // ---------- 日付 ----------
  function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function D(s) { // "2026-10-22" → 通し番号。空・不正は null
    if (s === null || s === undefined || s === '') return null;
    if (typeof s === 'number') return s;
    var m = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/.exec(String(s).trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null;
    return Date.UTC(y, mo - 1, d) / 86400000;
  }
  function ymd(n) { var t = new Date(n * 86400000); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
  function iso(n) { if (n === null || n === undefined || n === '') return ''; var o = ymd(n); return o.y + '-' + (o.m < 10 ? '0' : '') + o.m + '-' + (o.d < 10 ? '0' : '') + o.d; }
  function wday(n) { return ((n % 7) + 7 + 4) % 7; } // 0=日
  function md(n) { var o = ymd(n); return o.m + '/' + o.d; }
  function mdw(n) { return md(n) + '(' + WD[wday(n)] + ')'; }
  function monthKey(n) { var o = ymd(n); return o.y * 100 + o.m; }
  function firstOfMonth(n) { var o = ymd(n); return Date.UTC(o.y, o.m - 1, 1) / 86400000; }
  function addMonths(n, k) { var o = ymd(n); return Date.UTC(o.y, o.m - 1 + k, 1) / 86400000; } // k か月後の1日
  function eomonth(n, k) { var o = ymd(n); return Date.UTC(o.y, o.m + k, 0) / 86400000; }        // Excel EOMONTH
  // Excel EDATE：k か月後の同じ日。その日がない月は月末（例：5/31 の2か月前 → 3/31、1/31 の2か月前 → 11/30）
  function edate(n, k) { var o = ymd(n), y = o.y, mo = o.m - 1 + k; y += Math.floor(mo / 12); mo = ((mo % 12) + 12) % 12; return Date.UTC(y, mo, Math.min(o.d, daysIn(y, mo + 1))) / 86400000; }
  function todayN(now) { var t = now || new Date(); return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 86400000; }

  // ---------- 端数（Excel の ROUND／ROUNDDOWN／ROUNDUP と同じ） ----------
  function clean(x) { return Number(Number(x).toPrecision(15)); }
  function round(x, d) { var k = Math.pow(10, d || 0), a = clean(Math.abs(x) * k); return (x < 0 ? -1 : 1) * Math.round(a) / k || 0; }
  function roundDown(x, d) { var k = Math.pow(10, d || 0), a = clean(Math.abs(x) * k); return (x < 0 ? -1 : 1) * Math.floor(a) / k || 0; }
  function roundUp(x, d) { var k = Math.pow(10, d || 0), a = clean(Math.abs(x) * k); return (x < 0 ? -1 : 1) * Math.ceil(a) / k || 0; }
  function taxRound(x, mode) {
    if (mode === '切り上げ') return roundUp(x, 0);
    if (mode === '四捨五入') return round(x, 0);
    return roundDown(x, 0);
  }
  function n0(v) { var x = typeof v === 'number' ? v : parseFloat(String(v === undefined || v === null ? '' : v).replace(/[,，\s]/g, '')); return isFinite(x) ? x : 0; }
  function has(v) { return v !== null && v !== undefined && String(v).trim() !== ''; }
  function numOrNull(v) { return has(v) ? n0(v) : null; }

  // ---------- 01 車検・点検 お客さま台帳 ----------
  // 国土交通省「自動車検査証の有効期間」（2026年10月22日に確認）。[区分, 初回, 2回目以降]。null＝車検なし
  var PERIODS = [
    ['自家用乗用', 3, 2], ['二輪（小型二輪・250cc超）', 3, 2], ['軽乗用', 3, 2], ['軽貨物', 2, 2],
    ['貨物（8t未満）', 2, 1], ['貨物（8t以上）', 1, 1], ['レンタカー', 2, 1], ['大型特殊・特種', 2, 2],
    ['自家用バス（11人以上）', 1, 1], ['幼児専用車', 1, 1], ['事業用バス・タクシー', 1, 1], ['軽二輪・原付（車検なし）', null, null]
  ];
  var GUIDE = ['1回目済', '2回目済', '予約済', '他店・不要'];
  // 次回の有効期間：区分が空→''、表にない→'区分を確認'、車検なし→'車検なし'、ほかは年数
  function nextYears(kind, periods) {
    if (!has(kind)) return '';
    var p = (periods || PERIODS).filter(function (x) { return x[0] === kind; })[0];
    if (!p) return '区分を確認';
    return p[2] === null || p[2] === undefined || p[2] === '' ? '車検なし' : p[2];
  }
  function shakenState(rem, d1, d2) { return rem < 0 ? '期限切れ' : (rem <= d2 ? '急ぎ' : (rem <= d1 ? '案内時期' : 'OK')); }
  // c: { name, plate, kind, exp, guide }。g1/g2＝満了日の d1/d2 日前（Excel と同じ）、from2＝2か月前の同じ日（受けられる最初の日の目安）
  function custCalc(c, today, d1, d2, periods) {
    var exp = D(c.exp), years = nextYears(c.kind, periods);
    if (exp === null) return { exp: null, g1: null, g2: null, rem: null, st: (has(c.name) || has(c.plate)) ? '未入力' : '', years: years, next: null, from2: null, from1: null };
    var rem = exp - today;
    return { exp: exp, g1: exp - d1, g2: exp - d2, rem: rem, st: shakenState(rem, d1, d2),
      years: years, next: typeof years === 'number' ? edate(exp, 12 * years) : null, from2: edate(exp, -2), from1: edate(exp, -1) };
  }
  // 今月の案内：案内日（早いほう）が対象月の末日までに来ていて、満了日が対象月の初日以降、予約済・他店・不要でない人。満了日の近い順（同じ日は上の行が先）
  function guideList(custs, today, d1, d2, month, periods) {
    var base = month === null || month === undefined || month === '' ? today : (typeof month === 'number' ? month : D(month));
    var ms = firstOfMonth(base), me = eomonth(base, 0);
    var list = custs.map(function (c, i) { return { c: c, i: i, x: custCalc(c, today, d1, d2, periods) }; }).filter(function (o) {
      return o.x.exp !== null && Math.min(o.x.g1, o.x.g2) <= me && o.x.exp >= ms && o.c.guide !== '予約済' && o.c.guide !== '他店・不要';
    }).sort(function (a, b) { return a.x.exp - b.x.exp || a.i - b.i; });
    return { ms: ms, me: me, list: list };
  }

  // ---------- 02 整備見積・請求書 ----------
  // job: { rate（標準レート）, discount, round, parts:[{qty, price, cost}], work:[{hours, rate}], legal:[{amount}] }
  function jobCalc(job) {
    var std = numOrNull(job.rate);
    var parts = (job.parts || []).map(function (l) { return (has(l.qty) && has(l.price)) ? round(n0(l.qty) * n0(l.price), 0) : null; });
    var work = (job.work || []).map(function (l) {
      if (!has(l.hours) || (!has(l.rate) && std === null)) return null;
      return round(n0(l.hours) * (has(l.rate) ? n0(l.rate) : std), 0);
    });
    var legal = (job.legal || []).map(function (l) { return has(l.amount) ? n0(l.amount) : null; });
    var sum = function (a) { return a.reduce(function (s, x) { return s + (x === null ? 0 : x); }, 0); };
    var pSum = sum(parts), wSum = sum(work), lSum = sum(legal), disc = n0(job.discount);
    var base10 = pSum + wSum - disc;
    var tax = taxRound(base10 * 10 / 100, job.round);
    var cost = (job.parts || []).reduce(function (s, l) { return s + ((has(l.qty) && has(l.cost)) ? round(n0(l.qty) * n0(l.cost), 0) : 0); }, 0);
    return { parts: parts, work: work, legal: legal, partsSum: pSum, workSum: wSum, legalSum: lSum, discount: disc, base10: base10, tax: tax,
      total: base10 + tax + lSum, partsCost: cost, gross: base10 - cost };
  }
  function dueDate(dateIso, days) { var d = D(dateIso); return (d === null || !has(days)) ? null : d + n0(days); }
  function regNoOk(s) { return !has(s) || (String(s).length === 14 && String(s).charAt(0) === 'T'); }
  // 請求の状態：残り＝合計−入金。残り0以下→入金済／期限を過ぎて残り→遅れ／一部でも入金→一部入金／それ以外→未入金
  function payStatus(total, paid, due, base) {
    var remain = total - n0(paid), st;
    if (remain <= 0) st = '入金済';
    else if (due !== null && due < base) st = '遅れ';
    else if (n0(paid) > 0) st = '一部入金';
    else st = '未入金';
    return { remain: remain, status: st, late: st === '遅れ' ? base - due : null };
  }

  // ---------- 03 作業予約・ピット表 ----------
  // cfg: { open, close, step（分）, brs, bre（昼休み・null可）, h1, h2（定休日 '日'〜'土'・'なし'）, lifts:[], cars:[], hols:['2026-11-03'] }
  // row: { date, s, e（分）, lift, name, car_model, work, car（代車）, ret（返却予定日）, state }
  function hm(s) { if (typeof s === 'number') return s; var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim()); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  function hhmm(n) { if (n === null || n === undefined || n === '') return ''; var h = Math.floor(n / 60), m = n % 60; return h + ':' + (m < 10 ? '0' : '') + m; }
  function pitHoliday(d, cfg) {
    if ((cfg.hols || []).some(function (h) { return D(h && h.date !== undefined ? h.date : h) === d; })) return true;
    var w = WD[wday(d)];
    return w === cfg.h1 || w === cfg.h2;
  }
  function nslots(cfg, cap) {
    var n = cfg.close > cfg.open && cfg.step > 0 ? Math.ceil((cfg.close - cfg.open) / cfg.step) : 0;
    return Math.min(n, cap || 36);
  }
  function pitNum(v) { return v === null || v === undefined || v === '' ? null : v; }
  function pitValid(r) { var s = pitNum(r.s), e = pitNum(r.e); return D(r.date) !== null && has(r.lift) && s !== null && e !== null && r.state !== 'キャンセル' && e > s; }
  function carRet(r) { var d = D(r.date), t = D(r.ret); return t !== null ? Math.max(d, t) : d; }
  function carValid(r) { return has(r.car) && D(r.date) !== null && r.state !== 'キャンセル'; }
  function pitJudge(rows, i, cfg) {
    var r = rows[i], d = D(r.date), s = pitNum(r.s), e = pitNum(r.e);
    if (!(d !== null || s !== null || e !== null || has(r.lift) || has(r.name))) return '';
    if (r.state === 'キャンセル') return 'キャンセル';
    if (!(d !== null && has(r.lift) && s !== null && e !== null)) return '入力不足';
    if (e <= s) return '時刻を確認';
    var n = rows.filter(function (o) { return pitValid(o) && D(o.date) === d && o.lift === r.lift && o.s < e && o.e > s; }).length;
    if (n > 1) return '重なり';
    if (carValid(r)) {
      var rr = carRet(r);
      n = rows.filter(function (o) { return carValid(o) && o.car === r.car && D(o.date) <= rr && carRet(o) >= d; }).length;
      if (n > 1) return '代車重なり';
    }
    if (s < cfg.open || e > cfg.close) return '時間外';
    if (pitHoliday(d, cfg)) return '休業日';
    return '';
  }
  function slotOk(d, m, cfg) {
    if (pitHoliday(d, cfg)) return false;
    var brs = pitNum(cfg.brs), bre = pitNum(cfg.bre);
    if (brs !== null && bre !== null && m < bre && m + cfg.step > brs) return false;
    return true;
  }
  function onSlot(rows, d, lift, m, cfg) { return rows.filter(function (o) { return pitValid(o) && D(o.date) === d && o.lift === lift && o.s < m + cfg.step && o.e > m; }); }
  // ピット表の1マス：{ text, kind: ''|'res'|'cont'|'over'|'rest'|'hol', row }
  function pitCell(rows, d, lift, k, cfg) {
    var m = cfg.open + k * cfg.step, hit = onSlot(rows, d, lift, m, cfg);
    if (!hit.length) {
      if (slotOk(d, m, cfg)) return { text: '', kind: '' };
      return pitHoliday(d, cfg) ? { text: '休業', kind: 'hol' } : { text: '休憩', kind: 'rest' };
    }
    if (hit.length > 1) return { text: '重なり ' + hit.length + '件', kind: 'over', rows: hit };
    var o = hit[0];
    if (o.s >= m || m === cfg.open) return { text: o.name + (has(o.car_model) ? '／' + o.car_model : '') + (has(o.work) ? '／' + o.work : ''), kind: 'res', row: o };
    return { text: '〃', kind: 'cont', row: o };
  }
  function pitFree(rows, d, lift, cfg) {
    var n = 0, ns = nslots(cfg);
    for (var k = 0; k < ns; k++) { var m = cfg.open + k * cfg.step; if (slotOk(d, m, cfg) && !onSlot(rows, d, lift, m, cfg).length) n++; }
    return n;
  }
  function carsInUse(rows, car, d) { return rows.filter(function (o) { return carValid(o) && o.car === car && D(o.date) <= d && d <= carRet(o); }).length; }
  // 2週間の空き（Excel の「2週間の空き」シートと同じ）
  function pitDays(rows, day, cfg, n) {
    var out = [];
    for (var i = 0; i < (n || 14); i++) {
      var d = day + i, hol = pitHoliday(d, cfg);
      var free = cfg.lifts.map(function (l) { return hol ? '休' : pitFree(rows, d, l, cfg); });
      out.push({ date: d, hol: hol, count: rows.filter(function (o) { return pitValid(o) && D(o.date) === d; }).length, free: free,
        total: free.reduce(function (a, x) { return a + (typeof x === 'number' ? x : 0); }, 0),
        freeCars: cfg.cars.length - cfg.cars.reduce(function (a, c) { return a + carsInUse(rows, c, d); }, 0),
        overlaps: rows.filter(function (o, j) { return D(o.date) === d && pitJudge(rows, j, cfg) === '重なり'; }).length });
    }
    return out;
  }
  function carState(rows, car, d) {
    var n = carsInUse(rows, car, d), st = n === 0 ? '空き' : (n > 1 ? '重なり' : '貸出中');
    var o = st === '貸出中' ? rows.filter(function (x) { return carValid(x) && x.car === car && D(x.date) <= d && d <= carRet(x); })[0] : null;
    return { state: st, who: o ? o.name : '', ret: o ? carRet(o) : null };
  }
  // 空いている時間を探す（開始は枠の刻み、昼休み・ほかの予約・休業日を避ける）
  function findFree(rows, cfg, from, dur, lifts, days) {
    for (var d = from; d < from + (days || 14); d++) {
      if (pitHoliday(d, cfg)) continue;
      for (var li = 0; li < lifts.length; li++) {
        for (var s = cfg.open; s + dur <= cfg.close; s += cfg.step) {
          var e = s + dur, brs = pitNum(cfg.brs), bre = pitNum(cfg.bre);
          if (brs !== null && bre !== null && s < bre && e > brs) continue;
          if (rows.some(function (o) { return pitValid(o) && D(o.date) === d && o.lift === lifts[li] && o.s < e && o.e > s; })) continue;
          return { date: d, s: s, e: e, lift: lifts[li] };
        }
      }
    }
    return null;
  }

  // ---------- 04 部品の在庫・発注 ----------
  // part: { code, name, cat, fit, supplier, place, unit, price（仕入れ単価）, init（使い始めの在庫）, point（発注点）, lot（1回に頼む数） }
  // rec: { date, code, kind（入荷・入庫・出庫・発注・発注取消・棚卸調整）, qty }
  var REC_KINDS = ['入荷', '入庫', '出庫', '発注', '発注取消', '棚卸調整'];
  function key(v) { return has(v) ? String(v).trim() : ''; }
  function partsCalc(parts, recs) {
    var tot = {};
    recs.forEach(function (r) { if (!has(r.code) || !has(r.qty)) return; var k = key(r.code) + '|' + r.kind; tot[k] = (tot[k] || 0) + n0(r.qty); });
    var t = function (code, kind) { return tot[key(code) + '|' + kind] || 0; };
    var cnt = {}; parts.forEach(function (p) { var k = key(p.code); cnt[k] = (cnt[k] || 0) + 1; });
    return parts.map(function (p) {
      var inc = t(p.code, '入荷') + t(p.code, '入庫'), out = t(p.code, '出庫'), adj = t(p.code, '棚卸調整');
      var stock = n0(p.init) + inc + adj - out;
      var onord = Math.max(0, t(p.code, '発注') - t(p.code, '入荷') - t(p.code, '発注取消'));
      var j;
      if (cnt[key(p.code)] > 1) j = '品番が重複';
      else if (stock < 0) j = '在庫がマイナス';
      else if (!has(p.point)) j = '';
      else if (stock + onord <= n0(p.point)) j = '要発注';
      else if (stock <= n0(p.point)) j = '発注済み';
      else j = '';
      var lot = Math.max(1, n0(p.lot));
      var need = j === '要発注' ? roundUp((n0(p.point) - stock - onord + 1) / lot, 0) * lot : '';
      return { inc: inc, out: out, adj: adj, stock: clean(stock), onord: onord, judge: j, need: need, money: has(p.price) ? Math.max(0, clean(stock)) * n0(p.price) : '' };
    });
  }
  function recCheck(r, parts) {
    if (!has(r.code) && !has(r.qty)) return '';
    if (has(r.code) && !parts.some(function (p) { return key(p.code) === key(r.code); })) return '品番なし';
    if (D(r.date) === null || !has(r.code) || !has(r.kind) || !has(r.qty)) return '入力不足';
    if (r.kind !== '棚卸調整' && n0(r.qty) <= 0) return '数量を確認';
    return '';
  }
  function orderList(parts, recs) {
    var res = partsCalc(parts, recs), out = [];
    parts.forEach(function (p, i) { if (res[i].judge === '要発注') out.push({ i: i, p: p, r: res[i], money: res[i].need * n0(p.price) }); });
    return { list: out, money: out.reduce(function (a, x) { return a + x.money; }, 0) };
  }
  // 月別の使用数（出庫）：start（月の初日）から12か月
  function partsMonthly(parts, recs, start) {
    var s0 = firstOfMonth(start);
    return parts.map(function (p) {
      var a = [];
      for (var k = 0; k < 12; k++) {
        var m0 = addMonths(s0, k), m1 = addMonths(s0, k + 1);
        a.push(recs.reduce(function (sum, r) { var d = D(r.date); return sum + ((key(r.code) === key(p.code) && r.kind === '出庫' && d !== null && d >= m0 && d < m1 && has(r.qty)) ? n0(r.qty) : 0); }, 0));
      }
      return a;
    });
  }
  // よく使う部品（12か月の出庫の合計が多い順・同じ数なら上の行が先。順位は同じ数なら同じ順位）
  function partsBest(parts, recs, start, n) {
    var tot = partsMonthly(parts, recs, start).map(function (a) { return a.reduce(function (x, y) { return x + y; }, 0); });
    return tot.map(function (t, i) { return { i: i, total: t }; }).filter(function (x) { return x.total > 0; })
      .sort(function (a, b) { return b.total - a.total || a.i - b.i; }).slice(0, n || 10)
      .map(function (x) { return { i: x.i, total: x.total, rank: tot.filter(function (t) { return t > x.total; }).length + 1 }; });
  }
  // 月別の入出庫金額（入荷＋入庫／出庫／発注−発注取消。金額＝数量×仕入れ単価の四捨五入）
  function partsMoneyByMonth(parts, recs, start) {
    var s0 = firstOfMonth(start), out = [];
    var amt = function (r) { var p = parts.filter(function (x) { return key(x.code) === key(r.code); })[0]; return (p && has(r.qty) && has(p.price)) ? round(n0(r.qty) * n0(p.price), 0) : 0; };
    for (var k = 0; k < 12; k++) {
      var m0 = addMonths(s0, k), m1 = addMonths(s0, k + 1), x = { month: m0, inn: 0, out: 0, order: 0 };
      recs.forEach(function (r) {
        var d = D(r.date); if (d === null || d < m0 || d >= m1) return;
        if (r.kind === '入荷' || r.kind === '入庫') x.inn += amt(r);
        else if (r.kind === '出庫') x.out += amt(r);
        else if (r.kind === '発注') x.order += amt(r);
        else if (r.kind === '発注取消') x.order -= amt(r);
      });
      out.push(x);
    }
    return out;
  }

  // ---------- 05 中古車・中古バイクの在庫と原価 ----------
  // u: { no, type（車・バイク）, name, buy（仕入れ日）, cost0（仕入れ価格）, maint（整備費）, fee（諸費用）, price（販売価格）, sold（売れた日） }
  function usedCalc(u, base, longDays) {
    var nums = [u.cost0, u.maint, u.fee].filter(has);
    var cost = nums.length ? nums.reduce(function (a, x) { return a + n0(x); }, 0) : '';
    var gross = (cost === '' || !has(u.price)) ? '' : n0(u.price) - cost;
    var rate = (gross === '' || n0(u.price) === 0) ? '' : gross / n0(u.price);
    var buy = D(u.buy), sold = D(u.sold);
    var days = buy === null ? '' : (sold !== null ? sold - buy : base - buy);
    var used = has(u.no) || has(u.name) || has(u.cost0), st;
    if (!used) st = '';
    else if (days !== '' && days < 0) st = '日付を確認';
    else if (sold !== null) st = '売れた';
    else if (days !== '' && days > longDays) st = '長期在庫';
    else st = '在庫';
    return { cost: cost, gross: gross, rate: rate, days: days, st: st };
  }
  function usedSummary(list, base, longDays) {
    var rs = list.map(function (u) { return { u: u, x: usedCalc(u, base, longDays) }; });
    var inst = rs.filter(function (o) { return o.x.st === '在庫' || o.x.st === '長期在庫'; }), sold = rs.filter(function (o) { return o.x.st === '売れた'; });
    var sum = function (a, f) { return a.reduce(function (s, o) { var v = f(o); return s + (v === '' || v === null ? 0 : n0(v)); }, 0); };
    var sales = sum(sold, function (o) { return o.u.price; }), sg = sum(sold, function (o) { return o.x.gross; });
    return { inst: inst.length, car: inst.filter(function (o) { return o.u.type === '車'; }).length, bike: inst.filter(function (o) { return o.u.type === 'バイク'; }).length,
      long: inst.filter(function (o) { return o.x.st === '長期在庫'; }).length, instCost: sum(inst, function (o) { return o.x.cost; }),
      instPrice: sum(inst, function (o) { return o.u.price; }), instGross: sum(inst, function (o) { return o.x.gross; }),
      instDays: inst.length ? sum(inst, function (o) { return o.x.days; }) / inst.length : '',
      check: rs.filter(function (o) { return o.x.st === '日付を確認'; }).length, sold: sold.length, sales: sales,
      soldCost: sum(sold, function (o) { return o.x.cost; }), soldGross: sg, soldRate: sales ? sg / sales : '',
      soldDays: sold.length ? sum(sold, function (o) { return o.x.days; }) / sold.length : '' };
  }
  function usedMonthly(list, base, longDays, start) {
    var s0 = firstOfMonth(start), out = [];
    for (var k = 0; k < 12; k++) {
      var m0 = addMonths(s0, k), m1 = addMonths(s0, k + 1);
      var ms = list.map(function (u) { return { u: u, x: usedCalc(u, base, longDays) }; }).filter(function (o) { var d = D(o.u.sold); return o.x.st === '売れた' && d >= m0 && d < m1; });
      var sales = ms.reduce(function (a, o) { return a + n0(o.u.price); }, 0), g = ms.reduce(function (a, o) { return a + n0(o.x.gross); }, 0);
      out.push({ month: m0, n: ms.length, car: ms.filter(function (o) { return o.u.type === '車'; }).length, bike: ms.filter(function (o) { return o.u.type === 'バイク'; }).length,
        sales: sales, cost: ms.reduce(function (a, o) { return a + n0(o.x.cost); }, 0), gross: g, rate: ms.length ? g / sales : '',
        days: ms.length ? ms.reduce(function (a, o) { return a + n0(o.x.days); }, 0) / ms.length : '' });
    }
    return out;
  }

  // ---------- 06 案内文（差し込み） ----------
  function pad(x) { return (x < 10 ? '0' : '') + x; }
  function isoYmd(y, mo, d) { if (y < 1900 || y > 2200 || mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null; return y + '-' + pad(mo) + '-' + pad(d); }
  var ERA = { '令和': 2018, 'R': 2018, '平成': 1988, 'H': 1988 };
  // "2027/3/14" "2027年3月14日" "令和9年3月14日" "R9.3.14" 全角も → '2027-03-14'。空は ''、読めないときは null
  function parseDate(s) {
    var t = String(s === undefined || s === null ? '' : s)
      .replace(/[０-９Ａ-Ｚａ-ｚ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[／－．]/g, function (c) { return { '／': '/', '－': '-', '．': '.' }[c]; })
      .replace(/[\s　]/g, '').replace(/(\(.\)|（.）)$/, '');
    if (t === '') return '';
    var m = /^(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})日?$/.exec(t);
    if (m) return isoYmd(+m[1], +m[2], +m[3]);
    m = /^(令和|平成|[RrHh])(\d{1,2}|元)[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})日?$/.exec(t);
    if (m) { var b = ERA[m[1].toUpperCase()] || ERA[m[1]], yy = m[2] === '元' ? 1 : +m[2]; if (yy < 1) return null; return isoYmd(b + yy, +m[3], +m[4]); }
    m = /^(\d{4})(\d{2})(\d{2})$/.exec(t);
    if (m) return isoYmd(+m[1], +m[2], +m[3]);
    return null;
  }
  function addMonthsIso(s, n) { var d = D(s); return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && d !== null ? iso(edate(d, n)) : ''; }
  function jaDate(s, withWd) {
    var d = D(s); if (d === null || !/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return '';
    var o = ymd(d), t = o.y + '年' + o.m + '月' + o.d + '日';
    return withWd ? t + '（' + WD[wday(d)] + '）' : t;
  }
  var COMPUTED = ['基準日', '2か月前', '1か月前', '店名', '店の電話', '店の住所', '今日'];
  function placeholders(tpl) { var out = [], re = /\{([^{}\n]{1,30})\}/g, m; while ((m = re.exec(tpl || ''))) { var k = m[1].trim(); if (out.indexOf(k) < 0) out.push(k); } return out; }
  function varsFor(rec, headers, opt) {
    opt = opt || {};
    var v = {};
    (headers || []).forEach(function (h) { var raw = rec[h] === undefined ? '' : String(rec[h]).trim(), d = parseDate(raw); v[h] = d ? jaDate(d, opt.weekday) : raw; });
    var base = parseDate(rec[opt.dateCol || '満了日']) || '';
    v['基準日'] = base ? jaDate(base, opt.weekday) : '';
    v['2か月前'] = base ? jaDate(addMonthsIso(base, -2), opt.weekday) : '';
    v['1か月前'] = base ? jaDate(addMonthsIso(base, -1), opt.weekday) : '';
    var shop = opt.shop || {};
    v['店名'] = shop.name || ''; v['店の電話'] = shop.tel || ''; v['店の住所'] = shop.addr || '';
    v['今日'] = jaDate(opt.today || iso(todayN()), opt.weekday);
    return v;
  }
  function fill(tpl, vars) {
    var unknown = [], empty = [];
    var text = String(tpl || '').replace(/\{([^{}\n]{1,30})\}/g, function (all, k) {
      k = k.trim();
      if (!Object.prototype.hasOwnProperty.call(vars, k)) { if (unknown.indexOf(k) < 0) unknown.push(k); return all; }
      var val = vars[k];
      if (val === '' && empty.indexOf(k) < 0) empty.push(k);
      return val;
    });
    return { text: text, unknown: unknown, empty: empty };
  }
  // 中身が空の「TEL」「FAX」だけの行は、はがきに残さない（Excel版06と同じ）
  function cleanSign(s) { return String(s || '').split('\n').filter(function (l) { return !/^\s*(TEL|Tel|tel|FAX|Fax|電話|ＴＥＬ)[\s:：]*$/.test(l); }).join('\n').replace(/^\s+|\s+$/g, ''); }

  // ---------- 表示 ----------
  function yen(x) { return (x < 0 ? '-' : '') + '¥' + Math.abs(Math.round(x)).toLocaleString('ja-JP'); }
  function num(x, d) { if (x === null || x === undefined || x === '' || isNaN(x)) return ''; return round(x, d || 0).toLocaleString('ja-JP', { maximumFractionDigits: d || 0 }); }
  function pct(x, d) { return x === null || x === undefined || x === '' ? '—' : round(x * 100, d === undefined ? 1 : d).toFixed(d === undefined ? 1 : d) + '%'; }

  var api = {
    WD: WD, D: D, iso: iso, ymd: ymd, wday: wday, md: md, mdw: mdw, monthKey: monthKey, firstOfMonth: firstOfMonth, addMonths: addMonths, eomonth: eomonth, edate: edate, todayN: todayN,
    round: round, roundDown: roundDown, roundUp: roundUp, taxRound: taxRound, n0: n0, has: has,
    PERIODS: PERIODS, GUIDE: GUIDE, nextYears: nextYears, shakenState: shakenState, custCalc: custCalc, guideList: guideList,
    jobCalc: jobCalc, dueDate: dueDate, regNoOk: regNoOk, payStatus: payStatus,
    hm: hm, hhmm: hhmm, pitHoliday: pitHoliday, nslots: nslots, pitValid: pitValid, carRet: carRet, carValid: carValid, pitJudge: pitJudge, slotOk: slotOk,
    pitCell: pitCell, pitFree: pitFree, carsInUse: carsInUse, pitDays: pitDays, carState: carState, findFree: findFree,
    REC_KINDS: REC_KINDS, partsCalc: partsCalc, recCheck: recCheck, orderList: orderList, partsMonthly: partsMonthly, partsBest: partsBest, partsMoneyByMonth: partsMoneyByMonth,
    usedCalc: usedCalc, usedSummary: usedSummary, usedMonthly: usedMonthly,
    parseDate: parseDate, addMonthsIso: addMonthsIso, jaDate: jaDate, COMPUTED: COMPUTED, placeholders: placeholders, varsFor: varsFor, fill: fill, cleanSign: cleanSign,
    yen: yen, num: num, pct: pct
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KL = api;
})(this);
