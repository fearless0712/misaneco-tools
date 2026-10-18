/* HomeTidy: app dictionary matching (names + categories only). */
(function(){
  'use strict';
  var HT = window.HT = window.HT || {};
  var CATS = ['social','messaging','money','shopping','photo_video','music','maps_travel','work','health','games','utilities','other'];
  var apps = [], index = new Map(), keys = [];

  function kataToHira(s){ return s.replace(/[ァ-ヶ]/g, function(c){ return String.fromCharCode(c.charCodeAt(0) - 0x60); }); }
  function norm(s){
    if (!s) return '';
    s = String(s).normalize('NFKC').toLowerCase();
    s = s.replace(/[’'`"“”]/g,'').replace(/[\s　·・･.,:;!！?？()（）\[\]「」『』<>＜＞\-‐−–—_~〜|/\\*＋+&＆@＠#＃]/g,'');
    s = kataToHira(s);
    s = s.replace(/ー/g,'ー');
    return s;
  }
  function trimEllipsis(s){ return String(s).replace(/(\.\.\.|…|‥)+\s*$/,''); }
  function lev(a,b){
    var m=a.length,n=b.length; if(!m) return n; if(!n) return m;
    var prev=new Array(n+1), cur=new Array(n+1), i, j;
    for(j=0;j<=n;j++) prev[j]=j;
    for(i=1;i<=m;i++){ cur[0]=i; for(j=1;j<=n;j++){ cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1)); } var tmp=prev;prev=cur;cur=tmp; }
    return prev[n];
  }
  async function load(){
    var r = await fetch('data/apps.json', {cache:'no-cache'});
    var j = await r.json();
    apps = j.apps;
    apps.forEach(function(a, i){
      a.id = i;
      var names = [a.name]; if (a.ja) names.push(a.ja); if (a.aliases) names = names.concat(a.aliases);
      names.forEach(function(n){ var k = norm(n); if (k && !index.has(k)) { index.set(k, a); keys.push(k); } });
    });
    return apps.length;
  }
  /* returns {app, score, how} or null */
  function match(text){
    if (!text) return null;
    var raw = String(text).trim();
    var truncated = /(\.\.\.|…|‥)\s*$/.test(raw);
    var k = norm(trimEllipsis(raw));
    if (!k) return null;
    if (index.has(k)) return {app:index.get(k), score:1, how:'exact'};
    if (truncated && k.length >= 3){
      var pref = keys.filter(function(x){ return x.indexOf(k) === 0; });
      if (pref.length){ pref.sort(function(a,b){return a.length-b.length;}); return {app:index.get(pref[0]), score:0.9, how:'prefix'}; }
    }
    var best = null, bestS = 0;
    if (k.length >= 3){
      for (var i=0;i<keys.length;i++){
        var key = keys[i];
        if (Math.abs(key.length - k.length) > Math.max(2, k.length*0.34)) continue;
        var d = lev(k, key), s = 1 - d/Math.max(k.length, key.length);
        if (s > bestS){ bestS = s; best = key; }
      }
      var need = k.length <= 4 ? 0.74 : 0.79;
      if (best && bestS >= need) return {app:index.get(best), score:bestS, how:'fuzzy'};
    }
    return null;
  }
  /* keyword guess for unknown apps (marked "guess" in UI) */
  var RULES = [
    ['money', /(pay|bank|wallet|coin|cash|finance|money|invest|stock|crypto|card|銀行|証券|ペイ|払い|カード|家計|ポイント|投資|お金|ウォレット|支付|은행|페이|banco|banque)/i],
    ['messaging', /(chat|talk|messag|msg|mail|チャット|トーク|メッセ|メール|聊天|채팅|톡)/i],
    ['social', /(social|gram|friend|community|sns|tok$|snap|コミュニティ|つながる|社交)/i],
    ['shopping', /(shop|store|market|mart|eats|food|deliver|buy|sale|coupon|ショップ|市場|ストア|フリマ|通販|グルメ|デリ|クーポン|買|購物|쇼핑|tienda|boutique)/i],
    ['photo_video', /(photo|cam|video|tv$|movie|film|stream|anime|clip|edit|フォト|カメラ|動画|写真|アニメ|ビデオ|映画|配信|视频|사진|동영상)/i],
    ['music', /(music|radio|sound|beat|tune|song|audio|podcast|ミュージック|音楽|ラジオ|カラオケ|音|音乐|음악)/i],
    ['maps_travel', /(map|travel|trip|ride|taxi|train|transit|metro|bus|weather|hotel|air|flight|navi|マップ|地図|乗換|旅|トラベル|ホテル|天気|タクシー|ナビ|交通|電車|バス|地图|지도|여행)/i],
    ['games', /(game|quest|puzzle|battle|craft|saga|clash|legend|dungeon|hero|ゲーム|パズル|クエスト|バトル|冒険|rpg|游戏|게임|jogo|juego|jeu)/i],
    ['health', /(health|fit|run|walk|sleep|step|diet|med|yoga|workout|gym|clinic|ヘルス|健康|歩|睡眠|ダイエット|医|薬|筋トレ|ヨガ|健身|건강)/i],
    ['work', /(calendar|note|doc|task|todo|office|meet|drive|scan|pdf|work|learn|study|translat|ai$|gpt|カレンダー|メモ|ノート|タスク|会議|翻訳|学習|英語|仕事|勉強|办公|업무)/i],
    ['utilities', /(vpn|qr|calc|clock|timer|battery|wifi|remote|browser|search|news|tool|util|setting|ニュース|検索|電卓|タイマー|リモコン|ブラウザ|設定|ツール|防災|工具|도구)/i]
  ];
  function guess(text){
    var s = String(text||'').normalize('NFKC');
    for (var i=0;i<RULES.length;i++){ if (RULES[i][1].test(s)) return RULES[i][0]; }
    return null;
  }
  /* Parse Live Text "Copy All" output: greedy longest-span matching per line. */
  function parsePaste(text){
    var out = [];
    String(text||'').split(/\r?\n/).forEach(function(line){
      line = line.normalize('NFKC').trim();
      if (!line) return;
      var words = line.split(/\s+/).filter(Boolean);
      var i = 0, pending = [];
      function flush(){ if (pending.length){ var n = pending.join(' '); if (isNameLike(n)) out.push({text:n, m:null}); pending = []; } }
      while (i < words.length){
        var found = null, len = 0;
        for (var L = Math.min(4, words.length - i); L >= 1; L--){
          var cand = words.slice(i, i+L).join(' ');
          var m = match(cand);
          if (m && (m.how === 'exact' || m.how === 'prefix' || (L === 1 && m.score >= 0.85))){ found = m; len = L; break; }
        }
        if (found){ flush(); out.push({text:words.slice(i,i+len).join(' '), m:found}); i += len; }
        else { pending.push(words[i]); i++; }
      }
      flush();
    });
    return out;
  }
  function isNameLike(s){
    var n = s.replace(/\s/g,'');
    if (n.length < 2 || n.length > 30) return false;
    if (/^[\d:：%.,\-\/ ]+$/.test(n)) return false;           // times, battery %, dates
    if (/^\d{1,2}[:：]\d{2}/.test(n)) return false;
    if (!/[A-Za-z぀-ヿ㐀-鿿가-힯]/.test(n)) return false;
    return true;
  }
  function displayName(app, lang){
    if (!app) return '';
    if (lang === 'ja' && app.ja) return app.ja;
    return app.name;
  }
  HT.match = { load:load, match:match, guess:guess, parsePaste:parsePaste, norm:norm, CATS:CATS, displayName:displayName, isNameLike:isNameLike, get count(){ return apps.length; } };
})();
