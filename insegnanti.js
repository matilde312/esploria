'use strict';
const el = id => document.getElementById(id);
const config = {supabaseUrl:'https://eovmvcxvyhtbsxrjdmak.supabase.co',supabasePublishableKey:'sb_publishable_wXXfLDRJLU3fZumfCYMHiA_qqL00eae'};
let token = null, currentCode = '', creating = false, busy = false, awarding = false;
let badgeImageData = null, imageLoading = false, imageGeneration = 0;
let activeProfiles = [];
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
  token = null; currentCode = ''; activeProfiles = [];
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
      DISTINTIVO_GIA_PRESENTE:'Questo profilo ha già un distintivo con lo stesso nome.',
      DISTINTIVO_NON_VALIDO:'Controlla il nome, il messaggio e il simbolo del distintivo.',
      IMMAGINE_NON_VALIDA:'L’immagine non è valida. Scegli un altro file PNG, JPG o WEBP.',
      CODICE_GIA_USATO:'Questo codice è già usato. Scegliete un’altra combinazione.',
      FORMATO_CODICE_NON_VALIDO:'Usa da 10 a 32 lettere e numeri, con almeno una lettera e un numero. Spazi e trattini non contano.'
    };
    if (messages[data?.message]) throw new Error(messages[data.message]);
    if (path.includes('/auth/v1/token')) throw new Error('Accesso non riuscito. Controlla email e password.');
    throw new Error('Operazione non riuscita. Verifica di aver eseguito gli aggiornamenti SQL, incluso 007-immagini-distintivi.sql, in Supabase.');
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
    detail.textContent = 'Profilo ' + profile.id + (profile.animale ? ' · ' + profile.animale : '') + (profile.attivo ? '' : ' · DISATTIVATO');
    li.append(title,detail); el('profiles').append(li);
    if (profile.attivo) {
      const option = document.createElement('option'); option.value = profile.id;
      option.textContent = (profile.nome_personaggio || 'COMPAGNO NON ANCORA SCELTO') + (profile.animale ? ' · ' + profile.animale : '') + ' · ' + profile.id.slice(0,8);
      el('badgeProfile').append(option);
    }
  }
  if (activeProfiles.some(p => p.id === previous)) el('badgeProfile').value = previous;
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
  if (creating || busy || awarding || imageLoading) { tell('Attendi che l’operazione finisca prima di uscire.'); return; }
  if (currentCode && !el('savedCode').checked && !window.confirm('Hai conservato il codice? Uscendo non potrai più visualizzarlo.')) return;
  const oldToken = token; clearSession(); tell('SEI USCITA.');
  try { await request('/auth/v1/logout',{},oldToken); } catch (_) {}
});
window.addEventListener('beforeunload',event => { if (creating || awarding || imageLoading || (currentCode && !el('savedCode').checked)) { event.preventDefault(); event.returnValue = ''; } });
