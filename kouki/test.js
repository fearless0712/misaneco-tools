/* 工期（稼働日）計算ツールの確認：node kouki/test.js */
const K = require('./logic.js'), fs = require('fs'), path = require('path');
let p = 0, f = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) p++; else { f++; console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); } };
const E = o => K.calcEnd(Object.assign({ start: '', days: '', preset: 'satsun', custom: null, holidays: true, company: '' }, o));
const N = o => K.calcCount(Object.assign({ start: '', end: '', preset: 'satsun', custom: null, holidays: true, company: '' }, o));
const D = n => K.iso(n);
const offs = r => r.list.filter(x => x.off).map(x => D(x.n) + ':' + x.kind);

// 日付と曜日
eq(K.wday(K.parseDate('2026-10-22')), 4, '2026-10-22は木曜'); eq(K.wday(K.parseDate('2027-01-01')), 5, '2027-01-01は金曜');
eq(K.wday(K.parseDate('2028-02-29')), 2, '2028-02-29は火曜');
eq(K.parseDate('2026-02-29'), null, '2026/2/29はない'); eq(K.parseDate('2027-02-29'), null, '2027/2/29はない');
eq(D(K.parseDate('2028-02-29')), '2028-02-29', 'うるう日'); eq(D(K.parseDate('２０２６/８/１３')), '2026-08-13', '全角・スラッシュ');
eq(K.parseDate('2026-13-01'), null, '13月'); eq(K.parseDate('abc'), null, '文字');
eq(K.fmt(K.parseDate('2026-10-14')), '2026年10月14日（水）', '表示');
// 稼働日数の読み取り
eq(K.num('3'), 3, '3'); eq(K.num('３日'), 3, '全角＋日'); eq(K.num(''), null, '空');
eq(Number.isNaN(K.num('abc')), true, '文字'); eq(Number.isNaN(K.num('1.5')), true, '小数'); eq(K.num('-3'), -3, '負');

// 例：2026-10-09(金)開始・3稼働日・土日＋祝日 → 10/10土・10/11日・10/12スポーツの日を飛ばして 10/14(水)
let r = E({ start: '2026-10-09', days: '3' });
eq([r.state, D(r.end), r.calDays, r.workDays, r.offDays, r.off], ['ok', '2026-10-14', 6, 3, 3, { week: 2, holiday: 1, company: 0 }], '基本例');
eq(offs(r), ['2026-10-10:week', '2026-10-11:week', '2026-10-12:holiday'], '基本例の休み');
eq(r.list.filter(x => !x.off).map(x => x.no), [1, 2, 3], '何日目');
eq([r.startOff, r.warn.length], [false, 0], '開始日は稼働日・注意なし');
eq(D(E({ start: '2026-10-09', days: '3', holidays: false }).end), '2026-10-13', '祝日を休みにしない → 10/13');
eq(D(E({ start: '2026-10-09', days: '1' }).end), '2026-10-09', '1日なら開始日');
// 日曜のみ：10/9(1)・10/10土(2)・10/11日・10/12祝・10/13(3)
eq(D(E({ start: '2026-10-09', days: '3', preset: 'sun' }).end), '2026-10-13', '日曜のみ');
// 休みなし・祝日なし：毎日
eq(D(E({ start: '2026-10-09', days: '3', preset: 'none', holidays: false }).end), '2026-10-11', '休みなし');
// 任意：水曜のみ休み 10/13火(1)・10/14水休・10/15(2)・10/16(3)
eq(D(E({ start: '2026-10-13', days: '3', preset: 'custom', custom: [0, 0, 0, 1, 0, 0, 0], holidays: false }).end), '2026-10-16', '水曜休み');
// 任意で何も選ばない＝休みなし
eq(D(E({ start: '2026-10-09', days: '3', preset: 'custom', custom: [0, 0, 0, 0, 0, 0, 0], holidays: false }).end), '2026-10-11', '任意で0個');
// 休みの曜日がすべて → エラー
eq(E({ start: '2026-10-09', days: '3', preset: 'custom', custom: [1, 1, 1, 1, 1, 1, 1] }).state, 'error', '全曜日休み');
eq(N({ start: '2026-10-01', end: '2026-10-31', preset: 'custom', custom: [1, 1, 1, 1, 1, 1, 1] }).state, 'error', '全曜日休み（逆算）');

