// node studio/custom/test.js … 作り変えの相談ページの検査（一言＋公式LINE・値段なし・外部URL・言葉の決まり・各見本からの導線）
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
let pass = 0, fail = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('FAIL', m, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b)); } };
const LINE = 'https://line.me/R/ti/p/@736dykzx';

// ---- 中身（11/17 短いページに置きかえ：一言＋公式LINEのボタンだけ。値段は書かない） ----
eq(/<h1>御社の業務に合わせて作ります<\/h1>/.test(html), true, '見出し');
eq(html.includes('<p>今お使いのExcelや紙の表、仕事の流れを、公式LINEで一言送ってください。</p>'), true, '一言の案内');
eq(html.includes('id="line"'), true, 'LINEの節');
const text = html.replace(/<script[^]*?<\/script>/g, '').replace(/<[^>]+>/g, '');
eq(/[0-9０-９,]+\s*円|万円|¥|料金|価格|目安/.test(text), false, '値段・料金の目安を書かない');
for (const id of ['what', 'price', 'flow', 'cannot', 'faq']) eq(html.includes('id="' + id + '"'), false, '古い節は残っていない：' + id);
eq((html.match(/<a class="line-btn"/g) || []).length, 1, 'ボタンは1つ');

// ---- 言葉の決まり ----
for (const w of ['おすすめ', '今だけ', '限定', '残りわずか', '最安', '最短', '必ず', '保証', '格安', '業界最']) eq(html.includes(w), false, '売り込み・約束の言葉なし：' + w);
eq(/AI/.test(html.replace(/<[^>]+>/g, '')), false, '本文にAIの語なし');
eq(/確認していません|未確認|確かめていません/.test(html), false, '未確認の断り書きなし');
eq(/日以内|営業日で納品|\d+日で/.test(html), false, '確かめていない納期を書かない');
eq(/Eternal Philosophy（EQUA）/.test(html), true, '運営表記');

// ---- 外部通信・外部URL ----
const GA = require(path.join(ROOT, 'assets', 'ga-test-helper.js')).stripGA(html);
eq(GA.problems, [], 'GA（アクセス解析）は決まった形だけ（タグ・CSP・注記）');
const csp = (GA.html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
eq(/default-src 'none'/.test(csp) && /connect-src 'none'/.test(csp) && /form-action 'none'/.test(csp) && !/https?:/.test(csp), true, 'CSP：外部通信なし');
eq(/<script(?![^>]*src=)/i.test(GA.html), false, 'インラインのスクリプトなし');
eq(/ on[a-z]+="/.test(html), false, 'インラインのイベントなし');
const urls = [...new Set(GA.html.match(/https?:\/\/[^"'\s<)]+/g) || [])].sort();
eq(urls, [LINE, 'https://tools.equaglobal.com/studio/custom/'], '外部URLは公式LINEと自分のcanonicalだけ');
eq(html.includes('<a class="line-btn" href="' + LINE + '" target="_blank" rel="noopener">'), true, 'LINEボタン');
// サイト内リンクは存在する
for (const h of [...html.matchAll(/href="(\/[^"#]*)"/g)].map(m => m[1])) {
  const f = path.join(ROOT, h, h.endsWith('/') ? 'index.html' : '');
  eq(fs.existsSync(f), true, 'リンク先が存在：' + h);
}

// ---- 各見本・一覧・IGまとめからの1行の導線（英語の trading には入れない） ----
const LINK = 'href="/studio/custom/"';
for (const s of ['kensetsu', 'kuruma', 'keiri', 'fudosan', 'freelance']) {
  const h = fs.readFileSync(path.join(ROOT, 'studio', s, 'index.html'), 'utf8');
  eq((h.match(/href="\/studio\/custom\/"/g) || []).length >= 1, true, s + ' から作り変えの案内へ');
  const foot = (h.match(/<footer class="foot">([^]*?)<\/footer>/) || [, ''])[1];
  eq(foot.includes(LINK), true, s + ' のフッターに1行');
  const promo = (h.match(/<aside class="promo"[^]*?<\/aside>/) || [''])[0];
  if (promo) eq(promo.includes(LINK), true, s + ' の上の帯にも');
}
eq(fs.readFileSync(path.join(ROOT, 'studio', 'trading', 'index.html'), 'utf8').includes('/studio/custom/'), false, '英語の trading には入れない');
eq(/href="(\/studio\/)?custom\/"/.test(fs.readFileSync(path.join(ROOT, 'studio', 'index.html'), 'utf8')), true, 'スタジオ一覧から');
eq(fs.readFileSync(path.join(ROOT, 'ig', 'index.html'), 'utf8').includes(LINK), true, 'IGまとめから');

const todo = (html.match(/【要確認/g) || []).length;
eq(todo, 0, '【要確認】の印が残っていない');
console.log((fail ? 'NG' : 'OK') + ' custom: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
