/* Trading Studio checks: node test.js
   Hand-calculated examples (all numbers fictional), an independent DP for the Monte Carlo,
   import of MT4 / MT5 / cTrader / generic files, export round trip, backup, and page rules. */
'use strict';
const T = require('./assets/logic.js'), D = require('./assets/data.js'), REP = require('./assets/report.js');
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('FAIL', m, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b)); } };
const near = (a, b, m, e) => { if (typeof a === 'number' && Math.abs(a - b) <= (e === undefined ? 1e-6 : e)) pass++; else { fail++; console.log('FAIL', m, a, b); } };
const ok = (c, m) => eq(!!c, true, m);

// ---------- parsing ----------
near(T.parseNum('1,234.50'), 1234.5, 'num comma thousands'); near(T.parseNum('1 234.50'), 1234.5, 'num space thousands (MT report)');
near(T.parseNum('1 234,50', ','), 1234.5, 'num nbsp + decimal comma'); near(T.parseNum('1.234,50'), 1234.5, 'num auto european');
near(T.parseNum('(12.50)'), -12.5, 'num parentheses'); near(T.parseNum('-$5'), -5, 'num -$'); near(T.parseNum('$-5'), -5, 'num $-');
near(T.parseNum('−3.10'), -3.1, 'num unicode minus'); near(T.parseNum('0,5'), 0.5, 'num 0,5'); near(T.parseNum('1,234'), 1234, 'num 1,234 thousands');
near(T.parseNum('12.5 USD'), 12.5, 'num trailing currency'); eq(T.parseNum(''), null, 'num empty'); eq(Number.isNaN(T.parseNum('abc')), true, 'num text'); eq(Number.isNaN(T.parseNum('1.2.3')), true, 'num two dots');
eq(T.parseDate('2026.10.05 14:32:10'), '2026-10-05 14:32:10', 'date MT dots'); eq(T.parseDate('2026-10-05T09:05'), '2026-10-05 09:05:00', 'date ISO');
eq(T.parseDate('2026-10-05T09:05:00Z'), '2026-10-05 09:05:00', 'date ISO Z (kept as written)');
eq(T.parseDate('05/10/2026 14:32:10.123'), '2026-10-05 14:32:10', 'date d/m/y with ms'); eq(T.parseDate('10/25/2026 2:05 PM'), '2026-10-25 14:05:00', 'date m/d/y pm');
eq(T.parseDate('05/10/2026', 'mdy'), '2026-05-10 00:00:00', 'date forced mdy'); eq(T.parseDate('2026-02-30'), null, 'date invalid day'); eq(T.parseDate('12/31/26 12:00 AM'), '2026-12-31 00:00:00', 'date 2-digit year, 12 AM');
eq(T.guessOrder(['05/10/2026', '25/10/2026']), 'dmy', 'guess dmy'); eq(T.guessOrder(['10/25/2026']), 'mdy', 'guess mdy'); eq(T.guessOrder(['05/10/2026']), null, 'guess ambiguous');
eq(T.shiftTs('2026-10-05 23:30:00', 2), '2026-10-06 01:30:00', 'shift hours'); eq(T.weekday('2026-10-05'), 0, '2026-10-05 is Monday'); eq(T.weekday('2026-11-01'), 6, '2026-11-01 is Sunday');

