/* Invoice due date calculator tests: node due-date/test.js */
const D = require('./logic.js'), fs = require('fs'), path = require('path');
let p = 0, f = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) p++; else { f++; console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); } };
const near = (a, b, m, e) => { if (Math.abs(a - b) <= (e || 1e-9)) p++; else { f++; console.log('FAIL', m, a, b); } };
const due = (inv, terms, o) => { const r = D.calc(Object.assign({ invoiceDate: inv, terms: terms, weekend: 'keep' }, o || {})); return r.state === 'ok' ? D.iso(r.due) : r.state + ': ' + r.error; };

// dates
eq(D.iso(D.parseDate('2026-10-05')), '2026-10-05', 'iso date'); eq(D.iso(D.parseDate('2026/1/5')), '2026-01-05', 'slashes');
eq(D.iso(D.parseDate('10/5/2026')), '2026-10-05', 'US order MM/DD/YYYY'); eq(D.iso(D.parseDate('02/29/2028')), '2028-02-29', 'US leap day');
eq(D.parseDate('2027-02-29'), null, 'no Feb 29 in 2027'); eq(D.parseDate('2026-13-01'), null, 'month 13'); eq(D.parseDate('31/12/2026'), null, 'DD/MM is not read');
eq(D.parseDate(''), null, 'empty date'); eq(D.parseDate('abc'), null, 'text date');
eq(D.WD[D.wday(D.parseDate('2026-10-05'))], 'Mon', 'Oct 5 2026 is a Monday'); eq(D.WD[D.wday(D.parseDate('2026-10-31'))], 'Sat', 'Oct 31 2026 is a Saturday');
eq(D.fmt(D.parseDate('2026-11-04')), 'Wed, Nov 4, 2026', 'format');

// Net N, by hand
eq(due('2026-10-05', 'net30'), '2026-11-04', 'Oct 5 + 30 (Oct has 31 days: 26 + 4) = Nov 4');
eq(due('2026-10-05', 'net7'), '2026-10-12', 'Net 7'); eq(due('2026-10-05', 'net10'), '2026-10-15', 'Net 10'); eq(due('2026-10-05', 'net15'), '2026-10-20', 'Net 15');
eq(due('2026-10-05', 'net45'), '2026-11-19', 'Net 45 (26 + 19)'); eq(due('2026-10-05', 'net60'), '2026-12-04', 'Net 60 (26 + 30 + 4)');
eq(due('2026-10-05', 'net90'), '2027-01-03', 'Net 90 (26 + 30 + 31 + 3)'); eq(due('2026-10-05', 'receipt'), '2026-10-05', 'Due on receipt');
// month ends: Jan 31 + 30
eq(due('2027-01-31', 'net30'), '2027-03-02', 'Jan 31 2027 + 30 = Mar 2 (Feb has 28 days)');
eq(due('2028-01-31', 'net30'), '2028-03-01', 'Jan 31 2028 + 30 = Mar 1 (leap year)');
eq(due('2026-12-31', 'net30'), '2027-01-30', 'over the year end');
eq(due('2100-01-31', 'net30'), '2100-03-02', '2100 is not a leap year');
eq(due('2000-01-31', 'net30'), '2000-03-01', '2000 is a leap year');
// EOM edges
eq(due('2026-02-01', 'eom'), '2026-02-28', 'EOM Feb 1 -> Feb 28'); eq(due('2026-02-28', 'eom'), '2026-02-28', 'EOM on the last day stays');
eq(due('2028-02-10', 'eom'), '2028-02-29', 'EOM leap Feb'); eq(due('2026-04-30', 'eom'), '2026-04-30', 'EOM Apr 30'); eq(due('2026-12-31', 'eom'), '2026-12-31', 'EOM Dec 31');
eq(due('2026-05-01', 'eom'), '2026-05-31', 'EOM May 1');
// Net 30 EOM
eq(due('2026-10-23', 'net30eom'), '2026-11-30', 'Oct 31 + 30 = Nov 30'); eq(due('2026-10-01', 'net30eom'), '2026-11-30', 'any day in October -> Nov 30');
eq(due('2027-01-15', 'net30eom'), '2027-03-02', 'Jan 31 + 30 = Mar 2'); eq(due('2026-02-14', 'net30eom'), '2026-03-30', 'Feb 28 + 30 = Mar 30');
eq(due('2026-12-05', 'net30eom'), '2027-01-30', 'Dec 31 + 30 = Jan 30');
// 15th of next month
eq(due('2026-12-10', '15th'), '2027-01-15', 'December -> Jan 15 next year'); eq(due('2026-01-31', '15th'), '2026-02-15', 'Jan 31 -> Feb 15');
eq(due('2026-10-15', '15th'), '2026-11-15', 'on the 15th -> next month'); eq(due('2026-12-31', '15th'), '2027-01-15', 'Dec 31 -> Jan 15');
// custom
eq(due('2026-10-05', 'custom', { customDays: '21' }), '2026-10-26', 'custom 21'); eq(due('2026-10-05', 'custom', { customDays: '0' }), '2026-10-05', 'custom 0 = receipt');
eq(D.calc({ invoiceDate: '2026-10-05', terms: 'custom', customDays: '' }).state, 'empty', 'custom empty');
eq(D.calc({ invoiceDate: '2026-10-05', terms: 'custom', customDays: '2.5' }).state, 'error', 'custom not whole');
eq(D.calc({ invoiceDate: '2026-10-05', terms: 'custom', customDays: '-3' }).state, 'error', 'custom negative');
eq(D.calc({ invoiceDate: '2026-10-05', terms: 'custom', customDays: '1000' }).state, 'error', 'custom too large');
eq(D.calc({ invoiceDate: '', terms: 'net30' }).state, 'empty', 'no invoice date'); eq(D.calc({ invoiceDate: '2026-02-30', terms: 'net30' }).state, 'error', 'bad invoice date');

