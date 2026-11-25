/* /ig/（IGプロフィールのリンク先）：どこが何回押されたかを GA4 のイベントで数える（11/25）
   ・送るのは ig_click の1種類だけ。送り先は ga.js が用意した gtag（dataLayer）だけで、このファイルは自分で通信しない
   ・印は各リンク・ボタンの data-ig（例：hero_riekiritsu）。送る項目：
       ig_item   … どのボタンか（data-ig の値）
       link_type … internal（サイト内）／ external（BOOTH・LINE など外のサイト）／ affiliate（A8.net の広告・PR）／ button（ページ内のボタン）
       link_url  … リンク先（ボタンのときはなし）
   ・入力した内容などは送らない。リンクの動きは変えない
   ・GA4 では「イベント → ig_click」で回数、ig_item ごとの内訳はカスタムディメンション（イベント・ig_item）を登録すると見られる */
(function (w, d) {
  'use strict';
  var A8 = /(^|\.)a8\.net$/i;
  function typeOf(el) {
    if (el.nodeName !== 'A') return 'button';
    var host = (el.hostname || '').toLowerCase();
    if (A8.test(host)) return 'affiliate';
    if (!host || host === (w.location.hostname || '').toLowerCase()) return 'internal';
    return 'external';
  }
  function find(t) {
    while (t && t.nodeType !== 9) {
      if (t.getAttribute && t.getAttribute('data-ig')) return t;
      t = t.parentNode;
    }
    return null;
  }
  function onClick(e) {
    try {
      if (e.type === 'auxclick' && e.button !== 1) return; // 中ボタン（新しいタブ）だけ
      var el = find(e.target);
      if (!el) return;
      var p = { ig_item: String(el.getAttribute('data-ig')).slice(0, 40), link_type: typeOf(el) };
      if (el.nodeName === 'A' && el.href) p.link_url = el.href;
      p.page_path = w.location.pathname;
      p.transport_type = 'beacon';
      if (typeof w.gtag === 'function') w.gtag('event', 'ig_click', p);
    } catch (err) { /* 計測できなくてもページはそのまま */ }
  }
  try {
    d.addEventListener('click', onClick, true);
    d.addEventListener('auxclick', onClick, true);
  } catch (err) { /* noop */ }
})(window, document);
