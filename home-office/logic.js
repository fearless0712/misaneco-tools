/* Home office business-use calculator: pure functions (browser + node) */
(function (root) {
  var SQFT_PER_M2 = 10.7639;
  // "1,234.50", "$1,234.50", "£99" -> number; '' -> null; invalid or negative -> NaN
  function num(s) {
    if (s === null || s === undefined) return null;
    var t = String(s).replace(/[\s,$£€]/g, '').replace(/%$/, '');
    if (t === '') return null;
    if (!/^\d+(\.\d+)?$|^\.\d+$/.test(t)) return NaN;
    return parseFloat(t);
  }
  // share as a ratio 0..1, or {error}
  function share(part, whole) {
    var p = num(part), w = num(whole);
    if (p === null || w === null) return { error: 'empty' };
    if (isNaN(p) || isNaN(w)) return { error: 'number' };
    if (w === 0) return { error: 'zero' };
    if (p > w) return { error: 'bigger' };
    return { ratio: p / w };
  }
  function pctRatio(s) {
    var p = num(s);
    if (p === null) return { error: 'empty' };
    if (isNaN(p)) return { error: 'number' };
    if (p > 100) return { error: 'over100' };
    return { ratio: p / 100 };
  }
  // money in cents, rounded to the nearest cent
  function cents(x) { return Math.round(x * 100 + 1e-9); }
  // one bill line: monthly amount x ratio -> {monthBiz, yearBiz, monthAmt, yearAmt} in cents
  function line(amount, ratio) {
    var a = num(amount);
    if (a === null) return { state: 'empty' };
    if (isNaN(a)) return { state: 'error', error: 'number' };
    if (ratio === null || ratio === undefined) return { state: 'error', error: 'ratio' };
    var m = cents(a), mb = Math.round(m * ratio + 1e-9);
    return { state: 'ok', monthAmt: m, monthBiz: mb, yearAmt: m * 12, yearBiz: mb * 12 };
  }
  // IRS simplified option: $5 per sq ft, max 300 sq ft. Returns cents.
  function usSimplified(area, unit) {
    var a = num(area);
    if (a === null || isNaN(a)) return null;
    var sqft = unit === 'm2' ? a * SQFT_PER_M2 : a;
    var used = Math.min(sqft, 300);
    return { sqft: sqft, used: used, cents: Math.round(used * 500 + 1e-9) };
  }
  // HMRC flat rate per month by whole hours worked at home (25-50 £10, 51-100 £18, 101+ £26)
  function ukMonth(hours) {
    var h = num(hours);
    if (h === null || isNaN(h)) return null;
    h = Math.floor(h);
    return h >= 101 ? 26 : h >= 51 ? 18 : h >= 25 ? 10 : 0;
  }
  function ukYear(hours, months) {
    var r = ukMonth(hours), m = num(months);
    if (r === null || m === null || isNaN(m) || m < 1 || m > 12 || Math.floor(m) !== m) return null;
    return r * m * 100; // cents
  }
  function money(c, cur) {
    var neg = c < 0; c = Math.abs(c);
    var whole = Math.floor(c / 100), part = String(c % 100);
    if (part.length < 2) part = '0' + part;
    return (neg ? '-' : '') + (cur || '$') + String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + part;
  }
  function fmtPct(r) { return (Math.round(r * 1000) / 10).toFixed(1).replace(/\.0$/, '') + '%'; }
  var API = { num: num, share: share, pctRatio: pctRatio, line: line, usSimplified: usSimplified, ukMonth: ukMonth, ukYear: ukYear, money: money, fmtPct: fmtPct, SQFT_PER_M2: SQFT_PER_M2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.HO = API;
})(this);
