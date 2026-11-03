// Colocação inicial (preparação, passo 6): o jogador activo coloca a carta que tirou.
import { canPlaceA, emptyFrontier, parseKey } from '../rules/placement-a.js';
import { placeTerrain, beginSetupPlacement, finishSetup } from '../state.js';

export function legal(state) {
  return emptyFrontier(state).map(k => { const [q, r] = parseKey(k); return { type: 'setupPlace', player: state.active, q, r, rot: 0 }; });
}

export function apply(state, a) {
  if (!canPlaceA(state, a.q, a.r)) return 'Esse hexágono não está livre ou não toca em nenhum ocupado.';
  const s = state.setup;
  placeTerrain(state, s.card, a.q, a.r, a.rot, state.active);   // marcos e Contribuição também na preparação
  s.card = null; s.index++;
  if (s.index >= s.seq.length) finishSetup(state); else beginSetupPlacement(state);
}
