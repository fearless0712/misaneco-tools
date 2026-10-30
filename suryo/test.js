/* 建設の数量計算ツールの確認：node suryo/test.js */
const S = require('./logic.js'), fs = require('fs'), path = require('path');
let p = 0, f = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) p++; else { f++; console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); } };
const has = (arr, s, m) => eq(arr.some(t => t.includes(s)), true, m + ' に「' + s + '」');

// ---------- 数の読み取り・切り上げ ----------
eq(S.num('23.5'), 23.5, '小数'); eq(S.num('２３．５'), 23.5, '全角'); eq(S.num('1,234.5'), 1234.5, 'カンマ');
eq(S.num('10%'), 10, '％'); eq(S.num('１０％'), 10, '全角％'); eq(S.num('23.5m'), 23.5, '単位m'); eq(S.num('4.5㎡'), 4.5, '単位㎡');
eq(S.num(''), null, '空'); eq(Number.isNaN(S.num('abc')), true, '文字'); eq(Number.isNaN(S.num('1.2.3')), true, '点が2つ'); eq(S.num('-3'), -3, '負');
eq(S.num('.5'), 0.5, '.5');
eq(S.ceil(5.875), 6, '5.875→6'); eq(S.ceil(6), 6, '割り切れる'); eq(S.ceil(0), 0, '0'); eq(S.ceil(0.1 + 0.2), 1, '0.30000000000000004→1');
eq(S.ceil(0.3 / 0.1), 3, '0.3/0.1 は 3（浮動小数の誤差で4にしない）'); eq(S.ceil(4.000000000001), 4, '誤差は切り上げない');
eq(S.ceilStep(7.56, 0.25), 7.75, 'CEILING 7.56'); eq(S.ceilStep(7.5, 0.25), 7.5, 'CEILING ちょうど'); eq(S.ceilStep(7.500001, 0.25), 7.75, 'CEILING 少し超え');
eq(S.ceilStep(0, 0.25), 0, 'CEILING 0'); eq(S.ceilStep(0.7, 0.1), 0.7, 'CEILING 0.7/0.1');
eq(S.fmt(1234.5678, 2), '1,234.57', 'fmt'); eq(S.fmt(310.8, 2), '310.8', 'fmt 末尾0'); eq(S.fmt(6, 3), '6', 'fmt 整数');

