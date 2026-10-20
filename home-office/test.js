/* node home-office/test.js */
const H = require('./logic.js'), fs = require('fs');
let p = 0, f = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) p++; else { f++; console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); } };

// num
eq(H.num('1,234.50'), 1234.5, 'num commas'); eq(H.num('$99'), 99, 'num $'); eq(H.num('£ 12'), 12, 'num £ space');
eq(H.num(''), null, 'num empty'); eq(H.num('  '), null, 'num blank');
eq(Number.isNaN(H.num('-5')), true, 'negative is NaN'); eq(Number.isNaN(H.num('abc')), true, 'text NaN');
eq(Number.isNaN(H.num('1.2.3')), true, '1.2.3 NaN'); eq(H.num('.5'), 0.5, '.5'); eq(H.num('20%'), 20, 'percent sign');

// share
eq(H.share('12', '60'), { ratio: 0.2 }, 'area 12/60'); eq(H.share('', '60'), { error: 'empty' }, 'share empty');
eq(H.share('70', '60'), { error: 'bigger' }, 'part > whole'); eq(H.share('1', '0'), { error: 'zero' }, 'zero whole');
eq(H.share('x', '60'), { error: 'number' }, 'bad number'); eq(H.share('0', '60'), { ratio: 0 }, 'zero part ok');
eq(H.pctRatio('40'), { ratio: 0.4 }, 'pct 40'); eq(H.pctRatio('101'), { error: 'over100' }, 'pct over 100'); eq(H.pctRatio(''), { error: 'empty' }, 'pct empty');

// line
let r = H.line('1,500', 0.2);
eq([r.state, r.monthAmt, r.monthBiz, r.yearAmt, r.yearBiz], ['ok', 150000, 30000, 1800000, 360000], 'rent 1500 x 20%');
r = H.line('79.99', 1 / 3); eq(r.monthBiz, 2666, '79.99/3 = 26.663 -> 26.66'); eq(r.yearBiz, 31992, 'year = 12 x month');
r = H.line('0.57', 1); eq(r.monthBiz, 57, '0.57 float safe');
r = H.line('100', 0.575); eq(r.monthBiz, 5750, '57.5%');
r = H.line('1.005', 1); eq(r.monthAmt, 101, '1.005 rounds to 1.01 (not float 1.00)');
eq(H.line('', 0.2).state, 'empty', 'line empty'); eq(H.line('x', 0.2).state, 'error', 'line bad');
eq(H.line('10', null).state, 'error', 'line no ratio');

// US simplified
eq(H.usSimplified('200', 'sqft').cents, 100000, '200 sq ft = $1,000');
eq(H.usSimplified('400', 'sqft').cents, 150000, 'cap 300 sq ft = $1,500');
eq(H.usSimplified('300', 'sqft').cents, 150000, 'exactly 300');
eq(H.usSimplified('10', 'm2').cents, Math.round(107.639 * 500), '10 m2 -> 107.639 sq ft');
eq(H.usSimplified('', 'sqft'), null, 'us empty'); eq(H.usSimplified('x', 'sqft'), null, 'us bad');

// UK flat rate
eq([24, 25, 50, 51, 100, 101, 200].map(h => H.ukMonth(String(h))), [0, 10, 10, 18, 18, 26, 26], 'uk bands');
eq(H.ukMonth('50.9'), 10, 'partial hours round down'); eq(H.ukMonth(''), null, 'uk empty');
eq(H.ukYear('60', '12'), 21600, '£18 x 12 = £216'); eq(H.ukYear('60', '13'), null, 'months > 12');
eq(H.ukYear('60', '0'), null, 'months 0'); eq(H.ukYear('60', '6.5'), null, 'months not whole');

// money / pct
eq(H.money(123456789, '$'), '$1,234,567.89', 'money'); eq(H.money(5, '£'), '£0.05', 'money pence');
eq(H.fmtPct(0.2), '20%', 'pct 20'); eq(H.fmtPct(1 / 3), '33.3%', 'pct third');

// page checks
const html = fs.readFileSync(__dirname + '/index.html', 'utf8'), js = fs.readFileSync(__dirname + '/app.js', 'utf8');
eq(/lang="en"/.test(html), true, 'lang en'); eq(/Content-Security-Policy/.test(html), true, 'CSP');
eq(/a8\.net|ads-inter/.test(html), false, 'no ads on English page');
eq(/irs\.gov/.test(html) && /gov\.uk/.test(html), true, 'sources linked');
eq(/innerHTML/.test(js), false, 'no innerHTML');
const ids = [...js.matchAll(/\$\('([\w-]+)'\)/g)].map(m => m[1]);
ids.forEach(id => eq(html.includes('id="' + id + '"'), true, 'id exists: ' + id));

console.log(p + ' passed, ' + f + ' failed'); process.exit(f ? 1 : 0);
