// Objectivos públicos e privados (rev. 1.4, secção Objectivos; D5 nos privados).
import { key, neighbors } from '../hex.js';
import { TERRAINS, FAMILIES } from '../../data/terrains.js';
import { regionAt, hasMajority } from './regions.js';
import { structuresOf } from './structures.js';
import { award } from '../points.js';

const own = (state, pid) => Object.entries(state.board).filter(([, c]) => c.owner === pid);
const ownTerrains = (state, pid) => own(state, pid).filter(([, c]) => c.kind === 'terrain' && TERRAINS[c.terrain]);
const explored = (state, pid) => Object.values(state.board).filter(c => c.kind === 'site' && c.explored === pid);
const majorities = (state, pid, test) => state.regions.filter(rg => test(rg) && hasMajority(state, rg, pid)).length;

// Maior grupo ligado de hexágonos próprios que cumprem o filtro.
function largestOwnGroup(state, pid, filter) {
  const cells = new Set(own(state, pid).filter(([, c]) => filter(c)).map(([k]) => k));
  let best = 0; const seen = new Set();
  for (const k of cells) {
    if (seen.has(k)) continue;
    let n = 0; const stack = [k]; seen.add(k);
    while (stack.length) {
      const cur = stack.pop(); n++;
      const [q, r] = cur.split(',').map(Number);
      for (const [a, b] of neighbors(q, r)) { const nk = key(a, b); if (cells.has(nk) && !seen.has(nk)) { seen.add(nk); stack.push(nk); } }
    }
    best = Math.max(best, n);
  }
  return best;
}

export const PUBLIC_CHECKS = {
  pioneer: (s, p) => new Set(ownTerrains(s, p).map(([, c]) => c.biome)).size >= 4,
  lumberjack: (s, p) => ownTerrains(s, p).filter(([, c]) => c.terrain === 'forest' || c.terrain === 'woods').length >= 5,
  waters: (s, p) => ownTerrains(s, p).filter(([, c]) => c.terrain === 'lake' || c.terrain === 'river').length >= 4,
  mason: (s, p) => structuresOf(s, p, c => c.terrain === 'hills' || c.terrain === 'mountains') >= 2,
  explorer: (s, p) => explored(s, p).length >= 2,
  builder: (s, p) => structuresOf(s, p) >= 4,
  hardland: (s, p) => ownTerrains(s, p).filter(([, c]) => [2, 3, 11, 12].includes(c.token)).length >= 3,
  majority: (s, p) => majorities(s, p, rg => rg.hexes.length >= 4) >= 2,
  farmer: (s, p) => structuresOf(s, p, c => c.structure === 'farm') >= 2,
  // Vizinho: hexágonos próprios (incluindo Árvores mortas e Vulcões) com um lado em comum
  // com um hexágono de outro jogador. Lago neutro e locais não são de ninguém.
  neighbor: (s, p) => own(s, p).filter(([k]) => { const [q, r] = k.split(',').map(Number);
    return neighbors(q, r).some(([a, b]) => { const o = s.board[key(a, b)]?.owner; return o != null && o !== p; }); }).length >= 6,
};

export const PRIVATE_CHECKS = {
  linked_greenlands: (s, p) => largestOwnGroup(s, p, c => c.kind === 'terrain' && c.biome === 'greenlands') >= 3,
  linked_drylands: (s, p) => largestOwnGroup(s, p, c => c.kind === 'terrain' && c.biome === 'drylands') >= 3,
  linked_sandlands: (s, p) => largestOwnGroup(s, p, c => c.kind === 'terrain' && c.biome === 'sandlands') >= 3,
  linked_icelands: (s, p) => largestOwnGroup(s, p, c => c.kind === 'terrain' && c.biome === 'icelands') >= 3,
  linked_deadlands: (s, p) => largestOwnGroup(s, p, c => c.kind === 'terrain' && c.biome === 'deadlands') >= 3,
  castle: (s, p) => structuresOf(s, p, c => c.structure === 'castle') >= 1,
  plain6: (s, p) => majorities(s, p, rg => rg.family === 'plain' && rg.hexes.length >= 6) >= 1,
  range5: (s, p) => majorities(s, p, rg => rg.family === 'range' && rg.hexes.length >= 5) >= 1,
  families: (s, p) => FAMILIES.every(f => ownTerrains(s, p).filter(([, c]) => TERRAINS[c.terrain].family === f).length >= 2),
  sites2: (s, p) => new Set(explored(s, p).map(c => c.site)).size >= 2,
};

// Verifica os objectivos públicos de todos os jogadores. Quem cumpre no mesmo momento recebe o
// prémio do lugar livre; se partilharem o 1.º lugar, deixa de haver 2.º. Um objectivo cumprido não se perde.
export function checkPublicObjectives(state) {
  const [p1, p2] = state.balance.publicPoints;
  for (const ob of state.publicObjectives) {
    if (ob.closed) continue;
    const done = new Set([...ob.first, ...ob.second]);
    const now = state.order.filter(pid => !done.has(pid) && PUBLIC_CHECKS[ob.id](state, pid));
    if (!now.length) continue;
    if (!ob.first.length) {
      ob.first = now; now.forEach(pid => award(state, pid, 'objectives', p1));
      if (now.length > 1) ob.closed = true;
    } else {
      ob.second = now; now.forEach(pid => award(state, pid, 'objectives', p2));
      ob.closed = true;
    }
  }
}
