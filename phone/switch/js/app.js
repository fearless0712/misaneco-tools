/* SwitchCheck UI. Answers stay in the browser; only same-origin JSON is fetched.
   Ads are rendered in their own box after the result and never affect the ranking. */
(function () {
  'use strict';
  var SC = window.SC;
  var D = null, ADS = null, last = null;
  var SHOW = 5;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function getJSON(u) { return fetch(u, { cache: 'no-cache', credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  var yen = SC.yen;
  function ext(href, text) {
    var a = el('a', null, text);
    a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }
  function jpDate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? (+m[1]) + '年' + (+m[2]) + '月' + (+m[3]) + '日' : iso; }

  /* ---------- form ---------- */
  function readForm() {
    var f = $('quiz');
    function rv(n) { var x = f.querySelector('input[name="' + n + '"]:checked'); return x ? x.value : null; }
    return SC.normalize({ data: rv('data'), call: rv('call'), family: rv('family'), store: rv('store'), fiber: $('fiber').value, current: $('current').value });
  }
  function writeForm(a) {
    var f = $('quiz');
    ['data', 'call', 'family', 'store'].forEach(function (n) {
      var x = f.querySelector('input[name="' + n + '"][value="' + a[n] + '"]');
      if (x) x.checked = true;
    });
    $('fiber').value = a.fiber; $('current').value = a.current;
  }

  /* ---------- result ---------- */
  function tierText(t) {
    if (t.label) return t.label;
    return t.gb == null ? 'データ無制限' : t.gb + 'GBまで';
  }
  function discText(x, a) {
    var d = x.d || x;
    var amt = x.amount != null ? x.amount : (typeof d.amount === 'number' ? d.amount : null);
    if (d.byLines && x.amount == null) {
      amt = null;
      var parts = Object.keys(d.byLines).map(function (k) { return k + '回線以上 -' + yen(d.byLines[k]); });
      return d.name + '（' + parts.join('・') + '）';
    }
    return d.name + (amt ? '（-' + yen(amt) + '）' : (d.type === 'fiber' && amt === 0 ? '（割引額は公式で確認）' : (typeof d.amount === 'number' ? '（-' + yen(d.amount) + '）' : '')));
  }

  function planCard(r, a, rank) {
    var p = r.plan, e = r.est;
    var box = el('article', 'plan');
    box.setAttribute('data-plan', p.id);
    var hd = el('div', 'plan-h');
    hd.appendChild(el('span', 'rank', String(rank)));
    var nm = el('div', 'plan-nm');
    nm.appendChild(el('span', 'kind k-' + p.kind, SC.KIND_LABEL[p.kind]));
    if (r.same) nm.appendChild(el('span', 'kind k-same', '今と同じ会社'));
    nm.appendChild(el('p', 'plan-name', p.brand + '　' + p.name));
    hd.appendChild(nm);
    box.appendChild(hd);

    var price = el('div', 'price');
    var big = el('p', 'price-big');
    big.appendChild(el('span', 'pl', '月額の目安'));
    big.appendChild(el('b', null, yen(e.base)));
    price.appendChild(big);
    if (e.likelyOff > 0) {
      var aft = el('p', 'price-after');
      aft.appendChild(el('span', 'pl', 'あなたの回答で当てはまりそうな割引をすべて使うと'));
      aft.appendChild(el('b', null, yen(e.afterLikely)));
      price.appendChild(aft);
    }
    box.appendChild(price);

    var dl = el('dl', 'kv');
    function kv(k, v) { dl.appendChild(el('dt', null, k)); var dd = el('dd'); if (typeof v === 'string') dd.textContent = v; else dd.appendChild(v); dl.appendChild(dd); }
    kv('データ', tierText(e.tier) + '：' + yen(e.tier.price));
    kv('通話', e.call.text);
    kv('店舗', p.storeNote || (p.store ? 'あり' : 'なし（手続きはネット）'));
    box.appendChild(dl);

    if (e.likely.length) {
      box.appendChild(el('p', 'subh', '当てはまりそうな割引'));
      var ul = el('ul', 'list disc');
      e.likely.forEach(function (x) { var li = el('li'); li.appendChild(el('b', null, discText(x, a))); if (x.d.condition) li.appendChild(el('span', 'cond', x.d.condition)); ul.appendChild(li); });
      box.appendChild(ul);
    }
    if (e.other.length) {
      box.appendChild(el('p', 'subh', 'ほかの割引（条件を満たせば）'));
      var ul2 = el('ul', 'list disc');
      e.other.forEach(function (d) { var li = el('li'); li.appendChild(el('b', null, discText(d, a))); if (d.condition) li.appendChild(el('span', 'cond', d.condition)); ul2.appendChild(li); });
      box.appendChild(ul2);
    }
    (p.notes || []).forEach(function (n) { box.appendChild(el('p', 'note', n)); });
    var src = el('p', 'src');
    src.appendChild(ext(p.source_url, p.brand + ' 公式の料金ページ'));
    src.appendChild(document.createTextNode('（' + jpDate(p.checked) + ' 確認）'));
    box.appendChild(src);
    return box;
  }

  function render(a) {
    var R = SC.recommend(D, a);
    var res = $('result');
    res.textContent = '';

    // summary of answers
    var sum = el('div', 'res-head');
    sum.appendChild(el('p', 'res-kicker', '診断結果'));
    var top = R.kinds[0];
    sum.appendChild(el('p', 'res-name', top.label + ' が合いそうです'));
    var why = el('ul', 'why');
    top.reasons.slice(0, 4).forEach(function (t) { why.appendChild(el('li', null, t)); });
    sum.appendChild(why);
    sum.appendChild(el('p', 'res-sub', '回答：' + SC.DATA_LABEL[a.data] + '／通話 ' + SC.CALL_LABEL[a.call] + '／' + (a.family >= 4 ? '4人以上' : a.family + '人') + '／家の回線 ' + SC.FIBER_LABEL[a.fiber] + '／店舗 ' + SC.STORE_LABEL[a.store] + '／今 ' + SC.CURRENT[a.current].label));
    res.appendChild(sum);

    // kinds
    var ks = el('section', 'sec');
    ks.appendChild(el('h2', null, '種類ごとの合いやすさ'));
    var max = Math.max.apply(null, R.kinds.map(function (k) { return k.score; }));
    var min = Math.min.apply(null, R.kinds.map(function (k) { return k.score; }));
    R.kinds.forEach(function (k, i) {
      var row = el('div', 'krow' + (i === 0 ? ' top' : ''));
      row.setAttribute('data-kind', k.kind);
      row.appendChild(el('span', 'klabel', k.label));
      var bar = el('span', 'kbar'); var fill = el('span', 'kfill');
      var pct = max === min ? 100 : Math.round(15 + 85 * (k.score - min) / (max - min));
      fill.style.width = pct + '%';
      bar.appendChild(fill); row.appendChild(bar);
      ks.appendChild(row);
    });
    ks.appendChild(el('p', 'note', '大手＝ドコモ・au・ソフトバンク・楽天モバイル。サブブランド＝UQ mobile・ワイモバイル。オンライン専用＝ahamo・povo・LINEMO。格安SIM＝IIJmio・mineo・日本通信SIM など。'));
    res.appendChild(ks);

    // plans
    var ps = el('section', 'sec');
    ps.appendChild(el('h2', null, '候補プラン（月額の目安）'));
    ps.appendChild(el('p', 'small', '合う種類と、月額の目安（当てはまりそうな割引を引いた額）の順。税込。端末代・キャンペーン・ポイント還元は含みません。'));
    var list = el('div', 'plans');
    R.plans.slice(0, SHOW).forEach(function (r, i) { list.appendChild(planCard(r, a, i + 1)); });
    ps.appendChild(list);
    if (R.plans.length > SHOW) {
      var more = el('details', 'more');
      more.appendChild(el('summary', null, 'ほかの候補を見る（' + (R.plans.length - SHOW) + '件）'));
      R.plans.slice(SHOW).forEach(function (r, i) { more.appendChild(planCard(r, a, SHOW + i + 1)); });
      ps.appendChild(more);
    }
    if (R.excluded.length) {
      ps.appendChild(el('p', 'note', '使うデータ量に合う容量がないため外したプラン：' + R.excluded.map(function (x) { return x.plan.brand + ' ' + x.plan.name; }).join('、')));
    }
    ps.appendChild(el('p', 'note', '料金は' + jpDate(D.checked) + 'に各社公式サイトで確認。最新は公式でご確認ください。'));
    res.appendChild(ps);

    // checklist
    var cl = el('section', 'sec');
    cl.appendChild(el('h2', null, '乗り換え前に確認すること'));
    var ol = el('ol', 'check');
    SC.checklist(a).forEach(function (c) {
      var li = el('li', c.warn ? 'warn' : null);
      li.setAttribute('data-check', c.id);
      li.appendChild(el('b', null, c.title));
      li.appendChild(el('p', null, c.body));
      ol.appendChild(li);
    });
    cl.appendChild(ol);
    var srcs = el('p', 'note');
    srcs.appendChild(document.createTextNode('参考：'));
    srcs.appendChild(ext('https://www.soumu.go.jp/menu_seisaku/ictseisaku/keitai_portal/norikae_2.html', '総務省 携帯電話ポータル「乗換えの基本と費用」'));
    srcs.appendChild(document.createTextNode('・'));
    srcs.appendChild(ext('https://www.soumu.go.jp/menu_seisaku/ictseisaku/keitai_portal/gimonkaiketsu/q_3.html', '「端末を変えずに乗り換えられるの？」'));
    cl.appendChild(srcs);
    res.appendChild(cl);

    var again = el('button', 'linkbtn again', '答えを変える');
    again.type = 'button';
    again.addEventListener('click', function () { window.scrollTo(0, 0); var x = $('quiz').querySelector('input'); if (x) x.focus(); });
    res.appendChild(again);

    res.hidden = false;
    renderAds();
    maybeInterstitial();
    last = a;
  }

  /* ---------- ads (A8 tags pasted into ads.json, sanitized; same as ModelCheck) ---------- */
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
  function adLabel() { return (ADS && ADS.label && ADS.label.ja) || '広告・PR'; }

  function renderAds() {
    var box = $('ads');
    box.textContent = '';
    box.hidden = true;
    if (!ADS) return;
    var slots = (ADS.slots || []).filter(function (s) { return s && s.tag && String(s.tag).trim(); });
    var made = 0, wrap = document.createDocumentFragment();
    slots.forEach(function (s) {
      var frag = sanitizeTag(s.tag);
      if (!frag) return;
      var d = el('div', 'ad-slot'); d.setAttribute('data-ad', s.id || '');
      d.appendChild(frag);
      var cap = s.caption && s.caption.ja;
      if (cap) d.appendChild(el('p', 'ad-cap', cap));
      wrap.appendChild(d); made++;
    });
    if (!made) return;
    var hd = el('div', 'adbox-h');
    hd.appendChild(el('h2', null, (ADS.heading && ADS.heading.ja) || 'スマホ・回線のサービス'));
    hd.appendChild(el('span', 'adtag', adLabel()));
    box.appendChild(hd);
    box.appendChild(el('p', 'ad-note', 'ここは広告です。上の診断結果・順位とは関係ありません。'));
    box.appendChild(wrap);
    box.hidden = false;
  }

  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function maybeInterstitial() {
    if (!ADS || !ADS.interstitial || !ADS.interstitial.tag || !String(ADS.interstitial.tag).trim()) return;
    if (store('sc_inter') === today()) return;
    var frag = sanitizeTag(ADS.interstitial.tag);
    if (!frag) return;
    var body = $('interBody'); body.textContent = ''; body.appendChild(frag);
    $('interLabel').textContent = adLabel();
    $('inter').hidden = false;
    store('sc_inter', today());
    $('interClose').focus();
  }
  function closeInter() { $('inter').hidden = true; $('interBody').textContent = ''; }

  /* ---------- init ---------- */
  function scrollToResult() {
    var r = $('result');
    if (!r.hidden) { var y = r.getBoundingClientRect().top + window.pageYOffset - 56; window.scrollTo(0, Math.max(0, y)); }
  }
  function run(scroll) {
    var a = readForm();
    var h = '#' + SC.toHash(a);
    if (location.hash !== h) { try { history.replaceState(null, '', h); } catch (e) { /* file:// etc. */ } }
    render(a);
    if (scroll) scrollToResult();
  }
  function fromHash() {
    var a = SC.fromHash(location.hash);
    if (!a) return;
    writeForm(a);
    render(a);
  }
  function bind() {
    $('quiz').addEventListener('submit', function (e) { e.preventDefault(); run(true); });
    $('quiz').addEventListener('change', function () { if (last) run(false); });
    $('interClose').addEventListener('click', closeInter);
    $('inter').addEventListener('click', function (e) { if (e.target === $('inter')) closeInter(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('inter').hidden) closeInter(); });
    window.addEventListener('hashchange', fromHash);
  }

  Promise.all([getJSON('data/plans.json'), getJSON('ads.json').catch(function () { return null; })])
    .then(function (res) {
      D = res[0]; ADS = res[1];
      $('checkedNote').textContent = '料金は' + jpDate(D.checked) + 'に各社公式サイトで確認。最新は公式でご確認ください。';
      bind(); fromHash();
      window.__scReady = true;
    })
    .catch(function (e) { document.body.setAttribute('data-error', String(e)); window.__scReady = true; });
})();
