/* 帳簿書類の保存期間（個人事業主）。国税庁「記帳や帳簿等保存・青色申告」（令和8年4月1日現在法令等）で2026-10-19に確認。 */
(function (root) {
  /* o: { kind: 'blue'|'white', low300: bool（前々年分の事業所得＋不動産所得が300万円以下）, invoice: bool（課税事業者・適格請求書発行事業者）, zatsu300: bool（雑所得の業務で前々年分の収入が300万円超） } */
  function list(o) {
    var r = [];
    if (o.kind === 'blue') {
      r.push({ what: '帳簿', ex: '仕訳帳、総勘定元帳、現金出納帳、売掛帳、買掛帳、経費帳、固定資産台帳など', years: 7 });
      r.push({ what: '決算関係書類', ex: '損益計算書、貸借対照表、棚卸表など', years: 7 });
      r.push({ what: '現金預金取引等関係書類', ex: '領収証、小切手控、預金通帳、借用証など', years: o.low300 ? 5 : 7, note: o.low300 ? '前々年分の事業所得・不動産所得が300万円以下のため5年' : '' });
      r.push({ what: 'その他の書類', ex: '請求書、見積書、契約書、納品書、送り状など', years: 5 });
    } else {
      r.push({ what: '法定帳簿', ex: '収入金額や必要経費を記載した帳簿', years: 7 });
      r.push({ what: '任意帳簿', ex: '業務に関して作成した上記以外の帳簿', years: 5 });
      r.push({ what: '決算に関して作成した書類', ex: '棚卸表その他の書類', years: 5 });
      r.push({ what: '業務に関して作成・受領した書類', ex: '請求書、納品書、送り状、領収書など', years: 5 });
    }
    if (o.zatsu300) r.push({ what: '雑所得の業務の現金預金取引等関係書類', ex: '前々年分の業務の収入金額が300万円超', years: 5 });
    if (o.invoice) {
      r.push({ what: 'インボイス関係', ex: '仕入税額控除のために保存する請求書等、交付した適格請求書の写し・提供した電磁的記録', years: 7, note: '上の区分にかかわらず7年' });
      r.forEach(function (x) { if (/請求書/.test(x.ex) && x.years < 7 && x.what !== 'インボイス関係') x.note = (x.note ? x.note + '／' : '') + 'インボイス関係の請求書等は7年'; });
    }
    return r;
  }
  var API = { list: list };
  if (typeof module !== 'undefined') module.exports = API; else root.HOZON = API;
})(this);