// ---------- 投稿の例（Threads・note）とツールの結果を一致させる ----------
// 塗料 例1（Threads 10/27 6:15）：120×0.15×2÷16＝2.25 → 3缶
let r = S.toryo({ area: '120', rate: '0.15', coats: '2', loss: '0', can: '16' });
eq([r.ok, r.value, r.total], [true, 3, 36], '塗料 例1');
eq(r.excel, ['=ROUNDUP(120*0.15*2/16,0)'], '塗料 例1 Excel');
has(r.steps, '2.25 → 切り上げて 3缶', '塗料 例1 途中');
eq(r.byStep, 4, '塗料 例1：工程ごとに切り上げると4缶（合計してからなら3缶＝1缶減る）');
// 塗料 例2（Threads 10/22 17:15）：197.96㎡・0.15・ロス10％・16kg缶 → 中塗り32.66kg・上塗り32.66kg、別々6缶・合計65.33kgで5缶
r = S.toryo({ area: '197.96', rate: '0.15', coats: '2', loss: '10', can: '16' });
eq([r.value, S.fmt(r.perCoat, 2), S.fmt(r.total, 2), r.byStep], [5, '32.66', '65.33', 6], '塗料 例2');
eq(r.excel, ['=ROUNDUP(197.96*0.15*2*(1+0.1)/16,0)'], '塗料 例2 Excel');
has(r.steps, '3缶 × 2回 ＝ 6缶（1缶多い）', '塗料 例2 くらべ');
// note 82（15kg缶）：0.15×ロス10％ → 1工程32.66kg、合計65.33kg→4.36→5缶、工程ごと6缶
r = S.toryo({ area: '197.96', rate: '0.15', coats: '2', loss: '10', can: '15' });
eq([r.value, r.byStep, S.fmt(r.total / 15, 2)], [5, 6, '4.36'], 'note82 15kg缶');
eq(S.toryo({ area: '197.96', rate: '0.11', coats: '2', loss: '10', can: '15' }).value, 4, 'note82 0.11→4缶');
eq(S.toryo({ area: '197.96', rate: '0.17', coats: '2', loss: '10', can: '15' }).value, 5, 'note82 0.17→5缶');
eq(S.fmt(S.toryo({ area: '197.96', rate: '0.14', coats: '2', loss: '0', can: '15' }).total, 2), '55.43', 'note82 ロス込みの値はロス0％');
eq(S.toryo({ area: '197.96', rate: '0.14', coats: '2', loss: '0', can: '15' }).value, 4, 'note82 そのまま4缶');
eq(S.toryo({ area: '197.96', rate: '0.14', coats: '2', loss: '10', can: '15' }).value, 5, 'note82 二重に足すと5缶');
// 塗料の境界
eq(S.toryo({ area: '160', rate: '0.1', coats: '1', loss: '0', can: '16' }).value, 1, '塗料 ちょうど1缶');
r = S.toryo({ area: '0', rate: '0.15', coats: '2', loss: '10', can: '16' }); eq([r.ok, r.value, r.byStep], [true, 0, 0], '塗料 面積0');
eq(S.toryo({ area: '0.3', rate: '1', coats: '1', loss: '0', can: '0.1' }).value, 3, '塗料 0.3÷0.1 は3缶');
eq(S.toryo({ area: '100.5', rate: '0.125', coats: '3', loss: '7.5', can: '15' }).value, ceilJS(100.5 * 0.125 * 3 * 1.075 / 15), '塗料 小数');
eq(S.toryo({ area: '120', rate: '0.15', coats: '1', loss: '0', can: '16' }).steps.some(t => t.includes('くらべ')), false, '1回ならくらべは出さない');
eq(S.toryo({ area: '-1', rate: '0.15', coats: '2', loss: '0', can: '16' }).ok, false, '塗料 マイナス');
eq(S.toryo({ area: '120', rate: '0.15', coats: '2', loss: '0', can: '0' }).errors, ['1缶の量は0より大きい数を入れてください'], '塗料 1缶0');
eq(S.toryo({ area: '120', rate: '0.15', coats: '1.5', loss: '0', can: '16' }).errors, ['回数は整数で入れてください'], '塗料 回数小数');
eq(S.toryo({ area: '120', rate: '0.15', coats: '0', loss: '0', can: '16' }).errors, ['回数は1以上で入れてください'], '塗料 回数0');
eq(S.toryo({ area: '120', rate: '0.15', coats: '2', loss: '101', can: '16' }).ok, false, '塗料 ロス101％');
eq(S.toryo({ area: '120', rate: '0.15', coats: '2', loss: '', can: '16' }).value, 3, '塗料 ロス空は0％');
eq(S.toryo({ area: '', rate: '0.15', coats: '2', loss: '0', can: '16' }).errors, ['塗る面積を入れてください'], '塗料 面積空');
eq(S.toryo({ area: 'あ', rate: '0.15', coats: '2', loss: '0', can: '16' }).errors, ['塗る面積は数字で入れてください'], '塗料 文字');

