/* Prorated rent calculator logic (browser + node) */
(function (root) {
  // "$1,850.50" -> 1850.5 ; empty -> null ; invalid or negative -> NaN
  function num(s) {
    if (s === null || s === undefined) return null;
    var t = String(s).replace(/[\s,$£€]/g, '');
    if (t === '') return null;
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
    return parseFloat(t);
  }
  function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null;
    return { y: y, m: mo, d: d };
  }
  function serial(o) { return Date.UTC(o.y, o.m - 1, o.d) / 86400000; }
  // cents * days / base, rounded to a whole cent with integer math (no float drift)
  function prorate(cents, days, base, mode) {
    var n = cents * days, q = Math.floor(n / base), r = n - q * base;
    if (mode === 'up') return r > 0 ? q + 1 : q;
    if (mode === 'down') return q;
    return r * 2 >= base ? q + 1 : q; // nearest cent, half up
  }
  var BASES = { month: 'Days in that month', '30': '30-day month', year: '365-day year (rent × 12 ÷ 365)' };
  /*
   * Split from..to (both days included) by calendar month and prorate each part.
   * basis: 'month' | '30' | 'year'. A full calendar month is charged the full rent.
   */
  function calc(o) {
    var amt = num(o.amount);
    if (amt === null) return { state: 'empty' };
    if (isNaN(amt)) return { state: 'error', error: 'Enter the monthly rent as a number (up to 2 decimals, no minus sign).' };
    var f = parseDate(o.from), t = parseDate(o.to);
    if (!f || !t) return { state: 'error', error: 'Enter valid dates.' };
    if (serial(t) < serial(f)) return { state: 'error', error: 'The end date is before the start date.' };
    if (serial(t) - serial(f) > 366 * 3) return { state: 'error', error: 'Keep the period to 3 years or less.' };
    var mode = o.mode === 'up' || o.mode === 'down' ? o.mode : 'nearest';
    var basis = BASES[o.basis] ? o.basis : 'month';
    var cents = Math.round(amt * 100), rows = [], total = 0, y = f.y, m = f.m;
    while (y < t.y || (y === t.y && m <= t.m)) {
      var dim = daysIn(y, m);
      var s = (y === f.y && m === f.m) ? f.d : 1;
      var e = (y === t.y && m === t.m) ? t.d : dim;
      var days = e - s + 1, full = s === 1 && e === dim, c, base, use;
      if (basis === 'year') { base = 365; use = days; c = full ? cents : prorate(cents * 12, days, 365, mode); }
      else { base = basis === '30' ? 30 : dim; use = basis === '30' ? Math.min(days, 30) : days; c = full ? cents : prorate(cents, use, base, mode); }
      if (c > cents) c = cents;
      rows.push({ y: y, m: m, from: s, to: e, days: days, dim: dim, base: base, use: use, full: full, cents: c });
      total += c;
      m++; if (m > 12) { m = 1; y++; }
    }
    return { state: 'ok', rows: rows, total: total, days: serial(t) - serial(f) + 1, mode: mode, basis: basis, cents: cents };
  }
  function money(c) {
    var s = String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return '$' + s + '.' + String(c % 100).padStart(2, '0');
  }
  var API = { num: num, parseDate: parseDate, daysIn: daysIn, prorate: prorate, calc: calc, money: money, BASES: BASES };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.PRORATE = API;
})(this);
