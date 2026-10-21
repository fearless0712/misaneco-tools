/* Position size calculator (browser + node).
   It never suggests trades. From your stop distance and the most you are willing to lose,
   it works out the largest position size. */
(function (root) {
  // "10,000" "$2" "2%" "1/150" -> number. Empty -> null. Not a number or negative -> NaN
  function num(s) {
    if (s === null || s === undefined) return null;
    var t = String(s).replace(/[\s,$€£¥%]/g, '');
    if (t === '') return null;
    var m = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(t);
    if (m) return +m[2] > 0 ? parseFloat(m[1]) / parseFloat(m[2]) : NaN;
    if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
    return parseFloat(t);
  }
  function fix(x, d) { var k = Math.pow(10, d === undefined ? 8 : d); return Math.round(x * k) / k; }
  function money(n) { return (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function int(n) { return Math.round(n).toLocaleString('en-US'); }

  // o: { balance, riskMode:'pct'|'amt', risk, pip:'0.0001'|'0.01', rate (value of 1 unit of quote currency
  //      in account currency; empty = 1), side:'buy'|'sell', entry, stop, target, spread, step, lot, lev }
  function calc(o) {
    var balance = num(o.balance), risk = num(o.risk), entry = num(o.entry), stop = num(o.stop);
    var target = num(o.target), spread = num(o.spread), rate = num(o.rate);
    if (rate === null) rate = 1;
    var step = +o.step || 1000, lot = +o.lot || 100000, lev = +o.lev || 30, pip = +o.pip || 0.0001;
    if (balance === null || risk === null || entry === null || stop === null) return { state: 'empty' };
    var bad = [balance, risk, entry, stop, rate].some(function (v) { return isNaN(v); });
    if (bad || (target !== null && isNaN(target)) || (spread !== null && isNaN(spread))) return { state: 'error', msg: 'Please enter numbers only (no negative values).' };
    if (!(rate > 0)) return { state: 'error', msg: 'The conversion rate must be greater than 0.' };
    if (balance <= 0 || entry <= 0 || stop <= 0) return { state: 'error', msg: 'Account balance, entry price and stop price must be greater than 0.' };
    if (o.riskMode !== 'amt' && risk >= 100) return { state: 'error', msg: 'Risk per trade must be less than 100%.' };
    var riskAmt = o.riskMode === 'amt' ? risk : balance * risk / 100;
    if (riskAmt <= 0) return { state: 'error', msg: 'The amount you are willing to lose must be greater than 0.' };
    if (riskAmt > balance) return { state: 'error', msg: 'The amount you are willing to lose is larger than your balance.' };
    var buy = o.side !== 'sell';
    if (buy && stop >= entry) return { state: 'error', msg: 'For a buy (long) trade, the stop must be below the entry price.' };
    if (!buy && stop <= entry) return { state: 'error', msg: 'For a sell (short) trade, the stop must be above the entry price.' };
    var sp = spread || 0;
    var pips = fix(fix(Math.abs(entry - stop)) / pip + sp, 4);
    var lossPerUnit = fix(pips * pip * rate, 12);
    var units = Math.floor(fix(riskAmt / lossPerUnit / step, 6)) * step;
    var res = {
      state: 'ok', buy: buy, riskAmt: riskAmt, riskPct: riskAmt / balance * 100, pips: pips, pip: pip,
      pipValueLot: fix(pip * rate * lot, 6), units: units, lots: fix(units / lot, 6),
      loss: fix(units * lossPerUnit, 6), lossPct: units * lossPerUnit / balance * 100,
      margin: units * entry * rate / lev, lev: lev, step: step, lot: lot
    };
    res.tooSmall = units === 0;
    res.leverage = units * entry * rate / balance;
    if (target !== null) {
      if ((buy && target <= entry) || (!buy && target >= entry)) res.targetErr = buy ? 'For a buy trade, the take-profit must be above the entry price.' : 'For a sell trade, the take-profit must be below the entry price.';
      else {
        var tp = fix(fix(Math.abs(target - entry)) / pip - sp, 4);
        res.tpPips = tp; res.profit = units * tp * pip * rate; res.rr = tp / pips;
      }
    }
    res.marginShort = res.margin > balance;
    return res;
  }
  var api = { num: num, fix: fix, money: money, int: int, calc: calc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PS = api;
})(this);
