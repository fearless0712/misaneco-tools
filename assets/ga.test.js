/* 計測（assets/ga.js）の確認：node assets/ga.test.js
   ・BOOTH・Gumroad → select_item（item_id＝商品番号。purchase としては送らない）、公式LINE → line_click、/studio/<業種>/free/ の zip → free_download、/studio/<業種>/ を開く → studio_view
   ・data-ga-view="custom_service" の欄が画面に入る → custom_service_view（1回）、主な無料ツールで最初の入力・ボタン → free_tool_use（1回）
   ・送り先は gtag（dataLayer）だけ。通信の処理・外部URLを新しく書かない
   ・GAを読むページはすべて同じ ga.js を同じ書き方で読む */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var SITE = path.join(__dirname, '..');
var src = fs.readFileSync(path.join(__dirname, 'ga.js'), 'utf8');
var pass = 0, fail = 0;
function eq(a, b, m) { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('FAIL', m, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b)); } }

/* ---------- 簡易DOMで動かす ---------- */
function run(pathname, host, opt) {
  host = host || 'tools.equaglobal.com';
  opt = opt || {};
  var handlers = {};
  var doc = { addEventListener: function (t, f, cap) { (handlers[t] = handlers[t] || []).push({ f: f, cap: cap }); },
    removeEventListener: function (t, f) { handlers[t] = (handlers[t] || []).filter(function (h) { return h.f !== f; }); },
    readyState: 'complete', querySelectorAll: function (sel) { return sel === '[data-ga-view="custom_service"]' ? (opt.views || []) : []; } };
  var ctx = { document: doc, location: { pathname: pathname, hostname: host }, Date: Date };
  if (opt.io) ctx.IntersectionObserver = opt.io;
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

// BOOTH → select_item（purchase では送らない）
r.fire('click', r.link('https://excel-temple.booth.pm/items/9086745?utm_source=tools', { 'data-cta': 'suryo_booth' }));
eq(r.events(), [['select_item', { link_url: 'https://excel-temple.booth.pm/items/9086745?utm_source=tools', cta: 'suryo_booth', item_list_name: 'BOOTH', item_id: '9086745', items: [{ item_id: '9086745', affiliation: 'BOOTH' }], page_path: '/suryo/', transport_type: 'beacon' }]], 'BOOTH → select_item（item_id・page_path）');
r = run('/blog/x/');
r.fire('click', r.link('https://booth.pm/ja/items/9042496'));
eq(r.events()[0][1].item_id, '9042496', 'booth.pm/ja/items/ の番号も item_id');
// Gumroad → select_item（/l/<商品> を item_id に、ショップのトップは item_id なし）
r = run('/blog/en-x/');
r.fire('click', r.link('https://comedyverse.gumroad.com/l/cxqkwn?ref=tools'));
r.fire('click', r.link('https://comedyverse.gumroad.com/'));
eq(r.events(), [['select_item', { link_url: 'https://comedyverse.gumroad.com/l/cxqkwn?ref=tools', item_list_name: 'Gumroad', item_id: 'cxqkwn', items: [{ item_id: 'cxqkwn', affiliation: 'Gumroad' }], page_path: '/blog/en-x/', transport_type: 'beacon' }],
  ['select_item', { link_url: 'https://comedyverse.gumroad.com/', item_list_name: 'Gumroad', page_path: '/blog/en-x/', transport_type: 'beacon' }]], 'Gumroad → select_item');
r = run('/suryo/');
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
eq(r.events().map(function (e) { return e[0]; }), ['select_item'], '中ボタンは数える・右クリックは数えない');
// LINE：ボタンの文字も送る（data-cta がないとき、どのボタンかが分かるように）
r = run('/');
var la = r.link('https://line.me/R/ti/p/@736dykzx'); la.textContent = ' LINEで無料相談する（新しいタブで開きます） ';
r.fire('click', la);
eq(r.events()[0][1].link_text, 'LINEで無料相談する', 'line_click の link_text（「新しいタブ」の注記は除く）');

// free_tool_use：主な無料ツールで最初の入力・ボタン、1ページ1回。タブ・main の外・リンクは数えない
function el(name, attrs, inMain) {
  var e = { nodeName: name, getAttribute: function (n) { return (attrs || {})[n] === undefined ? null : attrs[n]; } };
  e.closest = function (sel) { if (sel === 'main') return inMain === false ? null : {}; if (sel === 'button') return name === 'BUTTON' ? e : null; return null; };
  return e;
}
function ev(r, type, target, trusted) { (r.handlers[type] || []).slice().forEach(function (h) { h.f({ type: type, target: target, isTrusted: trusted !== false, button: 0 }); }); }
r = run('/suryo/');
ev(r, 'click', el('BUTTON', { role: 'tab' }));
ev(r, 'click', el('BUTTON', {}, false));
ev(r, 'input', el('INPUT'), false);
ev(r, 'click', el('A'));
eq(r.events(), [], 'タブ・main の外・スクリプトの入力・リンクでは free_tool_use なし');
ev(r, 'input', el('INPUT'));
ev(r, 'click', el('BUTTON'));
ev(r, 'change', el('SELECT'));
eq(r.events(), [['free_tool_use', { tool: 'suryo', how: 'input', page_path: '/suryo/', transport_type: 'beacon' }]], 'free_tool_use は最初の1回だけ（入力した値は送らない）');
['kouki', 'shiharai', 'anbun', 'hiwari', 'riekiritsu', 'kinri', 'shaken'].forEach(function (t) {
  var x = run('/' + t + '/'); ev(x, 'click', el('BUTTON'));
  eq(x.events(), [['free_tool_use', { tool: t, how: 'button', page_path: '/' + t + '/', transport_type: 'beacon' }]], 'free_tool_use ' + t);
});
r = run('/studio/custom/'); ev(r, 'click', el('BUTTON'));
eq(r.events(), [], '無料ツール以外のページでは free_tool_use なし');

// custom_service_view：欄が画面に入ったら1回だけ（IntersectionObserver）
var made = [];
function IO(cb) { var o = { cb: cb, obs: [], off: false, observe: function (x) { o.obs.push(x); }, disconnect: function () { o.off = true; } }; made.push(o); return o; }
var box = {};
r = run('/studio/custom/', null, { io: IO, views: [box] });
eq(made.length === 1 && made[0].obs[0] === box, true, 'data-ga-view の欄を見張る');
made[0].cb([{ isIntersecting: false, target: box }]);
eq(r.events(), [], '画面に入る前は送らない');
made[0].cb([{ isIntersecting: true, target: box }]);
eq(r.events(), [['custom_service_view', { page_path: '/studio/custom/', transport_type: 'beacon' }]], '画面に入ったら custom_service_view');
eq(made[0].off, true, '1回送ったら見張りをやめる');
made.length = 0;
run('/suryo/', null, { io: IO, views: [] });
eq(made.length, 0, '欄がないページでは見張らない');
eq(run('/x/', null, { views: [box] }).events(), [], 'IntersectionObserver がないブラウザでも止まらない');

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
['select_item', 'line_click', 'free_download', 'studio_view', 'custom_service_view', 'free_tool_use'].forEach(function (n) { eq(src.indexOf("'" + n + "'") > 0, true, 'イベント名 ' + n); });
eq(/<\/script/i.test(src), false, '</script を含まない');
eq(/'purchase/.test(code), false, '外部ストアのクリックを purchase として送らない');
eq(fs.readFileSync(path.join(SITE, '..', '..', 'EQUA_site', 'site', 'assets', 'js', 'ga.js'), 'utf8') === src, true, 'EQUAサイトの ga.js と同じ中身');

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
