/* NetCheck 画面。判定は端末内（logic.js）。読み込むのは同じサイトのJSONだけ。 */
(function () {
  'use strict';
  var NC = window.NC;
  var D = null, ADS = null;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function getJSON(u) { return fetch(u, { cache: 'no-cache', credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  function carrierName(id) { var c = (D.carriers || []).filter(function (x) { return x.id === id; })[0]; return c ? c.name : ''; }

  /* ---------- form ⇔ answers ---------- */
  function readForm() {
    var f = $('form'), a = {};
    ['house', 'tenure', 'carrier', 'people', 'stay', 'wait'].forEach(function (k) {
      var x = f.querySelector('input[name="' + k + '"]:checked'); a[k] = x ? x.value : '';
    });
    a.uses = Array.prototype.map.call(f.querySelectorAll('input[name="uses"]:checked'), function (x) { return x.value; });
    return NC.normalize(a);
  }
  function writeForm(a) {
    var f = $('form');
    ['house', 'tenure', 'carrier', 'people', 'stay', 'wait'].forEach(function (k) {
      var x = f.querySelector('input[name="' + k + '"][value="' + a[k] + '"]'); if (x) x.checked = true;
    });
    Array.prototype.forEach.call(f.querySelectorAll('input[name="uses"]'), function (x) { x.checked = a.uses.indexOf(x.value) >= 0; });
  }

  /* ---------- result ---------- */
  function link(href, text) {
    var a = el('a', null, text); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  }
  function stars(rank, excluded) {
    var s = el('span', 'fit');
    if (excluded) { s.textContent = '対象外'; s.className = 'fit off'; return s; }
    var label = rank === 0 ? 'いちばん合う' : rank === 1 ? '次に合う' : '候補';
    s.textContent = label; if (rank === 0) s.className = 'fit top';
    return s;
  }

  function renderPlan(c, ans, idx) {
    var p = c.plan;
    var card = el('article', 'plan' + (c.matched ? ' matched' : ''));
    card.setAttribute('data-plan', p.id);
    var hd = el('div', 'plan-h');
    var nm = el('h4', 'plan-name', p.name);
    hd.appendChild(nm);
    hd.appendChild(el('p', 'plan-co', p.company));
    card.appendChild(hd);

    // セット割（あなたのスマホと合うもの）
    if (c.matched) {
      c.match.forEach(function (m) {
        var b = el('div', 'setbox');
        var t = el('p', 'set-t');
        t.appendChild(el('span', 'set-badge', m.kind === 'points' ? 'ポイント特典' : m.kind === 'exclusive' ? '専用プラン' : 'セット割'));
        t.appendChild(document.createTextNode(m.title + '（' + carrierName(ans.carrier) + '）'));
        b.appendChild(t);
        b.appendChild(el('p', 'set-x', m.text));
        card.appendChild(b);
      });
    } else if (ans.carrier !== 'other') {
      card.appendChild(el('p', 'noset', carrierName(ans.carrier) + 'とのセット割：確認した公式ページには記載がありません。'));
    }

    // 月額の目安
    var mt = el('div', 'money');
    mt.appendChild(el('p', 'subh', '月額の目安（税込）'));
    var dl = el('dl', 'kv');
    if (!c.monthly.length) {
      dl.appendChild(el('dt', null, '月額')); dl.appendChild(el('dd', null, '公式で確認'));
    }
    c.monthly.forEach(function (m) {
      dl.appendChild(el('dt', null, m.label));
      var dd = el('dd', 'yen', NC.yen(m.yen)); dd.appendChild(el('span', 'per', '/月'));
      dl.appendChild(dd);
    });
    mt.appendChild(dl);
    if (p.monthlyNote) mt.appendChild(el('p', 'note', p.monthlyNote.text));
    if (p.priceChange) mt.appendChild(el('p', 'change', '料金改定：' + p.priceChange.text));
    card.appendChild(mt);

    if (p.fastStart && ans.wait === 'no') card.appendChild(el('p', 'fast', p.fastStart.text));

    // 注意点
    var notes = (p.notes || []);
    if (notes.length) {
      var nb = el('div', 'notes');
      nb.appendChild(el('p', 'subh', '注意点'));
      var ul = el('ul', 'list');
      var KIND = { cancel: '解約', initial: '初期費用', construction: '工事', area: 'エリア', address: '住所', speed: '速度', unknown: '未確認' };
      notes.forEach(function (n) {
        var li = el('li');
        li.appendChild(el('span', 'tag', KIND[n.kind] || '注意'));
        li.appendChild(document.createTextNode(n.text));
        ul.appendChild(li);
      });
      nb.appendChild(ul);
      card.appendChild(nb);
    }

    // ほかのスマホとのセット割（参考）
    var others = (p.set || []).filter(function (x) { return x.carriers.indexOf(ans.carrier) < 0; });
    if (others.length) {
      var names = [];
      others.forEach(function (x) { x.carriers.forEach(function (id) { var n = carrierName(id); if (names.indexOf(n) < 0) names.push(n); }); });
      card.appendChild(el('p', 'small', 'セット割・特典の対象スマホ：' + names.join('・')));
    }

    // 公式リンクと確認日
    var ft = el('p', 'plan-src');
    var url = (ans.house === 'apartment' && p.urlApartment) ? p.urlApartment : p.url;
    ft.appendChild(document.createTextNode(D.checkedLabel + 'に公式サイトで確認。最新は公式で → '));
    ft.appendChild(link(url, p.name + ' 公式ページ'));
    card.appendChild(ft);
    return card;
  }

  function render(a) {
    var r = NC.diagnose(D, a);
    var box = $('result');
    box.textContent = '';

    var head = el('div', 'res-head');
    head.appendChild(el('p', 'res-kicker', '診断結果'));
    var top = r.types[0];
    head.appendChild(el('p', 'res-name', top.name));
    head.appendChild(el('p', 'res-sub', 'があなたの条件にいちばん合いそうです。'));
    var sum = el('p', 'res-ans', summary(r.answers));
    head.appendChild(sum);
    box.appendChild(head);

    r.types.forEach(function (t, i) {
      var sec = el('section', 'sec type-sec');
      sec.setAttribute('data-type', t.type);
      var h = el('h2'); h.appendChild(stars(i, t.excluded)); h.appendChild(document.createTextNode(t.name));
      sec.appendChild(h);
      if (t.excluded) { sec.appendChild(el('p', 'excl', t.excluded)); box.appendChild(sec); return; }
      if (t.reasons.length) {
        var ul = el('ul', 'why');
        t.reasons.forEach(function (x) { var li = el('li', x.plus ? 'plus' : 'minus', x.text); ul.appendChild(li); });
        sec.appendChild(ul);
      }
      var cs = r.candidates[t.type];
      var wrap = i === 0 ? sec : el('details', 'more');
      if (i !== 0) {
        wrap.appendChild(el('summary', null, t.name + 'の候補を見る（' + cs.length + '件）'));
        sec.appendChild(wrap);
      } else {
        sec.appendChild(el('p', 'subh2', '候補（' + cs.length + '件）'));
      }
      if (t.type === 'mobile') wrap.appendChild(el('p', 'small', 'このツールで公式の料金を確かめたモバイル回線はWiMAXのみです。スマホのテザリングで足りる場合もあります（スマホのプランのデータ量を確認）。'));
      cs.forEach(function (c, j) { wrap.appendChild(renderPlan(c, r.answers, j)); });
      if (cs.length && cs[0].matched) wrap.appendChild(el('p', 'small', '並び順：あなたのスマホとセット割・特典が合う候補を先に表示しています（料金の安い順ではありません）。'));
      box.appendChild(sec);
    });

    var cb = el('section', 'sec');
    cb.appendChild(el('h2', null, '申し込む前に確認すること'));
    var ul2 = el('ul', 'list');
    r.cautions.forEach(function (x) { ul2.appendChild(el('li', null, x)); });
    cb.appendChild(ul2);
    box.appendChild(cb);

    var src = el('section', 'sec');
    src.appendChild(el('h2', null, '出典（' + D.checkedLabel + '確認）'));
    var ol = el('ul', 'srcs');
    Object.keys(D.sources).forEach(function (k) { var s = D.sources[k]; var li = el('li'); li.appendChild(link(s.url, s.title)); ol.appendChild(li); });
    src.appendChild(ol);
    box.appendChild(src);

    var again = el('button', 'linkbtn again', '条件を変えてもう一度');
    again.type = 'button';
    again.addEventListener('click', function () { window.scrollTo(0, 0); var x = $('form').querySelector('input'); if (x) x.focus(); });
    box.appendChild(again);

    box.hidden = false;
    renderAds(r.top);
    maybeInterstitial();
    window.__ncLast = r;
  }

  function summary(a) {
    var H = { house: '戸建て', apartment: 'マンション・アパート' };
    var T = { own: '持ち家', rent: '賃貸', nokoji: '工事できない', unknown: '工事できるか不明' };
    var P = { '1': '1人', '2': '2〜3人', '4': '4人以上' };
    var S = { lt1: '1年以内に引越し', '1to2': '1〜2年住む', gt3: '3年以上住む', unknown: '住む期間は未定' };
    var W = { yes: '工事を待てる', no: 'すぐ使いたい' };
    var U = { video: '動画', game: 'ゲーム', work: '在宅ワーク', upload: '大きいファイル送信', outside: '外でも使う', light: '調べもの・SNS' };
    var parts = [H[a.house], T[a.tenure], 'スマホ：' + carrierName(a.carrier), P[a.people], S[a.stay], W[a.wait]];
    if (a.uses.length) parts.push(a.uses.map(function (u) { return U[u]; }).join('・'));
    return parts.join(' ／ ');
  }

  /* ---------- ads (A8 tags pasted into ads.json, sanitized). 診断結果の並びには関係しない ---------- */
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
          var src2 = safeUrl(n.getAttribute('src'), true);
          if (!src2) return;
          var im = document.createElement('img');
          im.src = src2; im.alt = n.getAttribute('alt') || '';
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

  function renderAds(topType) {
    var box = $('ads');
    box.textContent = '';
    box.hidden = true;
    if (!ADS) return;
    var slots = (ADS.slots || []).filter(function (s) {
      if (!s || !s.tag || !String(s.tag).trim()) return false;
      var ts = s.types || ['any'];
      return ts.indexOf('any') >= 0 || ts.indexOf(topType) >= 0;
    });
    var made = 0, wrap = document.createDocumentFragment();
    slots.forEach(function (s) {
      var frag = sanitizeTag(s.tag);
      if (!frag) return;
      var d = el('div', 'ad-slot'); d.setAttribute('data-ad', s.id || '');
      d.appendChild(frag);
      if (s.caption) d.appendChild(el('p', 'ad-cap', s.caption));
      wrap.appendChild(d); made++;
    });
    if (!made) return;
    var hd = el('div', 'adbox-h');
    hd.appendChild(el('h2', null, 'ネット回線のお申し込み窓口'));
    hd.appendChild(el('span', 'adtag', ADS.label || '広告・PR'));
    box.appendChild(hd);
    box.appendChild(el('p', 'ad-note', 'ここから下は広告です。上の診断結果・候補の順番とは関係ありません。キャンペーン内容は各窓口で確認してください。'));
    box.appendChild(wrap);
    box.hidden = false;
  }

  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function maybeInterstitial() {
    if (!ADS || !ADS.interstitial || !ADS.interstitial.tag || !String(ADS.interstitial.tag).trim()) return;
    if (store('nc_inter') === today()) return;
    var frag = sanitizeTag(ADS.interstitial.tag);
    if (!frag) return;
    var body = $('interBody'); body.textContent = ''; body.appendChild(frag);
    $('interLabel').textContent = ADS.label || '広告・PR';
    $('inter').hidden = false;
    store('nc_inter', today());
    $('interClose').focus();
  }
  function closeInter() { $('inter').hidden = true; $('interBody').textContent = ''; }

  /* ---------- init ---------- */
  function scrollToResult() {
    var r = $('result');
    if (!r.hidden) { var y = r.getBoundingClientRect().top + window.pageYOffset - 56; window.scrollTo(0, Math.max(0, y)); }
  }
  function run() {
    var a = readForm();
    render(a);
    try { history.replaceState(null, '', '#' + NC.toHash(a)); } catch (e) { /* file:// など */ }
    scrollToResult();
  }
  function fromHash() {
    var a = NC.fromHash(location.hash);
    if (!a) return;
    writeForm(a); render(a);
  }
  function bind() {
    $('form').addEventListener('submit', function (e) { e.preventDefault(); run(); });
    $('interClose').addEventListener('click', closeInter);
    $('inter').addEventListener('click', function (e) { if (e.target === $('inter')) closeInter(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('inter').hidden) closeInter(); });
    window.addEventListener('hashchange', fromHash);
  }

  Promise.all([getJSON('data/plans.json'), getJSON('ads.json').catch(function () { return null; })])
    .then(function (res) {
      D = res[0]; ADS = res[1];
      $('checkedChip').textContent = D.checkedLabel + '確認';
      $('checkedText').textContent = D.checkedLabel;
      $('footChecked').textContent = D.checkedLabel;
      bind(); fromHash();
      window.__ncReady = true;
    })
    .catch(function (e) {
      document.body.setAttribute('data-error', String(e));
      var r = $('result'); r.textContent = ''; r.appendChild(el('p', 'msg err', 'データを読み込めませんでした。ページを再読み込みしてください。')); r.hidden = false;
    });
})();
