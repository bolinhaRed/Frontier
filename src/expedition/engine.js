// Modo Expedição — motor. Estado em JSON simples; aleatoriedade só pelo gerador da partida.
// Regras:
//  • Vês a peça actual, a seguinte e uma fila de 3 peças à vista. Rodas e colocas ao lado de uma peça já posta.
//  • Estradas só tocam estradas; rios só tocam rios ou Lagos (ou ficam virados para o vazio).
//  • Cada lado com o mesmo terreno do vizinho dá 1 ponto; se também tiver a mesma cor, mais 1.
//  • Encaixe perfeito (peça rodeada pelos 6 lados, terreno e cor a bater): +3 pontos e +1 peça.
//  • Missões: algumas peças trazem uma meta para o seu grupo (terreno, estrada, rio ou zona de uma cor). Cumprida: +10 pontos e +5 peças.
//  • Trocar a peça actual por uma da fila custa peças da pilha: 1 na 1.ª vez, 2 na 2.ª, e assim por diante.
//  • A expedição acaba quando a pilha se esgota ou a peça não cabe em lado nenhum.
import { key, neighbors } from '../core/hex.js';
import { rngState, nextFloat, nextInt } from '../core/rng.js';
import { KINDS, BIOMES, RULES, SPLIT_PAIRS, edgesOf, colorsOf, isPathTile } from './tiles.js';

const pick = (st, entries) => { let x = nextFloat(st) * entries.reduce((t, [, w]) => t + w, 0); for (const [v, w] of entries) if ((x -= w) < 0) return v; return entries[0][0]; };
const opposite = d => (d + 3) % 6;

function drawTile(state) {
  const kind = pick(state.rng, Object.entries(KINDS).map(([k, v]) => [k, v.w]));
  // cores em sequência: muitas vezes repete a cor da peça anterior
  const same = state.lastBiome && nextFloat(state.rng) < RULES.sameBiomeChance;
  let biome = same ? state.lastBiome : pick(state.rng, BIOMES), biome2 = null;
  if (KINDS[kind].split) {
    const pairs = SPLIT_PAIRS[kind], withB = pairs.filter(p => p.includes(biome)), P = (withB.length ? withB : pairs)[nextInt(state.rng, (withB.length ? withB : pairs).length)];
    [biome, biome2] = P;
  }
  state.lastBiome = biome2 || biome;
  const tile = { kind, biome, rot: 0, ...(biome2 ? { biome2 } : {}) };
  if (nextFloat(state.rng) < RULES.questChance) {
    const byColour = nextFloat(state.rng) < RULES.biomeQuestShare;
    tile.quest = { kind: byColour ? 'biome:' + biome : KINDS[kind].path || (KINDS[kind].paths ? 'road' : KINDS[kind].base), add: 3 + nextInt(state.rng, 6) };
  }
  return tile;
}

function take(state) { if (state.stack <= 0) return null; state.stack--; return drawTile(state); }

export function createExpedition(seed = 'EXP') {
  const state = { mode: 'expedition', version: 2, seed: String(seed), rng: rngState('expedition', seed), board: {}, score: 0, stack: RULES.startStack,
    current: null, next: null, row: [], rowUses: 0, quests: [], done: 0, perfects: 0, placed: 0, over: false, lastBiome: 'greenlands', log: [] };
  state.board['0,0'] = { kind: 'village', biome: 'greenlands', rot: 0 };
  state.current = take(state); state.next = take(state);
  for (let i = 0; i < RULES.rowSize; i++) state.row.push(take(state));
  return state;
}

// Pode ficar aqui com esta rotação? Devolve null (não) ou os pontos que dá.
export function placementScore(state, q, r, tile) {
  if (state.board[key(q, r)]) return null;
  const e = edgesOf(tile), col = colorsOf(tile);
  let n = 0, match = 0, colour = 0, colourSides = 0;
  const N = neighbors(q, r);
  for (let d = 0; d < 6; d++) {
    const nb = state.board[key(...N[d])];
    if (!nb) continue;
    n++;
    const mine = e[d], theirs = edgesOf(nb)[opposite(d)];
    if (mine === 'road' && theirs !== 'road') return null;
    if (theirs === 'road' && mine !== 'road') return null;
    if (mine === 'river' && !(theirs === 'river' || theirs === 'water')) return null;
    if (theirs === 'river' && !(mine === 'river' || mine === 'water')) return null;
    if (mine === theirs || (mine === 'river' && theirs === 'water') || (theirs === 'river' && mine === 'water')) match++;
    const a = col[d], b = colorsOf(nb)[opposite(d)];
    if (a && b) { colourSides++; if (a === b) colour++; }
  }
  if (n === 0) return null;
  const perfect = n === 6 && match === 6 && colour === colourSides;
  return { points: match + colour + (perfect ? RULES.perfectPoints : 0), match, colour, n, perfect };
}

