(function () {
  var $ = function (id) { return document.getElementById(id); };
  function show() {
    var c = $('country').value, r = RET.RULES[c], y = $('year').value;
    $('filedRow').hidden = c !== 'us'; $('endRow').hidden = !(c === 'ca' || c === 'au');
    $('endLabel').textContent = c === 'ca' ? 'End of tax year (fiscal period end for corporations)' : 'Date of the record or transaction (latest)';
    $('yearLabel').textContent = c === 'uk' ? 'Tax year starting April' : (c === 'au' ? 'Income year starting July' : 'Tax year');
    var res = RET.keepUntil({ country: c, year: y, filed: $('filed').value, end: $('end').value });
    $('date').textContent = res ? res.date : '';
    $('basis').textContent = res ? res.basis : '';
    $('rule').textContent = r.rule;
    var ul = $('extra'); ul.textContent = '';
    r.extra.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
    var a = $('src'); a.href = r.src; a.textContent = 'Official page: ' + r.name;
    $('note').textContent = 'KEEP UNTIL ' + (res ? res.date : '') + '.txt';
  }
  var ys = $('year'), now = new Date().getFullYear();
  for (var y = now; y >= now - 10; y--) { var o = document.createElement('option'); o.value = y; o.textContent = y; ys.appendChild(o); }
  ys.value = now - 1;
  ['country', 'year', 'filed', 'end'].forEach(function (id) { $(id).addEventListener('input', show); $(id).addEventListener('change', show); });
  show();
})();
