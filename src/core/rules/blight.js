// Solo — a praga (ameaça que avança). Começa na borda do território e, no fim de cada ronda a partir
// de uma ronda indicada pelo território, avança: ocupa um hexágono vazio, ou engole um terreno teu,
// a não ser que esteja protegido (tem uma Torre de vigia ou Fortaleza tua, ou fica ao lado de uma).
// Se a praga chegar ao lado do Lago do centro, o território perde-se.
// Escolha do avanço: com probabilidade «aim» o hexágono mais perto do Lago, senão ao acaso (pelo gerador da partida).
import { key, neighbors, distance } from '../hex.js';
import { nextFloat, nextInt } from '../rng.js';
import { rebuildRegions } from './regions.js';

const guard = c => c && c.owner === 0 && (c.structure === 'tower' || c.structure === 'keep');
export function protectedHex(state, k) {
  const [q, r] = k.split(',').map(Number);
  return guard(state.board[k]) || neighbors(q, r).some(([a, b]) => guard(state.board[key(a, b)]));
}

export function placeBlightStart(state, starts) {
  for (const [q, r] of starts) if (!state.board[key(q, r)]) state.board[key(q, r)] = { kind: 'blight', owner: null };
}

function candidates(state) {
  const out = new Set();
  for (const [k, c] of Object.entries(state.board)) {
    if (c.kind !== 'blight') continue;
    const [q, r] = k.split(',').map(Number);
    for (const [a, b] of neighbors(q, r)) {
      const nk = key(a, b), n = state.board[nk];
      if (distance(0, 0, a, b) > state.area || (a === 0 && b === 0)) continue;
      if (n && (n.kind !== 'terrain' && n.kind !== 'deadtrees' && n.kind !== 'volcano')) continue;   // locais, Lago, praga, fronteira
      if (protectedHex(state, nk)) continue;
      out.add(nk);
    }
  }
  return [...out].sort();
}

// Fim de ronda: avança a praga. Devolve os hexágonos tomados.
export function spreadBlight(state) {
  const b = state.blight; if (!b || state.round < b.from) return [];
  const steps = b.rateLate && state.round >= b.rateLate.round ? b.rateLate.rate : b.rate;
  const taken = [];
  for (let i = 0; i < steps; i++) {
    const C = candidates(state); if (!C.length) break;
    let k;
    if (nextFloat(state.rng) < (b.aim ?? 0.5)) { const d = c => { const [q, r] = c.split(',').map(Number); return distance(0, 0, q, r); }; const m = Math.min(...C.map(d)); const best = C.filter(c => d(c) === m); k = best[nextInt(state.rng, best.length)]; }
    else k = C[nextInt(state.rng, C.length)];
    const c = state.board[k];
    if (c) { b.engulfed++; state.board[k] = { ...c, kind: 'blight', owner: null, structure: null, blocks: {} }; }
    else state.board[k] = { kind: 'blight', owner: null };
    taken.push(k);
  }
  if (taken.some(k => state.board[k].card)) rebuildRegions(state);
  b.lastTaken = taken;
  if (Object.entries(state.board).some(([k, c]) => c.kind === 'blight' && distance(0, 0, ...k.split(',').map(Number)) === 1)) b.lost = true;
  return taken;
}

// Distância da praga ao Lago (hexágonos que ainda faltam até ficar ao lado dele).
export function blightDistance(state) {
  let m = Infinity;
  for (const [k, c] of Object.entries(state.board)) if (c.kind === 'blight') m = Math.min(m, distance(0, 0, ...k.split(',').map(Number)) - 1);
  return m;
}
