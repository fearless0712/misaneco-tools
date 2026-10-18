/* iPhoneを売る・譲る前チェック — 「売り方の比較・高く売るコツ・買取サービスの選び方」のデータ
 * 公式ページは README.md の「出典一覧（2026-10-19 確認）」で確認したものだけ。
 * 買取価格の比較・業者のランキングは載せない（価格は日々変わり、自動取得は規約上できないため）。
 * ブラウザでは window.SellCheckGuide、Node（テスト）では module.exports。
 */
(function (root) {
  'use strict';

  var AS_OF = '2026-10-19';

  // ---- 出典（確認済みURLのみ） ----
  var SRC = {
    apple_tradein: { ja: ['Apple Trade In（Apple 日本）', 'https://www.apple.com/jp/shop/trade-in'],
                     en: ['Apple Trade In (Apple Japan)', 'https://www.apple.com/jp/shop/trade-in'] },
    docomo_tradein: { ja: ['ドコモ「下取りプログラム」', 'https://www.docomo.ne.jp/campaign_event/shitadori/'],
                      en: ['docomo: Trade-in program (Japanese)', 'https://www.docomo.ne.jp/campaign_event/shitadori/'] },
    au_tradein: { ja: ['au「下取りプログラム」', 'https://www.au.com/mobile/trade-in/'],
                  en: ['au: Trade-in program (Japanese)', 'https://www.au.com/mobile/trade-in/'] },
    sb_tradein: { ja: ['ソフトバンク「下取りプログラム」', 'https://www.softbank.jp/mobile/campaigns/list/trade-in/'],
                  en: ['SoftBank: Trade-in program (Japanese)', 'https://www.softbank.jp/mobile/campaigns/list/trade-in/'] },
    rakuten_tradein: { ja: ['楽天モバイル「スマホ下取りサービス」', 'https://network.mobile.rakuten.co.jp/service/tradein/'],
                       en: ['Rakuten Mobile: Smartphone trade-in service (Japanese)', 'https://network.mobile.rakuten.co.jp/service/tradein/'] },
    apple_battery: { ja: ['Apple サポート「iPhoneのバッテリーとパフォーマンス」', 'https://support.apple.com/ja-jp/101575'],
                     en: ['Apple Support: iPhone battery and performance', 'https://support.apple.com/en-us/101575'] },
    sb_restriction: { ja: ['ソフトバンク「中古携帯電話を利用する際の注意事項（ネットワーク利用制限）」', 'https://www.softbank.jp/mobile/support/3g/restriction/'],
                      en: ['SoftBank: Notes on used phones (network restriction) (Japanese)', 'https://www.softbank.jp/mobile/support/3g/restriction/'] },
    au_restriction: { ja: ['au「ネットワーク利用制限携帯電話機について」', 'https://www.au.com/support/service/mobile/network-riyoseigen/'],
                      en: ['au: Network-restricted phones (Japanese)', 'https://www.au.com/support/service/mobile/network-riyoseigen/'] },
    law_kobutsu: { ja: ['e-Gov法令検索「古物営業法」（第15条 確認等及び申告）', 'https://laws.e-gov.go.jp/law/324AC0000000108'],
                   en: ['e-Gov: Antique Dealers Act, Article 15 (Japanese)', 'https://laws.e-gov.go.jp/law/324AC0000000108'] },
    mpd_hitaimen: { ja: ['警視庁「非対面取引における確認の方法」', 'https://www.keishicho.metro.tokyo.lg.jp/tetsuzuki/kobutsu/kaisetsu/hitaimen.html'],
                    en: ['Tokyo Metropolitan Police: ID checks for non-face-to-face deals (Japanese)', 'https://www.keishicho.metro.tokyo.lg.jp/tetsuzuki/kobutsu/kaisetsu/hitaimen.html'] },
    mpd_kobutsu: { ja: ['警視庁「古物商許可申請をされる方へ」', 'https://www.keishicho.metro.tokyo.lg.jp/tetsuzuki/kobutsu/kaisetsu/kobutsu_shinsei.html'],
                   en: ['Tokyo Metropolitan Police: For secondhand dealer license applicants (Japanese)', 'https://www.keishicho.metro.tokyo.lg.jp/tetsuzuki/kobutsu/kaisetsu/kobutsu_shinsei.html'] },
    kokusen_flea: { ja: ['国民生活センター「フリマサービスのトラブルに注意！」', 'https://www.kokusen.go.jp/mimamori/mj_mailmag/mj-shinsen536.html'],
                    en: ['National Consumer Affairs Center of Japan: Watch out for flea-market app trouble (Japanese)', 'https://www.kokusen.go.jp/mimamori/mj_mailmag/mj-shinsen536.html'] }
  };

  // 表の行の見出し（売り方ごとに同じ順）
  var ROWS = [
    { id: 'effort', ja: '手間', en: 'Effort' },
    { id: 'pay', ja: '入金', en: 'Payment' },
    { id: 'ship', ja: '送料', en: 'Shipping' },
    { id: 'id', ja: '本人確認', en: 'ID check' },
    { id: 'assess', ja: '査定', en: 'Valuation' },
    { id: 'caution', ja: '注意', en: 'Watch out' }
  ];

  // ---- 売り方の比較（金額・業者名のランキングは出さない） ----
  var METHODS = [
    { id: 'store', forSel: 'shop', src: ['law_kobutsu'],
      ja: { name: '店頭買取', sub: '買取店に持ち込む',
            rows: ['お店に持って行く。混み具合や予約の有無はお店ごとに違う。',
                   'その場で受け取れることが多い（支払い方法はお店ごと）。',
                   'かからない（お店までの交通費は自分持ち）。',
                   '本人確認書類（運転免許証など）の提示が必要（古物営業法）。',
                   '目の前で状態を見て査定。金額を聞いてから売るかどうか決められる。',
                   'データの消去は、持ち込む前に自分で済ませる（このページのチェックリスト）。'] },
      en: { name: 'In-store buyback', sub: 'Take it to a buyback shop',
            rows: ['Go to the shop. Wait times and whether you need a reservation depend on the shop.',
                   'Often paid on the spot (payment method depends on the shop).',
                   'None (your own travel cost to the shop).',
                   'You must show ID such as a driver’s license (Antique Dealers Act).',
                   'They inspect it in front of you. You hear the price before deciding to sell.',
                   'Erase your data yourself before you go (this page’s checklist).'] } },

    { id: 'mail', forSel: 'shop', src: ['mpd_hitaimen'],
      ja: { name: '宅配買取', sub: '箱に詰めて送る',
            rows: ['申し込んで、梱包して送る。お店に行かなくてよい。',
                   '届いてから査定 → 金額の連絡 → 承認のあとに振込などのため、日数がかかる。',
                   '無料の業者も有料の業者もある。キャンセルしたときの返送料の扱いも業者ごとに違う。',
                   '対面しなくても本人確認は必要。法令で決まった方法で行う（免許証のコピーを送るだけでは足りないと警視庁が案内）。',
                   '届いてから査定。申込時の見積もりから変わることがある。',
                   '査定額に納得できないときの返却の条件を、送る前に確認する。配送中に壊れないように梱包する。'] },
      en: { name: 'Mail-in buyback', sub: 'Pack it and ship it',
            rows: ['Apply, pack, and ship. No need to visit a shop.',
                   'Takes some days: arrival → valuation → price notice → your approval → payment (e.g. bank transfer).',
                   'Some services are free, some charge. Return shipping if you cancel also varies.',
                   'ID check is still required, using legally set methods (per Tokyo police, just mailing a copy of your license is not enough).',
                   'Valued after it arrives. The price can differ from the online estimate.',
                   'Before shipping, check how returns work if you reject the price. Pack it so it won’t break in transit.'] } },

    { id: 'flea', forSel: 'flea', src: ['kokusen_flea'],
      ja: { name: 'フリマ・オークション', sub: '個人に売る',
            rows: ['写真・説明文・質問への返事・梱包・発送まで自分で行う。',
                   '買った人が受け取って取引が終わってから。売上金を口座に移すのに申請や手数料が要る場合がある（各サービスの規約を確認）。',
                   '出品者と購入者のどちらが払うかを出品時に決める。販売手数料がかかるサービスが多い。',
                   '個人どうしの取引なので、買取業者の本人確認とは別。各サービスの規約に従う。',
                   '査定はない。値段は自分で決めるが、売れるか・いくらで売れるかは決まっていない。',
                   '個人間の取引で、トラブルは当事者どうしで解決するよう求められることが多い（国民生活センター）。規約を読んでから使う。状態（傷・バッテリー・ネットワーク利用制限）は正確に書く。解決しないときは運営事業者や消費者ホットライン188に相談。'] },
      en: { name: 'Marketplace / auction apps', sub: 'Sell to an individual',
            rows: ['You do the photos, description, buyer questions, packing, and shipping.',
                   'Paid after the buyer receives it and the deal closes. Moving sales to your bank may need a request or fee (check the service’s terms).',
                   'Decide who pays shipping when you list. Many services charge a selling fee.',
                   'It’s a person-to-person sale, separate from a dealer’s ID check. Follow the service’s terms.',
                   'No valuation. You set the price, but whether and for how much it sells isn’t fixed.',
                   'Disputes are often left to the two parties to settle (per Japan’s consumer center). Read the terms first. Describe scratches, battery, and network status accurately. If stuck, contact the operator or Japan’s consumer hotline 188.'] } },

    { id: 'tradein', forSel: 'tradein', src: [],  // 出典は下の「下取りの公式ページ」（TRADEIN）にまとめて表示
      ja: { name: '下取り', sub: 'Apple Trade In・キャリア',
            rows: ['新しい機種を買うときに一緒に申し込むものが多い。店頭か郵送。',
                   '現金ではなく、購入代金の割引・ポイント・ギフトカード・電子マネーなどで受け取ることが多い（窓口ごとに違う）。',
                   '郵送の場合は送付キットや集荷の案内がある窓口が多い（条件は各窓口で確認）。',
                   '必要（Appleは有効な写真付き身分証明書、ソフトバンクは古物営業法に基づく本人確認と案内）。',
                   '申告した状態で見積もり、届いてから確定。状態が違うと金額が変わったり、受け付けられないことがある。',
                   '減額されたあとに取りやめられるかは窓口ごとに違う（Apple・楽天モバイルは返却を選べる、ソフトバンクは申込後のキャンセル・返却はできないと案内）。'] },
      en: { name: 'Trade-in', sub: 'Apple Trade In / carriers',
            rows: ['Usually applied for together with buying a new phone. In store or by mail.',
                   'Often not cash: a discount, points, a gift card, or e-money (varies by program).',
                   'For mail-in, many programs send a kit or arrange pickup (check each program).',
                   'Required (Apple: valid photo ID; SoftBank: ID check under the Antique Dealers Act).',
                   'Quoted on the condition you report, finalized after inspection. A different condition can change the value or get it refused.',
                   'Whether you can back out after a lower value differs (Apple and Rakuten Mobile let you get it back; SoftBank says no cancellation or return after applying).'] } }
  ];

  // ---- 下取りの公式ページ（確認日 AS_OF） ----
  var TRADEIN = [
    { src: 'apple_tradein',
      ja: 'オンラインかApple Storeで。購入代金の割引かApple Gift Cardで受け取る。成年であること・有効な写真付き身分証明書・「探す」をオフ（このチェックリストのサインアウトと消去でオフになります）。',
      en: 'Online or at an Apple Store. Get a discount on your purchase or an Apple Gift Card. You must be an adult, show valid photo ID, and turn off Find My (signing out and erasing in this checklist turns it off).' },
    { src: 'docomo_tradein',
      ja: '機種の購入とあわせて申し込む。店頭は機種代金から割引、オンラインはdポイントで受け取る。',
      en: 'Apply together with buying a phone. In store: discount on the phone; online: d POINT.' },
    { src: 'au_tradein',
      ja: '機種変更・乗りかえで機種を買うときに申し込む。Pontaポイントで受け取る。',
      en: 'Apply when buying a phone (upgrade or switch). Paid as Ponta points.' },
    { src: 'sb_tradein',
      ja: 'ソフトバンクで指定機種を買うことが条件。PayPayポイントで受け取る。',
      en: 'Requires buying a designated phone from SoftBank. Paid as PayPay points.' },
    { src: 'rakuten_tradein',
      ja: '楽天会員で18歳以上なら、機種を買わなくても申し込める。楽天キャッシュで受け取る。',
      en: 'Rakuten members aged 18+ can apply without buying a phone. Paid as Rakuten Cash.' }
  ];

  // ---- 高く売るコツ ----
  var TIPS = [
    { id: 'items', src: ['rakuten_tradein'],
      ja: { t: '付属品・箱をまとめておく',
            b: ['箱・ケーブルなど、手元にあるものを1か所にまとめる。',
                '査定に影響するかは売り先ごとに違う（付属品は価格に影響しないと案内している下取りもある）。売り先の条件を確認する。',
                'フリマでは、付ける付属品を出品ページに正確に書く。'] },
      en: { t: 'Gather the box and accessories',
            b: ['Put the box, cable, and anything else you have in one place.',
                'Whether they affect the price depends on the buyer (some trade-in programs say accessories don’t). Check their conditions.',
                'On marketplace apps, list exactly what’s included.'] } },
    { id: 'battery', src: ['apple_battery'],
      ja: { t: 'バッテリーの状態を確認する',
            b: ['「設定」→「バッテリー」→「バッテリーの状態」で「最大容量」を見る（新品のときと比べた目安）。表示名はiOSや機種で少し違うことがあります。',
                '見積もりの申告やフリマの説明に、この数字をそのまま書く。'] },
      en: { t: 'Check battery health',
            b: ['Settings → Battery → Battery Health, and look at Maximum Capacity (compared with when it was new). Names can differ slightly by iOS version and model.',
                'Use this number as-is when reporting condition or writing a listing.'] } },
    { id: 'damage', src: ['au_tradein', 'sb_tradein', 'apple_sell'],
      ja: { t: '減額されやすいところを知っておく',
            b: ['画面割れ・本体の欠けなどの破損や、純正でないバッテリー・部品があると、破損品の価格になる例がある（au・ソフトバンクの下取り条件）。',
                '電源が入らない・初期化やロック解除がされていないと、受け付けられないことがある。',
                '「部品と修理の履歴」はチェックリストの手順で確認する。修理してから売るかは、修理代と見比べて決める（修理すれば必ず得とは限りません）。'] },
      en: { t: 'Know what lowers the price',
            b: ['Cracked screens, chipped bodies, or non-genuine batteries/parts can mean a “damaged” price (au and SoftBank trade-in terms).',
                'If it won’t power on, or isn’t erased and unlocked, it may be refused.',
                'Check Parts and Service History in the checklist. Whether to repair first depends on the repair cost (repairing doesn’t always pay off).'] } },
    { id: 'network', src: ['sb_restriction', 'au_restriction'], carriers: true,
      ja: { t: 'ネットワーク利用制限（○・△・×）を確認する',
            b: ['控えたIMEIを、iPhoneを買ったキャリアの確認ページに入力すると、結果が記号で表示される。',
                '「△」や「×」の場合は、利用制限に当たる可能性があると案内されています（ソフトバンク）。表示は確認した日の前日時点の登録状況です（au）。',
                '結果は、見積もりの申告やフリマの説明に正確に書く。'] },
      en: { t: 'Check the network restriction status (○ / △ / ×)',
            b: ['Enter the IMEI you noted on the check page of the carrier you bought the iPhone from. The result is shown as a symbol.',
                'SoftBank says △ or × may mean a restriction applies. au says the result reflects the status as of the previous day.',
                'Report the result accurately when getting a quote or writing a listing.'] } },
    { id: 'timing', src: [],
      ja: { t: '売る時期は「傾向」として考える',
            b: ['新しいモデルの発表・発売の前後に、中古の相場が動く傾向があると言われます。必ず上がる・下がるとは限りません。',
                'このツールは価格を予想しません。売ると決めたら、各社の公式ページで最新の金額と条件を確認する。'] },
      en: { t: 'Think of timing as a tendency',
            b: ['Used prices are said to tend to move around new-model announcements and launches. It’s not guaranteed either way.',
                'This tool doesn’t predict prices. Once you decide, check current prices and terms on each service’s official page.'] } }
  ];

  // ---- 買取サービスの選び方 ----
  var CHOOSE = {
    src: ['mpd_kobutsu', 'mpd_hitaimen'],
    ja: ['ホームページで買取を受け付ける業者は「許可を受けた公安委員会名」「許可証番号」「氏名又は名称」を表示する決まりがある（警視庁）。表示があるか確認する。',
         '本人確認の方法（店頭で書類を見せる・宅配で法令の方法に沿って確認する）を事前に確認する。',
         '査定額に納得できないときのキャンセル・返却の条件と、返送料の扱いを確認する。',
         '入金の方法と時期（現金・振込・ポイントなど）を確認する。',
         'どんなときに減額されるか（傷・付属品・ネットワーク利用制限など）が書かれているか確認する。',
         'データの消去とロックの解除は、どの売り先でも自分で済ませてから渡す（このページのチェックリスト）。'],
    en: ['Dealers that accept buybacks on their website must show the licensing Public Safety Commission, license number, and name (Tokyo police). Check that these are shown.',
         'Check how they verify ID (showing ID in store, or legally set methods for mail-in).',
         'Check cancellation/return terms and who pays return shipping if you reject the price.',
         'Check how and when you get paid (cash, transfer, points, etc.).',
         'Check that they list what lowers the price (scratches, accessories, network status, etc.).',
         'Wherever you sell, erase and unlock it yourself before handing it over (this page’s checklist).']
  };

  // ---- 本人確認（古物営業法） ----
  var LAW = {
    src: ['law_kobutsu', 'mpd_kobutsu', 'mpd_hitaimen'],
    ja: ['買取店・宅配買取・下取りなどで業者（古物商）が中古品を買い取るときは、売る人の住所・氏名・職業・年齢を確認することが古物営業法第15条で決められています。',
         '運転免許証などの本人確認書類を用意しておく。対面しない取引では、法令で決められた方法で確認されます。',
         '総額1万円未満の一部の取引などには例外があります。詳しくは下の公式ページを確認してください。'],
    en: ['In Japan, when a dealer (licensed secondhand dealer) buys used goods — in store, by mail, or as a trade-in — Article 15 of the Antique Dealers Act requires them to verify the seller’s address, name, occupation, and age.',
         'Have ID such as a driver’s license ready. For non-face-to-face deals, legally set methods are used.',
         'There are exceptions, such as some deals under ¥10,000 in total. See the official pages below.']
  };

  // 選択（state.sel.method）→ 最初に開いておく売り方
  function openFor(method) {
    return METHODS.filter(function (m) { return m.forSel === method; }).map(function (m) { return m.id; });
  }
  // 家族に譲る場合は「売り方」ガイドを出さない
  function showGuide(sel) { return !sel || sel.method !== 'family'; }

  var api = { AS_OF: AS_OF, SRC: SRC, ROWS: ROWS, METHODS: METHODS, TRADEIN: TRADEIN, TIPS: TIPS, CHOOSE: CHOOSE, LAW: LAW,
              openFor: openFor, showGuide: showGuide };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SellCheckGuide = api;
})(this);
