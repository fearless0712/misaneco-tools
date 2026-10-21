/* 損切り・ロット計算ツールの計算部分（ブラウザ・node 共通）
   売買の判断はしない。決めた損切りの位置と、許してよい損失額から、取引数量の上限を出すだけ。 */
(function (root) {
  // "1,000,000円" "１５０．２５" → 数値。空は null、数字でない・マイナスは NaN
  function num(s) {
    if (s === null || s === undefined) return null;
    var t = String(s).replace(/[０-９．]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[\s,，円¥￥%％]/g, '');
    if (t === '') return null;
    if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
    return parseFloat(t);
  }
  // 浮動小数のずれを消す（例 150.25-149.95 = 0.30000000000001 → 0.3）
  function fix(x, d) { var k = Math.pow(10, d === undefined ? 8 : d); return Math.round(x * k) / k; }
  function yen(n) { return Math.round(n).toLocaleString('ja-JP') + '円'; }
  function int(n) { return Math.round(n).toLocaleString('ja-JP'); }

  // o: { balance, riskMode:'pct'|'yen', risk, pair:'jpy'|'other', rate, side:'buy'|'sell',
  //      entry, stop, target, spread, step, lot, lev }
  function calc(o) {
    var balance = num(o.balance), risk = num(o.risk), entry = num(o.entry), stop = num(o.stop);
    var target = num(o.target), spread = num(o.spread), rate = o.pair === 'other' ? num(o.rate) : 1;
    var step = +o.step || 1000, lot = +o.lot || 10000, lev = +o.lev || 25;
    if (balance === null || risk === null || entry === null || stop === null) return { state: 'empty' };
    var bad = [balance, risk, entry, stop, rate].some(function (v) { return v === null || isNaN(v); });
    if (bad || (target !== null && isNaN(target)) || (spread !== null && isNaN(spread))) return { state: 'error', msg: '数字で入力してください（マイナスは使えません）。' };
    if (o.pair === 'other' && !(rate > 0)) return { state: 'error', msg: '決済通貨の円レートを入れてください（例：EUR/USDなら、USD/JPYのレート）。' };
    if (balance <= 0 || entry <= 0 || stop <= 0) return { state: 'error', msg: '口座残高・エントリー価格・損切り価格は0より大きい数を入れてください。' };
    var riskYen = o.riskMode === 'yen' ? risk : balance * risk / 100;
    if (o.riskMode !== 'yen' && risk >= 100) return { state: 'error', msg: '1回の損失の割合は100%未満で入れてください。' };
    if (riskYen <= 0) return { state: 'error', msg: '許せる損失は0より大きい数を入れてください。' };
    if (riskYen > balance) return { state: 'error', msg: '許せる損失が口座残高を超えています。' };
    var buy = o.side !== 'sell';
    if (buy && stop >= entry) return { state: 'error', msg: '買いの場合、損切り価格はエントリー価格より下にしてください。' };
    if (!buy && stop <= entry) return { state: 'error', msg: '売りの場合、損切り価格はエントリー価格より上にしてください。' };
    var pip = o.pair === 'other' ? 0.0001 : 0.01;
    var sp = spread || 0;
    var dist = fix(Math.abs(entry - stop));            // 価格の差
    var pips = fix(dist / pip + sp, 4);                 // 損切りまでの幅（スプレッド込み）
    var lossPerUnit = fix(pips * pip * rate, 10);       // 1通貨あたりの損失（円）
    var maxUnits = riskYen / lossPerUnit;
    var units = Math.floor(fix(maxUnits / step, 6)) * step;
    var res = {
      state: 'ok', buy: buy, riskYen: riskYen, riskPct: riskYen / balance * 100, pips: pips, pip: pip,
      lossPer1000: lossPerUnit * 1000, units: units, lots: fix(units / lot, 6),
      loss: fix(units * lossPerUnit, 4), lossPct: units * lossPerUnit / balance * 100,
      margin: units * entry * rate / lev, lev: lev, step: step, lot: lot
    };
    res.tooSmall = units === 0;
    res.leverage = units * entry * rate / balance; // 実効レバレッジ
    if (target !== null) {
      if ((buy && target <= entry) || (!buy && target >= entry)) res.targetErr = buy ? '買いの利益確定は、エントリー価格より上にしてください。' : '売りの利益確定は、エントリー価格より下にしてください。';
      else {
        var tp = fix(Math.abs(target - entry) / pip - sp, 4);
        res.tpPips = tp; res.profit = units * tp * pip * rate; res.rr = tp / pips;
      }
    }
    res.marginShort = res.margin > balance;
    return res;
  }
  var api = { num: num, fix: fix, yen: yen, int: int, calc: calc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SK = api;
})(this);
