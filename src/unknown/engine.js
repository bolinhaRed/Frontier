// Modo «Terras Desconhecidas» (Expedição v2): cartografar uma região com um Explorador.
// Separado dos outros modos (pode retirar-se sem os afectar). Usa as peças e as regras de encaixe da Expedição.
//  • 36 peças em 3 capítulos de 12. Peça actual, seguinte e mercado de 3.
//  • Fichas: começa com 3 (máx. 6). Trocar com o mercado custa 1; a 1.ª troca de cada capítulo é grátis.
//  • Turno: (trocar) → colocar → mover o Explorador (2 pontos; por estrada ligada cada passo custa ½) → descobrir.
//  • Lagos e rios só se atravessam por ponte. Montanhas e terra morta custam 2.
//  • Pontos: regiões, estradas e rios ao chegar a 3/5/7… peças (+3/+5/+7…); ligações (Aldeia–local +5,
//    cada Aldeia ou local que entra numa rede de estradas com outro: +5; local ligado por rio a um Lago: +6); ponte +3; encaixe perfeito +3 e +1 ficha;
//    locais explorados; objectivos e desafios de capítulo; acontecimento de capítulo.
import { key, neighbors } from '../core/hex.js';
import { rngState, nextFloat, nextInt, shuffle, asFn } from '../core/rng.js';
import { KINDS, BIOMES, SPLIT_PAIRS, edgesOf, isPathTile } from '../expedition/tiles.js';
import { placementScore, groupOf, legalPlacements } from '../expedition/engine.js';

export const UNK = {
  chapters: 3, perChapter: 12, sitesPerChapter: 2, startTokens: 3, maxTokens: 6, mp: 2, roadStep: 0.5,
  milestone: t => t,                       // patamar 3 → +3, 5 → +5, 7 → +7…
  link: 5, riverLink: 6, bridge: 3, perfect: 3,
  titles: [[190, 'Lenda de FRONTIER'], [150, 'Mestre Cartógrafo'], [110, 'Grande Explorador'], [70, 'Cartógrafo'], [0, 'Explorador Novato']],   // provisório
};
const BAG = { plain: 18, forest: 9, woods: 6, hills: 7, mountains: 4, lake: 5, village: 4, road_straight: 7, road_bend: 6, road_fork: 3,
  river_straight: 4, river_bend: 3, river_bend2: 2, bridge: 3, road_split: 2, river_split: 2 };
const SITE_KINDS = ['site_ruins', 'site_cave', 'site_crystals', 'site_stones', 'site_graveyard', 'site_ruins'];

// Recompensas dos locais: A ou B.
export const SITE_REWARDS = {
  ruins:     { A: { points: 8 }, B: { tokens: 2 } },
  cave:      { A: { points: 5 }, B: { tokens: 2 } },
  crystals:  { A: { points: 4 }, B: { tokens: 1, points: 1 } },
  stones:    { A: { points: 7 }, B: { mpTurns: 2 } },
  graveyard: { A: { points: 10, tokens: -1 }, B: { tokens: 3, points: -3 } },
  village:   { A: { points: 5 }, B: { tokens: 1 } },
};

