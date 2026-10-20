/* 家事按分 計算ツールの確認：node anbun/test.js */
const A = require('./logic.js'), fs = require('fs');
let p = 0, f = 0;
const eq = (a, b, m) => { if (a === b) p++; else { f++; console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); } };
const ok = (c, m) => eq(!!c, true, m);
const it = o => Object.assign({ name: '家賃', amount: '', period: 'month', basis: 'area', part: '', whole: '', unit: '', note: '', pct: '' }, o);
const C = o => A.calcItem(it(o));

/* ---- 計算 ---- */
let r = C({ amount: '100000', part: '6', whole: '30', unit: '畳', note: '仕事部屋' });
eq(r.state, 'ok', 'rent ok'); eq(r.pct, 20, 'rent pct'); eq(r.monthBiz, 20000, 'rent mBiz'); eq(r.monthPriv, 80000, 'rent mPriv');
eq(r.yearAmt, 1200000, 'rent yAmt'); eq(r.yearBiz, 240000, 'rent yBiz'); eq(r.yearPriv, 960000, 'rent yPriv');
eq(r.memo, '家賃：仕事部屋 6畳÷全体 30畳＝20%（年額 1,200,000円 のうち 240,000円）', 'rent memo (example format)');
r = C({ amount: '100000', part: '6', whole: '30' }); ok(/^家賃：仕事に使う広さ 6÷全体 30＝20%/.test(r.memo), 'memo default label, no unit');
// 時間：8÷24 = 33.33…% → 月 7,980 × 1/3 = 2,660 ちょうど
r = C({ name: '通信（スマホ・ネット）', amount: '7,980円', basis: 'time', part: '8', whole: '24', unit: '時間' });
eq(r.pct.toFixed(4), '33.3333', 'time pct'); eq(A.fmtPct(r.pct), '33.3%', 'pct display 1 decimal'); eq(r.monthBiz, 2660, 'time mBiz exact fraction');
eq(r.yearBiz, 31920, 'time yBiz'); ok(/仕事に使う時間 8時間÷使う時間全体 24時間＝33\.3%/.test(r.memo), 'time memo');
// 切り捨て：1,001円 × 1/3 = 333.67 → 333、私用 668
r = C({ amount: '1001', basis: 'usage', part: '1', whole: '3' }); eq(r.monthBiz, 333, 'floor'); eq(r.monthPriv, 668, 'private = amount - biz');
eq(r.yearBiz, 4004, 'year floor (12012/3)'); eq(r.yearPriv, 8008, 'year private');
// 小数：0.1/0.3 は浮動小数でずれない（1/3）
r = C({ amount: '300', basis: 'usage', part: '0.1', whole: '0.3' }); eq(r.monthBiz, 100, 'decimal fraction exact');
r = C({ amount: '100', basis: 'manual', pct: '57' }); eq(r.monthBiz, 57, '100×57% = 57 (no 56.999 float error)');
r = C({ amount: '100', basis: 'manual', pct: '0.57' }); eq(r.monthBiz, 0, '0.57% floors to 0'); eq(r.yearBiz, 6, '1200×0.57% = 6.84 → 6');
r = C({ amount: '7980', basis: 'manual', pct: '33.3%', note: '平日の日中は仕事' });
eq(r.monthBiz, 2657, 'manual 33.3% (2657.34 → 2657)'); eq(r.memo, '家賃：33.3%（理由：平日の日中は仕事）（年額 95,760円 のうち 31,888円）', 'manual memo');
ok(/理由を書いておきましょう/.test(C({ amount: '100', basis: 'manual', pct: '10' }).memo), 'manual memo without reason asks for one');
// 年額
r = C({ amount: '120000', period: 'year', basis: 'usage', part: '1500', whole: '6000', unit: 'km' });
eq(r.yearAmt, 120000, 'year amt'); eq(r.monthAmt, 10000, 'month from year'); eq(r.yearBiz, 30000, 'year biz'); eq(r.monthBiz, 2500, 'month biz from year');
r = C({ amount: '100000', period: 'year', basis: 'manual', pct: '10' }); eq(r.monthAmt, 8333, 'year/12 floored'); eq(r.monthBiz, 833, 'month biz'); eq(r.yearBiz, 10000, 'year biz exact');
// 全角・カンマ・空白
r = C({ amount: '１２，０００', basis: 'area', part: '　６．５ ', whole: '２６' }); eq(r.state, 'ok', 'fullwidth ok'); eq(r.monthBiz, 3000, 'fullwidth 6.5/26 = 25%');
eq(C({ amount: '1000', basis: 'area', part: '.5', whole: '2' }).monthBiz, 250, 'leading dot');

