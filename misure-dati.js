/* Lunghezze: ogni cambio conserva la distanza. */
const EsploriaMisure=(()=>{'use strict';
const units=['km','hm','dam','m','dm','cm','mm'];
const names=['CHILOMETRO','ETTOMETRO','DECAMETRO','METRO','DECIMETRO','CENTIMETRO','MILLIMETRO'];
const levels={scopri:{name:'CON LA LENTE',description:'APRI E RAGGRUPPA. UN CAMBIO ALLA VOLTA.',categories:['apri','raggruppa','salti','ritorno']},costruisci:{name:'COSTRUISCI I PONTI',description:'COLLEGA UNITÀ PIÙ LONTANE, PASSO DOPO PASSO.',categories:['apri','raggruppa','salti','ritorno']},esplora:{name:'OLTRE IL SENTIERO',description:'SCOPRI I DECIMALI. PROVA ANCHE PRIMA DI USARE IL BANCO.',categories:['apri','raggruppa','salti','ritorno']}};
const categories={apri:{name:'VERSO UNITÀ PIÙ PICCOLE'},raggruppa:{name:'VERSO UNITÀ PIÙ GRANDI'},salti:{name:'DAL km AL m'},ritorno:{name:'DAL m AL km'}};
const fmt=n=>{const parts=Number(n.toFixed(6)).toLocaleString('it-IT',{maximumFractionDigits:6,useGrouping:false}).split(',');parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0');return parts.join(',')};
const value=(q,at)=>Number((q.amount*10**(at-q.from)).toFixed(6));
const questions=[];
function add(level,category,amount,from,to){const answer=value({amount,from},to),label=fmt(answer);const values=[answer,answer*10,answer/10,answer*100];const options=[...new Set(values.map(fmt))].map(label=>({label,fills:[label]}));questions.push({id:level+'-'+(questions.filter(q=>q.level===level).length+1),level,category,amount,from,to,parts:[fmt(amount)+' '+units[from]+' =',units[to]],options,accepted:[label],request:'ESPRIMI '+fmt(amount)+' '+units[from]+' IN '+units[to]+'.',explanation:'LA LUNGHEZZA È LA STESSA. CAMBIA L’UNITÀ CON CUI LA MISURI.'});}
for(const level of Object.keys(levels))for(let k=1;k<=6;k++){
 const decimal=level==='esplora';const a=decimal?k+.5:k;
 const from=(k-1)%6;
 add(level,'apri',a,from,from+1);
 add(level,'raggruppa',decimal?k*10+5:k*10,from+1,from);
 add(level,'salti',a,0,level==='scopri'?1:3);
 add(level,'ritorno',decimal?k*1000+500:level==='scopri'?k*10:k*1000,level==='scopri'?1:3,0);
}
function shuffle(a){const out=a.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function plan(level){return shuffle(levels[level].categories.flatMap(c=>shuffle(questions.filter(q=>q.level===level&&q.category===c)).slice(0,2))).map(q=>({...JSON.parse(JSON.stringify(q)),options:shuffle(q.options),cursor:q.from,moves:0,attempts:0,errors:0,hinted:false,solved:false}));}
function badges(n){return [{n:1,key:'misure-1',icon:'🔎',it:'PRIMA SCOPERTA'},{n:5,key:'misure-5',icon:'🌉',it:'COSTRUTTORE DI PONTI'},{n:10,key:'misure-10',icon:'🧭',it:'ESPLORATORE DELLE MISURE'}].filter(b=>n>=b.n)}
return {units,names,levels,categories,questions,fmt,value,plan,badges,sentence:(q,i)=>q.parts[0]+' '+q.options[i].label+' '+q.parts[1]};})();
