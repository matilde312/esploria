'use strict';
const el = id => document.getElementById(id);
const config = {supabaseUrl:'https://eovmvcxvyhtbsxrjdmak.supabase.co',supabasePublishableKey:'sb_publishable_wXXfLDRJLU3fZumfCYMHiA_qqL00eae'};
let token = null, currentCode = '', creating = false, busy = false, awarding = false;
let badgeImageData = null, imageLoading = false, imageGeneration = 0;
let activeProfiles = [];
let managingProfile = false, deleteTarget = null, currentProfileId = null;
const tell = text => { el('message').textContent = text; };

function updateAwardButton() {
  el('awardButton').disabled = !token || !activeProfiles.length || awarding || imageLoading;
}
function resetBadgeImage(keepFile = false) {
  imageGeneration++;
  imageLoading = false;
  badgeImageData = null;
  if (!keepFile) el('badgeImage').value = '';
  el('badgeImagePreview').hidden = true;
  el('badgeImagePreview').removeAttribute('src');
  el('removeBadgeImage').hidden = true;
  updateAwardButton();
}
function clearSession() {
  closeStatistics();
  token = null; currentCode = ''; currentProfileId = null; activeProfiles = [];
  closeDeleteDialog();
  resetBadgeImage();
  for (const id of ['chosenCode','password','badgeTitle','badgeDescription']) el(id).value = '';
  for (const id of ['newCode','newProfile','awardMessage']) el(id).textContent = '';
  el('profiles').replaceChildren(); el('badgeProfile').replaceChildren();
  el('codeCard').hidden = true; el('dashboard').hidden = true; el('loginForm').hidden = false;
}
async function request(path, body, accessToken) {
  const headers = {'Content-Type':'application/json',apikey:config.supabasePublishableKey};
  if (accessToken) headers.Authorization = 'Bearer ' + accessToken;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let response;
  try {
    response = await fetch(config.supabaseUrl + path,{method:'POST',headers,body:JSON.stringify(body),signal:controller.signal});
  } catch (_) {
    throw new Error('Connessione non disponibile. Controlla il collegamento e riprova. Se stavi creando un codice, aggiorna prima l’elenco: il profilo potrebbe essere stato creato.');
  } finally { clearTimeout(timer); }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (accessToken && response.status === 401) { clearSession(); throw new Error('La sessione è scaduta. Accedi di nuovo.'); }
    if (response.status === 403 || data?.code === '42501') throw new Error('Questo account non è autorizzato oppure il profilo non è disponibile.');
    const messages = {
      CONFERMA_ELIMINAZIONE_NON_VALIDA:'La conferma non corrisponde al profilo da eliminare.',
      STATO_NON_VALIDO:'Lo stato del profilo non è valido.',
      DISTINTIVO_GIA_PRESENTE:'Questo profilo ha già un distintivo con lo stesso nome.',
      DISTINTIVO_NON_VALIDO:'Controlla il nome, il messaggio e il simbolo del distintivo.',
      IMMAGINE_NON_VALIDA:'L’immagine non è valida. Scegli un altro file PNG, JPG o WEBP.',
      CODICE_GIA_USATO:'Questo codice è già usato. Scegliete un’altra combinazione.',
      FORMATO_CODICE_NON_VALIDO:'Usa da 10 a 32 lettere e numeri, con almeno una lettera e un numero. Spazi e trattini non contano.'
    };
    if (messages[data?.message]) throw new Error(messages[data.message]);
    if (path.includes('/auth/v1/token')) throw new Error('Accesso non riuscito. Controlla email e password.');
    throw new Error('Operazione non riuscita. Verifica di aver eseguito gli aggiornamenti SQL, incluso 009-gestione-profili.sql, in Supabase.');
  }
  return data;
}
async function loadProfiles() {
  const profiles = await request('/rest/v1/rpc/esploria_elenca_profili',{},token);
  const previous = el('badgeProfile').value;
  activeProfiles = profiles.filter(p => p.attivo);
  el('badgeProfile').replaceChildren(); el('profiles').replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = ''; placeholder.textContent = 'SCEGLI UN PROFILO'; el('badgeProfile').append(placeholder);
  el('empty').hidden = profiles.length !== 0;
  for (const profile of profiles) {
    const li = document.createElement('li'), title = document.createElement('strong'), detail = document.createElement('small');
    title.textContent = profile.nome_personaggio || 'IN ATTESA DELLA SCELTA DEL COMPAGNO';
    detail.textContent = 'Profilo ' + profile.id + (profile.animale ? ' · ' + profile.animale : '') + (profile.attivo ? ' · ATTIVO' : ' · DISATTIVATO');
    const actions = document.createElement('div'); actions.className = 'profileActions';
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'secondary';
    toggle.textContent = profile.attivo ? 'DISATTIVA' : 'RIATTIVA';
    toggle.disabled = managingProfile;
    toggle.addEventListener('click',() => toggleProfile(profile));
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger';
    remove.textContent = 'ELIMINA DEFINITIVAMENTE'; remove.disabled = managingProfile;
    remove.addEventListener('click',() => openDeleteDialog(profile));
    const statsButton=document.createElement('button');statsButton.type='button';statsButton.className='secondary';statsButton.textContent='STATISTICHE DI GIOCO';statsButton.disabled=managingProfile;statsButton.addEventListener('click',()=>openStatistics(profile));
    actions.append(statsButton,toggle,remove);
    li.append(title,detail,actions); el('profiles').append(li);
    if (profile.attivo) {
      const option = document.createElement('option'); option.value = profile.id;
      option.textContent = (profile.nome_personaggio || 'COMPAGNO NON ANCORA SCELTO') + (profile.animale ? ' · ' + profile.animale : '') + ' · ' + profile.id.slice(0,8);
      el('badgeProfile').append(option);
    }
  }
  if (activeProfiles.some(p => p.id === previous)) el('badgeProfile').value = previous;
  if(statisticsProfile&&!profiles.some(p=>p.id===statisticsProfile.id))closeStatistics();
  updateAwardButton();
}
el('loginForm').addEventListener('submit',async event => {
  event.preventDefault(); if (busy) return;
  busy = true; el('loginButton').disabled = true; tell('ACCESSO IN CORSO…');
  try {
    const session = await request('/auth/v1/token?grant_type=password',{email:el('email').value.trim(),password:el('password').value});
    token = session.access_token; el('password').value = '';
    await loadProfiles(); el('loginForm').hidden = true; el('dashboard').hidden = false; tell('');
  } catch (error) { clearSession(); tell(error.message); }
  finally { busy = false; el('loginButton').disabled = false; }
});
el('chooseCodeForm').addEventListener('submit',async event => {
  event.preventDefault(); if (creating) return;
  if (currentCode && !el('savedCode').checked) { tell('Conserva prima il codice mostrato e seleziona «HO CONSERVATO QUESTO CODICE».'); return; }
  const chosen = el('chosenCode').value.trim().toUpperCase(), normalized = chosen.replace(/[\s-]/g,'');
  if (!/^[A-Z0-9]{10,32}$/.test(normalized) || !/[A-Z]/.test(normalized) || !/[0-9]/.test(normalized)) { tell('Scegliete da 10 a 32 lettere e numeri, con almeno una lettera e un numero. Spazi e trattini non contano.'); el('chosenCode').focus(); return; }
  creating = true; el('createButton').disabled = true; el('chosenCode').disabled = true; tell('CREAZIONE IN CORSO…');
  try {
    const result = await request('/rest/v1/rpc/esploria_crea_codice',{p_codice:chosen},token);
    currentProfileId = result.id;
    currentCode = result.codice; el('chosenCode').value = ''; el('newCode').textContent = result.codice; el('newProfile').textContent = 'Profilo ' + result.id;
    el('savedCode').checked = false; el('codeCard').hidden = false; tell('Codice creato. Conservalo insieme al riferimento del profilo.');
    try { await loadProfiles(); } catch (_) { tell('Codice creato. Conservalo; premi AGGIORNA ELENCO per aggiornare i profili.'); }
  } catch (error) { tell(error.message); }
  finally { creating = false; el('createButton').disabled = false; el('chosenCode').disabled = false; }
});