// ---------- hand-calculated journal (fictional) ----------
const mk = (o, c, sym, side, g, f, r, tags) => ({ open: o, close: c, symbol: sym, side, gross: g, fees: f, risk: r, tags: tags || [] });
const J = [
  mk('2026-10-05 09:00:00', '2026-10-05 10:00:00', 'EURUSD', 'long', 200, 0, 100, ['Breakout']),
  mk('2026-10-05 13:00:00', '2026-10-05 14:00:00', 'GBPUSD', 'short', -100, 0, 100, ['Pullback']),
  mk('2026-10-06 08:00:00', '2026-10-06 09:30:00', 'EURUSD', 'long', 150, 0, 100, ['Pullback']),
  mk('2026-10-06 15:00:00', '2026-10-06 16:00:00', 'XAUUSD', 'long', -100, 0, 100, ['Breakout']),
  mk('2026-10-07 08:30:00', '2026-10-07 09:00:00', 'USDJPY', 'short', -50, 0, 100, ['News']),
  mk('2026-10-07 14:00:00', '2026-10-07 15:00:00', 'EURUSD', 'long', 0, 0, 100, ['Pullback']),
  mk('2026-10-08 09:00:00', '2026-10-08 11:00:00', 'GBPUSD', 'long', -100, 0, 100, ['Breakout', 'London']),
  mk('2026-10-08 16:00:00', '2026-10-08 17:00:00', 'XAUUSD', 'short', 300, 0, 100, ['Pullback']),
  mk('2026-10-09 10:00:00', '2026-10-09 12:00:00', 'EURUSD', 'short', -120, 0, 100, []),
  mk('2026-10-09 13:00:00', '2026-10-09 14:00:00', 'USDJPY', 'long', 80, 0, null, ['News'])
];
let s = T.stats(J.slice().reverse(), 10000);   // order of input must not matter
eq([s.n, s.wins, s.losses, s.be], [10, 4, 5, 1], 'counts');
near(s.winRate, 40, 'win rate 4/10'); near(s.net, 260, 'net 730-470'); near(s.grossWin, 730, 'gross win'); near(s.grossLoss, 470, 'gross loss');
near(s.pf, 730 / 470, 'profit factor 1.5532'); near(s.expectancy, 26, 'expectancy 260/10'); near(s.avgR, 0.2, 'avg R 1.8/9'); eq(s.rCount, 9, 'R count (one trade without risk)');
near(s.maxDD, 250, 'max DD 10250->10000'); near(s.maxDDPct, 250 / 10250 * 100, 'max DD % 2.439'); eq([s.ddPeak, s.ddLow], ['2026-10-06 09:30:00', '2026-10-08 11:00:00'], 'DD from/to');
eq([s.maxLossStreak, s.maxWinStreak], [2, 1], 'streaks (breakeven resets)'); near(s.avgWin, 182.5, 'avg win'); near(s.avgLoss, 94, 'avg loss'); near(s.payoff, 182.5 / 94, 'payoff');
near(s.balance, 10260, 'balance'); near(s.avgHoldMin, 72, 'avg hold 720/10 min'); eq(s.curve.map(p => p.eq), [10000, 10200, 10100, 10250, 10150, 10100, 10100, 10000, 10300, 10180, 10260], 'equity curve');
near(s.ddNow, 40, 'current DD 10300->10260');
// fees: net = gross - fees
near(T.net({ gross: 190, fees: 3.5 }), 186.5, 'net after fees'); near(T.rMult({ gross: 190, fees: 3.5, risk: 100 }), 1.865, 'R uses net');
let s0 = T.stats([], 5000); eq([s0.n, s0.winRate, s0.pf, s0.avgR, s0.maxDD, s0.balance], [0, null, null, null, 0, 5000], 'empty journal');
eq(T.stats([mk('', '2026-01-01 00:00:00', 'A', 'long', 50, 0, 0)], 0).pf, Infinity, 'no losses -> PF infinite');
// risk from the stop: profit moves in line with price
near(T.deriveRisk(1.0842, 1.0880, 1.0822, 190), 100, 'risk from stop: 190 x 20/38 pips');
near(T.deriveRisk(150.42, 150.12, 150.72, 120), 120, 'risk from stop, short JPY'); eq(T.deriveRisk(1.1, 1.1, 1.09, 0), null, 'no move -> no risk');

// ---------- breakdowns ----------
eq(T.breakdown(J, 'symbol').map(r => [r.key, r.n, r.net]), [['EURUSD', 4, 230], ['XAUUSD', 2, 200], ['USDJPY', 2, 30], ['GBPUSD', 2, -200]], 'by symbol');
eq(T.breakdown(J, 'symbol')[0].winRate, 50, 'EURUSD win rate 2/4');
eq(T.breakdown(J, 'hour').map(r => [r.key, r.net]), [['08:00', 100], ['09:00', 100], ['10:00', -120], ['13:00', -20], ['14:00', 0], ['15:00', -100], ['16:00', 300]], 'by open hour');
eq(T.breakdown(J, 'weekday').map(r => [r.key, r.n, r.net]), [['Mon', 2, 100], ['Tue', 2, 50], ['Wed', 2, -50], ['Thu', 2, 200], ['Fri', 2, -40]], 'by weekday');
eq(T.breakdown(J, 'setup').map(r => [r.key, r.n, r.net]), [['Pullback', 4, 350], ['(no setup)', 1, -120], ['News', 2, 30], ['London', 1, -100], ['Breakout', 3, 0]].sort((a, b) => b[2] - a[2] || (a[0] < b[0] ? -1 : 1)), 'by setup (two tags count twice)');
eq(T.breakdown(J, 'side').map(r => [r.key, r.net]), [['Short', 30], ['Long', 230]].sort((a, b) => b[1] - a[1]), 'by side');

