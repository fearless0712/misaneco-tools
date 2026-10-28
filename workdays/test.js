/* Working days calculator tests: node workdays/test.js */
const W = require('./logic.js'), K = require('../kouki/logic.js'), fs = require('fs'), path = require('path');
let p = 0, f = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) p++; else { f++; console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); } };
const E = o => W.calcEnd(Object.assign({ start: '', days: '', weekend: 'satsun', holidays: '' }, o));
const N = o => W.calcCount(Object.assign({ start: '', end: '', weekend: 'satsun', holidays: '' }, o));
const D = n => W.iso(n);
const offs = r => r.list.filter(x => x.off).map(x => D(x.n) + ':' + x.kind);

// dates
eq(W.wday(W.parseDate('2026-10-22')), 4, '2026-10-22 is Thursday'); eq(W.wday(W.parseDate('2027-01-01')), 5, '2027-01-01 is Friday');
eq(W.parseDate('2026-02-29'), null, 'no Feb 29 2026'); eq(D(W.parseDate('2028-02-29')), '2028-02-29', 'leap day');
eq(W.parseDate('2026-13-01'), null, 'month 13'); eq(W.parseDate('abc'), null, 'text'); eq(D(W.parseDate('2026/8/13')), '2026-08-13', 'slashes');
eq(W.fmt(W.parseDate('2026-10-14')), 'Wed, Oct 14, 2026', 'display'); eq(W.fmtShort(W.parseDate('2026-10-12')), 'Mon Oct 12', 'short display');
// working days input
eq(W.num('3'), 3, '3'); eq(W.num('10 days'), 10, '10 days'); eq(W.num('1 day'), 1, '1 day'); eq(W.num('1,000'), 1000, 'comma');
eq(W.num(''), null, 'empty'); eq(Number.isNaN(W.num('abc')), true, 'text'); eq(Number.isNaN(W.num('1.5')), true, 'decimal'); eq(W.num('-3'), -3, 'negative');

// example: 2026-10-09 (Fri), 3 working days, Sat+Sun, holiday 2026-10-12 -> 2026-10-14
const HOL = '2026-10-12';
let r = E({ start: '2026-10-09', days: '3', holidays: HOL });
eq([r.state, D(r.end), r.calDays, r.workDays, r.offDays, r.off], ['ok', '2026-10-14', 6, 3, 3, { week: 2, holiday: 1 }], 'basic example');
eq(offs(r), ['2026-10-10:week', '2026-10-11:week', '2026-10-12:holiday'], 'basic example days off');
eq(r.list.filter(x => !x.off).map(x => x.no), [1, 2, 3], 'day numbers');
eq([r.startOff, r.ignored], [false, 0], 'start is a working day, nothing ignored');
eq(D(E({ start: '2026-10-09', days: '3' }).end), '2026-10-13', 'no holiday -> Oct 13');
eq(D(E({ start: '2026-10-09', days: '1' }).end), '2026-10-09', '1 day = start date');

// weekends
eq(D(E({ start: '2026-10-09', days: '3', weekend: 'sun', holidays: HOL }).end), '2026-10-13', 'Sunday only: 9, 10(Sat), 13');
eq(D(E({ start: '2026-10-09', days: '3', weekend: 'sat' }).end), '2026-10-12', 'Saturday only: 9, 11, 12');
eq(D(E({ start: '2026-10-09', days: '3', weekend: 'none' }).end), '2026-10-11', 'none: every day');
eq(D(E({ start: '2026-10-09', days: '3', weekend: 'none', holidays: HOL }).end), '2026-10-11', 'none + holiday after the end');
eq(D(E({ start: '2026-10-11', days: '2', weekend: 'none', holidays: HOL }).end), '2026-10-13', 'none + holiday inside');
// Fri+Sat: 2026-10-08 Thu(1), 9 Fri off, 10 Sat off, 11 Sun(2), 12 Mon(3)
r = E({ start: '2026-10-08', days: '3', weekend: 'frisat' });
eq([D(r.end), offs(r)], ['2026-10-12', ['2026-10-09:week', '2026-10-10:week']], 'Fri+Sat');
eq(N({ start: '2026-10-01', end: '2026-10-31', weekend: 'frisat' }).workDays, 31 - 10, 'Fri+Sat October 2026 (5 Fri + 5 Sat)');
eq(W.weekend('frisat'), [false, false, false, false, false, true, true], 'Fri+Sat mask');
eq(W.weekend('bogus'), W.weekend('satsun'), 'unknown weekend -> Sat+Sun');