// 開始日が休み：10/10(土)開始・2日 → 10/13(火)から数えて 10/14(水)
r = E({ start: '2026-10-10', days: '2' });
eq([D(r.end), r.startOff, D(r.firstWork), r.calDays, r.off], ['2026-10-14', true, '2026-10-13', 5, { week: 2, holiday: 1, company: 0 }], '開始日が土曜');
eq(K.text(r, { preset: 'satsun', holidays: true }).includes('次の稼働日 2026年10月13日（火） から数えています'), true, 'コピー文に開始日が休みの説明');
r = E({ start: '2026-10-12', days: '1' }); eq([D(r.end), r.startOff], ['2026-10-13', true], '開始日が祝日');

// ゴールデンウィーク 2026：5/1金(1)・5/2土・5/3日(憲法記念日)・5/4〜5/6祝・5/7(2)・5/8(3)
r = E({ start: '2026-05-01', days: '3' });
eq([D(r.end), r.calDays, r.off], ['2026-05-08', 8, { week: 2, holiday: 3, company: 0 }], 'GW（日曜の祝日は曜日で1回）');
eq(r.list.find(x => D(x.n) === '2026-05-03').label, '憲法記念日', '日曜の祝日の名前');
// シルバーウィーク 2026：9/18金(1)・9/19,20土日・9/21敬老・9/22国民の休日・9/23秋分・9/24(2)
eq(D(E({ start: '2026-09-18', days: '2' }).end), '2026-09-24', 'シルバーウィーク');
// 2027 春分の日が日曜 → 3/22 振替休日：3/19金(1)・3/20土・3/21日・3/22振替・3/23(2)
eq(D(E({ start: '2027-03-19', days: '2' }).end), '2027-03-23', '2027振替休日');

// 年末年始：12/25金(1)・12/26,27土日・12/28(2)・12/29〜31会社・1/1元日・1/2,3土日・1/4(3)・1/5(4)・1/6(5)
const NENMATSU = '2026-12-29〜2027-01-03 年末年始';
r = E({ start: '2026-12-25', days: '5', company: NENMATSU });
eq([D(r.end), r.calDays, r.workDays, r.off], ['2027-01-06', 13, 5, { week: 4, holiday: 1, company: 3 }], '年末年始をまたぐ');
eq(r.list.find(x => D(x.n) === '2027-01-01').label, '元日・年末年始', '元日は祝日として数え、メモも出す');
eq(D(E({ start: '2026-12-25', days: '5' }).end), '2026-12-31', '会社の休みなし → 12/31');
// 1日ずつの書き方・～・全角・スラッシュでも同じ
eq(D(E({ start: '2026-12-25', days: '5', company: '2026-12-29\n2026/12/30\n２０２６-１２-３１ 大掃除\n\n2027-01-02～2027-01-03' }).end), '2027-01-06', '会社の休みの書き方いろいろ');
// お盆：8/10月(1)・8/11山の日・8/12(2)・8/13〜15会社(8/15土)・8/16日・8/17(3)
r = E({ start: '2026-08-10', days: '3', company: '2026-08-13〜2026-08-15 お盆' });
eq([D(r.end), r.off], ['2026-08-17', { week: 2, holiday: 1, company: 2 }], 'お盆（土曜と重なる日は曜日で数える）');

// うるう年：2028-02-25金(1)・26,27土日・28(2)・29(3) → 2028-02-29、祝日は2027年までの注意
r = E({ start: '2028-02-25', days: '3' });
eq([D(r.end), r.warn.length, /2027年まで/.test(r.warn[0])], ['2028-02-29', 1, true], 'うるう日に終わる＋祝日判定外の注意');
eq(E({ start: '2028-02-25', days: '3', holidays: false }).warn.length, 0, '祝日を使わなければ注意なし');
eq(E({ start: '2027-12-29', days: '5' }).warn.length, 1, '2027年末から2028年へ入ると注意');
eq(E({ start: '2025-12-30', days: '3' }).warn.length, 1, '2025年も判定外');
r = N({ start: '2028-02-28', end: '2028-03-01', preset: 'satsun' });
eq([r.workDays, r.calDays, r.warn.length], [3, 3, 1], 'うるう年の逆算');

