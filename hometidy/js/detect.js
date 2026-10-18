/* HomeTidy: find the iOS Home Screen icon grid in a screenshot (canvas only, no network). */
(function(){
  'use strict';
  var HT = window.HT = window.HT || {};
  var WW = 390; // working width (≈ points on most iPhones)

  function work(img){
    var W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    var k = W / WW, w = WW, h = Math.round(H / k);
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d', {willReadFrequently:true});
    x.drawImage(img, 0, 0, w, h);
    var d = x.getImageData(0, 0, w, h).data;
    var g = new Float32Array(w*h);
    var R = new Float32Array(w*h), G = new Float32Array(w*h), B = new Float32Array(w*h);
    for (var i=0, p=0; i<w*h; i++, p+=4){ g[i] = 0.299*d[p] + 0.587*d[p+1] + 0.114*d[p+2]; R[i]=d[p]; G[i]=d[p+1]; B[i]=d[p+2]; }
    return {W:W, H:H, k:k, w:w, h:h, g:g, R:R, G:G, B:B, rgb:d};
  }
  function pk(P, x){ x = Math.round(x); var a = P[x-1]||0, b = P[x]||0, c = P[x+1]||0; return Math.max(a,b,c); }

  function detect(img){
    var m = work(img), w = m.w, h = m.h, g = m.g;
    var y1 = Math.round(h*0.06), y2 = Math.round(h*0.86);
    // vertical-edge profile along x
    var P = new Float32Array(w);
    var R = m.R, G = m.G, B = m.B;
    function cd(a, b){ return (Math.abs(R[a]-R[b]) + Math.abs(G[a]-G[b]) + Math.abs(B[a]-B[b])) / 2; }
    for (var y=y1; y<y2; y++){ var o=y*w; for (var x=0; x<w-1; x++) P[x] += cd(o+x+1, o+x); }
    var bx = null, bs = -1;
    for (var s=48; s<=74; s++){
      for (var px=Math.max(s+10,70); px<=104; px++){
        var span = 3*px + s; if (span > w-16) continue;
        for (var dd=-6; dd<=6; dd++){
          var x0 = (w - span)/2 + dd, sc = 0;
          // both edges of every column must be present: use min(left,right)
          for (var c=0;c<4;c++){ sc += Math.min(pk(P, x0+c*px-1), pk(P, x0+c*px+s-1)); }
          if (sc > bs){ bs = sc; bx = {x0:x0, px:px, s:s}; }
        }
      }
    }
    var S = bx.s;
    // horizontal-edge profile per icon column
    var Qc = [0,1,2,3].map(function(){ return new Float32Array(h); });
    for (var c=0;c<4;c++){
      var xa = Math.round(bx.x0 + c*bx.px + S*0.15), xb = Math.round(bx.x0 + c*bx.px + S*0.85), Qk = Qc[c];
      for (var y=0; y<h-1; y++){ var o=y*w, sum=0; for (var x=xa; x<xb; x++) sum += cd(o+w+x, o+x); Qk[y] = sum; }
    }
    function rowScore(yt){ var sc=0; for (var c=0;c<4;c++) sc += Math.min(pk(Qc[c], yt-1), pk(Qc[c], yt+S-1)); return sc; }
    var by = null, bys = -1, limit = h*0.87;
    for (var py=Math.round(S*1.2); py<=Math.round(S*1.95); py++){
      for (var y0=Math.round(h*0.03); y0<=Math.round(h*0.22); y0++){
        var rows = 0, sc = 0;
        for (var r=0;r<6;r++){ var yt = y0 + r*py; if (yt + S > limit) break; rows++; sc += rowScore(yt); }
        if (rows < 6) sc *= 0.9;
        if (sc > bys){ bys = sc; by = {y0:y0, py:py, rows:rows}; }
      }
    }
    // dock (no labels) in the bottom part
    var rowBest = 0;
    for (var r2=0;r2<by.rows;r2++) rowBest = Math.max(rowBest, rowScore(by.y0 + r2*by.py));
    var bd = null, bds = -1;
    for (var yd=Math.round(h*0.78); yd<=Math.round(h*0.985 - S); yd++){
      if (yd < by.y0 + (by.rows-1)*by.py + S + 4) continue;
      var sc2 = rowScore(yd);
      if (sc2 > bds){ bds = sc2; bd = yd; }
    }
    var rowMean = rowBest;
    var grid = {
      x0: bx.x0, px: bx.px, s: S, y0: by.y0, py: by.py, rows: by.rows || 6,
      dock: bd != null && bds > rowMean*0.3, dockY: bd != null ? bd : Math.round(h*0.9)
    };
    return {m:m, grid:grid};
  }

  function meanRGB(m, x0, y0, x1, y1){
    var w=m.w, d=m.rgb, r=0, g=0, b=0, n=0;
    x0=Math.max(0,Math.round(x0)); y0=Math.max(0,Math.round(y0)); x1=Math.min(m.w,Math.round(x1)); y1=Math.min(m.h,Math.round(y1));
    for (var y=y0;y<y1;y++) for (var x=x0;x<x1;x++){ var p=(y*w+x)*4; r+=d[p]; g+=d[p+1]; b+=d[p+2]; n++; }
    return n ? [r/n,g/n,b/n,n] : [0,0,0,0];
  }
  function stdG(m, x0, y0, x1, y1){
    var w=m.w, s=0, s2=0, n=0;
    x0=Math.max(0,Math.round(x0)); y0=Math.max(0,Math.round(y0)); x1=Math.min(m.w,Math.round(x1)); y1=Math.min(m.h,Math.round(y1));
    for (var y=y0;y<y1;y++) for (var x=x0;x<x1;x++){ var v=m.g[y*w+x]; s+=v; s2+=v*v; n++; }
    if (!n) return 0; var mu=s/n; return Math.sqrt(Math.max(0, s2/n - mu*mu));
  }
  function dist(a,b){ return Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]); }
  // contrast across a border line (vertical if dir==='v')
  function border(m, dir, pos, a, b){
    var best = 0;
    for (var o=-3; o<=3; o++) best = Math.max(best, border1(m, dir, pos+o, a, b));
    return best;
  }
  function border1(m, dir, pos, a, b){
    var w=m.w, g=m.g, sum=0, n=0;
    for (var t=Math.round(a); t<Math.round(b); t++){
      var a2, b2;
      if (dir==='v'){ var xi=Math.round(pos-2), xo=Math.round(pos+2); if (xi<0||xo>=m.w||t<0||t>=m.h) continue; a2=t*w+xi; b2=t*w+xo; }
      else { var yi=Math.round(pos-2), yo=Math.round(pos+2); if (yi<0||yo>=m.h||t<0||t>=m.w) continue; a2=yi*w+t; b2=yo*w+t; }
      sum += (Math.abs(m.R[a2]-m.R[b2]) + Math.abs(m.G[a2]-m.G[b2]) + Math.abs(m.B[a2]-m.B[b2])) / 2;
      n++;
    }
    return n ? sum/n : 0;
  }
  function labelInk(m, x0, y0, x1, y1){
    var w=m.w, d=m.rgb, white=0, n=0;
    x0=Math.max(0,Math.round(x0)); y0=Math.max(0,Math.round(y0)); x1=Math.min(m.w,Math.round(x1)); y1=Math.min(m.h,Math.round(y1));
    for (var y=y0;y<y1;y++) for (var x=x0;x<x1;x++){
      var p=(y*w+x)*4, mx=Math.max(d[p],d[p+1],d[p+2]), mn=Math.min(d[p],d[p+1],d[p+2]);
      if (mn > 195 && mx-mn < 45) white++; n++;
    }
    return n ? white/n : 0;
  }

  /* Folder icon = plain light background with up to 3x3 small icons separated by background-coloured gutters. */
  function isFolder(m, x, y, S){
    var mg = S*0.12, g = (S - 2*mg)/3;
    var bgL = meanRGB(m, x+S*0.03, y+S*0.3, x+S*0.08, y+S*0.7), bgR = meanRGB(m, x+S*0.92, y+S*0.3, x+S*0.97, y+S*0.7);
    var bgT = meanRGB(m, x+S*0.3, y+S*0.03, x+S*0.7, y+S*0.08);
    if (dist(bgL, bgR) > 25 || dist(bgL, bgT) > 25) return false;
    var bg = bgL, diff = 0, gut = 0, gn = 0, i, j, k;
    for (i=0;i<3;i++) for (j=0;j<3;j++){
      var cx = x+mg+(j+0.5)*g, cy = y+mg+(i+0.5)*g;
      if (dist(meanRGB(m, cx-g*0.2, cy-g*0.2, cx+g*0.2, cy+g*0.2), bg) > 35) diff++;
    }
    for (k=1;k<=2;k++) for (i=0;i<3;i++){
      var c1 = y+mg+(i+0.5)*g, gx = x+mg+k*g, gy = y+mg+k*g, c2 = x+mg+(i+0.5)*g;
      gn += 2;
      // gutters are thin and the size estimate can be off by a few px: look for the gap nearby
      var bv = 1e9, bh = 1e9;
      for (var o=-2.5; o<=2.5; o+=1){
        bv = Math.min(bv, dist(meanRGB(m, gx+o-0.5, c1-g*0.15, gx+o+0.5, c1+g*0.15), bg));
        bh = Math.min(bh, dist(meanRGB(m, c2-g*0.15, gy+o-0.5, c2+g*0.15, gy+o+0.5), bg));
      }
      if (bv < 30) gut++;
      if (bh < 30) gut++;
    }
    return diff >= 2 && gut/gn >= 0.75;
  }
  /* cells in working coords; state: app | folder | widget | empty */
  function classify(m, grid){
    var cells = [], S = grid.s;
    function cellAt(r, c, isDock){
      var x = grid.x0 + c*grid.px, y = isDock ? grid.dockY : grid.y0 + r*grid.py;
      var inner = meanRGB(m, x+S*0.2, y+S*0.2, x+S*0.8, y+S*0.8);
      var gap = Math.max(3, (grid.px - S)/2 - 1);
      var ring = [
        meanRGB(m, x-gap, y+S*0.25, x-2, y+S*0.75),
        meanRGB(m, x+S+2, y+S*0.25, x+S+gap, y+S*0.75)
      ];
      var ringMean = [(ring[0][0]+ring[1][0])/2,(ring[0][1]+ring[1][1])/2,(ring[0][2]+ring[1][2])/2];
      var sd = stdG(m, x+S*0.15, y+S*0.15, x+S*0.85, y+S*0.85);
      var content = dist(inner, ringMean) + sd*0.6;
      var bL = border(m,'v', x, y+S*0.3, y+S*0.7), bR = border(m,'v', x+S, y+S*0.3, y+S*0.7);
      var bT = border(m,'h', y, x+S*0.3, x+S*0.7), bB = border(m,'h', y+S, x+S*0.3, x+S*0.7);
      var edges = [bL,bR,bT,bB].filter(function(v){ return v > 10; }).length;
      var ink = isDock ? 0 : labelInk(m, x - (grid.px-S)/2 + 2, y+S+S*0.06, x + S + (grid.px-S)/2 - 2, y+S+S*0.34);
      var state;
      if (content < 14 && edges < 2) state = 'empty';
      else if (edges >= 3 && (isDock || (ink > 0.006 && ink < 0.55))) state = 'app';
      else state = 'widget';
      if (state === 'app' && !isDock && isFolder(m, x, y, S)) state = 'folder';
      return {r:r, c:c, dock:!!isDock, x:x, y:y, s:S, state:state, auto:state, dbg:{content:Math.round(content), edges:edges, ink:+ink.toFixed(3)}};
    }
    for (var r=0;r<grid.rows;r++) for (var c=0;c<4;c++) cells.push(cellAt(r,c,false));
    if (grid.dock) for (var c2=0;c2<4;c2++) cells.push(cellAt(0,c2,true));
    return cells;
  }

  HT.detect = { detect:detect, classify:classify, work:work, WW:WW, isFolder:isFolder, _dbg:{meanRGB:meanRGB, dist:dist} };
})();
