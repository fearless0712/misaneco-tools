(function () {
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'misaneco.prorate.v1', F = ['amount', 'from', 'to', 'basis', 'mode'];
  var state = { amount: '', from: '', to: '', basis: 'month', mode: 'nearest' };
  try {
    var s = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') F.forEach(function (k) { if (typeof s[k] === 'string') state[k] = s[k]; });
  } catch (e) { /* storage unavailable */ }
  if (!PRORATE.BASES[state.basis]) state.basis = 'month';
  if (state.mode !== 'up' && state.mode !== 'down') state.mode = 'nearest';
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* noop */ } }
  function el(tag, text) { var e = document.createElement(tag); if (text) e.textContent = text; return e; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var lines = [];

  function update() {
    save();
    var r = PRORATE.calc(state), tb = $('tbody');
    while (tb.firstChild) tb.removeChild(tb.firstChild);
    lines = [];
    $('err').textContent = r.state === 'error' ? r.error : '';
    if (r.state !== 'ok') { $('total').textContent = '-'; $('sumLabel').textContent = 'Prorated total'; return; }
    $('total').textContent = PRORATE.money(r.total);
    $('sumLabel').textContent = 'Total (' + r.days + ' days, ' + r.rows.length + (r.rows.length === 1 ? ' month)' : ' months)');
    var rent = PRORATE.money(r.cents);
    r.rows.forEach(function (x) {
      var how = x.full ? 'Full month'
        : r.basis === 'year' ? rent + ' × 12 ÷ 365 × ' + x.use
        : rent + ' × ' + x.use + ' ÷ ' + x.base;
      var tr = el('tr'), period = MON[x.m - 1] + ' ' + x.from + '-' + x.to;
      [MON[x.m - 1] + ' ' + x.y, period + ' (' + x.days + ')', how, PRORATE.money(x.cents)]
        .forEach(function (t) { tr.appendChild(el('td', t)); });
      tb.appendChild(tr);
      lines.push(period + ', ' + x.y + ' (' + x.days + ' days): ' + how + ' = ' + PRORATE.money(x.cents));
    });
    lines.push('Total: ' + PRORATE.money(r.total) + ' (' + PRORATE.BASES[r.basis] + ', ' + { nearest: 'nearest cent', down: 'rounded down', up: 'rounded up' }[r.mode] + ')');
  }
  F.forEach(function (k) {
    var i = $(k); i.value = state[k];
    i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', function () { state[k] = i.value; update(); });
    if (i.type === 'date') i.addEventListener('change', function () { state[k] = i.value; update(); });
  });
  $('toEnd').addEventListener('click', function () {
    var d = PRORATE.parseDate(state.from);
    if (!d) { $('err').textContent = 'Enter the first day first.'; return; }
    state.to = d.y + '-' + pad(d.m) + '-' + pad(PRORATE.daysIn(d.y, d.m)); $('to').value = state.to; update();
  });
  $('fromStart').addEventListener('click', function () {
    var d = PRORATE.parseDate(state.to);
    if (!d) { $('err').textContent = 'Enter the last day first.'; return; }
    state.from = d.y + '-' + pad(d.m) + '-01'; $('from').value = state.from; update();
  });
  $('copy').addEventListener('click', function () {
    if (!lines.length) { $('copied').textContent = 'Enter the rent and dates first.'; return; }
    var done = function (ok) { $('copied').textContent = ok ? 'Copied.' : 'Could not copy. Select the result and copy it.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(lines.join('\n')).then(function () { done(true); }, function () { done(false); });
    else done(false);
  });
  update();
})();
