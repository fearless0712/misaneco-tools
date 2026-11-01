/* フリーランス・個人事業主スタジオの計算の確認：node test.js
   期待値はすべて手計算（電卓）で出したもの。根拠は国税庁の公式ページ（2026-10-29に確認）：
   ・源泉徴収の税率と端数：タックスアンサー No.2795「原稿料や講演料等を支払ったとき」
       https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2795.htm
       100万円以下 10.21%、100万円超（A−100万円）×20.42%＋102,100円、1円未満切り捨て。150万円の例 → 204,200円
   ・令和9年1月以後も合計税率は同じ（888,888円 × 10.21% → 90,755円 の例）
       https://www.nta.go.jp/publication/pamph/pdf/0026005-024_02.pdf
   ・インボイスの記載事項6つ：https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/invoice_about.htm
   ・消費税の端数処理は1枚につき税率ごとに1回（Q&A 問57）：https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/pdf/qa/57.pdf
   支払期日は 支払期日の計算ツール（/shiharai/）と同じ計算・同じ祝日データ、家事按分は 家事按分 計算ツール（/anbun/）と同じ考え方。 */
'use strict';
const K = require('./assets/logic.js'), DA = require('./assets/data.js');
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('FAIL', m, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b)); } };
const D = K.D;
const rd = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const html = rd('index.html'), app = rd('assets/app.js'), css = rd('assets/app.css'), logic = rd('assets/logic.js'), data = rd('assets/data.js');

// ===== 1) 源泉徴収（No.2795）=====
eq(K.withholding(1000000), 102100, '源泉：100万円ちょうど → 1,000,000×10.21% ＝ 102,100');
eq(K.withholding(999999), 102099, '源泉：999,999 × 10.21% ＝ 102,099.8979 → 102,099（1円未満切り捨て）');
eq(K.withholding(1000001), 102100, '源泉：1,000,001 →（1）×20.42% ＝ 0.2042 → 0 ＋102,100 ＝ 102,100');
eq(K.withholding(1000005), 102101, '源泉：1,000,005 →（5）×20.42% ＝ 1.021 → 1 ＋102,100 ＝ 102,101');
eq(K.withholding(1500000), 204200, '源泉：150万円 →（50万）×20.42% ＋102,100 ＝ 204,200（国税庁の例と同じ）');
eq(K.withholding(2000000), 306300, '源泉：200万円 → 204,200 ＋ 102,100 ＝ 306,300');
eq(K.withholding(888888), 90755, '源泉：888,888 × 10.21% ＝ 90,755.4648 → 90,755（令和9年以後のあらましの例と同じ）');
eq(K.withholding(150000), 15315, '源泉：150,000 × 10.21% ＝ 15,315');
eq(K.withholding(120000), 12252, '源泉：120,000 × 10.21% ＝ 12,252');
eq(K.withholding(60000), 6126, '源泉：60,000 × 10.21% ＝ 6,126');
eq(K.withholding(33333), 3403, '源泉：33,333 × 10.21% ＝ 3,403.2993 → 3,403');
eq(K.withholding(9), 0, '源泉：9 × 10.21% ＝ 0.9189 → 0');
eq(K.withholding(0), 0, '源泉：0円 → 0');
eq(/10\.21%/.test(K.whFormula(150000)) && /15,315/.test(K.whFormula(150000)), true, '源泉の式の表示（100万円以下）');
eq(/20\.42%/.test(K.whFormula(1500000)) && /102,100/.test(K.whFormula(1500000)) && /204,200/.test(K.whFormula(1500000)), true, '源泉の式の表示（100万円超）');
// 1円刻みで境目のまわりを、別の書き方（小数の計算 → 切り捨て）と照らし合わせる
let ok = true;
for (let a = 990000; a <= 1010000; a++) {
  const want = a <= 1000000 ? Math.floor(Math.round(a * 1021) / 10000) : Math.floor(Math.round((a - 1000000) * 2042) / 10000) + 102100;
  if (K.withholding(a) !== want) { ok = false; console.log('wh', a, K.withholding(a), want); break; }
}
eq(ok, true, '源泉：99万〜101万円を1円ずつ確認（境目の前後で式が切り替わる）');
eq(K.withholding(1000001) >= K.withholding(1000000) && K.withholding(1000000) >= K.withholding(999999), true, '源泉：境目で税額が下がらない');

