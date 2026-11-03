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

// Fim de ronda (praga anunciada): 1) os hexágonos ameaçados na ronda anterior ficam corrompidos, se ainda
// não estiverem protegidos; 2) a praga escolhe os próximos ameaçados, que ficam visíveis durante uma ronda.
// Começa a ameaçar no fim da ronda «from − 1» e a corromper no fim da ronda «from».
export function spreadBlight(state) {
  const b = state.blight; if (!b) return [];
  b.threat = b.threat || [];
  const taken = [];
  if (state.round >= b.from) {
    for (const k of b.threat) {
      const c = state.board[k];
      if (protectedHex(state, k) || (c && c.kind !== 'terrain' && c.kind !== 'deadtrees' && c.kind !== 'volcano')) continue;
      if (c) { b.engulfed++; state.board[k] = { ...c, kind: 'blight', owner: null, structure: null, blocks: {} }; }
      else state.board[k] = { kind: 'blight', owner: null };
      taken.push(k);
    }
  }
  b.threat = [];
  if (taken.some(k => state.board[k].card)) rebuildRegions(state);
  b.lastTaken = taken;
  if (Object.entries(state.board).some(([k, c]) => c.kind === 'blight' && distance(0, 0, ...k.split(',').map(Number)) === 1)) { b.lost = true; return taken; }
  if (state.round >= b.from - 1) {
    const steps = b.rateLate && state.round + 1 >= b.rateLate.round ? b.rateLate.rate : b.rate;
    const C = candidates(state);
    for (let i = 0; i < steps && C.length; i++) {
      let k;
      if (nextFloat(state.rng) < (b.aim ?? 0.5)) { const d = c => { const [q, r] = c.split(',').map(Number); return distance(0, 0, q, r); }; const m = Math.min(...C.map(d)); const best = C.filter(c => d(c) === m); k = best[nextInt(state.rng, best.length)]; }
      else k = C[nextInt(state.rng, C.length)];
      b.threat.push(k); C.splice(C.indexOf(k), 1);
    }
  }
  return taken;
}

// Purificar (Solo): 2 Provisões + 1 Pedra, uma vez por turno. Limpa um hexágono ameaçado, ou um hexágono de praga
// que não engoliu um terreno (sem carta) e fica ao lado de um terreno teu.
export const PURIFY_COST = { food: 2, stone: 1 };
export function purifyTargets(state) {
  const b = state.blight; if (!b) return [];
  const out = [...(b.threat || [])];
  for (const [k, c] of Object.entries(state.board)) {
    if (c.kind !== 'blight' || c.card) continue;
    const [q, r] = k.split(',').map(Number);
    if (neighbors(q, r).some(([a, d]) => state.board[key(a, d)]?.owner === 0)) out.push(k);
  }
  return [...new Set(out)].sort();
}

// Distância da praga ao Lago (hexágonos que ainda faltam até ficar ao lado dele).
export function blightDistance(state) {
  let m = Infinity;
  for (const [k, c] of Object.entries(state.board)) if (c.kind === 'blight') m = Math.min(m, distance(0, 0, ...k.split(',').map(Number)) - 1);
  return m;
}
