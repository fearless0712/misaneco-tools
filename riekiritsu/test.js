const J=require('./logic.js');let p=0,f=0;
const eq=(a,b,m)=>{if(a===b)p++;else{f++;console.log('FAIL',m,a,b)}};
const near=(a,b,t,m)=>{if(Math.abs(a-b)<=t)p++;else{f++;console.log('FAIL',m,a,b)}};
// exact cases
let r=J.calc({price:2500,materials:600,hours:16,rate:35,subcontract:400,other:120,target:25});
eq(r.labour,560,'labour');eq(r.cost,1680,'cost');eq(r.profit,820,'profit');eq(r.margin,32.8,'margin');eq(r.markup,48.8,'markup');eq(r.status,'On target','status on');eq(r.priceNeeded,2240,'need');
r=J.calc({price:1250,materials:1000,target:25});eq(r.profit,250,'p2');eq(r.margin,20,'m2');eq(r.markup,25,'mk2');eq(r.status,'Below target','below');eq(r.priceNeeded,1333.34,'need2 rounds up');
r=J.calc({price:900,materials:700,hours:5,rate:50,target:20});eq(r.cost,950,'c3');eq(r.profit,-50,'p3');eq(r.margin,-5.6,'m3');eq(r.markup,-5.3,'mk3');eq(r.status,'Loss','loss');eq(r.priceNeeded,1187.5,'need3');
r=J.calc({price:'1,000.50',materials:'333.33',hours:'2.5',rate:'40'});eq(r.cost,433.33,'c4');eq(r.profit,567.17,'p4');eq(r.margin,56.7,'m4');eq(r.markup,130.9,'mk4');eq(r.status,'Profit','no target');eq(r.priceNeeded,null,'no need');
r=J.calc({price:500,materials:500});eq(r.profit,0,'be');eq(r.status,'Break-even','break-even');eq(r.margin,0,'be m');
r=J.calc({price:100,materials:0.1,other:0.2});eq(r.cost,0.3,'float cost');eq(r.profit,99.7,'float profit');
// edge: blank/zero price
r=J.calc({price:'',materials:100});eq(r.margin,null,'blank price margin');eq(r.status,'Loss','blank price loss');eq(r.profit,-100,'blank price profit');eq(r.markup,-100,'blank price markup');
r=J.calc({price:0,materials:100,target:30});eq(r.margin,null,'zero price margin');eq(r.priceNeeded,142.86,'zero price need');
// edge: zero cost
r=J.calc({price:500});eq(r.markup,null,'zero cost markup');eq(r.margin,100,'zero cost margin');eq(r.cost,0,'zero cost');eq(r.status,'Profit','zc status');
r=J.calc({price:500,target:50});eq(r.priceNeeded,0,'zc need');eq(r.status,'On target','zc target');
r=J.calc({});eq(r.status,'No data','empty');eq(r.margin,null,'empty margin');eq(r.markup,null,'empty markup');eq(r.error,undefined,'empty no error');
// edge: target
eq(J.calc({price:100,target:100}).error,'Target margin must be below 100%.','target 100');
eq(J.calc({price:100,target:150}).error,'Target margin must be below 100%.','target 150');
eq(typeof J.calc({price:100,target:99.9}).error,'undefined','target 99.9 ok');
eq(J.calc({price:100,materials:50,target:0}).status,'On target','target 0');
eq(J.calc({price:100,materials:50,target:''}).priceNeeded,null,'blank target');
// edge: negative / invalid
['price','materials','hours','rate','subcontract','other','target'].forEach(k=>{
  eq(/cannot be negative/.test(J.calc({price:100,[k]:-1}).error||''),true,'neg '+k);
  eq(/must be a number/.test(J.calc({price:100,[k]:'abc'}).error||''),true,'nan '+k);
});
eq(/must be a number/.test(J.calc({price:'1e400'}).error||''),true,'huge');
eq(J.calc({price:'  250 '}).profit,250,'spaces');
// rounding
eq(J.up2(1333.3333),1333.34,'up2');eq(J.up2(2240.0000000000005),2240,'up2 float');eq(J.up2(12.3),12.3,'up2 exact');
eq(J.r2(1.005),1.01,'r2 half');eq(J.r2(2.675),2.68,'r2 half2');eq(J.r1(0.05),0.1,'r1 half');eq(J.r2(-1.005),-1.01,'r2 neg');
r=J.calc({price:3,materials:1});eq(r.margin,66.7,'r1 margin');eq(r.markup,200,'markup 200');
// formatting
eq(J.fmtMoney(1234567.891,'$'),'$1,234,567.89','fmt');eq(J.fmtMoney(-50,'£'),'−£50.00','fmt neg');eq(J.fmtMoney(null),'—','fmt null');
eq(J.fmtPct(32.8),'32.8%','pct');eq(J.fmtPct(null),'—','pct null');eq(J.fmtPct(-5.6),'−5.6%','pct neg');
// sweep invariants
const P=[0,1,99.99,250,1000,2500,12345.67],M=[0,10,333.33,800],H=[0,1.5,8,40],R=[0,25,47.5],S=[0,150,999.99],O=[0,12.34],T=['',0,10,25,33.3,50,90,99];
for(const price of P)for(const materials of M)for(const hours of H)for(const rate of R)for(const subcontract of S)for(const other of O)for(const target of T){
  const x=J.calc({price,materials,hours,rate,subcontract,other,target}),cost=materials+hours*rate+subcontract+other,tag=JSON.stringify({price,materials,hours,rate,subcontract,other,target});
  if(x.error){f++;console.log('FAIL unexpected error',tag,x.error);continue}
  near(x.cost,cost,0.005+1e-9,'cost '+tag);
  near(x.profit,J.r2(price-cost),1e-9,'profit '+tag);
  near(x.profit,J.r2(price-x.cost),0.0101,'profit=price-cost '+tag);
  eq(x.margin===null,price===0,'margin null '+tag);
  eq(x.markup===null,cost===0,'markup null '+tag);
  if(x.margin!==null)near(x.margin,(price-cost)/price*100,0.05+1e-9,'margin val '+tag);
  if(x.markup!==null)near(x.markup,(price-cost)/cost*100,0.05+1e-9,'markup val '+tag);
  if(target===''){eq(x.priceNeeded,null,'need null '+tag)}
  else{const n=cost/(1-target/100);eq(x.priceNeeded>=n-1e-6&&x.priceNeeded<n+0.01,true,'need val (ceil to cent) '+tag);
    if(cost>0){const y=J.calc({price:x.priceNeeded,materials,hours,rate,subcontract,other,target});
      eq(y.status,'On target','need gives On target '+tag);
      eq((x.priceNeeded-cost)/x.priceNeeded*100>=target-1e-9,true,'need margin >= target '+tag);
      if(cost>=100)near((x.priceNeeded-cost)/x.priceNeeded*100,target,0.01,'need margin within 0.01 '+tag);
      if(cost>=100)eq(y.margin,J.r1(target),'need shown margin = target '+tag);}}
  const st=price===0&&cost===0?'No data':price-cost<-1e-9?'Loss':target===''?(price-cost>1e-9?'Profit':'Break-even'):((price-cost)/price*100>=target-1e-9?'On target':'Below target');
  eq(x.status,st,'status '+tag);
  if(x.status==='Loss')eq(x.profit<0,true,'loss<0 '+tag);
  if(x.status==='On target')eq(price>=x.priceNeeded-0.01,true,'on target >= need '+tag);
  if(x.status==='Below target')eq(price<x.priceNeeded+0.005,true,'below < need '+tag);
}