// ---------- daily ----------
let dm = T.daily(J, 0); eq(Object.keys(dm).map(k => [k, dm[k].n, dm[k].net]), [['2026-10-05', 2, 100], ['2026-10-06', 2, 50], ['2026-10-07', 2, -50], ['2026-10-08', 2, 200], ['2026-10-09', 2, -40]], 'daily');
dm = T.daily(J, 10);   // day starts 10:00 -> closes before 10:00 belong to the previous day
eq(Object.keys(dm).map(k => [k, dm[k].n]), [['2026-10-05', 3], ['2026-10-06', 2], ['2026-10-07', 1], ['2026-10-08', 2], ['2026-10-09', 2]], 'daily with 10:00 day start (10-06 09:30 -> 10-05)');

// ---------- prop rules (your own numbers) ----------
const P = o => Object.assign({ size: 10000, from: '', dailyPct: 1, dailyBasis: 'initial', maxPct: 2, maxType: 'static', trailLock: false, targetPct: 3, minDays: 3, dayStartHour: 0 }, o);
let p = T.prop(J, P({}), '2026-10-09');
eq(p.days.map(d => [d.day, d.startBal, d.used]), [['2026-10-05', 10000, 0], ['2026-10-06', 10100, 0], ['2026-10-07', 10150, 50], ['2026-10-08', 10100, 100], ['2026-10-09', 10300, 120]], 'prop: biggest dip from day start');
eq(p.breaches.map(b => [b.rule, b.day]), [['daily', '2026-10-08'], ['daily', '2026-10-09']], 'prop: daily limit $100 reached on 10-08 (=) and 10-09');
eq([p.status, p.floor, p.maxRoom, p.profit, p.tradingDays, p.daysMet, p.targetHit], ['limit', 9800, 460, 260, 5, true, false], 'prop: static floor 9800, room 460');
near(p.targetProgress, 260 / 300 * 100, 'prop: target 86.7%'); eq([p.today.day, p.today.used, p.today.limit, p.today.room], ['2026-10-09', 120, 100, 0], 'prop: today');
p = T.prop(J, P({ dailyBasis: 'dayStart' }), '2026-10-09');
eq(p.breaches.map(b => [b.rule, b.day, b.limit]), [['daily', '2026-10-09', 103]], 'prop: 1% of day-start balance (101 on 10-08, 103 on 10-09)');
p = T.prop(J, P({ dailyPct: 5, maxType: 'trailing' }), '2026-10-09');
eq(p.breaches.map(b => [b.rule, b.day, b.balance, b.floor]), [['max', '2026-10-08', 10000, 10050]], 'prop: trailing 2% from high 10250 -> floor 10050');
p = T.prop(J, P({ dailyPct: 5, maxPct: 3, maxType: 'trailing' }), '2026-10-09');
eq([p.ok, p.floor, p.maxRoom, p.highWater], [true, 10000, 260, 10300], 'prop: trailing 3% -> floor 10000 now');
p = T.prop(J, P({ dailyPct: 5, maxPct: 1, maxType: 'trailing', trailLock: true }), '2026-10-09');
eq([p.floor, p.breaches.length], [10000, 1], 'prop: locked trailing floor stays at account size');
p = T.prop(J, P({ dailyPct: 5, targetPct: 2, minDays: 3 }), '2026-10-09'); eq([p.status, p.targetHit], ['met', true], 'prop: target and days reached');
p = T.prop(J, P({ dailyPct: 5, targetPct: 2, minDays: 6 }), '2026-10-09'); eq(p.status, 'within', 'prop: target hit but days missing');
p = T.prop(J, P({ from: '2026-10-08' }), '2026-10-12'); eq([p.n, p.tradingDays, p.today.used, p.today.room], [4, 2, 0, 100], 'prop: from date, today without trades');
eq(T.PRESETS.every(x => !/ftmo|funded ?next|the5ers|topstep|apex|fundingpips|e8/i.test(x.name)), true, 'presets have no firm names');

// ---------- drawdown recovery ----------
near(T.recoveryPct(50), 100, 'recovery 50%->100%'); near(T.recoveryPct(20), 25, 'recovery 20%->25%'); near(T.recoveryPct(10), 100 / 9, 'recovery 10%->11.11%'); eq(T.recoveryPct(100), null, 'recovery 100% impossible');

