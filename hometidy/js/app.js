/* HomeTidy main UI. Everything runs in this page; no image leaves the device. */
(function(){
  'use strict';
  var HT = window.HT;
  var t = function(k,v){ return HT.t(k,v); };
  var $ = function(id){ return document.getElementById(id); };
  var esc = function(s){ return HT.plan.esc(s); };

  var state = { shots: [], cur: 0, items: [], worker: null, plan: null };
  // shot = {name, url, img, m, grid, auto, cells}

  /* ---------- startup ---------- */
  async function init(){
    await HT.i18n.init();
    renderStatic();
    try { await HT.match.load(); } catch(e){ console.error(e); }
    await HT.ads.load();
    HT.ads.showBanner(HT.i18n.uiLang);
    HT.ads.showInterstitial(HT.i18n.uiLang);
    document.addEventListener('ht:lang', function(){
      renderStatic(); HT.ads.showBanner(HT.i18n.uiLang);
      if (!$('step3').hidden) renderItems();
      if (!$('step4').hidden) renderPlan();
      if (!$('step2').hidden) { buildSliders(); drawGrid(); }
    });
    bind();
  }
  function lines(key){ return t(key).split('\n').filter(Boolean); }
  function renderStatic(){
    // focus guide
    var f = '<p>' + esc(t('focusIntro')) + '</p><ol class="steps">' + lines('focusSteps').map(function(s){ return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    f += '<p class="small">' + esc(t('focusNote')) + '</p>';
    f += '<p class="src">' + esc(t('source')) + ': <a href="' + t('focusUrl') + '" target="_blank" rel="noopener">' + esc(t('focusUrlTitle')) + '</a><br>' + esc(t('focusUrl')) + '<br><a href="' + t('focusUrl2') + '" target="_blank" rel="noopener">' + esc(t('focusUrl2')) + '</a><br>' + esc(t('checked')) + '</p>';
    $('focusBody').innerHTML = f;
    $('privacyBody').innerHTML = '<ul>' + lines('privacyList').map(function(s){ return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>';
  }

  /* ---------- step 1 ---------- */
  function bind(){
    $('fileInput').addEventListener('change', function(e){ addFiles(Array.from(e.target.files || [])); e.target.value = ''; });
    $('sampleBtn').addEventListener('click', loadSample);
    $('pasteText').addEventListener('input', updateAnalyze);
    $('analyzeBtn').addEventListener('click', analyze);
    $('prevShot').addEventListener('click', function(){ if (state.cur > 0){ state.cur--; buildSliders(); drawGrid(); } });
    $('nextShot').addEventListener('click', function(){ if (state.cur < state.shots.length-1){ state.cur++; buildSliders(); drawGrid(); } });
    $('resetGrid').addEventListener('click', function(){ var s = cur(); s.grid = Object.assign({}, s.auto); s.cells = HT.detect.classify(s.m, s.grid); buildSliders(); drawGrid(); });
    $('applyAll').addEventListener('click', function(){
      var g = cur().grid;
      state.shots.forEach(function(s){ if (s !== cur()){ s.grid = Object.assign({}, g); s.cells = HT.detect.classify(s.m, s.grid); } });
      $('ocrProgress').textContent = t('appliedAll');
    });
    $('gridCanvas').addEventListener('click', onGridTap);
    $('ocrBtn').addEventListener('click', runOCR);
    $('restOther').addEventListener('click', function(){ state.items.forEach(function(it){ if (!it.skip && !it.cat && !it.dock){ it.cat = 'other'; it.src = 'user'; } }); renderItems(); });
    $('keepAllDock').addEventListener('click', function(){ state.items.forEach(function(it){ if (it.dock && !it.skip && !it.cat){ it.keepDock = true; } }); renderItems(); if (!$('step4').hidden) renderPlan(); });
    $('planBtn').addEventListener('click', async function(){ await HT.ads.showInterstitial(HT.i18n.uiLang); renderPlan(); $('step4').hidden = false; $('step4').scrollIntoView({behavior:'smooth'}); });
    $('optLibrary').addEventListener('change', renderPlan);
    $('savePng').addEventListener('click', savePNG);
  }
  function updateAnalyze(){ $('analyzeBtn').disabled = !(state.shots.length || $('pasteText').value.trim()); }
  function loadImage(url){ return new Promise(function(res, rej){ var i = new Image(); i.onload = function(){ res(i); }; i.onerror = rej; i.src = url; }); }
  async function addFiles(files){
    for (var i=0;i<files.length;i++){
      var f = files[i]; if (!/^image\//.test(f.type) && !/\.(png|jpe?g|heic|webp)$/i.test(f.name)) continue;
      var url = URL.createObjectURL(f);
      try { var img = await loadImage(url); state.shots.push({name:f.name, url:url, img:img}); }
      catch(e){ $('progress').textContent = t('cantOpen', {name: f.name}); }
    }
    renderThumbs(); updateAnalyze();
  }
  async function loadSample(){
    for (var i=1;i<=2;i++){ var url = 'sample/sample' + i + '.png'; try { var img = await loadImage(url); state.shots.push({name:'sample' + i + '.png', url:url, img:img}); } catch(e){} }
    renderThumbs(); updateAnalyze();
  }
  function renderThumbs(){
    $('thumbs').innerHTML = state.shots.map(function(s, i){ return '<img src="' + s.url + '" alt="' + esc(t('pageN', {n:i+1})) + '">'; }).join('');
  }
  function analyze(){
    $('progress').textContent = '';
    state.shots.forEach(function(s){
      if (s.m) return;
      var r = HT.detect.detect(s.img);
      s.m = r.m; s.grid = r.grid; s.auto = Object.assign({}, r.grid);
      s.cells = HT.detect.classify(s.m, s.grid);
    });
    if (state.shots.length){
      state.cur = 0; $('step2').hidden = false; buildSliders(); drawGrid();
      $('step2').scrollIntoView({behavior:'smooth'});
    } else {
      state.items = []; addPasteItems(); showStep3();
    }
  }

  /* ---------- step 2: grid ---------- */
  function cur(){ return state.shots[state.cur]; }
  var view = {scale:1};
  function drawGrid(){
    var s = cur(); if (!s) return;
    $('shotLabel').textContent = t('pageOf', {n: state.cur+1, total: state.shots.length});
    $('prevShot').disabled = state.cur === 0; $('nextShot').disabled = state.cur >= state.shots.length-1;
    var cv = $('gridCanvas'), maxW = 600;
    var sc = Math.min(1, maxW / s.m.W);
    cv.width = Math.round(s.m.W*sc); cv.height = Math.round(s.m.H*sc);
    view.scale = sc;
    var ctx = cv.getContext('2d');
    ctx.drawImage(s.img, 0, 0, cv.width, cv.height);
    var k = s.m.k * sc;
    s.cells.forEach(function(c){
      ctx.save();
      ctx.lineWidth = Math.max(2, 3*sc*s.m.k/3);
      if (c.state === 'app'){ ctx.strokeStyle = '#22c55e'; ctx.setLineDash([]); }
      else if (c.state === 'widget'){ ctx.strokeStyle = '#f59e0b'; ctx.setLineDash([6,4]); }
      else if (c.state === 'folder'){ ctx.strokeStyle = '#a855f7'; ctx.setLineDash([6,4]); }
      else { ctx.strokeStyle = 'rgba(148,163,184,.9)'; ctx.setLineDash([2,4]); }
      ctx.strokeRect(c.x*k, c.y*k, c.s*k, c.s*k);
      if (c.state === 'app' && !c.dock){ ctx.strokeStyle = 'rgba(34,197,94,.55)'; ctx.setLineDash([3,3]); ctx.lineWidth = 1; var lb = labelBox(s, c); ctx.strokeRect(lb.x*sc, lb.y*sc, lb.w*sc, lb.h*sc); }
      ctx.restore();
    });
  }
  function labelBox(s, c){
    var k = s.m.k, g = s.grid, half = (g.px - g.s)/2;
    var x = (c.x - half + 1)*k, y = (c.y + c.s + c.s*0.03)*k, w = (c.s + 2*half - 2)*k, h = c.s*0.36*k;
    return {x:Math.max(0,x), y:y, w:Math.min(s.m.W - Math.max(0,x), w), h:h};
  }
  function onGridTap(e){
    var s = cur(); if (!s) return;
    var cv = $('gridCanvas'), rect = cv.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (cv.width/rect.width) / (view.scale*s.m.k), y = (e.clientY - rect.top) * (cv.height/rect.height) / (view.scale*s.m.k);
    var hit = s.cells.find(function(c){ return x >= c.x-4 && x <= c.x+c.s+4 && y >= c.y-4 && y <= c.y+c.s+4; });
    if (!hit) return;
    hit.state = hit.state === 'app' ? (hit.dock ? 'widget' : 'folder') : (hit.state === 'folder' ? 'widget' : 'app');
    drawGrid();
  }
  var SL = [
    ['x0', 'slLeft', 0, 80, 0.5], ['px', 'slPitchX', 60, 110, 0.5], ['s', 'slIcon', 40, 80, 0.5],
    ['y0', 'slTop', 0, 260, 1], ['py', 'slPitchY', 60, 140, 0.5], ['rows', 'slRows', 1, 7, 1], ['dockY', 'slDock', 500, 1000, 1]
  ];
  function buildSliders(){
    var s = cur(); if (!s) return;
    var h = SL.map(function(d){
      var max = d[0] === 'dockY' ? Math.round(s.m.h - s.grid.s) : d[3];
      var min = d[0] === 'dockY' ? Math.round(s.m.h*0.6) : d[2];
      if (d[0] === 'y0') max = Math.round(s.m.h*0.4);
      return '<label><span>' + esc(t(d[1])) + '</span><input type="range" data-k="' + d[0] + '" min="' + min + '" max="' + max + '" step="' + d[4] + '" value="' + s.grid[d[0]] + '"><output>' + (+s.grid[d[0]]).toFixed(d[4] < 1 ? 1 : 0) + '</output></label>';
    }).join('');
    h += '<label class="check"><input type="checkbox" id="dockOn"' + (s.grid.dock ? ' checked' : '') + '> <span>' + esc(t('slDockOn')) + '</span></label>';
    $('sliders').innerHTML = h;
    $('sliders').querySelectorAll('input[type=range]').forEach(function(inp){
      inp.addEventListener('input', function(){
        var g = cur().grid; g[inp.dataset.k] = +inp.value;
        inp.nextElementSibling.textContent = (+inp.value).toFixed(+inp.step < 1 ? 1 : 0);
        cur().cells = HT.detect.classify(cur().m, g); drawGrid();
      });
    });
    $('dockOn').addEventListener('change', function(e){ var g = cur().grid; g.dock = e.target.checked; cur().cells = HT.detect.classify(cur().m, g); drawGrid(); });
  }

  /* ---------- OCR ---------- */
  async function getWorker(){
    if (state.worker) return state.worker;
    var base = new URL('vendor/tesseract/', location.href).href;
    state.worker = await Tesseract.createWorker(['jpn','eng'], 1, {
      workerPath: base + 'worker.min.js',
      corePath: base + 'core/',
      langPath: base + 'lang/',
      workerBlobURL: false,
      gzip: true,
      logger: function(m){ if (m.status && m.status.indexOf('load') >= 0) $('ocrProgress').textContent = t('ocrLoading') + (m.progress ? ' ' + Math.round(m.progress*100) + '%' : ''); }
    });
    await state.worker.setParameters({ tessedit_pageseg_mode: '7', preserve_interword_spaces: '1' });
    return state.worker;
  }
  function labelCanvas(s, c, mode){
    var b = labelBox(s, c);
    var scale = Math.max(1, 64 / b.h);
    var w = Math.round(b.w*scale), h = Math.round(b.h*scale), pad = 16;
    var src = document.createElement('canvas'); src.width = w; src.height = h;
    var sx = src.getContext('2d', {willReadFrequently:true});
    sx.imageSmoothingQuality = 'high';
    sx.drawImage(s.img, b.x, b.y, b.w, b.h, 0, 0, w, h);
    var d = sx.getImageData(0, 0, w, h), p = d.data, ink = 0;
    for (var i=0;i<p.length;i+=4){
      var mx = Math.max(p[i],p[i+1],p[i+2]), mn = Math.min(p[i],p[i+1],p[i+2]);
      var on = mn > 175 && (mx - mn) < 60;
      if (on) ink++;
      // mode 'soft': keep anti-aliasing (white text -> dark grey ramp); default: hard black/white
      var v = mode === 'soft' ? Math.max(0, Math.min(255, 255 - (mn - 110) * 2.2)) : (on ? 0 : 255);
      if (mode === 'soft' && (mx - mn) >= 60) v = 255;
      p[i]=p[i+1]=p[i+2]=v; p[i+3]=255;
    }
    sx.putImageData(d, 0, 0);
    var out = document.createElement('canvas'); out.width = w + pad*2; out.height = h + pad*2;
    var ox = out.getContext('2d'); ox.fillStyle = '#fff'; ox.fillRect(0,0,out.width,out.height); ox.drawImage(src, pad, pad);
    return {canvas: out, ink: ink / (w*h)};
  }
  function iconURL(s, c){
    var k = s.m.k, cv = document.createElement('canvas'); cv.width = cv.height = 96;
    cv.getContext('2d').drawImage(s.img, c.x*k, c.y*k, c.s*k, c.s*k, 0, 0, 96, 96);
    return cv.toDataURL('image/png');
  }
  function cleanOCR(txt){
    var s = String(txt || '').replace(/\n/g,' ').trim();
    s = s.replace(/([^\x00-\x7f])\s+(?=[^\x00-\x7f])/g, '$1');      // join spaced Japanese chars
    s = s.replace(/^[^\w぀-ヿ㐀-鿿가-힯+]+|[^\w぀-ヿ㐀-鿿가-힯!+.…)]+$/g, '');
    // kanji that look like katakana, when next to katakana: 八->ハ 口->ロ 工->エ 力->カ 一->ー 二->ニ 夕->タ 卜->ト
    var KK = {'八':'ハ','口':'ロ','工':'エ','力':'カ','一':'ー','二':'ニ','夕':'タ','卜':'ト'};
    s = s.replace(/[八口工力一二夕卜](?=[ァ-ヺー])/g, function(k){ return KK[k]; });
    s = s.replace(/([ァ-ヺー])([八口工力一二夕卜])/g, function(m, pre, k){ return pre + KK[k]; });
    return s.trim();
  }
  async function runOCR(){
    $('ocrBtn').disabled = true;
    var items = [], jobs = [];
    state.shots.forEach(function(s, si){
      s.cells.forEach(function(c){
        if (c.state === 'empty') return;
        if (c.dock && si > 0) return;   // the Dock is the same on every page: use the first screenshot only
        var it = {id: 'i' + si + '-' + (c.dock ? 'd' : c.r) + '-' + c.c, shot: si, row: c.r, col: c.c, dock: c.dock, icon: iconURL(s, c), ocr: '', name: '', app: null, cat: null, src: null, star: false, skip: c.state !== 'app'};
        if (it.skip) it.skipReason = c.state === 'folder' ? 'folder' : 'widget';
        items.push(it);
        if ((c.state === 'app' || c.state === 'folder') && !c.dock) jobs.push({it: it, s: s, c: c});
      });
    });
    try {
      var w = jobs.length ? await getWorker() : null;
      for (var j=0;j<jobs.length;j++){
        $('ocrProgress').textContent = t('ocrProgress', {n: j+1, total: jobs.length});
        var lc = labelCanvas(jobs[j].s, jobs[j].c);
        if (lc.ink < 0.002) continue;
        var r = await w.recognize(lc.canvas);
        var txt = cleanOCR(r.data.text), conf = r.data.confidence;
        if (!HT.match.match(txt)){
          // second try with a soft (anti-aliased) image; keep whichever is in the dictionary, else the more confident one
          var r2 = await w.recognize(labelCanvas(jobs[j].s, jobs[j].c, 'soft').canvas);
          var txt2 = cleanOCR(r2.data.text);
          if (HT.match.match(txt2) || (txt2 && r2.data.confidence > conf + 5)){ txt = txt2; conf = r2.data.confidence; }
        }
        jobs[j].it.ocr = txt;
        jobs[j].it.conf = conf;
      }
      $('ocrProgress').textContent = t('ocrDone', {n: jobs.length});
    } catch(e){
      console.error(e);
      $('ocrProgress').textContent = t('ocrFail');
    }
    items.forEach(function(it){ if (!it.skip) resolveItem(it); });
    state.items = items;
    addPasteItems();
    $('ocrBtn').disabled = false;
    showStep3();
  }
  function resolveItem(it){
    var lang = HT.i18n.uiLang;
    var m = it.ocr ? HT.match.match(it.ocr) : null;
    if (m){ it.app = m.app; it.name = HT.match.displayName(m.app, lang); it.cat = m.app.cat; it.src = 'dict'; return; }
    it.name = it.ocr || '';
    var g = it.ocr ? HT.match.guess(it.ocr) : null;
    if (g){ it.cat = g; it.src = 'guess'; }
  }
  function addPasteItems(){
    var txt = $('pasteText').value.trim(); if (!txt) return;
    var have = new Set(state.items.filter(function(it){ return it.app; }).map(function(it){ return it.app.id; }));
    HT.match.parsePaste(txt).forEach(function(p, i){
      if (p.m && have.has(p.m.app.id)) return;
      var it = {id: 't' + i, shot: 0, fromText: true, icon: null, ocr: p.text, name: '', app: null, cat: null, src: null, star: false, skip: false};
      if (p.m){ it.app = p.m.app; it.name = HT.match.displayName(p.m.app, HT.i18n.uiLang); it.cat = p.m.app.cat; it.src = 'dict'; have.add(p.m.app.id); }
      else { it.name = p.text; var g = HT.match.guess(p.text); if (g){ it.cat = g; it.src = 'guess'; } }
      state.items.push(it);
    });
  }

  /* ---------- step 3 ---------- */
  function showStep3(){ $('step3').hidden = false; renderItems(); $('step3').scrollIntoView({behavior:'smooth'}); }
  function catChips(it, isDock){
    var h = isDock ? '' : '<button type="button" class="chip folderchip" data-act="folder" data-id="' + it.id + '">' + esc(t('isFolder')) + '</button>';
    h += HT.match.CATS.map(function(c){ return '<button type="button" class="chip' + (it.cat === c ? ' on' : '') + '" data-act="cat" data-id="' + it.id + '" data-cat="' + c + '">' + esc(t('cat_' + c)) + '</button>'; }).join('');
    h += '<button type="button" class="chip skip" data-act="skip" data-id="' + it.id + '">' + esc(t('notApp')) + '</button>';
    return '<div class="chips">' + h + '</div>';
  }
  function catSelect(it){
    return '<select class="catsel" data-act="sel" data-id="' + it.id + '" aria-label="' + esc(t('category')) + '">' + HT.match.CATS.map(function(c){ return '<option value="' + c + '"' + (it.cat === c ? ' selected' : '') + '>' + esc(t('cat_' + c)) + '</option>'; }).join('') + '</select>';
  }
  function renderItems(){
    var items = state.items;
    var active = items.filter(function(it){ return !it.skip && !it.keepDock; });
    var unknown = active.filter(function(it){ return !it.cat && !it.dock; });
    var dockItems = items.filter(function(it){ return it.dock && !it.skip; });
    var dict = active.filter(function(it){ return it.src === 'dict'; }).length;
    var guess = active.filter(function(it){ return it.src === 'guess'; }).length;
    $('summary3').textContent = t('summary', {n: active.length, d: dict, g: guess, u: unknown.length, s: items.length - active.length});
    $('unknownBlock').hidden = !unknown.length;
    $('dockBlock').hidden = !dockItems.length;
    $('dockList').innerHTML = dockItems.map(function(it){
      var named = it.cat ? '<div class="iname">' + esc(HT.plan.nameOf(it)) + ' · ' + esc(t('cat_' + it.cat)) + '</div>' : '';
      return '<li>' + HT.plan.iconHTML(it) + '<div>' + named + '<div class="imeta">' + esc(t('dockN', {n: it.col+1})) + '</div>' +
        '<div class="chips"><button type="button" class="chip keep' + (it.keepDock ? ' on' : '') + '" data-act="keep" data-id="' + it.id + '">' + esc(t('keepDock')) + '</button></div>' +
        catChips(it, true) + '<div class="nameedit"><input type="text" data-id="' + it.id + '" value="' + esc(it.name || '') + '" placeholder="' + esc(t('typeName')) + '" aria-label="' + esc(t('typeName')) + '"><button type="button" class="btn small" data-act="name" data-id="' + it.id + '">' + esc(t('ok')) + '</button></div></div></li>';
    }).join('');
    $('unknownList').innerHTML = unknown.map(function(it){
      return '<li>' + HT.plan.iconHTML(it) + '<div><div class="iname">' + esc(it.ocr ? t('readAs', {s: it.ocr}) : (it.dock ? t('noReadDock') : t('noRead'))) + '</div><div class="imeta">' + esc(HT.plan.posLabel(it)) + '</div>' +
        catChips(it) + '<div class="nameedit"><input type="text" data-id="' + it.id + '" value="' + esc(it.name || '') + '" placeholder="' + esc(t('typeName')) + '" aria-label="' + esc(t('typeName')) + '"><button type="button" class="btn small" data-act="name" data-id="' + it.id + '">' + esc(t('ok')) + '</button></div></div></li>';
    }).join('');
    $('allList').innerHTML = active.filter(function(it){ return it.cat; }).map(function(it){
      var badge = it.src === 'guess' ? '<span class="badge guess">' + esc(t('guessed')) + '</span>' : (it.src === 'user' ? '<span class="badge">' + esc(t('byYou')) + '</span>' : '');
      return '<li>' + HT.plan.iconHTML(it) + '<div><div class="iname">' + esc(HT.plan.nameOf(it)) + badge + '</div><div class="imeta">' + esc(HT.plan.posLabel(it)) + ' ' + catSelect(it) + (it.dock ? '' : ' <button type="button" class="chip folderchip small" data-act="folder" data-id="' + it.id + '">' + esc(t('isFolder')) + '</button>') + ' <button type="button" class="chip skip" data-act="skip" data-id="' + it.id + '">' + esc(t('notApp')) + '</button></div></div>' +
        '<button type="button" class="star' + (it.star ? ' on' : '') + '" data-act="star" data-id="' + it.id + '" aria-pressed="' + it.star + '" aria-label="' + esc(t('starLabel')) + '">★</button></li>';
    }).join('');
    var skipped = items.filter(function(it){ return it.skip; });
    var reason = function(it){ return it.skipReason === 'folder' ? t('skipFolder') : (it.skipReason === 'widget' ? t('skipWidget') : t('skipUser')); };
    $('skippedBlock').hidden = !skipped.length;
    $('skippedList').innerHTML = skipped.map(function(it){
      return '<li>' + HT.plan.iconHTML(it) + '<div class="imeta"><b>' + esc(reason(it)) + '</b> ' + esc(HT.plan.posLabel(it)) + (it.ocr ? ' · ' + esc(it.ocr) : '') + '</div><button type="button" class="btn small" data-act="unskip" data-id="' + it.id + '">' + esc(t('restore')) + '</button></li>';
    }).join('');
    bindItemEvents();
  }
  function byId(id){ return state.items.find(function(it){ return it.id === id; }); }
  function bindItemEvents(){
    ['unknownList','dockList','allList','skippedList'].forEach(function(lid){
      var el = $(lid); if (el._bound) return; el._bound = true;
      el.addEventListener('click', function(e){
        var b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT') return;
        var it = byId(b.dataset.id); if (!it) return;
        var a = b.dataset.act;
        if (a === 'folder'){ it.skip = true; it.skipReason = 'folder'; }
        else if (a === 'keep'){ it.keepDock = !it.keepDock; if (it.keepDock){ it.cat = null; } }
        else if (a === 'cat'){ it.cat = b.dataset.cat; it.src = 'user'; it.keepDock = false; var inp = el.querySelector('input[data-id="' + it.id + '"]'); if (inp && inp.value.trim()) it.name = inp.value.trim(); }
        else if (a === 'skip'){ it.skip = true; it.skipReason = 'user'; }
        else if (a === 'unskip'){ it.skip = false; if (it.skipReason === 'folder' && !it.cat && it.ocr) resolveItem(it); }
        else if (a === 'star'){ it.star = !it.star; }
        else if (a === 'name'){
          var v = (el.querySelector('input[data-id="' + it.id + '"]') || {}).value || '';
          v = v.trim(); if (!v) return;
          var m = HT.match.match(v);
          it.keepDock = false;
          if (m){ it.app = m.app; it.name = HT.match.displayName(m.app, HT.i18n.uiLang); it.cat = m.app.cat; it.src = 'dict'; }
          else { it.name = v; var g = HT.match.guess(v); if (g){ it.cat = g; it.src = 'guess'; } else { $('progress').textContent = ''; flash(b, t('pickCat')); return; } }
        }
        renderItems();
        if (!$('step4').hidden) renderPlan();
      });
      el.addEventListener('change', function(e){
        var s = e.target; if (s.dataset.act !== 'sel') return;
        var it = byId(s.dataset.id); it.cat = s.value; it.src = 'user'; renderItems(); if (!$('step4').hidden) renderPlan();
      });
      el.addEventListener('keydown', function(e){
        if (e.key === 'Enter' && e.target.tagName === 'INPUT'){ var b = el.querySelector('button[data-act="name"][data-id="' + e.target.dataset.id + '"]'); if (b) b.click(); }
      });
    });
  }
  function flash(btn, msg){ var li = btn.closest('li'); var p = li.querySelector('.flash') || document.createElement('div'); p.className = 'flash small'; p.textContent = msg; li.lastElementChild.appendChild(p); }

  /* ---------- step 4 ---------- */
  function renderPlan(){
    state.plan = HT.plan.build(state.items, {library: $('optLibrary').checked});
    $('plan').innerHTML = HT.plan.renderHTML(state.plan);
    $('pngOut').innerHTML = '';
  }
  async function savePNG(){
    if (!state.plan) renderPlan();
    var c = await HT.plan.renderPNG(state.plan);
    c.toBlob(function(blob){
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = 'hometidy-plan.png';
      document.body.appendChild(a); a.click(); a.remove();
      $('pngOut').innerHTML = '<img alt="' + esc(t('pngAlt')) + '" src="' + url + '">';
    }, 'image/png');
  }

  // test hook (used by headless tests only; harmless)
  window.HT_STATE = state;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