// Objectivos por capítulo: principal (+10 pontos, +2 fichas) e 2 desafios (+5 pontos cada).
export const CHAPTERS = [
  { name: 'Primeiro Acampamento', main: { id: 'c1', text: 'Coloca uma Aldeia e explora um local especial.' },
    challenges: [{ id: 'forest4', text: 'Floresta com 4 peças.' }, { id: 'road3', text: 'Estrada com 3 troços.' }] },
  { name: 'Travessia', main: { id: 'c2', text: 'Liga dois locais especiais (ou uma Aldeia e um local) por estrada.' },
    challenges: [{ id: 'bridge', text: 'Coloca uma Ponte.' }, { id: 'range3', text: 'Serra com 3 peças.' }] },
  { name: 'Território Perdido', main: { id: 'c3', text: 'Explora dois locais especiais neste capítulo.' },
    challenges: [{ id: 'ruinsCave', text: 'Liga umas Ruínas a uma Caverna por estrada.' }, { id: 'region5', text: 'Uma região com 5 peças.' }] },
];
export const EVENTS = {
  growth:     { name: 'Crescimento', text: 'No fim do capítulo, +1 ponto por cada Floresta ou Bosque colocado neste capítulo.' },
  winter:     { name: 'Inverno', text: 'No fim do capítulo, +1 ponto por cada Colina ou Montanha colocada neste capítulo.' },
  discovery:  { name: 'Descoberta', text: 'O próximo local explorado dá +5 pontos.' },
  prosperity: { name: 'Prosperidade', text: 'No fim do capítulo, +2 pontos por cada Aldeia no mapa.' },
};

const pick = (st, entries) => { let x = nextFloat(st) * entries.reduce((t, [, w]) => t + w, 0); for (const [v, w] of entries) if ((x -= w) < 0) return v; return entries[0][0]; };
function makeTile(state, kind) {
  let biome = state.lastBiome && nextFloat(state.rng) < 0.6 ? state.lastBiome : pick(state.rng, BIOMES), biome2 = null;
  if (KINDS[kind].split) { const ps = SPLIT_PAIRS[kind], w = ps.filter(p => p.includes(biome)), P = (w.length ? w : ps)[nextInt(state.rng, (w.length ? w : ps).length)]; [biome, biome2] = P; }
  if (KINDS[kind].site) { biome = state.lastBiome || 'greenlands'; }
  state.lastBiome = biome2 || biome;
  return { kind, biome, rot: 0, ...(biome2 ? { biome2 } : {}) };
}
const drawFromBag = state => makeTile(state, pick(state.rng, Object.entries(BAG)));

export function createUnknown(seed = 'UNK') {
  const s = { mode: 'unknown', version: 1, seed: String(seed), rng: rngState('unknown', seed), board: {}, score: 0, tokens: UNK.startTokens,
    stack: [], current: null, market: [], explorer: '0,0', explored: {}, chapter: 0, inChapter: 0, freeSwap: true, returnUsed: false,
    mpBonusTurns: 0, discoveryBonus: 0, step: 'place', pendingSite: null, links: [], placedKinds: {}, chapterState: null, event: null,
    history: [], over: false, title: null, lastBiome: 'greenlands', log: [] };
  s.board['0,0'] = { kind: 'village', biome: 'greenlands', rot: 0, camp: true };
  s.board['1,0'] = { kind: 'plain', biome: 'greenlands', rot: 0 };
  s.board['0,1'] = { kind: 'plain', biome: 'greenlands', rot: 0 };
  for (let c = 0; c < UNK.chapters; c++) {
    const tiles = [];
    for (let i = 0; i < UNK.perChapter - UNK.sitesPerChapter; i++) tiles.push(drawFromBag(s));
    for (let i = 0; i < UNK.sitesPerChapter; i++) tiles.push(makeTile(s, SITE_KINDS[c * UNK.sitesPerChapter + i]));
    // os locais nunca são as 2 primeiras peças do capítulo
    const rest = shuffle(tiles.slice(2), asFn(s.rng)); s.stack.push(...tiles.slice(0, 2), ...rest);
  }
  s.current = s.stack.shift();
  for (let i = 0; i < 3; i++) s.market.push(drawFromBag(s));
  startChapter(s);
  return s;
}

function startChapter(s) {
  s.freeSwap = true; s.returnUsed = false; s.placedKinds = {};
  s.chapterState = { main: false, ch: [false, false], explored: 0 };
  const ids = Object.keys(EVENTS); s.event = ids[nextInt(s.rng, ids.length)];
}