// 配管（Threads・note83）：23.5÷4＝5.875 → 6本
r = S.haikan({ len: '23.5', sec: '0', sock: '35', cut: '3', margin: '0', stock: '4' });
eq([r.value, r.total], [6, 23.5], '配管 投稿の例'); eq(r.excel, ['=ROUNDUP(23.5/4,0)'], '配管 Excel');
has(r.steps, '23.5 ÷ 4 ＝ 5.875 → 切り上げて 6本', '配管 途中');
// note83：10区間 22.00m＋差し込み0.70＋切り代0.03＝22.73m、余裕10％で25.00m→6.25→7本、余裕なしは6本
r = S.haikan({ len: '22', sec: '10', sock: '35', cut: '3', margin: '10', stock: '4' });
eq([r.value, S.fmt(r.total, 2), S.fmt(r.withMargin, 2)], [7, '22.73', '25'], 'note83 10区間');
eq(r.excel, ['=ROUNDUP((22+10*(0.035*2+0.003))*(1+0.1)/4,0)'], 'note83 Excel');
eq(S.haikan({ len: '22', sec: '10', sock: '35', cut: '3', margin: '0', stock: '4' }).value, 6, 'note83 余裕なし6本');
// note83 の表：A（割って1本足す）と B（総延長に余裕10％）
[[4.2, 3, 2], [23.5, 7, 7], [100, 26, 28]].forEach(([L, A, B]) => {
  const x = S.haikan({ len: String(L), sec: '0', sock: '', cut: '', margin: '10', stock: '4' });
  eq([x.plusOne, x.value], [A, B], 'note83 表 ' + L + 'm');
});
// 配管の境界
eq(S.haikan({ len: '24', sec: '', sock: '', cut: '', margin: '', stock: '4' }).value, 6, '配管 ちょうど6本');
eq(S.haikan({ len: '0', sec: '0', sock: '35', cut: '3', margin: '10', stock: '4' }).value, 0, '配管 0m');
eq(S.haikan({ len: '3.93', sec: '1', sock: '35', cut: '0', margin: '0', stock: '4' }).value, 1, '配管 3.93+0.07=4.00 ちょうど1本');
eq(S.haikan({ len: '23.5', sec: '1.5', sock: '35', cut: '3', margin: '0', stock: '4' }).ok, false, '配管 区間小数');
eq(S.haikan({ len: '23.5', sec: '0', sock: '35', cut: '3', margin: '0', stock: '0' }).ok, false, '配管 定尺0');

// 残土（Threads）：24×1.2÷3＝9.6 → 10台
r = S.zando({ vol: '24', swell: '1.2', mode: 'vol', per: '3' });
eq([r.value, r.loose], [10, 28.8], '残土 投稿の例'); eq(r.excel, ['=ROUNDUP(24*1.2/3,0)'], '残土 Excel');
has(r.steps, '28.8 ÷ 3 ＝ 9.6 → 切り上げて 10台', '残土 途中');
// 積める重さから：1台 = 重さ÷1㎥の重さ
r = S.zando({ vol: '24', swell: '1.2', mode: 'weight', load: '3.6', dens: '1.8' });
eq([r.perTruck, r.value], [2, 15], '残土 重さから（3.6t÷1.8t/㎥＝2㎥、28.8÷2＝14.4→15台）');
eq(r.excel, ['=ROUNDUP(24*1.2/(3.6/1.8),0)'], '残土 重さ Excel');
eq(S.zando({ vol: '24', swell: '1.2', mode: 'weight', load: '', dens: '1.8' }).errors, ['1台に積める重さを入れてください'], '残土 重さ空');
eq(S.zando({ vol: '25', swell: '1.2', mode: 'vol', per: '3' }).value, 10, '残土 ちょうど10台（30÷3）');
eq(S.zando({ vol: '0', swell: '1.2', mode: 'vol', per: '3' }).value, 0, '残土 0');
eq(S.zando({ vol: '24', swell: '0.9', mode: 'vol', per: '3' }).ok, false, '残土 ほぐし率1未満');
eq(S.zando({ vol: '24', swell: '1', mode: 'vol', per: '3' }).value, 8, '残土 ほぐし率1');
eq(S.zando({ vol: '24', swell: '1.2', mode: 'vol', per: '0' }).ok, false, '残土 1台0');

