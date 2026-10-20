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
const html=require('fs').readFileSync(__dirname+'/index.html','utf8');
eq(/1万円|30日チャレンジ/.test(html),false,'banned');eq(/connect-src 'none'/.test(html),true,'csp');
eq(/https?:\/\/(?!fearless0712\.github\.io)/.test(html),false,'no external urls');
eq(html.includes('General information only. This tool was built with the help of AI and tested.'),true,'footer note');
eq(html.includes('<link rel="alternate" hreflang="ja" href="https://fearless0712.github.io/misaneco-tools/riekiritsu/">'),true,'hreflang ja');eq(html.includes('<link rel="alternate" hreflang="en" href="https://fearless0712.github.io/misaneco-tools/jobcost/">'),true,'hreflang en self');
console.log(p+' passed, '+f+' failed');process.exit(f?1:0);
