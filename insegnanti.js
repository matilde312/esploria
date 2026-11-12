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
  closeStatistics();closePortoStatistics();closeGrammarStatistics();closeNameEditor();resetTeamAccess();
  document.querySelectorAll('details.discipline').forEach(section=>{section.open=false;});
  profilesGeneration++;appliedClass='A'; el('classSummary').textContent='';el('classHint').textContent='';el('classFilter').value='A';
  token = null; currentCode = ''; currentProfileId = null; activeProfiles = [];
  closeDeleteDialog();
  resetBadgeImage();
  for (const id of ['chosenCode','newChildName','password','badgeTitle','badgeDescription']) el(id).value = '';
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
      CLASSE_NON_VALIDA:'SCEGLI A, B, C O PROVA.',
      PROFILO_NON_AUTORIZZATO:'QUESTO PROFILO NON È DISPONIBILE NELLA CLASSE SELEZIONATA.',
      NOME_NON_VALIDO:'SCRIVI UN NOME DI MASSIMO 80 CARATTERI.',
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
    if(path.includes('esploria_profili_con_classi')||path.includes('esploria_assegna_classe')||path.includes('esploria_crea_codice_classe')||path.includes('esploria_statistiche_classe')){
      const reference=String(data?.code||response.status);
      const reasons={PGRST202:'LA FUNZIONE RICHIESTA NON RISULTA DISPONIBILE. CONTROLLA L’ESITO DI attiva-classi.sql.',PGRST203:'SONO PRESENTI VERSIONI AMBIGUE DELLA FUNZIONE DELLE CLASSI.', '42883':'UNA FUNZIONE RICHIESTA DALLE STATISTICHE MANCA O HA PARAMETRI DIVERSI.', '42703':'LE STATISTICHE RICHIEDONO UN CAMPO DIVERSO DA QUELLO PRESENTE NELL’ARCHIVIO.', '42725':'ESISTONO PIÙ VERSIONI INCOMPATIBILI DELLA FUNZIONE.', '22P02':'UN DATO DELLE STATISTICHE HA UN FORMATO NON PREVISTO.', '22023':'LA STRUTTURA DEI DATI DELLE STATISTICHE NON È QUELLA PREVISTA.'};
      const message=String(data?.message||'NESSUN DETTAGLIO RESTITUITO.').slice(0,400);
      throw new Error((reasons[reference]||'IL SERVIZIO DELLE CLASSI HA RESTITUITO UN ERRORE.')+' RIFERIMENTO: '+reference+' · '+message);
    }
    throw new Error('Operazione non riuscita. Verifica di aver eseguito gli aggiornamenti SQL, incluso 009-gestione-profili.sql, in Supabase.');
  }
  return data;
}
async function loadProfiles() {
  const access=token,generation=++profilesGeneration;
  const allProfiles = await request('/rest/v1/rpc/esploria_profili_con_classi',{},access);
  if(token!==access||generation!==profilesGeneration)return;
  updateClassSummary(allProfiles);
  const profiles=allProfiles.filter(inSelectedClass);
  const previous = el('badgeProfile').value;
  activeProfiles = profiles.filter(p => p.attivo);
  el('badgeProfile').replaceChildren(); el('profiles').replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = ''; placeholder.textContent = 'SCEGLI UN PROFILO'; el('badgeProfile').append(placeholder);
  el('empty').hidden = profiles.length !== 0;
  for (const profile of profiles) {
    const li = document.createElement('li'), title = document.createElement('strong'), detail = document.createElement('small');
    title.textContent = profile.nome_riservato || profile.nome_personaggio || 'NOME DEL BAMBINO DA INSERIRE';
    detail.textContent = (profile.nome_personaggio ? 'Compagno: '+profile.nome_personaggio+' · ' : '') + (profile.attivo ? 'Attivo' : 'Sospeso')+' · '+(profile.classe?classLabel(profile.classe):'Da assegnare');
    const actions = document.createElement('div'); actions.className = 'profileActions';
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'secondary';
    toggle.textContent = profile.attivo ? 'DISATTIVA' : 'RIATTIVA';
    toggle.disabled = managingProfile;
    toggle.addEventListener('click',() => toggleProfile(profile));
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger';
    remove.textContent = 'ELIMINA DEFINITIVAMENTE'; remove.disabled = managingProfile;
    remove.addEventListener('click',() => openDeleteDialog(profile));
    const statsButton=document.createElement('button');statsButton.type='button';statsButton.className='secondary';statsButton.textContent='BORGO · MATEMATICA';statsButton.disabled=managingProfile;statsButton.addEventListener('click',()=>selectBorgoProfile(profile.id));
    const nameButton=document.createElement('button');nameButton.type='button';nameButton.className='secondary';nameButton.textContent=profile.nome_riservato?'MODIFICA NOME RISERVATO':'INSERISCI NOME RISERVATO';nameButton.disabled=managingProfile;nameButton.addEventListener('click',()=>openNameEditor(profile));
    const portoButton=document.createElement('button');portoButton.type='button';portoButton.className='secondary';portoButton.textContent='PORTO · INGLESE';portoButton.disabled=managingProfile;portoButton.addEventListener('click',()=>selectPortoProfile(profile.id));
    const grammarButton=node('button','OFFICINA · GRAMMATICA','secondary');grammarButton.type='button';grammarButton.disabled=managingProfile;grammarButton.addEventListener('click',()=>selectGrammarProfile(profile.id));
    statsButton.textContent='Matematica';portoButton.textContent='Inglese';grammarButton.textContent='Italiano';
    actions.append(statsButton,portoButton,grammarButton);
    li.append(title,detail,actions);
    if(!collaborator()){const management=document.createElement('details');management.className='profileManagement';const summary=document.createElement('summary');summary.textContent='Gestisci profilo';const tools=document.createElement('div');tools.className='profileActions';tools.append(nameButton,toggle,remove);management.append(summary,classAssignmentControl(profile),tools);li.append(management);}
    el('profiles').append(li);
    if (profile.attivo) {
      const option = document.createElement('option'); option.value = profile.id;
      option.textContent = (profile.nome_riservato || profile.nome_personaggio || 'COMPAGNO NON ANCORA SCELTO') + (profile.animale ? ' · ' + profile.animale : '') + ' · ' + profile.id.slice(0,8);
      el('badgeProfile').append(option);
    }
  }
  if (activeProfiles.some(p => p.id === previous)) el('badgeProfile').value = previous;
  populateGrammarProfiles(profiles);
  loadGrammarStatistics();
  populatePortoProfiles(profiles);
  loadPortoStatistics();
  populateBorgoProfiles(profiles);
  loadBorgoStatistics();
  updateAwardButton();
}
el('loginForm').addEventListener('submit',async event => {
  event.preventDefault(); if (busy) return;
  busy = true; el('loginButton').disabled = true; tell('ACCESSO IN CORSO…');
  try {
    const session = await request('/auth/v1/token?grant_type=password',{email:el('email').value.trim(),password:el('password').value});
    token = session.access_token; el('password').value = '';
    if(!await prepareTeacherAccess())return;
    await loadProfiles(); el('loginForm').hidden = true; el('dashboard').hidden = false; tell('');
  } catch (error) { clearSession(); tell(error.message); }
  finally { busy = false; el('loginButton').disabled = false; }
});
el('chooseCodeForm').addEventListener('submit',async event => {
  event.preventDefault(); if (creating) return;
  if (currentCode && !el('savedCode').checked) { tell('Conserva prima il codice mostrato e seleziona «HO CONSERVATO QUESTO CODICE».'); return; }
  const chosen = el('chosenCode').value.trim().toUpperCase(), normalized = chosen.replace(/[\s-]/g,'');
  if (!/^[A-Z0-9]{10,32}$/.test(normalized) || !/[A-Z]/.test(normalized) || !/[0-9]/.test(normalized)) { tell('Scegliete da 10 a 32 lettere e numeri, con almeno una lettera e un numero. Spazi e trattini non contano.'); el('chosenCode').focus(); return; }
  creating = true; el('createButton').disabled = true; el('chosenCode').disabled = true; el('newChildName').disabled=true; el('newProfileClass').disabled=true;el('classFilter').disabled=true; tell('CREAZIONE IN CORSO…');
  try {
    const result = await request('/rest/v1/rpc/esploria_crea_codice_classe',{p_codice:chosen,p_nome:el('newChildName').value.trim(),p_classe:el('newProfileClass').value},token);
    currentProfileId = result.id;
    currentCode = result.codice; el('chosenCode').value = ''; el('newChildName').value=''; el('newCode').textContent = result.codice; el('newProfile').textContent = 'Profilo ' + result.id;
    el('savedCode').checked = false; el('codeCard').hidden = false; tell('Codice creato. Conservalo insieme al riferimento del profilo.');
    try { await loadProfiles(); } catch (_) { tell('Codice creato. Conservalo; premi AGGIORNA ELENCO per aggiornare i profili.'); }
  } catch (error) { tell(error.message); }
  finally { creating = false; el('createButton').disabled = false; el('chosenCode').disabled = false; el('newChildName').disabled=false;el('newProfileClass').disabled=false;el('classFilter').disabled=false; }
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
  return (profile.nome_riservato || profile.nome_personaggio || 'COMPAGNO NON ANCORA SCELTO')
    + (profile.animale ? ' · ' + profile.animale : '')
    + ' · PROFILO ' + profile.id.slice(0,8).toUpperCase();
}
function managementBusy(value) {
  managingProfile = value;
  el('classFilter').disabled=value;
  el('profiles').querySelectorAll('button,select').forEach(button => { button.disabled = value; });
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

/* BORGO DEGLI INGRANAGGI: un unico quadro per la disciplina. */
let borgoGeneration=0,nameGeneration=0,nameTarget=null,nameSaving=false;
function node(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(className)n.className=className;return n}
function closeStatistics(){borgoGeneration++;if(typeof closeMisureStatistics==='function')closeMisureStatistics();el('borgoContent').replaceChildren();el('borgoStatus').textContent='';el('borgoProfile').replaceChildren(new Option('TUTTI I PROFILI · '+classLabel(),''));}
function populateBorgoProfiles(profiles){const previous=el('borgoProfile').value;el('borgoProfile').replaceChildren(new Option('TUTTI I PROFILI · '+classLabel(),''));for(const p of profiles){el('borgoProfile').append(new Option((p.nome_riservato||p.nome_personaggio||'PROFILO SENZA NOME')+' · '+p.id.slice(0,8).toUpperCase(),p.id))}if(profiles.some(p=>p.id===previous))el('borgoProfile').value=previous;}
function selectBorgoProfile(id){el('borgoStats').open=true;el('portoStats').open=false;el('borgoProfile').value=id;el('borgoStats').scrollIntoView?.({behavior:'smooth',block:'start'});loadBorgoStatistics();}
function metric(label,value){const box=node('div',undefined,'borgoMetric');box.append(node('span',label),node('strong',Number(value||0).toLocaleString('it-IT')));return box;}
function table(headers,rows){const wrap=node('div',undefined,'borgoScroll'),t=node('table',undefined,'borgoTable'),head=node('thead'),hr=node('tr'),body=node('tbody');headers.forEach(label=>{const th=node('th',label);th.scope='col';hr.append(th)});head.append(hr);rows.forEach(cells=>{const tr=node('tr');cells.forEach(cell=>{const td=node('td');if(cell instanceof Node)td.append(cell);else td.textContent=String(cell??'—');tr.append(td)});body.append(tr)});t.append(head,body);wrap.append(t);return wrap;}
function renderBorgo(data){const root=el('borgoContent');root.replaceChildren();const total=data.totali;
 const title=node('h3',data.profilo_id?(data.alunni[0]?.nome_riservato||data.alunni[0]?.compagno||'PROFILO SELEZIONATO'):'PANORAMICA · '+classLabel());root.append(title);
 const metrics=node('div',undefined,'borgoMetrics');for(const [label,value] of [['PERCORSI INIZIATI',total.iniziate],['PERCORSI COMPLETATI',total.completate],['IN CORSO',total.in_corso],['TENTATIVI RILEVATI',total.tentativi],['CORRETTI',total.corrette],['DA RIVEDERE',total.errori]])metrics.append(metric(label,value));root.append(metrics);
 if(!Number(total.tentativi))root.append(node('p','NON CI SONO ANCORA TENTATIVI REGISTRATI. I GRAFICI SI RIEMPIRANNO CON LE PROSSIME ATTIVITÀ.','borgoNote'));
 if(Number(total.senza_telemetria))root.append(node('p',total.senza_telemetria+' PERCORSI PRECEDENTI NON HANNO IL DETTAGLIO DEI TENTATIVI. NON VENGONO CONSIDERATI COME ZERO ERRORI.','borgoNote'));
 const chart=node('section',undefined,'borgoChart');chart.setAttribute('aria-label','ISTOGRAMMA DEI TENTATIVI PER ABILITÀ MATEMATICA');chart.append(node('h3','+ − × ? · LE ABILITÀ MATEMATICHE'));
 const legend=node('div',undefined,'borgoLegend');for(const [text,cls] of [['CORRETTI','borgoCorrect'],['DA RIVEDERE','borgoError']]){const item=node('span');const dot=node('span',undefined,'borgoDot '+cls);dot.setAttribute('aria-hidden','true');item.append(dot,document.createTextNode(text));legend.append(item)}chart.append(legend);
 const max=Math.max(1,...data.abilita.map(a=>Number(a.tentativi)));for(const a of data.abilita){const row=node('div',undefined,'borgoBarRow');const label=node('div',undefined,'borgoBarLabel');label.append(node('span',a.simbolo+' '+a.titolo),node('span',Number(a.tentativi)?a.tentativi+' TENTATIVI':'NESSUN DATO'));const track=node('div',undefined,'borgoTrack');track.setAttribute('aria-hidden','true');for(const [cls,value]of[['borgoCorrect',a.corrette],['borgoError',a.errori]]){const part=node('span',undefined,cls);part.style.width=(100*Number(value)/max)+'%';track.append(part)}row.append(label,track,node('small',Number(a.tentativi)?a.corrette+' CORRETTI · '+a.errori+' DA RIVEDERE':'IN ATTESA DELLE PRIME RISPOSTE'));chart.append(row)}root.append(chart);
 root.append(table(['ABILITÀ','TENTATIVI','CORRETTI','DA RIVEDERE','AL PRIMO TENTATIVO¹'],data.abilita.map(a=>[a.titolo,a.tentativi,a.corrette,a.errori,Number(a.prime_note)?a.prime_corrette+' / '+a.prime_note:'—'])));
 root.append(node('p','¹ IL PRIMO TENTATIVO È RILEVATO NELLE PROVE DI CALCOLO E NELLE MOLTIPLICAZIONI. PER GLI ENIGMI USIAMO I CONTATORI DEI TENTATIVI E DEGLI ERRORI DISPONIBILI. UN CODICE ERRATO NON IDENTIFICA LA SINGOLA OPERAZIONE SBAGLIATA.','borgoNote'));
 root.append(node('p','LE ADDIZIONI E LE SOTTRAZIONI COMPRENDONO LE RICHIESTE SU UNITÀ, DECINE, CENTINAIA E MIGLIAIA. MOLTIPLICAZIONI E DIVISIONI SVOLTE SUL QUADERNO NON VENGONO DEDOTTE DAL CODICE DELLA PORTA.','borgoNote'));
 if(data.ordini.length){root.append(node('h3','U · DA · H · UK · DAK · HK'));const boxes=node('div',undefined,'borgoOrder'),orders=['UNITÀ','DECINE','CENTINAIA','UNITÀ DI MIGLIAIA','DECINE DI MIGLIAIA','CENTINAIA DI MIGLIAIA'];for(const o of data.ordini)boxes.append(node('span',(orders[Number(o.ordine)]||'ALTRO')+': '+o.errori+' DA RIVEDERE / '+o.tentativi+' TENTATIVI'));root.append(boxes)}
 if(data.tabelline?.length){root.append(node('h3','× · LE TABELLINE'));root.append(table(['TABELLINA DA CERCARE','TENTATIVI','CORRETTI','DA RIVEDERE'],data.tabelline.map(t=>[t.tabellina,t.tentativi,t.corrette,t.errori])));root.append(node('p','IL DETTAGLIO SI RIFERISCE ALLA TABELLINA DELL’OPERAZIONE DA INDIVIDUARE.','borgoNote'));}
 const weeks=node('section',undefined,'borgoChart');weeks.append(node('h3','IL PERCORSO NEL TEMPO'),node('p','PERCORSI COMPLETATI NELLE ULTIME SEI SETTIMANE','borgoNote'));const maxWeek=Math.max(1,...data.settimane.map(s=>Number(s.completate)));for(const s of data.settimane){const row=node('div',undefined,'borgoWeek'),date=new Date(s.settimana);const bar=node('div',undefined,'borgoTrack'),fill=node('span',undefined,'borgoCorrect');fill.style.width=(100*Number(s.completate)/maxWeek)+'%';bar.setAttribute('aria-hidden','true');bar.append(fill);row.append(node('span',date.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',timeZone:'Europe/Rome'})),bar,node('span',s.completate));weeks.append(row)}root.append(weeks);
 if(!data.profilo_id){root.append(node('h3','I BAMBINI DEL BORGO'));root.append(table(['BAMBINO / COMPAGNO','PERCORSI COMPLETATI','TENTATIVI','DA RIVEDERE',''],data.alunni.map(p=>{const name=node('span',p.nome_riservato||p.compagno||'NOME DA INSERIRE');if(p.nome_riservato&&p.compagno)name.append(node('small','COMPAGNO: '+p.compagno));const open=node('button','VEDI','secondary');open.type='button';open.setAttribute('aria-label','VEDI I DATI DI '+(p.nome_riservato||p.compagno||p.id));open.addEventListener('click',()=>selectBorgoProfile(p.id));return [name,p.completate+' / '+p.iniziate,p.tentativi,p.errori,open]})))}
 root.append(node('p','TUTTI I DATI SONO RIUNITI PER BORGO DEGLI INGRANAGGI · MATEMATICA. I CONTEGGI DESCRIVONO LE RISPOSTE REGISTRATE E NON COSTITUISCONO UN VOTO.','borgoNote'));
}
async function loadBorgoStatistics(){if(!token)return;const generation=++borgoGeneration,access=token,id=el('borgoProfile').value;if(typeof loadMisureStatistics==='function')loadMisureStatistics(access,id,generation);el('borgoContent').replaceChildren();el('borgoStatus').textContent='CARICO I PROGRESSI DEL BORGO…';el('borgoRefresh').disabled=true;try{const data=await request('/rest/v1/rpc/esploria_statistiche_classe',{p_materia:'matematica',p_classe:selectedClass(),p_profilo_id:id||null},access);if(generation!==borgoGeneration||access!==token)return;renderBorgo(data);el('borgoStatus').textContent='DATI AGGIORNATI · '+classLabel()+' · '+(id?'BAMBINO SELEZIONATO':'TUTTI I PROFILI');}catch(error){if(generation===borgoGeneration&&access===token)el('borgoStatus').textContent=error.message;}finally{if(generation===borgoGeneration)el('borgoRefresh').disabled=false;}}
function openNameEditor(profile){if(!token||managingProfile)return;nameGeneration++;nameTarget=profile;el('childNameProfile').textContent='PROFILO '+profile.id.slice(0,8).toUpperCase()+(profile.nome_personaggio?' · COMPAGNO: '+profile.nome_personaggio:'');el('childNameInput').value=profile.nome_riservato||'';el('childNameMessage').textContent='';nameSaving=false;el('saveChildName').disabled=false;el('cancelChildName').disabled=false;el('childNameInput').disabled=false;el('childNameDialog').showModal();el('childNameInput').focus();}
function closeNameEditor(){nameGeneration++;nameTarget=null;nameSaving=false;el('childNameDialog').close();el('childNameInput').value='';el('childNameProfile').textContent='';el('childNameMessage').textContent='';}
el('childNameForm').addEventListener('submit',async event=>{event.preventDefault();if(!nameTarget||nameSaving||!token)return;const target=nameTarget,generation=++nameGeneration,access=token;nameSaving=true;el('saveChildName').disabled=true;el('cancelChildName').disabled=true;el('childNameInput').disabled=true;el('childNameMessage').textContent='SALVO IL NOME RISERVATO…';try{await request('/rest/v1/rpc/esploria_salva_nome_riservato',{p_profilo_id:target.id,p_nome:el('childNameInput').value.trim()},access);if(generation!==nameGeneration||access!==token)return;closeNameEditor();await loadProfiles();if(access===token)tell('NOME RISERVATO SALVATO.');}catch(error){if(generation===nameGeneration&&access===token)el('childNameMessage').textContent=error.message;}finally{if(generation===nameGeneration){nameSaving=false;el('saveChildName').disabled=false;el('cancelChildName').disabled=false;el('childNameInput').disabled=false;}}});
el('cancelChildName').addEventListener('click',()=>{if(!nameSaving)closeNameEditor()});el('childNameDialog').addEventListener('cancel',event=>{event.preventDefault();if(!nameSaving)closeNameEditor()});
el('borgoProfile').addEventListener('change',loadBorgoStatistics);el('borgoRefresh').addEventListener('click',loadBorgoStatistics);

/* Materie richiudibili: una sola disciplina aperta per volta. */
document.querySelectorAll('details.discipline').forEach(section=>{
 section.addEventListener('toggle',()=>{
  if(section.open)document.querySelectorAll('details.discipline').forEach(other=>{if(other!==section)other.open=false;});
 });
});
