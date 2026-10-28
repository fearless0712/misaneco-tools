/* Freelance rate calculator tests: node freelance-rate/test.js */
const R = require('./logic.js'), fs = require('fs'), path = require('path');
let p = 0, f = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) p++; else { f++; console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); } };
const near = (a, b, m, e) => { if (Math.abs(a - b) <= (e || 1e-6)) p++; else { f++; console.log('FAIL', m, a, b); } };
const BASE = { currency: 'USD', period: 'year', income: '40000', expenses: '3000', setAside: '25', weeks: '48', hours: '40', billable: '60',
  rate: '', projHours: '40', buffer: '15', platform: '10', transferPct: '1', transferFixed: '0' };
const RT = o => R.calcRate(Object.assign({}, BASE, o));
const PJ = (o, fb) => R.calcProject(Object.assign({}, BASE, o), fb);

// parsing
eq(R.num('40,000'), 40000, 'comma'); eq(R.num('$3,000'), 3000, 'dollar'); eq(R.num('25%'), 25, 'percent');
eq(R.num('₱600,000'), 600000, 'peso sign'); eq(R.num('PHP 600000'), 600000, 'PHP code'); eq(R.num('A$120'), 120, 'A$');
eq(R.num('0.5'), 0.5, 'decimal'); eq(R.num('.5'), 0.5, 'leading dot'); eq(R.num(''), null, 'empty'); eq(R.num('  '), null, 'spaces');
eq(Number.isNaN(R.num('-1')), true, 'negative'); eq(Number.isNaN(R.num('abc')), true, 'text'); eq(Number.isNaN(R.num('1.2.3')), true, 'two dots');

// Example 1 (page example): 40,000 / 0.75 + 3,000 = 56,333.33; 48 x 40 x 60% = 1,152 h; 48.9005 -> 48.91 (rounded up)
let r = RT({});
eq([r.state, r.incomeYear, r.billHours, r.workHours, r.rate], ['ok', 40000, 1152, 1920, 48.91], 'example 1');
near(r.revenue, 56333.333333, 'example 1 revenue', 1e-5); near(r.setAside, 13333.333333, 'example 1 set aside', 1e-5);
near(r.exact, 48.900463, 'example 1 exact rate', 1e-6); near(r.revenueMonth, 4694.444444, 'example 1 per month', 1e-5);
eq(R.money(r.rate, 'USD'), '$48.91', 'example 1 display');
// Example 2: 2,000 a month (24,000 a year), no expenses, 0% set aside, 50 x 20 x 100% = 1,000 h -> exactly 24.00
r = RT({ period: 'month', income: '2000', expenses: '0', setAside: '0', weeks: '50', hours: '20', billable: '100' });
eq([r.state, r.monthly, r.incomeYear, r.billHours, r.rate, r.exact], ['ok', true, 24000, 1000, 24, 24], 'example 2 (monthly, exact)');
// Example 3 (PHP): 600,000 / 0.8 + 60,000 = 810,000; 46 x 30 x 50% = 690 h; 1,173.913 -> 1,173.92
r = RT({ currency: 'PHP', income: '600,000', expenses: '60,000', setAside: '20', weeks: '46', hours: '30', billable: '50' });
eq([r.revenue, r.billHours, r.rate], [810000, 690, 1173.92], 'example 3 (PHP)');
eq(R.money(r.rate, 'PHP'), '₱1,173.92', 'example 3 display');
// Example 4 (JPY, billable 1%): 4,000,000 / 0.7 + 500,000 = 6,214,285.71; 48 x 40 x 1% = 19.2 h; 323,660.71 -> 323,661
r = RT({ currency: 'JPY', income: '4000000', expenses: '500000', setAside: '30', weeks: '48', hours: '40', billable: '1' });
eq([r.billHours, r.rate], [19.2, 323661], 'example 4 (JPY, 1%)');
eq(R.money(r.rate, 'JPY'), '¥323,661', 'example 4 display, no decimals');
// billable 100% with the default goal: 56,333.33 / 1,920 = 29.3403 -> 29.35
r = RT({ billable: '100' }); eq([r.billHours, r.rate], [1920, 29.35], 'billable 100%');
// expenses and set aside left empty count as 0
r = RT({ expenses: '', setAside: '' }); eq([r.state, r.revenue, r.billHours], ['ok', 40000, 1152], 'optional fields empty'); near(r.exact, 34.722222, 'optional empty rate', 1e-6);
eq(RT({ expenses: '', setAside: '' }).rate, 34.73, 'rounded up');

// errors and empty fields
eq(RT({ income: '' }).state, 'empty', 'income empty');
eq(/Income goal/.test(RT({ income: '', weeks: '' }).error) && /Working weeks/.test(RT({ income: '', weeks: '' }).error), true, 'empty message names the fields');
eq(RT({ billable: '' }).state, 'empty', 'billable empty');
[['income', '0'], ['income', '-100'], ['income', 'abc'], ['expenses', '-5'], ['setAside', '100'], ['setAside', '150'], ['setAside', '-1'],
 ['weeks', '0'], ['weeks', '53'], ['hours', '0'], ['hours', '169'], ['billable', '0'], ['billable', '101'], ['billable', '-60']]
  .forEach(([k, v]) => eq(RT({ [k]: v }).state, 'error', 'error ' + k + '=' + v));
