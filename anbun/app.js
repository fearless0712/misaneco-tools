(function () {
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'misaneco.anbun.v1';
  var UNIT = { area: '畳', time: '時間', usage: '', manual: '' };
  var DEF = [
    { id: 'rent', name: '家賃', basis: 'area', hint: '例：仕事部屋の広さ ÷ 家全体の広さ。㎡でも畳でも、2つを同じ単位でそろえてください。' },
    { id: 'denki', name: '電気', basis: 'time', hint: '例：仕事で使う時間 ÷ 電気を使う時間、または仕事部屋の広さ など。' },
    { id: 'gas', name: 'ガス', basis: 'manual', hint: '仕事で使っている分をはっきり分けられないときは、無理に入れないでください。' },
    { id: 'suido', name: '水道', basis: 'manual', hint: '仕事で使っている分をはっきり分けられないときは、無理に入れないでください。' },
    { id: 'tsushin', name: '通信（スマホ・ネット）', basis: 'time', hint: '例：仕事で使う時間 ÷ スマホ・ネットを使う時間。' },
    { id: 'car', name: '車両・ガソリン', basis: 'usage', unit: 'km', hint: '例：仕事で走った距離 ÷ 全体の走行距離。走行の記録を残すと説明しやすくなります。' },
    { id: 'other', name: 'その他', basis: 'manual', custom: true, hint: '項目の名前を変えて使えます。' }
  ];
  function blank(d) { return { name: d.name, amount: '', period: 'month', basis: d.basis, part: '', whole: '', unit: d.unit !== undefined ? d.unit : UNIT[d.basis], note: '', pct: '' }; }
  var state = {};
  DEF.forEach(function (d) { state[d.id] = blank(d); });
  try {
    var saved = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') DEF.forEach(function (d) {
      var s = saved[d.id]; if (!s || typeof s !== 'object') return;
      Object.keys(state[d.id]).forEach(function (k) { if (typeof s[k] === 'string') state[d.id][k] = s[k]; });
      if (!d.custom) state[d.id].name = d.name;
      if (!ANBUN.BASIS[state[d.id].basis]) state[d.id].basis = d.basis;
      if (state[d.id].period !== 'year') state[d.id].period = 'month';
    });
  } catch (e) { /* 保存が使えないときはそのまま */ }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* noop */ } }

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text) e.textContent = text;
    return e;
  }
  function field(id, label, key, opts) {
    var w = el('div', { 'class': 'f' });
    var lb = el('label', { 'for': id }, label); w.appendChild(lb);
    var inp = el('input', { id: id, autocomplete: 'off', type: 'text' });
    if (opts && opts.num) inp.setAttribute('inputmode', 'decimal');
    if (opts && opts.ph) inp.setAttribute('placeholder', opts.ph);
    w.appendChild(inp);
    return { wrap: w, input: inp, label: lb, key: key };
  }
  function select(id, label, key, options) {
    var w = el('div', { 'class': 'f' });
    w.appendChild(el('label', { 'for': id }, label));
    var s = el('select', { id: id });
    options.forEach(function (o) { s.appendChild(el('option', { value: o[0] }, o[1])); });
    w.appendChild(s);
    return { wrap: w, input: s, key: key };
  }

  var cards = {};
  DEF.forEach(function (d) {
    var p = 'i-' + d.id, st = state[d.id], c = {};
    var fs = el('fieldset', { 'class': 'card item' });
    fs.appendChild(el('legend', null, d.custom ? 'その他（自由に名前をつけられます）' : d.name));
    var fields = [];
    if (d.custom) { var nm = field(p + '-name', '項目の名前', 'name', { ph: '例：駐車場代' }); fs.appendChild(nm.wrap); fields.push(nm); }
    var row = el('div', { 'class': 'row' });
    var amt = field(p + '-amount', '金額（円）', 'amount', { num: true, ph: '例：80000' });
    var per = select(p + '-period', '月額・年額', 'period', [['month', '月額'], ['year', '年額']]);
    row.appendChild(amt.wrap); row.appendChild(per.wrap); fs.appendChild(row); fields.push(amt, per);
    var bas = select(p + '-basis', '分け方', 'basis', [['area', '面積（仕事に使う広さ ÷ 全体）'], ['time', '時間（仕事の時間 ÷ 使う時間）'], ['usage', '使用量・回数（仕事の分 ÷ 全体）'], ['manual', '手入力（%）']]);
    fs.appendChild(bas.wrap); fields.push(bas);
    var frac = el('div', { 'class': 'frac' });
    var r2 = el('div', { 'class': 'row' });
    var part = field(p + '-part', '', 'part', { num: true }), whole = field(p + '-whole', '', 'whole', { num: true });
    r2.appendChild(part.wrap); r2.appendChild(whole.wrap); frac.appendChild(r2);
    var r3 = el('div', { 'class': 'row' });
    var unit = field(p + '-unit', '単位（メモ用）', 'unit', { ph: '例：畳、㎡、時間、km' });
    var note = field(p + '-note', '何の数字か（メモ用）', 'note', { ph: '例：仕事部屋' });
    r3.appendChild(unit.wrap); r3.appendChild(note.wrap); frac.appendChild(r3);
    fs.appendChild(frac); fields.push(part, whole, unit, note);
    var man = el('div', { 'class': 'man' });
    var r4 = el('div', { 'class': 'row' });
    var pct = field(p + '-pct', '仕事の割合（%）', 'pct', { num: true, ph: '例：30' });
    var why = field(p + '-why', 'その割合にした理由（メモ用）', 'note', { ph: '例：平日の日中は仕事で使用' });
    r4.appendChild(pct.wrap); r4.appendChild(why.wrap); man.appendChild(r4);
    fs.appendChild(man); fields.push(pct, why);
    fs.appendChild(el('p', { 'class': 'mut hint' }, d.hint));
    var out = el('p', { 'class': 'out' }); fs.appendChild(out);
    var err = el('p', { 'class': 'err', hidden: '' }); fs.appendChild(err);
    var mw = el('div', { 'class': 'memo', hidden: '' });
    var mt = el('p', { 'class': 'tip' }); mw.appendChild(mt);
    var cb = el('button', { type: 'button', 'class': 'btn ghost small' }, 'このメモをコピー'); mw.appendChild(cb);
    fs.appendChild(mw);
    $('items').appendChild(fs);
    fields.forEach(function (f) {
      f.input.value = st[f.key];
      var ev = f.input.tagName === 'SELECT' ? 'change' : 'input';
      f.input.addEventListener(ev, function () {
        var old = st.basis;
        st[f.key] = f.input.value;
        if (f.key === 'note') { (f === why ? note : why).input.value = f.input.value; }
        if (f.key === 'basis' && (st.unit === '' || st.unit === UNIT[old] || st.unit === 'km')) { st.unit = UNIT[st.basis]; unit.input.value = st.unit; }
        save(); show();
      });
    });
    cb.addEventListener('click', function () { copy(mt.textContent); });
    c = { st: st, frac: frac, man: man, part: part, whole: whole, out: out, err: err, mw: mw, mt: mt, fs: fs };
    cards[d.id] = c;
  });

  function yen(n) { return ANBUN.fmtYen(n); }
  function td(text, cls) { var e = el('td', cls ? { 'class': cls } : null); e.textContent = text; return e; }
  function two(y, m) { var e = el('td', { 'class': 'num' }); e.appendChild(document.createTextNode('年 ' + yen(y))); e.appendChild(el('div', { 'class': 'mut' }, '月 ' + yen(m))); return e; }

  function items() { return DEF.map(function (d) { return state[d.id]; }); }
  function show() {
    var res = ANBUN.calcAll(items()), tb = $('tbody'), memos = $('memos');
    tb.textContent = ''; memos.textContent = '';
    DEF.forEach(function (d, i) {
      var c = cards[d.id], x = res.rows[i], B = ANBUN.BASIS[c.st.basis];
      var manual = c.st.basis === 'manual';
      c.frac.hidden = manual; c.man.hidden = !manual;
      if (!manual) { c.part.label.textContent = B.part; c.whole.label.textContent = B.whole; }
      c.err.hidden = !(x.state === 'error' || x.state === 'noratio'); c.err.textContent = x.error;
      c.err.className = x.state === 'error' ? 'err' : 'mut';
      if (x.state === 'ok') {
        c.out.hidden = false;
        c.out.textContent = '仕事の割合 ' + ANBUN.fmtPct(x.pct) + ' → 経費にできる目安 月 ' + yen(x.monthBiz) + '・年 ' + yen(x.yearBiz) + '（私用の分 年 ' + yen(x.yearPriv) + '）';
        c.mw.hidden = false; c.mt.textContent = x.memo;
        var tr = el('tr'), nc = td(x.name); nc.appendChild(el('div', { 'class': 'mut pctm' }, '割合 ' + ANBUN.fmtPct(x.pct))); tr.appendChild(nc); tr.appendChild(td(ANBUN.fmtPct(x.pct), 'num pc')); tr.appendChild(two(x.yearBiz, x.monthBiz)); tr.appendChild(two(x.yearPriv, x.monthPriv)); tb.appendChild(tr);
        memos.appendChild(el('li', null, x.memo));
      } else {
        c.out.hidden = x.state !== 'empty'; c.out.textContent = '';
        if (x.state === 'empty') { c.out.hidden = false; c.out.className = 'out mut'; c.out.textContent = '金額を入れると計算します。'; }
        c.mw.hidden = true;
      }
      if (x.state === 'ok') c.out.className = 'out';
    });
    var t = res.total, tf = $('tfoot'); tf.textContent = '';
    if (t.count) { var tr = el('tr'); tr.appendChild(el('th', { scope: 'row' }, '合計')); tr.appendChild(td('', 'pc')); tr.appendChild(two(t.yearBiz, t.monthBiz)); tr.appendChild(two(t.yearPriv, t.monthPriv)); tf.appendChild(tr); }
    else { var e = el('tr'); var c0 = el('td', { colspan: '4', 'class': 'mut' }, '金額と割合を入れた項目がここに並びます。'); e.appendChild(c0); tb.appendChild(e); }
    $('yBiz').textContent = yen(t.yearBiz);
    $('sumLine').textContent = '1か月あたり ' + yen(t.monthBiz) + '（' + t.count + '項目）' + (t.skipped ? '・割合が未入力か入力ミスの項目が ' + t.skipped + ' つあります' : '');
    if (!t.count) memos.appendChild(el('li', { 'class': 'mut' }, 'まだありません。'));
    $('csv').disabled = !t.count; $('copyAll').disabled = !t.count;
  }

  function copied(msg) { $('copied').textContent = msg; window.setTimeout(function () { $('copied').textContent = ''; }, 4000); }
  function copy(text) {
    function fallback() {
      var ta = el('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      copied(ok ? 'コピーしました。' : 'コピーできませんでした。メモを長押し（右クリック）してコピーしてください。');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { copied('コピーしました。'); }, fallback);
    else fallback();
  }
  $('copyAll').addEventListener('click', function () {
    var res = ANBUN.calcAll(items());
    copy(res.rows.filter(function (x) { return x.state === 'ok'; }).map(function (x) { return x.memo; }).join('\n'));
  });
  $('csv').addEventListener('click', function () {
    var blob = new Blob([ANBUN.csv(items())], { type: 'text/csv;charset=utf-8' });
    var d = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var a = el('a', { download: '家事按分_' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '.csv' });
    a.href = URL.createObjectURL(blob); document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    copied('CSVを保存しました（Excelで開けます）。');
  });
  $('reset').addEventListener('click', function () {
    if (!window.confirm('入力した内容をすべて消しますか？')) return;
    try { window.localStorage.removeItem(KEY); } catch (e) { /* noop */ }
    window.location.reload();
  });
  show();
})();
