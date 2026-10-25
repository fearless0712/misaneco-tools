// node ig/test.js         … IGまとめページのリンク・価格・外部URLの検査（BOOTHの控え erabikata/booth_snapshot.json と照合）
// node ig/test.js --live  … 上に加えて、BOOTHの公開ページ（items/ID.json）を取得して価格・公開状態を照合（BOOTH公開後に使う）
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const snap = require('../erabikata/booth_snapshot.json').items;

let pass = 0, fail = 0;
function eq(a, b, msg) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) pass++; else { fail++; console.log('NG', msg, '\n   got', JSON.stringify(a), '\n   exp', JSON.stringify(b)); }
}
const yen = n => '¥' + n.toLocaleString('en-US');

// ---- 期待値（依頼文の価格表をテスト側に独立して持つ）----
const APPS = [
  { slug: 'kensetsu', id: 9042496, price: 9800, name: '建設スタジオ' },
  { slug: 'kuruma', id: 9042525, price: 7800, name: '車屋・バイク屋スタジオ' },
  { slug: 'keiri', id: 9042539, price: 6800, name: '経理・事務スタジオ' },
];
const SETS = [
  { slug: 'kensetsu', id: 9025293, price: 6980 },
  { slug: 'kuruma', id: 9026647, price: 4980 },
  { slug: 'keiri', id: 9001410, price: 3980 },
];

// ---- 基本 ----
eq(/<meta name="robots" content="noindex,nofollow">/.test(html), true, 'noindex');
eq(/googlesyndication|adsbygoogle|a8\.net|ads-inter/.test(html), false, '広告なし');
// 10/25 将さん：アクセス解析（GA）は入れる。スクリプトはGAの2つだけ
const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/gi)].map(m => m[1]);
eq(scripts, ['https://www.googletagmanager.com/gtag/js?id=G-EWJXRJY9M6', '../assets/ga.js?v=202610210745'], 'スクリプトはアクセス解析（GA）の2つだけ');
eq(/<script(?![^>]*src=)/i.test(html), false, 'インラインのスクリプトなし');
eq(/リールで見た画面は、ここから/.test(html), true, '一言の見出し');
for (const w of ['おすすめ', '今だけ', '限定', '残りわずか', '最安']) eq(html.includes(w), false, '売り込み言葉なし：' + w);
eq(/AIを活用して作成/.test(html), true, 'AI活用の表記');
eq(/Eternal Philosophy（EQUA）/.test(html), true, '運営表記');
eq(/Macで動作を確認。Windowsは未確認/.test(html), true, '動作環境を正直に');
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
eq(sm.includes('/ig/'), false, 'サイトマップに載せない');

// ---- アプリ版3枚 ----
for (const a of APPS) {
  const url = 'https://excel-temple.booth.pm/items/' + a.id;
  const i = html.indexOf(url);
  eq(i > 0, true, a.name + ' BOOTHリンクあり');
  const card = html.slice(html.lastIndexOf('<section', i), html.indexOf('</section>', i));
  eq(card.includes('<h3>' + a.name + '</h3>'), true, a.name + ' カードの名前');
  eq(card.includes('data-price="' + a.price + '"'), true, a.name + ' 価格データ');
  eq(card.includes(yen(a.price) + '<small>'), true, a.name + ' 表示価格');
  eq(card.includes('BOOTHで見る（' + yen(a.price) + '）'), true, a.name + ' ボタンの価格');
  eq(card.includes('href="/studio/' + a.slug + '/"'), true, a.name + ' 見本リンク');
  eq(card.includes('src="assets/' + a.slug + '.jpg"'), true, a.name + ' サムネ');
  eq(fs.existsSync(path.join(__dirname, 'assets', a.slug + '.jpg')), true, a.name + ' サムネのファイル');
  // BOOTHの控えにあれば一致（公開前は控えにないので省略）
  if (snap[a.id]) eq(snap[a.id].price, a.price, a.name + ' BOOTHの控えと一致');
}

// ---- Excel版セット：表示価格＝控えの価格＝期待値 ----
for (const s of SETS) {
  eq(snap[s.id] && snap[s.id].price, s.price, s.slug + ' セット価格が booth_snapshot.json と一致');
  const re = new RegExp('href="/erabikata/' + s.slug + '/"[^]*?data-price="(\\d+)">([^<]+)<');
  const m = html.match(re);
  eq(m && [Number(m[1]), m[2]], [s.price, yen(s.price)], s.slug + ' セットの表示価格');
}

// ---- リンク：サイト内パスは存在、外部は booth.pm と equaglobal.com だけ ----
const hrefs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]).filter(h => !/googletagmanager\.com/.test(h)).map(h => h.replace(/\?.*$/, ''));
let ext = 0;
for (const h of hrefs) {
  if (/^https?:/.test(h)) {
    ext++;
    const host = new URL(h).hostname;
    eq(/(^|\.)booth\.pm$/.test(host) || /(^|\.)equaglobal\.com$/.test(host), true, '外部URLは booth.pm / equaglobal.com だけ：' + h);
  } else {
    const p = h.startsWith('/') ? path.join(ROOT, h) : path.join(__dirname, h);
    const f = h.endsWith('/') ? path.join(p, 'index.html') : p;
    eq(fs.existsSync(f), true, 'リンク先が存在：' + h);
  }
}
eq(ext, 3, '外部リンクの数（BOOTH3。相談の欄は10/25に外した）');

async function live() {
  const ids = [...APPS.map(a => [a.id, a.price, a.name]), ...SETS.map(s => [s.id, s.price, s.slug + 'セット'])];
  for (const [id, price, name] of ids) {
    try {
      const r = await fetch('https://booth.pm/ja/items/' + id + '.json', { headers: { 'User-Agent': 'Mozilla/5.0 (ig hub test)' } });
      eq(r.status, 200, name + ' BOOTH公開中 ' + id);
      if (r.ok) { const j = await r.json(); eq(j.variations && j.variations[0] ? j.variations[0].price : Number(String(j.price).replace(/[^\d]/g, '')), price, name + ' BOOTHの公開価格 ' + id); }
    } catch (e) { eq(String(e), 'ok', name + ' BOOTH取得 ' + id); }
  }
}

(async () => {
  if (process.argv.includes('--live')) await live();
  console.log(`ig/test.js: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
