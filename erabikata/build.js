// node build.js → erabikata/index.html と kensetsu/・kuruma/・keiri/ の index.html を作る
'use strict';
const fs = require('fs');
const path = require('path');
const { SHOP, pages } = require('./data.js');

const yen = n => n === 0 ? '無料' : '¥' + n.toLocaleString('en-US');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const booth = id => SHOP + id;
const BASE = 'https://tools.equaglobal.com/erabikata/';

function setMath(p) {
  const singles = p.set.items.map(no => p.items.find(i => i.no === no));
  const total = singles.reduce((a, i) => a + i.price, 0);
  return { singles, total, diff: total - p.set.price };
}

const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'">`;

function css(c) {
  return `:root{--bg:${c.bg};--panel:${c.panel};--panel2:${c.panel2};--line:${c.line};--text:${c.text};--dim:${c.dim};--acc:${c.acc};--acc2:${c.acc2};--accInk:${c.accInk}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:"Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif;font-size:16px;line-height:1.75;-webkit-font-smoothing:antialiased}
a{color:var(--acc2)}
main{max-width:960px;margin:0 auto;padding:28px 16px 56px}
.crumb{font-size:13px;color:var(--dim);margin:0 0 14px}.crumb a{color:var(--dim)}
h1{font-size:26px;line-height:1.4;margin:0 0 8px}
.lead{color:var(--dim);margin:0 0 26px}
h2{font-size:20px;margin:40px 0 6px;padding-left:12px;border-left:4px solid var(--acc)}
.sub{color:var(--dim);font-size:14px;margin:0 0 14px}
.hero{background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden;display:grid;grid-template-columns:1fr;gap:0}
.hero img{display:block;width:100%;height:auto;background:#fff}
.hero .body{padding:18px 18px 20px}
.tag{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.04em;color:var(--accInk);background:var(--acc);border-radius:999px;padding:2px 10px;margin-bottom:8px}
.hero h3{font-size:20px;line-height:1.45;margin:0 0 8px}
.hero p{margin:0 0 12px;color:var(--dim);font-size:15px}
.price{font-size:30px;font-weight:800;color:var(--text);margin:4px 0 2px;font-variant-numeric:tabular-nums}
.calc{width:100%;border-collapse:collapse;font-size:14px;margin:8px 0 14px;font-variant-numeric:tabular-nums}
.calc td{padding:6px 0;border-bottom:1px solid var(--line)}.calc td:last-child{text-align:right;white-space:nowrap}
.calc tr.diff td{color:var(--acc2);font-weight:700;border-bottom:0}
.btn{display:inline-block;background:var(--acc);color:var(--accInk);font-weight:700;text-decoration:none;border-radius:10px;padding:12px 20px;min-height:44px}
.btn:hover{filter:brightness(1.08)}
.btn.ghost{background:transparent;color:var(--acc2);border:1px solid var(--acc);padding:9px 16px;font-size:14px}
.also{margin-top:14px;background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:14px 16px;font-size:14px;color:var(--dim)}
.also b{color:var(--text)}
table.pick{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);border-radius:14px;overflow:hidden;font-size:15px}
table.pick th{background:var(--panel2);color:var(--dim);font-size:13px;font-weight:600;text-align:left;padding:10px 12px;border-bottom:1px solid var(--line)}
table.pick td{padding:14px 12px;border-bottom:1px solid var(--line);vertical-align:top}
table.pick tr:last-child td{border-bottom:0}
.pain{font-weight:700}
.nm{font-weight:700;color:var(--acc2)}
.pr{font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums}
.ease{color:var(--dim);font-size:14px;margin-top:2px}
.env{display:inline-block;font-size:11px;color:var(--dim);border:1px solid var(--line);border-radius:6px;padding:0 6px;margin-left:6px;vertical-align:2px}
td.go{text-align:right;white-space:nowrap}
.studio{display:block;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px;color:var(--text);text-decoration:none}
.studio:hover{border-color:var(--acc)}
.studio b{color:var(--acc2);font-size:18px}.studio span{display:block;color:var(--dim);font-size:14px;margin-top:4px}
ul.notes{margin:0;padding:16px 16px 16px 34px;background:var(--panel);border:1px solid var(--line);border-radius:14px;color:var(--dim);font-size:14px}
ul.notes li{margin:4px 0}
footer{margin-top:40px;font-size:13px;color:var(--dim)}footer a{color:var(--dim)}
.brand{margin-top:6px}
@media (min-width:760px){
  h1{font-size:30px}
  .hero{grid-template-columns:1.15fr 1fr}
  .hero img{height:100%;object-fit:contain;background:#fff}
  .hero .body{padding:24px}
}
@media (max-width:700px){
  table.pick thead{display:none}
  table.pick,table.pick tbody,table.pick tr,table.pick td{display:block;width:100%}
  table.pick tr{padding:14px 14px 16px;border-bottom:1px solid var(--line)}
  table.pick tr:last-child{border-bottom:0}
  table.pick td{padding:0;border:0}
  table.pick td.c-pain{margin-bottom:6px;font-size:15px}
  table.pick td.c-pain::before{content:"困りごと";display:block;font-size:11px;color:var(--dim);font-weight:400}
  table.pick td.go{text-align:left;margin-top:10px}
}
`;
}

