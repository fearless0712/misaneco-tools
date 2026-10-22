/* 金利が上がったら返済はいくら増える？（ローン返済シミュレーター）の確認：node kinri/test.js */
const K = require('./logic.js'), fs = require('fs'), path = require('path');
let p = 0, f = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) p++; else { f++; console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); } };
const near = (a, b, m, e) => { if (Math.abs(a - b) <= (e || 1e-4)) p++; else { f++; console.log('FAIL', m, a, b); } };
const L = o => K.calcLoan(Object.assign({ balance: '', years: '', months: '', rateNow: '', rateNew: '', method: 'ganri', rule5: false }, o));

// 入力の読み取り
eq(K.num('3,000'), 3000, 'カンマ'); eq(K.num('３０００万円'), 3000, '全角＋万円'); eq(K.num('0.5%'), 0.5, '％');
eq(K.num('０．２５％'), 0.25, '全角小数'); eq(K.num('.5'), 0.5, '.5'); eq(K.num(''), null, '空');
eq(Number.isNaN(K.num('-1')), true, 'マイナス'); eq(Number.isNaN(K.num('abc')), true, '文字');
eq(K.addRate(0.5, 0.25), 0.75, '+0.25'); eq(K.addRate(0.1, 0.2), 0.3, '0.1+0.2 の誤差なし'); eq(K.addRate(1.25, 1), 2.25, '+1.0');

/*
 * PMT（元利均等）を手計算と照合。期待値は Excel の =PMT(年利/12, 回数, -残高) と同じ式
 *   PMT = P × r ÷ (1 − (1 + r)^−n)  （r = 年利 ÷ 12、n = 月数）
 * で別に計算した値（Python で検算、小数4桁）。
 */
[
  [0.5, 360, 30000000, 89756.8522], [1.0, 360, 30000000, 96491.8561], [0.75, 360, 30000000, 93085.5290],
  [1.25, 360, 30000000, 99975.5052], [1.0, 240, 20000000, 91978.8614], [1.5, 240, 20000000, 96509.0818],
  [2.0, 60, 5000000, 87638.8003], [2.5, 60, 5000000, 88736.8080], [1.5, 420, 30000000, 91855.3319]
].forEach(x => near(K.pmt(x[0], x[1], x[2]), x[3], 'PMT ' + x.join(' / ')));
// 手計算 1：r = 0.01/12、(1+r)^360 = 1.349353…、PMT = 30,000,000 × r × 1.349353 / 0.349353 ≒ 96,491.86
near(30000000 * (0.01 / 12) * Math.pow(1 + 0.01 / 12, 360) / (Math.pow(1 + 0.01 / 12, 360) - 1), 96491.8561, '手計算の別の形');
// 0%：残高 ÷ 回数
eq(K.pmt(0, 120, 12000000), 100000, '0% は割るだけ');
// 1回払い：元金＋1か月分の利息
near(K.pmt(12, 1, 1000000), 1010000, '1回払い');

