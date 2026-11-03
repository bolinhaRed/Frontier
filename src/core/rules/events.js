// Acontecimentos (rev. 1.4, secção Acontecimentos). Ordem fixa: revelar → alvos e sorteios →
// efeitos sem escolha → escolhas pela ordem de jogo (a começar no activo; no fim de ronda, no 1.º
// jogador da ronda seguinte) → descartar. Nenhum efeito coloca terrenos nem explora, por isso não há cadeias.
// Efeitos temporários terminam no fim da 2.ª ronda completa depois da revelação (until = ronda + 2).
import { key, neighbors } from '../hex.js';
import { TERRAINS, FAMILIES, RESOURCES } from '../../data/terrains.js';
import { shuffle, asFn, nextInt } from '../rng.js';
import { rebuildRegions } from './regions.js';
import { award, canPay, pay } from '../points.js';
import { structuresOf } from './structures.js';
import { returnCard, giveToken } from '../bag.js';
import { refillMarket } from '../deck.js';
import { emptyFrontier, parseKey } from './placement-a.js';

const own = (s, pid) => Object.entries(s.board).filter(([, c]) => c.owner === pid);
const ownTerrains = (s, pid) => own(s, pid).filter(([, c]) => c.kind === 'terrain');
const canProduce = c => c.kind === 'terrain' && !Object.keys(c.blocks || {}).length;
const FAMILY_TIE = ['plain', 'forest', 'range', 'water'];

// Torre de vigia: protege contra Perigos os terrenos próprios adjacentes.
function protectedHex(s, k, pid) {
  const [q, r] = parseKey(k);
  return neighbors(q, r).some(([a, b]) => { const c = s.board[key(a, b)]; return c && c.owner === pid && c.structure === 'tower'; });
}

// Para cada carta: alvos (pid → dados), efeito sem escolha, opções (legal + aplicar).
const CARDS = {
  wildfire: {
    targets: s => perPlayer(s, pid => {
      const hexes = ownTerrains(s, pid).filter(([k, c]) => (c.terrain === 'forest' || c.terrain === 'woods') && !c.structure && !protectedHex(s, k, pid)).map(([k]) => k);
      return hexes.length ? { burn: hexes[nextInt(s.rng, hexes.length)] } : null;
    }),
    options: (s, pid) => [...(canPay(s.players[pid], { food: 2 }) ? [{ option: 'A' }] : []), { option: 'B' }],
    choose(s, pid, a, t) {
      if (a.option === 'A') { if (!canPay(s.players[pid], { food: 2 })) return 'Não tens 2 Provisões.'; pay(s.players[pid], { food: 2 }); return; }
      s.board[t.burn] = { ...s.board[t.burn], kind: 'deadtrees', blocks: {} };
      s.players[pid].resources.wood += 2;
      rebuildRegions(s);
    },
  },
  creatures: {
    targets: (s, ev) => perPlayer(s, pid => hexTarget(s, pid, c => c.biome === 'deadlands', true)),
    start: block, options: payOr({ stone: 1 }), choose: liftIfPaid({ stone: 1 }),
  },
  storm: {
    targets: s => perPlayer(s, pid => hexTarget(s, pid, c => c.terrain === 'lake' || c.terrain === 'river', false)),
    start: block, options: payOr({ wood: 1 }), choose: liftIfPaid({ wood: 1 }),
  },
  winter: {
    targets: s => perPlayer(s, pid => { const c = Math.floor(structuresOf(s, pid) / 2); return c > 0 ? { cost: c } : null; }),
    options: (s, pid, t) => Array.from({ length: Math.min(t.cost, s.players[pid].resources.food) + 1 }, (_, n) => ({ option: 'pay', amount: n })),
    choose(s, pid, a, t) {
      const n = a.amount | 0, p = s.players[pid];
      if (n < 0 || n > t.cost || n > p.resources.food) return 'Quantidade inválida.';
      p.resources.food -= n;
      const loss = Math.min(t.cost - n, p.score);
      if (loss) award(s, pid, 'events', -loss);
    },
  },
  fog: {
    targets: s => perPlayer(s, () => ({})),
    start(s) {
      if (!s.deck.length) return;
      for (const id of s.market.splice(0)) returnCard(s, id);
      refillMarket(s);
    },
    options: (s, pid) => [...(s.deck.length && s.players[pid].hand.length ? s.players[pid].hand.map(card => ({ option: 'A', card })) : []), { option: 'B' }],
    choose(s, pid, a) {
      const p = s.players[pid];
      if (a.option === 'B') { p.resources.food += 1; return; }
      const i = p.hand.indexOf(a.card); if (i < 0 || !s.deck.length) return 'Troca impossível.';
      const top = s.deck.shift(); giveToken(s, top);            // não esgota o baralho: a carta trocada volta ao fundo
      p.hand.splice(i, 1); returnCard(s, a.card); p.hand.push(top);
    },
  },
  ruins: {
    targets: s => perPlayer(s, () => ({})),
    start(s, ev) {
      const spots = emptyFrontier(s);
      const k = spots[nextInt(s.rng, spots.length)];
      s.board[k] = { kind: 'site', site: 'ruins', explored: null, cheap: [] };
      ev.site = k;
    },
    options: () => [{ option: 'A' }, { option: 'B' }],
    choose(s, pid, a, t, ev) {
      if (a.option === 'A') s.players[pid].resources.food += 1;
      else s.board[ev.site].cheap.push(pid);
    },
  },
  vein: {
    targets: s => perPlayer(s, () => ({})),
    options: () => [{ option: 'A' }, { option: 'B' }],
    choose(s, pid, a, t, ev) {
      if (a.option === 'A') s.players[pid].resources.stone += 2;
      else s.effects.push({ type: 'bonus', pid, family: 'range', res: 'stone', n: 1, until: ev.until });
    },
  },
  merchants: {
    targets: s => perPlayer(s, () => ({})),
    options: (s, pid) => [...RESOURCES.map(resource => ({ option: 'A', resource })),
      ...RESOURCES.flatMap(give => s.players[pid].resources[give] >= 2 ? RESOURCES.filter(g => g !== give).map(get => ({ option: 'B', give, get })) : [])],
    choose(s, pid, a) {
      const p = s.players[pid];
      if (a.option === 'A') { if (!RESOURCES.includes(a.resource)) return 'Recurso inválido.'; p.resources[a.resource] += 1; return; }
      if (!RESOURCES.includes(a.give) || !RESOURCES.includes(a.get) || a.give === a.get || p.resources[a.give] < 2) return 'Troca inválida.';
      p.resources[a.give] -= 2; p.resources[a.get] += 1;
    },
  },
  harvest: {
    targets: s => perPlayer(s, pid => ownTerrains(s, pid).some(([, c]) => canProduce(c)) ? {} : null),
    options: () => FAMILIES.map(family => ({ option: 'family', family })),
    choose(s, pid, a) {
      if (!FAMILIES.includes(a.family)) return 'Família inválida.';
      for (const [, c] of ownTerrains(s, pid)) if (canProduce(c) && TERRAINS[c.terrain].family === a.family) s.players[pid].resources[TERRAINS[c.terrain].resource] += 1;
    },
  },
  volcano: {
    targets(s) {
      const m = Object.entries(s.board).filter(([, c]) => c.kind === 'terrain' && c.terrain === 'mountains' && !c.structure).map(([k]) => k);
      if (!m.length) return {};
      const k = m[nextInt(s.rng, m.length)], pid = s.board[k].owner;
      return pid == null ? {} : { [pid]: { hex: k } };
    },
    start(s, ev) {
      for (const t of Object.values(ev.targets)) s.board[t.hex] = { ...s.board[t.hex], kind: 'volcano', blocks: {} };
      rebuildRegions(s);
    },
    options: () => [{ option: 'A' }, { option: 'B' }],
    choose(s, pid, a, t) {
      if (a.option === 'A') s.players[pid].resources.stone += 3;
      else s.board[t.hex].volcanoBonus = true;
    },
  },
};

