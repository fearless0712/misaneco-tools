/* 損切り・ロット計算ツールの確認：node sonkiri/test.js */
const S = require('./logic.js'), fs = require('fs');
let p = 0, f = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) p++; else { f++; console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); } };
const near = (a, b, m, e) => { if (Math.abs(a - b) <= (e || 1e-6)) p++; else { f++; console.log('FAIL', m, a, b); } };
const C = o => S.calc(Object.assign({ balance: '1000000', riskMode: 'pct', risk: '2', pair: 'jpy', rate: '', side: 'buy', entry: '150.25', stop: '149.95', target: '', spread: '', step: '1000', lot: '10000', lev: 25 }, o));

// 入力の読み取り
eq(S.num('1,000,000円'), 1000000, 'カンマと円'); eq(S.num('１５０．２５'), 150.25, '全角'); eq(S.num('2%'), 2, '％');
eq(S.num(''), null, '空'); eq(Number.isNaN(S.num('-1')), true, 'マイナス'); eq(Number.isNaN(S.num('1.2.3')), true, '小数点2つ');

// ページの例：100万円・2％・150.25買い・149.95損切り → 30pips、66,000通貨、損失19,800円
let r = C({});
eq([r.state, r.pips, r.units, r.lots, r.loss], ['ok', 30, 66000, 6.6, 19800], '基本例');
near(r.riskYen, 20000, '許せる損失'); near(r.lossPer1000, 300, '1,000通貨あたり300円');
near(r.margin, 66000 * 150.25 / 25, '必要証拠金'); near(r.lossPct, 1.98, '損失の割合');
// 金額で指定（2万円）→ 同じ
eq(C({ riskMode: 'yen', risk: '20000' }).units, 66000, '金額指定');
// 売り：損切りが上
r = C({ side: 'sell', entry: '150.25', stop: '150.55' });
eq([r.state, r.pips, r.units], ['ok', 30, 66000], '売り');
// 方向の誤り
eq(C({ side: 'buy', stop: '150.50' }).state, 'error', '買いで損切りが上');
eq(C({ side: 'sell', stop: '149.00' }).state, 'error', '売りで損切りが下');
eq(C({ stop: '150.25' }).state, 'error', '損切り＝エントリー');
// スプレッド：30 + 0.2 = 30.2pips → 20000/0.302 = 66225.1 → 66,000
r = C({ spread: '0.2' }); eq([r.pips, r.units], [30.2, 66000], 'スプレッド込み'); near(r.loss, 66000 * 0.302, '損失（スプレッド込み）', 1e-6);
// 最小単位 1通貨：20000/0.3 = 66666.67 → 66,666
eq(C({ step: '1' }).units, 66666, '1通貨単位'); eq(C({ step: '10000' }).units, 60000, '1万通貨単位');
// 1ロット10万通貨
eq(C({ lot: '100000' }).lots, 0.66, '10万通貨ロット');
// 損切り幅が広すぎて最小単位でも超える
r = C({ balance: '10000', risk: '1', stop: '140' }); eq([r.state, r.units, r.tooSmall], ['ok', 0, true], '数量0');
// 円がつかないペア：EUR/USD 1.0850 → 1.0820（30pips）、USD/JPY 150
r = C({ pair: 'other', rate: '150', entry: '1.0850', stop: '1.0820' });
eq([r.state, r.pips, r.pip], ['ok', 30, 0.0001], 'ドルストレート pips');
near(r.lossPer1000, 1000 * 0.003 * 150, '1,000通貨あたり450円'); eq(r.units, 44000, '20000/0.45=44444 → 44,000');
near(r.margin, 44000 * 1.085 * 150 / 25, 'ドルストレート証拠金');
eq(C({ pair: 'other', rate: '', entry: '1.0850', stop: '1.0820' }).state, 'error', '円レートなし');
// 利益確定：150.85 → 60pips、損益比2倍、利益 66,000×0.60=39,600
r = C({ target: '150.85' }); eq([r.tpPips, r.rr], [60, 2], '利確 pips・損益比'); near(r.profit, 39600, '利益');
eq(typeof C({ target: '150.00' }).targetErr, 'string', '買いで利確が下');
eq(typeof C({ side: 'sell', stop: '150.55', target: '151' }).targetErr, 'string', '売りで利確が上');
// 証拠金不足：残高1万円、許せる損失1万円、幅1pip → 大量 → 証拠金が残高を超える
r = C({ balance: '10000', riskMode: 'yen', risk: '10000', entry: '150.00', stop: '149.99' }); eq(r.marginShort, true, '証拠金不足の警告');
// 浮動小数：0.1+0.2 のずれで 1つ少なくならない（150.3-150.0=0.3 → 30pips）
eq(C({ entry: '150.3', stop: '150.0' }).pips, 30, '浮動小数のずれ');
eq(C({ riskMode: 'yen', risk: '300', entry: '150.3', stop: '150.0', step: '1' }).units, 1000, '300円/0.3円=1000ちょうど');
// エラー
eq(C({ balance: '' }).state, 'empty', '残高なし'); eq(C({ risk: 'abc' }).state, 'error', '文字');
eq(C({ risk: '100' }).state, 'error', '100%以上'); eq(C({ riskMode: 'yen', risk: '2000000' }).state, 'error', '残高超え');
eq(C({ balance: '0' }).state, 'error', '残高0');

// ページ
const html = fs.readFileSync(__dirname + '/index.html', 'utf8'), js = fs.readFileSync(__dirname + '/app.js', 'utf8');
eq(/Content-Security-Policy/.test(html), true, 'CSP'); eq(/innerHTML/.test(js), false, 'innerHTMLなし');
eq(/ads-inter\.js/.test(html) && /広告/.test(html), true, '広告と表示'); eq(/line\.me\/R\/ti\/p\/@736dykzx/.test(html), true, 'LINE');
eq(/application\/ld\+json/.test(html), true, 'JSON-LD'); eq(/売買の判断をしません/.test(html), true, '売買の判断をしない注意');
eq(/fetch\(|XMLHttpRequest/.test(js), false, '入力を送信しない');
eq(/https?:\/\/(?!tools\.equaglobal\.com|schema\.org|www\.googletagmanager\.com|line\.me\/R\/ti\/p\/@736dykzx)/.test(html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/,'')), false, '外部URLなし');
[...js.matchAll(/\$\('([\w-]+)'\)/g)].map(m => m[1]).forEach(id => eq(html.includes('id="' + id + '"'), true, 'id: ' + id));
console.log(p + ' passed, ' + f + ' failed'); process.exit(f ? 1 : 0);
