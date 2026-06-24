#!/usr/bin/env node
import { readJson, readJsonl, isValidDate, normalizePlayerNumber, submissionIsBeforeDeadline } from './lib.js';

const config = readJson('data/config.json');
const matches = readJson('data/matches.json');
const submissions = readJsonl('data/submissions.jsonl');
const matchIds = new Set(matches.map((match) => match.id));
const errors = [];
const warnings = [];
const seen = new Set();

function addError(line, message) {
  errors.push(`Línea ${line}: ${message}`);
}

for (const { lineNumber, value } of submissions) {
  if (!isValidDate(value.timestamp)) addError(lineNumber, 'timestamp inválido o ausente.');
  const playerNumber = normalizePlayerNumber(value.playerNumber);
  if (!/^\d{2,3}$/.test(playerNumber)) addError(lineNumber, 'playerNumber debe ser numérico, por ejemplo 01.');
  if (!value.playerName || typeof value.playerName !== 'string') addError(lineNumber, 'playerName es obligatorio.');
  if (!Array.isArray(value.predictions) || value.predictions.length === 0) addError(lineNumber, 'predictions debe ser un arreglo no vacío.');
  if (!value.source || typeof value.source !== 'string') addError(lineNumber, 'source es obligatorio.');

  const fingerprint = JSON.stringify({ playerNumber, timestamp: value.timestamp, predictions: value.predictions });
  if (seen.has(fingerprint)) warnings.push(`Línea ${lineNumber}: envío duplicado exacto detectado.`);
  seen.add(fingerprint);

  if (isValidDate(value.timestamp) && !submissionIsBeforeDeadline(value, config.deadline)) {
    warnings.push(`Línea ${lineNumber}: envío posterior al cierre; se marcará inválido para la tabla oficial.`);
  }

  for (const [index, prediction] of (value.predictions || []).entries()) {
    const prefix = `predictions[${index}]`;
    if (!matchIds.has(prediction.matchId)) addError(lineNumber, `${prefix}.matchId no existe en matches.json.`);
    if (!Number.isInteger(prediction.goalsA) || prediction.goalsA < 0) addError(lineNumber, `${prefix}.goalsA debe ser entero >= 0.`);
    if (!Number.isInteger(prediction.goalsB) || prediction.goalsB < 0) addError(lineNumber, `${prefix}.goalsB debe ser entero >= 0.`);
    if (!prediction.winner || typeof prediction.winner !== 'string') addError(lineNumber, `${prefix}.winner es obligatorio.`);
    if (!prediction.teamA || !prediction.teamB) addError(lineNumber, `${prefix} debe incluir teamA y teamB.`);
  }
}

for (const warning of warnings) console.warn(`ADVERTENCIA: ${warning}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Validación correcta: ${submissions.length} envíos revisados, ${warnings.length} advertencias.`);
