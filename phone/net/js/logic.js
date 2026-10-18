/* NetCheck 判定ロジック（画面とテストで共通）。外部通信なし。
 * 回線の「種類」を答えから点数で並べ、各種類の候補を「スマホとのセット割が合うもの→その他（データの並び順）」で並べる。
 * 料金の安さでは並べない（最安とは言わない）。広告はこの並びに一切関係しない。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NC = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TYPES = ['fiber', 'home', 'mobile'];
  var TYPE_NAME = { fiber: '光回線', home: 'ホームルーター（置くだけWi-Fi）', mobile: 'ポケットWiFi・モバイル回線' };

  var Q = {
    house: ['house', 'apartment'],
    tenure: ['own', 'rent', 'nokoji', 'unknown'],
    carrier: ['docomo', 'ahamo', 'au', 'uq', 'softbank', 'ymobile', 'rakuten', 'other'],
    people: ['1', '2', '4'],
    stay: ['lt1', '1to2', 'gt3', 'unknown'],
    wait: ['yes', 'no']
  };
  var USES = ['video', 'game', 'work', 'upload', 'outside', 'light'];
  var DEFAULTS = { house: 'apartment', tenure: 'unknown', carrier: 'other', people: '1', stay: 'unknown', wait: 'yes', uses: [] };

  function normalize(a) {
    a = a || {};
    var o = {};
    Object.keys(Q).forEach(function (k) { o[k] = Q[k].indexOf(a[k]) >= 0 ? a[k] : DEFAULTS[k]; });
    var u = Array.isArray(a.uses) ? a.uses : (typeof a.uses === 'string' && a.uses ? a.uses.split(',') : []);
    o.uses = USES.filter(function (x) { return u.indexOf(x) >= 0; });
    return o;
  }

  /* 種類ごとの点数と理由。理由は「なぜ上がった/下がったか」を答えに沿って書く（事実の断定はしない）。 */
  function scoreTypes(ans) {
    var a = normalize(ans);
    var s = { fiber: 50, home: 35, mobile: 20 };
    var why = { fiber: [], home: [], mobile: [] };
    var excluded = {};
    function add(t, n, msg) { s[t] += n; if (msg) why[t].push({ plus: n > 0, text: msg }); }
    var has = function (u) { return a.uses.indexOf(u) >= 0; };

    if (a.tenure === 'nokoji') {
      excluded.fiber = '工事ができない住まいなので、光回線は外しました（管理会社・大家さんに聞くと、建物に光の設備があって工事なしで使える場合もあります）。';
      add('home', 15, '工事なしで、コンセントにさすだけで使えます');
    } else if (a.tenure === 'rent') {
      add('fiber', -5, '賃貸なので、工事の前に管理会社・大家さんの許可が必要です');
      add('home', 5, '工事がいらないので、賃貸でも始めやすい');
    } else if (a.tenure === 'unknown') {
      add('fiber', -3, '工事ができるかどうか、先に確認が必要です');
    } else if (a.tenure === 'own') {
      add('fiber', 5, '持ち家なので工事の許可を取りやすい');
    }

    if (a.stay === 'lt1') {
      add('fiber', -25, '1年以内に引越すと、工事費の残りや解約金がかかりやすい');
      add('home', 10, '工事がないので、短い期間でも始めやすい（引越し時は住所変更の手続きが必要）');
      add('mobile', 12, '住所に縛られず、引越し先でもそのまま使いやすい');
    } else if (a.stay === '1to2') {
      add('fiber', -10, '2年以内に引越すと、契約期間の途中になりやすい');
      add('home', 5, '工事がないので、引越しの手間が少なめ');
    } else if (a.stay === 'gt3') {
      add('fiber', 12, '長く住むなら、工事をしても元を取りやすい');
    }

    if (a.wait === 'no') {
      add('fiber', -20, '光回線は工事日まで待つ必要があります（数日〜1か月以上）');
      add('home', 12, '届いたらすぐ使えます');
      add('mobile', 8, '届いたらすぐ使えます');
    }

    if (has('game')) {
      add('fiber', 25, 'オンラインゲームは、安定した光回線が向いています');
      add('home', -10, 'ゲームでは、混雑する時間帯に遅くなると困りやすい');
      add('mobile', -15, 'ゲームでは、電波の状態に左右されやすい');
    }
    if (has('work')) {
      add('fiber', 15, 'ビデオ会議・在宅ワークは、安定した光回線が安心');
      add('mobile', -5, '長時間の会議では、電波の状態に左右されやすい');
    }
    if (has('upload')) {
      add('fiber', 15, '大きいファイルの送信（アップロード）が多いなら光回線');
      add('mobile', -5, null);
    }
    if (has('video')) {
      add('fiber', 8, '動画をたくさん見るなら、データ量を気にしない回線');
      add('home', 5, 'ホームルーターでも動画は見られます（混雑時に画質が下がることも）');
      add('mobile', -5, '動画をたくさん見ると、通信量が多くなります');
    }
    if (has('outside')) {
      add('mobile', 30, '外でも同じWi-Fiを使えます');
      add('home', -5, 'ホームルーターは登録した住所でしか使えません');
    }
    if (has('light')) {
      add('home', 8, '調べもの・SNSくらいなら、工事なしの回線で足りることが多い');
      add('mobile', 10, '使う量が少ないなら、持ち歩ける回線でも足りやすい');
    }

    if (a.people === '4') {
      add('fiber', 15, '4人以上で同時に使うなら、光回線が安定');
      add('mobile', -20, '大人数で同時に使うのには向きません');
    } else if (a.people === '2') {
      add('fiber', 5, null);
      add('mobile', -10, '2〜3人で使うなら、家に置く回線のほうが向いています');
    } else if (a.people === '1') {
      add('mobile', 8, 'ひとり暮らしなら、持ち歩ける回線も候補');
    }

    var list = TYPES.map(function (t) {
      return { type: t, name: TYPE_NAME[t], score: s[t], reasons: why[t], excluded: excluded[t] || null };
    });
    list.sort(function (x, y) {
      if (!!x.excluded !== !!y.excluded) return x.excluded ? 1 : -1;
      if (y.score !== x.score) return y.score - x.score;
      return TYPES.indexOf(x.type) - TYPES.indexOf(y.type);
    });
    return list;
  }

  function monthlyFor(plan, house) {
    var m = plan.monthly || {};
    return m.any || m[house] || [];
  }

  function setMatch(plan, carrier) {
    return (plan.set || []).filter(function (x) { return x.carriers.indexOf(carrier) >= 0; });
  }

  /* その種類の候補。onlyFor（例：ahamo光）は対象のスマホのときだけ出す。
   * 並び：セット割・特典が合うもの → その他。どちらもデータの並び順のまま（料金でも広告でも並べ替えない）。 */
  function candidates(data, type, ans) {
    var a = normalize(ans);
    var plans = (data.plans || []).filter(function (p) {
      if (p.type !== type) return false;
      if (p.onlyFor && p.onlyFor.indexOf(a.carrier) < 0) return false;
      return true;
    });
    var out = plans.map(function (p, i) {
      var m = setMatch(p, a.carrier);
      return { plan: p, order: i, match: m, matched: m.length > 0, monthly: monthlyFor(p, a.house) };
    });
    out.sort(function (x, y) {
      if (x.matched !== y.matched) return x.matched ? -1 : 1;
      return x.order - y.order;
    });
    return out;
  }

  /* 答えに合わせた共通の注意点 */
  function cautions(ans) {
    var a = normalize(ans);
    var c = [];
    if (a.tenure === 'rent' || a.tenure === 'unknown') c.push('賃貸・よく分からない場合は、光回線の申し込み前に管理会社・大家さんへ「光回線の設備があるか」「工事してよいか」を確認しましょう。');
    if (a.house === 'apartment') c.push('マンションは、建物に入っている設備によって使える回線・プラン・工事の内容が変わります。各社の公式ページで住所を入れて確認できます。');
    if (a.stay === 'lt1' || a.stay === '1to2') c.push('引越しが近いなら、契約期間・解約金・工事費の分割の残り・端末代の残りを先に確認しましょう。');
    if (a.wait === 'no') c.push('すぐ使いたい場合、ホームルーターやモバイルルーターは届けばすぐ使えます。光回線は工事日を確認してから申し込みましょう。');
    c.push('キャンペーンやキャッシュバックは時期で変わるので、このツールでは扱っていません。申し込む前に公式ページで最新の料金・条件を確認してください。');
    return c;
  }

  function diagnose(data, ans) {
    var a = normalize(ans);
    var types = scoreTypes(a);
    var cands = {};
    TYPES.forEach(function (t) { cands[t] = candidates(data, t, a); });
    return { answers: a, types: types, top: types[0].type, candidates: cands, cautions: cautions(a) };
  }

  /* 答え ⇔ URLの#（共有・再表示用。#以降はサーバーに送られない） */
  function toHash(ans) {
    var a = normalize(ans);
    return ['h=' + a.house, 't=' + a.tenure, 'c=' + a.carrier, 'p=' + a.people, 's=' + a.stay, 'w=' + a.wait, 'u=' + a.uses.join('.')].join('&');
  }
  function fromHash(h) {
    h = String(h || '').replace(/^#/, '');
    if (!h) return null;
    var map = { h: 'house', t: 'tenure', c: 'carrier', p: 'people', s: 'stay', w: 'wait', u: 'uses' };
    var o = {}, any = false;
    h.split('&').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i < 0) return;
      var k = map[kv.slice(0, i)];
      if (!k) return;
      var v = decodeURIComponent(kv.slice(i + 1));
      o[k] = k === 'uses' ? (v ? v.split('.') : []) : v;
      any = true;
    });
    return any ? normalize(o) : null;
  }

  function yen(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '円'; }

  return {
    TYPES: TYPES, TYPE_NAME: TYPE_NAME, Q: Q, USES: USES,
    normalize: normalize, scoreTypes: scoreTypes, candidates: candidates, cautions: cautions,
    diagnose: diagnose, toHash: toHash, fromHash: fromHash, yen: yen, monthlyFor: monthlyFor, setMatch: setMatch
  };
});