// weekends: Oct 1 2026 + 30 = Sat Oct 31
eq(due('2026-10-01', 'net30'), '2026-10-31', 'keep Saturday');
eq(due('2026-10-01', 'net30', { weekend: 'prev' }), '2026-10-30', 'Saturday -> Friday'); eq(due('2026-10-01', 'net30', { weekend: 'next' }), '2026-11-02', 'Saturday -> Monday');
eq(due('2026-10-02', 'net30', { weekend: 'prev' }), '2026-10-30', 'Sunday Nov 1 -> Friday Oct 30'); eq(due('2026-10-02', 'net30', { weekend: 'next' }), '2026-11-02', 'Sunday -> Monday');
eq(due('2026-10-05', 'net30', { weekend: 'prev' }), '2026-11-04', 'weekday not moved'); eq(due('2026-10-05', 'net30', { weekend: 'next' }), '2026-11-04', 'weekday not moved (next)');
eq(due('2026-02-14', 'eom', { weekend: 'next' }), '2026-03-02', 'EOM Sat Feb 28 -> Mon Mar 2 (crosses the month)');
eq(due('2026-10-03', 'receipt', { weekend: 'prev' }), '2026-10-03', 'never moved before the invoice date');
eq(due('2026-10-03', 'receipt', { weekend: 'next' }), '2026-10-05', 'receipt on Saturday -> Monday');
let r = D.calc({ invoiceDate: '2026-10-01', terms: 'net30', weekend: 'next' });
eq([r.moved, D.iso(r.rawDue), r.calDays, r.termDays], [true, '2026-10-31', 32, 30], 'moved flags');

// days left / overdue
r = D.calc({ invoiceDate: '2026-10-05', terms: 'net30', weekend: 'keep', today: '2026-10-23' });
eq([r.status.days, r.status.label], [12, '12 days left'], 'Oct 23 -> Nov 4: 8 + 4 = 12 days left');
r = D.calc({ invoiceDate: '2026-10-05', terms: 'net30', today: '2026-11-04' }); eq(r.status.label, 'Due today', 'due today');
r = D.calc({ invoiceDate: '2026-10-05', terms: 'net30', today: '2026-11-05' }); eq([r.status.days, r.status.overdue, r.status.label], [-1, true, '1 day overdue'], '1 day overdue');
r = D.calc({ invoiceDate: '2026-09-01', terms: 'net30', today: '2026-10-23' }); eq(r.status.label, '22 days overdue', 'Oct 1 -> Oct 23 = 22 days overdue');
r = D.calc({ invoiceDate: '2026-12-01', terms: 'net30', today: '2027-03-01' }); eq(r.status.label, '60 days overdue', 'Dec 31 -> Mar 1 2027: 31 + 28 + 1 = 60');
r = D.calc({ invoiceDate: '2026-10-05', terms: 'net30' }); eq(r.status, null, 'no today -> no status');

