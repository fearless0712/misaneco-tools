/* 経理・事務スタジオの見本データ（すべて架空）。
   開いた日（?today= で固定もできる）の月を「今月」として、前の6か月分の明細・請求書・入金と、今月の途中までを作る。
   ・カード明細と銀行明細は KichoAuto の見本と同じお店の名前・書き方（全角カナ・半角カナ）
   ・請求書は 請求書一括作成 の見本と同じ取引先・品目（茶菓子は軽減税率8%）
   ・入金は 入金消込チェッカー の見本と同じ型（名前の似た入金・振込手数料の差し引き・登録済みの名義・期日超過）
   ・勤怠は 勤怠集計 の見本と同じ作り方（山田・佐藤・鈴木の3人、16日の休憩不足、18日の深夜、23日の打刻もれ）
   今月の分は、開いた日までに自然な量になるように、月の動き（固定費・外注・給与・カード・請求書）を今日より前の日付に詰めて置く。
   ・月の半分くらい（ここではもとの日×1.5まで）が過ぎた分を入れる。月末の給与と月末の請求書は同じ「月末」の動きとして一緒に入る
     （片方だけ入って利益率や前月比がおかしく見えないように）。22日ごろには1か月分がそろう
   ・家賃・通信など月初の固定費は1日・4日。銀行明細は前回（cut の前日まで）取り込み済み、それより後の分（入金・商工会の会費・カード代金）は
     まだ取り込んでいない（「明細の取り込み」に例として入っている）。 */
