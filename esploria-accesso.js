/* Configurazione pubblica: non contiene password o chiavi amministrative. */
window.EsploriaAccesso = (() => {
  'use strict';
  const url = 'https://eovmvcxvyhtbsxrjdmak.supabase.co';
  const key = 'sb_publishable_wXXfLDRJLU3fZumfCYMHiA_qqL00eae';
  const sessionKey = 'esploria-accesso-codice-v1';
  const companionKey = 'esploria-compagno-prova';
  const animals = [
    'VOLPE','LUPO','CERVO','GUFO','CONIGLIO','SCOIATTOLO','PROCIONE',
    'ORSO','TASSO','LONTRA','RICCIO','CASTORO','LINCE','GATTO SELVATICO',
    'DRAGHETTO','TARTARUGA','AQUILA','CORVO','FALCO','CINGHIALE','CAPRIOLO',
    'DELFINO','FOCA','PANDA','PANDA ROSSO','PINGUINO','ORSO POLARE','VOLPE ARTICA'
  ];

  function normalizza(value) {
    return String(value).replace(/[\s-]/g, '').toUpperCase();
  }

  function codiceSessione() {
    try { return sessionStorage.getItem(sessionKey) || ''; }
    catch (_) { return ''; }
  }

  function cancellaSessione() {
    try { sessionStorage.removeItem(sessionKey); } catch (_) {}
  }

  async function rpc(name, args) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let response;
    try {
      response = await fetch(url + '/rest/v1/rpc/' + name, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', apikey: key},
        body: JSON.stringify(args), signal: controller.signal
      });
    } catch (_) {
      throw new Error('NON RIESCO A COLLEGARMI. CONTROLLA INTERNET E RIPROVA.');
    } finally { clearTimeout(timeout); }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (data?.message === 'CODICE_NON_VALIDO') {
        throw new Error('QUESTO CODICE NON È VALIDO. CONTROLLALO O CHIEDI ALL’INSEGNANTE.');
      }
      if (data?.message === 'SCELTA_NON_VALIDA') {
        throw new Error('SCEGLI IL COMPAGNO E UN NOME DA 1 A 20 CARATTERI.');
      }
      throw new Error('L’ACCESSO NON È DISPONIBILE. CHIEDI ALL’INSEGNANTE DI CONTROLLARE IL COLLEGAMENTO.');
    }
    return data;
  }

  function aggiornaCompagno(profilo) {
    if (!profilo.animale || !profilo.nome_personaggio) return null;
    const companion = {
      animal: profilo.animale,
      index: animals.indexOf(profilo.animale),
      name: profilo.nome_personaggio
    };
    // Compatibilità con la pagina mondo esistente: la fonte resta l’archivio online.
    try { localStorage.setItem(companionKey, JSON.stringify(companion)); } catch (_) {}
    return companion;
  }

  async function entra(value) {
    const code = normalizza(value);
    if (!/^[0-9A-F]{16}$/.test(code)) {
      throw new Error('SCRIVI IL CODICE COMPLETO CHE TI HA DATO L’INSEGNANTE.');
    }
    // Nessun codice precedente deve restare attivo se cambia il giocatore.
    cancellaSessione();
    const profile = await rpc('esploria_apri_partita', {p_codice: code});
    try { sessionStorage.setItem(sessionKey, code); }
    catch (_) {
      throw new Error('IL BROWSER NON CONSENTE L’ACCESSO. CHIEDI AIUTO ALL’INSEGNANTE.');
    }
    aggiornaCompagno(profile);
    return profile;
  }

  async function carica() {
    const code = codiceSessione();
    if (!code) throw new Error('TORNA ALL’ACCESSO E INSERISCI IL TUO CODICE.');
    const profile = await rpc('esploria_apri_partita', {p_codice: code});
    aggiornaCompagno(profile);
    return profile;
  }

  async function scegli(index, name) {
    const code = codiceSessione();
    if (!code) throw new Error('TORNA ALL’ACCESSO E INSERISCI IL TUO CODICE.');
    const profile = await rpc('esploria_scegli_compagno', {
      p_codice: code, p_indice: index, p_nome: name
    });
    aggiornaCompagno(profile);
    return profile;
  }

  return {entra, carica, scegli, cancellaSessione, normalizza};
})();
