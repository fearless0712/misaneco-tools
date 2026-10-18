/* 引越しやることリスト：項目データと条件
   kind:
     'law'   … 法令で日数の期限が決まっているもの（日付は「法定期限」として表示）
     'soft'  … 法令上の義務はあるが日数の定めがない（「あらかじめ」「速やかに」）。日付は目安
     'guide' … 法令上の期限なし。日付は目安
   offset: 引越し日（=転入・転居した日として扱う）からの日数。期間の計算は初日不算入（民法140条）で、
           「14日以内」は 引越し日+14日、「30日を経過する日まで」は 引越し日+30日。 */
(function () {
  'use strict';
  var EGOV = 'https://laws.e-gov.go.jp/law/';
  /* 条文へのリンク位置（e-Gov法令検索の各条のid。2026-10-18に実ページで確認） */
  var ANCHOR = {"342AC0000000081:22": "Mp-Ch_4-At_22", "342AC0000000081:23": "Mp-Ch_4-At_23", "342AC0000000081:24": "Mp-Ch_4-At_24", "342AC0000000081:24_2": "Mp-Ch_4-At_24_2", "342CO0000000292:24_2": "Mp-Ch_4-At_24_2", "425AC0000000027:17": "Mp-Ch_3-At_17", "426CO0000000155:14": "Mp-Ch_3-At_14", "326AC0000000185:12": "Mp-Ch_2-At_12", "326AC0000000185:67": "Mp-Ch_5-At_67", "335AC0000000105:94": "Mp-Ch_6-Se_3-At_94", "337AC0000000145:7": "Mp-At_7", "325AC1000000247:4": "Mp-Ch_2-At_4", "325M50000100052:7": "Mp-At_7", "348AC1000000105:39_5": "Mp-Ch_4_3-At_39_5", "346AC0000000073:7": "Mp-Ch_2-At_7", "346AC0000000073:8": "Mp-Ch_2-At_8", "333M50000100053:2": "Mp-Ch_1-At_2", "333M50000100053:10": "Mp-Ch_1-At_10", "333M50000100053:11": "Mp-Ch_1-At_11", "129AC0000000089:622_2": "Mp-Pa_3-Ch_2-Se_7-Ss_4-At_622_2"};
  function law(id, art, label) { var a = ANCHOR[id + ':' + art]; return { label: label, url: EGOV + id + (a ? '#' + a : '') }; }
  var JUKI = '342AC0000000081', JUKI_REI = '342CO0000000292', BANGO = '425AC0000000027', BANGO_REI = '426CO0000000155',
      SHARYO = '326AC0000000185', DOKO = '335AC0000000105', HOKAN = '337AC0000000145', KYOKEN = '325AC1000000247',
      KYOKEN_KISOKU = '325M50000100052', AIGO = '348AC1000000105', JIDO = '346AC0000000073', KOKUHO_KISOKU = '333M50000100053',
      MINPO = '129AC0000000089';
  var URL = {
    genjo: { label: '国土交通省「原状回復をめぐるトラブルとガイドライン」', url: 'https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk3_000020.html' },
    post: { label: '日本郵便「転居・転送サービス」', url: 'https://www.post.japanpost.jp/service/receive/relocation/' },
    online: { label: 'デジタル庁「引越し手続オンラインサービス」', url: 'https://www.digital.go.jp/policies/moving_onestop_service' },
    myna: { label: 'マイナポータル「引越し関連手続一覧」', url: 'https://myna.go.jp/html/moving_oss_procedure_list.html' },
    nhk: { label: 'NHK受信料の窓口「住所変更などのお手続き」', url: 'https://www.nhk-cs.jp/jushinryo/guide/005/' },
    nhk2: { label: 'NHK受信料の窓口「新生活をはじめられるみなさま」', url: 'https://www.nhk-cs.jp/jushinryo/info/shinseikatsu-tetsuzuki/' },
    npa: { label: '警察庁「日本在住で日本の運転免許証をお持ちの方」', url: 'https://www.npa.go.jp/policies/application/license_renewal/japan.html' },
    jido: { label: 'こども家庭庁「児童手当」', url: 'https://www.cfa.go.jp/policies/kokoseido/jidouteate/' },
    mhlwDog: { label: '厚生労働省「狂犬病」', url: 'https://www.mhlw.go.jp/bunya/kenkou/kekkaku-kansenshou10/' }
  };
  function other(s) { return s.type === 'other'; }
  function same(s) { return s.type === 'same'; }
  function kids(s) { return s.family === 'kids'; }

  var ITEMS = [
    /* ---- 2か月前〜1か月前 ---- */
    { id: 'rent-notice', offset: -60, kind: 'guide', title: '今の賃貸の解約を申し入れる（解約予告）',
      when: function (s) { return s.cur === 'rent'; },
      detail: function () { return '解約予告の期限は契約書で確認してください。1〜2か月前とする契約が多いですが、契約ごとに違います。退去立会いの日程もこのとき相談しておくと安心です。'; } },
    { id: 'own-current', offset: -60, kind: 'guide', title: '今の家（持ち家）をどうするか決める',
      when: function (s) { return s.cur === 'own'; },
      detail: function () { return '売る・貸す・空き家として管理する、のどれにするかで準備が変わります。売却や賃貸に出すなら不動産会社と日程を相談。'; } },
    { id: 'mover', offset: -50, kind: 'guide', title: '引越し業者の見積もり・予約',
      detail: function () { return '複数社の見積もりを比べ、日時と荷物量を確定します。3〜4月は混みやすいので早めに。'; } },
    { id: 'school', offset: -45, kind: 'guide', title: '学校・保育園に転校／転園を伝える',
      when: kids,
      detail: function (s) {
        return other(s)
          ? '今の学校に転校を伝え、必要な書類（在学証明書など）を受け取ります。転入先の学校は新しい市区町村の教育委員会で確認。保育園は新しい市区町村に入園を申し込みます（受付時期は自治体ごとに違います）。'
          : '同じ市区町村内でも学区が変わることがあります。教育委員会で学区を確認し、学校・保育園に伝えます。';
      } },
    { id: 'insurance', offset: -35, kind: 'guide', title: '新居の火災保険を確認する',
      detail: function (s) {
        return s.next === 'rent'
          ? '賃貸では契約時に火災保険（家財）への加入を求められることが多いです。補償内容と開始日を確認。'
          : '新居の火災保険・地震保険の補償内容と開始日を確認。今の家の保険の住所変更・解約も忘れずに。';
      } },
    { id: 'internet', offset: -35, kind: 'guide', title: 'ネット回線の移転・新規申込',
      when: function (s) { return s.uses.net; },
      detail: function () { return '新居で工事が必要な場合、開通まで日数がかかることがあります。今の回線の移転・解約の条件も確認。'; } },
    { id: 'junk', offset: -30, kind: 'guide', title: '不用品の処分・粗大ごみの予約',
      detail: function () { return '粗大ごみは自治体の予約制が多く、収集日が先になることがあります。'; } },

    /* ---- 1か月前〜2週間前 ---- */
    { id: 'nhk', offset: -14, kind: 'guide', title: 'NHKの住所変更',
      when: function (s) { return s.uses.nhk; },
      detail: function () { return '転居の前月から手続きできます（NHK受信料の窓口）。'; },
      basis: function () { return [URL.nhk2, URL.nhk]; } },

    /* ---- 2週間前〜前々日 ---- */
    { id: 'post', offset: -10, kind: 'guide', title: '郵便の転居届（e転居・窓口・ポスト）',
      when: function (s) { return s.uses.post; },
      detail: function () { return '提出から登録まで3〜7営業日かかります。転送期間は届出日から1年間です（日本郵便）。'; },
      basis: function () { return [URL.post]; } },
    { id: 'paper', offset: -10, kind: 'guide', title: '新聞の停止・住所変更を販売店に連絡',
      when: function (s) { return s.uses.paper; },
      detail: function () { return '最終配達日と新居での開始日を伝えます。'; } },
    { id: 'elec', offset: -7, kind: 'guide', title: '電気：今の家の停止と新居の開始を申し込む',
      when: function (s) { return s.uses.elec; },
      detail: function () { return '契約している電力会社に、停止日・開始日と新住所を伝えます。'; } },
    { id: 'gas', offset: -7, kind: 'guide', title: 'ガス：停止と新居の開栓を予約する',
      when: function (s) { return s.uses.gas; },
      detail: function () { return '新居でガスを使い始めるときは、開栓に立会いが必要なことがあります。日時を予約。'; } },
    { id: 'water', offset: -7, kind: 'guide', title: '水道：停止と新居の開始を申し込む',
      when: function (s) { return s.uses.water; },
      detail: function () { return '水道局（市区町村など）に連絡します。'; } },
    { id: 'tenshutsu', offset: -7, kind: 'soft', title: '転出届を出す（今の市区町村）',
      when: other,
      due: '法令上は「あらかじめ」（引越し前）。日数の定めはありません',
      detail: function (s) {
        return s.mynum
          ? 'マイナンバーカードがあれば、マイナポータルの「引越し手続オンラインサービス」で転出届をオンライン提出できます（今の市区町村の窓口に行かずに済みます）。'
          : '今の市区町村の窓口で出し、転出証明書を受け取ります。何日前から受け付けるかは市区町村に確認。';
      },
      basis: function (s) { var b = [law(JUKI, 24, '住民基本台帳法 第24条（転出届）')]; if (s.mynum) b.push(URL.online); return b; } },
    { id: 'inkan-out', offset: -7, kind: 'guide', title: '印鑑登録の扱いを確認（今の市区町村）',
      when: other,
      detail: function () { return '転出すると印鑑登録は廃止される扱いが一般的です（各市区町村の条例による）。必要なら転入先で新たに登録します。'; } },
    { id: 'jido-out', offset: -7, kind: 'guide', title: '児童手当：今の市区町村に転出を届け出る',
      when: function (s) { return kids(s) && other(s); },
      detail: function () { return '届出の名称・持ち物は市区町村で確認（「受給事由消滅届」などの名前で出すことが多い）。'; } },

    /* ---- 前日 ---- */
    { id: 'eve', offset: -1, kind: 'guide', title: '冷蔵庫の電源を切る・洗濯機の水抜き・貴重品の確認',
      detail: function () { return '冷蔵庫は霜取りと水受けの処理を。通帳・印鑑・カード類・重要書類は自分で運びます。'; } },

    /* ---- 当日 ---- */
    { id: 'handover', offset: 0, kind: 'guide', title: '今の家の明け渡し・鍵の返却・退去立会い',
      when: function (s) { return s.cur === 'rent'; },
      detail: function () { return '原状回復は、経年変化や通常の使い方による傷み（通常損耗）は貸主の負担、借主の故意・過失や通常を超える使い方による傷みは借主の負担、というのが国交省ガイドラインの考え方です。立会いで傷の箇所と負担を確認しましょう。'; },
      basis: function () { return [URL.genjo]; } },
    { id: 'newroom', offset: 0, kind: 'guide', title: '新居の傷・汚れを写真で記録する',
      when: function (s) { return s.next === 'rent'; },
      detail: function () { return '入居時の状態を日付つきで残しておくと、退去時の原状回復の話し合いに役立ちます。'; },
      basis: function () { return [URL.genjo]; } },
    { id: 'start-util', offset: 0, kind: 'guide', title: '新居で電気・水道の使用開始、ガス開栓の立会い',
      when: function (s) { return s.uses.elec || s.uses.gas || s.uses.water; },
      detail: function () { return 'ブレーカーを上げ、水道の元栓を確認。ガスは予約した時間に立会い。'; } },

    /* ---- 引越し後14日以内 ---- */
    { id: 'tennyu', offset: 14, kind: 'law', title: '転入届を出す（新しい市区町村）',
      when: other,
      due: '転入した日から14日以内',
      detail: function (s) {
        return s.mynum
          ? 'マイナンバーカードを持参します（転出証明書のかわり）。転出予定日から30日を過ぎるか、転入日から14日を過ぎると、この特例は使えず、マイナンバーカードも失効します。'
          : '転出証明書を持参します。';
      },
      basis: function (s) {
        var b = [law(JUKI, 22, '住民基本台帳法 第22条（転入届）')];
        if (s.mynum) { b.push(law(JUKI, '24_2', '住民基本台帳法 第24条の2（カードがある人の特例）')); b.push(law(JUKI_REI, '24_2', '住民基本台帳法施行令 第24条の2')); b.push(law(BANGO_REI, 14, '番号利用法施行令 第14条（カードの失効）')); }
        return b;
      } },
    { id: 'tenkyo', offset: 14, kind: 'law', title: '転居届を出す（同じ市区町村）',
      when: same,
      due: '転居した日から14日以内',
      detail: function () { return '住んでいる市区町村の窓口で出します。'; },
      basis: function () { return [law(JUKI, 23, '住民基本台帳法 第23条（転居届）')]; } },
    { id: 'mynum', offset: 14, kind: 'law', title: 'マイナンバーカードの住所変更',
      when: function (s) { return s.mynum; },
      due: '変更があった日から14日以内',
      detail: function (s) {
        return (other(s)
          ? '転入届と同時にカードを出して住所を書き換えます。転入届から90日以内にカードを出さないとカードが失効します。'
          : '転居届と同時にカードを出して住所を書き換えます。')
          + '署名用電子証明書は住所が変わると失効するので、必要なら窓口で再発行します。';
      },
      basis: function (s) {
        var b = [law(BANGO, 17, '番号利用法 第17条第8項')];
        if (other(s)) b.push(law(BANGO_REI, 14, '番号利用法施行令 第14条第3号'));
        b.push(URL.myna); return b;
      } },
    { id: 'kokuho', offset: 14, kind: 'law', title: '国民健康保険の手続き（加入している人）',
      due: '14日以内',
      detail: function (s) {
        return other(s)
          ? '別の都道府県からの引越しは、新しい市区町村で加入の届出（規則第2条）。同じ都道府県内の別の市区町村への引越しは、今の市区町村への届出（規則第11条）。いずれも14日以内。会社の健康保険の人は勤務先へ住所変更を届け出ます。'
          : '世帯主の住所変更の届出（規則第10条）。会社の健康保険の人は勤務先へ住所変更を届け出ます。';
      },
      basis: function (s) {
        return other(s)
          ? [law(KOKUHO_KISOKU, 2, '国民健康保険法施行規則 第2条'), law(KOKUHO_KISOKU, 11, '国民健康保険法施行規則 第11条')]
          : [law(KOKUHO_KISOKU, 10, '国民健康保険法施行規則 第10条')];
      } },
    { id: 'license', offset: 14, kind: 'soft', title: '運転免許証の住所変更',
      when: function (s) { return s.license; },
      due: '法令上は「速やかに」。日数の定めはありません',
      detail: function () { return '住所地の警察署・運転免許センターなどで。マイナ免許証だけを持つ人は、警察で利用開始手続をしていれば、市区町村への住所変更で免許の情報も変わります（警察庁）。'; },
      basis: function () { return [law(DOKO, 94, '道路交通法 第94条'), URL.npa]; } },
    { id: 'kids-after', offset: 14, kind: 'guide', title: '子どもの医療費助成・学校・保育園の手続き（新しい住所）',
      when: kids,
      detail: function (s) { return other(s) ? '新しい市区町村で、医療費助成の申請や転入学の手続きをします。必要書類は自治体で確認。' : '医療費助成や保育園の住所変更を届け出ます。'; } },
    { id: 'jido-same', offset: 14, kind: 'guide', title: '児童手当の住所変更の届出',
      when: function (s) { return kids(s) && same(s); },
      detail: function () { return '同じ市区町村内の転居でも届出が必要な場合があります。窓口で確認。'; } },
    { id: 'inkan-in', offset: 14, kind: 'guide', title: '印鑑登録（必要な人）',
      when: other,
      detail: function () { return '新しい市区町村で登録します。登録する印鑑と本人確認書類を持参。'; } },
    { id: 'garage', offset: 7, kind: 'guide', title: '車の保管場所（車庫）証明を新しい住所の警察署で取る',
      when: function (s) { return s.car; },
      detail: function () { return '車検証の住所変更（変更登録）の前に必要になるのが一般的です（地域によって不要な場合あり）。住所は変えずに保管場所だけ変えたときは、変更した日から15日以内に届出が必要です（保管場所法 第7条）。'; },
      basis: function () { return [law(HOKAN, 7, '自動車の保管場所の確保等に関する法律 第7条')]; } },
    { id: 'work', offset: 7, kind: 'guide', title: '勤務先・学校に新しい住所を届け出る',
      detail: function () { return '通勤手当や社会保険の住所変更に関わります。'; } },
    { id: 'misc', offset: 14, kind: 'guide', title: '銀行・クレジットカード・携帯電話・保険の住所変更',
      detail: function () { return '多くはWebやアプリで変更できます。'; } },
    { id: 'newown', offset: 14, kind: 'guide', title: '（持ち家）住宅ローン・火災保険の届出住所を確認',
      when: function (s) { return s.next === 'own'; },
      detail: function () { return '金融機関や保険会社に新住所を届け出ます。'; } },

    /* ---- 引越し後15日〜30日 ---- */
    { id: 'car', offset: 15, kind: 'law', title: '車検証の住所変更（車）',
      when: function (s) { return s.car; },
      due: '住所が変わった日から15日以内',
      detail: function () { return '普通車は運輸支局等で変更登録、軽自動車は軽自動車検査協会で車検証の変更記録。'; },
      basis: function () { return [law(SHARYO, 12, '道路運送車両法 第12条（変更登録）'), law(SHARYO, 67, '道路運送車両法 第67条（検査証の変更記録）')]; } },
    { id: 'bike', offset: 15, kind: 'guide', title: 'バイクの住所変更',
      when: function (s) { return s.bike; },
      detail: function () { return '排気量で手続き先が違います。250cc超（車検あり）は車検証の変更記録で、住所が変わった日から15日以内（道路運送車両法 第67条）。126〜250ccは運輸支局等、125cc以下は市区町村で手続き（期限は手続き先で確認）。'; },
      basis: function () { return [law(SHARYO, 67, '道路運送車両法 第67条')]; } },
    { id: 'jido', offset: 15, kind: 'law', title: '児童手当の認定請求（新しい市区町村）',
      when: function (s) { return kids(s) && other(s); },
      due: '住所を変更した後15日以内',
      detail: function () { return '15日以内に請求すれば、住所を変更した日の属する月の翌月分から支給されます。遅れると、遅れた月の分を受け取れなくなることがあります。'; },
      basis: function () { return [law(JIDO, 8, '児童手当法 第8条第3項'), law(JIDO, 7, '児童手当法 第7条第3項'), URL.jido]; } },
    { id: 'dog', offset: 30, kind: 'law', title: '犬の登録の変更届（所在地の市区町村）',
      when: function (s) { return s.dog; },
      due: '所在地を変更してから30日以内',
      detail: function () { return '新しい市区町村に、鑑札などを持って届け出ます（持ち物は自治体で確認）。マイクロチップを登録している場合は、その変更届も変更から30日を経過する日まで（動物愛護管理法 第39条の5第8項）。'; },
      basis: function () { return [law(KYOKEN, 4, '狂犬病予防法 第4条第4項'), law(KYOKEN_KISOKU, 7, '狂犬病予防法施行規則 第7条'), law(AIGO, '39_5', '動物愛護管理法 第39条の5第8項'), URL.mhlwDog]; } },
    { id: 'deposit', offset: 30, kind: 'guide', title: '敷金の精算を確認する',
      when: function (s) { return s.cur === 'rent'; },
      detail: function () { return '賃貸借が終わって部屋を返したとき、貸主は敷金から未払いの賃料などを差し引いた残りを返すことになっています（民法 第622条の2）。原状回復の費用分担は国交省ガイドラインの考え方が参考になります。'; },
      basis: function () { return [law(MINPO, '622_2', '民法 第622条の2（敷金）'), URL.genjo]; } }
  ];

  var GROUPS = [
    { id: 'g1', label: '2か月前〜1か月前', min: -9999, max: -30 },
    { id: 'g2', label: '1か月前〜2週間前', min: -29, max: -14 },
    { id: 'g3', label: '2週間前〜前々日', min: -13, max: -2 },
    { id: 'g4', label: '前日', min: -1, max: -1 },
    { id: 'g5', label: '当日', min: 0, max: 0 },
    { id: 'g6', label: '引越し後14日以内', min: 1, max: 14 },
    { id: 'g7', label: '引越し後15日〜30日', min: 15, max: 9999 }
  ];

  /* 日付は 'YYYY-MM-DD' 文字列で扱う（UTCで計算し、時差の影響を受けない） */
  function parseYMD(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null; var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCMonth() === +m[2] - 1 ? d : null; }
  function addDays(ymd, n) { var d = parseYMD(ymd); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function weekday(ymd) { return '日月火水木金土'.charAt(parseYMD(ymd).getUTCDay()); }

  function build(s) {
    if (s.type === 'abroad' || !parseYMD(s.date)) return [];
    return ITEMS.filter(function (it) { return !it.when || it.when(s); }).map(function (it) {
      var g = GROUPS.filter(function (g) { return it.offset >= g.min && it.offset <= g.max; })[0];
      return {
        id: it.id, title: it.title, kind: it.kind, offset: it.offset, date: addDays(s.date, it.offset), group: g.id,
        due: it.due || '', detail: it.detail ? it.detail(s) : '', basis: it.basis ? it.basis(s) : []
      };
    }).sort(function (a, b) { return a.offset - b.offset || (a.kind === 'law' ? -1 : 0) - (b.kind === 'law' ? -1 : 0); });
  }

  window.ML = window.ML || {};
  window.ML.data = { ITEMS: ITEMS, GROUPS: GROUPS, build: build, addDays: addDays, weekday: weekday, parseYMD: parseYMD };
})();
