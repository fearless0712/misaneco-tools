/* 計測（assets/ga.js）の確認：node assets/ga.test.js
   ・BOOTH → purchase_click、公式LINE → line_click、/studio/<業種>/free/ の zip → free_download、/studio/<業種>/ を開く → studio_view
   ・送り先は gtag（dataLayer）だけ。通信の処理・外部URLを新しく書かない
   ・GAを読むページはすべて同じ ga.js を同じ書き方で読む */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var SITE = path.join(__dirname, '..');
var src = fs.readFileSync(path.join(__dirname, 'ga.js'), 'utf8');
var pass = 0, fail = 0;
function eq(a, b, m) { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('FAIL', m, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b)); } }

/* ---------- 簡易DOMで動かす ---------- */
function run(pathname, host) {
  host = host || 'tools.equaglobal.com';
  var handlers = {};
  var doc = { addEventListener: function (t, f, cap) { (handlers[t] = handlers[t] || []).push({ f: f, cap: cap }); } };
  var ctx = { document: doc, location: { pathname: pathname, hostname: host }, Date: Date };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  function link(href, attrs) {
    var u = new URL(href, 'https://' + host + pathname);
    return { nodeName: 'A', href: u.href, hostname: u.hostname, pathname: u.pathname, parentNode: null,
      getAttribute: function (n) { return (attrs || {})[n] === undefined ? null : attrs[n]; } };
  }
  function fire(type, target, button) { (handlers[type] || []).forEach(function (h) { h.f({ type: type, target: target, button: button || 0 }); }); }
  function events() { return ctx.dataLayer.filter(function (a) { return a[0] === 'event'; }).map(function (a) { return [a[1], JSON.parse(JSON.stringify(a[2]))]; }); }
  return { ctx: ctx, handlers: handlers, link: link, fire: fire, events: events };
}

// 既存の設定（page_view）はそのまま
var r = run('/suryo/');
eq(r.ctx.dataLayer.slice(0, 2).map(function (a) { return a[0]; }), ['js', 'config'], 'gtag js / config はそのまま');
eq(r.ctx.dataLayer[1][1], 'G-EWJXRJY9M6', '測定ID');
eq(r.events(), [], 'ツールページを開いただけではイベントなし');
eq(!!(r.handlers.click && r.handlers.click[0].cap), true, 'クリックは capture で拾う（ページ側の処理に左右されない）');

// BOOTH
r.fire('click', r.link('https://excel-temple.booth.pm/items/9086745?utm_source=tools', { 'data-cta': 'suryo_booth' }));
eq(r.events(), [['purchase_click', { link_url: 'https://excel-temple.booth.pm/items/9086745?utm_source=tools', cta: 'suryo_booth', page_path: '/suryo/', transport_type: 'beacon' }]], 'BOOTH → purchase_click（link_url・page_path）');
// LINE（子要素のクリックでも親の a を見る）
r = run('/riekiritsu/');
var a = r.link('https://line.me/R/ti/p/@736dykzx', { 'data-cta': 'riekiritsu_result' });
var span = { nodeName: 'SPAN', parentNode: a };
r.fire('click', span);
eq(r.events(), [['line_click', { link_url: 'https://line.me/R/ti/p/@736dykzx', cta: 'riekiritsu_result', page_path: '/riekiritsu/', transport_type: 'beacon' }]], 'LINE → line_click（中の文字を押しても）');
// data-cta なしは cta を付けない
r = run('/blog/x/');
r.fire('click', r.link('https://line.me/R/ti/p/@736dykzx'));
eq(r.events()[0][1].cta, undefined, 'data-cta がなければ cta なし');
// 中ボタン（新しいタブ）は数える・右クリックは数えない
r = run('/ig/');
r.fire('auxclick', r.link('https://excel-temple.booth.pm/items/9042496'), 1);
r.fire('auxclick', r.link('https://excel-temple.booth.pm/items/9042496'), 2);
eq(r.events().map(function (e) { return e[0]; }), ['purchase_click'], '中ボタンは数える・右クリックは数えない');

