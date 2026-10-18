/* ChargeCheck judgement logic (no DOM, no network). Works in browser and Node. */
(function (root) {
  'use strict';

  var RANK = { fast: 5, fast_maybe: 4, ok: 3, slow: 2, unknown: 1, no: 0 };

  function accepts(device, cable) {
    var d = cable.dev;
    switch (device.cat) {
      case 'iphone': return d === device.port || d === 'magsafe';
      case 'ipad': return d === device.port;
      case 'airpods':
        return d === device.port || (d === 'magsafe' && !!device.wireless) || (d === 'watch' && !!device.watchCharger);
      case 'watch': return d === 'watch';
      case 'mac': return d === 'usbc' || (d === 'magsafe3' && !!device.magsafe3);
    }
    return false;
  }

  function R(key, params) { return { key: key, params: params || {} }; }

  function effW(ch) { return ch.maxW || ch.w; }

  // Evaluate one (charger, cable) pair for a device. Returns null if they can't be connected.
  function evaluate(device, ch, cb) {
    if (cb.host !== ch.port) return null;
    if (!accepts(device, cb)) return null;
    var out = { status: 'ok', reasons: [], rules: [], charger: ch.id, cable: cb.id };
    var w = ch.w, isC = ch.port === 'C';

    if (device.cat === 'iphone') {
      if (cb.dev === 'magsafe') {
        if (!device.magsafe) {
          out.status = 'unknown'; out.reasons.push(R('iphone_qi_magsafe'));
          return out;
        }
        var ms = device.magsafe; out.rules = ms.rules.slice();
        if (effW(ch) >= ms.fastAdapterW) { out.status = 'fast'; out.reasons.push(R('ms_fast', { w: w, need: ms.fastAdapterW, max: ms.maxW })); }
        else { out.status = 'ok'; out.reasons.push(R('ms_below', { w: w, need: ms.fastAdapterW })); }
        return out;
      }
      var wd = device.wired; out.rules = wd.rules.slice();
      if (!isC) { out.status = 'ok'; out.reasons.push(R('iphone_usba', { need: wd.fastW })); return out; }
      if (wd.avs) { // iPhone 18 Pro family
        if (ch.avs || w >= 60) {
          var cableOk = cb.ratedW == null ? null : cb.ratedW >= 60;
          if (cableOk === false) { out.status = 'ok'; out.reasons.push(R('cable_below', { need: 60, rated: cb.ratedW })); }
          else if (ch.avs && cableOk === true) { out.status = 'fast'; out.reasons.push(R('i18_fast', { w: w })); }
          else {
            out.status = 'fast_maybe';
            if (!ch.avs) out.reasons.push(R('i18_avs_unknown', { w: w }));
            if (cableOk === null) out.reasons.push(R('cable_unknown', { need: 60 }));
          }
        } else { out.status = 'ok'; out.reasons.push(R('i18_below', { w: w })); }
        return out;
      }
      if (w >= wd.fastW) { out.status = 'fast'; out.reasons.push(R('wired_fast', { w: w, need: wd.fastW })); }
      else { out.status = 'ok'; out.reasons.push(R('wired_below', { w: w, need: wd.fastW })); }
      return out;
    }

    if (device.cat === 'ipad') {
      var ip = device.wired; out.rules = ip.rules.slice();
      if (w <= 7.5) { out.status = 'slow'; out.reasons.push(R('ipad_75', { w: w })); return out; }
      if (!isC || w < ip.minW) { out.status = 'slow'; out.reasons.push(R('ipad_belowspec', { w: w, port: ch.port })); return out; }
      if (ip.fastW) {
        if (effW(ch) >= ip.fastW) { out.status = 'fast'; out.reasons.push(R('ipad_fast', { w: w, need: ip.fastW })); }
        else { out.status = 'ok'; out.reasons.push(R('ipad_fast_below', { w: w, need: ip.fastW })); }
      } else { out.status = 'ok'; out.reasons.push(R('ipad_ok', { w: w })); out.reasons.push(R('ipad_fast_unknown')); }
      return out;
    }

    if (device.cat === 'airpods') {
      out.rules = device.wired.rules.slice();
      if (cb.dev === 'magsafe') { out.rules = ['airpods_wireless']; out.reasons.push(R('ap_magsafe')); }
      else if (cb.dev === 'watch') { out.rules = ['airpods_watchcharger']; out.reasons.push(R('ap_watch')); }
      else out.reasons.push(R('ap_wired', { port: device.port }));
      out.reasons.push(R('ap_nofast'));
      return out;
    }

    if (device.cat === 'watch') {
      out.rules = device.wired.rules.slice();
      if (!device.fast) {
        if (cb.fast) { out.status = 'unknown'; out.reasons.push(R('watch_old_fastcable')); }
        else { out.status = 'ok'; out.reasons.push(R('watch_old')); }
        return out;
      }
      if (!cb.fast) { out.status = 'ok'; out.reasons.push(R('watch_needcable')); return out; }
      if (isC && w >= 18) { out.status = 'fast'; out.reasons.push(R('watch_fast', { w: w })); }
      else { out.status = 'ok'; out.reasons.push(R('watch_below', { w: w })); }
      return out;
    }

    if (device.cat === 'mac') {
      var m = device.wired; out.rules = m.rules.slice();
      if (!isC) { out.status = 'no'; out.reasons.push(R('mac_needpd')); return out; }
      var e = effW(ch);
      var cableLimit = cb.dev === 'magsafe3' ? null : cb.ratedW; // null = unknown or MagSafe 3
      var fl = m.fastList;
      if (fl && fl.indexOf(w) >= 0 && !ch.avs) {
        if (cb.dev === 'magsafe3') { out.status = 'fast'; out.reasons.push(R('mac_fast', { w: w })); }
        else {
          var needCable = m.fastCableW || w;
          if (cb.ratedW == null) { out.status = 'fast_maybe'; out.reasons.push(R('mac_fast', { w: w })); out.reasons.push(R('cable_unknown', { need: needCable })); }
          else if (cb.ratedW >= needCable) { out.status = 'fast'; out.reasons.push(R('mac_fast', { w: w })); }
          else { out.status = 'slow'; out.reasons.push(R('cable_below', { need: needCable, rated: cb.ratedW })); }
        }
        out.reasons.push(R('mac_fast_apple'));
        return out;
      }
      if (cableLimit != null && cableLimit < m.recW && cableLimit < e) {
        out.status = 'slow'; out.reasons.push(R('cable_below', { need: m.recW, rated: cableLimit })); return out;
      }
      if (e >= m.recW) { out.status = 'ok'; out.reasons.push(R('mac_ok', { w: e, rec: m.recW })); }
      else { out.status = 'slow'; out.reasons.push(R('mac_below', { w: e, rec: m.recW })); }
      if (fl === null) out.reasons.push(R('mac_fast_unknown'));
      else if (fl.length === 0) out.reasons.push(R('mac_nofast'));
      else out.reasons.push(R('mac_fast_need', { list: fl.join('/') }));
      return out;
    }
    return null;
  }

  function neededCables(device) {
    switch (device.cat) {
      case 'iphone': return device.port === 'lightning' ? ['c2l'] : (device.wired.avs ? ['c2c60', 'c2c240'] : ['c2c', 'c2c60', 'c2c240']);
      case 'ipad': return device.port === 'lightning' ? ['c2l'] : ['c2c', 'c2c60', 'c2c240'];
      case 'airpods': return device.port === 'lightning' ? ['c2l', 'a2l'] : ['c2c', 'c2c60', 'c2c240', 'a2c'];
      case 'watch': return device.fast ? ['watchCfast'] : ['watchA', 'watchC'];
      case 'mac':
        if (device.wired.fastCableW) return ['magsafe3', 'c2c240'];
        return device.magsafe3 ? ['magsafe3', 'c2c240'] : ['c2c240', 'c2c60', 'c2c'];
    }
    return [];
  }

  // Judge one device against owned chargers/cables.
  function judge(device, chargers, cables) {
    var best = null, all = [];
    chargers.forEach(function (ch) {
      cables.forEach(function (cb) {
        var r = evaluate(device, ch, cb);
        if (!r) return;
        all.push(r);
        if (!best || RANK[r.status] > RANK[best.status] || (RANK[r.status] === RANK[best.status] && ch.w < findW(chargers, best.charger))) best = r;
      });
    });
    if (best) { best.alternatives = all.length; return best; }
    // nothing connects: explain why
    var out = { status: 'no', reasons: [], rules: [], charger: null, cable: null };
    var fitting = cables.filter(function (cb) { return accepts(device, cb); });
    if (!chargers.length) out.reasons.push(R('no_charger'));
    if (!fitting.length) out.reasons.push(R('no_cable', { port: device.port, cables: neededCables(device) }));
    else if (chargers.length) {
      var hosts = {}; fitting.forEach(function (c) { hosts[c.host] = 1; });
      out.reasons.push(R('no_match', { hosts: Object.keys(hosts).join('/') }));
    }
    return out;
  }
  function findW(chargers, id) { for (var i = 0; i < chargers.length; i++) if (chargers[i].id === id) return chargers[i].w; return 1e9; }

  // What one charger needs to cover each device at its best (fast) state.
  function need(device) {
    switch (device.cat) {
      case 'iphone': return { w: device.wired.fastW, avs: !!device.wired.avs, fastKnown: true };
      case 'ipad': return { w: device.wired.fastW || 20, fastKnown: !!device.wired.fastW, min: 15 };
      case 'airpods': return { w: 5, fastKnown: false };
      case 'watch': return { w: device.fast ? 18 : 5, fastKnown: device.fast };
      case 'mac': {
        var fl = device.wired.fastList;
        return { w: (fl && fl.length) ? Math.min.apply(null, fl) : device.wired.recW, fastKnown: !!(fl && fl.length), min: device.wired.recW };
      }
    }
    return { w: 5 };
  }

  function suggest(devices, results, cablesOwned) {
    var maxW = 0, sum = 0, avs = false, cableNeeds = [], drivers = [];
    devices.forEach(function (d, i) {
      var n = need(d);
      if (n.w > maxW) { maxW = n.w; drivers = [d.id]; } else if (n.w === maxW) drivers.push(d.id);
      sum += n.w; if (n.avs) avs = true;
      var wants = neededCables(d);
      var has = cablesOwned.some(function (c) { return wants.indexOf(c.id) >= 0; });
      if (!has) cableNeeds.push({ device: d.id, cable: wants[0] });
    });
    var allFast = results.length > 0 && results.every(function (r, i) {
      var n = need(devices[i]);
      return r.status === 'fast' || (!n.fastKnown && (r.status === 'ok'));
    });
    var allCharge = results.length > 0 && results.every(function (r) { return r.status !== 'no' && r.status !== 'unknown'; });
    return {
      single: { w: maxW, avs: avs, drivers: drivers },
      multi: { ports: devices.length, sum: sum },
      cableNeeds: cableNeeds,
      allFast: allFast, allCharge: allCharge
    };
  }

  var api = { RANK: RANK, accepts: accepts, evaluate: evaluate, judge: judge, suggest: suggest, need: need, neededCables: neededCables };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ChargeLogic = api;
})(this);
