const H=require('./logic.js');let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}};
let r=H.list({kind:'blue'});ok(r.length===4&&r[2].years===7,'blue');
r=H.list({kind:'blue',low300:true});ok(r[2].years===5,'blue low300');
r=H.list({kind:'white'});ok(r[0].years===7&&r[3].years===5,'white');
r=H.list({kind:'white',invoice:true,zatsu300:true});ok(r.length===6&&r[5].years===7&&r[4].years===5&&/7年/.test(r[3].note),'white inv zatsu');
r=H.list({kind:'blue',invoice:true});ok(/7年/.test(r[3].note)&&!r[2].note,'blue inv note');
ok(!/1万円|30日チャレンジ/.test(require('fs').readFileSync(__dirname+'/index.html','utf8')),'banned');
console.log(f?f+' failed':'all passed');process.exit(f?1:0);
