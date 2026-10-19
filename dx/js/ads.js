/* 広告（A8.net）— 置き場所の決め方と、タグの安全な取り込み
   ・logic.js はこのファイルも ads.json も読みません（広告はおすすめの順位・方法の一覧に影響しない）。
   ・置き場所は、表示が終わった診断結果（diag）を見て決めるだけ。
   browser: window.DXADS / node: module.exports */
(function (root) {
  'use strict';

  /* 業務 → 広告の枠 */
  var ACCOUNTING_TASKS = ['invoice', 'reconcile', 'journal', 'pdfname', 'free-expense', 'tax-prep', 'biz-bill', 'site-bill', 'mem-fee'];
  var EXPENSE_TASKS = ['journal', 'free-expense', 'pdfname'];
  var POS_TASKS = ['svc-sales', 'svc-reserve', 'svc-shift'];
  var FREELANCE_INDUSTRIES = ['freelance'];
  var FOOD_INDUSTRIES = ['food'];
  var MAX_RESULT_SLOTS = 2;

  function hasTag(s) { return !!(s && typeof s.tag === 'string' && s.tag.trim()); }
  function slotFor(taskId, industry) {
    if (FOOD_INDUSTRIES.indexOf(industry) >= 0 && POS_TASKS.indexOf(taskId) >= 0) return 'pos';
    if (ACCOUNTING_TASKS.indexOf(taskId) < 0) return null;
    if (FREELANCE_INDUSTRIES.indexOf(industry) >= 0) return EXPENSE_TASKS.indexOf(taskId) >= 0 ? 'taxreturn' : 'freelance';
    return 'accounting';
  }
  /* 結果ページの広告の置き場所：{ summary: key|null, afterTask: {taskId: key}, plan: key|null }（合計2つまで＋プランに1つ） */
  function placements(diag, ads) {
    var out = { summary: null, afterTask: {}, plan: null, count: 0 };
    if (!ads || !ads.slots || !diag) return out;
    var S = ads.slots, used = {};
    if (FREELANCE_INDUSTRIES.indexOf(diag.industry) >= 0 && hasTag(S.kaigyo)) { out.summary = 'kaigyo'; used.kaigyo = 1; out.count++; }
    (diag.items || []).forEach(function (it) {
      if (out.count >= MAX_RESULT_SLOTS) return;
      var k = slotFor(it.task.id, diag.industry);
      if (!k || used[k] || !hasTag(S[k])) return;
      out.afterTask[it.task.id] = k; used[k] = 1; out.count++;
    });
    var firstTask = Object.keys(out.afterTask)[0];
    out.plan = firstTask ? out.afterTask[firstTask] : (out.summary || null);
    return out;
  }
  /* 全画面広告：日ごとに1つ（決まった順で回す） */
  function dayIndex(day) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || ''); return m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : 0; }
  function pickInterstitial(ads, day) {
    var r = ads && ads.interstitial && Array.isArray(ads.interstitial.rotate) ? ads.interstitial.rotate.filter(hasTag) : [];
    if (!r.length) return null;
    return r[dayIndex(day) % r.length];
  }
  /* 出すか：デモでは出さない／タグがない日は出さない／同じ日に出していたら出さない */
  function shouldShowInterstitial(opts) {
    if (opts.demo) return false;
    if (!opts.pick) return false;
    if (opts.lastShown && opts.lastShown === opts.today) return false;
    return true;
  }

  /* タグの取り込み：a8.net の <a> <img> <br> だけ（それ以外は捨てる） */
  var A8 = /^https:\/\/([a-z0-9-]+\.)*a8\.net\//i;
  function okUrl(u) { u = String(u || '').trim(); return A8.test(u) ? u : null; }
  function tagHosts(html) {
    var hosts = [], re = /(?:href|src)\s*=\s*["']([^"']*)["']/gi, m;
    while ((m = re.exec(String(html || '')))) hosts.push(m[1]);
    return hosts;
  }
  function sanitizeTag(html, doc) {
    doc = doc || root.document;
    var parsed = new root.DOMParser().parseFromString('<div>' + String(html || '') + '</div>', 'text/html');
    var out = doc.createDocumentFragment(), count = 0;
    function walk(src, dst) {
      Array.prototype.forEach.call(src.childNodes, function (n) {
        if (n.nodeType === 3) { if (n.nodeValue.trim()) dst.appendChild(doc.createTextNode(n.nodeValue)); return; }
        if (n.nodeType !== 1) return;
        var tag = n.tagName.toLowerCase();
        if (tag === 'a') {
          var href = okUrl(n.getAttribute('href'));
          if (!href) { walk(n, dst); return; }
          var a = doc.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener sponsored';
          walk(n, a); dst.appendChild(a); count++;
        } else if (tag === 'img') {
          var s = okUrl(n.getAttribute('src'));
          if (!s) return;
          var im = doc.createElement('img'); im.src = s; im.alt = n.getAttribute('alt') || '';
          ['width', 'height'].forEach(function (k) { var v = n.getAttribute(k); if (v && /^\d{1,4}$/.test(v)) im.setAttribute(k, v); });
          im.loading = 'lazy'; im.decoding = 'async';
          dst.appendChild(im); count++;
        } else if (tag === 'br') {
          dst.appendChild(doc.createElement('br'));
        }
      });
    }
    walk(parsed.body.firstChild, out);
    return count ? out : null;
  }

  var API = { slotFor: slotFor, placements: placements, pickInterstitial: pickInterstitial, shouldShowInterstitial: shouldShowInterstitial, sanitizeTag: sanitizeTag, tagHosts: tagHosts, dayIndex: dayIndex, MAX_RESULT_SLOTS: MAX_RESULT_SLOTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.DXADS = API;
})(typeof window !== 'undefined' ? window : this);
