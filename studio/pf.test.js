/* ポートフォリオ表示（?pf=1）の確認：一覧 studio/index.html ＋ 5スタジオ：node studio/pf.test.js
   画面での確認（ピクセル比較・リンクをたどる・スクショ）は node studio/pf.e2e.mjs */
'use strict';
const path = require('path');
const H = require(path.join(__dirname, '..', 'assets', 'pf-test-helper.js'));
let pass = 0, fail = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('FAIL', m, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b)); } };
H.check(eq, __dirname, { line: 0, promo: 0 });   // 一覧（帯なし。?pf=1 では製品版の一文がある「作り変え」カードと Trading を出さない）
const fs = require('fs');
const idx = H.parse(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'));
require(path.join(__dirname, '..', 'assets', 'pf.js')).apply(idx, { href: 'https://tools.equaglobal.com/studio/?pf=1' });
eq(idx.querySelectorAll('a.card').map(a => a.getAttribute('href')), ['kensetsu/?pf=1', 'kuruma/?pf=1', 'keiri/?pf=1', 'fudosan/?pf=1', 'freelance/?pf=1'].map(h => '/studio/' + h), '一覧 ?pf=1：5スタジオのカードだけ・pf=1 付き');
eq(/MisaNeco Works ツール集/.test(idx.textContent) && /運営：Eternal Philosophy（EQUA）/.test(idx.textContent), true, '一覧 ?pf=1：フッターの文字は残す（リンクだけ外す）');
[['kensetsu', 1, 2], ['kuruma', 0, 1], ['keiri', 1, 2], ['fudosan', 0, 1], ['freelance', 0, 0]].forEach(([d, l, p]) => H.check(eq, path.join(__dirname, d), { line: l, promo: p }));
console.log('pf.test.js: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
