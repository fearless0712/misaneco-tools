/* 経理・事務スタジオの計算部分（ブラウザ・node 共通）
   計算・判定のルールは、既存のブラウザツールと同じにしてある：
     仕訳の自動判定 … KichoAuto（キーワード = 科目、上の行が優先・事業の割合・未分類／要確認）
     請求書        … 請求書一括作成（InvoiceBatch：1行ごとに金額を四捨五入 → 税率ごとに合計して消費税は1回だけ端数処理）
     入金の照合    … 入金消込チェッカー（NyukinCheck：名前＋金額 → 手数料差引 → まとめて入金 → 金額だけ一致）
     勤怠の集計    … 勤怠集計（KintaiSum：休憩の自動控除・1日8時間／週40時間・深夜22〜5時・法定休日・注意）
     固定費の候補  … MoneyLens（同じお店・ほぼ同じ金額が3か月以上）
     ファイル名    … 電帳リネーム（DenchoNamer：日付_取引先_金額、株式会社→(株)）
     文字コード    … CSV文字化けなおし（CsvFix：UTF-8 か Shift_JIS かを見分ける）
   日付は「1970-01-01 を 0 とする通し番号（日）」で扱い、保存は "2026-10-22" の文字列。時刻は「0時からの分」（540＝9:00）。 */
