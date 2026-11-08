/* ESPLORIA · progresso personale dell'escape. Usa l'accesso esistente. */
window.EsploriaEscape=(()=>{
 'use strict';
 const URL='https://eovmvcxvyhtbsxrjdmak.supabase.co/rest/v1/rpc/esploria_escape_sync';
 const KEY='sb_publishable_wXXfLDRJLU3fZumfCYMHiA_qqL00eae';
 const SESSION='esploria-accesso-codice-v1';
 let data=null,revision=0,profileId=null,ownerCode='',guest=false,dirty=false,conflict=false,finishing=false,queue=Promise.resolve(),timer=null,stats={completamenti:0,partite_iniziate:0},loaded=false;
 const clone=x=>JSON.parse(JSON.stringify(x));
 function session(){try{return sessionStorage.getItem(SESSION)||''}catch(_){return ''}}
 function storageKey(){return 'esploria-escape-v1:'+ (guest?'ospite':profileId)}
 function message(text){const el=document.querySelector('#saveStatus');if(el)el.textContent=text}
 function persist(){try{localStorage.setItem(storageKey(),JSON.stringify({data,revision,dirty,finishing,stats}))}catch(_){message('IL BROWSER NON CONSENTE LA COPIA LOCALE. TIENI APERTA LA PAGINA FINO AL SALVATAGGIO ONLINE.')}}
 function isOwner(){return guest||session()===ownerCode}
 async function request(action,payload=null,rev=revision,code=ownerCode){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{const response=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY},body:JSON.stringify({p_codice:code,p_azione:action,p_partita:payload,p_revisione:rev}),signal:controller.signal});const result=await response.json().catch(()=>null);
   if(!response.ok){const err=new Error(result?.message||'COLLEGAMENTO_NON_DISPONIBILE');err.tag=result?.message;throw err}return result;
  }finally{clearTimeout(timeout)}
 }
 function cache(){try{return JSON.parse(localStorage.getItem(storageKey())||'null')}catch(_){return null}}
 function apply(result){revision=Number(result.revisione);stats={completamenti:Number(result.completamenti)||0,partite_iniziate:Number(result.partite_iniziate)||0}}
 function fresh(){return {versione:1,id:crypto.randomUUID(),seed:crypto.getRandomValues(new Uint32Array(1))[0],stanza:1,stanze:{},completata:false}}
 async function init(){
  guest=new URLSearchParams(location.search).get('modalita')==='ospite'||(!session()&&new URLSearchParams(location.search).get('modalita')!=='codice');ownerCode=session();
  if(guest){const saved=cache();data=saved?.data?.versione===1?saved.data:fresh();stats=saved?.stats||stats;revision=0;finishing=!!saved?.finishing;loaded=true;message('OSPITE · PROGRESSI SALVATI SOLO SU QUESTO BROWSER');return data}
  if(!ownerCode)throw new Error('PER CONTINUARE TORNA ALL’ACCESSO E INSERISCI IL TUO CODICE.');
  if(!window.EsploriaAccesso)throw new Error('MANCA IL COLLEGAMENTO AL PROFILO. CHIEDI AIUTO ALL’INSEGNANTE.');
  const profile=await EsploriaAccesso.carica();if(!isOwner())throw new Error('IL PROFILO È CAMBIATO. RIAPRI IL GIOCO.');profileId=profile.id;
  const remote=await request('carica');if(!isOwner())throw new Error('IL PROFILO È CAMBIATO. RIAPRI IL GIOCO.');apply(remote);data=remote.partita;
  const local=cache();
  if(local?.dirty&&local.data?.versione===1&&local.data.id===data?.id&&Number(local.revision)===revision&&!data.completata){data=local.data;dirty=true;finishing=!!local.finishing}
  if(!data){data=fresh();const started=await request('inizia',data);if(!isOwner())throw new Error('IL PROFILO È CAMBIATO.');apply(started);data=started.partita}
  if(data.versione!==1)throw new Error('QUESTA PARTITA RICHIEDE UNA VERSIONE DIVERSA DEL GIOCO.');
  loaded=true;persist();message(dirty?'RECUPERO I PROGRESSI SALVATI SU QUESTO DISPOSITIVO…':'PROGRESSI COLLEGATI AL TUO PROFILO');if(dirty)await flush();return data;
 }
 function restore(name){return clone(data?.stanze?.[name]||{})}
 function random(name){let seed=(data.seed>>>0);for(let i=0;i<name.length;i++)seed=(Math.imul(seed,31)+name.charCodeAt(i))>>>0;return ()=>{seed=(seed+0x6D2B79F5)>>>0;let t=Math.imul(seed^(seed>>>15),1|seed);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296}}
 function touch(name,value){if(!loaded||data.completata||conflict||!isOwner())return;data.stanze[name]={...data.stanze[name],...clone(value)};schedule()}
 function room(n){if(!loaded||data.completata)return;data.stanza=Math.max(data.stanza,n);schedule()}
 function advance(name,n){touch(name,{superata:true});room(n)}
 function schedule(){dirty=true;persist();clearTimeout(timer);timer=setTimeout(()=>flush(),450);message(guest?'OSPITE · SALVATO SU QUESTO BROWSER':'SALVATAGGIO IN CORSO…')}
 function flush(){clearTimeout(timer);queue=queue.catch(()=>{}).then(async()=>{
   if(!loaded||conflict||!isOwner())return false;
   if(!dirty)return true;
   if(guest){dirty=false;persist();return true}
   const sending=clone(data),kind=finishing?'completa':'salva';
   try{const result=await request(kind,sending);if(!isOwner())return false;apply(result);
    if(kind==='completa'){data=result.partita;finishing=false;dirty=false;window.dispatchEvent(new CustomEvent('esploria:escape-completata',{detail:result}))}
    else dirty=finishing||JSON.stringify(data)!==JSON.stringify(sending);
    persist();message('SALVATO NEL TUO PROFILO');return result;
   }catch(error){dirty=true;persist();
    if(['PARTITA_AGGIORNATA_ALTROVE','PARTITA_NON_ATTIVA','PARTITA_GIA_IN_CORSO'].includes(error.tag)){conflict=true;message('PARTITA MODIFICATA SU UN’ALTRA PAGINA. RIAPRI IL GIOCO PER RIPRENDERE IL SALVATAGGIO PIÙ RECENTE. NON VERRÀ SOVRASCRITTO.');}
    else message('NON ANCORA SALVATO ONLINE · COPIA CONSERVATA QUI. PREMI RIPROVA PRIMA DI CAMBIARE DISPOSITIVO.');return false;
   }
  });return queue;
 }
 async function complete(){
  if(data.completata)return {...stats,nuovi_distintivi:[]};
  if(guest){data.completata=true;stats.completamenti++;dirty=false;persist();return {...stats,nuovi_distintivi:[]}}
  finishing=true;dirty=true;persist();return flush();
 }
 async function newAdventure(){
  await flush();if(conflict||dirty||finishing)throw new Error('SALVA PRIMA LA PARTITA CORRENTE.');
  if(!data.completata)throw new Error('HAI GIÀ UN’AVVENTURA IN CORSO.');
  const next=fresh();if(guest){data=next;stats.partite_iniziate++;persist();location.reload();return}
  const result=await request('inizia',next);if(!isOwner())throw new Error('IL PROFILO È CAMBIATO.');apply(result);data=result.partita;persist();location.reload();
 }
 async function readProfileStats(){const code=session();if(!code)throw new Error('ACCESSO_RICHIESTO');return request('carica',null,0,code)}
 window.addEventListener('online',()=>{if(loaded&&dirty)flush()});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&loaded){persist();flush()}});
 window.addEventListener('pagehide',()=>{if(loaded)persist()});
 return {init,restore,random,touch,room,advance,flush,complete,newAdventure,readProfileStats,
  get ready(){return loaded},get conflicted(){return conflict},get data(){return data},get guest(){return guest},get stats(){return {...stats}}};
})();
