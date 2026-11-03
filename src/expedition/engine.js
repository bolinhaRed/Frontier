// Modo Expedição — motor. Estado em JSON simples; aleatoriedade só pelo gerador da partida.
// Regras:
//  • Vês a peça actual e a seguinte. Rodas e colocas ao lado de uma peça já posta.
//  • Estradas só tocam estradas ou Aldeias; rios só tocam rios ou Lagos (ou ficam virados para o vazio).
//  • Cada lado que bate com o vizinho dá 1 ponto. Encaixe perfeito (peça rodeada pelos 6 lados, todos a bater): +3 pontos e +1 peça.
//  • Missões: algumas peças trazem uma meta para o seu grupo (terreno, estrada ou rio). Cumprida: +10 pontos e +5 peças.
//  • A expedição acaba quando a pilha se esgota.
import { key, neighbors } from '../core/hex.js';
import { rngState, nextFloat, nextInt } from '../core/rng.js';
import { KINDS, BIOMES, RULES, edgesOf } from './tiles.js';

const pick = (st, entries) => { let x = nextFloat(st) * entries.reduce((t, [, w]) => t + w, 0); for (const [v, w] of entries) if ((x -= w) < 0) return v; return entries[0][0]; };
const opposite = d => (d + 3) % 6;

function drawTile(state) {
  const kind = pick(state.rng, Object.entries(KINDS).map(([k, v]) => [k, v.w]));
  const tile = { kind, biome: pick(state.rng, BIOMES), rot: 0 };
  if (nextFloat(state.rng) < RULES.questChance) tile.quest = { kind: KINDS[kind].path || KINDS[kind].base, add: 3 + nextInt(state.rng, 6) };
  return tile;
}

export function createExpedition(seed = 'EXP') {
  const state = { mode: 'expedition', seed: String(seed), rng: rngState('expedition', seed), board: {}, score: 0, stack: RULES.startStack,
    current: null, next: null, quests: [], done: 0, perfects: 0, placed: 0, over: false, log: [] };
  state.board['0,0'] = { kind: 'village', biome: 'greenlands', rot: 0 };
  state.current = drawTile(state); state.next = drawTile(state); state.stack -= 2;
  return state;
}

// Pode ficar aqui com esta rotação? Devolve null (não) ou os pontos que dá.
export function placementScore(state, q, r, tile) {
  if (state.board[key(q, r)]) return null;
  const e = edgesOf(tile);
  let n = 0, match = 0;
  const N = neighbors(q, r);
  for (let d = 0; d < 6; d++) {
    const nb = state.board[key(...N[d])];
    const mine = e[d];
    if (!nb) continue;
    n++;
    const theirs = edgesOf(nb)[opposite(d)], nbVillage = KINDS[nb.kind].village, meVillage = KINDS[tile.kind].village;
    if (mine === 'road' && !(theirs === 'road' || nbVillage)) return null;
    if (theirs === 'road' && !(mine === 'road' || meVillage)) return null;
    if (mine === 'river' && !(theirs === 'river' || theirs === 'water')) return null;
    if (theirs === 'river' && !(mine === 'river' || mine === 'water')) return null;
    if (mine === theirs || (mine === 'road' && nbVillage) || (theirs === 'road' && meVillage) || (mine === 'river' && theirs === 'water') || (theirs === 'river' && mine === 'water')) match++;
  }
  if (n === 0) return null;
  const perfect = n === 6 && match === 6;            // rodeada pelos 6 lados, todos a bater
  return { points: match + (perfect ? RULES.perfectPoints : 0), match, n, perfect };
}

export function legalPlacements(state) {
  if (state.over) return [];
  const out = [], seen = new Set();
  for (const k of Object.keys(state.board)) {
    const [q, r] = k.split(',').map(Number);
    for (const [a, b] of neighbors(q, r)) {
      const nk = key(a, b); if (state.board[nk] || seen.has(nk)) continue; seen.add(nk);
      for (let rot = 0; rot < 6; rot++) { const s = placementScore(state, a, b, { ...state.current, rot }); if (s) out.push({ q: a, r: b, rot, ...s }); }
    }
  }
  return out;
}

// Grupo ligado a partir de (q,r) pelo tipo «type»: terrenos pela família, estradas e rios pelos troços ligados.
export function groupOf(state, k, type) {
  const seen = new Set([k]), stack = [k];
  while (stack.length) {
    const cur = stack.pop(), [q, r] = cur.split(',').map(Number), e = edgesOf(state.board[cur]);
    neighbors(q, r).forEach(([a, b], d) => {
      const nk = key(a, b), nb = state.board[nk]; if (!nb || seen.has(nk)) return;
      const ok = (type === 'road' || type === 'river') ? e[d] === type && edgesOf(nb)[opposite(d)] === type : KINDS[nb.kind].base === type && !KINDS[nb.kind].path && KINDS[state.board[cur].kind].base === type;
      if (ok) { seen.add(nk); stack.push(nk); }
    });
  }
  return [...seen];
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
  // nova missão: meta = tamanho actual do grupo desta peça + «add»
  if (quest && state.quests.length < RULES.maxQuests) {
    const size = groupOf(state, k, quest.kind).length;
    state.quests.push({ at: k, kind: quest.kind, target: size + quest.add });
  }
  // missões cumpridas
  const completed = [];
  state.quests = state.quests.filter(qu => {
    const size = groupOf(state, qu.at, qu.kind).length;
    if (size >= qu.target) { completed.push(qu); return false; }
    return true;
  });
  for (const qu of completed) { state.score += RULES.questReward.points; state.stack += RULES.questReward.tiles; state.done++; }
  state.log.push({ q, r, rot, points: sc.points, perfect: sc.perfect, quests: completed.length });
  // peça seguinte
  state.current = state.next;
  if (state.stack > 0) { state.next = drawTile(state); state.stack--; } else state.next = null;
  if (!state.current) state.over = true;
  else if (!legalPlacements(state).length) state.over = true;          // sem lugar possível para a peça: acaba
  return { state, result: { ...sc, completed } };
}
