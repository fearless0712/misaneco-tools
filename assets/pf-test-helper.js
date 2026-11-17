/* テスト用：ポートフォリオ表示（?pf=1、assets/pf.js）の確認を、各スタジオの test.js から呼ぶ。
   ・小さなDOM（このサイトのHTMLが読める程度）を作り、pf.js の apply() を本物の index.html にかけて結果を見る
   ・?pf=1 なしのときは pf.js が何もしないこと（start が false を返し、DOM・HTMLを変えない）
   画面での確認（ピクセル比較・リンクをたどる）は studio/pf.e2e.mjs。 */
'use strict';
var fs = require('fs'), path = require('path');
var PF = require('./pf.js');

var VOID = /^(meta|link|br|img|input|hr|source|wbr|area|base|col|embed|track)$/i;
function Node(type, name) { this.nodeType = type; this.nodeName = name; this.childNodes = []; this.parentNode = null; this.attrs = {}; this.nodeValue = null; }
Node.prototype.getAttribute = function (k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; };
Node.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); };
Node.prototype.hasAttribute = function (k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); };
Node.prototype.appendChild = function (n) { n.parentNode = this; this.childNodes.push(n); return n; };
Node.prototype.removeChild = function (n) { var i = this.childNodes.indexOf(n); if (i >= 0) { this.childNodes.splice(i, 1); n.parentNode = null; } return n; };
Node.prototype.replaceChild = function (nw, old) { var i = this.childNodes.indexOf(old); if (i >= 0) { this.childNodes[i] = nw; nw.parentNode = this; old.parentNode = null; } return old; };
Object.defineProperty(Node.prototype, 'textContent', { get: function () { return this.nodeType === 3 ? this.nodeValue : this.childNodes.map(function (c) { return c.textContent; }).join(''); } });
function walk(n, f) { n.childNodes.forEach(function (c) { if (c.nodeType === 1) { f(c); walk(c, f); } }); }
// セレクタは pf.js が使う形だけ：".a, .b"／"[href], [src]"／"a[href]"
function match(el, sel) {
  return sel.split(',').some(function (s) {
    s = s.trim(); var m = /^([a-z]*)((?:\.[\w-]+)*)((?:\[[\w-]+\])*)$/i.exec(s); if (!m) throw new Error('selector: ' + s);
    if (m[1] && el.nodeName !== m[1].toUpperCase()) return false;
    var cls = (el.getAttribute('class') || '').split(/\s+/);
    if (m[2] && !m[2].split('.').slice(1).every(function (c) { return cls.indexOf(c) >= 0; })) return false;
    if (m[3] && !m[3].replace(/^\[|\]$/g, '').split('][').every(function (a) { return el.hasAttribute(a); })) return false;
    return true;
  });
}
Node.prototype.querySelectorAll = function (sel) { var out = []; walk(this, function (e) { if (match(e, sel)) out.push(e); }); return out; };

