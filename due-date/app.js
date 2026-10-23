/* Invoice due date calculator - page */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var D = DUEDATE, KEY = 'misaneco.due-date.v1';
  var F = ['invoiceDate', 'terms', 'customDays', 'weekend', 'amount', 'currency', 'today', 'discPct', 'discDays', 'list'];
  var EXAMPLE_LIST = 'date,amount,terms,invoice\n2026-09-01,1200,Net 30,INV-001\n2026-09-20,850.50,Net 15,INV-002\n2026-10-01,2000,Net 30 EOM,INV-003\n2026-10-10,450,Due on receipt,INV-004\n2026-10-15,3000,15th of next month,INV-005';
  var DEF = { invoiceDate: '2026-10-05', terms: 'net30', customDays: '', weekend: 'keep', amount: '1500', currency: 'USD', today: '',
    discPct: '2', discDays: '10', list: EXAMPLE_LIST };
  var state = {};
  F.forEach(function (k) { state[k] = DEF[k]; });
  try {
    var s = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') F.forEach(function (k) { if (typeof s[k] === 'string') state[k] = s[k]; });
  } catch (e) { /* storage not available */ }
  if (!D.CURRENCIES[state.currency]) state.currency = 'USD';
  if (!D.WEEKEND[state.weekend]) state.weekend = 'keep';
  if (!D.TERMS.some(function (t) { return t[0] === state.terms; })) state.terms = 'net30';
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* noop */ } }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function row(tb, k, v) {
    var tr = el('tr'), th = el('th', k), td = el('td', v);
    th.scope = 'row'; tr.appendChild(th); tr.appendChild(td); tb.appendChild(tr);
  }
  function localToday() {
    var t = new Date(), m = t.getMonth() + 1, d = t.getDate();
    return t.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  var copyText = '', listCopy = '';

  function opts() {
    var o = {}; F.forEach(function (k) { o[k] = state[k]; });
    if (!o.today) o.today = localToday();
    return o;
  }

  function updateOne(o) {
    var c = state.currency, m = function (n) { return D.money(n, c); };
    $('customBox').hidden = state.terms !== 'custom';
    var r = D.calc(o);
    $('big').textContent = '—'; $('stat').textContent = ''; $('stat').className = 'stat';
    $('movedNote').hidden = true; $('discBox').hidden = true;
    clear($('tbody')); clear($('tbDisc'));
    copyText = '';
    var errs = [];
    if (r.state === 'ok') {
      $('big').textContent = D.fmt(r.due);
      if (r.status) {
        $('stat').textContent = r.status.days < 0 ? plural(-r.status.days, 'day') + ' overdue' : r.status.days === 0 ? 'Due today' : plural(r.status.days, 'day') + ' left';
        if (r.status.overdue) $('stat').className = 'stat late';
      }
      if (r.moved) {
        $('movedNote').textContent = 'By the terms the due date is ' + D.fmt(r.rawDue) + ', a weekend day. Moved to ' + D.fmt(r.due) + ' (' + D.WEEKEND[r.weekend].toLowerCase() + ').';
        $('movedNote').hidden = false;
      }
      row($('tbody'), 'Invoice date', D.fmt(r.invoice));
      row($('tbody'), 'Payment terms', r.terms.label);
      if (r.moved) row($('tbody'), 'Due date by the terms', D.fmt(r.rawDue));
      row($('tbody'), 'Due date', D.fmt(r.due));
      row($('tbody'), 'Days from the invoice date', plural(r.calDays, 'day'));
      if (r.status) row($('tbody'), 'As of ' + D.fmt(r.today), r.status.label);
      if (r.amount !== null && r.amount !== undefined) row($('tbody'), 'Amount', m(r.amount));
      if (r.amountError) errs.push(r.amountError);
      if (r.discError) errs.push(r.discError);
      if (r.disc) {
        var x = r.disc, tb = $('tbDisc');
        row(tb, 'Terms', D.fix(x.pct, 4) + '/' + x.days + ' ' + r.terms.label);
        row(tb, 'Pay by (discount deadline)', D.fmt(x.deadline) + (x.status ? ' — ' + x.status.label.replace('overdue', 'ago (missed)') : ''));
        if (x.pay !== undefined) {
          row(tb, 'Discount (' + D.fix(x.pct, 4) + '%)', '-' + m(x.saving));
          row(tb, 'Amount if paid by the deadline', m(x.pay));
          row(tb, 'Full amount by the due date', m(r.amount));
        }
        row(tb, 'Annualized cost of skipping the discount', x.apr === null ? '—' : 'about ' + D.pct(x.apr));
        $('discBox').hidden = false;
      }
      copyText = D.text(r);
    } else if (r.error) errs.push(r.error);
    $('err').textContent = errs.join(' ');
  }

  function updateList(o) {
    var c = state.currency, m = function (n) { return D.money(n, c); };
    var def = D.termsFromForm(o);
    var res = D.parseList(state.list, { today: o.today, weekend: state.weekend, defaultTerms: def.error ? null : def });
    var s = res.sum, tb = $('listBody');
    clear(tb);
    var has = res.rows.length > 0;
    $('sOver').textContent = has ? m(s.overdue) : '—';
    $('sOverSub').textContent = has ? plural(s.overdueCount, 'invoice') : '';
    $('sSoon').textContent = has ? m(D.fix(s.today + s.next7, 6)) : '—';
    $('sSoonSub').textContent = has ? plural(s.todayCount + s.next7Count, 'invoice') + (s.todayCount ? ' (' + s.todayCount + ' due today)' : '') : '';
    $('sLater').textContent = has ? m(s.later) : '—';
    $('sLaterSub').textContent = has ? plural(s.laterCount, 'invoice') : '';
    $('sTotal').textContent = has ? m(s.total) : '—';
    $('sTotalSub').textContent = has ? plural(res.rows.length, 'invoice') + ' as of ' + D.fmt(res.today) : '';
    res.rows.forEach(function (r) {
      var tr = el('tr', '', r.status && r.status.overdue ? 'over' : '');
      var td1 = el('td', D.fmt(r.due) + (r.moved ? ' *' : ''));
      var late = r.status && r.status.overdue ? ' late' : '';
      if (r.status) td1.appendChild(el('span', r.status.label, 'sub pctm' + late));
      if (r.ref) td1.appendChild(el('span', r.ref, 'sub'));
      var td2 = el('td', r.status ? r.status.label : '', 'pc' + late);
      var td3 = el('td', m(r.amount), 'num');
      td3.appendChild(el('span', D.iso(r.invoice) + ', ' + r.terms.label, 'sub pctm'));
      var td4 = el('td', D.iso(r.invoice) + ', ' + r.terms.label + (r.moved ? ' (moved from ' + D.iso(r.rawDue) + ')' : ''), 'pc');
      [td1, td2, td3, td4].forEach(function (t) { tr.appendChild(t); });
      tb.appendChild(tr);
    });
    if (res.bad.length) {
      $('listBad').textContent = plural(res.bad.length, 'line') + ' could not be read and ' + (res.bad.length === 1 ? 'was' : 'were') + ' left out: ' +
        res.bad.slice(0, 5).map(function (b) { return 'line ' + b.line + ' (' + b.why + ')'; }).join('; ') + (res.bad.length > 5 ? '; ...' : '');
      $('listBad').hidden = false;
    } else $('listBad').hidden = true;
    listCopy = has ? D.listText(res, c) : '';
  }

  function update() {
    save();
    var o = opts();
    updateOne(o);
    updateList(o);
  }

  F.forEach(function (k) {
    var i = $(k); i.value = state[k];
    i.addEventListener(i.tagName === 'SELECT' || i.type === 'date' ? 'change' : 'input', function () { state[k] = i.value; update(); });
    if (i.type === 'date') i.addEventListener('input', function () { state[k] = i.value; update(); });
  });
  $('reset').addEventListener('click', function () {
    F.forEach(function (k) { if (k !== 'list') { state[k] = DEF[k]; $(k).value = DEF[k]; } });
    $('copied').textContent = '';
    update();
  });
  $('clearList').addEventListener('click', function () { state.list = ''; $('list').value = ''; $('copiedList').textContent = ''; update(); $('list').focus(); });
  function copy(txt, out, empty) {
    if (!txt) { $(out).textContent = empty; return; }
    var done = function (ok) { $(out).textContent = ok ? 'Copied.' : 'Could not copy. Please select the result and copy it.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { done(true); }, function () { done(false); });
    else done(false);
  }
  $('copy').addEventListener('click', function () { copy(copyText, 'copied', 'Enter the invoice date first.'); });
  $('copyList').addEventListener('click', function () { copy(listCopy, 'copiedList', 'Paste some invoices first.'); });
  update();
})();
