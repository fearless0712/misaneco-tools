/* 車検の日付計算ツールの画面 */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var S = SHAKEN, KEY = 'misaneco.shaken.v1';
  var F = ['expiry', 'kubun', 'kaisu', 'n1', 'n2'];
  function todayIso() { var t = new Date(); return t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); }
  var state = { expiry: '', kubun: 'jikayou', kaisu: 'later', n1: '', n2: '', base: todayIso() };
  try {
    var s = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') F.forEach(function (k) { if (typeof s[k] === 'string') state[k] = s[k]; });
  } catch (e) { /* 保存が使えないときはそのまま */ }
  if (!S.KMAP[state.kubun]) state.kubun = 'jikayou';
  if (state.kaisu !== 'first') state.kaisu = 'later';
  function save() {
    try { var o = {}; F.forEach(function (k) { o[k] = state[k]; }); window.localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* noop */ }
  }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function row(tb, k, v) {
    var tr = el('tr'), th = el('th', k), td = el('td', v);
    th.scope = 'row'; tr.appendChild(th); tr.appendChild(td); tb.appendChild(tr);
  }
  S.KUBUN.forEach(function (k) { var o = el('option', k.name); o.value = k.id; $('kubun').appendChild(o); });
  var copyText = '';

  function update() {
    save();
    var r = S.calc(state), tb = $('tbody'), k = r.kubun;
    clear(tb); copyText = '';
    $('kaisuHint').textContent = k.none ? '' : '今の車検証の有効期間の目安：' + (state.kaisu === 'first' ? '初回 ' + k.first : '2回目以降 ' + k.next) +
      '年。車検を受けた後の有効期間は、2回目以降の ' + k.next + '年です。';
    $('err').textContent = r.state === 'error' ? r.error : '';
    $('phase').hidden = true; $('warn').hidden = true; $('none').hidden = true;
    $('big').textContent = '―';
    $('big').hidden = $('bigLabel').hidden = r.state === 'none';
    if (r.state === 'none') {
      $('none').textContent = '車検はありません（点検の時期は別です）。軽二輪（125cc超〜250cc以下）と原付は、車検の対象ではないため日付の計算はしません。';
      $('none').hidden = false;
      copyText = S.text(r);
      return;
    }
    if (r.state !== 'ok') return;
    $('big').textContent = S.fmt(r.first);
    $('phase').textContent = '基準日 ' + S.fmt(r.base) + ' は、' + S.PHASE[r.phase] + '。';
    $('phase').hidden = false;
    if (r.warn.length) { $('warn').textContent = r.warn.join(' '); $('warn').hidden = false; }
    row(tb, '満了日', S.fmt(r.expiry));
    row(tb, '受けられる最初の日の目安', S.fmt(r.first) + '（満了日の2か月前）');
    row(tb, '満了日まで', S.leftText(r));
    row(tb, 'お店の案内 1回目の目安', S.fmt(r.notice1) + '（' + r.n1 + '日前）');
    row(tb, 'お店の案内 2回目の目安', S.fmt(r.notice2) + '（' + r.n2 + '日前）');
    row(tb, '次の満了日の目安', S.fmt(r.nextExpiry) + '（有効期間 ' + r.nextYears + '年）');
    copyText = S.text(r);
  }

  F.forEach(function (k) {
    var i = $(k); i.value = state[k];
    i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', function () { state[k] = i.value; update(); });
    if (i.type === 'date') i.addEventListener('change', function () { state[k] = i.value; update(); });
  });
  $('base').value = state.base;
  ['input', 'change'].forEach(function (ev) { $('base').addEventListener(ev, function () { state.base = $('base').value; update(); }); });
  $('today').addEventListener('click', function () { state.base = todayIso(); $('base').value = state.base; update(); });
  $('copy').addEventListener('click', function () {
    if (!copyText) { $('copied').textContent = '先に満了日を入れてください。'; return; }
    var done = function (ok) { $('copied').textContent = ok ? 'コピーしました。' : 'コピーできませんでした。結果を選んでコピーしてください。'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(copyText).then(function () { done(true); }, function () { done(false); });
    else done(false);
  });
  update();
})();
