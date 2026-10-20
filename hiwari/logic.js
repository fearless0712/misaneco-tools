/* 日割り計算ツールの計算部分（ブラウザ・node 共通） */
(function (root) {
  // "85,000円" "８５０００" → 85000。空は null、数字でない・マイナスは NaN
  function num(s) {
    if (s === null || s === undefined) return null;
    var t = String(s).replace(/[０-９．]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[\s,，円¥￥]/g, '');
    if (t === '') return null;
    if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
    return parseFloat(t);
  }
  // "2026-10-21" → {y,m,d}（存在しない日付は null）
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null;
    return { y: y, m: mo, d: d };
  }
  function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function serial(o) { return Date.UTC(o.y, o.m - 1, o.d) / 86400000; }
  // 端数処理：floor 切り捨て / round 四捨五入 / ceil 切り上げ（1円未満）
  // 金額×日数÷分母 を、分数のまま計算してから丸める（小数の誤差を出さない）
  function prorate(amount, days, base, mode) {
    var a = Math.round(amount * 100); // 銭単位の整数にしてから計算
    var n = a * days, d = base * 100; // 円 = n / d
    var q = Math.floor(n / d), r = n - q * d;
    if (mode === 'ceil') return r > 0 ? q + 1 : q;
    if (mode === 'round') return r * 2 >= d ? q + 1 : q;
    return q;
  }
  /*
   * from〜to（どちらの日も含む）を月ごとに分けて日割りする。
   * basis: 'cal'（その月の日数）/ '30'（1か月30日）
   * 丸ごと1か月の月は月額そのまま。
   */
  function calc(o) {
    var amt = num(o.amount);
    if (amt === null) return { state: 'empty' };
    if (isNaN(amt)) return { state: 'error', error: '金額は数字で入れてください（マイナスは使えません）。' };
    var f = parseDate(o.from), t = parseDate(o.to);
    if (!f || !t) return { state: 'error', error: '日付を正しく入れてください。' };
    if (serial(t) < serial(f)) return { state: 'error', error: '終わりの日が、始まりの日より前になっています。' };
    var mode = o.mode === 'round' || o.mode === 'ceil' ? o.mode : 'floor';
    var basis = o.basis === '30' ? '30' : 'cal';
    if (serial(t) - serial(f) > 366 * 3) return { state: 'error', error: '期間は3年までにしてください。' };
    var rows = [], total = 0, y = f.y, m = f.m;
    while (y < t.y || (y === t.y && m <= t.m)) {
      var dim = daysIn(y, m);
      var s = (y === f.y && m === f.m) ? f.d : 1;
      var e = (y === t.y && m === t.m) ? t.d : dim;
      var days = e - s + 1, full = s === 1 && e === dim;
      var base = basis === '30' ? 30 : dim;
      var use = basis === '30' ? Math.min(days, 30) : days;
      var yen = full ? Math.round(amt) : prorate(amt, use, base, mode);
      if (!full && yen > Math.round(amt)) yen = Math.round(amt);
      rows.push({ y: y, m: m, from: s, to: e, days: days, dim: dim, base: base, use: use, full: full, yen: yen });
      total += yen;
      m++; if (m > 12) { m = 1; y++; }
    }
    return { state: 'ok', rows: rows, total: total, days: serial(t) - serial(f) + 1, mode: mode, basis: basis, amount: amt };
  }
  function yen(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '円'; }
  var API = { num: num, parseDate: parseDate, daysIn: daysIn, prorate: prorate, calc: calc, yen: yen };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.HIWARI = API;
})(this);
