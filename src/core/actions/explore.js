// Acção Explorar (máximo 1 por turno): pagar 2 Provisões e reclamar um local especial adjacente.
// Ruínas: 2 recursos à escolha (a.take). Caverna: 3 Pedra. Cristais: só pontos.
// Círculo de pedras: o jogador vê em segredo as 3 cartas do topo do baralho de acontecimentos
// (ou as que houver) e devolve-as pela ordem que quiser (acção reorderEvents). D2.
import { SITES } from '../../data/sites.js';
import { RESOURCES } from '../../data/terrains.js';
import { exploreError } from '../rules/sites.js';
import { award, pay } from '../points.js';

const PAIRS = RESOURCES.flatMap((a, i) => RESOURCES.slice(i).map(b => [a, b]));

export function legal(state) {
  const pid = state.active, out = [];
  for (const [k, c] of Object.entries(state.board)) {
    if (exploreError(state, pid, k)) continue;
    const [q, r] = k.split(',').map(Number);
    if (c.site === 'ruins') PAIRS.forEach(take => out.push({ type: 'explore', player: pid, q, r, take }));
    else out.push({ type: 'explore', player: pid, q, r });
  }
  return out;
}

export function apply(state, a) {
  const k = a.q + ',' + a.r, err = exploreError(state, state.active, k);
  if (err) return err;
  const c = state.board[k], site = SITES[c.site], p = state.players[state.active];
  if (site.reward?.triggerEvent) return 'O Cemitério só existe no Modo B.';
  if (site.reward?.choose) {
    if (!Array.isArray(a.take) || a.take.length !== site.reward.choose || !a.take.every(r => RESOURCES.includes(r)))
      return 'Nas Ruínas escolhe 2 recursos.';
  }
  pay(p, state.balance.exploreCost);
  c.explored = state.active;
  state.turn.explored = true;
  award(state, state.active, 'sites', site.points);
  if (site.reward?.choose) a.take.forEach(r => { p.resources[r] += 1; });
  if (site.reward?.stone) p.resources.stone += site.reward.stone;
  if (site.reward?.peekEvents) {
    const n = Math.min(site.reward.peekEvents, state.eventDeck.length);
    if (n > 0) { state.turn.peek = state.eventDeck.slice(0, n); state.step = 'stones'; }
  }
}

// Depois do Círculo de pedras: devolve as cartas vistas ao topo, pela ordem escolhida.
export const legalReorder = state => permutations(state.turn.peek).map(order => ({ type: 'reorderEvents', player: state.active, order }));
export function applyReorder(state, a) {
  const peek = state.turn.peek;
  if (!Array.isArray(a.order) || a.order.length !== peek.length || [...a.order].sort().join() !== [...peek].sort().join())
    return 'Devolve exactamente as cartas que viste, pela ordem que quiseres.';
  state.eventDeck.splice(0, peek.length, ...a.order);
  state.turn.peek = null;
  state.step = 'actions';
}
function permutations(xs) {
  if (xs.length <= 1) return [xs.slice()];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p]));
}
