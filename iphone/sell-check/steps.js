/* iPhoneを売る・譲る前チェック — 手順データと出し分けロジック
 * 各手順の内容は README.md の「出典一覧」にある公式ページで確認したものだけを載せています。
 * ブラウザでは window.SellCheckSteps、Node（テスト）では module.exports として使えます。
 */
(function (root) {
  'use strict';

  // ---- 出典（確認済みURLのみ） ----
  var SRC = {
    apple_sell: { ja: ['Apple サポート「iPhoneやiPadを売却、譲渡、下取りに出す前にやっておくべきこと」', 'https://support.apple.com/ja-jp/109511'],
                  en: ['Apple Support: What to do before you sell, give away, or trade in your iPhone or iPad', 'https://support.apple.com/en-us/109511'] },
    apple_backup: { ja: ['Apple サポート「iCloudでiPhoneやiPadをバックアップする方法」', 'https://support.apple.com/ja-jp/108366'],
                    en: ['Apple Support: How to back up your iPhone or iPad with iCloud', 'https://support.apple.com/en-us/108366'] },
    apple_quickstart: { ja: ['Apple サポート「クイックスタートを使って新しいiPhoneやiPadにデータを転送する」', 'https://support.apple.com/ja-jp/102659'],
                        en: ['Apple Support: Use Quick Start to transfer data to a new iPhone or iPad', 'https://support.apple.com/en-us/102659'] },
    apple_esim: { ja: ['Apple サポート「iPhoneでeSIMを設定する」', 'https://support.apple.com/ja-jp/118669'],
                  en: ['Apple Support: Set up eSIM on iPhone', 'https://support.apple.com/en-us/118669'] },
    apple_watch: { ja: ['Apple サポート「Apple Watchのペアリングを解除して消去する」', 'https://support.apple.com/ja-jp/108372'],
                   en: ['Apple Support: Unpair and erase your Apple Watch', 'https://support.apple.com/en-us/108372'] },
    apple_alock: { ja: ['Apple サポート「iPhoneとiPadのアクティベーションロック」', 'https://support.apple.com/ja-jp/108794'],
                   en: ['Apple Support: Activation Lock for iPhone and iPad', 'https://support.apple.com/en-us/108794'] },
    apple_imei: { ja: ['Apple サポート「iPhone、iPad、iPod touchでシリアル番号やIMEIを確認する」', 'https://support.apple.com/ja-jp/108037'],
                  en: ['Apple Support: Find the serial number or IMEI on your iPhone, iPad, or iPod touch', 'https://support.apple.com/en-us/108037'] },
    apple_imessage: { ja: ['Apple「電話番号の登録を解除してiMessageをオフにする」', 'https://selfsolve.apple.com/deregister-imessage/jp/ja'],
                      en: ['Apple: Deregister iMessage', 'https://selfsolve.apple.com/deregister-imessage/'] },
    line: { ja: ['LINEヘルプセンター「あんぜん引き継ぎガイド」', 'https://help.line.me/line/?contentId=200002096&lang=ja'],
            en: ['LINE Help Center: account transfer guide', 'https://help.line.me/line/?contentId=200002096&lang=en'] },
    google_auth: { ja: ['Google アカウント ヘルプ「Google 認証システムで確認コードを取得する（iPhone と iPad）」', 'https://support.google.com/accounts/answer/1066447?hl=ja&co=GENIE.Platform%3DiOS'],
                   en: ['Google Account Help: Get verification codes with Google Authenticator (iPhone & iPad)', 'https://support.google.com/accounts/answer/1066447?hl=en&co=GENIE.Platform%3DiOS'] },
    ms_auth: { ja: ['Microsoft サポート「Microsoft Authenticator でアカウントをバックアップする」', 'https://support.microsoft.com/ja-jp/authenticator/back-up-your-accounts-in-microsoft-authenticator'],
               en: ['Microsoft Support: Back up your accounts in Microsoft Authenticator', 'https://support.microsoft.com/en-us/authenticator/back-up-your-accounts-in-microsoft-authenticator'] }
  };

  // ネットワーク利用制限の確認ページ（各社公式）
  var CARRIERS = [
    { ja: 'ドコモ', en: 'docomo', url: 'http://nw-restriction.nttdocomo.co.jp/top.php' },
    { ja: 'au / UQ mobile', en: 'au / UQ mobile', url: 'https://www.au.com/support/service/mobile/network-riyoseigen/' },
    { ja: 'ソフトバンク / ワイモバイル', en: 'SoftBank / Y!mobile', url: 'https://www.softbank.jp/mobile/support/3g/restriction/' },
    { ja: '楽天モバイル', en: 'Rakuten Mobile', url: 'https://network.mobile.rakuten.co.jp/restriction/' }
  ];

  var SELLING = { shop: 1, flea: 1, tradein: 1 }; // 家族に譲る(family)以外

  /*
   * 手順定義。when(sel) が true のものだけ出す。
   * sel = { method: 'shop'|'flea'|'tradein'|'family', newIphone: bool, watch: bool,
   *         sim: 'esim'|'physical', line: bool, auth: bool, bank: bool }
   */
  var STEPS = [
    // ===== 1. 準備 =====
    { id: 'backup', group: 'prep', src: ['apple_backup', 'apple_sell'],
      when: function () { return true; },
      ja: { t: 'iCloudでバックアップを作成する',
            b: ['Wi-Fiにつなぐ。',
                '「設定」→［自分の名前］→「iCloud」→「iCloudバックアップ」→「今すぐバックアップを作成」。',
                '終わるまでWi-Fiにつないだままにする。'] },
      en: { t: 'Back up with iCloud',
            b: ['Connect to Wi-Fi.',
                'Settings → [your name] → iCloud → iCloud Backup → Back Up Now.',
                'Stay connected to Wi-Fi until it finishes.'] } },

    { id: 'line', group: 'prep', src: ['line'],
      when: function (s) { return s.line; },
      ja: { t: 'LINEの引き継ぎ準備をする（初期化の前に）',
            b: ['LINE公式ヘルプの「あんぜん引き継ぎガイド」で、今のiPhoneでやる事前準備（登録情報の確認・トーク履歴のバックアップなど）を確認して済ませる。',
                '事前準備をしないと、引き継げない・トーク履歴が戻らないことがあると案内されています。'] },
      en: { t: 'Prepare your LINE account transfer (before erasing)',
            b: ['Follow the preparation on your current iPhone (check registered info, back up chats, etc.) in LINE’s official account transfer guide.',
                'LINE says skipping this may prevent the transfer or chat restore.'] } },

    { id: 'auth', group: 'prep', src: ['google_auth', 'ms_auth'],
      when: function (s) { return s.auth; },
      ja: { t: '認証アプリ（2段階認証）のコードを移す',
            b: ['使っている認証アプリの公式案内で、新しい端末へ移す方法を確認し、初期化の前に済ませる。',
                'Google 認証システム・Microsoft Authenticator は下の公式ヘルプを確認。そのほかのアプリは提供元の公式案内を確認。'] },
      en: { t: 'Move your authenticator app (2FA) codes',
            b: ['Check the official guide for your authenticator app and move the codes before erasing.',
                'Google Authenticator and Microsoft Authenticator: see the official help below. Other apps: see the provider’s official guide.'] } },

    { id: 'bank', group: 'prep', src: [],
      when: function (s) { return s.bank; },
      ja: { t: '銀行・決済アプリの機種変更手続きを確認する',
            b: ['使っている銀行・決済アプリごとに、各サービスの公式案内（機種変更・引き継ぎ）を確認する。',
                '初期化の前に手続きが必要なサービスがあるため、先に確認する。'] },
      en: { t: 'Check the device-change steps for bank and payment apps',
            b: ['For each bank or payment app, check that service’s official device-change / transfer guide.',
                'Some services need steps before erasing, so check first.'] } },

    { id: 'quickstart', group: 'prep', src: ['apple_quickstart', 'apple_sell'],
      when: function (s) { return s.newIphone; },
      ja: { t: '新しいiPhoneへクイックスタートで移す',
            b: ['今のiPhoneをWi-Fiにつなぎ、Bluetoothをオンにする。',
                '新しいiPhoneの電源を入れて、今のiPhoneの近くに置き、画面の案内に従う。',
                '転送が終わるまで、2台とも電源につないで近くに置いておく。',
                '電話番号が変わる場合は、先にApple Accountに信頼できる電話番号を追加しておく。'] },
      en: { t: 'Move to your new iPhone with Quick Start',
            b: ['Connect your current iPhone to Wi-Fi and turn on Bluetooth.',
                'Turn on the new iPhone, place it near the current one, and follow the onscreen steps.',
                'Keep both plugged in and close together until the transfer finishes.',
                'If your phone number will change, add a trusted phone number to your Apple Account first.'] } },

    { id: 'esim_move', group: 'prep', src: ['apple_esim'],
      when: function (s) { return s.newIphone && s.sim === 'esim'; },
      ja: { t: 'eSIMを新しいiPhoneへ移す',
            b: ['eSIMクイック転送：2台とも同じApple Accountにサインインし、Bluetoothをオン、iOS 18.4以降。新しいiPhoneの設定中に案内が出たら従う。',
                'あとから移す場合：新しいiPhoneで「設定」→「モバイル通信」→「モバイル通信を設定」または「eSIMを追加」。',
                'クイック転送は通信事業者が対応している場合だけ使えます。使えない場合は通信事業者に問い合わせる。',
                '新しいiPhoneでプランが有効になると、古いiPhoneのSIMは無効になります。'] },
      en: { t: 'Move your eSIM to the new iPhone',
            b: ['eSIM Quick Transfer: both iPhones signed in to the same Apple Account, Bluetooth on, iOS 18.4 or later. Follow the prompt during setup on the new iPhone.',
                'Later: on the new iPhone, Settings → Cellular (Mobile Service) → Set Up Cellular / Add eSIM.',
                'Quick Transfer works only if your carrier supports it. Otherwise contact your carrier.',
                'Once the plan is active on the new iPhone, the SIM on the old iPhone stops working.'] } },

    { id: 'esim_carrier', group: 'prep', src: ['apple_sell'],
      when: function (s) { return !s.newIphone && s.sim === 'esim'; },
      ja: { t: 'eSIM（回線）の扱いを通信事業者に相談する',
            b: ['eSIMの回線をどうするか（ほかの端末へ移す・解約など）を、契約している通信事業者に相談する。'] },
      en: { t: 'Ask your carrier about your eSIM line',
            b: ['Ask your carrier what to do with the eSIM line (move it to another device, cancel, etc.).'] } },

    { id: 'parts', group: 'prep', src: ['apple_sell'],
      when: function () { return true; },
      ja: { t: '「部品と修理の履歴」を確認する',
            b: ['「修理を完了」と表示された部品がある場合は、修理を完了させる（Appleは下取り前に完了するよう案内しています）。'] },
      en: { t: 'Check Parts and Service History',
            b: ['If any part shows “Finish Repair,” complete the repair (Apple asks you to do this before trade-in).'] } },

    { id: 'imei', group: 'prep', src: ['apple_imei'],
      when: function (s) { return !!SELLING[s.method]; },
      ja: { t: 'IMEIを控えておく（消去の前に）',
            b: ['「設定」→「一般」→「情報」→下にスクロールして「IMEI」を確認し、メモしておく。',
                '最後の「ネットワーク利用制限」の確認で使います。'] },
      en: { t: 'Write down the IMEI (before erasing)',
            b: ['Settings → General → About → scroll down to IMEI and note it.',
                'You’ll use it for the network restriction check at the end.'] } },

    // ===== 2. 個人情報を消す =====
    { id: 'watch', group: 'erase', src: ['apple_watch', 'apple_sell'],
      when: function (s) { return s.watch; },
      ja: { t: 'Apple Watchのペアリングを解除する',
            b: ['Apple WatchとiPhoneを近づける。',
                'iPhoneの「Watch」アプリ→「マイウォッチ」→「すべてのWatch」→対象のWatchの「i」→「Apple Watchとのペアリングを解除」。',
                'モバイル通信プランがある場合は、残すか削除するかを選ぶ。',
                'Apple Accountのパスワードを入力して、アクティベーションロックを解除し、ペアリングを解除する。'] },
      en: { t: 'Unpair your Apple Watch',
            b: ['Keep your Apple Watch and iPhone close together.',
                'On iPhone, open the Watch app → My Watch → All Watches → tap “i” next to the watch → Unpair Apple Watch.',
                'If it has a cellular plan, choose to keep or remove it.',
                'Enter your Apple Account password to turn off Activation Lock and unpair.'] } },

    { id: 'applecare', group: 'erase', src: ['apple_sell'],
      when: function () { return true; },
      ja: { t: 'AppleCareプランを解約するか、新しい持ち主に移す',
            b: ['AppleCareプランに入っていない場合は、チェックだけ付けて次へ。'] },
      en: { t: 'Cancel or transfer your AppleCare plan',
            b: ['If you don’t have an AppleCare plan, just check this and move on.'] } },

    { id: 'imessage', group: 'erase', src: ['apple_sell', 'apple_imessage'],
      when: function (s) { return !s.newIphone; },
      ja: { t: 'iPhone以外の携帯電話に替える場合：iMessageの登録を解除する',
            b: ['Apple製以外の携帯電話に切り替える場合は、iMessageの登録を解除する。',
                'iPhoneを使い続ける・携帯電話を使わない場合は、チェックだけ付けて次へ。'] },
      en: { t: 'Switching to a non-Apple phone: deregister iMessage',
            b: ['If you’re switching to a non-Apple phone, deregister iMessage.',
                'Otherwise, just check this and move on.'] } },

    { id: 'signout', group: 'erase', src: ['apple_sell'],
      when: function () { return true; },
      ja: { t: 'Apple Accountからサインアウトする',
            b: ['iOS 26以降：「設定」→［自分の名前］→下にスクロールして「サインアウト」→「このiPhoneを消去」または「消去せずにサインアウト」を選ぶ。どのアカウントか聞かれたら「iCloudとストアからサインアウト」。',
                'iOS 18以前：「設定」→［自分の名前］→下にスクロールして「サインアウト」→Apple Accountのパスワードを入力して「オフにする」。'] },
      en: { t: 'Sign out of your Apple Account',
            b: ['iOS 26 or later: Settings → [your name] → scroll down → Sign Out → choose “Erase this iPhone” or “Sign Out But Don’t Erase.” If asked, tap “Sign out of iCloud and Store.”',
                'iOS 18 or earlier: Settings → [your name] → scroll down → Sign Out → enter your Apple Account password → Turn Off.'] } },

    { id: 'erase', group: 'erase', src: ['apple_sell'],
      when: function () { return true; },
      ja: { t: 'すべてのコンテンツと設定を消去する',
            b: ['「設定」→「一般」→「転送またはiPhoneをリセット」→「すべてのコンテンツと設定を消去」。',
                '求められたらパスコードを入力し、「iPhoneを消去」をタップ。',
                '「探す」がオンだと、Apple Accountとパスワードを聞かれることがあります。消去すると「探す」とアクティベーションロックはオフになります。'] },
      en: { t: 'Erase All Content and Settings',
            b: ['Settings → General → Transfer or Reset iPhone → Erase All Content and Settings.',
                'Enter your passcode if asked, then tap Erase iPhone.',
                'If Find My is on, you may need your Apple Account and password. Erasing turns off Find My and Activation Lock.'] } },

    { id: 'erase_esim', group: 'erase', src: ['apple_sell'],
      when: function (s) { return s.sim === 'esim'; },
      ja: { t: '消去の確認画面で、eSIMも消去する方を選ぶ',
            b: ['eSIMを搭載したiPhoneを売る・譲る場合は、消去の確認画面でeSIMプロファイルも消去する方を選ぶ（Apple公式の案内）。',
                '回線をほかの端末へ移す予定なら、先に通信事業者の手続きを済ませておく。'] },
      en: { t: 'On the erase screen, choose to erase the eSIM too',
            b: ['When selling or giving away an iPhone with eSIM, choose to erase the eSIM profile on the confirmation screen (per Apple).',
                'If you plan to move the line to another device, finish the carrier steps first.'] } },

    { id: 'trusted', group: 'erase', src: ['apple_sell'],
      when: function () { return true; },
      ja: { t: '信頼できるデバイスのリストから古いiPhoneを削除する',
            b: ['Apple Accountの「信頼できるデバイス」の一覧から、手放すiPhoneを削除する。'] },
      en: { t: 'Remove the old iPhone from your trusted devices',
            b: ['Remove the iPhone you’re letting go from your Apple Account’s trusted device list.'] } },

    // ===== 3. 売る前の最終確認 =====
    { id: 'final_alock', group: 'final', src: ['apple_alock'],
      when: function () { return true; },
      ja: { t: 'アクティベーションロックが外れているか（「こんにちは」画面）',
            b: ['電源を入れて、「こんにちは」画面が出ればOK。',
                'パスコードのロック画面やホーム画面が出る → まだ消去されていません。',
                '設定を進めて自分のApple Accountを求められる → まだアカウントに紐付いています。サインアウトと消去をやり直す。'] },
      en: { t: 'Activation Lock is off (“Hello” screen)',
            b: ['Turn it on. If you see the “Hello” screen, you’re good.',
                'Passcode lock screen or Home Screen → it hasn’t been erased yet.',
                'Setup asks for your Apple Account → it’s still linked. Sign out and erase again.'] } },

    { id: 'final_sim', group: 'final', src: [],
      when: function (s) { return s.sim === 'physical'; },
      ja: { t: 'SIMカードを抜いたか',
            b: ['SIMトレイにSIMカードが残っていないか確かめる。'] },
      en: { t: 'SIM card removed',
            b: ['Make sure no SIM card is left in the SIM tray.'] } },

    { id: 'final_esim', group: 'final', src: ['apple_sell'],
      when: function (s) { return s.sim === 'esim'; },
      ja: { t: 'eSIMを消去したか',
            b: ['消去のときにeSIMも消去する方を選んだか確かめる。わからない場合は通信事業者に確認する。'] },
      en: { t: 'eSIM erased',
            b: ['Make sure you chose to erase the eSIM when erasing. If unsure, check with your carrier.'] } },

    { id: 'final_items', group: 'final', src: [],
      when: function () { return true; },
      method: {
        shop:    { ja: '付属品（箱・ケーブルなど）が必要か、買取店の条件を確認してそろえる。', en: 'Check the shop’s conditions for accessories (box, cable, etc.) and gather them.' },
        flea:    { ja: '出品ページに書いた付属品（箱・ケーブルなど）をそろえる。', en: 'Gather the accessories (box, cable, etc.) listed in your item description.' },
        tradein: { ja: '付属品が必要か、下取り窓口の案内を確認する。', en: 'Check the trade-in program’s instructions about accessories.' },
        family:  { ja: '一緒に渡すもの（ケーブルなど）をそろえる。', en: 'Gather anything you’ll hand over with it (cable, etc.).' }
      },
      ja: { t: '付属品をそろえたか', b: [] },
      en: { t: 'Accessories ready', b: [] } },

    { id: 'final_nw', group: 'final', src: [], carriers: true,
      when: function (s) { return !!SELLING[s.method]; },
      ja: { t: 'ネットワーク利用制限を確認したか',
            b: ['iPhoneを買ったキャリアの確認ページで、控えたIMEIを入力して結果を確かめる。'] },
      en: { t: 'Network restriction checked',
            b: ['Enter the IMEI you noted on the check page of the carrier you bought the iPhone from (Japanese carriers).'] } }
  ];

  var GROUPS = [
    { id: 'prep', ja: '1. 準備', en: '1. Prepare' },
    { id: 'erase', ja: '2. 個人情報を消す', en: '2. Remove your data' },
    { id: 'final', ja: '3. 売る前の最終確認', en: '3. Final check before handing over' }
  ];

  function buildSteps(sel) {
    return STEPS.filter(function (st) { return st.when(sel); });
  }
  function showAds(sel) { return sel.method === 'shop' || sel.method === 'flea'; }

  var api = { SRC: SRC, CARRIERS: CARRIERS, STEPS: STEPS, GROUPS: GROUPS, buildSteps: buildSteps, showAds: showAds };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SellCheckSteps = api;
})(this);
