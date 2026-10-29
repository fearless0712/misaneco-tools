// node studio/kensetsu/free/test.js … 建設スタジオ無料版ダウンロードページの決まり
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
let pass = 0, fail = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('FAIL', m, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b)); } };

// 計測はGAの2つだけ、広告なし
const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/gi)].map(m => m[1]);
eq(scripts, ['https://www.googletagmanager.com/gtag/js?id=G-EWJXRJY9M6', '../../../assets/ga.js?v=202610210745', 'mobile.js?v=202610282400'], 'スクリプトはGAの2つとスマホ案内だけ');
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
eq(/推奨環境：パソコンの Google Chrome/.test(html), true, '推奨環境を書く');
eq(/確認していません|未確認|確かめていません|確認したのは/.test(html), false, '確認していないことを書かない');
eq(/インターネットへの送信はしません/.test(html), true, 'データは外部送信なしと明記');
eq(/架空/.test(html), true, '画面は架空の見本と明記');
eq(/Eternal Philosophy（EQUA）/.test(html) && /MisaNeco Works/.test(html), true, '運営表記');

// 価格（BOOTH 9042496 の公開価格と同じ。ig/test.js の期待値とも同じ）
eq((html.match(/data-price="(\d+)">([^<]+)</) || []).slice(1), ['9800', '¥9,800'], '製品版の価格 ¥9,800');
eq(/¥\d/.test(html.replace(/data-price="9800">¥9,800/, '')), false, 'ほかに価格の表記なし');