// ---------- pontuação ----------
function components(s, type) {
  const done = new Set(), out = [];
  for (const k of Object.keys(s.board)) {
    if (done.has(k)) continue;
    const t = s.board[k], e = edgesOf(t);
    const member = type === 'road' || type === 'river' ? e.includes(type) : KINDS[t.kind].base === type && !isPathTile(t.kind);
    if (!member) continue;
    const g = groupOf(s, k, type); g.forEach(x => done.add(x)); out.push(g);
  }
  return out;
}
const maxGroup = (s, type) => Math.max(0, ...components(s, type).map(g => g.length));

function payMilestones(s, type, events) {
  const field = 'paid_' + type;
  for (const g of components(s, type)) {
    const paid = Math.max(0, ...g.map(k => s.board[k][field] || 0));
    let top = paid;
    for (let t = 3; t <= g.length; t += 2) if (t > paid) { s.score += UNK.milestone(t); top = t; events.push(`${type === 'road' ? 'Estrada' : type === 'river' ? 'Rio' : 'Região'} com ${t}: +${UNK.milestone(t)}`); }
    if (top > paid) g.forEach(k => { s.board[k][field] = top; });
  }
}
const poiKind = t => (t.kind === 'village' ? 'village' : KINDS[t.kind].site ? 'site' : null);
function adjacentPOIs(s, group) {
  const out = new Set();
  for (const k of group) { const [q, r] = k.split(',').map(Number); for (const [a, b] of neighbors(q, r)) { const nk = key(a, b), t = s.board[nk]; if (t && poiKind(t)) out.add(nk); } }
  return [...out];
}
// Ligações: numa rede de estradas, cada Aldeia ou local que entra numa rede que já tinha outro dá +5 (uma vez por peça).
// Por rio: cada local ligado por um rio a um Lago dá +6 (uma vez por local).
function payLinks(s, events) {
  for (const g of components(s, 'road')) {
    const P = adjacentPOIs(s, g);
    if (P.length < 2) continue;
    const id = P.slice().sort();
    // a rede pode ter juntado redes antigas: contam os locais ainda não ligados
    const fresh = id.filter(k => !s.links.includes(k));
    const before = id.length - fresh.length;
    const pay = before > 0 ? fresh.length : Math.max(0, fresh.length - 1);
    fresh.forEach(k => s.links.push(k));
    if (pay) { s.score += UNK.link * pay; events.push(`Ligação por estrada: +${UNK.link * pay}`); }
  }
  for (const g of components(s, 'river')) {
    const touch = new Set(); for (const k of g) { const [q, r] = k.split(',').map(Number); for (const [a, b] of neighbors(q, r)) touch.add(key(a, b)); }
    if (![...touch].some(k => s.board[k]?.kind === 'lake')) continue;
    for (const x of [...touch].filter(k => s.board[k] && KINDS[s.board[k].kind].site)) {
      const id = 'r:' + x; if (s.links.includes(id)) continue; s.links.push(id); s.score += UNK.riverLink; events.push(`Rio de um Lago até um local: +${UNK.riverLink}`);
    }
  }
}

// ---------- objectivos de capítulo ----------
const linkedSites = (s, a, b) => components(s, 'road').some(g => { const P = adjacentPOIs(s, g).map(k => KINDS[s.board[k].kind].site || 'village'); return P.includes(a) && P.includes(b) && (a !== b || P.filter(x => x === a).length >= 2); });
const CHECKS = {
  c1: s => (s.placedKinds.village || 0) >= 1 && Object.keys(s.explored).length >= 1,
  c2: s => components(s, 'road').some(g => { const P = adjacentPOIs(s, g); return P.length >= 2 && P.some(k => KINDS[s.board[k].kind].site); }),
  c3: s => s.chapterState.explored >= 2,
  forest4: s => maxGroup(s, 'forest') >= 4, road3: s => maxGroup(s, 'road') >= 3,
  bridge: s => (s.placedKinds.bridge || 0) >= 1, range3: s => maxGroup(s, 'range') >= 3,
  ruinsCave: s => linkedSites(s, 'ruins', 'cave'), region5: s => ['plain', 'forest', 'range', 'water'].some(f => maxGroup(s, f) >= 5),
};
function checkChapter(s, events) {
  const C = CHAPTERS[s.chapter], st = s.chapterState;
  if (!st.main && CHECKS[C.main.id](s)) { st.main = true; s.score += 10; s.tokens = Math.min(UNK.maxTokens, s.tokens + 2); events.push('Objectivo do capítulo cumprido: +10 pontos e +2 fichas'); }
  C.challenges.forEach((c, i) => { if (!st.ch[i] && CHECKS[c.id](s)) { st.ch[i] = true; s.score += 5; events.push(`Desafio cumprido (${c.text}) +5`); } });
}

