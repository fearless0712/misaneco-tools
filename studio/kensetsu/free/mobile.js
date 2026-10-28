/* 建設スタジオ無料版ページ：スマホで来た人への案内（パソコン用のアプリなので）
   ・スマホ判定は UA と matchMedia の両方。どちらも使えない・判定できないときはパソコン扱い（案内を出さない）
   ・「自分に送る」は navigator.share（端末の共有メニュー）。使えなければ URL をコピーするだけ
   ・外部への送信・計測はしない（このファイルは通信しない） */
(function (root) {
  'use strict';
  var TITLE = '建設スタジオ 無料版（パソコン用）';
  var PHONE_UA = /iPhone|iPod|Android.+Mobile|Mobile.+Firefox|Windows Phone|IEMobile|BlackBerry|Opera Mini/i;
  var PHONE_MQ = '(max-width: 760px) and (pointer: coarse)';

  // nav … navigator、mm … matchMedia（どちらも無ければ false＝パソコン扱い）
  function isPhone(nav, mm) {
    var byUA = false, byMQ = false;
    try { byUA = !!(nav && typeof nav.userAgent === 'string' && PHONE_UA.test(nav.userAgent)); } catch (e) { byUA = false; }
    try { byMQ = !!(typeof mm === 'function' && mm(PHONE_MQ).matches === true); } catch (e) { byMQ = false; }
    return byUA || byMQ;
  }

  function pageUrl(doc, loc) {
    var c = doc && doc.querySelector && doc.querySelector('link[rel="canonical"]');
    var h = c && c.getAttribute('href');
    if (h && /^https:\/\/tools\.equaglobal\.com\//.test(h)) return h;
    return loc ? loc.origin + loc.pathname : '';
  }

  function copyText(win, doc, text) {
    var nav = win.navigator;
    if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
      return nav.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(doc, text); });
    }
    return Promise.resolve(legacyCopy(doc, text));
  }
  function legacyCopy(doc, text) {
    try {
      var t = doc.createElement('textarea');
      t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.top = '-1000px';
      doc.body.appendChild(t); t.select();
      var ok = doc.execCommand && doc.execCommand('copy');
      doc.body.removeChild(t);
      return !!ok;
    } catch (e) { return false; }
  }

  // 「自分に送る」：共有メニュー → 使えなければコピー。戻り値は表示した文言（テスト用）
  function sendToSelf(win, doc, say) {
    var url = pageUrl(doc, win.location), nav = win.navigator;
    function fallback() {
      return copyText(win, doc, url).then(function (ok) {
        var m = ok ? 'コピーしました。メモやメールに貼って、パソコンで開いてください。'
                   : 'コピーできませんでした。このアドレスをパソコンで開いてください：' + url;
        say(m); return m;
      });
    }
    if (nav && typeof nav.share === 'function') {
      var p;
      try { p = nav.share({ title: TITLE, url: url }); } catch (e) { return fallback(); }
      return Promise.resolve(p).then(function () { say(''); return 'shared'; }, function (e) {
        if (e && e.name === 'AbortError') { say(''); return 'canceled'; }
        return fallback();
      });
    }
    return fallback();
  }

  function setup(win, doc) {
    var box = doc.getElementById('mobileNote');
    if (!box) return false;
    if (!isPhone(win.navigator, win.matchMedia ? win.matchMedia.bind(win) : null)) { box.hidden = true; return false; }
    box.hidden = false;
    var msg = doc.getElementById('mobileMsg');
    var say = function (t) { if (msg) msg.textContent = t; };
    var btn = doc.getElementById('sendToSelf');
    if (btn) btn.addEventListener('click', function () { sendToSelf(win, doc, say); });
    return true;
  }

  var M = { isPhone: isPhone, pageUrl: pageUrl, sendToSelf: sendToSelf, setup: setup, PHONE_MQ: PHONE_MQ, TITLE: TITLE };
  if (typeof module === 'object' && module.exports) { module.exports = M; return; }
  var run = function () { try { setup(root, root.document); } catch (e) { /* 失敗してもパソコン用の表示のまま */ } };
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', run); else run();
})(typeof window !== 'undefined' ? window : this);
