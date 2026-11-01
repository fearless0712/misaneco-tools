/* フリーランス・個人事業主スタジオの計算部分（ブラウザ・node 共通。テスト：../test.js）
   日付は「1970-01-01 を 0 とする通し番号（日）」で扱い、保存は "2026-10-29" の文字列。

   根拠（国税庁の公式ページで確認した日：2026-10-29）
   ・源泉徴収（報酬・料金）：タックスアンサー No.2795「原稿料や講演料等を支払ったとき」（令和8年4月1日現在法令等）
       https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2795.htm
       支払金額 100万円以下 … 支払金額 × 10.21%
       支払金額 100万円超   … （支払金額 − 100万円）× 20.42% ＋ 102,100円
       求めた税額に1円未満の端数があるときは切り捨て。
       請求書で報酬と消費税の額がはっきり分かれているときは、報酬の額だけを対象にしてよい（平元直法6-1）。
   ・令和9年（2027年）1月以後：国税庁「防衛特別所得税及び復興特別所得税の源泉徴収のあらまし（令和9年1月以後の源泉徴収）」
       https://www.nta.go.jp/publication/pamph/pdf/0026005-024_02.pdf
       防衛特別所得税1%＋復興特別所得税1.1%で合計2.1%は変わらず、合計税率（所得税率×102.1%）＝10.21%・20.42%のまま。
       例：888,888円 × 10.21% ＝ 90,755.4648円 → 90,755円（1円未満切り捨て）
   ・デザインの報酬も対象になる例：国税庁「源泉徴収のあらまし（令和8年版）第5 報酬・料金等の源泉徴収事務」
       https://www.nta.go.jp/publication/pamph/gensen/aramashi2026/pdf/07.pdf
       （対象かどうかは仕事の中身と相手で変わるので、このアプリでは取引先ごとに「源泉徴収の対象」を設定する）
   ・インボイス（適格請求書）の記載事項6つ：国税庁「インボイス制度について」
       https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/invoice_about.htm
   ・消費税額の端数処理：国税庁「適格請求書等保存方式に関するQ&A」問57
       https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/pdf/qa/57.pdf
       一の適格請求書につき、税率ごとに1回。切上げ・切捨て・四捨五入は任意。商品ごとに端数処理して合計するのは不可。

   支払期日：無料ツール「支払期日の計算ツール」（/shiharai/）と同じ計算と祝日データ
     （締め日 → 支払サイト → 土日祝・銀行の休み〈12/31〜1/3〉は前営業日／翌営業日／そのまま）。
   家事按分：無料ツール「家事按分 計算ツール」（/anbun/）と同じ考え方（面積・時間・使用量の割合か手入力の%、経費にできる目安は1円未満切り捨て）。 */