function head(title, desc, canonical, c) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${CSP}
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<style>
${css(c)}</style>
</head>
<body>
<main>
`;
}

const FOOT = `<footer>
<p>価格はBOOTHの商品ページで2026年10月25日に確かめたものです。購入の前に、BOOTHの商品ページで最新の内容と価格をご確認ください。ツールは公開前に動作をテストしています。</p>
<p class="brand"><a href="/">MisaNeco Works ツール集</a> ／ 運営：Eternal Philosophy（EQUA）</p>
</footer>
</main>
</body>
</html>
`;

function envLabel(env) { return env === 'excel' ? 'Excel・スプレッドシート' : 'ブラウザ'; }

function page(p) {
  const m = setMath(p);
  const c = p.color;
  let h = head(p.title, p.desc, BASE + p.slug + '/', c);
  h += `<p class="crumb"><a href="/">ツール集</a> ／ <a href="../">業種別の選び方</a> ／ ${esc(p.name)}</p>
<h1>${esc(p.name)}の業務ツール、どれを選ぶ？</h1>
<p class="lead">${esc(p.lead)}</p>

<h2>迷ったらこれ</h2>
<section class="hero" aria-label="セット商品">
<img src="${p.set.img}" alt="${esc(p.set.name)}の表紙画像" width="960" height="${p.slug === 'keiri' ? 960 : 720}">
<div class="body">
<span class="tag">セット</span>
<h3>${esc(p.set.name)}</h3>
<p>${esc(p.set.text)}</p>
<div class="price" data-set-price="${p.set.price}">${yen(p.set.price)}</div>
<table class="calc" aria-label="単品で買う場合との比較">
<tr><td>単品${m.singles.length}本を別々に買った合計</td><td data-single-total="${m.total}">${yen(m.total)}</td></tr>
<tr><td>セットの価格</td><td>${yen(p.set.price)}</td></tr>
<tr class="diff"><td>差額</td><td data-diff="${m.diff}">${yen(m.diff)}</td></tr>
</table>
<a class="btn" href="${booth(p.set.id)}" data-booth-id="${p.set.id}" target="_blank" rel="noopener">BOOTHで見る</a>
</div>
</section>
`;
  if (p.bigSet) {
    const b = p.bigSet;
    h += `<div class="also"><b>${esc(b.name)}　${yen(b.price)}</b><br>${esc(b.text)}<br><a href="${booth(b.id)}" data-booth-id="${b.id}" target="_blank" rel="noopener">BOOTHで見る</a></div>
`;
  }
  h += `
<h2>困りごとから選ぶ</h2>
<p class="sub">1本ずつでも買えます。リンクはBOOTHの商品ページです。</p>
<table class="pick">
<thead><tr><th>困りごと</th><th>合うツール・楽になること</th><th>価格</th><th></th></tr></thead>
<tbody>
`;
  for (const it of p.items) {
    h += `<tr data-item="${it.id}">