// ---------- Monte Carlo (fixed seed) ----------
eq(T.ruin({ rs: [1, -1], riskPct: 2, trades: 100, runs: 300, ruinPct: 20, seed: 7 }), T.ruin({ rs: [1, -1], riskPct: 2, trades: 100, runs: 300, ruinPct: 20, seed: 7 }), 'same seed same result');
eq(T.ruin({ rs: [-1], riskPct: 10, trades: 7, runs: 50, ruinPct: 50 }).pRuin, 100, 'all losses: 0.9^7=0.478 -> ruined');
eq(T.ruin({ rs: [-1], riskPct: 10, trades: 6, runs: 50, ruinPct: 50 }).pRuin, 0, 'all losses: 0.9^6=0.531 -> not yet');
eq(T.ruin({ rs: [0.5, 2], riskPct: 5, trades: 100, runs: 50, ruinPct: 10 }).pRuin, 0, 'no losing trades -> no ruin');
eq(T.ruin({ rs: [], riskPct: 1 }), null, 'no R -> null');
// independent exact answer for a coin-flip journal (+1R / -1R), by dynamic programming over (wins, losses)
function exactRuin(f, N, lvl) {
  let alive = { 0: 1 }, ruined = 0;
  for (let t = 0; t < N; t++) {
    const nx = {};
    for (const k in alive) {
      const pk = alive[k] / 2, w = +k;
      [[w + 1, 1], [w, 0]].forEach(([k2]) => { const l2 = t + 1 - k2, eqv = Math.pow(1 + f, k2) * Math.pow(1 - f, l2); if (eqv <= lvl + 1e-12) ruined += pk; else nx[k2] = (nx[k2] || 0) + pk; });
    }
    alive = nx;
  }
  return ruined * 100;
}
const ex = exactRuin(0.1, 50, 0.7), mc = T.ruin({ rs: [1, -1], riskPct: 10, trades: 50, runs: 20000, ruinPct: 30, seed: 99 });
near(mc.pRuin, ex, 'MC vs exact DP (' + ex.toFixed(2) + '%)', 1.5);
const ex2 = exactRuin(0.02, 200, 0.8), mc2 = T.ruin({ rs: [1, -1], riskPct: 2, trades: 200, runs: 20000, ruinPct: 20, seed: 3 });
near(mc2.pRuin, ex2, 'MC vs exact DP 2 (' + ex2.toFixed(2) + '%)', 1.5);
let rr = T.ruin({ rs: [2, -1, -1, 1.5], riskPct: 1, trades: 100, runs: 1000, ruinPct: 30, seed: 1 });
ok(rr.p5End <= rr.medianEnd && rr.medianEnd <= rr.p95End && rr.medianDD <= rr.p95DD, 'percentiles in order');
near(T.pctile([1, 2, 3, 4], 0.5), 2.5, 'median of 4 values');

// ---------- position size = the free /position-size/ tool ----------
const ps = path.join(__dirname, 'assets/ps.js'), orig = path.join(__dirname, '../../position-size/logic.js');
eq(fs.readFileSync(ps, 'utf8'), fs.readFileSync(orig, 'utf8'), 'ps.js is the same file as /position-size/logic.js');
const PS = require('./assets/ps.js');
let q = PS.calc({ balance: '10000', riskMode: 'pct', risk: '1', pip: '0.0001', rate: '', side: 'buy', entry: '1.0850', stop: '1.0825', target: '', spread: '', step: '1000', lot: '100000', lev: '30' });
eq([q.units, q.lots, q.pips], [40000, 0.4, 25], 'position size $10,000 1% 25 pips -> 0.4 lots');
q = PS.calc({ balance: '5000', riskMode: 'pct', risk: '2', pip: '0.01', rate: '1/150', side: 'sell', entry: '150.00', stop: '150.40', step: '1000', lot: '100000', lev: '30' });
eq([q.units, q.lots, PS.money(q.loss)], [37000, 0.37, '98.67'], 'position size USD/JPY example (same as the tool page)');

