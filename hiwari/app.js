(function () {
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'misaneco.hiwari.v1', F = ['amount', 'from', 'to', 'basis', 'mode'];
  var state = { amount: '', from: '', to: '', basis: 'cal', mode: 'floor' };
  try {
    var s = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') F.forEach(function (k) { if (typeof s[k] === 'string') state[k] = s[k]; });
  } catch (e) { /* 保存が使えないときはそのまま */ }
  if (state.basis !== '30') state.basis = 'cal';
  if (state.mode !== 'round' && state.mode !== 'ceil') state.mode = 'floor';
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* noop */ } }
  function el(tag, text) { var e = document.createElement(tag); if (text) e.textContent = text; return e; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var lines = [];

  function update() {
    save();
    var r = HIWARI.calc(state), tb = $('tbody');
    while (tb.firstChild) tb.removeChild(tb.firstChild);
    lines = [];
    $('err').textContent = r.state === 'error' ? r.error : '';
    if (r.state !== 'ok') { $('total').textContent = '―'; $('sumLabel').textContent = '日割りの合計'; return; }
    $('total').textContent = HIWARI.yen(r.total);
    $('sumLabel').textContent = '合計（' + r.days + '日間・' + r.rows.length + 'か月分）';
    r.rows.forEach(function (x) {
      var tr = el('tr');
      var how = x.full ? '1か月分' : HIWARI.yen(Math.round(r.amount)).replace('円', '') + '×' + x.use + '÷' + x.base;
      [x.y + '年' + x.m + '月', x.m + '/' + x.from + '〜' + x.m + '/' + x.to + '（' + x.days + '日）', how, HIWARI.yen(x.yen)]
        .forEach(function (t) { tr.appendChild(el('td', t)); });
      tb.appendChild(tr);
      lines.push(x.y + '年' + x.m + '月 ' + x.from + '日〜' + x.to + '日（' + x.days + '日）：' + how + ' ＝ ' + HIWARI.yen(x.yen));
    });
    lines.push('合計：' + HIWARI.yen(r.total) + '（' + (r.basis === '30' ? '30日で割る' : 'その月の日数で割る') + '・1円未満' + { floor: '切り捨て', round: '四捨五入', ceil: '切り上げ' }[r.mode] + '）');
  }

  F.forEach(function (k) {
    var i = $(k); i.value = state[k];
    i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', function () { state[k] = i.value; update(); });
    if (i.type === 'date') i.addEventListener('change', function () { state[k] = i.value; update(); });
  });
  $('toEnd').addEventListener('click', function () {
    var d = HIWARI.parseDate(state.from);
    if (!d) { $('err').textContent = '先に「始まりの日」を入れてください。'; return; }
    state.to = d.y + '-' + pad(d.m) + '-' + pad(HIWARI.daysIn(d.y, d.m)); $('to').value = state.to; update();
  });
  $('fromStart').addEventListener('click', function () {
    var d = HIWARI.parseDate(state.to);
    if (!d) { $('err').textContent = '先に「終わりの日」を入れてください。'; return; }
    state.from = d.y + '-' + pad(d.m) + '-01'; $('from').value = state.from; update();
  });
  $('copy').addEventListener('click', function () {
    if (!lines.length) { $('copied').textContent = '先に金額と日付を入れてください。'; return; }
    var done = function (ok) { $('copied').textContent = ok ? 'コピーしました。' : 'コピーできませんでした。結果を選んでコピーしてください。'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(lines.join('\n')).then(function () { done(true); }, function () { done(false); });
    else done(false);
  });
  update();
})();