<td class="c-pain"><span class="pain">${esc(it.pain)}</span></td>
<td><span class="nm">${esc(it.name)}</span><span class="env">${envLabel(it.env)}</span><div class="ease">${esc(it.ease)}</div></td>
<td class="pr" data-price="${it.price}">${yen(it.price)}</td>
<td class="go"><a class="btn ghost" href="${booth(it.id)}" data-booth-id="${it.id}" target="_blank" rel="noopener">BOOTHで見る</a></td>
</tr>
`;
  }
  h += `</tbody>
</table>

<h2>実際に触れる見本</h2>
<p class="sub">買う前に、同じ計算のしかたの見本をブラウザで動かせます。</p>
<a class="studio" href="${p.studio.href}"><b>${esc(p.studio.name)} →</b><span>${esc(p.studio.text)}</span></a>

<h2>ご注意</h2>
<ul class="notes">
${p.notes.map(n => '<li>' + esc(n) + '</li>').join('\n')}
</ul>
`;
  h += FOOT;
  return h;
}

function indexPage() {
  const c = { bg: '#0b0f1a', panel: '#121a2b', panel2: '#162036', line: '#24304a', text: '#eef2f8', dim: '#9fb0c8', acc: '#9fb0c8', acc2: '#eef2f8', accInk: '#0b0f1a' };
  const title = '業種別の選び方｜建設・車屋・経理のツール、どれを買えばいい？';
  const desc = '建設・設備、車屋・バイク屋、経理・事務の業務ツールを、困りごとから選べるページです。迷ったときのセット、単品の一覧、実際に触れる見本へ。';
  let h = head(title, desc, BASE, c);
  h = h.replace('</style>', `.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
a.card{display:block;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:20px;color:var(--text);text-decoration:none}
a.card:hover{border-color:var(--c)}a.card h2{font-size:20px;margin:0 0 6px;padding:0;border:0;color:var(--c)}a.card p{margin:0;color:var(--dim);font-size:14px}
a.card .set{margin-top:10px;font-size:13px;color:var(--text)}
</style>`);
  const cards = [
    ['kensetsu', '#ff9a3c', '建設・設備', '見積・原価・請求入金・工程表・日報出面・期限・写真台帳・塗装計算・外注支払。塗装・水道・土木・電気の小さな会社に。'],
    ['kuruma', '#ff5d73', '車屋・バイク屋', '車検・点検台帳、整備見積・請求、ピット予約、部品在庫、中古車の原価、案内文の作成。'],
    ['keiri', '#5fd3b0', '経理・事務', '明細から仕訳帳、請求書の一括作成、入金の照合、請求書PDFの整理、勤怠の集計。'],
  ];
  h += `<p class="crumb"><a href="/">ツール集</a> ／ 業種別の選び方</p>
<h1>業種別の選び方</h1>
<p class="lead">どれを買えばいいか迷ったときのページです。業種を選ぶと、まとめて入ったセットと、困りごとから選べる単品の一覧が出ます。</p>
<div class="grid">
`;
  for (const [slug, col, name, text] of cards) {
    const p = pages[slug];
    h += `<a class="card" href="${slug}/" style="--c:${col}"><h2>${name} →</h2><p>${text}</p><p class="set">迷ったら：${esc(p.set.name)}（${yen(p.set.price)}）</p></a>
`;
  }
  h += `</div>
<p class="sub" style="margin-top:24px">実際に入力して試せる見本は <a href="/studio/">業種別スタジオ</a> にあります。見本のデータはすべて架空です。</p>
`;
  h += FOOT;
  return h;
}

function main() {
  const out = [];
  fs.writeFileSync(path.join(__dirname, 'index.html'), indexPage());
  out.push('index.html');
  for (const slug of Object.keys(pages)) {
    fs.mkdirSync(path.join(__dirname, slug), { recursive: true });
    fs.writeFileSync(path.join(__dirname, slug, 'index.html'), page(pages[slug]));
    out.push(slug + '/index.html');
  }
  console.log('wrote', out.join(', '));
}

if (require.main === module) main();
module.exports = { setMath, yen };
