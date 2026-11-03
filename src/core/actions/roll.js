// Turno, passo 1: lançar 2D6 com o gerador da partida. Com 7 ninguém produz e o jogador escolhe a Caravana.
// Solo («escolher em vez de sorte»): lançam-se 3 dados e o jogador escolhe 2 (passo dicePick).
import { nextInt } from '../rng.js';
import { produce } from '../rules/production.js';

export const legal = state => [{ type: 'roll', player: state.active }];
export function apply(state) {
  if (state.solo?.diceChoice) {
    state.turn.dice3 = [0, 1, 2].map(() => nextInt(state.rng, 6) + 1);
    state.step = 'dicePick';
    return;
  }
  resolveDice(state, [nextInt(state.rng, 6) + 1, nextInt(state.rng, 6) + 1]);
}

function resolveDice(state, d) {
  state.turn.dice = d;
  const sum = d[0] + d[1];
  if (sum === 7) { state.step = 'caravan'; return; }
  state.turn.produced = produce(state, sum);
  state.step = 'place';
}

const PAIRS = [[0, 1], [0, 2], [1, 2]];
export const legalPick = state => PAIRS.map(pair => ({ type: 'pickDice', player: state.active, pair }));
export function applyPick(state, a) {
  const ok = PAIRS.some(p => p[0] === a.pair?.[0] && p[1] === a.pair?.[1]);
  if (!ok) return 'Escolhe 2 dos 3 dados.';
  const d3 = state.turn.dice3;
  resolveDice(state, [d3[a.pair[0]], d3[a.pair[1]]]);
}
