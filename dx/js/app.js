/* 業務の自動化 診断＆推進プラン — 画面
   ・判定は js/logic.js（この画面の中だけで行う）
   ・保存は localStorage（使えない環境でも動く。すべて try/catch）
   ・自由記入の文章は保存も送信もしない
   ・送信は js/config.js の submitUrl が設定されているときだけ（空なら通信の処理は一度も呼ばれない） */
(function () {
  'use strict';
  var DX = window.DX, D = DX.DATA, CFG = window.DX_CONFIG || {};
  var KEY = 'dx-diag-v1', KEY_DONE = 'dx-plan-done-v1', KEY_SENT = 'dx-sent-v1';

  /* ---------- 小さな道具 ---------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function lsGet(k) { try { var v = window.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 保存できない環境でも続ける */ } }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) { /* noop */ } }
  function ssGet(k) { try { var v = window.sessionStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function ssSet(k, v) { try { window.sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* noop */ } }
  function link(href, text, cls, ext) {
    var a = el('a', cls || null, text);
    a.href = href;
    if (ext) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  }
  function jpDate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? (+m[1]) + '年' + (+m[2]) + '月' + (+m[3]) + '日' : iso; }

  /* ---------- 状態 ---------- */
  var S = { industry: 'office', sel: {}, order: [], env: DX.normalizeEnv({}), choices: {}, step: 1 };
  var done = {};
  var diag = null, plan = null;

  function answers() {
    return { industry: S.industry, tasks: S.order.map(function (id) { return { id: id, freq: S.sel[id].freq, min: S.sel[id].min }; }), env: S.env };
  }
  function save() { lsSet(KEY, { industry: S.industry, sel: S.sel, order: S.order, env: S.env, choices: S.choices }); }
  function load() {
    var v = lsGet(KEY);
    if (!v || typeof v !== 'object') return;
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
    var d = lsGet(KEY_DONE);
    if (d && typeof d === 'object') done = d;
  }
  function toggleTask(id, on) {
    var t = DX.TASK_BY_ID[id];
    if (!t) return;
    if (on && !S.sel[id]) { S.sel[id] = { freq: t.freq, min: t.min }; S.order.push(id); }
    if (!on && S.sel[id]) { delete S.sel[id]; S.order = S.order.filter(function (x) { return x !== id; }); }
    save();
    syncChecks();
  }

  /* ---------- STEP 1 ---------- */
  function renderIndustry() {
    var box = $('industry'); box.textContent = '';
    D.INDUSTRIES.forEach(function (ind) {
      var lb = el('label'), r = el('input');
      r.type = 'radio'; r.name = 'industry'; r.value = ind.id; r.checked = S.industry === ind.id;
      r.addEventListener('change', function () { S.industry = ind.id; save(); renderTasks(); });
      lb.appendChild(r); lb.appendChild(el('span', null, ind.label));
      box.appendChild(lb);
    });
  }
  function taskRow(t) {
    var lb = el('label', 'tk'), c = el('input');
    c.type = 'checkbox'; c.value = t.id; c.setAttribute('data-task', t.id); c.checked = !!S.sel[t.id];
    c.addEventListener('change', function () { toggleTask(t.id, c.checked); });
    lb.appendChild(c);
    lb.appendChild(el('span', 'nm', t.name));
    var e = el('span', 'ease ' + (t.ease === '高' ? 'e-high' : t.ease === '中' ? 'e-mid' : 'e-low'), '自動化しやすさ ' + t.ease);
    lb.appendChild(e);
    return lb;
  }
  function group(title, tasks, parent) {
    if (!tasks.length) return;
    parent.appendChild(el('p', 'grp', title));
    var g = el('div', 'tasks');
    tasks.forEach(function (t) { g.appendChild(taskRow(t)); });
    parent.appendChild(g);
  }
  function renderTasks() {
    var g = DX.tasksForIndustry(S.industry), box = $('taskList'), other = $('taskListOther');
    box.textContent = ''; other.textContent = '';
    var indLabel = D.INDUSTRIES.filter(function (x) { return x.id === S.industry; })[0].label;
    group(indLabel + 'の業務', g.own, box);
    group('事務全般（どの業種でも）', g.common, box);
    var byInd = {};
    g.others.forEach(function (t) { var k = t.ind[0]; (byInd[k] = byInd[k] || []).push(t); });
    D.INDUSTRIES.forEach(function (ind) { if (byInd[ind.id]) group(ind.label + 'の業務', byInd[ind.id], other); });
    $('otherInd').hidden = !g.others.length;
    if (g.others.some(function (t) { return S.sel[t.id]; })) $('otherInd').open = true;
    syncChecks();
  }
  function syncChecks() {
    var cs = document.querySelectorAll('input[data-task]');
    for (var i = 0; i < cs.length; i++) cs[i].checked = !!S.sel[cs[i].getAttribute('data-task')];
    $('selCount').textContent = S.order.length + '件選択中';
    if (S.order.length) $('err1').hidden = true;
  }
  function runMatch() {
    var out = $('matchOut'); out.textContent = '';
    var q = $('freeText').value;
    var res = DX.matchFreeText(q, 3);
    if (!res.length) { out.appendChild(el('p', 'msg', q.trim().length < 2 ? '2文字以上で書いてください。' : '近い業務が見つかりませんでした。上の一覧から近いものを選んでください。')); return; }
    var box = el('div', 'match');
    box.appendChild(el('p', 'grp', '近い業務（選ぶと上の一覧にも入ります）'));
    res.forEach(function (r) {
      var row = taskRow(DX.TASK_BY_ID[r.id]);
      if (r.hits.length) row.appendChild(el('span', 'why', '「' + r.hits.slice(0, 2).join('」「') + '」'));
      box.appendChild(row);
    });
    out.appendChild(box);
  }

  /* ---------- STEP 2 ---------- */
  function renderFreq() {
    var box = $('freqList'); box.textContent = '';
    if (!S.order.length) { box.appendChild(el('p', 'msg', '業務が選ばれていません。1に戻って選んでください。')); return; }
    S.order.forEach(function (id, i) {
      var t = DX.TASK_BY_ID[id], s = S.sel[id];
      var row = el('div', 'fq');
      row.appendChild(el('h3', null, t.name));
      var g = el('div', 'fq-row');
      var a = el('div'), la = el('label', null, '頻度'), sel = el('select');
      sel.id = 'f-' + id; la.htmlFor = sel.id;
      DX.FREQ_ORDER.forEach(function (k) { var o = el('option', null, DX.FREQ[k].label); o.value = k; if (s.freq === k) o.selected = true; sel.appendChild(o); });
      sel.addEventListener('change', function () { s.freq = sel.value; save(); });
      a.appendChild(la); a.appendChild(sel);
      var b = el('div'), lb = el('label', null, '1回の時間'), u = el('div', 'unit'), n = el('input');
      n.type = 'number'; n.inputMode = 'numeric'; n.min = '1'; n.max = '1440'; n.step = '1'; n.value = s.min; n.id = 'm-' + id; lb.htmlFor = n.id;
      n.addEventListener('change', function () { var v = Math.round(Number(n.value)); if (!(v >= 1 && v <= 1440)) v = t.min; s.min = v; n.value = v; save(); });
      u.appendChild(n); u.appendChild(el('span', null, '分'));
      b.appendChild(lb); b.appendChild(u);
      g.appendChild(a); g.appendChild(b);
      row.appendChild(g);
      box.appendChild(row);
    });
  }

  /* ---------- STEP 3 ---------- */
  function renderEnv() {
    var boxes = document.querySelectorAll('[data-env]');
    for (var i = 0; i < boxes.length; i++) {
      (function (box) {
        var k = box.getAttribute('data-env'); box.textContent = '';
        Object.keys(DX.ENV_OPTS[k]).forEach(function (v) {
          var lb = el('label'), r = el('input');
          r.type = 'radio'; r.name = 'env-' + k; r.value = v; r.checked = S.env[k] === v;
          r.addEventListener('change', function () { S.env[k] = v; save(); });
          lb.appendChild(r); lb.appendChild(el('span', null, DX.ENV_OPTS[k][v]));
          box.appendChild(lb);
        });
      })(boxes[i]);
    }
  }

  /* ---------- 画面の切りかえ ---------- */
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

  /* ---------- 結果 ---------- */
  function srcRefs(m) {
    var ids = (D.TYPES[m.type].src || []).slice();
    if (!ids.length) return null;
    var p = el('p', 'srcref', '出典：');
    ids.forEach(function (id, i) {
      var s = D.SOURCES.filter(function (x) { return x.id === id; })[0];
      if (!s) return;
      if (i) p.appendChild(document.createTextNode('・'));
      p.appendChild(link('#src-' + id, s.title.split(' - ')[0].split('|')[0].trim()));
    });
    return p;
  }
  function productBlock(p, compact) {
    var f = document.createDocumentFragment();
    var pr = el('p', 'price');
    if (p.bundleOnly) {
      var b = D.BUNDLES[p.bundleOnly];
      pr.appendChild(el('span', 'small', b.name + 'に入っています'));
      pr.appendChild(el('b', null, b.price));
      pr.appendChild(el('span', 'small', '買い切り'));
    } else {
      pr.appendChild(el('b', null, p.price));
      pr.appendChild(el('span', 'small', '買い切り'));
      if (p.browsers) pr.appendChild(el('span', 'small', '対応ブラウザ：' + p.browsers));
    }
    f.appendChild(pr);
    if (!compact) f.appendChild(el('p', 'small', p.what));
    var ls = el('div', 'links');
    if (p.bundleOnly) {
      ls.appendChild(link(D.BUNDLES[p.bundleOnly].booth, 'BOOTHで見る', 'solid', true));
    } else {
      ls.appendChild(link('../' + p.page, '体験版を試す', 'solid', true));
      ls.appendChild(link(p.booth, 'BOOTHで見る', null, true));
    }
    f.appendChild(ls);
    return f;
  }
  function methodCard(it, x, idx) {
    var m = x.m, ty = D.TYPES[m.type], p = DX.productOf(m);
    var c = el('div', 'mcard' + (x.av.ok ? '' : ' off') + (p ? ' ours' : ''));
    c.appendChild(el('h4', null, DX.methodTitle(m)));
    c.appendChild(el('p', 'kind', ty.label));
    var tg = el('div', 'tags');
    var cost = DX.methodCost(m);
    tg.appendChild(el('span', 'tag ' + (cost === 'free' ? 'free' : 'paid'), D.COST_LABEL[cost]));
    tg.appendChild(el('span', 'tag', 'むずかしさ：' + D.DIFF_LABEL[x.diff]));
    if (ty.code) tg.appendChild(el('span', 'tag', 'プログラムを書く'));
    if (m.id === it.rec.id) tg.appendChild(el('span', 'tag quick', 'おすすめ'));
    tg.appendChild(el('span', 'tag', '削減率の目安 ' + Math.round(m.rate * 100) + '%'));
    c.appendChild(tg);
    if (!x.av.ok) c.appendChild(el('p', 'why-off', 'この環境では：' + x.av.reason));
    if (p) c.appendChild(productBlock(p));
    var pc = el('div', 'pc');
    [['よい点', m.pros], ['気をつける点', m.cons]].forEach(function (pair) {
      var d = el('div'); d.appendChild(el('span', 'h', pair[0]));
      var ul = el('ul'); pair[1].forEach(function (s) { ul.appendChild(el('li', null, s)); });
      d.appendChild(ul); pc.appendChild(d);
    });
    c.appendChild(pc);
    c.appendChild(el('p', 'grp', 'はじめの一歩'));
    var ol = el('ol', 'first');
    m.steps.forEach(function (s) { ol.appendChild(el('li', null, DX.stepText(s, diag.env.pc))); });
    c.appendChild(ol);
    var sr = srcRefs(m); if (sr) c.appendChild(sr);
    if (x.av.ok) {
      var lb = el('label', 'choose'), r = el('input');
      r.type = 'radio'; r.name = 'ch-' + it.task.id; r.value = m.id; r.checked = it.chosen.id === m.id;
      r.addEventListener('change', function () {
        if (m.id === it.rec.id) delete S.choices[it.task.id]; else S.choices[it.task.id] = m.id;
        save(); runDiagnose(false, it.task.id);
      });
      lb.appendChild(r); lb.appendChild(el('span', null, 'この方法をプランに使う'));
      c.appendChild(lb);
    }
    return c;
  }
  function productsSection(title) {
    var pr = diag.products;
    if (!pr.list.length) return null;
    var sec = el('section', 'sec');
    sec.appendChild(el('h2', null, title || 'このプランで使えるMisaNeco Worksのツール'));
    if (diag.env.budget === '0') sec.appendChild(el('p', 'small', '予算0円のため、おすすめには入れていません（買い切りの有料ツールです）。無料の方法と見くらべるときの参考にしてください。'));
    var ul = el('ul', 'prods');
    pr.list.forEach(function (x) {
      var li = el('li');
      li.appendChild(el('div', 'nm', x.p.name));
      li.appendChild(el('div', 'for', '使える業務：' + x.tasks.join('、')));
      li.appendChild(productBlock(x.p, true));
      ul.appendChild(li);
    });
    sec.appendChild(ul);
    if (pr.total) sec.appendChild(el('p', null, '単品の合計：' + pr.totalText + '（買い切り）' + (pr.bundleOnly ? '。このほかにセットだけに入っているExcelの管理表があります。' : '')));
    pr.bundles.forEach(function (bx) {
      var b = el('div', 'bundle');
      b.appendChild(el('p', null, null)).appendChild(el('b', null, bx.b.name + '　' + bx.b.price));
      b.appendChild(el('p', 'small', bx.b.note));
      b.appendChild(el('p', 'small', 'このプランのツールのうち ' + bx.count + ' 本が入っています（' + bx.hits.join('、') + '）。'));
      b.appendChild(el('p', 'small', '入っているもの：' + bx.b.contents));
      var ls = el('div', 'links'); ls.appendChild(link(bx.b.booth, 'BOOTHで見る', null, true));
      b.appendChild(ls);
      sec.appendChild(b);
    });
    sec.appendChild(el('p', 'small', '無料の方法（表計算・定型文など）でできることも多いので、上の比較とあわせて選んでください。'));
    return sec;
  }
  function renderResult(openTask) {
    var v = $('resView'); v.textContent = '';
    var sum = el('div', 'sum');
    sum.appendChild(el('p', 'k', '選んだ ' + diag.items.length + ' 件の業務で、年間に減らせる時間の目安'));
    var big = el('p', 'big', '約' + diag.totalHours + ' '); big.appendChild(el('small', null, '時間/年'));
    sum.appendChild(big);
    sum.appendChild(el('p', null, '今かかっている時間の目安：約' + diag.currentHours + '時間/年'));
    sum.appendChild(el('p', 'small', 'すべて目安です（回数/年 × 1回の分数 × 削減率 ÷ 60）。合うかどうか・どれだけ減るかは、業務の中身や量によって変わります。'));
    v.appendChild(sum);
    var ps = productsSection(); if (ps) v.appendChild(ps);

    diag.items.forEach(function (it, i) {
      var box = el('article', 'item'); box.id = 'it-' + it.task.id;
      var h = el('div', 'item-h');
      h.appendChild(el('span', 'rank', String(i + 1)));
      var t = el('div', 't');
      t.appendChild(el('h3', null, it.task.name));
      var tg = el('div', 'tags');
      tg.appendChild(el('span', 'tag', '自動化しやすさ ' + it.task.ease));
      it.labels.forEach(function (l) { tg.appendChild(el('span', 'tag ' + (l === 'すぐできる' ? 'quick' : 'big'), l)); });
      t.appendChild(tg); h.appendChild(t); box.appendChild(h);

      var hr = el('div', 'hours');
      var p1 = el('p'); p1.appendChild(el('span', 'small', '年間で減らせる時間の目安 ')); p1.appendChild(el('b', null, '約' + it.hours + '時間'));
      hr.appendChild(p1);
      hr.appendChild(el('p', 'formula', it.formula + '（' + DX.FREQ[it.freq].note + '）'));
      box.appendChild(hr);

      var rb = el('div', 'recbox');
      rb.appendChild(el('p', 'k', 'おすすめの方法'));
      rb.appendChild(el('p', 'm', DX.methodTitle(it.rec)));
      rb.appendChild(el('p', 'w', it.why));
      if (it.chosen.id !== it.rec.id) rb.appendChild(el('p', 'w', 'プランでは「' + DX.methodTitle(it.chosen) + '」を使います（あなたが選択）。'));
      box.appendChild(rb);

      var det = el('details', 'methods');
      var okN = it.methods.filter(function (x) { return x.av.ok; }).length;
      det.appendChild(el('summary', null, '方法をくらべる（この環境で使える方法 ' + okN + ' / ' + it.methods.length + '）'));
      var ordered = it.ranked.map(function (m) { return it.methods.filter(function (x) { return x.m === m; })[0]; })
        .concat(it.methods.filter(function (x) { return !x.av.ok; }));
      ordered.forEach(function (x, j) { det.appendChild(methodCard(it, x, j)); });
      if (openTask === it.task.id || (openTask == null && i === 0)) det.open = true;
      box.appendChild(det);
      v.appendChild(box);
    });
    var go2 = el('button', 'go wide', '推進プランを見る'); go2.type = 'button';
    go2.addEventListener('click', function () { showTab('plan'); window.scrollTo(0, $('p4').offsetTop - 56); });
    v.appendChild(go2);
  }

  /* ---------- 推進プラン ---------- */
  function renderPlan() {
    var v = $('planView'); v.textContent = '';
    plan = DX.buildPlan(diag);
    var pg = DX.planProgress(plan, done);
    v.appendChild(el('h2', 'print-only', '推進プラン（' + jpDate(DX.dayString(new Date())) + '）'));
    var pr = el('div', 'prog');
    pr.appendChild(el('p', 'small', '進み具合：' + pg.done + ' / ' + pg.all + '（' + pg.pct + '%）'));
    var bar = el('div', 'bar'); bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100'); bar.setAttribute('aria-valuenow', String(pg.pct)); bar.setAttribute('aria-label', '推進プランの進み具合');
    var fill = el('span'); fill.style.width = pg.pct + '%'; bar.appendChild(fill); pr.appendChild(bar);
    v.appendChild(pr);
    var act = el('div', 'actions');
    var bP = el('button', 'btn', '印刷・PDF'); bP.type = 'button'; bP.addEventListener('click', function () { window.print(); });
    var bC = el('button', 'btn', 'CSVで保存'); bC.type = 'button'; bC.addEventListener('click', downloadCSV);
    var bR = el('button', 'btn ghost', 'チェックを全部外す'); bR.type = 'button';
    bR.addEventListener('click', function () { if (window.confirm('チェックを全部外しますか？')) { done = {}; lsDel(KEY_DONE); renderPlan(); } });
    act.appendChild(bP); act.appendChild(bC); act.appendChild(bR);
    v.appendChild(act);
    v.appendChild(el('p', 'small', '「すぐできる」（むずかしさが低い）と「効果大」（年20時間以上の目安）から先に並べています（年間で減らせる時間 ÷ むずかしさ の大きい順）。チェックはこの端末のブラウザにだけ保存されます。'));
    plan.forEach(function (p) {
      var box = el('article', 'pitem');
      var h = el('h3', null, p.order + '. ' + p.taskName);
      box.appendChild(h);
      var tg = el('div', 'tags');
      p.labels.forEach(function (l) { tg.appendChild(el('span', 'tag ' + (l === 'すぐできる' ? 'quick' : 'big'), l)); });
      tg.appendChild(el('span', 'tag', '目安 約' + p.hours + '時間/年'));
      tg.appendChild(el('span', 'tag', p.cost));
      tg.appendChild(el('span', 'tag', 'むずかしさ：' + p.diffLabel));
      box.appendChild(tg);
      box.appendChild(el('p', 'meth', '方法：' + p.methodTitle));
      var ul = el('ul', 'todo'), n = 0;
      p.steps.forEach(function (s) {
        var li = el('li' + '', done[s.key] ? 'done' : null), lb = el('label'), c = el('input');
        c.type = 'checkbox'; c.checked = !!done[s.key];
        c.addEventListener('change', function () {
          if (c.checked) done[s.key] = 1; else delete done[s.key];
          lsSet(KEY_DONE, done); renderPlan();
        });
        if (done[s.key]) n++;
        lb.appendChild(c); lb.appendChild(el('span', null, s.text));
        li.appendChild(lb); ul.appendChild(li);
      });
      box.appendChild(ul);
      if (n === p.steps.length) box.appendChild(el('p', 'pdone', 'この業務の はじめの一歩 は完了です'));
      v.appendChild(box);
    });
    var ps = productsSection(); if (ps) v.appendChild(ps);
  }
  function downloadCSV() {
    var csv = DX.planCSV(plan, done);
    var name = '推進プラン_' + DX.dayString(new Date()).replace(/-/g, '') + '.csv';
    try {
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = el('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
    } catch (e) {
      window.alert('この環境ではCSVを保存できませんでした。');
    }
  }
  function showTab(which) {
    var plan = which === 'plan';
    $('tabRes').setAttribute('aria-selected', String(!plan));
    $('tabPlan').setAttribute('aria-selected', String(plan));
    $('resView').hidden = plan; $('planView').hidden = !plan;
  }

  /* ---------- 送信（submitUrl があるときだけ） ---------- */
  var DEMO = /[?&]demo=/.test(window.location.search);
  function maybeSend() {
    if (DEMO || !DX.submitEnabled(CFG)) return;
    var payload = DX.buildPayload(answers(), diag, new Date());
    var hash = DX.payloadHash(payload);
    var sent = ssGet(KEY_SENT); if (!Array.isArray(sent)) sent = [];
    if (!DX.shouldSend(CFG, hash, sent)) return;
    sent.push(hash); ssSet(KEY_SENT, sent.slice(-50));
    try {
      window.fetch(CFG.submitUrl.trim(), {
        method: 'POST', mode: 'no-cors', credentials: 'omit', cache: 'no-store', keepalive: true, referrerPolicy: 'no-referrer',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: DX.encodeForm(payload, CFG.fields)
      }).catch(function () { /* 送れなくても画面はそのまま */ });
    } catch (e) { /* noop */ }
  }

  function runDiagnose(fresh, openTask) {
    if (!S.order.length) { go(1); return; }
    diag = DX.diagnose(answers(), S.choices);
    renderResult(openTask);
    renderPlan();
    if (fresh) { showTab('res'); go(4); maybeSend(); }
  }

  /* ---------- 出典 ---------- */
  function renderSources() {
    var ul = $('srcList'); ul.textContent = '';
    D.SOURCES.forEach(function (s) {
      var li = el('li'); li.id = 'src-' + s.id;
      li.appendChild(link(s.source_url, s.title, null, !/^\.\.?\//.test(s.source_url)));
      li.appendChild(el('span', 'c', s.claim + '（確認日：' + jpDate(s.checked) + '）'));
      ul.appendChild(li);
    });
  }

  /* ---------- お知らせの文 ---------- */
  function renderPrivacy() {
    var on = DX.submitEnabled(CFG);
    var t = $('privacyText'); t.textContent = DX.privacyLine(CFG);
    if (on) {
      t.appendChild(document.createTextNode(' '));
      t.appendChild(link('privacy.html', 'くわしく'));
      var n = $('sendNotice'); n.textContent = DX.privacyLine(CFG) + ' ';
      n.appendChild(link('privacy.html', 'くわしく')); n.hidden = false;
    }
  }

  /* ---------- デモ（?demo=1 結果 / ?demo=plan プラン） ---------- */
  function demo(mode) {
    S = { industry: 'realestate', sel: {}, order: [], env: DX.normalizeEnv({ sheet: 'excel', pc: 'win', m365: 'no', code: 'none', budget: '3000' }), choices: {}, step: 1 };
    [['invoice', 'monthly', 120], ['reconcile', 'monthly', 90], ['mailsend', 'daily', 10], ['hankyo', 'daily', 20], ['baikai', 'weekly', 20], ['flyer', 'often', 40]].forEach(function (a) {
      S.sel[a[0]] = { freq: a[1], min: a[2] }; S.order.push(a[0]);
    });
    done = {};
    renderIndustry(); renderTasks();
    runDiagnose(false);
    if (mode === 'plan') {
      plan.slice(0, 2).forEach(function (p) { p.steps.slice(0, 2).forEach(function (s) { done[s.key] = 1; }); });
      renderPlan(); showTab('plan');
    } else showTab('res');
    go(4);
  }

  /* ---------- はじめ ---------- */
  function init() {
    load();
    renderIndustry(); renderTasks(); renderEnv(); renderSources(); renderPrivacy();
    var nx = document.querySelectorAll('[data-next]');
    for (var i = 0; i < nx.length; i++) nx[i].addEventListener('click', function (e) { go(+e.currentTarget.getAttribute('data-next')); });
    var st = document.querySelectorAll('.stepbtn');
    for (var j = 0; j < st.length; j++) st[j].addEventListener('click', function (e) { go(+e.currentTarget.getAttribute('data-go')); });
    $('matchBtn').addEventListener('click', runMatch);
    $('freeText').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); runMatch(); } });
    $('diagBtn').addEventListener('click', function () { runDiagnose(true); });
    $('againBtn').addEventListener('click', function () { go(1); });
    $('tabRes').addEventListener('click', function () { showTab('res'); });
    $('tabPlan').addEventListener('click', function () { showTab('plan'); });
    window.addEventListener('beforeprint', function () { if (diag) { showTab('plan'); } });
    var q = /[?&]demo=([a-z0-9]+)/.exec(window.location.search);
    if (q) { demo(q[1] === 'plan' ? 'plan' : 'res'); return; }
    if (S.order.length) { runDiagnose(false); }
    go(1);
  }
  init();
})();
