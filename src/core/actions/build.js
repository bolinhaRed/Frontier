// Acção Construir (máximo 2 por turno; Aldeia → Castelo conta como uma). Pontos no momento da construção.
import { STRUCTURES, STRUCTURE_ORDER } from '../../data/structures.js';
import { buildError, structureCost } from '../rules/structures.js';
import { award, pay } from '../points.js';

export function legal(state) {
  const pid = state.active, out = [];
  for (const k of Object.keys(state.board)) for (const s of STRUCTURE_ORDER)
    if (!buildError(state, pid, s, k)) { const [q, r] = k.split(',').map(Number); out.push({ type: 'build', player: pid, structure: s, q, r }); }
  return out;
}
export function apply(state, a) {
  const k = a.q + ',' + a.r, err = buildError(state, state.active, a.structure, k);
  if (err) return err;
  const s = STRUCTURES[a.structure], c = state.board[k], p = state.players[state.active];
  pay(p, structureCost(state, a.structure));
  const gain = s.over ? s.points - STRUCTURES[s.over].points : s.points;   // Castelo: +3 sobre a Aldeia
  c.structure = a.structure;
  state.built[a.structure] = (state.built[a.structure] || 0) + 1;
  award(state, state.active, 'structures', gain);
  state.turn.builds++;
}
