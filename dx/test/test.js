/* node test/test.js — 依存なし */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var ROOT = path.join(__dirname, '..'), SITE = path.join(ROOT, '..');
var D = require('../js/data.js'), L = require('../js/logic.js');

var pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.log('FAIL: ' + msg); } }
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), msg + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }

/* すべての環境の組み合わせ */
var ENVS = [];
Object.keys(L.ENV_OPTS.sheet).forEach(function (sheet) {
  Object.keys(L.ENV_OPTS.pc).forEach(function (pc) {
    Object.keys(L.ENV_OPTS.m365).forEach(function (m365) {
      Object.keys(L.ENV_OPTS.code).forEach(function (code) {
        Object.keys(L.ENV_OPTS.budget).forEach(function (budget) { ENVS.push({ sheet: sheet, pc: pc, m365: m365, code: code, budget: budget }); });
      });
    });
  });
});

/* 1. カタログ：方法2つ以上、はじめの一歩3〜5、ID重複なし、削減率の範囲 */
var ids = {}, mids = {};
D.TASKS.forEach(function (t) {
  ok(!ids[t.id], 'task id unique ' + t.id); ids[t.id] = 1;
  ok(t.m.length >= 2, t.id + ' has >=2 methods');
  ok(['高', '中', '低'].indexOf(t.ease) >= 0, t.id + ' ease');
  ok(L.FREQ[t.freq] && t.min > 0, t.id + ' default freq/min');
  ok(t.kw.length >= 3, t.id + ' keywords');
  ok(t.ind.length >= 1, t.id + ' industry tag');
  t.m.forEach(function (m) {
    ok(!mids[m.id], 'method id unique ' + m.id); mids[m.id] = 1;
    ok(D.TYPES[m.type], m.id + ' type exists');
    ok(m.steps.length >= 3 && m.steps.length <= 5, m.id + ' has 3-5 first steps (' + m.steps.length + ')');
    ok(m.pros.length >= 1 && m.cons.length >= 1, m.id + ' pros/cons');
    ok(m.rate > 0 && m.rate <= 0.9, m.id + ' rate in (0,0.9]');
    if (m.type === 'tool') ok(D.PRODUCTS[m.product], m.id + ' product exists');
    m.steps.forEach(function (s) { ok(typeof s === 'string' || (s.win && s.mac), m.id + ' step text'); });
  });
});
ok(D.TASKS.length >= 25, 'catalog has >=25 tasks (' + D.TASKS.length + ')');
['realestate', 'retail', 'pro'].forEach(function (ind) {
  ok(D.TASKS.some(function (t) { return t.ind.indexOf(ind) >= 0; }), 'industry ' + ind + ' has tasks');
});
/* 事務全般の業務は、どの業種でも出る */
D.INDUSTRIES.forEach(function (ind) {
  var g = L.tasksForIndustry(ind.id);
  var shown = g.own.concat(g.common).map(function (t) { return t.id; });
  D.TASKS.filter(function (t) { return t.ind.indexOf('common') >= 0; }).forEach(function (t) { ok(shown.indexOf(t.id) >= 0, 'common task ' + t.id + ' shown for ' + ind.id); });
  eq(g.own.length + g.common.length + g.others.length, D.TASKS.length, 'all tasks grouped for ' + ind.id);
});