// ===== 日本語版 =====
const JA=require('./ja.js');
// 記事・画面の例：原価8,000円・25%のせ→10,000円→利益率20%、目標25%→10,667円
r=J.calc({price:10000,materials:8000,target:25});
eq(r.cost,8000,'ex cost');eq(r.profit,2000,'ex profit');eq(r.margin,20,'ex margin 20');eq(r.markup,25,'ex markup 25');
eq(r.status,'Below target','ex below');eq(JA.status(r.status),'目標未達','ex 目標未達');
eq(r.priceNeeded,10666.67,'ex need cents');eq(JA.fmtYenUp(r.priceNeeded),'10,667円','ex need 10,667円');
eq(JA.fmtYen(r.profit),'2,000円','ex profit fmt');eq(JA.fmtYen(r.cost),'8,000円','ex cost fmt');eq(J.fmtPct(r.margin),'20.0%','ex margin fmt');eq(J.fmtPct(r.markup),'25.0%','ex markup fmt');
r=J.calc({price:10667,materials:8000,target:25});eq(r.status,'On target','10667 on target');eq(JA.status(r.status),'目標達成','目標達成');
r=J.calc({price:10666,materials:8000,target:25});eq(r.status,'Below target','10666 below');
// 同じ例を内訳で（材料3,000＋作業2h×2,000＋外注500＋その他500＝8,000）
r=J.calc({price:'10,000',materials:'3000',hours:'2',rate:'2000',subcontract:'500',other:'500',target:'25'});
eq(r.labour,4000,'ex2 labour');eq(r.cost,8000,'ex2 cost');eq(JA.fmtYenUp(r.priceNeeded),'10,667円','ex2 need');
// 状態の日本語
eq(JA.status('Loss'),'赤字','st loss');eq(JA.status('Below target'),'目標未達','st below');eq(JA.status('On target'),'目標達成','st on');
eq(JA.status('Profit'),'利益あり','st profit');eq(JA.status('Break-even'),'とんとん','st be');eq(JA.status('No data'),'未入力','st nodata');
eq(JA.status(J.calc({}).status),'未入力','empty 未入力');eq(JA.status(J.calc({price:500,materials:500}).status),'とんとん','be とんとん');
eq(JA.status(J.calc({price:900,materials:1000}).status),'赤字','loss 赤字');eq(JA.status(J.calc({price:1000,materials:900}).status),'利益あり','profit 利益あり');
// 表示：円（四捨五入）
eq(JA.fmtYen(1234567),'1,234,567円','yen big');eq(JA.fmtYen(0),'0円','yen 0');eq(JA.fmtYen(null),'—','yen null');eq(JA.fmtYen(undefined),'—','yen undef');
eq(JA.fmtYen(1234.5),'1,235円','yen half up');eq(JA.fmtYen(1234.49),'1,234円','yen round down');eq(JA.fmtYen(-50),'−50円','yen neg');
eq(JA.fmtYen(-1234.5),'−1,235円','yen neg half');eq(JA.fmtYen(-0.4),'0円','yen -0');eq(JA.fmtYen(999.5),'1,000円','yen carry');
eq(JA.fmtYen(567.17),'567円','yen 567.17');
// 表示：円（切り上げ）
eq(JA.fmtYenUp(10666.67),'10,667円','up 10666.67');eq(JA.fmtYenUp(2240),'2,240円','up exact');eq(JA.fmtYenUp(1187.5),'1,188円','up .5');
eq(JA.fmtYenUp(1333.34),'1,334円','up 1333.34');eq(JA.fmtYenUp(0),'0円','up 0');eq(JA.fmtYenUp(null),'—','up null');eq(JA.fmtYenUp(142.86),'143円','up 142.86');
eq(JA.fmtYenUp(2240.0000000000005),'2,240円','up float noise');
// 入力の正規化（全角・円・%）
eq(JA.norm('１０，０００'),'10,000','norm zen');eq(JA.norm('8000円'),'8000','norm 円');eq(JA.norm('25%'),'25','norm %');eq(JA.norm('２５％'),'25','norm ％');
eq(JA.norm('１２．５'),'12.5','norm dot');eq(JA.norm(''),'','norm blank');eq(JA.norm(null),null,'norm null');eq(JA.norm('　300　'),' 300 ','norm zen space');
eq(J.calc({price:JA.norm('１０，０００円'),materials:JA.norm('８０００'),target:JA.norm('２５％')}).priceNeeded,10666.67,'zen calc');
eq(J.calc({price:JA.norm('　300　')}).profit,300,'zen space calc');
// エラーの日本語
const NM={price:'売値',materials:'材料費・仕入れ',hours:'作業時間',rate:'時給',subcontract:'外注費',other:'その他の費用',target:'目標利益率'};
Object.keys(NM).forEach(k=>{
  eq(JA.error(J.calc({price:100,[k]:JA.norm('－1')}).error),NM[k]+'にマイナスは入力できません。','ja neg '+k);
  eq(JA.error(J.calc({price:100,[k]:'abc'}).error),NM[k]+'は数字で入力してください。','ja nan '+k);
});
eq(JA.error(J.calc({price:100,target:100}).error),'目標利益率は100%未満にしてください。','ja target100');
eq(JA.error(''),'','ja no err');eq(JA.error(undefined),'','ja undef');eq(JA.error('something else'),'入力内容を確認してください。','ja fallback');
// 表示の不変条件：切り上げ表示の売値で計算し直すと必ず目標達成
for(const cost of [1,99,100,333,1000,7777,8000,12345,99999])for(const t of [0,5,10,20,25,30,33.3,40,50,66.6,90,99]){
  const x=J.calc({price:0,materials:cost,target:t});const shown=Number(JA.fmtYenUp(x.priceNeeded).replace(/[円,]/g,''));
  eq(Number.isInteger(shown),true,'int '+cost+'/'+t);
  eq(shown>=cost/(1-t/100)-1e-6&&shown<cost/(1-t/100)+1,true,'ceil range '+cost+'/'+t);
  eq(J.calc({price:shown,materials:cost,target:t}).status,'On target','shown on target '+cost+'/'+t);
}
// app.js を簡易DOMで動かす
{const fs=require('fs'),vm=require('vm');const els={};
 const mk=id=>els[id]||(els[id]={id,value:'',hidden:false,textContent:'',className:'',ls:{},addEventListener(e,f){this.ls[e]=f}});
 const ctx={document:{getElementById:mk},JOB:J,JA};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8'),ctx);
 eq(els.status.textContent,'未入力','dom empty');
 els.price.value='１０，０００円';els.materials.value='8000';els.target.value='25%';els.price.ls.input();
 eq(els.profit.textContent,'2,000円','dom profit');eq(els.cost.textContent,'8,000円','dom cost');eq(els.margin.textContent,'20.0%','dom margin');
 eq(els.markup.textContent,'25.0%','dom markup');eq(els.status.textContent,'目標未達','dom status');eq(els.status.className,'status warn','dom class');
 eq(els.needRow.hidden,false,'dom need shown');eq(els.need.textContent,'10,667円','dom need');eq(els.needLbl.textContent,'25.0%','dom need lbl');
 els.price.value='7000';els.price.ls.input();eq(els.status.textContent,'赤字','dom loss');eq(els.profit.textContent,'−1,000円','dom loss fmt');eq(els.status.className,'status bad','dom bad');
 els.target.value='';els.target.ls.input();eq(els.needRow.hidden,true,'dom need hidden');
 els.rate.value='-5';els.rate.ls.input();eq(els.err.hidden,false,'dom err');eq(els.err.textContent,'時給にマイナスは入力できません。','dom err ja');eq(els.out.hidden,true,'dom out hidden');
 const html=fs.readFileSync(__dirname+'/index.html','utf8');
 Object.keys(els).forEach(id=>eq(html.includes('id="'+id+'"'),true,'html has id '+id));}
