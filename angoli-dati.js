/* Aperture di semirette: il verso dell’arco identifica sempre l’angolo richiesto. */
const EsploriaAngoli=(()=>{'use strict';
const levels={primi:{name:'PRIMI SEGNALI',desc:'APERTURE IN MULTIPLI DI 10°, CON ORIENTAMENTI DIVERSI.'},rotte:{name:'ROTTE NASCOSTE',desc:'FIGURE RUOTATE E MISURE IN MULTIPLI DI 5°.'},torre:{name:'VERSO LA TORRE',desc:'CONFRONTA APERTURE, ORIENTAMENTI E TRASFORMAZIONI.'}};
const questions=[],norm=a=>((a%360)+360)%360;
function add(q){questions.push({...q,id:q.level+'-'+(questions.filter(x=>x.level===q.level).length+1),attempts:0,errors:0,hinted:false,solved:false,placed:false,placeAttempts:0,placeErrors:0,scaleErrors:0,supplementErrors:0});}
for(const [li,level] of Object.keys(levels).entries()){
 const pool=li===0?[20,30,40,50,60,70,80,90,100,110,120,130,140,150,160,170,180,40,60,80,100,120,140,160]:[15,25,35,45,55,65,75,85,95,105,115,125,135,145,155,165,175,180,30,60,90,120,150,170];
 pool.forEach((angle,i)=>add({level,category:'misura',angle,base:li===0?norm(i*90):norm(i*45+15*li),sense:i%2?-1:1,lengths:[95+(i%4)*20,90+((i+2)%4)*20],request:'MISURA L’APERTURA SEGNATA DALL’ARCO. PARTI DAL LATO CON LA BANDIERINA.',explanation:'LA MISURA SI LEGGE PARTENDO DALLO ZERO SUL LATO CON LA BANDIERINA, FINO ALL’ALTRO LATO.'}));
 for(let i=0;i<12;i++){
  const a=25+(i%6)*20,b=i%3===0?a:i%3===1?a+20:a-15;
  add({level,category:'confronto',angleA:a,angleB:b,baseA:norm(i*45),baseB:norm(i*45+110),lengthsA:a>b?[80,90]:[155,160],lengthsB:a>b?[155,160]:[80,90],options:['A','B','HANNO LA STESSA APERTURA'],answer:a>b?'A':b>a?'B':'HANNO LA STESSA APERTURA',request:'QUALE ANGOLO HA L’APERTURA MAGGIORE? CONFRONTA L’APERTURA FRA I LATI.',explanation:a===b?'LE APERTURE SONO UGUALI, ANCHE SE I TRATTI DISEGNATI E L’ORIENTAMENTO SONO DIVERSI.':'L’ANGOLO '+(a>b?'A':'B')+' HA L’APERTURA MAGGIORE. TRATTI PIÙ LUNGHI NON RENDONO PIÙ GRANDE UN ANGOLO.'});
  const type=['lunghezze','rotazione','apertura'][i%3],angle=30+(i%5)*25,after=type==='apertura'?angle+(i%2?20:-15):angle;
  add({level,category:'invarianza',transform:type,angle,beforeBase:norm(i*30),afterBase:norm(i*30+(type==='rotazione'?100:0)),afterAngle:after,lengthsA:[90,105],lengthsB:type==='lunghezze'?[155,150]:[90,105],options:['AUMENTA','DIMINUISCE','RESTA UGUALE'],answer:after===angle?'RESTA UGUALE':after>angle?'AUMENTA':'DIMINUISCE',request:'DAL PRIMA AL DOPO, LA MISURA DELL’ANGOLO AUMENTA, DIMINUISCE O RESTA UGUALE?',explanation:type==='lunghezze'?'CAMBIANO SOLO I TRATTI DISEGNATI: L’APERTURA RESTA UGUALE.':type==='rotazione'?'È RUOTATA TUTTA LA FIGURA: L’APERTURA RESTA UGUALE.':'UN LATO SI È MOSSO RISPETTO ALL’ALTRO: L’APERTURA È '+(after>angle?'AUMENTATA.':'DIMINUITA.')});
 }
}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a;}
function plan(level){if(!levels[level])throw Error('LIVELLO_NON_VALIDO');const bank=questions.filter(q=>q.level===level),m=bank.filter(q=>q.category==='misura');const chosen=[shuffle(m.filter(q=>q.angle<90&&q.sense===1))[0],shuffle(m.filter(q=>q.angle>90&&q.angle<180&&q.sense===-1))[0]];chosen.push(...shuffle(m.filter(q=>!chosen.includes(q))).slice(0,2));const measure=shuffle(chosen),c=shuffle(bank.filter(q=>q.category==='confronto')).slice(0,2),v=[shuffle(bank.filter(q=>q.category==='invarianza'&&q.transform!=='apertura'))[0],shuffle(bank.filter(q=>q.category==='invarianza'&&q.transform==='apertura'))[0]];return [measure[0],c[0],measure[1],v[0],measure[2],c[1],measure[3],v[1]].map(q=>{q=JSON.parse(JSON.stringify(q));if(q.options)q.options=shuffle(q.options);return q;});}
const target=q=>norm(q.base+(q.sense<0?180:0));
function placement(q,t){const center=Math.hypot(t.x-350,t.y-270)<=7,delta=Math.abs(norm(t.rotation-target(q)+180)-180);return{center,aligned:delta<=3,correct:center&&delta<=3};}
function check(q,d){if(q.category==='misura')return Number.isInteger(d.degrees)&&d.degrees===q.angle&&d.scale===(q.sense===1?'A':'B');return Number.isInteger(d.choice)&&q.options[d.choice]===q.answer;}
const badges=n=>[{n:1,key:'angoli-1',icon:'🔦',it:'PRIMO SEGNALE ACCESO'},{n:5,key:'angoli-5',icon:'🧭',it:'CUSTODE DEI SEGNALI · 5 MISSIONI'},{n:10,key:'angoli-10',icon:'🏅',it:'ESPLORATORE DELLE APERTURE · 10 MISSIONI'}].filter(b=>Number(n)>=b.n);
return{questions,levels,plan,norm,target,placement,check,badges};})();