/* 2. おすすめは、いつも環境で使える方法の中から。Mac に Power Automate desktop は出ない。予算0円に有料はない */
var recCount = 0;
ENVS.forEach(function (env) {
  D.TASKS.forEach(function (t) {
    var f = L.filterMethods(t, env);
    var r = L.recommend(t, env);
    recCount++;
    ok(f.length >= 1, 'at least one method for ' + t.id + ' ' + JSON.stringify(env));
    ok(f.indexOf(r.method) >= 0, 'recommendation among filtered ' + t.id + ' ' + JSON.stringify(env));
    ok(r.why.indexOf('→') > 0, 'why has arrow');
    if (env.pc === 'mac') ok(r.method.type !== 'pad' && f.every(function (m) { return m.type !== 'pad'; }), 'mac never gets PAD ' + t.id);
    if (env.budget === '0') ok(!L.isPaid(r.method) && f.every(function (m) { return !L.isPaid(m); }), 'budget 0 never gets paid ' + t.id);
    if (env.sheet !== 'excel' && env.sheet !== 'both') ok(f.every(function (m) { return m.type !== 'vba'; }), 'no VBA without Excel');
    if (env.sheet !== 'google' && env.sheet !== 'both') ok(f.every(function (m) { return m.type !== 'gas' && m.type !== 'gform'; }), 'no GAS without Google');
    if (env.m365 !== 'yes') ok(f.every(function (m) { return m.type !== 'pacloud'; }), 'no PA cloud without M365');
    /* MisaNeco のツールは、むずかしさが最小のとき優先 */
    var tools = f.filter(function (m) { return m.type === 'tool'; });
    if (tools.length) {
      var minD = Math.min.apply(null, f.filter(function (m) { return !D.TYPES[m.type].fallback; }).map(function (m) { return L.effectiveDiff(m, env); }));
      if (tools.some(function (m) { return L.effectiveDiff(m, env) === minD; })) ok(r.method.type === 'tool', 'tool preferred at lowest difficulty ' + t.id);
    }
    /* 手順をそろえる（fallback）は、ほかに使える方法がないときだけ */
    if (D.TYPES[r.method.type].fallback) ok(f.every(function (m) { return D.TYPES[m.type].fallback; }), 'fallback only when nothing else ' + t.id);
  });
});
ok(recCount === ENVS.length * D.TASKS.length, 'checked all env x task');
/* 理由の1行の例 */
var ex = L.recommend(L.TASK_BY_ID.journal, { sheet: 'excel', pc: 'win', m365: 'no', code: 'none', budget: '0' });
ok(/^Windows・Excelを使っていて、プログラムは書かない、予算0円 → /.test(ex.why), 'why line format: ' + ex.why);

/* 3. 時間の式 */
eq(L.annualHours('monthly', 120, 0.5), 12, 'monthly 120min 50% = 12h');
eq(L.annualHours('daily', 10, 0.5), 20.8, 'daily 10min 50% = 20.8h');
eq(L.annualHours('weekly', 30, 0.7), 17.5, 'weekly 30min 70% = 17.5h');
eq(L.annualHours('yearly', 60, 1), 4, 'yearly 60min 100% = 4h');
eq(L.annualHours('often', 20, 0.6), 30, 'often 20min 60% = 30h');
ok(/月1（年12回）× 120分 × 削減率50% ÷ 60 ＝ 約12時間\/年/.test(L.formulaText('monthly', 120, 0.5)), 'formula text visible');
eq(L.priorityScore(30, 2), 15, 'priority = hours / diff weight');
eq(L.labelsFor(25, 1), ['すぐできる', '効果大'], 'labels quick+big');
eq(L.labelsFor(5, 2), [], 'no labels');

