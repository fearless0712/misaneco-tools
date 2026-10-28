/* 車検の日付計算ツールの確認：node shaken/test.js */
const S = require('./logic.js'), fs = require('fs'), path = require('path');
let p = 0, f = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) p++; else { f++; console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); } };
const D = n => S.iso(n), P = s => S.parseDate(s);
const C = o => S.calc(Object.assign({ expiry: '', kubun: 'jikayou', kaisu: 'later', base: '2026-10-22', n1: '', n2: '' }, o));

// 日付
eq(S.wday(P('2026-10-22')), 4, '2026-10-22は木曜'); eq(P('2026-02-29'), null, '2026/2/29はない'); eq(D(P('2028-02-29')), '2028-02-29', 'うるう日');
eq(P('2026-13-01'), null, '13月'); eq(P('abc'), null, '文字'); eq(D(P('２０２６/５/１５')), '2026-05-15', '全角・スラッシュ');
eq(S.fmt(P('2025-05-15')), '2025年5月15日（木）', '表示'); eq(S.wareki(P('2025-05-15')), '令和7年', '令和7年');

// 2か月前（その日がない月は月末）
const T = s => D(S.twoMonthsBefore(P(s)));
eq(T('2026-04-30'), '2026-02-28', '4/30→2/28'); eq(T('2026-03-31'), '2026-01-31', '3/31→1/31'); eq(T('2026-05-31'), '2026-03-31', '5/31→3/31');
eq(T('2028-04-30'), '2028-02-29', 'うるう年 2028/4/30→2/29'); eq(T('2026-04-29'), '2026-02-28', '4/29→2/28'); eq(T('2028-04-29'), '2028-02-29', '2028/4/29→2/29');
eq(T('2026-02-15'), '2025-12-15', '年をまたぐ 2/15→12/15'); eq(T('2026-01-31'), '2025-11-30', '1/31→11/30'); eq(T('2026-12-31'), '2026-10-31', '12/31→10/31');
eq(T('2025-05-15'), '2025-03-15', '国交省の例 R7.5.15→R7.3.15');
eq(D(S.addYears(P('2028-02-29'), 2)), '2030-02-28', '2/29の2年後は月末');

// 国交省の例：満了日 R7.5.15（2年車検）→ 受けられる最初の日 R7.3.15（新制度で）、次の満了日の目安 R9.5.15
let r = C({ expiry: '2025-05-15', base: '2025-04-01' });
eq([r.state, D(r.first), D(r.nextExpiry), r.nextYears, r.phase], ['ok', '2025-03-15', '2027-05-15', 2, 'in'], '国交省の例');
eq(r.warn.length, 1, '3/31以前は旧制度の注意'); eq(/1か月前/.test(r.warn[0]), true, '旧制度の注意文');
eq(C({ expiry: '2025-06-01' }).warn.length, 0, '2025-06-01満了は注意なし（4/1から）');
eq(C({ expiry: '2025-05-31' }).warn.length, 1, '2025-05-31満了は3/31→注意');

// 区分ごとの次回年数（2回目以降の有効期間）と今の有効期間
const Y = { jikayou: [3, 2], nirin: [3, 2], kei: [3, 2], keikamotsu: [2, 2], kamotsu: [2, 1], kamotsu8: [1, 1] };
Object.keys(Y).forEach(k => {
  eq([S.KMAP[k].first, S.KMAP[k].next], Y[k], '有効期間 ' + k);
  const a = C({ expiry: '2026-12-10', kubun: k, kaisu: 'first' }), b = C({ expiry: '2026-12-10', kubun: k });
  eq([a.curYears, a.nextYears, b.curYears, b.nextYears], [Y[k][0], Y[k][1], Y[k][1], Y[k][1]], '今と次の年数 ' + k);
  eq(D(b.nextExpiry), (2026 + Y[k][1]) + '-12-10', '次の満了日 ' + k);
});
eq(S.KUBUN.length, 7, '区分7つ');
// 車検なし
r = C({ expiry: '2026-12-10', kubun: 'none' });
eq([r.state, r.first], ['none', undefined], '車検なしは計算しない');
eq(C({ expiry: '', kubun: 'none' }).state, 'none', '車検なしは満了日が空でも');
eq(S.text(r).split('\n'), ['【車検の日付計算】', '区分：軽二輪（125cc超〜250cc以下）・原付（車検なし）', '車検はありません（点検の時期は別です）'], '車検なしのコピー文');
eq(C({ kubun: 'zzz', expiry: '2026-12-10' }).kubun.id, 'jikayou', '知らない区分は自家用');

// 入力エラー
eq(C({ expiry: '' }).state, 'empty', '空'); eq(C({ expiry: '  ' }).state, 'empty', '空白');
eq(C({ expiry: '2026-02-30' }).state, 'error', '2/30'); eq(C({ expiry: 'あいう' }).state, 'error', '文字');
eq(C({ expiry: '2026-12-10', base: '' }).state, 'error', '基準日が空'); eq(C({ expiry: '2026-12-10', base: '2026-13-01' }).state, 'error', '基準日が不正');
eq(S.text(C({ expiry: '' })), '', '空ならコピー文なし');

