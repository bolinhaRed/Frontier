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
import { startEvent, eventChooser, legalEventChoices, applyEventChoice, expireEffects } from './rules/events.js';
import { checkSolo, soloResult } from './rules/solo.js';

// Por passo: que tipos de acção são aceites e como se aplicam.
const STEPS = {
  setup: { setupPlace },
  roll: { roll },
  caravan: { caravan },
  place: { place, skipPlace: place, redrawHand: place },
  actions: { build, expand, explore, trade, endActions, concludeSolo: endActions },
  stones: { reorderEvents: { legal: explore.legalReorder, apply: explore.applyReorder } },
  refill: { drawDeck: refill, buyMarket: refill },
  limit: { discard },
  event: { eventChoice: { legal: legalEventChoices, apply: applyEventChoice } },
};
const stepOf = state => (state.event ? 'event' : state.phase === 'setup' ? 'setup' : state.phase === 'turn' ? state.step : null);
// Quem decide agora: quem escolhe no acontecimento, ou o jogador activo.
export const currentPlayer = state => (state.event ? eventChooser(state) : state.active);

export function legalActions(state) {
  const handlers = STEPS[stepOf(state)];
  if (!handlers) return [];
  return [...new Set(Object.values(handlers))].flatMap(h => h.legal(state));
}

export function applyAction(state, action) {
  if (!action || typeof action.type !== 'string') return { ok: false, error: 'Acção inválida.' };
  if (state.phase === 'over') return { ok: false, error: 'A partida já terminou.' };
  if (action.player !== currentPlayer(state)) return { ok: false, error: 'Não é a vez desse jogador.' };
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
  checkSolo(state);
  if (state.step === 'conclude') { endGame(state); return; }
  if (state.event) { checkPublicObjectives(state); return; }
  if (state.afterEvent === 'nextRound') { state.afterEvent = null; checkPublicObjectives(state); nextRound(state); return; }
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
  expireEffects(state);
  if (state.round >= state.maxRounds || state.deckExhausted) { endGame(state); return; }
  // No fim de cada 4 rondas completas (excepto a última): acontecimento. Escolhe primeiro o 1.º jogador da ronda seguinte.
  if (state.events !== false && state.round % 4 === 0) {
    state.step = 'event';
    startEvent(state, state.order[0]);
    checkPublicObjectives(state);
    if (state.event) { state.afterEvent = 'nextRound'; return; }
  }
  nextRound(state);
}

function endGame(state) {
  checkSolo(state);
  state.phase = 'over'; state.active = null; state.step = null; state.turn = null;
  state.final = finalScoring(state);
  if (state.solo) state.final.solo = soloResult(state);
}

function nextRound(state) {
  state.round++;
  startTurn(state, state.order[0]);
}
