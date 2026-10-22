/* 損切り・ロット計算ツールの画面 */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var ids = ['balance', 'riskMode', 'risk', 'pair', 'side', 'rate', 'entry', 'stop', 'target', 'spread', 'step', 'lot', 'pairName'];
  var jrow = '';
  var last = '';
  function row(tb, k, v) {
    var tr = document.createElement('tr'), th = document.createElement('th'), td = document.createElement('td');
    th.scope = 'row'; th.textContent = k; td.className = 'num'; td.textContent = v;
    tr.appendChild(th); tr.appendChild(td); tb.appendChild(tr);
  }
  function fmtPips(p) { return (Math.round(p * 10) / 10).toLocaleString('ja-JP') + 'pips'; }
  function run() {
    $('riskLabel').textContent = $('riskMode').value === 'yen' ? '1回で許せる損失（円）' : '残高の何％まで（％）';
    $('risk').placeholder = $('riskMode').value === 'yen' ? '例：20000' : '例：2';
    $('rateBox').hidden = $('pair').value !== 'other';
    var o = {}; ids.forEach(function (k) { o[k] = $(k).value; }); o.lev = 25;
    var r = SK.calc(o), tb = $('tbody');
    while (tb.firstChild) tb.removeChild(tb.firstChild);
    $('err').textContent = ''; last = ''; jrow = '';
    if (r.state === 'empty') { $('units').textContent = '―'; return; }
    if (r.state === 'error') { $('units').textContent = '―'; $('err').textContent = r.msg; return; }
    $('units').textContent = r.tooSmall ? '0通貨（取引できません）' : SK.int(r.units) + '通貨（' + r.lots.toLocaleString('ja-JP') + 'ロット）';
    if (r.tooSmall) $('err').textContent = 'この損切りの幅では、最小単位で取引しても許せる損失を超えます。損切りの幅か、許せる損失を見直してください。';
    var lines = [
      ['許せる損失', SK.yen(r.riskYen) + '（残高の' + (Math.round(r.riskPct * 100) / 100) + '％）'],
      ['損切りまでの幅', fmtPips(r.pips) + (o.spread ? '（スプレッド込み）' : '')],
      ['1,000通貨あたりの損失', SK.yen(r.lossPer1000)],
      ['損切りしたときの損失', SK.yen(r.loss) + '（残高の' + (Math.round(r.lossPct * 100) / 100) + '％）'],
      ['必要証拠金の目安（25倍）', SK.yen(r.margin)],
      ['実効レバレッジ', (Math.round(r.leverage * 100) / 100) + '倍']
    ];
    if (r.targetErr) $('err').textContent = r.targetErr;
    if (r.rr !== undefined) {
      lines.push(['利益確定までの幅', fmtPips(r.tpPips)]);
      lines.push(['利益確定したときの利益', SK.yen(r.profit)]);
      lines.push(['損益比（利益÷損失の幅）', (Math.round(r.rr * 100) / 100) + '倍']);
    }
    lines.forEach(function (l) { row(tb, l[0], l[1]); });
    if (r.marginShort) $('err').textContent = '必要証拠金の目安が口座残高を超えています。この数量は注文できない可能性があります。';
    var d = new Date(); jrow = SK.journalRow(o, r, d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate());
    last = ['【損切り・ロット計算】', '数量の上限：' + $('units').textContent].concat(lines.map(function (l) { return l[0] + '：' + l[1]; })).join('\n');
  }
  ids.forEach(function (k) { $(k).addEventListener('input', run); $(k).addEventListener('change', run); });
  $('copy').addEventListener('click', function () {
    if (!last) { $('copied').textContent = '先に数字を入れてください。'; return; }
    var done = function () { $('copied').textContent = 'コピーしました。'; };
    if (navigator.clipboard) navigator.clipboard.writeText(last).then(done, function () { $('copied').textContent = 'コピーできませんでした。'; });
  });
  $('copyRow').addEventListener('click', function () {
    if (!jrow) { $('copied').textContent = '先に数字を入れてください（取引できる数量が0のときはコピーできません）。'; return; }
    if (navigator.clipboard) navigator.clipboard.writeText(jrow).then(function () { $('copied').textContent = '日誌に貼る1行をコピーしました。'; }, function () { $('copied').textContent = 'コピーできませんでした。'; });
  });
  run();
})();
