/* 塗装 面積・塗料の量 計算の計算部分（ブラウザ・node 共通）
   塗布量・希釈率・缶の容量は、使う塗料のメーカーのカタログ値を利用者が入れる。このツールは値を決めない。 */
(function (root) {
  // "1,200" "１．５" "10%" → 数値。空は null、数字でない・マイナスは NaN
  function num(s) {
    if (s === null || s === undefined) return null;
    if (typeof s === 'number') return isFinite(s) && s >= 0 ? s : NaN;
    var t = String(s).replace(/[０-９．]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[\s,，%％㎡]/g, '').replace(/m2$|m$|kg$|L$|l$/, '');
    if (t === '') return null;
    if (!/^\d+(\.\d+)?$|^\.\d+$/.test(t)) return NaN;
    return parseFloat(t);
  }
  // 浮動小数のずれを消す（例 3×0.1 = 0.30000000000000004 → 0.3）
  function fix(x, d) { var k = Math.pow(10, d === undefined ? 6 : d); return Math.round(x * k) / k; }
  // 表示用：小数第d位で四捨五入して 3桁区切り
  function fmt(x, d) {
    if (x === null || x === undefined || isNaN(x)) return '';
    d = d === undefined ? 2 : d;
    return fix(x, d).toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: d });
  }

  // ---- 外壁の面積 ----
  // o: { mode:'faces'|'perimeter', faces:[{name,w,h}], perimeter, height, openings:[{name,w,h,count}] }
  function wallArea(o) {
    var errs = [], gross = 0, open = 0, used = 0;
    if (o.mode === 'perimeter') {
      var pr = num(o.perimeter), ht = num(o.height);
      if (pr === null && ht === null) return { state: 'empty' };
      if (pr === null || ht === null || isNaN(pr) || isNaN(ht)) errs.push('外周と高さを数字で入れてください。');
      else { gross = pr * ht; used = 1; }
    } else {
      (o.faces || []).forEach(function (f, i) {
        var w = num(f.w), h = num(f.h);
        if (w === null && h === null) return;
        if (w === null || h === null || isNaN(w) || isNaN(h)) { errs.push('外壁の' + (f.name || (i + 1) + '行目') + '：幅と高さを数字で入れてください。'); return; }
        gross += w * h; used++;
      });
      if (!used && !errs.length) return { state: 'empty' };
    }
    (o.openings || []).forEach(function (op, i) {
      var w = num(op.w), h = num(op.h), c = num(op.count);
      if (w === null && h === null) return;
      if (c === null) c = 1;
      if (w === null || h === null || isNaN(w) || isNaN(h) || isNaN(c) || c !== Math.floor(c)) { errs.push('開口部の' + (op.name || (i + 1) + '行目') + '：幅・高さ・数を数字で入れてください（数は整数）。'); return; }
      open += w * h * c;
    });
    if (errs.length) return { state: 'error', msg: errs.join(' ') };
    gross = fix(gross); open = fix(open);
    if (open > gross) return { state: 'error', msg: '開口部の面積（' + fmt(open) + '㎡）が外壁の面積（' + fmt(gross) + '㎡）より大きくなっています。数字を確かめてください。' };
    return { state: 'ok', gross: gross, openings: open, area: fix(gross - open) };
  }

  // ---- 1工程の必要量と缶数 ----
  // c: { rate（1回あたり・1㎡あたり）, times（回数）, loss（％）, can（1缶の量） }
  function coat(area, c) {
    var rate = num(c.rate), times = num(c.times), loss = num(c.loss), can = num(c.can);
    if (times === null) times = 0;
    if (loss === null) loss = 0;
    if (isNaN(times) || times !== Math.floor(times)) return { state: 'error', msg: '回数は0以上の整数で入れてください。' };
    if (times === 0) return { state: 'skip' };
    if (rate === null) return { state: 'empty' };
    if (isNaN(rate) || rate <= 0) return { state: 'error', msg: '塗布量は0より大きい数字で入れてください。' };
    if (isNaN(loss) || loss >= 100) return { state: 'error', msg: 'ロス率は0以上100未満の数字（％）で入れてください。' };
    if (can !== null && (isNaN(can) || can <= 0)) return { state: 'error', msg: '缶の容量は0より大きい数字で入れてください。' };
    var base = fix(area * rate * times);                // ロスを含まない量
    var need = fix(base * (1 + loss / 100));            // ロス込みの必要量
    var res = { state: 'ok', rate: rate, times: times, loss: loss, base: base, need: need };
    if (can !== null) {
      res.can = can;
      res.cans = need > 0 ? Math.ceil(fix(need / can, 9)) : 0;   // 切り上げ（割り切れるときに1缶多くならないように）
      res.left = fix(res.cans * can - need);
    }
    return res;
  }

  // ---- 全体 ----
  // o: { wall:{...wallArea の入力}, roof（㎡）, coats:[{part:'wall'|'roof', step, paint, rate, unit:'kg'|'L', times, loss, can}] }
  function calc(o) {
    var w = wallArea(o.wall || {}), roof = num(o.roof), errs = [];
    if (w.state === 'error') errs.push(w.msg);
    if (roof !== null && isNaN(roof)) errs.push('屋根の面積を数字で入れてください。');
    var areas = { wall: w.state === 'ok' ? w.area : 0, roof: roof !== null && !isNaN(roof) ? fix(roof) : 0 };
    var rows = (o.coats || []).map(function (c) {
      var part = c.part === 'roof' ? 'roof' : 'wall', unit = c.unit === 'L' ? 'L' : 'kg';
      var r = areas[part] > 0 ? coat(areas[part], c) : { state: num(c.times) === 0 ? 'skip' : 'noarea' };
      r.part = part; r.step = c.step || ''; r.paint = String(c.paint || '').trim(); r.unit = unit; r.area = areas[part];
      if (r.state === 'error') errs.push((part === 'roof' ? '屋根' : '外壁') + '・' + r.step + '：' + r.msg);
      return r;
    });
    // 同じ塗料名・同じ単位・同じ缶の容量の工程は、まとめた缶数も出す（中塗りと上塗りが同じ塗料のとき など）
    var groups = [], idx = {};
    rows.forEach(function (r) {
      if (r.state !== 'ok' || !r.paint) return;
      var key = JSON.stringify([r.paint, r.unit, r.can || '']);
      if (!(key in idx)) { idx[key] = groups.length; groups.push({ paint: r.paint, unit: r.unit, can: r.can, need: 0, steps: [], sumCans: 0 }); }
      var g = groups[idx[key]];
      g.need = fix(g.need + r.need); g.steps.push((r.part === 'roof' ? '屋根' : '外壁') + '・' + r.step); g.sumCans += r.cans || 0;
    });
    groups.forEach(function (g) {
      if (g.can) { g.cans = Math.ceil(fix(g.need / g.can, 9)); g.left = fix(g.cans * g.can - g.need); }
    });
    return { state: errs.length ? 'error' : (w.state === 'ok' || areas.roof > 0 ? 'ok' : 'empty'), msg: errs.join(' '), wall: w, roof: areas.roof, rows: rows, groups: groups };
  }

  // 見積書などに貼る表（タブ区切り）
  function table(r) {
    if (!r || r.state !== 'ok') return '';
    var out = [['部位', '工程', '塗料', '面積(㎡)', '塗布量(/㎡・1回)', '回数', 'ロス率(%)', '必要量', '単位', '1缶の量', '缶数'].join('\t')];
    r.rows.forEach(function (x) {
      if (x.state !== 'ok') return;
      out.push([x.part === 'roof' ? '屋根' : '外壁', x.step, x.paint.replace(/[\t\r\n]/g, ' '), fmt(x.area), x.rate, x.times, x.loss, fmt(x.need), x.unit, x.can || '', x.cans === undefined ? '' : x.cans].join('\t'));
    });
    return out.join('\n');
  }

  var api = { num: num, fix: fix, fmt: fmt, wallArea: wallArea, coat: coat, calc: calc, table: table };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PC = api;
})(this);
