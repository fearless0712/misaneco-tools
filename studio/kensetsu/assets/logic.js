/* 建設スタジオの計算部分（ブラウザ・node 共通）
   Excel版（~/30日チャレンジ/建設/01〜09）と同じ計算ルールで計算する。
   日付は「1970-01-01 を 0 とする通し番号（日）」で扱い、保存は "2026-10-22" の文字列。 */
(function (root) {
  'use strict';

  // ---------- 祝日（内閣府「国民の祝日について」2026年・2027年。04_工程表／kouki と同じ） ----------
  var HOLIDAYS = [
    ['2026-01-01', '元日'], ['2026-01-12', '成人の日'], ['2026-02-11', '建国記念の日'], ['2026-02-23', '天皇誕生日'],
    ['2026-03-20', '春分の日'], ['2026-04-29', '昭和の日'], ['2026-05-03', '憲法記念日'], ['2026-05-04', 'みどりの日'],
    ['2026-05-05', 'こどもの日'], ['2026-05-06', '振替休日'], ['2026-07-20', '海の日'], ['2026-08-11', '山の日'],
    ['2026-09-21', '敬老の日'], ['2026-09-22', '国民の休日'], ['2026-09-23', '秋分の日'], ['2026-10-12', 'スポーツの日'],
    ['2026-11-03', '文化の日'], ['2026-11-23', '勤労感謝の日'],
    ['2027-01-01', '元日'], ['2027-01-11', '成人の日'], ['2027-02-11', '建国記念の日'], ['2027-02-23', '天皇誕生日'],
    ['2027-03-21', '春分の日'], ['2027-03-22', '振替休日'], ['2027-04-29', '昭和の日'], ['2027-05-03', '憲法記念日'],
    ['2027-05-04', 'みどりの日'], ['2027-05-05', 'こどもの日'], ['2027-07-19', '海の日'], ['2027-08-11', '山の日'],
    ['2027-09-20', '敬老の日'], ['2027-09-23', '秋分の日'], ['2027-10-11', 'スポーツの日'], ['2027-11-03', '文化の日'],
    ['2027-11-23', '勤労感謝の日']
  ];
  var HOL_FROM = 2026, HOL_TO = 2027;
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
  function iso(n) { if (n === null || n === undefined) return ''; var o = ymd(n); return o.y + '-' + (o.m < 10 ? '0' : '') + o.m + '-' + (o.d < 10 ? '0' : '') + o.d; }
  function wday(n) { return ((n % 7) + 7 + 4) % 7; } // 0=日
  function md(n) { var o = ymd(n); return o.m + '/' + o.d; }
  function mdw(n) { return md(n) + '(' + WD[wday(n)] + ')'; }
  function monthKey(n) { var o = ymd(n); return o.y * 100 + o.m; }
  function firstOfMonth(n) { var o = ymd(n); return Date.UTC(o.y, o.m - 1, 1) / 86400000; }
  function addMonths(n, k) { var o = ymd(n); return Date.UTC(o.y, o.m - 1 + k, 1) / 86400000; } // k か月後の1日
  function eomonth(n, k) { var o = ymd(n); return Date.UTC(o.y, o.m + k, 0) / 86400000; }        // Excel EOMONTH
  function excelDate(y, m, d) { return Date.UTC(y, m - 1, d) / 86400000; }                      // Excel DATE（あふれは繰り越し）
  function todayN(now) { var t = now || new Date(); return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 86400000; }

  // ---------- 端数（Excel の ROUND／ROUNDDOWN／ROUNDUP と同じ） ----------
  // 浮動小数のずれ（0.1×3 など）を 15 桁で丸めてから処理する
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

  // ---------- 01 工事見積書 ----------
  // e: { rate（諸経費率 0.05）, discount（値引き）, round（'切り捨て'|'四捨五入'|'切り上げ'）, lines:[{qty, price, reduced}] }
  function estimate(e) {
    var lines = (e.lines || []).map(function (l) {
      var amt = (has(l.qty) && has(l.price)) ? round(n0(l.qty) * n0(l.price), 0) : null;  // 金額＝数量×単価（四捨五入）
      return { amount: amt, reduced: !!l.reduced };
    });
    var subtotal = 0, r8 = 0;
    lines.forEach(function (l) { if (l.amount !== null) { subtotal += l.amount; if (l.reduced) r8 += l.amount; } });
    var overhead = roundDown(subtotal * n0(e.rate), 0);            // 諸経費＝小計×率（切り捨て）
    var excl = subtotal + overhead - n0(e.discount);               // 税抜合計
    var r10 = excl - r8;                                           // 諸経費・値引きは10%の対象
    var tax10 = taxRound(r10 * 10 / 100, e.round);                 // 税率ごとに1回だけ端数処理
    var tax8 = taxRound(r8 * 8 / 100, e.round);
    return { lines: lines, subtotal: subtotal, overhead: overhead, discount: n0(e.discount), excl: excl,
      base10: r10, tax10: tax10, base8: r8, tax8: tax8, tax: tax10 + tax8, total: excl + tax10 + tax8 };
  }
  function validUntil(dateIso, days) { var d = D(dateIso); return (d === null || !has(days)) ? null : d + n0(days); }
  function regNoOk(s) { return !has(s) || (String(s).length === 14 && String(s).charAt(0) === 'T'); }

  // ---------- 02 現場別 原価・粗利 ----------
  var COST_KINDS = ['材料', '外注', '人工', 'その他'];
  function costAmount(c) { return (has(c.qty) && has(c.price)) ? round(n0(c.qty) * n0(c.price), 0) : 0; }
  // site: { id, est（見積・税抜）, plan（予定原価） } / costs: [{site, kind, qty, price}] / target: 0.2
  function siteProfit(site, costs, target) {
    var by = { '材料': 0, '外注': 0, '人工': 0, 'その他': 0 }, n = 0;
    costs.forEach(function (c) { if (c.site === site.id && by.hasOwnProperty(c.kind)) { by[c.kind] += costAmount(c); n++; } });
    var total = by['材料'] + by['外注'] + by['人工'] + by['その他'];
    var est = has(site.est) ? n0(site.est) : null;
    var profit = est === null ? null : est - total;
    var margin = (est === null || est === 0) ? null : profit / est;
    var diff = has(site.plan) ? n0(site.plan) - total : null;
    var judge = (margin === null || total === 0) ? '' : (margin < target ? '目標未満' : 'OK');
    return { byKind: by, total: total, count: n, profit: profit, margin: margin, diff: diff, judge: judge };
  }
  function profitSummary(sites, costs, target) {
    var est = 0, cost = 0, under = 0, doneP = 0, doneE = 0, kinds = { '材料': 0, '外注': 0, '人工': 0, 'その他': 0 };
    sites.forEach(function (s) {
      var p = siteProfit(s, costs, target);
      est += has(s.est) ? n0(s.est) : 0; cost += p.total;
      if (p.judge === '目標未満') under++;
      if (s.status === '完了') { doneP += p.profit || 0; doneE += has(s.est) ? n0(s.est) : 0; }
      COST_KINDS.forEach(function (k) { kinds[k] += p.byKind[k]; });
    });
    return { count: sites.length, est: est, cost: cost, profit: est - cost, margin: est ? (est - cost) / est : null,
      under: under, doneProfit: doneP, doneMargin: doneE ? doneP / doneE : null, kinds: kinds };
  }

  // ---------- 03 請求・入金 ----------
  // b: { amount（請求額）, due（入金予定日）, paid（入金額）, deducted（差し引かれた額） }
  function billStatus(b, base) {
    if (!has(b.amount)) return { remain: null, status: '', late: null };
    var remain = n0(b.amount) - (n0(b.paid) + n0(b.deducted));
    var due = D(b.due), st;
    if (remain <= 0) st = '入金済';
    else if (due !== null && due < base) st = '遅れ';
    else if (n0(b.paid) + n0(b.deducted) > 0) st = '一部入金';
    else st = '未入金';
    return { remain: remain, status: st, late: st === '遅れ' ? base - due : null };
  }
  function billSummary(bills, base) {
    var remain = 0, late = 0, lateN = 0;
    bills.forEach(function (b) { var s = billStatus(b, base); if (s.remain === null) return; remain += s.remain; if (s.status === '遅れ') { late += s.remain; lateN++; } });
    return { remain: remain, late: late, lateCount: lateN };
  }
  function byClient(bills, base) {
    var m = {}, order = [];
    bills.forEach(function (b) {
      var k = b.client || ''; if (!m[k]) { m[k] = { client: k, billed: 0, paid: 0, deducted: 0, balance: 0, late: 0, lateCount: 0 }; order.push(k); }
      var s = billStatus(b, base), x = m[k];
      x.billed += n0(b.amount); x.paid += n0(b.paid); x.deducted += n0(b.deducted);
      x.balance = x.billed - x.paid - x.deducted;
      if (s.status === '遅れ') { x.late += s.remain; x.lateCount++; }
    });
    return order.map(function (k) { return m[k]; });
  }
  // 月別：入金予定日の月の入金予定額・まだ入っていない額、入金日の月の入金額、請求日の月の請求額
  function billMonthly(bills, startMonthN, months) {
    var out = [];
    for (var i = 0; i < months; i++) {
      var a = addMonths(startMonthN, i), z = addMonths(startMonthN, i + 1);
      var r = { month: a, plan: 0, unpaid: 0, received: 0, billed: 0 };
      bills.forEach(function (b) {
        var due = D(b.due), pd = D(b.paidDate), bd = D(b.date);
        var remain = n0(b.amount) - n0(b.paid) - n0(b.deducted);
        if (due !== null && due >= a && due < z) { r.plan += n0(b.amount); r.unpaid += remain; }
        if (pd !== null && pd >= a && pd < z) r.received += n0(b.paid);
        if (bd !== null && bd >= a && bd < z) r.billed += n0(b.amount);
      });
      out.push(r);
    }
    return out;
  }

  // ---------- 04 工程表（稼働日） ----------
  var HSET = {}; HOLIDAYS.forEach(function (h) { HSET[D(h[0])] = h[1]; });
  // cal: { off: '土日'|'日曜のみ'|'なし', holidays: true/false（国民の祝日を休む）, company: ['2026-12-29', …] }
  function makeCal(o) {
    var c = { off: o.off || '土日', useHol: o.holidays !== false, company: {} };
    (o.company || []).forEach(function (s) { var n = D(s && s.date !== undefined ? s.date : s); if (n !== null) c.company[n] = true; });
    return c;
  }
  function holidayName(n) { return HSET[n] || ''; }
  function isWork(n, cal) {
    if (cal.useHol && HSET[n]) return false;
    if (cal.company[n]) return false;
    var w = wday(n);
    if (cal.off === '土日' && (w === 0 || w === 6)) return false;
    if (cal.off === '日曜のみ' && w === 0) return false;
    return true;
  }
  // 開始日を1日目として、稼働日を n 日数えた日（開始日が休みなら次の稼働日から）。Excel版の「営業日カレンダー」と同じ結果
  function endDate(start, n, cal) {
    var s = D(start); if (s === null || !has(n)) return null;
    n = n0(n); if (n < 1 || n !== Math.floor(n)) return null;
    var d = s, c = 0, guard = 0;
    while (guard++ < 4000) { if (isWork(d, cal)) { c++; if (c === n) return d; } d++; }
    return null; // 範囲外
  }
  function workdaysBetween(a, b, cal) { var c = 0; for (var d = a; d <= b; d++) if (isWork(d, cal)) c++; return c; }
  // task: { start, days, manualEnd, state（'未着手'|'作業中'|'完了'） }
  function taskInfo(t, cal, today) {
    var end = has(t.manualEnd) ? D(t.manualEnd) : endDate(t.start, t.days, cal);
    var s = D(t.start);
    var judge = end === null ? '' : (t.state === '完了' ? '完了' : (end < today ? '遅れ' : ''));
    return { start: s, end: end, judge: judge, workdays: (s !== null && end !== null) ? workdaysBetween(s, end, cal) : 0 };
  }
  // 進み具合：完了の工程は全部、それ以外は「昨日までに過ぎた稼働日」（作業中のみ）を終わった分として数える
  function siteProgress(tasks, cal, today) {
    var all = 0, done = 0, late = 0, first = null, last = null;
    tasks.forEach(function (t) {
      var i = taskInfo(t, cal, today); if (i.end === null) return;
      all += i.workdays;
      if (t.state === '完了') done += i.workdays;
      else if (t.state === '作業中' && i.start < today) done += Math.min(i.workdays, workdaysBetween(i.start, today - 1, cal));
      if (i.judge === '遅れ') late++;
      if (first === null || i.start < first) first = i.start;
      if (last === null || i.end > last) last = i.end;
    });
    return { workdays: all, done: done, ratio: all ? done / all : 0, late: late, first: first, last: last };
  }

  // ---------- 05 作業日報・出面 ----------
  function hm(s) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim()); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  // 実働時間＝終了−開始−休憩（日をまたぐ作業も可）。小数第2位で四捨五入、マイナスは0
  function workHours(r) {
    var a = hm(r.start), b = hm(r.end); if (a === null || b === null) return null;
    var mins = b - a; if (mins < 0) mins += 1440;
    return Math.max(0, round(mins / 60 - n0(r.brk) / 60, 2));
  }
  // rows: [{date, person, site, start, end, brk, manual}] → 行ごとの 実働・その日の合計・出勤(最初の行)・区切り超え・人工
  function dailyCalc(rows, limit) {
    var tot = {}, seen = {};
    var hs = rows.map(function (r) { var h = workHours(r); if (h !== null && has(r.date) && has(r.person)) { var k = r.date + '|' + r.person; tot[k] = (tot[k] || 0) + h; } return h; });
    return rows.map(function (r, i) {
      var h = hs[i]; if (h === null || !has(r.date) || !has(r.person)) return { hours: h, total: null, first: false, over: null, ninku: has(r.manual) ? n0(r.manual) : null };
      var k = r.date + '|' + r.person, first = !seen[k]; seen[k] = true;
      var t = tot[k];
      var auto = t > 0 ? h / t : null;
      return { hours: h, total: t, first: first, over: first ? Math.max(0, t - limit) : null, ninku: has(r.manual) ? n0(r.manual) : auto };
    });
  }
  // 月のまとめ（人ごと・現場ごと）
  function dailyMonth(rows, limit, monthN) {
    var res = dailyCalc(rows, limit), a = firstOfMonth(monthN), z = addMonths(monthN, 1);
    var person = {}, site = {};
    rows.forEach(function (r, i) {
      var d = D(r.date); if (d === null || d < a || d >= z) return;
      var x = res[i];
      var p = person[r.person] || (person[r.person] = { days: 0, hours: 0, over: 0, ninku: 0, rows: 0 });
      if (x.first) p.days++;
      p.hours += x.hours || 0; p.over += x.over || 0; p.ninku += x.ninku || 0; p.rows++;
      var s = site[r.site] || (site[r.site] = { ninku: 0, hours: 0, rows: 0 });
      s.ninku += x.ninku || 0; s.hours += x.hours || 0; s.rows++;
    });
    return { person: person, site: site, rows: res };
  }
  // 日報の人工を、名簿の「1人工の単価」で原価（人工）にする：1行ごとに 人工×単価（1円未満四捨五入）
  function laborCosts(rows, limit, rates) {
    var res = dailyCalc(rows, limit);
    return rows.map(function (r, i) {
      var nk = res[i].ninku, rate = rates[r.person];
      return { site: r.site, date: r.date, kind: '人工', qty: nk === null ? '' : nk, price: rate === undefined ? '' : rate, desc: '日報 ' + r.person, fromReport: r.id };
    }).filter(function (c) { return has(c.qty) && has(c.price); });
  }

  // ---------- 06 期限管理 ----------
  function deadlineStatus(d, today, yel, red) {
    var exp = D(d.expiry);
    if (exp === null) return { remain: null, status: (has(d.kind) || has(d.item)) ? '期限なし・未入力' : '', prepStart: null };
    var rem = exp - today, st = rem < 0 ? '期限切れ' : (rem <= red ? '急ぎ' : (rem <= yel ? '注意' : 'OK'));
    return { remain: rem, status: st, prepStart: has(d.prep) ? exp - n0(d.prep) : null };
  }
  function deadlinesSorted(list, today, yel, red) {
    return list.map(function (d, i) { return { d: d, i: i, s: deadlineStatus(d, today, yel, red) }; })
      .filter(function (x) { return x.s.remain !== null; })
      .sort(function (a, b) { return a.s.remain - b.s.remain || a.i - b.i; });
  }

  // ---------- 09 外注支払 ----------
  // partner: { close（締め日 1〜31、31=末日）, month（'当月'|'翌月'|'翌々月'）, pay（支払日） }
  function payDue(billDate, p) {
    var d = D(billDate); if (d === null || !p) return null;
    var o = ymd(d), k = (o.d <= n0(p.close) ? 0 : 1) + (p.month === '当月' ? 0 : (p.month === '翌々月' ? 2 : 1));
    return Math.min(excelDate(o.y, o.m + k, n0(p.pay)), eomonth(d, k));
  }
  function subStatus(o, p, base) {
    var due = has(o.dueOverride) ? D(o.dueOverride) : payDue(o.billDate, p);
    if (!has(o.billAmount)) return { due: due, unpaid: null, status: '', late: null };
    var unpaid = n0(o.billAmount) - n0(o.paid), st;
    if (unpaid <= 0) st = '支払済';
    else if (due !== null && due < base) st = '遅れ';
    else if (n0(o.paid) > 0) st = '一部支払';
    else st = '未払い';
    return { due: due, unpaid: unpaid, status: st, late: st === '遅れ' ? base - due : null, diff: has(o.orderAmount) ? n0(o.billAmount) - n0(o.orderAmount) : null };
  }
  function ruleText(p) { return (n0(p.close) >= 31 ? '末日' : n0(p.close) + '日') + '締め ' + p.month + (n0(p.pay) >= 31 ? '末日' : n0(p.pay) + '日') + '払い'; }

  // ---------- 表示 ----------
  function yen(x) { return (x < 0 ? '-' : '') + '¥' + Math.abs(Math.round(x)).toLocaleString('ja-JP'); }
  function num(x, d) { if (x === null || x === undefined || isNaN(x)) return ''; return round(x, d || 0).toLocaleString('ja-JP', { maximumFractionDigits: d || 0 }); }
  function pct(x, d) { return x === null || x === undefined ? '—' : round(x * 100, d === undefined ? 1 : d).toFixed(d === undefined ? 1 : d) + '%'; }

  var api = {
    HOLIDAYS: HOLIDAYS, HOL_FROM: HOL_FROM, HOL_TO: HOL_TO, WD: WD,
    D: D, iso: iso, ymd: ymd, wday: wday, md: md, mdw: mdw, monthKey: monthKey, firstOfMonth: firstOfMonth, addMonths: addMonths, eomonth: eomonth, todayN: todayN,
    round: round, roundDown: roundDown, roundUp: roundUp, taxRound: taxRound, n0: n0, has: has,
    estimate: estimate, validUntil: validUntil, regNoOk: regNoOk,
    COST_KINDS: COST_KINDS, costAmount: costAmount, siteProfit: siteProfit, profitSummary: profitSummary,
    billStatus: billStatus, billSummary: billSummary, byClient: byClient, billMonthly: billMonthly,
    makeCal: makeCal, holidayName: holidayName, isWork: isWork, endDate: endDate, workdaysBetween: workdaysBetween, taskInfo: taskInfo, siteProgress: siteProgress,
    hm: hm, workHours: workHours, dailyCalc: dailyCalc, dailyMonth: dailyMonth, laborCosts: laborCosts,
    deadlineStatus: deadlineStatus, deadlinesSorted: deadlinesSorted,
    payDue: payDue, subStatus: subStatus, ruleText: ruleText,
    yen: yen, num: num, pct: pct
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KL = api;
})(this);
