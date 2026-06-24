const roundsOrder = ['16avos', '8vos', 'cuartos', 'semifinales', 'tercer lugar', 'final'];
const fmt = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Costa_Rica' });

async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
  return response.json();
}

function resultText(result) {
  if (!result || result.status !== 'finished') return 'Pendiente';
  return `${result.goalsA}-${result.goalsB}, clasifica ${result.winner}`;
}

function renderLeaderboard(leaderboard) {
  document.querySelector('#generated-at').textContent = `Generada: ${fmt.format(new Date(leaderboard.generatedAt))}`;
  document.querySelector('#leaderboard-body').innerHTML = leaderboard.players.map((player) => `
    <tr>
      <td>${player.position}</td><td>${player.playerNumber}</td><td>${player.playerName}</td>
      <td class="score">${player.totalPoints}</td><td>${player.exactHits}</td><td>${player.winnerHits}</td>
      <td>${fmt.format(new Date(player.lastValidSubmission))}</td>
    </tr>`).join('');
}

function renderDetails(players) {
  document.querySelector('#player-detail').innerHTML = players.map((player) => `
    <article class="player-card">
      <h3>#${player.playerNumber} · ${player.playerName}</h3>
      <p><span class="tag">${player.totalPoints} pts</span></p>
      ${player.details.map((detail) => `
        <div class="match">
          <strong>${detail.matchId} · ${detail.round}</strong><br>
          Predicción: ${detail.prediction.teamA} ${detail.prediction.goalsA}-${detail.prediction.goalsB} ${detail.prediction.teamB}; clasifica ${detail.prediction.winner}.<br>
          Real: ${resultText(detail.result)}.<br>
          <span class="score">${detail.points} puntos</span>
        </div>`).join('')}
    </article>`).join('');
}

function renderMatches(matches, results) {
  const resultByMatch = new Map(results.map((result) => [result.matchId, result]));
  const grouped = Object.groupBy ? Object.groupBy(matches, (match) => match.round) : matches.reduce((acc, match) => ((acc[match.round] ||= []).push(match), acc), {});
  document.querySelector('#matches').innerHTML = roundsOrder.filter((round) => grouped[round]).map((round) => `
    <section class="round">
      <h3>${round}</h3>
      ${grouped[round].map((match) => `
        <div class="match">
          <strong>${match.id}</strong> · ${fmt.format(new Date(match.date))}<br>
          ${match.teamA} vs ${match.teamB}<br>
          <small>Lado ${match.bracketSide}${match.nextMatch ? ` · avanza a ${match.nextMatch}` : ''}</small><br>
          <span class="tag">${resultText(resultByMatch.get(match.id))}</span>
        </div>`).join('')}
    </section>`).join('');
}

async function init() {
  const [config, matches, results, leaderboard] = await Promise.all([
    loadJson('data/config.json'), loadJson('data/matches.json'), loadJson('data/results.json'), loadJson('data/leaderboard.json')
  ]);
  document.title = config.title;
  document.querySelector('#app-title').textContent = config.title;
  document.querySelector('#deadline').textContent = `Cierre: ${fmt.format(new Date(config.deadline))}`;
  renderLeaderboard(leaderboard);
  renderDetails(leaderboard.players);
  renderMatches(matches, results);
}

init().catch((error) => {
  document.querySelector('main').insertAdjacentHTML('afterbegin', `<section class="card warning"><strong>Error:</strong> ${error.message}</section>`);
});