// ===== 2) 消費税（税率ごとに1回の端数処理）=====
const it = (item, qty, price, rate) => ({ item, qty, price, rate: rate || 10 });
let c = K.invCalc([it('A', 1, 105), it('B', 1, 105), it('C', 1, 105)], 'floor');
eq([c.sub, c.tax, c.total], [315, 31, 346], '消費税：105円×3行 → 315×10% ＝ 31.5 → 31（1行ずつ切り捨てて足すと30になるが、それはしない）');
c = K.invCalc([it('10%の品', 3, 4115, 10), it('8%の品', 1, 1234, 8)], 'floor');
eq([c.by[10].base, c.by[10].tax, c.by[8].base, c.by[8].tax, c.total], [12345, 1234, 1234, 98, 14911], '消費税：10%対象12,345→1,234.5→1,234／8%対象1,234→98.72→98／合計14,911');
c = K.invCalc([it('10%の品', 3, 4115, 10), it('8%の品', 1, 1234, 8)], 'round');
eq([c.by[10].tax, c.by[8].tax], [1235, 99], '消費税（四捨五入）：1,234.5→1,235／98.72→99');
c = K.invCalc([it('10%の品', 3, 4115, 10), it('8%の品', 1, 1234, 8)], 'ceil');
eq([c.by[10].tax, c.by[8].tax], [1235, 99], '消費税（切り上げ）：1,234.5→1,235／98.72→99');
eq(c.rates, [10, 8], '税率の並び：10% → 8%');
c = K.invCalc([it('作業', 1.5, 3333)], 'floor');
eq(c.rows[0].amt, 5000, '1行の金額：1.5 × 3,333 ＝ 4,999.5 → 5,000（四捨五入）');
c = K.invCalc([it('', 1, 1000), it('単価なし', 1, '')], 'floor');
eq(c.rows.length, 0, '品目か単価が空の行は数えない');
c = K.invCalc([it('A', '２', '１２，０００円')], 'floor');
eq(c.sub, 24000, '全角の数字・カンマ・円も読む（2 × 12,000）');

// ===== 3) 請求書1枚（小計・消費税・源泉徴収・差引請求額）=====
let t = K.invTotals({ items: [it('ロゴ制作 残金', 1, 150000)], wh: true }, 'floor');
eq([t.sub, t.tax, t.total, t.whBase, t.wh, t.net], [150000, 15000, 165000, 150000, 15315, 149685], '請求：150,000＋消費税15,000＝165,000、源泉は税抜150,000に対して15,315、差引149,685');
t = K.invTotals({ items: [it('挿絵', 4, 30000)], wh: true }, 'floor');
eq([t.total, t.wh, t.net], [132000, 12252, 119748], '請求：120,000 → 132,000 − 12,252 ＝ 119,748');
t = K.invTotals({ items: [it('大きな案件', 1, 1500000)], wh: true }, 'floor');
eq([t.total, t.wh, t.net], [1650000, 204200, 1445800], '請求：150万円（税込165万円）→ 源泉204,200 → 差引1,445,800');
t = K.invTotals({ items: [it('作業時間', 31.5, 5000)], wh: false }, 'floor');
eq([t.total, t.wh, t.net], [173250, 0, 173250], '請求：源泉徴収の対象外は 引かない（31.5時間 × 5,000 ＝ 157,500 → 173,250）');

