/* StorageCheck 計算ロジック（画面に依存しない。Node でもブラウザでも動く） */
(function (root) {
  'use strict';

  var CAPACITIES = [16, 32, 64, 128, 256, 512, 1000, 2000];

  /* 数字の読み取り：全角数字・カンマ・空白OK。空なら null、数字でなければ NaN */
  function num(v) {
    if (v === null || v === undefined) return null;
    var s = String(v).replace(/[０-９．]/g, function (c) {
      return c === '．' ? '.' : String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
    }).replace(/[,，\s]/g, '');
    if (s === '') return null;
    if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
    return parseFloat(s);
  }

  function round1(x) { return Math.round(x * 10) / 10; }

  function photosGB(inp, a) {
    var v = inp.photoValue || 0;
    if (inp.photoMode === 'count') return v * (inp.photoMB || a.photo_mb_default) / 1000;
    return v;
  }
  function videosGB(inp, a) {
    var v = inp.videoValue || 0;
    if (inp.videoMode === 'count') return v * (inp.videoMin || 1) * a.video_mb_per_min / 1000;
    return v;
  }

  /* 入力チェック。errors は計算できない問題、warnings は計算はするが注意 */
  function validate(inp) {
    var errors = [], warnings = [];
    if (inp.os !== 'ios' && inp.os !== 'android') errors.push({ field: 'os', msg: '機種（iPhone / Android）を選んでください。' });
    if (!(inp.capacity > 0)) errors.push({ field: 'capacity', msg: '本体の容量を選んでください。' });
    if (inp.free === null || inp.free === undefined) errors.push({ field: 'free', msg: '今の空き容量（GB）を入れてください。' });
    var nums = { free: inp.free, photoValue: inp.photoValue, videoValue: inp.videoValue, videoMin: inp.videoMin, photoMB: inp.photoMB, line: inp.line, apps: inp.apps, deleted: inp.deleted, target: inp.target };
    Object.keys(nums).forEach(function (k) {
      var v = nums[k];
      if (v !== null && v !== undefined && (isNaN(v) || v < 0)) errors.push({ field: k, msg: '数字（0以上）で入れてください。' });
    });
    if (!errors.length && inp.free > inp.capacity) errors.push({ field: 'free', msg: '空き容量が本体の容量より大きくなっています。' });
    return { errors: errors, warnings: warnings };
  }

  function smallestFit(plans, need) {
    for (var i = 0; i < plans.length; i++) if (plans[i].gb >= need) return plans[i];
    return null;
  }

  /* クラウドの比較：入力した写真・動画の量（needGB）が入る最小のプラン */
  function cloudOptions(needGB, videoGB, data, inp) {
    var out = [];
    var used = inp.clouds || {};
    data.providers.forEach(function (p) {
      if (p.id === 'amazon') {
        var pr = p.prime;
        var isPrime = !!used.amazonPrime;
        /* ルートA：プライム（写真は容量無制限・動画は5GB） */
        var a = { provider: 'amazon', route: 'prime', name: 'Amazonプライム＋Amazon Photos', using: isPrime, notes: [], sources: [pr.source_url, pr.fee_source_url] };
        var primeM = isPrime ? 0 : pr.monthly, primeY = isPrime ? 0 : pr.annual;
        if (videoGB <= pr.video_gb) {
          a.fits = true; a.planLabel = '写真：容量無制限／動画：' + pr.video_gb + 'GBまで';
          a.monthly = primeM; a.annual = primeY; a.annualKind = isPrime ? 'none' : 'official';
        } else {
          var vp = smallestFit(p.plans, videoGB);
          if (vp) {
            a.fits = true; a.planLabel = '写真：容量無制限＋動画用に ' + vp.label + ' プラン';
            a.monthly = primeM + vp.monthly;
            a.annual = isPrime ? vp.monthly * 12 : primeY + vp.monthly * 12;
            a.annualKind = 'calc';
            a.notes.push('動画が' + pr.video_gb + 'GBを超えるため、動画が全部入る容量のプランで計算しました（プライムの5GBとの合算方法は公式ページで確認してください）。');
          } else { a.fits = false; }
        }
        if (isPrime) a.notes.push('すでにプライム会員の場合、追加の会費はかかりません。');
        else a.notes.push('プライム会費（月額' + yen(pr.monthly) + '・年額' + yen(pr.annual) + '、税込み）は配送など他の特典も含む料金です。');
        out.push(a);
        /* ルートB：プライムなしでストレージプラン */
        var b = { provider: 'amazon', route: 'plan', name: 'Amazon Photos（プライムなし）', using: false, notes: [], sources: [p.source_url] };
        if (needGB <= p.free_gb) { b.fits = true; b.planLabel = '無料 ' + p.free_gb + 'GB'; b.monthly = 0; b.annual = 0; b.annualKind = 'none'; b.free = true; }
        else {
          var bp = smallestFit(p.plans, needGB);
          if (bp) { b.fits = true; b.planLabel = bp.label; b.monthly = bp.monthly; b.annual = bp.monthly * 12; b.annualKind = 'calc'; }
          else b.fits = false;
        }
        b.notes.push(p.annual_note + '。');
        out.push(b);
        return;
      }
      var o = { provider: p.id, route: 'plan', name: p.name, using: !!used[p.id], notes: [], sources: [p.source_url] };
      if (needGB <= p.free_gb) { o.fits = true; o.free = true; o.planLabel = '無料 ' + p.free_gb + 'GB'; o.monthly = 0; o.annual = 0; o.annualKind = 'none'; }
      else {
        var pl = smallestFit(p.plans, needGB);
        if (pl) {
          o.fits = true; o.planLabel = pl.label; o.monthly = pl.monthly;
          if (pl.annual !== null && pl.annual !== undefined) { o.annual = pl.annual; o.annualKind = 'official'; }
          else { o.annual = pl.monthly * 12; o.annualKind = 'calc'; }
        } else o.fits = false;
      }
      if (p.id === 'icloud') o.notes.push('無料の5GBはiCloudバックアップなどと共有です。');
      if (p.id === 'google') o.notes.push('容量はGoogleフォト・ドライブ・Gmailで合計です（無料の15GBも同じ）。');
      if (o.annualKind === 'calc') o.notes.push(p.annual_note + '。');
      out.push(o);
    });
    var fit = out.filter(function (x) { return x.fits; }).sort(function (x, y) { return x.monthly - y.monthly; });
    var nofit = out.filter(function (x) { return !x.fits; });
    if (fit.length) {
      var min = fit[0].monthly;
      fit.forEach(function (x) { x.cheapest = x.monthly === min; });
    }
    return fit.concat(nofit);
  }

  function yen(n) {
    var s = String(Math.round(n)), out = '';
    while (s.length > 3) { out = ',' + s.slice(-3) + out; s = s.slice(0, -3); }
    return '¥' + s + out;
  }
  function gb(x) {
    if (x === null || x === undefined || isNaN(x)) return '—';
    if (x >= 1000) return round1(x / 1000) + 'TB';
    if (x < 10) return round1(x) + 'GB';
    return Math.round(x) + 'GB';
  }

  /* メイン：入力→結果 */
  function compute(inp, plans, guides) {
    var v = validate(inp);
    if (v.errors.length) return { ok: false, errors: v.errors };
    var a = plans.assumptions;
    var res = { ok: true, warnings: v.warnings.slice() };
    res.capacity = inp.capacity;
    res.free = inp.free;
    res.used = inp.capacity - inp.free;
    res.photosGB = photosGB(inp, a);
    res.videosGB = videosGB(inp, a);
    res.mediaGB = res.photosGB + res.videosGB;
    res.line = inp.line || 0;
    res.apps = inp.apps || 0;
    res.deleted = inp.deleted || 0;
    res.targetAuto = inp.target === null || inp.target === undefined;
    res.target = res.targetAuto ? Math.ceil(inp.capacity * 0.1) : inp.target;
    res.shortfall = Math.max(0, res.target - inp.free);
    var known = res.mediaGB + res.line + res.apps + res.deleted;
    if (known > res.used + 0.05) res.warnings.push('写真・動画・LINEなどの合計（' + gb(known) + '）が、使用中の容量（' + gb(res.used) + '）より大きくなっています。数字を見直してください（下の計算は使用中の容量を上限にしています）。');
    if (inp.photoMode === 'count' && res.photosGB > 0) res.warnings.push('写真の量は「1枚あたり' + (inp.photoMB || a.photo_mb_default) + 'MB」という仮の値で計算しています。設定のストレージ画面のGBを入れるほうが正確です。');
    if (inp.videoMode === 'count' && res.videosGB > 0) res.warnings.push('動画の量は「1分あたり約' + a.video_mb_per_min + 'MB（1080p HDの目安）」で計算しています。4Kなどではもっと大きくなります。');

    var amounts = { line: res.line, apps: res.apps, deleted: res.deleted, media: res.mediaGB };
    res.actions = guides.actions.filter(function (g) { return g.os.indexOf(inp.os) >= 0; }).map(function (g) {
      var amt = g.amount ? amounts[g.amount] : null;
      return {
        id: g.id, title: g.title, risk: g.risk, steps: g.steps, points: g.points,
        source_title: g.source_title, source_url: g.source_url, extra_url: g.extra_url, extra_title: g.extra_title,
        amountKind: g.amount, amountNote: g.amount_note,
        gbMax: amt ? Math.min(amt, res.used) : null,
        cloud: g.cloud || null
      };
    });
    var order = { low: 0, mid: 2, high: 1 };
    /* 並び：安全なもの → 取り消せないもの → クラウドへ移す（②とつながる） */
    res.actions.sort(function (x, y) { return order[x.risk] - order[y.risk]; });
    res.totalMax = Math.min(res.used, res.line + res.apps + res.deleted + res.mediaGB);
    res.totalWithoutMedia = Math.min(res.used, res.line + res.apps + res.deleted);
    res.reachable = res.shortfall === 0 ? 'already' : (res.totalWithoutMedia >= res.shortfall ? 'without_media' : (res.totalMax >= res.shortfall ? 'with_media' : 'not_enough'));
    res.cloudNeed = res.mediaGB;
    res.cloud = res.mediaGB > 0 ? cloudOptions(res.mediaGB, res.videosGB, plans, inp) : [];
    res.pc = guides.pc[inp.os];
    res.backup = guides.backup[inp.os];
    res.howto = guides.howto_measure[inp.os];
    return res;
  }

  var api = { num: num, validate: validate, compute: compute, cloudOptions: cloudOptions, photosGB: photosGB, videosGB: videosGB, yen: yen, gb: gb, smallestFit: smallestFit, CAPACITIES: CAPACITIES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SC = api;
})(this);
