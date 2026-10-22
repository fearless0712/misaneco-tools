/* 金利が上がったら返済はいくら増える？（ローン返済シミュレーター）の計算部分（ブラウザ・node 共通） */
(function (root) {
  var TAX = 0.20315;        // 預金の利子にかかる税（所得税・復興特別所得税 15.315％＋住民税 5％）
  var TAX_NATIONAL = 0.15315, TAX_LOCAL = 0.05;

  // "3,000万円" "３０００" "0.5%" → 数字。空は null、数字でない・マイナスは NaN
  function num(s) {
    if (s === null || s === undefined) return null;
    var t = String(s).replace(/[０-９．]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[\s,，円¥￥%％万年か月ヶカケ]/g, '');
    if (t === '') return null;
    if (!/^\d+(\.\d+)?$/.test(t) && !/^\.\d+$/.test(t)) return NaN;
    return parseFloat(t);
  }

  /*
   * 元利均等の毎月の返済額（Excel の =PMT(年利/12, 回数, -借入額) と同じ式）
   * rate: 年利（％）、n: 返済回数（月）、P: 借入残高（円）。0％なら P / n。
   */
  function pmt(rate, n, P) {
    var r = rate / 100 / 12;
    if (n <= 0) return NaN;
    if (r === 0) return P / n;
    return P * r / (1 - Math.pow(1 + r, -n));
  }

  // 元金均等：1回目の返済額・最後の返済額・利息の合計
  function gankin(rate, n, P) {
    var r = rate / 100 / 12, part = P / n;
    return { first: part + P * r, last: part + part * r, interest: P * r * (n + 1) / 2, total: P + P * r * (n + 1) / 2 };
  }

  /*
   * 5年ルール・125%ルールの目安（元利均等のみ）。
   * 金利が rateNew に上がっても、60回（残りが短ければ残りの回数）は返済額を pay のまま据え置く。
   * 利息が返済額より多い月は、足りない分を「未払い利息」として別に積み上げる（残高には足さない）。
   * 6年目からの返済額 ＝ そのときの残高・残り回数・新しい金利で計算し直した額。ただし前の返済額の1.25倍まで。
   */
  function fiveYear(rateOld, rateNew, n, P) {
    var pay = pmt(rateOld, n, P), r = rateNew / 100 / 12, rOld = rateOld / 100 / 12;
    var months = Math.min(60, n), bal = P, balOld = P, unpaid = 0, firstUnpaid = 0;
    for (var i = 0; i < months; i++) {
      var it = bal * r;
      if (pay >= it) bal -= pay - it; else { unpaid += it - pay; if (!firstUnpaid) firstUnpaid = i + 1; }
      balOld -= pay - balOld * rOld;
    }
    var rest = n - months, next = null, capped = false;
    if (rest > 0) {
      var re = pmt(rateNew, rest, bal);
      if (re > pay * 1.25) { next = pay * 1.25; capped = true; } else next = re;
    }
    return {
      pay: pay, months: months,
      interestOld: P * rOld, interestNew: P * r,          // 1回目の利息
      shareOld: pay > 0 ? P * rOld / pay : 0, shareNew: pay > 0 ? P * r / pay : 0,
      balance: Math.max(bal, 0), balanceIfNoRise: Math.max(balOld, 0),
      unpaid: unpaid, firstUnpaid: firstUnpaid, unpaidNow: P * r > pay,
      rest: rest, next: next, capped: capped
    };
  }

  /*
   * ローン：o = { balance（万円）, years, months, rateNow（年%）, rateNew（年%）, method: 'ganri'|'gankin', rule5: bool }
   */
  function calcLoan(o) {
    var b = num(o.balance), y = num(o.years), mo = num(o.months), a = num(o.rateNow), c = num(o.rateNew);
    if (b === null && y === null && a === null && c === null) return { state: 'empty' };
    if (b === null || isNaN(b) || b <= 0) return { state: 'error', error: '借入残高を万円で入れてください（例：3000）。' };
    if (b > 100000) return { state: 'error', error: '借入残高は10億円（100000万円）までにしてください。' };
    if (y === null) y = 0;
    if (mo === null) mo = 0;
    if (isNaN(y) || y !== Math.floor(y) || isNaN(mo) || mo !== Math.floor(mo) || mo > 11) return { state: 'error', error: '残りの期間は「年」と「か月（0〜11）」を整数で入れてください。' };
    var n = y * 12 + mo;
    if (n < 1) return { state: 'error', error: '残りの期間を入れてください。' };
    if (n > 50 * 12) return { state: 'error', error: '残りの期間は50年までにしてください。' };
    if (a === null || c === null) return { state: 'error', error: '今の金利と、上がったあとの金利を年％で入れてください（例：0.5）。' };
    if (isNaN(a) || isNaN(c) || a > 20 || c > 20) return { state: 'error', error: '金利は0〜20％の数字で入れてください。' };
    var P = Math.round(b * 10000), method = o.method === 'gankin' ? 'gankin' : 'ganri';
    var res = { state: 'ok', P: P, n: n, rateNow: a, rateNew: c, method: method };
    if (method === 'ganri') {
      var p1 = pmt(a, n, P), p2 = pmt(c, n, P);
      res.payNow = Math.round(p1); res.payNew = Math.round(p2);
      res.totalNow = Math.round(p1 * n); res.totalNew = Math.round(p2 * n);
    } else {
      var g1 = gankin(a, n, P), g2 = gankin(c, n, P);
      res.payNow = Math.round(g1.first); res.payNew = Math.round(g2.first);
      res.lastNow = Math.round(g1.last); res.lastNew = Math.round(g2.last);
      res.totalNow = Math.round(g1.total); res.totalNew = Math.round(g2.total);
    }
    res.diffMonth = res.payNew - res.payNow; res.diffYear = res.diffMonth * 12;
    res.interestNow = res.totalNow - P; res.interestNew = res.totalNew - P;
    res.diffTotal = res.totalNew - res.totalNow;
    res.rule5 = !!o.rule5 && method === 'ganri' && c > a;
    res.rule5Ignored = !!o.rule5 && method === 'gankin';
    if (res.rule5) res.five = fiveYear(a, c, n, P);
    return res;
  }

  // 預金の利子にかかる税（目安）：所得税・復興特別所得税と住民税を別々に1円未満切り捨て
  function afterTax(interest) {
    var i = Math.floor(interest);
    return i - Math.floor(i * TAX_NATIONAL + 1e-9) - Math.floor(i * TAX_LOCAL + 1e-9);
  }

  // 預金：o = { deposit（万円）, dRateNow（年%）, dRateNew（年%） } → 1年分の利息
  function calcDeposit(o) {
    var d = num(o.deposit), a = num(o.dRateNow), c = num(o.dRateNew);
    if (d === null && a === null && c === null) return { state: 'empty' };
    if (d === null || isNaN(d) || d <= 0) return { state: 'error', error: '預金残高を万円で入れてください（例：300）。' };
    if (a === null || c === null || isNaN(a) || isNaN(c) || a > 20 || c > 20) return { state: 'error', error: '預金の金利を年％で入れてください（例：0.2）。' };
    var D = Math.round(d * 10000);
    var g1 = Math.floor(D * a / 100 + 1e-9), g2 = Math.floor(D * c / 100 + 1e-9);
    var n1 = afterTax(g1), n2 = afterTax(g2);
    return { state: 'ok', D: D, grossNow: g1, grossNew: g2, netNow: n1, netNew: n2, diffGross: g2 - g1, diffNet: n2 - n1 };
  }

  function yen(n) {
    var s = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (n < 0 ? '−' : '') + s + '円';
  }
  function pct(x) { return (Math.round(x * 1000) / 10).toFixed(1) + '％'; }
  // 金利 + 上げ幅（0.1％刻みの小数の誤差を出さない）
  function addRate(now, step) { return Math.round((now + step) * 1000) / 1000; }

  var API = { TAX: TAX, num: num, pmt: pmt, gankin: gankin, fiveYear: fiveYear, calcLoan: calcLoan, afterTax: afterTax, calcDeposit: calcDeposit, yen: yen, pct: pct, addRate: addRate };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.KINRI = API;
})(this);
