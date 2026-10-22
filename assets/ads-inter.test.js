/* 全画面広告（assets/ads-inter.js）の確認：node assets/ads-inter.test.js
   ・日本語のページ：スクリプトとCSSが入っている／CSPで読み込める／A8の画像が出せる／広告の組み合わせ（pool）が合っている
   ・英語のページ：入っていない
   ・広告タグ：a8.net のリンク・バナー・表示計測（0.gif）がそろっている */
'use strict';
var fs = require('fs'), path = require('path');
var SITE = path.join(__dirname, '..');
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('FAIL: ' + m); } }
function read(p) { return fs.readFileSync(path.join(SITE, p), 'utf8'); }
function csp(html) { var m = /http-equiv="Content-Security-Policy" content="([^"]*)"/i.exec(html); return m ? m[1] : null; }
function dir(c, name) { var m = new RegExp('(?:^|;)\\s*' + name + '\\s+([^;]*)').exec(c); return m ? m[1] : null; }

/* ---------- 広告タグと組み合わせ ---------- */
var js = read('assets/ads-inter.js');
ok(!/<\/script/i.test(js), 'no </script in js (inlined into demo pages)');
var ads = {}, re = /^\s*"([a-z0-9-]+)": \{ name: "([^"]+)", tag: "((?:[^"\\]|\\.)*)" \}/gm, m;
while ((m = re.exec(js))) ads[m[1]] = JSON.parse('"' + m[3] + '"');
ok(Object.keys(ads).length >= 10, 'ad tags parsed: ' + Object.keys(ads).length);
Object.keys(ads).forEach(function (k) {
  var t = ads[k];
  ok(/^<a href="https:\/\/px\.a8\.net\/svt\/ejp\?a8mat=[^"]+"/.test(t), k + ' link is px.a8.net');
  ok(/<img [^>]*width="300" height="250"[^>]*src="https:\/\/www\d*\.a8\.net\/svt\/bgt\?[^"]+"/.test(t), k + ' banner is a8 bgt 300x250');
  ok(/<img [^>]*src="https:\/\/www\d*\.a8\.net\/0\.gif\?a8mat=[^"]+"/.test(t), k + ' has impression 0.gif');
  var urls = t.match(/(?:href|src)="([^"]+)"/g).map(function (s) { return s.replace(/^\w+="|"$/g, ''); });
  ok(urls.every(function (u) { return /^https:\/\/([a-z0-9-]+\.)*a8\.net\//.test(u); }), k + ' only a8.net urls');
});
/* タグは承認済みのファイルにあるものだけ（新しく作らない） */
var R = path.join(SITE, '..', '..');
var known = ['blog/ads.json', 'blog/private/a8_tags_20261019.json', 'blog/private/a8_tags_dx_20261019.json', '広告タグ/a8_tags.json']
  .map(function (f) { try { return fs.readFileSync(path.join(R, f), 'utf8'); } catch (e) { return ''; } }).join('\n');
if (known.length > 100) {
  Object.keys(ads).forEach(function (k) {
    var a8mat = /a8mat=([^"&]+)/.exec(ads[k])[1], bgt = /bgt\?([^"]+)/.exec(ads[k])[1];
    ok(known.indexOf(a8mat) >= 0 && known.indexOf(bgt.replace(/&/g, '&')) >= 0, k + ' tag comes from an approved A8 tag file');
  });
}
var pools = {}, pm, pre = /^\s*(accounting|phone|move|mix): \[([^\]]*)\]/gm;
while ((pm = pre.exec(js))) pools[pm[1]] = pm[2].match(/'([^']+)'/g).map(function (s) { return s.slice(1, -1); });
['accounting', 'phone', 'move', 'mix'].forEach(function (p) {
  ok(pools[p] && pools[p].length >= 2, 'pool ' + p + ' has 2+ ads (page ad can differ from the full-screen ad)');
  (pools[p] || []).forEach(function (k) { ok(!!ads[k], 'pool ' + p + ' → ' + k + ' exists'); });
});
ok(pools.accounting.every(function (k) { return /^mf-/.test(k); }), 'accounting pool is money/bookkeeping only');
ok(/rel = 'nofollow sponsored noopener'/.test(js) && /a\.target = '_blank'/.test(js), 'links open in new tab with sponsored rel');
ok(/'広告・PR'/.test(js) && /aria-modal/.test(js) && /'Escape'/.test(js) && /e\.target === ov/.test(js), 'label / dialog / Esc / outside click');
ok(/addEventListener\('error', closeInter\)/.test(js), 'image error closes the full-screen ad');
ok(/q\('demo'\) !== null/.test(js), 'no ads in demo mode');
var css = read('assets/ads-inter.css');
ok(/\.mnad-x \{ width: 48px; height: 48px;/.test(css), 'close button 48px');
ok(/\.mnad-box \{[^}]*max-width: 360px/.test(css), 'box fits 390px phones');

/* ---------- ページ ---------- */
function blogPool(tags) {
  var acc = ['お金', 'フリーランス', '確定申告', 'インボイス', '青色申告', 'DX', '不動産'];
  if (tags.some(function (t) { return acc.indexOf(t) >= 0; })) return 'accounting';
  if (tags.indexOf('引越し') >= 0) return 'move';
  if (tags.some(function (t) { return ['スマホ', 'ネット回線', '買取'].indexOf(t) >= 0; })) return 'phone';
  return 'accounting';
}
var ja = [], en = [];
fs.readdirSync(path.join(SITE, 'blog')).forEach(function (d) {
  var f = 'blog/' + d + '/index.html';
  if (!fs.existsSync(path.join(SITE, f))) return;
  var h = read(f), lang = /<html lang="(\w+)"/.exec(h)[1];
  if (lang === 'ja') {
    var tm = /<p class="meta">[^・<]*・([^<]*)<\/p>/.exec(h), tags = tm ? tm[1].split(' / ') : [];
    ja.push({ f: f, pool: blogPool(tags), pageAd: false, up: '../../' });
  } else en.push(f);
});
ja.push({ f: 'blog/index.html', pool: 'mix', pageAd: false, up: '../' });
[['phone/switch', 'phone'], ['phone/net', 'phone'], ['phone/storage', 'phone'], ['phone/repair', 'phone'],
 ['iphone/sell-check', 'phone'], ['iphone/model-check', 'phone'], ['iphone/charge-check', 'phone']]
  .forEach(function (x) { ja.push({ f: x[0] + '/index.html', pool: x[1], pageAd: true, up: '../../' }); });
ja.push({ f: 'move/index.html', pool: 'move', pageAd: true, up: '../' });
ja.push({ f: 'hozon/index.html', pool: 'accounting', pageAd: false, up: '../', staticAd: true });
ja.push({ f: 'kouki/index.html', pool: 'accounting', pageAd: true, up: '../' });
ja.push({ f: 'shaken/index.html', pool: 'accounting', pageAd: true, up: '../' });
ja.push({ f: 'riekiritsu/index.html', pool: 'accounting', pageAd: false, up: '../', staticAd: true });
ja.push({ f: 'anbun/index.html', pool: 'accounting', pageAd: false, up: '../', staticAd: true });
fs.readdirSync(SITE).filter(function (f) { return /^[A-Z][A-Za-z0-9]+\.html$/.test(f); })
  .forEach(function (f) { ja.push({ f: f, pool: 'accounting', pageAd: false, inline: true, staticAd: true }); });
en.push('blog/en/index.html', 'dx-en/index.html', 'records/index.html', 'jobcost/index.html');

ja.forEach(function (p) {
  var h = read(p.f), c = csp(h);
  ok(/<html lang="ja">/.test(h), p.f + ' is lang=ja');
  if (p.inline) {
    ok(new RegExp('<script data-pool="' + p.pool + '" data-page-ad="0">').test(h), p.f + ' inline full-screen ad script');
    ok(h.indexOf('.mnad-inter {') > 0, p.f + ' inline full-screen ad css');
    if (c) {
      ok(/'unsafe-inline'/.test(dir(c, 'script-src') || ''), p.f + ' CSP allows the inline script');
      ok(/'unsafe-inline'/.test(dir(c, 'style-src') || ''), p.f + ' CSP allows the inline style');
    }
  } else {
    var sm = new RegExp('<script src="' + p.up.replace(/\./g, '\\.') + 'assets/ads-inter\\.js\\?v=(\\d+)" data-pool="' + p.pool + '"' + (p.pageAd ? '' : ' data-page-ad="0"') + ' defer></script>').exec(h);
    ok(!!sm, p.f + ' full-screen ad script (pool ' + p.pool + (p.pageAd ? ', page ad' : '') + ')');
    ok(h.indexOf('<link rel="stylesheet" href="' + p.up + 'assets/ads-inter.css?v=') > 0, p.f + ' full-screen ad css');
    ok(sm && fs.existsSync(path.join(SITE, path.dirname(p.f), p.up, 'assets/ads-inter.js')), p.f + ' script path resolves');
    ok(c && /'self'/.test(dir(c, 'script-src') || ''), p.f + " CSP script-src 'self'");
    ok(c && /'self'/.test(dir(c, 'style-src') || ''), p.f + " CSP style-src 'self'");
  }
  ok(!c || /https:\/\/\*\.a8\.net/.test(dir(c, 'img-src') || ''), p.f + ' CSP img-src allows *.a8.net');
  ok((h.match(/<script[^>]*data-pool=/g) || []).length === 1, p.f + ' loaded once');
  if (p.staticAd) ok(/<a href="https:\/\/px\.a8\.net\/[^"]+" rel="nofollow sponsored noopener" target="_blank">/.test(h), p.f + ' has an ad visible on load');
});
en.forEach(function (f) {
  var h = read(f);
  ok(!/<html lang="ja"/.test(h), f + ' is not lang=ja');
  ok(h.indexOf('ads-inter') < 0 && h.indexOf('mnad-') < 0, f + ' has NO Japanese full-screen ad');
});
ok(ja.length >= 50, 'JA pages checked: ' + ja.length);
ok(en.length >= 20, 'EN pages checked: ' + en.length);

console.log(pass + ' passed, ' + fail + ' failed (JA pages ' + ja.length + ', EN pages ' + en.length + ')');
process.exit(fail ? 1 : 0);