eq(RT({ weeks: '52', hours: '168', billable: '100' }).state, 'ok', 'upper limits are allowed');
eq(RT({ setAside: '99.9' }).state, 'ok', 'set aside 99.9% allowed');

// project price and fees: 50/h x 40 h + 15% = 46 h = 2,300; platform 10% = 230; transfer 1% of 2,070 + 3 = 23.70; take-home 2,046.30
let q = PJ({ rate: '50', transferFixed: '3' });
eq([q.state, q.ownRate, q.bufHours, q.price, q.platformFee, q.afterPlatform, q.transferFee, q.fees, q.takeHome],
  ['ok', true, 46, 2300, 230, 2070, 23.7, 253.7, 2046.3], 'project 1');
near(q.effRate, 51.1575, 'effective rate on 40 h'); near(q.effRateBuf, 2046.3 / 46, 'effective rate with buffer');
eq(q.grossUp, 56.12, 'rate to cover % fees: 50 / (0.9 x 0.99) = 56.117 -> 56.12');
// fees 0%: take-home = price
q = PJ({ rate: '50', platform: '0', transferPct: '0', transferFixed: '0' });
eq([q.price, q.fees, q.takeHome, q.effRate, q.grossUp], [2300, 0, 2300, 57.5, 50], 'fees 0%');
q = PJ({ rate: '50', platform: '', transferPct: '', transferFixed: '', buffer: '' });
eq([q.state, q.bufHours, q.price, q.takeHome], ['ok', 40, 2000, 2000], 'fees and buffer empty = 0');
// cents: 33.33 x 7 h = 233.31; 20% = 46.662 -> 46.66; take-home 186.65
q = PJ({ rate: '33.33', projHours: '7', buffer: '0', platform: '20', transferPct: '0' });
eq([q.price, q.platformFee, q.takeHome], [233.31, 46.66, 186.65], 'cents rounding');
// JPY: 3,333 x 3.3 h = 10,998.9 -> 10,999; 5% = 549.95 -> 550; fixed 500 -> 9,949
q = PJ({ currency: 'JPY', rate: '3333', projHours: '3', buffer: '10', platform: '5', transferPct: '0', transferFixed: '500' });
eq([q.bufHours, q.price, q.platformFee, q.transferFee, q.takeHome], [3.3, 10999, 550, 500, 9949], 'JPY project, whole yen');
// required rate is used when the rate field is empty (default example: 46 x 48.91 = 2,249.86 ... take-home 2,004.62)
q = PJ({}, 48.91);
eq([q.ownRate, q.price, q.platformFee, q.transferFee, q.takeHome], [false, 2249.86, 224.99, 20.25, 2004.62], 'default project');
eq([R.money(q.effRate, 'USD'), R.money(q.effRateBuf, 'USD')], ['$50.12', '$43.58'], 'default effective rates');
// project errors
eq(PJ({ projHours: '' }, 48.91).state, 'empty', 'no hours'); eq(PJ({}, null).state, 'empty', 'no rate at all');
[['projHours', '0'], ['projHours', '-3'], ['rate', '0'], ['rate', '-10'], ['buffer', '-5'], ['buffer', '600'], ['platform', '100'], ['transferPct', '100'], ['transferFixed', '-1'], ['platform', 'x']]
  .forEach(([k, v]) => eq(PJ({ [k]: v }, 48.91).state, 'error', 'project error ' + k + '=' + v));
q = PJ({ rate: '10', projHours: '1', buffer: '0', platform: '0', transferPct: '0', transferFixed: '20' });
eq([q.takeHome, q.lost], [-10, true], 'fees larger than the price');
// combined
let c = R.calc(BASE);
eq([c.rate.rate, c.project.price, c.project.takeHome], [48.91, 2249.86, 2004.62], 'calc() uses the required rate');
c = R.calc(Object.assign({}, BASE, { income: '' }));
eq([c.rate.state, c.project.state], ['empty', 'empty'], 'no goal and no own rate');
c = R.calc(Object.assign({}, BASE, { income: '', rate: '30' }));
eq([c.rate.state, c.project.state, c.project.price], ['empty', 'ok', 1380], 'own rate works without the goal');