function perPlayer(s, fn) { const out = {}; for (const pid of s.order) { const t = fn(pid); if (t) out[pid] = t; } return out; }
function hexTarget(s, pid, test, hazard) {
  const hexes = ownTerrains(s, pid).filter(([k, c]) => test(c) && !(hazard && protectedHex(s, k, pid))).map(([k]) => k);
  return hexes.length ? { hexes } : null;
}
// Efeito temporário negativo: começa já (passo 3).
function block(s, ev) {
  for (const t of Object.values(ev.targets)) for (const k of t.hexes) { const c = s.board[k]; c.blocks = { ...(c.blocks || {}), [ev.uid]: ev.until }; }
}
function payOr(cost) { return (s, pid) => [...(canPay(s.players[pid], cost) ? [{ option: 'A' }] : []), { option: 'B' }]; }
function liftIfPaid(cost) {
  return (s, pid, a, t, ev) => {
    if (a.option !== 'A') return;
    if (!canPay(s.players[pid], cost)) return 'Não tens recursos para pagar.';
    pay(s.players[pid], cost);
    for (const k of t.hexes) if (s.board[k].blocks) delete s.board[k].blocks[ev.uid];
  };
}

// Revela e prepara um acontecimento. firstPlayer = quem escolhe primeiro.
export function startEvent(state, firstPlayer) {
  if (!state.eventDeck.length) { state.eventDeck = shuffle(state.eventDiscard.splice(0), asFn(state.rng)); }
  const id = state.eventDeck.shift();
  state.eventCount = (state.eventCount || 0) + 1;
  const ev = { id, uid: 'e' + state.eventCount, round: state.round, until: state.round + 2, targets: {} };
  const card = CARDS[id];
  ev.targets = card.targets(state, ev);
  card.start?.(state, ev);
  const start = state.order.indexOf(firstPlayer);
  const order = [...state.order.slice(start), ...state.order.slice(0, start)];
  ev.queue = order.filter(pid => ev.targets[pid] !== undefined && card.options(state, pid, ev.targets[pid]).length > 0);
  state.event = ev;
  if (!ev.queue.length) closeEvent(state);
}

export const eventChooser = state => state.event?.queue[0] ?? null;

export function legalEventChoices(state) {
  const ev = state.event, pid = eventChooser(state); if (pid == null) return [];
  return CARDS[ev.id].options(state, pid, ev.targets[pid]).map(o => ({ type: 'eventChoice', player: pid, ...o }));
}

export function applyEventChoice(state, a) {
  const ev = state.event, pid = eventChooser(state);
  const allowed = legalEventChoices(state).some(o => o.option === a.option);
  if (!allowed) return 'Essa opção não está disponível.';
  const err = CARDS[ev.id].choose(state, pid, a, ev.targets[pid], ev);
  if (err) return err;
  ev.queue.shift();
  if (!ev.queue.length) closeEvent(state);
}

function closeEvent(state) {
  state.eventDiscard.push(state.event.id);
  state.lastEvent = { id: state.event.id, round: state.event.round, affected: Object.keys(state.event.targets).map(Number) };
  state.event = null;
}

// Fim de ronda: terminam os efeitos temporários cujo prazo era esta ronda.
export function expireEffects(state) {
  for (const c of Object.values(state.board)) if (c.blocks) for (const [u, until] of Object.entries(c.blocks)) if (until <= state.round) delete c.blocks[u];
  state.effects = state.effects.filter(e => e.until > state.round);
}
