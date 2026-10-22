/* 工期（稼働日）計算ツールの画面 */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var K = KOUKI, KEY = 'misaneco.kouki.v1';
  var F = ['mode', 'start', 'days', 'end', 'preset', 'company'];
  var state = { mode: 'end', start: '', days: '', end: '', preset: 'satsun', company: '', holidays: true, custom: [true, false, false, false, false, false, true] };
  try {
    var s = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') {
      F.forEach(function (k) { if (typeof s[k] === 'string') state[k] = s[k]; });
      if (typeof s.holidays === 'boolean') state.holidays = s.holidays;
      if (Array.isArray(s.custom) && s.custom.length === 7) state.custom = s.custom.map(Boolean);
    }
  } catch (e) { /* 保存が使えないときはそのまま */ }
  if (state.mode !== 'count') state.mode = 'end';
  if (['satsun', 'sun', 'none', 'custom'].indexOf(state.preset) < 0) state.preset = 'satsun';
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* noop */ } }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function row(tb, k, v) {
    var tr = el('tr'), th = el('th', k), td = el('td', v);
    th.scope = 'row'; tr.appendChild(th); tr.appendChild(td); tb.appendChild(tr);
  }
  var copyText = '';

  function drawCal(r) {
    var box = $('cal'); clear(box);
    K.months(r).forEach(function (mo) {
      var wrap = el('div', '', 'calm');
      wrap.appendChild(el('div', mo.y + '年' + mo.m + '月', 'calh'));
      var g = el('div', '', 'calg');
      K.WD.forEach(function (w, i) { g.appendChild(el('div', w, 'calw' + (i === 0 ? ' sun' : i === 6 ? ' sat' : ''))); });
      mo.cells.forEach(function (c) {
        if (!c) { g.appendChild(el('div', '', 'cald empty')); return; }
        var d = el('div', '', 'cald' + (c.off ? ' off' : ' work'));
        d.appendChild(el('span', String(c.d), 'dn'));
        d.appendChild(el('span', c.off ? (c.label.split('・')[0] || '休み') : String(c.no), c.off ? 'lb' : 'no'));
        d.title = K.fmt(c.n) + (c.off ? ' 休み' + (c.label ? '（' + c.label + '）' : '') : ' 稼働' + c.no + '日目');
        g.appendChild(d);
      });
      wrap.appendChild(g); box.appendChild(wrap);
    });
  }

  function update() {
    save();
    var count = state.mode === 'count';
    $('daysBox').hidden = count; $('endBox').hidden = !count;
    $('customBox').hidden = state.preset !== 'custom';
    $('bigLabel').textContent = count ? '稼働日数' : '終了予定日';
    var r = K.calc(state), tb = $('tbody');
    clear(tb); clear($('cal'));
    copyText = '';
    $('err').textContent = r.state === 'error' ? r.error : '';
    $('startNote').hidden = true; $('warn').hidden = true;
    if (r.state !== 'ok') { $('big').textContent = '―'; return; }
    $('big').textContent = count ? r.workDays + '日' : K.fmt(r.end);
    if (r.mode === 'end' && r.startOff) {
      $('startNote').textContent = '開始日の ' + K.fmtShort(r.start) + ' は休みのため、次の稼働日 ' + K.fmtShort(r.firstWork) + ' から数えています。';
      $('startNote').hidden = false;
    }
    if (r.warn.length) { $('warn').textContent = r.warn.join(' '); $('warn').hidden = false; }
    if (count) { row(tb, '期間', K.fmt(r.start) + '〜' + K.fmt(r.end)); }
    else { row(tb, '開始日', K.fmt(r.start)); row(tb, '稼働日数', r.days + '日'); }
    row(tb, '暦日数', r.calDays + '日');
    row(tb, '休みの日数', r.offDays + '日');
    row(tb, '　うち 休みの曜日', r.off.week + '日');
    row(tb, '　うち 祝日', r.off.holiday + '日');
    row(tb, '　うち 会社の休み', r.off.company + '日');
    drawCal(r);
    copyText = K.text(r, state);
  }

  F.forEach(function (k) {
    var i = $(k); i.value = state[k];
    i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', function () { state[k] = i.value; update(); });
    if (i.type === 'date') i.addEventListener('change', function () { state[k] = i.value; update(); });
  });
  $('holidays').checked = state.holidays;
  $('holidays').addEventListener('change', function () { state.holidays = $('holidays').checked; update(); });
  [0, 1, 2, 3, 4, 5, 6].forEach(function (n) {
    var c = $('w' + n); c.checked = state.custom[n];
    c.addEventListener('change', function () { state.custom[n] = c.checked; update(); });
  });
  $('copy').addEventListener('click', function () {
    if (!copyText) { $('copied').textContent = '先に日付と日数を入れてください。'; return; }
    var done = function (ok) { $('copied').textContent = ok ? 'コピーしました。' : 'コピーできませんでした。結果を選んでコピーしてください。'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(copyText).then(function () { done(true); }, function () { done(false); });
    else done(false);
  });
  update();
})();