// currency display
eq(['USD', 'PHP', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'].map(k => R.money(1234567.891, k)),
  ['$1,234,567.89', '₱1,234,567.89', '€1,234,567.89', '£1,234,567.89', 'A$1,234,567.89', 'C$1,234,567.89', '¥1,234,568'], 'all currencies');
eq([R.money(0, 'USD'), R.money(5, 'PHP'), R.money(0.005, 'USD'), R.money(999.5, 'JPY'), R.money(-12.5, 'EUR'), R.money(100, 'XXX')],
  ['$0.00', '₱5.00', '$0.01', '¥1,000', '-€12.50', '$100.00'], 'money edge cases');
eq([R.hrs(1152), R.hrs(19.2), R.hrs(3.25), R.hrs(1000)], ['1,152', '19.2', '3.25', '1,000'], 'hours display');
eq(Object.keys(R.CURRENCIES), ['USD', 'PHP', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'], 'currency list');

// copy text
let t = R.text(R.calc(BASE), BASE).split('\n');
eq(t[0], 'Freelance rate calculation (USD)', 'copy title');
eq(t.includes('Required hourly rate: $48.91 (minimum)'), true, 'copy required rate');
eq(t.some(l => l.startsWith('Suggested project price: $2,249.86')), true, 'copy price');
eq(t.includes('Take-home after fees: $2,004.62'), true, 'copy take-home');
eq(t.includes('Effective hourly rate: $50.12 on 40 h, $43.58 if the buffer is used'), true, 'copy effective rate');
eq(/not tax advice/.test(t[t.length - 1]), true, 'copy ends with the note');
const PH = Object.assign({}, BASE, { currency: 'PHP', income: '600000', expenses: '60000', setAside: '20', weeks: '46', hours: '30', billable: '50' });
eq(R.text(R.calc(PH), PH).includes('Required hourly rate: ₱1,173.92'), true, 'copy in PHP');
const JP = Object.assign({}, BASE, { currency: 'JPY' });
eq(/¥\d[\d,]*\./.test(R.text(R.calc(JP), JP)), false, 'copy in JPY has no decimals');

// page
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), js = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const lg = fs.readFileSync(path.join(__dirname, 'logic.js'), 'utf8');
eq(/<html lang="en">/.test(html), true, 'lang=en');
eq(/Content-Security-Policy/.test(html), true, 'CSP'); eq(/innerHTML/.test(js + lg), false, 'no innerHTML');
eq(/fetch\(|XMLHttpRequest|sendBeacon/.test(js + lg), false, 'input is not sent');
eq(/a8\.net|ads-inter|mnad-/.test(html), false, 'no ads on English page');
eq(/G-EWJXRJY9M6/.test(html) && /assets\/ga\.js/.test(html), true, 'GA4');
eq(/[぀-ヿ一-鿿]/.test(html + js + lg), false, 'English only');
eq(/application\/ld\+json/.test(html), true, 'JSON-LD'); eq(html.includes('<link rel="canonical" href="https://tools.equaglobal.com/freelance-rate/">'), true, 'canonical');
eq(/never sent/.test(html) && /Nothing you enter is sent anywhere/.test(html), true, 'says nothing is sent');
eq(/Eternal Philosophy &gt; EQUA &gt; MisaNeco Works/.test(html), true, 'operator hierarchy');
eq(/Built with AI|help of AI|AI assistance/.test(html), false, 'no AI wording');
eq(/Set aside % is your own estimate &mdash; check your local tax rules/.test(html), true, 'tax note');
eq(/Upwork|Fiverr|PayPal|Wise|Payoneer|GCash/i.test(html + js + lg), false, 'no platform names');
['../jobcost/', '../home-office/', '../workdays/', '../blog/en-w9-1099-nec-freelancers/'].forEach(u => {
  eq(html.includes('href="' + u + '"'), true, 'link ' + u);
  eq(fs.existsSync(path.join(__dirname, u, 'index.html')), true, 'link target exists ' + u);
});
eq((html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '').match(/https?:\/\/[^"'\s<)]+/g) || []).filter(u => !/^https:\/\/(tools\.equaglobal\.com|www\.googletagmanager\.com|schema\.org)/.test(u)), [], 'no unexpected external URLs');
[...js.matchAll(/\$\('([\w-]+)'\)/g)].map(m => m[1]).forEach(id => eq(html.includes('id="' + id + '"'), true, 'id: ' + id));
['currency', 'period', 'income', 'expenses', 'setAside', 'weeks', 'hours', 'billable', 'rate', 'projHours', 'buffer', 'platform', 'transferPct', 'transferFixed']
  .forEach(id => eq(html.includes('id="' + id + '"') && js.includes("'" + id + "'"), true, 'field ' + id));
Object.keys(R.CURRENCIES).forEach(k => eq(html.includes('<option value="' + k + '">'), true, 'currency option ' + k));
// example in the page matches the calculation
['$56,333.33', '1,152 hours', '$48.91', '$2,249.86', '$224.99', '$20.25', '$2,024.87', '$2,004.62', '$50.12', '$43.58'].forEach(s => eq(html.includes(s), true, 'page example ' + s));
// default values in app.js match the page example
eq(/income: '40000', expenses: '3000', setAside: '25', weeks: '48', hours: '40', billable: '60'/.test(js), true, 'defaults');
const site = path.join(__dirname, '..');
eq(fs.readFileSync(path.join(site, 'sitemap.xml'), 'utf8').includes('<loc>https://tools.equaglobal.com/freelance-rate/</loc>'), true, 'in sitemap');
eq(fs.readFileSync(path.join(site, 'assets', 'ads-inter.test.js'), 'utf8').includes("'freelance-rate/index.html'"), true, 'in the English page list of ads-inter.test.js');
console.log(p + ' passed, ' + f + ' failed'); process.exit(f ? 1 : 0);
