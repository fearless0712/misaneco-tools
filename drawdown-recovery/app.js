/* Drawdown recovery calculator page */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var ids = ['mode', 'loss', 'peak', 'balance', 'risk', 'avgR'];
  var last = '';
  function row(tb, k, v) {
    var tr = document.createElement('tr'), th = document.createElement('th'), td = document.createElement('td');
    th.scope = 'row'; th.textContent = k; td.className = 'num'; td.textContent = v;
    tr.appendChild(th); tr.appendChild(td); tb.appendChild(tr);
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function run() {
    var bal = $('mode').value === 'bal';
    $('pctBox').hidden = bal; $('balBox').hidden = !bal;
    var o = {}; ids.forEach(function (k) { o[k] = $(k).value; });
    var r = DD.calc(o), tb = $('tbody');
    clear(tb); $('err').textContent = ''; $('winsOut').textContent = ''; last = '';
    if (r.state === 'empty') { $('need').textContent = '—'; return; }
    if (r.state === 'error') { $('need').textContent = '—'; $('err').textContent = r.msg; return; }
    $('need').textContent = '+' + DD.pct(r.need);
    var lines = [['Drawdown', DD.pct(r.dd)], ['Gain needed to get back', '+' + DD.pct(r.need)]];
    if (r.mode === 'bal') {
      lines.push(['Amount needed to reach the peak', DD.money(r.amount)]);
      if (r.above) $('err').textContent = 'Your balance is above the peak you entered, so there is no drawdown.';
    }
    if (r.winsErr) $('err').textContent = r.winsErr;
    if (r.wins) {
      var w = r.wins;
      lines.push(['Gain per winning trade', '+' + DD.pct(w.gainPerWin) + ' of balance']);
      lines.push(['Winning trades needed (estimate)', w.n.toLocaleString('en-US') + ' in a row (' + DD.r2(w.exact).toLocaleString('en-US') + ' by the formula)']);
      if (w.n > 0) lines.push(['Each losing trade in between adds about', DD.r2(w.perLoss).toLocaleString('en-US') + ' more wins']);
      $('winsOut').textContent = 'Estimate only: it assumes every win is exactly ' + DD.pct(w.gainPerWin) + ' of the current balance and no costs. Real results vary.';
    }
    lines.forEach(function (l) { row(tb, l[0], l[1]); });
    last = ['[Drawdown recovery]'].concat(lines.map(function (l) { return l[0] + ': ' + l[1]; })).join('\n');
  }
  function copy(text, out) {
    if (!text) { $(out).textContent = 'Enter your numbers first.'; return; }
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { $(out).textContent = 'Copied.'; }, function () { $(out).textContent = 'Could not copy.'; });
    else $(out).textContent = 'Could not copy.';
  }
  ids.forEach(function (k) { $(k).addEventListener('input', run); $(k).addEventListener('change', run); });
  $('copy').addEventListener('click', function () { copy(last, 'copied'); });
  $('copyTable').addEventListener('click', function () { copy(DD.tableText(), 'copiedTable'); });
  run();
})();
