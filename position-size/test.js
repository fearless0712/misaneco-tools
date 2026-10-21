/* Position size calculator checks: node position-size/test.js */
const S = require('./logic.js'), fs = require('fs');
let p = 0, f = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) p++; else { f++; console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); } };
const near = (a, b, m, e) => { if (Math.abs(a - b) <= (e || 1e-6)) p++; else { f++; console.log('FAIL', m, a, b); } };
const C = o => S.calc(Object.assign({ balance: '10000', riskMode: 'pct', risk: '1', pip: '0.0001', rate: '', side: 'buy', entry: '1.0850', stop: '1.0825', target: '', spread: '', step: '1000', lot: '100000', lev: '30' }, o));

// parsing
eq(S.num('10,000'), 10000, 'comma'); eq(S.num('$2'), 2, 'dollar'); eq(S.num('2%'), 2, 'percent');
eq(S.num(''), null, 'empty'); eq(Number.isNaN(S.num('-1')), true, 'negative'); eq(Number.isNaN(S.num('1.2.3')), true, 'two dots');
near(S.num('1/150'), 1 / 150, 'fraction'); eq(Number.isNaN(S.num('1/0')), true, 'divide by zero');

// page example: $10,000, 1% ($100), EUR/USD buy 1.0850, stop 1.0825 -> 25 pips, $4/pip... 40,000 units = 0.4 lots, loss $100
let r = C({});
eq([r.state, r.pips, r.units, r.lots], ['ok', 25, 40000, 0.4], 'basic');
near(r.riskAmt, 100, 'risk amount'); near(r.loss, 100, 'loss'); near(r.pipValueLot, 10, 'pip value per standard lot');
near(r.margin, 40000 * 1.085 / 30, 'margin'); near(r.lossPct, 1, 'loss %');
eq(C({ riskMode: 'amt', risk: '100' }).units, 40000, 'amount mode');
// sell
r = C({ side: 'sell', entry: '1.0850', stop: '1.0875' });
eq([r.state, r.pips, r.units], ['ok', 25, 40000], 'sell');
// direction errors
eq(C({ stop: '1.0900' }).state, 'error', 'buy stop above');
eq(C({ side: 'sell', stop: '1.0800' }).state, 'error', 'sell stop below');
eq(C({ stop: '1.0850' }).state, 'error', 'stop = entry');
// spread widens the stop -> fewer units: 25 + 1 = 26 pips, 100 / (26*0.0001) = 38,461 -> 38,000
r = C({ spread: '1' }); eq([r.pips, r.units], [26, 38000], 'spread');
// JPY pair with USD account: USD/JPY 150.25 -> 149.95 (30 pips), rate 1/149.95 per JPY
r = C({ pip: '0.01', entry: '150.25', stop: '149.95', rate: '1/149.95' });
eq([r.state, r.pips, r.units], ['ok', 30, 49000], 'USD/JPY in USD account');
near(r.loss, 49000 * 0.30 / 149.95, 'jpy loss', 1e-6);
// GBP account trading EUR/USD: 1 USD = 0.75 GBP
r = C({ rate: '0.75' }); eq(r.units, 53000, 'GBP account'); near(r.loss, 53000 * 0.0025 * 0.75, 'gbp loss');
// take profit and R:R
r = C({ target: '1.0900' }); eq([r.tpPips, r.rr], [50, 2], 'take profit'); near(r.profit, 200, 'profit');
eq(C({ target: '1.0800' }).targetErr !== undefined, true, 'tp wrong side');
// too small
eq(C({ risk: '0.01', stop: '1.0750' }).tooSmall, true, 'too small');
// margin short
eq(C({ risk: '50', stop: '1.0849' }).marginShort, true, 'margin short');
// bad input
eq(C({ balance: 'abc' }).state, 'error', 'text'); eq(C({ risk: '100' }).state, 'error', '100%');
eq(C({ riskMode: 'amt', risk: '20000' }).state, 'error', 'risk > balance'); eq(C({ balance: '' }).state, 'empty', 'empty');
eq(C({ rate: '0' }).state, 'error', 'zero rate');
// page: no ads, no external links except GA, CSP present
const html = fs.readFileSync(__dirname + '/index.html', 'utf8').replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '');
eq(/a8\.net|ads-inter/.test(html), false, 'no ads on English page');
eq((html.match(/https?:\/\/[^"'\s<)]+/g) || []).filter(u => !/^https:\/\/(tools\.equaglobal\.com|equaglobal\.com|www\.googletagmanager\.com|schema\.org|line\.me)/.test(u)), [], 'no unexpected external URLs');
console.log(`${p} passed, ${f} failed`); process.exit(f ? 1 : 0);
