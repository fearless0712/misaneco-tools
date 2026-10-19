/* 業務の自動化 診断＆推進プラン — 判定ロジック（純粋関数・決定的）
   browser: window.DX（window.DX_DATA を使う） / node: module.exports（require('./data.js')） */
(function (root) {
  'use strict';
  var D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.DX_DATA;

  var FREQ = {
    daily:   { label: '毎日', n: 250, note: '年250回（営業日）で計算' },
    often:   { label: '週数回', n: 150, note: '年150回（週3回×50週）で計算' },
    weekly:  { label: '週1', n: 50, note: '年50回で計算' },
    monthly: { label: '月1', n: 12, note: '年12回で計算' },
    yearly:  { label: '年数回', n: 4, note: '年4回で計算' }
  };
  var FREQ_ORDER = ['daily', 'often', 'weekly', 'monthly', 'yearly'];
  var ENV_DEFAULT = { sheet: 'excel', pc: 'win', m365: 'no', code: 'none', budget: '0' };
  var ENV_OPTS = {
    sheet: { excel: 'Excel', google: 'Googleスプレッドシート', both: 'どちらも', none: '使っていない' },
    pc: { win: 'Windows', mac: 'Mac' },
    m365: { yes: 'ある', no: 'ない・わからない' },
    code: { none: '書けない', some: '少し', yes: '書ける' },
    budget: { '0': '0円', '3000': '月3,000円まで', '10000': '月10,000円まで' }
  };
  var CODE_PENALTY = { none: 2, some: 1, yes: 0 };
  var APP_VERSION = '20261019';

  var TASK_BY_ID = {};
  D.TASKS.forEach(function (t) { TASK_BY_ID[t.id] = t; });

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

  /* ---------- 業種ごとの業務 ---------- */
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

  /* ---------- 方法 ---------- */
  function typeOf(m) { return D.TYPES[m.type]; }
  function productOf(m) { return m.type === 'tool' ? D.PRODUCTS[m.product] : null; }
  function methodTitle(m) {
    if (m.type === 'tool') { var p = productOf(m); return p.bundleOnly ? p.name + '・' + D.BUNDLES[p.bundleOnly].name + '（MisaNeco Works）' : p.name + '（MisaNeco Works）'; }
    return m.title || typeOf(m).label;
  }
  function methodCost(m) { return typeOf(m).cost; }
  function isPaid(m) { var c = methodCost(m); return c === 'paid' || c === 'buy'; }

  /* 環境で使えるか。ok=false のときは reason（なぜ使えないか） */
  function methodAvailable(m, envIn) {
    var env = normalizeEnv(envIn);
    var ty = typeOf(m), n = ty.needs || {};
    if (n.sheet && n.sheet.indexOf(env.sheet) < 0) {
      if (m.type === 'vba') return { ok: false, reason: 'デスクトップ版のExcelが必要' };
      if (m.type === 'gas' || m.type === 'gform') return { ok: false, reason: 'Googleスプレッドシート（Googleアカウント）が必要' };
      return { ok: false, reason: '表計算ソフトが必要' };
    }
    if (n.pc && n.pc.indexOf(env.pc) < 0) return { ok: false, reason: 'Windows 用のアプリなので、Mac では使えない' };
    if (n.m365 && n.m365.indexOf(env.m365) < 0) return { ok: false, reason: 'Microsoft 365（職場または学校のアカウント）が必要' };
    if (n.office && !(env.m365 === 'yes' || env.sheet === 'excel' || env.sheet === 'both')) return { ok: false, reason: 'Word（Microsoft Office）が必要' };
    if (m.type === 'tool') {
      var p = productOf(m);
      if (p.needsExcel && !(env.sheet === 'excel' || env.sheet === 'both')) return { ok: false, reason: 'Excelが必要' };
    }
    if (n.paid && env.budget === '0') return { ok: false, reason: '予算0円のため（' + (m.type === 'tool' ? '買い切りの有料ツール' : '有料サービス') + '）', budget: true };
    return { ok: true, reason: null };
  }

  function effectiveDiff(m, envIn) {
    var env = normalizeEnv(envIn);
    var d = m.diff || typeOf(m).diff;
    if (typeOf(m).code) d += CODE_PENALTY[env.code];
    return Math.min(3, d);
  }

  function filterMethods(task, envIn) {
    return task.m.filter(function (m) { return methodAvailable(m, envIn).ok; });
  }

  function envSummary(envIn) {
    var e = normalizeEnv(envIn);
    var sheet = { excel: 'Excelを使っていて', google: 'Googleスプレッドシートを使っていて', both: 'ExcelとGoogleスプレッドシートを使っていて', none: '表計算は使っていなくて' }[e.sheet];
    var code = { none: 'プログラムは書かない', some: 'プログラムは少し書ける', yes: 'プログラムを書ける' }[e.code];
    var s = (e.pc === 'win' ? 'Windows' : 'Mac') + '・' + sheet + '、' + code;
    if (e.m365 === 'yes') s += '、Microsoft 365あり';
    if (e.budget === '0') s += '、予算0円';
    return s;
  }

  /* 推薦：環境で使えるもの → 実際のむずかしさが低い → 同じならMisaNeco Worksのツール → 削減率が高い → 並び順。
     「手順をそろえる」は、ほかに使える方法がないときだけ */
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
    var env = normalizeEnv(envIn);
    var reason;
    if (m.type === 'tool' && productOf(m).bundleOnly) reason = 'Excelで開く管理表で、Windows・Mac どちらでも使え、作る手間がないため（セットの買い切り）';
    else if (m.type === 'tool') reason = 'ブラウザで動くので Windows・Mac どちらでも使え、手順が少ないため（買い切り）';
    else if (typeOf(m).fallback) reason = 'この環境で使える自動化の方法が少ないため、まず手順をそろえるところから';
    else if (m.type === 'pad') reason = 'Windows で追加料金なしで使え、操作を記録して作れるため';
    else if (m.type === 'pacloud') reason = 'Microsoft 365 の今の契約の範囲で、メールや表とつなげられるため';
    else if (m.type === 'gas' || m.type === 'vba') reason = env.code === 'yes' ? 'プログラムを書けるなら、追加費用なしで手順をまとめて自動にできるため' : '追加費用なしで、手順をまとめて自動にできるため';
    else if (m.type === 'gform') reason = 'Googleのアカウントで追加費用なしに、入力を表に自動でためられるため';
    else if (m.type === 'merge') reason = 'Excelの一覧をそのまま使え、追加費用がかからないため';
    else if (m.type === 'text') reason = '追加費用なしで、数分で始められるため';
    else if (m.type === 'cloud') reason = '予算の範囲で、作る手間をかけずに始められるため';
    else reason = '今ある表計算ソフトで、追加費用なしに始められるため';
    return envSummary(env) + ' → ' + methodTitle(m) + '：' + reason;
  }

  function recommend(task, envIn) {
    var r = rankMethods(task, envIn);
    var m = r[0];
    return { method: m, why: whyText(m, task, envIn), ranked: r };
  }

  /* ---------- 時間の目安 ---------- */
  function round1(x) { return Math.round(x * 10) / 10; }
  function annualHours(freq, min, rate) {
    var n = FREQ[freq] ? FREQ[freq].n : 0;
    return round1(n * min * rate / 60);
  }
  function currentHours(freq, min) { return annualHours(freq, min, 1); }
  function formulaText(freq, min, rate) {
    var f = FREQ[freq];
    return f.label + '（年' + f.n + '回）× ' + min + '分 × 削減率' + Math.round(rate * 100) + '% ÷ 60 ＝ 約' + annualHours(freq, min, rate) + '時間/年';
  }

  var DIFF_WEIGHT = { 1: 1, 2: 2, 3: 3 };
  function priorityScore(hours, diff) { return round1(hours / DIFF_WEIGHT[diff]); }
  function labelsFor(hours, diff) {
    var l = [];
    if (diff <= 1) l.push('すぐできる');
    if (hours >= 20) l.push('効果大');
    return l;
  }

  /* ---------- 診断 ---------- */
  function diagnose(answers, choices) {
    answers = answers || {};
    choices = choices || {};
    var env = normalizeEnv(answers.env);
    var seen = {};
    var sels = (answers.tasks || []).map(normalizeSel).filter(function (s) {
      if (!s || seen[s.id]) return false; seen[s.id] = 1; return true;
    });
    var items = sels.map(function (s) {
      var task = TASK_BY_ID[s.id];
      var rec = recommend(task, env);
      var chosen = rec.method;
      if (choices[s.id]) {
        var c = task.m.filter(function (m) { return m.id === choices[s.id]; })[0];
        if (c && methodAvailable(c, env).ok) chosen = c;
      }
      var diff = effectiveDiff(chosen, env);
      var hours = annualHours(s.freq, s.min, chosen.rate);
      return {
        task: task, freq: s.freq, min: s.min,
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
    var total = round1(items.reduce(function (s, x) { return s + x.hours; }, 0));
    var cur = round1(items.reduce(function (s, x) { return s + x.current; }, 0));
    return { env: env, industry: normalizeIndustry(answers.industry), items: items, totalHours: total, currentHours: cur, products: productsFor(items, env) };
  }

  /* ---------- MisaNeco Works のツール（このプランで使えるもの） ----------
     対象：各業務の方法に入っているツールで、環境（OS・Excel）で使えるもの。予算0円でも一覧には出す（無料の方法の代わりにはしない） */
  function yenToNum(s) { return Number(String(s || '').replace(/[^0-9]/g, '')) || 0; }
  function productsFor(items, envIn) {
    var env = normalizeEnv(envIn);
    var ids = [], byId = {};
    items.forEach(function (it) {
      it.task.m.forEach(function (m) {
        if (m.type !== 'tool') return;
        var av = methodAvailable(m, env);
        if (!av.ok && !av.budget) return;
        if (!byId[m.product]) { byId[m.product] = { id: m.product, p: D.PRODUCTS[m.product], tasks: [] }; ids.push(m.product); }
        if (byId[m.product].tasks.indexOf(it.task.name) < 0) byId[m.product].tasks.push(it.task.name);
      });
    });
    var list = ids.map(function (id) { return byId[id]; });
    var single = list.filter(function (x) { return !x.p.bundleOnly; });
    var total = single.reduce(function (s, x) { return s + yenToNum(x.p.price); }, 0);
    var bundles = Object.keys(D.BUNDLES).map(function (k) {
      var b = D.BUNDLES[k];
      var hit = list.filter(function (x) { return b.members.indexOf(x.id) >= 0; });
      return { id: k, b: b, hits: hit.map(function (x) { return x.p.name; }), count: hit.length };
    }).filter(function (x) { return x.count >= 2; });
    return { list: list, total: total, totalText: total ? '¥' + total.toLocaleString('en-US') : '', bundleOnly: list.filter(function (x) { return !!x.p.bundleOnly; }).length, bundles: bundles };
  }

  /* ---------- 推進プラン ---------- */
  function stepText(s, pc) {
    if (typeof s === 'string') return s;
    return pc === 'mac' ? s.mac : s.win;
  }
  function buildPlan(diag) {
    var pc = diag.env.pc;
    return diag.items.map(function (it, i) {
      var m = it.chosen;
      return {
        order: i + 1, taskId: it.task.id, taskName: it.task.name, methodId: m.id, methodTitle: methodTitle(m),
        cost: D.COST_LABEL[methodCost(m)], diffLabel: D.DIFF_LABEL[it.diff], hours: it.hours, labels: it.labels,
        steps: m.steps.map(function (s, j) { return { key: it.task.id + ':' + m.id + ':' + j, text: stepText(s, pc) }; })
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
    var rows = [['順番', '業務', '方法', '費用', 'むずかしさ', '年間で減らせる時間の目安（時間）', 'ラベル', 'やること', '完了']];
    plan.forEach(function (p) {
      p.steps.forEach(function (s, j) {
        rows.push([p.order + '-' + (j + 1), p.taskName, p.methodTitle, p.cost, p.diffLabel, p.hours, p.labels.join('・'), s.text, done[s.key] ? '済' : '']);
      });
    });
    return '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }

  /* ---------- 自由記入 → 近い業務（キーワード＋文字の2文字組の重なり。通信なし） ---------- */
  function normText(s) {
    s = String(s || '');
    if (s.normalize) s = s.normalize('NFKC');
    return s.toLowerCase().replace(/[\s、。・,.!！?？「」（）()]/g, '');
  }
  function bigrams(s) {
    var o = {};
    for (var i = 0; i < s.length - 1; i++) o[s.substr(i, 2)] = 1;
    return o;
  }
  function matchFreeText(text, limit) {
    var q = normText(text);
    if (q.length < 2) return [];
    var qb = bigrams(q), qn = Object.keys(qb).length;
    var res = D.TASKS.map(function (t, idx) {
      var score = 0, hits = [];
      t.kw.concat([t.name]).forEach(function (k) {
        var nk = normText(k);
        if (nk.length >= 2 && q.indexOf(nk) >= 0) { score += 2 + Math.min(nk.length, 6) * 0.5; hits.push(k); }
        else if (nk.length === 1 && q === nk) { score += 1; hits.push(k); }
      });
      var tb = bigrams(normText(t.name + t.kw.join(''))), common = 0;
      Object.keys(qb).forEach(function (b) { if (tb[b]) common++; });
      score += qn ? common / qn * 2 : 0;
      return { task: t, score: Math.round(score * 100) / 100, hits: hits, idx: idx };
    }).filter(function (x) { return x.score >= 1.5; });
    res.sort(function (a, b) { return b.score - a.score || a.idx - b.idx; });
    return res.slice(0, limit || 3).map(function (x) { return { id: x.task.id, name: x.task.name, score: x.score, hits: x.hits }; });
  }

  /* ---------- 匿名の集計データ（送信先が設定されているときだけ使う） ----------
     送るもの：業種・選んだ業務のID・頻度・時間・環境・推奨した方法のID・日付（日まで）・アプリの版。
     自由記入の文章・名前・連絡先は入れない */
  var PAYLOAD_KEYS = ['industry', 'tasks', 'env', 'methods', 'date', 'version'];
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dayString(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function buildPayload(answers, diag, now) {
    var env = normalizeEnv(answers && answers.env);
    var d = diag || diagnose(answers);
    var tasks = d.items.map(function (it) { return it.task.id + ':' + it.freq + ':' + it.min; }).sort();
    var methods = d.items.map(function (it) { return it.task.id + ':' + it.rec.id; }).sort();
    return {
      industry: d.industry,
      tasks: tasks.join(','),
      env: ['sheet=' + env.sheet, 'pc=' + env.pc, 'm365=' + env.m365, 'code=' + env.code, 'budget=' + env.budget].join(';'),
      methods: methods.join(','),
      date: dayString(now instanceof Date ? now : new Date()),
      version: APP_VERSION
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
  function submitEnabled(config) {
    return !!(config && typeof config.submitUrl === 'string' && /^https:\/\/[^\s]+$/.test(config.submitUrl.trim()));
  }
  /* 送るかどうか（送信先あり・同じ結果はまだ送っていない） */
  function shouldSend(config, hash, sentHashes) {
    if (!submitEnabled(config)) return false;
    return !(sentHashes && sentHashes.indexOf(hash) >= 0);
  }
  function privacyLine(config) {
    return submitEnabled(config)
      ? 'このアプリで選んだ業務と環境（個人が分からない情報）は、ツール改善のための集計に使います。自由記入の文章や名前・連絡先は送りません。'
      : '入力内容は外部に送信しません（この画面の中だけで判定します）。';
  }

  var API = {
    FREQ: FREQ, FREQ_ORDER: FREQ_ORDER, ENV_OPTS: ENV_OPTS, ENV_DEFAULT: ENV_DEFAULT, APP_VERSION: APP_VERSION, PAYLOAD_KEYS: PAYLOAD_KEYS,
    DATA: D, TASK_BY_ID: TASK_BY_ID,
    normalizeEnv: normalizeEnv, normalizeIndustry: normalizeIndustry, tasksForIndustry: tasksForIndustry,
    methodTitle: methodTitle, methodCost: methodCost, isPaid: isPaid, productOf: productOf,
    methodAvailable: methodAvailable, effectiveDiff: effectiveDiff, filterMethods: filterMethods, rankMethods: rankMethods,
    recommend: recommend, envSummary: envSummary,
    annualHours: annualHours, currentHours: currentHours, formulaText: formulaText, priorityScore: priorityScore, labelsFor: labelsFor,
    diagnose: diagnose, productsFor: productsFor, buildPlan: buildPlan, planProgress: planProgress, planCSV: planCSV, stepText: stepText,
    matchFreeText: matchFreeText, buildPayload: buildPayload, encodeForm: encodeForm, payloadHash: payloadHash,
    submitEnabled: submitEnabled, shouldSend: shouldSend, privacyLine: privacyLine, dayString: dayString
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.DX = API;
})(typeof window !== 'undefined' ? window : this);