(function (root) {
  'use strict';
  var WD = ['日', '月', '火', '水', '木', '金', '土'];

  // ---------- 日付 ----------
  function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function mk(y, m, d) { return Date.UTC(y, m - 1, d) / 86400000; } // 月のはみ出しは Date.UTC が繰り上げる
  function z2h(s) { return String(s).normalize('NFKC'); }   // 全角の数字・英字・記号を半角に
  function D(s) { // "2026-10-29" → 通し番号。空・不正は null
    if (s === null || s === undefined || s === '') return null;
    if (typeof s === 'number') return s;
    var m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/.exec(z2h(s).trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null;
    return mk(y, mo, d);
  }
  function ymd(n) { var t = new Date(n * 86400000); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
  function pad(x) { return (x < 10 ? '0' : '') + x; }
  function iso(n) { if (n === null || n === undefined || n === '') return ''; var o = ymd(n); return o.y + '-' + pad(o.m) + '-' + pad(o.d); }
  function slash(n) { return n === null || n === undefined || n === '' ? '' : iso(n).replace(/-/g, '/'); }
  function jd(n) { if (n === null || n === undefined || n === '') return ''; var o = ymd(n); return o.y + '年' + o.m + '月' + o.d + '日'; }
  function wday(n) { return ((n % 7) + 7 + 4) % 7; } // 1970-01-01 は木曜
  function md(n) { var o = ymd(n); return o.m + '/' + o.d; }
  function mdw(n) { return md(n) + '(' + WD[wday(n)] + ')'; }
  function ym(n) { var o = ymd(n); return o.y + '-' + pad(o.m); }
  function firstOfMonth(n) { var o = ymd(n); return mk(o.y, o.m, 1); }
  function eom(n, k) { var o = ymd(n); return mk(o.y, o.m + k + 1, 0); }                 // Excel の EOMONTH
  function dayOf(n, k, d) { var e = eom(n, k), last = ymd(e).d; return e - last + Math.min(d, last); } // k か月後の d 日（ない日は月末）
  function todayN(now) { var t = now || new Date(); return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 86400000; }

  // ---------- 数字 ----------
  function clean(x) { return Number(Number(x).toPrecision(15)); }
  function has(v) { return v !== null && v !== undefined && String(v).trim() !== ''; }
  // "12,000" "１２０００円" "¥12,000" → 12000。読めないときは null
  function toNum(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = z2h(v === null || v === undefined ? '' : v).replace(/[．]/g, '.').replace(/[,，\s¥円]/g, '');
    if (!s || !/^-?\d*\.?\d+$/.test(s)) return null;
    return parseFloat(s);
  }
  function n0(v) { var x = toNum(v); return x === null ? 0 : x; }
  function yen(x) { return (x < 0 ? '-' : '') + '¥' + Math.abs(Math.round(x)).toLocaleString('ja-JP'); }
  function num(x) { return Math.round(x).toLocaleString('ja-JP'); }
  // 作業時間："1.5" "1:30" "1時間30分" "90分" → 時間（小数）。読めないときは null
  function hours(v) {
    var s = z2h(v === null || v === undefined ? '' : v).replace(/\s/g, '');
    if (!s) return null;
    var m;
    if ((m = /^(\d+):([0-5]?\d)$/.exec(s))) return clean(+m[1] + m[2] / 60);
    if ((m = /^(?:(\d+(?:\.\d+)?)時間)?(?:(\d+)分)?$/.exec(s)) && (m[1] || m[2])) return clean((m[1] ? +m[1] : 0) + (m[2] ? m[2] / 60 : 0));
    if (/^\d*\.?\d+$/.test(s)) return clean(parseFloat(s));
    return null;
  }
  function hrs(h) { return (Math.round(h * 100) / 100).toLocaleString('ja-JP', { maximumFractionDigits: 2 }) + '時間'; }

  // ================= 祝日・営業日（支払期日の計算ツールと同じ） =================
  // 国民の祝日（振替休日・国民の休日を含む）
  // 出典：内閣府「国民の祝日について」syukujitsu.csv（https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv）
  // 2026年・2027年の行（支払期日の計算ツールに入れたものと同じ。ツール側の確認日：2026-10-28）
  var HOLIDAYS = [
    ['2026-01-01', '元日'], ['2026-01-12', '成人の日'], ['2026-02-11', '建国記念の日'], ['2026-02-23', '天皇誕生日'],
    ['2026-03-20', '春分の日'], ['2026-04-29', '昭和の日'], ['2026-05-03', '憲法記念日'], ['2026-05-04', 'みどりの日'],
    ['2026-05-05', 'こどもの日'], ['2026-05-06', '休日'], ['2026-07-20', '海の日'], ['2026-08-11', '山の日'],
    ['2026-09-21', '敬老の日'], ['2026-09-22', '休日'], ['2026-09-23', '秋分の日'], ['2026-10-12', 'スポーツの日'],
    ['2026-11-03', '文化の日'], ['2026-11-23', '勤労感謝の日'],
    ['2027-01-01', '元日'], ['2027-01-11', '成人の日'], ['2027-02-11', '建国記念の日'], ['2027-02-23', '天皇誕生日'],
    ['2027-03-21', '春分の日'], ['2027-03-22', '休日'], ['2027-04-29', '昭和の日'], ['2027-05-03', '憲法記念日'],
    ['2027-05-04', 'みどりの日'], ['2027-05-05', 'こどもの日'], ['2027-07-19', '海の日'], ['2027-08-11', '山の日'],
    ['2027-09-20', '敬老の日'], ['2027-09-23', '秋分の日'], ['2027-10-11', 'スポーツの日'], ['2027-11-03', '文化の日'],
    ['2027-11-23', '勤労感謝の日']
  ];
  var HOL_FROM = 2026, HOL_TO = 2027;
  var HMAP = {};
  HOLIDAYS.forEach(function (h) { HMAP[D(h[0])] = h[1]; });
  // 休みの日なら理由、営業日なら ''（銀行の休み 12/31〜1/3 も休み）
  function offReason(n) {
    var w = wday(n), o = ymd(n);
    if (w === 0) return '日曜';
    if (w === 6) return '土曜';
    if (HMAP[n]) return '祝日（' + HMAP[n] + '）';
    if ((o.m === 12 && o.d === 31) || (o.m === 1 && o.d <= 3)) return '銀行の休み';
    return '';
  }
  // 締め日：close = 'end'（末日）| 'none'（締めなし）| 数字（1〜30）
  function closingDate(t, close) {
    if (close === 'none') return t;
    if (close === 'end') return eom(t, 0);
    var c = dayOf(t, 0, +close);
    return t <= c ? c : dayOf(t, 1, +close);
  }
  var SITES = {
    m0end: { label: '当月末', k: 0 }, m1end: { label: '翌月末', k: 1 }, m2end: { label: '翌々月末', k: 2 },
    m1d: { label: '翌月○日', k: 1, n: true }, m2d: { label: '翌々月○日', k: 2, n: true },
    days: { label: '締め日から○日後', n: true }
  };
  function dueRaw(c, site, n) {
    if (site === 'days') return c + n;
    var s = SITES[site] || SITES.m1end;
    return s.n ? dayOf(c, s.k, n) : eom(c, s.k);
  }
  function adjust(n, adj) {
    var r = { n: n, reason: offReason(n) };
    if (adj === 'none' || !r.reason) return r;
    var step = adj === 'next' ? 1 : -1, x = n;
    for (var i = 0; i < 60; i++) { if (!offReason(x)) { r.n = x; return r; } x += step; }
    return r;
  }
  function closeText(close) { return close === 'end' ? '末日締め' : close === 'none' ? '締めなし' : close + '日締め'; }
  function siteText(site, n) {
    if (site === 'm1d') return '翌月' + n + '日払い';
    if (site === 'm2d') return '翌々月' + n + '日払い';
    if (site === 'days') return n + '日後払い';
    return (SITES[site] || SITES.m1end).label + '払い';
  }
  function payText(c) { return closeText(c.close) + '・' + siteText(c.site, c.n); }
  // 請求日と取引先の条件 → 支払期日
  function calcDue(issue, c) {
    var t = D(issue); if (t === null || !c) return null;
    var close = c.close === 'end' || c.close === 'none' ? c.close : Math.min(30, Math.max(1, +c.close || 1));
    var site = SITES[c.site] ? c.site : 'm1end', n = Math.max(1, Math.round(+c.n || 0)) || 30;
    var closing = closingDate(t, close), raw = dueRaw(closing, site, n), a = adjust(raw, c.adj);
    var r = { closing: closing, raw: raw, due: a.n, reason: a.reason, moved: a.n !== raw };
    r.memo = !a.reason ? '' : r.moved ? a.reason + 'のため' + (c.adj === 'next' ? '翌営業日' : '前営業日') + 'に' : a.reason + '（そのまま）';
    r.outOfRange = ymd(Math.min(raw, a.n)).y < HOL_FROM || ymd(Math.max(raw, a.n)).y > HOL_TO;
    return r;
  }

  // ================= 見積・請求 =================
  var RF = { floor: Math.floor, round: Math.round, ceil: Math.ceil };
  var ROUND_LABEL = { floor: '切り捨て', round: '四捨五入', ceil: '切り上げ' };
  function rateOf(v) { var r = toNum(String(v === undefined || v === null ? '10' : v).replace(/[%％]/g, '')); return r === 8 || r === 0 ? r : 10; }
  // 明細 → 1行ごとの金額（数量×単価を四捨五入）→ 税率ごとに合計 → 消費税は税率ごとに1回だけ端数処理（税抜で書く請求書）
  function invCalc(items, round) {
    var rf = RF[round] || Math.floor, by = {};
    var rows = (items || []).filter(function (it) { return has(it.item) && toNum(it.price) !== null; }).map(function (it) {
      var q = has(it.qty) ? toNum(it.qty) : 1; if (q === null) q = 1;
      var p = toNum(it.price), r = rateOf(it.rate);
      return { date: it.date || '', item: String(it.item).trim(), qty: q, unit: it.unit || '', price: p, rate: r, amt: Math.round(clean(q * p)) };
    });
    rows.forEach(function (it) { (by[it.rate] = by[it.rate] || { base: 0, tax: 0 }).base += it.amt; });
    Object.keys(by).forEach(function (r) { var o = by[r]; o.tax = +r ? rf(o.base * +r / 100) : 0; });
    var rates = Object.keys(by).map(Number).sort(function (a, b) { return b - a; });
    var sub = rates.reduce(function (s, r) { return s + by[r].base; }, 0), tax = rates.reduce(function (s, r) { return s + by[r].tax; }, 0);
    return { rows: rows, by: by, rates: rates, sub: sub, tax: tax, total: sub + tax };
  }
  // 源泉徴収税額（所得税・復興特別所得税〈令和9年以後は防衛特別所得税も〉の合計）。1円未満切り捨て
  // 整数のまま計算する（10.21% → ×1021÷10000）
  function withholding(base) {
    base = Math.max(0, Math.round(base || 0));
    if (base <= 1000000) return Math.floor(base * 1021 / 10000);
    return Math.floor((base - 1000000) * 2042 / 10000) + 102100;
  }
  function whFormula(base) {
    base = Math.max(0, Math.round(base || 0));
    if (base <= 1000000) return num(base) + ' × 10.21% ＝ ' + num(withholding(base)) + '円（1円未満切り捨て）';
    return '（' + num(base) + ' − 1,000,000）× 20.42% ＋ 102,100 ＝ ' + num(withholding(base)) + '円（1円未満切り捨て）';
  }
  // 請求書1枚の合計。inv.wh が true のときだけ源泉徴収（消費税と分けて書くので、税抜の小計が対象）
  function invTotals(inv, round) {
    var c = invCalc(inv.items, round), wh = inv.wh ? withholding(c.sub) : 0;
    return { calc: c, sub: c.sub, tax: c.tax, total: c.total, whBase: inv.wh ? c.sub : 0, wh: wh, net: c.total - wh };
  }
  function paidOf(inv) { return (inv.payments || []).reduce(function (s, p) { return s + Math.round(n0(p.amt)); }, 0); }
  // 入金の状態：done 入金済み／late 期日すぎ／part 一部入金／open 未入金
  function payState(inv, today, round) {
    var t = invTotals(inv, round), got = paidOf(inv), rest = Math.max(0, t.net - got), due = D(inv.due);
    var st = rest <= 0 ? 'done' : (due !== null && due < today) ? 'late' : got > 0 ? 'part' : 'open';
    return { net: t.net, got: got, rest: rest, due: due, st: st, left: due === null ? null : due - today };
  }
  var ST_LABEL = { done: '入金済み', late: '期日すぎ', part: '一部入金', open: '未入金' };
  // 時給の案件：時間 × 時給（1円未満は四捨五入）
  function timeAmount(h, rate) { return Math.round(clean((+h || 0) * (+rate || 0))); }
  // 案件の実質時給：固定は 金額÷かかった時間、時給は 時間×時給÷時間（1円未満切り捨て）
  function jobStats(job, times) {
    var h = clean((times || []).filter(function (t) { return t.job === job.id; }).reduce(function (s, t) { return s + (+t.hours || 0); }, 0));
    var rev = job.kind === 'hourly' ? timeAmount(h, job.rate) : Math.round(n0(job.price));
    return { hours: h, revenue: rev, eff: h > 0 ? Math.floor(rev / h) : null };
  }
  // 登録番号：T＋13けた
  function regNoClean(s) { return z2h(s || '').toUpperCase().replace(/[^T0-9]/g, ''); }
  function regNoOk(s) { return /^T\d{13}$/.test(regNoClean(s)); }
  // 適格請求書の記載事項（国税庁「インボイス制度について」の①〜⑥）
  function invChecks(inv, calc, me) {
    var r8 = calc.rates.indexOf(8) >= 0;
    return [
      { k: '受け取る相手の名前', ok: has(inv.to), v: has(inv.to) ? inv.to + ' ' + (inv.hon || '') : '（なし）' },
      { k: '自分の名前（屋号）と登録番号', ok: has(me && (me.trade || me.name)) && regNoOk(me && me.reg), v: ((me && (me.trade || me.name)) || '（名前なし）') + '・' + (me && regNoOk(me.reg) ? regNoClean(me.reg) : '（登録番号なし）') },
      { k: '取引の年月日', ok: calc.rows.some(function (it) { return D(it.date) !== null; }) || D(inv.issue) !== null, v: calc.rows.some(function (it) { return D(it.date) !== null; }) ? '明細ごとの日付' : (D(inv.issue) !== null ? '請求日' : '（なし）') },
      { k: '取引の内容（軽減税率の対象はその旨）', ok: calc.rows.length > 0, v: calc.rows.length + '行' + (r8 ? '・8%に「※」' : '') },
      { k: '税率ごとに分けた合計額と税率', ok: calc.rates.length > 0, v: calc.rates.map(function (r) { return r + '%対象 ' + num(calc.by[r].base); }).join('／') || '（なし）' },
      { k: '税率ごとに分けた消費税額', ok: calc.rates.length > 0, v: calc.rates.map(function (r) { return r + '% ' + num(calc.by[r].tax); }).join('／') || '（なし）' }
    ];
  }

  // ================= 家事按分（家事按分の計算と同じ考え方） =================
  var BASIS = { area: { name: '面積', part: '仕事に使う広さ', whole: '全体' }, time: { name: '時間', part: '仕事に使う時間', whole: '使う時間全体' }, usage: { name: '使用量・回数', part: '仕事での使用量', whole: '全体' }, manual: { name: '手入力（%）' } };
  // 小数4けたまでの数字を {n, big(10^scale 倍の整数), scale} で読む
  function dnum(v) {
    var s = z2h(v === null || v === undefined ? '' : v).replace(/[．]/g, '.').replace(/[\s,，%％]/g, '');
    if (s === '') return { blank: true };
    if (s.charAt(0) === '.') s = '0' + s;
    var m = /^(\d+)(?:\.(\d{1,4}))?$/.exec(s);
    if (!m || m[1].length > 12) return { err: true };
    var f = m[2] || '';
    return { n: Number(m[1] + (f ? '.' + f : '')), big: Number(m[1] + f), scale: f.length };
  }
  // 割合を分数 {p, q}（0 ≤ p/q ≤ 1）で。入っていないときは none、変なときは err
  function ratio(rule) {
    if (!rule) return { p: 1, q: 1, pct: 100 };
    if (rule.basis === 'manual') {
      var x = dnum(rule.pct);
      if (x.blank) return { none: true };
      if (x.err || x.n > 100) return { err: '割合は0〜100%で入れてください。' };
      return { p: x.big, q: 100 * Math.pow(10, x.scale), pct: x.n };
    }
    var a = dnum(rule.part), b = dnum(rule.whole), B = BASIS[rule.basis] || BASIS.area;
    if (a.blank || b.blank) return { none: true };
    if (a.err || b.err) return { err: '「' + B.part + '」「' + B.whole + '」は数字で入れてください。' };
    if (b.n === 0) return { err: '「' + B.whole + '」に0は入れられません。' };
    if (a.n > b.n) return { err: '「' + B.part + '」が「' + B.whole + '」より大きくなっています。' };
    var k = Math.max(a.scale, b.scale);
    return { p: a.big * Math.pow(10, k - a.scale), q: b.big * Math.pow(10, k - b.scale), pct: a.n / b.n * 100 };
  }
  // 仕事の分＝金額×割合（1円未満切り捨て）。整数どうしで割るので小数の誤差が出ない
  function bizPart(amount, r) {
    var a = Math.round(n0(amount));
    if (!r || r.none || r.err) return null;
    var p = a * r.p;
    if (!Number.isSafeInteger(p)) return Math.floor(clean(a * r.p / r.q));
    return Math.floor(p / r.q);
  }
  function pctText(x) { return x === null || x === undefined ? '—' : (Math.round(x * 10 + 1e-9) / 10).toLocaleString('ja-JP', { maximumFractionDigits: 1 }) + '%'; }
  function expBiz(e, rules) {
    var rule = e.rule ? (rules || []).filter(function (r) { return r.id === e.rule; })[0] : null;
    var r = ratio(rule), b = bizPart(e.amt, r);
    return { biz: b === null ? 0 : b, priv: b === null ? 0 : Math.round(n0(e.amt)) - b, pct: r.pct === undefined ? null : r.pct, ok: b !== null, err: r.err || '' };
  }
  var ACCS = ['地代家賃', '水道光熱費', '通信費', '旅費交通費', '消耗品費', '新聞図書費', '会議費', '接待交際費', '支払手数料', '外注工賃', '広告宣伝費', '研修費', '雑費'];

  var API = {
    WD: WD, D: D, ymd: ymd, iso: iso, slash: slash, jd: jd, wday: wday, md: md, mdw: mdw, ym: ym, firstOfMonth: firstOfMonth, eom: eom, dayOf: dayOf, todayN: todayN,
    clean: clean, has: has, toNum: toNum, n0: n0, yen: yen, num: num, hours: hours, hrs: hrs,
    HOLIDAYS: HOLIDAYS, HOL_FROM: HOL_FROM, HOL_TO: HOL_TO, offReason: offReason, closingDate: closingDate, dueRaw: dueRaw, adjust: adjust, SITES: SITES,
    closeText: closeText, siteText: siteText, payText: payText, calcDue: calcDue,
    RF: RF, ROUND_LABEL: ROUND_LABEL, invCalc: invCalc, withholding: withholding, whFormula: whFormula, invTotals: invTotals, paidOf: paidOf, payState: payState, ST_LABEL: ST_LABEL,
    timeAmount: timeAmount, jobStats: jobStats, regNoClean: regNoClean, regNoOk: regNoOk, invChecks: invChecks,
    BASIS: BASIS, dnum: dnum, ratio: ratio, bizPart: bizPart, pctText: pctText, expBiz: expBiz, ACCS: ACCS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.FRL = API;
})(this);