// start date is a day off
r = E({ start: '2026-10-10', days: '2', holidays: HOL });
eq([D(r.end), r.startOff, D(r.firstWork), r.calDays, r.off], ['2026-10-14', true, '2026-10-13', 5, { week: 2, holiday: 1 }], 'start on Saturday');
eq(W.text(r, { weekend: 'satsun' }).includes('counting starts on the next working day, Tue, Oct 13, 2026'), true, 'copy text explains start day off');
r = E({ start: '2026-10-11', days: '1' }); eq([D(r.end), r.startOff], ['2026-10-12', true], 'start on Sunday');
r = E({ start: '2026-10-12', days: '1', holidays: HOL }); eq([D(r.end), r.startOff], ['2026-10-13', true], 'start on a holiday');
r = E({ start: '2026-10-09', days: '1', weekend: 'frisat' }); eq([D(r.end), r.startOff], ['2026-10-11', true], 'start on Friday with Fri+Sat');

// year end: 12/24 Thu(1), 12/25 hol, 26-27 wknd, 28(2), 29-31 closed, 1/1 hol, 2-3 wknd, 1/4(3), 1/5(4)
const YE = '2026-12-25 Christmas Day\n2026-12-29\n2026-12-30\n2026-12-31\n2027-01-01 New Year\'s Day';
r = E({ start: '2026-12-24', days: '4', holidays: YE });
eq([D(r.end), r.calDays, r.workDays, r.off], ['2027-01-05', 13, 4, { week: 4, holiday: 5 }], 'over the year-end break');
eq(r.list.find(x => D(x.n) === '2026-12-25').label, 'Christmas Day', 'holiday note kept');
eq(r.list.find(x => D(x.n) === '2026-12-29').label, 'Closed', 'no note -> Closed');
eq(W.months(r).map(m => m.title), ['December 2026', 'January 2027'], 'calendar across the year');
eq(D(E({ start: '2026-12-24', days: '4' }).end), '2026-12-29', 'without closures -> Dec 29');
// a holiday on a weekend counts once, as weekend
r = E({ start: '2026-12-25', days: '2', holidays: '2026-12-26 Boxing Day' });
eq([D(r.end), r.off], ['2026-12-28', { week: 2, holiday: 0 }], 'holiday on Saturday counted as weekend');
eq(r.list.find(x => D(x.n) === '2026-12-26').label, 'Boxing Day', 'weekend holiday still shows its name');

// zero, negative and bad input
eq(E({ start: '', days: '' }).state, 'empty', 'empty');
eq(E({ start: '2026-10-09', days: '' }).state, 'empty', 'no days yet');
eq(E({ start: '', days: '3' }).state, 'error', 'no start date');
eq(E({ start: '2026-02-30', days: '3' }).state, 'error', 'date does not exist');
['0', '-3', '-1', 'abc', '1.5', 'three'].forEach(v => eq(E({ start: '2026-10-09', days: v }).state, 'error', 'days ' + v));
eq(/1 or more/.test(E({ start: '2026-10-09', days: '0' }).error), true, '0 days explains day 1');
eq(E({ start: '2026-10-09', days: '1001' }).state, 'error', 'over 1000');
eq(E({ start: '2026-10-09', days: '1000', weekend: 'none' }).state, 'ok', '1000 days, no weekend');
eq(/3 years/.test(E({ start: '2026-10-09', days: '1000' }).error), true, '1000 days Sat+Sun runs past 3 years');

