// Acção Purificar (só no Solo com praga). Ver src/core/rules/blight.js.
import { purifyTargets, PURIFY_COST } from '../rules/blight.js';
import { canPay, pay } from '../points.js';

export function legal(state) {
  if (!state.blight || state.turn.purified || !canPay(state.players[0], PURIFY_COST)) return [];
  return purifyTargets(state).map(k => { const [q, r] = k.split(',').map(Number); return { type: 'purify', player: state.active, q, r }; });
}
export function apply(state, a) {
  const k = a.q + ',' + a.r;
  if (!state.blight) return 'Só há praga no Solo.';
  if (state.turn.purified) return 'Só podes purificar uma vez por turno.';
  if (!canPay(state.players[0], PURIFY_COST)) return 'Purificar custa 2 Provisões e 1 Pedra.';
  if (!purifyTargets(state).includes(k)) return 'Esse hexágono não pode ser purificado.';
  pay(state.players[0], PURIFY_COST);
  state.blight.threat = (state.blight.threat || []).filter(x => x !== k);
  if (state.board[k]?.kind === 'blight') delete state.board[k];
  state.turn.purified = true;
}
