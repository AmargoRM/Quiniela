#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const errors = [];
const add = (msg) => errors.push(msg);
const matches = readJson('data/matches.json');

const group = '[A-L]';
const allowedR32 = new Set([
  ...Array.from({ length: 12 }, (_, i) => `1° Grupo ${String.fromCharCode(65 + i)}`),
  ...Array.from({ length: 12 }, (_, i) => `2° Grupo ${String.fromCharCode(65 + i)}`),
  'Mejor 3° A/B/C/D/F','Mejor 3° C/D/F/G/H','Mejor 3° C/E/F/H/I','Mejor 3° E/H/I/J/K',
  'Mejor 3° B/E/F/I/J','Mejor 3° A/E/H/I/J','Mejor 3° E/F/G/I/J','Mejor 3° D/E/I/J/L'
]);
const allowedLater = new Set([
  ...Array.from({ length: 32 }, (_, i) => `Ganador ${73 + i}`),
  'Perdedor 101','Perdedor 102','Pendiente por definir'
]);
const forbiddenPairs = [
  ['Argentina','México'],['Argentina','Mexico'],['Francia','Marruecos'],['Brasil','Uruguay'],
  ['Inglaterra','Senegal'],['Portugal','Estados Unidos']
];
const demoNames = ['Costa Norte','Río Dorado','Rio Dorado'];
const isReal = (v) => typeof v === 'string' && v.trim() !== '';
const requiredMeta = (side) => [`team${side}Source`,`team${side}Status`,`team${side}SourceName`,`team${side}SourceUrl`,`team${side}ConfirmedAt`,`team${side}UpdatedBy`];
const hasDefaultRepeatedDate = matches.filter(m => m.date && /^20\d\d-\d\d-\d\d/.test(String(m.date))).length > 1;

if (!Array.isArray(matches)) add('data/matches.json debe ser un array.');
if (matches.length !== 32) add('data/matches.json debe contener exactamente 32 partidos (73-104).');
const ids = new Set();
for (const m of matches) {
  const id = Number(m.matchId);
  if (!Number.isInteger(id) || id < 73 || id > 104) add(`Match ID fuera de 73-104: ${m.matchId}`);
  if (ids.has(id)) add(`Match ID duplicado: ${id}`);
  ids.add(id);
  const round = String(m.round || '').toLowerCase();
  if (id >= 73 && id <= 88 && !round.includes('16')) add(`Partido ${id} debe ser 16avos.`);
  if (id >= 89 && id <= 96 && !round.includes('8')) add(`Partido ${id} debe ser 8vos.`);
  if (id >= 97 && id <= 100 && !round.includes('cuarto')) add(`Partido ${id} debe ser Cuartos.`);
  if (id >= 101 && id <= 102 && !round.includes('semi')) add(`Partido ${id} debe ser Semifinales.`);
  if (id === 103 && !round.includes('tercer')) add('El partido 103 debe ser Tercer lugar.');
  if (id === 104 && !round.includes('final')) add('El partido 104 debe ser Final.');

  for (const side of ['A','B']) {
    const team = m[`team${side}`];
    const status = m[`team${side}Status`];
    const source = m[`team${side}Source`];
    for (const k of requiredMeta(side)) if (!(k in m)) add(`M${id} ${k} ausente.`);
    if (!['placeholder','confirmed','manual'].includes(status)) add(`M${id} team${side}Status inválido o ausente.`);
    if (status === 'placeholder') {
      if (team !== '') add(`M${id} team${side} debe estar vacío cuando es placeholder.`);
      const allowed = id <= 88 ? allowedR32 : allowedLater;
      if (!allowed.has(source)) add(`M${id} team${side}Source placeholder no permitido: ${source}`);
    }
    if (status === 'confirmed') {
      if (!isReal(team) || !m[`team${side}SourceName`] || !m[`team${side}SourceUrl`] || !m[`team${side}ConfirmedAt`]) add(`M${id} team${side} confirmado sin trazabilidad completa.`);
    }
    if (status === 'manual') {
      if (!isReal(team) || !m[`team${side}UpdatedBy`]) add(`M${id} team${side} manual sin updatedBy.`);
    }
    if (isReal(team) && !['confirmed','manual'].includes(status)) add(`M${id} team${side} contiene equipo real sin status confirmado/manual.`);
  }
  for (const [a,b] of forbiddenPairs) if (m.teamA === a && m.teamB === b) add(`Cruce ficticio prohibido detectado en M${id}: ${a} vs ${b}`);
  for (const name of demoNames) if (m.teamA === name || m.teamB === name) add(`Dato demo en producción detectado en M${id}: ${name}`);
}
for (let id=73; id<=104; id++) if (!ids.has(id)) add(`Falta matchId ${id}.`);
if (hasDefaultRepeatedDate && matches.some(m => !m.dateSourceName && !m.dateSourceUrl)) add('Fechas repetidas por defecto sin fuente detectadas.');

if (process.argv.includes('--self-test')) {
  const hash = crypto.createHash('sha256').update(JSON.stringify(matches)).digest('hex');
  if (!hash) add('No se pudo generar hash de control.');
}

if (errors.length) {
  console.error('Validación anti-invención falló:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Validación anti-invención OK.');
