/* 家事按分の計算（DOMなし）。ブラウザ(window.ANBUN) と Node(module.exports) の両方で動く。
   根拠：所得税法施行令96条（e-Gov）、国税庁タックスアンサーNo.2210、所得税基本通達45-1・45-2（2026-10-21に確認）。
   丸め：経費にできる目安は1円未満を切り捨て。私用分＝金額−経費分。割合の表示は小数第1位まで（計算は割ったままの値）。
         年額で入れた項目の月額＝年額÷12（1円未満切り捨て）。月額で入れた項目の年額＝月額×12。 */
(function (root) {
  var BASIS = {
    area: { name: '面積', part: '仕事に使う広さ', whole: '全体' },
    time: { name: '時間', part: '仕事に使う時間', whole: '使う時間全体' },
    usage: { name: '使用量・回数', part: '仕事での使用量', whole: '全体' },
    manual: { name: '手入力（%）' }
  };
  var MAX_YEN = 1e10; // 1項目100億円未満
  /* 全角の数字・記号を半角に、桁区切りの「,」・空白・末尾の「円」「%」を取り除く */
  function norm(v) {
    if (v === undefined || v === null) return '';
    return String(v).replace(/[０-９．，－]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[\s\u3000]/g, '').replace(/,/g, '').replace(/(円|%|％)$/, '');
  }
  /* 数字を読む → { blank } / { err } / { n: Number, big: BigInt（10^scale倍）, scale } */
  function num(v) {
    var s = norm(v);
    if (s === '') return { blank: true };
    if (/^-/.test(s)) return { err: 'neg' };
    if (s.charAt(0) === '.') s = '0' + s;
    var m = /^(\d+)(?:\.(\d{1,4}))?$/.exec(s);
    if (!m) return { err: 'nan' };
    var frac = m[2] || '', n = Number(m[1] + (frac ? '.' + frac : ''));
    if (!isFinite(n) || m[1].length > 15) return { err: 'nan' };
    return { n: n, big: BigInt(m[1] + frac), scale: frac.length };
  }
  function pow10(k) { var r = BigInt(1); for (var i = 0; i < k; i++) r = r * BigInt(10); return r; }
  /* 割合を分数 {p, q}（BigInt、0 ≤ p/q ≤ 1）で。未入力なら null */
  function ratio(it) {
    if (it.basis === 'manual') {
      var x = num(it.pct);
      if (x.blank) return { none: true };
      if (x.err) return { err: x.err === 'neg' ? '割合にマイナスは入れられません。' : '割合は数字で入れてください（小数は4けたまで）。' };
      if (x.n > 100) return { err: '割合は0〜100%で入れてください。' };
      return { p: x.big, q: BigInt(100) * pow10(x.scale), pct: x.n };
    }
    var a = num(it.part), b = num(it.whole), B = BASIS[it.basis] || BASIS.area;
    if (a.blank && b.blank) return { none: true };
    if (a.err || b.err) return { err: ((a.err || b.err) === 'neg' ? 'マイナスは入れられません。' : '「' + B.part + '」「' + B.whole + '」は数字で入れてください（小数は4けたまで）。') };
    if (a.blank || b.blank) return { none: true, half: true };
    if (b.n === 0) return { err: '「' + B.whole + '」に0は入れられません。' };
    if (a.n > b.n) return { err: '「' + B.part + '」が「' + B.whole + '」より大きくなっています。' };
    var k = Math.max(a.scale, b.scale);
    return { p: a.big * pow10(k - a.scale), q: b.big * pow10(k - b.scale), pct: a.n / b.n * 100 };
  }
  function floorMul(yen, r) { return Number(BigInt(yen) * r.p / r.q); } // 0以上の整数どうしなので切り捨て
  function r1(x) { return Math.round(x * 10 + 1e-9) / 10; }
  function fmtPct(x) { return x === null || x === undefined ? '—' : r1(x).toLocaleString('ja-JP', { maximumFractionDigits: 1 }) + '%'; }
  function fmtYen(n) { return n === null || n === undefined ? '—' : n.toLocaleString('ja-JP') + '円'; }
  function fmtNum(x) { return x.n.toLocaleString('ja-JP', { maximumFractionDigits: 4 }); }

  /* it: { name, amount, period:'month'|'year', basis, part, whole, unit, note, pct } */
  function calcItem(it) {
    var name = String(it.name || '').trim() || 'その他';
    var out = { name: name, state: 'empty', error: '', pct: null, monthAmt: null, yearAmt: null, monthBiz: null, monthPriv: null, yearBiz: null, yearPriv: null, memo: '' };
    var a = num(it.amount);
    if (a.err) { out.state = 'error'; out.error = a.err === 'neg' ? '金額にマイナスは入れられません。' : '金額は数字で入れてください。'; return out; }
    if (!a.blank && a.scale > 0) { out.state = 'error'; out.error = '金額は1円単位（整数）で入れてください。'; return out; }
    if (!a.blank && a.n >= MAX_YEN) { out.state = 'error'; out.error = '金額が大きすぎます。'; return out; }
    var r = ratio(it);
    if (r.err) { out.state = 'error'; out.error = r.err; return out; }
    if (a.blank) return out;
    var yen = a.n, isYear = it.period === 'year';
    out.yearAmt = isYear ? yen : yen * 12;
    out.monthAmt = isYear ? Math.floor(yen / 12) : yen;
    if (r.none) { out.state = 'noratio'; out.error = r.half ? '両方の数字を入れると計算します。' : '割合を入れると計算します。'; return out; }
    out.state = 'ok'; out.pct = r.pct;
    out.monthBiz = floorMul(out.monthAmt, r); out.monthPriv = out.monthAmt - out.monthBiz;
    out.yearBiz = floorMul(out.yearAmt, r); out.yearPriv = out.yearAmt - out.yearBiz;
    out.memo = memo(it, name, r, out);
    return out;
  }
  function memo(it, name, r, o) {
    var tail = '（年額 ' + fmtYen(o.yearAmt) + ' のうち ' + fmtYen(o.yearBiz) + '）';
    var note = String(it.note || '').trim();
    if (it.basis === 'manual') return name + '：' + fmtPct(r.pct) + '（理由：' + (note || 'ここに理由を書いておきましょう') + '）' + tail;
    var B = BASIS[it.basis] || BASIS.area, u = String(it.unit || '').trim();
    return name + '：' + (note || B.part) + ' ' + fmtNum(num(it.part)) + u + '÷' + B.whole + ' ' + fmtNum(num(it.whole)) + u + '＝' + fmtPct(r.pct) + tail;
  }
  function calcAll(items) {
    var rows = items.map(calcItem), t = { monthAmt: 0, yearAmt: 0, monthBiz: 0, monthPriv: 0, yearBiz: 0, yearPriv: 0, count: 0, skipped: 0 };
    rows.forEach(function (x) {
      if (x.state === 'ok') { t.count++; ['monthAmt', 'yearAmt', 'monthBiz', 'monthPriv', 'yearBiz', 'yearPriv'].forEach(function (k) { t[k] += x[k]; }); }
      else if (x.state !== 'empty') t.skipped++;
    });
    return { rows: rows, total: t };
  }
  /* CSVの1マス：「,」「"」改行を含むときは "" で囲む。= + - @ で始まる文字は表計算の式にならないよう ' を付ける */
  function csvCell(v) {
    if (v === null || v === undefined) return '';
    var s = String(v);
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function csv(items) {
    var res = calcAll(items), L = [];
    L.push(['項目', '入力した金額', '月額/年額', '分け方', '仕事の分', '全体', '単位', '割合(%)', '経費にできる目安(月)', '私用分(月)', '経費にできる目安(年)', '私用分(年)', '根拠のメモ']);
    items.forEach(function (it, i) {
      var x = res.rows[i]; if (x.state !== 'ok') return;
      var man = it.basis === 'manual';
      L.push([x.name, num(it.amount).n, it.period === 'year' ? '年額' : '月額', (BASIS[it.basis] || BASIS.area).name,
        man ? '' : num(it.part).n, man ? '' : num(it.whole).n, man ? '' : String(it.unit || ''), r1(x.pct),
        x.monthBiz, x.monthPriv, x.yearBiz, x.yearPriv, x.memo]);
    });
    var t = res.total;
    L.push(['合計', '', '', '', '', '', '', '', t.monthBiz, t.monthPriv, t.yearBiz, t.yearPriv, '目安です。1円未満切り捨て。']);
    return '\uFEFF' + L.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }
  var API = { BASIS: BASIS, norm: norm, num: num, calcItem: calcItem, calcAll: calcAll, csv: csv, csvCell: csvCell, fmtPct: fmtPct, fmtYen: fmtYen, r1: r1 };
  if (typeof module !== 'undefined') module.exports = API; else root.ANBUN = API;
})(this);
