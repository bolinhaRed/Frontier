// Turno, passo 2: colocar um terreno da mão. Sem cartas na mão, o turno é "sem colocação".
// Modo B, «sem jogada legal»: 1) trocar a mão (redrawHand); 2) colocar ignorando biomas;
// 3) turno sem colocação. Colocar uma carta de presságio dispara já o próximo acontecimento.
import { canPlaceA, emptyFrontier, parseKey } from '../rules/placement-a.js';
import { canPlaceB, legalSpots, hasSpot } from '../rules/placement-b.js';
import { placeTerrain } from '../state.js';
import { returnCard } from '../bag.js';
import { drawCard } from '../deck.js';
import { startEvent } from '../rules/events.js';

const placements = (state, opts) => state.players[state.active].hand.flatMap(card => legalSpots(state, card, opts).map(s => ({ type: 'place', player: state.active, card, ...s, ...(opts?.ignoreBiomes ? { ignoreBiomes: true } : {}) })));

export function legal(state) {
  const p = state.players[state.active];
  if (p.hand.length === 0) return [{ type: 'skipPlace', player: state.active }];
  if (state.mode !== 'B') {
    const spots = emptyFrontier(state).map(parseKey);
    return p.hand.flatMap(card => spots.map(([q, r]) => ({ type: 'place', player: state.active, card, q, r, rot: 0 })));
  }
  const normal = placements(state);
  if (normal.length) return normal;
  if (!state.turn.redrawn && state.deck.length) return [{ type: 'redrawHand', player: state.active }];
  const ignoring = placements(state, { ignoreBiomes: true });
  return ignoring.length ? ignoring : [{ type: 'skipPlace', player: state.active }];
}

export function apply(state, a) {
  const p = state.players[state.active];
  if (a.type === 'redrawHand') {
    if (state.mode !== 'B' || state.turn.redrawn || !state.deck.length || p.hand.some(c => hasSpot(state, c))) return 'Só podes trocar a mão quando nenhuma carta tem posição legal.';
    for (const c of p.hand.splice(0)) returnCard(state, c);          // ficha ao saco, carta ao fundo
    // tira 3 do topo (ou as que houver antes das que acabaram de ir para o fundo)
    const n = Math.min(state.balance.handSize, state.deck.length);
    for (let i = 0; i < n; i++) p.hand.push(drawCard(state));
    state.turn.redrawn = true;
    return;
  }
  if (a.type === 'skipPlace') {
    const L = legal(state);
    if (!(L.length === 1 && L[0].type === 'skipPlace')) return 'Só podes passar a colocação se não tiveres nenhuma jogada possível.';
    state.step = 'actions'; return;
  }
  const i = p.hand.indexOf(a.card);
  if (i < 0) return 'Essa carta não está na tua mão.';
  if (!Number.isInteger(a.rot) || a.rot < 0 || a.rot > 5) return 'Rotação inválida (0 a 5).';
  if (state.mode === 'B') {
    const ignore = !!a.ignoreBiomes;
    if (ignore && (placements(state).length || (!state.turn.redrawn && state.deck.length))) return 'Só se ignoram os biomas quando não há outra jogada.';
    if (!canPlaceB(state, a.card, a.q, a.r, a.rot, { ignoreBiomes: ignore })) return 'Essa posição não respeita as regras do Frontier Rules (biomas, Montanhas ou Rios).';
  } else if (!canPlaceA(state, a.q, a.r)) return 'Esse hexágono não está livre ou não toca em nenhum ocupado.';
  p.hand.splice(i, 1);
  placeTerrain(state, a.card, a.q, a.r, a.rot, state.active);
  state.turn.placed = true;
  state.step = 'actions';
  if (state.cards[a.card].presage) startEvent(state, state.active);
}