(function (root) {
  'use strict';
  var WD = ['日', '月', '火', '水', '木', '金', '土'];

  // ---------- 日付 ----------
  function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function D(s) { // "2026-10-22" → 通し番号。空・不正は null
    if (s === null || s === undefined || s === '') return null;
    if (typeof s === 'number') return s;
    var m = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/.exec(String(s).trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null;
    return Date.UTC(y, mo - 1, d) / 86400000;
  }
  function mkD(y, mo, d) { return (mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) ? null : Date.UTC(y, mo - 1, d) / 86400000; }
  function ymd(n) { var t = new Date(n * 86400000); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
  function pad(x) { return (x < 10 ? '0' : '') + x; }
  function iso(n) { if (n === null || n === undefined || n === '') return ''; var o = ymd(n); return o.y + '-' + pad(o.m) + '-' + pad(o.d); }
  function slash(n) { return n === null || n === undefined || n === '' ? '' : iso(n).replace(/-/g, '/'); }
  function jd(n) { if (n === null || n === undefined || n === '') return ''; var o = ymd(n); return o.y + '年' + o.m + '月' + o.d + '日'; }
  function wday(n) { return ((n % 7) + 7 + 4) % 7; } // 0=日
  function md(n) { var o = ymd(n); return o.m + '/' + o.d; }
  function mdw(n) { return md(n) + '(' + WD[wday(n)] + ')'; }
  function monthKey(n) { var o = ymd(n); return o.y * 100 + o.m; }
  function ym(n) { var o = ymd(n); return o.y + '-' + pad(o.m); }               // "2026-10"（ツールと同じ月の書き方）
  function firstOfMonth(n) { var o = ymd(n); return Date.UTC(o.y, o.m - 1, 1) / 86400000; }
  function addMonths(n, k) { var o = ymd(n); return Date.UTC(o.y, o.m - 1 + k, 1) / 86400000; } // k か月後の1日
  function eomonth(n, k) { var o = ymd(n); return Date.UTC(o.y, o.m + k, 0) / 86400000; }        // Excel EOMONTH
  function todayN(now) { var t = now || new Date(); return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 86400000; }

  // ---------- 端数 ----------
  function clean(x) { return Number(Number(x).toPrecision(15)); }
  function round(x, d) { var k = Math.pow(10, d || 0), a = clean(Math.abs(x) * k); return (x < 0 ? -1 : 1) * Math.round(a) / k || 0; }
  function n0(v) { var x = typeof v === 'number' ? v : parseFloat(String(v === undefined || v === null ? '' : v).replace(/[,，\s¥円]/g, '')); return isFinite(x) ? x : 0; }
  function has(v) { return v !== null && v !== undefined && String(v).trim() !== ''; }

  // ---------- 文字・数字・日付の読み取り（ツールと同じ） ----------
  function nfkc(s) { return String(s === null || s === undefined ? '' : s).normalize('NFKC'); }
  // KichoAuto の toNum：カンマ・円記号・(1,000)・▲・△・末尾のマイナスに対応
  function toNum(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = nfkc(v).trim(); if (!s) return null;
    s = s.replace(/[,\s¥$円]/g, '').replace(/^\((.*)\)$/, '-$1').replace(/^▲/, '-').replace(/^△/, '-').replace(/^(.*)-$/, '-$1');
    if (!/^[-+]?\d*\.?\d+$/.test(s)) return null;
    return parseFloat(s);
  }
  // KichoAuto の toDate（2026/10/1・20261001・R8.10.1・令和8年10月1日・10/1/2026）→ 通し番号
  function toDate(v) {
    if (typeof v === 'number' && v > 20000 && v < 80000) return v - 25569;           // Excel のシリアル値
    var s = nfkc(v).trim(), m;
    if ((m = s.match(/^(\d{4})[年.\/\-](\d{1,2})[月.\/\-](\d{1,2})/))) return mkD(+m[1], +m[2], +m[3]);
    if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) return mkD(+m[1], +m[2], +m[3]);
    m = s.match(/^R\s*(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{1,2})/i) || s.match(/^令和\s*(\d{1,2})年(\d{1,2})月(\d{1,2})日/);
    if (m) return mkD(2018 + (+m[1]), +m[2], +m[3]);
    if ((m = s.match(/^(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2,4})/))) { var y = +m[3]; if (y < 100) y += 2000; return +m[1] > 12 ? mkD(y, +m[2], +m[1]) : mkD(y, +m[1], +m[2]); }
    return null;
  }
  // CsvFix の文字コード判定：BOM → UTF-8（厳密）→ だめなら Shift_JIS
  function detectEnc(u8) {
    if (u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF) return { enc: 'utf-8', bom: true, label: 'UTF-8（BOM付き）' };
    if (u8[0] === 0xFF && u8[1] === 0xFE) return { enc: 'utf-16le', bom: true, label: 'UTF-16' };
    if (u8[0] === 0xFE && u8[1] === 0xFF) return { enc: 'utf-16be', bom: true, label: 'UTF-16' };
    try { new TextDecoder('utf-8', { fatal: true }).decode(u8); return { enc: 'utf-8', bom: false, label: 'UTF-8（BOMなし）' }; } catch (e) { /* 次へ */ }
    return { enc: 'shift_jis', bom: false, label: 'Shift_JIS' };
  }
  function decode(u8) { var d = detectEnc(u8), t = new TextDecoder(d.enc).decode(u8); if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1); return { text: t, enc: d }; }
  // CsvFix の CSV 読み取り（"…" の中のカンマ・改行もそのまま。タブ区切りも見分ける）。空の行は落とす
  function parseCSV(t) {
    t = String(t || '').replace(/^\uFEFF/, '');
    var rows = [], row = [], f = '', q = false, i = 0, first = t.split('\n')[0];
    var sep = first.split('\t').length > first.split(',').length ? '\t' : ',';
    for (; i < t.length; i++) {
      var c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
  }

  // ================= 仕訳の自動判定（KichoAuto と同じ） =================
  // 青色申告決算書の経費の並び
  var EXP = ['租税公課', '荷造運賃', '水道光熱費', '旅費交通費', '通信費', '広告宣伝費', '接待交際費', '損害保険料', '修繕費', '消耗品費', '減価償却費', '福利厚生費', '給料賃金', '外注工賃', '利子割引料', '地代家賃', '会議費', '新聞図書費', '支払手数料', '研修費', '車両費', '諸会費', '雑費'];
  // 「売掛金」は入金の照合で使う（請求書の入金を受けたとき）
  var ACCS = ['未分類', '売上高', '雑収入'].concat(EXP, ['事業主貸', '事業主借', '未払金', '普通預金', '現金', '売掛金']);
  var SRCS = [['未払金', 'クレジットカード（未払金）'], ['普通預金', '銀行口座（普通預金）'], ['現金', '現金']];
  var DEFAULT_RULES = "# キーワード = 科目（, 事業の割合%）　上の行が優先されます\n# 例）自宅兼事務所の電気代を30%だけ経費にする → 電力 = 水道光熱費, 30%\n# 仕事と関係ない支払い → コンビニ = 事業主貸\n#\n# --- 銀行からのカード代金の引き落とし（銀行の明細だけで使われます）\nカード = 未払金\n# --- 収入\n利息 = 事業主借\n# --- 広告宣伝費（「google」より上に書きます）\ngoogle ads = 広告宣伝費\ngoogle広告 = 広告宣伝費\nfacebk = 広告宣伝費\nfacebook = 広告宣伝費\n# --- 新聞図書費（「amazon」より上に書きます）\nkindle = 新聞図書費\naudible = 新聞図書費\n紀伊國屋 = 新聞図書費\n丸善 = 新聞図書費\nジュンク堂 = 新聞図書費\n書店 = 新聞図書費\n日経 = 新聞図書費\n新聞 = 新聞図書費\n# --- 通信費（電話・ネット・サーバー・ソフトの利用料）\namazon web services = 通信費\naws = 通信費\ndocomo = 通信費\nドコモ = 通信費\nsoftbank = 通信費\nソフトバンク = 通信費\nkddi = 通信費\n楽天モバイル = 通信費\nahamo = 通信費\npovo = 通信費\nlinemo = 通信費\nntt = 通信費\nxserver = 通信費\nエックスサーバー = 通信費\nさくらインターネット = 通信費\nお名前.com = 通信費\nonamae = 通信費\nconoha = 通信費\nopenai = 通信費\nchatgpt = 通信費\nanthropic = 通信費\nclaude = 通信費\nadobe = 通信費\nmicrosoft = 通信費\ngoogle = 通信費\ncanva = 通信費\nnotion = 通信費\nslack = 通信費\nzoom = 通信費\ndropbox = 通信費\ngithub = 通信費\nfigma = 通信費\nchatwork = 通信費\n切手 = 通信費\n# --- 荷造運賃（「郵便」より上に書きます）\nゆうパック = 荷造運賃\nゆうパケット = 荷造運賃\nヤマト = 荷造運賃\nクロネコ = 荷造運賃\n佐川 = 荷造運賃\n郵便 = 通信費\n# --- 支払手数料\n振込手数料 = 支払手数料\n手数料 = 支払手数料\nstripe = 支払手数料\n# --- 旅費交通費\nsuica = 旅費交通費\npasmo = 旅費交通費\nicoca = 旅費交通費\njr = 旅費交通費\n東京メトロ = 旅費交通費\n都営 = 旅費交通費\n新幹線 = 旅費交通費\nえきねっと = 旅費交通費\neki-net = 旅費交通費\nスマートex = 旅費交通費\nタクシー = 旅費交通費\ntaxi = 旅費交通費\nuber = 旅費交通費\nana = 旅費交通費\njal = 旅費交通費\npeach = 旅費交通費\nnexco = 旅費交通費\n駐車場 = 旅費交通費\nタイムズ = 旅費交通費\nホテル = 旅費交通費\n楽天トラベル = 旅費交通費\nじゃらん = 旅費交通費\n# --- 消耗品費\namazon = 消耗品費\nアマゾン = 消耗品費\nヨドバシ = 消耗品費\nビックカメラ = 消耗品費\nヤマダ電機 = 消耗品費\nケーズデンキ = 消耗品費\nエディオン = 消耗品費\naskul = 消耗品費\nアスクル = 消耗品費\nmonotaro = 消耗品費\nモノタロウ = 消耗品費\nダイソー = 消耗品費\nロフト = 消耗品費\n# --- 水道光熱費\n電力 = 水道光熱費\nでんき = 水道光熱費\n電気 = 水道光熱費\nガス = 水道光熱費\n水道 = 水道光熱費\n# --- 会議費（打ち合わせのカフェ代など）\nスターバックス = 会議費\nstarbucks = 会議費\nドトール = 会議費\nタリーズ = 会議費\nコメダ = 会議費\n# --- 地代家賃・租税公課\n家賃 = 地代家賃\n収入印紙 = 租税公課\n印紙 = 租税公課\n";
  function parseRules(text) {
    var out = [];
    String(text || '').split(/\n/).forEach(function (raw) {
      var l = raw.trim(); if (!l || l.charAt(0) === '#') return;
      var i = l.search(/[=＝]/); if (i < 1) return;
      var k = nfkc(l.slice(0, i)).trim().toLowerCase(), rest = nfkc(l.slice(i + 1)).trim(), pct = 100;
      var m = rest.match(/[,、]\s*(\d{1,3})\s*%?\s*$/);
      if (m) { pct = Math.min(100, Math.max(0, +m[1])); rest = rest.slice(0, m.index).trim(); }
      if (k && rest) out.push({ k: k, acc: rest, pct: pct });
    });
    return out;
  }
  // 同じお店をまとめるための「お店の名前の頭」
  function keyOf(name) {
    var n = nfkc(name).toLowerCase().replace(/^(振込|振替|口座振替|ﾌﾘｺﾐ|フリコミ|デビット|vデビット|カード利用|pos|ic)\s*/, '');
    var segs = n.split(/[0-9]+|[\/\-:*#()（）]+/).map(function (x) { return x.replace(/^(振込|振替)\s*/, '').trim(); }).filter(function (x) { return x.length >= 2; });
    return (segs[0] || n.trim()).slice(0, 20);
  }
  function classify(e, rules) {
    var low = nfkc(e.name).toLowerCase();
    var hit = null;
    for (var i = 0; i < rules.length; i++) { var r = rules[i]; if (low.indexOf(r.k) >= 0 && !(r.acc === '未払金' && e.src === '未払金')) { hit = r; break; } }
    e.pct = 100; e.status = '';
    if (e.dir === 'out') { if (hit) { e.acc = hit.acc; e.pct = hit.pct; } else e.acc = '未分類'; }
    else {
      if (e.src === '未払金') { e.acc = hit ? hit.acc : '未分類'; e.status = '返金'; }
      else if (hit && hit.acc !== '未払金') e.acc = hit.acc;
      else { e.acc = '売上高'; e.status = '入金'; }
    }
    return e;
  }
  function biz(e) { return Math.round(e.amt * e.pct / 100); }
  function isExp(acc) { return EXP.indexOf(acc) >= 0; }
  function state(e) { return e.acc === '未分類' ? '未分類' : ((e.status === '返金' || e.status === '入金') && !e.manual ? '要確認' : ''); }
  // 仕訳の行 [日付, 借方科目, 借方金額, 貸方科目, 貸方金額, 摘要]
  function lines(e) {
    var L = [], d = e.date;
    if (e.dir === 'out') {
      if (e.acc === '事業主貸' || e.pct >= 100 || !isExp(e.acc)) L.push([d, e.acc, e.amt, e.src, e.amt, e.name]);
      else { var b = biz(e); if (b > 0) L.push([d, e.acc, b, e.src, b, e.name]); if (e.amt - b > 0) L.push([d, '事業主貸', e.amt - b, e.src, e.amt - b, e.name + '（家事分）']); }
    } else {
      if (e.src === '未払金') L.push([d, '未払金', e.amt, e.acc, e.amt, e.name]);
      else L.push([d, e.src, e.amt, e.acc, e.amt, e.name]);
    }
    return L;
  }
  // 見出しの行・列の見当（KichoAuto と同じ考え方）
  function detectHeader(aoa) {
    for (var i = 0; i < Math.min(aoa.length, 30); i++) {
      var r = aoa[i];
      if (r.some(function (c) { return toDate(c) !== null; }) && r.some(function (c) { return toNum(c) !== null && toDate(c) === null; })) return i === 0 ? -1 : i - 1;
    }
    return 0;
  }
  function headersOf(aoa, h) {
    var n = Math.max.apply(null, aoa.slice(0, 50).map(function (r) { return r.length; }).concat([0]));
    var r = h < 0 ? [] : (aoa[h] || []), out = [];
    for (var i = 0; i < n; i++) out.push(h < 0 ? '列' + (i + 1) : (String(r[i] || '列' + (i + 1)).trim()));
    return out;
  }
  function guessCols(aoa, h, fileName) {
    var head = headersOf(aoa, h), rows = aoa.slice(h + 1, h + 60);
    var find = function (re) { for (var i = 0; i < head.length; i++) if (re.test(nfkc(head[i]).toLowerCase())) return i; return -1; };
    var isD = function (v) { return toDate(v) !== null; };
    var d = find(/利用日|取引日|日付|年月日|date|posted/);
    if (d < 0) d = head.findIndex(function (_, i) { return rows.filter(function (r) { return isD(r[i]); }).length > rows.length * 0.6; });
    var m = find(/利用店|店名|利用先|内容|摘要|取引内容|お取引内容|description|merchant|payee|details|memo|name/);
    if (m < 0) { var best = -1, bl = 0; head.forEach(function (_, i) { if (i === d) return; var l = rows.reduce(function (s, r) { return s + (toNum(r[i]) === null && !isD(r[i]) ? String(r[i] === undefined ? '' : r[i]).length : 0); }, 0); if (l > bl) { bl = l; best = i; } }); m = best; }
    var a = find(/利用金額|支払金額|お支払金額|ご利用金額|出金|お引出|引出|お支払|金額|amount|debit|withdrawal|charge/);
    if (a < 0) a = head.findIndex(function (_, i) { return i !== d && rows.filter(function (r) { return toNum(r[i]) !== null; }).length > rows.length * 0.6; });
    var a2 = find(/入金|お預入|預入|預り|credit|deposit/); if (a2 === a) a2 = -1;
    var vals = rows.map(function (r) { return toNum(r[a]); }).filter(function (v) { return v !== null; });
    var sign = a2 < 0 && vals.filter(function (v) { return v < 0; }).length > vals.length * 0.5 ? 'neg' : 'pos';
    var bank = a2 >= 0 || head.some(function (x) { return /残高|入金|出金|預入|引出|預り/.test(x); }) || /銀行|bank|口座/i.test(fileName || '');
    return { h: h, d: d, m: m, a: a, a2: a2, sign: sign, src: bank ? '普通預金' : '未払金', head: head };
  }
  // 明細の表 → 仕訳のもと（KichoAuto の build と同じ。入金も含める）
  function readStatement(aoa, fileName, rules, map) {
    var mp = map || guessCols(aoa, detectHeader(aoa), fileName), out = [], skipped = 0;
    aoa.slice(mp.h + 1).forEach(function (r) {
      var d = toDate(r[mp.d]), v = toNum(r[mp.a]), v2 = mp.a2 >= 0 ? toNum(r[mp.a2]) : null, name = nfkc(r[mp.m]).replace(/\s+/g, ' ').trim();
      if (d === null || (v === null && v2 === null) || !name) { skipped++; return; }
      var o; if (mp.a2 >= 0) o = (v || 0) - (v2 || 0); else o = mp.sign === 'pos' ? v : -v;
      if (!o) return;
      out.push(classify({ date: iso(d), name: name, key: keyOf(name), amt: Math.abs(o), dir: o > 0 ? 'out' : 'in', src: mp.src, file: fileName, manual: false }, rules));
    });
    out.forEach(function (e, i) { e._i = i; });
    out.sort(function (a, b) { return D(a.date) - D(b.date) || a._i - b._i; });
    out.forEach(function (e) { delete e._i; });
    return { entries: out, skipped: skipped, map: mp };
  }
  // 科目別・月別の集計（KichoAuto の sumData と同じ。経費は事業分、カードの返金は差し引く）
  function sumData(entries, months) {
    var ms = months || entries.map(function (e) { return ym(D(e.date)); }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();
    var accs = ['売上高'].concat(EXP), M = {};
    accs.forEach(function (a) { M[a] = {}; ms.forEach(function (m) { M[a][m] = 0; }); });
    entries.forEach(function (e) {
      var m = ym(D(e.date)); if (!M['売上高'].hasOwnProperty(m)) return;
      if (e.dir === 'out' && isExp(e.acc)) M[e.acc][m] += biz(e);
      else if (e.dir === 'in' && e.src !== '未払金' && e.acc === '売上高') M['売上高'][m] += e.amt;
      else if (e.dir === 'in' && e.src === '未払金' && isExp(e.acc)) M[e.acc][m] -= e.amt;
    });
    var used = accs.filter(function (a) { return ms.some(function (m) { return M[a][m]; }); });
    return { ms: ms, M: M, used: used };
  }

  // ================= 固定費の候補（MoneyLens と同じ） =================
  function mlKey(s) { return nfkc(s).toLowerCase().replace(/\d+/g, ' ').replace(/[*#.,/\\_\-:;'"()（）]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 28); }
  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function recurring(entries) {
    var spend = entries.filter(function (e) { return e.dir === 'out' && e.amt > 0; });
    if (!spend.length) return [];
    var last = Math.max.apply(null, entries.map(function (e) { return D(e.date); })), groups = {}, subs = [];
    spend.forEach(function (e) { (groups[mlKey(e.name)] = groups[mlKey(e.name)] || []).push(e); });
    Object.keys(groups).forEach(function (k) {
      var g = groups[k].slice().sort(function (a, b) { return D(a.date) - D(b.date); });
      var med = median(g.map(function (t) { return t.amt; }));
      var near = g.filter(function (t) { return Math.abs(t.amt - med) <= Math.max(med * 0.05, 0.5); });
      var ms = {}; near.forEach(function (t) { ms[ym(D(t.date))] = 1; }); var nm = Object.keys(ms).length;
      var cnt = {}; near.forEach(function (t) { cnt[t.amt] = (cnt[t.amt] || 0) + 1; });
      var exact = Object.keys(cnt).some(function (a) { return cnt[a] >= 2; });
      var subCat = /サブスク|ソフト|通信|光熱|保険|運動/.test(g[0].acc || '');
      if (nm >= 3 && near.length / nm <= 1.5 && near.length >= g.length * 0.6 && (exact || subCat || nm >= 4)) {
        var lastD = D(near[near.length - 1].date), stopped = last - lastD > 45;
        subs.push({ name: g[0].name, acc: g[0].acc, amt: med, months: nm, first: D(near[0].date), last: lastD, stopped: stopped, year: stopped ? 0 : med * 12 });
      }
    });
    subs.sort(function (a, b) { return b.year - a.year || b.amt - a.amt; });
    return subs;
  }

  // ================= 請求書（InvoiceBatch と同じ） =================
  var RF = { floor: Math.floor, round: Math.round, ceil: Math.ceil };
  var ROUND_LABEL = { floor: '切り捨て', round: '四捨五入', ceil: '切り上げ' };
  function rateOf(v) { var rate = has(v) ? toNum(String(v).replace(/[%％]/g, '')) : 10; if (rate === null) rate = 10; if (rate > 0 && rate < 1) rate = Math.round(rate * 100); if (rate !== 8 && rate !== 10 && rate !== 0) rate = 10; return rate; }
  // inv.items: [{date,item,qty,unit,price,rate}]、opt: {taxin:'ex'|'in', round:'floor'|'round'|'ceil'}
  function invCalc(inv, opt) {
    opt = opt || {}; var taxin = opt.taxin === 'in', rf = RF[opt.round] || Math.floor, by = {};
    var items = (inv.items || []).filter(function (it) { return has(it.item) && toNum(it.price) !== null; }).map(function (it) {
      var qty = has(it.qty) ? toNum(it.qty) : 1; if (qty === null) qty = 1;
      var price = toNum(it.price), rate = rateOf(it.rate);
      return { date: it.date || '', item: nfkc(it.item).trim(), qty: qty, unit: it.unit || '', price: price, rate: rate, amt: Math.round(qty * price) };
    });
    items.forEach(function (it) { (by[it.rate] = by[it.rate] || { base: 0, tax: 0 }).base += it.amt; });
    Object.keys(by).forEach(function (r) { var rr = +r, o = by[r]; o.tax = rr ? (taxin ? rf(o.base * rr / (100 + rr)) : rf(o.base * rr / 100)) : 0; });
    var total = Object.keys(by).reduce(function (s, r) { var o = by[r]; return s + (taxin ? o.base : o.base + o.tax); }, 0);
    var rates = Object.keys(by).map(Number).sort(function (a, b) { return b - a; });
    return { items: items, by: by, rates: rates, total: total, taxin: taxin, tax: rates.reduce(function (s, r) { return s + by[r].tax; }, 0) };
  }
  // 支払期限：eom0＝当月末、eom1＝翌月末、eom2＝翌々月末、d30＝30日後
  function dueOf(issue, mode) {
    if (issue === null || issue === undefined) return null;
    if (mode === 'd30') return issue + 30;
    var k = mode === 'eom0' ? 0 : (mode === 'eom2' ? 2 : 1);
    return eomonth(issue, k);
  }
  function regNoOk(s) { return /^T\d{13}$/.test(nfkc(s).toUpperCase().replace(/[^T0-9]/g, '')); }
  function regNoClean(s) { return nfkc(s).toUpperCase().replace(/[^T0-9]/g, ''); }
  // 適格請求書の記載事項（国税庁「適格請求書等保存方式の概要」の6項目）を満たしているか
  function invChecks(inv, calc, co) {
    var hasDate = calc.items.length > 0 && calc.items.every(function (it) { return D(it.date) !== null; }) || D(inv.issue) !== null;
    var r8 = calc.rates.indexOf(8) >= 0;
    return [
      { k: '発行する事業者の名前と登録番号', ok: has(co && co.name) && regNoOk(co && co.reg), v: (co && co.name ? co.name : '（名前なし）') + '・' + (co && co.reg ? regNoClean(co.reg) : '（登録番号なし）') },
      { k: '取引の年月日', ok: hasDate, v: calc.items.some(function (it) { return D(it.date) !== null; }) ? '明細ごとの日付' : (D(inv.issue) !== null ? '請求日' : '（なし）') },
      { k: '取引の内容（軽減税率の対象はその旨）', ok: calc.items.length > 0, v: calc.items.length + '行' + (r8 ? '・8%に「※」' : '') },
      { k: '税率ごとに分けた合計額と税率', ok: calc.rates.length > 0, v: calc.rates.map(function (r) { return r + '%対象 ' + Math.round(calc.by[r].base).toLocaleString('ja-JP'); }).join('／') || '（なし）' },
      { k: '税率ごとに分けた消費税額', ok: calc.rates.length > 0, v: calc.rates.map(function (r) { return r + '% ' + calc.by[r].tax.toLocaleString('ja-JP'); }).join('／') || '（なし）' },
      { k: '受け取る事業者の名前', ok: has(inv.partner), v: has(inv.partner) ? inv.partner + ' ' + (inv.hon || '') : '（なし）' }
    ];
  }
  // 電帳リネームの名前の付け方（{日付}_{取引先}_{金額}・株式会社→(株)）
  var SHORT = [[/株式会社/g, '(株)'], [/有限会社/g, '(有)'], [/合同会社/g, '(同)'], [/一般社団法人/g, '(一社)'], [/一般財団法人/g, '(一財)'], [/特定非営利活動法人/g, '(特非)']];
  function cleanName(s) { s = nfkc(s).replace(/[\\/:*?"<>|\r\n\t]/g, '').replace(/\s+/g, '').replace(/[.]+$/, ''); SHORT.forEach(function (x) { s = s.replace(x[0], x[1]); }); return s.slice(0, 40); }
  function fileName(day, company, amount, ext) {
    var o = day === null || day === undefined ? null : ymd(day);
    return (o ? o.y + pad(o.m) + pad(o.d) : '日付不明') + '_' + (cleanName(company) || '取引先不明') + '_' + (amount === null || amount === undefined ? '金額不明' : String(Math.round(amount))) + '.' + (ext || 'pdf');
  }

  // ================= 入金の照合（NyukinCheck と同じ） =================
  var SMALL = { 'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ', 'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ', 'ッ': 'ツ', 'ヮ': 'ワ', 'ヵ': 'カ', 'ヶ': 'ケ' };
  function kanaKey(s) {
    s = nfkc(s).replace(/[ぁ-ゖ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) + 0x60); }).replace(/[ァィゥェォャュョッヮヵヶ]/g, function (c) { return SMALL[c]; }).toUpperCase();
    s = s.replace(/^(振込|振替|フリコミ|フリカエ|入金|電信|テレ|RT|BC)\s*/, '')
      .replace(/カブシキガイシヤ|ユウゲンガイシヤ|ゴウドウガイシヤ|イツパンシヤダンホウジン|株式会社|有限会社|合同会社|\(株\)|（株）|㈱|\(有\)|㈲/g, '')
      .replace(/[(（]?(カ|ユ|ド|シヤ|ザイ|ゴ|イ)[)）]|[(（](カ|ユ|ド)$/g, '')
      .replace(/[\s()（）・.,\-ー－‐/\\「」]/g, '');
    return s;
  }
  function katakanaRuns(s) { return (nfkc(s).match(/[ァ-ヴー]{2,}|[A-Za-z]{3,}/g) || []).map(kanaKey).filter(function (x) { return x.length >= 2; }); }
  function parseNameMap(text) {
    var m = new Map();
    String(text || '').split('\n').forEach(function (l) { var i = l.search(/[=＝]/); if (i < 1 || l.trim().charAt(0) === '#') return; var k = kanaKey(l.slice(0, i)), v = l.slice(i + 1).trim(); if (k && v) m.set(k, v); });
    return m;
  }
  function partnerOf(dep, invs, nameMap) {
    var m = nameMap && nameMap.get(dep.key); if (m) return { p: m, how: '登録済みの名義' };
    var byKana = invs.filter(function (v) { return v.kana && (dep.key === v.kana || dep.key.indexOf(v.kana) >= 0 || v.kana.indexOf(dep.key) >= 0 && dep.key.length >= 4); })[0];
    if (byKana) return { p: byKana.partner, how: '振込名義の列' };
    for (var i = 0; i < invs.length; i++) {
      var v = invs[i], runs = katakanaRuns(v.partner);
      if (runs.some(function (r) { return r.length >= 3 ? dep.key.indexOf(r) >= 0 : dep.key.indexOf(r) === 0; })) return { p: v.partner, how: '名前が似ている' };
    }
    return null;
  }
  function combos(arr, target, max) {
    max = max || 4; var out = [];
    (function rec(i, sum, pick) {
      if (pick.length && sum === target) { out.push(pick.slice()); return; }
      if (pick.length >= max || sum > target) return;
      for (var j = i; j < arr.length; j++) { pick.push(arr[j]); rec(j + 1, sum + arr[j].amount, pick); pick.pop(); if (out.length) return; }
    })(0, 0, []);
    return out[0] || null;
  }
  // invs: [{id,no,partner,amount,date,due,kana}]（date・due は通し番号）、deps: [{id,date,desc,amount}]
  // opt: {feeMax, today, nameMap}。戻り値の invs[].status・deps[].inv などはツールと同じ
  function match(invs0, deps0, opt) {
    opt = opt || {};
    var invs = invs0.map(function (v, i) { return { id: v.id === undefined ? i : v.id, no: v.no || '', partner: v.partner, amount: Math.round(v.amount), date: v.date === undefined ? null : v.date, due: v.due === undefined ? null : v.due, kana: v.kana ? kanaKey(v.kana) : '', dep: [], status: '', note: '', how: '', diff: 0, weak: false, ref: v.ref }; });
    var deps = deps0.map(function (d, i) { return { id: d.id === undefined ? i : d.id, date: d.date, desc: d.desc, key: kanaKey(d.desc), amount: Math.round(d.amount), inv: [], how: '', ref: d.ref }; });
    var feeMax = Math.max(0, n0(opt.feeMax)), nameMap = opt.nameMap || new Map();
    var open = function () { return invs.filter(function (v) { return !v.dep.length; }); };
    var link = function (v, d, how, diff) { v.dep.push(d); d.inv.push(v); d.how = how; v.how = how; v.diff = (v.diff || 0) + (diff || 0); };
    var after = function (v, d) { return v.date === null || d.date >= v.date - 7; };
    var key = function (v) { return v.due !== null ? v.due : (v.date !== null ? v.date : 0); };
    deps.forEach(function (d) { d.pp = partnerOf(d, invs, nameMap); });
    // 1) 取引先が分かって、金額がぴったり
    deps.forEach(function (d) { if (!d.pp || d.inv.length) return; var c = open().filter(function (v) { return v.partner === d.pp.p && v.amount === d.amount && after(v, d); }).sort(function (a, b) { return key(a) - key(b); }); if (c.length) link(c[0], d, d.pp.how, 0); });
    // 2) 取引先が分かって、振込手数料を引いた金額
    deps.forEach(function (d) { if (!d.pp || d.inv.length || !feeMax) return; var c = open().filter(function (v) { return v.partner === d.pp.p && v.amount > d.amount && v.amount - d.amount <= feeMax && after(v, d); }); if (c.length === 1) link(c[0], d, d.pp.how + '・手数料差引', c[0].amount - d.amount); });
    // 3) 取引先が分かって、何枚かをまとめて入金
    deps.forEach(function (d) {
      if (!d.pp || d.inv.length) return;
      var pool = open().filter(function (v) { return v.partner === d.pp.p && after(v, d); }), cb = combos(pool, d.amount), diff = 0;
      if (!cb && feeMax) { for (var f = 1; f <= feeMax && !cb; f++) { cb = combos(pool, d.amount + f); if (cb) diff = f; } }
      if (cb) cb.forEach(function (v, i) { link(v, d, d.pp.how + '・まとめて入金', i === 0 ? diff : 0); });
    });
    // 4) 金額だけ一致（1枚だけのとき）
    deps.forEach(function (d) {
      if (d.inv.length) return;
      var c = open().filter(function (v) { return v.amount === d.amount && after(v, d); });
      if (c.length === 1) { link(c[0], d, '金額だけ一致', 0); c[0].weak = true; } else if (c.length > 1) d.cands = c.map(function (v) { return v.id; });
    });
    var today = opt.today === undefined || opt.today === null ? todayN() : opt.today;
    invs.forEach(function (v) {
      if (v.dep.length) { v.status = v.weak ? '要確認' : (v.diff ? '手数料差引' : '入金済み'); if (v.dep[0].inv.length > 1) v.status = v.diff ? '手数料差引' : '入金済み'; }
      else {
        var part = deps.filter(function (d) { return !d.inv.length && d.pp && d.pp.p === v.partner && d.amount < v.amount; })[0];
        if (part) { v.status = '要確認'; v.note = '一部入金の可能性（' + part.amount.toLocaleString('ja-JP') + '円）'; }
        else v.status = v.due !== null && v.due < today ? '期日超過' : '未入金';
      }
    });
    return { invs: invs, deps: deps };
  }

  // ---------- 請求書ごとの入金の状態 ----------
  // 入金済み・手数料差引＝回収済み。要確認＝入金を当てたが請求額に足りない（一部入金など）→ 残り（請求額−入金額）は未入金のまま数え、
  // 期日を過ぎていれば期日超過にも入れる。入金の照合の表に残し、確定を取り消す・残りの入金を足すことができる。
  function paidDone(v) { return !!(v && v.paid && (v.paid.status === '入金済み' || v.paid.status === '手数料差引')); }
  function paidCheck(v) { return !!(v && v.paid && !paidDone(v)); }
  function invGot(v, total) { // 当てた入金の額
    if (!v.paid) return 0;
    if (paidDone(v)) return total;
    return typeof v.paid.got === 'number' ? v.paid.got : Math.max(0, total - n0(v.paid.diff)); // got がない前の保存データは 差額 から
  }
  function invRemain(v, total) { return Math.max(0, total - invGot(v, total)); }
  function invLate(v, today) { var d = D(v.due); return !paidDone(v) && d !== null && d < today; }
  function openInvoices(invoices, totalOf, today) { // 未入金（要確認の残りを含む）と期日超過
    var rem = function (v) { return invRemain(v, totalOf(v)); };
    var list = invoices.filter(function (v) { return !paidDone(v); });
    var late = list.filter(function (v) { return invLate(v, today); });
    var add = function (a, v) { return a + rem(v); };
    return { list: list, sum: list.reduce(add, 0), late: late, lateSum: late.reduce(add, 0), remain: rem };
  }
  function manualStatus(total, got, feeMax) { // 手で選んだ入金の状態（入金消込チェッカーと同じ：差が手数料の上限までなら手数料差引）
    var diff = Math.max(0, total - got);
    return { diff: diff, status: diff ? (diff <= n0(feeMax) ? '手数料差引' : '要確認') : '入金済み' };
  }
  function applyPaid(inv, deps, how, diff, status) { // 確定：入金の行を売掛金の回収にする（取り消せるように元の値を残す）
    inv.paid = { deps: deps.map(function (e) { return e.id; }), how: how, diff: diff || 0, status: status,
      date: deps.reduce(function (a, e) { return a > e.date ? a : e.date; }, ''), got: deps.reduce(function (a, e) { return a + n0(e.amt); }, 0),
      prev: deps.map(function (e) { return { id: e.id, acc: e.acc, manual: !!e.manual, status: e.status || '', inv: e.inv ? e.inv.slice() : null }; }) };
    deps.forEach(function (e) { e.acc = '売掛金'; e.manual = true; e.status = ''; e.inv = (e.inv || []).concat([inv.id]); });
    return inv.paid;
  }
  function undoPaid(inv, tx) { // 確定の取り消し：入金の行を確定前に戻し、請求書を未入金に戻す
    if (!inv || !inv.paid) return false;
    var prev = {}; (inv.paid.prev || []).forEach(function (p) { prev[p.id] = p; });
    (inv.paid.deps || []).forEach(function (id) {
      var e = tx.filter(function (t) { return t.id === id; })[0]; if (!e) return;
      var p = prev[id];
      var rest = (e.inv || []).filter(function (x) { return x !== inv.id; });
      if (p) { e.acc = p.acc; e.manual = p.manual; e.status = p.status; }
      else if (!rest.length) { e.acc = '売上高'; e.status = '入金'; e.manual = false; } // prev がない前の保存データ：取り込んだときの形（銀行への入金）
      if (rest.length) e.inv = rest; else delete e.inv;
    });
    if (inv.paid.feeTx) for (var i = tx.length - 1; i >= 0; i--) if (tx[i].id === inv.paid.feeTx) tx.splice(i, 1);
    inv.paid = null;
    return true;
  }

  // ================= 勤怠の集計（KintaiSum と同じ） =================
  function toMin(v) {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v === 'number') { if (v >= 0 && v < 2) return Math.round((v % 1) * 1440) + (v >= 1 ? 1440 : 0); if (v > 20000) return Math.round((v % 1) * 1440); return null; }
    var s = nfkc(v).trim(), m = s.match(/(\d{1,2})\s*[:：時]\s*(\d{1,2})/); if (m) return +m[1] * 60 + (+m[2]);
    var n = s.match(/^(\d{3,4})$/); if (n) { var x = ('0000' + n[1]).slice(-4); return +x.slice(0, 2) * 60 + (+x.slice(2)); }
    return null;
  }
  function toBreak(v) {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v === 'number') return v < 1 ? Math.round(v * 1440) : (v <= 8 ? Math.round(v * 60) : Math.round(v));
    var s = nfkc(v).trim(); if (/[:：]/.test(s)) return toMin(s);
    var n = parseFloat(s.replace(/[分m]/gi, '')); if (!isFinite(n)) return null;
    return /時間|h/i.test(s) || n <= 8 && s.indexOf('.') >= 0 ? Math.round(n * 60) : Math.round(n);
  }
  function hm(m) { return m === null || m === undefined ? '' : (m < 0 ? '-' : '') + Math.floor(Math.abs(m) / 60) + ':' + pad(Math.round(Math.abs(m) % 60)); }
  function overlap(a, b, c, d) { return Math.max(0, Math.min(b, d) - Math.max(a, c)); }
  var NIGHT = [[-120, 300], [1320, 1740], [2760, 3180]];   // 深夜 22:00〜5:00（前日・当日・翌日）
  // rows: [{who, date, s, e, brk}]（date は "2026-10-01" か 通し番号、s・e・brk は "9:00"・"60" など）
  // opt: {day:'8:00', week:'40:00', ws:0（週の始まり 0=日）, hol:0（法定休日の曜日、-1=決めない）, brk:'law'|'none', ot:45, extra:'2026/10/12, …'}
  function kintai(rows, opt) {
    opt = opt || {};
    var dayStd = toMin(opt.day === undefined ? '8:00' : opt.day), weekStd = toMin(opt.week === undefined ? '40:00' : opt.week);
    if (dayStd === null) dayStd = 480; if (weekStd === null) weekStd = 2400;
    var ws = +(opt.ws || 0), holDay = opt.hol === undefined ? 0 : +opt.hol, auto = (opt.brk || 'law') === 'law', otLim = (+opt.ot || 45) * 60;
    var extra = {}; nfkc(opt.extra || '').split(/[,、\s]+/).map(toDate).filter(function (x) { return x !== null; }).forEach(function (x) { extra[x] = 1; });
    var recs = [], skipped = [];
    rows.forEach(function (r) {
      var d = typeof r.date === 'number' ? r.date : toDate(r.date), who = nfkc(r.who).trim(); if (d === null || !who) return;
      var S = toMin(r.s), E0 = toMin(r.e); if (S === null && E0 === null) return;
      if (S === null || E0 === null) { skipped.push({ who: who, date: d, id: r.id, msg: who + ' ' + slash(d) + '（' + (S === null ? '出勤' : '退勤') + 'の打刻なし）' }); return; }
      var E = E0; if (E <= S) E += 1440;
      var gross = E - S, given = has(r.brk) ? toBreak(r.brk) : null;
      var brk = given !== null ? given : (auto ? (gross > 480 ? 60 : (gross > 360 ? 45 : 0)) : 0), work = Math.max(0, gross - brk);
      var night = Math.min(work, NIGHT.reduce(function (s, x) { return s + overlap(S, E, x[0], x[1]); }, 0));
      var hol = wday(d) === holDay || !!extra[d], w = [];
      if (given !== null && ((work > 480 && given < 60) || (work > 360 && given < 45))) w.push('休憩が足りない');
      if (work > 720) w.push('実働12時間超');
      recs.push({ id: r.id, who: who, d: d, S: S, E: E, brk: brk, work: work, night: night, hol: hol, otd: hol ? 0 : Math.max(0, work - dayStd), otw: 0, w: w });
    });
    recs.sort(function (a, b) { return a.who.localeCompare(b.who) || a.d - b.d || a.S - b.S; });
    var weekKey = function (d) { return d - ((wday(d) - ws + 7) % 7); };
    var acc = {}, prev = null, streak = 0;
    recs.forEach(function (r) {
      var k = r.who + '|' + weekKey(r.d);
      if (!r.hol) { var reg = Math.min(r.work, dayStd), before = acc[k] || 0; acc[k] = before + reg; if (acc[k] > weekStd) r.otw = Math.min(reg, acc[k] - Math.max(before, weekStd)); }
      if (prev && prev.who === r.who) { var diff = r.d - prev.d; streak = diff === 1 ? streak + 1 : (diff === 0 ? streak : 1); } else streak = 1;
      if (streak >= 7 && r.w.indexOf('7日以上連続出勤') < 0) r.w.push('7日以上連続出勤');
      prev = r;
    });
    var S2 = {}, order = [];
    recs.forEach(function (r) {
      var k = r.who + '|' + ym(r.d), s = S2[k];
      if (!s) { s = S2[k] = { who: r.who, m: ym(r.d), days: {}, work: 0, ot: 0, otw: 0, night: 0, hol: 0, warn: 0 }; order.push(k); }
      s.days[r.d] = 1; s.work += r.work; s.ot += r.otd + r.otw; s.otw += r.otw; s.night += r.night; if (r.hol) s.hol += r.work; s.warn += r.w.length;
    });
    var sums = order.map(function (k) { var s = S2[k]; return { who: s.who, m: s.m, days: Object.keys(s.days).length, work: s.work, ot: s.ot, otw: s.otw, night: s.night, hol: s.hol, warn: s.warn, over: s.ot > otLim }; });
    return { recs: recs, sums: sums, skipped: skipped, otLim: otLim };
  }

  // ---------- 表示 ----------
  function yen(x) { return (x < 0 ? '-' : '') + '¥' + Math.abs(Math.round(x)).toLocaleString('ja-JP'); }
  function num(x, d) { if (x === null || x === undefined || x === '' || isNaN(x)) return ''; return round(x, d || 0).toLocaleString('ja-JP', { maximumFractionDigits: d || 0 }); }
  function pct(x, d) { return x === null || x === undefined || x === '' || !isFinite(x) ? '—' : round(x * 100, d === undefined ? 1 : d).toFixed(d === undefined ? 1 : d) + '%'; }

  var api = {
    WD: WD, D: D, mkD: mkD, iso: iso, slash: slash, jd: jd, ymd: ymd, wday: wday, md: md, mdw: mdw, monthKey: monthKey, ym: ym, firstOfMonth: firstOfMonth, addMonths: addMonths, eomonth: eomonth, todayN: todayN, pad: pad,
    round: round, n0: n0, has: has, nfkc: nfkc, toNum: toNum, toDate: toDate, detectEnc: detectEnc, decode: decode, parseCSV: parseCSV,
    EXP: EXP, ACCS: ACCS, SRCS: SRCS, DEFAULT_RULES: DEFAULT_RULES, parseRules: parseRules, keyOf: keyOf, classify: classify, biz: biz, isExp: isExp, state: state, lines: lines,
    detectHeader: detectHeader, headersOf: headersOf, guessCols: guessCols, readStatement: readStatement, sumData: sumData,
    mlKey: mlKey, median: median, recurring: recurring,
    RF: RF, ROUND_LABEL: ROUND_LABEL, rateOf: rateOf, invCalc: invCalc, dueOf: dueOf, regNoOk: regNoOk, regNoClean: regNoClean, invChecks: invChecks, cleanName: cleanName, fileName: fileName,
    kanaKey: kanaKey, katakanaRuns: katakanaRuns, parseNameMap: parseNameMap, partnerOf: partnerOf, combos: combos, match: match,
    paidDone: paidDone, paidCheck: paidCheck, invGot: invGot, invRemain: invRemain, invLate: invLate, openInvoices: openInvoices, manualStatus: manualStatus, applyPaid: applyPaid, undoPaid: undoPaid,
    toMin: toMin, toBreak: toBreak, hm: hm, NIGHT: NIGHT, kintai: kintai,
    yen: yen, num: num, pct: pct
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KL = api;
})(this);
