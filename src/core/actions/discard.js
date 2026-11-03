// Limite de 10 recursos: no fim do próprio turno, o jogador activo devolve o excesso, escolhendo quais.
import { RESOURCES } from '../../data/terrains.js';
import { totalResources } from '../points.js';

export const excess = (state, pid) => Math.max(0, totalResources(state.players[pid]) - state.balance.resourceCap);

export function legal(state) {
  const p = state.players[state.active], n = excess(state, state.active), out = [];
  const [w, s] = [p.resources.wood, p.resources.stone];
  for (let a = 0; a <= Math.min(n, w); a++) for (let b = 0; b <= Math.min(n - a, s); b++) {
    const c = n - a - b; if (c <= p.resources.food) out.push({ type: 'discard', player: state.active, give: { wood: a, stone: b, food: c } });
  }
  return out;
}
export function apply(state, a) {
  const p = state.players[state.active], n = excess(state, state.active), g = a.give || {};
  const sum = RESOURCES.reduce((t, r) => t + (g[r] | 0), 0);
  if (sum !== n || RESOURCES.some(r => (g[r] | 0) < 0 || (g[r] | 0) > p.resources[r])) return `Tens de devolver exactamente ${n} recursos que tenhas.`;
  RESOURCES.forEach(r => { p.resources[r] -= g[r] | 0; });
}
