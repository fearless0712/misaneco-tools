// node test.js          … データ・計算・HTMLの検査（BOOTHの控え booth_snapshot.json と照合）
// node test.js --live   … 上に加えて、BOOTHの公開ページ（items/ID.json）を取得して価格・公開状態を照合
'use strict';
const fs = require('fs');
const path = require('path');
const { SHOP, pages } = require('./data.js');
const { setMath } = require('./build.js');
const snap = require('./booth_snapshot.json').items;

let pass = 0, fail = 0;
function eq(a, b, msg) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) pass++; else { fail++; console.log('NG', msg, '\n   got', JSON.stringify(a), '\n   exp', JSON.stringify(b)); }
}
const rd = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

// ---- 期待値（依頼文の価格表を、テスト側に独立して持つ）----
const EXPECT = {
  kensetsu: { set: [9025293, 6980], items: { 9026735: 1480, 9026749: 1480, 9026757: 1480, 9026768: 1480, 9026778: 1480, 9026794: 980, 9026800: 980, 9026808: 980, 9026818: 980 }, total: 11320, diff: 4340 },
  kuruma: { set: [9026647, 4980], items: { 9026828: 1480, 9026833: 1480, 9026841: 1480, 9026852: 1480, 9026859: 980, 9026865: 980 }, total: 7880, diff: 2900 },
  keiri: { set: [9001410, 3980], items: { 9001234: 1980, 8999920: 1980, 9001463: 1980, 9001432: 1980, 9001366: 1980, 9001443: 1980, 9000204: 2480, 8999860: 1980, 9003228: 0 }, total: 5940, diff: 1960 },
};

// ---- データ ----
for (const [slug, ex] of Object.entries(EXPECT)) {
  const p = pages[slug];
  eq([p.set.id, p.set.price], ex.set, slug + ' セットのIDと価格');
  eq(Object.fromEntries(p.items.map(i => [i.id, i.price])), ex.items, slug + ' 単品のIDと価格');
  const m = setMath(p);
  eq(m.total, ex.total, slug + ' 単品合計');
  eq(m.diff, ex.diff, slug + ' 差額');
  eq(m.diff, ex.total - ex.set[1], slug + ' 差額＝合計−セット');
  // セットの中身が全部単品にある
  eq(m.singles.every(Boolean), true, slug + ' セットの中身が単品一覧にある');
  // 控え（BOOTH公開ページから取得）と一致
  for (const id of [p.set.id, ...p.items.map(i => i.id)]) {
    const it = p.set.id === id ? p.set : p.items.find(i => i.id === id);
    eq(!!snap[id], true, slug + ' BOOTHの控えにある ' + id);
    if (snap[id]) eq(snap[id].price, it.price, slug + ' BOOTHの価格と一致 ' + id);
  }
  // ID重複なし
  const ids = p.items.map(i => i.id);
  eq(new Set(ids).size, ids.length, slug + ' 単品IDの重複なし');
  // 「楽になること」が1行（改行なし・長すぎない）
  p.items.forEach(i => eq(/\n/.test(i.ease) || i.ease.length > 90, false, slug + ' 楽になることが1行 ' + i.name));
}
// 建設・車屋のセットは単品を全部含む
eq(pages.kensetsu.set.items.length, pages.kensetsu.items.length, '建設セット＝9本');
eq(pages.kuruma.set.items.length, pages.kuruma.items.length, '車屋セット＝6本');
// 経理3点セットの中身（BOOTH説明文：KichoAuto・電帳リネーム・MoneyLens）
eq(setMath(pages.keiri).singles.map(i => i.id).sort(), [8999920, 9001234, 9001366], '経理3点セットの中身');
// オールインワン：価格と、20本の単品合計（BOOTHでは単品合計¥39,100・¥29,300お得と表示）
const big = pages.keiri.bigSet;
eq([big.id, big.price, snap[big.id] && snap[big.id].price], [9001507, 9800, 9800], 'オールインワンのIDと価格');
eq(big.contents.length, 20, 'オールインワン20本');
const bigTotal = big.contents.reduce((a, id) => a + (snap[id] ? snap[id].price : NaN), 0);
eq([bigTotal, bigTotal - big.price], [39100, 29300], 'オールインワンの単品合計と差額（BOOTHの表記と一致）');
eq(pages.keiri.items.filter(i => i.price > 0).every(i => big.contents.includes(i.id)), true, '経理表の有料ツールはすべてオールインワンに含まれる');

