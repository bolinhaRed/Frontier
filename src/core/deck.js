// Construção e uso do baralho de terrenos.
import { DECK_COUNTS } from '../data/deck.js';
import { TERRAIN_ORDER, BIOMES } from '../data/terrains.js';
import { shuffle, asFn } from './rng.js';
import { giveToken } from './bag.js';

// Biomas repartidos o mais igualmente possível dentro de cada terreno; o ponto de partida
// roda de terreno para terreno para que os totais por bioma também fiquem equilibrados.
export function buildCards(players) {
  const counts = DECK_COUNTS[players];
  if (!counts) throw new Error('Número de jogadores inválido: ' + players);
  const cards = {}; let n = 0, offset = 0;
  for (const terrain of TERRAIN_ORDER) {
    for (let i = 0; i < counts[terrain]; i++) {
      const id = 'c' + String(++n).padStart(2, '0');
      cards[id] = { terrain, biome: BIOMES[(offset + i) % BIOMES.length], presage: false };
    }
    offset += counts[terrain];
  }
  return cards;
}

export function shuffledDeck(state) { return shuffle(Object.keys(state.cards), asFn(state.rng)); }

// Tira a carta do topo e dá-lhe ficha. Marca o baralho como esgotado quando sai a última.
export function drawCard(state) {
  if (state.deck.length === 0) { state.deckExhausted = true; return null; }
  const id = state.deck.shift();
  giveToken(state, id);
  if (state.deck.length === 0) state.deckExhausted = true;
  return id;
}

export function refillMarket(state) {
  while (state.market.length < state.balance.marketSize) {
    const id = drawCard(state); if (!id) break;
    state.market.push(id);
  }
}
