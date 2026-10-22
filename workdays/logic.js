/* Working days calculator - calculation part (browser and node). Same counting rules as ../kouki/logic.js */
(function (root) {
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MAX_SPAN = 366 * 3; // up to 3 years
  // weekend presets: days off [Sun..Sat], label, Excel WORKDAY.INTL / NETWORKDAYS.INTL weekend argument
  var WEEKENDS = {
    satsun: { off: [1, 0, 0, 0, 0, 0, 1], label: 'Saturday + Sunday', excel: '1' },
    sun: { off: [1, 0, 0, 0, 0, 0, 0], label: 'Sunday only', excel: '11' },
    sat: { off: [0, 0, 0, 0, 0, 0, 1], label: 'Saturday only', excel: '17' },
    frisat: { off: [0, 0, 0, 0, 0, 1, 1], label: 'Friday + Saturday', excel: '7' },
    none: { off: [0, 0, 0, 0, 0, 0, 0], label: 'None (every day is a working day)', excel: '"0000000"' }
  };

  function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  // "2026-10-09" or "2026/10/9" -> day number (1970-01-01 = 0). Dates that don't exist -> null
  function parseDate(s) {
    var m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/.exec(String(s || '').trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null;
    return Date.UTC(y, mo - 1, d) / 86400000;
  }
  function ymd(n) { var t = new Date(n * 86400000); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
  function iso(n) { var o = ymd(n); return o.y + '-' + (o.m < 10 ? '0' : '') + o.m + '-' + (o.d < 10 ? '0' : '') + o.d; }
  function wday(n) { return ((n % 7) + 7 + 4) % 7; } // 1970-01-01 was a Thursday (4)
  function fmt(n) { var o = ymd(n); return WD[wday(n)] + ', ' + MON[o.m - 1] + ' ' + o.d + ', ' + o.y; }
  function fmtShort(n) { var o = ymd(n); return WD[wday(n)] + ' ' + MON[o.m - 1] + ' ' + o.d; }

  // working days "3" -> 3. Empty -> null, not a whole number -> NaN (0 and negatives are rejected in calc)
  function num(s) {
    if (s === null || s === undefined) return null;
    var t = String(s).replace(/[\s,]/g, '').replace(/days?$/i, '').replace(/^[−–]/, '-');
    if (t === '') return null;
    if (!/^-?\d+$/.test(t)) return NaN;
    return parseInt(t, 10);
  }

  function weekend(preset) { return (WEEKENDS[preset] || WEEKENDS.satsun).off.map(Boolean); }

  // Holidays and closures: one date per line (YYYY-MM-DD), optional note after it ("2026-12-25 Christmas").
  // Lines that can't be read are skipped and counted.
  function parseHolidays(text) {
    var days = {}, bad = [], count = 0;
    String(text || '').split(/\r?\n/).forEach(function (raw, i) {
      var line = raw.trim();
      if (!line) return;
      var m = /^(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})(?:[\s,;\t]+(.*))?$/.exec(line), n = m ? parseDate(m[1]) : null;
      if (n === null) { bad.push({ line: i + 1, text: line }); return; }
      var note = (m[2] || '').trim();
      if (!(n in days)) { count++; days[n] = note || 'Closed'; } else if (note && days[n] === 'Closed') days[n] = note;
    });
    return { days: days, bad: bad, count: count };
  }

  // One day: off = weekend or holiday (a holiday on a weekend counts once, as weekend)
  function dayInfo(n, ctx) {
    var r = { n: n, off: false, kind: '', label: '' }, h = ctx.holidays[n];
    if (ctx.week[wday(n)]) { r.off = true; r.kind = 'week'; }
    else if (h) { r.off = true; r.kind = 'holiday'; }
    r.label = h || '';
    return r;
  }

  function context(o) {
    var h = parseHolidays(o.holidays);
    return { week: weekend(o.weekend), holidays: h.days, bad: h.bad, holidayCount: h.count };
  }

  function summarize(list, ctx, extra) {
    var off = { week: 0, holiday: 0 }, work = 0;
    list.forEach(function (x) { if (x.off) off[x.kind]++; else x.no = ++work; });
    var a = list[0].n, b = list[list.length - 1].n;
    var r = { state: 'ok', start: a, end: b, calDays: b - a + 1, workDays: work, offDays: off.week + off.holiday, off: off, list: list,
      ignored: ctx.bad.length, bad: ctx.bad, holidayCount: ctx.holidayCount };
    for (var k in extra) r[k] = extra[k];
    return r;
  }

  // start date + working days -> end date (the start date is day 1; if it is a day off, the next working day is day 1)
  function calcEnd(o) {
    var days = num(o.days), s = parseDate(o.start);
    if (!o.start && days === null) return { state: 'empty' };
    if (s === null) return { state: 'error', error: o.start ? 'Please enter a valid start date.' : 'Please enter a start date.' };
    if (days === null) return { state: 'empty' };
    if (isNaN(days)) return { state: 'error', error: 'Working days must be a whole number, e.g. 10.' };
    if (days < 1) return { state: 'error', error: 'Working days must be 1 or more. (The start date counts as day 1.)' };
    if (days > 1000) return { state: 'error', error: 'Please keep working days to 1,000 or fewer.' };
    var ctx = context(o), list = [], work = 0, n = s;
    while (work < days) {
      if (n - s >= MAX_SPAN) return { state: 'error', error: 'The schedule runs past 3 years. Check the working days and the days off.' };
      var x = dayInfo(n, ctx);
      if (!x.off) work++;
      list.push(x); n++;
    }
    // if the start date is a day off, keep it in the list and say counting starts on the next working day
    var first = list.filter(function (x) { return !x.off; })[0].n;
    return summarize(list, ctx, { mode: 'end', days: days, startOff: first !== s, firstWork: first });
  }

  // start date to end date (both included) -> working days
  function calcCount(o) {
    var s = parseDate(o.start), e = parseDate(o.end);
    if (!o.start && !o.end) return { state: 'empty' };
    if (s === null || e === null) return { state: 'error', error: 'Please enter a valid start date and end date.' };
    if (e < s) return { state: 'error', error: 'The end date is before the start date.' };
    if (e - s >= MAX_SPAN) return { state: 'error', error: 'Please keep the range to 3 years or less.' };
    var ctx = context(o), list = [];
    for (var n = s; n <= e; n++) list.push(dayInfo(n, ctx));
    return summarize(list, ctx, { mode: 'count' });
  }

  function calc(o) { return o.mode === 'count' ? calcCount(o) : calcEnd(o); }

  // calendar: one block per month, 7 columns Sun..Sat (null outside the range)
  function months(r) {
    var out = [], cur = null;
    r.list.forEach(function (x) {
      var o = ymd(x.n);
      if (!cur || cur.y !== o.y || cur.m !== o.m) {
        cur = { y: o.y, m: o.m, title: MONTH[o.m - 1] + ' ' + o.y, cells: [] };
        out.push(cur);
        for (var i = 0; i < wday(x.n); i++) cur.cells.push(null);
      }
      cur.cells.push({ d: o.d, n: x.n, off: x.off, kind: x.kind, label: x.label, no: x.no });
    });
    out.forEach(function (mo) { while (mo.cells.length % 7) mo.cells.push(null); });
    return out;
  }

  function excelDate(n) { var o = ymd(n); return 'DATE(' + o.y + ',' + o.m + ',' + o.d + ')'; }
  // the same calculation in Excel / Google Sheets
  function excel(r, o) {
    var w = (WEEKENDS[o.weekend] || WEEKENDS.satsun).excel, hol = r && r.holidayCount ? 'holidays' : '';
    var general = r && r.mode === 'count'
      ? '=NETWORKDAYS.INTL(start, end, ' + w + (hol ? ', holidays' : '') + ')'
      : '=WORKDAY.INTL(start-1, days, ' + w + (hol ? ', holidays' : '') + ')';
    if (!r || r.state !== 'ok') return { general: '=WORKDAY.INTL(start-1, days, weekend, holidays)', filled: '' };
    var filled = r.mode === 'count'
      ? '=NETWORKDAYS.INTL(' + excelDate(r.start) + ', ' + excelDate(r.end) + ', ' + w + (hol ? ', holidays' : '') + ')'
      : '=WORKDAY.INTL(' + excelDate(r.start) + '-1, ' + r.days + ', ' + w + (hol ? ', holidays' : '') + ')';
    return { general: general, filled: filled };
  }

  // text for "Copy result"
  function text(r, o) {
    var L = ['Working days calculation', 'Start date: ' + fmt(r.start)];
    if (r.mode === 'end') {
      if (r.startOff) L.push('Note: the start date is a day off, so counting starts on the next working day, ' + fmt(r.firstWork));
      L.push('Working days: ' + r.days, 'End date: ' + fmt(r.end));
    } else {
      L.push('End date: ' + fmt(r.end), 'Working days: ' + r.workDays);
    }
    L.push('Calendar days: ' + r.calDays + ' (days off: ' + r.offDays + ' = weekend ' + r.off.week + ' + holidays/closures ' + r.off.holiday + ')');
    L.push('Weekend: ' + (WEEKENDS[o.weekend] || WEEKENDS.satsun).label);
    var offs = r.list.filter(function (x) { return x.kind === 'holiday'; }).map(function (x) { return fmtShort(x.n) + (x.label !== 'Closed' ? ' (' + x.label + ')' : ''); });
    if (offs.length) L.push('Holidays/closures skipped: ' + offs.join(', '));
    if (r.ignored) L.push('Note: ' + r.ignored + ' holiday line(s) could not be read and were ignored');
    L.push('Excel: ' + excel(r, o).filled);
    return L.join('\n');
  }

  var API = { WD: WD, WEEKENDS: WEEKENDS, num: num, parseDate: parseDate, iso: iso, ymd: ymd, wday: wday, fmt: fmt, fmtShort: fmtShort,
    weekend: weekend, parseHolidays: parseHolidays, calcEnd: calcEnd, calcCount: calcCount, calc: calc, months: months, excel: excel, text: text };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.WORKDAYS = API;
})(this);
