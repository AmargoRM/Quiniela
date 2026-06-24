#!/usr/bin/env node
import fs from 'node:fs';
import { readJson, submissionIsBeforeDeadline } from './lib.js';

const issuePath = process.env.ISSUE_EVENT_PATH || process.env.GITHUB_EVENT_PATH;
const commitHash = process.env.GITHUB_SHA || null;
if (!issuePath) throw new Error('Falta ISSUE_EVENT_PATH o GITHUB_EVENT_PATH.');
const event = JSON.parse(fs.readFileSync(issuePath, 'utf8'));
const body = event.issue?.body || '';
const config = readJson('data/config.json');

function extractField(label) {
  const pattern = new RegExp(`### ${label}\\s+([\\s\\S]*?)(?=\\n### |$)`, 'i');
  return body.match(pattern)?.[1]?.trim();
}

const rawPredictions = extractField('Predicciones');
const submission = {
  timestamp: event.issue?.created_at || new Date().toISOString(),
  playerNumber: extractField('Número de jugador'),
  playerName: extractField('Nombre'),
  predictions: JSON.parse(rawPredictions),
  source: `github-issue-${event.issue?.number}`,
  commitHash,
  validBeforeDeadline: false
};
submission.validBeforeDeadline = submissionIsBeforeDeadline(submission, config.deadline);

fs.appendFileSync('data/submissions.jsonl', `${JSON.stringify(submission)}\n`);
console.log(submission.validBeforeDeadline ? 'Predicción registrada como válida.' : 'Predicción registrada fuera de plazo.');
