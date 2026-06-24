const SHEETS={
  config:['key','value'],
  users:['createdAt','playerNumber','playerName','passwordHash','status','lastLogin'],
  matches:['matchId','round','date','teamA','teamB','sourceLabelA','sourceLabelB','nextMatch','status'],
  submissions:['timestamp','submissionId','playerNumber','playerName','predictionsJson','validBeforeDeadline','version'],
  results:['matchId','goalsA','goalsB','winner','status'],
  leaderboard:['position','playerNumber','playerName','totalPoints','exactHits','winnerHits','lastValidSubmission'],
  audit:['timestamp','action','playerNumber','payloadJson']
};
function doGet(){return json_({ok:true,message:'Quiniela API activa. Usa doPost.'})}
function doPost(e){try{init_();const b=JSON.parse(e.postData.contents||'{}');switch(b.action){case'registerPlayer':return json_(registerPlayer_(b));case'loginPlayer':return json_(loginPlayer_(b));case'submitPrediction':return json_(submitPrediction_(b));case'getPlayerState':return json_(getPlayerState_(b));case'adminLogin':return json_(adminLogin_(b));case'getAdminState':requireAdmin_(b);return json_(getAdminState_());case'saveResults':requireAdmin_(b);return json_(saveResults_(b.results||[]));case'saveMatches':requireAdmin_(b);return json_(saveMatches_(b.matches||[]));case'resetTournamentData':requireAdmin_(b);return json_(resetTournamentData_(b.resetMode));case'syncTournamentData':requireAdmin_(b);return json_(syncTournamentData_());case'recalculate':requireAdmin_(b);return json_(recalculate_());default:return json_({ok:false,error:'Acción no soportada'});}}catch(err){return json_({ok:false,error:String(err.message||err)})}}
function init_(){const ss=SpreadsheetApp.getActive();Object.keys(SHEETS).forEach(n=>{let sh=ss.getSheetByName(n)||ss.insertSheet(n);if(sh.getLastRow()===0)sh.appendRow(SHEETS[n]);});}
function sheet_(n){return SpreadsheetApp.getActive().getSheetByName(n)}function rows_(n){const sh=sheet_(n),vals=sh.getDataRange().getValues(),h=vals.shift()||[];return vals.filter(r=>r.some(String)).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));}function replace_(n,rows){const sh=sheet_(n);sh.clear();sh.appendRow(SHEETS[n]);if(rows.length)sh.getRange(2,1,rows.length,SHEETS[n].length).setValues(rows.map(o=>SHEETS[n].map(k=>o[k]??'')));}
function config_(){const c={};rows_('config').forEach(r=>c[r.key]=r.value);return c}function hash_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s),Utilities.Charset.UTF_8).map(b=>(b<0?b+256:b).toString(16).padStart(2,'0')).join('')}function deadline_(){const c=config_();return c.DEADLINE||c.deadline||'2026-06-30T11:59:00-06:00'}
function userByNumber_(n){return rows_('users').find(u=>String(u.playerNumber)===String(n))}function saveUsers_(users){replace_('users',users)}
function registerPlayer_(b){if(!String(b.playerName||'').trim())throw new Error('El nombre es obligatorio.');if(!String(b.playerNumber||'').trim())throw new Error('El número de jugador es obligatorio.');if(String(b.password||'').length<4)throw new Error('La contraseña debe tener mínimo 4 caracteres.');const users=rows_('users');if(users.some(u=>String(u.playerNumber)===String(b.playerNumber)))throw new Error('Ese número de jugador ya existe.');const now=new Date().toISOString(),u={createdAt:now,playerNumber:String(b.playerNumber),playerName:String(b.playerName).trim(),passwordHash:hash_(b.password),status:'activo',lastLogin:now};users.push(u);saveUsers_(users);audit_('registerPlayer',u.playerNumber,{playerName:u.playerName});return{ok:true,playerNumber:u.playerNumber,playerName:u.playerName}}
function loginPlayer_(b){const users=rows_('users'),u=users.find(u=>String(u.playerNumber)===String(b.playerNumber));if(!u||String(u.passwordHash)!==hash_(b.password||''))throw new Error('Número o contraseña incorrectos.');u.lastLogin=new Date().toISOString();saveUsers_(users);return{ok:true,playerNumber:u.playerNumber,playerName:u.playerName}}
function assertPlayer_(n,p){const r=loginPlayer_({playerNumber:n,password:p});return r}
function submitPrediction_(b){const u=assertPlayer_(b.playerNumber,b.password),now=new Date(),valid=now.getTime()<=new Date(deadline_()).getTime();if(!valid)throw new Error('El plazo para enviar quinielas ya cerró.');const subs=rows_('submissions'),version=subs.filter(s=>String(s.playerNumber)===String(u.playerNumber)).length+1,id=Utilities.getUuid();sheet_('submissions').appendRow([now.toISOString(),id,u.playerNumber,u.playerName,JSON.stringify(b.predictions||{}),valid,version]);audit_('submitPrediction',u.playerNumber,{submissionId:id,version,validBeforeDeadline:valid});return{ok:true,submissionId:id,timestamp:now.toISOString(),validBeforeDeadline:valid,version}}
function getPlayerState_(b){const u=assertPlayer_(b.playerNumber,b.password),subs=rows_('submissions').filter(s=>String(s.playerNumber)===String(u.playerNumber)),valid=subs.filter(s=>String(s.validBeforeDeadline)==='true'||s.validBeforeDeadline===true).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp)).pop();return{ok:true,player:{playerNumber:u.playerNumber,playerName:u.playerName},playerNumber:u.playerNumber,playerName:u.playerName,latestPrediction:valid?JSON.parse(valid.predictionsJson||'{}'):null,history:subs.map(s=>({...s,predictions:JSON.parse(s.predictionsJson||'{}')})),deadline:deadline_(),matches:rows_('matches'),results:rows_('results'),leaderboard:rows_('leaderboard')}}
function adminLogin_(b){requireAdmin_(b);return{ok:true}}function requireAdmin_(b){const props=PropertiesService.getScriptProperties(),expectedUser=props.getProperty('ADMIN_USERNAME')||'Amargo',expectedHash=props.getProperty('ADMIN_PASSWORD_HASH');if(String(b.adminUsername||'')!==expectedUser||!expectedHash||hash_(b.adminPassword||'')!==expectedHash)throw new Error('Credenciales de administrador inválidas.');}
function getAdminState_(){return{ok:true,users:rows_('users'),matches:rows_('matches'),results:rows_('results'),submissions:rows_('submissions').map(s=>({...s,predictions:JSON.parse(s.predictionsJson||'{}')})),leaderboard:rows_('leaderboard'),audit:rows_('audit'),deadline:deadline_()}}
function saveMatches_(matches){replace_('matches',matches);audit_('saveMatches','admin',{count:matches.length});return{ok:true,message:'Equipos guardados'}}function saveResults_(results){replace_('results',results);audit_('saveResults','admin',{count:results.length});return recalculate_()}
function recalculate_(){const results=Object.fromEntries(rows_('results').map(r=>[r.matchId,r])),latest={};rows_('submissions').filter(r=>String(r.validBeforeDeadline)==='true'||r.validBeforeDeadline===true).forEach(r=>{const k=String(r.playerNumber);if(!latest[k]||new Date(r.timestamp)>new Date(latest[k].timestamp))latest[k]=r});const board=Object.values(latest).map(s=>{const preds=JSON.parse(s.predictionsJson||'{}');let totalPoints=0,exactHits=0,winnerHits=0;Object.keys(preds).forEach(mid=>{const p=preds[mid],r=results[mid];if(!r||r.status!=='terminado'||!r.winner)return;if(String(p.winner)===String(r.winner)){winnerHits++;const ex=Number(p.scoreA)===Number(r.goalsA)&&Number(p.scoreB)===Number(r.goalsB);if(ex){exactHits++;totalPoints+=3}else totalPoints+=1}});return{playerNumber:s.playerNumber,playerName:s.playerName,totalPoints,exactHits,winnerHits,lastValidSubmission:s.timestamp};}).sort((a,b)=>b.totalPoints-a.totalPoints||b.exactHits-a.exactHits||b.winnerHits-a.winnerHits).map((r,i)=>Object.assign({position:i+1},r));replace_('leaderboard',board);audit_('recalculate','admin',{players:board.length});return{ok:true,message:'Tabla recalculada',leaderboard:board}}

