// Campanha Solo: objectivos dos territórios, desafios e estrelas.
import { key, neighbors } from '../hex.js';
import { structuresOf } from './structures.js';
import { regionAt } from './regions.js';

const own = (s, pid) => Object.entries(s.board).filter(([, c]) => c.owner === pid);
const ownTerrains = (s, pid) => own(s, pid).filter(([, c]) => c.kind === 'terrain');

// Liga o Lago (0,0) a um local: caminho de hexágonos próprios do vizinho do Lago ao vizinho do local.
function connected(s, pid, siteKey) {
  const mine = new Set(own(s, pid).map(([k]) => k));
  const near = k => { const [q, r] = k.split(',').map(Number); return neighbors(q, r).map(([a, b]) => key(a, b)); };
  const goal = new Set(near(siteKey));
  const stack = near('0,0').filter(k => mine.has(k)), seen = new Set(stack);
  while (stack.length) {
    const k = stack.pop(); if (goal.has(k)) return true;
    for (const n of near(k)) if (mine.has(n) && !seen.has(n)) { seen.add(n); stack.push(n); }
  }
  return false;
}

export const MAIN_CHECKS = {
  clearing: s => structuresOf(s, 0, c => c.structure === 'farm') >= 2 && s.regions.some(rg => rg.family === 'plain' && rg.hexes.length >= 5),
  connect: (s, m) => connected(s, 0, m.site),
  exploreAll: s => Object.values(s.board).filter(c => c.kind === 'site').every(c => c.explored === 0),
  castle: s => structuresOf(s, 0, c => c.structure === 'castle') >= 1,
  rangeRegion: (s, m) => s.regions.some(rg => rg.family === 'range' && rg.hexes.length >= m.n),
  riverLong: s => (s.riversScored || []).length > 0,
  pass: s => structuresOf(s, 0, c => c.structure === 'keep') >= 2 && s.regions.some(rg => rg.family === 'range' && rg.hexes.length >= 5),
  oasis: s => ownTerrains(s, 0).filter(([, c]) => c.terrain === 'lake' || c.terrain === 'river').length >= 4 && structuresOf(s, 0, c => c.structure === 'farm') >= 3,
  volcano: s => Object.entries(s.board).some(([k, c]) => c.kind === 'volcano' && neighbors(...k.split(',').map(Number)).some(([a, b]) => { const n = s.board[key(a, b)]; return n && n.owner === 0 && n.structure; })),
  lost: s => Object.values(s.board).some(c => c.site === 'graveyard' && c.explored === 0) && structuresOf(s, 0, c => c.structure === 'wonder') >= 1,
  heart: s => structuresOf(s, 0, c => c.structure === 'wonder') >= 1 && s.regions.filter(rg => rg.hexes.length >= 5).length >= 3
    && Object.values(s.board).filter(c => c.kind === 'site').every(c => c.explored === 0),
  // Encruzilhada: só se avalia depois dos 2 acontecimentos.
  survive: s => (s.eventDiscard || []).length >= 2 && !s.event && !(s.players[0].points.events < 0)
    && !own(s, 0).some(([, c]) => c.kind === 'deadtrees') && structuresOf(s, 0) >= 4
    && ownTerrains(s, 0).filter(([, c]) => c.terrain === 'forest' || c.terrain === 'woods').length >= 3,
};

export const CHALLENGE_CHECKS = {
  noMarket: s => !s.log.some(a => a.type === 'buyMarket'),
  noExpansion: s => !s.log.some(a => a.type === 'expand'),
  tiles: (s, c) => ownTerrains(s, 0).length >= c.n,
  structures: (s, c) => structuresOf(s, 0) >= c.n,
  explored: (s, c) => Object.values(s.board).filter(x => x.kind === 'site' && x.explored === 0).length >= c.n,
  early: s => s.solo.concludedRound != null && s.solo.concludedRound <= s.maxRounds - 2,
  score: (s, c) => (s.final?.rows[0]?.total ?? s.players[0].score) >= c.n,
};

// Depois de cada acção: regista a ronda em que o objectivo principal foi cumprido (não se perde).
export function checkSolo(state) {
  if (!state.solo || state.solo.achievedRound != null) return;
  if (MAIN_CHECKS[state.solo.main.id](state, state.solo.main)) state.solo.achievedRound = state.round;
}

// Resultado final: conquista (1 estrela) + 1 estrela por desafio cumprido, só se conquistou.
export function soloResult(state) {
  const won = state.solo.achievedRound != null && !state.blight?.lost;   // a praga no Lago perde o território
  const challenges = state.solo.challenges.map(c => won && CHALLENGE_CHECKS[c.id](state, c));
  return { won, challenges, stars: won ? 1 + challenges.filter(Boolean).length : 0 };
}
