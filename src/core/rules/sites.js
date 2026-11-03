// Exploração de locais especiais (rev. 1.4, secção Locais especiais).
import { key, neighbors } from '../hex.js';
import { canPay } from '../points.js';

export function exploreError(state, pid, k) {
  const c = state.board[k];
  if (!c || c.kind !== 'site') return 'Aí não há nenhum local especial.';
  if (c.explored != null) return 'Esse local já foi explorado.';
  if (state.turn.explored) return 'Já exploraste um local neste turno.';
  const [q, r] = k.split(',').map(Number);
  if (!neighbors(q, r).some(([a, b]) => state.board[key(a, b)]?.owner === pid)) return 'Precisas de um terreno teu adjacente ao local.';
  if (!canPay(state.players[pid], state.balance.exploreCost)) return 'Explorar custa 2 Provisões.';
  return null;
}
