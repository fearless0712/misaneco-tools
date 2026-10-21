/* Position size calculator page */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var ids = ['balance', 'riskMode', 'risk', 'pip', 'rate', 'side', 'entry', 'stop', 'target', 'spread', 'step', 'lot', 'lev'];
  var last = '';
  function row(tb, k, v) {
    var tr = document.createElement('tr'), th = document.createElement('th'), td = document.createElement('td');
    th.scope = 'row'; th.textContent = k; td.className = 'num'; td.textContent = v;
    tr.appendChild(th); tr.appendChild(td); tb.appendChild(tr);
  }
  function fmtPips(p) { return (Math.round(p * 10) / 10).toLocaleString('en-US') + ' pips'; }
  function pct(n) { return (Math.round(n * 100) / 100) + '%'; }
  function run() {
    var amt = $('riskMode').value === 'amt';
    $('riskLabel').textContent = amt ? 'Amount you are willing to lose' : 'Risk per trade (% of balance)';
    $('risk').placeholder = amt ? 'e.g. 100' : 'e.g. 1';
    var o = {}; ids.forEach(function (k) { o[k] = $(k).value; });
    var r = PS.calc(o), tb = $('tbody');
    while (tb.firstChild) tb.removeChild(tb.firstChild);
    $('err').textContent = ''; last = '';
    if (r.state === 'empty') { $('units').textContent = '—'; return; }
    if (r.state === 'error') { $('units').textContent = '—'; $('err').textContent = r.msg; return; }
    $('units').textContent = r.tooSmall ? '0 units (too small to trade)' : PS.int(r.units) + ' units (' + r.lots.toLocaleString('en-US') + ' lots)';
    if (r.tooSmall) $('err').textContent = 'Even the smallest order would lose more than you allowed with this stop. Move the stop closer or allow a larger loss.';
    var lines = [
      ['Amount at risk', PS.money(r.riskAmt) + ' (' + pct(r.riskPct) + ' of balance)'],
      ['Stop distance', fmtPips(r.pips) + (o.spread ? ' (incl. spread)' : '')],
      ['Pip value per lot', PS.money(r.pipValueLot)],
      ['Loss if the stop is hit', PS.money(r.loss) + ' (' + pct(r.lossPct) + ' of balance)'],
      ['Margin needed (at ' + r.lev + ':1)', PS.money(r.margin)],
      ['Effective leverage', (Math.round(r.leverage * 100) / 100) + ':1']
    ];
    if (r.targetErr) $('err').textContent = r.targetErr;
    if (r.rr !== undefined) {
      lines.push(['Take-profit distance', fmtPips(r.tpPips)]);
      lines.push(['Profit if take-profit is hit', PS.money(r.profit)]);
      lines.push(['Reward-to-risk ratio', (Math.round(r.rr * 100) / 100) + ' : 1']);
    }
    lines.forEach(function (l) { row(tb, l[0], l[1]); });
    if (r.marginShort) $('err').textContent = 'The margin needed is larger than your balance. Your broker may not accept this order.';
    last = ['[Position size]', 'Max position: ' + $('units').textContent].concat(lines.map(function (l) { return l[0] + ': ' + l[1]; })).join('\n');
  }
  ids.forEach(function (k) { $(k).addEventListener('input', run); $(k).addEventListener('change', run); });
  $('copy').addEventListener('click', function () {
    if (!last) { $('copied').textContent = 'Enter your numbers first.'; return; }
    var done = function () { $('copied').textContent = 'Copied.'; };
    if (navigator.clipboard) navigator.clipboard.writeText(last).then(done, function () { $('copied').textContent = 'Could not copy.'; });
  });
  run();
})();