// ダウンロード：同じサイトの zip に直接リンク、UTF-8名のzip、中身は約0.9MB
const dl = html.match(/<a class="dl" id="download" href="([^"]+)" download="([^"]+)">/);
eq(dl && dl[2], '建設スタジオ_無料版_v1.0.1.zip', 'ダウンロードボタン');
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

// ===== スマホで来た人への案内（mobile.js） =====
const M = require('./mobile.js');
const src = fs.readFileSync(path.join(__dirname, 'mobile.js'), 'utf8');
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IG_IPHONE = IPHONE + ' Instagram 350.0.0.0 (iPhone15,2; iOS 17_5; ja_JP)';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const mmQ = []; const mm = (hit) => (q) => { mmQ.push(q); return { matches: hit }; };
eq(M.isPhone({ userAgent: IPHONE }, mm(false)), true, '表示条件：iPhoneのUA');
eq(M.isPhone({ userAgent: IG_IPHONE }, mm(false)), true, '表示条件：Instagramのアプリ内ブラウザ（iPhone）');
eq(M.isPhone({ userAgent: ANDROID }, mm(false)), true, '表示条件：AndroidスマホのUA');
eq(M.isPhone({ userAgent: MAC }, mm(true)), true, '表示条件：UAがパソコン風でも、幅が狭いタッチ端末なら出す');
eq(mmQ.includes('(max-width: 760px) and (pointer: coarse)'), true, 'matchMedia は「幅が狭い」かつ「タッチ」で判定');
eq(M.isPhone({ userAgent: MAC }, mm(false)), false, '出さない：Mac');
eq(M.isPhone({ userAgent: WIN }, mm(false)), false, '出さない：Windows');
eq(M.isPhone({ userAgent: MAC }, null), false, '判定できない（matchMediaなし）→パソコン扱い');
eq(M.isPhone(undefined, undefined), false, '判定できない（両方なし）→パソコン扱い');
eq(M.isPhone({}, () => { throw new Error('x'); }), false, 'matchMedia がエラー→パソコン扱い');
eq(M.isPhone({ userAgent: MAC }, () => ({})), false, 'matchMedia の結果が不明→パソコン扱い');

// HTML：案内は最初は隠す（JSなし・パソコンでは今のダウンロードボタンが一番上）
const note = html.match(/<aside class="mobile-note" id="mobileNote" hidden[^>]*>([\s\S]*?)<\/aside>/);
eq(!!note, true, '案内は hidden で置く（パソコン・JSなしでは出ない）');
eq(html.indexOf('id="mobileNote"') < html.indexOf('class="crumb"') && html.indexOf('id="mobileNote"') < html.indexOf('id="download"'), true, '案内はページの一番上（ダウンロードボタンより上）');
const nt = note ? note[1] : '';
eq(nt.includes('このアプリはパソコン用です（ネット不要・データは手元だけ）。'), true, '案内の文');
eq(/<button type="button" class="mn-btn" id="sendToSelf">パソコンで開くために、このページを自分に送る<\/button>/.test(nt), true, 'ボタン①');
eq(/<a class="mn-btn mn-sub" id="tryDemo" href="\/studio\/kensetsu\/">いまスマホで見本を触ってみる<\/a>/.test(nt), true, 'ボタン②は同じサイトの見本へ');
eq(/https?:/.test(nt), false, '案内の中に外部URLなし');

// 画面の動き（簡易DOM）
function fakeDom() {
  const els = {}, ls = {};
  const mk = (id) => (els[id] = { id, hidden: true, textContent: '', listeners: {}, addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); } });
  ['mobileNote', 'mobileMsg', 'sendToSelf'].forEach(mk); els.mobileNote.hidden = true;
  const appended = [];
  const doc = {
    getElementById: (id) => els[id] || null,
    querySelector: (s) => s === 'link[rel="canonical"]' ? { getAttribute: () => 'https://tools.equaglobal.com/studio/kensetsu/free/' } : null,
    createElement: () => ({ style: {}, setAttribute() {}, select() {} }),
    body: { appendChild: (t) => appended.push(t), removeChild() {} },
    execCommand: () => false,
  };
  return { els, doc, appended };
}
const net = []; // 通信の記録（何も入らないこと）
const winOf = (ua, mq, extra) => Object.assign({
  navigator: Object.assign({ userAgent: ua }, extra || {}),
  matchMedia: (q) => ({ matches: mq }),
  location: { origin: 'https://tools.equaglobal.com', pathname: '/studio/kensetsu/free/', href: 'https://tools.equaglobal.com/studio/kensetsu/free/?utm_source=ig' },
  fetch: (...a) => { net.push(['fetch', a]); return Promise.resolve(); },
}, {});
(async () => {
  // パソコン：出さない
  let d = fakeDom(); eq(M.setup(winOf(MAC, false), d.doc), false, 'パソコン：setup は案内を出さない'); eq(d.els.mobileNote.hidden, true, 'パソコン：hidden のまま');
  // スマホ：出す
  d = fakeDom(); eq(M.setup(winOf(IPHONE, true), d.doc), true, 'スマホ：setup で案内を出す'); eq(d.els.mobileNote.hidden, false, 'スマホ：hidden を外す');
  eq((d.els.sendToSelf.listeners.click || []).length, 1, 'ボタン①にクリックの動き');

  // ① navigator.share がある端末：url と title を渡す（canonical、utmなし）
  let shared = null;
  d = fakeDom(); let msg = 'x';
  let w = winOf(IPHONE, true, { share: (o) => { shared = o; return Promise.resolve(); } });
  eq(await M.sendToSelf(w, d.doc, (t) => (msg = t)), 'shared', '共有メニューを開く');
  eq(shared, { title: '建設スタジオ 無料版（パソコン用）', url: 'https://tools.equaglobal.com/studio/kensetsu/free/' }, 'share に渡すのは url と title だけ（このページ）');
  eq(msg, '', '共有できたら文言なし');
  // 共有をやめた（AbortError）：何もしない・コピーもしない
  let copied = null;
  w = winOf(IPHONE, true, { share: () => Promise.reject(Object.assign(new Error('a'), { name: 'AbortError' })), clipboard: { writeText: (t) => { copied = t; return Promise.resolve(); } } });
  eq(await M.sendToSelf(w, d.doc, (t) => (msg = t)), 'canceled', '共有をやめたら何もしない'); eq(copied, null, 'やめたときはコピーしない');
  // share が使えない端末：URLをコピーして「コピーしました」
  copied = null; msg = '';
  w = winOf(ANDROID, true, { clipboard: { writeText: (t) => { copied = t; return Promise.resolve(); } } });
  const m1 = await M.sendToSelf(w, d.doc, (t) => (msg = t));
  eq(copied, 'https://tools.equaglobal.com/studio/kensetsu/free/', 'share なし：このページのURLをコピー');
  eq(/^コピーしました/.test(msg) && msg === m1, true, '「コピーしました」と表示');
  // share が失敗（AbortError 以外）→コピーに切り替え
  copied = null;
  w = winOf(IPHONE, true, { share: () => Promise.reject(Object.assign(new Error('n'), { name: 'NotAllowedError' })), clipboard: { writeText: (t) => { copied = t; return Promise.resolve(); } } });
  await M.sendToSelf(w, d.doc, (t) => (msg = t)); eq(copied !== null && /^コピーしました/.test(msg), true, 'share 失敗→コピー');
  // clipboard もだめ→古い方法も失敗→URLを見せる
  w = winOf(IPHONE, true, { clipboard: { writeText: () => Promise.reject(new Error('no')) } });
  await M.sendToSelf(w, d.doc, (t) => (msg = t));
  eq(msg, 'コピーできませんでした。このアドレスをパソコンで開いてください：https://tools.equaglobal.com/studio/kensetsu/free/', 'コピーできないときはURLを表示');
  // 古い方法（execCommand）で成功
  d = fakeDom(); d.doc.execCommand = () => true;
  w = winOf(IPHONE, true, {});
  await M.sendToSelf(w, d.doc, (t) => (msg = t)); eq(/^コピーしました/.test(msg) && d.appended.length === 1, true, 'clipboard なし→execCommand でコピー');

  // 外部への送信なし
  eq(net.length, 0, '案内の動きで通信しない（fetch 呼び出し0）');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  eq(/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|gtag|dataLayer|\.src\s*=|window\.open|location\.href\s*=|mailto:|line\.me|https?:\/\//.test(code), false, 'mobile.js に通信・計測・外部URL・画面移動のコードなし');
  // 文言
  const words = (src.match(/'[^']*[ぁ-んァ-ヶ一-龠][^']*'/g) || []).join('') + nt.replace(/<[^>]+>/g, '');
  eq(/AI/.test(words), false, '案内にAIの文言なし');
  for (const x of ['今すぐ', '限定', '無料で今', 'お得', '簡単', '絶対']) eq(words.includes(x), false, '案内に売り込み言葉なし：' + x);

  console.log('free/test.js: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