// ---------- CSV / HTML import ----------
eq(T.parseCSV('a,"b, c","d ""q"""\n1,2,3'), [['a', 'b, c', 'd "q"'], ['1', '2', '3']], 'csv quotes');
eq(T.detectDelim('a;b;c\n1;2;3'), ';', 'detect semicolon'); eq(T.detectDelim('a\tb\n1\t2'), '\t', 'detect tab');
// 1) MT4 history pasted with header (example in the app)
let tb = T.readTable(D.exampleMT4('2026-10-31'));
eq([tb.layout, tb.headerless, tb.rows.length], ['mt4', false, 7], 'MT4 paste: layout');
let im = T.importRows(tb.rows, tb.map, {});
eq(im.trades.length, 5, 'MT4 paste: 5 trades'); eq(im.skipped.map(x => x.why.replace(/ \(.*/, '')), ['not a buy/sell row', 'not a buy/sell row'], 'MT4 paste: pending + balance skipped');
eq(im.trades.map(t => [t.symbol, t.side, t.close, T.net(t), t.risk]), [
  ['EURUSD', 'long', '2026-10-28 10:41:03', 186.5, 100], ['GBPUSD', 'short', '2026-10-28 14:02:18', -92.1, 90],
  ['XAUUSD', 'long', '2026-10-29 15:47:33', 193.5, 100], ['USDJPY', 'short', '2026-10-30 06:55:10', 115.75, 119.95], ['US500', 'long', '2026-10-30 14:58:47', -100, 100]], 'MT4 paste: values, fees and risk from stop (Saturday -> last 3 weekdays Wed-Fri)');
// fees = -(commission + taxes + swap): XAU -1.40 commission -1.10 swap -> 2.50
near(im.trades[2].fees, 2.5, 'MT4 fees = commission + swap');
// 2) duplicate import is skipped
let im2 = T.importRows(tb.rows, tb.map, { existing: im.trades }); eq([im2.trades.length, im2.skipped.filter(x => /duplicate/.test(x.why)).length], [0, 5], 'duplicates skipped');
// 3) MT4 statement as HTML (simplified layout of "Save as Detailed Report")
const mt4html = `<html><body><table>
<tr align=left><td colspan=2><b>Account: 1234567</b></td></tr>
<tr><td colspan=13><b>Closed Transactions:</b></td></tr>
<tr align=center bgcolor="#C0C0C0"><td>Ticket</td><td nowrap>Open Time</td><td>Type</td><td>Size</td><td>Item</td><td>Price</td><td>S / L</td><td>T / P</td><td nowrap>Close Time</td><td>Price</td><td>Commission</td><td>Taxes</td><td>Swap</td><td>Profit</td></tr>
<tr bgcolor="#FFFFFF" align=right><td>5001</td><td class=msdate nowrap>2026.09.01 08:00:00</td><td>buy</td><td class=mspt>1.00</td><td>eurusd</td><td style="mso-number-format:0\\.00000;">1.10000</td><td>1.09800</td><td>0.00000</td><td class=msdate nowrap>2026.09.01 12:00:00</td><td>1.10300</td><td class=mspt>-7.00</td><td class=mspt>0.00</td><td class=mspt>0.00</td><td class=mspt>300.00</td></tr>
<tr bgcolor="#E0E0E0" align=right><td>5002</td><td class=msdate nowrap>2026.09.02 09:00:00</td><td>sell</td><td class=mspt>2.00</td><td>gbpusd</td><td>1.30000</td><td>1.30500</td><td>0.00000</td><td class=msdate nowrap>2026.09.03 10:00:00</td><td>1.30500</td><td class=mspt>-14.00</td><td class=mspt>0.00</td><td class=mspt>-3.20</td><td class=mspt>-1&nbsp;000.00</td></tr>
<tr bgcolor="#FFFFFF" align=right><td>5003</td><td class=msdate nowrap>2026.09.03 09:00:00</td><td>buy stop</td><td class=mspt>1.00</td><td>eurusd</td><td>1.10500</td><td>0.00000</td><td>0.00000</td><td colspan=4 align=right>cancelled</td><td colspan=2></td></tr>
<tr align=right><td>5004</td><td class=msdate>2026.09.04 00:00:00</td><td>balance</td><td colspan=10 align=left>Deposit</td><td class=mspt>5 000.00</td></tr>
<tr><td colspan=10>&nbsp;</td><td class=mspt>-21.00</td><td>0.00</td><td>-3.20</td><td>-700.00</td></tr>
<tr><td colspan=13><b>Open Trades:</b></td></tr>
<tr align=center bgcolor="#C0C0C0"><td>Ticket</td><td nowrap>Open Time</td><td>Type</td><td>Size</td><td>Item</td><td>Price</td><td>S / L</td><td>T / P</td><td></td><td>Price</td><td>Commission</td><td>Taxes</td><td>Swap</td><td>Profit</td></tr>
<tr align=right><td>5010</td><td class=msdate>2026.09.05 10:00:00</td><td>buy</td><td>0.50</td><td>usdjpy</td><td>145.000</td><td>144.500</td><td>0.000</td><td>&nbsp;</td><td>145.200</td><td>-3.50</td><td>0.00</td><td>0.00</td><td>68.97</td></tr>
</table></body></html>`;
tb = T.readTable(mt4html); eq([tb.layout, tb.headers.length], ['mt4', 14], 'MT4 HTML: header found');
im = T.importRows(tb.rows, tb.map, {});
eq(im.trades.map(t => [t.ticket, t.symbol, t.side, t.gross, t.fees, T.net(t), t.risk]), [['5001', 'EURUSD', 'long', 300, 7, 293, 200], ['5002', 'GBPUSD', 'short', -1000, 17.2, -1017.2, 1000]], 'MT4 HTML: closed trades only, "1 000.00" read, risk from stop');
// 4) MT5 report saved as HTML is UTF-16LE with a BOM
const mt5html = `<html><body><table>
<tr><th colspan=13><div><b>Positions</b></div></th></tr>
<tr bgcolor="#E5F0FC"><td nowrap><b>Time</b></td><td><b>Position</b></td><td><b>Symbol</b></td><td><b>Type</b></td><td><b>Volume</b></td><td><b>Price</b></td><td><b>S / L</b></td><td><b>T / P</b></td><td nowrap><b>Time</b></td><td><b>Price</b></td><td><b>Commission</b></td><td><b>Swap</b></td><td><b>Profit</b></td></tr>
<tr bgcolor="#FFFFFF" align=right><td>2026.09.10 09:15:02</td><td>700001</td><td>XAUUSD</td><td>buy</td><td>0.10</td><td>2 500.00</td><td>2 490.00</td><td></td><td>2026.09.10 13:45:30</td><td>2 520.00</td><td>-0.70</td><td>0.00</td><td>200.00</td></tr>
<tr bgcolor="#F7F7F7" align=right><td>2026.09.11 15:00:00</td><td>700002</td><td>US30</td><td>sell</td><td>1.00</td><td>42 000.0</td><td></td><td></td><td>2026.09.11 15:30:00</td><td>42 050.0</td><td>0.00</td><td>0.00</td><td>-50.00</td></tr>
<tr><th colspan=13><div><b>Orders</b></div></th></tr>
<tr bgcolor="#E5F0FC"><td><b>Open Time</b></td><td><b>Order</b></td><td><b>Symbol</b></td><td><b>Type</b></td><td><b>Volume</b></td><td><b>Price</b></td><td><b>S / L</b></td><td><b>T / P</b></td><td><b>Time</b></td><td><b>State</b></td><td><b>Comment</b></td></tr>
<tr><td>2026.09.10 09:15:02</td><td>800001</td><td>XAUUSD</td><td>buy</td><td>0.10 / 0.10</td><td>market</td><td></td><td></td><td>2026.09.10 09:15:02</td><td>filled</td><td></td></tr>
<tr><th colspan=13><div><b>Deals</b></div></th></tr>
<tr bgcolor="#E5F0FC"><td><b>Time</b></td><td><b>Deal</b></td><td><b>Symbol</b></td><td><b>Type</b></td><td><b>Direction</b></td><td><b>Volume</b></td><td><b>Price</b></td><td><b>Order</b></td><td><b>Commission</b></td><td><b>Fee</b></td><td><b>Swap</b></td><td><b>Profit</b></td><td><b>Balance</b></td><td><b>Comment</b></td></tr>
<tr><td>2026.09.10 09:15:02</td><td>900001</td><td>XAUUSD</td><td>buy</td><td>in</td><td>0.10</td><td>2 500.00</td><td>800001</td><td>-0.70</td><td>0.00</td><td>0.00</td><td>0.00</td><td>10 000.00</td><td></td></tr>
</table></body></html>`;
const u16 = Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(mt5html, 'utf16le')]);
const dec = T.decodeBytes(new Uint8Array(u16)); eq(dec.indexOf('Positions') > 0, true, 'UTF-16LE report decoded');
tb = T.readTable(dec); eq([tb.layout, tb.rows.length], ['mt5', 2], 'MT5: positions table only');
im = T.importRows(tb.rows, tb.map, {});
eq(im.trades.map(t => [t.ticket, t.symbol, t.side, t.open, t.close, t.entry, t.exit, T.net(t), t.risk]), [['700001', 'XAUUSD', 'long', '2026-09-10 09:15:02', '2026-09-10 13:45:30', 2500, 2520, 199.3, 100], ['700002', 'US30', 'short', '2026-09-11 15:00:00', '2026-09-11 15:30:00', 42000, 42050, -50, null]], 'MT5: values (no stop -> no risk)');
eq(T.decodeBytes(new Uint8Array([0xEF, 0xBB, 0xBF, 0x61])), 'a', 'UTF-8 BOM'); eq(T.decodeBytes(new Uint8Array([0x63, 0x61, 0x66, 0xE9])), 'café', 'Windows-1252 fallback');
// 5) cTrader-style CSV (Net and Gross in account currency, day/month dates)
const ct = 'Symbol,Opening Direction,Opening Time (UTC+0),Closing Time (UTC+0),Entry Price,Closing Price,Closing Quantity,Gross USD,Commission,Swap,Pips,Net USD,Balance USD\n' +
  'EURUSD,Buy,25/09/2026 08:01:02.120,25/09/2026 09:45:10.004,1.08000,1.08200,"100,000",200.00,-6.00,0.00,20.0,194.00,"10,194.00"\n' +
  'USDJPY,Sell,26/09/2026 13:00:00.000,27/09/2026 01:10:00.000,150.200,150.500,"50,000",-99.67,-3.00,-1.20,-30.0,-103.87,"10,090.13"\n';
