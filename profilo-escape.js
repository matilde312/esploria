/* Da caricare dopo esploria-accesso.js ed esploria-escape.js, solo nella pagina profilo. */
(()=>{
 'use strict';let generation=0;
 const names={1:'AULA',2:'CORRIDOIO',3:'PALESTRA',4:'BIBLIOTECA'};
 const status=()=>document.querySelector('#escapeProfileStatus');
 function panel(){let section=document.querySelector('#escapeProfilePanel');if(section)return section;section=document.createElement('section');section.id='escapeProfilePanel';section.className='panel section';const title=document.createElement('h2');title.textContent='LA SCUOLA DEI NUMERI SCOMPARSI';const text=document.createElement('p');text.id='escapeProfileStatus';text.setAttribute('role','status');const link=document.createElement('a');link.id='escapeProfileLink';link.className='linkButton';link.href='escape-room-esploria.html?modalita=codice';link.textContent='APRI L’AVVENTURA';section.append(title,text,link);const stats=document.querySelector('#statsTitle')?.closest('section');if(stats)stats.after(section);else document.querySelector('#privateArea')?.append(section);return section}
 document.addEventListener('esploria:profilo-nascosto',()=>{generation++;document.querySelector('#escapeProfilePanel')?.remove();const metrics=document.querySelectorAll('.metrics .metric strong');for(let i=0;i<2;i++)if(metrics[i])metrics[i].textContent='—'});
 document.addEventListener('esploria:profilo-caricato',async()=>{
  const request=++generation;panel();status().textContent='CERCO I PROGRESSI DELLA TUA AVVENTURA…';
  try{if(!window.EsploriaEscape)throw new Error();const stats=await EsploriaEscape.readProfileStats();if(request!==generation)return;
   const metrics=document.querySelectorAll('.metrics .metric strong');if(metrics[0])metrics[0].textContent=String(stats.partite_iniziate);if(metrics[1])metrics[1].textContent=String(stats.completamenti);
   const note=document.querySelector('#statsTitle')?.closest('section')?.querySelector('.muted');if(note)note.textContent='STATISTICHE DELLA SCUOLA DEI NUMERI SCOMPARSI. GLI ALTRI GIOCHI SARANNO COLLEGATI IN SEGUITO.';
   const run=stats.partita,active=run&&!run.completata;document.querySelector('#escapeProfileLink').textContent=active?'RIPRENDI L’AVVENTURA':'INIZIA UNA NUOVA AVVENTURA';
   const completed=Number(stats.completamenti)||0,next=[1,5,10,20].find(n=>n>completed);
   status().textContent=(active?'TI ASPETTA LA STANZA: '+names[run.stanza]+'. ':'')+'AVVENTURE COMPLETATE: '+completed+'.'+(next?' PROSSIMO DISTINTIVO A '+next+' COMPLETAMENT'+(next===1?'O':'I')+'.':' HAI CONQUISTATO TUTTI I DISTINTIVI DELLA SCUOLA!');
  }catch(_){if(request===generation&&status())status().textContent='NON RIESCO A LEGGERE I PROGRESSI. RIPROVA CON “AGGIORNA IL MIO ANGOLO”.'}
 });
})();
