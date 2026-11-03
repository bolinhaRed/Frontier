// Pontuação final e vencedor (rev. 1.4, secção Resumo da pontuação; D6 e D7).
import { influence } from './regions.js';
import { PRIVATE_CHECKS } from './objectives.js';
import { structuresOf } from './structures.js';
import { totalResources } from '../points.js';

export function finalScoring(state) {
  const b = state.balance;
  const rows = Object.fromEntries(state.players.map(p => [p.id, { regions: 0, private: 0, hardLand: 0, leftovers: 0 }]));
  // Regiões com 3 ou mais terrenos: 1.º recebe o tamanho; 2.º metade (para baixo).
  // Empate no 1.º: todos recebem o tamanho e não há 2.º. D7: só influência > 0 conta.
  for (const rg of state.regions) {
    const size = rg.hexes.length; if (size < b.finalRegionMinSize) continue;
    const inf = influence(state, rg);
    const vals = [...new Set(Object.values(inf).filter(v => v > 0))].sort((x, y) => y - x);
    if (!vals.length) continue;
    const firsts = Object.keys(inf).filter(p => inf[p] === vals[0]);
    firsts.forEach(p => { rows[p].regions += size; });
    if (firsts.length === 1 && vals.length > 1) Object.keys(inf).filter(p => inf[p] === vals[1]).forEach(p => { rows[p].regions += Math.floor(size / 2); });
  }
  for (const p of state.players) {
    const r = rows[p.id];
    if (p.private && PRIVATE_CHECKS[p.private](state, p.id)) r.private = b.privatePoints;
    for (const c of Object.values(state.board)) if (c.kind === 'terrain' && c.owner === p.id) r.hardLand += b.hardLand[c.token] || 0;
    r.leftovers = Math.floor(totalResources(p) / b.leftoverPerPoint);
    r.total = p.score + r.regions + r.private + r.hardLand + r.leftovers;
    r.structures = structuresOf(state, p.id);
    r.resources = totalResources(p);
    r.seat = state.order.indexOf(p.id);
  }
  // Desempate: mais estruturas; depois mais recursos; depois quem joga mais tarde na ordem.
  const ranking = state.players.map(p => p.id).sort((a, c) => {
    const A = rows[a], C = rows[c];
    return C.total - A.total || C.structures - A.structures || C.resources - A.resources || C.seat - A.seat;
  });
  return { rows, ranking, winner: ranking[0] };
}