tb = T.readTable(ct); eq(tb.layout, 'ctrader', 'cTrader: detected');
im = T.importRows(tb.rows, tb.map, { order: T.guessOrder(tb.rows.map(r => r[2])) || 'dmy' });
eq(im.trades.map(t => [t.side, t.open, t.close, t.qty, t.gross, t.fees, T.net(t)]), [['long', '2026-09-25 08:01:02', '2026-09-25 09:45:10', 100000, 200, 6, 194], ['short', '2026-09-26 13:00:00', '2026-09-27 01:10:00', 50000, -99.67, 4.2, -103.87]], 'cTrader: gross, net -> fees');
// 6) generic CSV with semicolons and decimal commas, P&L column = net, setup and notes
const gen = 'Date;Instrument;Side;Qty;Entry;Exit;P&L;Risk;Strategy;Notes\n2026-08-03 14:30;AAPL;Long;40;228,10;231,35;130,00;100;Breakout, Earnings;"Held through ""noise"""\n2026-08-04 15:00;ES;Short;1;5850,25;5856,25;-300,00;250;Fade;\n';
tb = T.readTable(gen); im = T.importRows(tb.rows, tb.map, { dec: ',' });
eq(tb.map, ['open', 'symbol', 'side', 'qty', 'entry', 'exit', 'net', 'risk', 'tags', 'note'], 'generic: columns matched by name');
eq(im.trades.map(t => [t.symbol, t.side, t.entry, T.net(t), T.rMult(t), t.tags, t.note]), [['AAPL', 'long', 228.1, 130, 1.3, ['Breakout', 'Earnings'], 'Held through "noise"'], ['ES', 'short', 5850.25, -300, -1.2, ['Fade'], '']], 'generic: values');
// 7) MT4 rows copied without a header row (14 columns)
const raw = '6001\t2026.10.01 10:00:00\tsell\t0.10\tgbpjpy\t195.500\t195.800\t0.000\t2026.10.01 11:00:00\t195.200\t-0.70\t0.00\t0.00\t20.00\n6002\t2026.10.02 10:00:00\tbuy\t0.10\tgbpjpy\t195.000\t194.700\t0.000\t\t195.100\t-0.70\t0.00\t0.00\t6.67';
tb = T.readTable(raw); eq([tb.headerless, tb.layout], [true, 'mt4'], 'headerless MT4 copy recognised by 14 columns');
im = T.importRows(tb.rows, tb.map, {}); eq([im.trades.length, im.skipped[0].why], [1, 'no close time (open position)'], 'open position skipped');
near(im.trades[0].risk, 20, 'risk from stop 30/30 pips');
// 8) shift hours and unreadable rows
im = T.importRows([['2026-10-05 23:30', 'X', 'buy', '5']], ['close', 'symbol', 'side', 'net'], { shiftHours: 2 }); eq(im.trades[0].close, '2026-10-06 01:30:00', 'shift on import');
im = T.importRows([['tomorrow', 'X', 'buy', '5'], ['2026-10-05', 'X', 'buy', 'n/a']], ['close', 'symbol', 'side', 'net'], {}); eq(im.skipped.map(x => x.why), ['close time not readable', 'a money cell is not a number'], 'bad rows explained');

