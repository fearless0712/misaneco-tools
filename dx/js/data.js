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
    QRBatch:        { name: 'QRBatch', page: 'QRBatch.html', price: '¥1,480', booth: 'https://excel-temple.booth.pm/items/9000288', bundles: ['allin'], browsers: 'Chrome・Edge', what: '一覧（CSV・Excel・貼り付け）から、QRコードをまとめて作って印刷・PNG保存します。QRの下に文字を2行まで入れられます（備品・在庫のラベル、名札、座席カードなど）。' },
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


  /* ===================== 業種の追加（2026-10-19） =====================
     ・同じ形の業務（シフト・予約・見積・現場写真など）は、1つの業務を複数の業種に付ける（ind に並べる）。
     ・業種に固有の業務だけを別に作る。自社ツールは体験版ページで確かめた用途に合うときだけ入れる。
     ・法令・医療・制度の判断は書かない（業種の注意書きで、所管・専門家の案内を確かめるよう促すだけ）。 */
  SOURCES.push({ id: 's15', title: 'Google ドライブにファイルやフォルダをアップロードする - iPhone と iPad - Google ドライブ ヘルプ', source_url: 'https://support.google.com/drive/answer/2424368?hl=ja&co=GENIE.Platform%3DiOS', claim: 'iPhone・iPad の Google ドライブ アプリから、写真などのファイルを選んでアップロードでき、保存先のフォルダを選べる。アップロードしたファイルは自分の Google ドライブの容量を使う。', checked: CHECKED });
  TYPES.gdrive = { label: 'Googleドライブの共有フォルダ', cost: 'free', diff: 1, needs: { sheet: ['google', 'both'] }, code: false, src: ['s15'] };

  var TEXT_REG = { win: 'Microsoft IME の「単語の追加」（ユーザー辞書ツール）で、短い読みに文章を登録する', mac: '「システム設定」→「キーボード」→「ユーザ辞書」で、短い文字に文章を登録する' };
  function M(id, type, title, rate, pros, cons, steps) { return { id: id, type: type, title: title, rate: rate, pros: pros, cons: cons, steps: steps }; }
  function TOOL(id, product, rate, pros, cons, steps) { return { id: id, type: 'tool', product: product, rate: rate, pros: pros, cons: cons, steps: steps }; }
  function TASK(id, name, ind, ease, freq, min, kw, m, note) { var t = { id: id, name: name, ind: ind, ease: ease, freq: freq, min: min, kw: kw, m: m }; if (note) t.note = note; return t; }
  function RULE(id, title, pros, steps) { return M(id + '-rule', 'rule', title, 0.15, pros, ['作業そのものはあまり減らない'], steps); }

  /* ---------- 業種（cat：選ぶ画面のまとまり、syn：検索用の言いかえ） ---------- */
  var CATS = [
    { id: 'build', label: '建設・不動産・設備' },
    { id: 'logi', label: '物流・運輸' },
    { id: 'service', label: '小売・飲食・サービス' },
    { id: 'care', label: '医療・福祉・教育' },
    { id: 'expert', label: '専門職・士業' },
    { id: 'agri', label: '農林水産' },
    { id: 'make', label: '製造・制作・IT' },
    { id: 'group', label: '団体' },
    { id: 'misc', label: '事務全般・その他' }
  ];
  var NOTE_HEALTH = '利用者・患者の健康に関する情報や個人情報は、一般向けのクラウドサービスや表計算に入れる前に、事業所の規程、所属団体・業界のガイドライン、各サービスの利用規約を確認してください。請求や記録の方法は、それぞれの制度のルールに従ってください。';
  var NOTE_CHILD = '子ども・保護者の個人情報は、園・施設の規程や自治体の案内、各サービスの利用規約を確認してから扱ってください。';
  var IND_META = {
    realestate: { cat: 'build', syn: ['不動産屋', '仲介', '賃貸', '売買', '管理会社', '宅建'] },
    office: { cat: 'misc', syn: ['事務', '総務', '経理', 'バックオフィス', '庶務'] },
    retail: { cat: 'service', syn: ['小売', 'お店', '店舗', 'ネットショップ', '通販', 'ec', '雑貨'] },
    pro: { cat: 'expert', syn: ['士業', 'コンサル', 'コンサルタント', '弁護士', '司法書士', '中小企業診断士'] },
    other: { cat: 'misc', syn: ['その他', 'ほか'] }
  };
  var NEW_INDUSTRIES = [
    { id: 'construction', label: '建築（電気・水道設備・大工・内装・リフォーム）', cat: 'build', syn: ['建築', '建設', '工務店', 'リフォーム', '大工', '電気工事', '電気屋', '設備', '水道', '水道屋', '配管', '内装', 'クロス', '塗装', '左官', '屋根', '解体', '職人', '現場'] },
    { id: 'civil', label: '土木', cat: 'build', syn: ['土木', '舗装', '外構', '測量', '基礎工事', '重機', '公共工事'] },
    { id: 'landscaping', label: '造園', cat: 'build', syn: ['造園', '植木', '庭', '庭師', '剪定', '草刈り', '緑化'] },
    { id: 'cleaning', label: '清掃・ビルメンテナンス', cat: 'build', syn: ['清掃', 'ビルメン', 'ビルメンテナンス', 'ハウスクリーニング', '設備管理', 'メンテナンス'] },
    { id: 'logistics', label: '物流（倉庫・運送・配送）', cat: 'logi', syn: ['物流', '倉庫', '運送', '配送', '運輸', 'トラック', '宅配', '軽貨物', 'ドライバー'] },
    { id: 'moving', label: '引越し業', cat: 'logi', syn: ['引越', '引っ越し', '引越し', '運搬'] },
    { id: 'food', label: '飲食店', cat: 'service', syn: ['飲食', 'レストラン', 'カフェ', '居酒屋', 'ラーメン', '食堂', 'バー', 'テイクアウト'] },
    { id: 'beauty', label: '美容（美容室・ネイル・エステなど）', cat: 'service', syn: ['美容', '美容室', '美容院', 'ヘアサロン', 'サロン', 'ネイル', 'エステ', 'まつげ', 'まつエク', '理容', '床屋'] },
    { id: 'hotel', label: 'ホテル・旅館（民泊・小さな宿も）', cat: 'service', syn: ['ホテル', '旅館', '民泊', '宿', '宿泊', 'ゲストハウス', 'ペンション', '簡易宿所'] },
    { id: 'car', label: '自動車整備・販売', cat: 'service', syn: ['自動車', '車', '整備', '車検', '板金', '中古車', 'カーディーラー', 'バイク'] },
    { id: 'pet', label: 'ペット（トリミング・ペットホテル）', cat: 'service', syn: ['ペット', 'トリミング', 'トリマー', 'ペットホテル', '犬', '猫', 'ペットサロン'] },
    { id: 'gym', label: 'スポーツジム・フィットネス', cat: 'service', syn: ['ジム', 'フィットネス', 'ヨガ', 'ピラティス', 'パーソナルトレーニング', 'スタジオ'] },
    { id: 'photo', label: '写真スタジオ', cat: 'service', syn: ['写真', 'フォトスタジオ', '写真館', 'カメラマン', '撮影'] },
    { id: 'recycle', label: 'リサイクル・買取店', cat: 'service', syn: ['リサイクル', '買取', '中古', 'リユース', '古着', '質屋'] },
    { id: 'funeral', label: '葬儀', cat: 'service', syn: ['葬儀', '葬祭', 'セレモニー', '斎場', '仏事'] },
    { id: 'event', label: '冠婚・イベント', cat: 'service', syn: ['冠婚', '結婚式', 'ウェディング', 'ブライダル', 'イベント', '式場', '催事'] },
    { id: 'security', label: '警備', cat: 'service', syn: ['警備', '交通誘導', '施設警備', '巡回'] },
    { id: 'care', label: '介護・福祉事業所', cat: 'care', syn: ['介護', '福祉', 'デイサービス', '訪問介護', 'グループホーム', '障害福祉', '就労支援'] },
    { id: 'clinic', label: 'クリニック・治療院・整骨院', cat: 'care', syn: ['クリニック', '医院', '診療所', '歯科', '治療院', '整骨院', '接骨院', '整体', '鍼灸', 'マッサージ'] },
    { id: 'nursery', label: '保育・学童', cat: 'care', syn: ['保育', '保育園', '学童', '幼稚園', '託児', 'こども園'] },
    { id: 'school', label: '教室・スクール（塾・習い事）', cat: 'care', syn: ['教室', 'スクール', '塾', '学習塾', '習い事', 'ピアノ', '英会話', 'ダンス', 'そろばん', 'プログラミング教室'] },
    { id: 'tax', label: '税理士・会計事務所', cat: 'expert', syn: ['税理士', '会計事務所', '税務', '記帳代行', '会計士'] },
    { id: 'sharoushi', label: '社労士', cat: 'expert', syn: ['社労士', '社会保険労務士', '労務', '給与計算代行'] },
    { id: 'gyosei', label: '行政書士', cat: 'expert', syn: ['行政書士', '許認可', '申請代行'] },
    { id: 'insurance', label: '保険代理店', cat: 'expert', syn: ['保険', '保険代理店', '損保', '生保', '代理店'] },
    { id: 'farm', label: '農業', cat: 'agri', syn: ['農業', '農家', '農園', '畑', '田んぼ', '果樹', '野菜', '米', '農産物'] },
    { id: 'fishery', label: '漁業・水産', cat: 'agri', syn: ['漁業', '漁師', '水産', '養殖', '鮮魚', '漁協'] },
    { id: 'direct', label: '農産物直売・道の駅', cat: 'agri', syn: ['直売', '直売所', '道の駅', '産直', 'マルシェ', '委託販売'] },
    { id: 'factory', label: '製造（小さな工場）', cat: 'make', syn: ['製造', '工場', 'ものづくり', '町工場', '加工', '部品', '金属加工', '食品製造'] },
    { id: 'printing', label: '印刷・デザイン制作', cat: 'make', syn: ['印刷', 'デザイン', '制作', 'グラフィック', 'チラシ', '名刺', '看板'] },
    { id: 'it', label: 'IT・Web制作', cat: 'make', syn: ['it', 'web', 'ウェブ', 'ホームページ', 'システム開発', 'アプリ開発', 'エンジニア', 'プログラマー'] },
    { id: 'ad', label: '広告・マーケティング代理', cat: 'make', syn: ['広告', 'マーケティング', '代理店', '運用代行', 'sns運用', 'プロモーション'] },
    { id: 'freelance', label: 'フリーランス・個人事業主', cat: 'make', syn: ['フリーランス', '個人事業', '個人事業主', 'ライター', 'デザイナー', '副業', 'ひとり社長'] },
    { id: 'npo', label: 'NPO・団体（会員・寄付）', cat: 'group', syn: ['npo', '団体', '協会', '一般社団', '会員', '寄付', 'ボランティア', 'サークル'] },
    { id: 'community', label: '自治会・PTA', cat: 'group', syn: ['自治会', '町内会', 'pta', '子ども会', 'マンション管理組合', '管理組合', '役員'] }
  ];
  INDUSTRIES.forEach(function (x) { var m = IND_META[x.id] || {}; x.cat = m.cat || 'misc'; x.syn = m.syn || []; });
  var other = INDUSTRIES.pop();
  NEW_INDUSTRIES.forEach(function (x) { INDUSTRIES.push(x); });
  INDUSTRIES.push(other);
  var IND_NOTES = { care: NOTE_HEALTH, clinic: NOTE_HEALTH, nursery: NOTE_CHILD };

  /* 既存の業務を、新しい業種にも付ける */
  function addInd(taskId, inds) { TASKS.forEach(function (t) { if (t.id === taskId) inds.forEach(function (i) { if (t.ind.indexOf(i) < 0) t.ind.push(i); }); }); }
  addInd('deadline', ['tax', 'sharoushi', 'gyosei', 'insurance', 'it']);
  addInd('collect', ['tax', 'sharoushi', 'gyosei', 'insurance']);
  addInd('timecharge', ['tax', 'sharoushi', 'gyosei', 'it', 'ad']);
  addInd('inventory', ['recycle', 'direct']);
  addInd('shipping', ['farm', 'fishery']);
  addInd('csvagg', ['ad']);

  /* ---------- 組み立て用 ---------- */
  function shiftTask(id, ind) {
    return TASK(id, 'シフト作成と勤務時間の集計', ind, '中', 'monthly', 180,
      ['シフト', 'シフト表', 'シフト作成', '勤務表', '勤怠', 'タイムカード', '出勤', '人手', 'アルバイト', 'パート', '配置'],
      [
        M(id + '-sheet', 'sheet', 'シフト表のひな形（希望の集約と人数チェック）', 0.4,
          ['追加費用なし', '日ごとの人数不足が色で分かる'], ['希望の集め方は別に決める必要がある'],
          ['1か月分の日付とスタッフ名を並べたシフト表のひな形を作る', '時間帯ごとに必要な人数を決め、足りない日に色が付くようにする', '希望休を集める締め日と方法を決める', '確定したシフト表をPDFにして共有する']),
        TOOL(id + '-tool', 'KintaiSum', 0.5,
          ['タイムカードの実績から、個人別の実働・時間外・深夜を月ごとに集計', '休憩不足などの注意も出る'], ['買い切りの費用がかかる', 'シフト表そのものは作らない。割増賃金の計算はしない'],
          ['体験版のサンプルで、個人別の集計を見てみる', 'タイムカードや勤怠アプリから1か月分をCSV・Excelで書き出す', '所定労働時間と法定休日を設定して集計する', '注意の出た日だけを確かめ、Excelで保存する']),
        M(id + '-cloud', 'cloud', 'シフト管理のクラウドサービス（希望の提出・共有）', 0.6,
          ['スタッフがスマホで希望を出し、確定したシフトを見られるものがある'], ['費用がかかることが多い', 'スタッフへの説明が必要'],
          ['今のシフト作りで時間がかかっている作業を書き出す', '勤怠や給与のソフトとつながるかを確かめる', '試せる期間があれば1か月分で試す', '費用とデータの扱いを確かめる']),
        RULE(id, '希望休の締め日と決め方をそろえる', ['やり取りの往復が減る'],
          ['希望休の締め日を毎月同じ日にする', '希望の出し方（紙・メッセージ）を1つにする', '人数が足りないときの決め方を先に共有する'])
      ]);
  }
  function stockTask(id, name, ind, withQR, kwExtra) {
    var ms = [
      M(id + '-sheet', 'sheet', '在庫表と発注点（足りないものに色を付ける）', 0.45,
        ['追加費用なし', '発注もれに気づきやすい'], ['数を記録する習慣が必要'],
        ['品目・置き場所・今の数・発注点の列で在庫表を作る', '発注点を下回ったら色が付くようにする', '数える日（例：毎週月曜）と担当を決める', '発注したら日付を入れる列を作る']),
      M(id + '-gform', 'gform', 'スマホのGoogleフォームで、使った数・入荷を記録', 0.4,
        ['その場でスマホから記録できる', '追加費用なし'], ['集計の式は表で作る必要がある'],
        ['品目の一覧を選ぶ形のフォームを作り、回答先をスプレッドシートにする', '「入荷」「使った」と数を記録する', '品目ごとの今の数を、スプレッドシートの関数で出す'])
    ];
    if (withQR) ms.push(TOOL(id + '-qr', 'QRBatch', 0.25,
      ['品目・棚の一覧から、管理用のQRコードラベルをまとめて印刷できる'], ['買い切りの費用がかかる', 'QRを読み取ったあとの記録の仕組みは別に用意する'],
      ['体験版のサンプルで試す', '品目や棚の一覧（番号・名前）をCSVかExcelで用意する', 'QRの中身と下に印刷する文字を選んで印刷する', '棚や箱に貼り、スマホで読み取れるか何枚か試す']));
    ms.push(RULE(id, '置き場所と発注の担当を決める', ['探す時間と発注もれが減る'],
      ['品目ごとの置き場所を決めて表示する', '発注の担当と発注する日を決める', '足りなくなりそうなら書く「発注メモ」を置く']));
    return TASK(id, name, ind, '中', 'weekly', 40,
      ['在庫', '発注', '仕入れ', '消耗品', '備品', '棚卸', '欠品', '材料'].concat(kwExtra || []), ms);
  }
  function billTask(id, name, ind, kwExtra) {
    return TASK(id, name, ind, '高', 'monthly', 120,
      ['請求', '請求書', '入金', '入金確認', '未入金', '振込', '集金', '売掛'].concat(kwExtra || []),
      [
        TOOL(id + '-tool', 'InvoiceBatch', 0.65,
          ['一覧から、相手ごとの請求書をまとめて作り1つのPDFにできる'], ['買い切りの費用がかかる', '入金の確認は別に行う'],
          ['体験版のサンプルで試す', '今月の請求を「相手・品目・数量・単価」の表にまとめる', '発行者の情報を入れて保存する', '請求書を作り、金額を見比べてから送る']),
        TOOL(id + '-tool2', 'NyukinCheck', 0.6,
          ['請求の一覧と通帳の明細を突き合わせ、未入金を一覧にできる'], ['買い切りの費用がかかる', '請求の一覧と明細をファイルで用意する必要がある'],
          ['体験版のサンプルで試す', 'ネットバンキングから入出金明細をCSVで保存する', '請求の一覧と一緒に入れて消込する', '「要確認」と未入金だけを確かめて連絡する']),
        M(id + '-sheet', 'sheet', '請求台帳（請求日・入金日・未入金の色分け）', 0.4,
          ['追加費用なし'], ['照合の手間は残る'],
          ['相手・請求額・請求日・入金日の列で台帳を作る', '期日を過ぎても入金日が空の行に色を付ける', '毎月決まった日に入金を確認する']),
        M(id + '-cloud', 'cloud', '請求・入金管理の機能があるクラウドサービス', 0.6,
          ['請求書の送付や入金の確認まで続けて扱えるものがある'], ['費用がかかることが多い'],
          ['今の請求の流れと件数を書き出す', '試せる期間があれば1か月分で試す', '費用とデータの扱いを確かめる']),
        RULE(id, '請求の締め日と入金確認の日を決める', ['請求もれ・確認もれが減る'],
          ['請求の締め日と送る日を毎月同じにする', '入金を確かめる日を決める', '期日を過ぎたら連絡する手順と文面を決める'])
      ]);
  }
  function replyTask(id, name, ind, kw, examples) {
    return TASK(id, name, ind, '高', 'daily', 15,
      ['返信', '定型', '定型文', '問い合わせ', 'メッセージ', 'テンプレ', '案内'].concat(kw),
      [
        M(id + '-text', 'text', '返信文を定型文・単語登録にする', 0.5,
          ['追加費用なし', '数分で始められる'], ['相手ごとの書きかえは手で行う'],
          ['よく送る文（' + examples + '）を3つ選んで文面を作る', TEXT_REG, '使いながら文面を直し、スタッフと共有する']),
        M(id + '-rule', 'rule', '返信のひな形集と返信までの目安を決める', 0.25,
          ['人によって返信の質がばらつかない'], ['返信の手間は残る'],
          ['よくある質問と返信のひな形を1つのファイルにまとめる', '返信までの目安（例：1営業日以内）を決める', 'だれが返信するかを決める'])
      ]);
  }
  function salesTask(id, name, ind, kw, what) {
    return TASK(id, name, ind, '高', 'daily', 15,
      ['売上', '日報', '売上日報', '集計', '月次', '日別', '客数'].concat(kw),
      [
        TOOL(id + '-tool', 'DataLens', 0.6,
          ['CSV・Excelから、日別・月別の集計表とグラフを作れる'], ['買い切りの費用がかかる', 'データをCSVやExcelで用意できることが前提'],
          ['体験版のサンプルで試す', what + 'を、1か月分CSVかExcelで用意する', '日付と金額（件数）の列を選んで集計する', 'Excelで保存して、毎月同じ形で見る']),
        M(id + '-sheet', 'sheet', '日報シートと月の集計（関数で自動合計）', 0.45,
          ['追加費用なし', '1日の入力が数分で済む'], ['毎日の入力が必要'],
          ['日付・売上・件数などの列で日報シートを作る', '月ごと・曜日ごとの合計を関数で出す', '前の月とくらべるグラフを作る']),
        RULE(id, '締めの手順と見る数字を決める', ['集計の迷いが減る'],
          ['終業後の締めの手順を書き出す', '毎日見る数字を3つに決める', '月に1回ふり返る日を決める'])
      ]);
  }
  function recordTask(id, name, ind, kw, items, note) {
    return TASK(id, name, ind, '中', 'daily', 15,
      ['日報', '記録', '報告', '作業報告', 'チェックリスト', '点検'].concat(kw),
      [
        M(id + '-gform', 'gform', 'スマホのGoogleフォームで記録し、表に自動でためる', 0.5,
          ['その場でスマホから入力できる', '記録が自動で表にたまる'], ['項目を決める手間がある'],
          ['記録する項目（' + items + '）を決める', 'Googleフォームを作り、回答の保存先にスプレッドシートを選ぶ', 'スタッフのスマホにフォームのリンクを共有する', '週に1回、表を見て抜けがないか確かめる']),
        M(id + '-sheet', 'sheet', '記録のひな形を表計算で作る', 0.3,
          ['追加費用なし'], ['入力と転記の手間は残る'],
          ['記録の項目を1行1件の表にする', '選ぶ項目はプルダウンにする', '月ごとの集計を関数で出す']),
        RULE(id, '記録の項目と書く時間を決める', ['書きもれが減る'],
          ['記録の項目を最小限にしぼる', '書くタイミング（作業の直後など）を決める', '確認する人を決める'])
      ], note);
  }
  function scheduleTask(id, name, ind, kw) {
    return TASK(id, name, ind, '中', 'weekly', 60,
      ['予定', '予定表', 'スケジュール', '段取り', '割り当て'].concat(kw),
      [
        M(id + '-sheet', 'sheet', '予定表のひな形（日付×人・現場・案件の色分け）', 0.4,
          ['追加費用なし', '重なりや空きが見える'], ['変更のたびに更新が必要'],
          ['行に人（または現場・案件）、列に日付を並べた表を作る', '種類ごとに色を決める', '共有の方法（印刷・PDF・共有フォルダ）を決める', '変更したら日付と変更者を書く']),
        M(id + '-cloud', 'cloud', '予定・案件管理のクラウドサービス', 0.55,
          ['スマホで最新の予定を見られるものがある'], ['費用がかかることが多い'],
          ['今の予定の決め方と、困っていること（重なり・連絡もれ）を書き出す', '試せる期間があれば少人数で試す', '費用とデータの扱いを確かめる']),
        RULE(id, '予定を決める日と連絡の方法を決める', ['連絡もれが減る'],
          ['予定を確定する曜日を決める', '変更の連絡方法を1つにする', '前日に翌日の予定を見直す'])
      ]);
  }
  function mailAllTask(id, name, ind, kw, who) {
    return TASK(id, name, ind, '中', 'monthly', 60,
      ['一斉送信', 'お知らせ', '連絡', 'メール', '連絡網', '配信'].concat(kw),
      [
        M(id + '-gas', 'gas', 'Apps Scriptで、名簿の宛先に差し込みメールを送る', 0.7,
          ['名前などを差しかえて、まとめて送れる'], ['スクリプトを書く・直す人が必要', '個人のGoogleアカウントは宛先が1日100件まで'],
          ['宛先・名前などの表を作る（' + who + '）', '本文のひな形（{名前} などの差しかえ場所つき）を決める', '1行ずつメールを作って送る処理を書く', '自分あてに送って文面を確かめる']),
        M(id + '-pacloud', 'pacloud', 'クラウドフローで、名簿をもとにメールを送る', 0.65,
          ['Outlook と Excel の表で送れる'], ['職場または学校のアカウントが必要'],
          ['OneDrive に名簿の表（Excelのテーブル）を置く', 'Power Automate で、表の行ごとにメールを送るフローを作る', '自分あてで試してから本番にする']),
        M(id + '-text', 'text', 'お知らせのひな形を定型文にする', 0.3,
          ['追加費用なし'], ['送る手間は残る'],
          ['よく出すお知らせ（行事・休み・集金など）のひな形を作る', TEXT_REG, '宛先の名簿を1つにまとめておく']),
        M(id + '-cloud', 'cloud', '連絡配信の機能があるクラウドサービス', 0.6,
          ['既読の確認などができるものがある'], ['費用がかかることが多い'],
          ['今の連絡方法（メール・手紙・メッセージ）を書き出す', '試せる期間があれば一部で試す', '費用とデータの扱いを確かめる'])
      ]);
  }

  var NEW_TASKS = [
    /* ===== サービス業で共通 ===== */
    TASK('svc-reserve', '予約の受付と管理', ['food', 'beauty', 'clinic', 'pet', 'gym', 'photo', 'car'], '中', 'daily', 20,
      ['予約', '予約受付', '予約管理', '予約台帳', '電話予約', 'キャンセル', 'ダブルブッキング', '空き状況'],
      [
        M('svc-reserve-cloud', 'cloud', '予約受付のクラウドサービス（Web予約・空き枠の表示）', 0.6,
          ['電話の受付が減る', 'お客さんが空き枠から選べる'], ['費用や手数料がかかることが多い', '電話予約との二重管理に注意が必要'],
          ['予約の受け方（電話・Web・メッセージ）ごとの件数を数える', 'Web予約の機能があるサービスを比べる（今の予約台帳から移せるか）', '試せる期間があれば一部のメニューで試す', '費用とデータの扱いを確かめる']),
        M('svc-reserve-gform', 'gform', 'Googleフォームで予約の申し込みを受け、表にためる', 0.35,
          ['追加費用なし', '申し込みが自動で表に入る'], ['空き枠の自動表示はできない（確定の連絡は手で行う）', '健康に関する情報などは聞かない作りにする'],
          ['予約で聞く項目（名前・連絡先・希望日時・メニュー）を決める', 'Googleフォームを作り、回答の保存先にスプレッドシートを選ぶ', '表に「確定」「連絡済み」の列を足す', 'テストで申し込んで、表に入るか確かめる']),
        M('svc-reserve-text', 'text', '予約確認・変更の返信を定型文にする', 0.3,
          ['追加費用なし', '数分で始められる'], ['受付の手間は残る'],
          ['予約確認・変更・キャンセルの返信文を1つずつ作る', TEXT_REG, '日時は「月日（曜日）時刻」の形でそろえる']),
        RULE('svc-reserve', '予約台帳を1つにまとめる', ['ダブルブッキングが減る'],
          ['紙・カレンダー・メッセージに分かれた予約を、1つの台帳にまとめる', '予約を受けたらすぐ台帳に書くルールにする', '前日に翌日の予約を見直す時間を決める'])
      ]),
    shiftTask('svc-shift', ['retail', 'food', 'beauty', 'care', 'clinic', 'hotel', 'logistics', 'security', 'cleaning', 'nursery', 'gym', 'direct', 'moving', 'recycle', 'factory', 'pet']),
    stockTask('svc-stock', '在庫・消耗品の発注と記録', ['food', 'beauty', 'clinic', 'care', 'hotel', 'pet', 'nursery', 'gym', 'cleaning', 'car'], false, ['店販', '物販', '仕入れ記録', '部品']),
    salesTask('svc-sales', '売上日報の集計', ['food', 'beauty', 'pet', 'gym', 'photo', 'recycle', 'direct', 'car', 'clinic'], ['レジ', 'pos', '来院数', '来店数'], 'レジや予約のシステムから書き出したデータ（日付・金額・件数）'),
    replyTask('svc-reply', '問い合わせ・口コミ返信の定型化', ['retail', 'pro', 'food', 'beauty', 'hotel', 'clinic', 'pet', 'gym', 'photo', 'car', 'moving', 'event', 'funeral', 'recycle', 'it', 'printing', 'insurance', 'freelance', 'gyosei'],
      ['口コミ', 'レビュー', 'お礼', '見積もり返信'], 'お問い合わせへのお礼・よくある質問への答え・口コミへのお礼'),
    TASK('svc-repeat', '来店・リピートの分析', ['retail', 'food', 'beauty', 'pet', 'gym', 'photo', 'car'], '中', 'monthly', 60,
      ['リピート', '再来', '来店', '顧客分析', '常連', '来店周期', '休眠', '離反'],
      [
        TOOL('svc-repeat-tool', 'CustomerLens', 0.6,
          ['予約・レジのデータから、お客さんを「優良」「離れそう」などに分け、リピート率を出す'], ['買い切りの費用がかかる', 'お客さんを見分けられる列（会員番号など）がデータに必要'],
          ['体験版のサンプルで試す', '予約やレジのシステムから、来店（注文）の一覧をCSVで書き出す', 'お客さん・日付・金額の列を確かめて分析する', '「離れそう」のグループへの案内を考える（送るときは相手の同意に注意）']),
        M('svc-repeat-sheet', 'sheet', '来店記録から、前回の来店日と回数を関数で出す', 0.4,
          ['追加費用なし'], ['データの形をそろえる手間がある'],
          ['来店の一覧（お客さん・日付）を1枚のシートにまとめる', 'お客さんごとの最後の来店日と回数を関数で出す', '最後の来店から日数がたった人に色を付ける']),
        RULE('svc-repeat', 'ご案内のタイミングを決める', ['来店のきっかけを作りやすい'],
          ['次回のご案内をする目安の時期を決める', '会計のときに次回の予約を聞く', '案内の文面を用意する'])
      ]),
    TASK('svc-karte', '顧客カルテ・来店履歴', ['beauty', 'pet', 'gym'], '中', 'daily', 15,
      ['カルテ', '顧客カルテ', '来店履歴', '施術', '施術履歴', 'お客様情報', '顧客台帳', '利用履歴'],
      [
        M('svc-karte-sheet', 'sheet', 'カルテ台帳（お客さん×来店日×内容）', 0.4,
          ['追加費用なし', '前回の内容をすぐ見られる'], ['入力の手間は残る', '個人情報の扱い（保管場所・見られる人）を決める必要がある'],
          ['お客さん番号・来店日・内容・担当・メモの列で台帳を作る', 'お客さん番号で前回の来店を探せるようにする', '台帳を開ける人と保管場所を決める']),
        M('svc-karte-gform', 'gform', '来店ごとの記録をGoogleフォームで入力', 0.35,
          ['終わってすぐスマホで記録できる'], ['過去の記録を見る画面は表で工夫が必要', '共有の範囲に注意が必要'],
          ['記録の項目を選ぶ形のフォームにし、回答先をスプレッドシートにする', 'お客さん番号で並べかえ・絞り込みができるようにする', '共有できる人を限定する']),
        M('svc-karte-cloud', 'cloud', '顧客管理・カルテの機能がある予約サービス', 0.6,
          ['予約と来店履歴をまとめて見られるものがある'], ['費用がかかることが多い'],
          ['今のカルテの項目を書き出す', '移せるかどうかと、データの保管場所を確かめる', '試せる期間があれば試す']),
        RULE('svc-karte', 'カルテに書く項目をそろえる', ['スタッフが変わっても引き継げる'],
          ['書く項目と書き方の例を決める', '終わった直後に書くルールにする', '紙のカルテの保管場所を決める'])
      ]),
    TASK('svc-remind', '次回来店・時期のお知らせ', ['beauty', 'pet', 'car', 'photo'], '中', 'weekly', 30,
      ['お知らせ', 'リマインド', '次回', '車検', '点検時期', 'dm', 'はがき', '案内', '記念日'],
      [
        M('svc-remind-gas', 'gas', 'Apps Scriptで、時期が来た人にお知らせメールを送る', 0.7,
          ['時期の計算から送信までまとめて自動にできる'], ['スクリプトを書く・直す人が必要', '送る相手の同意に注意が必要'],
          ['お客さん・前回の日付・次のお知らせの目安日の表を作る', '目安日が来た行を探して、メールを作る処理を書く', '最初は自分あてに送って確かめる', '毎朝動くトリガーを設定する']),
        M('svc-remind-sheet', 'sheet', '次回の目安日を関数で出し、今月の対象に色を付ける', 0.4,
          ['追加費用なし'], ['送る作業は手で行う'],
          ['前回の日付から、次回の目安日を関数で出す', '目安日が今月の人に色を付ける', '月はじめに対象の人を確かめて連絡する']),
        TOOL('svc-remind-label', 'LabelMaker', 0.3,
          ['はがきやDMの宛名を、名簿からまとめてラベル印刷できる'], ['買い切りの費用がかかる', '対象の人を選ぶのは表で行う'],
          ['体験版のサンプル名簿で試す', '今月お知らせする人の名簿をCSVかExcelで用意する', '枠線だけ試し刷りしてから、ラベル用紙に印刷する']),
        M('svc-remind-text', 'text', 'お知らせの文面を定型文にする', 0.25,
          ['追加費用なし'], ['対象の人を探す手間は残る'],
          ['お知らせの文面のひな形を作る', TEXT_REG, '送ったら日付を記録する'])
      ]),

    /* ===== 建築・土木・造園・清掃 ===== */
    TASK('site-estimate', '見積書・積算の作成', ['construction', 'civil', 'landscaping', 'cleaning', 'moving', 'printing', 'it', 'event', 'funeral', 'security', 'car'], '中', 'weekly', 90,
      ['見積', '見積書', '見積もり', '積算', '単価表', '拾い出し', '概算'],
      [
        M('site-estimate-sheet', 'sheet', '単価表つき見積書のひな形', 0.45,
          ['項目を選ぶと単価が入る', '追加費用なし'], ['単価表の手入れが必要'],
          ['よく使う項目と単価の表を作る', '見積書のひな形で、項目を選ぶと単価が入るように検索関数を設定する', '数量×単価・小計・消費税・合計を自動で出す', '見積番号と保存場所のルールを決める']),
        M('site-estimate-vba', 'vba', 'Excelマクロで見積書のPDF保存と台帳への記録', 0.55,
          ['保存と記録を1回の操作でできる'], ['VBAを書く・直す人が必要'],
          ['見積書のひな形と見積台帳のシートを用意する', 'マクロの記録で「PDFで保存」の操作を記録する', '台帳に番号・相手・金額を書き足す処理を加える', 'テスト用のフォルダで試す']),
        M('site-estimate-cloud', 'cloud', '見積の機能がある業種向けのクラウドサービス', 0.6,
          ['見積から請求まで続けて扱えるものがある'], ['費用がかかることが多い'],
          ['今の見積から請求までの流れを書き出す', '試せる期間があれば数件で試す', '費用とデータの扱いを確かめる']),
        RULE('site-estimate', '見積のひな形と単価表を最新の1つにする', ['古い単価の使いまわしを防げる'],
          ['単価表の更新日を決めて表に書く', '見積書のひな形を1つに決める', '控えの保存場所を決める'])
      ]),
    scheduleTask('site-schedule', '工程表・現場スケジュール', ['construction', 'civil', 'landscaping', 'cleaning', 'event', 'moving'], ['工程', '工程表', '現場', '職人', '手配', '日程']),
    TASK('site-photo', '現場写真の整理と台帳', ['construction', 'civil', 'landscaping', 'cleaning', 'car'], '中', 'daily', 20,
      ['写真', '現場写真', '工事写真', '写真整理', '施工写真', '写真台帳', 'ビフォーアフター', 'フォルダ'],
      [
        M('site-photo-gdrive', 'gdrive', '現場ごとの共有フォルダに、スマホから写真をアップロード', 0.5,
          ['スマホのGoogleドライブアプリから、決めたフォルダに上げられる', '事務所ですぐ見られる'], ['アップロードした分、Googleドライブの容量を使う', 'フォルダ名のルールを決める必要がある'],
          ['「番号_現場名」の形で現場ごとのフォルダを作る', 'スタッフのスマホにGoogleドライブのアプリを入れ、フォルダを共有する', '撮ったらその日のうちに、現場のフォルダへアップロードする', '工程ごとのサブフォルダ（作業前・作業中・完了）を作る']),
        M('site-photo-pad', 'pad', 'Power Automate for desktop で、写真を日付ごとのフォルダに振り分け', 0.45,
          ['Microsoft アカウントなら追加料金なし', 'パソコンに取り込んだ写真をまとめて仕分けられる'], ['Windows のアプリなので Mac では使えない'],
          ['写真を取り込むフォルダと、振り分け先のフォルダの形を決める', 'ファイルの日付ごとにフォルダへ移すフローを作る', 'コピーしたフォルダで試し、元の写真は残しておく']),
        M('site-photo-cloud', 'cloud', '写真整理・写真台帳の機能があるクラウドサービス', 0.6,
          ['撮影と同時に工程ごとに整理できるものがある'], ['費用がかかることが多い'],
          ['写真で困っていること（探せない・台帳づくり）を書き出す', '試せる期間があれば1現場で試す', '費用とデータの扱いを確かめる']),
        RULE('site-photo', 'フォルダ名とファイル名のルールを決める', ['探す時間が減る'],
          ['フォルダ名（番号_現場名）を決める', '撮ったその日に移す担当を決める', '工程ごとに撮る写真の一覧を作る'])
      ]),
    recordTask('site-report', '日報・作業報告', ['construction', 'civil', 'landscaping', 'cleaning', 'security', 'moving'], ['作業日報', '現場', '職人', '巡回報告'], '日付・現場・作業内容・人数・時間'),
    TASK('site-material', '資材・材料の発注記録', ['construction', 'civil', 'landscaping', 'printing', 'farm', 'fishery'], '中', 'weekly', 30,
      ['資材', '材料', '発注', '仕入れ', '肥料', '燃料', '用紙', '発注書'],
      [
        M('site-material-sheet', 'sheet', '発注台帳（発注日・納品日・現場や用途ごとの合計）', 0.45,
          ['追加費用なし', '現場（用途）ごとの材料費が分かる'], ['記入の手間は残る'],
          ['発注日・取引先・品名・数量・金額・現場（用途）の列で台帳を作る', '納品日が空のまま予定日を過ぎた行に色を付ける', '現場（用途）ごとの合計を関数で出す']),
        M('site-material-gform', 'gform', 'スマホのGoogleフォームで発注・受け取りを記録', 0.4,
          ['現場からその場で記録できる'], ['フォームの項目を決める手間がある'],
          ['品名や現場を選ぶ形のフォームを作り、回答先をスプレッドシートにする', '発注したとき・受け取ったときに記録する', '月末に取引先ごとに合計して請求書と見比べる']),
        RULE('site-material', '発注する人と発注書の形を決める', ['二重発注が減る'],
          ['発注できる人を決める', '発注書のひな形を1つにする', '控えを保存する場所を決める'])
      ]),
    TASK('site-sub', '職人・外注の手配と支払い', ['construction', 'civil', 'landscaping', 'event', 'it', 'printing', 'ad', 'funeral', 'moving'], '中', 'weekly', 45,
      ['外注', '手配', '協力会社', '下請け', '職人', '支払い', '発注', '業務委託'],
      [
        M('site-sub-sheet', 'sheet', '外注台帳（手配・発注額・請求受け取り・支払日）', 0.45,
          ['追加費用なし', '支払いもれが減る'], ['記入の手間は残る'],
          ['外注先・案件・発注日・金額・請求書の受け取り日・支払日の列で台帳を作る', '支払予定日が近いものに色を付ける', '外注先ごとの月の合計を関数で出す']),
        M('site-sub-text', 'text', '手配・発注の連絡文を定型文にする', 0.3,
          ['追加費用なし', '伝えもれが減る'], ['手配の調整は残る'],
          ['手配の連絡に入れる項目（日時・場所・内容・金額）を決める', TEXT_REG, '送った連絡の控えを残す']),
        M('site-sub-cloud', 'cloud', '発注・支払い管理のクラウドサービス', 0.55,
          ['発注から支払いまで記録を残せるものがある'], ['費用がかかることが多い'],
          ['外注の件数と困りごとを書き出す', '試せる期間があれば試す', '費用とデータの扱いを確かめる']),
        RULE('site-sub', '発注の書面と支払日のルールを決める', ['行き違いが減る'],
          ['発注のときに書面（メールでもよい）で内容を残す', '支払日を決めて外注先に伝える', '請求書の受け取り方を決める'])
      ]),
    recordTask('site-check', '作業前点検・チェックリスト（安全書類の準備を含む）', ['construction', 'civil', 'landscaping', 'cleaning', 'factory', 'logistics'], ['安全', '点検', 'ky', '危険予知', '安全書類', 'グリーンファイル', '車両点検', '始業点検'],
      '日付・現場・点検した人・点検項目ごとの結果',
      '安全に関する書類や点検の内容は、法令や元請け・発注者のルールに従ってください。ここでは記録と転記の手間を減らす方法だけを扱います。'),
    billTask('site-bill', '請求と出来高の管理', ['construction', 'civil', 'landscaping'], ['出来高', '工事代金', '中間金', '最終金']),
    TASK('staff-training', '研修・資格の期限管理', ['care', 'security', 'nursery', 'construction', 'civil', 'cleaning', 'logistics'], '高', 'monthly', 30,
      ['研修', '資格', '免許', '期限', '更新', '受講', '講習', '研修記録'],
      [
        M('staff-training-sheet', 'sheet', '人×研修・資格の一覧（期限が近いものに色）', 0.5,
          ['追加費用なし'], ['期限の入力は手で行う'],
          ['人・研修（資格）・受講日・期限の列で一覧を作る', '期限まで60日を切ったら色が付くようにする', '毎月はじめに一覧を見る日を決める']),
        M('staff-training-gas', 'gas', 'Apps Scriptで、期限が近いものを毎朝メールで知らせる', 0.6,
          ['見に行かなくても気づける'], ['スクリプトを書く・直す人が必要'],
          ['一覧をスプレッドシートで作る', '期限まで60日以内の行を探す処理を書く', '毎朝動くトリガーと、担当あてのメールを設定する']),
        M('staff-training-pacloud', 'pacloud', 'クラウドフローで、期限の近いものを知らせる', 0.55,
          ['Outlook と Excel で動かせる'], ['職場または学校のアカウントが必要'],
          ['一覧を OneDrive の Excel のテーブルにする', '毎週動くフローで、期限が近い行を探してメールする', '自分あてで試す']),
        RULE('staff-training', '研修の予定を年のはじめに決める', ['受けもれが減る'],
          ['1年分の研修の予定を決める', '受講したら一覧に記録する担当を決める', '半年に1回、資格の期限を見直す'])
      ]),
    TASK('land-annual', '年間管理（剪定・消毒の時期）と顧客台帳', ['landscaping'], '中', 'monthly', 60,
      ['剪定', '消毒', '年間管理', '顧客台帳', '庭', '植木', '定期管理', '草刈り'],
      [
        M('land-annual-sheet', 'sheet', '顧客×作業×月の年間表（今月の作業に色）', 0.5,
          ['追加費用なし', '今月まわる先がひと目で分かる'], ['作業の時期は庭ごとに決める必要がある'],
          ['お客さん・住所・作業（剪定・消毒など）・予定の月の列で台帳を作る', '今月が予定の行に色を付ける', '終わったら実施日を入れ、次の予定月を書く']),
        M('land-annual-gas', 'gas', 'Apps Scriptで、時期が来たお客さんの一覧を毎月メールで受け取る', 0.6,
          ['月のはじめに、連絡する先の一覧が届く'], ['スクリプトを書く・直す人が必要'],
          ['年間表をスプレッドシートで作る', '今月が予定の行を集めて、自分あてにメールする処理を書く', '月1回動くトリガーを設定する']),
        TOOL('land-annual-label', 'LabelMaker', 0.25,
          ['時期のお知らせのはがきの宛名を、名簿からまとめて印刷できる'], ['買い切りの費用がかかる'],
          ['体験版のサンプル名簿で試す', '今月お知らせする人の名簿を用意する', '試し刷りしてからラベル用紙に印刷する']),
        RULE('land-annual', '作業の時期を庭ごとに決めておく', ['連絡のもれが減る'],
          ['お客さんごとに、毎年の作業と時期を決める', '作業の終わりに次の時期を伝える', '月はじめに台帳を見る'])
      ]),

    /* ===== 物流 ===== */
    TASK('logi-route', '配車表・ルート表', ['logistics', 'moving'], '中', 'daily', 40,
      ['配車', '配送', 'ルート', '配送表', '車両', 'ドライバー', '便', '配車表'],
      [
        M('logi-route-sheet', 'sheet', '配車表のひな形（日付×車両×行き先）', 0.4,
          ['追加費用なし', '車ごとの件数や量を関数で合計できる'], ['ルートの順番は人が考える'],
          ['行き先の一覧（住所・時間指定・荷物）を表にする', '車両ごとに割り当てる列を作り、件数と量を合計する', '積める量を超えたら色が付くようにする', '印刷して運転者に渡す形を決める']),
        M('logi-route-cloud', 'cloud', '配車・ルート作成の機能があるクラウドサービス', 0.6,
          ['行き先からルートの順番を提案するものがある'], ['費用がかかることが多い'],
          ['1日の件数と、配車にかかる時間を書き出す', '試せる期間があれば数日分で試す', '費用とデータの扱いを確かめる']),
        RULE('logi-route', '受付の締め切りと配車の決め方をそろえる', ['作り直しが減る'],
          ['当日便の受付の締め切りを決める', 'エリアごとの担当の基本を決める', '前日に翌日の配車を確定する'])
      ]),
    recordTask('logi-inout', '出荷・入荷の記録', ['logistics'], ['出荷', '入荷', '入出庫', '検品', '倉庫'], '日付・荷主・品番・数量・入荷か出荷か'),
    TASK('logi-location', '在庫ロケーション管理', ['logistics'], '中', 'daily', 30,
      ['ロケーション', '棚番', '置き場所', '在庫', '倉庫', 'ピッキング', '棚卸'],
      [
        M('logi-location-sheet', 'sheet', '品番×棚番の一覧（検索で置き場所を出す）', 0.4,
          ['追加費用なし', '品番から棚番をすぐ探せる'], ['移動のたびに更新が必要'],
          ['品番・品名・棚番・数量の列で一覧を作る', '品番を入れると棚番が出る検索欄を作る', '棚を移したら更新するルールにする']),
        TOOL('logi-location-qr', 'QRBatch', 0.3,
          ['棚番や品番の一覧から、QRコードのラベルをまとめて印刷できる'], ['買い切りの費用がかかる', '読み取ったあとの記録の仕組みは別に用意する'],
          ['体験版のサンプルで試す', '棚番の一覧をCSVかExcelで用意する', 'QRの下に棚番を印刷して棚に貼る', 'スマホで読み取れるか何枚か試す']),
        M('logi-location-cloud', 'cloud', '在庫・倉庫管理のクラウドサービス', 0.6,
          ['入出荷と置き場所をまとめて管理できるものがある'], ['費用がかかることが多い'],
          ['品目数と1日の入出荷の件数を書き出す', '試せる期間があれば一部の棚で試す', '費用とデータの扱いを確かめる']),
        RULE('logi-location', '棚番の付け方と戻し方を決める', ['探す時間が減る'],
          ['棚番の付け方（列-段-番号など）を決めて表示する', '空いた棚に入れたら一覧に書くルールにする', '月に1回、一覧と実物を見比べる'])
      ]),
    recordTask('logi-report', '運転日報の集計', ['logistics'], ['運転日報', '走行距離', '配送実績', '乗務'], '日付・車両・運転者・走行距離・配送件数',
      '運転や勤務の記録で決まりがあるものは、所管の行政機関や専門家の案内に従ってください。ここでは集計や転記の手間を減らす方法だけを扱います。'),
    TASK('logi-label', '送り状・ラベル作成', ['logistics', 'direct', 'farm', 'fishery'], '高', 'daily', 20,
      ['荷札', 'ラベル', '宛名', '送り状', '伝票', '仕分け', '出荷ラベル'],
      [
        TOOL('logi-label-tool', 'LabelMaker', 0.5,
          ['届け先の一覧から宛名ラベルをまとめて印刷できる'], ['買い切りの費用がかかる', '配送会社の送り状そのものは作らない'],
          ['体験版のサンプル名簿で試す', '届け先の一覧（郵便番号・住所・名前）をCSVかExcelで用意する', '枠線だけ試し刷りしてずれを直す', 'ラベル用紙に印刷する']),
        TOOL('logi-label-qr', 'QRBatch', 0.3,
          ['荷物の番号などをQRコードにして、まとめて印刷できる'], ['買い切りの費用がかかる', '読み取ったあとの記録の仕組みは別に用意する'],
          ['体験版のサンプルで試す', '荷物の番号の一覧を用意する', 'QRの下に番号と行き先を印刷する', 'スマホで読み取れるか何枚か試す']),
        M('logi-label-sheet', 'sheet', '届け先の一覧を、配送サービスの取り込み形式に並べかえる', 0.45,
          ['追加費用なし'], ['取り込みの形式に合わせる式が必要'],
          ['使っている配送サービスがCSVの取り込みに対応しているか確かめる', '取り込み用の列の順番に並べかえるシートを作る', 'CSVで保存して取り込む']),
        RULE('logi-label', '届け先の一覧を1つにまとめる', ['印刷前の準備が減る'],
          ['届け先の一覧を1つのファイルにまとめる', '住所の書き方をそろえる', '印刷した分に印を付ける'])
      ]),

    /* ===== ホテル・旅館 ===== */
    TASK('hotel-book', '予約台帳の一元管理', ['hotel'], '中', 'daily', 20,
      ['宿泊予約', '予約台帳', '予約サイト', 'ダブルブッキング', 'ota', '部屋割り', 'チェックイン', '一元管理'],
      [
        M('hotel-book-sheet', 'sheet', '予約台帳（日付×部屋の表で重なりに色）', 0.35,
          ['追加費用なし', '重なりがひと目で分かる'], ['予約サイトごとの転記は手で行う'],
          ['予約の一覧（受付日・予約元・部屋・チェックイン・人数）を作る', '日付×部屋の表で、同じ枠に2件入ったら色が付くようにする', '予約が入ったらすぐ台帳に書くルールにする', '毎朝、今日と明日の予約を確かめる']),
        M('hotel-book-cloud', 'cloud', '複数の予約サイトの空室をまとめる予約管理サービス', 0.65,
          ['予約サイトごとの空室をまとめて管理できるものがある'], ['費用がかかることが多い', '使っている予約サイトとつながるか確かめる必要がある'],
          ['使っている予約サイトと、月の予約件数を書き出す', 'つながる予約サイトと費用を比べる', '試せる期間があれば試す', 'データの扱いと解約の方法を確かめる']),
        RULE('hotel-book', '予約を受ける窓口と確認の時間を決める', ['ダブルブッキングが減る'],
          ['予約を受ける窓口（サイト・電話・メール）を書き出す', '確認する時間を1日2回に決める', '予約が入ったら他のサイトの空室を閉じる手順を書く'])
      ]),
    recordTask('hotel-clean', '清掃・客室チェック', ['hotel'], ['清掃', '客室', 'リネン', '備品', 'アメニティ', 'ハウスキーピング'], '日付・部屋・清掃者・チェック項目・補充したもの'),
    TASK('hotel-guests', '宿泊者名簿の整理', ['hotel'], '中', 'daily', 15,
      ['宿泊者名簿', '名簿', 'チェックイン', '宿泊者', '台帳', '記入'],
      [
        M('hotel-guests-sheet', 'sheet', '名簿の台帳（予約番号で予約台帳とつなぐ）', 0.35,
          ['追加費用なし', '予約と名簿を見比べやすい'], ['保管の場所と見られる人を決める必要がある'],
          ['名簿に書く項目を、自治体などの案内で確かめて列にする', '予約番号で予約台帳とつなぐ', '保管する場所と、開ける人を決める']),
        M('hotel-guests-gform', 'gform', 'チェックイン前にGoogleフォームで記入してもらう', 0.45,
          ['到着前に記入が済み、受付が短くなる'], ['個人情報を扱うので、共有の範囲と保存のしかたに注意が必要'],
          ['記入してもらう項目を決め、フォームを作る（回答先はスプレッドシート）', '予約確認のメッセージにフォームのリンクを入れる', '共有できる人を限定する']),
        RULE('hotel-guests', '記入の手順と保管のルールを決める', ['記入もれが減る'],
          ['チェックインのときに記入をお願いする手順を決める', '書きもれを確かめる人を決める', '保管の場所と期間のルールを決める'])
      ], '宿泊者名簿に書く項目や保存のしかたは、自治体・保健所などの案内で確認してください。'),
    replyTask('hotel-guide', '宿泊者への案内メッセージの定型化', ['hotel'], ['チェックイン', '道順', 'ハウスルール', 'wi-fi', '案内'], '予約のお礼・チェックインの案内・道順とハウスルール'),
    salesTask('hotel-occ', '売上・稼働率の集計', ['hotel'], ['稼働率', '客室', '宿泊数', '予約サイト別', '単価'], '予約台帳や予約サイトから書き出したデータ（日付・部屋・金額）'),

    /* ===== 医療・福祉・教育 ===== */
    TASK('care-transport', '送迎表の作成', ['care', 'nursery'], '中', 'daily', 30,
      ['送迎', '送迎表', '送迎ルート', '車', '運転', '迎え', 'バス'],
      [
        M('care-transport-sheet', 'sheet', '送迎表のひな形（曜日×車×利用者番号）', 0.4,
          ['追加費用なし', '曜日ごとの基本パターンを使い回せる'], ['休みや変更のたびに直す必要がある'],
          ['曜日ごとの基本の送迎パターンを表にする（名前ではなく番号でもよい）', '休み・変更を入れる欄を作る', '車ごとの人数を関数で数え、定員を超えたら色を付ける', '印刷して運転者に渡す形を決める']),
        M('care-transport-cloud', 'cloud', '送迎表の作成機能があるクラウドサービス', 0.6,
          ['ルートや順番の作成を助けるものがある'], ['費用がかかることが多い', '利用者の情報の扱いを確かめる必要がある'],
          ['今の送迎表づくりにかかる時間と困りごとを書き出す', '情報の保管場所と、事業所の規程に合うかを確かめる', '試せる期間があれば試す']),
        RULE('care-transport', '変更の連絡の締め切りを決める', ['作り直しが減る'],
          ['送迎の変更を受け付ける締め切りを決める', '変更の連絡先を1つにする', '前日に翌日の送迎表を見直す'])
      ]),
    replyTask('care-family', 'ご家族・関係先への連絡の定型化', ['care', 'nursery'], ['家族', '保護者', '連絡帳', '行事', '持ち物'], '行事のお知らせ・持ち物のお願い・日程の確認'),
    TASK('mem-fee', '月謝・会費の請求と入金確認', ['school', 'gym', 'nursery', 'npo', 'community'], '高', 'monthly', 120,
      ['月謝', '会費', '受講料', '利用料', '集金', '入金確認', '未納', '引き落とし', '請求'],
      [
        TOOL('mem-fee-tool', 'InvoiceBatch', 0.6,
          ['名簿と金額の一覧から、相手ごとの請求書をまとめて作れる'], ['買い切りの費用がかかる', '入金の確認は別に行う'],
          ['体験版のサンプルで試す', '今月の請求を「相手・品目・数量・単価」の表にする', '請求書を作り、金額を見比べてから渡す']),
        TOOL('mem-fee-tool2', 'NyukinCheck', 0.6,
          ['請求の一覧と通帳の明細を突き合わせ、未納を一覧にできる'], ['買い切りの費用がかかる', '振込で受け取っていることが前提'],
          ['体験版のサンプルで試す', 'ネットバンキングから入出金明細をCSVで保存する', '請求の一覧と一緒に入れて消込する', '未納の人だけに連絡する']),
        M('mem-fee-sheet', 'sheet', '会員×月の入金表（未納に色）', 0.45,
          ['追加費用なし', '未納がひと目で分かる'], ['入金の記入は手で行う'],
          ['行に会員、列に月を並べた入金表を作る', '入金したら日付を入れ、締め日を過ぎた空欄に色を付ける', '月の合計を関数で出す']),
        M('mem-fee-cloud', 'cloud', '月謝・会費の集金（口座振替など）のクラウドサービス', 0.7,
          ['集金と入金の確認を自動にできるものがある'], ['費用や手数料がかかることが多い'],
          ['今の集金方法（現金・振込）と件数を書き出す', '手数料と、会員の手続きの手間を確かめる', '費用とデータの扱いを確かめる']),
        RULE('mem-fee', '集金日と未納の連絡のしかたを決める', ['未納の連絡が早くなる'],
          ['集金日（振込の期限）を毎月同じにする', '受け取ったらその日に記録する', '未納の人への連絡の文面と時期を決める'])
      ]),
    recordTask('mem-attend', '出欠・利用の記録', ['school', 'nursery', 'gym', 'event', 'npo', 'community'], ['出欠', '出席', '欠席', '振替', '出席簿', '登降園', '来館', '受付', '参加者'], '日付・クラス（行事）・番号・出欠'),
    mailAllTask('mem-notice', 'お知らせの一斉送信（会員・保護者・お客さん）', ['school', 'nursery', 'npo', 'community', 'gym', 'insurance', 'direct'], ['保護者', '会員', '休講', '行事', '出荷者'], '保護者・会員・出荷者などの宛先'),
    TASK('mem-roster', '名簿の管理（入会・退会・更新）', ['npo', 'community', 'gym', 'school', 'insurance'], '中', 'monthly', 60,
      ['名簿', '会員名簿', '入会', '退会', '更新', '会員管理', '住所録', '顧客台帳'],
      [
        M('mem-roster-gform', 'gform', '入会・変更の届けをGoogleフォームで受ける', 0.45,
          ['届けが自動で表に入る', '追加費用なし'], ['名簿への反映は手で確かめる'],
          ['入会・住所変更・退会の届けの項目を決める', 'Googleフォームを作り、回答先をスプレッドシートにする', '届けを名簿に反映したら印を付ける']),
        TOOL('mem-roster-tool', 'DataClean', 0.5,
          ['名簿の電話番号・郵便番号などの書き方をそろえ、重複を整理できる'], ['買い切りの費用がかかる', '同じ人かどうかの最終判断は人が行う'],
          ['体験版のサンプルで試す', '名簿のコピーを用意する', '列ごとの整え方を確かめて整える', '要確認のセルだけを直して保存する']),
        M('mem-roster-sheet', 'sheet', '名簿の表（状態・更新日の列と入力規則）', 0.35,
          ['追加費用なし'], ['更新の手間は残る'],
          ['番号・名前・連絡先・状態（在籍・退会）・更新日の列で名簿を作る', '状態はプルダウンで選ぶ', '退会した人は消さずに状態を変える']),
        RULE('mem-roster', '名簿を1つにして、見られる人を決める', ['古い名簿の使いまわしが減る'],
          ['名簿を1つのファイルにまとめる', '更新する人と、見られる人を決める', '年に1回、届けをもとに見直す'])
      ]),
    scheduleTask('mem-schedule', '時間割・振替・レッスン枠の管理', ['school', 'gym'], ['時間割', '振替', 'クラス', '講師', 'レッスン', '枠']),

    /* ===== 専門職・士業 ===== */
    TASK('tax-prep', '顧問先の明細から仕訳の下準備', ['tax'], '高', 'monthly', 180,
      ['顧問先', '記帳代行', '仕訳', '明細', '通帳', 'カード明細', '入力代行'],
      [
        TOOL('tax-prep-tool', 'KichoAuto', 0.6,
          ['カード・銀行の明細から、キーワードで勘定科目を振り分けた仕訳帳を作れる', '振り分けのキーワードを設定ファイルに保存できる'], ['買い切りの費用がかかる', '会計ソフトへの取り込みは、ソフト側の形式に合わせる必要がある'],
          ['体験版のサンプルで試す', '顧問先1社分の明細CSVを用意する', 'その顧問先のよく出るお店と科目を登録し、設定をファイルに保存する', '「要確認・未分類」だけを確かめて保存する']),
        M('tax-prep-sheet', 'sheet', '顧問先ごとのキーワード表で科目を自動で入れる', 0.45,
          ['追加費用なし'], ['明細の形をそろえる手間がある'],
          ['顧問先ごとに「言葉 → 科目」の対応表を作る', '明細を貼り、科目の列を関数で埋める', '空欄だけ手で入れ、対応表に足していく']),
        M('tax-prep-cloud', 'cloud', '明細の自動取り込みがある会計ソフト', 0.7,
          ['口座やカードと連携できるものがある'], ['費用がかかることが多い', '顧問先ごとの設定が必要'],
          ['顧問先が使っている会計ソフトを確かめる', '明細の取り込みと自動の仕訳のルールを設定する', '最初の月は全件を見直す']),
        RULE('tax-prep', '顧問先から受け取るデータの形を決める', ['受け取ってからの手間が減る'],
          ['明細はCSVで受け取るよう顧問先に頼む', '受け取りの締め日を決める', '顧問先ごとのフォルダを決める'])
      ]),
    TASK('sr-kintai', '顧問先の勤怠データの集計', ['sharoushi'], '高', 'monthly', 180,
      ['勤怠', 'タイムカード', '顧問先', '給与計算', '残業', '労働時間'],
      [
        TOOL('sr-kintai-tool', 'KintaiSum', 0.6,
          ['タイムカードのデータから、個人別の実働・時間外・深夜・法定休日を集計できる', '休憩不足などの注意も出る'], ['買い切りの費用がかかる', '割増賃金の計算や、規則に合っているかの判断はしない'],
          ['体験版のサンプルで試す', '顧問先1社分のタイムカードをCSV・Excelで受け取る', '所定労働時間と法定休日を顧問先に合わせて設定する', '注意の出た日を確かめ、Excelで保存する']),
        M('sr-kintai-sheet', 'sheet', '勤怠集計のひな形（顧問先ごとのシート）', 0.4,
          ['追加費用なし'], ['顧問先ごとにデータの形が違うと手間がかかる'],
          ['顧問先ごとに、勤怠データを貼るシートと集計のシートを作る', '実働と時間外を出す式を作る', '月の合計を一覧にする']),
        RULE('sr-kintai', '勤怠データの受け取り方をそろえる', ['受け取ってからの手間が減る'],
          ['勤怠データの形（列の並び）を顧問先にお願いする', '受け取りの締め日を決める', '受け取ったら受付の記録を残す'])
      ]),

    /* ===== 農林水産 ===== */
    recordTask('farm-log', '作業記録（圃場・作物ごと）', ['farm'], ['作業記録', '圃場', '畑', '栽培記録', '防除', '施肥', '収穫'], '日付・圃場・作物・作業・使った資材と量'),
    TASK('farm-ship', '出荷・販売の記録と集計', ['farm', 'fishery'], '高', 'daily', 20,
      ['出荷', '販売', '水揚げ', '出荷記録', '取引先', '市場', '直売', '集計', '魚種'],
      [
        M('farm-ship-gform', 'gform', 'スマホのGoogleフォームで出荷・販売を記録', 0.45,
          ['現場からその場で記録できる', '追加費用なし'], ['集計は表で作る'],
          ['品目（魚種）・取引先を選ぶ形のフォームを作り、回答先をスプレッドシートにする', '出荷のたびに数量と金額を記録する', '週に1回、抜けがないか確かめる']),
        TOOL('farm-ship-tool', 'DataLens', 0.55,
          ['記録の表から、品目別・取引先別・月別の集計とグラフを作れる'], ['買い切りの費用がかかる'],
          ['体験版のサンプルで試す', '出荷・販売の記録をCSVかExcelで用意する', '品目と取引先で集計し、グラフを保存する']),
        M('farm-ship-sheet', 'sheet', '出荷台帳とピボットテーブルで集計', 0.4,
          ['追加費用なし'], ['記入の手間は残る'],
          ['日付・品目・取引先・数量・金額の列で台帳を作る', 'ピボットテーブルで品目別・月別に集計する', '前の年と同じ月をくらべる']),
        RULE('farm-ship', '記録の項目と書く時間を決める', ['書きもれが減る'],
          ['記録する項目を最小限にする', '出荷したその日に書くルールにする', '月に1回ふり返る'])
      ]),
    TASK('direct-settle', '出荷者ごとの売上集計と精算', ['direct'], '高', 'monthly', 180,
      ['精算', '出荷者', '委託', '手数料', '売上集計', 'レジ', '生産者', '支払い'],
      [
        TOOL('direct-settle-tool', 'DataLens', 0.6,
          ['レジのデータから、出荷者別・月別の売上の集計表を作れる'], ['買い切りの費用がかかる', '手数料の計算や精算書の作成は表計算で行う'],
          ['体験版のサンプルで試す', 'レジから1か月分の売上をCSVで書き出す（出荷者がわかる列があること）', '出荷者ごとに金額を集計し、Excelで保存する', '保存した表で手数料と支払額を計算する']),
        M('direct-settle-sheet', 'sheet', '出荷者別の集計と精算書のひな形', 0.5,
          ['追加費用なし'], ['データの形をそろえる手間がある'],
          ['レジのデータを貼るシートを作る', '出荷者ごとの売上を関数（SUMIF など）で集計する', '手数料と支払額を計算し、精算書のひな形に転記する']),
        M('direct-settle-vba', 'vba', 'Excelマクロで、出荷者ごとの精算書をまとめて作る', 0.7,
          ['人数が多くても1回の操作で作れる'], ['VBAを書く・直す人が必要'],
          ['集計表と精算書のひな形を用意する', '1人分の精算書を作ってPDFにする操作を記録する', '出荷者の人数だけくり返すように直す', 'テスト用のフォルダで試す']),
        RULE('direct-settle', '精算の締め日と手順を決める', ['問い合わせが減る'],
          ['締め日と支払日を決めて出荷者に伝える', '精算の手順を書き出す', '精算書の控えを残す'])
      ]),

    /* ===== 製造・制作・IT ===== */
    stockTask('factory-parts', '在庫・部品の管理', ['factory'], true, ['部品', '品番', '仕掛品']),
    recordTask('factory-report', '日報・作業報告（生産数）', ['factory'], ['生産', '生産数', '不良', '作業日報', 'ライン'], '日付・品番・生産数・不良数・作業時間'),
    TASK('factory-data', '生産・不良データの集計', ['factory'], '高', 'weekly', 60,
      ['集計', '生産実績', '不良率', '歩留まり', 'グラフ', '品番別'],
      [
        TOOL('factory-data-tool', 'DataLens', 0.65,
          ['CSV・Excelから、品番別・月別の集計表とグラフを作れる'], ['買い切りの費用がかかる'],
          ['体験版のサンプルで試す', '日報の表をCSVかExcelで用意する', '縦に品番、横に月を並べて生産数・不良数を集計する', 'グラフを画像で保存して報告に使う']),
        M('factory-data-sheet', 'sheet', 'ピボットテーブルで品番別・月別に集計', 0.5,
          ['追加費用なし'], ['データの形が変わると作り直し'],
          ['日報の表を1行1件の形にそろえる', 'ピボットテーブルで品番別・月別に集計する', '不良率を計算する列を足す']),
        M('factory-data-vba', 'vba', 'Excelマクロで、日報の取り込みから集計まで', 0.7,
          ['毎回の手順を1回のボタン操作にできる'], ['VBAを書く・直す人が必要'],
          ['毎回やっている手順を順番に書き出す', 'マクロの記録で手順を記録する', 'ファイル名や行数が変わっても動くように直す', 'バックアップを取ってから試す']),
        RULE('factory-data', '見る数字と報告の形を決める', ['報告の迷いが減る'],
          ['毎週見る数字（生産数・不良率など）を決める', '報告の形を1枚にそろえる', 'ふり返る会議の日を決める'])
      ]),
    scheduleTask('prj-project', '案件・納期管理', ['factory', 'freelance', 'it', 'printing', 'ad', 'event'], ['案件', '納期', '締め切り', '受注', '進行管理', 'タスク']),
    TASK('prj-files', 'ファイル名・フォルダの整理（納品・図面・入稿）', ['factory', 'freelance', 'it', 'printing', 'ad', 'photo'], '中', 'weekly', 20,
      ['ファイル名', 'フォルダ', '納品', '図面', '入稿', '版管理', 'データ整理', 'バックアップ', '撮影データ'],
      [
        M('prj-files-gdrive', 'gdrive', '案件ごとの共有フォルダで受け取り・納品・保管', 0.35,
          ['どこからでも同じフォルダを見られる', '相手との受け渡しもしやすい'], ['容量と共有の範囲に注意が必要'],
          ['「年月_相手_案件名」の形でフォルダを作る', '下に「受領」「作業中」「納品」のフォルダを作る', '納品したら納品フォルダに入れ、日付をファイル名に付ける']),
        M('prj-files-pad', 'pad', 'Power Automate for desktop で、ファイル名の一括変更・仕分け', 0.45,
          ['Microsoft アカウントなら追加料金なし'], ['Windows のアプリなので Mac では使えない'],
          ['「今のファイル名 → 新しいファイル名」の一覧を作る', '一覧どおりに名前を変えるフローを作る', 'コピーしたフォルダで試す']),
        RULE('prj-files', 'ファイル名のルール（日付_案件_版）を決める', ['最新版がすぐ分かる'],
          ['ファイル名の順番（例：20261019_案件名_v2）を決める', '最終版の印の付け方を決める', '月に1回、外付けやクラウドにバックアップする'])
      ]),
    billTask('biz-bill', '請求と入金の管理', ['logistics', 'freelance', 'it', 'ad', 'printing', 'cleaning', 'security', 'event', 'moving', 'photo', 'funeral', 'farm', 'fishery', 'gyosei'], ['報酬', '運賃', '制作費', '取引先']),
    TASK('free-expense', '経費の記録', ['freelance'], '高', 'monthly', 90,
      ['経費', '領収書', '帳簿', '仕訳', '確定申告', 'カード明細', '記帳'],
      [
        TOOL('free-expense-tool', 'KichoAuto', 0.65,
          ['カード・銀行の明細から、勘定科目を振り分けて仕訳帳を作れる', '家事按分の設定ができる'], ['買い切りの費用がかかる', '税金の判断は税理士・税務署の案内で確認が必要'],
          ['体験版のサンプルで試す', 'カード・銀行の明細をCSVで保存する', 'よく使うお店と科目を「キーワード = 科目」で登録する', '「要確認・未分類」だけを確かめて保存する']),
        M('free-expense-sheet', 'sheet', '経費の表と科目の自動入力（キーワード表）', 0.45,
          ['追加費用なし'], ['明細の形をそろえる手間がある'],
          ['明細を表計算に貼る', 'お店の名前と科目の対応表を作る', '科目の列を関数で自動で埋める', '月ごとの合計を出す']),
        M('free-expense-cloud', 'cloud', '明細の取り込みがある会計ソフト', 0.7,
          ['口座やカードと連携できるものがある'], ['費用がかかることが多い'],
          ['使える会計ソフトに明細の取り込みがあるか確かめる', 'まず1つのカードだけ連携して試す', '自動で付いた科目を見直す']),
        RULE('free-expense', '事業用のカード・口座を分ける', ['仕分けの手間が減る'],
          ['事業用の支払いに使うカード・口座を1つに決める', '月に1回まとめて記録する日を決める', '領収書の保管場所を決める'])
      ]),

    /* ===== サービス業の固有の業務 ===== */
    TASK('car-history', '車両ごとの整備履歴の管理', ['car'], '中', 'daily', 20,
      ['整備履歴', '整備記録', '車両', '車検', '点検', 'ナンバー', '交換部品'],
      [
        M('car-history-sheet', 'sheet', '整備履歴の台帳（車両番号で前回の整備を検索）', 0.45,
          ['追加費用なし', '前回の整備内容をすぐ見られる'], ['入力の手間は残る'],
          ['車両番号・お客さん・入庫日・作業・交換部品・走行距離の列で台帳を作る', '車両番号を入れると過去の整備が出る検索欄を作る', '次回の点検の目安日を関数で出す']),
        M('car-history-gform', 'gform', '作業のあとにGoogleフォームで記録', 0.35,
          ['作業場からスマホで記録できる'], ['過去の記録を見る画面は表で工夫が必要'],
          ['作業や部品を選ぶ形のフォームを作り、回答先をスプレッドシートにする', '車両番号で並べかえ・絞り込みができるようにする', '週に1回、抜けがないか確かめる']),
        M('car-history-cloud', 'cloud', '整備工場向けの顧客・整備管理サービス', 0.6,
          ['見積・請求・お知らせまで続けて扱えるものがある'], ['費用がかかることが多い'],
          ['今の台帳の項目を書き出す', '移せるかどうかと費用を確かめる', '試せる期間があれば試す']),
        RULE('car-history', '記録の項目と書く人を決める', ['書きもれが減る'],
          ['記録の項目を決める', '作業した人がその日に書くルールにする', '月に1回、次回の点検の対象を確かめる'])
      ]),
    TASK('recycle-buy', '買取の記録（台帳の転記）', ['recycle'], '中', 'daily', 20,
      ['買取', '買取台帳', '古物台帳', '仕入れ', '査定', '本人確認'],
      [
        M('recycle-buy-sheet', 'sheet', '買取台帳のひな形（品目・数量・金額・相手の記録）', 0.4,
          ['追加費用なし', '在庫の一覧とつなげやすい'], ['個人情報の保管に注意が必要'],
          ['記録が必要な項目を、所管の警察署などの案内で確かめて列にする', '品目はプルダウンで選ぶ', '買取番号で在庫の一覧とつなぐ', '保管場所と見られる人を決める']),
        M('recycle-buy-cloud', 'cloud', '買取・在庫の管理ができるクラウドサービス（レジ・POS）', 0.6,
          ['買取から販売まで記録をつなげられるものがある'], ['費用がかかることが多い'],
          ['今の買取の流れと件数を書き出す', '必要な記録の項目に対応しているか確かめる', '費用とデータの扱いを確かめる']),
        RULE('recycle-buy', '買取の手順をチェックリストにする', ['記入もれが減る'],
          ['受付から支払いまでの手順を書き出す', '確認する書類と項目をチェックリストにする', '書いた台帳を別の人が確かめる'])
      ], '買取の記録に必要な項目や保存のしかたは、所管の警察署などの案内で確認してください。'),
    TASK('funeral-list', '会葬者・香典の名簿整理と返礼の宛名', ['funeral'], '高', 'weekly', 90,
      ['会葬者', '香典', '芳名録', '名簿', '返礼', '香典返し', '宛名', '礼状'],
      [
        TOOL('funeral-list-tool', 'DataClean', 0.5,
          ['名簿の住所・電話番号の書き方をそろえ、重複を整理できる'], ['買い切りの費用がかかる', '同じ人かどうかの最終判断は人が行う'],
          ['体験版のサンプルで試す', '芳名録を入力した表のコピーを用意する', '整えてから、要確認のセルだけを直す']),
        TOOL('funeral-list-label', 'LabelMaker', 0.5,
          ['名簿から、礼状・返礼品の宛名ラベルをまとめて印刷できる'], ['買い切りの費用がかかる'],
          ['体験版のサンプル名簿で試す', '整えた名簿をCSVかExcelで用意する', '枠線だけ試し刷りしてから、ラベル用紙に印刷する']),
        M('funeral-list-merge', 'merge', 'Wordの差し込み印刷で礼状と宛名を作る', 0.45,
          ['Excelの名簿をそのまま使える', '追加費用なし'], ['Wordが入っている必要がある'],
          ['名簿を1つのシートにまとめ、1行目を見出しにする', '礼状のひな形に差し込みフィールドを置く', '1枚だけ普通の紙に試し刷りする']),
        RULE('funeral-list', '芳名録の入力の形を決める', ['入力のゆれが減る'],
          ['入力する項目（名前・住所・金額・関係）を決める', '住所の書き方をそろえる', 'ご遺族への確認の手順を決める'])
      ]),
    TASK('event-seat', '席次表・名札の作成', ['event', 'npo', 'community'], '中', 'monthly', 90,
      ['席次表', '名札', '座席表', '受付', '参加者', 'ネームカード', '招待'],
      [
        TOOL('event-seat-qr', 'QRBatch', 0.45,
          ['参加者の一覧から、名前入りのQRコード（名札・受付番号・座席カード）をまとめて印刷できる'], ['買い切りの費用がかかる', '席次表の配置そのものは作らない'],
          ['体験版のサンプルで試す', '参加者の一覧（番号・名前・席）をCSVかExcelで用意する', 'QRの下に名前と席を印刷する設定にする', '1枚試し刷りして、大きさと読み取りを確かめる']),
        M('event-seat-merge', 'merge', 'Wordの差し込み印刷で名札を作る', 0.45,
          ['Excelの一覧をそのまま使える', '追加費用なし'], ['Wordが入っている必要がある'],
          ['参加者の一覧を1つのシートにまとめる', '名札の用紙を選び、名前などの欄を配置する', '1枚だけ普通の紙に試し刷りする']),
        M('event-seat-sheet', 'sheet', '席次の表（テーブル×人数のチェック）', 0.35,
          ['追加費用なし', '人数の過不足に気づける'], ['配置の調整は手で行う'],
          ['参加者の一覧にテーブル番号の列を作る', 'テーブルごとの人数を関数で数え、多すぎたら色を付ける', '印刷用の表に並べる']),
        RULE('event-seat', '出欠の締め切りと変更の連絡先を決める', ['作り直しが減る'],
          ['出欠の締め切りを決める', '変更の連絡先を1つにする', '最終版の日付をファイル名に入れる'])
      ]),

    /* ===== 団体 ===== */
    TASK('npo-donation', '寄付の記録とお礼状', ['npo'], '中', 'monthly', 90,
      ['寄付', '寄附', '寄付者', 'お礼状', '支援者', '募金', '会費'],
      [
        M('npo-donation-sheet', 'sheet', '寄付の台帳（寄付者・日付・金額・お礼の状況）', 0.45,
          ['追加費用なし', 'お礼の送りもれが分かる'], ['入金の記入は手で行う'],
          ['寄付者番号・名前・日付・金額・お礼状の送付日の列で台帳を作る', 'お礼状が未送付の行に色を付ける', '年ごとの合計を関数で出す']),
        TOOL('npo-donation-label', 'LabelMaker', 0.4,
          ['寄付者の名簿から、お礼状の宛名ラベルをまとめて印刷できる'], ['買い切りの費用がかかる'],
          ['体験版のサンプル名簿で試す', 'お礼状を送る人の名簿を用意する', '試し刷りしてからラベル用紙に印刷する']),
        M('npo-donation-merge', 'merge', 'Wordの差し込み印刷でお礼状を作る', 0.45,
          ['名前や金額を差しかえて、まとめて作れる'], ['Wordが入っている必要がある'],
          ['お礼状のひな形に、名前・日付・金額の差し込みフィールドを置く', '台帳の表を読み込む', '1枚だけ試し刷りして確かめる']),
        TOOL('npo-donation-check', 'NyukinCheck', 0.35,
          ['振込の明細と寄付の予定（会費の請求一覧など）を突き合わせられる'], ['買い切りの費用がかかる', '予定のない寄付は「どの請求書にも合わない入金」として出る'],
          ['体験版のサンプルで試す', 'ネットバンキングから入出金明細をCSVで保存する', '会費などの請求一覧と一緒に入れて照合する']),
        RULE('npo-donation', '寄付を受けた日のうちに記録する', ['お礼の送りもれが減る'],
          ['寄付を受けたらその日に台帳に書く', 'お礼状を出す期限を決める', '年に1回、寄付者の一覧を見直す'])
      ]),
    TASK('comm-account', '会計（会費の集金記録と収支）', ['community', 'npo'], '中', 'monthly', 60,
      ['会計', '集金', '会費', '収支', '出納帳', '決算', '予算', '領収書'],
      [
        M('comm-account-sheet', 'sheet', '出納帳と集金表（収支の合計を自動で）', 0.5,
          ['追加費用なし', '引き継ぎしやすい'], ['記入の手間は残る'],
          ['日付・内容・収入・支出・残高の列で出納帳を作る', '世帯（会員）×月の集金表を作り、未集金に色を付ける', '科目ごとの合計を関数で出し、予算とくらべる']),
        M('comm-account-gform', 'gform', '集金の記録をGoogleフォームで入力', 0.35,
          ['担当が分かれていても1つの表にたまる'], ['集計の式は表で作る'],
          ['世帯（会員）番号と金額を入れるフォームを作る', '回答先をスプレッドシートにする', '月末に集金表と見比べる']),
        RULE('comm-account', '会計の手順と引き継ぎ書を作る', ['役員が変わっても続けやすい'],
          ['集金・支払い・記帳の手順を書き出す', '領収書の保管場所を決める', '年度末に引き継ぎ書を更新する'])
      ]),
    TASK('comm-roles', '行事の役割分担表', ['community', 'npo', 'event'], '中', 'monthly', 60,
      ['役割分担', '当番', '係', '行事', '役員', 'ボランティア', '分担'],
      [
        M('comm-roles-sheet', 'sheet', '役割分担の表（人×係×日付）', 0.4,
          ['追加費用なし', '偏りや空きが見える'], ['変更のたびに更新が必要'],
          ['行に係、列に日付（行事）を並べた表を作る', '1人あたりの担当数を関数で数える', '確定した表をPDFにして共有する']),
        M('comm-roles-gform', 'gform', '担当できる日・係の希望をGoogleフォームで集める', 0.45,
          ['希望が自動で表に集まる', '追加費用なし'], ['割り当ては人が決める'],
          ['係と日付を選ぶ形のフォームを作る', '回答先をスプレッドシートにする', '集まった希望をもとに割り当てる']),
        RULE('comm-roles', '係の仕事内容を書き出しておく', ['頼みやすく、引き継ぎやすい'],
          ['係ごとの仕事内容と所要時間を書き出す', '希望の締め切りを決める', '終わったらふり返りを書き足す'])
      ])
  ];
  NEW_TASKS.forEach(function (t) { TASKS.push(t); });

  /* ---------- よく選ばれる（使われ方のデータがまだないため、業種ごとに決めた一覧） ---------- */
  var COMMON_POP = ['invoice', 'reconcile', 'journal', 'attendance', 'mailsend', 'pdfname', 'csvagg', 'dedupe'];
  var POPULAR = {
    office: COMMON_POP, other: COMMON_POP,
    realestate: ['flyer', 'hankyo', 'baikai', 'koshin', 'keiyaku', 'chosa', 'invoice'],
    retail: ['inventory', 'sales', 'shipping', 'snspost', 'invoice', 'reconcile'],
    pro: ['deadline', 'collect', 'timecharge', 'invoice', 'reconcile', 'mailsend'],
    construction: ['site-estimate', 'site-schedule', 'site-photo', 'site-report', 'site-bill', 'site-sub', 'site-material', 'site-check'],
    civil: ['site-estimate', 'site-schedule', 'site-photo', 'site-report', 'site-bill', 'site-sub', 'site-check'],
    landscaping: ['land-annual', 'site-estimate', 'site-photo', 'site-schedule', 'site-bill', 'site-report'],
    cleaning: ['svc-shift', 'site-schedule', 'site-report', 'site-estimate', 'biz-bill', 'site-check'],
    logistics: ['logi-route', 'logi-inout', 'logi-location', 'logi-report', 'logi-label', 'svc-shift', 'biz-bill'],
    moving: ['site-estimate', 'logi-route', 'site-schedule', 'svc-shift', 'biz-bill', 'svc-reply'],
    food: ['svc-reserve', 'svc-shift', 'svc-stock', 'svc-sales', 'svc-reply', 'svc-repeat'],
    beauty: ['svc-reserve', 'svc-karte', 'svc-remind', 'svc-stock', 'svc-sales', 'svc-repeat', 'svc-shift'],
    hotel: ['hotel-book', 'hotel-clean', 'svc-reply', 'hotel-guests', 'svc-shift', 'hotel-occ', 'hotel-guide'],
    car: ['svc-reserve', 'car-history', 'svc-remind', 'site-estimate', 'svc-stock', 'invoice'],
    pet: ['svc-reserve', 'svc-karte', 'svc-remind', 'svc-stock', 'svc-sales', 'svc-shift'],
    gym: ['mem-fee', 'svc-reserve', 'mem-roster', 'svc-shift', 'mem-notice', 'mem-attend'],
    photo: ['svc-reserve', 'prj-files', 'biz-bill', 'svc-reply', 'svc-remind'],
    recycle: ['recycle-buy', 'inventory', 'svc-sales', 'svc-reply', 'svc-shift'],
    funeral: ['site-estimate', 'site-sub', 'funeral-list', 'biz-bill', 'svc-reply'],
    event: ['site-estimate', 'site-sub', 'event-seat', 'mem-attend', 'site-schedule', 'biz-bill'],
    security: ['svc-shift', 'site-report', 'staff-training', 'biz-bill', 'site-estimate'],
    care: ['svc-shift', 'care-transport', 'staff-training', 'svc-stock', 'care-family', 'attendance'],
    clinic: ['svc-reserve', 'svc-shift', 'svc-reply', 'svc-stock', 'svc-sales', 'attendance'],
    nursery: ['mem-attend', 'mem-notice', 'svc-shift', 'mem-fee', 'care-family', 'staff-training'],
    school: ['mem-fee', 'mem-attend', 'mem-notice', 'mem-schedule', 'mem-roster'],
    tax: ['collect', 'deadline', 'tax-prep', 'timecharge', 'pdfname', 'reconcile'],
    sharoushi: ['sr-kintai', 'collect', 'deadline', 'timecharge', 'mailsend'],
    gyosei: ['collect', 'deadline', 'timecharge', 'biz-bill', 'svc-reply'],
    insurance: ['deadline', 'mem-roster', 'mem-notice', 'collect', 'svc-reply'],
    farm: ['farm-log', 'farm-ship', 'site-material', 'logi-label', 'biz-bill'],
    fishery: ['farm-ship', 'site-material', 'logi-label', 'biz-bill', 'shipping'],
    direct: ['direct-settle', 'svc-sales', 'inventory', 'mem-notice', 'svc-shift', 'logi-label'],
    factory: ['factory-parts', 'factory-report', 'factory-data', 'prj-project', 'site-check', 'prj-files'],
    printing: ['prj-project', 'site-estimate', 'prj-files', 'site-sub', 'biz-bill', 'site-material'],
    it: ['prj-project', 'timecharge', 'site-estimate', 'biz-bill', 'deadline', 'prj-files'],
    ad: ['prj-project', 'csvagg', 'timecharge', 'biz-bill', 'site-sub'],
    freelance: ['prj-project', 'biz-bill', 'free-expense', 'svc-reply', 'prj-files'],
    npo: ['mem-roster', 'mem-fee', 'npo-donation', 'mem-notice', 'comm-account', 'mem-attend'],
    community: ['mem-roster', 'mem-notice', 'comm-account', 'comm-roles', 'mem-attend', 'survey']
  };

  /* 検索用のよみ（ひらがなで探しても見つかるように） */
  var YOMI = {'勤怠': 'きんたい', '請求': 'せいきゅう', '予約': 'よやく', '在庫': 'ざいこ', '見積': 'みつもり', '見積もり': 'みつもり', '発注': 'はっちゅう', '日報': 'にっぽう', '出欠': 'しゅっけつ', '月謝': 'げっしゃ', '会費': 'かいひ', '名簿': 'めいぼ', '写真': 'しゃしん', '工程': 'こうてい', '経費': 'けいひ', '仕訳': 'しわけ', '入金': 'にゅうきん', '宛名': 'あてな', '配車': 'はいしゃ', '清掃': 'せいそう', '出勤': 'しゅっきん', '残業': 'ざんぎょう', '送迎': 'そうげい', '研修': 'けんしゅう', '資格': 'しかく', '領収書': 'りょうしゅうしょ', '請求書': 'せいきゅうしょ', '納期': 'のうき', '案件': 'あんけん', '外注': 'がいちゅう', '出荷': 'しゅっか', '精算': 'せいさん', '寄付': 'きふ', '会計': 'かいけい', '集金': 'しゅうきん', '電気屋': 'でんきや', '電気工事': 'でんきこうじ', '水道屋': 'すいどうや', '水道': 'すいどう', '大工': 'だいく', '内装': 'ないそう', '建築': 'けんちく', '工務店': 'こうむてん', '民泊': 'みんぱく', '旅館': 'りょかん', '宿': 'やど', '塾': 'じゅく', '習い事': 'ならいごと', '倉庫': 'そうこ', '運送': 'うんそう', '配送': 'はいそう', '美容室': 'びよういん', '美容院': 'びよういん', '美容': 'びよう', '整骨院': 'せいこついん', '接骨院': 'せっこついん', '整体': 'せいたい', '歯科': 'しか', '保育園': 'ほいくえん', '保育': 'ほいく', '学童': 'がくどう', '自治会': 'じちかい', '町内会': 'ちょうないかい', '税理士': 'ぜいりし', '社労士': 'しゃろうし', '行政書士': 'ぎょうせいしょし', '保険': 'ほけん', '農業': 'のうぎょう', '農家': 'のうか', '漁業': 'ぎょぎょう', '漁師': 'りょうし', '葬儀': 'そうぎ', '警備': 'けいび', '造園': 'ぞうえん', '植木': 'うえき', '土木': 'どぼく', '引越し': 'ひっこし', '飲食': 'いんしょく', '居酒屋': 'いざかや', '介護': 'かいご', '教室': 'きょうしつ', '工場': 'こうじょう', '製造': 'せいぞう', '印刷': 'いんさつ', '広告': 'こうこく', '買取': 'かいとり', '直売所': 'ちょくばいじょ', '道の駅': 'みちのえき', '車検': 'しゃけん', '整備': 'せいび', '自動車': 'じどうしゃ', '不動産': 'ふどうさん', '士業': 'しぎょう', '小売': 'こうり', '結婚式': 'けっこんしき', '冠婚': 'かんこん'};
  var DATA = {
    CHECKED: CHECKED, SOURCES: SOURCES, TYPES: TYPES, COST_LABEL: COST_LABEL, DIFF_LABEL: DIFF_LABEL,
    PRODUCTS: PRODUCTS, BUNDLES: BUNDLES, INDUSTRIES: INDUSTRIES, TASKS: TASKS, CATS: CATS, POPULAR: POPULAR, IND_NOTES: IND_NOTES, YOMI: YOMI
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.DX_DATA = DATA;
})(typeof window !== 'undefined' ? window : this);
