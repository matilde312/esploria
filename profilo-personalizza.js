(() => {
  'use strict';
  const get = id => document.getElementById(id);
  const dialog = get('companionEditor');
  const animals = [
    ['VOLPE','volpe'],['LUPO','lupo'],['CERVO','cervo'],['GUFO','gufo'],['CONIGLIO','coniglio'],['SCOIATTOLO','scoiattolo'],['PROCIONE','procione'],
    ['ORSO','orso'],['TASSO','tasso'],['LONTRA','lontra'],['RICCIO','riccio'],['CASTORO','castoro'],['LINCE','lince'],['GATTO SELVATICO','gatto-selvatico'],
    ['DRAGHETTO','draghetto'],['TARTARUGA','tartaruga'],['AQUILA','aquila'],['CORVO','corvo'],['FALCO','falco'],['CINGHIALE','cinghiale'],['CAPRIOLO','capriolo'],
    ['DELFINO','delfino'],['FOCA','foca'],['PANDA','panda'],['PANDA ROSSO','panda-rosso'],['PINGUINO','pinguino'],['ORSO POLARE','orso-polare'],['VOLPE ARTICA','volpe-artica']
  ];
  let profile = null, mode = null, saving = false, version = 0;
  animals.forEach((animal,index) => {
    const option = document.createElement('option');
    option.value = String(index); option.textContent = animal[0];
    get('newCompanionAnimal').append(option);
  });
  function preview() {
    const animal = animals[Number(get('newCompanionAnimal').value)];
    get('editorPreview').hidden = !animal;
    if (!animal) return;
    get('editorAnimalImage').src = 'schede/scheda-' + animal[1] + '.png';
    get('editorAnimalImage').alt = animal[0];
  }
  get('editorAnimalImage').addEventListener('error', () => { get('editorPreview').hidden = true; });
  function setBusy(value) {
    saving = value;
    for (const id of ['saveCompanionChanges','cancelCompanionChanges','newCompanionAnimal','newCompanionName']) get(id).disabled = value;
  }
  function clear() {
    version++;
    if (dialog.open) dialog.close();
    profile = null; mode = null;
    get('newCompanionName').value = '';
    get('editorAnimalImage').removeAttribute('src');
    get('editorMessage').textContent = '';
    setBusy(false);
  }
  document.addEventListener('esploria:profilo-caricato', event => { profile = event.detail; });
  document.addEventListener('esploria:profilo-nascosto', clear);
  function open(which) {
    if (!profile?.animale || !profile?.nome_personaggio || saving) return;
    version++; mode = which;
    get('editorTitle').textContent = which === 'nome' ? 'UN NUOVO NOME' : 'UN NUOVO COMPAGNO';
    get('editNameField').hidden = which !== 'nome';
    get('editAnimalField').hidden = which !== 'animale';
    get('newCompanionName').required = which === 'nome';
    get('newCompanionName').value = profile.nome_personaggio;
    get('newCompanionAnimal').value = String(animals.findIndex(a => a[0] === profile.animale));
    get('editorMessage').textContent = '';
    preview();
    dialog.showModal();
    get(which === 'nome' ? 'newCompanionName' : 'newCompanionAnimal').focus();
  }
  get('changeName').addEventListener('click',() => open('nome'));
  get('changeAnimal').addEventListener('click',() => open('animale'));
  get('newCompanionAnimal').addEventListener('change',preview);
  get('cancelCompanionChanges').addEventListener('click',() => {
    if (saving) return;
    version++; dialog.close();
  });
  dialog.addEventListener('cancel',event => {
    if (saving) event.preventDefault();
    else version++;
  });

  async function update(body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(),20000);
    let response;
    try {
      response = await fetch('https://eovmvcxvyhtbsxrjdmak.supabase.co/rest/v1/rpc/esploria_modifica_compagno',{
        method:'POST',headers:{'Content-Type':'application/json',apikey:'sb_publishable_wXXfLDRJLU3fZumfCYMHiA_qqL00eae'},
        body:JSON.stringify(body),signal:controller.signal
      });
    } catch (_) {
      throw new Error('NON RIESCO A COLLEGARMI. RIPROVA O ANNULLA E AGGIORNA IL PROFILO PER CONTROLLARE SE LA SCELTA È STATA SALVATA.');
    } finally { clearTimeout(timer); }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (data?.message === 'CODICE_NON_VALIDO') throw new Error('IL CODICE NON È PIÙ VALIDO. TORNA ALL’ACCESSO O CHIEDI AIUTO ALL’INSEGNANTE.');
      if (data?.message === 'SCELTA_NON_VALIDA') throw new Error('SCEGLI UN COMPAGNO O SCRIVI UN NOME DA 1 A 20 CARATTERI.');
      if (data?.message === 'SCELTA_INIZIALE_NECESSARIA') throw new Error('SCEGLI PRIMA IL TUO COMPAGNO DALLA PAGINA DEGLI ANIMALI.');
      throw new Error('NON RIESCO A SALVARE. CHIEDI ALL’INSEGNANTE DI CONTROLLARE L’AGGIORNAMENTO DEL PROFILO.');
    }
    return data;
  }
  get('companionEditorForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || !profile || !mode) return;
    let code;
    try { code = sessionStorage.getItem('esploria-accesso-codice-v1'); } catch (_) {}
    if (!code) { get('editorMessage').textContent = 'TORNA ALL’ACCESSO E INSERISCI IL TUO CODICE.'; return; }
    const name = get('newCompanionName').value.trim().toUpperCase();
    const index = Number(get('newCompanionAnimal').value);
    if (mode === 'nome' && (!name || name.length > 20)) { get('editorMessage').textContent = 'SCRIVI UN NOME DA 1 A 20 CARATTERI.'; return; }
    if (mode === 'animale' && (!Number.isInteger(index) || index < 0 || index >= animals.length)) { get('editorMessage').textContent = 'SCEGLI UN COMPAGNO.'; return; }
    const requestVersion = version;
    setBusy(true); get('editorMessage').textContent = 'SALVO LA TUA SCELTA…';
    try {
      // Si invia soltanto il campo modificato: l’altro rimane quello online.
      const body = mode === 'nome' ? {p_codice:code,p_nome:name} : {p_codice:code,p_indice:index};
      const result = await update(body);
      if (requestVersion !== version) return;
      if (sessionStorage.getItem('esploria-accesso-codice-v1') !== code) return;
      try {
        localStorage.setItem('esploria-compagno-prova',JSON.stringify({
          animal:result.animale,index:animals.findIndex(a => a[0] === result.animale),name:result.nome_personaggio
        }));
      } catch (_) {}
      dialog.close();
      document.dispatchEvent(new CustomEvent('esploria:compagno-modificato',{detail:result}));
    } catch (error) {
      if (requestVersion === version) get('editorMessage').textContent = error.message;
    } finally { if (requestVersion === version) setBusy(false); }
  });
})();