/* ---- 端の値 ---- */
r = C({ amount: '50000', basis: 'manual', pct: '0' }); eq(r.state, 'ok', '0% ok'); eq(r.monthBiz, 0, '0% biz'); eq(r.monthPriv, 50000, '0% priv');
r = C({ amount: '50000', basis: 'manual', pct: '100' }); eq(r.monthBiz, 50000, '100% biz'); eq(r.monthPriv, 0, '100% priv'); eq(r.yearBiz, 600000, '100% year');
r = C({ amount: '50000', part: '30', whole: '30' }); eq(r.monthBiz, 50000, 'part = whole → 100%');
r = C({ amount: '50000', part: '0', whole: '30' }); eq(r.monthBiz, 0, 'part 0 → 0%'); eq(r.pct, 0, 'pct 0');
r = C({ amount: '0', part: '6', whole: '30' }); eq(r.state, 'ok', 'amount 0 ok'); eq(r.yearBiz, 0, 'amount 0 biz');
eq(C({}).state, 'empty', 'all blank → empty'); eq(C({ part: '6', whole: '30' }).state, 'empty', 'no amount → empty (not counted)');
r = C({ amount: '1000' }); eq(r.state, 'noratio', 'no ratio'); eq(r.monthBiz, null, 'no ratio biz null');
eq(C({ amount: '1000', part: '6' }).state, 'noratio', 'only part → wait');
eq(C({ amount: '1000', basis: 'manual' }).state, 'noratio', 'manual blank');
// 入力ミス
const E = o => { const x = C(o); return x.state === 'error' ? x.error : ''; };
ok(/数字/.test(E({ amount: 'abc' })), 'amount nan'); ok(/マイナス/.test(E({ amount: '-100' })), 'amount negative');
ok(/整数/.test(E({ amount: '100.5' })), 'amount decimal'); ok(/大きすぎ/.test(E({ amount: '10000000000' })), 'amount too big');
ok(/0は入れられません/.test(E({ amount: '100', part: '0', whole: '0' })), 'whole 0');
ok(/より大きく/.test(E({ amount: '100', part: '31', whole: '30' })), 'part > whole');
ok(/数字/.test(E({ amount: '100', part: 'x', whole: '30' })), 'part nan'); ok(/マイナス/.test(E({ amount: '100', part: '-1', whole: '30' })), 'part neg');
ok(/0〜100/.test(E({ amount: '100', basis: 'manual', pct: '100.1' })), 'pct > 100'); ok(/マイナス/.test(E({ amount: '100', basis: 'manual', pct: '-5' })), 'pct neg');
ok(/数字/.test(E({ amount: '100', basis: 'manual', pct: '1e2' })), 'pct exp not allowed'); ok(/数字/.test(E({ amount: '100', basis: 'manual', pct: '1.23456' })), 'pct 5 decimals');
ok(/数字/.test(E({ amount: '1,0,0a' })), 'garbage');
eq(C({ amount: '100', part: '31', whole: '30' }).monthBiz, null, 'error has no numbers');

/* ---- 合計 ---- */
const items = [it({ amount: '100000', part: '6', whole: '30' }), it({ name: '電気', amount: '9000', basis: 'time', part: '8', whole: '24' }),
  it({ name: 'ガス', amount: '5000', basis: 'manual', pct: '' }), it({ name: 'x', amount: 'abc' }), it({ name: '水道' })];