// ---------- movimento ----------
function enterCost(t) {
  if (!t) return Infinity;
  const k = KINDS[t.kind];
  if (t.kind === 'lake' || (k.path === 'river')) return Infinity;            // água e rios sem ponte
  if (t.kind === 'mountains' || (t.biome === 'deadlands' && !isPathTile(t.kind))) return 2;
  return 1;
}
export function reachable(s) {
  const mp = UNK.mp + (s.mpBonusTurns > 0 ? 1 : 0), dist = new Map([[s.explorer, 0]]), todo = [s.explorer];
  while (todo.length) {
    todo.sort((a, b) => dist.get(a) - dist.get(b));
    const cur = todo.shift(), d = dist.get(cur), [q, r] = cur.split(',').map(Number), e = edgesOf(s.board[cur]);
    neighbors(q, r).forEach(([a, b], dir) => {
      const nk = key(a, b), t = s.board[nk]; if (!t) return;
      const road = e[dir] === 'road' && edgesOf(t)[(dir + 3) % 6] === 'road';
      const c = road ? UNK.roadStep : enterCost(t);
      if (d + c <= mp && (!dist.has(nk) || dist.get(nk) > d + c)) { dist.set(nk, d + c); todo.push(nk); }
    });
  }
  dist.delete(s.explorer);
  return [...dist.keys()];
}

// ---------- acções ----------
const clone = s => structuredClone(s);
export function swapCost(s) { return s.freeSwap ? 0 : 1; }
export function swap(s0, i) {
  const s = clone(s0); if (s.step !== 'place') return { error: 'Só podes trocar antes de colocar.' };
  const c = swapCost(s); if (s.tokens < c) return { error: 'Não tens fichas para trocar.' };
  if (!s.market[i]) return { error: 'Não há peça nesse lugar.' };
  s.tokens -= c; s.freeSwap = false; [s.current, s.market[i]] = [s.market[i], s.current];
  s.log.push({ swap: i }); return { state: s };
}

export function place(s0, q, r, rot) {
  const s = clone(s0); if (s.step !== 'place' || s.over) return { error: 'Agora não é altura de colocar.' };
  const tile = { ...s.current, rot }, sc = placementScore(s, q, r, tile);
  if (!sc) return { error: 'A peça não encaixa aqui com esta rotação.' };
  const k = key(q, r), events = [];
  s.board[k] = tile; s.placedKinds[tile.kind] = (s.placedKinds[tile.kind] || 0) + 1; s.inChapter++;
  if (sc.perfect) { s.score += UNK.perfect; s.tokens = Math.min(UNK.maxTokens, s.tokens + 1); events.push('Encaixe perfeito: +3 e +1 ficha'); }
  if (tile.kind === 'bridge') { s.score += UNK.bridge; events.push('Ponte: +3'); }
  for (const f of ['plain', 'forest', 'range', 'water', 'road', 'river']) payMilestones(s, f, events);
  payLinks(s, events); checkChapter(s, events);
  s.log.push({ q, r, rot, events });
  s.step = reachable(s).length ? 'move' : 'next';
  if (s.step === 'next') endTurn(s, events);
  return { state: s, events };
}