// ===== 4) 支払期日（支払期日の計算ツールと同じ）=====
const cl = (close, site, n, adj) => ({ close, site, n, adj: adj || 'prev' });
const due = (iss, cc) => { const r = K.calcDue(iss, cc); return [K.iso(r.closing), K.iso(r.raw), K.iso(r.due)]; };
eq(due('2026-10-29', cl('end', 'm1end', 30)), ['2026-10-31', '2026-11-30', '2026-11-30'], '末日締め・翌月末払い：10/29 → 締め10/31 → 11/30(月)');
eq(due('2026-09-30', cl('end', 'm1end', 30)), ['2026-09-30', '2026-10-31', '2026-10-30'], '末日締め・翌月末払い：10/31は土曜 → 前営業日 10/30(金)');
eq(due('2026-09-15', cl(20, 'm1d', 10)), ['2026-09-20', '2026-10-10', '2026-10-09'], '20日締め・翌月10日払い：9/15 → 9/20 → 10/10(土) → 10/9(金)');
eq(due('2026-10-21', cl(20, 'm1d', 10)), ['2026-11-20', '2026-12-10', '2026-12-10'], '20日締め：21日の請求は翌月20日締め → 12/10(木)');
eq(due('2026-10-02', cl('none', 'days', 30)), ['2026-10-02', '2026-11-01', '2026-10-30'], '締めなし・30日後：11/1(日) → 土曜も飛ばして 10/30(金)');
eq(due('2026-10-26', cl(25, 'm1end', 30)), ['2026-11-25', '2026-12-31', '2026-12-30'], '25日締め・翌月末払い：12/31は銀行の休み → 12/30(水)（支払期日の計算ツールの例と同じ）');
eq(due('2026-11-30', cl('end', 'm1end', 30, 'next')), ['2026-11-30', '2026-12-31', '2027-01-04'], '休みは翌営業日：12/31 → 1/1祝日・1/2土・1/3日 → 1/4(月)');
eq(due('2026-11-30', cl('end', 'm1end', 30, 'none')), ['2026-11-30', '2026-12-31', '2026-12-31'], '休みでもそのまま：12/31');
eq(due('2026-04-15', cl('end', 'm1d', 10)), ['2026-04-30', '2026-05-10', '2026-05-08'], '翌月10日：5/10(日)・5/9(土) → 5/8(金)');
eq(due('2026-07-31', cl('end', 'm1d', 11)), ['2026-07-31', '2026-08-11', '2026-08-10'], '翌月11日：8/11は山の日 → 8/10(月)');
eq(due('2027-01-15', cl('end', 'm1d', 31)), ['2027-01-31', '2027-02-28', '2027-02-26'], '翌月31日払い：2月は28日まで → 2/28(日) → 2/26(金)');
eq(due('2026-01-31', cl(30, 'm1end', 30)), ['2026-02-28', '2026-03-31', '2026-03-31'], '30日締め：1/31は1月の締め（1/30）を過ぎ → 2月の締めは月末2/28');
eq(K.calcDue('2026-10-29', cl('end', 'm1end', 30)).memo, '', '休みでなければメモなし');
eq(K.calcDue('2026-09-30', cl('end', 'm1end', 30)).memo, '土曜のため前営業日に', 'ずらしたときのメモ');
eq(K.payText(cl('end', 'm1end', 30)), '末日締め・翌月末払い', '支払条件の表示：末日締め・翌月末払い');
eq(K.payText(cl(20, 'm1d', 10)), '20日締め・翌月10日払い', '支払条件の表示：20日締め・翌月10日払い');
eq(K.payText(cl('none', 'days', 14)), '締めなし・14日後払い', '支払条件の表示：締めなし・14日後払い');
// 祝日データは支払期日の計算ツールと同じ
const sh = fs.readFileSync(path.join(__dirname, '../../shiharai/index.html'), 'utf8');
const shHol = (sh.match(/\['(20\d\d-\d\d-\d\d)', '([^']+)'\]/g) || []).join('|');
eq(K.HOLIDAYS.map(h => "['" + h[0] + "', '" + h[1] + "']").join('|'), shHol, '祝日データ：支払期日の計算ツールと同じ35日（内閣府の2026年・2027年）');
eq(K.HOLIDAYS.length, 35, '祝日：2026年18日・2027年17日');
eq(['2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03'].map(s => !!K.offReason(D(s))), [true, true, true, true], '12/31〜1/3は休み（銀行の休み・元日）');
eq(K.offReason(D('2026-12-30')), '', '12/30(水)は営業日');

// ===== 5) 時給・作業時間 =====
eq([K.hours('1.5'), K.hours('1:30'), K.hours('1時間30分'), K.hours('90分'), K.hours('２．２５'), K.hours(''), K.hours('abc')], [1.5, 1.5, 1.5, 1.5, 2.25, null, null], '作業時間の読み取り：1.5・1:30・1時間30分・90分・全角');
eq(K.timeAmount(22.5, 5000), 112500, '時給：22.5時間 × 5,000 ＝ 112,500');
eq(K.timeAmount(3.5, 5000), 17500, '時給：3.5時間 × 5,000 ＝ 17,500');
eq(K.timeAmount(1.25, 4333), 5416, '時給：1.25 × 4,333 ＝ 5,416.25 → 5,416（四捨五入）');
eq(K.timeAmount(K.hours('0:20'), 6000), 2000, '時給：20分 × 6,000 ＝ 2,000');
const tms = [{ job: 'a', hours: 10 }, { job: 'a', hours: 14 }, { job: 'b', hours: 48 }, { job: 'h', hours: 2.5 }, { job: 'h', hours: 4 }];
eq(K.jobStats({ id: 'a', kind: 'fixed', price: 300000 }, tms), { hours: 24, revenue: 300000, eff: 12500 }, '実質時給（固定）：300,000 ÷ 24時間 ＝ 12,500');
eq(K.jobStats({ id: 'b', kind: 'fixed', price: 220000 }, tms).eff, 4583, '実質時給（固定）：220,000 ÷ 48時間 ＝ 4,583.33 → 4,583');
eq(K.jobStats({ id: 'h', kind: 'hourly', rate: 5000 }, tms), { hours: 6.5, revenue: 32500, eff: 5000 }, '実質時給（時給）：6.5時間 × 5,000 ＝ 32,500 → 時給どおり5,000');
eq(K.jobStats({ id: 'z', kind: 'fixed', price: 1000 }, tms).eff, null, '時間がない案件は実質時給なし');

// ===== 6) 家事按分（家事按分 計算ツールと同じ考え方）=====
const R1 = { basis: 'area', part: '6', whole: '24' }, R2 = { basis: 'time', part: '6', whole: '10' }, R3 = { basis: 'manual', pct: '30' }, R4 = { basis: 'manual', pct: '50' };
eq([K.bizPart(98000, K.ratio(R1)), K.bizPart(5280, K.ratio(R2)), K.bizPart(9120, K.ratio(R3)), K.bizPart(4378, K.ratio(R4))], [24500, 3168, 2736, 2189], '按分：家賃98,000×6/24＝24,500・光回線5,280×6/10＝3,168・電気9,120×30%＝2,736・スマホ4,378×50%＝2,189');
eq(K.bizPart(7777, K.ratio({ basis: 'area', part: '1', whole: '3' })), 2592, '按分：7,777 × 1/3 ＝ 2,592.33 → 2,592（1円未満切り捨て）');
eq(K.bizPart(12345, K.ratio({ basis: 'manual', pct: '33.3' })), 4110, '按分：12,345 × 33.3% ＝ 4,110.885 → 4,110');
eq(K.bizPart(1000, K.ratio({ basis: 'manual', pct: '28.7' })), 287, '按分：1,000 × 28.7% ＝ 287（小数の誤差で286にならない）');
eq(K.bizPart(98000, K.ratio({ basis: 'area', part: '9.72', whole: '48.6' })), 19600, '按分：98,000 × 9.72㎡/48.6㎡（20%）＝ 19,600');
eq(K.pctText(K.ratio(R1).pct), '25%', '割合の表示 25%');
eq(K.pctText(K.ratio({ basis: 'area', part: '1', whole: '3' }).pct), '33.3%', '割合の表示 33.3%（小数第1位まで）');
eq(!!K.ratio({ basis: 'area', part: '30', whole: '24' }).err, true, '按分：仕事の分が全体より大きいとエラー');
eq(!!K.ratio({ basis: 'area', part: '3', whole: '0' }).err, true, '按分：全体0はエラー');
eq(!!K.ratio({ basis: 'manual', pct: '101' }).err, true, '按分：101%はエラー');
eq(K.expBiz({ amt: 3300, rule: 'r4' }, DA.RULES), { biz: 1650, priv: 1650, pct: 50, ok: true, err: '' }, '経費：スマホ 3,300 × 50% → 仕事の分1,650・私用1,650');
eq(K.expBiz({ amt: 12800, rule: '' }, DA.RULES).biz, 12800, '経費：按分なしは全部仕事の分');

// ===== 7) インボイスの6項目・登録番号 =====
const me = { trade: 'ひかりデザイン室（架空）', reg: 'T1234567890123' };
const cc = K.invCalc([{ date: '2026-10-29', item: 'ロゴ', qty: 1, price: 150000, rate: 10 }], 'floor');
eq(K.invChecks({ to: '株式会社サンプル商事（架空）', issue: '2026-10-29' }, cc, me).map(x => x.ok), [true, true, true, true, true, true], 'インボイス6項目：すべてそろう');
eq(K.invChecks({ to: '', issue: '2026-10-29' }, cc, { trade: 'x', reg: '' }).map(x => x.ok), [false, false, true, true, true, true], 'インボイス：相手の名前・登録番号がないと×');
eq(K.invChecks({ to: 'a' }, cc, me).length, 6, '記載事項は6つ');
eq([K.regNoOk('T1234567890123'), K.regNoOk('Ｔ１２３４５６７８９０１２３'), K.regNoOk('1234567890123'), K.regNoOk('T123')], [true, true, false, false], '登録番号：T＋13けた（全角も読む）');

// ===== 8) 入金の状態 =====
const T29 = D('2026-10-29');
const inv1 = { items: [it('挿絵', 4, 30000)], wh: true, due: '2026-10-28', payments: [] };
eq(K.payState(inv1, T29, 'floor').st, 'late', '期日を過ぎて未入金 → 期日すぎ（赤）');
inv1.payments.push({ date: '2026-10-29', amt: 100000 });
eq([K.payState(inv1, T29, 'floor').st, K.payState(inv1, T29, 'floor').rest], ['late', 19748], '一部入金でも期日を過ぎていれば期日すぎ・残り19,748');
inv1.payments.push({ date: '2026-10-29', amt: 19748 });
eq([K.payState(inv1, T29, 'floor').st, K.payState(inv1, T29, 'floor').rest], ['done', 0], '全額入金 → 入金済み');
eq(K.payState({ items: [it('x', 1, 1000)], wh: false, due: '2026-11-05', payments: [{ date: '2026-10-29', amt: 500 }] }, T29, 'floor').st, 'part', '期日前の一部入金');

// ===== 9) 見本データ（架空・どの日に開いても数字が自然）=====
const S = DA.sample(T29);
const names = [S.me.name, S.me.trade, S.me.addr, S.me.bank, S.me.tel].concat(S.clients.map(x => x.name));
eq(names.every(s => /架空/.test(s)), true, '人・屋号・住所・口座・電話・取引先はすべて「架空」と明記');
eq(/株式会社サンプル商事（架空）/.test(JSON.stringify(S)) && S.me.reg === 'T1234567890123', true, '見本の登録番号は 1234567890123（並びの数字）');
const t29 = S.docs.filter(d => d.kind === 'inv' && K.ym(D(d.issue)) === '2026-10').reduce((s, d) => s + K.invTotals(d, 'floor').sub, 0);
eq(t29, 355000, '10/29の今月の売上（税抜）：110,000＋45,000＋150,000＋50,000 ＝ 355,000');
const ex29 = S.exps.filter(e => K.ym(D(e.date)) === '2026-10').reduce((s, e) => s + K.expBiz(e, S.rules).biz, 0);
eq(ex29, 24500 + 3168 + 2736 + 2189 + 7780 + 3520 + 1320 + 1180 + 12800, '10/29の今月の経費（仕事の分）＝ 59,193');
let allOk = true, msgs = [];
for (let n = D('2026-01-01'); n <= D('2027-12-31'); n++) {
  const s = DA.sample(n), mk = K.ym(n), inv = s.docs.filter(d => d.kind === 'inv');
  const sales = inv.filter(d => K.ym(D(d.issue)) === mk).length;
  const late = inv.filter(d => K.payState(d, n, 'floor').st === 'late').length;
  const soon = inv.filter(d => { const p = K.payState(d, n, 'floor'); return p.rest > 0 && p.due >= n && p.due <= n + 13; }).length;
  const future = inv.some(d => D(d.issue) > n || (d.payments || []).some(p => D(p.date) > n)) || s.times.some(x => D(x.date) > n) || s.exps.some(x => D(x.date) > n);
  const expM = s.exps.filter(e => K.ym(D(e.date)) === mk).length;
  if (!(sales >= 1 && late >= 1 && soon >= 1 && !future && expM >= 1)) { allOk = false; msgs.push(K.iso(n) + ' sales=' + sales + ' late=' + late + ' soon=' + soon + ' future=' + future); if (msgs.length > 3) break; }
}
eq(allOk ? [] : msgs, [], '見本：2026〜2027年のどの日に開いても、今月の請求・期日すぎ・14日以内の期日・今月の経費があり、未来の日付はない');
eq(S.docs.filter(d => d.kind === 'inv').every(d => d.due === K.iso(K.calcDue(d.issue, S.clients.find(x => x.id === d.client)).due)), true, '見本の期日は取引先の条件から計算したもの');

// ===== ページの決まり =====
const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
eq(/default-src 'none'/.test(csp) && /connect-src 'none'/.test(csp) && /form-action 'none'/.test(csp) && /script-src 'self'/.test(csp), true, 'CSP：外部通信なし・スクリプトは自分のファイルだけ');
eq((html.match(/https?:\/\/[^"'\s)]+/g) || []).filter(u => !/^https:\/\/fonts\.(googleapis|gstatic)\.com/.test(u)), [], '外部URLは Google Fonts だけ');
eq(/https?:\/\//.test(app + css + data), false, '画面・見本・CSS に外部URLなし');
eq((logic.match(/https?:\/\/[^\s)）]+/g) || []).every(u => /^https:\/\/www\.nta\.go\.jp\/|^https:\/\/www8\.cao\.go\.jp\//.test(u)), true, 'logic.js のURLは出典のコメント（国税庁・内閣府）だけ');
eq(/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|navigator\.share|import\(/.test(app + logic + data), false, '送信する処理なし');
eq(/googletagmanager|gtag|ads-inter|a8\.net|adsbygoogle/.test(html + app), false, '広告・計測のスクリプトなし');
const allText = html + app + css + logic + data;
eq(/(^|[^A-Za-z])AI([^A-Za-z]|$)|ＡＩ|人工知能/.test(allText), false, '「AI」の語なし');
eq(/未確認|確認していない|確かめていない|未検証|検証していない/.test(allText), false, '確かめていないことを断る文なし');
eq(/円引き|今だけ|購入|BOOTH|価格|お得/.test(html), false, '宣伝の言葉・価格なし');
eq(/MisaNeco Works/.test(html) && /class="brandmark"/.test(html), true, '右下に MisaNeco Works');
eq(/架空/.test(html) && /ひかりデザイン室（架空）/.test(html), true, '画面に架空と明記');
eq(/源泉徴収・消費税の扱いは、国税庁の案内で確認してください。/.test(html) && /源泉徴収・消費税の扱いは、国税庁の案内で確認してください。/.test(app), true, '画面とフッターに「源泉徴収・消費税の扱いは、国税庁の案内で確認」の1行');
eq((app.match(/TAX_LINE/g) || []).length >= 5, true, '見積・請求・取引先・経費・設定・ダッシュボードに同じ1行');
eq(/No\.2795/.test(html) && /問57/.test(html) && /インボイス制度について/.test(html), true, 'フッターに出典（No.2795・Q&A問57・インボイス制度について）');
eq((app.match(/localStorage\.(getItem|setItem)/g) || []).length === 2 && /try\s*{[^}]*localStorage\.getItem/.test(app) && /try\s*{\s*localStorage\.setItem/.test(app), true, 'localStorage は try の中');
eq(/requestAnimationFrame/.test(app) && /visibilitychange/.test(app) && /ts - lastTs >= 33/.test(app), true, 'rAF・30コマ/秒まで・見えないときは止める');
eq(/@keyframes|animation\s*:/.test(css), false, '常時のCSSアニメなし');
eq(/__studio/.test(app) && /advance/.test(app) && /demo/.test(app) && /capture/.test(app) && /today/.test(app), true, '?demo=1・?capture=1・?today=・__studio.advance');
eq(/#c2f04a/i.test(css + app) && !/#5fd3b0|#ff9a3c|#ff5d73|#a78bfa/i.test(css + app), true, '配色：ライム（ほかのスタジオと違う差し色）');
eq(/Blob\(/.test(app) && /FileReader/.test(app) && /valid\(o\)/.test(app) && /window\.confirm/.test(app), true, 'バックアップ：保存（ファイル）と戻す（確認・形のチェックつき）');
eq(/window\.print\(\)/.test(app) && /@media print/.test(css), true, '印刷');
eq(['K.withholding', 'K.invTotals(', 'K.calcDue(', 'K.payState(', 'K.expBiz(', 'K.ratio(', 'K.jobStats(', 'K.timeAmount(', 'K.invChecks(', 'K.payText('].every(f => app.includes(f) || logic.includes(f.replace('K.', 'function '))), true, '画面の計算は logic.js の関数');
eq(['K.invTotals(', 'K.calcDue(', 'K.payState(', 'K.expBiz(', 'K.ratio(', 'K.jobStats(', 'K.timeAmount(', 'K.invChecks(', 'K.whFormula('].every(f => app.includes(f)), true, '画面が使う計算の関数');
const demo = app.slice(app.indexOf('function runDemo'));
eq(["nav('time')", '#tmAdd', "nav('inv')", '#ivItem-0', '#ivPrice-0', '#ivIssueBtn', "nav('pay')", "'#pay-'", "nav('exp')", '#exRule', '#exAdd', "nav('dash')", 'demoDone = true'].every(s => demo.includes(s)), true, '?demo=1：作業時間 → 請求書（源泉徴収）→ 入金 → 経費の按分 → ダッシュボード');
['dash', 'client', 'time', 'inv', 'pay', 'exp', 'set'].forEach(v => eq(html.includes('data-view="' + v + '"') && html.includes('id="v-' + v + '"') && app.includes('RENDER.' + v + ' = '), true, '画面: ' + v));
[...app.matchAll(/\$\('#([\w-]+)'\)/g)].map(m => m[1]).filter((v, i, a) => a.indexOf(v) === i).forEach(id => eq(html.includes('id="' + id + '"') || app.includes('id="' + id + '"') || app.includes("id=\"' + "), true, 'id: ' + id));

console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