// クロス（Threads）：12.74÷0.92＝13.85→14枚、14×2.5＝35m、面積÷幅なら33.2m
r = S.cross({ peri: '12.74', h: '2.4', w: '0.92', cut: '0.1', rep: '0' });
eq([r.strips, r.stripLen, r.value, S.fmt(r.byArea, 1)], [14, 2.5, 35, '33.2'], 'クロス 投稿の例');
eq(r.excel, ['=ROUNDUP(12.74/0.92,0)*(2.4+0.1)'], 'クロス Excel');
eq(S.cross({ peri: '12.88', h: '2.4', w: '0.92', cut: '0.1', rep: '' }).strips, 14, 'クロス ちょうど14枚（0.92×14）');
r = S.cross({ peri: '12.74', h: '2.4', w: '0.92', cut: '0.1', rep: '0.32' });
eq([r.stripLen, r.value], [2.82, 39.48], 'クロス 柄の送り0.32m');
eq(r.excel, ['=ROUNDUP(12.74/0.92,0)*(2.4+0.1+0.32)'], 'クロス 柄 Excel');
eq(S.cross({ peri: '0', h: '2.4', w: '0.92', cut: '0.1', rep: '' }).value, 0, 'クロス 0');
eq(S.cross({ peri: '12.74', h: '2.4', w: '0', cut: '0.1', rep: '' }).ok, false, 'クロス 幅0');

// タイル（Threads）：4.5÷0.303²＝49.0 → ×1.1＝53.9 → 54枚、11枚入りで5ケース
r = S.tile({ area: '4.5', size: '300', joint: '3', loss: '10', pc: '11' });
eq([r.pitch, r.value, r.cases], [0.303, 54, 5], 'タイル 投稿の例');
eq(r.excel, ['=ROUNDUP(4.5/0.303^2*(1+0.1),0)', '=ROUNDUP(54/11,0)'], 'タイル Excel');
has(r.steps, '49.015', 'タイル 途中'); has(r.steps, '53.916', 'タイル 途中ロス');
eq(S.tile({ area: String(0.303 * 0.303 * 49), size: '300', joint: '3', loss: '0', pc: '' }).value, 49, 'タイル ちょうど49枚');
eq(S.tile({ area: '4.5', size: '300', joint: '3', loss: '10', pc: '' }).cases, null, 'タイル ケース空');
eq(S.tile({ area: '4.5', size: '300', joint: '3', loss: '10', pc: '' }).excel.length, 1, 'タイル ケース空ならExcel1本');
eq(S.tile({ area: '4.5', size: '300', joint: '', loss: '', pc: '' }).value, 50, 'タイル 目地0・ロス0（4.5÷0.09＝50）');
eq(S.tile({ area: '0', size: '300', joint: '3', loss: '10', pc: '11' }).value, 0, 'タイル 0');
eq(S.tile({ area: '4.5', size: '300', joint: '3', loss: '10', pc: '10.5' }).ok, false, 'タイル ケース小数');
eq(S.tile({ area: '4.5', size: '0', joint: '3', loss: '10', pc: '11' }).ok, false, 'タイル 1辺0');

// 生コン（Threads）：60×0.12×1.05＝7.56 → 7.75㎥、7.75÷4.25 → 2台
r = S.namacon({ area: '60', cm: '12', loss: '5', step: '0.25', truck: '4.25' });
eq([r.vol, r.value, r.trucks], [7.56, 7.75, 2], '生コン 投稿の例');
eq(r.excel, ['=CEILING(60*0.12*(1+0.05),0.25)', '=ROUNDUP(7.75/4.25,0)'], '生コン Excel');
eq(S.namacon({ area: '62.5', cm: '12', loss: '0', step: '0.25', truck: '4.25' }).value, 7.5, '生コン ちょうど7.5㎥');
eq(S.namacon({ area: '60', cm: '12', loss: '5', step: '0.25', truck: '3.875' }).trucks, 2, '生コン 7.75÷3.875 ちょうど2台');
eq(S.namacon({ area: '60', cm: '12', loss: '5', step: '0.25', truck: '' }).trucks, null, '生コン 台数なし');
eq(S.namacon({ area: '0', cm: '12', loss: '5', step: '0.25', truck: '4.25' }).value, 0, '生コン 0');
eq(S.namacon({ area: '60', cm: '12', loss: '5', step: '0', truck: '4.25' }).ok, false, '生コン 刻み0');
eq(S.namacon({ area: '10', cm: '10.5', loss: '0', step: '0.1', truck: '' }).value, 1.1, '生コン 小数（1.05→1.1）');

