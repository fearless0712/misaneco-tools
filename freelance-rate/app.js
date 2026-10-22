/* Freelance rate calculator - page */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var R = FRATE, KEY = 'misaneco.freelance-rate.v1';
  var F = ['currency', 'period', 'income', 'expenses', 'setAside', 'weeks', 'hours', 'billable',
    'rate', 'projHours', 'buffer', 'platform', 'transferPct', 'transferFixed'];
  var DEF = { currency: 'USD', period: 'year', income: '40000', expenses: '3000', setAside: '25', weeks: '48', hours: '40', billable: '60',
    rate: '', projHours: '40', buffer: '15', platform: '10', transferPct: '1', transferFixed: '0' };
  var state = {};
  F.forEach(function (k) { state[k] = DEF[k]; });
  try {
    var s = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') F.forEach(function (k) { if (typeof s[k] === 'string') state[k] = s[k]; });
  } catch (e) { /* storage not available */ }
  if (!R.CURRENCIES[state.currency]) state.currency = 'USD';
  if (state.period !== 'month') state.period = 'year';
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* noop */ } }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function row(tb, k, v) {
    var tr = document.createElement('tr'), th = document.createElement('th'), td = document.createElement('td');
    th.scope = 'row'; th.textContent = k; td.className = 'num'; td.textContent = v;
    tr.appendChild(th); tr.appendChild(td); tb.appendChild(tr);
  }
  var copyText = '';

  function update() {
    save();
    var c = state.currency, m = function (n) { return R.money(n, c); };
    $('incomeLabel').textContent = 'Take-home income goal per ' + (state.period === 'month' ? 'month' : 'year');
    var res = R.calc(state), r = res.rate, p = res.project;
    ['tRate', 'tPrice', 'tTake', 'tEff'].forEach(function (id) { $(id).textContent = '—'; $(id + 'Sub').textContent = ''; });
    clear($('tbRate')); clear($('tbProj'));
    $('cmp').hidden = true; $('cmp').className = 'tip';
    var errs = [];
    copyText = '';
    if (r.state === 'ok') {
      $('tRate').textContent = m(r.rate);
      $('tRateSub').textContent = 'minimum, per billable hour';
      row($('tbRate'), 'Income goal (per year)', m(r.incomeYear) + (r.monthly ? ' (' + m(r.incomeYear / 12) + ' x 12)' : ''));
      row($('tbRate'), 'Set aside (' + R.pct(r.setAsidePct) + ' of profit)', m(r.setAside));
      row($('tbRate'), 'Business expenses', m(r.expenses));
      row($('tbRate'), 'Revenue needed per year', m(r.revenue));
      row($('tbRate'), 'Revenue needed per month', m(r.revenueMonth));
      row($('tbRate'), 'Working hours per year', R.hrs(r.workHours) + ' h (' + R.hrs(r.weeks) + ' weeks x ' + R.hrs(r.hoursWeek) + ' h)');
      row($('tbRate'), 'Billable hours per year', R.hrs(r.billHours) + ' h (' + R.pct(r.billablePct) + ', about ' + R.hrs(r.billWeek) + ' h a week)');
      row($('tbRate'), 'Required hourly rate', m(r.rate));
    } else errs.push(r.error);
    if (p.state === 'ok') {
      $('tPrice').textContent = m(p.price);
      $('tPriceSub').textContent = R.hrs(p.bufHours) + ' h at ' + m(p.rate) + '/h' + (p.ownRate ? ' (your rate)' : ' (required rate)');
      $('tTake').textContent = m(p.takeHome);
      $('tTakeSub').textContent = 'fees ' + m(p.fees) + ' (' + R.pct(R.fix(p.feeShare, 2)) + ' of the price)';
      $('tEff').textContent = m(p.effRate);
      $('tEffSub').textContent = 'on ' + R.hrs(p.projHours) + ' h; ' + m(p.effRateBuf) + ' if the buffer is used';
      row($('tbProj'), 'Hourly rate used', m(p.rate) + (p.ownRate ? ' (your rate)' : ' (required rate)'));
      row($('tbProj'), 'Hours with buffer', R.hrs(p.projHours) + ' h + ' + R.pct(p.bufferPct) + ' = ' + R.hrs(p.bufHours) + ' h');
      row($('tbProj'), 'Suggested project price', m(p.price));
      row($('tbProj'), 'Platform fee (' + R.pct(p.platformPct) + ')', '-' + m(p.platformFee));
      row($('tbProj'), 'Transfer fee (' + R.pct(p.transferPct) + ' + ' + m(p.transferFixed) + ')', '-' + m(p.transferFee));
      row($('tbProj'), 'Take-home after fees', m(p.takeHome));
      row($('tbProj'), 'Effective hourly rate (' + R.hrs(p.projHours) + ' h)', m(p.effRate));
      row($('tbProj'), 'Effective hourly rate (' + R.hrs(p.bufHours) + ' h, buffer used)', m(p.effRateBuf));
      row($('tbProj'), 'Hourly rate to quote so the % fees are covered', m(p.grossUp));
      if (p.lost) errs.push('The fees are larger than the price. Check the fees and the fixed fee per payment.');
      else if (r.state === 'ok') {
        var low = p.effRate < r.rate, lowBuf = p.effRateBuf < r.rate;
        $('cmp').textContent = low
          ? 'After fees you keep ' + m(p.effRate) + ' an hour, below your required rate of ' + m(r.rate) + '. Raise the price, cut the hours or look for lower fees.'
          : lowBuf
            ? 'After fees you keep ' + m(p.effRate) + ' an hour if the work takes ' + R.hrs(p.projHours) + ' h, but only ' + m(p.effRateBuf) + ' if you use the whole buffer, below your required ' + m(r.rate) + '.'
            : 'After fees you keep ' + m(p.effRateBuf) + ' to ' + m(p.effRate) + ' an hour, at or above your required rate of ' + m(r.rate) + '.';
        if (low || lowBuf) $('cmp').className = 'tip low';
        $('cmp').hidden = false;
      }
    } else if (p.error && !(p.state === 'empty' && r.state !== 'ok')) errs.push(p.error);
    $('err').textContent = errs.join(' ');
    if (r.state === 'ok' || p.state === 'ok') copyText = R.text(res, state);
  }

  F.forEach(function (k) {
    var i = $(k); i.value = state[k];
    i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', function () { state[k] = i.value; update(); });
  });
  $('reset').addEventListener('click', function () {
    F.forEach(function (k) { state[k] = DEF[k]; $(k).value = DEF[k]; });
    $('copied').textContent = '';
    update();
  });
  $('copy').addEventListener('click', function () {
    if (!copyText) { $('copied').textContent = 'Enter your numbers first.'; return; }
    var done = function (ok) { $('copied').textContent = ok ? 'Copied.' : 'Could not copy. Please select the result and copy it.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(copyText).then(function () { done(true); }, function () { done(false); });
    else done(false);
  });
  update();
})();