// ---- HTML ----
const files = { index: 'index.html', kensetsu: 'kensetsu/index.html', kuruma: 'kuruma/index.html', keiri: 'keiri/index.html' };
const yen = n => n === 0 ? '無料' : '¥' + n.toLocaleString('en-US');
for (const [slug, f] of Object.entries(files)) {
  const html = rd(f);
  // 外部URLは BOOTH（excel-temple.booth.pm/items/）と自サイトだけ
  const urls = (html.match(/https?:\/\/[^"'\s<)]+/g) || []);
  eq(urls.filter(u => !(u.startsWith(SHOP) || u.startsWith('https://tools.equaglobal.com/'))), [], f + ' 外部URLはBOOTHと自サイトだけ');
  eq(/googletagmanager|gtag|ads-inter|a8\.net|adsbygoogle|<script/i.test(html), false, f + ' 広告・スクリプトなし');
  eq(/今だけ|必ず|限定|残りわずか|急いで|お見逃し/.test(html), false, f + ' 煽りの言葉なし');
  eq(/<meta name="viewport" content="width=device-width,initial-scale=1">/.test(html), true, f + ' viewport');
  eq(/Eternal Philosophy（EQUA）/.test(html) && /MisaNeco Works/.test(html), true, f + ' 運営表記');
  // 自サイト内リンクの行き先が存在する
  const locals = [...html.matchAll(/(?:href|src)="([^"#]+)"/g)].map(m => m[1]).filter(u => !/^https?:/.test(u));
  for (const u of locals) {
    const abs = u.startsWith('/') ? path.join(__dirname, '..', u) : path.join(__dirname, path.dirname(f), u);
    const target = fs.existsSync(abs) && fs.statSync(abs).isDirectory() ? path.join(abs, 'index.html') : abs;
    eq(fs.existsSync(target), true, f + ' リンク先がある ' + u);
  }
  if (slug === 'index') {
    for (const s of ['kensetsu', 'kuruma', 'keiri']) eq(html.includes(`href="${s}/"`), true, 'index → ' + s);
    continue;
  }
  const p = pages[slug], m = setMath(p);
  // BOOTHリンク：HTML内のIDの集合 ＝ データのIDの集合、hrefとdata-booth-idが一致
  const links = [...html.matchAll(/href="(https:\/\/[^"]+)"[^>]*data-booth-id="(\d+)"/g)];
  const all = [...html.matchAll(/https:\/\/excel-temple\.booth\.pm\/items\/(\d+)/g)].map(x => +x[1]);
  links.forEach(l => eq(l[1], SHOP + l[2], f + ' hrefとIDが一致 ' + l[2]));
  eq(links.length, all.length, f + ' BOOTHリンクはすべてdata-booth-id付き');
  const want = [p.set.id, ...p.items.map(i => i.id), ...(p.bigSet ? [p.bigSet.id] : [])];
  eq([...new Set(all)].sort(), [...new Set(want)].sort(), f + ' BOOTHリンクのID＝データ');
  all.forEach(id => eq(!!snap[id], true, f + ' リンク先がBOOTHの公開商品 ' + id));
  // 価格・合計・差額の表示
  eq(html.includes(`data-set-price="${p.set.price}">${yen(p.set.price)}<`), true, f + ' セット価格の表示');
  eq(html.includes(`data-single-total="${m.total}">${yen(m.total)}<`), true, f + ' 単品合計の表示');
  eq(html.includes(`data-diff="${m.diff}">${yen(m.diff)}<`), true, f + ' 差額の表示');
  p.items.forEach(i => eq(html.includes(`<tr data-item="${i.id}">`) && html.includes(`data-price="${i.price}">${yen(i.price)}<`), true, f + ' 単品の行と価格 ' + i.name));
  // 構成：セット → 困りごと → 見本 → 注意 の順
  const order = ['迷ったらこれ', '困りごとから選ぶ', '実際に触れる見本', 'ご注意'].map(s => html.indexOf('<h2>' + s));
  eq(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])), true, f + ' 構成の順番');
  eq(html.includes(`href="${p.studio.href}"`), true, f + ' スタジオへのリンク');
  eq(/外部には送信されません/.test(html) && /架空/.test(html), true, f + ' データの置き場所・架空の注意');
  if (slug === 'keiri') eq(/国税庁/.test(html) && /税理士/.test(html), true, f + ' 税は国税庁・専門家へ');
  else eq(/Googleスプレッドシート/.test(html) && /Excel/.test(html), true, f + ' Excel・スプレッドシートで使える');
  eq(/<img src="\.\.\/assets\/[\w-]+\.jpg" alt="[^"]+"/.test(html), true, f + ' セット画像（自サイト内）');
}

// ---- スタジオからの導線 ----
for (const s of ['kensetsu', 'kuruma', 'keiri']) {
  const h = fs.readFileSync(path.join(__dirname, '..', 'studio', s, 'index.html'), 'utf8');
  eq(h.includes(`href="/erabikata/${s}/"`) && (h.includes('この業務のExcel版を選ぶ →')||h.includes('この業務のツールを選ぶ →')), true, 'studio/' + s + ' → 選び方ページ');
}
// ---- サイトマップ ----
const sm = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
['', 'kensetsu/', 'kuruma/', 'keiri/'].forEach(s => eq(sm.includes(`<loc>https://tools.equaglobal.com/erabikata/${s}</loc>`), true, 'sitemap ' + s));

async function live() {
  const ids = Object.keys(snap);
  for (const id of ids) {
    try {
      const r = await fetch(`https://booth.pm/ja/items/${id}.json`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      eq(r.status, 200, 'live 公開中 ' + id);
      if (r.ok) { const d = await r.json(); eq(d.variations[0].price, snap[id].price, 'live 価格 ' + id); }
      const pg = await fetch(SHOP + id, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
      eq(pg.status, 200, 'live 商品ページ ' + id);
    } catch (e) { eq(String(e), 'ok', 'live 取得 ' + id); }
  }
}

(async () => {
  if (process.argv.includes('--live')) await live();
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
