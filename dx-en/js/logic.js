/* Small Business Automation Check — logic (pure, deterministic)
   browser: window.DX (uses window.DX_DATA) / node: module.exports (require('./data.js')) */
(function (root) {
  'use strict';
  var D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.DX_DATA;

  var FREQ = {
    daily:   { label: 'Daily', n: 250, note: 'counted as 250 working days a year' },
    often:   { label: 'A few times a week', n: 150, note: 'counted as 3 times a week × 50 weeks' },
    weekly:  { label: 'Weekly', n: 50, note: 'counted as 50 times a year' },
    monthly: { label: 'Monthly', n: 12, note: 'counted as 12 times a year' },
    yearly:  { label: 'A few times a year', n: 4, note: 'counted as 4 times a year' }
  };
  var FREQ_ORDER = ['daily', 'often', 'weekly', 'monthly', 'yearly'];
  var ENV_DEFAULT = { sheet: 'excel', pc: 'win', m365: 'no', code: 'none', budget: '0' };
  var CUR = { US: '$', UK: '£', CA: 'C$', AU: 'A$', OTHER: 'US$' };
  var ENV_OPTS = {
    sheet: { excel: 'Excel', google: 'Google Sheets', both: 'Both', none: 'Neither' },
    pc: { win: 'Windows', mac: 'Mac' },
    m365: { yes: 'Yes (work/school account)', no: 'No / not sure' },
    code: { none: 'No', some: 'A little', yes: 'Yes' },
    budget: { '0': 'Nothing extra', low: 'Small monthly budget', mid: 'Moderate monthly budget' }
  };
  var CODE_PENALTY = { none: 2, some: 1, yes: 0 };
  var APP_VERSION = '20261019';
  var COUNTRY_IDS = D.COUNTRIES.map(function (c) { return c.id; });

  var TASK_BY_ID = {};
  D.TASKS.forEach(function (t) { TASK_BY_ID[t.id] = t; });

  function normalizeCountry(c) { c = String(c || '').toUpperCase(); return COUNTRY_IDS.indexOf(c) >= 0 ? c : 'US'; }
  function isCountry(c) { return COUNTRY_IDS.indexOf(String(c || '').toUpperCase()) >= 0; }
  function country(c) { c = normalizeCountry(c); return D.COUNTRIES.filter(function (x) { return x.id === c; })[0]; }
  function budgetLabel(v, c) {
    var s = CUR[normalizeCountry(c)];
    return { '0': 'Nothing extra', low: 'Up to about ' + s + '20/month', mid: 'Up to about ' + s + '75/month' }[v];
  }
  function normalizeEnv(e) {
    e = e || {};
    var o = {};
    Object.keys(ENV_DEFAULT).forEach(function (k) {
      var v = e[k] == null ? '' : String(e[k]);
      o[k] = ENV_OPTS[k].hasOwnProperty(v) ? v : ENV_DEFAULT[k];
    });
    return o;
  }
  function normalizeIndustry(x) {
    for (var i = 0; i < D.INDUSTRIES.length; i++) if (D.INDUSTRIES[i].id === x) return x;
    return 'office';
  }
  function normalizeSel(s) {
    s = s || {};
    var t = TASK_BY_ID[s.id];
    if (!t) return null;
    var f = FREQ.hasOwnProperty(s.freq) ? s.freq : t.freq;
    var m = Math.round(Number(s.min));
    if (!(m >= 1 && m <= 1440)) m = t.min;
    return { id: t.id, freq: f, min: m };
  }

  /* ---------- Country-aware wording ---------- */
  function taskName(t, c) { return t.countryKey === 'tax' ? country(c).taxTask : t.name; }
  function taskNote(t, c) {
    if (!t.countryKey) return null;
    var k = country(c), key = t.countryKey;
    return { text: k[key + 'Note'], src: k[key + 'Src'] || [] };
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dayString(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function fmtDate(d, c) {
    c = normalizeCountry(c);
    var y = d.getFullYear(), m = pad2(d.getMonth() + 1), dd = pad2(d.getDate());
    if (c === 'US') return m + '/' + dd + '/' + y;
    if (c === 'CA') return y + '-' + m + '-' + dd;
    return dd + '/' + m + '/' + y;
  }

  /* ---------- Industry task lists ---------- */
  function tasksForIndustry(ind) {
    ind = normalizeIndustry(ind);
    var own = [], common = [], others = [];
    D.TASKS.forEach(function (t) {
      var isCommon = t.ind.indexOf('common') >= 0;
      if (ind !== 'office' && ind !== 'other' && t.ind.indexOf(ind) >= 0 && !isCommon) own.push(t);
      else if (isCommon) common.push(t);
      else others.push(t);
    });
    return { own: own, common: common, others: others };
  }

  /* ---------- Methods ---------- */
  function typeOf(m) { return D.TYPES[m.type]; }
  function productOf(m) { return m.type === 'tool' ? D.PRODUCTS[m.product] : null; }
  function methodTitle(m) {
    if (m.type === 'tool') return productOf(m).name + ' (MisaNeco Works)';
    return m.title || typeOf(m).label;
  }
  function methodCost(m) { return typeOf(m).cost; }
  function isPaid(m) { var c = methodCost(m); return c === 'paid' || c === 'buy'; }
  function methodAvailable(m, envIn) {
    var env = normalizeEnv(envIn);
    var ty = typeOf(m), n = ty.needs || {};
    if (n.sheet && n.sheet.indexOf(env.sheet) < 0) {
      if (m.type === 'vba') return { ok: false, reason: 'Needs desktop Excel' };
      if (m.type === 'gas' || m.type === 'gform' || m.type === 'gdrive') return { ok: false, reason: 'Needs Google Sheets / a Google account' };
      return { ok: false, reason: 'Needs a spreadsheet app' };
    }
    if (n.pc && n.pc.indexOf(env.pc) < 0) return { ok: false, reason: 'Windows app — not available on Mac' };
    if (n.m365 && n.m365.indexOf(env.m365) < 0) return { ok: false, reason: 'Needs a Microsoft 365 work or school account' };
    if (n.office && !(env.m365 === 'yes' || env.sheet === 'excel' || env.sheet === 'both')) return { ok: false, reason: 'Needs desktop Word (Microsoft Office)' };
    if (m.type === 'tool') {
      var p = productOf(m);
      if (p.needsSheet && env.sheet === 'none') return { ok: false, reason: 'Needs Excel or Google Sheets' };
    }
    if (n.paid && env.budget === '0') return { ok: false, reason: 'Budget is set to nothing extra (' + (m.type === 'tool' ? 'one-time purchase' : 'paid service') + ')', budget: true };
    return { ok: true, reason: null };
  }
  function effectiveDiff(m, envIn) {
    var env = normalizeEnv(envIn);
    var d = m.diff || typeOf(m).diff;
    if (typeOf(m).code) d += CODE_PENALTY[env.code];
    return Math.min(3, d);
  }
  function filterMethods(task, envIn) { return task.m.filter(function (m) { return methodAvailable(m, envIn).ok; }); }
  function envSummary(envIn) {
    var e = normalizeEnv(envIn);
    var sheet = { excel: 'uses Excel', google: 'uses Google Sheets', both: 'uses Excel and Google Sheets', none: 'no spreadsheet app' }[e.sheet];
    var code = { none: 'doesn\'t write code', some: 'writes a little code', yes: 'writes code' }[e.code];
    var s = (e.pc === 'win' ? 'Windows' : 'Mac') + ', ' + sheet + ', ' + code;
    if (e.m365 === 'yes') s += ', has Microsoft 365';
    if (e.budget === '0') s += ', no extra budget';
    return s;
  }
  function rankMethods(task, envIn) {
    var env = normalizeEnv(envIn);
    var list = task.m.map(function (m, i) { return { m: m, i: i, d: effectiveDiff(m, env), av: methodAvailable(m, env) }; })
      .filter(function (x) { return x.av.ok; });
    list.sort(function (a, b) {
      var fa = typeOf(a.m).fallback ? 1 : 0, fb = typeOf(b.m).fallback ? 1 : 0;
      if (fa !== fb) return fa - fb;
      if (a.d !== b.d) return a.d - b.d;
      var ta = a.m.type === 'tool' ? 0 : 1, tb = b.m.type === 'tool' ? 0 : 1;
      if (ta !== tb) return ta - tb;
      if (a.m.rate !== b.m.rate) return b.m.rate - a.m.rate;
      return a.i - b.i;
    });
    return list.map(function (x) { return x.m; });
  }
  function whyText(m, task, envIn) {
    var env = normalizeEnv(envIn), r;
    if (m.type === 'tool') r = productOf(m).needsSheet ? 'a ready-made spreadsheet for Excel or Google Sheets, so there is nothing to build (one-time purchase)' : 'runs in the browser on Windows or Mac with the fewest steps (one-time purchase)';
    else if (typeOf(m).fallback) r = 'few automation options fit this setup, so start by standardising the process';
    else if (m.type === 'pad') r = 'available at no extra cost on Windows with a Microsoft account, and you can record your clicks';
    else if (m.type === 'pacloud') r = 'works inside your Microsoft 365 account with Outlook and Excel';
    else if (m.type === 'gas' || m.type === 'vba') r = env.code === 'yes' ? 'you can write code, so you can automate the whole routine at no extra cost' : 'automates the whole routine at no extra cost';
    else if (m.type === 'gform') r = 'free with a Google account and puts answers straight into a sheet';
    else if (m.type === 'gdrive') r = 'free with a Google account and easy to use from a phone';
    else if (m.type === 'merge') r = 'uses your Excel list directly at no extra cost';
    else if (m.type === 'text') r = 'free and takes minutes to set up';
    else if (m.type === 'cloud') r = 'fits your budget and needs no building';
    else r = 'works in the spreadsheet you already have, at no extra cost';
    return envSummary(env) + ' → ' + methodTitle(m) + ': ' + r;
  }
  function recommend(task, envIn) {
    var r = rankMethods(task, envIn);
    return { method: r[0], why: whyText(r[0], task, envIn), ranked: r };
  }

  /* ---------- Hours ---------- */
  function round1(x) { return Math.round(x * 10) / 10; }
  function annualHours(freq, min, rate) { var n = FREQ[freq] ? FREQ[freq].n : 0; return round1(n * min * rate / 60); }
  function currentHours(freq, min) { return annualHours(freq, min, 1); }
  function formulaText(freq, min, rate) {
    var f = FREQ[freq];
    return f.label + ' (' + f.n + '/year) × ' + min + ' min × ' + Math.round(rate * 100) + '% saving ÷ 60 = about ' + annualHours(freq, min, rate) + ' h/year';
  }
  var DIFF_WEIGHT = { 1: 1, 2: 2, 3: 3 };
  function priorityScore(hours, diff) { return round1(hours / DIFF_WEIGHT[diff]); }
  function labelsFor(hours, diff) {
    var l = [];
    if (diff <= 1) l.push('Quick win');
    if (hours >= 20) l.push('Big saving');
    return l;
  }

  /* ---------- Diagnose ---------- */
  function diagnose(answers, choices) {
    answers = answers || {}; choices = choices || {};
    var env = normalizeEnv(answers.env), c = normalizeCountry(answers.country);
    var seen = {};
    var sels = (answers.tasks || []).map(normalizeSel).filter(function (s) { if (!s || seen[s.id]) return false; seen[s.id] = 1; return true; });
    var items = sels.map(function (s) {
      var task = TASK_BY_ID[s.id], rec = recommend(task, env), chosen = rec.method;
      if (choices[s.id]) {
        var ch = task.m.filter(function (m) { return m.id === choices[s.id]; })[0];
        if (ch && methodAvailable(ch, env).ok) chosen = ch;
      }
      var diff = effectiveDiff(chosen, env), hours = annualHours(s.freq, s.min, chosen.rate);
      return {
        task: task, name: taskName(task, c), note: taskNote(task, c), freq: s.freq, min: s.min,
        rec: rec.method, why: rec.why, chosen: chosen, ranked: rec.ranked,
        methods: task.m.map(function (m) { return { m: m, av: methodAvailable(m, env), diff: effectiveDiff(m, env) }; }),
        current: currentHours(s.freq, s.min), hours: hours, formula: formulaText(s.freq, s.min, chosen.rate),
        diff: diff, score: priorityScore(hours, diff), labels: labelsFor(hours, diff)
      };
    });
    items.sort(function (a, b) {
      if (a.score !== b.score) return b.score - a.score;
      if (a.hours !== b.hours) return b.hours - a.hours;
      return D.TASKS.indexOf(a.task) - D.TASKS.indexOf(b.task);
    });
    return {
      env: env, country: c, industry: normalizeIndustry(answers.industry), items: items,
      totalHours: round1(items.reduce(function (s, x) { return s + x.hours; }, 0)),
      currentHours: round1(items.reduce(function (s, x) { return s + x.current; }, 0)),
      products: productsFor(items, env)
    };
  }
  function usd(s) { return Number(String(s || '').replace(/[^0-9.]/g, '')) || 0; }
  function productsFor(items, envIn) {
    var env = normalizeEnv(envIn), ids = [], by = {};
    items.forEach(function (it) {
      it.task.m.forEach(function (m) {
        if (m.type !== 'tool') return;
        var av = methodAvailable(m, env);
        if (!av.ok && !av.budget) return;
        if (!by[m.product]) { by[m.product] = { id: m.product, p: D.PRODUCTS[m.product], tasks: [] }; ids.push(m.product); }
        if (by[m.product].tasks.indexOf(it.name) < 0) by[m.product].tasks.push(it.name);
      });
    });
    var list = ids.map(function (id) { return by[id]; });
    var total = list.reduce(function (s, x) { return s + usd(x.p.price); }, 0);
    var bundles = Object.keys(D.BUNDLES).map(function (k) {
      var b = D.BUNDLES[k], hit = list.filter(function (x) { return b.members.indexOf(x.id) >= 0; });
      return { id: k, b: b, hits: hit.map(function (x) { return x.p.name; }), count: hit.length };
    }).filter(function (x) { return x.count >= 2; });
    return { list: list, total: total, totalText: total ? '$' + total + ' USD' : '', bundles: bundles };
  }

  /* ---------- Plan ---------- */
  function stepText(s, pc) { return typeof s === 'string' ? s : (pc === 'mac' ? s.mac : s.win); }
  function buildPlan(diag) {
    return diag.items.map(function (it, i) {
      var m = it.chosen;
      return {
        order: i + 1, taskId: it.task.id, taskName: it.name, methodId: m.id, methodTitle: methodTitle(m),
        cost: D.COST_LABEL[methodCost(m)], diffLabel: D.DIFF_LABEL[it.diff], hours: it.hours, labels: it.labels,
        steps: m.steps.map(function (s, j) { return { key: it.task.id + ':' + m.id + ':' + j, text: stepText(s, diag.env.pc) }; })
      };
    });
  }
  function planProgress(plan, done) {
    done = done || {};
    var all = 0, ok = 0;
    plan.forEach(function (p) { p.steps.forEach(function (s) { all++; if (done[s.key]) ok++; }); });
    return { all: all, done: ok, pct: all ? Math.round(ok * 100 / all) : 0 };
  }
  function csvCell(v) {
    v = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
    return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function planCSV(plan, done) {
    done = done || {};
    var rows = [['Order', 'Task', 'Method', 'Cost', 'Difficulty', 'Estimated hours saved per year', 'Labels', 'Step', 'Done']];
    plan.forEach(function (p) {
      p.steps.forEach(function (s, j) { rows.push([p.order + '-' + (j + 1), p.taskName, p.methodTitle, p.cost, p.diffLabel, p.hours, p.labels.join(' / '), s.text, done[s.key] ? 'yes' : '']); });
    });
    return '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }

  /* ---------- Search & free-text matching (no network, no AI) ---------- */
  function norm(s) {
    s = String(s || '');
    if (s.normalize) s = s.normalize('NFKC');
    return s.toLowerCase().replace(/[^a-z0-9$£ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function compact(s) { return norm(s).replace(/ /g, ''); }
  function stem(w) { return w.length > 4 ? w.replace(/(ies|es|s|ing|ed)$/, '') : w; }
  function hit(q, words) {
    var nq = compact(q);
    if (!nq) return true;
    for (var i = 0; i < words.length; i++) {
      var w = compact(words[i]);
      if (!w) continue;
      if (w.indexOf(nq) >= 0 || (w.length >= 4 && nq.indexOf(w) >= 0)) return true;
      if (stem(w).length >= 4 && nq.indexOf(stem(w)) >= 0) return true;
    }
    return false;
  }
  function searchIndustries(q) { return D.INDUSTRIES.filter(function (x) { return hit(q, [x.label].concat(x.syn || [])); }); }
  function searchTasks(q, tasks, c) {
    var list = tasks || D.TASKS;
    return list.filter(function (t) { return hit(q, [t.name, taskName(t, c)].concat(t.kw)); });
  }
  function matchFreeText(text, limit, industry) {
    var q = norm(text);
    if (q.length < 3) return [];
    var qw = q.split(' ').filter(function (w) { return w.length >= 3; }).map(stem);
    var res = D.TASKS.map(function (t, idx) {
      var score = 0, hits = [];
      t.kw.concat([t.name]).forEach(function (k) {
        var nk = norm(k);
        if (nk.length >= 3 && (' ' + q + ' ').indexOf(' ' + nk) >= 0) { score += 2 + Math.min(nk.length, 12) * 0.25; hits.push(k); }
      });
      var tw = norm(t.name + ' ' + t.kw.join(' ')).split(' ').map(stem);
      qw.forEach(function (w) { if (tw.indexOf(w) >= 0) score += 0.6; });
      if (industry && score >= 1.5 && t.ind.indexOf(industry) >= 0) score += 1;
      return { task: t, score: Math.round(score * 100) / 100, hits: hits, idx: idx };
    }).filter(function (x) { return x.score >= 1.5; });
    res.sort(function (a, b) { return b.score - a.score || a.idx - b.idx; });
    return res.slice(0, limit || 3).map(function (x) { return { id: x.task.id, name: x.task.name, score: x.score, hits: x.hits }; });
  }
  function popularFor(ind) { return ((D.POPULAR && D.POPULAR[normalizeIndustry(ind)]) || []).map(function (id) { return TASK_BY_ID[id]; }).filter(Boolean); }
  function industryLabel(ind) { for (var i = 0; i < D.INDUSTRIES.length; i++) if (D.INDUSTRIES[i].id === ind) return D.INDUSTRIES[i].label; return ''; }
  function industryNote(ind) { return (D.IND_NOTES && D.IND_NOTES[ind]) || ''; }

  /* ---------- Anonymous aggregate data (only when a submit URL is configured) ----------
     Sent: industry, catalog task IDs with frequency/minutes, setup answers, recommended method IDs,
     date (day only), app version, country, src. Never free text, names or contact details. */
  var PAYLOAD_KEYS = ['industry', 'tasks', 'env', 'methods', 'date', 'version', 'country', 'src'];
  function buildPayload(answers, diag, now) {
    var env = normalizeEnv(answers && answers.env);
    var d = diag || diagnose(answers);
    return {
      industry: d.industry,
      tasks: d.items.map(function (it) { return it.task.id + ':' + it.freq + ':' + it.min; }).sort().join(','),
      env: ['sheet=' + env.sheet, 'pc=' + env.pc, 'm365=' + env.m365, 'code=' + env.code, 'budget=' + env.budget].join(';'),
      methods: d.items.map(function (it) { return it.task.id + ':' + it.rec.id; }).sort().join(','),
      date: dayString(now instanceof Date ? now : new Date()),
      version: APP_VERSION,
      country: d.country,
      src: 'dx-en'
    };
  }
  function encodeForm(payload, fields) {
    return PAYLOAD_KEYS.map(function (k) {
      var name = (fields && fields[k]) || k;
      return encodeURIComponent(name) + '=' + encodeURIComponent(payload[k] == null ? '' : payload[k]);
    }).join('&');
  }
  function payloadHash(p) {
    var s = PAYLOAD_KEYS.map(function (k) { return k === 'date' ? '' : p[k]; }).join('|');
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul ? Math.imul(h, 16777619) : (h * 16777619) | 0; }
    return (h >>> 0).toString(16);
  }
  function submitEnabled(config) { return !!(config && typeof config.submitUrl === 'string' && /^https:\/\/[^\s]+$/.test(config.submitUrl.trim())); }
  function shouldSend(config, hash, sent) { if (!submitEnabled(config)) return false; return !(sent && sent.indexOf(hash) >= 0); }
  function privacyLine(config) {
    return submitEnabled(config)
      ? 'Your selected industry, tasks and setup (no personal information) are used in aggregate to improve our tools. Free-text and names are never sent.'
      : 'Nothing you enter is sent anywhere — everything runs in this page.';
  }

  /* ---------- Country switcher (shared with the Japanese version) ---------- */
  var SWITCHER = [
    { id: 'JP', label: '日本 (Japan)', href: '../dx/' },
    { id: 'US', label: 'United States', href: '../dx-en/?country=US' },
    { id: 'UK', label: 'United Kingdom', href: '../dx-en/?country=UK' },
    { id: 'CA', label: 'Canada', href: '../dx-en/?country=CA' },
    { id: 'AU', label: 'Australia', href: '../dx-en/?country=AU' },
    { id: 'OTHER', label: 'Other', href: '../dx-en/?country=OTHER' }
  ];
  function countryFromSearch(search) {
    var m = /[?&]country=([A-Za-z]+)/.exec(search || '');
    return m && isCountry(m[1]) ? m[1].toUpperCase() : null;
  }

  var API = {
    FREQ: FREQ, FREQ_ORDER: FREQ_ORDER, ENV_OPTS: ENV_OPTS, ENV_DEFAULT: ENV_DEFAULT, APP_VERSION: APP_VERSION, PAYLOAD_KEYS: PAYLOAD_KEYS, SWITCHER: SWITCHER,
    DATA: D, TASK_BY_ID: TASK_BY_ID,
    normalizeEnv: normalizeEnv, normalizeIndustry: normalizeIndustry, normalizeCountry: normalizeCountry, isCountry: isCountry, country: country, budgetLabel: budgetLabel,
    taskName: taskName, taskNote: taskNote, fmtDate: fmtDate, dayString: dayString, countryFromSearch: countryFromSearch,
    tasksForIndustry: tasksForIndustry, methodTitle: methodTitle, methodCost: methodCost, isPaid: isPaid, productOf: productOf,
    methodAvailable: methodAvailable, effectiveDiff: effectiveDiff, filterMethods: filterMethods, rankMethods: rankMethods, recommend: recommend, envSummary: envSummary,
    annualHours: annualHours, currentHours: currentHours, formulaText: formulaText, priorityScore: priorityScore, labelsFor: labelsFor,
    diagnose: diagnose, productsFor: productsFor, buildPlan: buildPlan, planProgress: planProgress, planCSV: planCSV, stepText: stepText,
    norm: norm, searchIndustries: searchIndustries, searchTasks: searchTasks, matchFreeText: matchFreeText, popularFor: popularFor, industryLabel: industryLabel, industryNote: industryNote,
    buildPayload: buildPayload, encodeForm: encodeForm, payloadHash: payloadHash, submitEnabled: submitEnabled, shouldSend: shouldSend, privacyLine: privacyLine
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.DX = API;
})(typeof window !== 'undefined' ? window : this);
