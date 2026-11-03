// Regiões, influência, marcos, fusão, divisão e Contribuição (rev. 1.4, secção Regiões e competição).
// Uma região é um grupo de terrenos adjacentes da mesma família, de qualquer bioma e dono.
// O estado guarda, por região: hexágonos, maior marco atribuído e Contribuições usadas
// (contrib[jogador] = marco da região quando a recebeu). As regiões recalculam-se a partir do
// tabuleiro; os dados passam das antigas para as novas por sobreposição de hexágonos
// (fusão: maior marco e registos de todas as partes; divisão: cada parte herda os da original).
import { key, neighbors } from '../hex.js';
import { TERRAINS } from '../../data/terrains.js';
import { STRUCTURES } from '../../data/structures.js';

const FAMILY_RESOURCE = { plain: 'food', forest: 'wood', range: 'stone', water: 'food' };
export const familyResource = f => FAMILY_RESOURCE[f];

// Família de um hexágono, ou null se não entra em regiões (Lago neutro, locais, Árvores mortas, Vulcão).
export function familyOf(cell) {
  if (!cell || cell.kind !== 'terrain') return null;
  return TERRAINS[cell.terrain]?.family ?? null;
}

export function components(board) {
  const seen = new Set(), out = [];
  for (const k of Object.keys(board).sort()) {
    const fam = familyOf(board[k]); if (!fam || seen.has(k)) continue;
    const hexes = [], stack = [k]; seen.add(k);
    while (stack.length) {
      const cur = stack.pop(); hexes.push(cur);
      const [q, r] = cur.split(',').map(Number);
      for (const [nq, nr] of neighbors(q, r)) {
        const nk = key(nq, nr);
        if (!seen.has(nk) && familyOf(board[nk]) === fam) { seen.add(nk); stack.push(nk); }
      }
    }
    out.push({ family: fam, hexes: hexes.sort() });
  }
  return out;
}

export function rebuildRegions(state) {
  const old = state.regions || [];
  const byHex = new Map();
  old.forEach((r, i) => r.hexes.forEach(h => byHex.set(h, i)));
  state.regions = components(state.board).map(c => {
    const parts = [...new Set(c.hexes.map(h => byHex.get(h)).filter(i => i !== undefined))].map(i => old[i]).filter(r => r.family === c.family);
    const contrib = {};
    for (const p of parts) for (const [pid, lvl] of Object.entries(p.contrib)) contrib[pid] = Math.max(contrib[pid] ?? -1, lvl);
    return { family: c.family, hexes: c.hexes, milestone: Math.max(0, ...parts.map(p => p.milestone)), contrib };
  });
  return state.regions;
}

export const regionAt = (state, k) => state.regions.find(r => r.hexes.includes(k)) || null;
export const structureInfluence = cell => (cell.structure ? STRUCTURES[cell.structure].influence : 0);

// Influência: 1 por terreno próprio + influência da estrutura.
export function influence(state, region) {
  const inf = Object.fromEntries(state.players.map(p => [p.id, 0]));
  for (const h of region.hexes) { const c = state.board[h]; if (c.owner != null) inf[c.owner] += 1 + structureInfluence(c); }
  return inf;
}

// Maioria = mais influência do que cada um dos outros; empate no topo não é maioria.
export function hasMajority(state, region, pid) {
  const inf = influence(state, region);
  return inf[pid] > 0 && Object.entries(inf).every(([o, v]) => +o === pid || inf[pid] > v);
}

// Líderes: todos os empatados com a maior influência, se maior que zero.
export function leaders(state, region) {
  const inf = influence(state, region), top = Math.max(...Object.values(inf));
  return top > 0 ? Object.keys(inf).filter(p => inf[p] === top).map(Number) : [];
}

// Patamares 3, 5, 7, 9 e depois a cada 2; valem 2, 3, 4, 5 e 5 daí em diante.
export function tiersBetween(balance, from, size) {
  const out = [];
  for (let t = balance.milestoneMinSize; t <= size; t += 2) if (t > from) out.push(t);
  return out;
}
export function tierValue(balance, t) {
  const v = balance.milestoneValues;
  return v[Math.min((t - balance.milestoneMinSize) / 2, v.length - 1)];
}

// Antes de colocar em k: Contribuição. Regiões tocadas da mesma família, com 3 ou mais terrenos,
// onde o jogador não tem maioria e ainda não a usou desde o último marco. D4: no máximo 1 recurso;
// o limite fica gasto em todas as regiões com direito. Devolve o recurso recebido ou null.
export function applyContribution(state, k, pid, terrain) {
  const fam = TERRAINS[terrain].family;
  const [q, r] = k.split(',').map(Number);
  const touching = [...new Set(neighbors(q, r).map(([a, b]) => regionAt(state, key(a, b))).filter(rg => rg && rg.family === fam))];
  const eligible = touching.filter(rg => rg.hexes.length >= state.balance.contributionMinSize
    && !hasMajority(state, rg, pid) && (rg.contrib[pid] ?? -1) < rg.milestone);
  if (!eligible.length) return null;
  eligible.forEach(rg => { rg.contrib[pid] = rg.milestone; });
  const res = familyResource(fam);
  state.players[pid].resources[res] += 1;
  return res;
}

// Depois de colocar em k: recalcula as regiões e paga os patamares atingidos, por ordem crescente,
// aos líderes desse momento (todos os empatados recebem o valor inteiro).
export function payMilestones(state, k, award) {
  rebuildRegions(state);
  const rg = regionAt(state, k); if (!rg) return [];
  const paid = [];
  for (const t of tiersBetween(state.balance, rg.milestone, rg.hexes.length)) {
    const v = tierValue(state.balance, t), who = leaders(state, rg);
    who.forEach(pid => award(state, pid, 'milestones', v));
    rg.milestone = t;
    paid.push({ tier: t, value: v, to: who });
  }
  return paid;
}
