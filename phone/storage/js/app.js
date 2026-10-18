/* StorageCheck 画面 */
(function () {
  'use strict';
  var PLANS = null, GUIDES = null, ADS = null;
  var state = { os: 'ios', pm: 'gb', vm: 'gb' };
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function link(url, text) {
    var a = el('a', null, text);
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }
  function getJSON(p) {
    return fetch(p, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); });
  }

  /* ---------- 入力 ---------- */
  function setSeg(attr, val) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-' + attr + ']'), function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-' + attr) === val ? 'true' : 'false');
    });
  }
  function setOS(os) {
    state.os = os; setSeg('os', os);
    var h = GUIDES && GUIDES.howto_measure[os];
    var p = $('howMeasure'); p.textContent = '';
    if (h) { p.appendChild(document.createTextNode('調べ方：' + h.text + ' ')); p.appendChild(link(h.url, '公式の説明')); }
    $('delLabel').textContent = os === 'ios' ? '写真の「最近削除した項目」に入っている量（わかれば）' : 'Googleフォトの「ゴミ箱」に入っている量（わかれば）';
  }
  function setPM(m) {
    state.pm = m; setSeg('pm', m);
    $('phUnit').textContent = m === 'gb' ? 'GB' : '枚';
    $('inPhoto').placeholder = m === 'gb' ? '例 30' : '例 8000';
  }
  function setVM(m) {
    state.vm = m; setSeg('vm', m);
    $('vdUnit').textContent = m === 'gb' ? 'GB' : '本';
    $('inVideo').placeholder = m === 'gb' ? '例 20' : '例 150';
    $('vidMinWrap').hidden = m !== 'count';
  }

  function readInput() {
    var n = SC.num;
    return {
      os: state.os,
      capacity: n($('inCap').value),
      free: n($('inFree').value),
      photoMode: state.pm, photoValue: n($('inPhoto').value),
      videoMode: state.vm, videoValue: n($('inVideo').value), videoMin: n($('inVidMin').value),
      photoMB: n($('inPhotoMB').value),
      line: n($('inLine').value), apps: n($('inApps').value), deleted: n($('inDel').value),
      target: n($('inTarget').value),
      clouds: { icloud: $('cIcloud').checked, google: $('cGoogle').checked, amazonPrime: $('cPrime').checked }
    };
  }

  var FIELD_ID = { free: 'inFree', capacity: 'inCap', photoValue: 'inPhoto', videoValue: 'inVideo', videoMin: 'inVidMin', photoMB: 'inPhotoMB', line: 'inLine', apps: 'inApps', deleted: 'inDel', target: 'inTarget' };

  /* ---------- 結果 ---------- */
  function sec(title, num) {
    var s = el('section', 'sec');
    var h = el('h2', 'sec-h');
    if (num) h.appendChild(el('span', 'num', num));
    h.appendChild(document.createTextNode(title));
    s.appendChild(h);
    return s;
  }
  function kv(dl, k, v, strong) {
    var d = el('div', 'kv-i');
    d.appendChild(el('dt', null, k));
    d.appendChild(el('dd', strong ? 'strong' : null, v));
    dl.appendChild(d);
  }

  function renderSummary(r) {
    var box = el('div', 'res-head');
    box.appendChild(el('p', 'res-kicker', '診断結果（目安）'));
    var msg;
    if (r.reachable === 'already') msg = '今の空き容量（' + SC.gb(r.free) + '）は目標の ' + SC.gb(r.target) + ' 以上です';
    else msg = '目標の ' + SC.gb(r.target) + ' まで、あと ' + SC.gb(r.shortfall) + ' 空ける必要があります';
    box.appendChild(el('p', 'res-main', msg));
    var sub;
    if (r.reachable === 'already') sub = 'このままでも大丈夫そうです。写真を守るためのバックアップ先として、下のクラウドやパソコンへの保存を確認しておくと安心です。';
    else if (r.reachable === 'without_media') sub = 'キャッシュ・アプリ・削除済みの整理だけで、最大 ' + SC.gb(r.totalWithoutMedia) + ' 空く計算です（写真・動画を移さなくても届く可能性があります）。';
    else if (r.reachable === 'with_media') sub = '写真・動画をクラウドやパソコンに移すところまで含めると、最大 ' + SC.gb(r.totalMax) + ' 空く計算です。';
    else sub = '入力した項目を全部整理しても最大 ' + SC.gb(r.totalMax) + ' で、目標には届かない計算です。ほかのアプリや音楽・ダウンロードした動画なども確認してください。';
    box.appendChild(el('p', 'res-sub', sub));
    var dl = el('dl', 'kv');
    kv(dl, '本体の容量', SC.gb(r.capacity));
    kv(dl, '使用中', SC.gb(r.used));
    kv(dl, '今の空き', SC.gb(r.free), true);
    kv(dl, '写真', SC.gb(r.photosGB));
    kv(dl, '動画', SC.gb(r.videosGB));
    kv(dl, 'LINE', SC.gb(r.line));
    box.appendChild(dl);
    return box;
  }

  function renderBackup(r) {
    var d = el('div', 'backup');
    d.appendChild(el('p', 'backup-h', 'はじめに：バックアップ'));
    d.appendChild(el('p', null, '下の「取り消せない」と書いた操作の前に、必ずバックアップを取ってください。'));
    var ul = el('ul', 'links');
    r.backup.forEach(function (b) { var li = el('li'); li.appendChild(link(b.url, b.text)); ul.appendChild(li); });
    d.appendChild(ul);
    return d;
  }

  var RISK = { low: ['risk-low', '比較的安全（データは残る）'], mid: ['risk-mid', 'バックアップ確認が必要'], high: ['risk-high', '取り消せない'] };

  function renderActions(r) {
    var s = sec('何を消す・移すと、どれだけ空くか', '1');
    s.appendChild(renderBackup(r));
    var list = el('ol', 'acts');
    r.actions.forEach(function (a) {
      var li = el('li', 'act');
      li.setAttribute('data-act', a.id);
      var top = el('div', 'act-top');
      top.appendChild(el('h3', 'act-h', a.title));
      var amt = el('p', 'act-amt');
      if (a.gbMax !== null && a.gbMax > 0) {
        amt.appendChild(el('span', 'amt-v', '最大 ' + SC.gb(a.gbMax)));
      } else if (a.amountKind) {
        amt.appendChild(el('span', 'amt-v amt-unk', '量は画面で確認'));
      } else {
        amt.appendChild(el('span', 'amt-v amt-unk', '空く量は人による'));
      }
      top.appendChild(amt);
      li.appendChild(top);
      var rk = RISK[a.risk];
      var tags = el('p', 'tags');
      tags.appendChild(el('span', 'tag ' + rk[0], rk[1]));
      if (a.amountNote) tags.appendChild(el('span', 'tag-note', a.amountNote));
      li.appendChild(tags);
      var ol = el('ol', 'steps');
      a.steps.forEach(function (t) { ol.appendChild(el('li', null, t)); });
      li.appendChild(ol);
      if (a.points && a.points.length) {
        var ul = el('ul', 'points');
        a.points.forEach(function (t) { ul.appendChild(el('li', null, t)); });
        li.appendChild(ul);
      }
      var src = el('p', 'src');
      src.appendChild(document.createTextNode('公式の手順：'));
      src.appendChild(link(a.source_url, a.source_title));
      if (a.extra_url) { src.appendChild(el('br')); src.appendChild(link(a.extra_url, a.extra_title)); }
      li.appendChild(src);
      list.appendChild(li);
    });
    s.appendChild(list);
    s.appendChild(el('p', 'note', '「最大」は入力した量をもとにした上限の目安です。重なっている分は二重に空きません。'));
    return s;
  }

  function renderCloud(r) {
    var s = sec('写真・動画を入れるクラウドの料金', '2');
    if (!(r.cloudNeed > 0)) {
      s.appendChild(el('p', null, '写真・動画の量を入れると、入る容量のプランと料金を比べます。'));
      return s;
    }
    s.appendChild(el('p', 'lead2', '写真＋動画 ' + SC.gb(r.cloudNeed) + ' が入る、いちばん小さいプランを比べました（月額の安い順）。'));
    var wrap = el('div', 'clouds-list');
    r.cloud.forEach(function (o) {
      var c = el('div', 'cl' + (o.fits ? '' : ' cl-no'));
      c.setAttribute('data-provider', o.provider + '-' + o.route);
      var hd = el('div', 'cl-hd');
      hd.appendChild(el('p', 'cl-name', o.name));
      var badges = el('span', 'badges');
      if (o.using) badges.appendChild(el('span', 'badge b-use', '利用中'));
      if (o.cheapest) badges.appendChild(el('span', 'badge b-low', '月額がいちばん安い'));
      hd.appendChild(badges);
      c.appendChild(hd);
      if (!o.fits) {
        c.appendChild(el('p', 'cl-plan', '公式のプランでは入りきりません。パソコン・外付けとの併用を検討してください。'));
      } else {
        c.appendChild(el('p', 'cl-plan', o.planLabel));
        var pr = el('div', 'cl-price');
        var m = el('p', 'p-m');
        m.appendChild(el('span', 'p-k', '月額'));
        m.appendChild(el('span', 'p-v', o.free ? '¥0（無料の範囲）' : SC.yen(o.monthly)));
        pr.appendChild(m);
        var y = el('p', 'p-y');
        y.appendChild(el('span', 'p-k', o.annualKind === 'official' ? '年額' : '12か月分'));
        y.appendChild(el('span', 'p-v', SC.yen(o.annual)));
        if (o.annualKind === 'calc') y.appendChild(el('span', 'p-calc', '月額×12の計算'));
        pr.appendChild(y);
        c.appendChild(pr);
      }
      if (o.notes.length) {
        var ul = el('ul', 'cl-notes');
        o.notes.forEach(function (t) { ul.appendChild(el('li', null, t)); });
        c.appendChild(ul);
      }
      var sp = el('p', 'src');
      sp.appendChild(document.createTextNode('公式：'));
      o.sources.forEach(function (u, i) { if (i) sp.appendChild(document.createTextNode('／')); sp.appendChild(link(u, hostLabel(u))); });
      c.appendChild(sp);
      wrap.appendChild(c);
    });
    s.appendChild(wrap);
    s.appendChild(el('p', 'note', PLANS.checked_label + 'に公式サイトで確認した料金です。iCloud+・Amazonプライムは税込みの表記あり。Google One・Amazon Photosのプランはページに税込み・税抜きの表記がありません。「12か月分」は月額×12の計算で、年払いプランの料金ではありません。1TB＝1000GBで計算しています。'));
    s.appendChild(renderPlanTable());
    return s;
  }

  function hostLabel(u) {
    if (/support\.apple\.com/.test(u)) return 'Apple';
    if (/one\.google\.com/.test(u)) return 'Google One';
    if (/nodeId=G34EUPKVMYFW8N2U/.test(u)) return 'プライム会費';
    if (/nodeId=201910360/.test(u)) return 'プライム特典';
    if (/amazon\.co\.jp/.test(u)) return 'Amazon Photos';
    return u;
  }

  function renderPlanTable() {
    var d = el('details', 'alltbl');
    d.appendChild(el('summary', null, 'すべてのプランを見る'));
    PLANS.providers.forEach(function (p) {
      d.appendChild(el('p', 'tbl-h', p.name + '（無料 ' + p.free_gb + 'GB）'));
      var t = el('table', 'tbl');
      var hr = el('tr');
      ['容量', '月額', '年額'].forEach(function (h) { hr.appendChild(el('th', null, h)); });
      var th = el('thead'); th.appendChild(hr); t.appendChild(th);
      var tb = el('tbody');
      p.plans.forEach(function (pl) {
        var tr = el('tr');
        tr.appendChild(el('td', null, pl.label));
        tr.appendChild(el('td', null, SC.yen(pl.monthly)));
        tr.appendChild(el('td', null, pl.annual ? SC.yen(pl.annual) : '記載なし'));
        tb.appendChild(tr);
      });
      if (p.prime) {
        var tr2 = el('tr');
        tr2.appendChild(el('td', null, 'プライム会員（写真無制限・動画' + p.prime.video_gb + 'GB）'));
        tr2.appendChild(el('td', null, SC.yen(p.prime.monthly)));
        tr2.appendChild(el('td', null, SC.yen(p.prime.annual)));
        tb.appendChild(tr2);
      }
      t.appendChild(tb);
      d.appendChild(t);
      var sp = el('p', 'src');
      sp.appendChild(document.createTextNode(p.tax + '。出典：'));
      sp.appendChild(link(p.source_url, hostLabel(p.source_url)));
      if (p.prime) { sp.appendChild(document.createTextNode('／')); sp.appendChild(link(p.prime.fee_source_url, 'プライム会費')); }
      d.appendChild(sp);
    });
    return d;
  }

  function renderPC(r) {
    var s = sec('パソコンや外付けに保存する', '3');
    s.appendChild(el('p', 'lead2', '月額をかけたくないときは、パソコンや外付けのドライブに移す方法もあります。移したあと、ちゃんと開けることを確かめてから端末の写真を消してください。'));
    var ul = el('ul', 'pcs');
    r.pc.forEach(function (p) {
      var li = el('li', 'pc');
      li.appendChild(el('h3', 'act-h', p.title));
      li.appendChild(el('p', null, p.text));
      var sp = el('p', 'src');
      sp.appendChild(document.createTextNode('公式の手順：'));
      sp.appendChild(link(p.url, p.source_title));
      li.appendChild(sp);
      ul.appendChild(li);
    });
    s.appendChild(ul);
    s.appendChild(el('p', 'note', 'パソコンや外付けだけに保存すると、その機器が壊れたときに失われます。大切な写真は2か所以上に保存しておくと安心です。'));
    return s;
  }

  function render(r) {
    var out = $('result');
    out.textContent = '';
    out.appendChild(renderSummary(r));
    if (r.warnings.length) {
      var w = el('ul', 'warns');
      r.warnings.forEach(function (t) { w.appendChild(el('li', null, t)); });
      out.appendChild(w);
    }
    out.appendChild(renderActions(r));
    out.appendChild(renderCloud(r));
    out.appendChild(renderPC(r));
    var again = el('button', 'linkbtn again', '入力を変えてもう一度');
    again.type = 'button';
    again.addEventListener('click', function () { $('inputCard').scrollIntoView(); $('inFree').focus(); });
    out.appendChild(again);
    out.hidden = false;
    renderAds();
  }

  /* ---------- 実行 ---------- */
  function run(scroll) {
    var inp = readInput();
    Object.keys(FIELD_ID).forEach(function (k) { $(FIELD_ID[k]).removeAttribute('aria-invalid'); });
    var r = SC.compute(inp, PLANS, GUIDES);
    var msg = $('msg');
    if (!r.ok) {
      msg.textContent = r.errors.map(function (e) { return e.msg; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' ');
      msg.hidden = false;
      r.errors.forEach(function (e) { if (FIELD_ID[e.field]) $(FIELD_ID[e.field]).setAttribute('aria-invalid', 'true'); });
      $('result').hidden = true; $('ads').hidden = true;
      return false;
    }
    msg.hidden = true;
    render(r);
    writeHash(inp);
    if (scroll) { var y = $('result').getBoundingClientRect().top + window.pageYOffset - 56; window.scrollTo(0, Math.max(0, y)); }
    return true;
  }

  /* 入力をURLの#以降に保存（サーバーには送られない） */
  var HK = { cap: 'inCap', free: 'inFree', ph: 'inPhoto', vd: 'inVideo', vmin: 'inVidMin', pmb: 'inPhotoMB', line: 'inLine', apps: 'inApps', del: 'inDel', tgt: 'inTarget' };
  function writeHash(inp) {
    var parts = ['os=' + inp.os, 'pm=' + inp.photoMode, 'vm=' + inp.videoMode];
    Object.keys(HK).forEach(function (k) { var v = $(HK[k]).value.trim(); if (v) parts.push(k + '=' + encodeURIComponent(v)); });
    var c = (inp.clouds.icloud ? 'i' : '') + (inp.clouds.google ? 'g' : '') + (inp.clouds.amazonPrime ? 'a' : '');
    if (c) parts.push('c=' + c);
    try { history.replaceState(null, '', '#' + parts.join('&')); } catch (e) { /* file:// など */ }
  }
  function fromHash() {
    var h = (location.hash || '').slice(1);
    if (!h) return false;
    var q = {};
    h.split('&').forEach(function (p) { var i = p.indexOf('='); if (i > 0) q[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1)); });
    if (q.os === 'ios' || q.os === 'android') setOS(q.os);
    if (q.pm === 'gb' || q.pm === 'count') setPM(q.pm);
    if (q.vm === 'gb' || q.vm === 'count') setVM(q.vm);
    Object.keys(HK).forEach(function (k) { if (q[k] !== undefined) $(HK[k]).value = String(q[k]).slice(0, 12); });
    var c = q.c || '';
    $('cIcloud').checked = c.indexOf('i') >= 0; $('cGoogle').checked = c.indexOf('g') >= 0; $('cPrime').checked = c.indexOf('a') >= 0;
    if (q.free) { run(false); return true; }
    return false;
  }

  /* ---------- 出典 ---------- */
  function renderSources() {
    $('srcNote').textContent = 'すべて' + PLANS.checked_label + 'に確認。料金は各社の公式ページ、手順は Apple・Google・LINE の公式ヘルプによります。';
    var seen = {}, ul = $('srcList');
    function add(url, text) { if (seen[url]) return; seen[url] = 1; var li = el('li'); li.appendChild(link(url, text)); ul.appendChild(li); }
    add('https://support.apple.com/ja-jp/108047', 'iCloud+のプランと料金（Apple）');
    add('https://support.apple.com/ja-jp/108922', 'Apple製デバイスでiCloudストレージを管理する（Apple・無料5GB）');
    add('https://one.google.com/about/plans?hl=ja&gl=JP', 'Google One のプランと料金（Google）');
    add('https://www.amazon.co.jp/b?node=5262648051', 'Amazon Photos（Amazon・無料5GB／100GB・1TBプラン）');
    add('https://www.amazon.co.jp/gp/help/customer/display.html?nodeId=201910360', 'Amazonプライム特典について（写真無制限・動画5GB）');
    add('https://www.amazon.co.jp/gp/help/customer/display.html?nodeId=G34EUPKVMYFW8N2U', 'プライム会費情報（Amazon）');
    GUIDES.actions.forEach(function (a) { add(a.source_url, a.source_title); if (a.extra_url) add(a.extra_url, a.extra_title); });
    ['ios', 'android'].forEach(function (os) {
      GUIDES.pc[os].forEach(function (p) { add(p.url, p.source_title); });
      GUIDES.backup[os].forEach(function (b) { add(b.url, b.text); });
    });
  }

  /* ---------- 広告（ads.json に A8 のタグを貼る。空なら非表示） ---------- */
  var IMG_OK = /^https:\/\/([a-z0-9-]+\.)*a8\.net\//i;
  function safeUrl(u, forImg) {
    u = String(u || '').trim();
    if (!u) return null;
    if (/^(javascript|data|vbscript):/i.test(u)) return null;
    if (/^https:\/\//i.test(u)) return forImg ? (IMG_OK.test(u) ? u : null) : u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) || /^\/\//.test(u)) return null;
    return forImg ? u : null;
  }
  function sanitizeTag(html) {
    var doc = new DOMParser().parseFromString('<div>' + String(html || '') + '</div>', 'text/html');
    var out = document.createDocumentFragment(), count = 0;
    function walk(src, dst) {
      Array.prototype.forEach.call(src.childNodes, function (n) {
        if (n.nodeType === 3) { if (n.nodeValue.trim()) dst.appendChild(document.createTextNode(n.nodeValue)); return; }
        if (n.nodeType !== 1) return;
        var tag = n.tagName.toLowerCase();
        if (tag === 'a') {
          var href = safeUrl(n.getAttribute('href'), false);
          var a = document.createElement('a');
          if (href) { a.href = href; a.target = '_blank'; a.rel = 'nofollow sponsored noopener'; }
          walk(n, a); dst.appendChild(a); count++;
        } else if (tag === 'img') {
          var s2 = safeUrl(n.getAttribute('src'), true);
          if (!s2) return;
          var im = document.createElement('img');
          im.src = s2; im.alt = n.getAttribute('alt') || '';
          ['width', 'height'].forEach(function (k) { var v = n.getAttribute(k); if (v && /^\d{1,4}$/.test(v)) im.setAttribute(k, v); });
          im.loading = 'lazy'; im.decoding = 'async'; im.referrerPolicy = 'no-referrer-when-downgrade';
          dst.appendChild(im); count++;
        } else if (tag === 'br') {
          dst.appendChild(document.createElement('br'));
        } else if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object' || tag === 'embed') {
          return;
        } else {
          walk(n, dst);
        }
      });
    }
    walk(doc.body.firstChild, out);
    return count ? out : null;
  }
  function renderAds() {
    var box = $('ads');
    box.textContent = ''; box.hidden = true;
    if (!ADS) return;
    var made = 0, wrap = document.createDocumentFragment();
    (ADS.slots || []).forEach(function (s) {
      if (!s || !s.tag || !String(s.tag).trim()) return;
      var frag = sanitizeTag(s.tag);
      if (!frag) return;
      var d = el('div', 'ad-slot'); d.setAttribute('data-ad', s.id || '');
      d.appendChild(frag);
      if (s.caption) d.appendChild(el('p', 'ad-cap', s.caption));
      wrap.appendChild(d); made++;
    });
    if (!made) return;
    var hd = el('div', 'adbox-h');
    hd.appendChild(el('h2', null, ADS.heading || '保存に使える製品'));
    hd.appendChild(el('span', 'adtag', ADS.label || '広告・PR'));
    box.appendChild(hd);
    box.appendChild(el('p', 'ad-note', '広告です。診断結果やおすすめの順位とは関係ありません。'));
    box.appendChild(wrap);
    box.hidden = false;
  }

  /* ---------- 初期化 ---------- */
  function bind() {
    var cap = $('inCap');
    var o0 = el('option', null, '選んでください'); o0.value = ''; cap.appendChild(o0);
    SC.CAPACITIES.forEach(function (g) { var o = el('option', null, SC.gb(g)); o.value = String(g); cap.appendChild(o); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-os]'), function (b) { b.addEventListener('click', function () { setOS(b.getAttribute('data-os')); }); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-pm]'), function (b) { b.addEventListener('click', function () { setPM(b.getAttribute('data-pm')); }); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-vm]'), function (b) { b.addEventListener('click', function () { setVM(b.getAttribute('data-vm')); }); });
    $('goBtn').addEventListener('click', function () { run(true); });
    window.addEventListener('hashchange', fromHash);
    Array.prototype.forEach.call(document.querySelectorAll('#inputCard input[type=text]'), function (i) {
      i.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(true); });
    });
  }

  Promise.all([getJSON('data/plans.json'), getJSON('data/guides.json'), getJSON('ads.json').catch(function () { return null; })])
    .then(function (res) {
      PLANS = res[0]; GUIDES = res[1]; ADS = res[2];
      bind();
      setOS('ios'); setPM('gb'); setVM('gb');
      $('checkedChip').textContent = '料金確認 ' + PLANS.checked.replace(/-/g, '/');
      renderSources();
      fromHash();
      window.__scReady = true;
    })
    .catch(function (e) { document.body.setAttribute('data-error', String(e)); var m = $('msg'); m.textContent = '読み込みに失敗しました。ページを再読み込みしてください。'; m.hidden = false; });
})();