(function (root) {
  'use strict';
  var K = root.KL || (typeof require === 'function' ? require('./logic.js') : null);

  var COMPANY = {
    name: 'サンプル商事（架空）', reg: 'T1234567890123', addr: '〒000-0000 架空県サンプル市見本町1-2-3', tel: '000-0000-0000',
    bank: '架空銀行 見本支店 普通 0000000 サンプルショウジ', note: '恐れ入りますが、振込手数料はご負担ください。（これは見本です）',
    taxin: 'ex', round: 'floor', due: 'eom1', hon: '御中', prefix: 'INV-', feeMax: 990,
    kday: '8:00', kweek: '40:00', kws: 0, khol: 0, kbrk: 'law', kot: 45, kextra: ''
  };
  // KichoAuto で「手で直したら自動で足される行」と同じ形（上の行が優先）
  var LEARNED = ['キュウヨ = 給料賃金', 'ヤチン = 地代家賃', 'カクウライターズ = 外注工賃'];
  var NAMEMAP = '# 振込名義 = 取引先名（入金の照合で手で選ぶと、ここに足されます）\nﾓﾂｸ ﾃﾞｻﾞｲﾝ = MOCK Design LLC\n';

  function rulesText() {
    var lines = K.DEFAULT_RULES.split('\n'), at = lines.findIndex(function (l) { return l.trim() && l.trim().charAt(0) !== '#'; });
    if (at < 0) at = lines.length;
    Array.prototype.splice.apply(lines, [at, 0].concat(LEARNED));
    return lines.join('\n');
  }

  // 取引先（毎月の請求）。day: 'eom'＝月末に請求、数字＝その日。pay: 翌月の入金日・振込名義・差し引かれる手数料
  // 数量が関数の行は月で変わる（記事の本数：その月の m から 17〜23本）
  var CLIENTS = [
    { p: '株式会社デモ企画', items: [['Webサイト保守 {m}月分', 1, '式', 150000, 10], ['サーバー管理費', 1, '式', 5000, 10]], day: 'eom', pay: { day: 25, desc: 'ﾌﾘｺﾐ ｶ)ﾃﾞﾓｷｶｸ' } },
    { p: 'MOCK Design LLC', items: [['デザイン制作 {m}月分', 1, '式', 400000, 10]], day: 'eom', pay: { day: 28, desc: 'ﾌﾘｺﾐ ﾓﾂｸ ﾃﾞｻﾞｲﾝ' } },
    { p: '有限会社テスト文具', items: [['事務代行 {m}月分', 1, '式', 250000, 10], ['打ち合わせ用 茶菓子', 2, '箱', 1500, 8]], day: 'eom', pay: { day: 20, desc: 'ﾌﾘｺﾐ ﾕ)ﾃｽﾄﾌﾞﾝｸﾞ', fee: 440 } },
    { p: '合同会社エグザンプル', items: [['記事執筆 {m}月分', function (m) { return 17 + (m * 5) % 7; }, '本', 8000, 10]], day: 20, pay: { day: 10, desc: 'ﾌﾘｺﾐ ﾄﾞ)ｴｸﾞｻﾞﾝﾌﾟﾙ' } },
    { p: '株式会社ミホン工房', items: [['記帳代行 {m}月分', 1, '式', 80000, 10], ['給与計算', 3, '名', 10000, 10]], day: 15, pay: { day: 15, desc: 'ﾌﾘｺﾐ ｶ)ﾐﾎﾝｺｳﾎﾞｳ' } }
  ];

  // カード明細（KichoAuto の見本と同じお店。j＝通しの月で、金額を少しずつ変える）
  function cardFor(first, j) {
    var o = K.ymd(first), last = K.ymd(K.eomonth(first, 0)).d;
    var L = [[1, 'ＮＴＴドコモ　ご利用料金', 8800], [3, 'AMAZON.CO.JP', 1980 + (j * 730) % 4000], [5, 'OPENAI *CHATGPT SUBSCR', 3000], [8, 'アスクル', 3520 + (j % 3) * 880],
      [10, 'モバイルＳｕｉｃａ', 3000 + (j % 2) * 2000], [12, 'スターバックス　コーヒー', 650 * (1 + j % 3)], [14, 'ADOBE *CREATIVE CLD', 7780], [15, 'Kindle Unlimited', 980],
      [17, 'ヤマト運輸', 1260], [18, 'エックスサーバー', 1100], [22, '東京電力エナジーパートナー', 5800 + (j % 4) * 700], [24, '日本経済新聞　電子版', 4277]];
    return L.filter(function (x) { return x[0] <= last; }).map(function (x) { return { date: K.mkD(o.y, o.m, x[0]), name: x[1], amt: x[2] }; });
  }

  // 勤怠集計の見本と同じ作り方（その月の1日〜末日）。upto より前の日だけ返す
  function kintaiRows(y, m, upto) {
    var rows = [], ppl = [['101', '山田 太郎', [540, 1080], 60], ['102', '佐藤 花子', [540, 1230], 60], ['103', '鈴木 一郎', [780, 1380], 60]];
    var hh = function (x) { return K.pad(Math.floor(x / 60)) + ':' + K.pad(x % 60); };
    var last = K.ymd(K.eomonth(K.mkD(y, m, 1), 0)).d;
    for (var day = 1; day <= last; day++) {
      var dn = K.mkD(y, m, day), wd = K.wday(dn);
      if (upto !== undefined && upto !== null && dn >= upto) break;
      ppl.forEach(function (p) {
        var id = p[0], S = p[2][0], E = p[2][1], B = p[3];
        if (id === '102') { if (wd === 0) return; if (wd === 6 && day % 2) return; E += ((day * 7) % 5) * 15; }
        else if (id === '101') { if (wd === 0 || wd === 6) return; if (day === 16) { E = 22 * 60; B = 30; } }
        else { if (wd === 1 || wd === 2) return; if (day === 18) E = 26 * 60; }
        if (id === '101' && day === 23) { rows.push({ no: id, name: p[1], date: K.iso(dn), s: K.hm(S), e: '', brk: String(B) }); return; }
        rows.push({ no: id, name: p[1], date: K.iso(dn), s: hh(S), e: K.pad(Math.floor(E / 60) % 24) + ':' + K.pad(E % 60), brk: String(B) });
      });
    }
    return rows;
  }
  // 勤怠集計の見本CSV（ツールと同じ文字列。test.js で照合）
  function kintaiCSV(y, m) {
    return ['社員番号,氏名,日付,出勤,退勤,休憩'].concat(kintaiRows(y, m).map(function (r) { return [r.no, r.name, r.date.replace(/-/g, '/'), r.s, r.e, r.brk].join(','); })).join('\n');
  }

  function sample(today) {
    var M0 = K.firstOfMonth(today), rules = rulesText(), R = K.parseRules(rules);
    // ---- 今月の詰め方：もとの日 d の動きを、n 日目までに詰めた日にする。V 日目より後の動きはまだ（null）
    var oT = K.ymd(today), td = oT.d, lastT = K.ymd(K.eomonth(M0, 0)).d;
    var V = Math.min(lastT, Math.round((td - 1) * 1.5));
    var cut = Math.max(2, Math.min(td - 7, 10)), cutD = K.mkD(oT.y, oT.m, cut); // 銀行明細は cut の前日まで取り込み済み（入金は10日から）
    var squeeze = function (d, n) { return (d <= V && n >= 1) ? K.mkD(oT.y, oT.m, Math.max(1, Math.ceil(d * n / V))) : null; };
    var seq = 1000, uid = function (p) { seq++; return p + seq; };
    var opt = { taxin: COMPANY.taxin, round: COMPANY.round };
    // ---- 請求書（6か月前〜今月の、今日より前に出したもの）
    var invoices = [], spot = null;
    for (var k = -6; k <= 0; k++) {
      var first = K.addMonths(M0, k), o = K.ymd(first), eom = K.eomonth(first, 0);
      CLIENTS.forEach(function (c, ci) {
        var issue = c.day === 'eom' ? eom : K.mkD(o.y, o.m, c.day);
        if (k === 0) issue = squeeze(K.ymd(issue).d, td - 1);
        if (issue === null || issue >= today) return;
        invoices.push({ id: 'i' + o.y + K.pad(o.m) + ci, partner: c.p, hon: '御中', issue: K.iso(issue), due: K.iso(K.dueOf(issue, COMPANY.due)), taxin: opt.taxin, round: opt.round, ci: ci,
          items: c.items.map(function (x) { return { date: K.iso(issue), item: x[0].replace('{m}', o.m), qty: typeof x[1] === 'function' ? x[1](o.m) : x[1], unit: x[2], price: x[3], rate: x[4] }; }), paid: null });
      });
      if (k === -2) { var sd = K.mkD(o.y, o.m, 12); spot = { id: 'i' + o.y + K.pad(o.m) + 's', partner: '山田 花子', hon: '様', issue: K.iso(sd), due: K.iso(K.dueOf(sd, COMPANY.due)), taxin: opt.taxin, round: opt.round, ci: -1, items: [{ date: K.iso(sd), item: '商品写真の撮影', qty: 1, unit: '回', price: 22000, rate: 10 }], paid: null }; invoices.push(spot); }
    }
    invoices.sort(function (a, b) { return K.D(a.issue) - K.D(b.issue) || (a.ci - b.ci); });
    invoices.forEach(function (v, i) { v.no = COMPANY.prefix + String(i + 1).padStart(4, '0'); delete v.ci; });
    var total = function (v) { return K.invCalc(v, { taxin: v.taxin, round: v.round }).total; };

    // ---- 銀行の動き（6か月前〜今月、今日より前）。入金は請求書の翌月の入金日
    var bank = [];
    var push = function (d, name, out, inc, extra) { bank.push(Object.assign({ date: d, name: name, out: out || 0, inc: inc || 0 }, extra || {})); };
    for (var k2 = -6; k2 <= 0; k2++) {
      var f2 = K.addMonths(M0, k2), o2 = K.ymd(f2), j = o2.y * 12 + o2.m, last = K.ymd(K.eomonth(f2, 0)).d;
      var prevCard = cardFor(K.addMonths(f2, -1), j - 1).reduce(function (s, x) { return s + x.amt; }, 0);
      push(K.mkD(o2.y, o2.m, 10), 'ミツイスミトモカード', prevCard);
      // 毎月の支払い [日, 今月を詰めるときの日（給与は月末の請求と同じ月末の動き）, 摘要, 金額]
      [[1, 1, 'ヤチン　' + o2.m + 'ガツブン', 80000], [4, 4, 'NTTﾌｧｲﾅﾝｽ', 5720], [20, 20, 'ﾌﾘｺﾐ ｶ)ｶｸｳﾗｲﾀｰｽﾞ', 88000],
        [25, last, 'キュウヨ　' + o2.m + 'ガツブン', 720000 + (j % 3) * 12000], [25, last, '振込手数料', 660]].forEach(function (x) {
        var d = k2 === 0 ? squeeze(x[1], cut - 1) : K.mkD(o2.y, o2.m, x[0]);
        if (d !== null) push(d, x[2], x[3]);
      });
      if (k2 === 0) push(K.mkD(o2.y, o2.m, 18), 'ショウコウカイ　ネンカイヒ', 12000);
      // 前の月に出した請求書の入金
      invoices.forEach(function (v) {
        var ci = CLIENTS.map(function (c) { return c.p; }).indexOf(v.partner); if (ci < 0) return;
        if (K.monthKey(K.D(v.issue)) !== K.monthKey(K.addMonths(f2, -1))) return;
        var c = CLIENTS[ci], pd = K.mkD(o2.y, o2.m, Math.min(c.pay.day, last));
        push(pd, c.pay.desc, 0, total(v) - (c.pay.fee || 0), { inv: v.id, fee: c.pay.fee || 0 });
      });
    }
    bank = bank.filter(function (b) { return b.date < today; });
    bank.forEach(function (b, i) { b._i = i; });
    bank.sort(function (a, b) { return a.date - b.date || (a.inc ? 0 : 1) - (b.inc ? 0 : 1) || a._i - b._i; });
    var bal = 2400000; bank.forEach(function (b) { bal += b.inc - b.out; b.bal = bal; });

    // ---- 取り込み済みの明細（銀行：cut の前日まで、カード：今日の3日前まで）→ KichoAuto と同じ判定
    var tx = [];
    bank.filter(function (b) { return b.date < cutD; }).forEach(function (b) {
      var e = K.classify({ id: uid('t'), date: K.iso(b.date), name: K.nfkc(b.name).replace(/\s+/g, ' ').trim(), key: K.keyOf(b.name), amt: b.inc || b.out, dir: b.inc ? 'in' : 'out', src: '普通預金', file: '普通預金_入出金明細_' + K.ym(b.date) + '.csv', manual: false }, R);
      if (b.inv) {
        var v = invoices.filter(function (x) { return x.id === b.inv; })[0];
        e.acc = '売掛金'; e.manual = true; e.status = ''; e.inv = [v.id];
        v.paid = { deps: [e.id], how: b.fee ? '名前が似ている・手数料差引' : (v.partner === 'MOCK Design LLC' ? '登録済みの名義' : '名前が似ている'), diff: b.fee, status: b.fee ? '手数料差引' : '入金済み', date: e.date };
        tx.push(e);
        if (b.fee) tx.push({ id: uid('t'), date: e.date, name: '振込手数料（差引）' + v.partner, key: '振込手数料', amt: b.fee, dir: 'out', src: '売掛金', file: '入金の照合', manual: true, acc: '支払手数料', pct: 100, status: '' });
        return;
      }
      tx.push(e);
    });
    for (var k3 = -6; k3 <= 0; k3++) {
      var f3 = K.addMonths(M0, k3), o3 = K.ymd(f3);
      cardFor(f3, o3.y * 12 + o3.m).map(function (x) { return k3 === 0 ? { date: squeeze(K.ymd(x.date).d, td - 3), name: x.name, amt: x.amt } : x; })
        .filter(function (x) { return x.date !== null && x.date < today; }).forEach(function (x) {
        tx.push(K.classify({ id: uid('t'), date: K.iso(x.date), name: K.nfkc(x.name).replace(/\s+/g, ' ').trim(), key: K.keyOf(x.name), amt: x.amt, dir: 'out', src: '未払金', file: 'カード明細_' + K.ym(f3) + '.csv', manual: false }, R));
      });
    }
    tx.forEach(function (e, i) { e._i = i; });
    tx.sort(function (a, b) { return K.D(a.date) - K.D(b.date) || a._i - b._i; });
    tx.forEach(function (e) { delete e._i; });

    // ---- 今月の銀行明細の残り（cut から昨日まで。まだ取り込んでいない CSV）
    var cur = bank.filter(function (b) { return b.date >= cutD; });
    var csv = ['日付,摘要,お引出し,お預入れ,残高'].concat(cur.map(function (b) { return [K.slash(b.date), b.name, b.out || '', b.inc || '', b.bal].join(','); })).join('\n');

    // ---- 勤怠（今月、今日より前）
    var kin = kintaiRows(oT.y, oT.m, today).map(function (r, i) { return Object.assign({ id: 'w' + (i + 1) }, r); });

    var close = {};
    for (var k4 = -6; k4 <= -1; k4++) close[K.ym(K.addMonths(M0, k4))] = { kintai: true, mon: true };

    return {
      v: 1, seq: seq, company: Object.assign({}, COMPANY, { rules: rules, namemap: NAMEMAP }),
      tx: tx, invoices: invoices, kintai: kin, close: close,
      pending: { name: '普通預金_入出金明細_' + K.ym(M0) + '.csv', text: csv },
      log: [
        { t: K.iso(today - 1), msg: '勤怠：' + oT.m + '月の打刻を取り込んだ（3人）' },
        { t: K.iso(Math.max(M0, today - 2)), msg: 'カード明細を取り込み、自動で仕訳した' },
        { t: K.iso(Math.max(M0, Math.min(cutD, today - 1))), msg: '銀行明細（' + oT.m + '/' + (cut - 1) + 'まで）を取り込み、自動で仕訳した' },
        { t: K.iso(M0), msg: '前月の月次まとめを確認した' }
      ]
    };
  }

  var api = { sample: sample, CLIENTS: CLIENTS, COMPANY: COMPANY, NAMEMAP: NAMEMAP, rulesText: rulesText, cardFor: cardFor, kintaiRows: kintaiRows, kintaiCSV: kintaiCSV };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KDATA = api;
})(this);
