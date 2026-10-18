/* HomeTidy: build the tidy-up plan and render it (HTML + PNG). */
(function(){
  'use strict';
  var HT = window.HT = window.HT || {};
  var t = function(k,v){ return HT.t(k,v); };

  function catName(c){ return t('cat_' + c); }
  function posLabel(it){
    if (it.fromText) return t('posText');
    if (it.dock) return t('posDock', {p: it.shot+1, c: it.col+1});
    return t('pos', {p: it.shot+1, r: it.row+1, c: it.col+1});
  }
  function nameOf(it){ return it.name || it.ocr || (it.dock ? t('keptDock', {n: (it.col||0)+1}) : t('unnamed', {pos: posLabel(it)})); }

  function keyOf(it){
    if (it.app) return 'a' + it.app.id;
    var n = it.name || it.ocr; return n ? 'n' + HT.match.norm(n) : null;
  }
  function build(items, opt){
    var resolved = items.filter(function(it){ return !it.skip && it.cat && !it.keepDock; });
    // the same app on two pages -> keep the first, report the others
    var first = new Map(), dups = [], starKeys = new Set(), active = [];
    resolved.forEach(function(it){ var k = keyOf(it); if (k && it.star) starKeys.add(k); });
    resolved.forEach(function(it){
      var k = keyOf(it);
      if (k && first.has(k)){ dups.push({item: it, first: first.get(k)}); return; }
      if (k) first.set(k, it);
      active.push(it);
    });
    var isStar = function(it){ var k = keyOf(it); return it.star || (k && starKeys.has(k)); };
    var keepDock = items.filter(function(it){ return it.keepDock && !it.skip; });
    var starred = active.filter(isStar);
    var dock = keepDock.slice(0,4).concat(starred.filter(function(it){ return it.dock; })).slice(0,4);
    // if more than 20 starred apps remain, move extra ones into free dock slots
    var page1 = starred.filter(function(it){ return dock.indexOf(it) < 0; });
    if (page1.length > 20){
      while (dock.length < 4 && page1.length > 20) dock.push(page1.pop());
    }
    var overflow = page1.length > 20 ? page1.splice(20) : [];
    var rest = active.filter(function(it){ return !isStar(it); }).concat(overflow);
    var folders = [], library = [];
    if (opt && opt.library){ library = rest.slice(); }
    else {
      var by = {};
      rest.forEach(function(it){ (by[it.cat] = by[it.cat] || []).push(it); });
      var order = [];
      rest.forEach(function(it){ if (order.indexOf(it.cat) < 0) order.push(it.cat); });
      order.forEach(function(c){
        if (by[c].length >= 2) folders.push({cat:c, name:catName(c), apps:by[c]});
        else library = library.concat(by[c]);
      });
    }
    var unresolved = items.filter(function(it){ return !it.skip && !it.cat && !it.keepDock; });
    // group duplicates per app for the notice
    var dupGroups = [];
    dups.forEach(function(d){
      var g = dupGroups.find(function(x){ return x.first === d.first; });
      if (!g){ g = {first: d.first, others: []}; dupGroups.push(g); }
      g.others.push(d.item);
    });
    return {dock:dock, keepDock:keepDock, page1:page1, folders:folders, library:library, unresolved:unresolved, active:active, dups:dupGroups};
  }

  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function iconHTML(it, cls){
    return it.icon ? '<img class="ico ' + (cls||'') + '" src="' + it.icon + '" alt="">' : '<span class="ico noimg ' + (cls||'') + '">' + esc(t('noIcon')) + '</span>';
  }
  function list(arr){ return arr.map(function(it){ return t('quote', {n: nameOf(it)}); }).join(t('listSep')); }
  function listPlain(arr){ return arr.map(nameOf).join(t('listSepPlain')); }

  function destOf(it, p){
    if (p.keepDock.indexOf(it) >= 0) return t('toKeepDock');
    if (p.dock.indexOf(it) >= 0) return t('toDock');
    var i = p.page1.indexOf(it); if (i >= 0) return t('toPage1', {n: i+1});
    for (var f=0; f<p.folders.length; f++) if (p.folders[f].apps.indexOf(it) >= 0) return t('toFolder', {name: p.folders[f].name});
    if (p.library.indexOf(it) >= 0) return t('toLibrary');
    return '';
  }
  function steps(p){
    var s = [];
    s.push(t('stEdit'));
    if (p.page1.length || p.dock.length){
      var moveDock = p.dock.filter(function(it){ return p.keepDock.indexOf(it) < 0; });
      if (moveDock.length) s.push(t('stDock', {list: list(moveDock)}));
      if (p.page1.length) s.push(t('stPage1', {list: list(p.page1)}));
    }
    p.folders.forEach(function(f){
      if (f.apps.length >= 2){
        s.push(t('stFolder', {a: nameOf(f.apps[1]), b: nameOf(f.apps[0]), name: f.name}) + (f.apps.length > 2 ? ' ' + t('stFolderAdd', {list: list(f.apps.slice(2))}) : ''));
      }
    });
    if (p.library.length) s.push(t('stLibrary', {list: list(p.library)}));
    if (p.dups.length) s.push(t('stDup', {list: list(p.dups.map(function(g){ return g.first; }))}));
    s.push(t('stPages'));
    s.push(t('stDone'));
    return s;
  }

  function orderList(p){
    var all = p.active.concat(p.keepDock);
    p.dupSet = new Set();
    p.dups.forEach(function(g){ g.others.forEach(function(it){ all.push(it); p.dupSet.add(it); }); });
    var key = function(it){ return (it.fromText ? 1e6 : 0) + it.shot*1000 + (it.dock ? 900 : (it.row||0)*10) + (it.col||0); };
    return all.sort(function(a,b){ return key(a) - key(b); });
  }
  function renderHTML(p){
    var h = '';
    if (p.unresolved.length) h += '<p class="notice">' + esc(t('planUnresolved', {n: p.unresolved.length})) + '</p>';
    if (p.dups.length){
      h += '<div class="dups"><b>' + esc(t('dupTitle')) + '</b><ul>' + p.dups.map(function(g){
        var where = [g.first].concat(g.others).map(posLabel).join(t('listSepPlain'));
        return '<li>' + esc(t('dupNotice', {name: nameOf(g.first), n: g.others.length + 1, where: where})) + '</li>';
      }).join('') + '</ul></div>';
    }
    h += '<div class="plan">';
    h += '<h3>' + esc(t('pPage1')) + '</h3>';
    if (!p.page1.length && !p.dock.length) h += '<p class="small">' + esc(t('pNoStar')) + '</p>';
    else {
      h += '<div class="page1">' + p.page1.map(function(it){ return '<div class="slot">' + iconHTML(it) + esc(nameOf(it)) + '</div>'; }).join('') + '</div>';
      if (p.dock.length) h += '<div class="dock page1">' + p.dock.map(function(it){ return '<div class="slot">' + iconHTML(it) + esc(nameOf(it)) + '</div>'; }).join('') + '</div><p class="small">' + esc(t('pDockNote')) + '</p>';
    }
    h += '<h3>' + esc(t('pFolders')) + '</h3>';
    if (!p.folders.length) h += '<p class="small">' + esc(t('pNoFolders')) + '</p>';
    else h += '<div class="folders">' + p.folders.map(function(f){
      return '<div class="folder"><b><span class="dot cat-' + f.cat + '"></span>' + esc(f.name) + ' (' + f.apps.length + ')</b><ul>' + f.apps.map(function(it){ return '<li>' + esc(nameOf(it)) + '</li>'; }).join('') + '</ul></div>';
    }).join('') + '</div>';
    h += '<h3>' + esc(t('pLibrary')) + '</h3>';
    h += p.library.length ? '<p>' + esc(listPlain(p.library)) + '</p><p class="small">' + esc(t('pLibraryNote')) + '</p>' : '<p class="small">' + esc(t('pNoLibrary')) + '</p>';
    h += '<h3>' + esc(t('pSteps')) + '</h3><ol class="steps">' + steps(p).map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
    h += '<h3>' + esc(t('pOrder')) + '</h3><p class="small">' + esc(t('pOrderNote')) + '</p><ol class="steps">' +
      orderList(p).map(function(it){ var d = p.dupSet.has(it) ? t('toDup') : destOf(it, p); return '<li>' + esc(posLabel(it)) + ' ' + esc(nameOf(it)) + ' → ' + esc(d) + '</li>'; }).join('') + '</ol>';
    h += '</div>';
    return h;
  }

  /* ---------- PNG ---------- */
  function loadImg(src){ return new Promise(function(res){ if (!src) return res(null); var i = new Image(); i.onload = function(){ res(i); }; i.onerror = function(){ res(null); }; i.src = src; }); }
  function wrap(ctx, text, maxW){
    var out = [], line = '';
    var tokens = String(text).match(/[\x21-\x7e]+|\s|./gu) || [];
    tokens.forEach(function(tok){
      var test = line + tok;
      if (ctx.measureText(test).width > maxW && line){ out.push(line.trim()); line = tok.trim() ? tok : ''; }
      else line = test;
    });
    if (line.trim()) out.push(line.trim());
    return out;
  }
  function rr(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  var CATCOL = {social:'#e0457b',messaging:'#2bb24c',money:'#1a8f6f',shopping:'#e8743b',photo_video:'#d23f6a',music:'#c2389b',maps_travel:'#2f7fd1',work:'#4a5bd4',health:'#e2504e',games:'#7b4ad1',utilities:'#6b7685',other:'#9aa3ad'};

  async function renderPNG(p){
    var W = 1080, pad = 56, font = '-apple-system,BlinkMacSystemFont,"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Segoe UI",sans-serif';
    var all = p.page1.concat(p.dock);
    var imgs = await Promise.all(all.map(function(it){ return loadImg(it.icon); }));
    var imap = new Map(); all.forEach(function(it,i){ imap.set(it, imgs[i]); });
    function draw(ctx, measureOnly){
      var y = pad;
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#1d2330';
      ctx.font = '700 46px ' + font; if (!measureOnly) ctx.fillText(t('pngTitle'), pad, y); y += 66;
      ctx.font = '400 26px ' + font; ctx.fillStyle = '#5b6474'; if (!measureOnly) ctx.fillText(t('pngSub', {n: p.active.length, f: p.folders.length}), pad, y); y += 56;
      function h2(s){ ctx.font = '700 32px ' + font; ctx.fillStyle = '#1d2330'; if (!measureOnly){ ctx.fillStyle = '#2f6fed'; ctx.fillRect(pad, y+4, 8, 34); ctx.fillStyle = '#1d2330'; ctx.fillText(s, pad+22, y); } y += 56; }
      function para(s, size, color){ ctx.font = '400 ' + (size||26) + 'px ' + font; ctx.fillStyle = color || '#1d2330'; wrap(ctx, s, W - pad*2).forEach(function(l){ if (!measureOnly) ctx.fillText(l, pad, y); y += (size||26)*1.45; }); }
      function grid(arr, bg){
        var cols = 4, cell = (W - pad*2) / cols, ic = 120;
        var rows = Math.ceil(arr.length / cols);
        if (bg && !measureOnly){ ctx.fillStyle = '#e9edf3'; rr(ctx, pad, y-10, W-pad*2, rows*(ic+70)+10, 36); ctx.fill(); }
        arr.forEach(function(it, i){
          var cx = pad + (i%cols)*cell + cell/2, cy = y + Math.floor(i/cols)*(ic+70);
          if (measureOnly) return;
          var im = imap.get(it);
          ctx.save(); rr(ctx, cx-ic/2, cy, ic, ic, 28); ctx.clip();
          if (im) ctx.drawImage(im, cx-ic/2, cy, ic, ic); else { ctx.fillStyle = CATCOL[it.cat] || '#9aa3ad'; ctx.fillRect(cx-ic/2, cy, ic, ic); ctx.fillStyle = '#fff'; ctx.font = '700 52px ' + font; ctx.textAlign = 'center'; ctx.fillText(nameOf(it).slice(0,1), cx, cy+32); ctx.textAlign = 'left'; }
          ctx.restore();
          ctx.font = '400 22px ' + font; ctx.fillStyle = '#1d2330'; ctx.textAlign = 'center';
          var n = nameOf(it); while (ctx.measureText(n).width > cell - 12 && n.length > 1) n = n.slice(0, -1);
          if (n !== nameOf(it)) n = n.slice(0, -1) + '…';
          ctx.fillText(n, cx, cy + ic + 10); ctx.textAlign = 'left';
        });
        y += rows*(ic+70) + 10;
      }
      h2(t('pPage1'));
      if (p.page1.length) grid(p.page1, false); else para(t('pNoStar'), 24, '#5b6474');
      if (p.dock.length){ y += 10; grid(p.dock, true); y += 10; }
      y += 10; h2(t('pFolders'));
      if (!p.folders.length) para(t('pNoFolders'), 24, '#5b6474');
      p.folders.forEach(function(f){
        ctx.font = '700 28px ' + font;
        if (!measureOnly){ ctx.fillStyle = CATCOL[f.cat] || '#999'; ctx.beginPath(); ctx.arc(pad+12, y+17, 10, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#1d2330'; ctx.fillText(f.name + ' (' + f.apps.length + ')', pad+34, y); }
        y += 42; para(listPlain(f.apps), 24, '#333a46'); y += 8;
      });
      if (p.dups.length){ y += 10; para(t('dupShort', {list: listPlain(p.dups.map(function(g){ return g.first; }))}), 22, '#7a4b00'); }
      y += 10; h2(t('pLibrary'));
      para(p.library.length ? listPlain(p.library) : t('pNoLibrary'), 24, '#333a46');
      y += 24; para(t('pngFoot'), 20, '#8a93a3');
      return y + pad;
    }
    var c = document.createElement('canvas'), ctx = c.getContext('2d');
    c.width = W; c.height = 10;
    var H = draw(ctx, true);
    c.height = Math.ceil(H);
    ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, c.height);
    draw(ctx, false);
    return c;
  }

  HT.plan = { build:build, renderHTML:renderHTML, renderPNG:renderPNG, posLabel:posLabel, nameOf:nameOf, catName:catName, esc:esc, iconHTML:iconHTML };
})();