export function move(s0, to) {
  const s = clone(s0); if (s.step !== 'move') return { error: 'Agora não é altura de mover.' };
  const events = [];
  if (to != null) {
    if (!reachable(s).includes(to)) return { error: 'O Explorador não chega lá este turno.' };
    s.explorer = to;
    const t = s.board[to], site = KINDS[t.kind].site || (t.kind === 'village' && !t.camp ? 'village' : null);
    if (site && !s.explored[to]) { s.step = 'discover'; s.pendingSite = { at: to, site }; s.log.push({ move: to }); return { state: s, events }; }
  }
  s.log.push({ move: to }); endTurn(s, events); return { state: s, events };
}

export function returnToCamp(s0) {
  const s = clone(s0); if (s.step !== 'move') return { error: 'Só na fase de movimento.' };
  if (s.returnUsed || s.tokens < 1) return { error: 'Regresso ao Acampamento: 1 ficha, uma vez por capítulo.' };
  s.tokens--; s.returnUsed = true; s.explorer = '0,0'; const events = []; s.log.push({ camp: true }); endTurn(s, events); return { state: s, events };
}

export function discover(s0, choice) {
  const s = clone(s0); if (s.step !== 'discover') return { error: 'Não há nada para descobrir.' };
  const { at, site } = s.pendingSite, R = SITE_REWARDS[site][choice]; if (!R) return { error: 'Escolha inválida.' };
  const events = [];
  s.score += (R.points || 0) + s.discoveryBonus; if (s.discoveryBonus) events.push('Descoberta: +5');
  s.discoveryBonus = 0;
  s.tokens = Math.max(0, Math.min(UNK.maxTokens, s.tokens + (R.tokens || 0)));
  if (R.mpTurns) s.mpBonusTurns = R.mpTurns + 1;
  s.explored[at] = choice; s.chapterState.explored++; s.pendingSite = null;
  checkChapter(s, events); s.log.push({ discover: choice }); endTurn(s, events);
  return { state: s, events };
}

function endTurn(s, events) {
  if (s.mpBonusTurns > 0) s.mpBonusTurns--;
  if (s.inChapter >= UNK.perChapter) endChapter(s, events);
  if (s.over) return;
  s.current = s.stack.shift() || null; s.step = 'place';
  if (!s.current) { finish(s); return; }
  // peça sem lugar e sem troca possível: perde-se e conta para o capítulo
  while (s.current && !legalPlacements(s).length && !(s.tokens >= swapCost(s) && s.market.some(t => legalPlacements(s, t).length))) {
    events.push('A peça não cabia em lado nenhum e perdeu-se.'); s.inChapter++;
    if (s.inChapter >= UNK.perChapter) { endChapter(s, events); if (s.over) return; }
    s.current = s.stack.shift() || null;
  }
  if (!s.current) finish(s);
}

function endChapter(s, events) {
  const E = s.event, pk = s.placedKinds;
  if (E === 'growth') { const n = (pk.forest || 0) + (pk.woods || 0); s.score += n; events.push(`Crescimento: +${n}`); }
  if (E === 'winter') { const n = (pk.hills || 0) + (pk.mountains || 0); s.score += n; events.push(`Inverno: +${n}`); }
  if (E === 'prosperity') { const n = 2 * Object.values(s.board).filter(t => t.kind === 'village').length; s.score += n; events.push(`Prosperidade: +${n}`); }
  if (E === 'discovery') s.discoveryBonus = 0;
  s.history.push({ chapter: s.chapter, ...s.chapterState, event: E });
  s.chapter++; s.inChapter = 0;
  if (s.chapter >= UNK.chapters) { finish(s); return; }
  startChapter(s);
  if (s.event === 'discovery') s.discoveryBonus = 5;
}
function finish(s) { s.over = true; s.step = 'over'; s.title = UNK.titles.find(([min]) => s.score >= min)[1]; }
