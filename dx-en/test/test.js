/* node test/test.js — no dependencies */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var ROOT = path.join(__dirname, '..'), SITE = path.join(ROOT, '..');
var D = require('../js/data.js'), L = require('../js/logic.js');
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('FAIL: ' + m); } }
function eq(a, b, m) { ok(JSON.stringify(a) === JSON.stringify(b), m + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }

var ENVS = [];
Object.keys(L.ENV_OPTS.sheet).forEach(function (sheet) { Object.keys(L.ENV_OPTS.pc).forEach(function (pc) { Object.keys(L.ENV_OPTS.m365).forEach(function (m365) {
  Object.keys(L.ENV_OPTS.code).forEach(function (code) { Object.keys(L.ENV_OPTS.budget).forEach(function (budget) { ENVS.push({ sheet: sheet, pc: pc, m365: m365, code: code, budget: budget }); }); }); }); }); });
var COUNTRIES = D.COUNTRIES.map(function (c) { return c.id; });

/* 1. Catalog */
var tids = {}, mids = {};
D.TASKS.forEach(function (t) {
  ok(!tids[t.id], 'task id unique ' + t.id); tids[t.id] = 1;
  ok(t.m.length >= 2, t.id + ' has >=2 methods');
  ok(['High', 'Medium', 'Low'].indexOf(t.ease) >= 0, t.id + ' ease');
  ok(L.FREQ[t.freq] && t.min > 0, t.id + ' default freq/min');
  ok(t.kw.length >= 3, t.id + ' keywords');
  t.ind.forEach(function (i) { ok(i === 'common' || D.INDUSTRIES.some(function (x) { return x.id === i; }), t.id + ' industry tag valid: ' + i); });
  t.m.forEach(function (m) {
    ok(!mids[m.id], 'method id unique ' + m.id); mids[m.id] = 1;
    ok(D.TYPES[m.type], m.id + ' type');
    ok(m.steps.length >= 3 && m.steps.length <= 5, m.id + ' has 3-5 first steps (' + m.steps.length + ')');
    ok(m.pros.length >= 1 && m.cons.length >= 1, m.id + ' pros/cons');
    ok(m.rate > 0 && m.rate <= 0.9, m.id + ' rate');
    if (m.type === 'tool') ok(D.PRODUCTS[m.product], m.id + ' product exists');
    m.steps.forEach(function (s) { ok(typeof s === 'string' || (s.win && s.mac), m.id + ' step'); });
  });
});

/* 2. Industries, categories, popular lists */
var catIds = D.CATS.map(function (c) { return c.id; });
D.INDUSTRIES.forEach(function (ind) {
  ok(catIds.indexOf(ind.cat) >= 0, ind.id + ' category');
  var own = D.TASKS.filter(function (t) { return t.ind.indexOf(ind.id) >= 0 && t.ind.indexOf('common') < 0; });
  if (ind.id !== 'office' && ind.id !== 'other') ok(own.length >= 4, ind.id + ' has >=4 industry tasks (' + own.length + ')');
  var pop = D.POPULAR[ind.id];
  ok(Array.isArray(pop) && pop.length >= 5 && pop.length <= 8, ind.id + ' popular 5-8');
  (pop || []).forEach(function (id) { var t = L.TASK_BY_ID[id]; ok(t && (t.ind.indexOf(ind.id) >= 0 || t.ind.indexOf('common') >= 0), ind.id + ' popular relevant ' + id); });
});
ok(D.INDUSTRIES.length >= 30, '>=30 industries (' + D.INDUSTRIES.length + ')');
D.CATS.forEach(function (c) { ok(D.INDUSTRIES.some(function (x) { return x.cat === c.id; }), 'category not empty ' + c.id); });

/* 3. Recommendations valid across env × country */
var n = 0;
COUNTRIES.forEach(function (c) {
  ENVS.forEach(function (env) {
    D.TASKS.forEach(function (t) {
      var f = L.filterMethods(t, env), r = L.recommend(t, env); n++;
      ok(f.length >= 1 && f.indexOf(r.method) >= 0, 'rec among filtered ' + t.id + ' ' + c + JSON.stringify(env));
      if (env.pc === 'mac') ok(f.every(function (m) { return m.type !== 'pad'; }), 'mac never PAD ' + t.id);
      if (env.budget === '0') ok(f.every(function (m) { return !L.isPaid(m); }), 'budget 0 never paid ' + t.id);
      if (env.sheet !== 'excel' && env.sheet !== 'both') ok(f.every(function (m) { return m.type !== 'vba'; }), 'no VBA without Excel');
      if (env.sheet !== 'google' && env.sheet !== 'both') ok(f.every(function (m) { return ['gas', 'gform', 'gdrive'].indexOf(m.type) < 0; }), 'no Google methods without Google');
      if (env.m365 !== 'yes') ok(f.every(function (m) { return m.type !== 'pacloud'; }), 'no PA cloud without M365');
      if (D.TYPES[r.method.type].fallback) ok(f.every(function (m) { return D.TYPES[m.type].fallback; }), 'fallback only when nothing else');
      ok(typeof L.taskName(t, c) === 'string' && L.taskName(t, c).length > 3, 'task name per country');
    });
  });
});
ok(n === COUNTRIES.length * ENVS.length * D.TASKS.length, 'checked all country × env × task');

/* 4. Country-aware wording */
var tax = L.TASK_BY_ID.taxprep;
ok(/Sales tax/.test(L.taskName(tax, 'US')), 'US tax task name');
ok(/VAT/.test(L.taskName(tax, 'UK')) && /Making Tax Digital/.test(L.taskName(tax, 'UK')), 'UK tax task name');
ok(/GST\/HST/.test(L.taskName(tax, 'CA')), 'CA tax task name');
ok(/GST/.test(L.taskName(tax, 'AU')) && /BAS/.test(L.taskName(tax, 'AU')), 'AU tax task name');
D.COUNTRIES.forEach(function (c) {
  ['tax', 'payroll', 'mileage', 'records'].forEach(function (k) {
    ok(typeof c[k + 'Note'] === 'string' && c[k + 'Note'].length > 20, c.id + ' ' + k + ' note');
    (c[k + 'Src'] || []).forEach(function (id) { ok(D.SOURCES.some(function (s) { return s.id === id; }), c.id + ' ' + k + ' source exists ' + id); });
    ok(/accountant|official|guidance|Check/i.test(c[k + 'Note']), c.id + ' ' + k + ' note is cautious');
  });
  c.resources.forEach(function (r) { ok(/^https:\/\//.test(r.url), c.id + ' resource url'); });
});
eq(L.fmtDate(new Date(2026, 9, 19), 'US'), '10/19/2026', 'US date');
eq(L.fmtDate(new Date(2026, 9, 19), 'UK'), '19/10/2026', 'UK date');
eq(L.fmtDate(new Date(2026, 9, 19), 'CA'), '2026-10-19', 'CA date');
eq(L.fmtDate(new Date(2026, 9, 19), 'AU'), '19/10/2026', 'AU date');
ok(/£/.test(L.budgetLabel('low', 'UK')) && /A\$/.test(L.budgetLabel('low', 'AU')) && /C\$/.test(L.budgetLabel('mid', 'CA')) && /^Up to about \$/.test(L.budgetLabel('low', 'US')), 'budget currency per country');

/* 5. Hours, determinism, plan, CSV */
eq(L.annualHours('monthly', 120, 0.5), 12, 'hours formula');
eq(L.annualHours('daily', 10, 0.5), 20.8, 'hours daily');
ok(/Monthly \(12\/year\) × 120 min × 50% saving ÷ 60 = about 12 h\/year/.test(L.formulaText('monthly', 120, 0.5)), 'formula text');
var ans = { country: 'UK', industry: 'plumbing', tasks: [{ id: 'quote' }, { id: 'invoice', freq: 'monthly', min: 120 }, { id: 'taxprep' }, { id: 'zzz' }], env: { sheet: 'excel', pc: 'mac', budget: 'low' } };
function snap(d) { return JSON.stringify(d.items.map(function (i) { return [i.task.id, i.name, i.rec.id, i.hours, i.score]; })) + d.totalHours; }
eq(snap(L.diagnose(ans)), snap(L.diagnose(JSON.parse(JSON.stringify(ans)))), 'deterministic');
var dg = L.diagnose(ans);
ok(dg.items.some(function (i) { return /VAT/.test(i.name); }), 'country name used in diagnosis');
var csv = L.planCSV(L.buildPlan(dg), {});
ok(csv.charCodeAt(0) === 0xFEFF && csv.indexOf('Order,Task,Method') > 0, 'CSV header');
var macPlan = L.buildPlan(L.diagnose({ country: 'US', tasks: [{ id: 'replies' }], env: { pc: 'mac', sheet: 'none', budget: '0' } }));
ok(macPlan[0].steps.some(function (s) { return /Text Replacements/.test(s.text); }), 'Mac step text');

/* 6. Search & free text */
function ind(q) { return L.searchIndustries(q).map(function (x) { return x.id; }); }
[['plumber', 'plumbing'], ['electrician', 'electrical'], ['sparky', 'electrical'], ['airbnb', 'str'], ['Holiday let', 'str'], ['tutor', 'tutoring'], ['removalist', 'moving'], ['mechanic', 'auto'],
 ['dentist', 'health'], ['physio', 'health'], ['realtor', 'realestate'], ['estate agent', 'realestate'], ['landlord', 'landlord'], ['CPA', 'accounting'], ['solicitor', 'law'], ['food truck', 'foodtruck'], ['shopify', 'ecommerce'], ['dog walker', 'pet'], ['tradie', 'handyman'], ['charity', 'nonprofit']].forEach(function (c) {
  ok(ind(c[0]).indexOf(c[1]) >= 0, 'industry search ' + c[0] + ' → ' + c[1] + ' (' + ind(c[0]).join(',') + ')');
});
ok(ind('sparky').indexOf('salon') < 0, 'sparky does not match salon');
eq(L.searchIndustries('zzqqxx').length, 0, 'no industry match');
function tk(q, c) { return L.searchTasks(q, null, c).map(function (t) { return t.id; }); }
[['invoices', 'invoice'], ['rota', 'rota'], ['booking', 'booking'], ['VAT', 'taxprep'], ['BAS', 'taxprep'], ['mileage', 'mileage'], ['rent', 'rent'], ['donors', 'donors']].forEach(function (c) {
  ok(tk(c[0]).indexOf(c[1]) >= 0, 'task search ' + c[0] + ' → ' + c[1]);
});
eq(L.searchTasks('zzqqxx').length, 0, 'no task match');
function top(q, i) { var r = L.matchFreeText(q, 3, i); return r.length ? r[0].id : null; }
eq(top('I spend hours chasing unpaid invoices'), 'invoice', 'free text invoices');
eq(top('scheduling jobs for my crew', 'plumbing'), 'dispatch', 'free text dispatch');
eq(top('copying orders from emails'), 'email2sheet', 'free text emails');
eq(top('mileage log for my van'), 'mileage', 'free text mileage');
eq(top('getting my VAT return ready', 'office'), 'taxprep', 'free text VAT');
eq(L.matchFreeText('ab').length, 0, 'too short');

/* 7. Banned words, no third-party prices */
var allText = ['js/data.js', 'js/logic.js', 'js/app.js', 'index.html', 'privacy.html'].map(function (p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }).join('\n');
['cheapest', 'guaranteed', 'guarantee', 'always'].forEach(function (w) { ok(!new RegExp('\\b' + w + '\\b', 'i').test(allText), 'banned word absent: ' + w); });
D.TASKS.forEach(function (t) { t.m.forEach(function (m) { if (m.type !== 'tool') ok(!/[$£€]\s?\d/.test(JSON.stringify(m)), 'no third-party price in ' + m.id); }); });
ok(!/HIPAA/.test(allText), 'no HIPAA legal claims');

/* 8. Products: verified table, demo links exist */
var VERIFIED = { /* checked on Gumroad 2026-10-19 (HTTP 200, USD) */
  iaynkf: '$15', mnoqa: '$19', fmzgco: '$19', qmvdib: '$19', kxqeaj: '$19', sxhrlr: '$19', hgoqqb: '$19', synhkp: '$12', mcdjc: '$12',
  zoqcha: '$9', ldxoh: '$12', ijync: '$12', zbifa: '$7', vkjob: '$9', maogrj: '$15', cxqkwn: '$12', vwxibw: '$39' };
Object.keys(D.PRODUCTS).forEach(function (k) {
  var p = D.PRODUCTS[k], id = (/\/l\/([a-z0-9]+)$/.exec(p.url) || [])[1];
  ok(/^https:\/\/comedyverse\.gumroad\.com\/l\/[a-z0-9]+$/.test(p.url), k + ' Gumroad URL format');
  eq(p.price, VERIFIED[id], k + ' price matches verified table');
  if (p.demo) ok(fs.existsSync(path.join(SITE, p.demo.split('?')[0])), k + ' demo page exists ../' + p.demo);
  if (p.demo) ok(/value="en">English/.test(fs.readFileSync(path.join(SITE, p.demo.split('?')[0]), 'utf8')), k + ' demo page has English');
});
Object.keys(D.BUNDLES).forEach(function (k) { var b = D.BUNDLES[k], id = /\/l\/([a-z0-9]+)$/.exec(b.url)[1]; eq(b.price, VERIFIED[id], k + ' bundle price'); b.members.forEach(function (m) { ok(D.PRODUCTS[m], k + ' member ' + m); }); });
ok(fs.existsSync(path.join(SITE, D.FREE_TOOLS.FileFlowLite.page)), 'free tool page exists');
['psychedelic', 'wallpaper', 'vj loop', 'mklxmn', 'hrmyr', 'rhqohp'].forEach(function (w) { ok(allText.toLowerCase().indexOf(w) < 0, 'excluded product absent: ' + w); });
var two = L.diagnose({ country: 'US', industry: 'office', tasks: [{ id: 'clientlist' }, { id: 'reports' }], env: { budget: 'low' } });
eq(two.products.bundles.length, 1, 'toolkit bundle shown with 2 members');
var zero = L.diagnose({ country: 'US', industry: 'office', tasks: [{ id: 'clientlist' }], env: { budget: '0' } });
ok(zero.products.list.length === 1 && zero.items[0].rec.type !== 'tool', 'budget 0: listed, not recommended');

/* 9. Sources */
D.SOURCES.forEach(function (s) { ok(/^https:\/\//.test(s.source_url), s.id + ' source_url'); eq(s.checked, '2026-10-19', s.id + ' checked'); ok(s.claim && s.title, s.id + ' claim/title'); });
Object.keys(D.TYPES).forEach(function (k) { (D.TYPES[k].src || []).forEach(function (id) { ok(D.SOURCES.some(function (s) { return s.id === id; }), k + ' src ' + id); }); });

/* 10. Payload whitelist */
var pl = L.buildPayload({ country: 'au', industry: 'plumbing', tasks: [{ id: 'invoice', freq: 'monthly', min: 120 }, { id: 'nope' }], env: {}, freeText: 'my secret note John Smith 0400 000 000', name: 'John' }, null, new Date(2026, 9, 19, 23, 59));
eq(Object.keys(pl).sort(), ['country', 'date', 'env', 'industry', 'methods', 'src', 'tasks', 'version'], 'payload keys whitelist');
eq(pl.src, 'dx-en', 'src'); eq(pl.country, 'AU', 'country'); eq(pl.date, '2026-10-19', 'date by day');
ok(JSON.stringify(pl).indexOf('secret') < 0 && JSON.stringify(pl).indexOf('John') < 0, 'no free text / names');
ok(pl.tasks === 'invoice:monthly:120', 'only catalog tasks');
eq(L.encodeForm(pl, {}).split('&').length, 8, '8 form fields');
var sb = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8'), sb);
var dxsb = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(SITE, 'dx/js/config.js'), 'utf8'), dxsb);
eq(sb.window.DX_CONFIG.submitUrl, dxsb.window.DX_CONFIG.submitUrl, 'same submitUrl as dx');
ok(sb.window.DX_CONFIG.fields.country && sb.window.DX_CONFIG.fields.src, 'fields include country and src');
ok(!L.submitEnabled({ submitUrl: '' }) && /Nothing you enter is sent/.test(L.privacyLine({ submitUrl: '' })), 'empty URL → no send, old wording');
ok(/no personal information/.test(L.privacyLine(sb.window.DX_CONFIG)) && /Free-text and names are never sent/.test(L.privacyLine(sb.window.DX_CONFIG)), 'notice wording');

/* 11. App in a fake DOM: demo never sends; localStorage blocked; ?country preselect */
function fakeDom() {
  var byId = {};
  function mk(tag) {
    var e = { tagName: tag, children: [], attrs: {}, style: {}, hidden: false, className: '', _text: '', value: '', checked: false, open: false, disabled: false, selected: false,
      appendChild: function (c) { this.children.push(c); return c; }, setAttribute: function (k, v) { this.attrs[k] = v; }, getAttribute: function (k) { return this.attrs[k] != null ? this.attrs[k] : null; },
      removeAttribute: function (k) { delete this.attrs[k]; }, addEventListener: function (t, fn) { (this._ev = this._ev || {})[t] = fn; }, querySelectorAll: function () { return []; }, scrollIntoView: function () {}, remove: function () {}, click: function () { if (this._ev && this._ev.click) this._ev.click({ currentTarget: this }); } };
    Object.defineProperty(e, 'textContent', { get: function () { return this._text + this.children.map(function (c) { return c.textContent || ''; }).join(''); }, set: function (v) { this._text = String(v); this.children = []; } });
    return e;
  }
  return { doc: { getElementById: function (id) { return byId[id] || (byId[id] = mk('div')); }, createElement: mk, createTextNode: function (t) { var e = mk('#text'); e._text = t; return e; }, createDocumentFragment: function () { return mk('#frag'); }, querySelectorAll: function () { return []; }, body: mk('body') }, byId: byId };
}
function runApp(cfg, search) {
  var f = fakeDom(), calls = [], nav = [];
  var w = { DX_CONFIG: cfg, location: { search: search || '' }, scrollY: 0, scrollTo: function () {}, addEventListener: function () {}, confirm: function () { return true; }, alert: function () {}, print: function () {},
    localStorage: { getItem: function () { throw new Error('blocked'); }, setItem: function () { throw new Error('blocked'); }, removeItem: function () { throw new Error('blocked'); } },
    sessionStorage: { _s: {}, getItem: function (k) { return this._s[k] || null; }, setItem: function (k, v) { this._s[k] = v; } },
    fetch: function (u, o) { calls.push([u, o]); return { catch: function () {} }; } };
  w.window = w;
  Object.defineProperty(w.location, 'href', { set: function (v) { nav.push(v); }, get: function () { return ''; } });
  var ctx = { window: w, document: f.doc, setTimeout: setTimeout, URL: {}, Blob: function () {}, URLSearchParams: URLSearchParams, JSON: JSON, Math: Math, Date: Date, Object: Object, Array: Array, String: String, Number: Number, RegExp: RegExp, encodeURIComponent: encodeURIComponent };
  vm.createContext(ctx);
  ['js/data.js', 'js/logic.js', 'js/app.js'].forEach(function (p) { vm.runInContext(fs.readFileSync(path.join(ROOT, p), 'utf8'), ctx, { filename: p }); });
  return { byId: f.byId, calls: calls, nav: nav };
}
var live = sb.window.DX_CONFIG;
var a1 = runApp(live, '?demo=1');
eq(a1.calls.length, 0, 'demo never sends (results rendered)');
ok(a1.byId.resView.children.length > 0 && a1.byId.planView.children.length > 0, 'demo renders without localStorage');
var a2 = runApp(live, '?demo=plan&country=UK');
eq(a2.calls.length, 0, 'demo=plan never sends');
ok(/VAT/.test(a2.byId.planView.textContent), 'UK demo plan uses VAT wording');
var a3 = runApp(live, '?country=CA');
eq(a3.calls.length, 0, 'start page never sends');
var picked = a3.byId.country.children.filter(function (lb) { return lb.children[0].checked; }).map(function (lb) { return lb.children[0].value; });
eq(picked, ['CA'], '?country=CA preselects Canada');
var sel = a3.byId.ctySel.children.filter(function (o) { return o.selected; }).map(function (o) { return o.value; });
eq(sel, ['../dx-en/?country=CA'], 'switcher marks current country');
var a4 = runApp(live, '?country=xx');
eq(a4.byId.country.children.filter(function (lb) { return lb.children[0].checked; }).map(function (lb) { return lb.children[0].value; }), ['US'], 'invalid ?country ignored (default US)');
var a5 = runApp({ submitUrl: '' }, '');
ok(/Nothing you enter is sent/.test(a5.byId.privacyText.textContent), 'empty URL wording on page');
/* switcher click navigates only, does not send */
a3.byId.ctySel.value = '../dx/'; a3.byId.ctyGo.click();
eq(a3.nav, ['../dx/'], 'switcher navigates'); eq(a3.calls.length, 0, 'switcher does not send');

/* 12. Switcher targets (both versions) */
L.SWITCHER.forEach(function (o) {
  var p = o.href.replace(/^\.\.\//, '').split('?')[0];
  ok(fs.existsSync(path.join(SITE, p, 'index.html')), 'switcher target exists ' + o.href);
  var c = L.countryFromSearch('?' + (o.href.split('?')[1] || ''));
  if (o.id !== 'JP') eq(c, o.id, 'switcher ' + o.id + ' → preselects ' + o.id);
});
var jaHtml = fs.readFileSync(path.join(SITE, 'dx/index.html'), 'utf8');
var jaOpts = (jaHtml.match(/<option value="([^"]+)"/g) || []).map(function (s) { return /value="([^"]+)"/.exec(s)[1]; });
eq(jaOpts, L.SWITCHER.map(function (o) { return o.href; }), 'dx switcher options match');
ok(/<option value="\.\.\/dx\/" selected>/.test(jaHtml), 'dx marks Japan selected');
ok(/href="\.\.\/dx-en\/"/.test(jaHtml), 'dx footer links to English version');
ok(/href="dx-en\/"[^>]*>Free automation check \(English\)/.test(fs.readFileSync(path.join(SITE, 'index.html'), 'utf8')), 'site index links to dx-en');

/* 13. HTML */
var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
ok(/default-src 'none'/.test(html) && /connect-src https:\/\/script\.google\.com https:\/\/script\.googleusercontent\.com;/.test(html) && /form-action 'none'/.test(html) && /base-uri 'none'/.test(html), 'CSP');
var refs = html.match(/(src|href)="(css|js)\/[^"]+"/g) || [];
ok(refs.length >= 5 && refs.every(function (r) { return r.indexOf('?v=2026101950') > 0; }), 'cache-bust ?v=2026101950');
ok(!/<script[^>]+src="https?:/.test(html), 'no external scripts');
['js/app.js'].forEach(function (p) { var s = fs.readFileSync(path.join(ROOT, p), 'utf8'); ok((s.match(/localStorage\./g) || []).length === (s.match(/try \{ (var v = )?window\.localStorage\./g) || []).length, 'localStorage in try'); });

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
