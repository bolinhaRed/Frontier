// Acção Expansão (máximo 1): só se colocou no passo 2; paga 2 Madeira + 2 Provisões e joga
// uma segunda carta da mão numa posição legal.
import { canPlaceA, emptyFrontier, parseKey } from '../rules/placement-a.js';
import { placeTerrain } from '../state.js';
import { canPay, pay } from '../points.js';

export function legal(state) {
  const p = state.players[state.active], t = state.turn;
  if (!t.placed || t.expanded || !p.hand.length || !canPay(p, state.balance.expansionCost)) return [];
  const spots = emptyFrontier(state).map(parseKey);
  return p.hand.flatMap(card => spots.map(([q, r]) => ({ type: 'expand', player: state.active, card, q, r, rot: 0 })));
}
export function apply(state, a) {
  const p = state.players[state.active], t = state.turn;
  if (!t.placed) return 'A Expansão só é possível depois de colocares um terreno neste turno.';
  if (t.expanded) return 'Já fizeste uma Expansão neste turno.';
  const i = p.hand.indexOf(a.card); if (i < 0) return 'Essa carta não está na tua mão.';
  if (!canPay(p, state.balance.expansionCost)) return 'A Expansão custa 2 Madeira e 2 Provisões.';
  if (!Number.isInteger(a.rot) || a.rot < 0 || a.rot > 5) return 'Rotação inválida (0 a 5).';
  if (!canPlaceA(state, a.q, a.r)) return 'Esse hexágono não está livre ou não toca em nenhum ocupado.';
  pay(p, state.balance.expansionCost);
  p.hand.splice(i, 1);
  placeTerrain(state, a.card, a.q, a.r, a.rot, state.active);
  t.expanded = true;
}
