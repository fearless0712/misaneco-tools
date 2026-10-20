/* Prorated rent calculator tests: node prorate/test.js */
const P = require('./logic.js'), fs = require('fs');
let p = 0, f = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) p++; else { f++; console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); } };
const C = o => P.calc(Object.assign({ amount: '', from: '', to: '', mode: 'nearest', basis: 'month' }, o));

eq(P.num('$1,500.50'), 1500.5, 'num $ and comma'); eq(P.num(''), null, 'empty'); eq(Number.isNaN(P.num('-5')), true, 'negative');
eq(Number.isNaN(P.num('1.234')), true, '3 decimals'); eq(Number.isNaN(P.num('abc')), true, 'text'); eq(P.num('£900'), 900, 'pound');
eq(P.parseDate('2026-02-29'), null, 'no Feb 29 2026'); eq(P.daysIn(2028, 2), 29, 'leap Feb');
// worked example on the page: $1,500, Oct 21-31
eq(C({ amount: '1500', from: '2026-10-21', to: '2026-10-31' }).total, 53226, 'month basis 532.26');
eq(C({ amount: '1500', from: '2026-10-21', to: '2026-10-31', basis: '30' }).total, 55000, '30-day 550.00');
eq(C({ amount: '1500', from: '2026-10-21', to: '2026-10-31', basis: 'year' }).total, 54247, 'year 542.47');
eq(C({ amount: '1500', from: '2026-10-21', to: '2026-10-31', mode: 'down' }).total, 53225, 'round down');
eq(C({ amount: '1500', from: '2026-10-21', to: '2026-10-31', basis: 'year', mode: 'down' }).total, 54246, 'year down');
eq(C({ amount: '1000', from: '2026-10-01', to: '2026-10-01', mode: 'up' }).total, 3226, 'up 32.258 -> 32.26');
eq(C({ amount: '1000', from: '2026-10-01', to: '2026-10-01', mode: 'down' }).total, 3225, 'down 32.25');
// half-cent: $1 for 1 of 2... use 30-day: 0.01 * 15/30 = 0.005 -> nearest 0.01
eq(P.prorate(1, 15, 30, 'nearest'), 1, 'half cent up'); eq(P.prorate(1, 15, 30, 'down'), 0, 'half cent down');
// full months are full rent in every basis
['month', '30', 'year'].forEach(b => {
  eq(C({ amount: '1500', from: '2026-02-01', to: '2026-02-28', basis: b }).total, 150000, 'full Feb ' + b);
  eq(C({ amount: '1500', from: '2026-10-01', to: '2026-10-31', basis: b }).total, 150000, 'full Oct ' + b);
});
// 30-day basis never exceeds rent on 31-day partial (Oct 1-30 = 30 days -> capped use 30 -> full rent)
eq(C({ amount: '1500', from: '2026-10-01', to: '2026-10-30', basis: '30' }).total, 150000, '30 days in 31-day month');
// year basis partial never exceeds rent (Jan 1-30: 1500*12/365*30=1479.45)
eq(C({ amount: '1500', from: '2026-01-01', to: '2026-01-30', basis: 'year' }).total, 147945, 'year Jan 30 days');
// spans months: Oct 21 - Dec 10, month basis: 532.26 + 1500 + 1500*10/31=483.87
let r = C({ amount: '1500', from: '2026-10-21', to: '2026-12-10' });
eq([r.rows.length, r.rows[1].full, r.rows[2].cents, r.total, r.days], [3, true, 48387, 53226 + 150000 + 48387, 51], 'span months');
// year end
r = C({ amount: '3100', from: '2026-12-31', to: '2027-01-01' });
eq([r.rows.map(x => x.y + '/' + x.m), r.total], [['2026/12', '2027/1'], 20000], 'year end 100+100');
// move-out: Nov 1-15 of 30 days -> half
eq(C({ amount: '1500', from: '2026-11-01', to: '2026-11-15' }).total, 75000, 'move-out half');
// errors
eq(C({ amount: '', from: '2026-10-01', to: '2026-10-02' }).state, 'empty', 'no rent');
eq(C({ amount: '1500', from: '2026-10-10', to: '2026-10-01' }).state, 'error', 'reversed');
eq(C({ amount: '1500', from: '2026-02-30', to: '2026-03-01' }).state, 'error', 'bad date');
eq(C({ amount: '1500', from: '2026-01-01', to: '2030-01-01' }).state, 'error', 'too long');
eq(C({ amount: '1500', from: '2026-10-01', to: '2026-10-02', basis: 'zzz' }).basis, 'month', 'bad basis falls back');
eq(P.money(123456789), '$1,234,567.89', 'money'); eq(P.money(5), '$0.05', 'money cents');
// page checks
const html = fs.readFileSync(__dirname + '/index.html', 'utf8'), js = fs.readFileSync(__dirname + '/app.js', 'utf8');
eq(/Content-Security-Policy/.test(html), true, 'CSP'); eq(/innerHTML/.test(js), false, 'no innerHTML');
eq(/a8\.net|ads-inter/.test(html), false, 'no Japanese ads on English page');
eq(/application\/ld\+json/.test(html), true, 'JSON-LD'); eq(/\$532\.26/.test(html) && /\$542\.47/.test(html) && /\$550\.00/.test(html), true, 'worked example matches');
[...js.matchAll(/\$\('([\w-]+)'\)/g)].map(m => m[1]).forEach(id => eq(html.includes('id="' + id + '"'), true, 'id: ' + id));
console.log(p + ' passed, ' + f + ' failed'); process.exit(f ? 1 : 0);