function resetTournamentData_(resetMode){
  const mode=resetMode==='all'?'all':'playersOnly';
  replace_('users',[]);
  replace_('submissions',[]);
  replace_('leaderboard',[]);
  if(mode==='all')replace_('results',[]);
  audit_('resetTournamentData','admin',{resetMode:mode});
  return{ok:true,message:mode==='all'?'Torneo limpiado incluyendo resultados.':'Jugadores y predicciones limpiados.'};
}
function syncTournamentData_(){
  const url=PropertiesService.getScriptProperties().getProperty('OFFICIAL_DATA_URL');
  if(!url)throw new Error('No hay fuente de datos configurada para sincronización.');
  const data=JSON.parse(UrlFetchApp.fetch(url,{muteHttpExceptions:true}).getContentText());
  if(Array.isArray(data.matches))replace_('matches',data.matches);
  if(Array.isArray(data.results)){replace_('results',data.results);recalculate_();}
  audit_('syncTournamentData','admin',{matches:Array.isArray(data.matches)?data.matches.length:0,results:Array.isArray(data.results)?data.results.length:0});
  return{ok:true,message:'Partidos y clasificados actualizados desde la fuente configurada.'};
}
function installSyncTriggers_(){
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='syncTournamentData_').forEach(t=>ScriptApp.deleteTrigger(t));
  [8,14,20].forEach(hour=>ScriptApp.newTrigger('syncTournamentData_').timeBased().atHour(hour).everyDays(1).create());
  return{ok:true,message:'Sincronización automática programada 3 veces al día.'};
}

function audit_(action,playerNumber,payload){sheet_('audit').appendRow([new Date().toISOString(),action,playerNumber||'',JSON.stringify(payload||{})])}function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
