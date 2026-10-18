(function () {
  'use strict';
  var D = window.SellCheckSteps;
  var KEY = 'sellcheck.v1';
  var INTER_KEY = 'sellcheck.inter';

  var T = {
    ja: {
      title: 'iPhoneを売る・譲る前チェック',
      lead: '売る・譲る・下取りに出す前の作業を、順番どおりに終わらせるためのチェックリストです。',
      privacy: '選んだ内容とチェックはこの端末の中にだけ保存されます。外部には送りません。',
      setupH: '最初に選んでください',
      qMethod: 'どうやって手放しますか？', mShop: '買取店に売る', mFlea: 'フリマで売る', mTrade: '下取りに出す', mFamily: '家族に譲る',
      qNew: '新しいiPhoneに、クイックスタートでデータを移しますか？', yes: 'はい', no: 'いいえ', noNew: 'いいえ（新しいiPhoneはない）',
      qWatch: 'Apple Watchとペアリングしていますか？',
      qSim: 'SIMはどちらですか？', simPhys: 'SIMカード（物理SIM）', simHint: 'わからない場合：SIMトレイにカードが入っていれば物理SIMです。',
      qApps: '使っているものを選んでください（複数可）', aLine: 'LINE', aAuth: '認証アプリ（2段階認証のコードが出るアプリ）', aBank: '銀行・決済アプリ',
      setupErr: 'まだ選んでいない質問があります。', make: 'チェックリストを作る',
      progress: '進み具合', doneH: 'すべて終わりました', doneP: '手放す準備ができました。',
      adTag: '広告', adH: '売る準備ができたら',
      edit: '選び直す', reset: 'チェックを全部消す', resetQ: 'チェックを全部消しますか？',
      src: '出典', step: '手順',
      notesH: 'このチェックリストについて',
      n1: '手順はApple公式サポートなどの公式ページで確認した内容だけを載せています。各手順の「出典」から元のページを開けます。',
      n2: '画面の名前はiOSのバージョンで変わることがあります。違う場合は出典のページを確認してください。',
      n3: 'LINE・認証アプリ・銀行や決済アプリの手続きは、各サービスの公式案内を確認してください。',
      n4: 'このサイトはAppleとは関係ありません。',
      foot: 'iPhoneを売る・譲る前チェック', close: '閉じる', langBtn: 'EN', carrierPrefix: '確認ページ：'
    },
    en: {
      title: 'Before You Sell Your iPhone',
      lead: 'A step-by-step checklist to finish everything before you sell, give away, or trade in your iPhone.',
      privacy: 'Your choices and checks are saved only on this device. Nothing is sent anywhere.',
      setupH: 'Start here',
      qMethod: 'How are you letting it go?', mShop: 'Sell to a buyback shop', mFlea: 'Sell on a marketplace app', mTrade: 'Trade it in', mFamily: 'Give it to family',
      qNew: 'Will you move your data to a new iPhone with Quick Start?', yes: 'Yes', no: 'No', noNew: 'No (no new iPhone)',
      qWatch: 'Is an Apple Watch paired?',
      qSim: 'Which SIM do you use?', simPhys: 'SIM card (physical)', simHint: 'Not sure? If there’s a card in the SIM tray, it’s a physical SIM.',
      qApps: 'Which of these do you use? (choose any)', aLine: 'LINE', aAuth: 'Authenticator app (2FA codes)', aBank: 'Bank / payment apps',
      setupErr: 'Some questions are not answered yet.', make: 'Make my checklist',
      progress: 'Progress', doneH: 'All done', doneP: 'Your iPhone is ready to hand over.',
      adTag: 'Ad', adH: 'When you’re ready to sell',
      edit: 'Change answers', reset: 'Clear all checks', resetQ: 'Clear all checks?',
      src: 'Source', step: 'Step',
      notesH: 'About this checklist',
      n1: 'Steps include only what we confirmed on official pages such as Apple Support. Open each step’s “Source” to see the original.',
      n2: 'Menu names can differ by iOS version. If they don’t match, check the source page.',
      n3: 'For LINE, authenticator apps, and bank or payment apps, check each service’s official guide.',
      n4: 'This site is not affiliated with Apple.',
      foot: 'Before You Sell Your iPhone', close: 'Close', langBtn: '日本語', carrierPrefix: 'Check page: '
    }
  };

  // ---- 保存（失敗しても動くように） ----
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') return s; } catch (e) {}
    return {};
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  var state = load();
  if (!state.checks) state.checks = {};
  if (!state.lang) state.lang = (navigator.language || 'ja').toLowerCase().indexOf('ja') === 0 ? 'ja' : 'en';
  var ads = null;

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function t(k) { return T[state.lang][k] || k; }

  // ---- 言語 ----
  function applyLang() {
    document.documentElement.lang = state.lang;
    document.title = t('title');
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) els[i].textContent = t(els[i].getAttribute('data-i18n'));
    $('langBtn').textContent = t('langBtn');
    $('langBtn').setAttribute('aria-label', state.lang === 'ja' ? 'English' : '日本語');
    $('interClose').setAttribute('aria-label', t('close'));
  }

  // ---- 選択 ----
  function readSel() {
    var f = $('setup');
    function radio(n) { var el = f.querySelector('input[name="' + n + '"]:checked'); return el ? el.value : null; }
    var m = radio('method'), n = radio('newIphone'), w = radio('watch'), s = radio('sim');
    if (!m || !n || !w || !s) return null;
    return { method: m, newIphone: n === 'yes', watch: w === 'yes', sim: s,
             line: f.querySelector('input[name=line]').checked,
             auth: f.querySelector('input[name=auth]').checked,
             bank: f.querySelector('input[name=bank]').checked };
  }
  function writeSel(sel) {
    var f = $('setup');
    function set(n, v) { var el = f.querySelector('input[name="' + n + '"][value="' + v + '"]'); if (el) el.checked = true; }
    set('method', sel.method); set('newIphone', sel.newIphone ? 'yes' : 'no'); set('watch', sel.watch ? 'yes' : 'no'); set('sim', sel.sim);
    f.querySelector('input[name=line]').checked = !!sel.line;
    f.querySelector('input[name=auth]').checked = !!sel.auth;
    f.querySelector('input[name=bank]').checked = !!sel.bank;
  }

  // ---- チェックリスト描画 ----
  function render() {
    var sel = state.sel; if (!sel) return;
    var L = state.lang;
    var steps = D.buildSteps(sel);
    var html = '', n = 0;
    D.GROUPS.forEach(function (g) {
      var gs = steps.filter(function (s) { return s.group === g.id; });
      if (!gs.length) return;
      html += '<div class="group" data-group="' + g.id + '"><h2>' + esc(g[L]) + '</h2>';
      gs.forEach(function (s) {
        n++;
        var c = !!state.checks[s.id];
        var body = s[L].b.slice();
        if (s.method && s.method[sel.method]) body.unshift(s.method[sel.method][L]);
        html += '<div class="step' + (c ? ' checked' : '') + '" data-id="' + s.id + '">' +
          '<label class="row"><input type="checkbox" data-step="' + s.id + '"' + (c ? ' checked' : '') + '>' +
          '<span><span class="num">' + esc(t('step')) + ' ' + n + '</span><span class="t">' + esc(s[L].t) + '</span></span></label>';
        if (body.length) html += '<ul>' + body.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>';
        if (s.carriers) {
          html += '<div class="carriers">' + D.CARRIERS.map(function (c2) {
            return '<a href="' + esc(c2.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t('carrierPrefix') + c2[L]) + '</a>';
          }).join('') + '</div>';
        }
        if (s.src.length) {
          html += '<div class="src">' + esc(t('src')) + (L === 'ja' ? '：' : ': ') + s.src.map(function (k) {
            var r = D.SRC[k][L];
            return '<a href="' + esc(r[1]) + '" target="_blank" rel="noopener noreferrer">' + esc(r[0]) + '</a>';
          }).join(L === 'ja' ? ' ／ ' : ' / ') + '</div>';
        }
        html += '</div>';
      });
      html += '</div>';
    });
    $('groups').innerHTML = html;
    updateProgress();
    renderAds();
  }

  function updateProgress() {
    var steps = D.buildSteps(state.sel);
    var done = steps.filter(function (s) { return state.checks[s.id]; }).length;
    var pct = steps.length ? Math.round(done * 100 / steps.length) : 0;
    $('pText').textContent = done + ' / ' + steps.length;
    $('pFill').style.width = pct + '%';
    $('pBar').setAttribute('aria-valuenow', String(pct));
    $('pBar').classList.toggle('full', done === steps.length);
    $('done').hidden = done !== steps.length;
  }

  // ---- 広告（ads.json。中身が空なら表示しない） ----
  function validAd(a) { return a && typeof a.href === 'string' && /^https:\/\//.test(a.href); }
  function adHtml(a) {
    var L = state.lang;
    var txt = a['text_' + L] || a.text_ja || '';
    var h = '<a class="aditem" href="' + esc(a.href) + '" target="_blank" rel="sponsored noopener">';
    if (a.img && /^https:\/\//.test(a.img)) h += '<img src="' + esc(a.img) + '" alt="' + esc(a.name || '') + '"' + (a.imgW ? ' width="' + (+a.imgW) + '"' : '') + (a.imgH ? ' height="' + (+a.imgH) + '"' : '') + '>';
    if (a.name) h += '<div class="an">' + esc(a.name) + '</div>';
    if (txt) h += '<div class="ad-d">' + esc(txt) + '</div>';
    h += '</a>';
    if (a.pixel && /^https:\/\//.test(a.pixel)) h += '<img class="px" src="' + esc(a.pixel) + '" alt="" width="1" height="1">';
    return h;
  }
  function renderAds() {
    var box = $('adBox');
    var list = (ads && Array.isArray(ads.inline)) ? ads.inline.filter(validAd) : [];
    if (!state.sel || !D.showAds(state.sel) || !list.length) { box.hidden = true; $('adItems').innerHTML = ''; return; }
    $('adItems').innerHTML = list.map(adHtml).join('');
    box.hidden = false;
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function maybeInterstitial() {
    var a = ads && ads.interstitial;
    if (!validAd(a) || !state.sel || !D.showAds(state.sel)) return;
    var last = null; try { last = localStorage.getItem(INTER_KEY); } catch (e) {}
    if (last === today()) return;
    try { localStorage.setItem(INTER_KEY, today()); } catch (e) {}
    $('interBody').innerHTML = adHtml(a);
    $('inter').hidden = false;
    $('interClose').focus();
  }
  function closeInter() { $('inter').hidden = true; $('interBody').innerHTML = ''; }

  function loadAds() {
    if (!window.fetch) return;
    fetch('ads.json', { cache: 'no-store', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { ads = j; if (state.sel && !$('list').hidden) { renderAds(); maybeInterstitial(); } })
      .catch(function () { ads = null; });
  }

  // ---- 画面切り替え ----
  function showList() {
    $('setup').hidden = true; $('list').hidden = false;
    render(); maybeInterstitial();
  }
  function showSetup() {
    $('list').hidden = true; $('setup').hidden = false;
    if (state.sel) writeSel(state.sel);
  }

  // ---- イベント ----
  $('makeBtn').addEventListener('click', function () {
    var sel = readSel();
    if (!sel) { $('setupErr').hidden = false; return; }
    $('setupErr').hidden = true;
    state.sel = sel; save(); showList();
    window.scrollTo(0, 0);
  });
  $('groups').addEventListener('change', function (e) {
    var id = e.target.getAttribute('data-step'); if (!id) return;
    if (e.target.checked) state.checks[id] = true; else delete state.checks[id];
    save();
    var card = e.target.closest('.step'); if (card) card.classList.toggle('checked', e.target.checked);
    updateProgress();
  });
  $('editBtn').addEventListener('click', function () { showSetup(); window.scrollTo(0, 0); });
  $('resetBtn').addEventListener('click', function () {
    if (!window.confirm(t('resetQ'))) return;
    state.checks = {}; save(); render();
  });
  $('langBtn').addEventListener('click', function () {
    state.lang = state.lang === 'ja' ? 'en' : 'ja'; save(); applyLang(); if (state.sel && !$('list').hidden) render();
  });
  $('interClose').addEventListener('click', closeInter);
  $('inter').addEventListener('click', function (e) { if (e.target === $('inter')) closeInter(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('inter').hidden) closeInter(); });

  // ---- 起動 ----
  applyLang();
  if (state.sel) { writeSel(state.sel); showList(); } else { showSetup(); }
  loadAds();
})();
