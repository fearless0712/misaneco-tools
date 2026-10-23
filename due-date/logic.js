/* Invoice due date calculator - calculation part (browser + node).
   1) Invoice date + payment terms -> due date (Net 7..90, Due on receipt, EOM, Net 30 EOM, 15th of next month, custom days).
   2) Optional weekend rule: keep the date, move to the previous weekday, or move to the next weekday. Holidays are not built in.
   3) Early payment discount (e.g. 2/10 Net 30): discount deadline, discounted amount and the annualized cost of skipping it.
   4) Days until the due date, or days overdue, counted from "today" (passed in, so it can be tested).
   5) A pasted list (date,amount,terms) sorted by due date with the overdue total.
   Currencies only change the symbol. Nothing is converted. Not legal or tax advice. */
(function (root) {
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var CURRENCIES = {
    USD: { sym: '$', name: 'US dollar' },
    PHP: { sym: '₱', name: 'Philippine peso' },
    EUR: { sym: '€', name: 'Euro' },
    GBP: { sym: '£', name: 'British pound' },
    AUD: { sym: 'A$', name: 'Australian dollar' },
    CAD: { sym: 'C$', name: 'Canadian dollar' }
  };
  // payment terms shown in the drop-down (value -> label)
  var TERMS = [
    ['receipt', 'Due on receipt'], ['net7', 'Net 7'], ['net10', 'Net 10'], ['net15', 'Net 15'], ['net30', 'Net 30'],
    ['net45', 'Net 45'], ['net60', 'Net 60'], ['net90', 'Net 90'], ['eom', 'EOM (end of the invoice month)'],
    ['net30eom', 'Net 30 EOM (30 days after the end of the month)'], ['15th', '15th of next month'], ['custom', 'Custom number of days']
  ];
  var WEEKEND = { keep: 'Keep the date', prev: 'Move to the previous weekday', next: 'Move to the next weekday' };
  var MAX_DAYS = 999, MAX_ROWS = 500;

  function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); } // m = 1..12
  function mk(y, m, d) { return Date.UTC(y, m - 1, d) / 86400000; }
  // "2026-10-09", "2026/10/9" or US order "10/9/2026" -> day number (1970-01-01 = 0). Dates that don't exist -> null
  function parseDate(s) {
    var t = String(s === null || s === undefined ? '' : s).trim(), m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/.exec(t), y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; } else {
      m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
      if (!m) return null;
      mo = +m[1]; d = +m[2]; y = +m[3];
    }
    if (y < 1900 || y > 2200 || mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null;
    return mk(y, mo, d);
  }
  function ymd(n) { var t = new Date(n * 86400000); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
  function iso(n) { var o = ymd(n); return o.y + '-' + (o.m < 10 ? '0' : '') + o.m + '-' + (o.d < 10 ? '0' : '') + o.d; }
  function wday(n) { return ((n % 7) + 7 + 4) % 7; } // 1970-01-01 was a Thursday (4)
  function fmt(n) { var o = ymd(n); return WD[wday(n)] + ', ' + MON[o.m - 1] + ' ' + o.d + ', ' + o.y; }
  function endOfMonth(n) { var o = ymd(n); return mk(o.y, o.m, daysIn(o.y, o.m)); }

  // "1,200.50" "$1,200" "PHP 5000" "₱5,000" -> number. Empty -> null. Negative or not a number -> NaN
  function num(s) {
    if (s === null || s === undefined) return null;
    var t = String(s).replace(/[\s,%$₱€£]|USD|PHP|EUR|GBP|AUD|CAD|A\$|C\$/gi, '');
    if (t === '') return null;
    if (!/^\d+(\.\d+)?$|^\.\d+$/.test(t)) return NaN;
    return parseFloat(t);
  }
  function fix(x, d) { var k = Math.pow(10, d === undefined ? 8 : d); return Math.round(x * k) / k; }
  function cur(c) { return CURRENCIES[c] || CURRENCIES.USD; }
  function group(n) {
    var parts = Math.abs(n).toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
  function money(n, c) { var r = Math.round(fix(n * 100, 6)) / 100; return (r < 0 ? '-' : '') + cur(c).sym + group(r); }
  function pct(x, d) { return fix(x * 100, d === undefined ? 2 : d).toFixed(d === undefined ? 2 : d) + '%'; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  // terms text from the list ("Net 30", "net30", "N30", "30", "EOM", "Net 30 EOM", "15th of next month", "Due on receipt",
  // "2/10 Net 30") -> { kind, days, label, disc?, discDays? }. Not understood -> null
  function parseTerms(s) {
    var t = String(s === null || s === undefined ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
    if (!t) return null;
    var disc = null, m = /^(\d+(?:\.\d+)?)\s*%?\s*\/\s*(\d+)[\s,]+(.*)$/.exec(t);
    if (m) { disc = { pct: +m[1], days: +m[2] }; t = m[3].trim(); }
    var r = null;
    if (/^(due )?(on|upon) receipt$|^receipt$|^cod$|^net 0$|^net0$|^due now$|^immediate(ly)?$/.test(t)) r = { kind: 'receipt', days: 0 };
    else if (/^(eom|end of (the )?month)$/.test(t)) r = { kind: 'eom', days: 0 };
    else if ((m = /^(?:net ?|n ?\/? ?)?(\d{1,3}) ?(?:days )?eom$/.exec(t))) r = { kind: 'neteom', days: +m[1] };
    else if (/^15th$|^15(th)? (of )?(the )?(next|following) month$/.test(t)) r = { kind: '15th', days: 0 };
    else if ((m = /^(?:net ?|n ?\/? ?)?(\d{1,3})(?: days?)?$/.exec(t))) r = +m[1] === 0 ? { kind: 'receipt', days: 0 } : { kind: 'net', days: +m[1] };
    if (!r) return null;
    if (disc) { r.disc = disc.pct; r.discDays = disc.days; }
    r.label = termsLabel(r);
    return r;
  }
  function termsLabel(r) {
    var base = r.kind === 'receipt' ? 'Due on receipt' : r.kind === 'eom' ? 'EOM' : r.kind === 'neteom' ? 'Net ' + r.days + ' EOM'
      : r.kind === '15th' ? '15th of next month' : 'Net ' + r.days;
    return (r.disc !== undefined ? fix(r.disc, 4) + '/' + r.discDays + ' ' : '') + base;
  }
  // value from the drop-down (+ custom days) -> terms object, or { error }
  function termsFromForm(o) {
    var v = o.terms || 'net30', m = /^net(\d+)$/.exec(v);
    if (m) return { kind: 'net', days: +m[1], label: 'Net ' + m[1] };
    if (v === 'receipt') return { kind: 'receipt', days: 0, label: 'Due on receipt' };
    if (v === 'eom') return { kind: 'eom', days: 0, label: 'EOM' };
    if (v === 'net30eom') return { kind: 'neteom', days: 30, label: 'Net 30 EOM' };
    if (v === '15th') return { kind: '15th', days: 0, label: '15th of next month' };
    var d = num(o.customDays);
    if (d === null) return { error: 'Enter the number of days for custom terms, e.g. 21.', empty: true };
    if (isNaN(d) || d % 1) return { error: 'Custom days must be a whole number, e.g. 21.' };
    if (d > MAX_DAYS) return { error: 'Please keep custom days to ' + MAX_DAYS + ' or fewer.' };
    return d === 0 ? { kind: 'receipt', days: 0, label: 'Due on receipt' } : { kind: 'net', days: d, label: 'Net ' + d };
  }

  // the due date before any weekend rule
  function rawDue(inv, t) {
    if (t.kind === 'receipt') return inv;
    if (t.kind === 'net') return inv + t.days;
    if (t.kind === 'eom') return endOfMonth(inv);
    if (t.kind === 'neteom') return endOfMonth(inv) + t.days;
    var o = ymd(inv); // 15th of next month (December -> January 15 of the next year)
    return o.m === 12 ? mk(o.y + 1, 1, 15) : mk(o.y, o.m + 1, 15);
  }
  // weekend rule. A due date is never moved to before the invoice date.
  function adjust(n, rule, inv) {
    var w = wday(n);
    if (rule === 'prev' && (w === 0 || w === 6)) { var p = n - (w === 6 ? 1 : 2); return inv !== undefined && p < inv ? n : p; }
    if (rule === 'next' && (w === 0 || w === 6)) return n + (w === 6 ? 2 : 1);
    return n;
  }
  function status(due, today) {
    if (today === null || today === undefined) return null;
    var d = due - today;
    return { days: d, overdue: d < 0, label: d > 0 ? plural(d, 'day') + ' left' : d === 0 ? 'Due today' : plural(-d, 'day') + ' overdue' };
  }
  // early payment discount: d/(1-d) x 365/(payment period - discount period)
  function annualized(discPct, netDays, discDays) {
    var d = discPct / 100;
    if (!(d > 0 && d < 1) || !(netDays > discDays)) return null;
    return d / (1 - d) * 365 / (netDays - discDays);
  }

  // one invoice from the form
  function calc(o) {
    var inv = parseDate(o.invoiceDate);
    if (!o.invoiceDate) return { state: 'empty' };
    if (inv === null) return { state: 'error', error: 'Please enter a valid invoice date.' };
    var t = termsFromForm(o);
    if (t.error) return { state: t.empty ? 'empty' : 'error', error: t.error };
    var raw = rawDue(inv, t), due = adjust(raw, o.weekend, inv), today = parseDate(o.today);
    var r = { state: 'ok', invoice: inv, terms: t, rawDue: raw, due: due, moved: due !== raw, weekend: o.weekend in WEEKEND ? o.weekend : 'keep',
      termDays: raw - inv, calDays: due - inv, today: today, status: status(due, today), currency: o.currency };
    var amount = num(o.amount);
    if (amount !== null && isNaN(amount)) r.amountError = 'The amount must be a number, e.g. 1,200.';
    else r.amount = amount;
    // discount (optional)
    var dp = num(o.discPct), dd = num(o.discDays);
    if (dp !== null || dd !== null) {
      if (dp === null || dd === null) r.discError = 'Enter both the discount % and the number of days, e.g. 2 and 10.';
      else if (isNaN(dp) || isNaN(dd) || dd % 1) r.discError = 'The discount needs a % (e.g. 2) and a whole number of days (e.g. 10).';
      else if (dp <= 0 || dp >= 100) r.discError = 'The discount % must be more than 0 and less than 100.';
      else if (dd >= r.termDays) r.discError = 'The discount period (' + plural(dd, 'day') + ') must be shorter than the payment period (' + plural(r.termDays, 'day') + ').';
      else {
        var dl = inv + dd;
        r.disc = { pct: dp, days: dd, deadline: dl, apr: annualized(dp, r.termDays, dd), status: status(dl, today) };
        if (amount !== null && !isNaN(amount)) { r.disc.saving = fix(amount * dp / 100, 6); r.disc.pay = fix(amount - r.disc.saving, 6); }
      }
    }
    return r;
  }

  // one CSV line -> fields (quotes, commas or tabs)
  function splitLine(line) {
    var sep = line.indexOf('\t') >= 0 ? '\t' : ',', out = [], f = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (q) { if (ch === '"') { if (line[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
      else if (ch === '"') q = true;
      else if (ch === sep) { out.push(f.trim()); f = ''; }
      else f += ch;
    }
    out.push(f.trim());
    return out;
  }
  // pasted list "date,amount,terms[,reference]" -> rows sorted by due date + totals.
  // Empty terms use the default terms. Lines that can't be read are listed with the reason.
  function parseList(text, opt) {
    opt = opt || {};
    var rows = [], bad = [], today = parseDate(opt.today), def = opt.defaultTerms || null, lines = String(text || '').split(/\r?\n/);
    lines.forEach(function (raw, i) {
      var line = raw.trim();
      if (!line || line.charAt(0) === '#') return;
      var f = splitLine(line);
      if (!rows.length && !bad.length && /date/i.test(f[0]) && parseDate(f[0]) === null) return; // header line
      if (rows.length >= MAX_ROWS) { bad.push({ line: i + 1, text: line, why: 'More than ' + MAX_ROWS + ' rows' }); return; }
      var inv = parseDate(f[0]);
      if (inv === null) { bad.push({ line: i + 1, text: line, why: 'Date not recognized (use YYYY-MM-DD or MM/DD/YYYY)' }); return; }
      var amt = num(f[1]);
      if (amt === null || isNaN(amt)) { bad.push({ line: i + 1, text: line, why: 'Amount missing or not a number' }); return; }
      var t = f[2] ? parseTerms(f[2]) : def;
      if (!t) { bad.push({ line: i + 1, text: line, why: f[2] ? 'Terms not recognized' : 'No terms' }); return; }
      if (t.days > MAX_DAYS) { bad.push({ line: i + 1, text: line, why: 'Terms over ' + MAX_DAYS + ' days' }); return; }
      var raw2 = rawDue(inv, t), due = adjust(raw2, opt.weekend, inv);
      rows.push({ line: i + 1, invoice: inv, amount: amt, terms: t, ref: f.slice(3).join(', '), rawDue: raw2, due: due, moved: due !== raw2, status: status(due, today) });
    });
    rows.sort(function (a, b) { return a.due - b.due || a.line - b.line; });
    var sum = { total: 0, overdue: 0, overdueCount: 0, today: 0, todayCount: 0, next7: 0, next7Count: 0, later: 0, laterCount: 0 };
    rows.forEach(function (r) {
      sum.total = fix(sum.total + r.amount, 6);
      if (!r.status) return;
      if (r.status.days < 0) { sum.overdue = fix(sum.overdue + r.amount, 6); sum.overdueCount++; }
      else if (r.status.days === 0) { sum.today = fix(sum.today + r.amount, 6); sum.todayCount++; }
      else if (r.status.days <= 7) { sum.next7 = fix(sum.next7 + r.amount, 6); sum.next7Count++; }
      else { sum.later = fix(sum.later + r.amount, 6); sum.laterCount++; }
    });
    return { rows: rows, bad: bad, sum: sum, today: today };
  }

  // text for "Copy result"
  function text(r) {
    var c = r.currency, L = ['Invoice due date', 'Invoice date: ' + fmt(r.invoice), 'Terms: ' + r.terms.label];
    if (r.moved) L.push('Due date by the terms: ' + fmt(r.rawDue) + ' (weekend)', 'Due date (' + WEEKEND[r.weekend].toLowerCase() + '): ' + fmt(r.due));
    else L.push('Due date: ' + fmt(r.due));
    L.push('Days from the invoice date: ' + r.calDays);
    if (r.status) L.push('As of ' + fmt(r.today) + ': ' + r.status.label);
    if (r.amount !== null && r.amount !== undefined && !isNaN(r.amount)) L.push('Amount: ' + money(r.amount, c));
    if (r.disc) {
      L.push('Early payment discount: ' + fix(r.disc.pct, 4) + '% if paid by ' + fmt(r.disc.deadline) + (r.disc.status ? ' (' + r.disc.status.label + ')' : ''));
      if (r.disc.pay !== undefined) L.push('Pay ' + money(r.disc.pay, c) + ' by then (saves ' + money(r.disc.saving, c) + ')');
      if (r.disc.apr !== null) L.push('Annualized cost of skipping the discount: about ' + pct(r.disc.apr));
    }
    L.push('Holidays are not included. Check your contract and local holidays.');
    return L.join('\n');
  }
  function listText(res, c) {
    var L = ['Due date,Invoice date,Amount,Terms,Status,Reference'];
    res.rows.forEach(function (r) {
      L.push([iso(r.due), iso(r.invoice), r.amount.toFixed(2), r.terms.label, r.status ? r.status.label : '', r.ref].map(function (x) {
        x = String(x); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x;
      }).join(','));
    });
    L.push('', 'Total,' + money(res.sum.total, c) + ',Overdue,' + money(res.sum.overdue, c));
    return L.join('\n');
  }

  var API = { WD: WD, CURRENCIES: CURRENCIES, TERMS: TERMS, WEEKEND: WEEKEND, parseDate: parseDate, iso: iso, ymd: ymd, wday: wday, fmt: fmt,
    endOfMonth: endOfMonth, num: num, fix: fix, money: money, pct: pct, parseTerms: parseTerms, termsFromForm: termsFromForm,
    rawDue: rawDue, adjust: adjust, status: status, annualized: annualized, calc: calc, splitLine: splitLine, parseList: parseList,
    text: text, listText: listText };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.DUEDATE = API;
})(this);
