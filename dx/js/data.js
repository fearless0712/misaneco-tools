/* 業務の自動化 診断＆推進プラン — データ
   ・製品・サービスについての事実は、公式ページで確認したものだけを書く（SOURCES に URL と確認日）。
   ・他社サービスの料金・ブランド名は書かない（「既存のクラウドサービス」は種類だけ）。
   ・MisaNeco Works のツールは、体験版ページと site/index.html で確認できる機能・価格だけを書く。
   browser: window.DX_DATA / node: module.exports */
(function (root) {
  'use strict';

  var CHECKED = '2026-10-19';

  /* ---------- 出典（公式ページ） ---------- */
  var SOURCES = [
    { id: 's1', title: 'デスクトップ フローの概要 - Power Automate | Microsoft Learn', source_url: 'https://learn.microsoft.com/ja-jp/power-automate/desktop-flows/introduction', claim: 'Power Automate のデスクトップ フローは、Windows のアプリでパソコン上のくり返し作業（ファイル整理、Webから表への転記など）を自動化できる。', checked: CHECKED },
    { id: 's2', title: 'Microsoft アカウントの基本 - Power Automate | Microsoft Learn', source_url: 'https://learn.microsoft.com/ja-jp/power-automate/desktop-flows/getting-started-msa', claim: 'Microsoft アカウントで Power Automate（デスクトップ）を使う場合は、追加料金なしで利用できる。Web フォームへの入力や、操作の記録もできる。', checked: CHECKED },
    { id: 's3', title: '前提条件と制限 - Power Automate | Microsoft Learn', source_url: 'https://learn.microsoft.com/ja-jp/power-automate/desktop-flows/requirements', claim: '対応OSは Windows 10 / Windows 11（Home・Pro・Enterprise）と Windows Server。ARM プロセッサ搭載のデバイスは対象外。Microsoft アカウントでは、クラウドからの起動（スケジュール実行）はできない。', checked: CHECKED },
    { id: 's4', title: 'Power Automate ライセンスの種類 - Power Platform | Microsoft Learn', source_url: 'https://learn.microsoft.com/ja-jp/power-platform/admin/power-automate-licensing/types', claim: 'Microsoft 365 などのライセンスには Power Automate の機能の限定セットが含まれる。職場または学校アカウントには基本機能（標準コネクタでのクラウドフローの作成・実行）が無料で含まれる。', checked: CHECKED },
    { id: 's5', title: 'Google サービスの割り当て | Apps Script | Google for Developers', source_url: 'https://developers.google.com/apps-script/guides/services/quotas?hl=ja', claim: 'Apps Script は一般ユーザー向けアカウント（gmail.com など）でも使え、1日の割り当て（上限）がある。一般アカウントのメール宛先は1日100件、スクリプトの実行時間は1回6分まで。', checked: CHECKED },
    { id: 's6', title: 'Apps Script overview | Google for Developers', source_url: 'https://developers.google.com/apps-script/overview', claim: 'インストール不要で、ブラウザのエディタで書ける。Gmail・Google カレンダー・ドライブなどを操作でき、スプレッドシートやフォームにメニューを追加できる。', checked: CHECKED },
    { id: 's7', title: 'Excel for the web でマクロを操作する - Microsoft サポート', source_url: 'https://support.microsoft.com/ja-jp/office/excel-for-the-web-%E3%81%A7%E3%83%9E%E3%82%AF%E3%83%AD%E3%82%92%E6%93%8D%E4%BD%9C%E3%81%99%E3%82%8B-98784ad0-898c-43aa-a1da-4f0fb5014343', claim: 'Excel for the web では VBA マクロの作成・実行・編集はできない。マクロはデスクトップ版の Excel で扱う。', checked: CHECKED },
    { id: 's8', title: 'Macの「ショートカット」の概要 - Apple サポート', source_url: 'https://support.apple.com/ja-jp/guide/shortcuts-mac/apdf22b0444c/mac', claim: 'Mac の「ショートカット」で、アプリでの作業を1回のクリックなどで実行でき、さまざまな処理を自動化できる。', checked: CHECKED },
    { id: 's9', title: 'Macで書類のテキストと句読点を置き換える - Apple サポート', source_url: 'https://support.apple.com/ja-jp/guide/mac-help/mh35735/mac', claim: 'Mac の「システム設定」→「キーボード」→「ユーザ辞書」で、短い文字を定型文に置き換える設定ができる。', checked: CHECKED },
    { id: 's10', title: 'Microsoft 日本語 IME - Microsoft サポート', source_url: 'https://support.microsoft.com/ja-jp/windows/microsoft-%E6%97%A5%E6%9C%AC%E8%AA%9E-ime-da40471d-6b91-4042-ae8b-713a96476916', claim: 'Windows の Microsoft IME では、ユーザー辞書ツールや「単語の追加」で単語を登録できる。', checked: CHECKED },
    { id: 's11', title: 'メール、手紙、ラベル、封筒を一括にして差し込み印刷を使用する - Microsoft サポート', source_url: 'https://support.microsoft.com/ja-jp/office/%E5%B7%AE%E3%81%97%E8%BE%BC%E3%81%BF%E5%8D%B0%E5%88%B7%E3%82%92%E4%BD%BF%E7%94%A8%E3%81%97%E3%81%A6%E5%AE%9B%E5%90%8D%E3%83%A9%E3%83%99%E3%83%AB%E3%82%92%E4%BD%9C%E6%88%90%E3%81%97%E3%81%A6%E5%8D%B0%E5%88%B7%E3%81%99%E3%82%8B-f488ed5b-b849-4c11-9cff-932c49474705', claim: 'Word の差し込み印刷で、Excel の一覧（1つのシート）から宛名ラベルや手紙をまとめて作れる（Word for Microsoft 365、Word 2016 以降など）。', checked: CHECKED },
    { id: 's12', title: 'フォームの回答の保存先を選択する - Google ドキュメント エディタ ヘルプ', source_url: 'https://support.google.com/docs/answer/2917686?hl=ja', claim: 'Google フォームの回答は、リンクした Google スプレッドシートに保存でき、回答の概要もフォームで確認できる。', checked: CHECKED },
    { id: 's13', title: '電子取引データの保存方法をご確認ください【令和6年1月以降用】（国税庁リーフレット）', source_url: 'https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/tokusetsu/pdf/0023006-085_01.pdf', claim: '電子取引データは「日付・金額・取引先」で検索できる必要がある。表計算ソフト等で索引簿を作る方法や、規則的なファイル名を付けて特定のフォルダに集める方法でも対応できる。', checked: CHECKED },
    { id: 's14', title: 'MisaNeco Works ツール体験版（ツール一覧・価格・各ツールの体験版ページ）', source_url: '../', claim: 'MisaNeco Works のツールの機能・価格・購入ページは、ツール一覧と各ツールの体験版ページの記載による（買い切り）。', checked: CHECKED }
  ];

  /* ---------- 方法の種類 ----------
     needs: 使える条件（環境）。code: プログラムを書く方法。cost: free / paid / buy */
  var TYPES = {
    sheet:   { label: '表計算の関数・テンプレート', cost: 'free', diff: 1, needs: { sheet: ['excel', 'google', 'both'] }, code: false, src: [] },
    vba:     { label: 'Excelマクロ（VBA）', cost: 'free', diff: 2, needs: { sheet: ['excel', 'both'] }, code: true, src: ['s7'] },
    gas:     { label: 'Google Apps Script', cost: 'free', diff: 2, needs: { sheet: ['google', 'both'] }, code: true, src: ['s5', 's6'] },
    gform:   { label: 'Googleフォーム＋スプレッドシート', cost: 'free', diff: 1, needs: { sheet: ['google', 'both'] }, code: false, src: ['s12'] },
    pad:     { label: 'Power Automate for desktop（Windows）', cost: 'free', diff: 2, needs: { pc: ['win'] }, code: false, src: ['s1', 's2', 's3'] },
    pacloud: { label: 'Power Automate（クラウドフロー・Microsoft 365）', cost: 'free', diff: 2, needs: { m365: ['yes'] }, code: false, src: ['s4'] },
    text:    { label: '定型文・ショートカット（単語登録／Macのショートカット）', cost: 'free', diff: 1, needs: {}, code: false, src: ['s8', 's9', 's10'] },
    merge:   { label: 'Wordの差し込み印刷', cost: 'free', diff: 1, needs: { office: true }, code: false, src: ['s11'] },
    cloud:   { label: '既存のクラウドサービス', cost: 'paid', diff: 1, needs: { paid: true }, code: false, src: [] },
    tool:    { label: 'MisaNeco Works のツール', cost: 'buy', diff: 1, needs: { paid: true }, code: false, src: ['s14'] },
    rule:    { label: '手順をそろえる（ひな形・チェックリスト）', cost: 'free', diff: 1, needs: {}, code: false, fallback: true, src: [] }
  };
  var COST_LABEL = { free: '無料（今ある環境で）', paid: '有料サービスが必要', buy: '買い切り（有料）' };
  var DIFF_LABEL = { 1: 'やさしい', 2: 'ふつう', 3: 'むずかしい' };

  /* ---------- MisaNeco Works のツール（site/index.html と体験版ページで確認） ---------- */
  var PRODUCTS = {
    InvoiceBatch:   { name: '請求書一括作成', page: 'InvoiceBatch.html', price: '¥1,980', booth: 'https://excel-temple.booth.pm/items/9001463', bundles: ['allin'], browsers: 'Chrome・Edge', what: '明細（CSV・Excel）から、取引先ごとの請求書をまとめて作り、1つのPDFに印刷・保存します。登録番号（適格請求書発行事業者）の欄があります。' },
    NyukinCheck:    { name: '入金消込チェッカー', page: 'NyukinCheck.html', price: '¥1,980', booth: 'https://excel-temple.booth.pm/items/9001432', bundles: ['allin'], browsers: 'Chrome・Edge・Safari', what: '請求書の一覧と銀行の入出金明細（CSV・Excel）を照合し、「入金済み」「手数料差引」「要確認」などに分けます。振込名義と取引先の対応を覚えます。' },
    KichoAuto:      { name: 'KichoAuto', page: 'KichoAuto.html', price: '¥1,980', booth: 'https://excel-temple.booth.pm/items/9001234', bundles: ['allin'], browsers: 'Chrome・Edge・Safari', what: 'カード・銀行の明細（CSV・Excel）から、キーワードで勘定科目を振り分けて仕訳帳と科目別の集計を作ります（Excel・CSVで保存）。' },
    KintaiSum:      { name: '勤怠集計', page: 'KintaiSum.html', price: '¥1,980', booth: 'https://excel-temple.booth.pm/items/9001443', bundles: ['allin'], browsers: 'Chrome・Edge・Safari', what: 'タイムカード・勤怠データ（CSV・Excel）から、個人別の実働・時間外・深夜・法定休日の時間を月ごとに集計します。割増賃金の計算はしません。' },
    DenchoNamer:    { name: '電帳リネーム', page: 'DenchoNamer.html', price: '¥1,980', booth: 'https://excel-temple.booth.pm/items/9001366', bundles: ['allin'], browsers: 'Chrome・Edge', what: '請求書・領収書のPDFを「日付_取引先_金額」の名前に付け直したコピーと、索引簿（Excel）をZIPで保存します。文字が選べるPDFは自動で読み取り、スキャン画像は手入力です。' },
    DataClean:      { name: 'DataClean', page: 'DataClean.html', price: '¥1,980', booth: 'https://excel-temple.booth.pm/items/8999860', bundles: ['allin'], browsers: 'Chrome・Edge', what: '名簿の電話番号・郵便番号・日付などの書き方をそろえ、空白や重複した行を整理します。直したセルは色で確認できます。' },
    LabelMaker:     { name: 'LabelMaker', page: 'LabelMaker.html', price: '¥1,480', booth: 'https://excel-temple.booth.pm/items/9000245', bundles: ['allin'], browsers: 'Chrome・Edge', what: '名簿（CSV・Excel）から宛名ラベルを印刷します。A4 12面などの用紙を選び、寸法を調整できます。' },
    DataLens:       { name: 'DataLens', page: 'DataLens.html', price: '¥2,980', booth: 'https://excel-temple.booth.pm/items/8999831', bundles: ['allin'], browsers: 'Chrome・Edge', what: 'CSV・Excelを読み込んで、集計表（ピボット）とグラフ、月ごとの売上や商品のABC分析を作ります。' },
    PDF2Excel:      { name: 'PDF→Excel', page: 'PDF2Excel.html', price: '¥2,480', booth: 'https://excel-temple.booth.pm/items/9000204', bundles: ['allin'], browsers: 'Chrome・Edge', what: '文字が選べるPDF（パソコンで作ったPDF）の表を、Excel・CSVにします。スキャンした画像だけのPDFは変換できません。' },
    DiffCheck:      { name: 'DiffCheck', page: 'DiffCheck.html', price: '¥1,480', booth: 'https://excel-temple.booth.pm/items/9001545', bundles: ['allin'], browsers: 'Chrome・Edge・Safari', what: '2つのCSV・Excelをくらべ、追加・削除・変更された行とセルを色分けして一覧にします。' },
    CustomerLens:   { name: 'CustomerLens', page: 'CustomerLens.html', price: '¥1,980', booth: 'https://excel-temple.booth.pm/items/9001525', bundles: ['allin'], browsers: 'Chrome・Edge・Safari', what: 'ショップやレジの注文データ（CSV・Excel）から、お客さんを「優良」「離れそう」などのグループに分け、リピート・定着率を出します。' },
    SurveyLens:     { name: 'SurveyLens', page: 'SurveyLens.html', price: '¥1,980', booth: 'https://excel-temple.booth.pm/items/9000074', bundles: ['allin'], browsers: 'Chrome・Edge', what: 'フォームなどからダウンロードした回答（CSV・Excel）を、質問ごとの集計・グラフ・クロス集計にします。' },
    PassAudit:      { name: 'PassAudit', page: 'PassAudit.html', price: '¥980', booth: 'https://excel-temple.booth.pm/items/9001499', bundles: ['allin'], browsers: '', what: 'ブラウザやパスワード管理アプリから書き出したCSVで、使い回し・弱いパスワードを見つけ、直す順番を示します。' },
    AccountAudit:   { name: 'アカウント棚卸し', page: 'AccountAudit.html', price: '¥2,480', booth: 'https://excel-temple.booth.pm/items/9001383', bundles: ['allin'], browsers: 'Chrome・Edge・Safari', what: '社員名簿と各サービスのユーザー一覧（CSV・Excel）を照合し、退職した人のアカウントや管理者権限を一覧にします。' },
    FlyerMaker:     { name: '物件資料（マイソク）かんたん作成', page: 'FlyerMaker.html', price: '¥2,980', booth: 'https://excel-temple.booth.pm/items/9005071', bundles: ['re8'], browsers: '', what: 'A4の物件チラシを作り、表示規約の必要な表示事項の記載もれをチェックします。Excelの物件一覧から一括作成もできます。' },
    BaikaiContract: { name: '媒介契約書 かんたん作成', page: 'BaikaiContract.html', price: '¥2,980', booth: 'https://excel-temple.booth.pm/items/9004782', bundles: ['re8'], browsers: '', what: '国交省の標準媒介契約約款に沿って、専属専任・専任・一般の媒介契約書の下書きを作ります（印刷・PDF・Word保存）。' },
    LeaseContract:  { name: '賃貸借契約書 かんたん作成', page: 'LeaseContract.html', price: '¥2,980', booth: 'https://excel-temple.booth.pm/items/9006035', bundles: ['re8'], browsers: '', what: '国交省の賃貸住宅標準契約書（普通借家・定期借家）への記入を補助します（印刷・PDF・Word保存）。' },
    PropertySurvey: { name: '物件調査チェック', page: 'PropertySurvey.html', price: '¥2,980', booth: 'https://excel-temple.booth.pm/items/9004681', bundles: ['re8'], browsers: '', what: '現地・法務局・役所などの調査65項目をチェックし、窓口ごとの「行く前リスト」と調査報告書を作ります。' },
    /* 8点セットにだけ入っている Excel の管理表（BOOTHのセット説明文で確認。単品ページ・体験版はなし） */
    RE8Baikai:      { name: '媒介契約 期限管理表（Excel）', bundleOnly: 're8', needsExcel: true, bundles: ['re8'], what: 'レインズ登録（専任7日・専属専任5日、休業日を除く）・業務報告・有効期間の期限を管理し、媒介報酬の上限も計算します。' },
    RE8Hankyo:      { name: '反響・追客管理表（Excel）', bundleOnly: 're8', needsExcel: true, bundles: ['re8'], what: '反響を1行ずつ記録し、今日連絡する人・連絡もれ・反響元別の成約率を出します。' },
    RE8Koshin:      { name: '賃貸契約 更新・期限管理表（Excel）', bundleOnly: 're8', needsExcel: true, bundles: ['re8'], what: '賃貸契約の更新案内・定期借家の通知期間・火災保険・保証会社の期限を管理します。' }
  };

  var BUNDLES = {
    re8:   { name: '不動産業務ツール 8点セット', price: '¥10,980', note: '単品合計¥21,340 → ¥10,980（買い切り）', booth: 'https://excel-temple.booth.pm/items/9004802', members: ['PropertySurvey', 'RE8Baikai', 'BaikaiContract', 'LeaseContract', 'FlyerMaker', 'RE8Hankyo', 'RE8Koshin'], contents: '物件調査チェック／媒介契約 期限管理表／媒介契約書 かんたん作成／賃貸借契約書 かんたん作成／物件資料（マイソク）かんたん作成／反響・追客管理表／賃貸契約 更新・期限管理表／投資用不動産 収支シミュレーター' },
    allin: { name: '全部入り：オールインワン（20本）', price: '¥9,800', note: '単品合計¥39,100 → ¥9,800（買い切り）', booth: 'https://excel-temple.booth.pm/items/9001507', members: ['FileFlow', 'DataLens', 'DataClean', 'PDF2Excel', 'SurveyLens', 'ListGrab', 'LabelMaker', 'QRBatch', 'CustomerLens', 'DiffCheck', 'KichoAuto', 'DenchoNamer', 'MoneyLens', 'NyukinCheck', 'InvoiceBatch', 'KintaiSum', 'KeyScan', 'MailCheck', 'AccountAudit', 'PassAudit'], contents: '経理（KichoAuto・電帳リネーム・入金消込・請求書一括作成・勤怠集計など）、データ作業（DataLens・DataClean・PDF→Excel・LabelMaker など）、セキュリティ（PassAudit・アカウント棚卸し など）の20本' }
  };

  var INDUSTRIES = [
    { id: 'realestate', label: '不動産' },
    { id: 'office', label: '事務全般（どの業種でも）' },
    { id: 'retail', label: '小売・EC' },
    { id: 'pro', label: '士業・コンサル' },
    { id: 'other', label: 'その他' }
  ];

  /* ---------- 方法のひな形（業務ごとに title / steps を差しかえる） ---------- */
  function T(id) { return id; }

  /* ---------- 業務カタログ ----------
     ind: 'common'（どの業種でも）/ realestate / retail / pro
     ease: 自動化しやすさ（高・中・低）
     m: 方法。rate は削減率の目安（この方法で、今かかっている時間の何割を減らせそうか） */
  var TASKS = [
    /* ===== 事務全般 ===== */
    { id: 'invoice', name: '請求書の作成', ind: ['common'], ease: '高', freq: 'monthly', min: 120,
      kw: ['請求書', '請求', 'インボイス', '請求書作成', '請求書発行', '月末請求', '請求書づくり'],
      m: [
        { id: 'invoice-tool', type: 'tool', product: 'InvoiceBatch', rate: 0.8,
          pros: ['一覧から取引先ごとの請求書をまとめて作れる', 'データはパソコンの外に送信しない'],
          cons: ['買い切りの費用がかかる', '取引先ごとに書式を大きく変えたい場合は合わないことがある'],
          steps: ['体験版のサンプルで、請求書ができるまでを試す', '先月分の請求明細を「取引先・品目・数量・単価」の表にまとめる', '発行者の情報（会社名・登録番号・振込先）を入れて保存する', '明細を入れて請求書を作り、1枚ずつ金額を見比べる', '問題なければ、今月から毎月この手順で作る'] },
        { id: 'invoice-sheet', type: 'sheet', title: '請求書テンプレート＋取引先一覧（関数で転記）', rate: 0.6,
          pros: ['今ある表計算ソフトで始められる', '書式を自由に変えられる'],
          cons: ['取引先が多いと1枚ずつの作業が残る', '関数の設定に少し時間がかかる'],
          steps: ['今使っている請求書を1つ選び、表計算のひな形にする', '取引先名・住所・敬称を別のシートに一覧にする', '取引先を選ぶと住所などが入るように、検索関数（VLOOKUP など）を設定する', '小計・消費税・合計を関数で計算し、手入力の欄を減らす', 'PDFで保存するときのファイル名のルールを決める'] },
        { id: 'invoice-vba', type: 'vba', title: 'Excelマクロで一覧から請求書を連続作成', rate: 0.8,
          pros: ['ボタン1つで全取引先の請求書をPDFにできる', '追加費用なし'],
          cons: ['VBAを書く・直す人が必要', 'Excel for the web ではマクロを実行できない'],
          steps: ['請求明細の一覧シートと、請求書のひな形シートを用意する', 'マクロの記録で「ひな形に1件転記してPDF保存」の操作を記録する', '記録したコードを、一覧の行の数だけくり返すように直す', 'テスト用のフォルダで数件だけ動かし、中身を確かめる'] },
        { id: 'invoice-cloud', type: 'cloud', title: '請求書作成の機能があるクラウドサービス（会計ソフトなど）', rate: 0.7,
          pros: ['送付や入金管理まで続けて扱えるものがある', 'ブラウザやスマホから使えるものが多い'],
          cons: ['月額などの費用がかかることが多い', 'データを外部のサービスに預けることになる'],
          steps: ['今使っている会計ソフトなどに請求書の機能があるか確かめる', '無料で試せる期間があれば、取引先1社分で試す', '費用・データの保存場所・解約方法を確かめてから決める'] },
        { id: 'invoice-rule', type: 'rule', title: '請求書のひな形と締め日の手順をそろえる', rate: 0.25,
          pros: ['道具がなくても今日から始められる'], cons: ['作業そのものはあまり減らない'],
          steps: ['請求書のひな形を1つに決め、古いものは使わない', '締め日から送付までの手順を箇条書きにする', '毎月の請求先の一覧を作り、送ったらチェックする'] }
      ] },

    { id: 'reconcile', name: '入金の確認（消込）', ind: ['common'], ease: '高', freq: 'monthly', min: 90,
      kw: ['入金', '消込', '入金確認', '入金チェック', '通帳', '振込', '未入金', '売掛'],
      m: [
        { id: 'reconcile-tool', type: 'tool', product: 'NyukinCheck', rate: 0.75,
          pros: ['請求書と通帳の明細を自動で突き合わせる', '振込名義と取引先の対応を覚える'],
          cons: ['買い切りの費用がかかる', '請求書の一覧と明細をファイルで用意する必要がある'],
          steps: ['体験版のサンプルで、消込の結果を見てみる', 'ネットバンキングから入出金明細をCSVで保存する', '請求書の一覧（取引先・金額）をCSVかExcelで用意する', '2つを入れて消込し、「要確認」だけを目で確かめる'] },
        { id: 'reconcile-sheet', type: 'sheet', title: '請求一覧と明細を関数で照合', rate: 0.5,
          pros: ['今ある表計算ソフトでできる'], cons: ['振込名義のゆれ（カナ・略称）は手で直す必要がある'],
          steps: ['請求一覧と入金明細を同じブックの別シートに貼る', '金額と振込名義で、検索関数（VLOOKUP や COUNTIF）を使って照合列を作る', '見つからない行に色が付くよう、条件付き書式を設定する', '毎月同じ形で貼れるよう、列の並びを決めておく'] },
        { id: 'reconcile-cloud', type: 'cloud', title: '銀行明細の取り込み機能がある会計ソフトなど', rate: 0.7,
          pros: ['明細の取り込みから仕訳まで続けて扱えるものがある'], cons: ['費用がかかることが多い', '銀行との連携の設定が必要'],
          steps: ['使っている会計ソフトなどに、明細の取り込みや消込の機能があるか確かめる', '1か月分で試し、手作業がどれだけ残るか見る', '費用とデータの扱いを確かめてから決める'] },
        { id: 'reconcile-rule', type: 'rule', title: '入金確認の日と手順を決める', rate: 0.2,
          pros: ['すぐ始められる'], cons: ['照合の手間は残る'],
          steps: ['入金確認の日（例：毎月5日と月末）を決める', '請求一覧に「入金日」の列を作り、確認したら入れる', '期日を過ぎた請求に色を付けて、連絡もれを防ぐ'] }
      ] },

    { id: 'journal', name: '経費の仕訳（明細の入力）', ind: ['common'], ease: '高', freq: 'monthly', min: 120,
      kw: ['仕訳', '経費', '帳簿', '記帳', '勘定科目', 'カード明細', '経理', '会計', '確定申告', '領収書の入力'],
      m: [
        { id: 'journal-tool', type: 'tool', product: 'KichoAuto', rate: 0.7,
          pros: ['カード・銀行の明細をまとめて仕訳帳にできる', '振り分けのキーワードを次回から使える'],
          cons: ['買い切りの費用がかかる', '会計ソフトへの取り込みは、ソフト側の形式に合わせる必要がある'],
          steps: ['体験版のサンプルで、仕訳帳ができるまでを試す', 'カード会社・銀行のサイトから明細をCSVで保存する', 'よく出るお店と勘定科目を「キーワード = 科目」で登録する', '「要確認・未分類」だけを確かめ、Excelで保存する'] },
        { id: 'journal-sheet', type: 'sheet', title: 'キーワード表と関数で勘定科目を自動で入れる', rate: 0.5,
          pros: ['追加費用なし'], cons: ['明細の形がカード会社ごとに違うと、そろえる手間がかかる'],
          steps: ['明細のCSVを表計算に貼る', '「お店の名前に含まれる言葉 → 勘定科目」の対応表を別シートに作る', '摘要に言葉が含まれるかを調べる関数で、科目の列を自動で埋める', '空欄の行だけ手で入れ、対応表に追加していく'] },
        { id: 'journal-cloud', type: 'cloud', title: '明細の自動取り込みがある会計ソフト', rate: 0.75,
          pros: ['口座やカードと連携できるものがある'], cons: ['費用がかかることが多い', '連携の設定と、ルールの見直しが必要'],
          steps: ['使っている会計ソフトなどに明細の取り込み機能があるか確かめる', 'まず1つの口座・カードだけ連携して試す', '自動で付いた科目を1か月分見直す'] },
        { id: 'journal-rule', type: 'rule', title: '仕訳のルール表を作る', rate: 0.2,
          pros: ['迷う時間が減る'], cons: ['入力の手間は残る'],
          steps: ['よく使うお店・支払いと勘定科目の一覧を作る', '事業用の支払いに使うカード・口座を分ける', '月に1回まとめて入力する日を決める'] }
      ] },

    { id: 'attendance', name: '勤怠の集計', ind: ['common'], ease: '高', freq: 'monthly', min: 120,
      kw: ['勤怠', 'タイムカード', '残業', '出勤', '退勤', '労働時間', '給与計算', 'シフト', '勤務時間'],
      m: [
        { id: 'attendance-tool', type: 'tool', product: 'KintaiSum', rate: 0.7,
          pros: ['個人別の実働・時間外・深夜を月ごとに集計', '休憩不足などの注意も出る'],
          cons: ['買い切りの費用がかかる', '割増賃金の計算や、規則に合っているかの判断はしない'],
          steps: ['体験版のサンプルで、個人別の集計を見てみる', 'タイムカードや勤怠アプリから、1か月分をCSV・Excelで書き出す', '所定労働時間と法定休日を設定して集計する', '注意の出た日だけを確かめ、Excelで保存して給与計算に使う'] },
        { id: 'attendance-sheet', type: 'sheet', title: '勤怠表のテンプレート（時間計算の関数）', rate: 0.5,
          pros: ['追加費用なし'], cons: ['深夜・休日の計算式は作るのに手間がかかる', '人数が増えると管理が大変'],
          steps: ['1人1シートか、1行1日の表かを決める', '出勤・退勤・休憩から実働時間を出す式を作る', '所定時間を超えた分を時間外として出す列を作る', '月の合計を集計シートにまとめる'] },
        { id: 'attendance-cloud', type: 'cloud', title: '勤怠管理のクラウドサービス', rate: 0.8,
          pros: ['打刻から集計まで続けてできるものがある'], cons: ['費用がかかることが多い', '従業員への説明と切りかえが必要'],
          steps: ['必要な機能（打刻方法・シフト・給与ソフトとの連携）を書き出す', '無料で試せる期間があれば、数人で試す', '費用とデータの扱いを確かめてから決める'] },
        { id: 'attendance-rule', type: 'rule', title: '打刻と締めのルールをそろえる', rate: 0.2,
          pros: ['集計時の確認が減る'], cons: ['集計の手間は残る'],
          steps: ['打刻もれの直し方と締め日を決めて伝える', '集計の手順をチェックリストにする', '確認する人と期限を決める'] }
      ] },

    { id: 'estimate', name: '見積書の作成', ind: ['common'], ease: '中', freq: 'often', min: 20,
      kw: ['見積', '見積書', '見積もり', 'お見積', '提案書', '単価'],
      m: [
        { id: 'estimate-sheet', type: 'sheet', title: '品目マスタつき見積書テンプレート', rate: 0.5,
          pros: ['品目を選ぶだけで単価が入る', '追加費用なし'], cons: ['品目マスタの手入れが必要'],
          steps: ['よく使う品目と単価を一覧（品目マスタ）にする', '見積書のひな形で、品目を選ぶと単価が入るように検索関数を設定する', '小計・消費税・合計・有効期限を自動で入れる', '見積番号のつけ方を決める'] },
        { id: 'estimate-vba', type: 'vba', title: 'Excelマクロで見積書をPDF保存・台帳に記録', rate: 0.65,
          pros: ['保存と台帳の記録を1回の操作でできる'], cons: ['VBAを書く・直す人が必要'],
          steps: ['見積書のひな形と見積台帳のシートを用意する', 'マクロの記録で「PDFで保存」の操作を記録する', '台帳に見積番号・取引先・金額を書き足す処理を加える', 'テスト用のフォルダで試す'] },
        { id: 'estimate-gas', type: 'gas', title: 'Apps Scriptで見積書をPDFにしてドライブに保存', rate: 0.65,
          pros: ['スプレッドシートにメニューを追加して操作できる'], cons: ['スクリプトを書く・直す人が必要', '1日の上限（割り当て）がある'],
          steps: ['見積書のひな形をスプレッドシートで作る', '拡張機能のメニューからApps Scriptのエディタを開く', '「PDFにしてドライブのフォルダに保存」する処理を書く', 'メニューに登録し、テスト用のフォルダで試す'] },
        { id: 'estimate-cloud', type: 'cloud', title: '見積・請求の機能があるクラウドサービス', rate: 0.6,
          pros: ['見積から請求書へ続けて作れるものがある'], cons: ['費用がかかることが多い'],
          steps: ['見積から請求までの流れで、今の困りごとを書き出す', '無料で試せる期間があれば試す', '費用とデータの扱いを確かめる'] },
        { id: 'estimate-rule', type: 'rule', title: '見積書のひな形と単価表を1つにする', rate: 0.25,
          pros: ['探す時間が減る'], cons: ['入力の手間は残る'],
          steps: ['最新の単価表を1か所に置く', '見積書のひな形を1つに決める', '見積の控えを保存するフォルダとファイル名を決める'] }
      ] },

    { id: 'mail2sheet', name: 'メールの内容を表に転記', ind: ['common'], ease: '中', freq: 'daily', min: 15,
      kw: ['メール', '転記', 'コピペ', 'コピー', '貼り付け', '受信', '注文メール', 'メールから', '一覧に'],
      m: [
        { id: 'mail2sheet-pacloud', type: 'pacloud', title: 'クラウドフローで、届いたメールを表に追記', rate: 0.75,
          pros: ['メールが届いたら自動で動く', 'Outlook と Excel（OneDrive）を使っていれば始めやすい'], cons: ['本文から項目を取り出す設定に手間がかかる', '職場または学校のアカウントが必要'],
          steps: ['転記したいメールの件名・差出人の共通点を書き出す', 'Power Automate で「新しいメールが届いたとき」から始まるフローを作る', 'OneDrive の Excel の表に1行追加するアクションを入れる', 'テスト用のメールで、正しく1行追加されるか確かめる'] },
        { id: 'mail2sheet-gas', type: 'gas', title: 'Apps ScriptでGmailの内容をスプレッドシートに書き出す', rate: 0.75,
          pros: ['個人のGoogleアカウントでも使える'], cons: ['スクリプトを書く・直す人が必要', '1日の上限（割り当て）がある'],
          steps: ['転記したいメールにラベルが付くよう、Gmail のフィルタを作る', 'スプレッドシートからApps Scriptのエディタを開く', 'ラベルの付いたメールの日時・件名・本文の一部を書き出す処理を書く', '時間ごとに動く設定（トリガー）を付けて試す'] },
        { id: 'mail2sheet-pad', type: 'pad', title: 'Power Automate for desktop で転記の操作を記録', rate: 0.6,
          pros: ['Microsoft アカウントなら追加料金なし', '画面の操作を記録して作れる'], cons: ['Windows のアプリなので Mac では使えない', '画面のレイアウトが変わると止まることがある'],
          steps: ['Power Automate for desktop を入れ、Microsoft アカウントでサインインする', '「メールを開いて内容をコピーし、Excelに貼る」1件分の操作を記録する', '記録したフローを、メールの件数だけくり返すように直す', '数件で試し、結果を確かめる'] },
        { id: 'mail2sheet-rule', type: 'rule', title: 'メールの書式をそろえてもらう', rate: 0.3,
          pros: ['転記がしやすくなる'], cons: ['相手の協力が必要'],
          steps: ['よく来るメールの必要な項目を決める', '問い合わせ・注文の受け付け用の書式（ひな形）を作り、案内する', '転記先の表の列を、書式の項目と同じ順にする'] }
      ] },

    { id: 'webform', name: 'Webフォームの問い合わせ管理', ind: ['common'], ease: '高', freq: 'often', min: 15,
      kw: ['問い合わせ', 'お問い合わせ', 'フォーム', '申込', '申し込み', '受付', '予約受付', '問合せ'],
      m: [
        { id: 'webform-gform', type: 'gform', title: 'Googleフォームの回答をスプレッドシートに自動でためる', rate: 0.7,
          pros: ['回答が自動で表にたまる', '追加費用なし'], cons: ['今のWebサイトのフォームから切りかえる手間がある'],
          steps: ['問い合わせで聞く項目を決める', 'Googleフォームを作り、回答の保存先にスプレッドシートを選ぶ', 'スプレッドシートに「対応状況」「担当」の列を足す', 'テストで送ってみて、表に入るか確かめる'] },
        { id: 'webform-pacloud', type: 'pacloud', title: 'クラウドフローで、フォームの通知メールを表に追記', rate: 0.6,
          pros: ['今のフォームのまま使える'], cons: ['通知メールの本文から項目を取り出す設定が必要'],
          steps: ['フォームの通知メールの件名・本文の形を確かめる', 'Power Automate で、通知メールが届いたら Excel の表に1行追加するフローを作る', '「対応状況」の列を手で更新する運用にする'] },
        { id: 'webform-sheet', type: 'sheet', title: '問い合わせ台帳（対応状況・期限の色分け）', rate: 0.35,
          pros: ['対応もれが見えるようになる'], cons: ['転記の手間は残る'],
          steps: ['受付日・名前・内容・担当・対応状況の列で台帳を作る', '未対応で3日たった行に色が付くよう、条件付き書式を設定する', '毎朝、未対応の行だけを見る習慣にする'] },
        { id: 'webform-cloud', type: 'cloud', title: '問い合わせ管理の機能があるクラウドサービス', rate: 0.7,
          pros: ['担当の割り当てや返信の履歴を扱えるものがある'], cons: ['費用がかかることが多い'],
          steps: ['問い合わせの件数と、困っていること（もれ・重複対応など）を書き出す', '無料で試せる期間があれば試す', '費用とデータの扱いを確かめる'] },
        { id: 'webform-rule', type: 'rule', title: '問い合わせの受け付けと対応の流れを決める', rate: 0.2,
          pros: ['対応もれが減る'], cons: ['転記の手間は残る'],
          steps: ['問い合わせの受け付け先（メール・フォーム）を1つにまとめる', '担当と、返信までの目安（例：2営業日以内）を決める', '対応したら印を付ける場所を決める'] }
      ] },

    { id: 'csvagg', name: 'CSVの集計・グラフ作成', ind: ['common'], ease: '高', freq: 'weekly', min: 60,
      kw: ['CSV', 'csv', '集計', 'グラフ', 'ピボット', '売上集計', '月次', 'レポート', '分析', '報告資料'],
      m: [
        { id: 'csvagg-tool', type: 'tool', product: 'DataLens', rate: 0.7,
          pros: ['CSVを入れるだけで集計表とグラフができる', '月ごとの売上やABC分析もできる'], cons: ['買い切りの費用がかかる', '会社ごとの独自の計算は、表計算で足す必要がある'],
          steps: ['体験版のサンプルで、集計とグラフを試す', 'いつも集計しているCSVを1つ選ぶ', '縦・横に並べる項目と集計する数字を選んで集計する', 'Excelで保存し、いつもの報告の形に貼る'] },
        { id: 'csvagg-sheet', type: 'sheet', title: 'ピボットテーブルとグラフのひな形', rate: 0.55,
          pros: ['追加費用なし', '一度作れば、データを貼りかえるだけ'], cons: ['CSVの列が変わると作り直しになる'],
          steps: ['CSVを貼るシートと、集計のシートを分ける', '貼ったデータからピボットテーブルを作る', 'グラフを作り、報告に使う形にそろえる', '次回は「データを貼りかえて更新」だけにする'] },
        { id: 'csvagg-vba', type: 'vba', title: 'Excelマクロで、CSVの読み込みから集計まで', rate: 0.75,
          pros: ['毎回の手順を1回のボタン操作にできる'], cons: ['VBAを書く・直す人が必要'],
          steps: ['毎回やっている手順を順番に書き出す', 'マクロの記録で、その手順を1回記録する', 'ファイル名や行数が変わっても動くように直す', 'バックアップを取ってから試す'] },
        { id: 'csvagg-gas', type: 'gas', title: 'Apps Scriptで、ドライブのCSVをスプレッドシートに集計', rate: 0.7,
          pros: ['決まった時間に自動で動かせる'], cons: ['スクリプトを書く・直す人が必要'],
          steps: ['CSVを置くドライブのフォルダを決める', 'CSVを読み込んで集計シートに書き出す処理を書く', 'グラフは集計シートを元に1回作っておく', 'トリガーで毎週動くようにする'] },
        { id: 'csvagg-rule', type: 'rule', title: '集計の手順書を作る', rate: 0.15,
          pros: ['人が変わっても同じ結果になる'], cons: ['作業そのものはあまり減らない'],
          steps: ['毎回の集計手順を、画面の順に箇条書きにする', '元のCSVと集計結果を保存する場所と名前を決める', '結果の数字を確かめる方法（合計の照合など）を決める'] }
      ] },

    { id: 'pdfname', name: 'PDFの請求書の名前整理（電子帳簿保存）', ind: ['common'], ease: '高', freq: 'monthly', min: 60,
      kw: ['電子帳簿', '電帳法', '電子帳簿保存', 'リネーム', 'ファイル名', 'PDF', '請求書PDF', '領収書', '索引簿', '保存'],
      m: [
        { id: 'pdfname-tool', type: 'tool', product: 'DenchoNamer', rate: 0.75,
          pros: ['PDFから日付・取引先・金額を読み取り、名前を付け直す', '索引簿（Excel）も一緒に作る'], cons: ['買い切りの費用がかかる', 'スキャンした画像は手入力になる'],
          steps: ['体験版のサンプル（請求書3枚）で試す', '1か月分の請求書・領収書のPDFを1つのフォルダに集める', '読み取った日付・取引先・金額を元の書類と見比べる', 'ZIPで保存し、年・月ごとのフォルダに入れる'] },
        { id: 'pdfname-sheet', type: 'sheet', title: '索引簿を表計算で作り、PDFは連番で保存', rate: 0.35,
          pros: ['追加費用なし', '国税庁が示している方法のひとつ'], cons: ['1件ずつの入力が必要'],
          steps: ['連番・日付・金額・取引先・備考の列で索引簿を作る', 'PDFのファイル名を連番にして、決めたフォルダに入れる', '受け取ったら索引簿に1行足す習慣にする'] },
        { id: 'pdfname-pad', type: 'pad', title: 'Power Automate for desktop で、一覧どおりにファイル名を変更', rate: 0.55,
          pros: ['Microsoft アカウントなら追加料金なし'], cons: ['Windows のアプリなので Mac では使えない', 'PDFの中身の読み取りは別に用意する必要がある'],
          steps: ['「今のファイル名 → 新しいファイル名」の一覧をExcelで作る', 'Power Automate for desktop で、一覧を読んでファイル名を変えるフローを作る', 'コピーしたフォルダで試し、元のファイルは残しておく'] },
        { id: 'pdfname-rule', type: 'rule', title: '「日付_金額_取引先」の名前の付け方を決める', rate: 0.2,
          pros: ['今日から始められる'], cons: ['名前を付ける手間は残る'],
          steps: ['ファイル名の順番（例：20261019_11000_取引先名）を決める', '保存するフォルダ（年・月ごと）を決める', '受け取ったその日に名前を付けて保存する'] }
      ] },

    { id: 'dedupe', name: '名簿の重複・表記ゆれ整理', ind: ['common'], ease: '高', freq: 'monthly', min: 60,
      kw: ['名簿', '重複', '表記ゆれ', '顧客リスト', '住所録', '全角', '半角', 'データ整理', 'クレンジング', '電話番号'],
      m: [
        { id: 'dedupe-tool', type: 'tool', product: 'DataClean', rate: 0.75,
          pros: ['電話番号・郵便番号・日付などの書き方をまとめてそろえる', '直したセルが色で分かる'], cons: ['買い切りの費用がかかる', '同じ人かどうかの最終判断は人が行う'],
          steps: ['体験版のサンプルで試す', '名簿のコピーを用意する（元のファイルは残す）', '列ごとの整え方を確かめて「整える」を押す', '赤いセル（要確認）だけを直し、Excelで保存する'] },
        { id: 'dedupe-sheet', type: 'sheet', title: '関数と「重複の削除」で整える', rate: 0.45,
          pros: ['追加費用なし'], cons: ['表記ゆれのパターンごとに式が必要'],
          steps: ['名簿のコピーを作る', '空白を消す・文字の幅をそろえる関数で、整えた列を作る', '整えた列で重複を探し、削除する', 'よく出るゆれをメモしておき、次回も同じ手順で行う'] },
        { id: 'dedupe-gas', type: 'gas', title: 'Apps Scriptで、決まった整え方を一括で実行', rate: 0.6,
          pros: ['一度作れば毎回同じ整え方ができる'], cons: ['スクリプトを書く・直す人が必要'],
          steps: ['直したい書き方のルール（電話番号のハイフンなど）を書き出す', 'ルールを1つずつ処理するスクリプトを書く', 'コピーしたシートで試し、結果を見比べる'] },
        { id: 'dedupe-rule', type: 'rule', title: '入力のルールを決める', rate: 0.2,
          pros: ['これからのゆれを減らせる'], cons: ['今あるゆれは残る'],
          steps: ['電話番号・郵便番号・会社名の書き方を決める', '入力する人に共有する', '入力の欄にプルダウンなどの入力規則を設定する'] }
      ] },

    { id: 'labels', name: '宛名ラベル印刷', ind: ['common'], ease: '高', freq: 'yearly', min: 120,
      kw: ['宛名', 'ラベル', '宛名ラベル', '年賀状', 'DM', '封筒', '郵送', '発送'],
      m: [
        { id: 'labels-tool', type: 'tool', product: 'LabelMaker', rate: 0.75,
          pros: ['名簿を入れて用紙を選ぶだけ', '使いかけの用紙の途中から印刷できる'], cons: ['買い切りの費用がかかる'],
          steps: ['体験版のサンプル名簿で試す', '手持ちのラベル用紙の寸法を確かめる', '「枠線だけ試し刷り」で普通の紙に印刷し、ずれを直す', '名簿を入れてラベル用紙に印刷する'] },
        { id: 'labels-merge', type: 'merge', title: 'Wordの差し込み印刷でラベルを作る', rate: 0.6,
          pros: ['Excelの名簿をそのまま使える', '追加費用なし'], cons: ['用紙の設定に慣れるまで少し時間がかかる', 'Wordが入っている必要がある'],
          steps: ['名簿を1つのシートにまとめ、1行目を見出しにする', 'Wordの差し込み印刷でラベルを選び、用紙の種類を選ぶ', '名簿のファイルを読み込み、住所・氏名の欄を配置する', '1枚だけ普通の紙に試し刷りする'] },
        { id: 'labels-rule', type: 'rule', title: '名簿を1つにまとめておく', rate: 0.25,
          pros: ['印刷前の準備が減る'], cons: ['印刷の手間は残る'],
          steps: ['送付先の名簿を1つのファイルにまとめる', '送る・送らないの列を作る', '住所の書き方をそろえておく'] }
      ] },

    { id: 'mailsend', name: '定型メールの送信', ind: ['common'], ease: '高', freq: 'daily', min: 10,
      kw: ['定型', 'メール送信', 'お礼メール', 'テンプレ', '定型文', '返信', 'リマインド', '案内メール', '一斉送信'],
      m: [
        { id: 'mailsend-text', type: 'text', title: '定型文を単語登録・ショートカットにする', rate: 0.5,
          pros: ['追加費用なし', '数分で始められる'], cons: ['宛先ごとの差しかえは手で行う'],
          steps: ['よく書く文章（あいさつ・お礼・日程の確認など）を3つ選ぶ',
            { win: 'Microsoft IME の「単語の追加」（ユーザー辞書ツール）で、短い読み（例：おれい）に文章を登録する', mac: '「システム設定」→「キーボード」→「ユーザ辞書」で、短い文字（例：おれい）に文章を登録する' },
            'メールで読みを入力して変換し、出てくるか試す', '使いながら文章を直していく'] },
        { id: 'mailsend-gas', type: 'gas', title: 'Apps Scriptで、表の宛先に差し込みメールを送る', rate: 0.75,
          pros: ['宛名や日付を差しかえて、まとめて送れる'], cons: ['スクリプトを書く・直す人が必要', '個人のGoogleアカウントは宛先が1日100件まで'],
          steps: ['宛先・名前・差しかえる項目の表を作る', '本文のひな形（{名前} などの差しかえ場所つき）を決める', '1行ずつメールを作って送る処理を書く', '自分あてに送って文面を確かめる'] },
        { id: 'mailsend-pacloud', type: 'pacloud', title: 'クラウドフローで、表をもとにメールを送る', rate: 0.7,
          pros: ['Outlook と Excel の表で送れる'], cons: ['職場または学校のアカウントが必要', '設定に少し慣れが必要'],
          steps: ['OneDrive に宛先の表（Excelのテーブル）を置く', 'Power Automate で、表の行ごとにメールを送るフローを作る', '自分あてで試してから、本番の宛先に切りかえる'] },
        { id: 'mailsend-rule', type: 'rule', title: '定型メールの文面を1か所にまとめる', rate: 0.25,
          pros: ['探す時間が減る'], cons: ['送る手間は残る'],
          steps: ['よく使う文面を1つのファイルにまとめる', '用途ごとに見出しを付ける', 'みんなが同じ文面を使うように共有する'] }
      ] },

    { id: 'schedule', name: '会議日程の調整', ind: ['common'], ease: '中', freq: 'often', min: 15,
      kw: ['日程', '日程調整', 'スケジュール', '会議', '打ち合わせ', 'アポ', '予定', '面談', '候補日'],
      m: [
        { id: 'schedule-cloud', type: 'cloud', title: '日程調整のクラウドサービス（予約ページ）', rate: 0.75,
          pros: ['相手が空いている枠から選べる', 'やり取りの往復が減る'], cons: ['有料の場合がある', 'カレンダーとの連携の設定が必要'],
          steps: ['日程調整に使える時間帯を決める', '使っているカレンダーと連携できるサービスを探す', '無料で試せる範囲があれば、社内の打ち合わせで試す', '費用とデータの扱いを確かめる'] },
        { id: 'schedule-text', type: 'text', title: '候補日の案内文を定型文にする', rate: 0.35,
          pros: ['追加費用なし'], cons: ['調整のやり取りは残る'],
          steps: ['候補日を3つ書く案内文のひな形を作る',
            { win: 'Microsoft IME の「単語の追加」で、短い読みにひな形を登録する', mac: '「ユーザ辞書」で、短い文字にひな形を登録する' },
            '候補日は「日付（曜日）時間」の形でそろえる'] },
        { id: 'schedule-rule', type: 'rule', title: '会議の曜日・時間帯を決めておく', rate: 0.3,
          pros: ['調整そのものが減る'], cons: ['社外の相手には合わないことがある'],
          steps: ['定例の会議は曜日と時間を固定する', '社外の打ち合わせに使う時間帯を決める', 'カレンダーに枠を先に入れておく'] }
      ] },

    { id: 'paper', name: '紙の書類のデータ化', ind: ['common'], ease: '低', freq: 'weekly', min: 60,
      kw: ['紙', 'スキャン', 'データ化', '手書き', 'OCR', '入力作業', 'FAX', 'ファックス', '申込書'],
      m: [
        { id: 'paper-gform', type: 'gform', title: '紙の申込書をGoogleフォームに置きかえる', rate: 0.6,
          pros: ['相手が入力した内容がそのまま表になる', '追加費用なし'], cons: ['紙で出したい人への対応が残る'],
          steps: ['紙の書類の項目を書き出す', '同じ項目でGoogleフォームを作り、回答先をスプレッドシートにする', 'QRコードやリンクで案内する', '紙で来たものは、職員がフォームから入力する'] },
        { id: 'paper-sheet', type: 'sheet', title: '入力用シート（入力規則・プルダウン）で入力を速くする', rate: 0.3,
          pros: ['入力ミスが減る'], cons: ['入力の手間は残る'],
          steps: ['紙の項目と同じ順番に列を並べる', '選ぶ項目はプルダウンにする', '日付・数字の欄に入力規則を設定する'] },
        { id: 'paper-cloud', type: 'cloud', title: '文字読み取り（OCR）の機能があるサービス', rate: 0.55,
          pros: ['紙のまま受け取る場合でも入力を減らせる'], cons: ['有料の場合が多い', '手書きは読み取りの確認が必要'],
          steps: ['データ化したい書類の種類と枚数を数える', '読み取りの精度を、実際の書類数枚で試す', '費用とデータの扱いを確かめる'] },
        { id: 'paper-rule', type: 'rule', title: '紙で受け取る書類を減らす', rate: 0.2,
          pros: ['入力そのものが減る'], cons: ['相手の協力が必要'],
          steps: ['毎月どんな紙の書類が来るか一覧にする', 'データ（メール・CSV）でもらえる相手に頼む', '受け取り方を案内文にまとめる'] }
      ] },

    { id: 'pdftable', name: 'PDFの表をExcelに転記', ind: ['common'], ease: '中', freq: 'weekly', min: 30,
      kw: ['PDF', 'PDFから', '転記', '明細書', 'PDFの表', '貼り付け', '打ち込み'],
      m: [
        { id: 'pdftable-tool', type: 'tool', product: 'PDF2Excel', rate: 0.7,
          pros: ['複数ページの表を1つの表にまとめられる', '数字・金額を数値として読み取る'], cons: ['買い切りの費用がかかる', 'スキャンした画像だけのPDFは変換できない'],
          steps: ['体験版のサンプルPDFで試す', '手元のPDFの文字が選べるか（コピーできるか）確かめる', '変換して、合計などを元のPDFと見比べる', '列がずれるときは「列の分け方」を変えて変換し直す'] },
        { id: 'pdftable-sheet', type: 'sheet', title: '貼り付け後の整形を関数で自動にする', rate: 0.3,
          pros: ['追加費用なし'], cons: ['コピーと貼り付けは手で行う'],
          steps: ['PDFからコピーした内容を貼るシートを作る', '区切り位置や関数で列を分ける式を、別のシートに作る', '数字の「,」や「円」を取りのぞいて数値にする'] },
        { id: 'pdftable-rule', type: 'rule', title: '元のデータ（CSV・Excel）でもらう', rate: 0.4,
          pros: ['変換の手間そのものがなくなる'], cons: ['相手の協力が必要'],
          steps: ['PDFで届く表の送り主を一覧にする', 'CSVやExcelでもらえないか頼む', 'もらえる場合は、ファイルの形を決めてもらう'] }
      ] },

    { id: 'diff', name: '2つの表の照合（違い探し）', ind: ['common'], ease: '高', freq: 'monthly', min: 45,
      kw: ['照合', '比較', '突き合わせ', '違い', '差分', '変更点', '見比べ', '新旧', 'マスタ'],
      m: [
        { id: 'diff-tool', type: 'tool', product: 'DiffCheck', rate: 0.8,
          pros: ['追加・削除・変更された行とセルを色分けする', 'Excelで違いの一覧を保存できる'], cons: ['買い切りの費用がかかる'],
          steps: ['体験版で試す', '古いほうと新しいほうのファイルを用意する', '行を結びつける列（商品コード・社員番号など）を選んでくらべる', '違いの一覧をExcelで保存して確かめる'] },
        { id: 'diff-sheet', type: 'sheet', title: '検索関数と条件付き書式で違いに色を付ける', rate: 0.5,
          pros: ['追加費用なし'], cons: ['列が多いと式が増える'],
          steps: ['2つの表を同じブックの別シートに貼る', 'キーの列で相手側の値を検索関数で引いてくる', '値が違うセルに色が付く条件付き書式を設定する'] },
        { id: 'diff-vba', type: 'vba', title: 'Excelマクロでセルの違いを一覧に書き出す', rate: 0.7,
          pros: ['毎回の比較をボタン1つにできる'], cons: ['VBAを書く・直す人が必要'],
          steps: ['比較する2つのシートの形をそろえる', '1行ずつ値をくらべて違いを書き出すマクロを書く', 'コピーしたファイルで試す'] },
        { id: 'diff-rule', type: 'rule', title: '照合の手順と確認表を決める', rate: 0.15,
          pros: ['見落としが減る'], cons: ['作業そのものはあまり減らない'],
          steps: ['くらべる項目（キーになる番号・金額など）を決める', '確認した行に印を付ける表を作る', '違いがあったときの連絡先と直し方を決める'] }
      ] },

    { id: 'survey', name: 'アンケートの集計', ind: ['common'], ease: '高', freq: 'yearly', min: 180,
      kw: ['アンケート', '集計', '満足度', '回答', 'NPS', 'クロス集計', '自由記述'],
      m: [
        { id: 'survey-tool', type: 'tool', product: 'SurveyLens', rate: 0.7,
          pros: ['質問ごとの集計・グラフ・クロス集計をまとめて作る'], cons: ['買い切りの費用がかかる'],
          steps: ['体験版のサンプルで試す', 'フォームなどから回答をCSV・Excelで書き出す', '質問の種類（選択式・評価・自由記述）を確かめて集計する', 'レポートを印刷・PDFにする'] },
        { id: 'survey-gform', type: 'gform', title: 'Googleフォームで集め、回答の概要を使う', rate: 0.6,
          pros: ['回答の概要をフォームで見られる', '追加費用なし'], cons: ['クロス集計などは表計算で別に作る'],
          steps: ['アンケートをGoogleフォームで作る', '回答の保存先にスプレッドシートを選ぶ', '回答の概要を確かめ、必要な集計を表計算で足す'] },
        { id: 'survey-sheet', type: 'sheet', title: 'ピボットテーブルで集計', rate: 0.45,
          pros: ['追加費用なし'], cons: ['複数選択や自由記述の集計に手間がかかる'],
          steps: ['回答を1行1人の表にする', '質問ごとにピボットテーブルで人数を数える', 'グラフを作って報告の形にそろえる'] },
        { id: 'survey-rule', type: 'rule', title: '質問の形をそろえる', rate: 0.2,
          pros: ['集計しやすい回答が集まる'], cons: ['集計の手間は残る'],
          steps: ['選択式で聞ける質問は選択式にする', '評価は同じ段階（例：1〜5）にそろえる', '自由記述の質問は1〜2問にしぼる'] }
      ] },

    { id: 'inventory', name: '在庫の更新', ind: ['common', 'retail'], ease: '中', freq: 'daily', min: 20,
      kw: ['在庫', '棚卸', '入荷', '出荷', '在庫数', '欠品', '発注'],
      m: [
        { id: 'inventory-sheet', type: 'sheet', title: '入出庫を記録して在庫数を関数で出す', rate: 0.5,
          pros: ['追加費用なし', '在庫数を手で直す作業が減る'], cons: ['入出庫の記録もれがあるとずれる'],
          steps: ['商品の一覧（商品コード・名前・最初の在庫数）を作る', '入荷・出荷を1行ずつ記録するシートを作る', '商品ごとに入荷と出荷を合計して在庫数を出す（SUMIF など）', '発注点を下回ったら色が付くようにする'] },
        { id: 'inventory-gas', type: 'gas', title: 'Apps Scriptで在庫が少ない商品をメールで知らせる', rate: 0.6,
          pros: ['見に行かなくても欠品に気づける'], cons: ['スクリプトを書く・直す人が必要'],
          steps: ['在庫表をスプレッドシートで作る', '発注点を下回った商品を探す処理を書く', '毎朝動くトリガーと、知らせるメールを設定する'] },
        { id: 'inventory-cloud', type: 'cloud', title: '在庫管理のクラウドサービス（ネットショップ・レジと連携）', rate: 0.75,
          pros: ['販売と在庫の数を自動でそろえられるものがある'], cons: ['費用がかかることが多い'],
          steps: ['使っているネットショップ・レジに在庫の機能があるか確かめる', '連携できるサービスを比べる', '費用とデータの扱いを確かめる'] },
        { id: 'inventory-rule', type: 'rule', title: '在庫を数えるタイミングを決める', rate: 0.2,
          pros: ['ずれに早く気づける'], cons: ['更新の手間は残る'],
          steps: ['毎日・毎週の更新のタイミングを決める', '更新する人を決める', '月に1回、実際の数と照らし合わせる'] }
      ] },

    { id: 'password', name: 'パスワード・アカウント管理', ind: ['common'], ease: '中', freq: 'yearly', min: 120,
      kw: ['パスワード', 'アカウント', 'ID', 'ログイン', '退職者', '権限', 'セキュリティ', '使い回し'],
      m: [
        { id: 'password-tool', type: 'tool', product: 'PassAudit', rate: 0.6,
          pros: ['使い回し・弱いパスワードを見つけ、直す順番を示す', 'パスワードは外部に送信しない'], cons: ['買い切りの費用がかかる', '書き出したCSVは調べ終わったらすぐ消す必要がある'],
          steps: ['体験版のサンプルで試す', 'ブラウザやパスワード管理アプリからCSVを書き出す', '「使い回し」から順に、大事なアカウントのパスワードを変える', '書き出したCSVを削除し、ゴミ箱も空にする'] },
        { id: 'password-tool2', type: 'tool', product: 'AccountAudit', rate: 0.6,
          pros: ['退職した人のアカウントの残りや管理者権限を一覧にできる'], cons: ['買い切りの費用がかかる', '各サービスのユーザー一覧を書き出す必要がある'],
          steps: ['体験版のサンプルで試す', '社員名簿と、各サービスのユーザー一覧を書き出す', '「危険」「注意」の行を1件ずつ確かめる', '不要なアカウントは各サービスの管理画面で止める'] },
        { id: 'password-sheet', type: 'sheet', title: 'アカウント台帳（パスワードは書かない）', rate: 0.3,
          pros: ['だれが何を使っているか見える'], cons: ['更新の手間がかかる'],
          steps: ['サービス名・利用者・管理者・二段階認証の有無の列で台帳を作る（パスワードは書かない）', '入社・退職のときに更新する手順を決める', '半年に1回見直す日を決める'] },
        { id: 'password-cloud', type: 'cloud', title: 'パスワード管理のサービス（チームで共有できるもの）', rate: 0.5,
          pros: ['パスワードを安全に共有できるものがある'], cons: ['費用がかかることが多い'],
          steps: ['共有が必要なアカウントを一覧にする', 'サービスを比べ、少人数で試す', '費用とデータの扱いを確かめる'] },
        { id: 'password-rule', type: 'rule', title: '大事なアカウントから二段階認証とパスワードを見直す', rate: 0.2,
          pros: ['道具がなくても今日から始められる'], cons: ['点検の手間は残る'],
          steps: ['仕事で使うアカウントを書き出す（パスワードは書かない）', 'メール・お金・管理者のアカウントから、二段階認証をオンにする', '同じパスワードを使い回しているものから変える', '退職・異動があったら止めるアカウントを確かめる手順を決める'] }
      ] },

    /* ===== 不動産 ===== */
    { id: 'flyer', name: '物件資料（マイソク）作成', ind: ['realestate'], ease: '中', freq: 'often', min: 40,
      kw: ['マイソク', '物件資料', 'チラシ', '販売図面', '図面', '物件チラシ', '広告'],
      m: [
        { id: 'flyer-tool', type: 'tool', product: 'FlyerMaker', rate: 0.6,
          pros: ['表示規約の必要な表示事項の記載もれをチェック', '徒歩分数・坪数を自動で計算'], cons: ['買い切りの費用がかかる', '広告の内容の最終確認は自分で行う'],
          steps: ['体験版のサンプルで試す', '会社情報（帯）を入れて保存する', '物件を1件入れて、チェックの結果を確かめる', '印刷・PDFにして、いつもの資料と見比べる'] },
        { id: 'flyer-sheet', type: 'sheet', title: '物件一覧から資料のひな形に転記', rate: 0.4,
          pros: ['追加費用なし'], cons: ['写真の配置などは手作業が残る'],
          steps: ['物件の項目を1行1物件の一覧にする', '資料のひな形で、物件番号を入れると項目が入るよう検索関数を設定する', '記載もれを防ぐチェック欄を作る'] },
        { id: 'flyer-rule', type: 'rule', title: '資料の型と記載チェックリストを作る', rate: 0.2,
          pros: ['記載もれが減る'], cons: ['作成の手間は残る'],
          steps: ['物件の種別ごとに資料の型を決める', '必要な表示事項のチェックリストを作る', '作ったら別の人が確認する流れにする'] }
      ] },

    { id: 'hankyo', name: '反響メールの記録', ind: ['realestate'], ease: '中', freq: 'daily', min: 20,
      kw: ['反響', '追客', '問い合わせ', 'ポータル', '来店', '顧客管理', '反響メール'],
      m: [
        { id: 'hankyo-tool', type: 'tool', product: 'RE8Hankyo', rate: 0.4,
          pros: ['今日連絡する人・連絡もれ・反響元別の成約率が見える'], cons: ['セット購入（買い切り）が必要', '反響の入力は手で行う'],
          steps: ['8点セットの内容を確かめる', '直近1か月の反響を表に入れてみる', '「今日連絡する人」を毎朝見る習慣にする'] },
        { id: 'hankyo-pacloud', type: 'pacloud', title: 'クラウドフローで、反響メールを表に追記', rate: 0.7,
          pros: ['メールが届いたら自動で記録できる'], cons: ['職場または学校のアカウントが必要', '本文の形がポータルごとに違う'],
          steps: ['ポータルごとの反響メールの件名・差出人を確かめる', 'Power Automate で、そのメールが届いたら Excel の表に1行追加するフローを作る', '本文から名前・物件番号を取り出す設定を1つずつ足す'] },
        { id: 'hankyo-gas', type: 'gas', title: 'Apps Scriptで、反響メールをスプレッドシートに記録', rate: 0.7,
          pros: ['個人のGoogleアカウントでも使える'], cons: ['スクリプトを書く・直す人が必要'],
          steps: ['反響メールにラベルが付くよう、Gmail のフィルタを作る', 'ラベルの付いたメールを表に書き出す処理を書く', '時間ごとのトリガーで動かす'] },
        { id: 'hankyo-sheet', type: 'sheet', title: '反響台帳（次回連絡日の色分け）', rate: 0.3,
          pros: ['追加費用なし'], cons: ['転記の手間は残る'],
          steps: ['反響日・反響元・名前・物件・次回連絡日・状況の列で台帳を作る', '次回連絡日が今日以前の行に色を付ける', '毎朝、色の付いた行から連絡する'] },
        { id: 'hankyo-rule', type: 'rule', title: '反響の受け付けと記録のルールを決める', rate: 0.15,
          pros: ['連絡もれが減る'], cons: ['記録の手間は残る'],
          steps: ['反響を受けたら記録する場所を1つに決める', '初回の連絡までの目安時間を決める', '次に連絡する日を書く欄を作る'] }
      ] },

    { id: 'baikai', name: '媒介契約の期限管理', ind: ['realestate'], ease: '高', freq: 'weekly', min: 20,
      kw: ['媒介', '媒介契約', 'レインズ', '業務報告', '専任', '専属専任', '有効期間', '期限'],
      m: [
        { id: 'baikai-tool', type: 'tool', product: 'RE8Baikai', rate: 0.6,
          pros: ['レインズ登録・業務報告・有効期間の期限をまとめて管理', '媒介報酬の上限も計算'], cons: ['セット購入（買い切り）が必要'],
          steps: ['8点セットの内容を確かめる', '今ある媒介契約を表に入れる', '期限が近いものを週に1回確かめる'] },
        { id: 'baikai-sheet', type: 'sheet', title: '期限を関数で計算する管理表', rate: 0.5,
          pros: ['追加費用なし'], cons: ['休業日の扱いなど、式を作るのに手間がかかる'],
          steps: ['契約日・種類・物件の列で一覧を作る', '休業日を除いた日数を数える関数（WORKDAY など）で期限を出す', '期限が近い行に色が付くようにする', '計算した期限を、最初の数件は手で数えて確かめる'] },
        { id: 'baikai-rule', type: 'rule', title: '期限をカレンダーに入れる', rate: 0.25,
          pros: ['すぐ始められる'], cons: ['入れ忘れが起きやすい'],
          steps: ['契約したその日に、期限をカレンダーに入れる', 'だれが入れるかを決める', '週に1回、一覧と見比べる'] }
      ] },

    { id: 'chosa', name: '物件調査のチェック', ind: ['realestate'], ease: '中', freq: 'weekly', min: 60,
      kw: ['物件調査', '調査', '役所調査', '法務局', '重説', '重要事項', '現地調査', '調査報告書'],
      m: [
        { id: 'chosa-tool', type: 'tool', product: 'PropertySurvey', rate: 0.4,
          pros: ['調査65項目のチェックと、窓口ごとの行く前リスト', '要注意の項目を先頭にした報告書'], cons: ['買い切りの費用がかかる', '調査結果の正しさの確認は宅地建物取引士が行う'],
          steps: ['体験版のサンプルで試す', '次の物件で、所在地・地番・種類を入れる', '窓口に行く前のリストを印刷して持っていく', '調査報告書を印刷・PDFにする'] },
        { id: 'chosa-sheet', type: 'sheet', title: '調査チェックリスト（窓口ごとのシート）', rate: 0.25,
          pros: ['追加費用なし'], cons: ['項目の手入れが必要'],
          steps: ['いつも調べる項目を窓口ごとに書き出す', '「確認済み・要注意・対象外」を選べる列を作る', '物件ごとにシートをコピーして使う'] },
        { id: 'chosa-rule', type: 'rule', title: '調査の順番と持ち物を決める', rate: 0.15,
          pros: ['行き直しが減る'], cons: ['作業そのものは減らない'],
          steps: ['窓口を回る順番を決める', '持ち物（地番・公図など）のリストを作る', '調査後に見直すチェックリストを作る'] }
      ] },

    { id: 'koshin', name: '賃貸の更新期限管理', ind: ['realestate'], ease: '高', freq: 'monthly', min: 60,
      kw: ['更新', '賃貸', '更新期限', '更新案内', '定期借家', '火災保険', '保証会社', '契約期限'],
      m: [
        { id: 'koshin-tool', type: 'tool', product: 'RE8Koshin', rate: 0.6,
          pros: ['更新案内・定期借家の通知期間・火災保険・保証会社の期限をまとめて管理'], cons: ['セット購入（買い切り）が必要'],
          steps: ['8点セットの内容を確かめる', '管理している契約を表に入れる', '毎月1回、期限が近いものを確かめる'] },
        { id: 'koshin-sheet', type: 'sheet', title: '更新日から案内日を関数で出す管理表', rate: 0.5,
          pros: ['追加費用なし'], cons: ['式とルールを作る手間がある'],
          steps: ['契約ごとに満了日・火災保険・保証会社の期限の列を作る', '案内を出す日（例：満了の数か月前）を関数で出す', '今月案内するものに色が付くようにする'] },
        { id: 'koshin-gas', type: 'gas', title: 'Apps Scriptで、案内日が来たらメールで知らせる', rate: 0.6,
          pros: ['見に行かなくても気づける'], cons: ['スクリプトを書く・直す人が必要'],
          steps: ['管理表をスプレッドシートで作る', '案内日が今日以前の行を探す処理を書く', '毎朝動くトリガーと、自分あてのメールを設定する'] },
        { id: 'koshin-cloud', type: 'cloud', title: '賃貸管理のクラウドサービス', rate: 0.7,
          pros: ['契約・入金・更新をまとめて扱えるものがある'], cons: ['費用がかかることが多い', 'データの移しかえが必要'],
          steps: ['管理戸数と、困っていることを書き出す', 'サービスを比べ、試せるものは試す', '費用とデータの扱いを確かめる'] },
        { id: 'koshin-rule', type: 'rule', title: '更新の案内の時期を決めてカレンダーに入れる', rate: 0.2,
          pros: ['すぐ始められる'], cons: ['入れ忘れが起きやすい'],
          steps: ['更新の案内を出す時期（例：満了の数か月前）を決める', '契約のたびに、案内日と満了日をカレンダーに入れる', '月に1回、契約の一覧と見比べる'] }
      ] },

    { id: 'keiyaku', name: '契約書の作成', ind: ['realestate'], ease: '中', freq: 'often', min: 60,
      kw: ['契約書', '媒介契約書', '賃貸借契約書', '契約', '書類作成', 'ひな形'],
      m: [
        { id: 'keiyaku-tool', type: 'tool', product: 'BaikaiContract', rate: 0.5,
          pros: ['国交省の標準媒介契約約款に沿った下書きを作れる'], cons: ['買い切りの費用がかかる', '内容の確認は宅地建物取引業者が行う'],
          steps: ['体験版のサンプル（架空）で試す', '次の媒介契約で、種類を選んで入力する', 'チェックを確かめ、印刷・PDFまたはWordで保存する'] },
        { id: 'keiyaku-tool2', type: 'tool', product: 'LeaseContract', rate: 0.5,
          pros: ['国交省の賃貸住宅標準契約書への記入を補助'], cons: ['買い切りの費用がかかる', '特約などは専門家に確認が必要'],
          steps: ['体験版のサンプル（架空）で試す', '普通借家・定期借家と保証の型を選ぶ', '入力してチェックを確かめ、印刷・PDFまたはWordで保存する'] },
        { id: 'keiyaku-merge', type: 'merge', title: 'Wordの差し込み印刷で、一覧から契約書に転記', rate: 0.4,
          pros: ['今のひな形をそのまま使える'], cons: ['Wordが入っている必要がある', '差し込みの設定に手間がかかる'],
          steps: ['契約の項目（名前・物件・賃料など）を1行1件の一覧にする', '今の契約書のひな形に差し込みフィールドを置く', '1件分を作って、元の契約書と見比べる'] },
        { id: 'keiyaku-rule', type: 'rule', title: '最新のひな形を1か所にまとめる', rate: 0.2,
          pros: ['古いひな形の使いまわしを防げる'], cons: ['作成の手間は残る'],
          steps: ['使っているひな形を集め、最新のものに決める', '保存場所を決めて古いものは消す', '改訂したら日付をファイル名に入れる'] }
      ] },

    { id: 'portal', name: 'ポータルへの物件登録', ind: ['realestate'], ease: '低', freq: 'often', min: 30,
      kw: ['ポータル', '物件登録', '入稿', '掲載', 'ポータルサイト', '物件入力'],
      m: [
        { id: 'portal-pad', type: 'pad', title: 'Power Automate for desktop で、一覧からWebフォームに入力', rate: 0.5,
          pros: ['Microsoft アカウントなら追加料金なし', '操作を記録して作れる'], cons: ['Windows のアプリなので Mac では使えない', '画面が変わると止まる。自動入力が規約で認められているか確かめる必要がある'],
          steps: ['ポータルの利用規約で、自動入力が認められているか確かめる', '物件の項目をExcelの一覧にする', '1件分の入力操作を記録し、一覧の値を使うように直す', '登録前に画面で確かめてから保存する流れにする'] },
        { id: 'portal-cloud', type: 'cloud', title: '複数ポータルへ一括で入稿できるサービス', rate: 0.7,
          pros: ['1回の入力で複数のポータルに出せるものがある'], cons: ['有料の場合が多い'],
          steps: ['掲載しているポータルを一覧にする', '一括入稿に対応したサービスを比べる', '費用とデータの扱いを確かめる'] },
        { id: 'portal-sheet', type: 'sheet', title: '物件の登録用データを一覧にそろえる', rate: 0.25,
          pros: ['コピーして貼るだけになる'], cons: ['入力の手間は残る'],
          steps: ['ポータルの入力項目の順に列を並べる', '物件ごとに1行で登録内容をそろえる', '登録したら日付を入れる'] },
        { id: 'portal-rule', type: 'rule', title: '登録内容の原稿を1か所にまとめる', rate: 0.15,
          pros: ['探す時間が減る'], cons: ['入力の手間は残る'],
          steps: ['物件ごとに、登録に使う文章と写真を1つのフォルダにまとめる', 'よく使う紹介文をひな形にする', '登録したら日付を記録する'] }
      ] },

    /* ===== 小売・EC ===== */
    { id: 'sales', name: '注文データの集計・売上分析', ind: ['retail'], ease: '高', freq: 'weekly', min: 60,
      kw: ['注文', '売上', '売上分析', 'リピート', '顧客分析', 'ネットショップ', 'EC', 'レジ', '商品別'],
      m: [
        { id: 'sales-tool', type: 'tool', product: 'DataLens', rate: 0.65,
          pros: ['月ごとの売上と商品のABC分析ができる'], cons: ['買い切りの費用がかかる'],
          steps: ['体験版のサンプルで試す', 'ショップやレジから注文データをCSVで書き出す', '日付・金額・商品の列を選んで分析する', 'Excelやグラフ画像で保存する'] },
        { id: 'sales-tool2', type: 'tool', product: 'CustomerLens', rate: 0.6,
          pros: ['お客さんを「優良」「離れそう」などに分け、リピート率を出す'], cons: ['買い切りの費用がかかる', 'メールやDMを送るときは同意などに注意が必要'],
          steps: ['体験版のサンプルで試す', '注文データ（お客さん・注文日・金額）を書き出す', 'グループごとの一覧をCSVで保存し、ご案内の計画を立てる'] },
        { id: 'sales-sheet', type: 'sheet', title: 'ピボットテーブルで月別・商品別の売上', rate: 0.5,
          pros: ['追加費用なし'], cons: ['データの形が変わると作り直し'],
          steps: ['注文データを貼るシートを作る', '月別・商品別のピボットテーブルを作る', '次回はデータを貼りかえて更新するだけにする'] },
        { id: 'sales-gas', type: 'gas', title: 'Apps Scriptで週ごとの売上を自動で集計', rate: 0.6,
          pros: ['決まった時間に自動で動かせる'], cons: ['スクリプトを書く・直す人が必要'],
          steps: ['注文データを置く場所を決める', '集計シートに書き出す処理を書く', '毎週動くトリガーを設定する'] },
        { id: 'sales-rule', type: 'rule', title: '見る数字と日を決める', rate: 0.15,
          pros: ['集計の迷いが減る'], cons: ['集計の手間は残る'],
          steps: ['毎週見る数字（売上・注文数・客数など）を3つに決める', '集計する日を決める', '前の週とくらべる表を1枚作る'] }
      ] },

    { id: 'shipping', name: '発送の宛名・送り状の準備', ind: ['retail'], ease: '中', freq: 'daily', min: 20,
      kw: ['発送', '送り状', '出荷', '配送', '宛名', '伝票', '梱包'],
      m: [
        { id: 'shipping-tool', type: 'tool', product: 'LabelMaker', rate: 0.5,
          pros: ['注文の一覧から宛名ラベルを印刷できる'], cons: ['買い切りの費用がかかる', '配送会社の送り状そのものは作らない'],
          steps: ['体験版のサンプル名簿で試す', '注文データから住所・名前の列を書き出す', 'ラベル用紙に試し刷りしてから印刷する'] },
        { id: 'shipping-sheet', type: 'sheet', title: '注文データを送り状の取り込み形式に並べかえる', rate: 0.5,
          pros: ['追加費用なし'], cons: ['取り込みの形式に合わせる式が必要'],
          steps: ['使っている配送サービスがCSVの取り込みに対応しているか確かめる', '取り込み用の列の順番に、注文データを並べかえるシートを作る', 'CSVで保存して取り込む'] },
        { id: 'shipping-cloud', type: 'cloud', title: 'ネットショップと配送をつなぐサービス', rate: 0.7,
          pros: ['注文から送り状の作成まで続けてできるものがある'], cons: ['費用がかかることが多い'],
          steps: ['使っているショップ・配送サービスの連携機能を確かめる', '少ない件数で試す', '費用とデータの扱いを確かめる'] },
        { id: 'shipping-rule', type: 'rule', title: '発送の手順とチェックリストを作る', rate: 0.15,
          pros: ['発送ミスが減る'], cons: ['作業そのものはあまり減らない'],
          steps: ['注文確認から発送までの手順を書き出す', '宛名・品物・数量を確かめるチェック欄を作る', '発送したら注文一覧に日付を入れる'] }
      ] },

    { id: 'snspost', name: 'SNS投稿の予約', ind: ['retail', 'common'], ease: '中', freq: 'often', min: 20,
      kw: ['SNS', 'インスタ', 'Instagram', 'X', 'ツイッター', '投稿', '予約投稿', '宣伝', '告知'],
      m: [
        { id: 'snspost-cloud', type: 'cloud', title: 'SNSや投稿管理サービスの予約投稿の機能', rate: 0.5,
          pros: ['まとめて作って、決めた時間に出せる'], cons: ['使える機能や費用はサービスによって違う'],
          steps: ['使っているSNSに予約投稿の機能があるか、ヘルプで確かめる', '1週間分の投稿をまとめて作る日を決める', '予約して、出たあとに確かめる'] },
        { id: 'snspost-text', type: 'text', title: 'よく使う文・ハッシュタグを定型文にする', rate: 0.3,
          pros: ['追加費用なし'], cons: ['投稿の手間は残る'],
          steps: ['よく使う文やハッシュタグを書き出す',
            { win: 'Microsoft IME の「単語の追加」で短い読みに登録する', mac: '「ユーザ辞書」で短い文字に登録する（iPhone と同じ Apple アカウントなら共有されることがあります）' },
            '投稿のひな形を作る'] },
        { id: 'snspost-rule', type: 'rule', title: '投稿カレンダーを作る', rate: 0.25,
          pros: ['ネタを考える時間が減る'], cons: ['投稿の手間は残る'],
          steps: ['曜日ごとのテーマを決める', '1か月分の予定を表にする', 'まとめて作る日を決める'] }
      ] },

    /* ===== 士業・コンサル ===== */
    { id: 'collect', name: '顧客からの資料回収の管理', ind: ['pro'], ease: '中', freq: 'weekly', min: 45,
      kw: ['資料回収', '書類回収', '提出', '依頼', '催促', '未提出', '顧問先', '必要書類'],
      m: [
        { id: 'collect-gform', type: 'gform', title: 'Googleフォームで提出の連絡を受け、表で管理', rate: 0.5,
          pros: ['提出状況が自動で表にたまる', '追加費用なし'], cons: ['ファイルの受け渡し方法は別に決める必要がある'],
          steps: ['顧客ごとの必要書類の一覧を作る', '「提出しました」の連絡用フォームを作り、回答先をスプレッドシートにする', '未提出の顧客が分かる列を作る'] },
        { id: 'collect-sheet', type: 'sheet', title: '回収状況の一覧（顧客×書類）', rate: 0.35,
          pros: ['未提出がひと目で分かる'], cons: ['更新の手間は残る'],
          steps: ['行に顧客、列に書類を並べた表を作る', '提出されたら日付を入れる', '期限を過ぎた空欄に色を付ける'] },
        { id: 'collect-pacloud', type: 'pacloud', title: 'クラウドフローで、未提出の顧客にリマインドメール', rate: 0.6,
          pros: ['催促の手間が減る'], cons: ['職場または学校のアカウントが必要'],
          steps: ['回収状況の表を OneDrive の Excel に置く', '未提出の行にメールを送るフローを作る', '自分あてで試し、文面を確かめる'] },
        { id: 'collect-cloud', type: 'cloud', title: 'ファイル受け渡し・顧客ポータルのサービス', rate: 0.6,
          pros: ['提出とファイルの保管をまとめられるものがある'], cons: ['費用がかかることが多い'],
          steps: ['今の受け渡し方法（メール・郵送）を書き出す', 'サービスを比べ、少ない顧客で試す', '費用とデータの扱いを確かめる'] },
        { id: 'collect-rule', type: 'rule', title: '必要書類の案内文と期限を決める', rate: 0.2,
          pros: ['催促の回数が減る'], cons: ['回収の確認は手で行う'],
          steps: ['顧客ごとに必要な書類の一覧を作る', '提出の期限と出し方を書いた案内文を作る', '期限の数日前に案内する日を決める'] }
      ] },

    { id: 'deadline', name: '顧客ごとの期限管理（申告・更新など）', ind: ['pro'], ease: '高', freq: 'weekly', min: 30,
      kw: ['期限', '申告', '期限管理', '更新手続き', '届出', '締切', '納期', 'リマインド'],
      m: [
        { id: 'deadline-sheet', type: 'sheet', title: '期限一覧（近い順・色分け）', rate: 0.5,
          pros: ['追加費用なし'], cons: ['期限の入力は手で行う'],
          steps: ['顧客・手続き・期限・担当・状況の列で一覧を作る', '期限までの日数を関数で出し、近いものに色を付ける', '毎週月曜に一覧を見る'] },
        { id: 'deadline-gas', type: 'gas', title: 'Apps Scriptで、期限が近いものを毎朝メールで知らせる', rate: 0.65,
          pros: ['見に行かなくても気づける'], cons: ['スクリプトを書く・直す人が必要'],
          steps: ['期限一覧をスプレッドシートで作る', '期限まで7日以内の行を探す処理を書く', '毎朝動くトリガーと、知らせるメールを設定する'] },
        { id: 'deadline-pacloud', type: 'pacloud', title: 'クラウドフローで、期限の近いものを知らせる', rate: 0.6,
          pros: ['Outlook と Excel で動かせる'], cons: ['職場または学校のアカウントが必要'],
          steps: ['期限一覧を OneDrive の Excel のテーブルにする', '毎朝動くフローで、期限が近い行を探してメールする', '自分あてで試す'] },
        { id: 'deadline-rule', type: 'rule', title: '期限をカレンダーに入れる', rate: 0.25,
          pros: ['すぐ始められる'], cons: ['入れ忘れが起きやすい'],
          steps: ['受任したときに期限をカレンダーに入れる', '担当と確認日を決める', '月に1回、一覧と見比べる'] }
      ] },

    { id: 'timecharge', name: '作業時間の記録と請求', ind: ['pro'], ease: '中', freq: 'daily', min: 10,
      kw: ['作業時間', 'タイムチャージ', '工数', '時間記録', '稼働', '報酬請求', '時間'],
      m: [
        { id: 'timecharge-sheet', type: 'sheet', title: '作業記録シートと月の集計', rate: 0.5,
          pros: ['追加費用なし'], cons: ['記録の習慣づけが必要'],
          steps: ['日付・顧客・作業・時間の列で記録シートを作る', '顧客ごとの月の合計をピボットテーブルで出す', '請求書に転記する金額を計算する'] },
        { id: 'timecharge-tool', type: 'tool', product: 'InvoiceBatch', rate: 0.4,
          pros: ['集計した金額から、顧客ごとの請求書をまとめて作れる'], cons: ['買い切りの費用がかかる', '時間の記録そのものはしない'],
          steps: ['体験版で請求書の作成を試す', '月の集計を「取引先・品目・数量・単価」の形に並べる', '請求書を作ってPDFにする'] },
        { id: 'timecharge-cloud', type: 'cloud', title: '時間記録のクラウドサービス', rate: 0.6,
          pros: ['開始・終了のボタンで記録できるものがある'], cons: ['費用がかかることが多い'],
          steps: ['記録したい項目（顧客・作業）を決める', 'サービスを比べ、1週間試す', '費用とデータの扱いを確かめる'] },
        { id: 'timecharge-rule', type: 'rule', title: '作業の記録を1日の終わりにまとめる', rate: 0.15,
          pros: ['記録もれが減る'], cons: ['記録の手間は残る'],
          steps: ['顧客と作業の分け方を決める', '1日の終わりに5分、その日の作業を書く時間をとる', '月末に顧客ごとに合計する'] }
      ] }
  ];

  var DATA = {
    CHECKED: CHECKED, SOURCES: SOURCES, TYPES: TYPES, COST_LABEL: COST_LABEL, DIFF_LABEL: DIFF_LABEL,
    PRODUCTS: PRODUCTS, BUNDLES: BUNDLES, INDUSTRIES: INDUSTRIES, TASKS: TASKS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.DX_DATA = DATA;
})(typeof window !== 'undefined' ? window : this);
