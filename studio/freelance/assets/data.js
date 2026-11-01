/* フリーランス・個人事業主スタジオの見本データ（人・取引先・住所・口座・登録番号はすべて架空）。
   日付は開いた日（TODAY）から数えて作るので、月の初めでも終わりでも数字が不自然にならない：
   ・今月の請求は「今月1日より前にならない」日付（月の初めでも今月分が出る）
   ・先月末の請求は今月末が期日、締めなしの取引先は「請求から○日後」で、これから14日の入金期日と期日すぎが必ず出る
   ・期日が今日までに来た請求は、期日の日に入金済み（未来の入金は作らない） */
(function (root) {
  'use strict';
  var K = typeof module !== 'undefined' && module.exports ? require('./logic.js') : root.FRL;

  var CLIENTS = [
    { id: 'c1', name: '株式会社サンプル商事（架空）', hon: '御中', close: 'end', site: 'm1end', n: 30, adj: 'prev', wh: true, memo: 'デザインの報酬（個人への支払いなので源泉徴収あり）' },
    { id: 'c2', name: '見本出版株式会社（架空）', hon: '御中', close: 20, site: 'm1d', n: 10, adj: 'prev', wh: true, memo: '挿絵の報酬' },
    { id: 'c3', name: '株式会社ダミーシステムズ（架空）', hon: '御中', close: 'end', site: 'm1end', n: 30, adj: 'prev', wh: false, memo: '開発の手伝い（時給）' },
    { id: 'c4', name: '合同会社テスト企画（架空）', hon: '御中', close: 'none', site: 'days', n: 30, adj: 'prev', wh: false, memo: '請求から30日以内' },
    { id: 'c5', name: '架空カフェ ミホン（架空）', hon: '様', close: 'none', site: 'days', n: 14, adj: 'prev', wh: false, memo: '請求から14日以内' }
  ];
  var JOBS = [
    { id: 'j1', client: 'c1', name: 'ロゴとブランドガイド', kind: 'fixed', price: 300000, rate: 0, status: '進行中' },
    { id: 'j2', client: 'c1', name: 'Webサイトのバナー（毎月4点）', kind: 'fixed', price: 60000, rate: 0, status: '進行中' },
    { id: 'j3', client: 'c2', name: '書籍の挿絵 12点', kind: 'fixed', price: 180000, rate: 0, status: '見積中' },
    { id: 'j4', client: 'c3', name: '管理画面の改修（時給）', kind: 'hourly', price: 0, rate: 5000, status: '進行中' },
    { id: 'j5', client: 'c4', name: 'LP（紹介ページ）の制作', kind: 'fixed', price: 220000, rate: 0, status: '進行中' },
    { id: 'j6', client: 'c5', name: 'メニュー表のデザイン', kind: 'fixed', price: 45000, rate: 0, status: '完了' }
  ];
  var RULES = [
    { id: 'r1', name: '家賃（仕事部屋）', basis: 'area', part: '6', whole: '24', unit: '畳', pct: '', note: '仕事部屋 6畳' },
    { id: 'r2', name: '光回線', basis: 'time', part: '6', whole: '10', unit: '時間', pct: '', note: '1日に仕事でつなぐ時間' },
    { id: 'r3', name: '電気代', basis: 'manual', part: '', whole: '', unit: '', pct: '30', note: '仕事部屋のエアコンとパソコン' },
    { id: 'r4', name: 'スマホ', basis: 'manual', part: '', whole: '', unit: '', pct: '50', note: '仕事の電話・連絡に使う割合' }
  ];

  function sample(TODAY) {
    var T = TODAY, M1 = K.firstOfMonth(T), PE = M1 - 1, P2E = K.firstOfMonth(PE) - 1;
    var B1 = M1; while (K.offReason(B1)) B1++;                         // 今月の最初の営業日
    var inM = function (k) { return K.iso(Math.max(Math.min(B1, T), T - k)); };   // 今月のうち、今日から k 日前（今月の最初の営業日より前にしない）
    var cl = function (id) { return CLIENTS.filter(function (c) { return c.id === id; })[0]; };
    var docs = [];
    function doc(id, kind, no, c, issue, items, extra) {
      var x = { id: id, kind: kind, no: no, client: c, to: cl(c).name, hon: cl(c).hon, issue: K.iso(issue), due: '', items: items, wh: cl(c).wh, job: '', memo: '', payments: [] };
      if (kind === 'inv') { var r = K.calcDue(issue, cl(c)); x.due = K.iso(r.due); }
      else x.due = K.iso(issue + 30);
      for (var k in extra) x[k] = extra[k];
      // 期日が今日までに来た請求は、期日の日に入金済み
      if (kind === 'inv' && extra && extra.paid && D(x.due) <= T) x.payments = [{ date: x.due, amt: K.invTotals(x, 'floor').net }];
      delete x.paid;
      docs.push(x);
      return x;
    }
    var D = K.D, it = function (d, item, qty, unit, price) { return { date: K.iso(d), item: item, qty: qty, unit: unit, price: price, rate: 10 }; };
    // 2か月前の月末（入金済み）
    doc('i09', 'inv', 'H-0009', 'c1', P2E, [it(P2E, 'Webサイトのバナー制作（4点）', 4, '点', 15000)], { job: 'j2', paid: true });
    doc('i08', 'inv', 'H-0010', 'c3', P2E, [it(P2E, '管理画面の改修 作業時間', 28, '時間', 5000)], { job: 'j4', paid: true });
    // 締めなし・30日後（期日すぎで未入金）
    doc('i05', 'inv', 'H-0011', 'c4', T - 38, [it(T - 38, 'LP 原稿の追加（2ページ）', 2, 'ページ', 15000)], { job: 'j5' });
    // 先月15日 → 20日締め・翌月10日払い
    doc('i06', 'inv', 'H-0012', 'c2', K.dayOf(T, -1, 15), [it(K.dayOf(T, -1, 15), '雑誌の挿絵', 4, '点', 30000)], { paid: true });
    // 先月末 → 今月末が期日
    doc('i01', 'inv', 'H-0013', 'c1', PE, [it(PE, 'Webサイトのバナー制作（4点）', 4, '点', 15000)], { job: 'j2', paid: true });
    doc('i02', 'inv', 'H-0014', 'c3', PE, [it(PE, '管理画面の改修 作業時間', 31.5, '時間', 5000)], { job: 'j4', paid: true });
    // 締めなし（これから14日の入金期日）
    doc('i03', 'inv', 'H-0015', 'c4', T - 27, [it(T - 27, 'LP（紹介ページ）制作 着手金（50%）', 1, '式', 110000)], { job: 'j5' });
    doc('i04', 'inv', 'H-0016', 'c5', T - 5, [it(T - 5, 'メニュー表のデザイン（A4 両面）', 1, '式', 45000)], { job: 'j6' });
    // 今月の請求
    doc('i07', 'inv', 'H-0017', 'c1', D(inM(12)), [it(D(inM(12)), 'ロゴ制作 着手金（50%）', 1, '式', 150000)], { job: 'j1' });
    doc('i10', 'inv', 'H-0018', 'c2', D(inM(3)), [it(D(inM(3)), '雑誌の挿絵', 2, '点', 25000)], {});
    // 見積
    doc('e01', 'est', 'M-0004', 'c2', T - 20, [it(T - 20, '書籍の挿絵（モノクロ）', 12, '点', 15000)], { job: 'j3' });

    var times = [];
    function tm(job, k, h, memo, inMonth) { times.push({ id: 't' + (times.length + 1), job: job, date: inMonth ? inM(k) : K.iso(T - k), hours: h, memo: memo }); }
    // 時給の案件（今月分・まだ請求していない）
    tm('j4', 16, 4, '一覧画面の検索条件', true); tm('j4', 13, 3.5, '検索条件のテスト', true); tm('j4', 9, 5, 'CSV出力の追加', true);
    tm('j4', 6, 2.5, '打ち合わせ・修正', true); tm('j4', 3, 4.5, '権限まわりの修正', true); tm('j4', 1, 3, 'レビューの指摘対応', true);
    // 固定の案件
    tm('j1', 20, 5, 'ヒアリング・方向性の案'); tm('j1', 14, 6.5, 'ラフ3案'); tm('j1', 8, 4, '修正1回目'); tm('j1', 4, 5.5, 'ガイドの作成'); tm('j1', 2, 3, '色と余白の調整');
    tm('j2', 7, 2, 'バナー 2点', true); tm('j2', 2, 2, 'バナー 2点', true);
    tm('j3', 18, 1.5, '見積・資料の読み込み');
    tm('j5', 30, 8, '構成と原稿の整理'); tm('j5', 24, 12, 'デザイン'); tm('j5', 15, 14, 'コーディング'); tm('j5', 10, 9, '修正（3回目まで）'); tm('j5', 5, 5, 'スマホ表示の修正');
    tm('j6', 9, 3, 'デザイン'); tm('j6', 6, 2.5, '修正・入稿データ');

    var exps = [];
    function ex(d, item, acc, amt, rule) { exps.push({ id: 'x' + (exps.length + 1), date: K.iso(d), item: item, acc: acc, amt: amt, rule: rule || '' }); }
    // 先月
    ex(K.firstOfMonth(PE), '家賃', '地代家賃', 98000, 'r1');
    ex(PE - 6, '光回線', '通信費', 5280, 'r2'); ex(PE - 9, '電気代', '水道光熱費', 10450, 'r3'); ex(PE - 3, 'スマホ', '通信費', 4378, 'r4');
    ex(PE - 12, 'デザインソフトの月額', '通信費', 7780); ex(PE - 15, '資料の本', '新聞図書費', 2970);
    // 今月
    ex(M1, '家賃', '地代家賃', 98000, 'r1');
    ex(D(inM(8)), '光回線', '通信費', 5280, 'r2'); ex(D(inM(10)), '電気代', '水道光熱費', 9120, 'r3'); ex(D(inM(4)), 'スマホ', '通信費', 4378, 'r4');
    ex(D(inM(11)), 'デザインソフトの月額', '通信費', 7780); ex(D(inM(7)), '資料の本', '新聞図書費', 3520);
    ex(D(inM(6)), '打ち合わせの喫茶代', '会議費', 1320); ex(D(inM(5)), '打ち合わせの電車代', '旅費交通費', 1180); ex(D(inM(2)), '外付けSSD', '消耗品費', 12800);

    return {
      v: 1,
      me: { name: '見本 ひかり（架空）', trade: 'ひかりデザイン室（架空）', reg: 'T1234567890123', addr: '東京都架空区見本町1-2-3（架空）', tel: '000-0000-0000（架空）', bank: '見本銀行（架空） さくら支店 普通 0000000 ミホン ヒカリ', round: 'floor', goal: 5000, invPrefix: 'H-', estPrefix: 'M-' },
      clients: JSON.parse(JSON.stringify(CLIENTS)), jobs: JSON.parse(JSON.stringify(JOBS)), rules: JSON.parse(JSON.stringify(RULES)),
      docs: docs, times: times, exps: exps, seq: 3000, invSeq: 18, estSeq: 4, draft: null,
      log: [
        { t: K.iso(Math.max(M1, T - 1)), msg: '作業時間：管理画面の改修 3時間（レビューの指摘対応）' },
        { t: inM(3), msg: '請求：見本出版株式会社（架空）雑誌の挿絵 2点' },
        { t: K.iso(T - 5), msg: '請求：架空カフェ ミホン（架空）メニュー表のデザイン' },
        { t: inM(12), msg: '請求：株式会社サンプル商事（架空）ロゴ制作 着手金' },
        { t: K.iso(T - 20), msg: '見積：見本出版株式会社（架空）書籍の挿絵 12点' }
      ]
    };
  }
  var API = { sample: sample, CLIENTS: CLIENTS, JOBS: JOBS, RULES: RULES };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.FRDATA = API;
})(this);
