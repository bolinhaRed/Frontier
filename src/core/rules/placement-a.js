// Colocação no Modo A (Free Frontier): qualquer hexágono vazio adjacente a um ocupado.
import { key, neighbors } from '../hex.js';

export const parseKey = k => k.split(',').map(Number);

export function emptyFrontier(state) {
  const out = new Set();
  for (const k of Object.keys(state.board)) {
    const [q, r] = parseKey(k);
    for (const [nq, nr] of neighbors(q, r)) { const nk = key(nq, nr); if (!state.board[nk]) out.add(nk); }
  }
  return [...out].sort();
}

export function canPlaceA(state, q, r) {
  if (state.board[key(q, r)]) return false;
  return neighbors(q, r).some(([nq, nr]) => state.board[key(nq, nr)]);
}