export function legalPlacements(state, tile = state.current) {
  if (state.over || !tile) return [];
  const out = [], seen = new Set();
  for (const k of Object.keys(state.board)) {
    const [q, r] = k.split(',').map(Number);
    for (const [a, b] of neighbors(q, r)) {
      const nk = key(a, b); if (state.board[nk] || seen.has(nk)) continue; seen.add(nk);
      for (let rot = 0; rot < 6; rot++) { const s = placementScore(state, a, b, { ...tile, rot }); if (s) out.push({ q: a, r: b, rot, ...s }); }
    }
  }
  return out;
}

// Grupo ligado a partir de k: terrenos pela família, estradas e rios pelos troços, cores pelos lados dessa cor.
export function groupOf(state, k, type) {
  const seen = new Set([k]), stack = [k];
  const colour = type.startsWith('biome:') ? type.slice(6) : null;
  while (stack.length) {
    const cur = stack.pop(), [q, r] = cur.split(',').map(Number), t = state.board[cur], e = edgesOf(t), c = colorsOf(t);
    neighbors(q, r).forEach(([a, b], d) => {
      const nk = key(a, b), nb = state.board[nk]; if (!nb || seen.has(nk)) return;
      let ok;
      if (colour) ok = c[d] === colour && colorsOf(nb)[opposite(d)] === colour;
      else if (type === 'road' || type === 'river') ok = e[d] === type && edgesOf(nb)[opposite(d)] === type;
      else ok = KINDS[nb.kind].base === type && !isPathTile(nb.kind) && KINDS[t.kind].base === type;
      if (ok) { seen.add(nk); stack.push(nk); }
    });
  }
  return [...seen];
}

export const rowCost = state => state.rowUses + 1;

// Troca a peça actual pela peça i da fila (paga peças da pilha). A peça actual fica na fila.
export function swapWithRow(state0, i) {
  const state = structuredClone(state0), cost = rowCost(state);
  if (state.over || !state.row[i]) return { error: 'Não há peça nesse lugar da fila.' };
  if (state.stack < cost) return { error: `Trocar custa ${cost} peças da pilha e só tens ${state.stack}.` };
  state.stack -= cost; state.rowUses++;
  [state.current, state.row[i]] = [state.row[i], state.current];
  state.log.push({ swap: i, cost });
  return { state };
}

export function place(state0, q, r, rot) {
  const state = structuredClone(state0);
  if (state.over) return { error: 'A expedição terminou.' };
  const tile = { ...state.current, rot };
  const sc = placementScore(state, q, r, tile);
  if (!sc) return { error: 'A peça não encaixa aqui com esta rotação.' };
  const k = key(q, r), quest = tile.quest; delete tile.quest;
  state.board[k] = tile;
  state.score += sc.points; state.placed++;
  if (sc.perfect) { state.stack += RULES.perfectBonus; state.perfects++; }
  if (quest && state.quests.length < RULES.maxQuests) {
    const size = groupOf(state, k, quest.kind).length;
    state.quests.push({ at: k, kind: quest.kind, target: size + quest.add });
  }
  const completed = [];
  state.quests = state.quests.filter(qu => {
    if (groupOf(state, qu.at, qu.kind).length >= qu.target) { completed.push(qu); return false; }
    return true;
  });
  for (const qu of completed) { state.score += RULES.questReward.points; state.stack += RULES.questReward.tiles; state.done++; }
  state.log.push({ q, r, rot, points: sc.points, perfect: sc.perfect, quests: completed.length });
  state.current = state.next;
  state.next = take(state);
  if (!state.current) state.over = true;
  else if (!legalPlacements(state).length && !state.row.some(t => t && legalPlacements(state, t).length && state.stack >= rowCost(state))) state.over = true;
  return { state, result: { ...sc, completed } };
}