/* La miniatura viene preparata nel browser e inviata solo quando assegni il distintivo. */
async function prepareBadgeImage(file) {
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Scegli un’immagine PNG, JPG o WEBP fino a 5 MB.');
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve,reject) => {
      image.onload = resolve; image.onerror = () => reject(new Error('Non riesco ad aprire questa immagine. Scegli un altro file.'));
      image.src = objectUrl;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('L’immagine non è valida.');
    const ratio = Math.min(1,384 / Math.max(image.naturalWidth,image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1,Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1,Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Il browser non riesce a preparare l’immagine.');
    context.drawImage(image,0,0,canvas.width,canvas.height);
    const result = canvas.toDataURL('image/webp',0.85);
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(result)) throw new Error('Il browser non riesce a preparare questa immagine.');
    if (result.length > 350000) throw new Error('L’immagine è troppo complessa. Prova un’immagine più semplice.');
    return result;
  } finally { URL.revokeObjectURL(objectUrl); }
}
el('badgeImage').addEventListener('change',async () => {
  const file = el('badgeImage').files[0];
  resetBadgeImage(true);
  if (!file) return;
  const generation = imageGeneration;
  imageLoading = true; updateAwardButton();
  el('awardMessage').textContent = 'PREPARO L’IMMAGINE…';
  try {
    const data = await prepareBadgeImage(file);
    if (generation !== imageGeneration) return;
    badgeImageData = data; el('badgeImagePreview').src = data; el('badgeImagePreview').hidden = false;
    el('removeBadgeImage').hidden = false;
    el('awardMessage').textContent = 'Immagine pronta. Verrà salvata quando premi ASSEGNA IL DISTINTIVO.';
  } catch (error) {
    if (generation === imageGeneration) el('awardMessage').textContent = error.message;
  } finally {
    if (generation === imageGeneration) { imageLoading = false; updateAwardButton(); }
  }
});
el('removeBadgeImage').addEventListener('click',() => { resetBadgeImage(); el('awardMessage').textContent = 'Immagine rimossa. Verrà usato il simbolo scelto.'; });
el('awardForm').addEventListener('submit',async event => {
  event.preventDefault(); if (awarding || imageLoading) return;
  if (!token) { el('awardMessage').textContent = 'Accedi prima come insegnante.'; return; }
  const title = el('badgeTitle').value.trim(), description = el('badgeDescription').value.trim();
  if (!el('badgeProfile').value || !title) { el('awardMessage').textContent = 'Scegli un profilo e scrivi il nome del distintivo.'; return; }
  const selectedOption = el('badgeProfile').selectedOptions[0].textContent;
  if (!window.confirm('Assegnare «' + title.toUpperCase() + '» a ' + selectedOption + '?')) return;
  const image = badgeImageData;
  awarding = true; el('badgeImage').disabled = true; el('removeBadgeImage').disabled = true; updateAwardButton(); el('awardMessage').textContent = 'ASSEGNAZIONE IN CORSO…';
  try {
    const result = await request('/rest/v1/rpc/esploria_assegna_distintivo_immagine',{
      p_profilo_id:el('badgeProfile').value,p_titolo:title,p_descrizione:description,
      p_simbolo:el('badgeSymbol').value,p_immagine:image
    },token);
    el('awardMessage').textContent = 'DISTINTIVO «' + result.titolo + '» ASSEGNATO A ' + selectedOption + '.';
    el('badgeTitle').value = ''; el('badgeDescription').value = ''; resetBadgeImage();
  } catch (error) { el('awardMessage').textContent = error.message; }
  finally { awarding = false; el('badgeImage').disabled = false; el('removeBadgeImage').disabled = false; updateAwardButton(); }
});
el('copyButton').addEventListener('click',async () => { try { await navigator.clipboard.writeText(currentCode); tell('CODICE COPIATO. Incollalo dove vuoi conservarlo.'); } catch (_) { tell('Seleziona il codice e copialo manualmente.'); } });
el('refreshButton').addEventListener('click',async () => {
  if (busy) return; busy = true; el('refreshButton').disabled = true;
  try { await loadProfiles(); tell('ELENCO AGGIORNATO.'); } catch (error) { tell(error.message); }
  finally { busy = false; el('refreshButton').disabled = false; }
});
el('logoutButton').addEventListener('click',async () => {
  if (creating || busy || awarding || imageLoading || managingProfile) { tell('Attendi che l’operazione finisca prima di uscire.'); return; }
  if (currentCode && !el('savedCode').checked && !window.confirm('Hai conservato il codice? Uscendo non potrai più visualizzarlo.')) return;
  const oldToken = token; clearSession(); tell('SEI USCITA.');
  try { await request('/auth/v1/logout',{},oldToken); } catch (_) {}
});
window.addEventListener('beforeunload',event => { if (creating || awarding || imageLoading || managingProfile || (currentCode && !el('savedCode').checked)) { event.preventDefault(); event.returnValue = ''; } });


