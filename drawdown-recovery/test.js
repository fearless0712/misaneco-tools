/* Drawdown recovery calculator checks: node drawdown-recovery/test.js */
const D = require('./logic.js'), fs = require('fs');
let p = 0, f = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) p++; else { f++; console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); } };
const near = (a, b, m, e) => { if (Math.abs(a - b) <= (e || 1e-6)) p++; else { f++; console.log('FAIL', m, a, b); } };
const P = o => D.calc(Object.assign({ mode: 'pct', loss: '', peak: '', balance: '', risk: '', avgR: '' }, o));
const B = o => D.calc(Object.assign({ mode: 'bal', loss: '', peak: '10000', balance: '8000', risk: '', avgR: '' }, o));

// parsing
eq(D.num('10,000'), 10000, 'comma'); eq(D.num('$8,000'), 8000, 'dollar'); eq(D.num('25%'), 25, 'percent');
eq(D.num(''), null, 'empty'); eq(Number.isNaN(D.num('-5')), true, 'negative'); eq(Number.isNaN(D.num('1.2.3')), true, 'two dots');
eq(Number.isNaN(D.num('abc')), true, 'text'); eq(D.num('.5'), 0.5, 'leading dot');

// hand-checked examples: 1/(1-L)-1
// 10% -> 1/0.9-1 = 0.111111 -> 11.11 ; 25% -> 1/0.75-1 = 0.333333 -> 33.33 ; 50% -> 1/0.5-1 = 1 -> 100
near(D.recovery(10), 100 / 9, '10% exact'); eq(D.pct(D.recovery(10)), '11.11%', '10% -> 11.11%');
near(D.recovery(25), 100 / 3, '25% exact'); eq(D.pct(D.recovery(25)), '33.33%', '25% -> 33.33%');
near(D.recovery(50), 100, '50% exact'); eq(D.pct(D.recovery(50)), '100.00%', '50% -> 100%');
let r = P({ loss: '25' }); eq([r.state, D.r2(r.dd), D.r2(r.need)], ['ok', 25, 33.33], 'calc pct 25');
r = P({ loss: '10%' }); eq(D.r2(r.need), 11.11, 'calc pct 10 with % sign');

// balance 8,000 / peak 10,000 -> DD 20%, need 25%, $2,000
r = B({});
eq([r.state, D.r2(r.dd), D.r2(r.need), r.amount, D.money(r.amount)], ['ok', 20, 25, 2000, '2,000.00'], 'balance 8000 / peak 10000');
r = B({ peak: '$10,000', balance: '$8,000' }); eq([D.r2(r.dd), r.amount], [20, 2000], 'balance with $ and commas');
r = B({ balance: '10000' }); eq([r.state, r.dd, r.need, r.amount, r.above], ['ok', 0, 0, 0, false], 'at the peak');
r = B({ balance: '12000' }); eq([r.state, r.dd, r.need, r.amount, r.above], ['ok', 0, 0, 0, true], 'above the peak');

// boundaries
r = P({ loss: '0' }); eq([r.state, r.dd, r.need], ['ok', 0, 0], '0% -> needs 0%');
eq(P({ loss: '100' }).state, 'error', '100% is an input error');
eq(P({ loss: '150' }).state, 'error', '150% is an input error');
eq(P({ loss: '99.99' }).state, 'ok', '99.99% accepted'); near(P({ loss: '99.99' }).need, 999900, '99.99% -> +999,900%', 1e-3);
eq(P({ loss: '-10' }).state, 'error', 'negative loss'); eq(P({ loss: 'abc' }).state, 'error', 'text loss');
eq(P({ loss: '' }).state, 'empty', 'empty loss');
eq(B({ balance: '-100' }).state, 'error', 'negative balance'); eq(B({ peak: '-1' }).state, 'error', 'negative peak');
eq(B({ balance: '0' }).state, 'error', 'balance 0 (100% loss)'); eq(B({ peak: '0' }).state, 'error', 'peak 0');
eq(B({ balance: '' }).state, 'empty', 'empty balance');

// winning trades (compound estimate)
// 20% DD, 1% risk, 2R: ln(1.25)/ln(1.02) = 0.223144/0.019803 = 11.268 -> 12 ; check 1.02^11 < 1.25 <= 1.02^12
r = B({ risk: '1', avgR: '2' });
near(r.wins.exact, Math.log(1.25) / Math.log(1.02), 'wins exact'); eq([D.r2(r.wins.exact), r.wins.n], [11.27, 12], 'wins 20%/1%/2R');
eq([Math.pow(1.02, 11) < 1.25, Math.pow(1.02, 12) >= 1.25], [true, true], 'compound check 11 vs 12');
eq(D.r2(r.wins.perLoss), 0.51, 'extra wins per loss');
// 50% DD, 1%, 2R -> 35.003 -> 36 (1.02^35 = 1.99989 < 2)
r = P({ loss: '50', risk: '1', avgR: '2' }); eq(r.wins.n, 36, 'wins 50%/1%/2R'); eq(Math.pow(1.02, 35) < 2, true, '1.02^35 < 2');
// 10% DD, 2% risk, 1R -> ln(1/0.9)/ln(1.02) = 5.32 -> 6
eq(P({ loss: '10', risk: '2', avgR: '1' }).wins.n, 6, 'wins 10%/2%/1R');
eq(P({ loss: '0', risk: '1', avgR: '2' }).wins.n, 0, 'no drawdown -> 0 wins');
eq(P({ loss: '20', risk: '1', avgR: '' }).wins, undefined, 'wins skipped when R empty');
eq(typeof P({ loss: '20', risk: '0', avgR: '2' }).winsErr, 'string', 'risk 0 error');
eq(typeof P({ loss: '20', risk: '100', avgR: '2' }).winsErr, 'string', 'risk 100 error');
eq(typeof P({ loss: '20', risk: '1', avgR: '0' }).winsErr, 'string', 'R 0 error');
eq(typeof P({ loss: '20', risk: '-1', avgR: '2' }).winsErr, 'string', 'risk negative error');
eq(P({ loss: '20', risk: '-1', avgR: '2' }).state, 'ok', 'risk error keeps the main result');

