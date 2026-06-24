#!/usr/bin/env node
import fs from 'node:fs';
const SOURCE_URL='https://www.fifa.com/es/tournaments/mens/worldcup/canadamexicousa2026/standings';
const lastSyncPath='data/last-sync.json';
const now=()=>new Date().toISOString();
function write(status,message,updatedMatches=0,updatedTeams=0){fs.writeFileSync(lastSyncPath, JSON.stringify({lastSyncAt:now(),source:'FIFA standings',sourceUrl:SOURCE_URL,status,updatedMatches,updatedTeams,message},null,2)+'\n');}
try{
  const res=await fetch(SOURCE_URL,{headers:{'user-agent':'Quiniela sync bot; fail-closed no scraping fragile'}});
  if(!res.ok) throw new Error(`FIFA standings HTTP ${res.status}`);
  const html=await res.text();
  const hasStructured=/__NEXT_DATA__|application\/ld\+json|standing/i.test(html);
  if(!hasStructured){write('manual','No se pudo leer FIFA standings automáticamente. Complete equipos manualmente.'); process.exit(0);}
  // Fail-closed: until FIFA exposes a stable, clearly parseable standings contract for this page,
  // do not infer any group positions or edit matches.json.
  write('manual','FIFA standings no expone posiciones confirmadas de forma estructurada y estable; placeholders conservados. Complete equipos manualmente si corresponde.');
}catch(err){
  write('error',`No se pudo leer FIFA standings automáticamente. Complete equipos manualmente. Error: ${err.message||err}`);
}
