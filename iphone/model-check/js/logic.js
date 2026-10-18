/* ModelCheck core logic (no DOM). Works in the browser (window.MC) and in Node (module.exports). */
(function (root) {
  'use strict';

  function normalize(input) {
    var s = String(input == null ? '' : input);
    if (s.normalize) s = s.normalize('NFKC');
    return s.toUpperCase().replace(/[\s　\-‐－ー_]/g, '').replace(/／/g, '/');
  }

  // returns {kind: 'model'|'part'|'empty'|'invalid', value}
  function classify(input) {
    var s = normalize(input);
    if (!s) return { kind: 'empty', value: '' };
    if (/^A\d{4}$/.test(s)) return { kind: 'model', value: s };
    if (/^\d{4}$/.test(s)) return { kind: 'model', value: 'A' + s };
    // Part numbers look like MTXX2J/A, MU0X3ZP/A, NXXX2J/A ...
    if (/^[A-Z][A-Z0-9]{3,5}[A-Z]{1,2}\/[A-Z]$/.test(s) || /^[A-Z][A-Z0-9]{3,5}[A-Z]{1,2}$/.test(s) && /\d/.test(s) && s.length >= 7) {
      return { kind: 'part', value: s.indexOf('/') < 0 ? s.slice(0, -1) + '/' + s.slice(-1) : s };
    }
    return { kind: 'invalid', value: s };
  }

  function buildIndex(data) {
    var idx = {};
    data.models.forEach(function (m) {
      m.modelNumbers.forEach(function (x) { idx[x.a] = { model: m, entry: x }; });
    });
    var legacy = {};
    (data.legacy || []).forEach(function (l) { l.modelNumbers.forEach(function (a) { legacy[a] = l.name; }); });
    return { byA: idx, legacy: legacy, byId: data.models.reduce(function (o, m) { o[m.id] = m; return o; }, {}) };
  }

  function lookup(data, index, input) {
    var c = classify(input);
    if (c.kind === 'model') {
      var hit = index.byA[c.value];
      if (hit) return { type: 'found', via: 'model', input: c.value, model: hit.model, entry: hit.entry };
      if (index.legacy[c.value]) return { type: 'legacy', input: c.value, name: index.legacy[c.value] };
      return { type: 'unknown', input: c.value };
    }
    if (c.kind === 'part') {
      var key = c.value.split('/')[0];
      var pn = data.partNumbers || {};
      var id = pn[c.value] || pn[key] || pn[key.slice(0, -1)];
      if (id && index.byId[id]) return { type: 'found', via: 'part', input: c.value, model: index.byId[id], entry: null };
      return { type: 'part-unverified', input: c.value };
    }
    return { type: c.kind, input: c.value };
  }

  function sameDims(a, b) {
    return a.sizeMm && b.sizeMm && a.sizeMm.h === b.sizeMm.h && a.sizeMm.w === b.sizeMm.w && a.sizeMm.d === b.sizeMm.d;
  }

  // Differences that make a case not interchangeable (from Apple's published data)
  function caseDiffs(a, b) {
    var r = [];
    if (!sameDims(a, b)) r.push('size');
    if (a.camera.rear !== b.camera.rear || (a.camera.layout || '') !== (b.camera.layout || '')) r.push('camera');
    var ba = a.buttons, bb = b.buttons;
    if (ba.cameraControl !== bb.cameraControl) r.push('cameraControl');
    if (ba.action !== bb.action) r.push('action');
    return r;
  }

  function caseAdvice(data, model) {
    var out = { fit: model.id, same: [], ng: [] };
    if (!model.sizeMm) return out; // foldable etc.
    var others = data.models.filter(function (o) { return o.id !== model.id && o.sizeMm; });
    others.forEach(function (o) {
      if (sameDims(model, o)) {
        var d = caseDiffs(model, o);
        if (d.length === 0) out.same.push(o.id);
        else out.ng.push({ id: o.id, reasons: d });
      }
    });
    // look-alikes: same screen size, close in size, not identical
    var near = others.filter(function (o) {
      return !sameDims(model, o) && o.displayInch === model.displayInch && Math.abs(o.year - model.year) <= 3 &&
        Math.abs(o.sizeMm.h - model.sizeMm.h) <= 3.5 && Math.abs(o.sizeMm.w - model.sizeMm.w) <= 3.5;
    }).map(function (o) {
      var dist = Math.abs(o.sizeMm.h - model.sizeMm.h) + Math.abs(o.sizeMm.w - model.sizeMm.w) +
        Math.abs(o.sizeMm.d - model.sizeMm.d) + Math.abs(o.year - model.year) * 0.5;
      return { o: o, dist: dist };
    }).sort(function (x, y) { return x.dist - y.dist; }).slice(0, 3);
    near.forEach(function (n) { out.ng.push({ id: n.o.id, reasons: caseDiffs(model, n.o) }); });
    return out;
  }

  function charger(model) {
    var fc = model.fastCharge || {};
    return {
      connector: model.connector,                // 'usbc' | 'lightning'
      cable: model.connector === 'usbc' ? 'usbc-usbc' : 'usbc-lightning',
      usbW: fc.usbAdapterMinW == null ? null : fc.usbAdapterMinW,
      avs: !!fc.avs,
      magsafe: model.magsafe,
      magsafeMaxW: model.magsafeMaxW,
      magsafeAdapterW: fc.magsafeAdapterMinW == null ? null : fc.magsafeAdapterMinW,
      qi2MaxW: model.qi2MaxW,
      qiListed: model.qiListed,
      qiMaxW: model.qiMaxW,
      text: fc
    };
  }

  var api = { normalize: normalize, classify: classify, buildIndex: buildIndex, lookup: lookup,
    caseAdvice: caseAdvice, caseDiffs: caseDiffs, charger: charger, sameDims: sameDims };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MC = api;
})(this);
