// Colocação inicial (preparação, passo 6): o jogador activo coloca a carta que tirou.
// No Modo B a carta já vem escolhida pelo algoritmo da preparação (state.setup.ignore indica a excepção de biomas).
import { canPlaceA, emptyFrontier, parseKey } from '../rules/placement-a.js';
import { canPlaceB, legalSpots } from '../rules/placement-b.js';
import { placeTerrain, beginSetupPlacement, finishSetup } from '../state.js';

export function legal(state) {
  const s = state.setup;
  if (state.mode === 'B') return legalSpots(state, s.card, { ignoreBiomes: s.ignore }).map(x => ({ type: 'setupPlace', player: state.active, ...x }));
  return emptyFrontier(state).map(k => { const [q, r] = parseKey(k); return { type: 'setupPlace', player: state.active, q, r, rot: 0 }; });
}

export function apply(state, a) {
  const s = state.setup;
  if (state.mode === 'B' ? !canPlaceB(state, s.card, a.q, a.r, a.rot | 0, { ignoreBiomes: s.ignore }) : !canPlaceA(state, a.q, a.r)) return 'Essa posição não é legal.';
  placeTerrain(state, s.card, a.q, a.r, a.rot | 0, state.active);   // marcos e Contribuição também na preparação; presságios não disparam
  s.card = null; s.index++;
  if (s.index >= s.seq.length) finishSetup(state); else beginSetupPlacement(state);
}