// count mode
eq(N({ start: '2026-10-01', end: '2026-10-31' }).workDays, 22, 'October 2026: 31 - 9 weekend days');
eq(N({ start: '2006-01-01', end: '2006-01-31' }).workDays, 22, 'Microsoft example Jan 2006 = 22');
eq(N({ start: '2026-10-09', end: '2026-10-14', holidays: HOL }).workDays, 3, 'NETWORKDAYS example = 3');
eq(N({ start: '2026-01-01', end: '2026-12-31', weekend: 'none' }).workDays, 365, 'none: whole year');
eq(N({ start: '2026-10-10', end: '2026-10-11' }).workDays, 0, 'weekend only = 0');
eq(N({ start: '2026-10-14', end: '2026-10-14' }).workDays, 1, 'one day');
eq(N({ start: '2026-10-14', end: '2026-10-13' }).state, 'error', 'end before start');
eq(N({ start: '2026-01-01', end: '2030-01-01' }).state, 'error', 'over 3 years');
eq(N({ start: '', end: '' }).state, 'empty', 'count empty');
eq(W.calc({ mode: 'count', start: '2026-10-01', end: '2026-10-31', weekend: 'satsun', holidays: '' }).workDays, 22, 'calc -> count');
// end date fed back into count gives the same number of days
let same = true;
Object.keys(W.WEEKENDS).forEach(w => {
  for (let d = 1; d <= 400; d += 13) {
    const a = E({ start: '2026-07-04', days: String(d), weekend: w, holidays: YE });
    const b = N({ start: '2026-07-04', end: D(a.end), weekend: w, holidays: YE });
    if (b.workDays !== d) same = false;
  }
});
eq(same, true, 'count of the end date range = working days (all weekends)');

// same results as the Japanese kouki tool (holidays off, closures as company days off)
const KP = { satsun: ['satsun', null], sun: ['sun', null], none: ['none', null], sat: ['custom', [0, 0, 0, 0, 0, 0, 1]], frisat: ['custom', [0, 0, 0, 0, 0, 1, 1]] };
let match = true;
Object.keys(KP).forEach(w => {
  ['2026-10-09', '2026-10-10', '2026-12-24', '2027-02-26'].forEach(s => [1, 2, 5, 17, 60].forEach(d => {
    const a = E({ start: s, days: String(d), weekend: w, holidays: YE });
    const b = K.calcEnd({ start: s, days: String(d), preset: KP[w][0], custom: KP[w][1], holidays: false, company: YE.replace(/ .*$/gm, '') });
    if (a.end !== b.end || a.calDays !== b.calDays || a.startOff !== b.startOff) match = false;
  }));
});
eq(match, true, 'same end dates as kouki/logic.js');

// holidays list: invalid lines are ignored and counted
let h = W.parseHolidays('2026-12-25 Christmas\n\nDec 26\n2026-02-30\n2026/12/31\n  2027-01-01\tNew Year  \nhello\n2026-12-25');
eq([h.count, h.bad.length, h.bad.map(b => b.line)], [3, 3, [3, 4, 7]], 'parse holidays: 3 dates, 3 bad lines');
eq(h.days[W.parseDate('2027-01-01')], 'New Year', 'tab-separated note');
eq(W.parseHolidays('2026-12-25,Christmas').count, 1, 'comma-separated note (CSV)');
eq(W.parseHolidays('2026-12-25\n2026-12-25 Christmas').days[W.parseDate('2026-12-25')], 'Christmas', 'duplicate keeps the note');
eq(W.parseHolidays('').count, 0, 'empty list');
r = E({ start: '2026-10-09', days: '3', holidays: 'Oct 12\n2026-10-12\nnot a date' });
eq([r.state, D(r.end), r.ignored], ['ok', '2026-10-14', 2], 'bad lines ignored, calculation still works');
eq(/2 holiday line\(s\) could not be read/.test(W.text(r, { weekend: 'satsun' })), true, 'copy text mentions ignored lines');

// Excel formula
eq(W.excel(E({ start: '2026-10-09', days: '3', holidays: HOL }), { weekend: 'satsun' }).filled, '=WORKDAY.INTL(DATE(2026,10,9)-1, 3, 1, holidays)', 'excel Sat+Sun');
eq(W.excel(E({ start: '2026-10-09', days: '3' }), { weekend: 'satsun' }).filled, '=WORKDAY.INTL(DATE(2026,10,9)-1, 3, 1)', 'excel without holidays');
eq(['sun', 'sat', 'frisat', 'none'].map(w => W.WEEKENDS[w].excel), ['11', '17', '7', '"0000000"'], 'excel weekend codes');
eq(W.excel(N({ start: '2026-10-09', end: '2026-10-14', holidays: HOL }), { weekend: 'frisat' }).filled, '=NETWORKDAYS.INTL(DATE(2026,10,9), DATE(2026,10,14), 7, holidays)', 'excel count');
eq(W.excel({ state: 'empty' }, { weekend: 'satsun' }).general, '=WORKDAY.INTL(start-1, days, weekend, holidays)', 'excel placeholder');