// HTMLの確認
const __ga=require(__dirname+'/../assets/ga-test-helper.js').stripGA(require('fs').readFileSync(__dirname+'/index.html','utf8'));if(__ga.problems.length){console.log('FAIL GA',__ga.problems.join(','));process.exitCode=1;}
const html=__ga.html;
eq(/1万円|30日チャレンジ/.test(html),false,'banned');eq(/connect-src 'none'/.test(html),true,'csp');
eq(/script-src 'self';/.test(html),true,'csp script self');eq(/<script>|\son\w+=/.test(html),false,'no inline js');
eq(/https?:\/\/(?!(?:tools\.)?equaglobal\.com|px\.a8\.net|www[0-9]*\.a8\.net|\*\.a8\.net|line\.me\/R\/ti\/p\/@736dykzx|schema\.org)/.test(html),false,'no external urls except A8 ad');eq(html.includes('広告・PR'),true,'ad label');
eq(html.includes('<html lang="ja">'),true,'lang ja');
eq(html.includes('<title>利益率・上乗せ率 計算ツール（売値の逆算つき）</title>'),true,'title');
eq(html.includes('<link rel="canonical" href="https://tools.equaglobal.com/riekiritsu/">'),true,'canonical');
eq(html.includes('hreflang="ja" href="https://tools.equaglobal.com/riekiritsu/"'),true,'hreflang ja');
eq(html.includes('hreflang="en" href="https://tools.equaglobal.com/jobcost/"'),true,'hreflang en');
eq(html.includes('一般的な情報です。税務の判断は税理士・税務署にご確認ください。このツールは、公開前に計算をテストしています。入力した内容はブラウザの外に送信されません。'),true,'footer note');
['href="../"','href="../blog/riekiritsu-uwanoseritsu-chigai/"','href="../dx/"','href="../jobcost/"'].forEach(s=>eq(html.includes(s),true,'link '+s));
['売値（税抜）','材料費・仕入れ','作業時間','時給（自分の分も）','外注費','その他の費用','目標利益率','原価合計','利益率','上乗せ率','必要な売値','10,667円','8,000円','10,000円'].forEach(s=>eq(html.includes(s),true,'text '+s));
const vs=(html.match(/"(?:logic|ja|app)\.(?:js|css)\?v=\d+/g)||[]).map(v=>v.replace(/^.*(\?v=)/,'$1'));eq(vs.length,4,'cache bust count');eq(vs.every(v=>v==='?v=202610201200'),true,'cache bust value');
eq(/<script src="\.\.\/assets\/ads-inter\.js\?v=\d+" data-pool="accounting" data-page-ad="0" defer><\/script>/.test(html),true,'interstitial script');eq(html.includes('href="../assets/ads-inter.css?v='),true,'interstitial css');
['logic.js','ja.js','app.js','app.css'].forEach(f=>eq(require('fs').existsSync(__dirname+'/'+f),true,'file '+f));
eq(require('fs').readFileSync(__dirname+'/logic.js','utf8'),require('fs').readFileSync(__dirname+'/../jobcost/logic.js','utf8'),'logic.js same as jobcost');
const en=require('fs').readFileSync(__dirname+'/../jobcost/index.html','utf8');
eq(en.includes('hreflang="ja" href="https://tools.equaglobal.com/riekiritsu/"'),true,'reverse hreflang in jobcost');
console.log(p+' passed, '+f+' failed');process.exit(f?1:0);