// 逆算モード
eq(N({ start: '2026-10-01', end: '2026-10-31' }).workDays, 21, '2026年10月：31−土日9−祝1=21');
eq(N({ start: '2026-11-01', end: '2026-11-30' }).workDays, 19, '2026年11月：30−土日9−祝2=19');
r = N({ start: '2026-12-25', end: '2027-01-06', company: NENMATSU });
eq([r.workDays, r.calDays, r.off], [5, 13, { week: 4, holiday: 1, company: 3 }], '年末年始の逆算（順算と一致）');
eq(N({ start: '2026-01-01', end: '2026-12-31' }).workDays, 244, '2026年：365−土日104−平日の祝日17');
eq(N({ start: '2027-01-01', end: '2027-12-31' }).workDays, 245, '2027年：365−土日104−平日の祝日16');
eq(N({ start: '2026-10-10', end: '2026-10-12' }).workDays, 0, '休みだけの期間は0日');
eq(N({ start: '2026-10-14', end: '2026-10-14' }).workDays, 1, '1日だけ');
eq(N({ start: '2026-10-14', end: '2026-10-13' }).state, 'error', '終了日が前');
eq(N({ start: '2026-01-01', end: '2030-01-01' }).state, 'error', '3年超');
eq(N({ start: '', end: '' }).state, 'empty', '逆算 空');
eq(K.calc({ mode: 'count', start: '2026-10-01', end: '2026-10-31', preset: 'satsun', holidays: true }).workDays, 21, 'calc → 逆算');
// 順算と逆算が一致する（いろいろな日数で）
let same = true;
for (let d = 1; d <= 300; d += 7) {
  const a = E({ start: '2026-07-01', days: String(d), company: NENMATSU });
  const b = N({ start: '2026-07-01', end: D(a.end), company: NENMATSU });
  if (b.workDays !== d) same = false;
}
eq(same, true, '順算の終了日で逆算すると同じ日数');

// 入力エラー
eq(E({ start: '', days: '' }).state, 'empty', '空');
eq(E({ start: '2026-10-09', days: '' }).state, 'empty', '日数なし');
eq(E({ start: '', days: '3' }).state, 'error', '開始日なし');
eq(E({ start: '2026-02-30', days: '3' }).state, 'error', 'ない日付');
['0', '-3', 'abc', '1.5', '三'].forEach(v => eq(E({ start: '2026-10-09', days: v }).state, 'error', '日数 ' + v));
eq(E({ start: '2026-10-09', days: '1001' }).state, 'error', '1000日超');
eq(E({ start: '2026-10-09', days: '1000', preset: 'custom', custom: [1, 1, 1, 1, 1, 1, 0] }).state, 'error', '期間3年超');
eq(D(E({ start: '2026-10-09', days: '１０日' }).end), '2026-10-23', '全角「１０日」');

// 会社の休みの読み取り
let c = K.parseCompany('2026-08-13 お盆\n2026-12-29〜2027-01-03\n2026-08-13');
eq([c.errors.length, c.count, c.days[K.parseDate('2026-08-13')], c.days[K.parseDate('2027-01-03')]], [0, 7, 'お盆', '会社の休み'], '会社の休み 件数と重複');
eq(K.parseCompany('8/13').errors.length, 1, '年なしはエラー');
eq(K.parseCompany('2026-12-31〜2026-12-29').errors.length, 1, '逆の期間');
eq(K.parseCompany('2026-01-01〜2027-12-31').errors.length, 1, '長すぎる期間');
eq(E({ start: '2026-10-09', days: '3', company: 'おぼん' }).state, 'error', '読めない行はエラー');
eq(/1行目/.test(E({ start: '2026-10-09', days: '3', company: 'おぼん' }).error), true, '何行目か出す');

