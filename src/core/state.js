// Criação da partida e preparação (rev. 1.4, passos 1 a 8), Modo A. O Modo B (passo 7) entra na etapa 7.
import { BALANCE } from '../data/balance.js';
import { SITES } from '../data/sites.js';
import { EVENTS } from '../data/events.js';
import { PUBLIC_OBJECTIVES, PRIVATE_OBJECTIVES } from '../data/objectives.js';
import { applyContribution, payMilestones } from './rules/regions.js';
import { checkPublicObjectives } from './rules/objectives.js';
import { award } from './points.js';
import { key, DIRS } from './hex.js';
import { rngState, shuffle, asFn, nextInt } from './rng.js';
import { freshBag } from './bag.js';
import { buildCards, shuffledDeck, drawCard, refillMarket } from './deck.js';

export const SCHEMA_VERSION = 1;
export const RULES_VERSION = '1.4';

// scenario (campanha Solo): 1 jogador, área, baralho, locais, rondas, recursos, valores e objectivo do território.
export function createGame({ seed = 'FRONTIER', mode = 'A', players, scenario = null }) {
  if (mode !== 'A') throw new Error('Só o Modo A está implementado (etapa 1).');
  const min = scenario ? 1 : 2, max = scenario ? 1 : 4;
  if (!Array.isArray(players) || players.length < min || players.length > max) throw new Error(scenario ? 'O Solo tem 1 jogador.' : 'A partida tem 2 a 4 jogadores.');
  const N = players.length;
  const state = {
    schema: SCHEMA_VERSION, rules: RULES_VERSION, seed: String(seed), mode,
    balance: { ...structuredClone(BALANCE), ...structuredClone(scenario?.balance || {}) },
    rng: rngState('game', seed),
    phase: 'setup', round: 0, maxRounds: scenario ? scenario.rounds : BALANCE.rounds[N],
    area: scenario ? scenario.area : null, events: scenario ? scenario.events : true,
    order: [], active: null, step: null,
    players: players.map((p, i) => ({ id: i, name: p.name || 'Jogador ' + (i + 1), kind: p.kind || 'human', color: p.color || null,
      resources: { wood: 0, stone: 0, food: 0 }, hand: [], score: 0, points: {}, private: null })),
    cards: buildCards(N, scenario?.deck, scenario?.biomes), deck: [], market: [], tokens: {}, bag: freshBag(), bagsOpened: 1, deckExhausted: false,
    board: {}, regions: [], built: {}, setup: null, turn: null,
    publicObjectives: [], eventDeck: [], eventDiscard: [], event: null, eventCount: 0, effects: [], final: null, log: [],
  };
  // 1. Ordem dos jogadores e baralho
  state.order = shuffle([...Array(N).keys()], asFn(state.rng));
  state.deck = shuffledDeck(state);
  // 2. Lago neutro no centro
  state.board[key(0, 0)] = { kind: 'lake', terrain: 'lake', biome: 'greenlands', owner: null, token: null };
  // 3. Três locais especiais diferentes, a 2 hexágonos, em direcções alternadas
  if (scenario) {
    for (const x of scenario.sites) state.board[key(x.q, x.r)] = { kind: 'site', site: x.site, explored: null };
    // Fronteira herdada: terrenos neutros vindos de territórios vizinhos já conquistados.
    for (const b of scenario.border || []) state.board[key(b.q, b.r)] = { kind: 'border', terrain: b.terrain, biome: b.biome, owner: null, token: null, structure: b.structure || null };
  } else {
    const types = shuffle(Object.keys(SITES).filter(s => SITES[s].modes.includes(mode)), asFn(state.rng)).slice(0, BALANCE.initialSites);
    const start = nextInt(state.rng, 2);
    types.forEach((site, i) => {
      const [dq, dr] = DIRS[start + i * 2];
      state.board[key(dq * BALANCE.siteDistance, dr * BALANCE.siteDistance)] = { kind: 'site', site, explored: null };
    });
  }
  // 4. Recursos iniciais e compensação por lugar
  state.order.forEach((pid, pos) => {
    const r = state.players[pid].resources;
    Object.assign(r, scenario ? scenario.start : BALANCE.startResources);
    r.food += pos * BALANCE.seatBonusFood;
  });
  // 5. Objectivos: 3 públicos revelados e 1 privado para cada jogador (verificação só depois do passo 8).
  //    D2: o baralho de acontecimentos existe já, baralhado pela seed; sem efeitos até à etapa 6.
  if (scenario) {
    // Solo: sem objectivos públicos nem privados; o objectivo é o do território.
    state.solo = { territory: scenario.id, name: scenario.name, main: scenario.main, challenges: scenario.challenges, relics: scenario.relics, achievedRound: null, concludedRound: null };
    const rest = shuffle(Object.keys(EVENTS).filter(e => !scenario.eventOrder.includes(e)), asFn(state.rng));
    state.eventDeck = [...scenario.eventOrder, ...rest];
  } else {
    state.publicObjectives = shuffle(Object.keys(PUBLIC_OBJECTIVES), asFn(state.rng)).slice(0, BALANCE.publicObjectives)
      .map(id => ({ id, first: [], second: [], closed: false }));
    const priv = shuffle(Object.keys(PRIVATE_OBJECTIVES), asFn(state.rng));
    state.order.forEach((pid, i) => { state.players[pid].private = priv[i]; });
    state.eventDeck = shuffle(Object.keys(EVENTS), asFn(state.rng));
  }
  // 6. Colocação inicial em serpentina: cada jogador tira 1 carta e coloca-a, 2 vezes
  const seq = [];
  for (let k = 0; k < state.balance.setupTilesPerPlayer; k++) seq.push(...(k % 2 === 0 ? state.order : [...state.order].reverse()));
  state.setup = { seq, index: 0, card: null };
  beginSetupPlacement(state);
  return state;
}

export function beginSetupPlacement(state) {
  const s = state.setup;
  state.active = s.seq[s.index];
  s.card = drawCard(state);
}

// 8. Mãos e mercado; começa a ronda 1.
export function finishSetup(state) {
  for (const pid of state.order)
    while (state.players[pid].hand.length < state.balance.handSize) { const c = drawCard(state); if (!c) break; state.players[pid].hand.push(c); }
  refillMarket(state);
  state.setup = null;
  state.phase = 'turn'; state.round = 1;
  checkPublicObjectives(state);            // verificação inicial, simultânea para todos
  startTurn(state, state.order[0]);
}

export function startTurn(state, pid) {
  state.active = pid; state.step = 'roll';
  state.turn = { dice: null, caravan: null, placed: false, expanded: false, builds: 0, explored: false, peek: null };
}

// Colocar um terreno: Contribuição (antes), terreno no mapa, marcos (depois).
export function placeTerrain(state, cardId, q, r, rot, pid) {
  const k = key(q, r);
  applyContribution(state, k, pid, state.cards[cardId].terrain);
  placeCard(state, cardId, q, r, rot, pid);
  payMilestones(state, k, award);
}

// Terreno no mapa a partir de uma carta.
export function placeCard(state, cardId, q, r, rot, owner) {
  const c = state.cards[cardId];
  state.board[key(q, r)] = { kind: 'terrain', card: cardId, terrain: c.terrain, biome: c.biome, owner, token: state.tokens[cardId], rot: rot | 0, structure: null };
}
