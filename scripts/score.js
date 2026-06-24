#!/usr/bin/env node
import { readJson, readJsonl, writeJson, getLatestValidSubmissions, scorePrediction } from './lib.js';

const config = readJson('data/config.json');
const matches = readJson('data/matches.json');
const results = readJson('data/results.json');
const submissions = readJsonl('data/submissions.jsonl');
const resultByMatch = new Map(results.map((result) => [result.matchId, result]));
const matchById = new Map(matches.map((match) => [match.id || match.matchId, match]));
const latest = getLatestValidSubmissions(submissions, config.deadline);

const players = latest.map((submission) => {
  let totalPoints = 0;
  let exactHits = 0;
  let winnerHits = 0;
  const details = submission.predictions.map((prediction) => {
    const result = resultByMatch.get(prediction.matchId);
    const score = scorePrediction(prediction, result);
    totalPoints += score.points;
    if (score.exact) exactHits += 1;
    if (score.winner) winnerHits += 1;
    return {
      matchId: prediction.matchId,
      round: matchById.get(prediction.matchId)?.round ?? 'sin ronda',
      prediction,
      result: result ?? null,
      points: score.points,
      exactHit: score.exact,
      winnerHit: score.winner,
      pending: score.pending
    };
  });

  return {
    playerNumber: submission.playerNumber,
    playerName: submission.playerName,
    totalPoints,
    exactHits,
    winnerHits,
    lastValidSubmission: submission.timestamp,
    details
  };
});

players.sort((a, b) =>
  b.totalPoints - a.totalPoints ||
  b.exactHits - a.exactHits ||
  b.winnerHits - a.winnerHits ||
  a.playerName.localeCompare(b.playerName)
);

const leaderboard = {
  generatedAt: new Date().toISOString(),
  deadline: config.deadline,
  timezone: config.timezone,
  players: players.map((player, index) => ({ position: index + 1, ...player }))
};

writeJson('data/leaderboard.json', leaderboard);
console.log(`Tabla generada con ${players.length} participantes.`);
