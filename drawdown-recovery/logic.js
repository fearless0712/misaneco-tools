/* Drawdown recovery calculator (browser + node).
   Gain needed to get back to the start after a loss: 1 / (1 - loss) - 1.
   The "winning trades" figure is a compound-growth estimate, not a forecast. */
(function (root) {
  // "10,000" "$2" "25%" -> number. Empty -> null. Not a number or negative -> NaN
  function num(s) {
    if (s === null || s === undefined) return null;
    var t = String(s).replace(/[\s,$€£¥%]/g, '');
    if (t === '') return null;
    if (!/^\d+(\.\d+)?$/.test(t) && !/^\.\d+$/.test(t)) return NaN;
    return parseFloat(t);
  }
  function r2(n) { return Math.round(n * 100) / 100; }
  function money(n) { return r2(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct(n) { return r2(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'; }

  // Gain (%) needed to recover from a loss of lossPct (%). 0 <= lossPct < 100
  function recovery(lossPct) { return (1 / (1 - lossPct / 100) - 1) * 100; }

  // Winning trades needed if each win adds riskPct x avgR % of the current balance (compounding).
  function wins(ddPct, riskPct, avgR) {
    if (ddPct <= 0) return { exact: 0, n: 0, perLoss: 0, gainPerWin: riskPct * avgR };
    var g = 1 + riskPct * avgR / 100;
    var exact = Math.log(1 / (1 - ddPct / 100)) / Math.log(g);
    var n = Math.ceil(exact - 1e-9);
    // each losing trade (-riskPct %) in between needs this many extra wins
    var perLoss = Math.log(1 / (1 - riskPct / 100)) / Math.log(g);
    return { exact: exact, n: n, perLoss: perLoss, gainPerWin: riskPct * avgR };
  }

  var NUM_ERR = 'Please enter numbers only (no negative values).';
  // o: { mode:'pct'|'bal', loss, peak, balance, risk, avgR }
  function calc(o) {
    var res;
    if (o.mode === 'bal') {
      var peak = num(o.peak), bal = num(o.balance);
      if (peak === null || bal === null) return { state: 'empty' };
      if (isNaN(peak) || isNaN(bal)) return { state: 'error', msg: NUM_ERR };
      if (peak <= 0) return { state: 'error', msg: 'Peak balance must be greater than 0.' };
      if (bal <= 0) return { state: 'error', msg: 'Current balance must be greater than 0. At 0 there is nothing left to grow back.' };
      var above = bal >= peak;
      var dd = above ? 0 : (peak - bal) / peak * 100;
      res = { state: 'ok', mode: 'bal', dd: dd, need: above ? 0 : (peak / bal - 1) * 100, amount: above ? 0 : peak - bal, peak: peak, balance: bal, above: bal > peak };
    } else {
      var loss = num(o.loss);
      if (loss === null) return { state: 'empty' };
      if (isNaN(loss)) return { state: 'error', msg: NUM_ERR };
      if (loss >= 100) return { state: 'error', msg: 'The loss must be less than 100%. At 100% there is nothing left to grow back.' };
      res = { state: 'ok', mode: 'pct', dd: loss, need: recovery(loss) };
    }
    var risk = num(o.risk), R = num(o.avgR);
    if (risk === null || R === null) return res;
    if (isNaN(risk) || isNaN(R)) { res.winsErr = NUM_ERR; return res; }
    if (!(risk > 0) || risk >= 100) { res.winsErr = 'Risk per trade must be more than 0% and less than 100%.'; return res; }
    if (!(R > 0)) { res.winsErr = 'Average R must be greater than 0.'; return res; }
    res.wins = wins(res.dd, risk, R);
    return res;
  }

  // Quick reference: drawdown 10% ... 90%
  function table() {
    var rows = [];
    for (var d = 10; d <= 90; d += 10) rows.push({ dd: d, need: recovery(d), left: 100 - d, mult: 1 / (1 - d / 100) });
    return rows;
  }
  function tableText() {
    return ['Drawdown\tGain needed to recover\tBalance left (of 100)\tGrowth needed'].concat(table().map(function (r) {
      return r.dd + '%\t' + pct(r.need) + '\t' + r.left + '\tx' + r2(r.mult).toFixed(2);
    })).join('\n');
  }

  var api = { num: num, r2: r2, money: money, pct: pct, recovery: recovery, wins: wins, calc: calc, table: table, tableText: tableText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DD = api;
})(this);