let t = A.calcAll(items).total;
eq(t.count, 2, 'total count'); eq(t.skipped, 2, 'skipped (noratio + error)'); eq(t.monthBiz, 23000, 'total month biz'); eq(t.yearBiz, 276000, 'total year biz');
eq(t.monthPriv, 86000, 'total month priv'); eq(t.yearPriv, 1032000, 'total year priv'); eq(t.yearBiz + t.yearPriv, t.yearAmt, 'biz+priv = amount');
// sweep：経費＋私用＝金額、0 ≤ 経費 ≤ 金額、切り捨て
let bad = 0;
for (const amt of [0, 1, 7, 999, 1001, 7980, 123457, 99999999]) for (const [a, b] of [[0, 1], [1, 3], [2, 3], [6, 30], [6.5, 26], [0.1, 0.3], [7, 7], [1, 7], [3.3333, 10]]) for (const per of ['month', 'year']) {
  const x = C({ amount: String(amt), period: per, basis: 'usage', part: String(a), whole: String(b) });
  const yAmt = per === 'year' ? amt : amt * 12, exact = yAmt * a / b;
  if (x.state !== 'ok' || x.yearBiz + x.yearPriv !== yAmt || x.monthBiz + x.monthPriv !== x.monthAmt || x.yearBiz < 0 || x.yearBiz > yAmt
    || x.yearBiz > exact + 1e-6 || x.yearBiz <= exact - 1 - 1e-6) { bad++; if (bad < 5) console.log('sweep', amt, a, b, per, x); }
}
eq(bad, 0, 'sweep invariants');

/* ---- CSV ---- */
eq(A.csvCell('a,b'), '"a,b"', 'csv comma'); eq(A.csvCell('say "hi"'), '"say ""hi"""', 'csv quote'); eq(A.csvCell('a\nb'), '"a\nb"', 'csv newline');
eq(A.csvCell('=SUM(A1)'), "'=SUM(A1)", 'csv formula guard ='); eq(A.csvCell('+1'), "'+1", 'csv guard +'); eq(A.csvCell('@x'), "'@x", 'csv guard @'); eq(A.csvCell('-x,'), "\"'-x,\"", 'csv guard + quote');
eq(A.csvCell(-5), '-5', 'numbers not guarded'); eq(A.csvCell(null), '', 'null'); eq(A.csvCell(1234), '1234', 'number');
const csv = A.csv([it({ name: '家賃', amount: '100000', part: '6', whole: '30', unit: '畳', note: '仕事部屋' }), it({ name: '=evil,"x"', amount: '1000', basis: 'manual', pct: '50', note: 'a,b' }), it({ name: '水道' })]);
ok(csv.charCodeAt(0) === 0xFEFF, 'csv BOM'); const lines = csv.slice(1).split('\r\n');
eq(lines[0], '項目,入力した金額,月額/年額,分け方,仕事の分,全体,単位,割合(%),経費にできる目安(月),私用分(月),経費にできる目安(年),私用分(年),根拠のメモ', 'csv header');
eq(lines[1], '家賃,100000,月額,面積,6,30,畳,20,20000,80000,240000,960000,"家賃：仕事部屋 6畳÷全体 30畳＝20%（年額 1,200,000円 のうち 240,000円）"', 'csv row (memo has commas → quoted)');
ok(lines[2].startsWith('"\'=evil,""x""",1000,月額,手入力（%）,,,,50,500,500,6000,6000,"\'=evil,""x""：50%（理由：a,b）'), 'csv escaped row');
eq(lines[3], '合計,,,,,,,,20500,80500,246000,966000,目安です。1円未満切り捨て。', 'csv total (blank rows skipped)'); eq(lines.length, 5, 'csv line count + trailing CRLF');

