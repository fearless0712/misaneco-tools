(function () {
  var $ = function (id) { return document.getElementById(id); };
  var K = KINRI, KEY = 'misaneco.kinri.v1';
  var F = ['balance', 'years', 'months', 'rateNow', 'rateNew', 'method', 'deposit', 'dRateNow', 'dRateNew'];
  var state = { balance: '', years: '', months: '', rateNow: '', rateNew: '', method: 'ganri', rule5: false, deposit: '', dRateNow: '', dRateNew: '' };
  try {
    var s = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') {
      F.forEach(function (k) { if (typeof s[k] === 'string') state[k] = s[k]; });
      state.rule5 = s.rule5 === true;
    }
  } catch (e) { /* 保存が使えないときはそのまま */ }
  if (state.method !== 'gankin') state.method = 'ganri';
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* noop */ } }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function sign(n) { return (n > 0 ? '＋' : '') + K.yen(n); }
  function row(tb, label, a, b, d) {
    var tr = el('tr');
    tr.appendChild(el('th', label));
    [a, b, d].forEach(function (t, i) { tr.appendChild(el('td', t, 'num' + (i === 2 ? ' up' : ''))); });
    tb.appendChild(tr);
  }
  var lines = [];

  function updateLoan() {
    var r = K.calcLoan(state), tb = $('tbody'), list = $('fiveList');
    clear(tb); clear(list); lines = [];
    $('err').textContent = r.state === 'error' ? r.error : '';
    $('fiveBox').hidden = true;
    if (r.state !== 'ok') { $('big').textContent = '―'; $('bigLabel').textContent = '毎月の返済額の増え方'; return; }
    var gk = r.method === 'gankin';
    $('bigLabel').textContent = gk ? '1回目の返済額の増え方（元金均等）' : '毎月の返済額の増え方';
    $('big').textContent = gk ? '1回目 ' + sign(r.diffMonth) : '月 ' + sign(r.diffMonth) + '（年 ' + sign(r.diffYear) + '）';
    var rn = r.rateNow + '％', rw = r.rateNew + '％';
    row(tb, '金利（年）', rn, rw, '');
    row(tb, gk ? '1回目の返済額' : '毎月の返済額', K.yen(r.payNow), K.yen(r.payNew), sign(r.diffMonth));
    if (gk) row(tb, '最後の返済額', K.yen(r.lastNow), K.yen(r.lastNew), sign(r.lastNew - r.lastNow));
    if (!gk) row(tb, '1年あたり', K.yen(r.payNow * 12), K.yen(r.payNew * 12), sign(r.diffYear));
    row(tb, '総返済額（' + r.n + '回）', K.yen(r.totalNow), K.yen(r.totalNew), sign(r.diffTotal));
    row(tb, 'そのうち利息', K.yen(r.interestNow), K.yen(r.interestNew), sign(r.interestNew - r.interestNow));
    var term = Math.floor(r.n / 12) + '年' + (r.n % 12 ? (r.n % 12) + 'か月' : '');
    lines.push('【金利が上がったら返済はいくら増える？】', '借入残高：' + K.yen(r.P) + '／残り ' + term + '／' + (gk ? '元金均等' : '元利均等'),
      '金利：' + rn + ' → ' + rw,
      (gk ? '1回目の返済額：' : '毎月の返済額：') + K.yen(r.payNow) + ' → ' + K.yen(r.payNew) + (gk ? '（' + sign(r.diffMonth) + '）' : '（月 ' + sign(r.diffMonth) + '・年 ' + sign(r.diffYear) + '）'),
      '総返済額：' + K.yen(r.totalNow) + ' → ' + K.yen(r.totalNew) + '（' + sign(r.diffTotal) + '）',
      '利息の合計：' + K.yen(r.interestNow) + ' → ' + K.yen(r.interestNew));
    if (r.rule5Ignored) { list.appendChild(el('li', '元金均等には、5年ルール・125%ルールは通常ありません（返済額はすぐに変わります）。')); $('fiveBox').hidden = false; }
    if (r.rule5) {
      var f = r.five, items = [
        '5年間（' + f.months + '回）の毎月の返済額は ' + K.yen(Math.round(f.pay)) + ' のまま（上の「上がったあと」の額にはすぐにはなりません）。',
        '1回目の利息：' + K.yen(Math.round(f.interestOld)) + ' → ' + K.yen(Math.round(f.interestNew)) + '（返済額のうち利息の割合 ' + K.pct(f.shareOld) + ' → ' + K.pct(f.shareNew) + '）',
        '5年後の残高の目安：' + K.yen(Math.round(f.balance)) + '（金利が上がらなかった場合 ' + K.yen(Math.round(f.balanceIfNoRise)) + '。元金の減りが ' + K.yen(Math.round(f.balance - f.balanceIfNoRise)) + ' 遅れます）'
      ];
      if (f.next !== null) items.push('6年目からの毎月の返済額の目安：' + K.yen(Math.round(f.next)) + (f.capped ? '（125%ルールの上限。計算し直すともっと高くなります）' : ''));
      if (f.unpaid > 0.5) items.push('注意：利息が返済額より多く、5年間で未払い利息が 約' + K.yen(Math.round(f.unpaid)) + ' たまります（' + f.firstUnpaid + '回目から）。');
      else items.push('この条件では、5年間に未払い利息は出ません（利息が返済額より少ないため）。');
      items.forEach(function (t) { list.appendChild(el('li', t)); lines.push('・' + t); });
      $('fiveBox').hidden = false;
    }
    lines.push('※目安です。返済額がいつ・どう変わるかは契約によって違います。');
  }

  function updateDeposit() {
    var r = K.calcDeposit(state), tb = $('dBody');
    clear(tb);
    $('dErr').textContent = r.state === 'error' ? r.error : '';
    if (r.state !== 'ok') { $('dBig').textContent = '―'; return; }
    $('dBig').textContent = '年 ' + sign(r.diffNet);
    row(tb, '利息（税引き前）', K.yen(r.grossNow), K.yen(r.grossNew), sign(r.diffGross));
    row(tb, '利息（税引き後の目安）', K.yen(r.netNow), K.yen(r.netNew), sign(r.diffNet));
    Array.prototype.forEach.call(tb.querySelectorAll('td.up'), function (td) { td.className = 'num plus'; });
  }

  function update() { save(); updateLoan(); updateDeposit(); }

  F.forEach(function (k) {
    var i = $(k); i.value = state[k];
    i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', function () { state[k] = i.value; update(); });
  });
  $('rule5').checked = state.rule5;
  $('rule5').addEventListener('change', function () { state.rule5 = $('rule5').checked; update(); });
  Array.prototype.forEach.call(document.querySelectorAll('button[data-step]'), function (b) {
    b.addEventListener('click', function () {
      var now = K.num(state.rateNow);
      if (now === null || isNaN(now)) { $('err').textContent = '先に「今の金利」を入れてください。'; return; }
      state.rateNew = String(K.addRate(now, parseFloat(b.getAttribute('data-step')))); $('rateNew').value = state.rateNew; update();
    });
  });
  $('copy').addEventListener('click', function () {
    if (!lines.length) { $('copied').textContent = '先に借入残高・期間・金利を入れてください。'; return; }
    var done = function (ok) { $('copied').textContent = ok ? 'コピーしました。' : 'コピーできませんでした。結果を選んでコピーしてください。'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(lines.join('\n')).then(function () { done(true); }, function () { done(false); });
    else done(false);
  });
  update();
})();
