/* Freelance rate calculator (browser + node).
   1) Works back from an income goal to the lowest hourly rate that reaches it.
   2) Turns an hourly rate into a fixed project price with a buffer.
   3) Takes platform and transfer fees off and shows the take-home and effective hourly rate.
   Currencies only change the symbol and the number of decimals. Nothing is converted. */
(function (root) {
  var CURRENCIES = {
    USD: { sym: '$', dec: 2, name: 'US dollar' },
    PHP: { sym: '₱', dec: 2, name: 'Philippine peso' },
    EUR: { sym: '€', dec: 2, name: 'Euro' },
    GBP: { sym: '£', dec: 2, name: 'British pound' },
    AUD: { sym: 'A$', dec: 2, name: 'Australian dollar' },
    CAD: { sym: 'C$', dec: 2, name: 'Canadian dollar' },
    JPY: { sym: '¥', dec: 0, name: 'Japanese yen' }
  };
  function cur(c) { return CURRENCIES[c] || CURRENCIES.USD; }

  // "40,000" "$3,000" "25%" "PHP 600000" -> number. Empty -> null. Negative or not a number -> NaN
  function num(s) {
    if (s === null || s === undefined) return null;
    var t = String(s).replace(/[\s,$%₱€£¥]|USD|PHP|EUR|GBP|AUD|CAD|JPY|A\$|C\$/gi, '');
    if (t === '') return null;
    if (!/^\d+(\.\d+)?$|^\.\d+$/.test(t)) return NaN;
    return parseFloat(t);
  }
  function fix(x, d) { var k = Math.pow(10, d === undefined ? 8 : d); return Math.round(x * k) / k; }
  // round to the currency's smallest unit (cents, or whole yen)
  function round(x, c) { var k = Math.pow(10, cur(c).dec); return Math.round(fix(x * k, 6)) / k; }
  // round UP to the smallest unit: a minimum rate should never be shown lower than it is
  function ceil(x, c) { var k = Math.pow(10, cur(c).dec); return Math.ceil(fix(x * k, 6)) / k; }
  function group(n, dec) {
    var s = Math.abs(n).toFixed(dec), parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
  function money(n, c) {
    var C = cur(c), r = round(n, c);
    return (r < 0 ? '-' : '') + C.sym + group(r, C.dec);
  }
  function hrs(n) { var r = fix(n, 2); return group(r, r % 1 ? (fix(r * 10, 2) % 1 ? 2 : 1) : 0); }
  function pct(n) { return fix(n, 2) + '%'; }

  var LABELS = {
    income: 'Income goal', expenses: 'Business expenses per year', setAside: 'Set aside %',
    weeks: 'Working weeks per year', hours: 'Hours per week', billable: 'Billable %',
    rate: 'Your hourly rate', projHours: 'Estimated hours', buffer: 'Buffer %',
    platform: 'Platform fee %', transferPct: 'Transfer fee %', transferFixed: 'Fixed fee per payment'
  };
  function bad(msg) { return { state: 'error', error: msg }; }

  // o: { currency, period:'year'|'month', income, expenses, setAside, weeks, hours, billable }
  function calcRate(o) {
    var c = o.currency, v = {};
    ['income', 'expenses', 'setAside', 'weeks', 'hours', 'billable'].forEach(function (k) { v[k] = num(o[k]); });
    var need = ['income', 'weeks', 'hours', 'billable'].filter(function (k) { return v[k] === null; });
    if (need.length) return { state: 'empty', error: 'Please fill in: ' + need.map(function (k) { return LABELS[k]; }).join(', ') + '.' };
    var nan = Object.keys(v).filter(function (k) { return isNaN(v[k]); });
    if (nan.length) return bad(LABELS[nan[0]] + ': please enter a number (no negative values).');
    if (v.expenses === null) v.expenses = 0;
    if (v.setAside === null) v.setAside = 0;
    if (!(v.income > 0)) return bad('The income goal must be greater than 0.');
    if (v.setAside >= 100) return bad('Set aside % must be less than 100.');
    if (!(v.weeks > 0) || v.weeks > 52) return bad('Working weeks per year must be more than 0 and no more than 52.');
    if (!(v.hours > 0) || v.hours > 168) return bad('Hours per week must be more than 0 and no more than 168.');
    if (!(v.billable > 0) || v.billable > 100) return bad('Billable % must be more than 0 and no more than 100.');
    var monthly = o.period === 'month';
    var incomeYear = monthly ? v.income * 12 : v.income;
    // take-home goal = (revenue - expenses) x (1 - set aside)  ->  revenue = goal / (1 - set aside) + expenses
    var profit = incomeYear / (1 - v.setAside / 100);
    var revenue = profit + v.expenses;
    var workHours = v.weeks * v.hours;
    var billHours = fix(workHours * v.billable / 100, 6);
    var exact = revenue / billHours;
    return {
      state: 'ok', currency: cur(c) === CURRENCIES[c] ? c : 'USD', monthly: monthly,
      incomeYear: incomeYear, expenses: v.expenses, setAsidePct: v.setAside,
      setAside: profit - incomeYear, profit: profit, revenue: revenue, revenueMonth: revenue / 12,
      weeks: v.weeks, hoursWeek: v.hours, billablePct: v.billable,
      workHours: workHours, billHours: billHours, billWeek: fix(v.hours * v.billable / 100, 6),
      exact: exact, rate: ceil(exact, c)
    };
  }

  // o: { currency, rate, projHours, buffer, platform, transferPct, transferFixed }, fallbackRate = required rate
  function calcProject(o, fallbackRate) {
    var c = o.currency, v = {};
    ['rate', 'projHours', 'buffer', 'platform', 'transferPct', 'transferFixed'].forEach(function (k) { v[k] = num(o[k]); });
    var nan = Object.keys(v).filter(function (k) { return isNaN(v[k]); });
    if (nan.length) return bad(LABELS[nan[0]] + ': please enter a number (no negative values).');
    var ownRate = v.rate !== null;
    var rate = ownRate ? v.rate : fallbackRate;
    if (v.projHours === null) return { state: 'empty', error: 'Enter the estimated hours to price a project.' };
    if (rate === null || rate === undefined) return { state: 'empty', error: 'Enter your hourly rate, or fill in the rate section above.' };
    if (!(rate > 0)) return bad('The hourly rate must be greater than 0.');
    if (!(v.projHours > 0)) return bad('Estimated hours must be greater than 0.');
    var buffer = v.buffer || 0, platform = v.platform || 0, tPct = v.transferPct || 0, tFix = v.transferFixed || 0;
    if (buffer > 500) return bad('Buffer % must be 500 or less.');
    if (platform >= 100) return bad('Platform fee % must be less than 100.');
    if (tPct >= 100) return bad('Transfer fee % must be less than 100.');
    var bufHours = fix(v.projHours * (1 + buffer / 100), 6);
    var price = round(rate * bufHours, c);
    var platformFee = round(price * platform / 100, c);
    var afterPlatform = fix(price - platformFee, 6);
    var transferFee = round(afterPlatform * tPct / 100 + tFix, c);
    var takeHome = fix(afterPlatform - transferFee, 6);
    var keep = (1 - platform / 100) * (1 - tPct / 100);
    return {
      state: 'ok', ownRate: ownRate, rate: rate, projHours: v.projHours, bufferPct: buffer, bufHours: bufHours,
      price: price, platformPct: platform, platformFee: platformFee, afterPlatform: afterPlatform,
      transferPct: tPct, transferFixed: tFix, transferFee: transferFee, fees: fix(platformFee + transferFee, 6),
      takeHome: takeHome, feeShare: price > 0 ? (price - takeHome) / price * 100 : 0,
      effRate: takeHome / v.projHours, effRateBuf: takeHome / bufHours,
      // hourly rate to quote so the % fees are covered (the fixed fee is per payment, so it is left out)
      grossUp: ceil(rate / keep, c), lost: takeHome <= 0
    };
  }

  function calc(o) {
    var r = calcRate(o);
    var p = calcProject(o, r.state === 'ok' ? r.rate : null);
    return { rate: r, project: p };
  }

  function text(res, o) {
    var c = CURRENCIES[o && o.currency] ? o.currency : 'USD', r = res.rate, p = res.project;
    var L = ['Freelance rate calculation (' + c + ')'];
    if (r.state === 'ok') {
      L.push('Required hourly rate: ' + money(r.rate, c) + ' (minimum)');
      L.push('Income goal: ' + money(r.incomeYear, c) + ' per year' + (r.monthly ? ' (' + money(r.incomeYear / 12, c) + ' per month)' : ''));
      L.push('Set aside (' + pct(r.setAsidePct) + ', your own estimate): ' + money(r.setAside, c));
      L.push('Business expenses: ' + money(r.expenses, c));
      L.push('Revenue needed: ' + money(r.revenue, c) + ' per year (' + money(r.revenueMonth, c) + ' per month)');
      L.push('Billable hours: ' + hrs(r.billHours) + ' per year (' + hrs(r.weeks) + ' weeks x ' + hrs(r.hoursWeek) + ' h x ' + pct(r.billablePct) + ')');
    }
    if (p.state === 'ok') {
      L.push('Suggested project price: ' + money(p.price, c) + ' (' + money(p.rate, c) + '/h x ' + hrs(p.bufHours) + ' h, i.e. ' + hrs(p.projHours) + ' h + ' + pct(p.bufferPct) + ' buffer)');
      L.push('Fees: ' + money(p.fees, c) + ' (platform ' + pct(p.platformPct) + ', transfer ' + pct(p.transferPct) + ' + ' + money(p.transferFixed, c) + ')');
      L.push('Take-home after fees: ' + money(p.takeHome, c));
      L.push('Effective hourly rate: ' + money(p.effRate, c) + ' on ' + hrs(p.projHours) + ' h, ' + money(p.effRateBuf, c) + ' if the buffer is used');
    }
    L.push('Set aside % is my own estimate, not tax advice. No currency conversion.');
    return L.join('\n');
  }

  var api = { CURRENCIES: CURRENCIES, num: num, fix: fix, round: round, ceil: ceil, money: money, hrs: hrs, pct: pct,
    calcRate: calcRate, calcProject: calcProject, calc: calc, text: text };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FRATE = api;
})(this);
