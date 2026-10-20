/* 日割り計算ツールの確認：node hiwari/test.js */
const H = require('./logic.js'), fs = require('fs');
let p = 0, f = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) p++; else { f++; console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); } };
const C = o => H.calc(Object.assign({ amount: '', from: '', to: '', mode: 'floor', basis: 'cal' }, o));

// 入力の読み取り
eq(H.num('85,000円'), 85000, 'num 円とカンマ'); eq(H.num('８５０００'), 85000, '全角数字'); eq(H.num('¥1,000'), 1000, '¥');
eq(H.num(''), null, '空'); eq(Number.isNaN(H.num('-100')), true, 'マイナス'); eq(Number.isNaN(H.num('abc')), true, '文字');
eq(H.parseDate('2026-02-29'), null, '2026/2/29 はない'); eq(H.parseDate('2028-02-29'), { y: 2028, m: 2, d: 29 }, 'うるう年');
eq(H.daysIn(2026, 2), 28, '2月28日'); eq(H.daysIn(2028, 2), 29, 'うるう年2月'); eq(H.daysIn(2026, 10), 31, '10月31日');

// 入居月：10/21〜10/31 = 11日、85,000×11/31 = 30,161.29 → 30,161
let r = C({ amount: '85000', from: '2026-10-21', to: '2026-10-31' });
eq([r.state, r.total, r.days, r.rows.length, r.rows[0].use, r.rows[0].base], ['ok', 30161, 11, 1, 11, 31], '入居月 暦日');
eq(C({ amount: '85000', from: '2026-10-21', to: '2026-10-31', mode: 'ceil' }).total, 30162, '切り上げ');
eq(C({ amount: '85000', from: '2026-10-21', to: '2026-10-31', mode: 'round' }).total, 30161, '四捨五入 .29');
// 30日固定：85,000×11/30 = 31,166.67
eq(C({ amount: '85000', from: '2026-10-21', to: '2026-10-31', basis: '30' }).total, 31166, '30日 切り捨て');
eq(C({ amount: '85000', from: '2026-10-21', to: '2026-10-31', basis: '30', mode: 'round' }).total, 31167, '30日 四捨五入');
// 退去月：11/1〜11/15、30日の月 → 半分
eq(C({ amount: '85000', from: '2026-11-01', to: '2026-11-15' }).total, 42500, '退去月 半分');
// 丸ごと1か月は月額そのまま（30日固定でも、31日の月でも）
eq(C({ amount: '85000', from: '2026-10-01', to: '2026-10-31', basis: '30' }).total, 85000, '31日の月 丸ごと');
eq(C({ amount: '85000', from: '2026-02-01', to: '2026-02-28', basis: '30' }).total, 85000, '2月 丸ごと');
// 月またぎ：10/21〜12/10 → 30,161 + 85,000 + 85,000×10/31(27,419.35→27,419)
r = C({ amount: '85000', from: '2026-10-21', to: '2026-12-10' });
eq([r.rows.length, r.rows[1].full, r.rows[2].yen, r.total, r.days], [3, true, 27419, 142580, 51], '月またぎ');
// 年またぎ
r = C({ amount: '1000', from: '2026-12-31', to: '2027-01-01' });
eq([r.rows.map(x => x.y + '/' + x.m), r.total], [['2026/12', '2027/1'], 32 + 32], '年またぎ 1000×1/31=32.2→32');
// うるう年の2月 暦日：29,000×1/29 = 1,000
eq(C({ amount: '29000', from: '2028-02-29', to: '2028-02-29' }).total, 1000, 'うるう日');
// 2月の30日固定：2/15〜2/27（13日）→ 30,000×13/30 = 13,000
eq(C({ amount: '30000', from: '2026-02-15', to: '2026-02-27', basis: '30' }).total, 13000, '2月 30日固定');
// 小数の誤差：100×1/3 → 33 / 四捨五入 33 / 切り上げ 34
eq(['floor', 'round', 'ceil'].map(m => H.prorate(100, 1, 3, m)), [33, 33, 34], '1/3の端数');
eq(H.prorate(100, 1, 2, 'round'), 50, '割り切れる');
eq(H.prorate(1, 1, 2, 'round'), 1, '0.5円は四捨五入で1'); eq(H.prorate(1, 1, 2, 'floor'), 0, '0.5円 切り捨て');
eq(H.prorate(0.1 * 3, 1, 1, 'floor'), 0, '0.3円 → 0（浮動小数のずれなし）');
// 給与の日割り（例：月給 250,000、11/16〜11/30 の15日、30日の月）
eq(C({ amount: '250000', from: '2026-11-16', to: '2026-11-30' }).total, 125000, '給与 半月');
// エラー
eq(C({ amount: '', from: '2026-10-01', to: '2026-10-02' }).state, 'empty', '金額なし');
eq(C({ amount: '1000', from: '2026-10-10', to: '2026-10-01' }).state, 'error', '逆の日付');
eq(C({ amount: '1000', from: '2026-02-30', to: '2026-03-01' }).state, 'error', 'ない日付');
eq(C({ amount: 'x', from: '2026-10-01', to: '2026-10-02' }).state, 'error', '金額が文字');
eq(C({ amount: '1000', from: '2026-01-01', to: '2030-01-01' }).state, 'error', '長すぎ');
eq(H.yen(1234567), '1,234,567円', 'yen');

// ページ
const html = fs.readFileSync(__dirname + '/index.html', 'utf8'), js = fs.readFileSync(__dirname + '/app.js', 'utf8');
eq(/Content-Security-Policy/.test(html), true, 'CSP'); eq(/innerHTML/.test(js), false, 'innerHTMLなし');
eq(/ads-inter\.js/.test(html) && /広告/.test(html), true, '広告と表示'); eq(/line\.me\/R\/ti\/p\/@736dykzx/.test(html), true, 'LINE');
eq(/application\/ld\+json/.test(html), true, 'JSON-LD');
[...js.matchAll(/\$\('([\w-]+)'\)/g)].map(m => m[1]).forEach(id => eq(html.includes('id="' + id + '"'), true, 'id: ' + id));
console.log(p + ' passed, ' + f + ' failed'); process.exit(f ? 1 : 0);
