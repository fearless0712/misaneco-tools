/* 車検の日付計算ツールの計算部分（ブラウザ・node 共通） */
(function (root) {
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  // 自動車検査証の有効期間（国土交通省「自動車検査証の有効期間」）。first＝初回、next＝2回目以降（年）
  var KUBUN = [
    { id: 'jikayou', name: '自家用乗用自動車', first: 3, next: 2 },
    { id: 'nirin', name: '二輪自動車（250cc超）', first: 3, next: 2 },
    { id: 'kei', name: '軽自動車（乗用）', first: 3, next: 2 },
    { id: 'keikamotsu', name: '軽自動車（貨物）', first: 2, next: 2 },
    { id: 'kamotsu', name: '貨物自動車（車両総重量8トン未満）', first: 2, next: 1 },
    { id: 'kamotsu8', name: '貨物自動車（車両総重量8トン以上）', first: 1, next: 1 },
    { id: 'none', name: '軽二輪（125cc超〜250cc以下）・原付（車検なし）', none: true }
  ];
  var KMAP = {};
  KUBUN.forEach(function (k) { KMAP[k.id] = k; });
  var NEW_RULE = Date.UTC(2025, 3, 1) / 86400000; // 令和7年4月1日（2か月前から受けられるようになった日）
  var MAX_NOTICE = 365;

  function z2h(s) { return String(s).replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }); }
  function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  // "2026-10-09" "2026/10/9" → 通し番号（1970-01-01 が 0）。存在しない日付は null
  function parseDate(s) {
    var m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/.exec(z2h(String(s || '')).trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (y < 1900 || mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null;
    return Date.UTC(y, mo - 1, d) / 86400000;
  }
  function ymd(n) { var t = new Date(n * 86400000); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
  function iso(n) { var o = ymd(n); return o.y + '-' + (o.m < 10 ? '0' : '') + o.m + '-' + (o.d < 10 ? '0' : '') + o.d; }
  function wday(n) { return ((n % 7) + 7 + 4) % 7; } // 1970-01-01 は木曜（4）
  function wareki(n) { var o = ymd(n); return o.y >= 2019 ? '令和' + (o.y === 2019 ? '元' : o.y - 2018) + '年' : ''; }
  function fmt(n) { var o = ymd(n); return o.y + '年' + o.m + '月' + o.d + '日（' + WD[wday(n)] + '）'; }

  // 同じ日の k か月後（k が負なら前）。その日がない月は月末にする
  function addMonths(n, k) {
    var o = ymd(n), t = o.y * 12 + (o.m - 1) + k, y = Math.floor(t / 12), m = t - y * 12 + 1;
    return Date.UTC(y, m - 1, Math.min(o.d, daysIn(y, m))) / 86400000;
  }
  // 満了日の2か月前の同じ日（その日がない月は月末）
  function twoMonthsBefore(n) { return addMonths(n, -2); }
  function addYears(n, k) { return addMonths(n, 12 * k); }

  // 日数 "60" "６０日" → 60。空は null、整数でない・文字は NaN
  function num(s) {
    if (s === null || s === undefined) return null;
    var t = z2h(s).replace(/[\s,，]/g, '').replace(/日(前)?$/, '').replace(/^[−ー－]/, '-');
    if (t === '') return null;
    if (!/^-?\d+$/.test(t)) return NaN;
    return parseInt(t, 10);
  }

  // o = { expiry, kubun, kaisu: 'first'|'later', base, n1, n2 }
  function calc(o) {
    var k = KMAP[o.kubun] || KMAP.jikayou;
    if (k.none) return { state: 'none', kubun: k };
    var ex = parseDate(o.expiry);
    if (!String(o.expiry || '').trim()) return { state: 'empty', kubun: k };
    if (ex === null) return { state: 'error', kubun: k, error: '満了日が正しい日付ではありません。例：2026-05-15' };
    var base = String(o.base || '').trim() ? parseDate(o.base) : null;
    if (base === null) return { state: 'error', kubun: k, error: '基準日（今日）が正しい日付ではありません。' };
    var n1 = num(o.n1), n2 = num(o.n2);
    if (n1 === null) n1 = 60;
    if (n2 === null) n2 = 30;
    if (Number.isNaN(n1) || Number.isNaN(n2) || n1 < 0 || n2 < 0 || n1 > MAX_NOTICE || n2 > MAX_NOTICE) {
      return { state: 'error', kubun: k, error: 'お店の案内の日数は 0〜' + MAX_NOTICE + ' の整数で入れてください。' };
    }
    var first = twoMonthsBefore(ex), left = ex - base, warn = [];
    if (first < NEW_RULE) warn.push('令和7年（2025年）3月31日までは、残りの期間を失わずに受けられるのは満了日の1か月前からでした（離島に使用の本拠の位置がある自動車を除く）。この日付は今の制度で数えています。');
    var phase;
    if (left < 0) phase = 'over';
    else if (base >= first) phase = 'in';
    else phase = 'before';
    return {
      state: 'ok', kubun: k, kaisu: o.kaisu === 'first' ? 'first' : 'later',
      expiry: ex, base: base, first: first, left: left, phase: phase,
      n1: n1, n2: n2, notice1: ex - n1, notice2: ex - n2,
      curYears: o.kaisu === 'first' ? k.first : k.next, nextYears: k.next, nextExpiry: addYears(ex, k.next), warn: warn
    };
  }

  var PHASE = {
    before: 'まだ受けられる期間の前です（目安）',
    'in': '残りの期間を失わずに受けられる期間です（目安）',
    over: '満了日を過ぎています'
  };
  function leftText(r) { return r.left < 0 ? Math.abs(r.left) + '日過ぎています' : r.left === 0 ? '今日が満了日です' : 'あと' + r.left + '日'; }

  // 結果をコピーするときの文
  function text(r) {
    if (r.state === 'none') return '【車検の日付計算】\n区分：' + r.kubun.name + '\n車検はありません（点検の時期は別です）';
    if (r.state !== 'ok') return '';
    var L = ['【車検の日付計算】', '区分：' + r.kubun.name + '（' + (r.kaisu === 'first' ? '新車から初めての車検' : '2回目以降の車検') + '）',
      '満了日：' + fmt(r.expiry),
      '受けられる最初の日の目安：' + fmt(r.first) + '（満了日の2か月前）',
      '満了日まで：' + leftText(r) + '（基準日 ' + fmt(r.base) + '）',
      'お店の案内の目安：1回目 ' + fmt(r.notice1) + '（' + r.n1 + '日前）／2回目 ' + fmt(r.notice2) + '（' + r.n2 + '日前）',
      '次の満了日の目安：' + fmt(r.nextExpiry) + '（有効期間 ' + r.nextYears + '年）',
      '※目安です。受けられる日の正確な扱いは運輸支局で、次の満了日は新しい車検証の記録で確認してください。'];
    r.warn.forEach(function (w) { L.push('※' + w); });
    return L.join('\n');
  }

  var API = { WD: WD, KUBUN: KUBUN, KMAP: KMAP, NEW_RULE: NEW_RULE, PHASE: PHASE, parseDate: parseDate, iso: iso, ymd: ymd, wday: wday,
    wareki: wareki, fmt: fmt, addMonths: addMonths, twoMonthsBefore: twoMonthsBefore, addYears: addYears, num: num, calc: calc,
    leftText: leftText, text: text };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SHAKEN = API;
})(this);