// ---------- export round trip ----------
const sample = D.sample('2026-10-31');
const csv = T.toCSV(sample.trades); tb = T.readTable(csv); im = T.importRows(tb.rows, tb.map, {});
eq(im.trades.length, sample.trades.length, 'CSV round trip: count');
eq(im.trades.map(t => [t.close, t.symbol, T.net(t), t.risk, t.tags.join('|')]), T.sortTrades(sample.trades).map(t => [t.close, t.symbol, T.net(t), t.risk, t.tags.join('|')]), 'CSV round trip: same values');
ok(T.csvCell('=HYPERLINK("x")').startsWith('"\'='), 'CSV: formula text is neutralised'); eq(T.csvCell('-12.5'), '-12.5', 'CSV: negative numbers kept');
// backup
const bk = T.makeBackup(sample, '2026-10-31T00:00:00Z'), back = T.parseBackup(bk);
eq([back.ok, back.data.trades.length, back.data.prop.size], [true, sample.trades.length, 10000], 'backup round trip');
eq(T.parseBackup('{"app":"other"}').ok, false, 'backup: other app rejected'); eq(T.parseBackup('nope').ok, false, 'backup: not JSON');
eq(T.parseBackup(JSON.stringify({ app: 'trading-studio', format: 1, data: { v: 1, settings: {}, trades: [{ gross: 'x' }] } })).ok, false, 'backup: bad trade rejected');