// 例1：3,000万円・30年・0.5%→1.0%
let r = L({ balance: '3000', years: '30', rateNow: '0.5', rateNew: '1.0' });
eq([r.state, r.n, r.payNow, r.payNew, r.diffMonth, r.diffYear], ['ok', 360, 89757, 96492, 6735, 80820], '例1 毎月');
eq([r.totalNow, r.totalNew, r.interestNow, r.interestNew, r.diffTotal], [32312467, 34737068, 2312467, 4737068, 2424601], '例1 総返済・利息');
// 例2：3,000万円・30年・0.75%→1.0%（＋0.25%）
r = L({ balance: '3000', years: '30', rateNow: '0.75', rateNew: '1' });
eq([r.payNow, r.payNew, r.diffMonth, r.diffYear], [93086, 96492, 3406, 40872], '例2 +0.25%');
// 例3：2,000万円・20年・1.0%→1.5%
r = L({ balance: '2,000', years: '20', rateNow: '1', rateNew: '1.5' });
eq([r.payNow, r.payNew, r.diffMonth, r.totalNow, r.totalNew], [91979, 96509, 4530, 22074927, 23162180], '例3');
// 例4：事業の借入れ 500万円・5年・2.0%→2.5%
r = L({ balance: '500', years: '5', rateNow: '2.0', rateNew: '2.5' });
eq([r.payNow, r.payNew, r.diffMonth, r.interestNow, r.interestNew], [87639, 88737, 1098, 258328, 324208], '例4 運転資金');
// 年＋か月：32年4か月 = 388回
eq(L({ balance: '3000', years: '32', months: '4', rateNow: '1', rateNew: '1' }).n, 388, '年とか月');
eq(L({ balance: '3000', years: '0', months: '6', rateNow: '1', rateNew: '1' }).n, 6, '6か月だけ');
// 0%金利
r = L({ balance: '1200', years: '10', rateNow: '0', rateNew: '0' });
eq([r.payNow, r.payNew, r.interestNow, r.diffMonth], [100000, 100000, 0, 0], '0%→0%');
r = L({ balance: '1200', years: '10', rateNow: '0', rateNew: '0.5' });
eq([r.payNow, r.payNew], [100000, Math.round(K.pmt(0.5, 120, 12000000))], '0%→0.5%');
// 金利が下がる場合は減る
eq(L({ balance: '3000', years: '30', rateNow: '1.0', rateNew: '0.5' }).diffMonth, -6735, '下がると減る');

// 元金均等：3,000万円・30年・0.5%→1.0%
//   1回目 = 30,000,000/360 + 30,000,000×0.005/12 = 83,333.33 + 12,500 = 95,833.33 → 95,833
//   利息の合計 = P × r × (n+1)/2 = 30,000,000 × 0.005/12 × 361/2 = 2,256,250
r = L({ balance: '3000', years: '30', rateNow: '0.5', rateNew: '1.0', method: 'gankin' });
eq([r.payNow, r.payNew, r.diffMonth, r.interestNow, r.interestNew, r.lastNow, r.lastNew], [95833, 108333, 12500, 2256250, 4512500, 83368, 83403], '元金均等');
eq(r.rule5, false, '元金均等は5年ルールの計算なし');
eq(L({ balance: '3000', years: '30', rateNow: '0.5', rateNew: '1.0', method: 'gankin', rule5: true }).rule5Ignored, true, '元金均等でチェック→注意だけ');
// 元金均等 0%：毎回 元金÷回数
r = L({ balance: '120', years: '1', rateNow: '0', rateNew: '0', method: 'gankin' });
eq([r.payNow, r.lastNow, r.interestNow], [100000, 100000, 0], '元金均等 0%');
// 元金均等の利息合計を1回ずつ足した値と照合
(function () { let P = 20000000, n = 240, rr = 0.015 / 12, s = 0; for (let i = 0; i < n; i++) s += (P - P / n * i) * rr; near(K.gankin(1.5, n, P).interest, s, '元金均等 利息を1回ずつ足す', 1e-3); })();

// 5年ルール・125%ルール（例1）
r = L({ balance: '3000', years: '30', rateNow: '0.5', rateNew: '1.0', rule5: true });
let fv = r.five;
eq([r.rule5, fv.months, Math.round(fv.pay), Math.round(fv.interestOld), Math.round(fv.interestNew)], [true, 60, 89757, 12500, 25000], '5年ルール 返済額据え置き・1回目の利息');
eq([Math.round(fv.shareOld * 1000), Math.round(fv.shareNew * 1000)], [139, 279], '利息の割合 13.9%→27.9%');
eq([fv.unpaid, fv.unpaidNow, fv.capped], [0, false, false], '例1 未払い利息なし');
eq(fv.balance > fv.balanceIfNoRise, true, '元金の減りが遅い');
// 5年後の残高を、1回ずつの計算と照合（据え置きの返済額・1.0%）
(function () { let b = 30000000, pay = K.pmt(0.5, 360, 30000000); for (let i = 0; i < 60; i++) b -= pay - b * 0.01 / 12; near(fv.balance, b, '5年後の残高', 1e-3);
  near(fv.next, K.pmt(1.0, 300, b), '6年目からの返済額（上限に届かない）', 1e-3); })();