/* GESTIONE DEI SOLI PROFILI DELL’INSEGNANTE AUTENTICATA */
function profileLabel(profile) {
  return (profile.nome_personaggio || 'COMPAGNO NON ANCORA SCELTO')
    + (profile.animale ? ' · ' + profile.animale : '')
    + ' · PROFILO ' + profile.id.slice(0,8).toUpperCase();
}
function managementBusy(value) {
  managingProfile = value;
  el('profiles').querySelectorAll('button').forEach(button => { button.disabled = value; });
}
async function toggleProfile(profile) {
  if (managingProfile || !token) return;
  const next = !profile.attivo;
  const question = next
    ? 'Riattivare ' + profileLabel(profile) + '? Il bambino potrà rientrare con lo stesso codice.'
    : 'Disattivare ' + profileLabel(profile) + '? L’accesso sarà bloccato; personaggio, progressi e distintivi saranno conservati.';
  if (!window.confirm(question)) return;
  managementBusy(true); tell(next ? 'RIATTIVAZIONE IN CORSO…' : 'DISATTIVAZIONE IN CORSO…');
  try {
    await request('/rest/v1/rpc/esploria_imposta_profilo_attivo',{p_profilo_id:profile.id,p_attivo:next},token);
    const outcome = next ? 'Profilo riattivato: lo stesso codice è di nuovo utilizzabile.' : 'Profilo disattivato. Tutti i dati sono conservati.';
    try { await loadProfiles(); tell(outcome); }
    catch (_) { tell(outcome + ' Aggiorna l’elenco per vedere il nuovo stato.'); }
  } catch (error) { tell(error.message); }
  finally { managementBusy(false); }
}
function closeDeleteDialog() {
  if (el('deleteProfileDialog').open) el('deleteProfileDialog').close();
  deleteTarget = null;
  el('deleteProfileInput').value = '';
  el('deleteProfileMessage').textContent = '';
  el('deleteProfileSummary').textContent = '';
  el('deleteProfileExpected').textContent = '';
  el('deleteProfileConfirm').disabled = true;
}
function openDeleteDialog(profile) {
  if (managingProfile || !token) return;
  deleteTarget = profile;
  el('deleteProfileSummary').textContent = profileLabel(profile) + ' · ID COMPLETO: ' + profile.id;
  el('deleteProfileExpected').textContent = 'ELIMINA ' + profile.id.slice(0,8).toUpperCase();
  el('deleteProfileInput').value = ''; el('deleteProfileMessage').textContent = '';
  el('deleteProfileConfirm').disabled = true;
  el('deleteProfileDialog').showModal();
  el('deleteProfileInput').focus();
}
function validDeletionConfirmation() {
  return deleteTarget && el('deleteProfileInput').value.trim().toUpperCase()
    === 'ELIMINA ' + deleteTarget.id.slice(0,8).toUpperCase();
}
el('deleteProfileInput').addEventListener('input',() => {
  el('deleteProfileConfirm').disabled = managingProfile || !validDeletionConfirmation();
});
el('deleteProfileCancel').addEventListener('click',() => { if (!managingProfile) closeDeleteDialog(); });
el('deleteProfileDialog').addEventListener('cancel',event => {
  if (managingProfile) event.preventDefault(); else closeDeleteDialog();
});
el('deleteProfileForm').addEventListener('submit',async event => {
  event.preventDefault();
  if (managingProfile || !token || !validDeletionConfirmation()) return;
  const target = deleteTarget;
  const confirmation = el('deleteProfileInput').value.trim().toUpperCase();
  managementBusy(true);
  for (const id of ['deleteProfileConfirm','deleteProfileCancel','deleteProfileInput']) el(id).disabled = true;
  el('deleteProfileMessage').textContent = 'ELIMINAZIONE IN CORSO…';
  try {
    await request('/rest/v1/rpc/esploria_elimina_profilo',{p_profilo_id:target.id,p_conferma:confirmation},token);
    if (currentProfileId === target.id) {
      currentProfileId = null; currentCode = ''; el('newCode').textContent = ''; el('newProfile').textContent = '';
      el('savedCode').checked = false; el('codeCard').hidden = true;
    }
    closeDeleteDialog();
    const outcome = 'Profilo eliminato definitivamente con i suoi progressi e distintivi.';
    try { await loadProfiles(); tell(outcome); }
    catch (_) { tell(outcome + ' Aggiorna l’elenco per vedere la modifica.'); }
  } catch (error) {
    if (!token) tell(error.message);
    el('deleteProfileMessage').textContent = error.message
      + ' Se la connessione si è interrotta, annulla e aggiorna l’elenco prima di riprovare: il profilo potrebbe essere già stato eliminato.';
  } finally {
    managementBusy(false);
    el('deleteProfileCancel').disabled = false; el('deleteProfileInput').disabled = false;
    el('deleteProfileConfirm').disabled = !validDeletionConfirmation();
  }
});

