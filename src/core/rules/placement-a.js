// Colocação no Modo A (Free Frontier): qualquer hexágono vazio adjacente a um ocupado.
import { key, neighbors, distance } from '../hex.js';

// Solo: só se coloca dentro da área do território (raio state.area à volta do Lago).
const inArea = (state, q, r) => state.area == null || distance(0, 0, q, r) <= state.area;

export const parseKey = k => k.split(',').map(Number);

export function emptyFrontier(state) {
  const out = new Set();
  for (const k of Object.keys(state.board)) {
    const [q, r] = parseKey(k);
    for (const [nq, nr] of neighbors(q, r)) { const nk = key(nq, nr); if (!state.board[nk] && inArea(state, nq, nr)) out.add(nk); }
  }
  return [...out].sort();
}

export function canPlaceA(state, q, r) {
  if (state.board[key(q, r)] || !inArea(state, q, r)) return false;
  return neighbors(q, r).some(([nq, nr]) => state.board[key(nq, nr)]);
}
