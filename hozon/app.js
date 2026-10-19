(function () {
  var $ = function (id) { return document.getElementById(id); };
  function val(n) { var e = document.querySelector('input[name=' + n + ']:checked'); return e ? e.value : ''; }
  function show() {
    var kind = val('kind');
    $('lowRow').hidden = kind !== 'blue';
    var rows = HOZON.list({ kind: kind, low300: $('low300').checked, invoice: $('invoice').checked, zatsu300: $('zatsu300').checked });
    var tb = $('out'); tb.textContent = '';
    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      var a = document.createElement('td'); a.textContent = r.what; var s = document.createElement('div'); s.className = 'mut'; s.textContent = r.ex; a.appendChild(s);
      var b = document.createElement('td'); b.className = 'yr'; b.textContent = r.years + '年';
      var c = document.createElement('td'); c.className = 'mut'; c.textContent = r.note || '';
      tr.appendChild(a); tr.appendChild(b); tr.appendChild(c); tb.appendChild(tr);
    });
    var max = Math.max.apply(null, rows.map(function (r) { return r.years; }));
    $('memo').textContent = '保存期間メモ_' + (kind === 'blue' ? '青色' : '白色') + '_最長' + max + '年.txt';
  }
  Array.prototype.forEach.call(document.querySelectorAll('input'), function (e) { e.addEventListener('change', show); });
  show();
})();
