// Turno, passo 4: repor a mão até 3 cartas. Do baralho é grátis; do mercado custa 1 Provisão
// e o mercado é logo reposto com a carta do topo do baralho.
import { drawCard, refillMarket } from '../deck.js';
import { canPay } from '../points.js';

export function legal(state) {
  const p = state.players[state.active], out = [];
  if (state.deck.length > 0) out.push({ type: 'drawDeck', player: state.active });
  if (canPay(p, state.balance.marketCost)) for (const card of state.market) out.push({ type: 'buyMarket', player: state.active, card });
  return out;
}

export function apply(state, a) {
  const p = state.players[state.active];
  if (a.type === 'drawDeck') {
    const c = drawCard(state); if (!c) return 'O baralho está vazio.';
    p.hand.push(c);
  } else {
    const i = state.market.indexOf(a.card);
    if (i < 0) return 'Essa carta não está no mercado.';
    if (!canPay(p, state.balance.marketCost)) return 'Não tens Provisões para comprar no mercado.';
    for (const [r, n] of Object.entries(state.balance.marketCost)) p.resources[r] -= n;
    state.market.splice(i, 1);
    p.hand.push(a.card);
    refillMarket(state);
  }
}