function parse(html) {
  var doc = new Node(9, '#document'), cur = doc, re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z0-9]+)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|[^<]+|</g, m;
  doc.createTextNode = function (t) { var n = new Node(3, '#text'); n.nodeValue = t; return n; };
  while ((m = re.exec(html))) {
    var t = m[0];
    if (/^<!/.test(t)) continue;
    if (m[1]) { var nm = m[1].toUpperCase(), p = cur; while (p && p.nodeName !== nm) p = p.parentNode; if (p) cur = p.parentNode; continue; }
    if (m[2]) {
      var el = new Node(1, m[2].toUpperCase()), ar = /([^\s=>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g, a;
      while ((a = ar.exec(m[3] || ''))) el.attrs[a[1]] = (a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : '').replace(/&amp;/g, '&');
      cur.appendChild(el);
      if (/^(script|style)$/i.test(m[2])) { var end = html.indexOf('</' + m[2], re.lastIndex); var tx = doc.createTextNode(html.slice(re.lastIndex, end)); el.appendChild(tx); re.lastIndex = end; continue; }
      if (!VOID.test(m[2]) && !m[4]) cur = el;
      continue;
    }
    cur.appendChild(doc.createTextNode(t));
  }
  return doc;
}

function snapshot(doc) {
  var line = doc.querySelectorAll('[href], [src], [action], [data-href]').filter(function (e) { return ['href', 'src', 'action', 'data-href'].some(function (k) { return PF.isLine(e.getAttribute(k)); }); }).length;
  return { line: line, promo: doc.querySelectorAll('.promo, .promo-line').length, links: doc.querySelectorAll('a[href]').map(function (a) { return a.getAttribute('href'); }), text: doc.textContent };
}

/* eq … 各 test.js の eq(got, want, msg)、dir … スタジオのフォルダ（一覧は studio/）、want … ?pf=1 なしで今ある数 { line, promo } */
function check(eq, dir, want) {
  var html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  var rel = path.relative(dir, path.join(__dirname, 'pf.js')).split(path.sep).join('/');
  var head = html.slice(0, html.indexOf('</head>'));
  eq(new RegExp('<script src="' + rel.replace(/\./g, '\\.') + '\\?v=\\d+"></script>\\n').test(head), true, 'pf: pf.js を <head> で同期で読む（defer・async なし、?v= つき）');
  eq(head.indexOf('assets/pf.js') > head.indexOf('assets/ga.js'), true, 'pf: pf.js は GA の行のあと（GAのテストの形を崩さない）');

  // pf.js の小さな部品
  eq([PF.isPf('?pf=1'), PF.isPf('?a=1&pf=1'), PF.isPf('?pf=1#x'), PF.isPf(''), PF.isPf('?pf=0'), PF.isPf('?pf=10'), PF.isPf('?xpf=1')], [true, true, true, false, false, false, false], 'pf: ?pf=1 のときだけ');
  var B = 'https://tools.equaglobal.com/studio/kensetsu/?pf=1';
  eq([PF.pfHref('/studio/', B), PF.pfHref('../fudosan/', B), PF.pfHref('/studio/keiri/?today=2026-10-22', B), PF.pfHref('/studio/kuruma/?pf=1', B)],
    ['/studio/?pf=1', '/studio/fudosan/?pf=1', '/studio/keiri/?today=2026-10-22&pf=1', '/studio/kuruma/?pf=1'], 'pf: スタジオどうしのリンクに pf=1');
  eq(['/ig/#kensetsu', '/studio/custom/', '/studio/kensetsu/free/', '/studio/trading/', '/erabikata/kensetsu/', '/shiharai/', '/', 'https://line.me/R/ti/p/@736dykzx', 'https://example.com/studio/'].map(function (h) { return PF.pfHref(h, B); }),
    [null, null, null, null, null, null, null, null, null], 'pf: スタジオの外（製品版・無料版・作り変え・Trading・ほかのツール・LINE・別のサイト）は null');
  eq([PF.isLine('https://line.me/R/ti/p/@x'), PF.isLine('https://page.line.me/x'), PF.isLine('/timeline/'), PF.isLine('https://online.example/')], [true, true, false, false], 'pf: line.me の見分け');
  eq(/\.promo/.test(PF.CSS) && /line\.me/.test(PF.CSS) && /display:none!important/.test(PF.CSS), true, 'pf: 読み込み中もCSSで帯とLINEを隠す');

  // ?pf=1 なし：何もしない
  var doc0 = parse(html), before = JSON.stringify(snapshot(doc0)), added = [];
  var fakeDoc = { documentElement: { classList: { add: function (c) { added.push(c); } } }, createElement: function () { added.push('el'); return {}; }, readyState: 'complete', addEventListener: function () { added.push('ev'); } };
  eq([PF.start({ location: { search: '', href: 'https://tools.equaglobal.com/studio/' } }, fakeDoc), PF.start({ location: { search: '?pf=0', href: 'x' } }, fakeDoc), added.length], [false, false, 0], 'pf: ?pf=1 なしでは何もしない（class・style・処理を足さない）');
  var s0 = snapshot(doc0);
  eq([s0.line, s0.promo], [want.line, want.promo], 'pf: ?pf=1 なしでは今までどおり（line.me ' + want.line + '・帯 ' + want.promo + '）');
  eq(JSON.stringify(snapshot(doc0)), before, 'pf: ?pf=1 なしでは中身が変わらない');

  // ?pf=1：本物の index.html にかける
  var base = 'https://tools.equaglobal.com/' + path.relative(path.join(__dirname, '..'), dir).split(path.sep).join('/') + '/?pf=1';
  var doc = parse(html);
  PF.apply(doc, { href: base });
  var s = snapshot(doc);
  eq(s.line, 0, 'pf: ?pf=1 で line.me への要素が0');
  eq(s.promo, 0, 'pf: ?pf=1 で帯（製品版・無料版・LINEの案内）が0');
  eq(s.links.filter(function (h) { return !/^\/studio\/(?:(?:kensetsu|kuruma|keiri|fudosan|freelance)\/)?\?pf=1$/.test(h); }), [], 'pf: ?pf=1 で残るリンクはスタジオどうしだけ・pf=1 付き');
  eq(/製品版|無料版|LINE|作り変え|BOOTH/.test(doc.querySelectorAll('body')[0].textContent), false, 'pf: ?pf=1 で製品版・無料版・LINE・作り変えの文字が残らない');
  eq(doc.querySelectorAll('a[href]').filter(function (e) { return /^(https?:)?\/\//.test(e.getAttribute('href')); }).length, 0, 'pf: ?pf=1 で外部サイトへのリンク（a）が0');
}

module.exports = { check: check, parse: parse, snapshot: snapshot };