// copy text
const t = W.text(E({ start: '2026-10-09', days: '3', holidays: '2026-10-12 Columbus Day' }), { weekend: 'satsun' });
eq(t.split('\n'), ['Working days calculation', 'Start date: Fri, Oct 9, 2026', 'Working days: 3', 'End date: Wed, Oct 14, 2026',
  'Calendar days: 6 (days off: 3 = weekend 2 + holidays/closures 1)', 'Weekend: Saturday + Sunday',
  'Holidays/closures skipped: Mon Oct 12 (Columbus Day)', 'Excel: =WORKDAY.INTL(DATE(2026,10,9)-1, 3, 1, holidays)'], 'copy text');
// calendar
const ms = W.months(E({ start: '2026-10-09', days: '3' }));
eq([ms.length, ms[0].cells.slice(0, 5), ms[0].cells[5].d, ms[0].cells.length % 7], [1, [null, null, null, null, null], 9, 0], 'calendar starts on Friday');

// page
const html = fs.readFileSync(__dirname + '/index.html', 'utf8'), js = fs.readFileSync(__dirname + '/app.js', 'utf8');
const lg = fs.readFileSync(__dirname + '/logic.js', 'utf8');
eq(/<html lang="en">/.test(html), true, 'lang=en');
eq(/Content-Security-Policy/.test(html), true, 'CSP'); eq(/innerHTML/.test(js), false, 'no innerHTML');
eq(/fetch\(|XMLHttpRequest|sendBeacon/.test(js + lg), false, 'input is not sent');
eq(/a8\.net|ads-inter|mnad-/.test(html), false, 'no ads on English page');
eq(/G-EWJXRJY9M6/.test(html) && /assets\/ga\.js/.test(html), true, 'GA4');
eq(/[぀-ヿ一-鿿]/.test(html.replace(/<a href="\.\.\/kouki\/"[^>]*>[^<]*<\/a>/, '')), false, 'English only (except the link to the Japanese version)');
eq(/[぀-ヿ一-鿿]/.test(js + lg), false, 'no Japanese in scripts');
eq(/application\/ld\+json/.test(html), true, 'JSON-LD'); eq(html.includes('<link rel="canonical" href="https://tools.equaglobal.com/workdays/">'), true, 'canonical');
eq(html.includes('hreflang="en" href="https://tools.equaglobal.com/workdays/"') && html.includes('hreflang="ja" href="https://tools.equaglobal.com/kouki/"'), true, 'hreflang');
const kh = fs.readFileSync(path.join(__dirname, '..', 'kouki', 'index.html'), 'utf8');
eq(kh.includes('hreflang="ja" href="https://tools.equaglobal.com/kouki/"') && kh.includes('hreflang="en" href="https://tools.equaglobal.com/workdays/"'), true, 'kouki hreflang back');
eq(kh.includes('href="../workdays/"'), true, 'kouki links to workdays');
eq(/never sent/.test(html) && /Nothing you enter is sent anywhere/.test(html), true, 'says nothing is sent');
eq(/Eternal Philosophy &gt; EQUA &gt; MisaNeco Works/.test(html), true, 'operator hierarchy');
eq(/Built with AI|help of AI|AI assistance/.test(html), false, 'no AI wording');
eq(html.includes('=WORKDAY.INTL(start-1, days, weekend, holidays)'), true, 'Excel formula shown');
['../blog/en-excel-workday-project-end-date/', '../prorate/', '../jobcost/', '../kouki/'].forEach(u => {
  eq(html.includes('href="' + u + '"'), true, 'link ' + u);
  eq(fs.existsSync(path.join(__dirname, u, 'index.html')), true, 'link target exists ' + u);
});
eq((html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '').match(/https?:\/\/[^"'\s<)]+/g) || []).filter(u => !/^https:\/\/(tools\.equaglobal\.com|www\.googletagmanager\.com|schema\.org)/.test(u)), [], 'no unexpected external URLs');
[...js.matchAll(/\$\('([\w-]+)'\)/g)].map(m => m[1]).forEach(id => eq(html.includes('id="' + id + '"'), true, 'id: ' + id));
Object.keys(W.WEEKENDS).forEach(w => eq(html.includes('<option value="' + w + '">'), true, 'weekend option ' + w));
console.log(p + ' passed, ' + f + ' failed'); process.exit(f ? 1 : 0);
