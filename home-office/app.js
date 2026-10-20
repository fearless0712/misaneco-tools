(function () {
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'misaneco.homeoffice.v1';
  var BILLS = [
    { id: 'rent', name: 'Rent or mortgage interest', basis: 'area' },
    { id: 'ins', name: 'Home insurance', basis: 'area' },
    { id: 'energy', name: 'Electricity and heating', basis: 'area' },
    { id: 'water', name: 'Water', basis: 'own' },
    { id: 'phone', name: 'Phone', basis: 'own', comms: true },
    { id: 'net', name: 'Internet', basis: 'own', comms: true }
  ];
  var TOP = ['country', 'unit', 'office', 'home', 'hours', 'months'];
  var state = { country: 'us', unit: 'sqft', office: '', home: '', hours: '', months: '12', bills: {} };
  BILLS.forEach(function (b) { state.bills[b.id] = { amount: '', basis: b.basis, pct: '', why: '' }; });
  try {
    var s = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') {
      TOP.forEach(function (k) { if (typeof s[k] === 'string') state[k] = s[k]; });
      if (s.bills && typeof s.bills === 'object') BILLS.forEach(function (b) {
        var v = s.bills[b.id]; if (!v || typeof v !== 'object') return;
        ['amount', 'pct', 'why'].forEach(function (k) { if (typeof v[k] === 'string') state.bills[b.id][k] = v[k]; });
        if (v.basis === 'area' || v.basis === 'own') state.bills[b.id].basis = v.basis;
      });
    }
  } catch (e) { /* storage unavailable */ }
  if (state.country !== 'uk') state.country = 'us';
  if (state.unit !== 'm2') state.unit = 'sqft';
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* noop */ } }

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text) e.textContent = text;
    return e;
  }
  function input(id, label, val, ph) {
    var w = el('div', { 'class': 'f' });
    w.appendChild(el('label', { 'for': id }, label));
    var i = el('input', { id: id, type: 'text', inputmode: 'decimal', autocomplete: 'off' });
    if (ph) i.setAttribute('placeholder', ph);
    i.value = val; w.appendChild(i);
    return { w: w, i: i };
  }

  var rows = {};
  BILLS.forEach(function (b) {
    var st = state.bills[b.id], p = 'b-' + b.id;
    var box = el('div', { 'class': 'bill' });
    box.appendChild(el('h3', null, b.name));
    var r1 = el('div', { 'class': 'row' });
    var amt = input(p + '-amt', 'Monthly amount', st.amount, 'e.g. 120.00');
    var bw = el('div', { 'class': 'f' });
    bw.appendChild(el('label', { 'for': p + '-basis' }, 'How to split'));
    var sel = el('select', { id: p + '-basis' });
    sel.appendChild(el('option', { value: 'area' }, 'Area share (step 1)'));
    sel.appendChild(el('option', { value: 'own' }, 'My own %'));
    sel.value = st.basis; bw.appendChild(sel);
    r1.appendChild(amt.w); r1.appendChild(bw); box.appendChild(r1);
    var r2 = el('div', { 'class': 'row' });
    var pct = input(p + '-pct', 'Business %', st.pct, 'e.g. 40');
    var why = input(p + '-why', 'Reason (for your records)', st.why, 'e.g. call log sample, March');
    why.i.setAttribute('inputmode', 'text');
    r2.appendChild(pct.w); r2.appendChild(why.w); box.appendChild(r2);
    var msg = el('p', { 'class': 'err', id: p + '-err', role: 'status' });
    box.appendChild(msg);
    $('bills').appendChild(box);
    rows[b.id] = { amt: amt.i, sel: sel, pct: pct.i, pctWrap: pct.w, why: why.i, msg: msg };
    [amt.i, pct.i, why.i].forEach(function (i, n) {
      i.addEventListener('input', function () { st[['amount', 'pct', 'why'][n]] = i.value; update(); });
    });
    sel.addEventListener('change', function () { st.basis = sel.value; update(); });
  });
  TOP.forEach(function (k) {
    var i = $(k); i.value = state[k];
    i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', function () { state[k] = i.value; update(); });
  });

  var ERR = { number: 'Please enter a number (no minus sign).', over100: 'The percentage must be 100 or less.', bigger: 'The work area cannot be bigger than the whole home.', zero: 'The whole home area cannot be 0.', ratio: 'Enter a share for this bill: fill in step 1, or choose "My own %".' };
  var last = [];

  function update() {
    save();
    var cur = state.country === 'uk' ? '£' : '$';
    var area = HO.share(state.office, state.home);
    $('areaOut').textContent = area.error === 'empty' ? 'Area share: enter both numbers.' : area.error ? ERR[area.error] : 'Area share: ' + HO.fmtPct(area.ratio) + ' of your home.';
    $('areaOut').className = area.error && area.error !== 'empty' ? 'err' : 'mut';
    var tb = $('tbody'); while (tb.firstChild) tb.removeChild(tb.firstChild);
    var total = 0, comms = 0; last = [];
    BILLS.forEach(function (b) {
      var st = state.bills[b.id], R = rows[b.id], ratio = null, err = '';
      R.pctWrap.hidden = st.basis !== 'own';
      if (st.basis === 'area') { if (!area.error) ratio = area.ratio; }
      else { var pr = HO.pctRatio(st.pct); if (!pr.error) ratio = pr.ratio; else if (pr.error !== 'empty') err = ERR[pr.error]; }
      var r = HO.line(st.amount, ratio);
      if (r.state === 'error' && !err) err = ERR[r.error];
      R.msg.textContent = st.amount.trim() ? err : '';
      if (r.state !== 'ok') return;
      total += r.yearBiz; if (b.comms) comms += r.yearBiz;
      var tr = el('tr');
      tr.appendChild(el('td', null, b.name));
      tr.appendChild(el('td', { 'class': 'pc' }, HO.fmtPct(ratio)));
      tr.appendChild(el('td', null, HO.money(r.monthBiz, cur)));
      tr.appendChild(el('td', null, HO.money(r.yearBiz, cur)));
      tb.appendChild(tr);
      last.push(b.name + ': ' + HO.fmtPct(ratio) + ' of ' + HO.money(r.monthAmt, cur) + '/month = ' + HO.money(r.yearBiz, cur) + '/year' +
        (st.basis === 'area' ? ' (area ' + state.office + ' of ' + state.home + ' ' + (state.unit === 'm2' ? 'm²' : 'sq ft') + ')' : '') +
        (st.why.trim() ? ' - reason: ' + st.why.trim() : st.basis === 'own' ? ' - reason: (add one)' : ''));
    });
    $('yBiz').textContent = HO.money(total, cur);
    var us = state.country === 'us';
    $('cmpUS').hidden = !us; $('cmpUK').hidden = us;
    var cmp = '';
    if (us) {
      var u = HO.usSimplified(state.office, state.unit);
      cmp = !u ? 'Enter the area used for work.' :
        'Simplified method: ' + HO.money(u.cents, '$') + ' a year (' + (Math.round(u.used * 10) / 10) + ' sq ft' + (u.sqft > 300 ? ', capped at 300' : '') + ' × $5). Your own split above: ' + HO.money(total, '$') + '.';
      $('usOut').textContent = cmp;
    } else {
      var y = HO.ukYear(state.hours, state.months), m = HO.ukMonth(state.hours);
      cmp = y === null ? 'Enter your hours and the number of months (1 to 12).' :
        m === 0 ? 'Under 25 hours a month, the flat rate cannot be used. Your own split above: ' + HO.money(total, '£') + '.' :
        'Flat rate: £' + m + ' × ' + HO.num(state.months) + ' months = ' + HO.money(y, '£') + ', plus phone and internet from your split ' + HO.money(comms, '£') + ' = ' + HO.money(y + comms, '£') + ' a year. Your own split above: ' + HO.money(total, '£') + '.';
      $('ukOut').textContent = cmp;
    }
    last.push('Total (own split): ' + HO.money(total, cur) + ' a year');
    last.push(cmp);
  }

  $('copy').addEventListener('click', function () {
    var text = 'Home office business-use summary (' + new Date().toISOString().slice(0, 10) + ')\n' + last.join('\n');
    var done = function (ok) { $('copied').textContent = ok ? 'Copied. Paste it into your notes or spreadsheet.' : 'Could not copy. Please select the result and copy it yourself.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    else done(false);
  });
  $('reset').addEventListener('click', function () {
    state.office = state.home = state.hours = ''; state.months = '12';
    BILLS.forEach(function (b) { var st = state.bills[b.id]; st.amount = st.pct = st.why = ''; st.basis = b.basis; var R = rows[b.id]; R.amt.value = R.pct.value = R.why.value = ''; R.sel.value = b.basis; });
    TOP.forEach(function (k) { $(k).value = state[k]; });
    $('copied').textContent = 'Cleared.';
    update();
  });
  update();
})();