// early payment discount 2/10 Net 30
near(D.annualized(2, 30, 10), 0.02 / 0.98 * 365 / 20, '2/10 Net 30 formula'); eq(D.pct(D.annualized(2, 30, 10)), '37.24%', '2/10 Net 30 = 37.24%');
eq(D.pct(D.annualized(1, 30, 10)), '18.43%', '1/10 Net 30 = 1/99 x 365/20 = 18.43%');
eq(D.pct(D.annualized(2, 60, 10)), '14.90%', '2/10 Net 60 = 2/98 x 365/50 = 14.90%');
eq(D.annualized(0, 30, 10), null, '0% -> none'); eq(D.annualized(2, 10, 10), null, 'same period -> none');
r = D.calc({ invoiceDate: '2026-10-05', terms: 'net30', amount: '1,500', discPct: '2', discDays: '10', today: '2026-10-23' });
eq([D.iso(r.disc.deadline), r.disc.saving, r.disc.pay, D.pct(r.disc.apr), r.disc.status.label], ['2026-10-15', 30, 1470, '37.24%', '8 days overdue'], 'page example discount');
eq(D.money(r.disc.pay, 'USD'), '$1,470.00', 'discount display');
r = D.calc({ invoiceDate: '2026-10-05', terms: 'net30eom', discPct: '2', discDays: '10' });
eq([r.termDays, D.pct(r.disc.apr)], [56, D.pct(0.02 / 0.98 * 365 / 46)], 'discount with Net 30 EOM uses the real payment period (Oct 5 -> Nov 30 = 56 days)');
eq(!!D.calc({ invoiceDate: '2026-10-05', terms: 'net30', discPct: '2' }).discError, true, 'discount % without days');
eq(!!D.calc({ invoiceDate: '2026-10-05', terms: 'net10', discPct: '2', discDays: '10' }).discError, true, 'discount period not shorter');
eq(!!D.calc({ invoiceDate: '2026-10-05', terms: 'net30', discPct: '100', discDays: '10' }).discError, true, 'discount 100%');
eq(!!D.calc({ invoiceDate: '2026-10-05', terms: 'receipt', discPct: '2', discDays: '10' }).discError, true, 'discount on receipt');
eq(D.calc({ invoiceDate: '2026-10-05', terms: 'net30', discPct: '2', discDays: '10' }).disc.pay, undefined, 'no amount -> no discounted amount');
eq(!!D.calc({ invoiceDate: '2026-10-05', terms: 'net30', amount: 'abc' }).amountError, true, 'bad amount');

// money and parsing
eq(D.money(2500.5, 'USD'), '$2,500.50', 'USD'); eq(D.money(1234567, 'PHP'), '₱1,234,567.00', 'PHP'); eq(D.money(10, 'EUR'), '€10.00', 'EUR');
eq(D.money(10, 'GBP'), '£10.00', 'GBP'); eq(D.money(10, 'AUD'), 'A$10.00', 'AUD'); eq(D.money(10, 'CAD'), 'C$10.00', 'CAD');
eq(D.num('$1,200.50'), 1200.5, 'num $'); eq(D.num('₱5,000'), 5000, 'num peso'); eq(D.num('PHP 5000'), 5000, 'num PHP'); eq(Number.isNaN(D.num('-5')), true, 'num negative');

