const SHEETS={
  config:['key','value'],
  users:['createdAt','playerNumber','playerName','passwordHash','status','lastLogin'],
  matches:['matchId','round','date','teamA','teamB','teamASource','teamBSource','teamAStatus','teamBStatus','teamASourceName','teamBSourceName','teamASourceUrl','teamBSourceUrl','teamAConfirmedAt','teamBConfirmedAt','teamAUpdatedBy','teamBUpdatedBy','manualOverrideA','manualOverrideB'],
  submissions:['timestamp','submissionId','playerNumber','playerName','predictionsJson','validBeforeDeadline','version'],
  results:['matchId','goalsA','goalsB','winner','status','manualOverrideResult','updatedBy','updatedAt'],
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
  const currentMatches=rows_('matches'),currentResults=rows_('results');
  if(!url){
    audit_('syncTournamentData','admin',{status:'manual',dataSourceMode:'manual',matchesReviewed:0,fieldsUpdated:0,placeholdersMaintained:currentMatches.length*2,overridesRespected:0,errors:['No hay fuente de datos configurada para sincronización.'],warnings:['Fuente automática no configurada. Los equipos se deben completar manualmente.']});
    return{ok:false,error:'Fuente automática no configurada. Los equipos se deben completar manualmente.'};
  }
  try{
    const response=UrlFetchApp.fetch(url,{muteHttpExceptions:true});
    if(response.getResponseCode()>=400)throw new Error('La fuente devolvió HTTP '+response.getResponseCode());
    const data=JSON.parse(response.getContentText());
    const nextMatches=mergeMatchesFailClosed_(currentMatches,Array.isArray(data.matches)?data.matches:[]);
    const nextResults=mergeResultsFailClosed_(currentResults,Array.isArray(data.results)?data.results:[]);
    replace_('matches',nextMatches.matches);
    replace_('results',nextResults.results);
    recalculate_();
    audit_('syncTournamentData','admin',{status:'ok',source:url,matchesReviewed:nextMatches.matchesReviewed,fieldsUpdated:nextMatches.fieldsUpdated+nextResults.fieldsUpdated,placeholdersMaintained:nextMatches.placeholdersMaintained,overridesRespected:nextMatches.overridesRespected+nextResults.overridesRespected,errors:[],warnings:nextMatches.warnings,diff:nextMatches.diff.concat(nextResults.diff)});
    return{ok:true,message:'Sincronización fail-closed aplicada.',diff:nextMatches.diff.concat(nextResults.diff)};
  }catch(err){
    audit_('syncTournamentData','admin',{status:'error',source:url,matchesReviewed:0,fieldsUpdated:0,placeholdersMaintained:currentMatches.length*2,overridesRespected:0,errors:[String(err.message||err)],warnings:['Se conservaron los datos anteriores.']});
    return{ok:false,error:String(err.message||err)};
  }
}
function mergeMatchesFailClosed_(current,incoming){
  const byId=Object.fromEntries(incoming.map(m=>[String(m.matchId),m])),warnings=[],diff=[];let fieldsUpdated=0,placeholdersMaintained=0,overridesRespected=0,matchesReviewed=current.length;
  const next=current.map(m=>{const out=Object.assign({},m),inc=byId[String(m.matchId)]||{};['A','B'].forEach(side=>{if(String(out['manualOverride'+side])==='true'||out['manualOverride'+side]===true){overridesRespected++;return;}const status=inc['team'+side+'Status'];if(status==='confirmed'&&inc['team'+side]&&inc['team'+side+'SourceName']&&inc['team'+side+'SourceUrl']&&inc['team'+side+'ConfirmedAt']){['team'+side,'team'+side+'Status','team'+side+'SourceName','team'+side+'SourceUrl','team'+side+'ConfirmedAt','team'+side+'UpdatedBy'].forEach(k=>{if(out[k]!==inc[k]){diff.push('M'+m.matchId+' '+k+': '+out[k]+' → '+inc[k]);out[k]=inc[k];fieldsUpdated++;}});}else{placeholdersMaintained++;if(inc['team'+side])warnings.push('M'+m.matchId+' team'+side+' no confirmado; se mantuvo placeholder/dato previo.');}});return out;});
  return{matches:next,matchesReviewed,fieldsUpdated,placeholdersMaintained,overridesRespected,warnings,diff};
}
function mergeResultsFailClosed_(current,incoming){
  const byId=Object.fromEntries(incoming.map(r=>[String(r.matchId),r]));let fieldsUpdated=0,overridesRespected=0;const diff=[];
  const next=current.map(r=>{const out=Object.assign({},r),inc=byId[String(r.matchId)]||{};if(String(out.manualOverrideResult)==='true'||out.manualOverrideResult===true){overridesRespected++;return out;}if(String(inc.status)==='terminado'&&inc.winner){['goalsA','goalsB','winner','status'].forEach(k=>{if(out[k]!==inc[k]){diff.push('M'+r.matchId+' '+k+': '+out[k]+' → '+inc[k]);out[k]=inc[k];fieldsUpdated++;}});}return out;});
  return{results:next,fieldsUpdated,overridesRespected,diff};
}
function installSyncTriggers_(){
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='syncTournamentData_').forEach(t=>ScriptApp.deleteTrigger(t));
  [8,14,20].forEach(hour=>ScriptApp.newTrigger('syncTournamentData_').timeBased().atHour(hour).everyDays(1).create());
  return{ok:true,message:'Sincronización automática programada 3 veces al día.'};
}

function audit_(action,playerNumber,payload){sheet_('audit').appendRow([new Date().toISOString(),action,playerNumber||'',JSON.stringify(payload||{})])}function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