/* ---- ページ ---- */
const __ga=require(__dirname+'/../assets/ga-test-helper.js').stripGA(fs.readFileSync(__dirname + '/index.html', 'utf8'));if(__ga.problems.length){console.log('FAIL GA',__ga.problems.join(','));process.exitCode=1;}
const html = __ga.html, app = fs.readFileSync(__dirname + '/app.js', 'utf8'), logic = fs.readFileSync(__dirname + '/logic.js', 'utf8');
const csp = (/http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html) || [])[1] || '';
ok(/default-src 'none'/.test(csp) && /connect-src 'none'/.test(csp) && /script-src 'self';/.test(csp) && /form-action 'none'/.test(csp), 'CSP: no sending');
ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(app + logic), 'no network code');
ok(/localStorage\.getItem/.test(app) && /try \{[^]*localStorage\.setItem[^]*\} catch/.test(app), 'localStorage in try/catch');
ok(html.includes('<title>家事按分 計算ツール｜家賃・電気・通信費の経費割合と根拠メモ（個人事業主・無料）</title>'), 'title');
ok(html.includes('<link rel="canonical" href="https://fearless0712.github.io/misaneco-tools/anbun/">'), 'canonical');
ok(html.includes('property="og:title"') && html.includes('property="og:url" content="https://fearless0712.github.io/misaneco-tools/anbun/"'), 'OGP');
const ld = JSON.parse(/<script type="application\/ld\+json">([^<]*)<\/script>/.exec(html)[1]); eq(ld['@type'], 'WebApplication', 'JSON-LD'); eq(ld.url, 'https://fearless0712.github.io/misaneco-tools/anbun/', 'JSON-LD url');
ok(html.includes('広告・PR'), 'ad label'); ok(/<a href="https:\/\/px\.a8\.net\/[^"]+" rel="nofollow sponsored noopener" target="_blank">/.test(html), 'static A8 ad');
ok(/<script src="\.\.\/assets\/ads-inter\.js\?v=\d+" data-pool="accounting" data-page-ad="0" defer><\/script>/.test(html), 'full-screen ad script');
ok(/class="line-box"[^]*<\/aside>\n<\/main>/.test(html), 'LINE box right before </main>');
ok(html.includes('https://excel-temple.booth.pm/items/8995923') && html.includes('Excelで管理したい方へ（有料）'), 'BOOTH paid link');
ok(html.includes('href="../hozon/"') && html.includes('href="../riekiritsu/"'), 'related tools');
ok(html.includes('業務の遂行上必要で、明らかに区分できる部分') && html.includes('目安') && /国税庁の案内/.test(html) && html.includes('税理士'), 'required disclaimers');
ok(html.includes('taxanswer/shotoku/2210.htm') && html.includes('laws.e-gov.go.jp/law/340CO0000000096'), 'sources cited');
ok(!/\d+%まで(OK|ＯＫ|なら)|まで経費にできます/.test(html + app + logic), 'no invented percentage rules');
ok(!/1万円|30日チャレンジ/.test(html), 'banned words');
const urls = (html + app + logic).match(/https?:\/\/[^"'\s<>)]+/g) || [];
const allowed = /^https:\/\/(fearless0712\.github\.io\/misaneco-tools\/|px\.a8\.net\/|www\d*\.a8\.net\/|\*\.a8\.net;$|line\.me\/R\/ti\/p\/@736dykzx$|schema\.org$|excel-temple\.booth\.pm\/items\/8995923$|www\.nta\.go\.jp\/|laws\.e-gov\.go\.jp\/)/;
const extra = urls.filter(u => !allowed.test(u)); eq(extra.join(' '), '', 'no external URLs except A8 / LINE / schema.org / BOOTH / NTA / e-Gov');
const refs = /<section class="mut refs"[^]*?<\/section>/.exec(html)[0];
ok(urls.filter(u => /nta\.go\.jp|e-gov\.go\.jp/.test(u)).every(u => refs.includes(u)), 'NTA / e-Gov links only in 参考');
const ids = (html.match(/\sid="([^"]+)"/g) || []).map(s => s.slice(5, -1)); eq(new Set(ids).size, ids.length, 'unique ids');

console.log(p + ' passed, ' + f + ' failed'); process.exit(f ? 1 : 0);
