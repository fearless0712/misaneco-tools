(function () {
  var $ = function (id) { return document.getElementById(id); };
  var F = ['price', 'materials', 'hours', 'rate', 'subcontract', 'other', 'target'];
  function show() {
    var o = {};
    F.forEach(function (k) { o[k] = JA.norm($(k).value); });
    var r = JOB.calc(o), err = $('err');
    err.hidden = !r.error; err.textContent = JA.error(r.error);
    $('out').hidden = !!r.error;
    if (r.error) return;
    $('labour').textContent = JA.fmtYen(r.labour);
    $('cost').textContent = JA.fmtYen(r.cost);
    $('profit').textContent = JA.fmtYen(r.profit);
    $('margin').textContent = JOB.fmtPct(r.margin);
    $('markup').textContent = JOB.fmtPct(r.markup);
    var st = $('status'); st.textContent = JA.status(r.status);
    st.className = 'status ' + (r.status === 'Loss' ? 'bad' : r.status === 'Below target' ? 'warn' : (r.status === 'No data' || r.status === 'Break-even') ? '' : 'ok');
    $('needRow').hidden = r.priceNeeded === null;
    $('need').textContent = JA.fmtYenUp(r.priceNeeded);
    $('needLbl').textContent = r.target === null ? '' : JOB.fmtPct(r.target);
  }
  F.forEach(function (id) { $(id).addEventListener('input', show); $(id).addEventListener('change', show); });
  show();
})();