// 金利が上がらなかった場合の5年後の残高 = 元利均等の残高の式
(function () { const rr = 0.005 / 12, pay = K.pmt(0.5, 360, 30000000); const b = 30000000 * Math.pow(1 + rr, 60) - pay * (Math.pow(1 + rr, 60) - 1) / rr; near(fv.balanceIfNoRise, b, '上がらなかった場合の残高', 1e-3); })();
// 大きく上がる：0.5%→5.0% → 未払い利息と125%の上限
r = L({ balance: '3000', years: '30', rateNow: '0.5', rateNew: '5', rule5: true }); fv = r.five;
eq([fv.unpaidNow, fv.firstUnpaid, fv.unpaid > 0, fv.capped], [true, 1, true, true], '5% 未払い利息と上限');
near(fv.next, fv.pay * 1.25, '125%の上限', 1e-6);
eq(fv.balance, 30000000, '利息に足りない間は元金が減らない');
near(fv.unpaid, (30000000 * 0.05 / 12 - fv.pay) * 60, '未払い利息 = (利息 − 返済額) × 60', 1e-3);
// 残りが5年より短い：据え置きの回数は残りまで、6年目はない
r = L({ balance: '500', years: '3', rateNow: '1', rateNew: '2', rule5: true });
eq([r.five.months, r.five.next, r.five.rest], [36, null, 0], '残り3年');
// 金利が上がらないときは5年ルールの表示なし
eq(L({ balance: '3000', years: '30', rateNow: '1', rateNew: '1', rule5: true }).rule5, false, '上がらないとき');

// エラー
eq(L({}).state, 'empty', '空');
eq(L({ balance: 'abc', years: '30', rateNow: '1', rateNew: '1' }).state, 'error', '残高が文字');
eq(L({ balance: '3000', years: '', rateNow: '1', rateNew: '1' }).state, 'error', '期間なし');
eq(L({ balance: '3000', years: '30.5', rateNow: '1', rateNew: '1' }).state, 'error', '年が小数');
eq(L({ balance: '3000', years: '30', months: '12', rateNow: '1', rateNew: '1' }).state, 'error', '12か月');
eq(L({ balance: '3000', years: '51', rateNow: '1', rateNew: '1' }).state, 'error', '50年超');
eq(L({ balance: '3000', years: '30', rateNow: '1', rateNew: '' }).state, 'error', '金利なし');
eq(L({ balance: '3000', years: '30', rateNow: '1', rateNew: '25' }).state, 'error', '金利20%超');

// 預金：税 20.315%（所得税・復興特別所得税 15.315%＋住民税 5%、国税庁 No.1310）
eq(K.TAX, 0.20315, '税率');
eq(K.afterTax(10000), 10000 - 1531 - 500, '1万円の利息 → 7,969円');
eq(K.afterTax(0), 0, '0円');
let d = K.calcDeposit({ deposit: '300', dRateNow: '0.2', dRateNew: '0.3' });
// 6,000 − 918(918.9) − 300 = 4,782 ／ 9,000 − 1,378(1,378.35) − 450 = 7,172
eq([d.state, d.grossNow, d.grossNew, d.diffGross, d.netNow, d.netNew, d.diffNet], ['ok', 6000, 9000, 3000, 4782, 7172, 2390], '預金 300万円 0.2→0.3%');
d = K.calcDeposit({ deposit: '1000', dRateNow: '0.4', dRateNew: '0.5' });
eq([d.grossNow, d.grossNew, d.netNow, d.netNew], [40000, 50000, 31874, 39843], '預金 1000万円 0.4→0.5%');
near(d.diffNet, (50000 - 40000) * (1 - 0.20315), '差 ≒ 税引き前の差×(1−20.315%)', 2);
eq(K.calcDeposit({ deposit: '', dRateNow: '', dRateNew: '' }).state, 'empty', '預金 空');
eq(K.calcDeposit({ deposit: '300', dRateNow: '0.2', dRateNew: '' }).state, 'error', '預金 金利なし');
eq(K.calcDeposit({ deposit: '0.5', dRateNow: '0.001', dRateNew: '0.001' }).grossNow, 0, '1円未満は0');

