#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = process.cwd();
const baseMatches = JSON.parse(fs.readFileSync('data/matches.json', 'utf8'));
function runWith(matches) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quiniela-wc-'));
  fs.mkdirSync(path.join(dir, 'data'));
  fs.mkdirSync(path.join(dir, 'scripts'));
  fs.writeFileSync(path.join(dir, 'data/matches.json'), JSON.stringify(matches, null, 2));
  fs.copyFileSync(path.join(repo, 'scripts/validate-worldcup-data.js'), path.join(dir, 'scripts/validate-worldcup-data.js'));
  return spawnSync(process.execPath, ['scripts/validate-worldcup-data.js'], { cwd: dir, encoding: 'utf8' });
}
const cases = [
  ['Caso A sin API key/manual mantiene placeholders', baseMatches, 0],
  ['Caso B algunos clasificados con trazabilidad completa', (() => { const m=structuredClone(baseMatches); Object.assign(m[0], {teamA:'Canadá', teamAStatus:'confirmed', teamASourceName:'Official API', teamASourceUrl:'https://example.test/matches/73', teamAConfirmedAt:'2026-06-24T00:00:00.000Z', teamAUpdatedBy:'sync'}); return m; })(), 0],
  ['Caso C API falla conserva datos anteriores/placeholders', baseMatches, 0],
  ['Caso D override manual válido no se pisa', (() => { const m=structuredClone(baseMatches); Object.assign(m[1], {teamB:'Admin FC', teamBStatus:'manual', teamBUpdatedBy:'Amargo', manualOverrideB:true}); return m; })(), 0],
  ['Caso E cruce ficticio detectado', (() => { const m=structuredClone(baseMatches); Object.assign(m[2], {teamA:'Brasil', teamB:'Uruguay', teamAStatus:'manual', teamBStatus:'manual', teamAUpdatedBy:'Amargo', teamBUpdatedBy:'Amargo'}); return m; })(), 1],
  ['Caso F equipo real sin fuente/status detectado', (() => { const m=structuredClone(baseMatches); m[3].teamA='Francia'; return m; })(), 1]
];
let failed = 0;
for (const [name, data, expected] of cases) {
  const res = runWith(data);
  const ok = res.status === expected;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) { failed++; console.log(res.stdout); console.error(res.stderr); }
}
process.exit(failed ? 1 : 0);
