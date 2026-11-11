/* Lessico curato: ogni scelta riguarda una consonante singola o doppia. */
(function(root){'use strict';
const rows=[
['PALA','PALLA','L',false,'SERVE PER SCAVARE LA TERRA.'],['PALLA','PALA','L',true,'SI USA PER GIOCARE A CALCIO.'],
['CASA','CASSA','S',false,'IL POSTO DOVE ABITIAMO.'],['CASSA','CASA','S',true,'UN CONTENITORE DI LEGNO PER GLI OGGETTI.'],
['CANE','CANNE','N',false,'UN ANIMALE CHE ABBAIA.'],['CANNE','CANE','N',true,'PIANTE ALTE CHE CRESCONO VICINO ALL’ACQUA.'],
['PENA','PENNA','N',false,'IL DISPIACERE PER QUALCUNO CHE SOFFRE.'],['PENNA','PENA','N',true,'SERVE PER SCRIVERE CON L’INCHIOSTRO.'],
['POLO','POLLO','L',false,'UNA MAGLIETTA CON IL COLLETTO.'],['POLLO','POLO','L',true,'UN ANIMALE DEL POLLAIO.'],
['PANI','PANNI','N',false,'PIÙ PAGNOTTE DA MANGIARE.'],['PANNI','PANI','N',true,'I VESTITI APPESI AD ASCIUGARE.'],
['CAPELLI','CAPPELLI','P',false,'CRESCONO SULLA TESTA.'],['CAPPELLI','CAPELLI','P',true,'SI INDOSSANO SULLA TESTA PER RIPARARSI DAL SOLE.'],
['TORI','TORRI','R',false,'ANIMALI GRANDI CON LE CORNA.'],['TORRI','TORI','R',true,'COSTRUZIONI ALTE DI UN CASTELLO.'],
['NOTE','NOTTE','T',false,'I SEGNI CON CUI SI SCRIVE LA MUSICA.'],['NOTTE','NOTE','T',true,'QUANDO IL CIELO È BUIO E SI VEDONO LE STELLE.'],
['SETE','SETTE','T',false,'LA SENTIAMO QUANDO ABBIAMO BISOGNO DI BERE.'],['SETTE','SETE','T',true,'IL NUMERO CHE VIENE DOPO IL SEI.'],
['NONO','NONNO','N',false,'IL POSTO IN UNA FILA DOPO L’OTTAVO.'],['NONNO','NONO','N',true,'IL PAPÀ DELLA MAMMA O DEL PAPÀ.'],
['COPIA','COPPIA','P',false,'UN FOGLIO RIPRODOTTO UGUALE ALL’ORIGINALE.'],['COPPIA','COPIA','P',true,'DUE PERSONE CHE FANNO SQUADRA.'],
['GATTO','GATO','T',true,'UN ANIMALE CHE MIAGOLA.'],['RICCIO','RICIO','C',true,'UN PICCOLO ANIMALE CON GLI ACULEI.'],
['MUCCA','MUCA','C',true,'UN ANIMALE CHE FA MUU.'],['GIRAFFA','GIRAFA','F',true,'UN ANIMALE CON IL COLLO LUNGO.'],
['CAVALLO','CAVALO','L',true,'UN ANIMALE CHE GALOPPA.'],['FARFALLA','FARFALA','L',true,'UN INSETTO CON GRANDI ALI COLORATE.'],
['TAZZA','TAZA','Z',true,'UN RECIPIENTE CON IL MANICO PER BERE IL LATTE.'],['PIZZA','PIZA','Z',true,'È ROTONDA, CON POMODORO E MOZZARELLA.'],
['PACCO','PACO','C',true,'UN OGGETTO INCARTATO, PRONTO PER ESSERE SPEDITO.'],['LETTO','LETO','T',true,'IL MOBILE SU CUI DORMIAMO.'],
['COLTELLO','COLTELO','L',true,'LA POSATA CHE SERVE PER TAGLIARE.'],['CIPOLLA','CIPOLA','L',true,'UN ORTAGGIO A STRATI CHE PUÒ FAR LACRIMARE.'],
['PENNELLO','PENNELO','L',true,'SERVE PER DIPINGERE.'],['CANDELA','CANDELLA','L',false,'SI ACCENDE E FA LUCE CON UNA FIAMMELLA.'],
['BANANA','BANNANA','N',false,'UN FRUTTO GIALLO CON LA BUCCIA.'],['MELONE','MELONNE','N',false,'UN FRUTTO ESTIVO CON LA POLPA ARANCIONE.'],
['SAPONE','SAPPONE','P',false,'CON L’ACQUA FA SCHIUMA E LAVA LE MANI.'],['LIMONE','LIMMONE','M',false,'UN AGRUME GIALLO DAL SUCCO ASPRO.']
];
const words=rows.map(([word,other,letter,double,hint],picture)=>({id:word.toLowerCase(),word,other,letter,double,hint,picture,family:[word,other].sort().join('-')}));
function shuffle(items,random=Math.random){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function plan(random=Math.random){const used=new Set(),chosen=[];for(const double of [false,true])for(const w of shuffle(words.filter(w=>w.double===double),random)){if(chosen.filter(x=>x.double===double).length===5)break;if(!used.has(w.family)){chosen.push(w);used.add(w.family)}}if(chosen.length!==10)throw Error('LESSICO_INSUFFICIENTE');return shuffle(chosen,random).map(w=>({...w,options:shuffle([w.word,w.other],random)}))}
const badges=count=>[{n:1,key:'doppie-1',icon:'🌉',it:'IL MIO PRIMO PONTE'},{n:5,key:'doppie-5',icon:'🪵',it:'COSTRUTTORE DI PAROLE · 5 PONTI'},{n:10,key:'doppie-10',icon:'🏅',it:'ESPLORATORE DELLE DOPPIE · 10 PONTI'}].filter(b=>Number.isFinite(Number(count))&&Number(count)>=b.n);
root.EsploriaDoppie={words,plan,badges};
})(typeof window==='undefined'?globalThis:window);
