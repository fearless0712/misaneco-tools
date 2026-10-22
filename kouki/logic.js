/* 工期（稼働日）計算ツールの計算部分（ブラウザ・node 共通） */
(function (root) {
  // 国民の祝日（内閣府「国民の祝日について」2026年・2027年。振替休日・国民の休日を含む）
  var HOLIDAYS = [
    ['2026-01-01', '元日'], ['2026-01-12', '成人の日'], ['2026-02-11', '建国記念の日'], ['2026-02-23', '天皇誕生日'],
    ['2026-03-20', '春分の日'], ['2026-04-29', '昭和の日'], ['2026-05-03', '憲法記念日'], ['2026-05-04', 'みどりの日'],
    ['2026-05-05', 'こどもの日'], ['2026-05-06', '振替休日'], ['2026-07-20', '海の日'], ['2026-08-11', '山の日'],
    ['2026-09-21', '敬老の日'], ['2026-09-22', '国民の休日'], ['2026-09-23', '秋分の日'], ['2026-10-12', 'スポーツの日'],
    ['2026-11-03', '文化の日'], ['2026-11-23', '勤労感謝の日'],
    ['2027-01-01', '元日'], ['2027-01-11', '成人の日'], ['2027-02-11', '建国記念の日'], ['2027-02-23', '天皇誕生日'],
    ['2027-03-21', '春分の日'], ['2027-03-22', '振替休日'], ['2027-04-29', '昭和の日'], ['2027-05-03', '憲法記念日'],
    ['2027-05-04', 'みどりの日'], ['2027-05-05', 'こどもの日'], ['2027-07-19', '海の日'], ['2027-08-11', '山の日'],
    ['2027-09-20', '敬老の日'], ['2027-09-23', '秋分の日'], ['2027-10-11', 'スポーツの日'], ['2027-11-03', '文化の日'],
    ['2027-11-23', '勤労感謝の日']
  ];
  var HOL_FROM = 2026, HOL_TO = 2027;
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  var MAX_SPAN = 366 * 3; // 期間は3年まで

  function z2h(s) { return String(s).replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }); }
  function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  // "2026-10-09" "2026/10/9" → 通し番号（1970-01-01 が 0）。存在しない日付は null
  function parseDate(s) {
    var m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/.exec(z2h(String(s || '')).trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null;
    return Date.UTC(y, mo - 1, d) / 86400000;
  }
  function ymd(n) { var t = new Date(n * 86400000); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
  function iso(n) { var o = ymd(n); return o.y + '-' + (o.m < 10 ? '0' : '') + o.m + '-' + (o.d < 10 ? '0' : '') + o.d; }
  function wday(n) { return ((n % 7) + 7 + 4) % 7; } // 1970-01-01 は木曜（4）
  function fmt(n) { var o = ymd(n); return o.y + '年' + o.m + '月' + o.d + '日（' + WD[wday(n)] + '）'; }
  function fmtShort(n) { var o = ymd(n); return o.m + '/' + o.d + '（' + WD[wday(n)] + '）'; }

  var HMAP = {};
  HOLIDAYS.forEach(function (h) { HMAP[parseDate(h[0])] = h[1]; });

  // 稼働日数 "3" "３日" → 3。空は null、整数でない・文字は NaN（0や負は calc 側でエラー）
  function num(s) {
    if (s === null || s === undefined) return null;
    var t = z2h(s).replace(/[\s,，]/g, '').replace(/日$/, '').replace(/^[−ー－]/, '-');
    if (t === '') return null;
    if (!/^-?\d+$/.test(t)) return NaN;
    return parseInt(t, 10);
  }

  // 休みの曜日：preset = 'satsun' | 'sun' | 'none' | 'custom'（custom は [日,月,…,土] の true/false）
  function offWeek(preset, custom) {
    if (preset === 'sun') return [true, false, false, false, false, false, false];
    if (preset === 'none') return [false, false, false, false, false, false, false];
    if (preset === 'custom') return [0, 1, 2, 3, 4, 5, 6].map(function (i) { return !!(custom && custom[i]); });
    return [true, false, false, false, false, false, true];
  }

  // 会社の休み：1行に1日、または期間（2026-12-29〜2027-01-03）。後ろに「お盆」などのメモを書いてもよい
  function parseCompany(text) {
    var days = {}, errors = [], count = 0;
    String(text || '').split(/\r?\n/).forEach(function (raw, i) {
      var line = z2h(raw).trim();
      if (!line) return;
      var D = '(\\d{4}[-\\/.]\\d{1,2}[-\\/.]\\d{1,2})';
      var m = new RegExp('^' + D + '(?:\\s*(?:〜|～|~|から)\\s*' + D + ')?\\s*(.*)$').exec(line);
      var a = m && parseDate(m[1]), b = m && (m[2] ? parseDate(m[2]) : a);
      if (!m || a === null || b === null) { errors.push((i + 1) + '行目「' + raw.trim() + '」は日付として読めませんでした（例：2026-08-13 または 2026-12-29〜2027-01-03）'); return; }
      if (b < a) { errors.push((i + 1) + '行目の期間は、始まりより終わりが前になっています'); return; }
      if (b - a > 366) { errors.push((i + 1) + '行目の期間が長すぎます（1年まで）'); return; }
      var memo = (m[3] || '').trim() || '会社の休み';
      for (var n = a; n <= b; n++) { if (!(n in days)) { count++; days[n] = memo; } else if (days[n] === '会社の休み') days[n] = memo; }
    });
    return { days: days, errors: errors, count: count };
  }

  // 1日の判定：休みなら kind = 'week' | 'holiday' | 'company'（重なるときは 曜日→祝日→会社の休み の順で1つ）
  function dayInfo(n, ctx) {
    var r = { n: n, off: false, kind: '', label: '' };
    var hol = ctx.useHol ? HMAP[n] : undefined, com = ctx.company[n];
    if (ctx.week[wday(n)]) { r.off = true; r.kind = 'week'; }
    else if (hol) { r.off = true; r.kind = 'holiday'; }
    else if (com) { r.off = true; r.kind = 'company'; }
    r.label = [hol, com].filter(Boolean).join('・');
    return r;
  }

  function context(o) {
    var week = offWeek(o.preset, o.custom);
    if (week.every(Boolean)) return { error: '休みの曜日がすべてにチェックされています。稼働する曜日を1つ以上残してください。' };
    var c = parseCompany(o.company);
    if (c.errors.length) return { error: '会社の休み：' + c.errors[0] + '。' };
    return { week: week, useHol: !!o.holidays, company: c.days };
  }

  function summarize(list, ctx, extra) {
    var off = { week: 0, holiday: 0, company: 0 }, work = 0;
    list.forEach(function (x) { if (x.off) off[x.kind]++; else x.no = ++work; });
    var a = list[0].n, b = list[list.length - 1].n, warn = [];
    if (ctx.useHol && (ymd(a).y < HOL_FROM || ymd(b).y > HOL_TO)) {
      warn.push('祝日の自動判定は' + HOL_FROM + '年〜' + HOL_TO + '年までです。期間に入っているそれ以外の年の祝日は、休みに入っていません。必要なら「会社の休み」の欄に日付を入れてください。');
    }
    var r = { state: 'ok', start: a, end: b, calDays: b - a + 1, workDays: work, offDays: off.week + off.holiday + off.company, off: off, list: list, warn: warn };
    for (var k in extra) r[k] = extra[k];
    return r;
  }

  // 開始日＋稼働日数 → 終了予定日（開始日を1日目。開始日が休みなら次の稼働日から数える）
  function calcEnd(o) {
    var days = num(o.days), s = parseDate(o.start);
    if (!o.start && days === null) return { state: 'empty' };
    if (s === null) return { state: 'error', error: o.start ? '開始日を正しく入れてください。' : '開始日を入れてください。' };
    if (days === null) return { state: 'empty' };
    if (isNaN(days)) return { state: 'error', error: '稼働日数は数字（整数）で入れてください。' };
    if (days < 1) return { state: 'error', error: '稼働日数は1日以上で入れてください。' };
    if (days > 1000) return { state: 'error', error: '稼働日数は1000日までにしてください。' };
    var ctx = context(o);
    if (ctx.error) return { state: 'error', error: ctx.error };
    var list = [], work = 0, n = s;
    while (work < days) {
      if (n - s >= MAX_SPAN) return { state: 'error', error: '期間が3年を超えます。稼働日数や休みの設定を見直してください。' };
      var x = dayInfo(n, ctx);
      if (!x.off) work++;
      list.push(x); n++;
    }
    // 開始日が休みのとき、先頭の休みは一覧から外さず、「次の稼働日から数える」と知らせる
    var first = list.filter(function (x) { return !x.off; })[0].n;
    return summarize(list, ctx, { mode: 'end', days: days, startOff: first !== s, firstWork: first });
  }

  // 開始日〜終了日（両方含む）→ 稼働日数（逆算）
  function calcCount(o) {
    var s = parseDate(o.start), e = parseDate(o.end);
    if (!o.start && !o.end) return { state: 'empty' };
    if (s === null || e === null) return { state: 'error', error: '開始日と終了日を正しく入れてください。' };
    if (e < s) return { state: 'error', error: '終了日が、開始日より前になっています。' };
    if (e - s >= MAX_SPAN) return { state: 'error', error: '期間は3年までにしてください。' };
    var ctx = context(o);
    if (ctx.error) return { state: 'error', error: ctx.error };
    var list = [];
    for (var n = s; n <= e; n++) list.push(dayInfo(n, ctx));
    return summarize(list, ctx, { mode: 'count' });
  }

  function calc(o) { return o.mode === 'count' ? calcCount(o) : calcEnd(o); }

  // カレンダー表示用：月ごとに 日〜土 の7列（期間外は null）
  function months(r) {
    var out = [], cur = null;
    r.list.forEach(function (x) {
      var o = ymd(x.n);
      if (!cur || cur.y !== o.y || cur.m !== o.m) {
        cur = { y: o.y, m: o.m, cells: [] };
        out.push(cur);
        for (var i = 0; i < wday(x.n); i++) cur.cells.push(null);
      }
      cur.cells.push({ d: o.d, n: x.n, off: x.off, kind: x.kind, label: x.label, no: x.no });
    });
    out.forEach(function (mo) { while (mo.cells.length % 7) mo.cells.push(null); });
    return out;
  }

  var PRESET = { satsun: '土日', sun: '日曜のみ', none: 'なし' };
  function weekText(o) {
    if (o.preset !== 'custom') return PRESET[o.preset] || '土日';
    var w = offWeek('custom', o.custom), t = WD.filter(function (_, i) { return w[i]; }).join('・');
    return t ? t + '曜' : 'なし';
  }
  // 結果をコピーするときの文
  function text(r, o) {
    var L = ['【工期（稼働日）計算】', '開始日：' + fmt(r.start)];
    if (r.mode === 'end') {
      if (r.startOff) L.push('※開始日は休みのため、次の稼働日 ' + fmt(r.firstWork) + ' から数えています');
      L.push('稼働日数：' + r.days + '日', '終了予定日：' + fmt(r.end));
    } else {
      L.push('終了日：' + fmt(r.end), '稼働日数：' + r.workDays + '日');
    }
    L.push('暦日数：' + r.calDays + '日（休み ' + r.offDays + '日：曜日 ' + r.off.week + '日・祝日 ' + r.off.holiday + '日・会社の休み ' + r.off.company + '日）');
    L.push('休みの曜日：' + weekText(o) + '／祝日：' + (o.holidays ? '休み' : '稼働'));
    var offs = r.list.filter(function (x) { return x.off; }).map(function (x) { return fmtShort(x.n) + (x.label ? x.label : ''); });
    if (offs.length) L.push('休みの日：' + offs.join('、'));
    r.warn.forEach(function (w) { L.push('※' + w); });
    return L.join('\n');
  }

  var API = { HOLIDAYS: HOLIDAYS, HOL_FROM: HOL_FROM, HOL_TO: HOL_TO, WD: WD, num: num, parseDate: parseDate, iso: iso, ymd: ymd, wday: wday,
    fmt: fmt, fmtShort: fmtShort, offWeek: offWeek, parseCompany: parseCompany, calcEnd: calcEnd, calcCount: calcCount, calc: calc,
    months: months, text: text, weekText: weekText };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.KOUKI = API;
})(this);
