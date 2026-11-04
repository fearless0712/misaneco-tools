/* Trading Studio - fictional sample journal (made up for the demo; not real trades or real results).
   Built from a fixed seed so the same "today" always gives the same sample. */
(function (root) {
  'use strict';
  var TL = root.TL || (typeof require !== 'undefined' ? require('./logic.js') : null);
  var SYMS = [
    // symbol, weight, base price, stop distance, decimals, size, sessions (hours)
    ['EURUSD', 6, 1.0850, 0.0025, 5, 0.40, [7, 8, 9, 10, 13, 14, 15]],
    ['GBPUSD', 4, 1.2700, 0.0030, 5, 0.33, [7, 8, 9, 13, 14]],
    ['USDJPY', 4, 150.20, 0.30, 3, 0.50, [0, 1, 2, 8, 13, 14]],
    ['XAUUSD', 3, 2650.0, 6.0, 2, 0.17, [8, 13, 14, 15]],
    ['US500', 3, 5850.0, 12.0, 1, 0.80, [14, 15, 16, 17, 19]],
    ['BTCUSD', 2, 68000, 900, 1, 0.11, [2, 9, 15, 20, 22]],
    ['AAPL', 1, 228.0, 2.5, 2, 40, [14, 15, 17, 19]]
  ];
  // setup: weight, win chance, win R range, loss R range
  var SETUPS = [
    ['Breakout', 4, 0.38, [1.6, 3.0], [-1.05, -0.9]],
    ['Pullback', 5, 0.49, [1.0, 2.0], [-1.0, -0.6]],
    ['Range fade', 3, 0.47, [0.6, 1.3], [-1.1, -0.8]],
    ['News', 1, 0.30, [1.5, 3.2], [-1.4, -1.0]]
  ];
  var NOTES = ['Waited for the retest.', 'Moved stop to breakeven too early.', 'Entered late, chased.', 'Followed the plan.', 'Spread was wide at the open.', 'Took partial at 1R.', '', '', '', ''];
  function pick(rnd, list) { var tot = list.reduce(function (s, x) { return s + x[1]; }, 0), r = rnd() * tot; for (var i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i]; } return list[list.length - 1]; }
  function rng(rnd, a, b) { return a + (b - a) * rnd(); }
  function round(v, d) { var k = Math.pow(10, d); return Math.round(v * k) / k; }

  // today: 'YYYY-MM-DD'. About 9 weeks of trades before today.
  function sample(today) {
    var rnd = TL.mulberry32(53), trades = [], seq = 0;
    var start = TL.addDays(today, -63);
    for (var d = start; d < today; d = TL.addDays(d, 1)) {
      var wd = TL.weekday(d); if (wd >= 5) continue;
      var n = 1 + Math.floor(rnd() * 3); // 1-3 trades
      for (var k = 0; k < n; k++) {
        var s = pick(rnd, SYMS), st = pick(rnd, SETUPS);
        var h = s[6][Math.floor(rnd() * s[6].length)], mi = Math.floor(rnd() * 60);
        var win = rnd() < st[2], R = win ? rng(rnd, st[3][0], st[3][1]) : rng(rnd, st[4][0], st[4][1]);
        if (!win && rnd() < 0.08) R = 0; // scratch trade
        R = round(R, 2);
        var risk = 100, fees = round(rng(rnd, 1.5, 6.5), 2);
        var side = rnd() < 0.55 ? 'long' : 'short', dir = side === 'long' ? 1 : -1;
        var base = s[2] * (1 + rng(rnd, -0.03, 0.03)), dist = s[3] * rng(rnd, 0.8, 1.25);
        var entry = round(base, s[4]), sl = round(entry - dir * dist, s[4]);
        var net = round(R * risk, 2), gross = round(net + fees, 2);
        var exit = round(entry + dir * dist * (gross / risk), s[4]);
        var holdMin = Math.floor(rng(rnd, 12, 360));
        var open = d + ' ' + TL.pad(h) + ':' + TL.pad(mi) + ':00';
        var close = TL.shiftTs(open, holdMin / 60);
        close = close.slice(0, 17) + '00';
        seq++;
        trades.push({
          id: 's' + seq, seqNo: seq, open: open, close: close, symbol: s[0], side: side, qty: s[5], entry: entry, exit: exit, sl: sl,
          gross: gross, fees: fees, risk: risk, tags: [st[0]], note: NOTES[Math.floor(rnd() * NOTES.length)], ticket: String(80001200 + seq)
        });
      }
    }
    return {
      v: 1, sample: true, seq: seq + 100,
      settings: { account: 'Sample account (fictional)', currency: 'USD', startBalance: 10000, dayStartHour: 0 },
      prop: { size: 10000, from: TL.addDays(today, -24), dailyPct: 5, dailyBasis: 'initial', maxPct: 10, maxType: 'static', trailLock: false, targetPct: 8, minDays: 4, dayStartHour: 0, preset: 'ex1' },
      risk: { riskPct: 1, trades: 200, runs: 2000, ruinPct: 30 },
      trades: trades,
      dayNotes: (function () { var o = {}; o[TL.addDays(today, -3)] = 'Two losses in a row on news. Stepped away after the second one.'; o[TL.addDays(today, -10)] = 'Best day of the month - stuck to pullbacks only.'; return o; })()
    };
  }
  function empty() {
    return {
      v: 1, sample: false, seq: 100,
      settings: { account: 'My account', currency: 'USD', startBalance: 10000, dayStartHour: 0 },
      prop: { size: 10000, from: '', dailyPct: 5, dailyBasis: 'initial', maxPct: 10, maxType: 'static', trailLock: false, targetPct: 8, minDays: 4, dayStartHour: 0, preset: 'ex1' },
      risk: { riskPct: 1, trades: 200, runs: 2000, ruinPct: 30 },
      trades: [], dayNotes: {}
    };
  }
  // example MT4-style history for the import demo (fictional numbers)
  var EXAMPLE_MT4 = [
    'Ticket\tOpen Time\tType\tSize\tItem\tPrice\tS / L\tT / P\tClose Time\tPrice\tCommission\tTaxes\tSwap\tProfit',
    '90001\t{D1} 08:05:12\tbuy\t0.50\teurusd\t1.08420\t1.08220\t1.08820\t{D1} 10:41:03\t1.08800\t-3.50\t0.00\t0.00\t190.00',
    '90002\t{D1} 13:30:40\tsell\t0.30\tgbpusd\t1.27150\t1.27450\t1.26550\t{D1} 14:02:18\t1.27450\t-2.10\t0.00\t0.00\t-90.00',
    '90003\t{D2} 09:12:00\tbuy\t0.20\txauusd\t2648.50\t2643.50\t2660.00\t{D2} 15:47:33\t2658.30\t-1.40\t0.00\t-1.10\t196.00',
    '90004\t{D2} 16:20:05\tbuy limit\t0.40\teurusd\t1.08000\t1.07800\t1.08400\t{D2} 23:59:00\t1.08310\t\t\t\tcancelled',
    '90005\t{D3} 02:10:44\tsell\t0.60\tusdjpy\t150.420\t150.720\t149.820\t{D3} 06:55:10\t150.120\t-4.20\t0.00\t0.00\t119.95',
    '90006\t{D3} 14:31:02\tbuy\t1.00\tus500\t5842.5\t5832.5\t5862.5\t{D3} 14:58:47\t5832.5\t0.00\t0.00\t0.00\t-100.00',
    '\t{D3} 18:00:00\tbalance\t\t\t\t\t\t\t\t\t\t\t500.00'
  ].join('\n');
  function exampleMT4(today) {
    var days = [], d = today;
    while (days.length < 3) { if (TL.weekday(d) < 5) days.unshift(d); d = TL.addDays(d, -1); }
    var d1 = days[0], d2 = days[1], d3 = days[2];
    var f = function (x) { return x.replace(/-/g, '.'); };
    return EXAMPLE_MT4.replace(/\{D1\}/g, f(d1)).replace(/\{D2\}/g, f(d2)).replace(/\{D3\}/g, f(d3));
  }
  var api = { sample: sample, empty: empty, exampleMT4: exampleMT4 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TDATA = api;
})(typeof window !== 'undefined' ? window : this);