// 基準日を変えた残り日数
eq(C({ expiry: '2026-12-10', base: '2026-10-22' }).left, 49, '10/22→12/10 49日');
eq(C({ expiry: '2026-12-10', base: '2026-12-10' }).left, 0, '当日 0日');
eq(C({ expiry: '2026-12-10', base: '2026-12-15' }).left, -5, '過ぎて -5日');
eq(C({ expiry: '2027-03-01', base: '2026-12-31' }).left, 60, '年またぎ 60日');
eq(C({ expiry: '2028-03-01', base: '2028-02-28' }).left, 2, 'うるう日をはさむ 2日');
eq(['2026-10-09', '2026-10-10', '2026-12-10', '2026-12-11'].map(b => C({ expiry: '2026-12-10', base: b }).phase), ['before', 'in', 'in', 'over'], '時期（前・範囲・過ぎ）');
eq([S.leftText({ left: 49 }), S.leftText({ left: 0 }), S.leftText({ left: -5 })], ['あと49日', '今日が満了日です', '5日過ぎています'], '残り日数の文');

// お店の案内（初期値 60/30、変更可）
r = C({ expiry: '2026-12-10' });
eq([r.n1, r.n2, D(r.notice1), D(r.notice2)], [60, 30, '2026-10-11', '2026-11-10'], '60日前・30日前');
r = C({ expiry: '2026-12-10', n1: '９０', n2: '45日' });
eq([r.n1, r.n2, D(r.notice1), D(r.notice2)], [90, 45, '2026-09-11', '2026-10-26'], '90日前・45日前（全角・日つき）');
eq(D(C({ expiry: '2026-12-10', n1: '0' }).notice1), '2026-12-10', '0日前は満了日');
['-1', '366', '1.5', 'abc'].forEach(v => eq(C({ expiry: '2026-12-10', n1: v }).state, 'error', '案内日数エラー ' + v));
eq(C({ expiry: '2026-12-10', n2: '366' }).state, 'error', '2回目の案内日数エラー');

// コピー文
const t = S.text(C({ expiry: '2025-05-15', base: '2025-04-01' }));
eq(t.split('\n').slice(0, 7), ['【車検の日付計算】', '区分：自家用乗用自動車（2回目以降の車検）', '満了日：2025年5月15日（木）',
  '受けられる最初の日の目安：2025年3月15日（土）（満了日の2か月前）', '満了日まで：あと44日（基準日 2025年4月1日（火））',
  'お店の案内の目安：1回目 2025年3月16日（日）（60日前）／2回目 2025年4月15日（火）（30日前）', '次の満了日の目安：2027年5月15日（土）（有効期間 2年）'], 'コピー文');
eq(/新しい車検証の記録で確認/.test(t) && /運輸支局/.test(t), true, 'コピー文に確認の注意');

// ページ
const html = fs.readFileSync(__dirname + '/index.html', 'utf8'), js = fs.readFileSync(__dirname + '/app.js', 'utf8');
eq(/Content-Security-Policy/.test(html), true, 'CSP'); eq(/innerHTML/.test(js), false, 'innerHTMLなし');
eq(/fetch\(|XMLHttpRequest|sendBeacon/.test(js + fs.readFileSync(__dirname + '/logic.js', 'utf8')), false, '入力を送信しない');
eq(/ads-inter\.js/.test(html) && /広告/.test(html), true, '広告と表示'); eq(/line\.me\/R\/ti\/p\/@736dykzx/.test(html), true, 'LINE');
eq(/application\/ld\+json/.test(html), true, 'JSON-LD'); eq(/<link rel="canonical" href="https:\/\/tools\.equaglobal\.com\/shaken\/">/.test(html), true, 'canonical');
eq(/og:url" content="https:\/\/tools\.equaglobal\.com\/shaken\/"/.test(html), true, 'OGP');
eq(/外部に送信しません/.test(html), true, '送信しない明記'); eq(/AIを活用|AIで作/.test(html), false, 'AIの文言がない');
eq(/運輸支局で確認/.test(html) && /新しい車検証の記録で確認/.test(html), true, '目安の注意');
eq(/車検証閲覧アプリ/.test(html) && /検査標章/.test(html), true, '電子車検証の満了日の確かめ方');
['../blog/shaken-2kagetsu-mae-annai/', '../blog/chuko-genka-arari-zaiko-nissu/', '../kouki/', '../hiwari/', '../riekiritsu/'].forEach(u => {
  eq(html.includes('href="' + u + '"'), true, 'リンク ' + u);
  eq(fs.existsSync(path.join(__dirname, u, 'index.html')), true, 'リンク先がある ' + u);
});
const SRC = ['https://www.jidoushatouroku-portal.mlit.go.jp/Information-Files/shaken_exp_day.pdf',
  'https://www.jidoushatouroku-portal.mlit.go.jp/jidousha/kensatoroku/about/inspect/validity-period/index.html',
  'https://wwwtb.mlit.go.jp/tohoku/mg/sb/sub03_02.html'];
SRC.forEach(u => eq(html.includes('href="' + u + '"'), true, '出典 ' + u));
eq(/https?:\/\/(?!tools\.equaglobal\.com|schema\.org|www\.googletagmanager\.com|line\.me\/R\/ti\/p\/@736dykzx|www\.jidoushatouroku-portal\.mlit\.go\.jp\/|wwwtb\.mlit\.go\.jp\/)/.test(html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '')), false, '出典以外の外部URLなし');
[...js.matchAll(/\$\('([\w-]+)'\)/g)].map(m => m[1]).forEach(id => eq(html.includes('id="' + id + '"'), true, 'id: ' + id));
console.log(p + ' passed, ' + f + ' failed'); process.exit(f ? 1 : 0);
