const CFG = window.QUINIELA_CONFIG || {};
const $ = (id) => document.getElementById(id);
let state = {matches: [], results: [], leaderboard: []};
let slots = [];
let player = null;
let predictions = {};

async function apiGet(action, params = {}) {
  if (CFG.MODE !== 'production') return null;
  const url = new URL(CFG.GAS_WEBAPP_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return fetch(url).then(r => r.json());
}
async function apiPost(payload) {
  if (CFG.MODE !== 'production') return demoSubmit(payload);
  return fetch(CFG.GAS_WEBAPP_URL, {method:'POST', body: JSON.stringify(payload)}).then(r => r.json());
}
async function loadJson(path){ return fetch(path, {cache:'no-store'}).then(r => r.json()); }
async function loadState(){
  slots = await loadJson('data/bracket-slots.json');
  state = CFG.MODE === 'production' ? await apiGet('getState') : await loadJson('data/sample-state.json');
  state.matches ||= []; state.results ||= []; state.leaderboard ||= [];
  $('deadlineText').textContent = `Cierre: ${formatDate(state.deadline || CFG.DEADLINE)} · modo ${CFG.MODE}`;
}
function formatDate(iso){ return new Intl.DateTimeFormat('es-CR',{dateStyle:'medium',timeStyle:'short',timeZone:CFG.TIMEZONE||'America/Costa_Rica'}).format(new Date(iso)); }
function beforeDeadline(){ return Date.now() <= new Date(state.deadline || CFG.DEADLINE).getTime(); }
function matchById(id){ return state.matches.find(m => m.matchId === id) || {}; }
function resultById(id){ return state.results.find(r => r.matchId === id) || {}; }
function winnerOptions(match){ return ['', match.teamA, match.teamB].filter((v,i,a)=>v || i===0).filter((v,i,a)=>a.indexOf(v)===i); }
function renderBracket(){
  const layer = $('slotLayer'); layer.innerHTML = '';
  slots.forEach(s => {
    const m = matchById(s.matchId); const div = document.createElement('div');
    div.className = `slot ${s.fieldType}`;
    Object.assign(div.style,{left:s.xPercent+'%',top:s.yPercent+'%',width:s.widthPercent+'%',height:s.heightPercent+'%'});
    const key = `${s.matchId}.${s.fieldType}`;
    if (['winner'].includes(s.fieldType)) {
      const select = document.createElement('select'); select.dataset.key = key;
      winnerOptions(m).forEach(o => select.add(new Option(o || 'Ganador', o)));
      select.value = predictions[s.matchId]?.winner || ''; select.onchange = updatePrediction;
      div.append(select);
    } else if (s.fieldType === 'champion') {
      const input = document.createElement('input'); input.placeholder = 'Campeón'; input.dataset.key = key; input.value = predictions[s.matchId]?.champion || predictions[s.matchId]?.winner || ''; input.oninput = updatePrediction; div.append(input);
    } else {
      const input = document.createElement('input'); input.dataset.key = key;
      input.type = s.fieldType.startsWith('score') ? 'number' : 'text'; input.min = 0;
      input.placeholder = ({teamA:m.teamA||m.sourceLabelA||'Equipo A',teamB:m.teamB||m.sourceLabelB||'Equipo B',scoreA:'0',scoreB:'0'})[s.fieldType] || '';
      input.value = predictions[s.matchId]?.[s.fieldType] ?? (s.fieldType==='teamA'?m.teamA:(s.fieldType==='teamB'?m.teamB:''));
      input.oninput = updatePrediction; div.append(input);
    }
    layer.append(div);
  });
}
function updatePrediction(e){ const [matchId, field] = e.target.dataset.key.split('.'); predictions[matchId] ||= {}; predictions[matchId][field] = e.target.value; }
function validate(){
  if (!player?.name || !player?.number) return 'Completa nombre y número.';
  for (const m of state.matches) { const p = predictions[m.matchId] || {}; if (p.scoreA === '' || p.scoreB === '' || !p.winner) return `Completa marcador y ganador de ${m.matchId}.`; }
  return '';
}
async function savePrediction(){
  collectInputs(); const error = validate(); if (error) return showNotice(error);
  const late = !beforeDeadline(); if (late) showNotice('El cierre ya pasó. Se guardará como late y no contará.');
  const payload = {action:'submitPrediction', playerName:player.name, playerNumber:player.number, predictions, deadline:state.deadline || CFG.DEADLINE, validBeforeDeadline:!late};
  const res = await apiPost(payload); if (!res.ok) return showNotice(res.error || 'No se pudo guardar.');
  $('receipt').classList.remove('hidden');
  $('receipt').innerHTML = `<h2>Comprobante</h2><p><b>Nombre:</b> ${escapeHtml(player.name)}</p><p><b>Número:</b> ${escapeHtml(player.number)}</p><p><b>Fecha/hora:</b> ${formatDate(res.timestamp)}</p><p><b>Código de registro:</b> ${res.submissionId}</p><p><b>Estado:</b> ${res.validBeforeDeadline ? 'válido antes del cierre' : 'late'}</p>`;
  await refreshLeaderboard();
}
function collectInputs(){ document.querySelectorAll('[data-key]').forEach(el => updatePrediction({target:el})); }
function showNotice(msg){ $('notice').textContent = msg; $('notice').classList.remove('hidden'); }
async function enter(){
  player = {name:$('playerName').value.trim(), number:$('playerNumber').value.trim()}; if(!player.name||!player.number) return showNotice('Completa nombre y número.');
  $('loginCard').classList.add('hidden'); $('appView').classList.remove('hidden'); $('playerBadge').textContent = `${player.name} · #${player.number}`;
  const existing = CFG.MODE === 'production' ? await apiGet('getPlayer', {playerName:player.name, playerNumber:player.number}) : getDemoPlayer(player);
  if (existing?.predictions) predictions = existing.predictions;
  renderBracket(); renderLeaderboard();
}
function scorePrediction(p,r){ if(!r || r.status!=='terminado') return {points:0,status:'pendiente'}; if(p?.winner!==r.winner) return {points:0,status:'falló'}; const exact=Number(p.scoreA)===Number(r.goalsA)&&Number(p.scoreB)===Number(r.goalsB); return {points:exact?3:1,status:exact?'exacto':'acertó ganador'}; }
function renderLeaderboard(){
  const rows = state.leaderboard || [];
  $('leaderboard').innerHTML = `<table class="leaderboard-table"><thead><tr><th>Puesto</th><th>Número</th><th>Nombre</th><th>Puntos</th><th>Exactos</th><th>Ganadores</th><th>Último válido</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.position}</td><td>${r.playerNumber}</td><td>${escapeHtml(r.playerName)}</td><td>${r.totalPoints}</td><td>${r.exactHits}</td><td>${r.winnerHits}</td><td>${r.lastValidSubmission?formatDate(r.lastValidSubmission):''}</td><td><button onclick="showDetail('${r.playerNumber}')">Ver detalle</button></td></tr>`).join('') || '<tr><td colspan="8">Sin registros todavía.</td></tr>'}</tbody></table>`;
}
function showDetail(num){
  const pred = num===player?.number ? predictions : {}; const html = state.matches.map(m=>{const p=pred[m.matchId]||{}, r=resultById(m.matchId), s=scorePrediction(p,r); return `<div class="detail-row"><b>${m.matchId}</b> ${escapeHtml(m.teamA||m.sourceLabelA||'Equipo A')} vs ${escapeHtml(m.teamB||m.sourceLabelB||'Equipo B')}<br>Predicción: ${p.scoreA??'-'}-${p.scoreB??'-'} · ${p.winner||'-'}<br>Real: ${r.goalsA??'-'}-${r.goalsB??'-'} · ${r.winner||'-'}<br>Puntos: ${s.points} · ${s.status}</div>`}).join('');
  $('detail').classList.remove('hidden'); $('detail').innerHTML = `<h2>Detalle por partido</h2><div class="detail-grid">${html}</div>`;
}
async function refreshLeaderboard(){ if(CFG.MODE==='production') state = await apiGet('getState'); else state.leaderboard = calculateDemoLeaderboard(); renderLeaderboard(); }
function demoSubmit(payload){ const list=JSON.parse(localStorage.getItem('quinielaSubmissions')||'[]'); const now=new Date().toISOString(); const rec={...payload,timestamp:now,submissionId:'LOCAL-'+crypto.randomUUID(),validBeforeDeadline:beforeDeadline()}; list.push(rec); localStorage.setItem('quinielaSubmissions',JSON.stringify(list)); return {ok:true,...rec}; }
function getDemoPlayer(p){ const list=JSON.parse(localStorage.getItem('quinielaSubmissions')||'[]'); return list.filter(x=>x.playerNumber===p.number&&x.playerName.toLowerCase()===p.name.toLowerCase()&&x.validBeforeDeadline).at(-1); }
function calculateDemoLeaderboard(){ const latest={}; JSON.parse(localStorage.getItem('quinielaSubmissions')||'[]').filter(x=>x.validBeforeDeadline).forEach(x=>latest[x.playerNumber]=x); return Object.values(latest).map((x,i)=>({position:i+1,playerNumber:x.playerNumber,playerName:x.playerName,totalPoints:0,exactHits:0,winnerHits:0,lastValidSubmission:x.timestamp})); }
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
$('enterBtn').onclick=enter; $('saveBtn').onclick=savePrediction; $('reloadBtn').onclick=()=>location.reload(); $('leaderboardRefresh').onclick=refreshLeaderboard;
loadState().catch(e=>showNotice(e.message));
function setupBracketImageFallback(){
  const img = document.getElementById('bracketImage');
  const placeholder = document.getElementById('bracketPlaceholder');
  if (!img || !placeholder) return;
  img.addEventListener('error', () => {
    img.classList.add('hidden');
    placeholder.classList.remove('hidden');
  });
}
setupBracketImageFallback();
