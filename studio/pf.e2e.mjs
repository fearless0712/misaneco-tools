#!/usr/bin/env node
/* ポートフォリオ表示（?pf=1、assets/pf.js）の画面テスト：node studio/pf.e2e.mjs [--shots <保存先フォルダ>]
   ・専用プロファイル（scratchpad/chrome-pf、毎回まっさら）の headless Chrome を DevTools で動かす。普段の Chrome は使わない。終わったら止める
   ・このサイトを 127.0.0.1 の使い捨てサーバーで配る。GA への通信は止める（テストで閲覧数を増やさない）
   ・?pf=1：line.me への要素0／帯（.promo）0／スタジオの外へのリンク0／スタジオどうしのリンクに pf=1／リンクをたどっても pf のまま
   ・?pf=1 なし：帯・LINE は元のHTMLと同じ数、pf の印なし、pf.js を外したページとスクリーンショットが1ピクセルも違わない（1280x800・390x844）
   ・--shots：5スタジオの ?pf=1（今日＝2026-10-22に固定）を 1280x800 で保存 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = '/private/tmp/claude-501/-Users-mikotomisaka/5f882d3f-ae40-4025-a270-d0e2c89d08b0/scratchpad/chrome-pf';
const args = process.argv.slice(2);
const SHOTS = args.includes('--shots') ? path.resolve(args[args.indexOf('--shots') + 1]) : null;
const STUDIOS = ['kensetsu', 'kuruma', 'keiri', 'fudosan', 'freelance'];
const TODAY = 'today=2026-10-22';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL: ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- 使い捨てサーバー（?__nopf=1 なら pf.js の行を外したHTMLを返す＝比べる元） ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.zip': 'application/zip' };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  let p = path.join(SITE, decodeURIComponent(u.pathname));
  if (!p.startsWith(SITE)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('404'); }
  let body = fs.readFileSync(p);
  if (p.endsWith('.html') && u.searchParams.get('__nopf') === '1') body = Buffer.from(body.toString('utf8').replace(/<script src="(?:\.\.\/)+assets\/pf\.js\?v=\d+"><\/script>\n/, ''));
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(body);
});

// ---------- Chrome（DevTools） ----------
let chrome = null;
function stopChrome() { if (chrome && chrome.exitCode === null) { try { chrome.kill('SIGTERM'); } catch {} } }
process.on('exit', stopChrome);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopChrome(); process.exit(130); });
const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); s.on('error', rej); });

async function startChrome() {
  const port = await freePort();
  fs.rmSync(PROFILE, { recursive: true, force: true });
  fs.mkdirSync(PROFILE, { recursive: true });
  chrome = spawn(CHROME, ['--headless=new', `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${port}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--disable-extensions', '--num-raster-threads=1', '--disable-partial-raster', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'] });
  chrome.stderr.on('data', () => {});
  for (let i = 0; i < 100; i++) {
    try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const pg = l.find(t => t.type === 'page'); if (pg) return pg.webSocketDebuggerUrl; } catch {}
    await sleep(150);
  }
  throw new Error('Chrome の起動を確認できませんでした');
}
function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl); let id = 0; const pend = new Map(); const ls = [];
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } else if (m.method) ls.forEach(f => f(m)); };
  const opened = new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  return { opened, send: (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); }), on: f => ls.push(f) };
}
let C, BASE;
async function ev(expr) {
  const r = await C.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('page error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}
async function size(w, h, mobile) { await C.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile }); }
async function go(url) {
  const loaded = new Promise(r => { const f = m => { if (m.method === 'Page.loadEventFired') r(); }; C.on(f); });
  await C.send('Page.navigate', { url: url.startsWith('http') ? url : BASE + url });
  await loaded;
  await ev('document.fonts.ready.then(() => new Promise(r => setTimeout(r, 400)))');
}
async function shot() {
  // アニメーションを止めてから撮る（pf.js あり／なしの両方に同じ処理。数字が数え上がる動きは freeze() で止める）
  await ev(`(() => { const s = document.createElement('style'); s.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.head.appendChild(s); return document.fonts.ready.then(() => new Promise(r => setTimeout(r, 300))); })()`);
  return Buffer.from((await C.send('Page.captureScreenshot', { format: 'png' })).data, 'base64');
}

// ピクセル比較用：ページの requestAnimationFrame を止める（動きのある数字・流れる点がコマごとに変わるため。あり／なし両方に同じ処理）
let freezeId = null;
async function freeze(on) {
  if (on && !freezeId) freezeId = (await C.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.requestAnimationFrame = function () { return 0; };' })).identifier;
  if (!on && freezeId) { await C.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: freezeId }); freezeId = null; }
}

const STATE = `(() => {
  const all = [...document.querySelectorAll('[href],[src],[action],[data-href]')];
  const line = all.filter(e => ['href','src','action','data-href'].some(k => /line\\.me/i.test(e.getAttribute(k) || ''))).length;
  const links = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'));
  return { line, promo: document.querySelectorAll('.promo,.promo-line').length, pfClass: document.documentElement.classList.contains('pf'),
    pfStyle: !!document.querySelector('style[data-pf]'), links, text: document.body.innerText.length,
    visiblePromo: [...document.querySelectorAll('.promo,.promo-line')].filter(e => e.offsetParent !== null).length };
})()`;
const KEEP = /^\/studio\/(?:(?:kensetsu|kuruma|keiri|fudosan|freelance)\/)?(?:index\.html)?(?:\?|$)/;

async function main() {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  BASE = `http://127.0.0.1:${server.address().port}`;
  C = cdp(await startChrome()); await C.opened;
  await C.send('Page.enable'); await C.send('Runtime.enable'); await C.send('Network.enable');
  await C.send('Network.setBlockedURLs', { urls: ['*googletagmanager.com*', '*google-analytics.com*', '*analytics.google.com*'] });
  await size(1280, 800);

  const pages = [{ name: 'index', path: '/studio/' }].concat(STUDIOS.map(s => ({ name: s, path: `/studio/${s}/` })));
  for (const pg of pages) {
    const src = fs.readFileSync(path.join(SITE, pg.path, 'index.html'), 'utf8');
    const srcLine = (src.match(/line\.me/g) || []).length, srcPromo = (src.match(/<aside class="promo[ "]/g) || []).length;
    const q = pg.name === 'index' ? '' : TODAY;

    // ?pf=1
    await go(pg.path + '?pf=1' + (q ? '&' + q : ''));
    let s = await ev(STATE);
    ok(s.line === 0, `${pg.name} ?pf=1: line.me への要素が0（${s.line}）`);
    ok(s.promo === 0, `${pg.name} ?pf=1: 帯が0（${s.promo}）`);
    ok(s.pfClass && s.pfStyle, `${pg.name} ?pf=1: pf の印とCSS`);
    const bad = s.links.filter(h => !/^(#|blob:)/.test(h) && !(KEEP.test(h) && /[?&]pf=1(&|#|$)/.test(h)));
    ok(bad.length === 0, `${pg.name} ?pf=1: リンクはスタジオの中だけ・pf=1 付き（${bad.join(' ')}）`);
    ok(!/製品版|無料版|LINE|作り変え/.test(await ev('document.body.innerText')), `${pg.name} ?pf=1: 製品版・無料版・LINE・作り変えの文字が出ない`);
    if (pg.name !== 'index') ok(await ev(`!!document.querySelector('.logo b') && document.querySelector('.logo').getBoundingClientRect().left >= 0 && document.querySelector('.logo').getBoundingClientRect().top >= 0`), `${pg.name} ?pf=1: ロゴが画面内`);

    // ?pf=1 なし（今のまま）
    await go(pg.path + (q ? '?' + q : ''));
    s = await ev(STATE);
    ok(s.line === srcLine, `${pg.name} pfなし: line.me は元のHTMLと同じ ${srcLine}（${s.line}）`);
    ok(s.promo === srcPromo, `${pg.name} pfなし: 帯は元のHTMLと同じ ${srcPromo}（${s.promo}）`);
    ok(s.visiblePromo === srcPromo, `${pg.name} pfなし: 帯が表示されている（${s.visiblePromo}/${srcPromo}）`);
    ok(!s.pfClass && !s.pfStyle, `${pg.name} pfなし: pf の印なし`);
    ok(s.links.length === (src.match(/<a [^>]*href=/g) || []).length, `${pg.name} pfなし: リンクの数が元のHTMLと同じ`);
    // ピクセル比較：pf.js あり／なし（?pf なし）
    await freeze(true);
    for (const [w, h, m] of [[1280, 800, false], [390, 844, true]]) {
      await size(w, h, m);
      // 描画のたまの揺れ（ぼかし・影の数ピクセルが1〜4段階ずれる）があるので、3回まで撮り直す。本当の違いなら3回とも違う
      let same = false;
      for (let t = 0; t < 3 && !same; t++) {
        await go(pg.path + (q ? '?' + q : ''));
        const a = await shot();
        await go(pg.path + '?' + (q ? q + '&' : '') + '__nopf=1');
        const b = await shot();
        same = a.equals(b);
      }
      ok(same, `${pg.name} pfなし ${w}x${h}: pf.js を外したページとピクセルが同じ`);
    }
    await freeze(false);
    await size(1280, 800);
  }

  // ページを移っても pf のまま：一覧 → 建設 → フッターの「ほかのスタジオ」（不動産・フリーランス）→ 一覧
  await go('/studio/?pf=1');
  await ev(`document.querySelector('a.card[href*="kensetsu"]').click()`); await sleep(300);
  await ev('new Promise(r => document.readyState === "complete" ? r() : addEventListener("load", r))'); await ev('document.fonts.ready');
  let loc = await ev('location.pathname + location.search');
  ok(/^\/studio\/kensetsu\/\?pf=1$/.test(loc), `一覧→建設で pf=1 のまま（${loc}）`);
  ok((await ev(STATE)).line === 0 && (await ev(STATE)).promo === 0, '一覧→建設で LINE・帯なし');
  await go('/studio/fudosan/?pf=1');
  await ev(`[...document.querySelectorAll('a')].find(a => /\\/studio\\/\\?/.test(a.getAttribute('href'))).click()`); await sleep(500);
  await ev('new Promise(r => document.readyState === "complete" ? r() : addEventListener("load", r))');
  loc = await ev('location.pathname + location.search');
  ok(loc === '/studio/?pf=1', `不動産→一覧で pf=1 のまま（${loc}）`);
  ok(await ev(`!document.querySelector('a[href*="trading"]') && !document.querySelector('a[href*="custom"]')`), '一覧 ?pf=1：Trading・作り変えのカードなし');
  // pf=0 や pf=10 は今のまま
  for (const v of ['0', '10', 'true']) { await go('/studio/kensetsu/?pf=' + v); const s = await ev(STATE); ok(s.line === 1 && s.promo === 2 && !s.pfClass, `?pf=${v} は今のまま`); }

  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    await size(1280, 800);
    for (const st of STUDIOS) {
      await go(`/studio/${st}/?pf=1&${TODAY}`);   // 見本データが自然に見える日（建設・経理などの見本は10/22基準）
      await ev('new Promise(r => setTimeout(r, 600))');
      const png = Buffer.from((await C.send('Page.captureScreenshot', { format: 'png' })).data, 'base64');
      fs.writeFileSync(path.join(SHOTS, `${st}_pf_1280x800.png`), png);
    }
    console.log('shots: ' + SHOTS);
  }
}

setTimeout(() => { console.log('ERROR: 時間切れ（240秒）'); stopChrome(); process.exit(1); }, 240000).unref();
main().catch(e => { fail++; console.log('ERROR: ' + e.message); }).finally(() => {
  stopChrome(); server.close();
  setTimeout(() => { fs.rmSync(PROFILE, { recursive: true, force: true }); console.log(`pf.e2e: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }, 800);
});