eq(K.yen(1234567), '1,234,567円', 'yen'); eq(K.yen(-6735), '−6,735円', 'yen マイナス'); eq(K.pct(0.2785), '27.9％', 'pct');

// ページ
const ga = require(path.join(__dirname, '..', 'assets', 'ga-test-helper.js')).stripGA(fs.readFileSync(__dirname + '/index.html', 'utf8'));
eq(ga.problems, [], 'GA4のタグ・注記・CSP');
const html = ga.html, js = fs.readFileSync(__dirname + '/app.js', 'utf8'), lg = fs.readFileSync(__dirname + '/logic.js', 'utf8');
eq(/Content-Security-Policy/.test(html), true, 'CSP'); eq(/connect-src 'none'/.test(html), true, 'GA以外は通信しない');
eq(/innerHTML/.test(js), false, 'innerHTMLなし');
eq(/fetch\(|XMLHttpRequest|sendBeacon/.test(js + lg), false, '入力を送信しない');
eq(/<script>|\son\w+=/.test(html), false, 'インラインのJSなし');
eq(/ads-inter\.js/.test(html) && /広告/.test(html), true, '広告と表示'); eq(/line\.me\/R\/ti\/p\/@736dykzx/.test(html), true, 'LINE');
eq(/application\/ld\+json/.test(html), true, 'JSON-LD'); eq(/<link rel="canonical" href="https:\/\/tools\.equaglobal\.com\/kinri\/">/.test(html), true, 'canonical');
eq(/og:url" content="https:\/\/tools\.equaglobal\.com\/kinri\/"/.test(html), true, 'OGP');
eq(/契約によって違います/.test(html), true, '契約で違う注意'); eq(/金融機関や専門家に相談/.test(html), true, '判断は専門家へ');
eq(/投資や借入れの助言ではありません/.test(html), true, '助言ではない'); eq(/20\.315％/.test(html), true, '税率の表示');
eq(/外部に送信しません/.test(html), true, '送信しない明記'); eq(/AIを活用して作成し、テストで/.test(html), true, 'AI明記');
eq(/事業の借入れ/.test(html) && /運転資金/.test(html), true, '事業の借入れにも使える');
// ページの例の数字が計算と一致
eq(html.includes('89,757円 → 96,492円') && html.includes('月 6,735円（年 80,820円）'), true, '例1の数字');
eq(html.includes('87,639円 → 88,737円（月 1,098円増）'), true, '例4の数字');
eq(html.includes('6,000円 → 9,000円') && html.includes('4,782円 → 7,172円'), true, '預金の例の数字');
['../riekiritsu/', '../hiwari/', '../hozon/'].forEach(u => {
  eq(html.includes('href="' + u + '"'), true, 'リンク ' + u);
  eq(fs.existsSync(path.join(__dirname, u, 'index.html')), true, 'リンク先がある ' + u);
});
eq(html.includes('href="../blog/boj-rate-hike-loan-deposit/"'), true, '解説記事へのリンク');
eq(fs.existsSync(path.join(__dirname, '..', '..', '..', 'blog', 'src', 'boj-rate-hike-loan-deposit.md')), true, '解説記事の原稿がある');
eq(/https?:\/\/(?!tools\.equaglobal\.com|schema\.org|line\.me\/R\/ti\/p\/@736dykzx)/.test(html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '')), false, '外部URLなし');
[...js.matchAll(/\$\('([\w-]+)'\)/g)].map(m => m[1]).forEach(id => eq(html.includes('id="' + id + '"'), true, 'id: ' + id));
eq((html.match(/data-step="/g) || []).length, 3, '+0.25/+0.5/+1.0 のボタン');
console.log(p + ' passed, ' + f + ' failed'); process.exit(f ? 1 : 0);