// quick reference table 10..90
const T = D.table();
eq(T.map(x => x.dd), [10, 20, 30, 40, 50, 60, 70, 80, 90], 'table rows');
eq(T.map(x => D.pct(x.need)), ['11.11%', '25.00%', '42.86%', '66.67%', '100.00%', '150.00%', '233.33%', '400.00%', '900.00%'], 'table gains');
T.forEach(x => near(x.need, (100 / (100 - x.dd) - 1) * 100, 'table formula ' + x.dd, 1e-9));
const txt = D.tableText().split('\n');
eq(txt.length, 10, 'table text lines'); eq(txt[1], '10%\t11.11%\t90\tx1.11', 'table text first row'); eq(txt[9], '90%\t900.00%\t10\tx10.00', 'table text last row');

// page
const raw = fs.readFileSync(__dirname + '/index.html', 'utf8');
const html = raw.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '');
eq(/a8\.net|ads-inter|mnad-/.test(html), false, 'no ads on English page');
eq((html.match(/https?:\/\/[^"'\s<)]+/g) || []).filter(u => !/^https:\/\/(tools\.equaglobal\.com|www\.googletagmanager\.com|schema\.org)/.test(u)), [], 'no unexpected external URLs');
eq((raw.match(/<script[^>]*src="([^"]+)"/g) || []).map(s => /src="([^"?]+)/.exec(s)[1]), ['https://www.googletagmanager.com/gtag/js', '../assets/ga.js', 'logic.js', 'app.js'], 'scripts: GA + own only');
eq(/G-EWJXRJY9M6/.test(raw), true, 'GA id');
// static table on the page = logic
const rows = [.../<tbody id="qtable">([\s\S]*?)<\/tbody>/.exec(raw)[1].matchAll(/<tr><th scope="row">(\d+)%<\/th><td class="num">\+([\d.,]+%)<\/td><td class="num">(\d+)<\/td><td class="num">×([\d.]+)<\/td><\/tr>/g)].map(m => [+m[1], m[2], +m[3], m[4]]);
eq(rows, T.map(x => [x.dd, D.pct(x.need), x.left, D.r2(x.mult).toFixed(2)]), 'page table = logic');
['+33.33%', '<b>20%</b>', '<b>$2,000</b>', '<b>25%</b>', '11.27', '<b>12 winning trades</b>', '0.51 more wins', '<b>11.11%</b>', '<b>100%</b>'].forEach(t => eq(raw.includes(t), true, 'page shows ' + t));
const title = /<title>([^<]*)<\/title>/.exec(raw)[1], desc = /<meta name="description" content="([^"]*)"/.exec(raw)[1];
eq([/Drawdown Recovery Calculator/.test(title), title.length <= 70], [true, true], 'title');
eq([/drawdown/i.test(desc), desc.length <= 300], [true, true], 'description');
const lds = [...raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
const faq = lds.find(x => x['@type'] === 'FAQPage');
const dec = t => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
const vis = [.../<section[^>]*id="faq"[^>]*>([\s\S]*?)<\/section>/.exec(raw)[1].matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map(m => [dec(m[1]), dec(m[2])]);
eq(!!faq && faq.mainEntity.length >= 6, true, 'FAQPage present');
eq(faq.mainEntity.map(q => [q.name, q.acceptedAnswer.text]), vis, 'FAQPage = visible FAQ');
const app = lds.find(x => x['@type'] === 'WebApplication');
eq([!!app, app && app.url, app && app.applicationCategory], [true, 'https://tools.equaglobal.com/drawdown-recovery/', 'FinanceApplication'], 'WebApplication');
eq(/canonical" href="https:\/\/tools\.equaglobal\.com\/drawdown-recovery\/"/.test(raw), true, 'canonical');
eq(/for planning and education, not financial advice/i.test(raw), true, 'not financial advice line');
eq(/\bAI\b/.test(raw.replace(/<script[\s\S]*?<\/script>/g, '')), false, 'no "AI" wording');
eq(/guarantee|risk[- ]free|get rich|sure profit|you will recover/i.test(raw.replace(/whether you will recover/g, '')), false, 'no promise wording');
// related tools both ways
eq(raw.includes('href="../position-size/"'), true, 'links to position-size');
eq(fs.readFileSync(__dirname + '/../position-size/index.html', 'utf8').includes('href="../drawdown-recovery/"'), true, 'position-size links back');
// ids used by app.js exist
['mode', 'loss', 'peak', 'balance', 'risk', 'avgR', 'pctBox', 'balBox', 'need', 'err', 'tbody', 'winsOut', 'copy', 'copied', 'copyTable', 'copiedTable']
  .forEach(id => eq(raw.includes('id="' + id + '"'), true, 'id ' + id));
console.log(`${p} passed, ${f} failed`); process.exit(f ? 1 : 0);
