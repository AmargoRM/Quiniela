import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const dataDir = path.join(rootDir, 'data');

export function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, file), 'utf8'));
}

export function writeJson(file, value) {
  fs.writeFileSync(path.join(rootDir, file), `${JSON.stringify(value, null, 2)}\n`);
}

export function readJsonl(file) {
  const target = path.join(rootDir, file);
  if (!fs.existsSync(target)) return [];
  return fs.readFileSync(target, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => ({ lineNumber: index + 1, value: JSON.parse(line) }));
}

export function isValidDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export function normalizePlayerNumber(value) {
  return String(value ?? '').trim().padStart(2, '0');
}

export function submissionIsBeforeDeadline(submission, deadline) {
  return new Date(submission.timestamp).getTime() <= new Date(deadline).getTime();
}

export function getLatestValidSubmissions(submissions, deadline) {
  const latest = new Map();
  for (const { value } of submissions) {
    const playerNumber = normalizePlayerNumber(value.playerNumber);
    if (!submissionIsBeforeDeadline(value, deadline)) continue;
    const previous = latest.get(playerNumber);
    if (!previous || new Date(value.timestamp) >= new Date(previous.timestamp)) {
      latest.set(playerNumber, { ...value, playerNumber });
    }
  }
  return [...latest.values()].sort((a, b) => a.playerNumber.localeCompare(b.playerNumber));
}

export function scorePrediction(prediction, result) {
  if (!result || result.status !== 'finished') return { points: 0, exact: false, winner: false, pending: true };
  const winner = prediction.winner === result.winner;
  const exact = winner && Number(prediction.goalsA) === Number(result.goalsA) && Number(prediction.goalsB) === Number(result.goalsB);
  return { points: exact ? 3 : winner ? 1 : 0, exact, winner, pending: false };
}
