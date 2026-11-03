// Turno, passo 2: colocar um terreno da mão. Sem cartas na mão, o turno é "sem colocação".
import { canPlaceA, emptyFrontier, parseKey } from '../rules/placement-a.js';
import { placeTerrain } from '../state.js';

export function legal(state) {
  const p = state.players[state.active];
  if (p.hand.length === 0) return [{ type: 'skipPlace', player: state.active }];
  const spots = emptyFrontier(state).map(parseKey);
  return p.hand.flatMap(card => spots.map(([q, r]) => ({ type: 'place', player: state.active, card, q, r, rot: 0 })));
}

export function apply(state, a) {
  const p = state.players[state.active];
  if (a.type === 'skipPlace') {
    if (p.hand.length > 0) return 'Só podes passar a colocação se não tiveres cartas na mão.';
  } else {
    const i = p.hand.indexOf(a.card);
    if (i < 0) return 'Essa carta não está na tua mão.';
    if (!Number.isInteger(a.rot) || a.rot < 0 || a.rot > 5) return 'Rotação inválida (0 a 5).';
    if (!canPlaceA(state, a.q, a.r)) return 'Esse hexágono não está livre ou não toca em nenhum ocupado.';
    p.hand.splice(i, 1);
    placeTerrain(state, a.card, a.q, a.r, a.rot, state.active);
    state.turn.placed = true;
  }
  state.step = 'actions';
}
