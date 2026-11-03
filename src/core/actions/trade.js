// Acção Trocar com o banco (sem limite): 3 recursos iguais por 1 de outro tipo; 2 por 1 depois da Caravana.
import { RESOURCES } from '../../data/terrains.js';

const rate = state => (state.turn.caravan === 'trade' ? state.balance.caravanTradeRate : state.balance.tradeRate);
export function legal(state) {
  const p = state.players[state.active], n = rate(state), out = [];
  for (const give of RESOURCES) if (p.resources[give] >= n) for (const get of RESOURCES) if (get !== give) out.push({ type: 'trade', player: state.active, give, get });
  return out;
}
export function apply(state, a) {
  const p = state.players[state.active], n = rate(state);
  if (!RESOURCES.includes(a.give) || !RESOURCES.includes(a.get) || a.give === a.get) return 'Troca inválida.';
  if (p.resources[a.give] < n) return `Precisas de ${n} ${a.give} para esta troca.`;
  p.resources[a.give] -= n; p.resources[a.get] += 1;
}