// 無料版zip（相対パス）→ free_download。ページを開いただけでは studio_view を送らない（/free/ は見本ではない）
r = run('/studio/kensetsu/free/');
eq(r.events(), [], '無料版ページは studio_view を送らない');
r.fire('click', r.link('kensetsu-studio-free-v1.0.1.zip'));
eq(r.events(), [['free_download', { link_url: 'https://tools.equaglobal.com/studio/kensetsu/free/kensetsu-studio-free-v1.0.1.zip', file_name: 'kensetsu-studio-free-v1.0.1.zip', page_path: '/studio/kensetsu/free/', transport_type: 'beacon' }]], 'zip → free_download（1回だけ）');
// サイト内のふつうのリンク・ほかのサイトの zip は数えない
r.fire('click', r.link('/studio/kensetsu/'));
r.fire('click', r.link('https://example.com/studio/kensetsu/free/x.zip'));
r.fire('click', null);
r.fire('click', { nodeName: 'BUTTON', parentNode: null });
eq(r.events().length, 1, 'サイト内リンク・ほかのサイトのzip・ボタンは数えない');

// 見本ページ → studio_view
['kensetsu', 'kuruma', 'keiri', 'fudosan', 'freelance', 'trading'].forEach(function (s) {
  var x = run('/studio/' + s + '/');
  eq(x.events(), [['studio_view', { studio: s, page_path: '/studio/' + s + '/', transport_type: 'beacon' }]], 'studio_view ' + s);
});
eq(run('/studio/kensetsu/index.html').events()[0][0], 'studio_view', 'index.html つきでも studio_view');
eq(run('/studio/custom/').events(), [], '作り変えの相談ページ（custom）は見本ではない');
eq(run('/studio/').events(), [], 'スタジオ一覧は studio_view なし');

// 失敗してもページを止めない（gtag が例外でも）
r = run('/suryo/');
r.ctx.dataLayer.push = function () { throw new Error('x'); };
var threw = false;
try { r.fire('click', r.link('https://line.me/R/ti/p/@736dykzx')); } catch (e) { threw = true; }
eq(threw, false, 'gtag が失敗してもクリックは止めない');

/* ---------- ソースの決まり ---------- */
var code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
eq(/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|\.src\s*=|new Image|https?:\/\//.test(code), false, '自分で通信しない・外部URLを書かない（gtag だけ）');
eq(/preventDefault|location\.href\s*=|window\.open/.test(code), false, 'リンクの動きは変えない');
eq((code.match(/gtag\('event'/g) || []).length, 1, 'イベント送信は1か所');
['purchase_click', 'line_click', 'free_download', 'studio_view'].forEach(function (n) { eq(src.indexOf("'" + n + "'") > 0, true, 'イベント名 ' + n); });
eq(/<\/script/i.test(src), false, '</script を含まない');

/* ---------- GAを読むページ ---------- */
var pages = [];
(function walk(d) {
  fs.readdirSync(d, { withFileTypes: true }).forEach(function (e) {
    var p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(node_modules|\.git|sns)$/.test(e.name)) walk(p); }
    else if (/\.html$/.test(e.name)) { var h = fs.readFileSync(p, 'utf8'); if (h.indexOf('assets/ga.js') >= 0) pages.push([path.relative(SITE, p), h]); }
  });
})(SITE);
eq(pages.length >= 30, true, 'GAを読むページ数: ' + pages.length);
pages.forEach(function (x) {
  var m = /<script src="((?:\.\.\/)*)assets\/ga\.js\?v=\d+"><\/script>/.exec(x[1]);
  eq(!!m && fs.existsSync(path.join(SITE, path.dirname(x[0]), m[1], 'assets/ga.js')), true, x[0] + ' ga.js のパス');
  var c = /http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(x[1]);
  if (c) eq(/connect-src[^;]*https:\/\/\*\.google-analytics\.com/.test(c[1]), true, x[0] + ' CSPで送信先（GAだけ）が許可');
});

console.log('ga.test.js: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