// terms text
const T = s => { const t = D.parseTerms(s); return t ? t.label : null; };
eq(['Net 30', 'net30', 'N30', '30', 'NET 60', '45 days', 'n/30'].map(T), ['Net 30', 'Net 30', 'Net 30', 'Net 30', 'Net 60', 'Net 45', 'Net 30'], 'Net terms');
eq(['Due on receipt', 'upon receipt', 'receipt', 'Net 0', 'COD'].map(T), ['Due on receipt', 'Due on receipt', 'Due on receipt', 'Due on receipt', 'Due on receipt'], 'receipt terms');
eq(['EOM', 'end of month', 'Net 30 EOM', 'net30 eom', '30 EOM'].map(T), ['EOM', 'EOM', 'Net 30 EOM', 'Net 30 EOM', 'Net 30 EOM'], 'EOM terms');
eq(['15th of next month', '15th', '15 of the following month', '15'].map(T), ['15th of next month', '15th of next month', '15th of next month', 'Net 15'], '15th terms ("15" alone is Net 15)');
eq(['2/10 Net 30', '2/10, n/30', '1.5/10 Net 45'].map(T), ['2/10 Net 30', '2/10 Net 30', '1.5/10 Net 45'], 'discount terms');
eq(['abc', '', 'net', 'Net 30 days later please', '1000'].map(T), [null, null, null, null, null], 'terms not understood');

// CSV list (page example) as of Oct 23 2026
const EX = 'date,amount,terms,invoice\n2026-09-01,1200,Net 30,INV-001\n2026-09-20,850.50,Net 15,INV-002\n2026-10-01,2000,Net 30 EOM,INV-003\n2026-10-10,450,Due on receipt,INV-004\n2026-10-15,3000,15th of next month,INV-005';
let L = D.parseList(EX, { today: '2026-10-23', weekend: 'keep' });
eq(L.rows.map(x => [x.ref, D.iso(x.due), x.status.days]), [['INV-001', '2026-10-01', -22], ['INV-002', '2026-10-05', -18], ['INV-004', '2026-10-10', -13], ['INV-005', '2026-11-15', 23], ['INV-003', '2026-11-30', 38]], 'list sorted by due date');
eq([L.sum.total, L.sum.overdue, L.sum.overdueCount, L.sum.later, L.sum.laterCount, L.bad.length], [7500.5, 2500.5, 3, 5000, 2, 0], 'list totals: overdue 1200 + 850.50 + 450');
L = D.parseList(EX, { today: '2026-10-23', weekend: 'next' });
eq(L.rows.map(x => D.iso(x.due)), ['2026-10-01', '2026-10-05', '2026-10-12', '2026-11-16', '2026-11-30'], 'list with weekend -> next (Sat Oct 10, Sun Nov 15 moved)');
// bad rows, quotes, tabs, US dates, default terms
L = D.parseList('2026-10-01,"1,200.00",Net 30\n2026-02-30,100,Net 30\nhello\n2026-10-01,abc,Net 30\n2026-10-01,,Net 30\n2026-10-01,100,Net forever\n10/15/2026\t$300\tNet 15\n2026-10-20,50,\n\n# comment line\n2026-10-01,100,Net 1000',
  { today: '2026-10-23', defaultTerms: D.parseTerms('Net 7') });
eq(L.rows.map(x => [D.iso(x.invoice), x.amount, x.terms.label, D.iso(x.due)]), [['2026-10-20', 50, 'Net 7', '2026-10-27'], ['2026-10-15', 300, 'Net 15', '2026-10-30'], ['2026-10-01', 1200, 'Net 30', '2026-10-31']], 'good rows sorted by due date (quoted amount, tab + US date, default terms)');
eq(L.bad.map(b => b.line), [2, 3, 4, 5, 6, 11], 'bad rows by line number');
eq(L.bad.map(b => b.why.split(' ')[0]), ['Date', 'Date', 'Amount', 'Amount', 'Terms', 'Terms'], 'bad row reasons');
L = D.parseList('2026-10-20,50,', { today: '2026-10-23' }); eq([L.rows.length, L.bad[0].why], [0, 'No terms'], 'empty terms and no default');
L = D.parseList('', { today: '2026-10-23' }); eq([L.rows.length, L.bad.length, L.sum.total], [0, 0, 0], 'empty list');
L = D.parseList('2026-10-23,100,Due on receipt\n2026-10-25,40,Net 0', { today: '2026-10-23' });
eq([L.sum.today, L.sum.todayCount, L.sum.next7, L.sum.next7Count], [100, 1, 40, 1], 'due today and next 7 days');
L = D.parseList('2026-10-01,0.1,Net 30\n2026-10-01,0.2,Net 30', { today: '2026-12-01' }); eq(L.sum.overdue, 0.3, 'no float error in totals');
eq(D.splitLine('a,"b, c","d ""e"""'), ['a', 'b, c', 'd "e"'], 'CSV quotes');
L = D.parseList(Array(502).fill('2026-10-01,1,Net 30').join('\n'), { today: '2026-10-23' }); eq([L.rows.length, L.bad.length], [500, 2], 'row limit 500');
const LT = D.listText(D.parseList('2026-10-01,1200,Net 30,"ACME, Inc."', { today: '2026-10-23' }), 'USD').split('\n');
eq(LT[1], '2026-10-31,2026-10-01,1200.00,Net 30,8 days left,"ACME, Inc."', 'list CSV output quotes commas');

