/* Stesse regole del percorso online; l’ospite conserva soltanto su questo dispositivo. */
const EsploriaAngoliGuest=(()=>{'use strict';const D=EsploriaAngoli;
function apply(run,action,d={}){const q=run.questions[run.position];if(!q)throw Error('TAPPA_NON_ATTIVA');if(action==='avanti'){if(!run.solved)throw Error('TAPPA_DA_COMPLETARE');run.position++;run.solved=false;return;}
if(run.solved)throw Error('TAPPA_GIA_COMPLETATA');
if(action==='aiuto'){if(!q.hinted){q.hinted=true;run.hints++;}if(q.category==='misura'){q.placed=true;q.assisted=true;q.tool={x:350,y:270,rotation:D.target(q)};}return;}
if(action==='posiziona'){if(q.category!=='misura'||q.placed)throw Error('STRUMENTO_NON_SPOSTABILE');const result=D.placement(q,d);q.placeAttempts++;q.placeErrors+=result.correct?0:1;q.placeFirst??=result.correct;q.placed=result.correct;q.tool={...d};q.placeResult=!result.center?'centro':!result.aligned?'allineamento':'pronto';return;}
if(action!=='scegli')throw Error('AZIONE_NON_VALIDA');if(q.category==='misura'&&!q.placed)throw Error('PRIMA_POSIZIONA_IL_GONIOMETRO');const ok=D.check(q,d);q.lastData={...d};if(q.category==='misura'){const rightScale=d.scale===(q.sense===1?'A':'B');q.scaleErrors+=rightScale?0:1;q.supplementErrors+=d.degrees===180-q.angle&&d.degrees!==q.angle?1:0;q.feedback=!rightScale?'scala':!ok?'lettura':'corretto';}else q.feedback=ok?'corretto':'apertura';q.attempts++;q.errors+=ok?0:1;q.solved=ok;run.attempts++;run.errors+=ok?0:1;run.solved=ok;}
return{apply};})();
