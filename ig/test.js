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
  { slug: 'fudosan', id: 9061394, price: 9800, name: '不動産スタジオ' },
];
const SETS = [
  { slug: 'kensetsu', id: 9025293, price: 6980 },
  { slug: 'kuruma', id: 9026647, price: 4980 },
  { slug: 'keiri', id: 9001410, price: 3980 },
];

// ---- 基本 ----
eq(/<meta name="robots" content="noindex,nofollow">/.test(html), true, 'noindex');
eq(/googlesyndication|adsbygoogle|ads-inter/.test(html), false, '全画面広告・AdSenseなし');
// 11/25 将さん『アフィリエイトもやっていいよ』：A8のテキストリンクを PR の欄に1か所だけ。画像・表示計測（0.gif）は読まない＝新しい通信先を足さない
const a8 = [...html.matchAll(/https?:\/\/[^"\s]*a8\.net[^"\s]*/g)].map(m => m[0]);
eq(a8, ['https://px.a8.net/svt/ejp?a8mat=4BEK9L+5CX82+4JGQ+60WN6'], 'A8はマネーフォワード クラウド会計のテキストリンク1つだけ');
eq(/<img[^>]+a8\.net/.test(html), false, 'A8の画像・表示計測は読まない');
const prBox = (html.match(/<aside class="pr-box" aria-label="広告・PR">[\s\S]*?<\/aside>/) || [''])[0];
eq(prBox.includes('<span class="pr-tag">PR</span>') && prBox.includes('広告（アフィリエイトリンク）'), true, 'PRの表示と広告である旨');
eq(prBox.includes('rel="nofollow sponsored noopener"') && prBox.includes('target="_blank"'), true, 'A8のリンクは sponsored・新しいタブ');
eq(html.indexOf('class="pr-box"') > html.indexOf('id="line"'), true, 'PRの欄は入口・スタジオ・相談より下');
eq(/img-src[^;]*a8\.net/.test(html), false, 'CSPにA8の画像は足していない');
// テキストは承認済みのA8タグ（blog/private/a8_tags_dx_20261019.json）と同じ
try { const tags = require('../../../blog/private/a8_tags_dx_20261019.json'); const t = tags.s00000021185001.text; eq(t.includes('a8mat=4BEK9L+5CX82+4JGQ+60WN6') && prBox.includes('>' + (t.match(/>([^<]+)<\/a>/) || [])[1] + '</a>'), true, 'A8のテキストリンクは承認済みタグと同じ文言'); } catch (e) { /* 控えのファイルがない環境では省略 */ }
// 10/25 将さん：アクセス解析（GA）は入れる。スクリプトはGAの2つだけ
const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/gi)].map(m => m[1]);
eq(scripts.slice(0, 2), ['https://www.googletagmanager.com/gtag/js?id=G-EWJXRJY9M6', '../assets/ga.js?v=202610210745'], 'スクリプトはアクセス解析（GA）の2つ');
eq(scripts.length === 4 && /^\.\.\/studio\/kensetsu\/free\/mobile\.js\?v=\d+$/.test(scripts[2]), true, 'ほかは「自分に送る」の部品（無料版と同じ mobile.js）');
eq(/^ig\.js\?v=\d+$/.test(scripts[3] || ''), true, '4つ目はクリックの計測（ig.js、同じサイトのファイル）');
eq(/<script(?![^>]*src=)/i.test(html), false, 'インラインのスクリプトなし');
eq(/リールで見た画面は、ここから/.test(html), true, '一言の見出し');
for (const w of ['おすすめ', '今だけ', '限定', '残りわずか', '最安']) eq(html.includes(w), false, '売り込み言葉なし：' + w);
eq(/AIを活用|AIで作/.test(html), false, 'AIの文言がない');
eq(/Eternal Philosophy（EQUA）/.test(html), true, '運営表記');
eq(/推奨環境：パソコンの Google Chrome/.test(html), true, '推奨環境を書く');
eq(/確認していません|未確認|確かめていません|確認したのは/.test(html), false, '確認していないことを書かない');
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
eq(sm.includes('/ig/'), false, 'サイトマップに載せない');

