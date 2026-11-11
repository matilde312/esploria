/* Distintivi personali derivati dai completamenti verificati online. */
(function(root){'use strict';const goals=[
 {n:1,key:'memory-colori-1',icon:'🎨',it:'IL MIO PRIMO MEMORY',en:'MY FIRST MEMORY'},
 {n:5,key:'memory-colori-5',icon:'🧭',it:'ESPLORATORE DEI COLORI · 5 MEMORY',en:'COLOUR EXPLORER · 5 GAMES'},
 {n:10,key:'memory-colori-10',icon:'🏅',it:'MAESTRO DEI COLORI · 10 MEMORY',en:'COLOUR MASTER · 10 GAMES'}
];root.EsploriaMemoryBadges=count=>{const n=Number(count);return goals.filter(b=>Number.isFinite(n)&&n>=b.n).map(b=>({...b}))};})(typeof window==='undefined'?globalThis:window);