// 足場（Threads）：(36.4＋8)×7＝310.8㎡
r = S.ashiba({ peri: '36.4', off: '1', h: '7' });
eq([r.len, r.value], [44.4, 310.8], '足場 投稿の例'); eq(r.excel, ['=(36.4+1*8)*7'], '足場 Excel');
eq(S.ashiba({ peri: '36.4', off: '0', h: '7' }).value, 254.8, '足場 離れ0');
eq(S.ashiba({ peri: '0', off: '0', h: '7' }).value, 0, '足場 0');
eq(S.ashiba({ peri: '36.4', off: '1.2', h: '6.5' }).value, 299.0, '足場 小数（(36.4+9.6)×6.5）');

// ---------- 画面（HTML） ----------
const html = fs.readFileSync(__dirname + '/index.html', 'utf8'), js = fs.readFileSync(__dirname + '/app.js', 'utf8'), lg = fs.readFileSync(__dirname + '/logic.js', 'utf8');
const NAMES = ['toryo', 'haikan', 'zando', 'cross', 'tile', 'namacon', 'ashiba'];
// 初期値（ページを開いたときの数字）が投稿の例の答えになる
const sec = n => new RegExp('<section[^>]*id="' + n + '"[\\s\\S]*?</section>').exec(html)[0];
const init = n => { const v = {}; for (const m of sec(n).matchAll(/<input id="[\w-]+" data-k="(\w+)"[^>]*?(?:type="radio"[^>]*value="(\w+)"( checked)?|value="([^"]*)")/g)) { if (m[2] !== undefined) { if (m[3]) v[m[1]] = m[2]; } else v[m[1]] = m[4]; } return v; };
const want = { toryo: [3, '=ROUNDUP(120*0.15*2/16,0)'], haikan: [6, '=ROUNDUP(23.5/4,0)'], zando: [10, '=ROUNDUP(24*1.2/3,0)'], cross: [35, '=ROUNDUP(12.74/0.92,0)*(2.4+0.1)'], tile: [54, '=ROUNDUP(4.5/0.303^2*(1+0.1),0)'], namacon: [7.75, '=CEILING(60*0.12*(1+0.05),0.25)'], ashiba: [310.8, '=(36.4+1*8)*7'] };
NAMES.forEach(n => {
  const x = S.CALC[n](init(n));
  eq([x.ok, x.value, x.excel[0]], [true].concat(want[n]), '初期値＝投稿の例 ' + n);
  x.excel.forEach(e => eq(/^[\x20-\x7e]+$/.test(e), true, 'Excelの式は半角 ' + e));
  // 例ボタンの値でも計算できる
  [...sec(n).matchAll(/data-ex='([^']+)'/g)].forEach(m => eq(S.CALC[n](JSON.parse(m[1])).ok, true, '例ボタン ' + n + ' ' + m[1]));
  eq(sec(n).includes('id="' + n + '-big"') && sec(n).includes('id="' + n + '-steps"') && sec(n).includes('id="' + n + '-xl"') && sec(n).includes('id="' + n + '-err"') && sec(n).includes('id="' + n + '-sub"'), true, '結果の欄 ' + n);
  eq(/<p class="cond"><b>条件：<\/b>/.test(sec(n)), true, '条件1行 ' + n);
  eq(sec(n).includes('href="../studio/kensetsu/free/"') && sec(n).includes('href="../studio/kensetsu/"') && sec(n).includes('この数量をそのまま見積に'), true, '見積への案内 ' + n);
  eq(html.includes('id="t-' + n + '" aria-controls="' + n + '"'), true, 'タブ ' + n);
  eq(/data-k="\w+"/.test(sec(n)), true, '入力 ' + n);
});
// 塗料の例2ボタン＝Threads 10/22（197.96㎡・ロス10％→5缶）
eq(S.toryo(JSON.parse(/data-ex='([^']*197\.96[^']*)'/.exec(html)[1])).value, 5, '塗料 例2ボタン');
eq(S.haikan(JSON.parse(/data-ex='([^']*"sec":"10"[^']*)'/.exec(html)[1])).value, 7, '配管 例2ボタン');
// 投稿で指摘された点がページにある
eq(/ロス率は塗り方の補正の欄/.test(html) && /はけ・ローラー・吹き付け/.test(html), true, '塗料：ロス率・塗り方の補正');
eq(/余裕は、割ったあとに1本足すのではなく、割る前の総延長に入れます/.test(html), true, '配管：余裕は総延長へ');
eq(/荷台に入る量ではなく、積める重さから出した量/.test(html) && html.includes('id="zando-mode-weight"'), true, '残土：積める重さ');
// 安全・決まり
eq(/Content-Security-Policy/.test(html), true, 'CSP'); eq(/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(js), false, 'innerHTMLなし');
eq(/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(js + lg), false, '入力を送信しない');
eq(/ads-inter\.js/.test(html) && /広告/.test(html), true, '広告と表示'); eq(/line\.me\/R\/ti\/p\/@736dykzx/.test(html), true, 'LINE');
eq(/<link rel="canonical" href="https:\/\/tools\.equaglobal\.com\/suryo\/">/.test(html), true, 'canonical');
eq(/og:url" content="https:\/\/tools\.equaglobal\.com\/suryo\/"/.test(html), true, 'OGP');
eq(JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1])['@type'], 'WebApplication', 'JSON-LD');
eq(/外部に送信しません/.test(html), true, '送信しない明記');
const vis = html.replace(/<script[\s\S]*?<\/script>/g, '');
eq(/\bAI\b|ＡＩ|人工知能|AIで|AIを/.test(vis + js), false, 'AIの文言がない');
eq(/未確認|確認していません|確かめていません/.test(vis), false, '未確認の文言がない');
eq(/BOOTH|booth\.pm|[0-9,]+円|¥/.test(vis), false, '価格・BOOTHの名前がない');
eq(/https?:\/\/(?!tools\.equaglobal\.com|schema\.org|www\.googletagmanager\.com|line\.me\/R\/ti\/p\/@736dykzx)/.test(html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '')), false, '外部URLなし');
const ga = require(path.join(__dirname, '..', 'assets', 'ga-test-helper.js')).stripGA(html);
eq(ga.problems, [], 'GAは決まった形だけ');
eq((ga.html.match(/<script[^>]*src="([^"]+)"/g) || []).every(s => !/https?:/.test(s)), true, 'GA以外の外部スクリプトなし');
[...js.matchAll(/\$\('([\w-]+)'\)/g)].map(m => m[1]).forEach(id => eq(html.includes('id="' + id + '"'), true, 'id: ' + id));
['../blog/tosou-menseki-kansu-keisan/', '../blog/kensetsu-jimu-jidouka-iriguchi/', '../kouki/', '../riekiritsu/', '../shiharai/', '../studio/kensetsu/', '../studio/kensetsu/free/'].forEach(u => {
  eq(html.includes('href="' + u + '"'), true, 'リンク ' + u);
  eq(fs.existsSync(path.join(__dirname, u, 'index.html')), true, 'リンク先がある ' + u);
});
['../hiwari/app.css', 'app.css', '../assets/ads-inter.css', 'logic.js', 'app.js', '../assets/ads-inter.js', '../assets/ga.js'].forEach(u => eq(html.includes(u + '?v='), true, '読み込み ' + u));
const title = /<title>([^<]*)<\/title>/.exec(html)[1];
eq(['塗料', '配管', '残土', 'クロス', 'タイル', '生コン', '足場'].every(w => title.includes(w)), true, 'titleに7種類');
eq(/<h1>建設の数量計算（塗料・配管・残土・クロス・タイル・生コン・足場）<\/h1>/.test(html), true, 'h1');
console.log(p + ' passed, ' + f + ' failed'); process.exit(f ? 1 : 0);

function ceilJS(x) { return Math.ceil(Number(x.toPrecision(12))); }
