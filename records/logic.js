/* Record retention: general rules only (checked 2026-10-19 against IRS, GOV.UK, CRA, ATO pages). */
(function (root) {
  var RULES = {
    us: { name: 'United States', rule: 'Generally 3 years from the date you filed (a return filed early counts as filed on the due date).', src: 'https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records',
      extra: ['3 years from filing or 2 years from paying the tax, whichever is later, if you claim a credit or refund after filing.', '7 years if you claim a loss from worthless securities or a bad debt deduction.', '6 years if you leave out income of more than 25% of the gross income on your return.', 'Employment tax records: at least 4 years after the tax is due or paid, whichever is later.', 'Indefinitely if you do not file a return or file a fraudulent one.'] },
    uk: { name: 'United Kingdom (self-employed)', rule: 'At least 5 years after the 31 January submission deadline of the tax year.', src: 'https://www.gov.uk/self-employed-records/how-long-to-keep-your-records',
      extra: ['If you send your return more than 4 years after the deadline, keep records for 15 months after you send it.', 'Limited companies follow different rules.'] },
    ca: { name: 'Canada', rule: '6 years from the end of the last tax year the records relate to.', src: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/where-keep-your-records-long-request-permission-destroy-them-early.html',
      extra: ['Some records (for example certain property and corporate records) must be kept longer.', 'For corporations the tax year is the fiscal period.'] },
    au: { name: 'Australia', rule: 'Most records: 5 years from when you prepared or obtained the record, or completed the transaction, whichever is later.', src: 'https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/record-keeping-for-business/overview-of-record-keeping-rules-for-business',
      extra: ['Depreciating assets: keep records for as long as you hold the asset, then 5 more years.', 'Other regulators (such as ASIC for companies) can set different periods.'] }
  };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
  function addYears(s, n) { var p = s.split('-').map(Number); var y = p[0] + n, m = p[1], d = p[2];
    if (m === 2 && d === 29 && !((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) d = 28; return iso(y, m, d); }
  /* opts: country, year (tax year label), filed (yyyy-mm-dd, US optional), end (yyyy-mm-dd, CA fiscal end / AU transaction date) */
  function keepUntil(o) {
    var y = +o.year;
    if (o.country === 'us') {
      var due = iso(y + 1, 4, 15), base = o.filed && o.filed > due ? o.filed : due;
      return { date: addYears(base, 3), basis: (base === due ? 'Due date ' : 'Filing date ') + base + ' + 3 years (calendar-year return due April 15)' };
    }
    if (o.country === 'uk') { var dl = iso(y + 2, 1, 31); return { date: addYears(dl, 5), basis: 'Tax year ' + y + '/' + String(y + 1).slice(2) + ' (ends 5 April ' + (y + 1) + '), deadline ' + dl + ' + 5 years' }; }
    if (o.country === 'ca') { var e = o.end || iso(y, 12, 31); return { date: addYears(e, 6), basis: 'End of tax year ' + e + ' + 6 years' }; }
    if (o.country === 'au') { var t = o.end || iso(y + 1, 6, 30); return { date: addYears(t, 5), basis: 'Record / transaction date ' + t + ' + 5 years' }; }
    return null;
  }
  var API = { RULES: RULES, keepUntil: keepUntil, addYears: addYears };
  if (typeof module !== 'undefined') module.exports = API; else root.RET = API;
})(this);