/* 4. 決定的（同じ入力 → 同じ結果） */
var ans = { industry: 'realestate', tasks: [{ id: 'invoice', freq: 'monthly', min: 120 }, { id: 'hankyo', freq: 'daily', min: 20 }, { id: 'mailsend', freq: 'daily', min: 10 }, { id: 'baikai' }], env: { sheet: 'excel', pc: 'mac', code: 'none', budget: '3000' } };
function snap(d) { return JSON.stringify(d.items.map(function (i) { return [i.task.id, i.rec.id, i.chosen.id, i.hours, i.score, i.labels]; })) + d.totalHours; }
var s1 = snap(L.diagnose(ans)), s2 = snap(L.diagnose(JSON.parse(JSON.stringify(ans))));
eq(s1, s2, 'deterministic diagnose');
eq(L.planCSV(L.buildPlan(L.diagnose(ans)), {}), L.planCSV(L.buildPlan(L.diagnose(ans)), {}), 'deterministic CSV');
var dg = L.diagnose(ans);
for (var i = 1; i < dg.items.length; i++) ok(dg.items[i - 1].score >= dg.items[i].score, 'items sorted by priority');
/* 選んだ方法がプランに反映され、使えない方法は選べない */
var dc = L.diagnose(ans, { invoice: 'invoice-sheet', hankyo: 'hankyo-pad-not-exist', mailsend: 'mailsend-gas' });
var inv = dc.items.filter(function (x) { return x.task.id === 'invoice'; })[0];
eq(inv.chosen.id, 'invoice-sheet', 'choice applied');
var ms = dc.items.filter(function (x) { return x.task.id === 'mailsend'; })[0];
ok(ms.chosen.id !== 'mailsend-gas', 'unavailable choice ignored (GAS without Google)');
/* CSV */
var csv = L.planCSV(L.buildPlan(dc), {});
ok(csv.charCodeAt(0) === 0xFEFF, 'CSV has BOM');
ok(csv.split('\r\n')[0].indexOf('順番,業務,方法') >= 0, 'CSV header');
ok(L.planProgress(L.buildPlan(dc), {}).pct === 0, 'progress 0');
/* Mac のときは Mac 向けの手順 */
var macPlan = L.buildPlan(L.diagnose({ industry: 'office', tasks: [{ id: 'mailsend' }], env: { pc: 'mac', sheet: 'none', budget: '0' } }));
ok(macPlan[0].steps.some(function (s) { return s.text.indexOf('ユーザ辞書') >= 0; }), 'mac step text');
var winPlan = L.buildPlan(L.diagnose({ industry: 'office', tasks: [{ id: 'mailsend' }], env: { pc: 'win', sheet: 'none', budget: '0' } }));
ok(winPlan[0].steps.some(function (s) { return s.text.indexOf('Microsoft IME') >= 0; }), 'win step text');

/* 5. 自由記入 → 近い業務 */
function top(q) { var r = L.matchFreeText(q); return r.length ? r[0].id : null; }
eq(top('請求書を毎月作っている'), 'invoice', 'match 請求書');
eq(top('タイムカードの集計が大変'), 'attendance', 'match タイムカード');
eq(top('日程調整がめんどう'), 'schedule', 'match 日程調整');
eq(top('マイソクを作る'), 'flyer', 'match マイソク');
eq(top('レインズの登録期限'), 'baikai', 'match レインズ');
eq(top('PDFの表を手で打ち込んでいる'), 'pdftable', 'match PDF表');
eq(top('ＣＳＶでグラフを作る'), 'csvagg', 'match 全角CSV');
eq(L.matchFreeText('あ').length, 0, 'too short → none');
eq(L.matchFreeText('天気がよい').length, 0, 'unrelated → none');