// カレンダー
const ms = K.months(E({ start: '2026-10-09', days: '3' }));
eq([ms.length, ms[0].cells.slice(0, 5), ms[0].cells[5].d, ms[0].cells.length % 7], [1, [null, null, null, null, null], 9, 0], 'カレンダー（金曜から）');
eq(K.months(E({ start: '2026-12-25', days: '5', company: NENMATSU })).map(m => m.y + '/' + m.m), ['2026/12', '2027/1'], '年またぎのカレンダー');
// コピー文
const t = K.text(E({ start: '2026-10-09', days: '3' }), { preset: 'satsun', holidays: true });
eq(t.split('\n').slice(0, 6), ['【工期（稼働日）計算】', '開始日：2026年10月9日（金）', '稼働日数：3日', '終了予定日：2026年10月14日（水）',
  '暦日数：6日（休み 3日：曜日 2日・祝日 1日・会社の休み 0日）', '休みの曜日：土日／祝日：休み'], 'コピー文');
eq(/10\/12（月）スポーツの日/.test(t), true, 'コピー文に祝日名');
eq(K.weekText({ preset: 'custom', custom: [1, 0, 0, 1, 0, 0, 0] }), '日・水曜', '任意の曜日の表示');

// 祝日一覧：内閣府 2026年18日・2027年17日（振替休日・国民の休日を含む）
eq(K.HOLIDAYS.length, 35, '祝日35件'); eq(K.HOLIDAYS.filter(h => h[0] < '2027').length, 18, '2026年 18件');
eq(new Set(K.HOLIDAYS.map(h => h[0])).size, 35, '重複なし');
eq(K.HOLIDAYS.every(h => K.parseDate(h[0]) !== null), true, '全部ある日付');
const H = Object.fromEntries(K.HOLIDAYS);
[['2026-05-06', '振替休日'], ['2026-09-22', '国民の休日'], ['2026-10-12', 'スポーツの日'], ['2026-03-20', '春分の日'], ['2026-09-23', '秋分の日'],
 ['2027-03-21', '春分の日'], ['2027-03-22', '振替休日'], ['2027-07-19', '海の日'], ['2027-09-20', '敬老の日'], ['2027-10-11', 'スポーツの日']]
  .forEach(x => eq(H[x[0]], x[1], '祝日 ' + x[0]));
eq(H['2027-05-06'], undefined, '2027-05-06は平日');
// 建設/04_工程表/build.py の一覧と突き合わせ（ファイルがある環境だけ）
const BP = path.join(__dirname, '..', '..', '..', '建設', '04_工程表', 'build.py');
if (fs.existsSync(BP)) {
  const src = fs.readFileSync(BP, 'utf8'), blk = /HOLIDAYS = \[([\s\S]*?)\n\]/.exec(src)[1];
  const bp = [...blk.matchAll(/\((\d{4}), (\d+), (\d+), '([^']+)'\)/g)].map(m => m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0'));
  eq(bp.length, 35, 'build.py 35件');
  eq(K.HOLIDAYS.map(h => h[0]), bp, 'build.py と日付が一致');
  const bn = [...blk.matchAll(/'([^']+)'\)/g)].map(m => m[1].replace('休日（振替休日）', '振替休日').replace(/^休日$/, '国民の休日'));
  eq(K.HOLIDAYS.map(h => h[1]), bn, 'build.py と名前が一致');
} else console.log('（build.py がないので突き合わせは省略）');

