/* 不動産スタジオの計算部分（ブラウザ・node 共通）
   ルールは不動産のExcel版・ブラウザ版と同じにしてある：
     反響・追客       … A_反響追客管理（今日やること・連絡もれ・反響元別/担当別の来店率・成約率）
     媒介の期限       … K_登録期限計算（レインズ登録：契約日の翌日から休業日を除いて 専任7日目・専属専任5日目／有効期間の満了：民法140条・141条・143条、ふつうは契約日の翌日から起算）
                        I_媒介期限報酬（確認の列：登録・業務報告〈最後の報告日＋14日／＋7日〉・取引状況の反映・満了が近い）
     報酬の上限       … I_媒介期限報酬・G_契約書（報酬告示：200万円以下5%・400万円以下4%・超える部分3%、低廉な空家等の特例30万円）
     賃貸の更新       … D_更新期限管理（更新案内の時期・定期借家の通知期間〈借地借家法38条6項：満了の1年前〜6か月前〉・保険・保証会社）
     収支             … B_収支シミュレーター（元利均等・NOI・DSCR・損益分岐の入居率・35年の推移・売却）
   日付は「1970-01-01 を 0 とする通し番号（日）」で扱い、保存は "2026-10-22" の文字列。 */
(function (root) {
  'use strict';
  var WD = ['日', '月', '火', '水', '木', '金', '土'];

  // ---------- 日付 ----------
  function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); } // m: 1-12
  function D(s) {
    if (s === null || s === undefined || s === '') return null;
    if (typeof s === 'number') return s;
    var m = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/.exec(String(s).trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null;
    return Date.UTC(y, mo - 1, d) / 86400000;
  }
  function ymd(n) { var t = new Date(n * 86400000); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
  function pad(x) { return (x < 10 ? '0' : '') + x; }
  function iso(n) { if (n === null || n === undefined || n === '') return ''; var o = ymd(n); return o.y + '-' + pad(o.m) + '-' + pad(o.d); }
  function slash(n) { return n === null || n === undefined || n === '' ? '' : iso(n).replace(/-/g, '/'); }
  function jd(n) { if (n === null || n === undefined || n === '') return ''; var o = ymd(n); return o.y + '年' + o.m + '月' + o.d + '日'; }
  function wday(n) { return ((n % 7) + 7 + 4) % 7; } // 0=日
  function md(n) { var o = ymd(n); return o.m + '/' + o.d; }
  function mdw(n) { return md(n) + '(' + WD[wday(n)] + ')'; }
  function ym(n) { var o = ymd(n); return o.y + '-' + pad(o.m); }
  function firstOfMonth(n) { var o = ymd(n); return Date.UTC(o.y, o.m - 1, 1) / 86400000; }
  function addMonths(n, k) { var o = ymd(n); return Date.UTC(o.y, o.m - 1 + k, 1) / 86400000; } // k か月後の1日
  // Excel の EDATE：k か月後の同じ日（その月にない日は月末）
  function edate(n, k) {
    var o = ymd(n), y = o.y, m = o.m - 1 + k; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return Date.UTC(y, m, Math.min(o.d, daysIn(y, m + 1))) / 86400000;
  }
  // 民法143条：月で定めた期間は、起算日の応当日の前日に満了。応当日がないときはその月の末日
  function monthsEnd(start, k) {
    var o = ymd(start), y = o.y, m = o.m - 1 + k; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    if (o.d <= daysIn(y, m + 1)) return Date.UTC(y, m, o.d) / 86400000 - 1;
    return Date.UTC(y, m, daysIn(y, m + 1)) / 86400000;
  }
  function todayN(now) { var t = now || new Date(); return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 86400000; }

  // ---------- 数・表示 ----------
  function clean(x) { return Number(Number(x).toPrecision(15)); }
  function n0(v) { var x = typeof v === 'number' ? v : parseFloat(String(v === undefined || v === null ? '' : v).replace(/[,，\s¥円%％]/g, '')); return isFinite(x) ? x : 0; }
  function has(v) { return v !== null && v !== undefined && String(v).trim() !== ''; }
  function num(x, d) { if (x === null || x === undefined || !isFinite(x)) return '—'; var k = Math.pow(10, d || 0); var v = Math.round(clean(Math.abs(x) * k)) / k; return (x < 0 && v ? '-' : '') + v.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function yen(x) { return x === null || x === undefined || !isFinite(x) ? '—' : (x < 0 ? '−¥' : '¥') + num(Math.abs(x)); }
  function pct(x, d) { return x === null || x === undefined || !isFinite(x) ? '—' : num(x * 100, d === undefined ? 1 : d) + '%'; }

  // ---------- 祝日（内閣府「国民の祝日について」2026年・2027年。振替休日・国民の休日を含む） ----------
  var HOLIDAYS = { '2026-01-01': '元日', '2026-01-12': '成人の日', '2026-02-11': '建国記念の日', '2026-02-23': '天皇誕生日', '2026-03-20': '春分の日', '2026-04-29': '昭和の日', '2026-05-03': '憲法記念日', '2026-05-04': 'みどりの日', '2026-05-05': 'こどもの日', '2026-05-06': '休日', '2026-07-20': '海の日', '2026-08-11': '山の日', '2026-09-21': '敬老の日', '2026-09-22': '休日', '2026-09-23': '秋分の日', '2026-10-12': 'スポーツの日', '2026-11-03': '文化の日', '2026-11-23': '勤労感謝の日', '2027-01-01': '元日', '2027-01-11': '成人の日', '2027-02-11': '建国記念の日', '2027-02-23': '天皇誕生日', '2027-03-21': '春分の日', '2027-03-22': '休日', '2027-04-29': '昭和の日', '2027-05-03': '憲法記念日', '2027-05-04': 'みどりの日', '2027-05-05': 'こどもの日', '2027-07-19': '海の日', '2027-08-11': '山の日', '2027-09-20': '敬老の日', '2027-09-23': '秋分の日', '2027-10-11': 'スポーツの日', '2027-11-03': '文化の日', '2027-11-23': '勤労感謝の日' };
  var HOL_YEARS = [2026, 2027];
  // お店の休業日：off＝定休日の曜日（0=日…6=土）、holidays＝祝日を休む、extra＝ほかの休業日（"2026-12-29" など）
  function makeCal(o) { o = o || {}; var ex = {}; (o.extra || []).forEach(function (s) { var n = D(s); if (n !== null) ex[iso(n)] = 1; }); return { off: (o.off || []).map(Number), holidays: o.holidays !== false, extra: ex }; }
  function offReason(n, cal) {
    if (cal.off.indexOf(wday(n)) >= 0) return WD[wday(n)] + '曜（定休日）';
    var s = iso(n);
    if (cal.holidays && HOLIDAYS[s]) return HOLIDAYS[s];
    if (cal.extra[s]) return '休業日';
    return '';
  }
  function parseDates(text) { return String(text || '').split(/[\s,、，]+/).map(function (x) { return D(x); }).filter(function (n) { return n !== null; }).map(iso); }

  // ---------- 媒介契約 ----------
  var KIND = { '専属専任': { reg: 5, rep: 7, repName: '1週間に1回以上' }, '専任': { reg: 7, rep: 14, repName: '2週間に1回以上' }, '一般': { reg: 0, rep: 0, repName: '定めなし' } };
  function isSen(kind) { return kind === '専任' || kind === '専属専任'; }
  // レインズ登録の期限：契約日の翌日から、休業日を除いて数えて 専属専任5日目・専任7日目（宅建業法施行規則15条の10、民法140条）
  function reinsDeadline(kind, date, cal) {
    var k = KIND[kind], d0 = D(date), count = [];
    if (!k || !k.reg || d0 === null) return { deadline: null, count: count };
    if (cal.off.length >= 7) return { deadline: null, count: count };
    var c = d0, g = 0;
    while (count.length < k.reg && g++ < 400) { c += 1; if (!offReason(c, cal)) count.push(c); }
    return { deadline: count[count.length - 1], count: count };
  }
  // 有効期間の満了日（上限3か月・宅建業法34条の2第3項）
  //   ふつうは民法140条本文（初日不算入）で契約日の翌日から起算し、143条で3か月後の応当日の前日（応当日がなければその月の末日）、141条でその日の終わりに満了。
  //   例：1/15締結 → 1/16起算 → 4/15満了、11/30締結 → 12/1起算 → 2/28満了（うるう年は2/29）。
  //   startNext === false は「契約日の午前0時から始まる」と契約で定めたとき（140条ただし書）で、契約日から起算（1/15 → 4/14）。
  function baikaiExpiry(date, startNext) { var d0 = D(date); if (d0 === null) return null; return monthsEnd(startNext === false ? d0 : d0 + 1, 3); }
  // 定期借家の終了通知の期間（借地借家法38条6項：期間1年以上なら、満了の1年前から6月前までに通知）
  //   締切＝満了日の6か月前の応当日、始まり＝1年前の応当日（応当日がない月は末日）。例：2027/8/31満了 → 2026/8/31〜2027/2/28
  function teikiNotice(end) { var e = D(end); if (e === null) return null; return { start: edate(e, -12), end: edate(e, -6) }; }
  // 業務報告の日程（K：契約日から7日・14日ごと、満了日まで。休業日なら前の営業日を目安に）
  function reportSchedule(kind, date, expiry, cal) {
    var k = KIND[kind], d0 = D(date), ex = D(expiry), out = [];
    if (!k || !k.rep || d0 === null || ex === null) return out;
    for (var i = 1; i < 30; i++) {
      var due = d0 + k.rep * i; if (due > ex) break;
      out.push({ n: i, due: due, advance: advanceOf(due, d0, cal) });
    }
    return out;
  }
  function advanceOf(due, floor, cal) { var a = due, g = 0; while (offReason(a, cal) && a > floor && g++ < 60) a -= 1; return (a <= floor || a === due) ? null : a; }
  // 媒介1件の確認（I の「確認」の列と同じ文言・同じ順）
  function baikaiCheck(m, T, cal, opt) {
    opt = opt || {};
    var d0 = D(m.date), r = { expiry: null, limit: null, remain: null, reg: null, regCount: [], nextRep: null, repAdvance: null, msgs: [], text: '' };
    if (d0 === null) return r;
    var sen = isSen(m.kind), limit = baikaiExpiry(m.date, opt.startNext), E = D(m.end);
    r.limit = limit; r.expiry = E !== null ? E : limit; r.remain = r.expiry - T;
    if (sen) { var rg = reinsDeadline(m.kind, m.date, cal); r.reg = rg.deadline; r.regCount = rg.count; }
    if (sen) { var last = D(m.lastReport); r.nextRep = (last !== null ? last : d0) + KIND[m.kind].rep; r.repAdvance = advanceOf(r.nextRep, last !== null ? last : d0, cal); }
    var M = [];
    function add(t, lvl) { M.push({ t: t, lvl: lvl }); }
    if (sen && E !== null && E > limit) add('有効期間が3か月を超えています（業法34条の2）', 'bad');
    if (m.kind === '一般' && E !== null && E > limit) add('一般でも標準約款は3か月以内', 'warn');
    var reins = D(m.reins);
    if (sen && reins === null && r.reg !== null) { if (T > r.reg) add('レインズ登録の期限を過ぎています', 'bad'); else add('レインズ登録（期限 ' + md(r.reg) + '）', 'warn'); }
    if (sen && reins !== null && r.reg !== null && reins > r.reg) add('登録が期限より遅れました', 'bad');
    if (sen && T >= r.nextRep - 2) { if (T > r.nextRep) add('業務報告の期限を過ぎています', 'bad'); else add('業務報告（期限 ' + md(r.nextRep) + '）', 'warn'); }
    var chg = D(m.statusDate), refl = D(m.reflect);
    if (sen && chg !== null && (refl === null || refl < chg)) add('取引状況をレインズに反映してください', 'warn');
    if (m.closed) M = [];
    else if (r.remain < 0) add('有効期間が終わっています（更新は依頼者の申出が必要）', 'bad');
    else if (r.remain <= 14) add('満了が近い（' + r.remain + '日）', 'warn');
    r.msgs = M; r.text = M.map(function (x) { return x.t; }).join('／');
    return r;
  }

  // ---------- 報酬の上限（報酬告示 第二・第四・第七） ----------
  // 売買・交換の媒介：依頼者の一方から受けられる額（税抜）。代金は税抜
  function feeNormal(price) { var p = Math.max(0, Math.floor(n0(price))); return Math.floor((Math.min(p, 2e6) * 5 + Math.max(0, Math.min(p, 4e6) - 2e6) * 4 + Math.max(0, p - 4e6) * 3) / 100); }
  function feeSale(price, akiya, taxRate) {
    var p = n0(price), t = taxRate === undefined ? 0.1 : taxRate, nrm = feeNormal(p), sp = akiya && p <= 8e6 ? Math.max(nrm, 300000) : null, cap = sp !== null ? sp : nrm;
    return { normal: nrm, special: sp, cap: cap, tax: Math.floor(clean(cap * t)), capTax: Math.floor(clean(cap * (1 + t))), quick: p > 4e6 ? Math.floor(p * 0.03) + 60000 : null };
  }
  // 貸借の媒介：双方から合計で借賃の1か月分×1.1以内。居住用は承諾がなければ一方から0.55か月分まで
  function feeRent(rent, residential, consent, taxRate) {
    var r = n0(rent), t = taxRate === undefined ? 0.1 : taxRate, total = Math.floor(clean(r * (1 + t))), one = residential && !consent ? Math.floor(clean(r * (1 + t) / 2)) : total;
    return { total: total, onePerSide: one };
  }
  // 取引1件の報酬（税込）の上限
  function dealFeeCap(d, taxRate) {
    if (d.kind === '賃貸') { var fr = feeRent(d.rent, d.residential !== false, !!d.consent, taxRate); return d.side === '両手' ? fr.total : fr.onePerSide; }
    var fs = feeSale(d.price, !!d.akiya, taxRate); return d.side === '両手' ? fs.capTax * 2 : fs.capTax;
  }
  function dealFee(d, taxRate) { return has(d.fee) ? n0(d.fee) : dealFeeCap(d, taxRate); }

  // ---------- 反響・追客（A） ----------
  var LEAD_OPEN = ['新規', '追客中', '来店予約', '来店済み', '保留'];
  var LEAD_ST = ['新規', '追客中', '来店予約', '来店済み', '申込', '契約', '失注', '保留'];
  function leadTask(l, T, gap) {
    var a = D(l.date); if (a === null) return { text: '', lvl: '', days: null };
    var r = { days: T - a, first: has(l.first) ? D(l.first) - a : null, since: has(l.last) ? T - D(l.last) : null, text: '', lvl: '' };
    if (LEAD_OPEN.indexOf(l.status) < 0) return r;
    var nx = D(l.next), ls = D(l.last);
    if (!has(l.first)) r.text = 'まだ初回連絡していません（反響から' + (T - a) + '日）';
    else if (nx !== null && nx <= T) r.text = '連絡の予定日です' + (nx < T ? '（' + (T - nx) + '日過ぎ）' : '');
    else if (ls !== null && T - ls >= gap) r.text = '連絡もれ（最後の連絡から' + (T - ls) + '日）';
    else if (nx === null) r.text = '次の連絡予定日を入れてください';
    return r;
  }
  function leadLevel(l, t, firstGoal) {
    if (!t.text) return '';
    if (/連絡もれ|日過ぎ/.test(t.text) || (/初回/.test(t.text) && t.days > firstGoal)) return 'bad';
    return 'warn';
  }
  function visited(st) { return st === '来店済み' || st === '申込' || st === '契約'; }
  function leadStats(leads, key, names) {
    return names.map(function (nm) {
      var L = leads.filter(function (l) { return l[key] === nm; }), n = L.length, v = L.filter(function (l) { return visited(l.status); }).length, c = L.filter(function (l) { return l.status === '契約'; });
      return { name: nm, n: n, visit: v, won: c.length, visitRate: n ? v / n : 0, winRate: n ? c.length / n : 0, amount: c.reduce(function (s, l) { return s + n0(l.amount); }, 0) };
    });
  }

  // ---------- 賃貸の更新（D） ----------
  function leaseCalc(l, T, cfg) {
    var s = D(l.start), mo = n0(l.months), r = { end: null, remain: null, notice: null, fStart: null, fEnd: null, ins: null, guar: null, main: '', text: '', lvl: '' };
    if (s === null || !mo) return r;
    var mon = cfg && cfg.renewMonths !== undefined ? cfg.renewMonths : 3, soon = cfg && cfg.soon !== undefined ? cfg.soon : 90;
    r.end = monthsEnd(s, mo); r.remain = r.end - T; // 賃貸借は開始日の午前0時から始まるので開始日から起算（民法140条ただし書・143条）
    var teiki = l.type === '定期借家';
    if (!teiki) r.notice = edate(r.end, -mon);
    if (teiki && mo >= 12) { var tn = teikiNotice(r.end); r.fStart = tn.start; r.fEnd = tn.end; }
    if (has(l.insurance)) r.ins = D(l.insurance) - T;
    if (has(l.guarantor)) r.guar = D(l.guarantor) - T;
    var t;
    if (r.remain < 0) t = '満了日を過ぎています（更新・退去の状況を確認）';
    else if (teiki) {
      if (mo < 12) t = '期間1年未満の定期借家';
      else if (T > r.fEnd) t = '通知の締切を過ぎています（要確認）';
      else if (T >= r.fStart) t = '終了の通知を出す期間です（締切 ' + md(r.fEnd) + '）';
      else if (r.fStart - T <= 60) t = 'もうすぐ通知の期間に入ります';
      else if (r.remain <= soon) t = '満了が近い';
      else t = '';
    } else t = T >= r.notice ? '更新の案内を出す時期です' : (r.remain <= soon ? '満了が近い' : '');
    if (l.done) t = '';
    r.main = t;
    var parts = []; if (t) parts.push(t);
    if (r.ins !== null && r.ins <= soon) parts.push('火災保険の更新');
    if (r.guar !== null && r.guar <= soon) parts.push('保証会社の更新');
    r.text = parts.join('／');
    r.lvl = !r.text ? '' : ((r.remain < 0 || /過ぎています/.test(r.text)) ? 'bad' : 'warn');
    return r;
  }

  // ---------- 収支シミュレーション（B） ----------
  function pmt(rate, term, loan) { var i = rate / 12, N = term * 12; return rate === 0 ? loan / N : loan * i / (1 - Math.pow(1 + i, -N)); }
  function balance(rate, term, loan, pay, m) { var i = rate / 12, N = term * 12; if (m >= N) return 0; return rate === 0 ? loan - loan / N * m : loan * Math.pow(1 + i, m) - pay * (Math.pow(1 + i, m) - 1) / i; }
  function sim(x) {
    var v = {}; ['price', 'cost', 'equity', 'rate', 'term', 'rent', 'vac', 'drop', 'kanri', 'itaku', 'tax', 'ins', 'repair', 'other', 'sellyr', 'sellcap', 'sellcost', 'srate', 'svac'].forEach(function (k) { v[k] = n0(x[k]); });
    var loan = v.price + v.cost - v.equity, pay = pmt(v.rate, v.term, loan), N = v.term * 12;
    var inc = v.rent * 12 * (1 - v.vac), opex = v.kanri * 12 + inc * v.itaku + v.tax + v.ins + v.repair + v.other, noi = inc - opex, payY = pay * 12;
    var r = { loan: loan, gross: v.price ? v.rent * 12 / v.price : 0, income: inc, opex: opex, noi: noi, pay: pay, payY: payY, cf: noi - payY };
    r.net = (v.price + v.cost) ? noi / (v.price + v.cost) : 0; r.cfM = r.cf / 12; r.coc = v.equity ? r.cf / v.equity : 0; r.dscr = payY ? noi / payY : 0;
    var den = v.rent * 12 * (1 - v.itaku); r.be = den ? (v.kanri * 12 + v.tax + v.ins + v.repair + v.other + payY) / den : 0;
    var sr = v.rate + v.srate; r.sPayY = (sr === 0 ? loan / N : loan * (sr / 12) / (1 - Math.pow(1 + sr / 12, -N))) * 12;
    r.sNoi = v.rent * 12 * (1 - Math.min(1, v.vac + v.svac)) * (1 - v.itaku) - (v.kanri * 12 + v.tax + v.ins + v.repair + v.other);
    r.sCf = r.sNoi - r.sPayY;
    var Y = [], prev = loan, cum = 0;
    for (var k = 1; k <= 35; k++) {
      var full = v.rent * 12 * Math.pow(1 - v.drop, k - 1), ic = full * (1 - v.vac), op = v.kanri * 12 + ic * v.itaku + v.tax + v.ins + v.repair + v.other, n = ic - op;
      var bal = balance(v.rate, v.term, loan, pay, k * 12), prin = prev - bal, py = Math.max(0, Math.min(12, N - (k - 1) * 12)) * pay, cf = n - py; cum += cf;
      Y.push({ y: k, full: full, income: ic, opex: op, noi: n, pay: py, interest: py - prin, principal: prin, balance: bal, cf: cf, cum: cum }); prev = bal;
    }
    r.years = Y;
    var sy = Y[Math.max(1, Math.min(35, Math.round(v.sellyr))) - 1];
    r.sellPrice = v.sellcap ? sy.full / v.sellcap : 0; r.sellBal = sy.balance; r.sellNet = r.sellPrice * (1 - v.sellcost) - r.sellBal; r.cumCf = sy.cum; r.total = r.sellNet + r.cumCf - v.equity;
    return r;
  }

  // ---------- 物件調査 ----------
  function surveyProgress(prop, items) {
    var t = prop.type === '土地' ? 'L' : prop.type === '戸建' ? 'H' : 'M', list = [], done = 0, warn = 0, na = 0;
    items.forEach(function (it, i) { if (it[4].indexOf(t) < 0) return; var s = (prop.survey || {})[i]; list.push(i); if (s && s.st) { done++; if (s.st === '要注意') warn++; if (s.st === '対象外') na++; } });
    return { list: list, total: list.length, done: done, warn: warn, na: na, rate: list.length ? done / list.length : 0 };
  }

  var api = {
    WD: WD, HOLIDAYS: HOLIDAYS, HOL_YEARS: HOL_YEARS, KIND: KIND, LEAD_ST: LEAD_ST, LEAD_OPEN: LEAD_OPEN,
    D: D, iso: iso, slash: slash, jd: jd, ymd: ymd, wday: wday, md: md, mdw: mdw, ym: ym, firstOfMonth: firstOfMonth, addMonths: addMonths, edate: edate, monthsEnd: monthsEnd, todayN: todayN, daysIn: daysIn,
    n0: n0, has: has, num: num, yen: yen, pct: pct, clean: clean,
    makeCal: makeCal, offReason: offReason, parseDates: parseDates,
    isSen: isSen, reinsDeadline: reinsDeadline, baikaiExpiry: baikaiExpiry, teikiNotice: teikiNotice, reportSchedule: reportSchedule, baikaiCheck: baikaiCheck,
    feeNormal: feeNormal, feeSale: feeSale, feeRent: feeRent, dealFeeCap: dealFeeCap, dealFee: dealFee,
    leadTask: leadTask, leadLevel: leadLevel, leadStats: leadStats, visited: visited,
    leaseCalc: leaseCalc, pmt: pmt, sim: sim, surveyProgress: surveyProgress
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FL = api;
})(this);
