(function () {
  var $ = function (id) { return document.getElementById(id); };
  var F = ['price', 'materials', 'hours', 'rate', 'subcontract', 'other', 'target'];
  function show() {
    var sym = $('cur').value, o = {};
    F.forEach(function (k) { o[k] = $(k).value; });
    var r = JOB.calc(o), err = $('err');
    err.hidden = !r.error; err.textContent = r.error || '';
    $('out').hidden = !!r.error;
    if (r.error) return;
    $('labour').textContent = JOB.fmtMoney(r.labour, sym);
    $('cost').textContent = JOB.fmtMoney(r.cost, sym);
    $('profit').textContent = JOB.fmtMoney(r.profit, sym);
    $('margin').textContent = JOB.fmtPct(r.margin);
    $('markup').textContent = JOB.fmtPct(r.markup);
    var st = $('status'); st.textContent = r.status;
    st.className = 'status ' + (r.status === 'Loss' ? 'bad' : r.status === 'Below target' ? 'warn' : (r.status === 'No data' || r.status === 'Break-even') ? '' : 'ok');
    $('needRow').hidden = r.priceNeeded === null;
    $('need').textContent = JOB.fmtMoney(r.priceNeeded, sym);
    $('needLbl').textContent = r.target === null ? '' : JOB.fmtPct(r.target);
  }
  F.concat(['cur']).forEach(function (id) { $(id).addEventListener('input', show); $(id).addEventListener('change', show); });
  show();
})();
