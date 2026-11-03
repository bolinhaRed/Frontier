// Saco de números e ciclo de vida das fichas (rev. 1.4, secção Produção).
// Uma ficha é atribuída quando a carta entra na mão ou no mercado e nunca muda depois.
// Só volta ao saco se a carta sair sem ser colocada.
import { BAG } from '../data/bag.js';
import { nextInt } from './rng.js';

export const freshBag = () => Object.entries(BAG).flatMap(([n, c]) => Array(c).fill(+n));

export function drawToken(state) {
  if (state.bag.length === 0) { state.bag = freshBag(); state.bagsOpened++; }
  const i = nextInt(state.rng, state.bag.length);
  return state.bag.splice(i, 1)[0];
}

// A carta recebe uma ficha (se ainda não tiver).
export function giveToken(state, cardId) {
  if (state.tokens[cardId] == null) state.tokens[cardId] = drawToken(state);
}

// A carta sai sem ser colocada: ficha volta ao saco, carta vai para o fundo do baralho.
export function returnCard(state, cardId) {
  const t = state.tokens[cardId];
  if (t != null) { state.bag.push(t); delete state.tokens[cardId]; }
  state.deck.push(cardId);
}
