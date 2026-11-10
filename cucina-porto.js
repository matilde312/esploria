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
function gameError(error){const message=String(error?.message||'');return /^(YOUR |THE |THIS |SAVING |CONNECTION |LOCAL )/.test(message)?message:'PLEASE TRY AGAIN OR SIGN IN AGAIN. ASK YOUR TEACHER IF YOU NEED HELP.';}
function tell(text){$('feedback').textContent=text}
function read(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}}
function persist(){try{localStorage.setItem(key,JSON.stringify({run,pending,count,review}))}catch(_){$('connection').textContent='LOCAL SAVING IS NOT AVAILABLE. WAIT FOR THE ONLINE SAVE BEFORE LEAVING.'}}
function setBusy(value){busy=value;document.querySelectorAll('#game button,#start,#again').forEach(b=>{b.disabled=value||!!pending||!ready});$('retry').disabled=value;$('nextStep').disabled=value||!!pending;$('help').disabled=value||!!pending||!!review;$('restart').disabled=value||!!pending;if(!value&&playing&&run&&!run.finished&&!run.abandoned){const step=run.steps[run.position];$('ingredients').querySelectorAll('button').forEach(b=>b.disabled=!!pending||!!review||(step.kind!=='ingredient'&&step.id!=='decorate'));$('undo').disabled=!!pending||!!review||!run.amount;$('oven').disabled=!!pending||step.kind!=='action'||step.id!=='bake';}}
async function rpc(action,args={}){
 if(!owner||!currentOwner())throw Error('YOUR PROFILE HAS CHANGED. PLEASE SIGN IN AGAIN.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY},body:JSON.stringify({p_codice:owner,p_azione:action,...args}),signal:controller.signal});const result=await response.json().catch(()=>null);
 if(!currentOwner())throw Error('YOUR PROFILE HAS CHANGED. PLEASE SIGN IN AGAIN.');
 if(!response.ok){const error=Error(({CODICE_NON_VALIDO:'YOUR CODE IS NOT VALID. PLEASE SIGN IN AGAIN.',PARTITA_NON_ATTIVA:'THE RECIPE HAS CHANGED. PLEASE REOPEN THE GAME.',SCELTA_NON_VALIDA:'THIS ACTION IS NOT AVAILABLE.'})[result?.message]||'SAVING IS NOT AVAILABLE. PRESS TRY AGAIN OR ASK YOUR TEACHER FOR HELP.');error.tag=result?.message;throw error}return result;
 }catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw Error('CONNECTION LOST. YOUR MOVE IS KEPT HERE. PRESS TRY AGAIN.');throw error}finally{clearTimeout(timer)}
}
function adopt(result){run=result.partita;count=Number(result.completate)||0;persist()}
function art(id){const i=D.ingredients[id],span=document.createElement('span');span.className='foodArt';span.setAttribute('aria-hidden','true');span.style.backgroundPosition=`${(i.sprite%4)*100/3}% ${Math.floor(i.sprite/4)*50}%`;return span}
function renderBadges(){ $('total').textContent='RECIPES COMPLETED: '+count; }
let renderedIngredientsKey='';
function renderIngredients(step){const cacheKey=run.id+':'+(review?'review'+review.position:run.position);if(renderedIngredientsKey===cacheKey)return;renderedIngredientsKey=cacheKey;$('ingredients').replaceChildren();
 const recipe=D.recipes.find(r=>r.id===run.recipe_id),ids=step.id==='decorate'?['strawberry']:[...new Set([...recipe.items,...(recipe.toppings||[])].map(x=>x[0]))];
 for(const id of ids){const i=D.ingredients[id],b=document.createElement('button');b.className='ingredient';b.type='button';b.dataset.ingredient=id;b.disabled=busy||!!pending||!!review||(step.kind!=='ingredient'&&step.id!=='decorate');b.setAttribute('aria-label',`${i.name}: add ${i.portion} ${i.unit||'piece'}`);b.append(art(id));const name=document.createElement('span');name.className='ingredientName';name.lang='en';name.textContent=i.name;const portion=document.createElement('span');portion.className='portion';portion.textContent=i.portion+(i.unit?' '+i.unit:' '+(i.portion===1?'piece':'pieces'));b.append(name,portion);b.addEventListener('pointerdown',event=>beginDrag(event,id,b));b.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(step.id==='decorate'&&id==='strawberry')send('action','decorate');else send('add',id)}});$('ingredients').append(b)}
}
function render(){document.body.classList.toggle('in-game',playing&&!!run&&!run.finished);renderBadges();$('welcome').hidden=playing;$('game').hidden=!playing||!run||run.finished;$('finish').hidden=!run?.finished||!playing;
 $('start').textContent=run&&!run.finished&&!run.abandoned?'RIPRENDI LA RICETTA →':'PREPARA UNA RICETTA →';
 if(!run||!playing)return;
 const recipe=D.recipes.find(r=>r.id===run.recipe_id);
 if(run.finished){$('dish').textContent=recipe.dish;$('finishText').textContent=`YOU MADE ${recipe.name.toUpperCase()}! RECIPES COMPLETED: ${count}.`;$('learnedWords').replaceChildren();for(const id of [...new Set(recipe.items.map(i=>i[0]))]){const word=document.createElement('span');word.textContent=D.ingredients[id].name;$('learnedWords').append(word);}$('newBadges').replaceChildren();for(const b of D.badges(count).filter(b=>b.earned&&previousCount<b.n)){const n=document.createElement('p');n.className='reward';n.textContent=`${b.icon} NEW BADGE: ${({1:"FIRST RECIPE",5:"HARBOUR COOK · 5 RECIPES",10:"HARBOUR CHEF · 10 RECIPES"})[b.n]}! `+(guest?'SAVED ON THIS DEVICE.':'FIND IT WITH YOUR OTHER BADGES.');$('newBadges').append(n)}return}
 const step=review?review.step:run.steps[run.position];$('recipeName').textContent='TODAY’S RECIPE: '+recipe.name.toUpperCase();$('mission').textContent='Listen → measure → cook.';$('instruction').textContent=D.instruction(step);$('stepCount').textContent=`STEP ${(review?review.position:run.position)+1} OF ${run.steps.length}`;$('progress').max=run.steps.length;$('progress').value=run.position;$('translation').hidden=true;
 $('bowl').classList.toggle('ready',!review&&step.kind==='ingredient');$('bowl').draggable=false;$('bowl').classList.toggle('dough-mode',step.kind==='action'&&step.id==='roll');$('bowl').setAttribute('aria-label',step.kind==='action'?'Bowl with dough. '+D.actions[step.id].en:'Bowl: drag one portion of an ingredient here.');
 $('bowlLabel').textContent=step.kind==='ingredient'?'↓ DRAG HERE':'DOUGH';$('scale').textContent=step.kind==='ingredient'?`${review?step.quantity:run.amount} / ${step.quantity} ${D.ingredients[step.id].unit||'PIECES'}`:'DOUGH READY';$('undo').hidden=step.kind!=='ingredient';$('undo').disabled=!run.amount||busy||!!pending;$('oven').disabled=step.kind!=='action'||step.id!=='bake'||busy||!!pending;
 $('action').hidden=true;gesture=0;$('gestureProgress').textContent='';$('game').dataset.gesture=review?'done':step.kind==='ingredient'?'add':step.id;
 if(step.kind==='action'){$('action').textContent=({mix:'MIX →',roll:'ROLL →',bake:'BAKE →',decorate:'DECORATE →'})[step.id];$('gestureHint').textContent=({mix:'MOVE IN CIRCLES INSIDE THE BOWL TO MIX.',roll:'MOVE LEFT AND RIGHT OVER THE DOUGH TO ROLL.',bake:'DRAG THE BOWL INTO THE OVEN.',decorate:'DRAG THE STRAWBERRY ONTO THE CAKE.'})[step.id];}else $('gestureHint').textContent='DRAG AN INGREDIENT INTO THE BOWL. ONE DRAG ADDS ONE PORTION.';
 $('stepReview').hidden=!review;$('nextStep').hidden=!review;
 if(review){const i=step.kind==='ingredient'?D.ingredients[step.id]:null;$('reviewText').textContent=i?`${step.quantity} ${i.unit||(i.plural||i.name)} = ${Array(step.quantity/i.portion).fill(i.portion+' '+(i.unit||i.name)).join(' + ')}. THAT’S THE RIGHT AMOUNT!`:`${D.actions[step.id].en} WELL DONE!`;$('gestureHint').textContent='STEP COMPLETE. PRESS NEXT WHEN YOU ARE READY.';$('action').hidden=true;}
 $('gestureGuide').textContent=review?'✓':step.kind==='ingredient'?'↘':({mix:'↻',roll:'↔',bake:'→',decorate:'↘'})[step.id];const portions=step.kind==='ingredient'?(review?step.quantity:run.amount)/D.ingredients[step.id].portion:0;$('portionTrail').textContent=step.kind==='ingredient'?portions+(portions===1?' PORTION ADDED':' PORTIONS ADDED'):'';
 renderIngredients(step);
}
async function setup(){setBusy(true);ready=false;try{
 const mode=new URLSearchParams(location.search).get('modalita');guest=mode==='ospite'||(!code()&&mode!=='codice');owner=guest?'':code();const profile=guest?{id:'ospite'}:await EsploriaAccesso.carica();if(!currentOwner())throw Error('YOUR PROFILE HAS CHANGED.');profileId=profile.id;key='esploria-cucina-v1:'+profileId;const cached=read(key);pending=cached?.pending||null;review=cached?.review||null;
 if(guest){run=cached?.run||null;count=Number(cached?.count)||0;pending=null}else{adopt(await rpc('stato'));if(pending&&pending.p_partita_id!==run?.id&&pending.p_azione!=='inizia')pending=null;}
 if(review&&(review.runId!==run?.id||review.position+1!==run?.position||run?.finished))review=null;previousCount=count;ready=true;$('profileLink').hidden=guest;$('connection').textContent=guest?'GUEST · RECIPES AND BADGES SAVED ON THIS DEVICE':'RECIPES SAVED TO YOUR PROFILE';$('retry').hidden=!pending;render();
 }catch(error){$('connection').textContent=gameError(error);$('retry').hidden=false;}finally{setBusy(false);if(!ready)$('start').disabled=true}
}
async function flush(){if(!pending)return;const result=await rpc(pending.p_azione,Object.fromEntries(Object.entries(pending).filter(([k])=>k!=='p_azione')));pending=null;adopt(result);$('connection').textContent='RECIPE AND BADGES SAVED TO YOUR PROFILE';$('retry').hidden=true;return result}
async function execute(action,args){pending={p_azione:action,p_richiesta_id:uuid(),...args};persist();return flush()}
async function start(){if(busy||pending||!ready)return;setBusy(true);try{if(!run||run.finished||run.abandoned){previousCount=count;review=null;if(guest){run=D.create(run?.recipe_id);persist()}else await execute('inizia',{});}playing=true;render();tell('');$('game').scrollIntoView({block:'start'});}catch(e){$('connection').textContent=gameError(e);$('retry').hidden=false;}finally{setBusy(false);if(playing&&run&&!run.finished)render()}}
async function send(kind,value=''){stopAudio();if(busy||pending||review||!ready||!playing||!run||run.finished)return;if(!currentOwner()){ready=false;setBusy(true);$('connection').textContent='YOUR PROFILE HAS CHANGED. PLEASE SIGN IN AGAIN.';return}setBusy(true);const position=run.position,previousStep=run.steps[run.position];let result;try{
 if(guest){result=D.apply(run,kind,value);run=result.run;if(run.finished)count++;persist()}else result=await execute('azione',{p_partita_id:run.id,p_tipo:kind,p_valore:value,p_tappa:run.position});
 if(kind==='help'){const step=run.steps[run.position];const ingredient=D.ingredients[step.id];$('translation').textContent=step.kind==='action'?({mix:'Move your finger or mouse in circles inside the bowl.',roll:'Move left and right over the dough.',bake:'Hold the bowl and drag it into the oven.',decorate:'Drag the strawberry onto the cake.'})[step.id]:`Each portion adds ${ingredient.portion} ${ingredient.unit||ingredient.name}. You need ${step.quantity/ingredient.portion} portions.`;$('translation').hidden=false;return}
 if(run.position>position&&!run.finished){review={runId:run.id,position,step:previousStep};persist();}
 render();tell(result.corretta===false||result.correct===false?(result.categoria==='quantities'||result.category==='quantities'?'TOO MUCH! CHECK THE AMOUNT AND TRY AGAIN.':'LOOK AT THE INSTRUCTION. TRY ANOTHER INGREDIENT.'):(run.finished?'WELL DONE, CHEF!':run.position>position?'WELL DONE! PRESS NEXT WHEN YOU ARE READY.':'GOOD! CHECK THE AMOUNT ON THE SCALE.'));
 }catch(error){$('connection').textContent=gameError(error);$('retry').hidden=false;if(error.tag==='PARTITA_NON_ATTIVA'){pending=null;ready=false;persist()}}finally{setBusy(false);if(pending)$('connection').textContent+=' YOUR MOVE IS KEPT HERE.';else if(kind!=='help'&&playing&&run&&!run.finished){$('undo').disabled=!!review||!run.amount;$('oven').disabled=run.steps[run.position].id!=='bake';$('ingredients').querySelectorAll('button').forEach(b=>b.disabled=!!review||(run.steps[run.position].kind!=='ingredient'&&run.steps[run.position].id!=='decorate'))}}
}
function actionGesture(){if(busy||pending||review||!run||run.finished)return;const step=run.steps[run.position];if(step.kind!=='action')return;const limit=step.id==='mix'?6:step.id==='roll'?3:1;gesture++;$('gestureProgress').textContent=step.id==='mix'?`MIX: ${gesture} / ${limit}`:step.id==='roll'?`ROLL: ${gesture} / ${limit}`:'';if(gesture>=limit){if(step.id==='bake')$('oven').classList.add('baking');send('action',step.id).finally(()=>{$('oven').classList.remove('baking');$('bowl').classList.remove('stirring','rolling')})}}
function inside(event,element){const r=element.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom}
function beginDrag(event,id,button){if(busy||pending||review||event.button!==0)return;drag={id,button,startX:event.clientX,startY:event.clientY,moved:false};button.setPointerCapture(event.pointerId)}
window.addEventListener('pointermove',event=>{if(drag){if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>8)drag.moved=true;if(drag.moved){if(!drag.ghost){drag.ghost=art(drag.id);drag.ghost.classList.add('dragGhost');document.body.append(drag.ghost)}drag.ghost.style.left=event.clientX+'px';drag.ghost.style.top=event.clientY+'px'}}});
window.addEventListener('pointerup',event=>{if(!drag)return;const d=drag;drag=null;d.ghost?.remove();if(d.moved){suppressClick=true;setTimeout(()=>suppressClick=false,0);if(inside(event,$('bowl'))){if(run.steps[run.position].id==='decorate'&&d.id==='strawberry')send('action','decorate');else send('add',d.id)}else tell('DROP THE INGREDIENT INSIDE THE BOWL. TRY AGAIN.');}else tell('HOLD THE INGREDIENT AND DRAG IT INTO THE BOWL.');});
window.addEventListener('pointercancel',()=>{drag?.ghost?.remove();drag=null});
let bowlGesture=null;
$('bowl').addEventListener('pointerdown',event=>{if(busy||pending||review||!run||run.finished)return;const step=run.steps[run.position];if(step.kind!=='action')return;bowlGesture={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,distance:0,id:step.id};$('bowl').setPointerCapture(event.pointerId);$('bowl').classList.toggle('stirring',step.id==='mix');$('bowl').classList.toggle('rolling',step.id==='roll')});
$('bowl').addEventListener('pointermove',event=>{if(!bowlGesture)return;if(bowlGesture.id==='bake'){$('bowl').style.transform=`translate(${event.clientX-bowlGesture.startX}px,${event.clientY-bowlGesture.startY}px)`;return;}if(!['mix','roll'].includes(bowlGesture.id))return;bowlGesture.distance+=Math.hypot(event.clientX-bowlGesture.x,event.clientY-bowlGesture.y);bowlGesture.x=event.clientX;bowlGesture.y=event.clientY;if(bowlGesture.distance>60){bowlGesture.distance=0;actionGesture()}});
$('bowl').addEventListener('pointerup',event=>{if(bowlGesture?.id==='bake'&&inside(event,$('oven')))actionGesture();bowlGesture=null;$('bowl').style.transform='';$('bowl').classList.remove('stirring','rolling')});
$('bowl').addEventListener('pointercancel',()=>{bowlGesture=null;$('bowl').style.transform='';$('bowl').classList.remove('stirring','rolling')});
$('bowl').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(run?.steps[run.position]?.kind==='action')actionGesture();else if(selected)send('add',selected)}});
$('nextStep').addEventListener('click',()=>{if(busy||pending)return;review=null;persist();render();setBusy(false);tell('LISTEN TO OR READ THE NEXT INSTRUCTION.');});
let instructionAudio=null;
function stopAudio(){if(instructionAudio){instructionAudio.pause();instructionAudio.currentTime=0;instructionAudio=null}}
$('listen').addEventListener('click',()=>{
 if(!run||run.finished||busy||pending)return;
 stopAudio();const step=review?review.step:run.steps[run.position];
 const file=step.kind==='ingredient'?step.id+'-'+step.quantity:step.id;
 instructionAudio=new Audio('cucina-audio/'+file+'.wav');instructionAudio.lang='en-GB';
 instructionAudio.play().catch(()=>tell('AUDIO IS NOT AVAILABLE. PRESS LISTEN AGAIN OR USE A HINT.'));
});
$('help').addEventListener('click',()=>send('help'));$('undo').addEventListener('click',()=>send('undo'));$('action').addEventListener('click',actionGesture);$('start').addEventListener('click',start);$('again').addEventListener('click',start);
$('restart').addEventListener('click',async()=>{if(busy||pending||!run||run.finished||!confirm('LEAVE THIS RECIPE? IT WILL NOT COUNT AS COMPLETED.'))return;setBusy(true);try{if(guest){run.abandoned=true;persist()}else await execute('abbandona',{p_partita_id:run.id});playing=false;render()}catch(e){$('connection').textContent=gameError(e);$('retry').hidden=false}finally{setBusy(false)}});
$('retry').addEventListener('click',async()=>{if(busy)return;if(!ready){await setup();return}setBusy(true);try{await flush();playing=!!run&&!run.abandoned;render();tell('CONNECTED AGAIN. YOU CAN CONTINUE.')}catch(e){$('connection').textContent=gameError(e)}finally{setBusy(false);if(run&&!run.finished&&playing)render()}});
window.addEventListener('pagehide',()=>{stopAudio();persist()});
setup();
})();
