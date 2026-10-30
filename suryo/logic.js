/* 建設の数量計算（塗料・配管・残土・クロス・タイル・生コン・足場）の計算部分（ブラウザ・node 共通） */
(function (root) {
  // 浮動小数の誤差（例：4.000000000001）で1つ多く切り上げないよう、12桁に丸めてから扱う
  function r12(x) { return Number(Number(x).toPrecision(12)); }
  // ExcelのROUNDUP(x,0)（正の数）
  function ceil(x) { return Math.ceil(r12(x)); }
  // ExcelのCEILING(x,step)（正の数）
  function ceilStep(x, step) { return r12(Math.ceil(r12(x / step)) * step); }

  // "1,234.5" "１２．５" "10%" "23.5m" → 数。空は null、読めないものは NaN
  function num(s) {
    if (s === null || s === undefined) return null;
    if (typeof s === 'number') return s;
    var t = String(s).replace(/[０-９．－]/g, function (c) { return c === '．' ? '.' : c === '－' ? '-' : String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[\s,，]/g, '').replace(/^[−ー]/, '-').replace(/(㎡|㎥|m2|m3|mm|cm|kg|t|m|%|％|本|台|枚|缶|回|区間|か所|箇所)$/i, '');
    if (t === '') return null;
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return NaN;
    return parseFloat(t);
  }
  // 画面の表示：小数は d 桁まで（末尾の0は消す）
  function fmt(x, d) {
    if (d === undefined) d = 3;
    var s = r12(x).toFixed(d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    var p = s.split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.join('.');
  }
  // Excelの式に入れる数（半角・カンマなし）
  function xn(x) { return String(r12(x)); }

  // 入力の確認。rules: [key, 名前, 'pos'（0より大）| 'nonneg'（0以上）| 'int0'（0以上の整数）| 'int1'（1以上の整数）| 'add'（空なら0・0以上）| 'pct'（0〜100）| 'opt'（空なら使わない・0より大）]
  function read(input, rules) {
    var v = {}, errors = [];
    rules.forEach(function (r) {
      var k = r[0], name = r[1], kind = r[2], x = num(input[k]);
      if (x === null) {
        if (kind === 'opt') { v[k] = null; return; }
        if (kind === 'pct' || kind === 'int0' || kind === 'add') { v[k] = 0; return; }
        errors.push(name + 'を入れてください'); return;
      }
      if (Number.isNaN(x)) { errors.push(name + 'は数字で入れてください'); return; }
      if (x < 0) { errors.push(name + 'にマイナスは入れられません'); return; }
      if ((kind === 'pos' || kind === 'opt') && x === 0) { errors.push(name + 'は0より大きい数を入れてください'); return; }
      if ((kind === 'int0' || kind === 'int1') && Math.floor(x) !== x) { errors.push(name + 'は整数で入れてください'); return; }
      if (kind === 'int1' && x < 1) { errors.push(name + 'は1以上で入れてください'); return; }
      if (kind === 'pct' && x > 100) { errors.push(name + 'は0〜100（％）で入れてください'); return; }
      v[k] = x;
    });
    return { v: v, errors: errors };
  }
  function fail(errors) { return { ok: false, errors: errors }; }
  function lossX(pct) { return pct ? '*(1+' + xn(pct / 100) + ')' : ''; }
  function lossT(pct) { return pct ? ' × ' + fmt(1 + pct / 100, 4) : ''; }

  // 塗料：必要量＝面積×塗布量×回数×(1＋ロス率)。同じ塗料の工程は合計してから1回だけ切り上げる
  function toryo(input) {
    var q = read(input, [['area', '塗る面積', 'nonneg'], ['rate', '塗布量', 'pos'], ['coats', '回数', 'int1'], ['loss', 'ロス率', 'pct'], ['can', '1缶の量', 'pos']]);
    if (q.errors.length) return fail(q.errors);
    var v = q.v, per = r12(v.area * v.rate * (1 + v.loss / 100)), total = r12(per * v.coats);
    var cans = ceil(total / v.can), each = ceil(per / v.can), byStep = each * v.coats;
    var steps = [
      '1回分：' + fmt(v.area, 2) + ' × ' + fmt(v.rate, 4) + lossT(v.loss) + ' ＝ ' + fmt(per, 2) + 'kg',
      '合計：' + fmt(per, 2) + 'kg × ' + v.coats + '回 ＝ ' + fmt(total, 2) + 'kg',
      fmt(total, 2) + ' ÷ ' + fmt(v.can, 2) + ' ＝ ' + fmt(total / v.can, 3) + ' → 切り上げて ' + cans + '缶',
      '余り：' + fmt(cans * v.can - total, 2) + 'kg'
    ];
    if (v.coats > 1) steps.push('くらべ：1回ごとに切り上げると ' + each + '缶 × ' + v.coats + '回 ＝ ' + byStep + '缶' + (byStep > cans ? '（' + (byStep - cans) + '缶多い）' : '（同じ）'));
    return {
      ok: true, value: cans, unit: '缶', sub: '必要量 ' + fmt(total, 2) + 'kg', total: total, perCoat: per, byStep: byStep, rest: r12(cans * v.can - total), steps: steps,
      excel: ['=ROUNDUP(' + xn(v.area) + '*' + xn(v.rate) + '*' + xn(v.coats) + lossX(v.loss) + '/' + xn(v.can) + ',0)']
    };
  }

  // 配管：総延長＝測った長さ＋区間数×(受口×2＋切り代)。余裕は総延長に掛けてから、定尺で割って切り上げ
  function haikan(input) {
    var q = read(input, [['len', '測った長さの合計', 'nonneg'], ['sec', '区間の数', 'int0'], ['sock', '受口の長さ', 'add'], ['cut', '切り代', 'add'], ['margin', '余裕', 'pct'], ['stock', '1本の長さ（定尺）', 'pos']]);
    if (q.errors.length) return fail(q.errors);
    var v = q.v, add1 = r12(v.sock / 1000 * 2 + v.cut / 1000), add = r12(v.sec * add1), total = r12(v.len + add);
    var withM = r12(total * (1 + v.margin / 100)), pipes = ceil(withM / v.stock);
    var steps = [];
    if (v.sec > 0) steps.push('総延長：' + fmt(v.len, 3) + ' ＋ ' + v.sec + '区間 ×（' + fmt(v.sock / 1000, 4) + '×2 ＋ ' + fmt(v.cut / 1000, 4) + '）＝ ' + fmt(total, 3) + 'm');
    else steps.push('総延長：' + fmt(total, 3) + 'm（区間の数が0なので、差し込み・切り代は足していません）');
    if (v.margin) steps.push('余裕' + fmt(v.margin, 2) + '%：' + fmt(total, 3) + ' × ' + fmt(1 + v.margin / 100, 4) + ' ＝ ' + fmt(withM, 3) + 'm');
    steps.push(fmt(withM, 3) + ' ÷ ' + fmt(v.stock, 3) + ' ＝ ' + fmt(withM / v.stock, 3) + ' → 切り上げて ' + pipes + '本');
    steps.push('くらべ：余裕を入れずに割ってから1本足すと ' + (ceil(total / v.stock) + 1) + '本');
    var base = v.sec > 0 ? '(' + xn(v.len) + '+' + xn(v.sec) + '*(' + xn(v.sock / 1000) + '*2+' + xn(v.cut / 1000) + '))' : xn(v.len);
    return {
      ok: true, value: pipes, unit: '本', sub: '総延長 ' + fmt(total, 3) + 'm' + (v.margin ? '（余裕込み ' + fmt(withM, 3) + 'm）' : ''), total: total, withMargin: withM, plusOne: ceil(total / v.stock) + 1, steps: steps,
      excel: ['=ROUNDUP(' + base + lossX(v.margin) + '/' + xn(v.stock) + ',0)']
    };
  }

  // 残土：台数＝掘削量×ほぐし率÷1台に積める量 を切り上げ。1台の量は、積める重さ÷ほぐした土1㎥の重さ で出せる
  function zando(input) {
    var weight = input.mode === 'weight';
    var rules = [['vol', '掘削量', 'nonneg'], ['swell', 'ほぐし率', 'pos']];
    rules.push(weight ? ['load', '1台に積める重さ', 'pos'] : ['per', '1台に積める量', 'pos']);
    if (weight) rules.push(['dens', 'ほぐした土1㎥の重さ', 'pos']);
    var q = read(input, rules);
    if (!q.errors.length && q.v.swell < 1) q.errors.push('ほぐし率は1以上で入れてください（掘った土はふくらむため。ふくらみを見ないなら1）');
    if (q.errors.length) return fail(q.errors);
    var v = q.v, per = weight ? r12(v.load / v.dens) : v.per, loose = r12(v.vol * v.swell), trucks = ceil(loose / per);
    var steps = [];
    if (weight) steps.push('1台に積める量：' + fmt(v.load, 3) + 't ÷ ' + fmt(v.dens, 3) + 't/㎥ ＝ ' + fmt(per, 3) + '㎥');
    steps.push('ほぐした量：' + fmt(v.vol, 3) + ' × ' + fmt(v.swell, 3) + ' ＝ ' + fmt(loose, 3) + '㎥');
    steps.push(fmt(loose, 3) + ' ÷ ' + fmt(per, 3) + ' ＝ ' + fmt(loose / per, 3) + ' → 切り上げて ' + trucks + '台');
    var perX = weight ? '(' + xn(v.load) + '/' + xn(v.dens) + ')' : xn(per);
    return {
      ok: true, value: trucks, unit: '台', sub: 'ほぐした量 ' + fmt(loose, 3) + '㎥・1台 ' + fmt(per, 3) + '㎥', loose: loose, perTruck: per, steps: steps,
      excel: ['=ROUNDUP(' + xn(v.vol) + '*' + xn(v.swell) + '/' + perX + ',0)']
    };
  }

  // クロス：縦に貼る枚数＝周長÷有効幅 を切り上げ。m数＝枚数×(天井高＋切りしろ＋柄の送り)
  function cross(input) {
    var q = read(input, [['peri', '壁の周長', 'nonneg'], ['h', '天井高', 'nonneg'], ['w', '有効幅', 'pos'], ['cut', '上下の切りしろ', 'add'], ['rep', '柄の送り', 'add']]);
    if (q.errors.length) return fail(q.errors);
    var v = q.v, strips = ceil(v.peri / v.w), len = r12(v.h + v.cut + v.rep), total = r12(strips * len), byArea = r12(v.peri * v.h / v.w);
    var steps = [
      '縦に貼る枚数：' + fmt(v.peri, 3) + ' ÷ ' + fmt(v.w, 3) + ' ＝ ' + fmt(v.peri / v.w, 3) + ' → 切り上げて ' + strips + '枚',
      '1枚の長さ：' + fmt(v.h, 3) + ' ＋ ' + fmt(v.cut, 3) + (v.rep ? ' ＋ ' + fmt(v.rep, 3) : '') + ' ＝ ' + fmt(len, 3) + 'm',
      strips + '枚 × ' + fmt(len, 3) + 'm ＝ ' + fmt(total, 2) + 'm',
      'くらべ：面積÷幅（' + fmt(v.peri, 3) + '×' + fmt(v.h, 3) + '÷' + fmt(v.w, 3) + '）で出すと ' + fmt(byArea, 1) + 'm'
    ];
    var lenX = '(' + xn(v.h) + '+' + xn(v.cut) + (v.rep ? '+' + xn(v.rep) : '') + ')';
    return {
      ok: true, value: r12(total), unit: 'm', sub: '縦に ' + strips + '枚 × ' + fmt(len, 3) + 'm', strips: strips, stripLen: len, byArea: byArea, steps: steps,
      excel: ['=ROUNDUP(' + xn(v.peri) + '/' + xn(v.w) + ',0)*' + lenX]
    };
  }

  // タイル：枚数＝面積÷(目地込みの1辺)²×(1＋ロス率) を切り上げ。ケース数＝枚数÷1ケースの枚数 を切り上げ
  function tile(input) {
    var q = read(input, [['area', '貼る面積', 'nonneg'], ['size', 'タイルの1辺', 'pos'], ['joint', '目地の幅', 'add'], ['loss', 'ロス率', 'pct'], ['pc', '1ケースの枚数', 'opt']]);
    if (!q.errors.length && q.v.pc !== null && Math.floor(q.v.pc) !== q.v.pc) q.errors.push('1ケースの枚数は整数で入れてください');
    if (q.errors.length) return fail(q.errors);
    var v = q.v, pitch = r12((v.size + v.joint) / 1000), raw = r12(v.area / (pitch * pitch)), withL = r12(raw * (1 + v.loss / 100)), n = ceil(withL);
    var cases = v.pc ? ceil(n / v.pc) : null;
    var steps = [
      '目地込みの1辺：(' + fmt(v.size, 2) + ' ＋ ' + fmt(v.joint, 2) + ')mm ＝ ' + fmt(pitch, 4) + 'm',
      fmt(v.area, 3) + ' ÷ ' + fmt(pitch, 4) + '² ＝ ' + fmt(raw, 3) + (v.loss ? ' →' + lossT(v.loss) + ' ＝ ' + fmt(withL, 3) : '') + ' → 切り上げて ' + n + '枚'
    ];
    if (v.pc) steps.push(n + ' ÷ ' + v.pc + ' ＝ ' + fmt(n / v.pc, 3) + ' → 切り上げて ' + cases + 'ケース（余り ' + (cases * v.pc - n) + '枚）');
    var excel = ['=ROUNDUP(' + xn(v.area) + '/' + xn(pitch) + '^2' + lossX(v.loss) + ',0)'];
    if (v.pc) excel.push('=ROUNDUP(' + n + '/' + xn(v.pc) + ',0)');
    return { ok: true, value: n, unit: '枚', sub: v.pc ? cases + 'ケース（1ケース' + v.pc + '枚）' : '目地込み ' + fmt(pitch, 4) + 'm 角', pitch: pitch, cases: cases, steps: steps, excel: excel };
  }

  // 生コン：量＝面積×厚み(m)×(1＋ロス率) を注文の刻みで切り上げ。台数＝注文量÷1台に積める量 を切り上げ
  function namacon(input) {
    var q = read(input, [['area', '面積', 'nonneg'], ['cm', '厚み', 'nonneg'], ['loss', 'ロス率', 'pct'], ['step', '注文の刻み', 'pos'], ['truck', '1台に積める量', 'opt']]);
    if (q.errors.length) return fail(q.errors);
    var v = q.v, t = r12(v.cm / 100), vol = r12(v.area * t * (1 + v.loss / 100)), order = ceilStep(vol, v.step);
    var trucks = v.truck ? ceil(order / v.truck) : null;
    var steps = [
      '厚みをmに：' + fmt(v.cm, 2) + 'cm ＝ ' + fmt(t, 4) + 'm',
      fmt(v.area, 3) + ' × ' + fmt(t, 4) + lossT(v.loss) + ' ＝ ' + fmt(vol, 3) + '㎥ → ' + fmt(v.step, 3) + '㎥刻みで切り上げて ' + fmt(order, 3) + '㎥'
    ];
    if (v.truck) steps.push('ミキサー車：' + fmt(order, 3) + ' ÷ ' + fmt(v.truck, 3) + ' ＝ ' + fmt(order / v.truck, 3) + ' → 切り上げて ' + trucks + '台');
    var excel = ['=CEILING(' + xn(v.area) + '*' + xn(t) + lossX(v.loss) + ',' + xn(v.step) + ')'];
    if (v.truck) excel.push('=ROUNDUP(' + xn(order) + '/' + xn(v.truck) + ',0)');
    return { ok: true, value: order, unit: '㎥', sub: v.truck ? 'ミキサー車 ' + trucks + '台' : '計算上 ' + fmt(vol, 3) + '㎥', vol: vol, trucks: trucks, steps: steps, excel: excel };
  }

  // 足場：面積＝(建物の外周＋離れ×8)×足場の高さ（角が直角の建物）
  function ashiba(input) {
    var q = read(input, [['peri', '建物の外周', 'nonneg'], ['off', '壁からの離れ', 'nonneg'], ['h', '足場の高さ', 'nonneg']]);
    if (q.errors.length) return fail(q.errors);
    var v = q.v, len = r12(v.peri + v.off * 8), area = r12(len * v.h);
    var steps = [
      '足場の長さ：' + fmt(v.peri, 3) + ' ＋ ' + fmt(v.off, 3) + ' × 8 ＝ ' + fmt(len, 3) + 'm',
      fmt(len, 3) + ' × ' + fmt(v.h, 3) + ' ＝ ' + fmt(area, 2) + '㎡'
    ];
    return { ok: true, value: area, unit: '㎡', sub: '足場の長さ ' + fmt(len, 3) + 'm', len: len, steps: steps, excel: ['=(' + xn(v.peri) + '+' + xn(v.off) + '*8)*' + xn(v.h)] };
  }

  var CALC = { toryo: toryo, haikan: haikan, zando: zando, cross: cross, tile: tile, namacon: namacon, ashiba: ashiba };
  // 結果をテキストに（コピー用）
  function text(name, label, r) {
    if (!r || !r.ok) return '';
    return [label + '：' + fmt(r.value, 2) + r.unit + '（' + r.sub + '）'].concat(r.steps).concat(r.excel.map(function (e) { return 'Excel：' + e; })).join('\n');
  }
  var api = { r12: r12, ceil: ceil, ceilStep: ceilStep, num: num, fmt: fmt, CALC: CALC, text: text };
  Object.keys(CALC).forEach(function (k) { api[k] = CALC[k]; });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SURYO = api;
})(this);
