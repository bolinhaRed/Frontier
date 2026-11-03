// Onde se pode construir (rev. 1.4, secção Estruturas; D3: Aldeia sem Bosque).
import { STRUCTURES } from '../../data/structures.js';
import { regionAt } from './regions.js';
import { canPay } from '../points.js';

export function buildError(state, pid, structure, k) {
  const s = STRUCTURES[structure]; if (!s) return 'Estrutura desconhecida.';
  const c = state.board[k];
  if (!c || c.kind !== 'terrain') return 'Só se constrói em terrenos (não no Lago neutro, locais especiais, Árvores mortas ou Vulcão).';
  if (c.owner !== pid) return 'Só se constrói em terrenos próprios.';
  if (state.turn.builds >= state.balance.buildsPerTurn) return 'Já fizeste as 2 construções deste turno.';
  if (s.over) { if (c.structure !== s.over) return `${s.name} só se constrói sobre uma ${STRUCTURES[s.over].name} própria.`; }
  else {
    if (c.structure) return 'Esse terreno já tem uma estrutura.';
    if (s.on !== 'any' && !s.on.includes(c.terrain)) return `${s.name} não pode ser construída neste terreno.`;
  }
  if (s.onePerGame && state.built?.[structure]) return `Só há uma ${s.name} por partida.`;
  if (s.minRegion) { const rg = regionAt(state, k); if (!rg || rg.hexes.length < s.minRegion) return `${s.name} precisa de uma região com ${s.minRegion} ou mais terrenos.`; }
  if (!canPay(state.players[pid], s.cost)) return 'Não tens recursos para essa construção.';
  return null;
}

// D6: um Castelo conta como uma só estrutura (ocupa o hexágono da Aldeia).
export function structuresOf(state, pid, filter = () => true) {
  return Object.entries(state.board).filter(([, c]) => c.owner === pid && c.structure && filter(c)).length;
}
