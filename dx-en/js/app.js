/* Small Business Automation Check — UI
   - All checks run in this page (js/logic.js).
   - Saved in localStorage only (every access wrapped in try/catch; works without it).
   - Free text is never saved or sent.
   - Sending happens only when js/config.js has a submitUrl, never in ?demo= mode. */
(function () {
  'use strict';
  var DX = window.DX, D = DX.DATA, CFG = window.DX_CONFIG || {};
  var KEY = 'dxen-diag-v1', KEY_DONE = 'dxen-plan-done-v1', KEY_SENT = 'dxen-sent-v1';

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function lsGet(k) { try { var v = window.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* keep going without storage */ } }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) { /* noop */ } }
  function ssGet(k) { try { var v = window.sessionStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function ssSet(k, v) { try { window.sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* noop */ } }
  function link(href, text, cls, ext) { var a = el('a', cls || null, text); a.href = href; if (ext) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } return a; }
  function isoToDate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(); }

  /* ---------- State ---------- */
  var S = { country: 'US', industry: 'office', sel: {}, order: [], env: DX.normalizeEnv({}), choices: {}, step: 1 };
  var done = {}, diag = null, plan = null;
  function answers() { return { country: S.country, industry: S.industry, tasks: S.order.map(function (id) { return { id: id, freq: S.sel[id].freq, min: S.sel[id].min }; }), env: S.env }; }
  function save() { lsSet(KEY, { country: S.country, industry: S.industry, sel: S.sel, order: S.order, env: S.env, choices: S.choices }); }
  function load() {
    var v = lsGet(KEY);
    if (v && typeof v === 'object') {
      if (DX.isCountry(v.country)) S.country = DX.normalizeCountry(v.country);
      S.industry = DX.normalizeIndustry(v.industry);
      S.env = DX.normalizeEnv(v.env);
      S.choices = v.choices && typeof v.choices === 'object' ? v.choices : {};
      (Array.isArray(v.order) ? v.order : []).forEach(function (id) {
        var t = DX.TASK_BY_ID[id];
        if (!t || S.sel[id]) return;
        var s = (v.sel || {})[id] || {};
        S.sel[id] = { freq: DX.FREQ[s.freq] ? s.freq : t.freq, min: Number(s.min) > 0 ? Math.round(Number(s.min)) : t.min };
        S.order.push(id);
      });
    }
    var d = lsGet(KEY_DONE);
    if (d && typeof d === 'object') done = d;
    var qc = DX.countryFromSearch(window.location.search);
    if (qc) S.country = qc;
  }
  function tName(t) { return DX.taskName(t, S.country); }
  function toggleTask(id, on) {
    var t = DX.TASK_BY_ID[id];
    if (!t) return;
    if (on && !S.sel[id]) { S.sel[id] = { freq: t.freq, min: t.min }; S.order.push(id); }
    if (!on && S.sel[id]) { delete S.sel[id]; S.order = S.order.filter(function (x) { return x !== id; }); }
    save(); syncChecks();
  }

  /* ---------- Country switcher (header) and country step ---------- */
  function renderSwitcher() {
    var sel = $('ctySel'); if (!sel) return;
    sel.textContent = '';
    DX.SWITCHER.forEach(function (o) {
      var op = el('option', null, o.label); op.value = o.href;
      if (o.id === S.country) op.selected = true;
      sel.appendChild(op);
    });
  }
  function renderCountry() {
    var box = $('country'); box.textContent = '';
    D.COUNTRIES.forEach(function (c) {
      var lb = el('label'), r = el('input');
      r.type = 'radio'; r.name = 'country'; r.value = c.id; r.checked = S.country === c.id;
      r.addEventListener('change', function () { S.country = c.id; save(); renderSwitcher(); renderTasks(); renderEnv(); renderResources(); });
      lb.appendChild(r); lb.appendChild(el('span', null, c.label));
      box.appendChild(lb);
    });
  }
  function renderResources() {
    var ul = $('resList'); if (!ul) return;
    ul.textContent = '';
    var c = DX.country(S.country);
    $('resTitle').textContent = 'Official resources — ' + c.label;
    if (!c.resources.length) { ul.appendChild(el('li', null, 'Check your national tax authority and small-business agency.')); return; }
    c.resources.forEach(function (r) { var li = el('li'); li.appendChild(link(r.url, r.name, null, true)); ul.appendChild(li); });
  }

  /* ---------- Step 1 ---------- */
  var openState = {};
  function groupBox(key, title, n, open, fill, parent) {
    var d = el('details', 'grpbox'); d.setAttribute('data-g', key);
    d.open = openState.hasOwnProperty(key) ? openState[key] : open;
    var sm = el('summary', 'ghead');
    sm.appendChild(el('span', null, title)); sm.appendChild(el('span', 'gcount', String(n)));
    sm.setAttribute('aria-label', title + ' (' + n + ')');
    d.appendChild(sm);
    d.addEventListener('toggle', function () { openState[key] = d.open; });
    var body = el('div', 'gbody'); fill(body); d.appendChild(body);
    parent.appendChild(d);
  }
  function renderIndustry() {
    var box = $('indList'); box.textContent = '';
    var q = $('indSearch').value || '', searching = !!DX.norm(q);
    var hits = DX.searchIndustries(q), shown = 0;
    $('indPicked').textContent = 'Selected: ' + DX.industryLabel(S.industry);
    D.CATS.forEach(function (c) {
      var list = hits.filter(function (x) { return x.cat === c.id; });
      if (!list.length) return;
      shown += list.length;
      var hasSel = list.some(function (x) { return x.id === S.industry; });
      groupBox('ind-' + c.id + (searching ? '-q' : ''), c.label, list.length, searching || hasSel, function (body) {
        var ch = el('div', 'chips');
        list.forEach(function (ind) {
          var lb = el('label'), r = el('input');
          r.type = 'radio'; r.name = 'industry'; r.value = ind.id; r.checked = S.industry === ind.id;
          r.addEventListener('change', function () { S.industry = ind.id; save(); $('indPicked').textContent = 'Selected: ' + ind.label; renderTasks(); });
          lb.appendChild(r); lb.appendChild(el('span', null, ind.label));
          ch.appendChild(lb);
        });
        body.appendChild(ch);
      }, box);
    });
    $('indNone').hidden = shown > 0;
  }
  function taskRow(t) {
    var lb = el('label', 'tk'), c = el('input');
    c.type = 'checkbox'; c.value = t.id; c.setAttribute('data-task', t.id); c.checked = !!S.sel[t.id];
    c.addEventListener('change', function () { toggleTask(t.id, c.checked); });
    lb.appendChild(c); lb.appendChild(el('span', 'nm', tName(t)));
    lb.appendChild(el('span', 'ease ' + (t.ease === 'High' ? 'e-high' : t.ease === 'Medium' ? 'e-mid' : 'e-low'), t.ease));
    return lb;
  }
  function taskGroup(key, title, tasks, open, parent) {
    if (!tasks.length) return 0;
    groupBox(key, title, tasks.length, open, function (body) { var g = el('div', 'tasks'); tasks.forEach(function (t) { g.appendChild(taskRow(t)); }); body.appendChild(g); }, parent);
    return tasks.length;
  }
  function renderTasks() {
    var box = $('taskList'); box.textContent = '';
    var q = $('taskSearch').value || '', searching = !!DX.norm(q), sfx = searching ? '-q' : '';
    var g = DX.tasksForIndustry(S.industry), pop = DX.popularFor(S.industry), popIds = pop.map(function (t) { return t.id; });
    function notPop(t) { return popIds.indexOf(t.id) < 0; }
    function f(list) { return DX.searchTasks(q, list, S.country); }
    var label = DX.industryLabel(S.industry), n = 0;
    n += taskGroup('pop-' + S.industry + sfx, 'Popular for ' + label, f(pop), true, box);
    if (S.industry !== 'office' && S.industry !== 'other') n += taskGroup('own-' + S.industry + sfx, label + ' tasks', f(g.own.filter(notPop)), true, box);
    n += taskGroup('common' + sfx, 'General office (any business)', f(g.common.filter(notPop)), searching || S.industry === 'office' || S.industry === 'other', box);
    var others = f(g.others.filter(notPop));
    n += taskGroup('others' + sfx, 'Tasks from other industries', others, searching || others.some(function (t) { return S.sel[t.id]; }), box);
    $('taskNone').hidden = n > 0;
    syncChecks();
  }
  function renderSelChips() {
    var box = $('selChips'); box.textContent = '';
    S.order.forEach(function (id) {
      var t = DX.TASK_BY_ID[id], c = el('span', 'selchip');
      c.appendChild(el('span', null, tName(t)));
      var x = el('button', 'selx', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + tName(t));
      x.addEventListener('click', function () { toggleTask(id, false); });
      c.appendChild(x); box.appendChild(c);
    });
  }
  function syncChecks() {
    var cs = document.querySelectorAll('input[data-task]');
    for (var i = 0; i < cs.length; i++) cs[i].checked = !!S.sel[cs[i].getAttribute('data-task')];
    var txt = S.order.length + ' selected';
    $('selCount').textContent = txt; $('selCount2').textContent = txt;
    renderSelChips();
    if (S.order.length) $('err1').hidden = true;
  }
  function runMatch() {
    var out = $('matchOut'); out.textContent = '';
    var q = $('freeText').value, res = DX.matchFreeText(q, 3, S.industry);
    if (!res.length) { out.appendChild(el('p', 'msg', q.trim().length < 3 ? 'Type at least 3 characters.' : 'No close match. Please pick the nearest task from the list above.')); return; }
    var box = el('div', 'match');
    box.appendChild(el('p', 'grp', 'Closest tasks (ticking one adds it to the list)'));
    res.forEach(function (r) {
      var row = taskRow(DX.TASK_BY_ID[r.id]);
      if (r.hits.length) row.appendChild(el('span', 'why', '"' + r.hits.slice(0, 2).join('", "') + '"'));
      box.appendChild(row);
    });
    out.appendChild(box);
  }

  /* ---------- Step 2 ---------- */
  function renderFreq() {
    var box = $('freqList'); box.textContent = '';
    if (!S.order.length) { box.appendChild(el('p', 'msg', 'No tasks selected yet. Go back to step 1.')); return; }
    S.order.forEach(function (id) {
      var t = DX.TASK_BY_ID[id], s = S.sel[id], row = el('div', 'fq');
      row.appendChild(el('h3', null, tName(t)));
      var g = el('div', 'fq-row');
      var a = el('div'), la = el('label', null, 'How often'), sel = el('select');
      sel.id = 'f-' + id; la.htmlFor = sel.id;
      DX.FREQ_ORDER.forEach(function (k) { var o = el('option', null, DX.FREQ[k].label); o.value = k; if (s.freq === k) o.selected = true; sel.appendChild(o); });
      sel.addEventListener('change', function () { s.freq = sel.value; save(); });
      a.appendChild(la); a.appendChild(sel);
      var b = el('div'), lb = el('label', null, 'Minutes each time'), u = el('div', 'unit'), n = el('input');
      n.type = 'number'; n.inputMode = 'numeric'; n.min = '1'; n.max = '1440'; n.step = '1'; n.value = s.min; n.id = 'm-' + id; lb.htmlFor = n.id;
      n.addEventListener('change', function () { var v = Math.round(Number(n.value)); if (!(v >= 1 && v <= 1440)) v = t.min; s.min = v; n.value = v; save(); });
      u.appendChild(n); u.appendChild(el('span', null, 'min'));
      b.appendChild(lb); b.appendChild(u);
      g.appendChild(a); g.appendChild(b); row.appendChild(g); box.appendChild(row);
    });
  }

  /* ---------- Step 3 ---------- */
  function renderEnv() {
    var boxes = document.querySelectorAll('[data-env]');
    for (var i = 0; i < boxes.length; i++) {
      (function (box) {
        var k = box.getAttribute('data-env'); box.textContent = '';
        Object.keys(DX.ENV_OPTS[k]).forEach(function (v) {
          var lb = el('label'), r = el('input');
          r.type = 'radio'; r.name = 'env-' + k; r.value = v; r.checked = S.env[k] === v;
          r.addEventListener('change', function () { S.env[k] = v; save(); });
          lb.appendChild(r); lb.appendChild(el('span', null, k === 'budget' ? DX.budgetLabel(v, S.country) : DX.ENV_OPTS[k][v]));
          box.appendChild(lb);
        });
      })(boxes[i]);
    }
  }

  function go(n) {
    if (n >= 2 && !S.order.length) { n = 1; $('err1').hidden = false; }
    if (n === 4 && !diag) n = 3;
    S.step = n;
    [1, 2, 3, 4].forEach(function (i) { $('p' + i).hidden = i !== n; });
    var bs = document.querySelectorAll('.stepbtn');
    for (var i = 0; i < bs.length; i++) {
      var k = +bs[i].getAttribute('data-go');
      if (k === n) bs[i].setAttribute('aria-current', 'step'); else bs[i].removeAttribute('aria-current');
      bs[i].disabled = k === 4 && !diag;
    }
    if (n === 2) renderFreq();
    if (n === 3) renderEnv();
    var target = $('p' + n);
    if (target && target.scrollIntoView && window.scrollY > target.offsetTop) target.scrollIntoView({ block: 'start' });
  }

  /* ---------- Results ---------- */
  function srcLinks(ids, prefix) {
    if (!ids || !ids.length) return null;
    var p = el('p', 'srcref', prefix || 'Source: ');
    ids.forEach(function (id, i) {
      var s = D.SOURCES.filter(function (x) { return x.id === id; })[0];
      if (!s) return;
      if (i) p.appendChild(document.createTextNode(' · '));
      p.appendChild(link('#src-' + id, s.title.split(' - ')[0].split(' | ')[0].trim()));
    });
    return p;
  }
  function productBlock(p, compact) {
    var f = document.createDocumentFragment();
    var pr = el('p', 'price'); pr.appendChild(el('b', null, p.price)); pr.appendChild(el('span', 'small', 'USD · one-time purchase (price as shown on Gumroad)'));
    f.appendChild(pr);
    if (!compact) f.appendChild(el('p', 'small', p.what));
    var ls = el('div', 'links');
    if (p.demo) ls.appendChild(link('../' + p.demo, 'Try the demo', 'solid', true));
    ls.appendChild(link(p.url, 'View on Gumroad', p.demo ? null : 'solid', true));
    f.appendChild(ls);
    if (p.demo && !compact) f.appendChild(el('p', 'small', 'The demo switches to English for non-Japanese browsers (language menu at the top). It runs on sample data only.'));
    return f;
  }
  function methodCard(it, x) {
    var m = x.m, ty = D.TYPES[m.type], p = DX.productOf(m);
    var c = el('div', 'mcard' + (x.av.ok ? '' : ' off') + (p ? ' ours' : ''));
    c.appendChild(el('h4', null, DX.methodTitle(m)));
    c.appendChild(el('p', 'kind', ty.label));
    var tg = el('div', 'tags'), cost = DX.methodCost(m);
    tg.appendChild(el('span', 'tag ' + (cost === 'free' ? 'free' : 'paid'), D.COST_LABEL[cost]));
    tg.appendChild(el('span', 'tag', 'Difficulty: ' + D.DIFF_LABEL[x.diff]));
    if (ty.code) tg.appendChild(el('span', 'tag', 'Needs code'));
    if (m.id === it.rec.id) tg.appendChild(el('span', 'tag quick', 'Recommended'));
    tg.appendChild(el('span', 'tag', 'Est. saving ' + Math.round(m.rate * 100) + '%'));
    c.appendChild(tg);
    if (!x.av.ok) c.appendChild(el('p', 'why-off', 'In your setup: ' + x.av.reason));
    if (p) c.appendChild(productBlock(p));
    var pc = el('div', 'pc');
    [['Pros', m.pros], ['Watch out for', m.cons]].forEach(function (pair) {
      var d = el('div'); d.appendChild(el('span', 'h', pair[0]));
      var ul = el('ul'); pair[1].forEach(function (s) { ul.appendChild(el('li', null, s)); });
      d.appendChild(ul); pc.appendChild(d);
    });
    c.appendChild(pc);
    c.appendChild(el('p', 'grp', 'First steps'));
    var ol = el('ol', 'first');
    m.steps.forEach(function (s) { ol.appendChild(el('li', null, DX.stepText(s, diag.env.pc))); });
    c.appendChild(ol);
    var sr = srcLinks(D.TYPES[m.type].src); if (sr) c.appendChild(sr);
    if (x.av.ok) {
      var lb = el('label', 'choose'), r = el('input');
      r.type = 'radio'; r.name = 'ch-' + it.task.id; r.value = m.id; r.checked = it.chosen.id === m.id;
      r.addEventListener('change', function () { if (m.id === it.rec.id) delete S.choices[it.task.id]; else S.choices[it.task.id] = m.id; save(); runDiagnose(false, it.task.id); });
      lb.appendChild(r); lb.appendChild(el('span', null, 'Use this method in my plan'));
      c.appendChild(lb);
    }
    return c;
  }
  function productsSection() {
    var pr = diag.products;
    if (!pr.list.length) return null;
    var sec = el('section', 'sec');
    sec.appendChild(el('h2', null, 'MisaNeco Works tools you could use for this plan'));
    if (diag.env.budget === '0') sec.appendChild(el('p', 'small', 'Your budget is set to nothing extra, so these one-time-purchase tools are not recommended — they are listed for comparison only.'));
    var ul = el('ul', 'prods');
    pr.list.forEach(function (x) {
      var li = el('li');
      li.appendChild(el('div', 'nm', x.p.name));
      li.appendChild(el('div', 'for', 'For: ' + x.tasks.join(', ')));
      li.appendChild(productBlock(x.p, true));
      ul.appendChild(li);
    });
    sec.appendChild(ul);
    if (pr.total) sec.appendChild(el('p', null, 'Total if bought separately: ' + pr.totalText + ' (one-time).'));
    pr.bundles.forEach(function (bx) {
      var b = el('div', 'bundle');
      b.appendChild(el('p', null, null)).appendChild(el('b', null, bx.b.name + ' — ' + bx.b.price + ' USD'));
      b.appendChild(el('p', 'small', bx.count + ' of the tools above are in this bundle (' + bx.hits.join(', ') + ').'));
      var ls = el('div', 'links'); ls.appendChild(link(bx.b.url, 'View on Gumroad', null, true));
      b.appendChild(ls); sec.appendChild(b);
    });
    var fr = el('p', 'small', 'Free first: many tasks can be done with the free methods above. For merging PDFs, try the free ');
    fr.appendChild(link('../' + D.FREE_TOOLS.FileFlowLite.page, D.FREE_TOOLS.FileFlowLite.name, null, true));
    fr.appendChild(document.createTextNode('.'));
    sec.appendChild(fr);
    return sec;
  }
  function renderResult(openTask) {
    var v = $('resView'); v.textContent = '';
    var sum = el('div', 'sum');
    sum.appendChild(el('p', 'k', 'Estimated time you could save across ' + diag.items.length + ' task' + (diag.items.length === 1 ? '' : 's')));
    var big = el('p', 'big', 'About ' + diag.totalHours + ' '); big.appendChild(el('small', null, 'hours/year'));
    sum.appendChild(big);
    sum.appendChild(el('p', null, 'Time these tasks take now: about ' + diag.currentHours + ' hours/year'));
    sum.appendChild(el('p', 'small', 'All figures are estimates (times per year × minutes × saving rate ÷ 60). Whether a method fits — and how much it saves — depends on your business.'));
    v.appendChild(sum);
    var inote = DX.industryNote(diag.industry);
    if (inote) v.appendChild(el('p', 'tnote', 'Note: ' + inote));
    var AP = adPlacements();
    if (AP && AP.count) { v.insertBefore(adDisclosure(), v.firstChild); if (AP.summary) { var sb = adBox(AP.summary); if (sb) v.appendChild(sb); } }
    var ps = productsSection(); if (ps) v.appendChild(ps);
    diag.items.forEach(function (it, i) {
      var box = el('article', 'item'); box.id = 'it-' + it.task.id;
      var h = el('div', 'item-h'); h.appendChild(el('span', 'rank', String(i + 1)));
      var t = el('div', 't'); t.appendChild(el('h3', null, it.name));
      var tg = el('div', 'tags');
      tg.appendChild(el('span', 'tag', 'Ease of automation: ' + it.task.ease));
      it.labels.forEach(function (l) { tg.appendChild(el('span', 'tag ' + (l === 'Quick win' ? 'quick' : 'big'), l)); });
      t.appendChild(tg); h.appendChild(t); box.appendChild(h);
      if (it.note && it.note.text) {
        var nt = el('div', 'tnote'); nt.appendChild(el('p', null, DX.country(diag.country).label + ': ' + it.note.text));
        var sl = srcLinks(it.note.src); if (sl) nt.appendChild(sl);
        box.appendChild(nt);
      }
      var hr = el('div', 'hours');
      var p1 = el('p'); p1.appendChild(el('span', 'small', 'Estimated hours saved per year ')); p1.appendChild(el('b', null, 'about ' + it.hours + ' h'));
      hr.appendChild(p1); hr.appendChild(el('p', 'formula', it.formula + ' (' + DX.FREQ[it.freq].note + ')'));
      box.appendChild(hr);
      var rb = el('div', 'recbox');
      rb.appendChild(el('p', 'k', 'Recommended method')); rb.appendChild(el('p', 'm', DX.methodTitle(it.rec))); rb.appendChild(el('p', 'w', it.why));
      if (it.chosen.id !== it.rec.id) rb.appendChild(el('p', 'w', 'Your plan uses "' + DX.methodTitle(it.chosen) + '" (your choice).'));
      box.appendChild(rb);
      var det = el('details', 'methods'), okN = it.methods.filter(function (x) { return x.av.ok; }).length;
      det.appendChild(el('summary', null, 'Compare methods (' + okN + ' of ' + it.methods.length + ' fit your setup)'));
      it.ranked.map(function (m) { return it.methods.filter(function (x) { return x.m === m; })[0]; })
        .concat(it.methods.filter(function (x) { return !x.av.ok; }))
        .forEach(function (x) { det.appendChild(methodCard(it, x)); });
      if (openTask === it.task.id || (openTask == null && i === 0)) det.open = true;
      box.appendChild(det);
      v.appendChild(box);
      if (AP && AP.afterTask[it.task.id]) { var ab = adBox(AP.afterTask[it.task.id]); if (ab) v.appendChild(ab); }
    });
    var go2 = el('button', 'go wide', 'See my action plan'); go2.type = 'button';
    go2.addEventListener('click', function () { showTab('plan'); window.scrollTo(0, $('p4').offsetTop - 56); });
    v.appendChild(go2);
  }

  /* ---------- Plan ---------- */
  function renderPlan() {
    var v = $('planView'); v.textContent = '';
    plan = DX.buildPlan(diag);
    var pg = DX.planProgress(plan, done);
    v.appendChild(el('h2', 'print-only', 'Action plan (' + DX.fmtDate(new Date(), diag.country) + ')'));
    var pr = el('div', 'prog');
    pr.appendChild(el('p', 'small', 'Progress: ' + pg.done + ' / ' + pg.all + ' (' + pg.pct + '%)'));
    var bar = el('div', 'bar'); bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100'); bar.setAttribute('aria-valuenow', String(pg.pct)); bar.setAttribute('aria-label', 'Action plan progress');
    var fill = el('span'); fill.style.width = pg.pct + '%'; bar.appendChild(fill); pr.appendChild(bar); v.appendChild(pr);
    var act = el('div', 'actions');
    var bP = el('button', 'btn', 'Print / PDF'); bP.type = 'button'; bP.addEventListener('click', function () { window.print(); });
    var bC = el('button', 'btn', 'Download CSV'); bC.type = 'button'; bC.addEventListener('click', downloadCSV);
    var bR = el('button', 'btn ghost', 'Clear all ticks'); bR.type = 'button';
    bR.addEventListener('click', function () { if (window.confirm('Clear all ticks?')) { done = {}; lsDel(KEY_DONE); renderPlan(); } });
    act.appendChild(bP); act.appendChild(bC); act.appendChild(bR); v.appendChild(act);
    v.appendChild(el('p', 'small', 'Ordered so quick wins (easy) and big savings (20+ hours/year) come first (hours saved ÷ difficulty). Ticks are saved only in this browser.'));
    plan.forEach(function (p) {
      var box = el('article', 'pitem');
      box.appendChild(el('h3', null, p.order + '. ' + p.taskName));
      var tg = el('div', 'tags');
      p.labels.forEach(function (l) { tg.appendChild(el('span', 'tag ' + (l === 'Quick win' ? 'quick' : 'big'), l)); });
      tg.appendChild(el('span', 'tag', 'Est. ' + p.hours + ' h/year')); tg.appendChild(el('span', 'tag', p.cost)); tg.appendChild(el('span', 'tag', 'Difficulty: ' + p.diffLabel));
      box.appendChild(tg);
      box.appendChild(el('p', 'meth', 'Method: ' + p.methodTitle));
      var ul = el('ul', 'todo'), n = 0;
      p.steps.forEach(function (s) {
        var li = el('li', done[s.key] ? 'done' : null), lb = el('label'), c = el('input');
        c.type = 'checkbox'; c.checked = !!done[s.key];
        c.addEventListener('change', function () { if (c.checked) done[s.key] = 1; else delete done[s.key]; lsSet(KEY_DONE, done); renderPlan(); });
        if (done[s.key]) n++;
        lb.appendChild(c); lb.appendChild(el('span', null, s.text)); li.appendChild(lb); ul.appendChild(li);
      });
      box.appendChild(ul);
      if (n === p.steps.length) box.appendChild(el('p', 'pdone', 'First steps done for this task'));
      v.appendChild(box);
    });
    var ps = productsSection(); if (ps) v.appendChild(ps);
    var PP = adPlacements();
    if (PP && PP.plan) { var pb = adBox(PP.plan); if (pb) { v.appendChild(adDisclosure()); v.appendChild(pb); } }
  }
  function downloadCSV() {
    var csv = DX.planCSV(plan, done), name = 'action-plan-' + DX.dayString(new Date()) + '.csv';
    try {
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob);
      var a = el('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
    } catch (e) { window.alert('CSV download is not available in this browser.'); }
  }
  function showTab(which) {
    var p = which === 'plan';
    $('tabRes').setAttribute('aria-selected', String(!p)); $('tabPlan').setAttribute('aria-selected', String(p));
    $('resView').hidden = p; $('planView').hidden = !p;
  }

  /* ---------- Sending (only with submitUrl; never in demo) ---------- */
  var DEMO = /[?&]demo=/.test(window.location.search);
  function maybeSend() {
    if (DEMO || !DX.submitEnabled(CFG)) return;
    var payload = DX.buildPayload(answers(), diag, new Date()), hash = DX.payloadHash(payload);
    var sent = ssGet(KEY_SENT); if (!Array.isArray(sent)) sent = [];
    if (!DX.shouldSend(CFG, hash, sent)) return;
    sent.push(hash); ssSet(KEY_SENT, sent.slice(-50));
    try {
      window.fetch(CFG.submitUrl.trim(), {
        method: 'POST', mode: 'no-cors', credentials: 'omit', cache: 'no-store', keepalive: true, referrerPolicy: 'no-referrer',
        body: new URLSearchParams(DX.encodeForm(payload, CFG.fields))
      }).catch(function () { /* page keeps working */ });
    } catch (e) { /* noop */ }
  }

  /* ---------- ads (ads.json + js/ads.js). Never used by logic.js; only placed after results are ready ---------- */
  var ADS = null, ADSX = window.DXADS || null, interShown = false, lastFocus = null;
  var KEY_INTER = 'dxen-inter-day';
  function lsRaw(k) { try { var v = window.localStorage.getItem(k); return v; } catch (e) { return null; } }
  function lsRawSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked: once per page load */ } }
  function adLabel() { return (ADS && ADS.label && ADS.label.en) || 'Advertisement'; }
  function adDisclosure() { return el('p', 'addisc', (ADS && ADS.disclosure && ADS.disclosure.en) || 'This page contains affiliate ads. Ads do not affect the recommendations.'); }
  function adPlacements() { return ADS && ADSX && diag ? ADSX.placements(diag, ADS) : null; }
  function adBox(key) {
    if (!ADS || !ADSX || !ADS.slots || !ADS.slots[key]) return null;
    var s = ADS.slots[key], frag = ADSX.sanitizeTag(s.tag);
    if (!frag) return null;
    var box = el('aside', 'adbox'); box.setAttribute('aria-label', adLabel());
    var h = el('div', 'adhead'); h.appendChild(el('span', 'adtag', adLabel()));
    if (s.advertiser) h.appendChild(el('span', 'adname', s.advertiser));
    box.appendChild(h);
    var b = el('div', 'adbody'); b.appendChild(frag); box.appendChild(b);
    return box;
  }
  function showInterstitial() {
    if (interShown || !ADSX || !ADS) return;
    var today = DX.dayString(new Date()), pick = ADSX.pickInterstitial(ADS, today);
    if (!ADSX.shouldShowInterstitial({ demo: DEMO, pick: pick, lastShown: lsRaw(KEY_INTER), today: today })) return;
    var frag = ADSX.sanitizeTag(pick.tag);
    if (!frag) return;
    var body = $('interBody'); body.textContent = ''; body.appendChild(frag);
    var ims = body.getElementsByTagName ? body.getElementsByTagName('img') : [];
    for (var i = 0; i < ims.length; i++) ims[i].loading = 'eager';
    $('interLabel').textContent = adLabel();
    $('inter').hidden = false; interShown = true;
    lsRawSet(KEY_INTER, today);
    lastFocus = document.activeElement || null;
    $('interClose').focus();
  }
  function closeInter() {
    $('inter').hidden = true; $('interBody').textContent = '';
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* noop */ } }
  }
  function loadAds() {
    try {
      window.fetch('ads.json?v=2026101960', { cache: 'no-cache', credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          ADS = j && typeof j === 'object' ? j : null;
          if (!ADS) return;
          if (diag) { renderResult(); renderPlan(); }
          showInterstitial();
        })['catch'](function () { /* no ads */ });
    } catch (e) { /* no ads */ }
  }
  function runDiagnose(fresh, openTask) {
    if (!S.order.length) { go(1); return; }
    diag = DX.diagnose(answers(), S.choices);
    renderResult(openTask); renderPlan();
    if (fresh) { showTab('res'); go(4); maybeSend(); }
  }

  function renderSources() {
    var ul = $('srcList'); ul.textContent = '';
    D.SOURCES.forEach(function (s) {
      var li = el('li'); li.id = 'src-' + s.id;
      li.appendChild(link(s.source_url, s.title, null, true));
      li.appendChild(el('span', 'c', s.claim + ' (checked ' + DX.fmtDate(isoToDate(s.checked), S.country) + ')'));
      ul.appendChild(li);
    });
  }
  function renderPrivacy() {
    var t = $('privacyText'); t.textContent = DX.privacyLine(CFG);
    if (DX.submitEnabled(CFG)) {
      t.appendChild(document.createTextNode(' ')); t.appendChild(link('privacy.html', 'Details'));
      var n = $('sendNotice'); n.textContent = DX.privacyLine(CFG) + ' '; n.appendChild(link('privacy.html', 'Details')); n.hidden = false;
    }
  }

  function demo(mode) {
    S = { country: DX.countryFromSearch(window.location.search) || 'US', industry: 'plumbing', sel: {}, order: [], env: DX.normalizeEnv({ sheet: 'excel', pc: 'win', m365: 'no', code: 'none', budget: 'low' }), choices: {}, step: 1 };
    [['quote', 'often', 45], ['dispatch', 'daily', 30], ['invoice', 'monthly', 120], ['taxprep', 'monthly', 90], ['mileage', 'weekly', 20], ['reviews', 'daily', 15]].forEach(function (a) { S.sel[a[0]] = { freq: a[1], min: a[2] }; S.order.push(a[0]); });
    done = {};
    renderCountry(); renderSwitcher(); renderIndustry(); renderTasks(); renderResources();
    runDiagnose(false);
    if (mode === 'plan') { plan.slice(0, 2).forEach(function (p) { p.steps.slice(0, 2).forEach(function (s) { done[s.key] = 1; }); }); renderPlan(); showTab('plan'); } else showTab('res');
    go(4);
  }

  function init() {
    load();
    renderCountry(); renderSwitcher(); renderIndustry(); renderTasks(); renderEnv(); renderSources(); renderPrivacy(); renderResources();
    var nx = document.querySelectorAll('[data-next]');
    for (var i = 0; i < nx.length; i++) nx[i].addEventListener('click', function (e) { go(+e.currentTarget.getAttribute('data-next')); });
    var st = document.querySelectorAll('.stepbtn');
    for (var j = 0; j < st.length; j++) st[j].addEventListener('click', function (e) { go(+e.currentTarget.getAttribute('data-go')); });
    $('ctyGo').addEventListener('click', function () { var v = $('ctySel').value; if (v) window.location.href = v; });
    $('matchBtn').addEventListener('click', runMatch);
    $('indSearch').addEventListener('input', renderIndustry);
    $('taskSearch').addEventListener('input', renderTasks);
    $('freeText').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); runMatch(); } });
    $('diagBtn').addEventListener('click', function () { runDiagnose(true); });
    $('againBtn').addEventListener('click', function () { go(1); });
    $('tabRes').addEventListener('click', function () { showTab('res'); });
    $('interClose').addEventListener('click', closeInter);
    $('inter').addEventListener('click', function (e) { if (e.target === $('inter')) closeInter(); });
    if (document.addEventListener) document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('inter').hidden) closeInter(); });
    loadAds();
    $('tabPlan').addEventListener('click', function () { showTab('plan'); });
    window.addEventListener('beforeprint', function () { if (diag) showTab('plan'); });
    var q = /[?&]demo=([a-z0-9]+)/.exec(window.location.search);
    if (q) { demo(q[1] === 'plan' ? 'plan' : 'res'); return; }
    if (S.order.length) runDiagnose(false);
    go(1);
  }
  init();
})();
