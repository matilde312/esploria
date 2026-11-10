/* Catalogo condiviso con la migrazione SQL. Quantità sempre divisibili per porzioni intere. */
(function(root){
'use strict';
const ingredients={
 flour:{name:'flour',it:'farina',portion:100,unit:'g',sprite:0},
 egg:{name:'egg',plural:'eggs',it:'uovo',portion:1,unit:'',sprite:1},
 milk:{name:'milk',it:'latte',portion:50,unit:'ml',sprite:2},
 sugar:{name:'sugar',it:'zucchero',portion:50,unit:'g',sprite:3},
 butter:{name:'butter',it:'burro',portion:25,unit:'g',sprite:4},
 water:{name:'water',it:'acqua',portion:50,unit:'ml',sprite:5},
 tomato:{name:'tomato',plural:'tomatoes',it:'pomodoro',portion:1,unit:'',sprite:6},
 cheese:{name:'cheese',it:'formaggio',portion:50,unit:'g',sprite:7},
 apple:{name:'apple',plural:'apples',it:'mela',portion:1,unit:'',sprite:8},
 chocolate:{name:'chocolate',it:'cioccolato',portion:25,unit:'g',sprite:9},
 strawberry:{name:'strawberry',plural:'strawberries',it:'fragola',portion:1,unit:'',sprite:10},
 oil:{name:'oil',it:'olio',portion:10,unit:'ml',sprite:11}
};
const recipes=[
 {id:'cake',name:'Harbour cake',it:'La torta del porto',dish:'🎂',items:[['flour',200],['egg',2],['milk',100],['sugar',100]],actions:['mix','bake','decorate']},
 {id:'cookies',name:'Chocolate cookies',it:'I biscotti dei marinai',dish:'🍪',items:[['flour',200],['butter',50],['sugar',50],['chocolate',50]],actions:['mix','roll','bake']},
 {id:'pizza',name:'Sailor’s pizza',it:'La pizza del marinaio',dish:'🍕',items:[['flour',300],['water',150],['oil',20]],actions:['mix','roll'],toppings:[['tomato',2],['cheese',100]],last:['bake']},
 {id:'muffins',name:'Apple muffins',it:'I muffin del faro',dish:'🧁',items:[['flour',200],['egg',2],['milk',100],['sugar',50],['apple',2]],actions:['mix','bake']}
];
const actions={mix:{en:'Mix!',it:'Mescola!'},roll:{en:'Roll the dough!',it:'Stendi l’impasto!'},bake:{en:'Bake!',it:'Metti nel forno!'},decorate:{en:'Decorate with strawberries!',it:'Decora con le fragole!'}};
function steps(recipe,factor=1){const items=list=>list.map(([id,q])=>({kind:'ingredient',id,quantity:q*factor}));return [...items(recipe.items),...recipe.actions.map(id=>({kind:'action',id})),...items(recipe.toppings||[]),...(recipe.last||[]).map(id=>({kind:'action',id}))]}
function instruction(step){if(step.kind==='action')return actions[step.id].en;const i=ingredients[step.id],label=step.quantity===1?i.name:(i.plural||i.name);return `Add ${step.quantity}${i.unit?' '+i.unit+' of':''} ${label}.`}
function newRun(previous=null,random=Math.random){const choices=recipes.filter(r=>r.id!==previous);const recipe=choices[Math.floor(random()*choices.length)];return {id:globalThis.crypto.randomUUID(),recipe_id:recipe.id,factor:random()<.5?1:2,steps:steps(recipe,1),position:0,amount:0,finished:false,abandoned:false,errors:0,helps:0,metrics:{ingredients:{correct:0,errors:0},quantities:{correct:0,errors:0},actions:{correct:0,errors:0}},started_at:new Date().toISOString()}}
function create(previous,random=Math.random){const r=newRun(previous,random);r.steps=steps(recipes.find(x=>x.id===r.recipe_id),r.factor);return r}
/* La stessa transizione viene verificata dal server: nessun completamento inviato dal browser. */
function apply(run,kind,value){const next=JSON.parse(JSON.stringify(run));if(next.finished||next.abandoned)throw Error('PARTITA_TERMINATA');const step=next.steps[next.position];let correct=true,category='actions';
 if(kind==='help'){next.helps++;return {run:next,correct:true,category:'help'}}
 if(kind==='undo'){if(step.kind==='ingredient')next.amount=Math.max(0,next.amount-ingredients[step.id].portion);return {run:next,correct:true,category:'undo'}}
 if(kind==='add'){
  if(!ingredients[value])throw Error('SCELTA_NON_VALIDA');
  category='ingredients';correct=step.kind==='ingredient'&&step.id===value;
  if(correct){next.metrics.ingredients.correct++;category='quantities';correct=next.amount+ingredients[value].portion<=step.quantity;if(correct){next.amount+=ingredients[value].portion;if(next.amount===step.quantity){next.position++;next.amount=0}}}
 }else if(kind==='action'){correct=step.kind==='action'&&step.id===value;if(correct)next.position++}else throw Error('SCELTA_NON_VALIDA');
 next.metrics[category][correct?'correct':'errors']++;if(!correct)next.errors++;
 next.finished=next.position===next.steps.length;if(next.finished)next.completed_at=new Date().toISOString();
 return {run:next,correct,category};
}
function badges(count){return [{n:1,title:'PRIMA RICETTA',icon:'🥄'},{n:5,title:'CUOCO DEL PORTO · 5 RICETTE',icon:'👩‍🍳'},{n:10,title:'CHEF DEL PORTO · 10 RICETTE',icon:'🏅'}].map(b=>({...b,earned:count>=b.n}))}
root.EsploriaCucinaData={ingredients,recipes,actions,steps,instruction,create,apply,badges};
})(typeof window==='undefined'?globalThis:window);