// ---------- sample data ----------
eq(JSON.stringify(D.sample('2026-10-31')), JSON.stringify(D.sample('2026-10-31')), 'sample is deterministic');
let st = T.stats(sample.trades, 10000);
ok(st.n >= 80 && st.n <= 110, 'sample size ' + st.n);
ok(sample.trades.every(t => t.close < '2026-10-31' && t.risk === 100), 'sample: before today, $100 risk');
let pr = T.prop(sample.trades, sample.prop, '2026-10-31'); eq(pr.status, 'within', 'sample prop example is within limits');
// formatting
eq([T.money(-1234.5, 'USD'), T.money(12, 'EUR', true), T.money(1500, 'JPY'), T.money(0, 'USD', true)], ['−$1,234.50', '+€12.00', '¥1,500', '$0.00'], 'money format');
eq([T.fmtR(1.865), T.fmtR(-1), T.fx(Infinity, 2), T.fx(null, 1)], ['+1.87R', '−1.00R', '∞', '—'], 'R and number format');
// bug report text never contains journal data
const rep = REP.makeReport({ version: '1.0.0', ua: 'UA', view: 'dash', error: { msg: 'x is undefined', file: '/Users/me/secret/app.js', line: 3 }, at: '2026-10-31 10:00', trades: sample.trades, account: 'Secret' });
ok(/v1\.0\.0/.test(rep) && /app\.js line 3/.test(rep) && !/secret|Secret|EURUSD|\/Users/.test(rep), 'report: no folder path, no trades');

// ---------- page rules ----------
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, 'assets/app.js'), 'utf8');
const all = html + app + fs.readFileSync(path.join(__dirname, 'assets/logic.js'), 'utf8') + fs.readFileSync(path.join(__dirname, 'assets/data.js'), 'utf8');
// 11/4 将さんOK：アクセス解析（GA4）だけ許可。GAの決まった部分を取り除いてから、今までの「外部通信なし」を確かめる
const GA = require(path.join(__dirname, '..', '..', 'assets', 'ga-test-helper.js')).stripGA(html);
eq(GA.problems, [], 'GA only, in the fixed form (tag, CSP, note)');
eq((GA.html.match(/<script[^>]*src="[^"]+"/g) || []).every(t => !/https?:/.test(t)), true, 'no external scripts except GA');
const csp = (GA.html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
ok(/default-src 'none'/.test(csp) && /connect-src 'none'/.test(csp) && /form-action 'none'/.test(csp) && !/https?:/.test(csp), 'CSP: no network');
eq((GA.html.match(/https?:\/\/[^"'\s)]+/g) || []), [], 'no external URLs in the page');
eq(/googletagmanager|gtag|ads-inter|a8\.net|adsbygoogle|fonts\.googleapis/.test(GA.html + app), false, 'no ads or web fonts; no analytics except GA');
eq(/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|importScripts/.test(all), false, 'nothing sends data');
eq(/noindex/.test(html), false, 'public (indexable)');
ok(html.includes('Record-keeping tool. Not financial advice. No signals.'), 'disclaimer line');
eq(/pass your challenge|profitable|win more|guarantee|get funded|signal service|FTMO|\bAI\b|artificial intelligence/i.test(all.replace(/No signals/g, '')), false, 'no promises, firm names or AI wording');
ok(/fictional/i.test(html) && /fictional/i.test(fs.readFileSync(path.join(__dirname, 'assets/data.js'), 'utf8')), 'sample marked fictional');
ok(/MisaNeco Works/.test(html), 'brand');
ok((app.match(/localStorage\.(getItem|setItem)/g) || []).length === 2 && /try \{\s*var raw = localStorage/.test(app) && /try \{ localStorage\.setItem/.test(app), 'localStorage inside try');
[...app.matchAll(/\$\('#([\w-]+)'\)/g)].map(m => m[1]).filter((v, i, a) => a.indexOf(v) === i).forEach(id => ok(html.includes('id="' + id + '"') || app.includes('id="' + id + '"'), 'id exists: ' + id));
ok(!/<script>/.test(html) && !/ on[a-z]+="/.test(html), 'no inline scripts or handlers (CSP)');
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
