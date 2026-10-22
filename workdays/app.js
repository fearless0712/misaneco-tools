/* Working days calculator - page */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var W = WORKDAYS, KEY = 'misaneco.workdays.v1';
  var F = ['mode', 'start', 'days', 'end', 'weekend', 'holidays'];
  var state = { mode: 'end', start: '', days: '', end: '', weekend: 'satsun', holidays: '' };
  try {
    var s = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') F.forEach(function (k) { if (typeof s[k] === 'string') state[k] = s[k]; });
  } catch (e) { /* storage not available */ }
  if (state.mode !== 'count') state.mode = 'end';
  if (!W.WEEKENDS[state.weekend]) state.weekend = 'satsun';
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* noop */ } }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function row(tb, k, v) {
    var tr = el('tr'), th = el('th', k), td = el('td', v);
    th.scope = 'row'; tr.appendChild(th); tr.appendChild(td); tb.appendChild(tr);
  }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  var copyText = '';

  function drawCal(r) {
    var box = $('cal'); clear(box);
    W.months(r).forEach(function (mo) {
      var wrap = el('div', '', 'calm');
      wrap.appendChild(el('div', mo.title, 'calh'));
      var g = el('div', '', 'calg');
      W.WD.forEach(function (w, i) { g.appendChild(el('div', w, 'calw' + (i === 0 ? ' sun' : i === 6 ? ' sat' : ''))); });
      mo.cells.forEach(function (c) {
        if (!c) { g.appendChild(el('div', '', 'cald empty')); return; }
        var d = el('div', '', 'cald' + (c.off ? ' off' : ' work'));
        d.appendChild(el('span', String(c.d), 'dn'));
        d.appendChild(el('span', c.off ? (c.kind === 'holiday' ? c.label : 'off') : String(c.no), c.off ? 'lb' : 'no'));
        d.title = W.fmt(c.n) + (c.off ? ' - day off' + (c.label ? ' (' + c.label + ')' : '') : ' - working day ' + c.no);
        g.appendChild(d);
      });
      wrap.appendChild(g); box.appendChild(wrap);
    });
  }

  function update() {
    save();
    var count = state.mode === 'count';
    $('daysBox').hidden = count; $('endBox').hidden = !count;
    $('bigLabel').textContent = count ? 'Working days' : 'End date';
    var h = W.parseHolidays(state.holidays);
    $('holInfo').textContent = h.count ? plural(h.count, 'date') + ' will be skipped.' : '';
    $('holBad').textContent = h.bad.length ? plural(h.bad.length, 'line') + ' ignored (not a YYYY-MM-DD date): ' +
      h.bad.slice(0, 3).map(function (b) { return 'line ' + b.line + ' "' + b.text.slice(0, 30) + '"'; }).join(', ') + (h.bad.length > 3 ? ', ...' : '') : '';
    $('holBad').hidden = !h.bad.length;
    var r = W.calc(state), tb = $('tbody');
    clear(tb); clear($('cal'));
    copyText = '';
    $('err').textContent = r.state === 'error' ? r.error : '';
    $('startNote').hidden = true;
    var x = W.excel(r, state);
    $('xl').textContent = x.filled || x.general;
    $('xlNote').textContent = r.state === 'ok' && r.mode === 'count'
      ? 'NETWORKDAYS.INTL counts both the start and end dates, so it matches this result.'
      : 'Excel counts from the day after the start date, so use start-1 to make the start date day 1.';
    if (r.state !== 'ok') { $('big').textContent = '—'; return; }
    $('big').textContent = count ? plural(r.workDays, 'working day') : W.fmt(r.end);
    if (r.mode === 'end' && r.startOff) {
      $('startNote').textContent = 'The start date (' + W.fmtShort(r.start) + ') is a day off, so counting starts on the next working day, ' + W.fmtShort(r.firstWork) + '.';
      $('startNote').hidden = false;
    }
    if (count) { row(tb, 'Range', W.fmt(r.start) + ' to ' + W.fmt(r.end)); }
    else { row(tb, 'Start date', W.fmt(r.start)); row(tb, 'Working days', String(r.days)); }
    row(tb, 'Calendar days', String(r.calDays));
    row(tb, 'Days off', String(r.offDays));
    row(tb, ' Weekend days', String(r.off.week));
    row(tb, ' Holidays and closures', String(r.off.holiday));
    drawCal(r);
    copyText = W.text(r, state);
  }

  F.forEach(function (k) {
    var i = $(k); i.value = state[k];
    i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', function () { state[k] = i.value; update(); });
    if (i.type === 'date') i.addEventListener('change', function () { state[k] = i.value; update(); });
  });
  $('copy').addEventListener('click', function () {
    if (!copyText) { $('copied').textContent = 'Enter the dates and days first.'; return; }
    var done = function (ok) { $('copied').textContent = ok ? 'Copied.' : 'Could not copy. Please select the result and copy it.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(copyText).then(function () { done(true); }, function () { done(false); });
    else done(false);
  });
  update();
})();
