// Colocação no Modo B (Frontier Rules): regras do Modo A + biomas, Montanhas e Rios.
import { key, neighbors } from '../hex.js';
import { COMPAT, RIVER_OPENINGS } from '../../data/frontier-rules.js';
import { canPlaceA, emptyFrontier, parseKey } from './placement-a.js';

const NEIGHBOUR = (q, r, d) => { const [dq, dr] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]][d]; return key(q + dq, r + dr); };
export const openings = rot => RIVER_OPENINGS.map(o => (((o - rot) % 6) + 6) % 6);
const isWaterTerrain = t => t === 'lake' || t === 'river';

// Bioma de um hexágono para a compatibilidade (null = compatível com tudo).
function biomeOf(c) {
  if (!c || c.kind === 'lake' || c.kind === 'site') return null;
  if (isWaterTerrain(c.terrain)) return null;
  return c.biome || null;
}

export function biomeOk(state, terrain, biome, q, r) {
  if (isWaterTerrain(terrain)) return true;
  return neighbors(q, r).every(([a, b]) => { const nb = biomeOf(state.board[key(a, b)]); return !nb || COMPAT[biome].includes(nb); });
}

const isHillOrMountain = c => c && c.kind === 'terrain' && (c.terrain === 'hills' || c.terrain === 'mountains');
const isLake = c => c && (c.kind === 'lake' || (c.kind === 'terrain' && c.terrain === 'lake'));
const isRiver = c => c && c.kind === 'terrain' && c.terrain === 'river';

// Rio: cada abertura dá para vazio, Lago, Colina, Montanha ou abertura de Rio virada para ela;
// pelo menos uma liga a um Rio ou termina num Lago, Colina ou Montanha.
export function riverOk(state, q, r, rot) {
  let anchored = false;
  for (const d of openings(rot)) {
    const c = state.board[NEIGHBOUR(q, r, d)];
    if (!c) continue;
    if (isLake(c) || isHillOrMountain(c)) { anchored = true; continue; }
    if (isRiver(c)) { const [nq, nr] = parseKey(NEIGHBOUR(q, r, d)); if (openings(c.rot || 0).includes((d + 3) % 6)) { anchored = true; continue; } }
    return false;
  }
  return anchored;
}

export function canPlaceB(state, cardId, q, r, rot, { ignoreBiomes = false } = {}) {
  if (!canPlaceA(state, q, r)) return false;
  const c = state.cards[cardId];
  if (!ignoreBiomes && !biomeOk(state, c.terrain, c.biome, q, r)) return false;
  if (c.terrain === 'mountains' && !neighbors(q, r).some(([a, b]) => isHillOrMountain(state.board[key(a, b)]))) return false;
  if (c.terrain === 'river' && !riverOk(state, q, r, rot)) return false;
  return true;
}

// Rotações a considerar: 6 para o Rio (só as distintas), 1 para os outros.
export const rotationsFor = (state, cardId) => (state.cards[cardId].terrain === 'river' ? [0, 1, 2, 3, 4, 5] : [0]);

export function legalSpots(state, cardId, opts) {
  const out = [];
  for (const k of emptyFrontier(state)) { const [q, r] = parseKey(k); for (const rot of rotationsFor(state, cardId)) if (canPlaceB(state, cardId, q, r, rot, opts)) out.push({ q, r, rot }); }
  return out;
}
export const hasSpot = (state, cardId, opts) => emptyFrontier(state).some(k => { const [q, r] = parseKey(k); return rotationsFor(state, cardId).some(rot => canPlaceB(state, cardId, q, r, rot, opts)); });

// Rios contínuos: troços ligados abertura com abertura (Lagos, Colinas e Montanhas não unem rios).
export function riverComponents(state) {
  const rivers = Object.keys(state.board).filter(k => isRiver(state.board[k]));
  const seen = new Set(), out = [];
  for (const k of rivers) {
    if (seen.has(k)) continue;
    const comp = [], stack = [k]; seen.add(k);
    while (stack.length) {
      const cur = stack.pop(); comp.push(cur);
      const [q, r] = parseKey(cur);
      for (const d of openings(state.board[cur].rot || 0)) {
        const nk = NEIGHBOUR(q, r, d), n = state.board[nk];
        if (isRiver(n) && !seen.has(nk) && openings(n.rot || 0).includes((d + 3) % 6)) { seen.add(nk); stack.push(nk); }
      }
    }
    out.push(comp);
  }
  return out;
}
