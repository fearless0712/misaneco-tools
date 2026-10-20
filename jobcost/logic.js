/* Job profit: pure functions, no DOM. Works in browser (window.JOB) and Node (module.exports). */
(function (root) {
  function r2(x) { return Math.round((x + (x < 0 ? -1 : 1) * 1e-9) * 100) / 100; }
  /* round up to the cent so the price never falls below the target margin */
  function up2(x) { return Math.ceil(x * 100 - 1e-6) / 100; }
  function r1(x) { return Math.round((x + (x < 0 ? -1 : 1) * 1e-9) * 10) / 10; }
  /* Parse a user field: blank -> 0 (or null if allowBlank), invalid/negative -> error string. */
  function num(v, name, allowBlank) {
    if (v === undefined || v === null || String(v).trim() === '') return allowBlank ? null : 0;
    var s = String(v).replace(/[,\s]/g, '');
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) throw new Error(name + ' must be a number.');
    var n = Number(s);
    if (!isFinite(n)) throw new Error(name + ' must be a number.');
    if (n < 0) throw new Error(name + ' cannot be negative.');
    return n;
  }
  /* in: {price, materials, hours, rate, subcontract, other, target} (strings or numbers; target in %) */
  function calc(i) {
    try {
      var price = num(i.price, 'Quoted price'), mat = num(i.materials, 'Materials'),
        hrs = num(i.hours, 'Labour hours'), rate = num(i.rate, 'Hourly labour cost'),
        sub = num(i.subcontract, 'Subcontract'), oth = num(i.other, 'Other costs'),
        target = num(i.target, 'Target margin', true);
    } catch (e) { return { error: e.message }; }
    if (target !== null && target >= 100) return { error: 'Target margin must be below 100%.' };
    var labour = hrs * rate, costRaw = mat + labour + sub + oth, profitRaw = price - costRaw;
    var res = {
      labour: r2(labour), cost: r2(costRaw), profit: r2(profitRaw),
      margin: price > 0 ? r1(profitRaw / price * 100) : null,
      markup: costRaw > 0 ? r1(profitRaw / costRaw * 100) : null,
      target: target, priceNeeded: target === null ? null : up2(costRaw / (1 - target / 100))
    };
    if (price === 0 && costRaw === 0) res.status = 'No data';
    else if (profitRaw < -1e-9) res.status = 'Loss';
    else if (target === null) res.status = profitRaw > 1e-9 ? 'Profit' : 'Break-even';
    else res.status = profitRaw / price * 100 >= target - 1e-9 ? 'On target' : 'Below target';
    return res;
  }
  function fmtMoney(x, sym) { if (x === null || x === undefined) return '—';
    var s = Math.abs(x).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); return (x < 0 ? '−' : '') + (sym || '') + s; }
  function fmtPct(x) { return x === null || x === undefined ? '—' : (x < 0 ? '−' : '') + Math.abs(x).toFixed(1) + '%'; }
  var API = { calc: calc, num: num, r2: r2, r1: r1, up2: up2, fmtMoney: fmtMoney, fmtPct: fmtPct };
  if (typeof module !== 'undefined') module.exports = API; else root.JOB = API;
})(this);
