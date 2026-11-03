// O 7 (Caravana): 1 recurso à escolha, ou todas as trocas deste turno a 2 por 1.
import { RESOURCES } from '../../data/terrains.js';

export const legal = state => [
  ...RESOURCES.map(resource => ({ type: 'caravan', player: state.active, option: 'resource', resource })),
  ...(state.balance.caravanTrade === false ? [] : [{ type: 'caravan', player: state.active, option: 'trade' }]),
];
export function apply(state, a) {
  if (a.option === 'resource') {
    if (!RESOURCES.includes(a.resource)) return 'Recurso desconhecido.';
    state.players[state.active].resources[a.resource] += 1;
  } else if (a.option !== 'trade' || state.balance.caravanTrade === false) return 'Opção da Caravana desconhecida.';
  state.turn.caravan = a.option;
  state.step = 'place';
}
