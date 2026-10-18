/* RepairCheck UI. Everything runs in the browser; only same-origin JSON is fetched. No alert/confirm. */
(function () {
  'use strict';
  var RC = window.RC;
  var D = null, A = null, ADS = null, mode = 'now';

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function link(href, text) { var a = el('a', null, text); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
  function getJSON(u) { return fetch(u, { cache: 'no-cache', credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  function radio(name) { var x = document.querySelector('input[name="' + name + '"]:checked'); return x ? x.value : null; }
  function setRadio(name, v) { var x = document.querySelector('input[name="' + name + '"][value="' + v + '"]'); if (x) x.checked = true; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- setup ---------- */
  function fillSelects() {
    var nm = $('n-model');
    nm.appendChild(new Option('選ばない（わからない）', ''));
    A.models.forEach(function (m) { nm.appendChild(new Option(m.name, m.id)); });
    var pm = $('p-model');
    D.models.forEach(function (m) { pm.appendChild(new Option(m.name, m.id)); });
    pm.appendChild(new Option('そのほかのiPhone', ''));
    pm.value = 'iphone-17';
    var band = $('p-band');
    D.priceBands.forEach(function (b, i) {
      var l = el('label', 'chip'), inp = document.createElement('input');
      inp.type = 'radio'; inp.name = 'p-band'; inp.value = b.id; if (i === 2) inp.checked = true;
      l.appendChild(inp); l.appendChild(el('span', null, b.label)); band.appendChild(l);
    });
  }

  function syncNow() {
    var ios = radio('n-os') === 'iphone';
    $('n-model-wrap').hidden = !ios;
    var acInp = document.querySelector('input[name="n-cover"][value="applecare"]');
    acInp.disabled = !ios;
    if (!ios && acInp.checked) setRadio('n-cover', 'none');
    $('n-carrier-wrap').hidden = radio('n-cover') !== 'carrier';
  }
  function syncPrep() { $('p-model-wrap').hidden = radio('p-os') !== 'iphone'; }

  function showMode(m) {
    mode = m;
    ['now', 'prepare'].forEach(function (k) {
      $('tab-' + k).setAttribute('aria-selected', k === m ? 'true' : 'false');
      $('pane-' + k).hidden = k !== m;
    });
    $('result').hidden = true; $('result').textContent = '';
    renderAds(null);
    store('rc_mode', m);
  }

  /* ---------- render helpers ---------- */
  function sec(title) { var s = el('section', 'sec'); s.appendChild(el('h2', null, title)); return s; }
  function costList(items) {
    var dl = el('dl', 'cost');
    items.forEach(function (c) {
      dl.appendChild(el('dt', null, c.label));
      if (typeof c.yen === 'number') dl.appendChild(el('dd', null, c.yen === 0 ? '0円' : RC.yen(c.yen)));
      else { dl.appendChild(el('dd', null, '')); dl.appendChild(el('dd', 'txt', c.text)); }
    });
    return dl;
  }
  function checkedLine() { return el('p', 'note', '2026年10月19日に公式サイトで確認。最新は公式で確認してください。'); }
  function again() {
    var b = el('button', 'again', '条件を変えてもう一度'); b.type = 'button';
    b.addEventListener('click', function () { window.scrollTo(0, 0); });
    return b;
  }
  function scrollToResult() {
    var r = $('result');
    if (!r.hidden) { var y = r.getBoundingClientRect().top + window.pageYOffset - 56; window.scrollTo(0, Math.max(0, y)); }
  }

  /* ---------- mode 1 ---------- */
  function readNow() {
    return { os: radio('n-os'), model: $('n-model').value, damage: radio('n-damage'), cover: radio('n-cover'), carrier: $('n-carrier').value };
  }
  function runNow() {
    var inp = readNow(), r = RC.diagnoseNow(D, A, inp), box = $('result');
    $('msgNow').hidden = true;
    if (r.error) { var m = $('msgNow'); m.textContent = '選び方を確認してください（' + r.error + '）'; m.hidden = false; return; }
    box.textContent = '';
    var h = el('div', 'res-head');
    h.appendChild(el('p', 'res-kicker', '壊れた今の対応'));
    var who = inp.os === 'iphone' ? (r.model ? r.model.name : 'iPhone') : 'Android';
    h.appendChild(el('p', 'res-title', who + '・' + RC.DAMAGE[inp.damage]));
    var cv = RC.COVER[inp.cover] + (inp.cover === 'carrier' ? '（' + RC.CARRIER[inp.carrier] + '）' : '');
    h.appendChild(el('p', 'res-sub', '加入中の保証：' + cv));
    box.appendChild(h);

    var s1 = sec(inp.damage === 'lost' ? 'まずやること（なくしたとき）' : 'まずやること（データを守る）');
    var ol = el('ol', 'steps');
    r.steps.forEach(function (st) {
      var li = el('li', null, st.text);
      if (st.url) { li.appendChild(document.createTextNode(' ')); var a = link(st.url, '公式'); a.className = 'src'; li.appendChild(a); }
      ol.appendChild(li);
    });
    s1.appendChild(ol);
    box.appendChild(s1);

    var s2 = sec(inp.damage === 'lost' ? '補償・交換の選択肢' : '修理の選択肢と費用の目安');
    r.options.forEach(function (o) {
      var d = el('div', 'opt' + (o.first ? ' first' : ''));
      d.setAttribute('data-opt', o.id);
      if (o.first) d.appendChild(el('span', 'tag', 'まず確認'));
      d.appendChild(el('h3', null, o.title));
      if (o.why) d.appendChild(el('p', 'why', o.why));
      if (o.cost.length) d.appendChild(costList(o.cost));
      if (o.notes.length) { var ul = el('ul', 'notes'); o.notes.forEach(function (n) { ul.appendChild(el('li', null, n)); }); d.appendChild(ul); }
      if (o.cautions.length) { var uc = el('ul', 'cautions'); o.cautions.forEach(function (n) { uc.appendChild(el('li', null, '注意：' + n)); }); d.appendChild(uc); }
      if (o.url) { var p = el('p', 'olink'); p.appendChild(link(o.url, '公式ページで確認')); d.appendChild(p); }
      s2.appendChild(d);
    });
    s2.appendChild(el('p', 'note', '金額は税込。「まず確認」は、選んだ条件での確認の順番の目安で、どこが一番よいかを決めるものではありません。'));
    s2.appendChild(checkedLine());
    box.appendChild(s2);
    box.appendChild(srcSection());
    box.appendChild(again());
    box.hidden = false;
    renderAds('now');
  }

  /* ---------- mode 2 ---------- */
  function readPrep() {
    return { os: radio('p-os'), model: $('p-model').value, carrier: $('p-carrier').value, band: radio('p-band'), care: radio('p-care'), lossWorry: $('p-loss').checked, multi: $('p-multi').checked };
  }
  function runPrep() {
    var inp = readPrep(), r = RC.comparePlans(D, A, inp), box = $('result');
    $('msgPrep').hidden = true;
    if (r.error) { var m = $('msgPrep'); m.textContent = '選び方を確認してください（' + r.error + '）'; m.hidden = false; return; }
    box.textContent = '';
    var h = el('div', 'res-head');
    h.appendChild(el('p', 'res-kicker', 'これから入る保証の比較'));
    var mname = '';
    if (inp.os === 'iphone') { var mm = D.models.filter(function (x) { return x.id === inp.model; })[0]; mname = mm ? mm.name : 'iPhone'; } else mname = 'Android';
    h.appendChild(el('p', 'res-title', mname + '（' + r.band.label + '）'));
    var buy = $('p-carrier').options[$('p-carrier').selectedIndex].text;
    h.appendChild(el('p', 'res-sub', '購入先：' + buy));
    box.appendChild(h);

    var s = sec('月額・自己負担・回数の比較');
    var t = el('table', 'cmp'), th = el('thead'), tr = el('tr');
    ['プラン', '月額', '2年の合計', '画面割れ', 'その他の故障・水濡れ', '紛失・盗難', '回数', '入れる時期'].forEach(function (x) { tr.appendChild(el('th', null, x)); });
    th.appendChild(tr); t.appendChild(th);
    var tb = el('tbody');
    r.rows.forEach(function (row) {
      var tr2 = el('tr'); tr2.setAttribute('data-plan', row.id);
      var h3 = el('th'); h3.scope = 'row'; h3.appendChild(document.createTextNode(row.name)); h3.appendChild(el('span', 'pv', row.provider)); tr2.appendChild(h3);
      function td(label, text, cls, small) { var c = el('td', cls); c.setAttribute('data-label', label); var sp = el('span', 'num', text); c.appendChild(sp); if (small) c.appendChild(el('span', 'small', small)); tr2.appendChild(c); return c; }
      td('月額', typeof row.monthly === 'number' ? RC.yen(row.monthly) : (row.monthlyText || '公式で確認'), null);
      td('2年の合計', row.twoYears != null ? RC.yen(row.twoYears) : '—', null, row.twoYears != null ? '月額×24' : null);
      td('画面割れ', row.screen, null);
      td('故障・水濡れ', row.other, null);
      td('紛失・盗難', row.lost, null);
      var lim = td('回数', row.limits || '公式で確認', 'wide'); lim.firstChild.className = 'small';
      var jn = td('入れる時期', row.join || '公式で確認', 'wide'); jn.firstChild.className = 'small';
      var nc = el('td', 'wide'); nc.setAttribute('data-label', 'メモ');
      var ul = el('ul', 'cmp-notes'); row.notes.forEach(function (n) { ul.appendChild(el('li', null, n)); });
      var li = el('li'); li.appendChild(link(row.url, '公式ページ')); ul.appendChild(li);
      nc.appendChild(ul); tr2.appendChild(nc);
      tb.appendChild(tr2);
    });
    t.appendChild(tb); s.appendChild(t);
    s.appendChild(el('p', 'note', '金額は税込（モバイル保険の保険料は非課税）。「2年の合計」は月額×24の単純計算です。モバイル保険は単体のスマホ保険の一例で、ほかの保険は内容が違います。'));
    s.appendChild(checkedLine());
    box.appendChild(s);

    if (r.ref) {
      var rs = sec('参考：保証なしでAppleに修理を頼んだ場合');
      var p = el('p', 'ref');
      p.textContent = r.ref.model + '：画面の損傷 ' + (r.ref.screen ? RC.yen(r.ref.screen) : '—') + '、その他の損傷 ' + (r.ref.other ? RC.yen(r.ref.other) : '—') + '（Apple公式の見積額・税込）';
      rs.appendChild(p);
      rs.appendChild(el('p', 'note', '最終的な料金は診断のあとに確定します。'));
      box.appendChild(rs);
    }

    var hs = sec('選ぶときのポイント（条件つき）');
    var ul2 = el('ul', 'hints');
    r.hints.forEach(function (x) { ul2.appendChild(el('li', x.ok ? null : 'warn', x.text)); });
    hs.appendChild(ul2);
    hs.appendChild(el('p', 'note', 'どれが一番よいかは、使い方・端末価格・回線の契約で変わります。このツールは特定のプランをおすすめするものではありません。'));
    box.appendChild(hs);
    box.appendChild(srcSection());
    box.appendChild(again());
    box.hidden = false;
    renderAds('prepare');
  }

  function srcSection() {
    var s = sec('出典（2026年10月19日に確認）'), ul = el('ul', 'srcs'), seen = {};
    function add(u, t) { if (!u || seen[u]) return; seen[u] = 1; var li = el('li'); li.appendChild(link(u, t)); ul.appendChild(li); }
    D.plans.forEach(function (p) { add(p.source_url, p.provider + '：' + p.name); if (p.fees_source_url) add(p.fees_source_url, 'Apple：AppleCare+の料金および自己負担額'); });
    add(A.source_url, 'Apple：iPhoneの修理サービス（見積額）');
    D.facts.items.forEach(function (f) { add(f.source_url, ({ appleWarrantyF: 'Apple：製品1年限定保証', appleWarranty1y: '', appleEstimate: '', appleParts: 'Apple：部品と修理サービスの履歴', soumuRepairer: '総務省：登録修理業者制度', soumuSearch: '総務省：登録修理業者の検索', appleLost: 'Apple：紛失したiPhoneを見つける方法', appleBackup: 'Apple：iCloudでバックアップする方法', googleFind: 'Google：紛失したAndroidデバイスを探す', googleBackup: 'Google：Androidのバックアップ' })[f.id] || f.source_url); });
    s.appendChild(ul);
    return s;
  }

  /* ---------- ads (A8 tags pasted into ads.json, sanitized) ---------- */
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
          var href = safeUrl(n.getAttribute('href'), false), a = document.createElement('a');
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
        } else if (['script', 'style', 'iframe', 'object', 'embed', 'form', 'svg', 'math'].indexOf(tag) >= 0) {
          return;
        } else walk(n, dst);
      });
    }
    walk(doc.body.firstChild, out);
    return count ? out : null;
  }
  function renderAds(m) {
    var box = $('ads');
    box.textContent = ''; box.hidden = true;
    if (!ADS || !m) return;
    var made = 0, wrap = document.createDocumentFragment();
    (ADS.slots || []).forEach(function (s) {
      if (!s || !s.tag || !String(s.tag).trim()) return;
      if (s.mode !== m && s.mode !== 'both') return;
      var frag = sanitizeTag(s.tag);
      if (!frag) return;
      var d = el('div', 'ad-slot'); d.setAttribute('data-ad', s.id || '');
      d.appendChild(frag);
      if (s.caption) d.appendChild(el('p', 'ad-cap', s.caption));
      wrap.appendChild(d); made++;
    });
    if (!made) return;
    var hd = el('div', 'adbox-h');
    hd.appendChild(el('h2', null, (ADS.heads && ADS.heads[m]) || '関連サービス'));
    hd.appendChild(el('span', 'adtag', ADS.label || '広告・PR'));
    box.appendChild(hd);
    box.appendChild(el('p', 'adsep', 'ここから下は広告です。上の診断結果とは関係ありません。'));
    box.appendChild(wrap);
    box.hidden = false;
  }

  /* ---------- init ---------- */
  function bind() {
    Array.prototype.forEach.call(document.querySelectorAll('.mode'), function (b) { b.addEventListener('click', function () { showMode(b.getAttribute('data-mode')); }); });
    Array.prototype.forEach.call(document.querySelectorAll('input[name="n-os"], input[name="n-cover"]'), function (x) { x.addEventListener('change', syncNow); });
    Array.prototype.forEach.call(document.querySelectorAll('input[name="p-os"]'), function (x) { x.addEventListener('change', syncPrep); });
    $('goNow').addEventListener('click', function () { runNow(); scrollToResult(); });
    $('goPrep').addEventListener('click', function () { runPrep(); scrollToResult(); });
    window.addEventListener('hashchange', function () { var hm = /^#(now|prepare)$/.exec(location.hash || ''); if (hm && hm[1] !== mode) showMode(hm[1]); });
  }

  Promise.all([getJSON('data/plans.json'), getJSON('data/apple_repair.json'), getJSON('ads.json').catch(function () { return null; })])
    .then(function (res) {
      D = res[0]; A = res[1]; ADS = res[2];
      fillSelects(); bind(); syncNow(); syncPrep();
      var hm = /^#(now|prepare)$/.exec(location.hash || '');
      var saved = store('rc_mode');
      showMode(hm ? hm[1] : (saved === 'prepare' ? 'prepare' : 'now'));
      window.__rcReady = true;
    })
    .catch(function (e) { document.body.setAttribute('data-error', String(e)); var m = $('msgNow'); m.textContent = 'データを読み込めませんでした。ページを再読み込みしてください。'; m.hidden = false; });
})();
