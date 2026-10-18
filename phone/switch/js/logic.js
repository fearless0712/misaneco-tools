/* SwitchCheck logic: pure functions (browser: window.SC / node: module.exports).
   Nothing here reads ads. Ranking uses only the answers and data/plans.json. */
(function (root) {
  'use strict';

  var KINDS = ['major', 'sub', 'online', 'mvno'];
  var KIND_LABEL = { major: '大手キャリア', sub: 'サブブランド', online: 'オンライン専用プラン', mvno: '格安SIM' };
  // GB the user needs per answer. "xl" = 50GB以上（無制限を含む）
  var DATA_GB = { s: 3, m: 10, l: 30, xl: 50 };
  var DATA_LABEL = { s: '3GBくらいまで', m: '10GBくらいまで', l: '30GBくらいまで', xl: '30GBより多い（50GB以上・無制限）' };
  var CALL_LABEL = { none: 'ほぼしない', short: '5分以内が多い', long: '長電話もする' };
  var FIBER_LABEL = { none: 'ない・わからない', docomo: 'ドコモ光 / home 5G', au: 'auひかり・auのセット割対象の回線', softbank: 'SoftBank光 / SoftBank Air', rakuten: '楽天ひかり', other: 'その他の光回線' };
  var STORE_LABEL = { need: '店舗で相談したい', some: 'あると安心', no: 'いらない（ネットで手続きできる）' };
  var CURRENT = {
    docomo: { label: 'ドコモ', group: 'docomo', kind: 'major', brand: 'docomo' },
    ahamo: { label: 'ahamo', group: 'docomo', kind: 'online', brand: 'ahamo' },
    au: { label: 'au', group: 'au', kind: 'major', brand: 'au' },
    uq: { label: 'UQ mobile', group: 'au', kind: 'sub', brand: 'UQ mobile' },
    povo: { label: 'povo', group: 'au', kind: 'online', brand: 'povo' },
    softbank: { label: 'ソフトバンク', group: 'softbank', kind: 'major', brand: 'SoftBank' },
    ymobile: { label: 'ワイモバイル', group: 'softbank', kind: 'sub', brand: 'Y!mobile' },
    linemo: { label: 'LINEMO', group: 'softbank', kind: 'online', brand: 'LINEMO' },
    rakuten: { label: '楽天モバイル', group: 'rakuten', kind: 'major', brand: '楽天モバイル' },
    mvno: { label: '格安SIM（その他）', group: 'mvno', kind: 'mvno', brand: null },
    unknown: { label: 'わからない・その他', group: null, kind: null, brand: null }
  };
  var DEFAULTS = { data: 'm', call: 'short', family: 1, fiber: 'none', store: 'some', current: 'unknown' };

  function normalize(a) {
    a = a || {};
    var o = {};
    o.data = DATA_GB.hasOwnProperty(a.data) ? a.data : DEFAULTS.data;
    o.call = CALL_LABEL.hasOwnProperty(a.call) ? a.call : DEFAULTS.call;
    var f = parseInt(a.family, 10);
    o.family = f >= 1 && f <= 4 ? f : DEFAULTS.family;
    o.fiber = FIBER_LABEL.hasOwnProperty(a.fiber) ? a.fiber : DEFAULTS.fiber;
    o.store = STORE_LABEL.hasOwnProperty(a.store) ? a.store : DEFAULTS.store;
    o.current = CURRENT.hasOwnProperty(a.current) ? a.current : DEFAULTS.current;
    return o;
  }

  /* ---------- which kind fits ---------- */
  function kindScores(ans) {
    var a = normalize(ans);
    var s = {}, why = {};
    KINDS.forEach(function (k) { s[k] = 0; why[k] = []; });
    function add(k, n, reason) { s[k] += n; if (reason && n > 0) why[k].push(reason); }

    if (a.store === 'need') {
      add('major', 3, '店舗で相談できる'); add('sub', 3, '店舗で相談できる'); add('online', -6); add('mvno', -2);
    } else if (a.store === 'some') {
      add('major', 1, '店舗がある'); add('sub', 2, '店舗があり、大手より月額が抑えめ'); add('online', -1);
    } else {
      add('online', 2, '手続きをネットでできれば月額を抑えやすい'); add('mvno', 2, '手続きをネットでできれば月額を抑えやすい');
    }

    if (a.data === 's') {
      add('mvno', 3, '少ないデータ量の安いプランがある'); add('sub', 1, '小さめの容量のプランがある'); add('online', 1, '小さめの容量のプランがある'); add('major', -2);
    } else if (a.data === 'm') {
      add('sub', 2, '10GB前後のプランがある'); add('mvno', 2, '10GB前後のプランが安い'); add('online', 1, '使う量に合わせて選べる');
    } else if (a.data === 'l') {
      add('online', 3, '30GB前後のプランが比較的安い'); add('sub', 1, '30GB前後のプランがある'); add('mvno', 1, '大きめの容量のプランもある');
    } else {
      add('major', 3, 'データ無制限（使い放題）のプランがある'); add('online', 1, '大容量のプラン・オプションがある'); add('mvno', -2);
    }

    if (a.call === 'long') {
      add('major', 2, '国内通話かけ放題のオプションがある'); add('sub', 1, 'かけ放題のオプションがある');
    } else if (a.call === 'short') {
      add('online', 1, '5分以内の通話が無料のプランやオプションがある'); add('sub', 1, '短い通話のオプションがある');
    } else {
      add('mvno', 1, '通話をほぼしなければ基本料だけで済む');
    }

    if (a.family >= 3) {
      add('major', 1, '家族で入ると割引がある'); add('sub', 1, '家族で入ると割引がある');
    } else if (a.family === 2) {
      add('sub', 1, '家族で入ると割引がある');
    }

    if (a.fiber !== 'none' && a.fiber !== 'other') {
      add('sub', 2, '家の光回線とのセット割の対象になる場合がある'); add('major', 1, '家の光回線とのセット割の対象になる場合がある');
    }

    var list = KINDS.map(function (k) {
      var seen = {}, r = why[k].filter(function (x) { if (seen[x]) return false; seen[x] = 1; return true; });
      return { kind: k, label: KIND_LABEL[k], score: s[k], reasons: r };
    });
    list.sort(function (x, y) { return y.score - x.score || KINDS.indexOf(x.kind) - KINDS.indexOf(y.kind); });
    return list;
  }

  /* ---------- price estimate for one plan ---------- */
  function pickTier(plan, gb) {
    var best = null;
    (plan.tiers || []).forEach(function (t) {
      var cap = t.gb == null ? Infinity : t.gb;
      if (cap >= gb && (!best || t.price < best.price)) best = t;
    });
    return best;
  }

  function callCost(plan, call) {
    var c = plan.call || {};
    if (call === 'none') return { price: 0, text: c.included ? c.included : '通話した分だけ通話料' + (c.rate ? '（' + c.rate + '）' : '') };
    if (call === 'short') {
      if (c.short === 0) return { price: 0, text: c.included || '5分以内の通話はプランに込み' };
      if (c.short && typeof c.short.price === 'number') return { price: c.short.price, text: c.short.name + '（月' + yen(c.short.price) + '）' };
      return { price: 0, text: '5分かけ放題のオプションは確認できず。通話料' + (c.rate ? '（' + c.rate + '）' : '') + 'がかかる', missing: true };
    }
    if (c.long === 0) return { price: 0, text: c.included || '国内通話かけ放題はプランに込み' };
    if (c.long && typeof c.long.price === 'number') return { price: c.long.price, text: c.long.name + '（月' + yen(c.long.price) + '）' };
    return { price: 0, text: '無制限かけ放題のオプションは確認できず。通話料' + (c.rate ? '（' + c.rate + '）' : '') + 'がかかる', missing: true };
  }

  // amount for this household, or null if it doesn't apply / isn't a number
  function discountAmount(d, a) {
    if (d.type === 'fiber') return d.fiber && d.fiber === a.fiber ? (typeof d.amount === 'number' ? d.amount : 0) : null; // 0 = applies, amount not confirmed
    if (d.type === 'family') {
      if (d.byLines) {
        var best = null;
        Object.keys(d.byLines).forEach(function (k) { if (a.family >= +k && (best === null || +k > best.k)) best = { k: +k, v: d.byLines[k] }; });
        return best ? best.v : null;
      }
      return a.family >= (d.minLines || 2) && typeof d.amount === 'number' ? d.amount : null;
    }
    return null; // card payment etc.: the answers can't tell
  }

  function estimate(plan, ans) {
    var a = normalize(ans);
    var tier = pickTier(plan, DATA_GB[a.data]);
    if (!tier) return null;
    var p2 = tier.call ? { call: Object.assign({}, plan.call || {}, tier.call) } : plan;
    var cc = callCost(p2, a.call);
    var base = tier.price + cc.price;
    var likely = [], other = [], ex = {};
    (plan.discounts || []).forEach(function (d) {
      if (d.tiers && d.tiers.indexOf(tier.label || String(tier.gb)) < 0) return; // only for some tiers
      var amt = discountAmount(d, a);
      if (amt == null) { other.push(d); return; }
      var item = { d: d, amount: amt };
      if (d.exclusive) { // only the biggest one of the same group counts
        var prev = ex[d.exclusive];
        if (prev && prev.amount >= amt) { other.push(d); return; }
        if (prev) { likely.splice(likely.indexOf(prev), 1); other.push(prev.d); }
        ex[d.exclusive] = item;
      }
      likely.push(item);
    });
    var off = 0;
    likely.forEach(function (x) { off += x.amount; });
    return { tier: tier, call: cc, base: base, likely: likely, other: other, likelyOff: off, afterLikely: Math.max(0, base - off) };
  }

  /* ---------- candidate plans ---------- */
  function recommend(data, ans) {
    var a = normalize(ans);
    var ks = kindScores(a), kscore = {};
    ks.forEach(function (k) { kscore[k.kind] = k.score; });
    var cur = CURRENT[a.current];
    var out = [], excluded = [];
    (data.plans || []).forEach(function (p) {
      var e = estimate(p, a);
      if (!e) { excluded.push({ plan: p, why: 'data' }); return; }
      var score = kscore[p.kind] || 0;
      if (a.store === 'need' && !p.store) score -= 4;
      if (a.store === 'need' && p.store && p.kind === 'mvno') score += 3; // MVNO with shops
      if (e.likely.some(function (x) { return x.d.type === 'fiber'; })) score += 2;
      if (a.call !== 'none' && e.call.missing) score -= 1;
      var same = !!(cur && cur.brand && p.brand === cur.brand);
      out.push({ plan: p, est: e, score: score, same: same });
    });
    out.sort(function (x, y) {
      return (y.score - x.score) || (x.est.afterLikely - y.est.afterLikely) || (x.plan.id < y.plan.id ? -1 : 1);
    });
    return { answers: a, kinds: ks, plans: out, excluded: excluded };
  }

  /* ---------- checklist before switching ---------- */
  function checklist(ans) {
    var a = normalize(ans);
    var cur = CURRENT[a.current];
    var items = [];
    items.push({ id: 'mnp', title: '電話番号をそのまま使う手続き（MNP）',
      body: '今の会社で「MNP予約番号」を取り、乗り換え先の申し込みで伝えます。予約番号の有効期限内に乗り換え先の契約が終わらないと、今の契約がそのまま続きます。今の会社と乗り換え先がどちらも「MNPワンストップ」に対応していれば、予約番号を取らずに乗り換え先だけで手続きできる場合があります（対応状況は各社の公式で確認）。' });
    items.push({ id: 'device', title: '端末の分割払いの残り（残債）',
      body: '今のスマホを分割で買っている場合、乗り換えても残りの支払いは続きます。返却プログラム（下取り・返却で残りが不要になるもの）を使っているときは、解約で条件が変わらないか今の会社で確認してください。' });
    items.push({ id: 'simlock', title: 'SIMロック',
      body: '2021年10月以降に発売されたスマホは原則SIMロックなし。それより前に大手3社（ドコモ・au・ソフトバンク）で買った端末は、SIMロック解除が必要な場合があります（ウェブなら無料、電話・店舗は3,300円のことが多い）。解除しても周波数の関係でつながりにくいことがあるので、乗り換え先の「動作確認端末」を確認してください。' });
    items.push({ id: 'esim', title: 'eSIM に対応しているか',
      body: 'eSIMなら届くのを待たずに開通できることがあります。今のスマホがeSIMに対応しているか、乗り換え先がその機種のeSIMに対応しているかを公式の対応端末一覧で確認。わからなければ通常のSIMカードを選べば大丈夫です。' });
    if (cur && (cur.kind === 'major' || cur.kind === 'sub') && a.family >= 2) {
      items.push({ id: 'family', warn: true, title: '家族割が外れる影響',
        body: '今の会社で家族割を使っていると、あなたが抜けることで家族の回線数が減り、残る家族の割引が小さくなったり、なくなったりすることがあります。家族の分も合わせて比べてください。' });
    }
    if (cur && (cur.kind === 'major' || cur.kind === 'sub') && a.fiber === cur.group) {
      items.push({ id: 'fiber', warn: true, title: '光回線のセット割が外れる影響',
        body: '今は家の光回線と' + cur.label + 'のセット割の対象になっている可能性があります。別の会社に移ると、その割引（家族の回線の分を含む）がなくなることがあります。同じグループのサブブランドならセット割を続けられる場合があります。' });
    } else if (a.fiber !== 'none' && a.fiber !== 'other' && cur && cur.group && cur.group !== a.fiber) {
      items.push({ id: 'fiber2', title: '光回線のセット割', body: '家の光回線と同じグループの会社に移ると、セット割の対象になる場合があります。候補の「割引の条件」を見てください。' });
    }
    items.push({ id: 'fees', title: 'そのほか',
      body: '契約期間のあるプランは途中解約で違約金がかかることがあります。キャリアメール（@docomo.ne.jp など）は使えなくなるか有料での持ち運びになるので、ログインに使っているサービスは先にメールアドレスを変えておくと安心です。' });
    return items;
  }

  function yen(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '円'; }

  /* hash <-> answers */
  function toHash(a) {
    a = normalize(a);
    return 'd=' + a.data + '&c=' + a.call + '&f=' + a.family + '&h=' + a.fiber + '&s=' + a.store + '&cur=' + a.current;
  }
  function fromHash(h) {
    h = String(h || '').replace(/^#/, '');
    if (!/(^|&)d=/.test(h)) return null;
    var o = {};
    h.split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) o[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); });
    return normalize({ data: o.d, call: o.c, family: o.f, fiber: o.h, store: o.s, current: o.cur });
  }

  var SC = {
    KINDS: KINDS, KIND_LABEL: KIND_LABEL, DATA_GB: DATA_GB, DATA_LABEL: DATA_LABEL, CALL_LABEL: CALL_LABEL,
    FIBER_LABEL: FIBER_LABEL, STORE_LABEL: STORE_LABEL, CURRENT: CURRENT,
    normalize: normalize, discountAmount: discountAmount, kindScores: kindScores, pickTier: pickTier, callCost: callCost, estimate: estimate,
    recommend: recommend, checklist: checklist, yen: yen, toHash: toHash, fromHash: fromHash
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = SC; else root.SC = SC;
})(this);
