/* RepairCheck logic — pure functions (browser + Node). No network, no DOM.
   D = data/plans.json, A = data/apple_repair.json */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RC = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var URL = {
    coverage: 'https://checkcoverage.apple.com/jp/ja',
    appleRepair: 'https://support.apple.com/ja-jp/iphone/repair',
    aasp: 'https://locate.apple.com/jp/ja/',
    soumuSearch: 'https://www.tele.soumu.go.jp/nintei/SearchServlet?pageID=ss01',
    soumu: 'https://www.tele.soumu.go.jp/j/sys/others/repairer/'
  };
  var DAMAGE = { screen: '画面割れ', water: '水没・水濡れ', battery: 'バッテリーの減りが早い', nopower: '電源が入らない・起動しない', lost: '紛失・盗難' };
  var COVER = { applecare: 'AppleCare+', carrier: 'キャリアの補償', insurance: 'スマホ保険', none: '入っていない', unknown: 'わからない' };
  var CARRIER = { docomo: 'ドコモ', au: 'au', softbank: 'ソフトバンク', rakuten: '楽天モバイル', other: 'その他' };

  function yen(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '円'; }
  function plan(D, id) { for (var i = 0; i < D.plans.length; i++) if (D.plans[i].id === id) return D.plans[i]; return null; }
  function fact(D, id) { var a = D.facts.items; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  function appleModel(A, id) { if (!A || !id) return null; for (var i = 0; i < A.models.length; i++) if (A.models[i].id === id) return A.models[i]; return null; }
  function carrierPlan(D, carrier, os) {
    if (carrier === 'docomo') return plan(D, 'docomo');
    if (carrier === 'au' || carrier === 'softbank' || carrier === 'rakuten') return plan(D, carrier + '-' + os);
    return null;
  }
  function factRef(D, id) { var f = fact(D, id); return f ? { text: f.text, url: f.source_url } : null; }

  /* Apple out-of-warranty estimate lines for a damage type */
  function appleLines(m, damage) {
    if (!m) return [];
    var re = { screen: /画面の損傷|ディスプレイの損傷|カバーレイヤー/, water: /^その他の損傷$/, nopower: /^その他の損傷$/, battery: /バッテリー/ }[damage];
    if (!re) return [];
    return m.prices.filter(function (p) { return re.test(p.label) && !/背面ガラス/.test(p.label); })
      .map(function (p) { return { label: 'Apple（保証対象外）：' + p.label, yen: p.yen }; });
  }

  /* ---------- mode 1: broken now ---------- */
  function firstSteps(D, inp) {
    var s = [], ios = inp.os === 'iphone';
    if (inp.damage === 'lost') {
      s.push(factRef(D, ios ? 'appleLost' : 'googleFind'));
      if (ios && inp.cover === 'applecare') s.push(factRef(D, 'appleLostKeep'));
      s.push(factRef(D, 'appleLostPolice'));
      if (inp.cover === 'carrier' || inp.cover === 'insurance') s.push({ text: '補償・保険の請求には、警察に届け出たときの受理番号などを聞かれることがあります。届け出先・日付・受理番号を控えておきましょう。', url: (carrierPlan(D, inp.carrier, inp.os) || plan(D, 'docomo')).source_url });
    } else {
      if (inp.damage !== 'nopower') s.push(factRef(D, ios ? 'appleBackup' : 'googleBackup'));
      else s.push({ text: '電源が入らないときは、修理に出す前に、最後にバックアップした日を確認しましょう（iPhoneなら別の端末やiCloud.comで確認できます）。修理や交換で端末が初期化されることがあります。', url: ios ? fact(D, 'appleBackup').source_url : fact(D, 'googleBackup').source_url });
      if (inp.cover === 'unknown') s.push(ios
        ? { text: 'AppleCare+や保証の期間は、Appleの「保証状況とサービス期間の確認」で調べられます。キャリアの補償は、各社の会員ページで確認できます。', url: URL.coverage }
        : { text: '補償に入っているかは、契約した会社の会員ページ（My docomo・My au・My SoftBank・my 楽天モバイルなど）で確認できます。', url: null });
    }
    return s.filter(Boolean);
  }

  function repairOptions(D, A, inp) {
    var ios = inp.os === 'iphone', dmg = inp.damage, out = [];
    var am = ios ? appleModel(A, inp.model) : null;
    var ac = plan(D, 'applecare'), cp = inp.cover === 'carrier' ? carrierPlan(D, inp.carrier, inp.os) : null;
    var isDuo = inp.model === 'iphone-duo';

    // 1) carrier plan
    if (inp.cover === 'carrier') {
      if (cp) {
        var c = { id: 'carrier', title: cp.provider + '「' + cp.name + '」', kind: 'carrier', cost: [], notes: [], cautions: [], url: cp.source_url };
        var f = cp.fees || {};
        if (dmg === 'lost') {
          if (cp.id === 'docomo') c.cost.push({ label: '交換（ご負担金・月額の区分による）', text: yen(f.exchangeMin) + '〜' + yen(f.exchangeMax) });
          else if (f.lost === 'same' && f.exchangeMin) c.cost.push({ label: '交換（自己負担）', text: yen(f.exchangeMin) + (f.exchangeMax ? '〜' + yen(f.exchangeMax) : '〜') });
          else if (typeof f.lost === 'number') c.cost.push({ label: '紛失・盗難の交換（自己負担）', yen: f.lost });
        } else if (dmg === 'battery' && ios && cp.id !== 'docomo') {
          if (f.battery === 0) c.cost.push({ label: 'バッテリー（容量が本来の80%未満の場合）', yen: 0 });
          else c.cost.push({ label: 'バッテリー', text: '自然故障は無償。バッテリーの条件は公式で確認' });
        } else {
          if (f.screen && dmg === 'screen') c.cost.push({ label: '画面の修理（自己負担）', yen: f.screen });
          if (f.screenMin && dmg === 'screen') c.cost.push({ label: '過失や事故による損傷の修理（自己負担）', text: yen(f.screenMin) + '〜' + yen(f.other) });
          if (isDuo && f.duoCover && dmg === 'screen') c.cost.push({ label: 'カバー層の修理（iPhone Duo）', yen: f.duoCover });
          if (f.other && (dmg === 'water' || dmg === 'nopower') && !f.screenMin) c.cost.push({ label: 'その他の損傷の修理（自己負担）', yen: f.other });
          if (f.screenMin && (dmg === 'water' || dmg === 'nopower')) c.cost.push({ label: '過失や事故による損傷の修理（自己負担）', text: yen(f.screenMin) + '〜' + yen(f.other) });
          if (f.exchange) c.cost.push({ label: '交換（自己負担）', yen: f.exchange });
          if (cp.id === 'docomo') c.cost.push({ label: '交換（ご負担金・月額の区分による）', text: yen(f.exchangeMin) + '〜' + yen(f.exchangeMax) });
          if (f.exchangeMin && cp.id !== 'docomo') c.cost.push({ label: '交換（自己負担）', text: yen(f.exchangeMin) + (f.exchangeMax ? '〜' + yen(f.exchangeMax) : '〜') + '（機種による）' });
        }
        c.notes.push('仕組み：' + cp.how);
        if (cp.limits) c.notes.push('回数：' + cp.limits);
        (cp.notes || []).forEach(function (n) { c.notes.push(n); });
        out.push(c);
      } else {
        out.push({ id: 'carrier', title: '契約しているキャリアの補償', kind: 'carrier', cost: [{ label: '費用の目安', text: 'このツールでは未確認（契約先の公式ページで確認）' }], notes: ['ドコモ・au・ソフトバンク・楽天モバイル以外は、このツールに料金を載せていません。'], cautions: [], url: null });
      }
    }

    // 2) insurance
    if (inp.cover === 'insurance') {
      var mh = plan(D, 'mobile-hoken');
      var ins = { id: 'insurance', title: '加入中のスマホ保険に請求', kind: 'insurance', cost: [{ label: '費用', text: '保険の約款・補償内容による（自己負担・上限は商品ごとに違う）' }], notes: ['多くの場合、先に修理して代金を払い、あとで書類をそろえて請求します。請求に必要な書類（修理明細・領収書など）を、修理の前に保険会社の案内で確認しましょう。', '例：' + mh.name + ' は、領収書と修理内容が書かれた「リペアレポート」が必要。自己負担なし、修理費は年間最大15万円（主端末）、修理不能・盗難は37,500円まで。'], cautions: [], url: mh.source_url };
      if (dmg === 'lost') ins.cautions.push('例に挙げたモバイル保険は「置き忘れまたは紛失」が補償の対象外です（盗難は対象）。加入中の保険の約款で、紛失が対象か確認してください。');
      out.push(ins);
    }

    if (dmg === 'lost') {
      if (ios && inp.cover === 'applecare') {
        out.unshift({ id: 'apple', title: 'Apple：AppleCare+ 盗難・紛失プランの補償請求', kind: 'apple', cost: [{ label: '盗難・紛失の交換（サービス料）', yen: ac.fees.lost }], notes: ['盗難・紛失プランのときだけ。1年間に2回まで。', '補償請求が承認されるまで、「探す」やApple AccountからiPhoneを削除しないでください。'], cautions: ['盗難・紛失プランではないAppleCare+の場合、紛失は対象外です。加入中のプラン名を確認してください。'], url: ac.source_url });
      }
      if (inp.cover === 'none' || inp.cover === 'unknown') {
        out.push({ id: 'none-lost', title: '保証・補償なしの場合', kind: 'none', cost: [{ label: '修理', text: '紛失・盗難は修理ができないため、見つからなければ買い替えになります' }], notes: ['次の端末では「これから入る」の比較で、紛失・盗難が対象の補償を検討できます。'], cautions: [], url: null });
      }
      return rank(out, inp);
    }

    // 3) manufacturer official
    if (ios) {
      var ap = { id: 'apple', title: 'Apple（Apple Store・配送修理）', kind: 'apple', cost: [], notes: [], cautions: [], url: URL.appleRepair };
      if (inp.cover === 'applecare') {
        if (dmg === 'screen') { ap.cost.push({ label: isDuo ? '外側ディスプレイ・背面ガラス（サービス料）' : '画面・背面ガラス（サービス料）', yen: ac.fees.screen }); if (isDuo) { ap.cost.push({ label: 'カバー層のみ（iPhone Duo）', yen: ac.fees.duoCover }); ap.cost.push({ label: '内部ディスプレイ（iPhone Duo）', yen: ac.fees.duoInner }); } }
        if (dmg === 'water' || dmg === 'nopower') ap.cost.push({ label: 'その他の過失や事故による損傷（サービス料）', yen: ac.fees.other });
        if (dmg === 'battery') ap.cost.push({ label: 'バッテリー（容量が本来の80%未満）', yen: 0 });
        if (dmg === 'nopower') ap.notes.push('落下や水濡れがなく製造上の問題と診断されれば、保証の範囲で対応されることがあります（診断で決まります）。');
        ap.notes.push('AppleCare+の過失や事故による損傷の修理は回数制限なし（Apple公式）。');
      } else {
        if (inp.cover === 'carrier' && (inp.carrier === 'au' || inp.carrier === 'softbank' || inp.carrier === 'rakuten')) ap.notes.push('この欄の金額は、補償を使わない場合のAppleの見積額です。' + CARRIER[inp.carrier] + 'のiPhone向け補償はAppleでの修理も対象なので、補償を使うときは上のキャリアの欄の自己負担額を確認してください。');
        var lines = appleLines(am, dmg);
        lines.forEach(function (l) { ap.cost.push(l); });
        if (!am) ap.cost.push({ label: '費用の目安', text: '機種を選ぶと、Apple公式の見積額（保証対象外）を表示します' });
        if (dmg === 'nopower' || dmg === 'battery') ap.notes.push(fact(D, 'appleWarranty1y').text);
        if (dmg === 'nopower') ap.notes.push('電源が入らない原因は診断で決まります。上の金額は「その他の損傷」の場合の見積額で、原因によって変わります。');
      }
      ap.notes.push(fact(D, 'appleEstimate').text);
      out.push(ap);

      var aasp = { id: 'aasp', title: 'Apple正規サービスプロバイダ（店頭）', kind: 'aasp', cost: [], notes: ['Appleが認定した修理店。Apple認定の修理サービスはApple純正部品を使います（Apple公式）。'], cautions: [], url: URL.aasp };
      if (inp.cover === 'applecare') aasp.cost.push({ label: 'AppleCare+の対象修理', text: 'Appleと同じサービス料（Apple公式）' });
      else aasp.cost.push({ label: '費用', text: '店ごとに独自の料金（Apple公式）。見積もりは店で確認' });
      out.push(aasp);
    } else {
      out.push({ id: 'maker', title: 'メーカーの修理窓口', kind: 'apple', cost: [{ label: '費用', text: 'メーカーごとに違うため、このツールには載せていません（公式の修理料金ページで確認）' }], notes: ['購入から1年以内などのメーカー保証の期間なら、自然故障は保証で直る場合があります。条件は各メーカーの保証規定で確認してください。'], cautions: [], url: null });
    }

    // 4) registered repairer (third party)
    var reg = { id: 'registered', title: '登録修理業者（総務省に登録した修理店）', kind: 'third', cost: [{ label: '費用', text: '店ごとに違う（このツールには載せていません）' }], notes: [fact(D, 'soumuRepairer').text, fact(D, 'soumuSearch').text], cautions: [], url: URL.soumuSearch };
    if (ios) {
      reg.cautions.push(fact(D, 'appleWarrantyF').text);
      reg.cautions.push(fact(D, 'appleParts').text);
    } else {
      reg.cautions.push('メーカー以外で修理すると、メーカー保証の対象から外れる場合があります。条件は各メーカーの保証規定で確認してください。');
    }
    if (inp.cover === 'applecare' || inp.cover === 'carrier') reg.cautions.push('AppleCare+やキャリア補償の自己負担額は、各サービスが案内する窓口（Apple・正規サービスプロバイダ・キャリアなど）で修理・交換したときの金額です。');
    out.push(reg);
    return rank(out, inp);
  }

  /* order with a conditional "first to check" tag — never an absolute recommendation */
  function rank(opts, inp) {
    var first = null;
    if (inp.damage === 'lost') first = inp.cover === 'applecare' ? 'apple' : inp.cover === 'carrier' ? 'carrier' : inp.cover === 'insurance' ? 'insurance' : null;
    else if (inp.cover === 'applecare') first = 'apple';
    else if (inp.cover === 'carrier') first = 'carrier';
    else if (inp.cover === 'insurance') first = 'insurance';
    var order = { carrier: 1, insurance: 1, apple: 2, maker: 2, aasp: 3, registered: 4, 'none-lost': 5 };
    opts.sort(function (a, b) {
      var fa = a.id === first ? 0 : order[a.id] || 9, fb = b.id === first ? 0 : order[b.id] || 9;
      return fa - fb;
    });
    opts.forEach(function (o) { o.first = (o.id === first); });
    if (first) {
      var why = { apple: 'AppleCare+に加入中なら', carrier: 'キャリアの補償に加入中なら', insurance: 'スマホ保険に加入中なら' }[first];
      opts.forEach(function (o) { if (o.first) o.why = why + '、まずここで条件と自己負担を確認'; });
    }
    return opts;
  }

  function diagnoseNow(D, A, inp) {
    var v = validateNow(inp);
    if (v) return { error: v };
    return { steps: firstSteps(D, inp), options: repairOptions(D, A, inp), model: inp.os === 'iphone' ? appleModel(A, inp.model) : null };
  }
  function validateNow(inp) {
    if (!inp || (inp.os !== 'iphone' && inp.os !== 'android')) return 'os';
    if (!DAMAGE[inp.damage]) return 'damage';
    if (!COVER[inp.cover]) return 'cover';
    if (inp.cover === 'applecare' && inp.os !== 'iphone') return 'cover';
    if (inp.cover === 'carrier' && !CARRIER[inp.carrier]) return 'carrier';
    return null;
  }

  /* ---------- mode 2: before you buy ---------- */
  function comparePlans(D, A, inp) {
    if (!inp || (inp.os !== 'iphone' && inp.os !== 'android')) return { error: 'os' };
    var ios = inp.os === 'iphone', rows = [], hints = [];
    var band = null;
    D.priceBands.forEach(function (b) { if (b.id === inp.band) band = b; });
    if (!band) return { error: 'band' };
    var mid = ios ? inp.model : null;

    function row(p, monthly, monthlyText, screen, other, lost, extra) {
      var r = { id: p.id, name: p.name, provider: p.provider, url: p.source_url, monthly: monthly, monthlyText: monthlyText,
        twoYears: typeof monthly === 'number' ? monthly * 24 : null, screen: screen, other: other, lost: lost,
        limits: p.limits, join: p.join, notes: (p.notes || []).slice(), checked: p.checked };
      if (extra) r.notes = extra.concat(r.notes);
      return r;
    }

    if (ios) {
      var ac = plan(D, 'applecare'), m = ac.monthlyByModel[mid];
      rows.push(row(ac, m != null ? m : null, m != null ? null : 'この機種はApple公式の料金表に記載なし（公式で確認）',
        yen(ac.fees.screen), yen(ac.fees.other), yen(ac.fees.lost)));
    }
    var carriers = inp.carrier && inp.carrier !== 'apple' && inp.carrier !== 'other' ? [inp.carrier] : [];
    carriers.forEach(function (cid) {
      var cp = carrierPlan(D, cid, inp.os);
      if (!cp) return;
      var f = cp.fees || {}, monthly = null, mt = null;
      if (cp.monthlyByModel) { monthly = mid && cp.monthlyByModel[mid] != null ? cp.monthlyByModel[mid] : null; if (monthly == null) mt = mid ? 'この機種は公式の料金表で確認できず（公式で確認）' : '機種による'; }
      else if (cp.monthlyByBand) { monthly = cp.monthlyByBand[band.id]; mt = null; }
      else if (cp.monthlyRange) { mt = yen(cp.monthlyRange[0]) + '〜' + yen(cp.monthlyRange[1]) + '（機種による）'; }
      var scr, oth, lst;
      if (cp.id === 'docomo') { scr = oth = lst = '交換 ' + yen(f.exchangeMin) + '〜' + yen(f.exchangeMax); }
      else if (cp.id === 'au-android') { scr = oth = lst = '交換 ' + yen(f.exchangeMin) + '〜（機種・回数による）'; }
      else if (cp.id === 'rakuten-android') { scr = oth = lst = '交換 ' + yen(f.exchangeMin) + 'または' + yen(f.exchangeMax); }
      else if (cp.id === 'softbank-android') { scr = oth = '配送交換 ' + yen(f.exchange); lst = '配送交換 ' + yen(f.lost); }
      else if (cp.id === 'softbank-iphone') { scr = yen(f.screenMin) + '〜'; oth = '〜' + yen(f.other); lst = yen(f.lost); }
      else { scr = yen(f.screen); oth = yen(f.other); lst = yen(f.lost); }
      var extra = cp.monthlyNote ? [cp.monthlyNote] : [];
      if (cp.id === 'rakuten-android') extra.push('端末価格（税別）' + band.rakuten + 'の月額');
      rows.push(row(cp, monthly, mt, scr, oth, lst, extra));
    });
    var mh = plan(D, 'mobile-hoken');
    rows.push(row(mh, mh.monthly, null, '自己負担なし（年15万円まで）', '自己負担なし（年15万円まで）', '盗難は37,500円まで／紛失は対象外'));

    // conditional hints (never "you should buy X")
    if (inp.care === 'often') hints.push({ text: '落としやすいなら、「1年に使える回数」と「1回あたりの自己負担」を並べて見てください。' + (ios ? 'AppleCare+の過失や事故による損傷の修理は回数制限なし（Apple公式）、' : '') + 'キャリアの交換型は1年に2〜3回まで、モバイル保険は回数ではなく年間の金額の上限（15万円）です。', ok: true });
    if (inp.lossWorry) hints.push({ text: '紛失にも備えたいなら、紛失・盗難が対象のプランかを確認してください。例に挙げたモバイル保険は「置き忘れ・紛失」が対象外で、盗難は37,500円までです。', ok: true });
    if (inp.multi) hints.push({ text: '2台以上（タブレット・イヤホン等）をまとめたいなら、モバイル保険は1契約で3台まで登録できます（主端末1台・副端末2台）。', ok: true });
    if (ios && inp.carrier === 'docomo') hints.push({ text: 'ドコモの smartあんしん補償に入ると、同じ回線の AppleCare+ for iPhone は自動で解約されます（ドコモ公式）。両方に入る前提では考えないでください。', ok: false });
    if (inp.carrier && inp.carrier !== 'apple' && inp.carrier !== 'other') hints.push({ text: 'キャリアの補償は「購入と同時」または「購入から14日以内」など、入れる時期が短いものが多いです。表の「入れる時期」を確認してください。', ok: false });
    if (inp.carrier === 'apple' || inp.carrier === 'other' || !inp.carrier) hints.push({ text: 'キャリアの補償は、そのキャリアで端末を買うときの加入が基本です（ドコモは新規契約・乗り換えのときに持ち込み機種で入れる場合あり）。キャリア以外で買うなら、AppleCare+（iPhone）か単体の保険も比べてください。', ok: false });

    var ref = null;
    if (ios) {
      var am = appleModel(A, mid);
      if (am) {
        var scrLine = am.prices.filter(function (p) { return p.label === '画面の損傷' || p.label === 'アウターディスプレイの損傷'; })[0];
        var oth2 = am.prices.filter(function (p) { return p.label === 'その他の損傷'; })[0];
        ref = { model: am.name, screen: scrLine ? scrLine.yen : null, other: oth2 ? oth2.yen : null };
      }
    }
    return { rows: rows, hints: hints, ref: ref, band: band };
  }

  return { yen: yen, DAMAGE: DAMAGE, COVER: COVER, CARRIER: CARRIER, URL: URL,
    appleModel: appleModel, appleLines: appleLines, carrierPlan: carrierPlan,
    firstSteps: firstSteps, repairOptions: repairOptions, diagnoseNow: diagnoseNow, validateNow: validateNow, comparePlans: comparePlans };
});
