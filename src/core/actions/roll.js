// Turno, passo 1: lançar 2D6 com o gerador da partida. Com 7 ninguém produz e o jogador escolhe a Caravana.
import { nextInt } from '../rng.js';
import { produce } from '../rules/production.js';

export const legal = state => [{ type: 'roll', player: state.active }];
export function apply(state) {
  const d = [nextInt(state.rng, 6) + 1, nextInt(state.rng, 6) + 1];
  state.turn.dice = d;
  const sum = d[0] + d[1];
  if (sum === 7) { state.step = 'caravan'; return; }
  state.turn.produced = produce(state, sum);
  state.step = 'place';
}