/* 6. 禁止語・料金の数字（他社） */
var dataSrc = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
var allText = [dataSrc, fs.readFileSync(path.join(ROOT, 'js/logic.js'), 'utf8'), fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8'), fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), fs.readFileSync(path.join(ROOT, 'privacy.html'), 'utf8')].join('\n');
['最安', '必ず', '絶対', '1万円', '30日チャレンジ'].forEach(function (w) { ok(allText.indexOf(w) < 0, 'banned word absent: ' + w); });
D.TASKS.forEach(function (t) {
  t.m.forEach(function (m) {
    if (m.type === 'tool') return;
    var txt = JSON.stringify(m);
    ok(!/[¥￥]\s?\d|\d+円|\$\d/.test(txt), 'no prices in non-product method ' + m.id);
  });
});

/* 7. 自社ツールのリンク・価格・BOOTH URL が site/index.html と一致 */
var idx = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
var cards = idx.split('<div class="card">');
Object.keys(D.PRODUCTS).forEach(function (k) {
  var p = D.PRODUCTS[k];
  if (p.bundleOnly) { ok(D.BUNDLES[p.bundleOnly] && D.BUNDLES[p.bundleOnly].members.indexOf(k) >= 0, k + ' listed in bundle members'); return; }
  ok(fs.existsSync(path.join(SITE, p.page)), k + ' demo page exists ../' + p.page);
  var card = cards.filter(function (c) { return c.indexOf('href="' + p.page + '"') >= 0; })[0];
  ok(!!card, k + ' found in index.html');
  if (!card) return;
  var m = /<span class="price">([^<]+)<\/span>/.exec(card);
  eq(m && m[1], p.price, k + ' price matches index.html');
  ok(card.indexOf('href="' + p.booth + '"') >= 0, k + ' BOOTH url matches index.html');
});
Object.keys(D.BUNDLES).forEach(function (k) {
  var b = D.BUNDLES[k];
  var blk = idx.split('<div class="free">').filter(function (c) { return c.indexOf(b.booth) >= 0; })[0];
  ok(!!blk, k + ' bundle found in index.html');
  if (blk) { ok(blk.indexOf(b.price) >= 0, k + ' bundle price matches'); ok(blk.indexOf(b.note.replace('（買い切り）', '').split(' → ')[0]) >= 0, k + ' bundle 単品合計 matches'); }
});
/* 内部リンクは site 直下の存在するファイル */
var used = {};
D.TASKS.forEach(function (t) { t.m.forEach(function (m) { if (m.type === 'tool') used[m.product] = 1; }); });
Object.keys(used).forEach(function (k) { var p = D.PRODUCTS[k]; if (!p.bundleOnly) ok(fs.existsSync(path.join(SITE, p.page)), 'linked tool file exists: ' + p.page); });
ok(fs.existsSync(path.join(SITE, 'blog')), '../blog/ exists');
/* バンドル表示は2本以上のときだけ */
var one = L.diagnose({ industry: 'realestate', tasks: [{ id: 'flyer' }], env: { budget: '3000' } });
eq(one.products.bundles.filter(function (b) { return b.id === 're8'; }).length, 0, 'bundle hidden with 1 match');
var two = L.diagnose({ industry: 'realestate', tasks: [{ id: 'flyer' }, { id: 'chosa' }], env: { budget: '3000' } });
eq(two.products.bundles.filter(function (b) { return b.id === 're8'; }).length, 1, 'bundle shown with 2 matches');
eq(two.products.totalText, '¥5,960', 'product total');
/* 予算0円でもツールは一覧に出す（おすすめにはしない） */
var zero = L.diagnose({ industry: 'office', tasks: [{ id: 'invoice' }], env: { budget: '0' } });
ok(zero.products.list.length === 1 && zero.items[0].rec.type !== 'tool', 'budget 0: listed but not recommended');

/* 8. 出典 */
D.SOURCES.forEach(function (s) {
  ok(typeof s.source_url === 'string' && s.source_url.length > 2, s.id + ' has source_url');
  ok(/^https:\/\//.test(s.source_url) || s.source_url === '../', s.id + ' url is https or site root');
  eq(s.checked, '2026-10-19', s.id + ' checked date');
  ok(s.claim && s.title, s.id + ' claim/title');
});
var srcIds = D.SOURCES.map(function (s) { return s.id; });
Object.keys(D.TYPES).forEach(function (k) { (D.TYPES[k].src || []).forEach(function (id) { ok(srcIds.indexOf(id) >= 0, k + ' source ref ' + id + ' exists'); }); });

/* 9. 匿名の集計データ：決めた項目だけ・自由記入なし */
var FREE = 'わたしの秘密の業務メモ 山田太郎 090-1234-5678';
var ans2 = { industry: 'office', tasks: [{ id: 'invoice', freq: 'monthly', min: 120 }, { id: 'zzz-unknown' }], env: { sheet: 'google', pc: 'mac' }, freeText: FREE, name: '山田太郎' };
var pl = L.buildPayload(ans2, null, new Date(2026, 9, 19, 23, 59, 59));
eq(Object.keys(pl).sort(), L.PAYLOAD_KEYS.slice().sort(), 'payload has only whitelisted keys');
ok(JSON.stringify(pl).indexOf('秘密') < 0 && JSON.stringify(pl).indexOf('山田') < 0 && JSON.stringify(pl).indexOf('090') < 0, 'payload excludes free text/name');
ok(pl.tasks.indexOf('zzz') < 0, 'payload excludes unknown task ids');
eq(pl.date, '2026-10-19', 'payload date rounded to day');
eq(pl.version, '20261019', 'payload version');
ok(/^invoice:monthly:120$/.test(pl.tasks), 'payload tasks format');
var form = L.encodeForm(pl, { industry: 'entry.1', tasks: 'entry.2', env: 'entry.3', methods: 'entry.4', date: 'entry.5', version: 'entry.6' });
eq(form.split('&').length, 6, 'form has 6 fields');
ok(form.indexOf('entry.1=office') === 0, 'form field mapping');
eq(L.payloadHash(pl), L.payloadHash(L.buildPayload(ans2, null, new Date(2026, 9, 20))), 'hash ignores date (dedupe per result)');
ok(L.payloadHash(pl) !== L.payloadHash(L.buildPayload({ industry: 'office', tasks: [{ id: 'invoice', freq: 'weekly', min: 120 }], env: ans2.env })), 'hash differs per result');

/* 10. 送信先が空 → 送らない・お知らせも出さない・従来の文言 */
var cfgSrc = fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8');
var sb = { window: {} }; vm.runInNewContext(cfgSrc, sb);
eq(sb.window.DX_CONFIG.submitUrl, '', 'config submitUrl is empty');
ok(!L.submitEnabled(sb.window.DX_CONFIG), 'empty submitUrl → disabled');
ok(!L.shouldSend(sb.window.DX_CONFIG, 'abc', []), 'empty submitUrl → no send');
ok(L.privacyLine(sb.window.DX_CONFIG).indexOf('入力内容は外部に送信しません') === 0, 'empty → old wording');
var on = { submitUrl: 'https://script.google.com/macros/s/x/exec' };
ok(L.submitEnabled(on) && L.shouldSend(on, 'abc', []), 'set → send');
ok(!L.shouldSend(on, 'abc', ['abc']), 'same result not sent twice');
ok(L.privacyLine(on).indexOf('個人が分からない情報') > 0 && L.privacyLine(on).indexOf('自由記入の文章や名前・連絡先は送りません') > 0, 'set → notice wording');
ok(!L.submitEnabled({ submitUrl: 'http://example.com' }), 'http not allowed');
ok(!L.submitEnabled({ submitUrl: 'javascript:alert(1)' }), 'javascript: not allowed');

/* 11. 画面：送信先が空なら fetch を呼ばない・お知らせを出さない（簡易DOMで app.js を実行） */
function fakeDom() {
  var byId = {};
  function mk(tag) {
    var e = { tagName: tag, children: [], attrs: {}, style: {}, hidden: false, className: '', _text: '', value: '', checked: false, open: false, disabled: false,
      appendChild: function (c) { this.children.push(c); return c; }, setAttribute: function (k, v) { this.attrs[k] = v; }, getAttribute: function (k) { return this.attrs[k] != null ? this.attrs[k] : null; },
      removeAttribute: function (k) { delete this.attrs[k]; }, addEventListener: function () {}, querySelectorAll: function () { return []; }, scrollIntoView: function () {}, remove: function () {}, click: function () {} };
    Object.defineProperty(e, 'textContent', { get: function () { return this._text + this.children.map(function (c) { return c.textContent || ''; }).join(''); }, set: function (v) { this._text = String(v); this.children = []; } });
    return e;
  }
  var doc = {
    getElementById: function (id) { return byId[id] || (byId[id] = mk('div')); },
    createElement: mk, createTextNode: function (t) { var e = mk('#text'); e._text = t; return e; }, createDocumentFragment: function () { return mk('#frag'); },
    querySelectorAll: function () { return []; }, body: mk('body')
  };
  return { doc: doc, byId: byId };
}
function runApp(cfg, search) {
  var f = fakeDom(), calls = [];
  var w = { DX_CONFIG: cfg, location: { search: search || '' }, scrollY: 0, scrollTo: function () {}, addEventListener: function () {}, confirm: function () { return true; }, alert: function () {}, print: function () {},
    localStorage: { getItem: function () { throw new Error('blocked'); }, setItem: function () { throw new Error('blocked'); }, removeItem: function () { throw new Error('blocked'); } },
    sessionStorage: { _s: {}, getItem: function (k) { return this._s[k] || null; }, setItem: function (k, v) { this._s[k] = v; } },
    fetch: function (u, o) { calls.push([u, o]); return { catch: function () {} }; } };
  w.window = w;
  var ctx = { window: w, document: f.doc, setTimeout: setTimeout, URL: {}, Blob: function () {}, JSON: JSON, Math: Math, Date: Date, Object: Object, Array: Array, String: String, Number: Number, RegExp: RegExp, encodeURIComponent: encodeURIComponent };
  vm.createContext(ctx);
  ['js/data.js', 'js/logic.js', 'js/app.js'].forEach(function (p) { vm.runInContext(fs.readFileSync(path.join(ROOT, p), 'utf8'), ctx, { filename: p }); });
  return { w: w, byId: f.byId, calls: calls, ctx: ctx };
}
var a1 = runApp({ submitUrl: '' }, '?demo=1');
eq(a1.calls.length, 0, 'empty submitUrl: no fetch at all (demo results rendered)');
ok(!a1.byId.sendNotice || a1.byId.sendNotice.hidden !== false, 'empty submitUrl: notice not shown');
ok(a1.byId.privacyText.textContent.indexOf('入力内容は外部に送信しません') === 0, 'empty submitUrl: page says 入力内容は外部に送信しません');
ok(a1.byId.resView.children.length > 0, 'demo results rendered without localStorage');
ok(a1.byId.planView.children.length > 0, 'plan rendered without localStorage');
var a2 = runApp({ submitUrl: 'https://script.google.com/macros/s/x/exec', fields: {} }, '');
eq(a2.calls.length, 0, 'no send before results');
ok(a2.byId.sendNotice.hidden === false, 'set submitUrl: notice shown');

/* 12. HTML：CSP・キャッシュ対策・フッター */
var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
ok(/default-src 'none'/.test(html) && /connect-src 'none'/.test(html) && /form-action 'none'/.test(html) && /base-uri 'none'/.test(html) && /script-src 'self'/.test(html), 'CSP');
ok(!/<script[^>]+src="https?:/.test(html) && !/<link[^>]+href="https?:/.test(html), 'no external scripts/styles');
var refs = html.match(/(src|href)="(css|js)\/[^"]+"/g) || [];
ok(refs.length >= 5 && refs.every(function (r) { return r.indexOf('?v=20261019') > 0; }), 'cache-bust ?v=20261019');
ok(html.indexOf('MisaNeco Works ・ AIを活用して作成し、公式情報で確認しています') >= 0, 'footer text');
ok(html.indexOf('href="../"') >= 0 && html.indexOf('href="../blog/"') >= 0, 'footer links');
ok(/connect-src に送信先のオリジン/.test(html), 'CSP comment about enabling submission');
ok(!/a8\.net|adsbygoogle|moshimo/.test(allText), 'no ads');
['js/app.js', 'js/logic.js'].forEach(function (p) {
  var s = fs.readFileSync(path.join(ROOT, p), 'utf8');
  ok((s.match(/localStorage\./g) || []).length === (s.match(/try \{ (var v = )?window\.localStorage\./g) || []).length, p + ' every localStorage access inside try');
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
