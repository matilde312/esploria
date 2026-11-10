/* Cucina del Porto: input touch/mouse/tastiera, salvataggi idempotenti, nessuna classifica. */
(()=>{
'use strict';
const D=EsploriaCucinaData,$=id=>document.getElementById(id),SESSION='esploria-accesso-codice-v1';
const ENDPOINT='https://eovmvcxvyhtbsxrjdmak.supabase.co/rest/v1/rpc/esploria_cucina',KEY='sb_publishable_wXXfLDRJLU3fZumfCYMHiA_qqL00eae';
let guest=false,owner='',profileId='',run=null,pending=null,busy=false,ready=false,count=0,previousCount=0,selected=null,gesture=0,key='',drag=null,suppressClick=false,playing=false;
const uuid=()=>crypto.randomUUID();
function code(){try{return sessionStorage.getItem(SESSION)||''}catch(_){return ''}}
function currentOwner(){return guest||code()===owner}
function tell(text){$('feedback').textContent=text}
function read(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}}
function persist(){try{localStorage.setItem(key,JSON.stringify({run,pending,count}))}catch(_){$('connection').textContent='COPIA LOCALE NON DISPONIBILE. ATTENDI IL SALVATAGGIO ONLINE PRIMA DI USCIRE.'}}
function setBusy(value){busy=value;document.querySelectorAll('#game button,#start,#again').forEach(b=>{b.disabled=value||!!pending||!ready});$('retry').disabled=value;$('restart').disabled=value||!!pending;if(!value&&playing&&run&&!run.finished&&!run.abandoned){const step=run.steps[run.position];$('ingredients').querySelectorAll('button').forEach(b=>b.disabled=!!pending||step.kind!=='ingredient');$('undo').disabled=!!pending||!run.amount;$('oven').disabled=!!pending||step.kind!=='action'||step.id!=='bake';}}
async function rpc(action,args={}){
 if(!owner||!currentOwner())throw Error('IL PROFILO È CAMBIATO. TORNA ALL’ACCESSO.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY},body:JSON.stringify({p_codice:owner,p_azione:action,...args}),signal:controller.signal});const result=await response.json().catch(()=>null);
 if(!currentOwner())throw Error('IL PROFILO È CAMBIATO. TORNA ALL’ACCESSO.');
 if(!response.ok){const error=Error(({CODICE_NON_VALIDO:'IL CODICE NON È VALIDO. TORNA ALL’ACCESSO.',PARTITA_NON_ATTIVA:'LA RICETTA È CAMBIATA. RIAPRI IL GIOCO.',SCELTA_NON_VALIDA:'QUESTA AZIONE NON È DISPONIBILE.'})[result?.message]||'SALVATAGGIO NON DISPONIBILE. PREMI RIPROVA. L’INSEGNANTE PUÒ CONTROLLARE attiva-cucina-porto.sql.');error.tag=result?.message;throw error}return result;
 }catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw Error('COLLEGAMENTO INTERROTTO. LA MOSSA È CONSERVATA: PREMI RIPROVA.');throw error}finally{clearTimeout(timer)}
}
function adopt(result){run=result.partita;count=Number(result.completate)||0;persist()}
function art(id){const i=D.ingredients[id],span=document.createElement('span');span.className='foodArt';span.setAttribute('aria-hidden','true');span.style.backgroundPosition=`${(i.sprite%4)*100/3}% ${Math.floor(i.sprite/4)*50}%`;return span}
function renderBadges(){ $('total').textContent='RICETTE COMPLETATE: '+count; }
let renderedIngredientsKey='';
function renderIngredients(step){const cacheKey=run.id+':'+run.position;if(renderedIngredientsKey===cacheKey)return;renderedIngredientsKey=cacheKey;$('ingredients').replaceChildren();const recipe=D.recipes.find(r=>r.id===run.recipe_id),ids=[...new Set([...recipe.items,...(recipe.toppings||[])].map(x=>x[0]))];for(const extra of ['strawberry','butter','tomato'])if(!ids.includes(extra)&&ids.length<7)ids.push(extra);
 for(const id of ids){const i=D.ingredients[id],b=document.createElement('button');b.className='ingredient';b.type='button';b.dataset.ingredient=id;b.disabled=busy||!!pending||step.kind!=='ingredient';b.setAttribute('aria-label',`${i.name}, ${i.portion} ${i.unit}. Aggiungi una porzione alla ciotola`);b.append(art(id));const name=document.createElement('span');name.className='ingredientName';name.lang='en';name.textContent=i.name;const portion=document.createElement('span');portion.className='portion';portion.textContent=i.portion+(i.unit?' '+i.unit:' '+(i.portion===1?'PEZZO':'PEZZI'));b.append(name,portion);b.addEventListener('click',()=>{if(suppressClick){suppressClick=false;return}selected=id;send('add',id)});b.addEventListener('pointerdown',event=>beginDrag(event,id,b));$('ingredients').append(b)}
}
function render(){renderBadges();$('welcome').hidden=playing;$('game').hidden=!playing||!run||run.finished;$('finish').hidden=!run?.finished||!playing;
 $('start').textContent=run&&!run.finished&&!run.abandoned?'RIPRENDI LA RICETTA →':'PREPARA UNA RICETTA →';
 if(!run||!playing)return;
 const recipe=D.recipes.find(r=>r.id===run.recipe_id);
 if(run.finished){$('dish').textContent=recipe.dish;$('finishText').textContent=`HAI PREPARATO ${recipe.it.toUpperCase()}! RICETTE COMPLETATE: ${count}.`;$('newBadges').replaceChildren();for(const b of D.badges(count).filter(b=>b.earned&&previousCount<b.n)){const n=document.createElement('p');n.className='reward';n.textContent=`${b.icon} NUOVO DISTINTIVO: ${b.title}! `+(guest?'CONSERVATO SU QUESTO DISPOSITIVO.':'LO TROVI NEL TUO SCRIGNO.');$('newBadges').append(n)}return}
 const step=run.steps[run.position];$('recipeName').textContent=recipe.it.toUpperCase()+' · '+recipe.name;$('instruction').textContent=D.instruction(step);$('stepCount').textContent=`PASSAGGIO ${run.position+1} DI ${run.steps.length}`;$('progress').max=run.steps.length;$('progress').value=run.position;$('translation').hidden=true;
 $('bowl').classList.toggle('ready',step.kind==='ingredient');$('bowl').draggable=step.kind==='action'&&step.id==='bake';$('bowl').setAttribute('aria-label',step.kind==='action'?'Ciotola con impasto. '+D.actions[step.id].it:'Ciotola: aggiungi gli ingredienti trascinandoli oppure toccandoli.');
 $('bowlLabel').textContent=step.kind==='ingredient'?'ADD HERE':'DOUGH';$('scale').textContent=step.kind==='ingredient'?`${run.amount} / ${step.quantity} ${D.ingredients[step.id].unit||'PEZZI'}`:'IMPASTO PRONTO';$('undo').hidden=step.kind!=='ingredient';$('undo').disabled=!run.amount||busy||!!pending;$('oven').disabled=step.kind!=='action'||step.id!=='bake'||busy||!!pending;
 $('action').hidden=step.kind!=='action';gesture=0;
 if(step.kind==='action'){$('action').textContent=({mix:'MESCOLA · 0 / 6',roll:'STENDI · 0 / 3',bake:'METTI NEL FORNO →',decorate:'AGGIUNGI LE FRAGOLE →'})[step.id];$('gestureHint').textContent=({mix:'Gira nella ciotola con il dito o il mouse. Puoi anche premere MESCOLA sei volte.',roll:'Muovi il dito sulla ciotola per stendere. Puoi anche premere STENDI tre volte.',bake:'Trascina la ciotola nel forno oppure premi il pulsante.',decorate:'Tocca il pulsante per decorare la tua torta con le fragole.'})[step.id]}else $('gestureHint').textContent='Ogni tocco aggiunge una porzione. Puoi trascinare lo stesso ingrediente più volte.';
 renderIngredients(step);
}
async function setup(){setBusy(true);ready=false;try{
 const mode=new URLSearchParams(location.search).get('modalita');guest=mode==='ospite'||(!code()&&mode!=='codice');owner=guest?'':code();const profile=guest?{id:'ospite'}:await EsploriaAccesso.carica();if(!currentOwner())throw Error('IL PROFILO È CAMBIATO.');profileId=profile.id;key='esploria-cucina-v1:'+profileId;const cached=read(key);pending=cached?.pending||null;
 if(guest){run=cached?.run||null;count=Number(cached?.count)||0;pending=null}else{adopt(await rpc('stato'));if(pending&&pending.p_partita_id!==run?.id&&pending.p_azione!=='inizia')pending=null;}
 previousCount=count;ready=true;$('profileLink').hidden=guest;$('connection').textContent=guest?'OSPITE · DISTINTIVI E RICETTE SALVATI SU QUESTO DISPOSITIVO':'RICETTE COLLEGATE AL TUO PROFILO · NESSUNA CLASSIFICA';$('retry').hidden=!pending;render();
 }catch(error){$('connection').textContent=error.message;$('retry').hidden=false;}finally{setBusy(false);if(!ready)$('start').disabled=true}
}
async function flush(){if(!pending)return;const result=await rpc(pending.p_azione,Object.fromEntries(Object.entries(pending).filter(([k])=>k!=='p_azione')));pending=null;adopt(result);$('connection').textContent='RICETTA E DISTINTIVI SALVATI NEL TUO PROFILO';$('retry').hidden=true;return result}
async function execute(action,args){pending={p_azione:action,p_richiesta_id:uuid(),...args};persist();return flush()}
async function start(){if(busy||pending||!ready)return;setBusy(true);try{if(!run||run.finished||run.abandoned){previousCount=count;if(guest){run=D.create(run?.recipe_id);persist()}else await execute('inizia',{});}playing=true;render();tell('');$('instruction').focus?.();}catch(e){$('connection').textContent=e.message;$('retry').hidden=false;}finally{setBusy(false);if(playing&&run&&!run.finished)render()}}
async function send(kind,value=''){stopAudio();if(busy||pending||!ready||!playing||!run||run.finished)return;if(!currentOwner()){ready=false;setBusy(true);$('connection').textContent='IL PROFILO È CAMBIATO. TORNA ALL’ACCESSO.';return}setBusy(true);const position=run.position;let result;try{
 if(guest){result=D.apply(run,kind,value);run=result.run;if(run.finished)count++;persist()}else result=await execute('azione',{p_partita_id:run.id,p_tipo:kind,p_valore:value,p_tappa:run.position});
 if(kind==='help'){const step=run.steps[run.position];$('translation').textContent=step.kind==='action'?D.actions[step.id].it:`Aggiungi ${step.quantity} ${D.ingredients[step.id].unit} di ${D.ingredients[step.id].it}.`;$('translation').hidden=false;return}
 render();tell(result.corretta===false||result.correct===false?(result.categoria==='quantities'||result.category==='quantities'?'È TROPPO: CONTROLLA LA QUANTITÀ E RIPROVA.':'GUARDA L’ISTRUZIONE: PROVA UN ALTRO INGREDIENTE.'):(run.finished?'WELL DONE, CHEF!':run.position>position?'WELL DONE! ORA IL PROSSIMO PASSAGGIO.':'GOOD! CONTROLLA LA QUANTITÀ SULLA BILANCIA.'));
 }catch(error){$('connection').textContent=error.message;$('retry').hidden=false;if(error.tag==='PARTITA_NON_ATTIVA'){pending=null;ready=false;persist()}}finally{setBusy(false);if(pending)$('connection').textContent+=' LA MOSSA RESTA CONSERVATA QUI.';else if(kind!=='help'&&playing&&run&&!run.finished){$('undo').disabled=!run.amount;$('oven').disabled=run.steps[run.position].id!=='bake';$('ingredients').querySelectorAll('button').forEach(b=>b.disabled=run.steps[run.position].kind!=='ingredient')}}
}
function actionGesture(){if(busy||pending||!run||run.finished)return;const step=run.steps[run.position];if(step.kind!=='action')return;const limit=step.id==='mix'?6:step.id==='roll'?3:1;gesture++;$('action').textContent=step.id==='mix'?`MESCOLA · ${gesture} / ${limit}`:step.id==='roll'?`STENDI · ${gesture} / ${limit}`:$('action').textContent;if(gesture>=limit){if(step.id==='bake')$('oven').classList.add('baking');send('action',step.id).finally(()=>{$('oven').classList.remove('baking');$('bowl').classList.remove('stirring','rolling')})}}
function inside(event,element){const r=element.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom}
function beginDrag(event,id,button){if(busy||pending||event.button!==0)return;drag={id,button,startX:event.clientX,startY:event.clientY,moved:false};button.setPointerCapture(event.pointerId)}
window.addEventListener('pointermove',event=>{if(drag){if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>8)drag.moved=true;if(drag.moved){if(!drag.ghost){drag.ghost=art(drag.id);drag.ghost.classList.add('dragGhost');document.body.append(drag.ghost)}drag.ghost.style.left=event.clientX+'px';drag.ghost.style.top=event.clientY+'px'}}});
window.addEventListener('pointerup',event=>{if(!drag)return;const d=drag;drag=null;d.ghost?.remove();if(d.moved){suppressClick=true;setTimeout(()=>suppressClick=false,0);if(inside(event,$('bowl')))send('add',d.id)}});
window.addEventListener('pointercancel',()=>{drag?.ghost?.remove();drag=null});
let bowlGesture=null;
$('bowl').addEventListener('pointerdown',event=>{if(busy||pending||!run||run.finished)return;const step=run.steps[run.position];if(step.kind!=='action')return;bowlGesture={x:event.clientX,y:event.clientY,distance:0,id:step.id};$('bowl').setPointerCapture(event.pointerId);$('bowl').classList.toggle('stirring',step.id==='mix');$('bowl').classList.toggle('rolling',step.id==='roll')});
$('bowl').addEventListener('pointermove',event=>{if(!bowlGesture||!['mix','roll'].includes(bowlGesture.id))return;bowlGesture.distance+=Math.hypot(event.clientX-bowlGesture.x,event.clientY-bowlGesture.y);bowlGesture.x=event.clientX;bowlGesture.y=event.clientY;if(bowlGesture.distance>60){bowlGesture.distance=0;actionGesture()}});
$('bowl').addEventListener('pointerup',event=>{if(bowlGesture?.id==='bake'&&inside(event,$('oven')))actionGesture();bowlGesture=null;$('bowl').classList.remove('stirring','rolling')});
$('bowl').addEventListener('pointercancel',()=>{bowlGesture=null;$('bowl').classList.remove('stirring','rolling')});
$('bowl').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(run?.steps[run.position]?.kind==='action')actionGesture();else if(selected)send('add',selected)}});
let instructionAudio=null;
function stopAudio(){if(instructionAudio){instructionAudio.pause();instructionAudio.currentTime=0;instructionAudio=null}}
$('listen').addEventListener('click',()=>{
 if(!run||run.finished||busy||pending)return;
 stopAudio();const step=run.steps[run.position];
 const file=step.kind==='ingredient'?step.id+'-'+step.quantity:step.id;
 instructionAudio=new Audio('cucina-audio/'+file+'.wav');instructionAudio.lang='en-GB';
 instructionAudio.play().catch(()=>tell('NON RIESCO A RIPRODURRE L’AUDIO. PREMI ANCORA ASCOLTA O USA UN AIUTO.'));
});
$('help').addEventListener('click',()=>send('help'));$('undo').addEventListener('click',()=>send('undo'));$('action').addEventListener('click',actionGesture);$('oven').addEventListener('click',()=>{if(run?.steps[run.position]?.id==='bake')actionGesture()});$('start').addEventListener('click',start);$('again').addEventListener('click',start);
$('restart').addEventListener('click',async()=>{if(busy||pending||!run||run.finished||!confirm('LASCIARE QUESTA RICETTA? NON CONTERÀ TRA QUELLE COMPLETATE.'))return;setBusy(true);try{if(guest){run.abandoned=true;persist()}else await execute('abbandona',{p_partita_id:run.id});playing=false;render()}catch(e){$('connection').textContent=e.message;$('retry').hidden=false}finally{setBusy(false)}});
$('retry').addEventListener('click',async()=>{if(busy)return;if(!ready){await setup();return}setBusy(true);try{await flush();playing=!!run&&!run.abandoned;render();tell('COLLEGAMENTO RIPRISTINATO. PUOI CONTINUARE.')}catch(e){$('connection').textContent=e.message}finally{setBusy(false);if(run&&!run.finished&&playing)render()}});
window.addEventListener('pagehide',()=>{stopAudio();persist()});
setup();
})();
