/* Cucina del Porto: input touch/mouse/tastiera, salvataggi idempotenti, nessuna classifica. */
(()=>{
'use strict';
const D=EsploriaCucinaData,$=id=>document.getElementById(id),SESSION='esploria-accesso-codice-v1';
const ENDPOINT='https://eovmvcxvyhtbsxrjdmak.supabase.co/rest/v1/rpc/esploria_cucina',KEY='sb_publishable_wXXfLDRJLU3fZumfCYMHiA_qqL00eae';
let review=null,animating=false;
let guest=false,owner='',profileId='',run=null,pending=null,busy=false,ready=false,count=0,previousCount=0,selected=null,gesture=0,key='',drag=null,suppressClick=false,playing=false;
const uuid=()=>crypto.randomUUID();
function code(){try{return sessionStorage.getItem(SESSION)||''}catch(_){return ''}}
function currentOwner(){return guest||code()===owner}
function tell(text){$('feedback').textContent=text}
function read(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}}
function persist(){try{localStorage.setItem(key,JSON.stringify({run,pending,count,review}))}catch(_){$('connection').textContent='COPIA LOCALE NON DISPONIBILE. ATTENDI IL SALVATAGGIO ONLINE PRIMA DI USCIRE.'}}
function setBusy(value){busy=value;document.querySelectorAll('#game button,#start,#again').forEach(b=>{b.disabled=value||!!pending||!ready});$('retry').disabled=value;$('nextStep').disabled=value||!!pending;$('help').disabled=value||!!pending||!!review;$('restart').disabled=value||!!pending;if(!value&&playing&&run&&!run.finished&&!run.abandoned){const step=run.steps[run.position];$('ingredients').querySelectorAll('button').forEach(b=>b.disabled=!!pending||!!review||(step.kind!=='ingredient'&&step.id!=='decorate'));$('undo').disabled=!!pending||!!review||!run.amount;$('oven').disabled=!!pending||step.kind!=='action'||step.id!=='bake';}}
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
function renderIngredients(step){const cacheKey=run.id+':'+(review?'review'+review.position:run.position);if(renderedIngredientsKey===cacheKey)return;renderedIngredientsKey=cacheKey;$('ingredients').replaceChildren();
 const recipe=D.recipes.find(r=>r.id===run.recipe_id),ids=step.id==='decorate'?['strawberry']:[...new Set([...recipe.items,...(recipe.toppings||[])].map(x=>x[0]))];
 for(const id of ids){const i=D.ingredients[id],b=document.createElement('button');b.className='ingredient';b.type='button';b.dataset.ingredient=id;b.disabled=busy||!!pending||!!review||(step.kind!=='ingredient'&&step.id!=='decorate');b.setAttribute('aria-label',`${i.name}: aggiungi ${i.portion} ${i.unit||'pezzo'}`);b.append(art(id));const name=document.createElement('span');name.className='ingredientName';name.lang='en';name.textContent=i.name;const portion=document.createElement('span');portion.className='portion';portion.textContent='+ '+i.portion+(i.unit?' '+i.unit:' '+(i.portion===1?'piece':'pieces'));b.append(name,portion);b.addEventListener('pointerdown',event=>beginDrag(event,id,b));b.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(step.id==='decorate'&&id==='strawberry')send('action','decorate');else send('add',id)}});$('ingredients').append(b)}
}
function render(){document.body.classList.toggle('in-game',playing&&!!run&&!run.finished);renderBadges();$('welcome').hidden=playing;$('game').hidden=!playing||!run||run.finished;$('finish').hidden=!run?.finished||!playing;
 $('start').textContent=run&&!run.finished&&!run.abandoned?'RIPRENDI LA RICETTA →':'PREPARA UNA RICETTA →';
 if(!run||!playing)return;
 const recipe=D.recipes.find(r=>r.id===run.recipe_id);
 if(run.finished){$('dish').textContent=recipe.dish;$('finishText').textContent=`HAI PREPARATO ${recipe.it.toUpperCase()}! RICETTE COMPLETATE: ${count}.`;$('learnedWords').replaceChildren();for(const id of [...new Set(recipe.items.map(i=>i[0]))]){const word=document.createElement('span');word.textContent=D.ingredients[id].name+' · '+D.ingredients[id].it;$('learnedWords').append(word);}$('newBadges').replaceChildren();for(const b of D.badges(count).filter(b=>b.earned&&previousCount<b.n)){const n=document.createElement('p');n.className='reward';n.textContent=`${b.icon} NUOVO DISTINTIVO: ${b.title}! `+(guest?'CONSERVATO SU QUESTO DISPOSITIVO.':'LO TROVI NEL TUO SCRIGNO.');$('newBadges').append(n)}return}
 const step=review?review.step:run.steps[run.position];$('recipeName').textContent='OGGI PREPARI: '+recipe.it.toUpperCase();$('mission').textContent='Ascolta → prepara le quantità → cucina.';$('instruction').textContent=D.instruction(step);$('stepCount').textContent=`PASSAGGIO ${(review?review.position:run.position)+1} DI ${run.steps.length}`;$('progress').max=run.steps.length;$('progress').value=run.position;$('translation').hidden=true;
 $('bowl').classList.toggle('ready',!review&&step.kind==='ingredient');$('bowl').draggable=false;$('bowl').classList.toggle('dough-mode',step.kind==='action'&&step.id==='roll');$('bowl').setAttribute('aria-label',step.kind==='action'?'Ciotola con impasto. '+D.actions[step.id].it:'Ciotola: trascina qui una porzione di ingrediente.');
 $('bowlLabel').textContent=step.kind==='ingredient'?'↓ TRASCINA QUI':'DOUGH';$('scale').textContent=step.kind==='ingredient'?`${review?step.quantity:run.amount} / ${step.quantity} ${D.ingredients[step.id].unit||'PEZZI'}`:'IMPASTO PRONTO';$('undo').hidden=step.kind!=='ingredient';$('undo').disabled=!run.amount||busy||!!pending;$('oven').disabled=step.kind!=='action'||step.id!=='bake'||busy||!!pending;
 $('action').hidden=true;gesture=0;$('gestureProgress').textContent='';$('game').dataset.gesture=review?'done':step.kind==='ingredient'?'add':step.id;
 if(step.kind==='action'){$('action').textContent=({mix:'MIX →',roll:'ROLL →',bake:'BAKE →',decorate:'DECORATE →'})[step.id];$('gestureHint').textContent=({mix:'GIRA IL DITO O IL MOUSE NELLA CIOTOLA PER MESCOLARE.',roll:'MUOVI IL DITO O IL MOUSE SULL’IMPASTO PER STENDERLO.',bake:'TRASCINA LA CIOTOLA FINO AL FORNO.',decorate:'TRASCINA LA FRAGOLA SULLA TORTA.'})[step.id];}else $('gestureHint').textContent='TRASCINA L’INGREDIENTE NELLA CIOTOLA. OGNI TRASCINAMENTO AGGIUNGE UNA PORZIONE.';
 $('stepReview').hidden=!review;$('nextStep').hidden=!review;
 if(review){const i=step.kind==='ingredient'?D.ingredients[step.id]:null;$('reviewText').textContent=i?`${step.quantity} ${i.unit||(i.plural||i.name)} = ${Array(step.quantity/i.portion).fill(i.portion+' '+(i.unit||i.name)).join(' + ')}. HAI DOSATO LA QUANTITÀ RICHIESTA!`:`${D.actions[step.id].en} · ${D.actions[step.id].it}`;$('gestureHint').textContent='PASSAGGIO COMPLETATO. QUANDO SEI PRONTO, PREMI AVANTI.';$('action').hidden=true;}
 $('gestureGuide').textContent=review?'✓':step.kind==='ingredient'?'↘':({mix:'↻',roll:'↔',bake:'→',decorate:'↘'})[step.id];const portions=step.kind==='ingredient'?(review?step.quantity:run.amount)/D.ingredients[step.id].portion:0;$('portionTrail').textContent=step.kind==='ingredient'?portions+(portions===1?' PORZIONE AGGIUNTA':' PORZIONI AGGIUNTE'):'';
 renderIngredients(step);
}
async function setup(){setBusy(true);ready=false;try{
 const mode=new URLSearchParams(location.search).get('modalita');guest=mode==='ospite'||(!code()&&mode!=='codice');owner=guest?'':code();const profile=guest?{id:'ospite'}:await EsploriaAccesso.carica();if(!currentOwner())throw Error('IL PROFILO È CAMBIATO.');profileId=profile.id;key='esploria-cucina-v1:'+profileId;const cached=read(key);pending=cached?.pending||null;review=cached?.review||null;
 if(guest){run=cached?.run||null;count=Number(cached?.count)||0;pending=null}else{adopt(await rpc('stato'));if(pending&&pending.p_partita_id!==run?.id&&pending.p_azione!=='inizia')pending=null;}
 if(review&&(review.runId!==run?.id||review.position+1!==run?.position||run?.finished))review=null;previousCount=count;ready=true;$('profileLink').hidden=guest;$('connection').textContent=guest?'OSPITE · DISTINTIVI E RICETTE SALVATI SU QUESTO DISPOSITIVO':'RICETTE COLLEGATE AL TUO PROFILO · NESSUNA CLASSIFICA';$('retry').hidden=!pending;render();
 }catch(error){$('connection').textContent=error.message;$('retry').hidden=false;}finally{setBusy(false);if(!ready)$('start').disabled=true}
}
async function flush(){if(!pending)return;const result=await rpc(pending.p_azione,Object.fromEntries(Object.entries(pending).filter(([k])=>k!=='p_azione')));pending=null;adopt(result);$('connection').textContent='RICETTA E DISTINTIVI SALVATI NEL TUO PROFILO';$('retry').hidden=true;return result}
async function execute(action,args){pending={p_azione:action,p_richiesta_id:uuid(),...args};persist();return flush()}
async function start(){if(busy||pending||!ready)return;setBusy(true);try{if(!run||run.finished||run.abandoned){previousCount=count;review=null;if(guest){run=D.create(run?.recipe_id);persist()}else await execute('inizia',{});}playing=true;render();tell('');$('game').scrollIntoView({block:'start'});}catch(e){$('connection').textContent=e.message;$('retry').hidden=false;}finally{setBusy(false);if(playing&&run&&!run.finished)render()}}
async function send(kind,value=''){stopAudio();if(busy||pending||review||!ready||!playing||!run||run.finished)return;if(!currentOwner()){ready=false;setBusy(true);$('connection').textContent='IL PROFILO È CAMBIATO. TORNA ALL’ACCESSO.';return}setBusy(true);const position=run.position,previousStep=run.steps[run.position];let result;try{
 if(guest){result=D.apply(run,kind,value);run=result.run;if(run.finished)count++;persist()}else result=await execute('azione',{p_partita_id:run.id,p_tipo:kind,p_valore:value,p_tappa:run.position});
 if(kind==='help'){const step=run.steps[run.position];$('translation').textContent=step.kind==='action'?D.actions[step.id].it:`Aggiungi ${step.quantity} ${D.ingredients[step.id].unit} di ${D.ingredients[step.id].it}.`;$('translation').hidden=false;return}
 if(run.position>position&&!run.finished){review={runId:run.id,position,step:previousStep};persist();}
 render();tell(result.corretta===false||result.correct===false?(result.categoria==='quantities'||result.category==='quantities'?'È TROPPO: CONTROLLA LA QUANTITÀ E RIPROVA.':'GUARDA L’ISTRUZIONE: PROVA UN ALTRO INGREDIENTE.'):(run.finished?'WELL DONE, CHEF!':run.position>position?'WELL DONE! ORA IL PROSSIMO PASSAGGIO.':'GOOD! CONTROLLA LA QUANTITÀ SULLA BILANCIA.'));
 }catch(error){$('connection').textContent=error.message;$('retry').hidden=false;if(error.tag==='PARTITA_NON_ATTIVA'){pending=null;ready=false;persist()}}finally{setBusy(false);if(pending)$('connection').textContent+=' LA MOSSA RESTA CONSERVATA QUI.';else if(kind!=='help'&&playing&&run&&!run.finished){$('undo').disabled=!!review||!run.amount;$('oven').disabled=run.steps[run.position].id!=='bake';$('ingredients').querySelectorAll('button').forEach(b=>b.disabled=!!review||(run.steps[run.position].kind!=='ingredient'&&run.steps[run.position].id!=='decorate'))}}
}
function actionGesture(){if(busy||pending||review||!run||run.finished)return;const step=run.steps[run.position];if(step.kind!=='action')return;const limit=step.id==='mix'?6:step.id==='roll'?3:1;gesture++;$('gestureProgress').textContent=step.id==='mix'?`MESCOLA: ${gesture} / ${limit}`:step.id==='roll'?`STENDI: ${gesture} / ${limit}`:'';if(gesture>=limit){if(step.id==='bake')$('oven').classList.add('baking');send('action',step.id).finally(()=>{$('oven').classList.remove('baking');$('bowl').classList.remove('stirring','rolling')})}}
function inside(event,element){const r=element.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom}
function beginDrag(event,id,button){if(busy||pending||review||event.button!==0)return;drag={id,button,startX:event.clientX,startY:event.clientY,moved:false};button.setPointerCapture(event.pointerId)}
window.addEventListener('pointermove',event=>{if(drag){if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>8)drag.moved=true;if(drag.moved){if(!drag.ghost){drag.ghost=art(drag.id);drag.ghost.classList.add('dragGhost');document.body.append(drag.ghost)}drag.ghost.style.left=event.clientX+'px';drag.ghost.style.top=event.clientY+'px'}}});
window.addEventListener('pointerup',event=>{if(!drag)return;const d=drag;drag=null;d.ghost?.remove();if(d.moved){suppressClick=true;setTimeout(()=>suppressClick=false,0);if(inside(event,$('bowl'))){if(run.steps[run.position].id==='decorate'&&d.id==='strawberry')send('action','decorate');else send('add',d.id)}else tell('PORTA L’INGREDIENTE DENTRO LA CIOTOLA. PUOI RIPROVARE.');}else tell('TIENI PREMUTO E TRASCINA L’INGREDIENTE NELLA CIOTOLA.');});
window.addEventListener('pointercancel',()=>{drag?.ghost?.remove();drag=null});
let bowlGesture=null;
$('bowl').addEventListener('pointerdown',event=>{if(busy||pending||review||!run||run.finished)return;const step=run.steps[run.position];if(step.kind!=='action')return;bowlGesture={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,distance:0,id:step.id};$('bowl').setPointerCapture(event.pointerId);$('bowl').classList.toggle('stirring',step.id==='mix');$('bowl').classList.toggle('rolling',step.id==='roll')});
$('bowl').addEventListener('pointermove',event=>{if(!bowlGesture)return;if(bowlGesture.id==='bake'){$('bowl').style.transform=`translate(${event.clientX-bowlGesture.startX}px,${event.clientY-bowlGesture.startY}px)`;return;}if(!['mix','roll'].includes(bowlGesture.id))return;bowlGesture.distance+=Math.hypot(event.clientX-bowlGesture.x,event.clientY-bowlGesture.y);bowlGesture.x=event.clientX;bowlGesture.y=event.clientY;if(bowlGesture.distance>60){bowlGesture.distance=0;actionGesture()}});
$('bowl').addEventListener('pointerup',event=>{if(bowlGesture?.id==='bake'&&inside(event,$('oven')))actionGesture();bowlGesture=null;$('bowl').style.transform='';$('bowl').classList.remove('stirring','rolling')});
$('bowl').addEventListener('pointercancel',()=>{bowlGesture=null;$('bowl').style.transform='';$('bowl').classList.remove('stirring','rolling')});
$('bowl').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(run?.steps[run.position]?.kind==='action')actionGesture();else if(selected)send('add',selected)}});
$('nextStep').addEventListener('click',()=>{if(busy||pending)return;review=null;persist();render();setBusy(false);tell('ASCOLTA O LEGGI LA NUOVA RICHIESTA.');});
let instructionAudio=null;
function stopAudio(){if(instructionAudio){instructionAudio.pause();instructionAudio.currentTime=0;instructionAudio=null}}
$('listen').addEventListener('click',()=>{
 if(!run||run.finished||busy||pending)return;
 stopAudio();const step=review?review.step:run.steps[run.position];
 const file=step.kind==='ingredient'?step.id+'-'+step.quantity:step.id;
 instructionAudio=new Audio('cucina-audio/'+file+'.wav');instructionAudio.lang='en-GB';
 instructionAudio.play().catch(()=>tell('NON RIESCO A RIPRODURRE L’AUDIO. PREMI ANCORA ASCOLTA O USA UN AIUTO.'));
});
$('help').addEventListener('click',()=>send('help'));$('undo').addEventListener('click',()=>send('undo'));$('action').addEventListener('click',actionGesture);$('start').addEventListener('click',start);$('again').addEventListener('click',start);
$('restart').addEventListener('click',async()=>{if(busy||pending||!run||run.finished||!confirm('LASCIARE QUESTA RICETTA? NON CONTERÀ TRA QUELLE COMPLETATE.'))return;setBusy(true);try{if(guest){run.abandoned=true;persist()}else await execute('abbandona',{p_partita_id:run.id});playing=false;render()}catch(e){$('connection').textContent=e.message;$('retry').hidden=false}finally{setBusy(false)}});
$('retry').addEventListener('click',async()=>{if(busy)return;if(!ready){await setup();return}setBusy(true);try{await flush();playing=!!run&&!run.abandoned;render();tell('COLLEGAMENTO RIPRISTINATO. PUOI CONTINUARE.')}catch(e){$('connection').textContent=e.message}finally{setBusy(false);if(run&&!run.finished&&playing)render()}});
window.addEventListener('pagehide',()=>{stopAudio();persist()});
setup();
})();