// copy text has no advice words and says holidays are not included
r = D.calc({ invoiceDate: '2026-10-05', terms: 'net30', amount: '1500', discPct: '2', discDays: '10', today: '2026-10-23', currency: 'PHP' });
const txt = D.text(r);
eq(txt.includes('Due date: Wed, Nov 4, 2026') && txt.includes('₱1,470.00') && txt.includes('37.24%') && txt.includes('Holidays are not included'), true, 'copy text');

// page checks
const dir = __dirname, html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), js = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
eq(/<html lang="en">/.test(html), true, 'lang en');
eq(html.includes("script-src 'self' https://www.googletagmanager.com; style-src 'self';"), true, 'CSP');
eq(html.includes('G-EWJXRJY9M6') && html.includes('../assets/ga.js'), true, 'GA4');
eq(html.includes('Operated by Eternal Philosophy &gt; EQUA &gt; MisaNeco Works') && html.includes('Built with AI assistance') && html.includes('never sent'), true, 'footer');
eq(html.indexOf('ads-inter') < 0 && html.indexOf('a8.net') < 0 && html.indexOf('mnad-') < 0, true, 'no ads');
eq(/<script>(?!<\/script>)|style="|onclick=/.test(html), false, 'no inline script or style (CSP)');
eq(/statutory|legal (interest )?rate|per annum late|% late fee/i.test(html), false, 'no late fee / legal interest rate claims');
['invoiceDate', 'terms', 'customDays', 'weekend', 'amount', 'currency', 'today', 'discPct', 'discDays', 'list']
  .forEach(id => eq(html.includes('id="' + id + '"') && js.includes("'" + id + "'"), true, 'field ' + id));
D.TERMS.forEach(t => eq(html.includes('<option value="' + t[0] + '">'), true, 'terms option ' + t[0]));
Object.keys(D.CURRENCIES).forEach(k => eq(html.includes('<option value="' + k + '">'), true, 'currency option ' + k));
Object.keys(D.WEEKEND).forEach(k => eq(html.includes('<option value="' + k + '">'), true, 'weekend option ' + k));
['Wednesday, November 4, 2026', 'Thursday, October 15', '$1,470.00', '$30.00', '37.24%', 'March 2, 2027', 'March 1, 2028', 'November 30, 2026', 'January 15, 2027', 'Friday, October 30', 'Monday, November 2']
  .forEach(s => eq(html.includes(s), true, 'page example ' + s));
eq(/invoiceDate: '2026-10-05', terms: 'net30', customDays: '', weekend: 'keep', amount: '1500'/.test(js) && /discPct: '2', discDays: '10'/.test(js), true, 'defaults match the page example');
const site = path.join(dir, '..');
eq(fs.readFileSync(path.join(site, 'sitemap.xml'), 'utf8').includes('<loc>https://tools.equaglobal.com/due-date/</loc>'), true, 'in sitemap');
eq(fs.readFileSync(path.join(site, 'assets', 'ads-inter.test.js'), 'utf8').includes("'due-date/index.html'"), true, 'in the English page list of ads-inter.test.js');
(html.match(/href="\.\.\/([^"#?]+)"/g) || []).forEach(h => { const rel = h.slice(9, -1); eq(fs.existsSync(path.join(site, rel, rel.endsWith('/') ? 'index.html' : '')), true, 'link exists ' + rel); });
console.log(p + ' passed, ' + f + ' failed'); process.exit(f ? 1 : 0);
