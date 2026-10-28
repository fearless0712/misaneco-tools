// node studio/kensetsu/free/test.js … 建設スタジオ無料版ダウンロードページの決まり
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
let pass = 0, fail = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('FAIL', m, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b)); } };

// 計測はGAの2つだけ、広告なし
const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/gi)].map(m => m[1]);
eq(scripts, ['https://www.googletagmanager.com/gtag/js?id=G-EWJXRJY9M6', '../../../assets/ga.js?v=202610210745'], 'スクリプトはGAの2つだけ');
eq(fs.existsSync(path.join(__dirname, '../../../assets/ga.js')), true, 'ga.js のパスが正しい');
eq(/<script(?![^>]*src=)/i.test(html), false, 'インラインのスクリプトなし');
eq(/googlesyndication|adsbygoogle|a8\.net|ads-inter|mnad-/.test(html), false, '広告なし');
eq(/noindex/.test(html), false, '検索に載せる（noindexなし）');
eq(html.includes('<link rel="canonical" href="https://tools.equaglobal.com/studio/kensetsu/free/">'), true, 'canonical');
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
eq(sm.includes('<loc>https://tools.equaglobal.com/studio/kensetsu/free/</loc>'), true, 'サイトマップに載っている');

// 文言
eq(/AI/.test(html.replace(/<[^>]+>/g, '')), false, 'AIの文言がない');
for (const w of ['今だけ', '限定', '残りわずか', '最安', '最強', '完璧', '誰でも簡単', '絶対']) eq(html.includes(w), false, '誇大・売り込み言葉なし：' + w);
eq(/動作を確認したのは Mac の Google Chrome だけです/.test(html) && /Windows・Edge・Safari では確認していません/.test(html), true, '動作環境を正直に');
eq(/インターネットへの送信はしません/.test(html), true, 'データは外部送信なしと明記');
eq(/架空/.test(html), true, '画面は架空の見本と明記');
eq(/Eternal Philosophy（EQUA）/.test(html) && /MisaNeco Works/.test(html), true, '運営表記');

// 価格（BOOTH 9042496 の公開価格と同じ。ig/test.js の期待値とも同じ）
eq((html.match(/data-price="(\d+)">([^<]+)</) || []).slice(1), ['9800', '¥9,800'], '製品版の価格 ¥9,800');
eq(/¥\d/.test(html.replace(/data-price="9800">¥9,800/, '')), false, 'ほかに価格の表記なし');

// ダウンロード：同じサイトの zip に直接リンク、UTF-8名のzip、中身は約0.9MB
const dl = html.match(/<a class="dl" id="download" href="([^"]+)" download="([^"]+)">/);
eq(dl && dl[2], '建設スタジオ_無料版_v1.0.zip', 'ダウンロードボタン');
const zp = dl && path.join(__dirname, dl[1]);
eq(!!zp && fs.existsSync(zp), true, 'zip がある');
if (zp && fs.existsSync(zp)) {
  const b = fs.readFileSync(zp);
  eq(b.slice(0, 4).toString('hex'), '504b0304', 'zip の形式');
  eq(b.length > 800000 && b.length < 1000000, true, 'zip のサイズ（約0.9MB）');
  eq((b.readUInt16LE(6) & 0x800) !== 0, true, 'zip のファイル名はUTF-8フラグ付き');
}

// リンク：外部はGoogle Fonts・GAだけ、サイト内は存在、製品版は /ig/#studio 経由
const hrefs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]).map(h => h.replace(/[?#].*$/, ''));
for (const h of hrefs) {
  if (/^https?:/.test(h)) eq(/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|www\.googletagmanager\.com|tools\.equaglobal\.com\/studio\/kensetsu\/free\/$)/.test(h), true, '外部URLは Fonts・GA・自分のcanonicalだけ：' + h);
  else {
    const p = h.startsWith('/') ? path.join(ROOT, h) : path.join(__dirname, h);
    eq(fs.existsSync(h.endsWith('/') ? path.join(p, 'index.html') : p), true, 'リンク先が存在：' + h);
  }
}
eq(html.includes('href="/ig/#studio"'), true, '製品版へは /ig/#studio 経由');
eq(/booth\.pm|BOOTH/.test(html), false, 'BOOTHの名前・URLは直接書かない');
eq((html.match(/<img [^>]*alt="[^"]+"/g) || []).length, 3, 'スクショ3枚（alt付き）');

console.log('free/test.js: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
