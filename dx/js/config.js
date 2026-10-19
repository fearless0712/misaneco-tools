/* 業務の自動化 診断＆推進プラン — 設定
   submitUrl が空（""）のあいだは、送信のお知らせも送信の処理も一切動きません（通信なし）。

   集計を始めるとき（Google フォームの formResponse の URL、または Google Apps Script のウェブアプリの URL）：
   1. submitUrl に https:// から始まる URL を入れる
   2. fields に、送る項目ごとの名前を入れる（Google フォームなら entry.123456789 の形。Apps Script なら受け取り側の名前）
   3. index.html の Content-Security-Policy の connect-src に、送信先のオリジンを足す
      （例：connect-src https://docs.google.com または https://script.google.com https://script.googleusercontent.com）
   送るのは js/logic.js の buildPayload が作る6項目だけです（自由記入の文章・名前・連絡先は入りません）。 */
window.DX_CONFIG = {
  submitUrl: '',
  fields: {
    industry: 'industry',
    tasks: 'tasks',
    env: 'env',
    methods: 'methods',
    date: 'date',
    version: 'version'
  }
};
