/* ポートフォリオ用の表示（11/17）：業種別スタジオの見本ページと一覧 /studio/ を、URL に ?pf=1 を付けて開いたときだけ
   ・上の帯（製品版・無料版の案内、「LINEで無料の見本を頼む」）を出さない
   ・公式LINE（line.me）へのボタン・リンクを出さない（DOMから取り除く）
   ・スタジオの外（製品版の案内・作り変えの相談・ほかのツールやブログ）へのリンクも出さない（行ごと消す。文の中のリンクは文字だけ残す）
   ・スタジオどうしのリンク（/studio/ と 5業種）には ?pf=1 を付け直して、ページを移っても同じ表示のまま
   ?pf=1 がないときは何もしない（見た目も動きも今のまま）。通信はしない。
   使い方：<head> の中で同期で読む（帯が一瞬見えないように）。 */
(function (root) {
  'use strict';
  var KEEP = /^\/studio\/(?:(?:kensetsu|kuruma|keiri|fudosan|freelance)\/)?(?:index\.html)?$/;
  var CSS = 'html.pf .promo,html.pf .promo-line,html.pf a[href*="line.me"],html.pf .is-pf-hide{display:none!important}';

  function isPf(search) { return /[?&]pf=1(?:&|#|$)/.test(String(search || '')); }

  // href を解決して、スタジオの中のページなら ?pf=1 を付けた URL、外なら null
  function pfHref(href, base) {
    var u;
    try { u = new URL(href, base); } catch (e) { return null; }
    var b = new URL(base);
    if (u.origin !== b.origin || !KEEP.test(u.pathname)) return null;
    if (!isPf(u.search)) u.search = (u.search ? u.search + '&' : '?') + 'pf=1';
    return u.pathname + u.search + u.hash;
  }

  function isLine(v) { return /(^|\/\/|\.)line\.me(\/|$|[?#])/i.test(String(v || '')); }

  // 文のなかのリンク以外に文字があるか（あればリンクだけ文字に戻す）
  function onlyLinks(box) {
    var t = '';
    Array.prototype.forEach.call(box.childNodes, function (n) {
      if (n.nodeType === 3) t += n.nodeValue;
      else if (n.nodeType === 1 && n.nodeName !== 'A' && n.nodeName !== 'BR') t += n.textContent;
    });
    return !/[^\s　]/.test(t);
  }

  function apply(doc, loc) {
    var base = loc.href;
    var rm = function (el) { if (el && el.parentNode) el.parentNode.removeChild(el); };
    Array.prototype.slice.call(doc.querySelectorAll('.promo, .promo-line')).forEach(rm);
    Array.prototype.slice.call(doc.querySelectorAll('[href], [src], [action], [data-href]')).forEach(function (el) {
      if (isLine(el.getAttribute('href')) || isLine(el.getAttribute('src')) || isLine(el.getAttribute('action')) || isLine(el.getAttribute('data-href'))) rm(el);
    });
    Array.prototype.slice.call(doc.querySelectorAll('a[href]')).forEach(function (a) {
      if (!a.parentNode) return;
      var raw = a.getAttribute('href') || '';
      if (/^(#|blob:|data:|javascript:)/i.test(raw) || a.hasAttribute('download')) return; // ページ内・保存用はそのまま
      var h = pfHref(raw, base);
      if (h) { a.setAttribute('href', h); return; }
      var p = a.parentNode;
      if (p.nodeName === 'P' && onlyLinks(p)) {
        var outs = Array.prototype.filter.call(p.querySelectorAll('a[href]'), function (x) { return !pfHref(x.getAttribute('href'), base); });
        if (outs.length === p.querySelectorAll('a[href]').length) { rm(p); return; }
        rm(a); return;
      }
      if (p.nodeName === 'P' || p.nodeName === 'FOOTER' || p.nodeName === 'SMALL' || p.nodeName === 'SPAN' || p.nodeName === 'LI') {
        p.replaceChild(doc.createTextNode(a.textContent), a); return;
      }
      rm(a);
    });
  }

  function start(win, doc) {
    if (!isPf(win.location.search)) return false;
    doc.documentElement.classList.add('pf');
    var st = doc.createElement('style');
    st.setAttribute('data-pf', '1');
    st.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(st);
    var run = function () { try { apply(doc, win.location); } catch (e) { /* CSSで隠れたまま */ } };
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', run); else run();
    return true;
  }

  var M = { isPf: isPf, pfHref: pfHref, isLine: isLine, apply: apply, start: start, CSS: CSS };
  if (typeof module === 'object' && module.exports) { module.exports = M; return; }
  start(root, root.document);
})(typeof window !== 'undefined' ? window : this);
