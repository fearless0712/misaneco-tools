/* 全画面広告（ページを開くたびに1つ）と、ページ下の広告 — 日本語ページ専用（A8.net）
   ・dx/ の全画面広告と同じ動き：開くたびにランダムに1つ／×・Esc・外側タップですぐ閉じる／デモ（?demo=）では出さない。
   ・広告のタグはこのファイルの中に持つ（fetch しないので connect-src は変えなくてよい）。
     タグは承認済みのもの（blog/ads.json・blog/private/a8_tags_*.json・広告タグ/a8_tags.json）だけ。新しく作らない。
   ・使い方：body の最後で src="../assets/ads-inter.js?v=…" を defer で読み、data-pool="phone" のように指定する
       data-pool    … phone（スマホ・iPhone）/ move（引越し・回線）/ accounting（お金・帳簿）/ mix（ブログ一覧）
       data-page-ad … "0" ならページ下の広告は出さない（ページにもともと広告があるとき）
   ・英語のページ（<html lang="en">、または途中で英語に切り替えたとき）には出さない。
   ・確認用：?inter=0 で全画面広告だけ止める（ページ下の広告は出る）。 */
(function () {
  'use strict';
  var ME = document.currentScript;
  var CFG = {
    pool: (ME && ME.getAttribute('data-pool')) || 'accounting',
    pageAd: !(ME && ME.getAttribute('data-page-ad') === '0')
  };

  /* 広告（A8.net のバナー 300x250。リンク＋表示計測の 1x1 画像をそのまま） */
  var ADS = {
    "mf-kaikei": { name: "マネーフォワード クラウド会計", tag: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4BEK9L+5CX82+4JGQ+5ZEMP\" rel=\"nofollow\"><img border=\"0\" width=\"300\" height=\"250\" alt=\"\" src=\"https://www26.a8.net/svt/bgt?aid=261019929009&wid=001&eno=01&mid=s00000021185001005000&mc=1\"></a><img border=\"0\" width=\"1\" height=\"1\" src=\"https://www17.a8.net/0.gif?a8mat=4BEK9L+5CX82+4JGQ+5ZEMP\" alt=\"\">" },
    "mf-kakutei": { name: "マネーフォワード クラウド確定申告", tag: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4BEK9L+6JSFM+4JGQ+BY641\" rel=\"nofollow\"><img border=\"0\" width=\"300\" height=\"250\" alt=\"\" src=\"https://www28.a8.net/svt/bgt?aid=261019929011&wid=001&eno=01&mid=s00000021185002007000&mc=1\"></a><img border=\"0\" width=\"1\" height=\"1\" src=\"https://www17.a8.net/0.gif?a8mat=4BEK9L+6JSFM+4JGQ+BY641\" alt=\"\">" },
    "mf-cloud": { name: "マネーフォワード クラウド", tag: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4BEK9L+ZQ12Q+3SPO+C8MHDT\" rel=\"nofollow\"><img border=\"0\" width=\"300\" height=\"250\" alt=\"\" src=\"https://www22.a8.net/svt/bgt?aid=261019929060&wid=001&eno=01&mid=s00000017718074008000&mc=1\"></a><img border=\"0\" width=\"1\" height=\"1\" src=\"https://www10.a8.net/0.gif?a8mat=4BEK9L+ZQ12Q+3SPO+C8MHDT\" alt=\"\">" },
    "mf-kaigyo": { name: "マネーフォワード クラウド開業届", tag: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4BEK9L+8C38Y+4JGQ+1NL281\" rel=\"nofollow\"><img border=\"0\" width=\"300\" height=\"250\" alt=\"\" src=\"https://www22.a8.net/svt/bgt?aid=261019929014&wid=001&eno=01&mid=s00000021185010008000&mc=1\"></a><img border=\"0\" width=\"1\" height=\"1\" src=\"https://www13.a8.net/0.gif?a8mat=4BEK9L+8C38Y+4JGQ+1NL281\" alt=\"\">" },
    "libmo": { name: "LIBMO", tag: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4BEK9B+EDZ52Q+3UM0+609HT\" rel=\"nofollow\"><img border=\"0\" width=\"300\" height=\"250\" alt=\"\" src=\"https://www28.a8.net/svt/bgt?aid=261019919870&wid=001&eno=01&mid=s00000017964001009000&mc=1\"></a><img border=\"0\" width=\"1\" height=\"1\" src=\"https://www19.a8.net/0.gif?a8mat=4BEK9B+EDZ52Q+3UM0+609HT\" alt=\"\">" },
    "dtisim": { name: "DTI SIM", tag: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4BEK9B+EC6U9E+1QFI+2Z7IWH\" rel=\"nofollow\"><img border=\"0\" width=\"300\" height=\"250\" alt=\"\" src=\"https://www27.a8.net/svt/bgt?aid=261019919867&wid=001&eno=01&mid=s00000008091018007000&mc=1\"></a><img border=\"0\" width=\"1\" height=\"1\" src=\"https://www11.a8.net/0.gif?a8mat=4BEK9B+EC6U9E+1QFI+2Z7IWH\" alt=\"\">" },
    "ahamo-hikari": { name: "ahamo光", tag: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4BEK9C+10WWAA+3SPO+CKIQ1T\" rel=\"nofollow\"><img border=\"0\" width=\"300\" height=\"250\" alt=\"\" src=\"https://www23.a8.net/svt/bgt?aid=261019920062&wid=001&eno=01&mid=s00000017718076006000&mc=1\"></a><img border=\"0\" width=\"1\" height=\"1\" src=\"https://www16.a8.net/0.gif?a8mat=4BEK9C+10WWAA+3SPO+CKIQ1T\" alt=\"\">" },
    "softbank-hikari": { name: "SoftBank 光", tag: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4BEK9C+123RHU+348K+1BNYOX\" rel=\"nofollow\"><img border=\"0\" width=\"300\" height=\"250\" alt=\"\" src=\"https://www27.a8.net/svt/bgt?aid=261019920064&wid=001&eno=01&mid=s00000014546008006000&mc=1\"></a><img border=\"0\" width=\"1\" height=\"1\" src=\"https://www10.a8.net/0.gif?a8mat=4BEK9C+123RHU+348K+1BNYOX\" alt=\"\">" },
    "linxas": { name: "LINXAS（スマホ買取）", tag: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4BEJHI+APSWS2+5V1I+BXYE9\" rel=\"nofollow\"><img border=\"0\" width=\"300\" height=\"250\" alt=\"\" src=\"https://www20.a8.net/svt/bgt?aid=261018918648&wid=001&eno=01&mid=s00000027351002006000&mc=1\"></a><img border=\"0\" width=\"1\" height=\"1\" src=\"https://www14.a8.net/0.gif?a8mat=4BEJHI+APSWS2+5V1I+BXYE9\" alt=\"\">" },
    "hamee": { name: "Hamee（iPhoneケース・充電器）", tag: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4BEJHI+AO0LYQ+XTI+7PCKH\" rel=\"nofollow\"><img border=\"0\" width=\"300\" height=\"250\" alt=\"\" src=\"https://www23.a8.net/svt/bgt?aid=261018918645&wid=001&eno=01&mid=s00000004383001294000&mc=1\"></a><img border=\"0\" width=\"1\" height=\"1\" src=\"https://www12.a8.net/0.gif?a8mat=4BEJHI+AO0LYQ+XTI+7PCKH\" alt=\"\">" },
    "coverary": { name: "COVERARY（本革スマホケース）", tag: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4BEJHI+AOM1KI+5V8G+5ZMCH\" rel=\"nofollow\"><img border=\"0\" width=\"300\" height=\"250\" alt=\"\" src=\"https://www24.a8.net/svt/bgt?aid=261018918646&wid=001&eno=01&mid=s00000027376001006000&mc=1\"></a><img border=\"0\" width=\"1\" height=\"1\" src=\"https://www10.a8.net/0.gif?a8mat=4BEJHI+AOM1KI+5V8G+5ZMCH\" alt=\"\">" },
    "porta": { name: "引越しポルタ", tag: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4BEJHJ+1ELV76+5W8K+5YZ75\" rel=\"nofollow\"><img border=\"0\" width=\"300\" height=\"250\" alt=\"\" src=\"https://www23.a8.net/svt/bgt?aid=261018919085&wid=001&eno=01&mid=s00000027506001003000&mc=1\"></a><img border=\"0\" width=\"1\" height=\"1\" src=\"https://www18.a8.net/0.gif?a8mat=4BEJHJ+1ELV76+5W8K+5YZ75\" alt=\"\">" },
    "denki-support": { name: "電気の手続きサポートセンター", tag: "<a href=\"https://px.a8.net/svt/ejp?a8mat=4BEJHJ+1CTKDU+4BRI+1TIBOX\" rel=\"nofollow\"><img border=\"0\" width=\"300\" height=\"250\" alt=\"\" src=\"https://www27.a8.net/svt/bgt?aid=261018919082&wid=001&eno=01&mid=s00000020187011003000&mc=1\"></a><img border=\"0\" width=\"1\" height=\"1\" src=\"https://www12.a8.net/0.gif?a8mat=4BEJHJ+1CTKDU+4BRI+1TIBOX\" alt=\"\">" }
  };
  /* ページの内容 → 出す広告の組み合わせ */
  var POOLS = {
    accounting: ['mf-kaikei', 'mf-kakutei', 'mf-cloud', 'mf-kaigyo'],
    phone: ['libmo', 'dtisim', 'ahamo-hikari', 'softbank-hikari', 'linxas', 'hamee', 'coverary'],
    move: ['porta', 'denki-support', 'ahamo-hikari', 'softbank-hikari', 'libmo', 'dtisim', 'linxas'],
    mix: ['mf-kaikei', 'mf-kakutei', 'mf-kaigyo', 'libmo', 'ahamo-hikari', 'linxas', 'porta']
  };
  var LABEL = '広告・PR';
  var DISC = 'このページには広告（アフィリエイトリンク）を含みます。';

  /* タグの取り込み：a8.net の <a> <img> <br> だけ（それ以外は捨てる）— dx/js/ads.js と同じ考え方 */
  var A8 = /^https:\/\/([a-z0-9-]+\.)*a8\.net\//i;
  function okUrl(u) { u = String(u || '').trim(); return A8.test(u) ? u : null; }
  function sanitizeTag(html) {
    var parsed = new window.DOMParser().parseFromString('<div>' + String(html || '') + '</div>', 'text/html');
    var out = document.createDocumentFragment(), banner = null;
    function walk(src, dst) {
      Array.prototype.forEach.call(src.childNodes, function (n) {
        if (n.nodeType !== 1) return;
        var tag = n.tagName.toLowerCase();
        if (tag === 'a') {
          var href = okUrl(n.getAttribute('href'));
          if (!href) { walk(n, dst); return; }
          var a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'nofollow sponsored noopener';
          walk(n, a); dst.appendChild(a);
        } else if (tag === 'img') {
          var s = okUrl(n.getAttribute('src'));
          if (!s) return;
          var im = document.createElement('img'); im.src = s; im.alt = n.getAttribute('alt') || '';
          ['width', 'height'].forEach(function (k) { var v = n.getAttribute(k); if (v && /^\d{1,4}$/.test(v)) im.setAttribute(k, v); });
          im.decoding = 'async';
          if (im.getAttribute('width') === '1') im.className = 'mnad-px'; else if (!banner) banner = im;
          dst.appendChild(im);
        } else if (tag === 'br') {
          dst.appendChild(document.createElement('br'));
        }
      });
    }
    walk(parsed.body.firstChild, out);
    return banner ? { frag: out, banner: banner } : null;
  }

  function isJa() { return /^ja\b/i.test(document.documentElement.getAttribute('lang') || ''); }
  function q(name) { var m = new RegExp('[?&]' + name + '(=([^&#]*))?(&|#|$)').exec(window.location.search || ''); return m ? (m[2] || '') : null; }
  function isDemo() { return q('demo') !== null; }

  /* 選ぶ：ページの中にもうある広告（同じリンク）はなるべく避けて、ランダムに1つ */
  function hrefOf(key) { var m = /href="([^"]+)"/.exec(ADS[key].tag); return m ? m[1] : ''; }
  function onPage() {
    var seen = {}, as = document.querySelectorAll('a[href*="a8.net"]');
    for (var i = 0; i < as.length; i++) seen[as[i].getAttribute('href')] = 1;
    return seen;
  }
  function pick(list, avoid) {
    var fresh = list.filter(function (k) { return !avoid[k] && !avoid[hrefOf(k)]; });
    var from = fresh.length ? fresh : list;
    return from.length ? from[Math.floor(Math.random() * from.length)] : null;
  }
  /* ページの背景が暗いか（ダークモードのページに白い枠が浮かないように） */
  function isDarkPage() {
    var els = [document.body, document.documentElement];
    for (var i = 0; i < els.length; i++) {
      var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(window.getComputedStyle(els[i]).backgroundColor || '');
      if (m && (m[4] === undefined || +m[4] > 0)) return (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3]) < 128;
    }
    return false;
  }
  var DARK = '';
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  var inter = null, lastFocus = null;
  /* 全画面広告を閉じる（画像が読めなかったときも閉じて、ページを使えるようにする） */
  function closeInter() {
    if (!inter) return;
    var box = inter; inter = null;
    if (box.parentNode) box.parentNode.removeChild(box);
    document.removeEventListener('keydown', onKey, true);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* noop */ } }
  }
  function onKey(e) {
    if (!inter) return;
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); closeInter(); return; }
    if (e.key === 'Tab') { // フォーカスを広告の中（×とバナー）だけで回す
      var f = inter.querySelectorAll('button, a[href]'); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!inter.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  }
  function showInter(key) {
    var t = sanitizeTag(ADS[key].tag); if (!t) return;
    var ov = el('div', 'mnad-inter' + DARK); ov.id = 'mnadInter';
    var box = el('div', 'mnad-box');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'mnadLabel');
    var bar = el('div', 'mnad-bar');
    var lbl = el('span', 'mnad-tag', LABEL); lbl.id = 'mnadLabel';
    var x = el('button', 'mnad-x', '×'); x.type = 'button'; x.setAttribute('aria-label', '広告を閉じる');
    bar.appendChild(lbl); bar.appendChild(x);
    var body = el('div', 'mnad-body');
    t.banner.alt = ADS[key].name; t.banner.loading = 'eager';
    t.banner.addEventListener('error', closeInter);
    body.appendChild(t.frag);
    body.appendChild(el('p', 'mnad-note', ADS[key].name + '（' + LABEL + '）'));
    box.appendChild(bar); box.appendChild(body); ov.appendChild(box);
    x.addEventListener('click', closeInter);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeInter(); });
    var links = body.querySelectorAll('a'); // 広告を開いたら（別タブ）、この画面は閉じておく
    for (var i = 0; i < links.length; i++) links[i].addEventListener('click', function () { window.setTimeout(closeInter, 0); });
    lastFocus = document.activeElement || null;
    document.body.appendChild(ov); inter = ov;
    document.addEventListener('keydown', onKey, true);
    x.focus();
  }

  var pageBox = null;
  /* ページ下の広告（ツールを最後まで使わなくても見える場所。全画面広告とは別の広告） */
  function showPageAd(key) {
    var t = sanitizeTag(ADS[key].tag); if (!t) return;
    var wrap = el('aside', 'mnad-page' + DARK); wrap.id = 'mnadPage'; wrap.setAttribute('aria-label', LABEL);
    var h = el('div', 'mnad-head'); h.appendChild(el('span', 'mnad-tag', LABEL)); h.appendChild(el('span', 'mnad-name', ADS[key].name));
    wrap.appendChild(el('p', 'mnad-disc', DISC)); wrap.appendChild(h);
    var b = el('div', 'mnad-pbody'); t.banner.alt = ADS[key].name; t.banner.loading = 'lazy';
    t.banner.addEventListener('error', function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); });
    b.appendChild(t.frag); wrap.appendChild(b);
    // 置き場所：#mnadPageHost があればそこ、なければ <main> の最後（main の中に footer があればその前）
    var host = document.getElementById('mnadPageHost'), main = document.querySelector('main');
    if (host) host.appendChild(wrap);
    else if (main) {
      var foot = main.querySelector(':scope > footer');
      if (foot) main.insertBefore(wrap, foot); else main.appendChild(wrap);
    } else document.body.appendChild(wrap);
    pageBox = wrap;
  }

  function start() {
    if (isDemo()) return;
    var list = (POOLS[CFG.pool] || POOLS.accounting).filter(function (k) { return ADS[k]; });
    if (!list.length) return;
    DARK = isDarkPage() ? ' mnad-dark' : '';
    var avoid = onPage();
    var ik = pick(list, avoid);
    var used = {}; if (ik) { used[ik] = 1; for (var k in avoid) used[k] = 1; }
    if (CFG.pageAd) { var pk = pick(list, used); if (pk) showPageAd(pk); }
    if (isJa()) { if (ik && q('inter') !== '0') showInter(ik); }
    else if (pageBox) pageBox.hidden = true;
    // 途中で言語を切り替えるページ（iPhoneのツール）：英語のときは広告を隠す
    if (window.MutationObserver) {
      new window.MutationObserver(function () {
        var ja = isJa();
        if (pageBox) pageBox.hidden = !ja;
        if (!ja) closeInter();
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }
  }
  /* ほかのスクリプト（言語の設定など）が終わってから出す */
  function later() { window.setTimeout(start, 0); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later); else later();
})();
