/* 建設スタジオの見本データ（すべて架空）。
   日付は 2026-10-22（木）を基準に書いてあり、開いた日に合わせて「週単位」でずらす（曜日はそのまま）。
   金額・人工の考え方は Excel版（建設/01〜09）の見本に合わせている。 */
(function (root) {
  'use strict';
  var K = root.KL || (typeof require === 'function' ? require('./logic.js') : null);
  var BASE = K.D('2026-10-22');

  function sample(today) {
    var off = Math.floor((today - BASE) / 7) * 7;
    var d = function (s) { return s ? K.iso(K.D(s) + off) : ''; };

    var people = [
      { name: '山田', rate: 20000 }, { name: '佐藤', rate: 22000 }, { name: '鈴木', rate: 20000 },
      { name: '高橋', rate: 21000 }, { name: '田中', rate: 18000 }
    ];
    var sites = [
      { id: 's1', name: '青木様邸 外壁塗装', client: '青木 様', status: '施工中', est: 730000, plan: 500000, estimate: 'e1' },
      { id: 's2', name: '架空ハイツ 給排水改修', client: '架空不動産（株）', status: '施工中', est: 1200000, plan: 900000 },
      { id: 's3', name: '△△町 駐車場土間', client: '架空建設（株）', status: '完了', est: 480000, plan: 350000 },
      { id: 's4', name: '森様邸 分電盤交換', client: '森 様', status: '着工前', est: 260000, plan: 180000 },
      { id: 's5', name: '中村様邸 屋根塗装', client: '中村 様', status: '見積中', est: 635250, plan: 450000 }
    ];
    var L = function (kind, name, qty, unit, price) { return { kind: kind, name: name, qty: qty, unit: unit, price: price, reduced: false }; };
    var estimates = [
      { id: 'e1', no: 'M-2026-0101', date: d('2026-09-28'), days: 30, to: '青木 様', title: '青木様邸 外壁・付帯部 塗装工事', site: 's1',
        rate: 0.05, discount: 7100, round: '切り捨て', lines: [
          L('仮設工事', '足場 架設・解体', 180, 'm2', 850), L('仮設工事', '飛散防止ネット', 180, 'm2', 150),
          L('下地処理', '高圧洗浄', 150, 'm2', 200), L('下地処理', 'クラック補修', 1, '式', 25000),
          L('外壁塗装', '下塗り（シーラー）', 150, 'm2', 700), L('外壁塗装', '中塗り・上塗り（シリコン）', 150, 'm2', 1800),
          L('付帯塗装', '雨樋', 40, 'm', 900), L('付帯塗装', '破風板', 25, 'm', 1200), L('付帯塗装', '軒天', 20, 'm2', 1300)] },
      { id: 'e2', no: 'M-2026-0108', date: d('2026-10-19'), days: 30, to: '中村 様', title: '中村様邸 屋根塗装工事', site: 's5',
        rate: 0.05, discount: 0, round: '切り捨て', lines: [
          L('仮設工事', '足場 架設・解体', 160, 'm2', 850), L('下地処理', '高圧洗浄', 120, 'm2', 200),
          L('屋根塗装', '下塗り', 120, 'm2', 800), L('屋根塗装', '中塗り・上塗り（遮熱）', 120, 'm2', 2400),
          L('付帯塗装', '棟板金', 1, '式', 61000)] }
    ];
    var T = function (id, site, name, who, start, days, state) { return { id: id, site: site, name: name, who: who, start: d(start), days: days, manualEnd: '', state: state }; };
    var tasks = [
      T('t1', 's3', '掘削・型枠', '鈴木', '2026-09-24', 2, '完了'), T('t2', 's3', '土間打設・養生', '鈴木', '2026-09-28', 3, '完了'),
      T('t3', 's1', '足場組立', '協力会社', '2026-10-05', 2, '完了'), T('t4', 's1', '高圧洗浄・養生', '山田', '2026-10-07', 3, '完了'),
      T('t5', 's1', '下塗り・中塗り', '山田', '2026-10-13', 6, '完了'), T('t6', 's1', '上塗り・付帯部', '山田', '2026-10-21', 5, '作業中'),
      T('t7', 's1', '足場解体', '協力会社', '2026-10-28', 1, '未着手'),
      T('t8', 's2', '既設配管撤去', '佐藤', '2026-10-14', 3, '作業中'), T('t9', 's2', '配管・器具取付', '佐藤', '2026-10-19', 8, '作業中'),
      T('t10', 's2', '通水・試験', '佐藤', '2026-10-29', 2, '未着手'),
      T('t11', 's4', '分電盤交換', '高橋', '2026-10-26', 1, '未着手'), T('t12', 's4', '片付け・引渡し', '高橋', '2026-10-27', 1, '未着手')
    ];
    // 日報：人ごとに現場と曜日を決めて並べる（休みの曜日・祝日は除く）
    var reports = [], cal = K.makeCal({ off: '土日' }), rid = 0;
    var plan = [
      { p: '鈴木', site: 's3', from: '2026-09-24', to: '2026-09-30', work: '土間工事' },
      { p: '田中', site: 's3', from: '2026-09-28', to: '2026-09-29', work: '打設の手元' },
      { p: '山田', site: 's1', from: '2026-10-05', to: '2026-10-22', work: '外壁塗装' },
      { p: '田中', site: 's1', from: '2026-10-06', to: '2026-10-22', work: '付帯部・養生', wd: [4] },
      { p: '佐藤', site: 's2', from: '2026-10-14', to: '2026-10-22', work: '配管' },
      { p: '高橋', site: 's2', from: '2026-10-19', to: '2026-10-22', work: '器具取付' }
    ];
    plan.forEach(function (x) {
      for (var n = K.D(x.from); n <= K.D(x.to); n++) {
        if (!K.isWork(n, cal) || (x.wd && x.wd.indexOf(K.wday(n)) < 0)) continue;
        var late = (n + x.p.length) % 5 === 0;
        reports.push({ id: 'r' + (++rid), date: K.iso(n + off), person: x.p, site: x.site, work: x.work, start: '08:00', end: late ? '18:00' : '17:00', brk: 60, manual: '' });
      }
    });
    var C = function (date, site, kind, desc, qty, price) { return { id: 'c' + date + desc, date: d(date), site: site, kind: kind, desc: desc, qty: qty, price: price }; };
    var costs = [
      C('2026-10-05', 's1', '外注', '足場 架設・解体（架空足場）', 1, 120000), C('2026-10-06', 's1', '材料', '塗料一式', 1, 98000),
      C('2026-10-06', 's1', '材料', '養生材', 1, 12000),
      C('2026-10-14', 's2', '材料', '配管材', 1, 320000), C('2026-10-15', 's2', '外注', 'はつり（架空工業）', 1, 180000),
      C('2026-09-24', 's3', '材料', '生コン', 12, 16000), C('2026-09-28', 's3', '外注', 'ポンプ車', 1, 55000),
      C('2026-09-28', 's3', 'その他', '重機回送', 1, 30000)
    ];
    var B = function (id, date, client, site, kind, amount, due, paidDate, paid, deducted) {
      return { id: id, issued: true, date: d(date), client: client, site: site, kind: kind, amount: amount, due: d(due), paidDate: d(paidDate), paid: paid || '', deducted: deducted || '' };
    };
    var bills = [
      B('b1', '2026-05-29', '架空商事（株）', '', '一括', 418000, '2026-06-30', '2026-06-30', 418000),
      B('b2', '2026-06-30', '小林 様', '', '一括', 572000, '2026-07-31', '2026-07-31', 572000),
      B('b3', '2026-07-31', '架空商事（株）', '', '一括', 462000, '2026-08-31', '2026-08-28', 462000),
      B('b4', '2026-08-31', '架空不動産（株）', '', '一括', 682000, '2026-09-30', '2026-09-30', 682000),
      B('b5', '2026-09-20', '架空建設（株）', '', '一括', 330000, '2026-10-10', '2026-10-12', 200000),
      B('b6', '2026-09-30', '架空建設（株）', 's3', '一括', 528000, '2026-10-15', '2026-10-16', 527340, 660),
      B('b7', '2026-10-01', '架空不動産（株）', 's2', '着手金', 396000, '2026-10-10', '2026-10-09', 396000),
      B('b8', '2026-10-01', '青木 様', 's1', '着手金', 240900, '2026-10-20'),
      B('b9', '2026-10-20', '架空不動産（株）', 's2', '中間（出来高）', 528000, '2026-10-31'),
      B('b10', '2026-10-20', '森 様', 's4', '着手金', 143000, '2026-11-20')
    ];
    bills.push({ id: 'b11', issued: false, date: d('2026-11-02'), client: '青木 様', site: 's1', kind: '完成', amount: 562100, due: d('2026-11-30'), paidDate: '', paid: '', deducted: '' });
    var DL = function (kind, item, target, name, expiry, prep) { return { id: 'd' + item + name, kind: kind, item: item, target: target, name: name, expiry: d(expiry), prep: prep }; };
    var deadlines = [
      DL('建設業許可', '建設業許可（塗装工事業・知事許可）', '会社', 'サンプル塗装店', '2027-03-14', 120),
      DL('保険', '労災の上乗せ保険（任意）', '会社', 'サンプル塗装店', '2026-11-10', 30),
      DL('保険', '賠償責任保険', '会社', 'サンプル塗装店', '2027-04-01', 30),
      DL('車検', '車検', '車両', '軽トラ1号', '2026-12-05', 45),
      DL('自賠責保険', '自賠責保険', '車両', '軽トラ1号', '2026-12-05', 45),
      DL('保険', '自動車保険（任意保険）', '車両', 'ワゴン2号', '2026-11-21', 30),
      DL('車検', '車検', '車両', 'ワゴン2号', '2027-06-20', 45),
      DL('資格・免許', '運転免許証', '人', '山田', '2026-10-15', 30),
      DL('その他', '元請の現場入場者教育（受講期限）', '人', '田中', '2026-11-30', 14),
      DL('機械の点検', '高所作業車の定期の検査', '機械', '高所作業車1号', '2027-01-20', 30),
      DL('機械の点検', '発電機の点検（社内の決まり）', '機械', '発電機A', '2026-10-22', 7)
    ];
    var partners = [
      { id: 'p1', name: '架空足場（株）', trade: '足場', close: 20, month: '翌月', pay: 10 },
      { id: 'p2', name: '架空設備工業', trade: '配管', close: 31, month: '翌月', pay: 31 },
      { id: 'p3', name: '架空電工', trade: '電気', close: 15, month: '当月', pay: 31 },
      { id: 'p4', name: '架空塗装', trade: '塗装（応援）', close: 31, month: '翌月', pay: 25 }
    ];
    var O = function (id, date, partner, site, desc, orderAmount, billDate, billAmount, dueOverride, paidDate, paid) {
      return { id: id, date: d(date), partner: partner, site: site, desc: desc, orderAmount: orderAmount, billDate: d(billDate), billAmount: billAmount, dueOverride: d(dueOverride), paidDate: d(paidDate), paid: paid || '' };
    };
    var orders = [
      O('o1', '2026-09-01', 'p1', 's1', '足場 架設・解体', 120000, '2026-09-20', 120000, '', '2026-10-10', 120000),
      O('o2', '2026-09-25', 'p1', '', '足場（××邸 外構）', 80000, '2026-09-25', 88000),
      O('o3', '2026-09-16', 'p2', 's2', '配管工事（応援）', 450000, '2026-09-30', 450000),
      O('o4', '2026-10-01', 'p2', 's2', '追加の配管', 120000, '2026-10-31', 120000),
      O('o5', '2026-10-05', 'p3', 's4', '配線（応援）', 60000, '2026-10-15', 60000, '', '2026-10-21', 60000),
      O('o6', '2026-08-01', 'p1', 's3', '仮囲い', 50000, '2026-08-18', 50000, '', '2026-09-10', 30000),
      O('o7', '2026-09-05', 'p4', 's1', '塗装の応援 6人工', 180000, '2026-09-30', 180000, '2026-10-30')
    ];
    var paint = {
      mode: 'faces',
      faces: [{ name: '北面', w: '10', h: '6' }, { name: '東面', w: '8', h: '6' }, { name: '南面', w: '10', h: '6' }, { name: '西面', w: '8', h: '6' }],
      perimeter: '', height: '',
      openings: [{ name: '窓', w: '1.6', h: '1.1', count: '8' }, { name: '小窓', w: '0.6', h: '0.9', count: '4' }, { name: '玄関ドア', w: '0.9', h: '2.0', count: '1' }],
      roof: '120',
      coats: [
        { part: 'wall', step: '下塗り', paint: '下塗り材A（例）', rate: '0.12', unit: 'kg', times: '1', loss: '10', can: '15' },
        { part: 'wall', step: '中塗り', paint: '上塗り材B（例）', rate: '0.15', unit: 'kg', times: '1', loss: '10', can: '16' },
        { part: 'wall', step: '上塗り', paint: '上塗り材B（例）', rate: '0.15', unit: 'kg', times: '1', loss: '10', can: '16' },
        { part: 'roof', step: '下塗り', paint: '屋根下塗りC（例）', rate: '0.10', unit: 'kg', times: '1', loss: '10', can: '14' },
        { part: 'roof', step: '中塗り', paint: '屋根上塗りD（例）', rate: '0.14', unit: 'kg', times: '1', loss: '10', can: '14' },
        { part: 'roof', step: '上塗り', paint: '屋根上塗りD（例）', rate: '0.14', unit: 'kg', times: '1', loss: '10', can: '14' }
      ]
    };
    return {
      v: 1,
      company: { name: 'サンプル塗装店（架空）', round: '切り捨て', target: 0.2, limit: 8, off: '土日', holidays: true,
        companyHolidays: ['2026-12-29', '2026-12-30', '2026-12-31', '2027-01-02', '2027-01-03'], yel: 90, red: 30 },
      people: people, sites: sites, estimates: estimates, tasks: tasks, reports: reports, costs: costs, bills: bills,
      deadlines: deadlines, partners: partners, orders: orders, paint: paint,
      log: [{ t: K.iso(today), msg: '見本データ（架空）を読み込みました' }],
      seq: 100
    };
  }

  var api = { sample: sample, BASE: BASE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KDATA = api;
})(this);
