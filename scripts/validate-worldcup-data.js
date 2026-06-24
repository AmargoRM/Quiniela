#!/usr/bin/env node
import fs from 'node:fs';
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const errors = [];
const add = (msg) => errors.push(msg);
const matches = readJson('data/matches.json');
const expectedRounds = {'16avos de final':16,'8vos de final':8,'Cuartos de final':4,'Semifinales':2,'Tercer lugar':1,'Final':1};
const oldIds = new Set(['R32-01','R16-01','QF-01','SF-01','F-01']);
for (const file of fs.readdirSync('data').filter(f=>f.endsWith('.json'))) {
  const txt = fs.readFileSync(`data/${file}`, 'utf8');
  for (const oldId of oldIds) if (txt.includes(oldId)) add(`ID viejo prohibido ${oldId} en data/${file}.`);
}
const forbiddenPairs = [['Argentina','México'],['Argentina','Mexico'],['Francia','Marruecos'],['Brasil','Uruguay'],['Inglaterra','Senegal'],['Portugal','Estados Unidos']];
const allowedStatuses = new Set(['placeholder','confirmed','manual']);
const isReal = (v) => typeof v === 'string' && v.trim() !== '';
if (!Array.isArray(matches)) add('data/matches.json debe ser un array.');
if (Array.isArray(matches) && matches.length !== 32) add('data/matches.json debe contener exactamente 32 partidos.');
const ids = new Set(); const rounds = Object.fromEntries(Object.keys(expectedRounds).map(r=>[r,0]));
for (const m of Array.isArray(matches)?matches:[]) {
  const id = String(m.matchId);
  if (oldIds.has(id)) add(`ID viejo prohibido detectado: ${id}`);
  const n = Number(id);
  if (!Number.isInteger(n) || n < 73 || n > 104) add(`matchId fuera de 73-104: ${id}`);
  if (ids.has(id)) add(`matchId duplicado: ${id}`); ids.add(id);
  if (m.fifaMatchNumber !== n) add(`M${id} fifaMatchNumber debe ser ${n}.`);
  if (!(m.round in expectedRounds)) add(`M${id} round inválido: ${m.round}`); else rounds[m.round]++;
  if (n>=73&&n<=88&&m.round!=='16avos de final') add(`M${id} debe ser 16avos de final.`);
  if (n>=89&&n<=96&&m.round!=='8vos de final') add(`M${id} debe ser 8vos de final.`);
  if (n>=97&&n<=100&&m.round!=='Cuartos de final') add(`M${id} debe ser Cuartos de final.`);
  if (n>=101&&n<=102&&m.round!=='Semifinales') add(`M${id} debe ser Semifinales.`);
  if (n===103&&m.round!=='Tercer lugar') add('M103 debe ser Tercer lugar.');
  if (n===104&&m.round!=='Final') add('M104 debe ser Final.');
  for (const side of ['A','B']) {
    const team = m[`team${side}`]; const status = m[`team${side}Status`];
    if (!allowedStatuses.has(status)) add(`M${id} team${side}Status inválido.`);
    if (status === 'placeholder' && team !== '') add(`M${id} team${side} debe estar vacío si es placeholder.`);
    if (isReal(team) && !status) add(`M${id} team${side} real sin status.`);
    if (isReal(team) && !(m.updatedBy || m[`team${side}UpdatedBy`]) && status !== 'placeholder') add(`M${id} team${side} real sin updatedBy.`);
    if (isReal(team) && status === 'placeholder') add(`M${id} tiene equipo real sin confirmación.`);
    if (!m[`team${side}Source`]) add(`M${id} falta team${side}Source.`);
  }
  for (const [a,b] of forbiddenPairs) if (m.teamA === a && m.teamB === b) add(`Cruce inventado prohibido: ${a} vs ${b} en M${id}.`);
}
for (let id=73; id<=104; id++) if (!ids.has(String(id))) add(`Falta matchId ${id}.`);
for (const [round,count] of Object.entries(expectedRounds)) if (rounds[round] !== count) add(`${round} debe tener ${count} partidos y tiene ${rounds[round]}.`);
const allPendingRenderable = matches.every(m => m.teamAStatus !== 'placeholder' || m.teamASource) && matches.every(m => m.teamBStatus !== 'placeholder' || m.teamBSource);
if (!allPendingRenderable) add('Hay partidos pendientes sin placeholder renderizable.');
if (errors.length) { console.error('Validación anti-invención falló:'); errors.forEach(e=>console.error(`- ${e}`)); process.exit(1); }
console.log('Validación anti-invención OK: 32 partidos renderizables sin cruces inventados.');
