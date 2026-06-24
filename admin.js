const fmtAdmin = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Costa_Rica' });
async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
  return response.json();
}
Promise.all([loadJson('data/matches.json'), loadJson('data/results.json')]).then(([matches, results]) => {
  const matchById = new Map(matches.map((match) => [match.id, match]));
  document.querySelector('#admin-results').innerHTML = results.map((result) => {
    const match = matchById.get(result.matchId) || {};
    const marcador = result.status === 'finished' ? `${result.goalsA}-${result.goalsB}` : 'Pendiente';
    return `<tr><td>${result.matchId}</td><td>${match.round || '-'}</td><td>${match.teamA || '-'} vs ${match.teamB || '-'}</td><td>${marcador}</td><td>${result.winner || '-'}</td><td><span class="tag">${result.status}</span></td></tr>`;
  }).join('');
}).catch((error) => {
  document.body.insertAdjacentHTML('beforeend', `<main><section class="card warning">${error.message}</section></main>`);
});
