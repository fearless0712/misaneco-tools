/* 建設の数量計算ツールの画面 */
(function () {
  var S = SURYO, KEY = 'misaneco.suryo.v1';
  var NAMES = ['toryo', 'haikan', 'zando', 'cross', 'tile', 'namacon', 'ashiba'];
  var LABEL = { toryo: '塗料の缶数', haikan: '配管の本数', zando: '残土のダンプ台数', cross: 'クロスのm数', tile: 'タイルの枚数', namacon: '生コン量', ashiba: '足場の面積' };
  var $ = function (id) { return document.getElementById(id); };
  var saved = {};
  try { var s = JSON.parse(window.localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') saved = s; } catch (e) { /* 保存が使えないときはそのまま */ }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* noop */ } }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function fields(name) { return Array.prototype.slice.call(document.querySelectorAll('#' + name + ' [data-k]')); }
  function values(name) {
    var v = {};
    fields(name).forEach(function (i) { if (i.type === 'radio') { if (i.checked) v[i.dataset.k] = i.value; } else v[i.dataset.k] = i.value; });
    return v;
  }
  function setValues(name, v) {
    fields(name).forEach(function (i) {
      if (!(i.dataset.k in v)) return;
      if (i.type === 'radio') i.checked = i.value === v[i.dataset.k]; else i.value = v[i.dataset.k];
    });
  }
  function copy(text, msg) {
    var done = function (ok) { msg.textContent = ok ? 'コピーしました。' : 'コピーできませんでした。式を選んでコピーしてください。'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    else done(false);
  }

  function update(name) {
    var v = values(name);
    if (name === 'zando') { var w = v.mode === 'weight'; $('zando-volBox').hidden = w; $('zando-weightBox').hidden = !w; }
    var r = S.CALC[name](v);
    var big = $(name + '-big'), sub = $(name + '-sub'), err = $(name + '-err'), steps = $(name + '-steps'), xl = $(name + '-xl');
    clear(steps); clear(xl); err.textContent = '';
    if (!r.ok) { big.textContent = '―'; sub.textContent = ''; err.textContent = r.errors.join('／'); }
    else {
      big.textContent = S.fmt(r.value, 2) + ' ' + r.unit; sub.textContent = r.sub;
      r.steps.forEach(function (t) { steps.appendChild(el('li', t)); });
      xl.appendChild(el('div', 'Excelの式（半角・そのまま貼れます）', 'mut'));
      r.excel.forEach(function (f) {
        var line = el('div', '', 'xlrow'), code = el('code', f), b = el('button', 'コピー', 'btn small ghost'), msg = el('span', '', 'mut');
        b.type = 'button'; msg.setAttribute('role', 'status');
        b.addEventListener('click', function () { copy(f, msg); });
        line.appendChild(code); line.appendChild(b); line.appendChild(msg); xl.appendChild(line);
      });
      var all = el('button', '答えと途中をまとめてコピー', 'btn small ghost'), am = el('span', '', 'mut');
      all.type = 'button'; am.setAttribute('role', 'status');
      all.addEventListener('click', function () { copy(S.text(name, LABEL[name], r), am); });
      var row = el('div', '', 'btns'); row.appendChild(all); row.appendChild(am); xl.appendChild(row);
    }
    saved[name] = v; save();
  }

  NAMES.forEach(function (name) {
    if (saved[name] && typeof saved[name] === 'object') setValues(name, saved[name]);
    fields(name).forEach(function (i) { i.addEventListener(i.type === 'radio' ? 'change' : 'input', function () { update(name); }); });
    Array.prototype.slice.call(document.querySelectorAll('#' + name + ' [data-ex]')).forEach(function (b) {
      b.addEventListener('click', function () { setValues(name, JSON.parse(b.dataset.ex)); update(name); });
    });
    update(name);
  });

  // タブ（JavaScriptが動くときだけ。動かないときは全部縦に並ぶ）
  var tabs = $('tabs');
  function show(name, focus) {
    if (NAMES.indexOf(name) < 0) name = 'toryo';
    NAMES.forEach(function (n) {
      var on = n === name, t = $('t-' + n);
      $(n).hidden = !on; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
    });
    if (focus) $('t-' + name).focus();
  }
  tabs.hidden = false;
  NAMES.forEach(function (n, i) {
    var t = $('t-' + n);
    t.addEventListener('click', function () { show(n); if (window.history && history.replaceState) history.replaceState(null, '', '#' + n); });
    t.addEventListener('keydown', function (e) {
      var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
      if (j === null) return;
      e.preventDefault(); show(NAMES[(j + NAMES.length) % NAMES.length], true);
    });
  });
  show((location.hash || '').slice(1));
  window.addEventListener('hashchange', function () { show((location.hash || '').slice(1)); });
})();