// ページ
const html = fs.readFileSync(__dirname + '/index.html', 'utf8'), js = fs.readFileSync(__dirname + '/app.js', 'utf8');
eq(/Content-Security-Policy/.test(html), true, 'CSP'); eq(/innerHTML/.test(js), false, 'innerHTMLなし');
eq(/fetch\(|XMLHttpRequest|sendBeacon/.test(js + fs.readFileSync(__dirname + '/logic.js', 'utf8')), false, '入力を送信しない');
eq(/ads-inter\.js/.test(html) && /広告/.test(html), true, '広告と表示'); eq(/line\.me\/R\/ti\/p\/@736dykzx/.test(html), true, 'LINE');
eq(/application\/ld\+json/.test(html), true, 'JSON-LD'); eq(/<link rel="canonical" href="https:\/\/tools\.equaglobal\.com\/kouki\/">/.test(html), true, 'canonical');
eq(/og:url" content="https:\/\/tools\.equaglobal\.com\/kouki\/"/.test(html), true, 'OGP');
eq(/雨天順延などは、契約・発注者との取り決めに従ってください/.test(html), true, '契約の注意');
eq(/外部に送信しません/.test(html), true, '送信しない明記'); eq(/AIを活用|AIで作/.test(html), false, 'AIの文言がない');
['../blog/tosou-menseki-kansu-keisan/', '../blog/kensetsu-jimu-jidouka-iriguchi/', '../hiwari/', '../riekiritsu/', '../hozon/'].forEach(u => {
  eq(html.includes('href="' + u + '"'), true, 'リンク ' + u);
  eq(fs.existsSync(path.join(__dirname, u, 'index.html')), true, 'リンク先がある ' + u);
});
eq(/https?:\/\/(?!tools\.equaglobal\.com|schema\.org|www\.googletagmanager\.com|line\.me\/R\/ti\/p\/@736dykzx)/.test(html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '')), false, '外部URLなし');
[...js.matchAll(/\$\('([\w-]+)'\)/g)].map(m => m[1]).forEach(id => eq(html.includes('id="' + id + '"'), true, 'id: ' + id));
[0, 1, 2, 3, 4, 5, 6].forEach(n => eq(html.includes('id="w' + n + '"'), true, 'id: w' + n));
// ページの計算の例（Pythonでも検算済み）とツールの結果が一致する
const OBON = '2026-08-13〜2026-08-15 お盆';
r = E({ start: '2026-08-03', days: '10', company: OBON });
eq([D(r.end), r.calDays, r.off], ['2026-08-19', 17, { week: 4, holiday: 1, company: 2 }], '例2 お盆');
eq(D(E({ start: '2026-08-04', days: '10', company: OBON }).end), '2026-08-20', '例2 初日不算入（翌日から）');
r = E({ start: '2026-12-25', days: '5', company: NENMATSU });
eq([K.fmt(r.end), r.calDays], ['2027年1月6日（水）', 13], '例3 年末年始');
r = N({ start: '2026-11-02', end: '2026-11-30' });
eq([r.workDays, r.calDays, r.off.week, r.off.holiday], [19, 29, 8, 2], '例4 逆算');
const pageText = html.replace(/<[^>]+>/g, '');
['14日（水）が終了予定日', '暦日では6日', '8月19日（水）が終了予定日', '暦日では17日', '8月20日（木）', '2027年1月6日（水）が終了予定日', '暦日では13日', '稼働日数は19日', '暦日29日', '土日8日と祝日2日']
  .forEach(t => eq(pageText.includes(t), true, 'ページの例 ' + t));
// 検索：title・description
const title = /<title>([^<]*)<\/title>/.exec(html)[1], desc = /<meta name="description" content="([^"]*)"/.exec(html)[1];
eq([/^工期計算ツール/.test(title), /工期の日数計算/.test(title)], [true, true], 'title');
eq([/工期の日数計算/.test(desc), /工期計算ツール/.test(desc), /年末年始/.test(desc), /お盆/.test(desc)], [true, true, true, true], 'description');
// FAQPage がページのよくある質問と一致する
const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
const faq = lds.find(x => x['@type'] === 'FAQPage');
const vis = [.../<section[^>]*id="faq"[^>]*>([\s\S]*?)<\/section>/.exec(html)[1].matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)]
  .map(m => [m[1], m[2]].map(t => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim()));
eq(!!faq && faq.mainEntity.length >= 6, true, 'FAQPage');
eq(faq.mainEntity.map(q => [q.name, q.acceptedAnswer.text]), vis, 'FAQPage と表示が一致');
eq(lds.some(x => x['@type'] === 'WebApplication'), true, 'WebApplicationを残す');
eq(/契約書の定めに従ってください/.test(html) && /初日を数えない/.test(html), true, '初日算入と民法は契約書の定めに従う');
eq(/\bAI\b/.test(html.replace(/<script[\s\S]*?<\/script>/g, '')), false, 'AIの語がない');
eq(fs.existsSync(path.join(__dirname, '..', 'blog', 'excel-kouki-kadoubi-workday', 'index.html')), true, 'リンク先がある Excel記事');
console.log(p + ' passed, ' + f + ' failed'); process.exit(f ? 1 : 0);
