// Única forma de alterar o estado: applyAction(estado, acção) → { ok, state } ou { ok: false, error }.
// O estado recebido nunca é alterado; trabalha-se sobre uma cópia.
//
// Turno (rev. 1.4): roll → [caravan, com 7] → place → actions [→ stones] → refill → [limit] → seguinte.
import * as setupPlace from './actions/setup-place.js';
import * as roll from './actions/roll.js';
import * as caravan from './actions/caravan.js';
import * as place from './actions/place.js';
import * as expand from './actions/expand.js';
import * as build from './actions/build.js';
import * as explore from './actions/explore.js';
import * as trade from './actions/trade.js';
import * as endActions from './actions/end-actions.js';
import * as refill from './actions/refill.js';
import * as discard from './actions/discard.js';
import { startTurn } from './state.js';
import { checkPublicObjectives } from './rules/objectives.js';
import { finalScoring } from './rules/scoring.js';

// Por passo: que tipos de acção são aceites e como se aplicam.
const STEPS = {
  setup: { setupPlace },
  roll: { roll },
  caravan: { caravan },
  place: { place, skipPlace: place },
  actions: { build, expand, explore, trade, endActions },
  stones: { reorderEvents: { legal: explore.legalReorder, apply: explore.applyReorder } },
  refill: { drawDeck: refill, buyMarket: refill },
  limit: { discard },
};
const stepOf = state => (state.phase === 'setup' ? 'setup' : state.phase === 'turn' ? state.step : null);

export function legalActions(state) {
  const handlers = STEPS[stepOf(state)];
  if (!handlers) return [];
  return [...new Set(Object.values(handlers))].flatMap(h => h.legal(state));
}

export function applyAction(state, action) {
  if (!action || typeof action.type !== 'string') return { ok: false, error: 'Acção inválida.' };
  if (state.phase === 'over') return { ok: false, error: 'A partida já terminou.' };
  if (action.player !== state.active) return { ok: false, error: 'Não é a vez desse jogador.' };
  const h = STEPS[stepOf(state)]?.[action.type];
  if (!h) return { ok: false, error: `A acção ${action.type} não é possível agora.` };
  const next = structuredClone(state);
  const err = h.apply(next, action);
  if (err) return { ok: false, error: err };
  next.log.push(action);
  afterAction(next);
  return { ok: true, state: next };
}

function afterAction(state) {
  if (state.phase !== 'turn') return;
  if (state.step === 'refill') {
    const p = state.players[state.active];
    if (p.hand.length >= state.balance.handSize || refill.legal(state).length === 0) {
      state.step = discard.excess(state, state.active) > 0 ? 'limit' : 'done';
    }
  } else if (state.step === 'limit' && discard.excess(state, state.active) === 0) state.step = 'done';
  // Objectivos públicos: verificados depois de cada acção, para todos os jogadores.
  checkPublicObjectives(state);
  if (state.step === 'done') endTurn(state);
}

function endTurn(state) {
  const pos = state.order.indexOf(state.active);
  if (pos < state.order.length - 1) { startTurn(state, state.order[pos + 1]); return; }
  // Fim da ronda. A partida acaba na última ronda ou na ronda em que o baralho se esgotou.
  if (state.round >= state.maxRounds || state.deckExhausted) {
    state.phase = 'over'; state.active = null; state.step = null; state.turn = null;
    state.final = finalScoring(state);
    return;
  }
  // D1: no fim das rondas 4 e 8 haveria acontecimento; os efeitos só existem a partir da etapa 6.
  state.round++;
  startTurn(state, state.order[0]);
}