/* STATISTICHE DELL’ESCAPE: accessibili solo all’insegnante autenticata. */
let statisticsGeneration=0,statisticsProfile=null,nextStatisticsOffset=null,statisticsLoading=false;
const roomNames={1:'AULA',2:'CORRIDOIO',3:'PALESTRA',4:'BIBLIOTECA'};
function statsNode(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n}
function statsTime(value){const seconds=Math.round(Math.max(0,Number(value)||0)/1000);return Math.floor(seconds/60)+' MIN '+String(seconds%60).padStart(2,'0')+' S'}
function statsDate(value){const date=new Date(value);return Number.isNaN(date.getTime())?'DATA NON DISPONIBILE':date.toLocaleString('it-IT')}
function ensureStatistics(){
 if(el('learningStats'))return el('learningStats');
 const style=statsNode('style');style.textContent='.statsSummary{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:18px 0}.statsMetric{background:#fffdf7;border:1px solid #d9c6a9;border-radius:12px;padding:12px}.statsMetric strong{display:block;font-size:28px;color:#486a63}.statsScroll{overflow-x:auto}.statsTable{width:100%;border-collapse:collapse;font-size:17px;min-width:560px}.statsTable th,.statsTable td{padding:9px;border-bottom:1px solid #d9c6a9;text-align:left;vertical-align:top;overflow-wrap:anywhere;max-width:320px}.statsRun{padding:14px 0;border-bottom:1px solid #d9c6a9}.statsRun summary{cursor:pointer;font-weight:bold}.statsNote{font-size:17px;line-height:1.4}.statsWrong{color:#923f30}.statsGood{color:#345e43}#learningStats{scroll-margin-top:20px}';document.head.append(style);
 const section=statsNode('section',undefined,'card');section.id='learningStats';section.hidden=true;
 const title=statsNode('h2');title.id='learningStatsTitle';
 const message=statsNode('p');message.id='learningStatsMessage';message.setAttribute('role','status');
 const note=statsNode('p','SONO REGISTRATE SOLTANTO LE RISPOSTE INSERITE NEL GIOCO. PER AULA E PALESTRA IL CODICE FINALE NON PERMETTE DI IDENTIFICARE L’OPERAZIONE SBAGLIATA SUL QUADERNO.','statsNote');
 const timeNote=statsNode('p','I TEMPI INDICANO LA PERMANENZA CON LA PAGINA VISIBILE, COMPRESE LETTURA ED ESPLORAZIONE. NON MISURANO DA SOLI LA COMPRENSIONE O L’IMPEGNO.','statsNote');
 const summary=statsNode('div',undefined,'statsSummary');summary.id='learningStatsSummary';
 const runs=statsNode('div');runs.id='learningStatsRuns';
 const more=statsNode('button','ALTRE PARTITE','secondary');more.id='learningStatsMore';more.type='button';more.hidden=true;more.addEventListener('click',()=>{if(statisticsProfile&&nextStatisticsOffset!==null&&!statisticsLoading)loadStatistics(nextStatisticsOffset)});
 const actions=statsNode('div',undefined,'profileActions');const refresh=statsNode('button','AGGIORNA STATISTICHE','secondary');refresh.type='button';refresh.addEventListener('click',()=>{if(statisticsProfile)loadStatistics(0)});const close=statsNode('button','CHIUDI','secondary');close.type='button';close.addEventListener('click',closeStatistics);actions.append(refresh,close);
 section.append(title,message,note,timeNote,summary,runs,more,actions);el('profiles').after(section);return section;
}
function closeStatistics(){statisticsGeneration++;statisticsProfile=null;nextStatisticsOffset=null;statisticsLoading=false;if(el('learningStats')){el('learningStats').hidden=true;el('learningStatsTitle').textContent='';el('learningStatsMessage').textContent='';el('learningStatsSummary').replaceChildren();el('learningStatsRuns').replaceChildren()}}
function openStatistics(profile){if(!token||managingProfile)return;ensureStatistics();statisticsProfile=profile;el('learningStats').hidden=false;el('learningStatsTitle').textContent='STATISTICHE · '+profileLabel(profile);el('learningStats').scrollIntoView?.({behavior:'smooth',block:'start'});loadStatistics(0)}
function statsTable(headers,rows){const wrap=statsNode('div',undefined,'statsScroll'),table=statsNode('table',undefined,'statsTable'),head=statsNode('thead'),tr=statsNode('tr');headers.forEach(h=>{const cell=statsNode('th',h);cell.scope='col';tr.append(cell)});head.append(tr);const body=statsNode('tbody');rows.forEach(cells=>{const row=statsNode('tr');cells.forEach(value=>row.append(statsNode('td',String(value??'—'))));body.append(row)});table.append(head,body);wrap.append(table);return wrap}
function renderRun(run){
 const details=statsNode('details',undefined,'statsRun');const status=run.completata_il?'COMPLETATA':'IN CORSO';details.append(statsNode('summary',statsDate(run.iniziata_il)+' · '+status+' · '+(roomNames[run.stanza]||'STANZA NON RILEVATA')));
 const t=run.telemetria;if(!t||t.versione!==1){details.append(statsNode('p','PARTITA AVVIATA PRIMA DELL’ATTIVAZIONE DELLE STATISTICHE: I TENTATIVI PRECEDENTI NON SONO DISPONIBILI.','statsNote'));return details}
 details.append(statsNode('p','RILEVAZIONE DAL '+statsDate(t.dal)+' · TEMPO CON PAGINA VISIBILE: '+statsTime(t.tempo_ms),'statsNote'));
 const roomTimes=Object.entries(t.stanze_ms||{}).map(([room,time])=>[roomNames[room]||room,statsTime(time)]);if(roomTimes.length)details.append(statsTable(['STANZA','TEMPO CON PAGINA VISIBILE'],roomTimes));
 const questions=Object.values(t.prove||{});if(questions.length){details.append(statsNode('h3','TENTATIVI PER PROVA'));details.append(statsTable(['STANZA / ARGOMENTO','QUESITO','TENTATIVI','ERRORI','CORRETTE'],questions.map(q=>[(roomNames[q.stanza]||'')+' · '+q.categoria,q.domanda,q.tentativi,q.errori,q.corrette])))}else details.append(statsNode('p','NON SONO ANCORA STATE INSERITE RISPOSTE.','statsNote'));
 const events=Array.isArray(t.eventi)?t.eventi:[];if(events.length){const attempts=statsNode('details');attempts.append(statsNode('summary','VEDI LE RISPOSTE INSERITE'));if((t.eventi_totali||0)>events.length)attempts.append(statsNode('p','SONO MOSTRATI GLI ULTIMI '+events.length+' TENTATIVI. I CONTATORI COMPRENDONO ANCHE QUELLI PRECEDENTI.','statsNote'));attempts.append(statsTable(['DATA','PROVA','RISPOSTA','RISPOSTA ATTESA','ESITO','TEMPO DAL PRECEDENTE TENTATIVO O APERTURA'],[...events].reverse().map(e=>[statsDate(e.quando),(roomNames[e.stanza]||'')+' · '+e.categoria,e.risposta,e.atteso,e.corretta?'CORRETTA':'DA RIVEDERE',statsTime(e.tempo_ms)])));details.append(attempts)}
 return details;
}
async function loadStatistics(offset){
 if(!token||!statisticsProfile)return;const requestId=++statisticsGeneration,selected=statisticsProfile,access=token;statisticsLoading=true;
 el('learningStatsMessage').textContent='CARICO LE STATISTICHE…';el('learningStatsMore').disabled=true;
 if(offset===0){el('learningStatsSummary').replaceChildren();el('learningStatsRuns').replaceChildren();el('learningStatsMore').hidden=true}
 try{
  const result=await request('/rest/v1/rpc/esploria_statistiche_escape',{p_profilo_id:selected.id,p_offset:offset,p_limite:10},access);
  if(requestId!==statisticsGeneration||token!==access)return;
  if(offset===0){const totals=result.totali||{};for(const [label,value] of [['PARTITE INIZIATE',totals.iniziate],['COMPLETATE',totals.completate],['TENTATIVI RILEVATI',totals.tentativi],['ERRORI RILEVATI',totals.errori],['RISPOSTE CORRETTE',totals.corrette]]){const box=statsNode('div',label,'statsMetric');box.append(statsNode('strong',String(value||0)));el('learningStatsSummary').append(box)}
   el('learningStatsMessage').textContent=totals.iniziate?'DATI DEI TENTATIVI DISPONIBILI PER '+(totals.con_dati||0)+' PARTITE.':'NESSUNA PARTITA DELL’ESCAPE ROOM AVVIATA.';
  }else el('learningStatsMessage').textContent='ALTRE PARTITE CARICATE.';
  (result.partite||[]).forEach(run=>el('learningStatsRuns').append(renderRun(run)));
  nextStatisticsOffset=result.prossimo_offset;el('learningStatsMore').hidden=nextStatisticsOffset===null||nextStatisticsOffset===undefined;
 }catch(error){if(requestId!==statisticsGeneration)return;el('learningStatsMessage').textContent=error.message+' Per le statistiche verifica di aver eseguito attiva-statistiche-escape.sql in Supabase.'}
 finally{if(requestId===statisticsGeneration){statisticsLoading=false;el('learningStatsMore').disabled=false}}
}