// ---- アプリ版4枚 ----
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
  if (a.slug === 'kensetsu') eq(card.includes('href="/studio/kensetsu/free/"'), true, a.name + ' 無料版ダウンロードへのリンク');
  eq(card.includes('src="assets/' + a.slug + '.jpg"'), true, a.name + ' サムネ');
  eq(fs.existsSync(path.join(__dirname, 'assets', a.slug + '.jpg')), true, a.name + ' サムネのファイル');
  // BOOTHの控えにあれば一致（公開前は控えにないので省略）
  if (snap[a.id]) eq(snap[a.id].price, a.price, a.name + ' BOOTHの控えと一致');
}

// ---- Excel版：11/25 数を絞って、選び方ページへの1行に（セットの価格は /erabikata/ のテストで照合）----
eq(html.includes('<a class="row" href="/erabikata/" data-ig="excel_erabikata">'), true, 'Excel版は選び方ページへの1行');
for (const s of SETS) eq(snap[s.id] && snap[s.id].price, s.price, s.slug + ' セット価格の控え（--live で公開ページと照合）');

// ---- リンク：サイト内パスは存在、外部は booth.pm と equaglobal.com だけ ----
const hrefs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]).filter(h => !/googletagmanager\.com/.test(h)).map(h => h.replace(/\?.*$/, ''));
let ext = 0;
for (const h of hrefs) {
  if (h.startsWith('#')) {
    eq(html.includes('id="' + h.slice(1) + '"'), true, 'ページ内の飛び先が存在：' + h);
  } else if (/^https?:/.test(h)) {
    ext++;
    const host = new URL(h).hostname;
    eq(/(^|\.)booth\.pm$/.test(host) || /(^|\.)equaglobal\.com$/.test(host) || h === 'https://line.me/R/ti/p/@736dykzx' || h === 'https://px.a8.net/svt/ejp', true, '外部URLは booth.pm / equaglobal.com / 公式LINE / A8（PR1つ）だけ：' + h);
  } else {
    const p = h.startsWith('/') ? path.join(ROOT, h) : path.join(__dirname, h);
    const f = h.endsWith('/') ? path.join(p, 'index.html') : p;
    eq(fs.existsSync(f), true, 'リンク先が存在：' + h);
  }
}
eq(ext, 6, '外部リンクの数（BOOTH4＝スタジオ4種、公式LINE1、A8のPR1）');
// 11/7 スマホの人の次の手：買えることの1行・自分に送る・計算のリールの入口・LINEの案内
const SP = 'スマホで買って、あとでパソコンでダウンロードできます';
eq((html.match(new RegExp('<p class="sp">' + SP + '</p>', 'g')) || []).length, 4, 'スマホで買える1行：アプリ版の4枚すべて');
for (const a of APPS) { const i = html.indexOf('<section class="card" id="' + a.slug + '"'); const c = html.slice(i, html.indexOf('</section>', i)); eq(c.includes('<p class="sp">' + SP + '</p>') && c.indexOf('<p class="sp">') > c.indexOf('BOOTHで見る'), true, a.name + ' 1行はボタンの下'); }
eq(/<aside class="mobile-note" id="mobileNote" hidden[^>]*><button type="button" class="mn-btn" id="sendToSelf" data-ig="send_to_self" data-share-title="[^"]+">パソコンで開くために、このページを自分に送る<\/button><p class="mn-msg" id="mobileMsg"/.test(html), true, '自分に送る（スマホだけ出す部品）');
eq(fs.existsSync(path.join(ROOT, 'studio/kensetsu/free/mobile.js')), true, 'mobile.js がある');
// ---- 11/25 1本道：いちばん上に、伸びているリール（7掛けで仕入れて2割引きで売る）に合う入口を1つだけ ----
const hero = (html.match(/<section class="hero" id="calc"[\s\S]*?<\/section>/) || [''])[0];
eq(!!hero, true, '入口の欄がある');
eq(html.indexOf('class="hero"') < html.indexOf('id="studio"') && html.indexOf('class="hero"') > html.indexOf('<h1>'), true, '入口は見出しのすぐ下・スタジオより上');
eq((html.slice(0, html.indexOf('class="hero"')).match(/<a /g) || []).length, 1, '入口より上のリンクはパンくず1つだけ');
eq(hero.includes('7掛けで仕入れて、2割引きで売ったら？'), true, '入口の見出し＝リールの題材');
eq((hero.match(/class="btn /g) || []).length, 1, '大きいボタンは1つだけ');
eq(hero.includes('<a class="btn hero-go" href="/riekiritsu/" data-cta="ig_riekiritsu" data-ig="hero_riekiritsu">利益率を計算する（無料）</a>'), true, '入口のボタン＝既存の無料ツール riekiritsu');
eq(fs.existsSync(path.join(ROOT, 'riekiritsu/index.html')), true, 'riekiritsu がある');
// 例の数字：定価10,000円 → 7掛け7,000円・2割引き8,000円 → 1,000円・12.5%
{ const list = 10000, cost = list * 0.7, price = list * 0.8, profit = price - cost, rate = Math.round(profit / price * 1000) / 10;
  eq([cost, price, profit, rate], [7000, 8000, 1000, 12.5], '例の計算');
  const ex = (hero.match(/<div class="ex"[\s\S]*?<\/div>/) || [''])[0].replace(/<[^>]+>/g, '|');
  eq(['10,000円', '7,000円', '8,000円', '1,000円（利益率12.5%）'].every(w => ex.includes(w)), true, '例の数字の表示'); }
eq(/riekiritsu-uwanoseritsu-chigai/.test(hero) && fs.existsSync(path.join(ROOT, 'blog/riekiritsu-uwanoseritsu-chigai/index.html')), true, '入口の下に解説記事への小さいリンク');
eq(hero.includes('href="/suryo/"'), true, '数量の計算（suryo）は入口の下に小さく');
eq(/id="pack"|ig_suryo_pack|数量計算パック/.test(html), false, '数量計算パック（11/17 非公開）の行は残っていない');
const lb = html.slice(html.indexOf('<section class="card" id="line"'), html.indexOf('</section>', html.indexOf('<section class="card" id="line"')));
eq(lb.includes('「この表の集計を毎月手でやっている」「見積書と請求書を別々に作っている」など、困っていることを一言LINEで送ってください。今の業務に合わせたツールづくりのご相談を受けています。'), true, 'LINEの案内文');
eq(lb.includes('<a class="btn line" href="https://line.me/R/ti/p/@736dykzx" target="_blank" rel="noopener" data-cta="ig_line" data-ig="line">LINEで相談する</a>'), true, 'LINEのボタン（緑・計測の印）');
eq(/見積書を1枚/.test(html), false, '古い案内文は残っていない');
eq(/\bAI\b/.test(html.replace(/<[^>]+>/g, '')), false, 'AIと書かない');
// 業種ごとの飛び先（見本・無料版のページから /ig/#slug で来る）
// 11/25 上の業種ボタンは1本道のため外した。見本・無料版のページからの /ig/#slug はカードの id で受ける
for (const a of APPS) eq(html.includes('<section class="card" id="' + a.slug + '"'), true, a.name + ' カードのid（/ig/#' + a.slug + ' の飛び先）');
eq(/class="jump"/.test(html), false, '上の業種ボタンはない');
// ---- 11/25 クリックの計測：リンクとボタンすべてに data-ig（重なりなし）----
const tagsA = [...html.matchAll(/<a [^>]*>/g)].map(m => m[0]);
eq(tagsA.every(t => /data-ig="[a-z0-9_]+"/.test(t)), true, 'すべてのリンクに data-ig');
const igs = [...html.matchAll(/data-ig="([^"]+)"/g)].map(m => m[1]);
eq(igs.length, new Set(igs).size, 'data-ig は重ならない');
eq(igs.length, tagsA.length + 1, 'data-ig＝リンクの数＋「自分に送る」ボタン');
eq(/id="sendToSelf" data-ig="send_to_self"/.test(html), true, '「自分に送る」も数える');
const LINES = (html.match(/<a class="row"/g) || []).length;
eq(LINES <= 4, true, '下の行リンクは数を絞る（4つまで）：' + LINES);

// ---- ig.js：ig_click を gtag に渡すだけ ----
{
  const vm = require('vm');
  const src = fs.readFileSync(path.join(__dirname, 'ig.js'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  eq(/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|\.src\s*=|new Image|https?:\/\//.test(code), false, 'ig.js は自分で通信しない・外部URLを書かない');
  eq(/preventDefault|location\.href\s*=|window\.open/.test(code), false, 'ig.js はリンクの動きを変えない');
  eq((code.match(/'ig_click'/g) || []).length, 1, 'イベントは ig_click の1種類');
  const handlers = {}, sent = [];
  const ctx = { document: { nodeType: 9, addEventListener: (t, f) => { (handlers[t] = handlers[t] || []).push(f); } }, location: { pathname: '/ig/', hostname: 'tools.equaglobal.com' } };
  ctx.window = ctx; ctx.gtag = (...a) => sent.push(a);
  vm.createContext(ctx); vm.runInContext(src, ctx);
  const A = (href, ig) => { const u = new URL(href, 'https://tools.equaglobal.com/ig/'); return { nodeName: 'A', nodeType: 1, href: u.href, hostname: u.hostname, parentNode: ctx.document, getAttribute: n => n === 'data-ig' ? ig : null }; };
  const fire = (t, target, button) => (handlers[t] || []).forEach(f => f({ type: t, target, button: button || 0 }));
  fire('click', A('/riekiritsu/', 'hero_riekiritsu'));
  fire('click', { nodeName: 'SPAN', nodeType: 1, getAttribute: () => null, parentNode: A('https://excel-temple.booth.pm/items/9042496', 'kensetsu_booth') });
  fire('click', A('https://px.a8.net/svt/ejp?a8mat=X', 'pr_mf_kaikei'));
  fire('click', { nodeName: 'BUTTON', nodeType: 1, parentNode: ctx.document, getAttribute: n => n === 'data-ig' ? 'send_to_self' : null });
  fire('click', A('/x/', null));
  fire('auxclick', A('/riekiritsu/', 'hero_riekiritsu'), 2);
  fire('auxclick', A('/riekiritsu/', 'hero_riekiritsu'), 1);
  eq(JSON.parse(JSON.stringify(sent)), [
    ['event', 'ig_click', { ig_item: 'hero_riekiritsu', link_type: 'internal', link_url: 'https://tools.equaglobal.com/riekiritsu/', page_path: '/ig/', transport_type: 'beacon' }],
    ['event', 'ig_click', { ig_item: 'kensetsu_booth', link_type: 'external', link_url: 'https://excel-temple.booth.pm/items/9042496', page_path: '/ig/', transport_type: 'beacon' }],
    ['event', 'ig_click', { ig_item: 'pr_mf_kaikei', link_type: 'affiliate', link_url: 'https://px.a8.net/svt/ejp?a8mat=X', page_path: '/ig/', transport_type: 'beacon' }],
    ['event', 'ig_click', { ig_item: 'send_to_self', link_type: 'button', page_path: '/ig/', transport_type: 'beacon' }],
    ['event', 'ig_click', { ig_item: 'hero_riekiritsu', link_type: 'internal', link_url: 'https://tools.equaglobal.com/riekiritsu/', page_path: '/ig/', transport_type: 'beacon' }],
  ], 'ig_click：中の文字を押しても・外部・A8・ボタン・中ボタン、data-ig なしと右クリックは数えない');
  ctx.gtag = () => { throw new Error('x'); };
  let threw = false; try { fire('click', A('/riekiritsu/', 'hero_riekiritsu')); } catch (e) { threw = true; }
  eq(threw, false, 'gtag が失敗してもクリックは止めない');
  delete ctx.gtag; threw = false; try { fire('click', A('/riekiritsu/', 'hero_riekiritsu')); } catch (e) { threw = true; }
  eq(threw, false, 'gtag がなくても止まらない');
}

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
