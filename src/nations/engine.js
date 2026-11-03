// Modo «Quatro Nações» — conquista territorial com peões (2 a 4 jogadores, pessoas ou IA).
// Nações: Guardiões da Floresta, Nómadas da Areia, Forjadores da Rocha e Espíritos do Gelo.
// Separado dos outros modos (pode retirar-se sem os afectar). Usa as peças e as regras de encaixe da Expedição.
//  • Mapa inicial: Badlands no centro (Templo, Vulcão e Cristais = locais lendários), anel de terrenos neutros,
//    capital de cada nação na borda com 2 terrenos seus e 2 peões.
//  • Turno: rendimento → colocar 1 peça (de uma mão de 2, fica neutra) → 3 pontos de acção → fim.
//  • Acções (1 ponto cada): mover (custo do caminho), conquistar o hexágono onde está o peão, atacar um peão
//    vizinho, recrutar (3 ouro, na capital ou numa Aldeia própria), construir Torre (2 ouro, num hexágono próprio).
//  • Combate: D6 + nível + bónus contra a defesa (hexágono vazio) ou contra D6 + nível + bónus (peão); empate
//    para quem defende. Quem perde volta à capital e desce 1 nível; quem ganha sobe 1 (máx. 3).
//  • Vitória: os 3 lendários no início de 2 turnos seguidos; metade do mapa no início do turno; ou mais pontos ao
//    fim de 15 rondas (1 por hexágono, 3 por lendário, 2 por estrutura).
import { key, neighbors, distance, ring } from '../core/hex.js';
import { rngState, nextFloat, nextInt } from '../core/rng.js';
import { edgesOf } from '../expedition/tiles.js';
import { placementScore } from '../expedition/engine.js';

export const NATIONS = {
  nature: { name: 'Guardiões da Floresta', short: 'Guardiões', letter: 'G', biome: 'greenlands', color: '#3f7a3a', text: '+1 de defesa em Floresta e Bosque; recrutar custa 2 ouro.' },
  fire:   { name: 'Nómadas da Areia',      short: 'Nómadas',   letter: 'N', biome: 'sandlands',  color: '#c8922e', text: '+1 nos ataques a peões; entram nos Vulcões sem custo.' },
  stone:  { name: 'Forjadores da Rocha',   short: 'Forjadores', letter: 'F', biome: 'drylands',  color: '#8a5a3c', text: '+1 de defesa em Colinas e Montanhas; Torres custam 1 ouro.' },
  water:  { name: 'Espíritos do Gelo',     short: 'Espíritos', letter: 'E', biome: 'icelands',   color: '#2c6a97', text: 'Atravessam rios e Lagos sem custo.' },
};
export const ORDER = ['nature', 'fire', 'stone', 'water'];
export const RULES = { ap: 3, startGold: 2, maxPawns: 4, maxLevel: 3, recruit: 3, tower: 2, rounds: 15, handSize: 2, roadStep: 1 / 3 };
export const DEFENSE = { plain: 2, woods: 3, forest: 3, hills: 3, mountains: 4, village: 3, lake: 2, legendary: 5, badlands: 4, river: 2, road: 2 };
const LEGENDARY = ['temple', 'volcano', 'crystals'];
export const LEGENDARY_NAMES = { temple: 'Templo', volcano: 'Vulcão', crystals: 'Cristais' };
const BAG = { plain: 18, forest: 8, woods: 6, hills: 7, mountains: 4, lake: 3, village: 4, road_straight: 7, road_bend: 6, road_fork: 3,
  river_straight: 4, river_bend: 3, river_bend2: 2, bridge: 3 };
const CAPITAL_DIRS = [[3, 0], [-3, 0], [0, -3], [0, 3]];          // 1.º e 2.º jogadores em lados opostos

const pickW = (st, obj) => { const e = Object.entries(obj); let x = nextFloat(st) * e.reduce((t, [, w]) => t + w, 0); for (const [v, w] of e) if ((x -= w) < 0) return v; return e[0][0]; };
const T = (kind, biome, extra = {}) => ({ kind, biome, rot: 0, owner: null, structure: null, legendary: null, ...extra });
const terrainOf = c => (c.kind.startsWith('road') ? 'road' : c.kind.startsWith('river') || c.kind === 'bridge' ? 'river' : c.kind);

export function createNations({ seed = 'NAT', players }) {
  if (!Array.isArray(players) || players.length < 2 || players.length > 4) throw new Error('2 a 4 jogadores.');
  const s = { mode: 'nations', version: 1, seed: String(seed), rng: rngState('nations', seed), board: {}, round: 1, turn: 0, active: 0,
    step: 'place', ap: RULES.ap, hand: [], players: [], winner: null, over: false, legendaryStreak: {}, log: [] };
  // Badlands no centro: Templo ao meio, Vulcão e Cristais em lados opostos
  s.board['0,0'] = T('plain', 'deadlands', { legendary: 'temple', badlands: true });
  ring(0, 0, 1).forEach(([q, r], i) => { s.board[key(q, r)] = T(i === 0 ? 'mountains' : i === 3 ? 'plain' : ['hills', 'plain', 'woods'][i % 3], 'deadlands', { badlands: true, legendary: i === 0 ? 'volcano' : i === 3 ? 'crystals' : null }); });
  ring(0, 0, 2).forEach(([q, r]) => { const k = pickW(s.rng, { plain: 5, forest: 2, woods: 2, hills: 2, mountains: 1, village: 1 }); s.board[key(q, r)] = T(k, ['greenlands', 'drylands', 'sandlands', 'icelands'][nextInt(s.rng, 4)]); });
  players.forEach((p, i) => {
    const nation = p.nation || ORDER[i], N = NATIONS[nation], [cq, cr] = CAPITAL_DIRS[i];
    const capital = key(cq, cr);
    s.board[capital] = T('village', N.biome, { owner: i, structure: 'castle', capital: i });
    // 2 terrenos próprios entre a capital e o anel neutro
    const toward = neighbors(cq, cr).filter(([q, r]) => distance(0, 0, q, r) === 3).slice(0, 2);   // 2 vizinhos na mesma borda
    toward.forEach(([q, r]) => { s.board[key(q, r)] = T(i % 2 ? 'woods' : 'plain', N.biome, { owner: i }); });
    s.players.push({ id: i, nation, name: p.name || N.name, kind: p.kind || 'human', level: p.level || 'normal', gold: RULES.startGold + i, capital,   // +1 ouro por lugar depois do 1.º
      pawns: (() => { const hard = p.kind === 'ai' && p.level === 'hard', L = hard ? 2 : 1;          // IA difícil: 3 peões de nível 2
        return [{ id: i * 10, at: capital, level: L }, { id: i * 10 + 1, at: key(...toward[0]), level: L }, ...(hard ? [{ id: i * 10 + 2, at: key(...toward[1]), level: L }] : [])]; })(),
      nextPawn: i * 10 + 3, out: false });
  });
  dealHand(s); income(s);
  return s;
}

function dealHand(s) {
  const N = NATIONS[s.players[s.active].nation];
  while (s.hand.length < RULES.handSize) { const kind = pickW(s.rng, BAG); s.hand.push({ kind, biome: nextFloat(s.rng) < 0.5 ? N.biome : ['greenlands', 'drylands', 'sandlands', 'icelands'][nextInt(s.rng, 4)], rot: 0 }); }
}
const own = (s, pid) => Object.values(s.board).filter(c => c.owner === pid);
function income(s) {
  const p = s.players[s.active], mine = own(s, p.id);
  p.gold += mine.filter(c => c.kind === 'village' || c.structure === 'castle').length + Math.floor(mine.length / 3) + 2 * mine.filter(c => c.legendary).length;
  if (p.kind === 'ai' && p.level === 'hard') p.gold += 1;      // IA difícil: +1 ouro por turno (anunciado no ecrã)
}
export const pawnAt = (s, k) => { for (const p of s.players) for (const w of p.pawns) if (w.at === k) return { player: p, pawn: w }; return null; };

// ---------- defesa e combate ----------
function terrainBonus(s, cell, pid) {
  if (pid == null) return 0;
  const n = s.players[pid].nation, t = cell.kind;
  if (n === 'nature' && (t === 'forest' || t === 'woods')) return 1;
  if (n === 'stone' && (t === 'hills' || t === 'mountains')) return 1;
  return 0;
}
export function tileDefense(s, k) {
  const c = s.board[k];
  let d = c.legendary ? DEFENSE.legendary : c.badlands ? DEFENSE.badlands : DEFENSE[terrainOf(c)] ?? 2;
  if (c.structure === 'tower' || c.structure === 'castle') d += 2;
  return d + terrainBonus(s, c, c.owner);
}
const attackBonus = (s, pid) => (s.players[pid].nation === 'fire' ? 1 : 0);
// Probabilidade de D6 + a > b (contra valor fixo) ou de D6 + a > D6 + b (contra peão).
export const chanceVsFixed = (a, d) => Math.max(0, Math.min(6, 6 - Math.max(0, d - a))) / 6;
export function chanceVsPawn(a, b) { let w = 0; for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if (x + a > y + b) w++; return w / 36; }
export const roll = s => nextInt(s.rng, 6) + 1;

function sendHome(s, p, w) {
  w.level = Math.max(1, w.level - 1);
  // volta à capital; se estiver ocupada, a uma Aldeia sua; senão, ao terreno seu livre mais perto da capital
  const [cq, cr] = p.capital.split(',').map(Number);
  const mine = Object.entries(s.board).filter(([k, c]) => c.owner === p.id && !pawnAt(s, k)).map(([k, c]) => [k, c]);
  const rank = ([k, c]) => (k === p.capital ? 0 : c.kind === 'village' ? 1 : 2) * 100 + distance(cq, cr, ...k.split(',').map(Number));
  const homes = mine.sort((x, y) => rank(x) - rank(y)).map(([k]) => k);
  if (homes.length) w.at = homes[0]; else p.pawns = p.pawns.filter(x => x !== w);   // sem casa livre: o peão perde-se
}

// ---------- movimento ----------
function enterCost(s, pid, from, to, dir) {
  const c = s.board[to], n = s.players[pid].nation; if (!c) return Infinity;
  const road = edgesOf(s.board[from])[dir] === 'road' && edgesOf(c)[(dir + 3) % 6] === 'road';
  if (road) return RULES.roadStep;
  if (c.legendary === 'volcano' && n === 'fire') return 0;
  if (c.kind === 'lake') return n === 'water' ? 1 : Infinity;
  let cost = 1;
  if (c.kind === 'mountains') cost++;
  if (terrainOf(c) === 'river' && c.kind !== 'bridge' && n !== 'water') cost++;
  return cost;
}
export function reachable(s, pawnId) {
  const p = s.players[s.active], w = p.pawns.find(x => x.id === pawnId); if (!w) return {};
  const dist = { [w.at]: 0 }, todo = [w.at];
  while (todo.length) {
    todo.sort((a, b) => dist[a] - dist[b]);
    const cur = todo.shift(), [q, r] = cur.split(',').map(Number);
    neighbors(q, r).forEach(([a, b], dir) => {
      const nk = key(a, b); if (!s.board[nk]) return;
      if (pawnAt(s, nk) && nk !== w.at) return;              // não se passa por cima de peões
      const d = dist[cur] + enterCost(s, p.id, cur, nk, dir);
      if (d <= s.ap + 1e-9 && (dist[nk] == null || dist[nk] > d)) { dist[nk] = d; todo.push(nk); }
    });
  }
  delete dist[w.at];
  return dist;   // destino → pontos de acção
}

// ---------- acções ----------
const clone = x => structuredClone(x);
const fail = error => ({ error });
export function placeTile(s0, i, q, r, rot) {
  const s = clone(s0); if (s.over || s.step !== 'place') return fail('Agora não é altura de colocar.');
  const t = s.hand[i]; if (!t) return fail('Essa peça não existe.');
  const tile = { ...t, rot };
  if (!placementScore(s, q, r, tile)) return fail('A peça não encaixa aqui com esta rotação.');
  s.board[key(q, r)] = { ...tile, owner: null, structure: null, legendary: null };
  s.hand.splice(i, 1); s.step = 'act'; s.log.push({ place: [q, r, rot] });
  return { state: s };
}
export function skipPlace(s0) { const s = clone(s0); if (s.step !== 'place') return fail('Agora não.'); s.step = 'act'; return { state: s }; }

export function movePawn(s0, pawnId, to) {
  const s = clone(s0); if (s.step !== 'act') return fail('Primeiro coloca uma peça.');
  const cost = reachable(s, pawnId)[to]; if (cost == null) return fail('O peão não chega lá.');
  s.players[s.active].pawns.find(x => x.id === pawnId).at = to; s.ap -= cost; s.log.push({ move: [pawnId, to] });
  return { state: s };
}

export function conquer(s0, pawnId) {
  const s = clone(s0), p = s.players[s.active], w = p.pawns.find(x => x.id === pawnId);
  if (s.step !== 'act' || s.ap < 1 || !w) return fail('Conquistar custa 1 ponto de acção.');
  const c = s.board[w.at]; if (c.owner === p.id) return fail('Este hexágono já é teu.');
  const a = w.level, d = tileDefense(s, w.at), die = roll(s);
  s.ap -= 1;
  const win = die + a > d, prev = c.owner, events = [`Conquista: ${die} + ${a} contra defesa ${d}`];
  if (win) {
    c.owner = p.id; w.level = Math.min(RULES.maxLevel, w.level + 1); events.push('conseguiste!');
    if (c.capital != null && c.capital !== p.id) events.push(`capital de ${s.players[prev].name} tomada`);
  } else { sendHome(s, p, w); events.push('falhou: o peão volta a casa'); }
  s.log.push({ conquer: pawnId, die, win });
  return finishAction(s, events, win);
}

export function attack(s0, pawnId, targetKey) {
  const s = clone(s0), p = s.players[s.active], w = p.pawns.find(x => x.id === pawnId);
  if (s.step !== 'act' || s.ap < 1 || !w) return fail('Atacar custa 1 ponto de acção.');
  const [q, r] = w.at.split(',').map(Number);
  if (!neighbors(q, r).some(([a, b]) => key(a, b) === targetKey)) return fail('Só podes atacar um peão vizinho.');
  const t = pawnAt(s, targetKey); if (!t || t.player.id === p.id) return fail('Não há aí um peão inimigo.');
  const cell = s.board[targetKey];
  const a = w.level + attackBonus(s, p.id), b = t.pawn.level + (cell.owner === t.player.id ? 1 : 0) + terrainBonus(s, cell, t.player.id) + (cell.structure ? 2 : 0);
  const x = roll(s), y = roll(s); s.ap -= 1;
  const win = x + a > y + b, events = [`Ataque: ${x} + ${a} contra ${y} + ${b}`];
  if (win) { sendHome(s, t.player, t.pawn); w.level = Math.min(RULES.maxLevel, w.level + 1); events.push(`o peão de ${t.player.name} recua`); }
  else { sendHome(s, p, w); t.pawn.level = Math.min(RULES.maxLevel, t.pawn.level + 1); events.push('o teu peão recua'); }
  s.log.push({ attack: [pawnId, targetKey], x, y, win });
  return finishAction(s, events, win);
}

export const recruitCost = (s, pid = s.active) => (s.players[pid].nation === 'nature' ? RULES.recruit - 1 : RULES.recruit);
export const towerCost = (s, pid = s.active) => (s.players[pid].nation === 'stone' ? RULES.tower - 1 : RULES.tower);
export function recruitSpots(s) {
  const p = s.players[s.active];
  return Object.entries(s.board).filter(([k, c]) => c.owner === p.id && (c.capital === p.id || c.kind === 'village') && !pawnAt(s, k)).map(([k]) => k);
}
export function recruit(s0, at) {
  const s = clone(s0), p = s.players[s.active], c = recruitCost(s);
  if (s.step !== 'act' || s.ap < 1) return fail('Recrutar custa 1 ponto de acção.');
  if (p.gold < c) return fail(`Recrutar custa ${c} ouro.`);
  if (p.pawns.length >= RULES.maxPawns) return fail('Já tens 4 peões.');
  if (!recruitSpots(s).includes(at)) return fail('Recruta na tua capital ou numa Aldeia tua livre.');
  p.gold -= c; s.ap -= 1; p.pawns.push({ id: p.nextPawn++, at, level: 1 }); s.log.push({ recruit: at });
  return finishAction(s, ['Novo peão'], true);
}
export function buildTower(s0, at) {
  const s = clone(s0), p = s.players[s.active], c = towerCost(s), cell = s.board[at];
  if (s.step !== 'act' || s.ap < 1) return fail('Construir custa 1 ponto de acção.');
  if (!cell || cell.owner !== p.id || cell.structure || cell.kind === 'village' || terrainOf(cell) !== cell.kind) return fail('Só num terreno teu, sem estrutura.');
  if (p.gold < c) return fail(`A Torre custa ${c} ouro.`);
  p.gold -= c; s.ap -= 1; cell.structure = 'tower'; s.log.push({ tower: at });
  return finishAction(s, ['Torre construída'], true);
}

function finishAction(s, events) {
  checkHalf(s);
  return { state: s, events };
}

// ---------- fim de turno, vitória ----------
const mapSize = s => Object.values(s.board).filter(c => c.kind !== 'lake').length;
function checkHalf(s) {
  const p = s.players[s.active];
  if (own(s, p.id).length * 2 > mapSize(s)) { s.over = true; s.winner = p.id; s.reason = 'Controla mais de metade do mapa'; }
}
export function score(s, pid) {
  const mine = own(s, pid);
  return mine.length + 3 * mine.filter(c => c.legendary).length + 2 * mine.filter(c => c.structure || c.kind === 'village').length;
}
export function endTurn(s0) {
  const s = clone(s0); if (s.over) return fail('A partida terminou.');
  if (s.step === 'place') return fail('Primeiro coloca uma peça (ou passa).');
  s.log.push({ end: s.active });
  const N = s.players.length;
  for (let i = 1; i <= N; i++) {
    const nxt = (s.active + i) % N;
    if (nxt <= s.active) { s.round++; if (s.round > RULES.rounds) return finishByPoints(s); }
    const p = s.players[nxt];
    if (!p.pawns.length && !own(s, nxt).length) { p.out = true; continue; }
    s.active = nxt; break;
  }
  const alive = s.players.filter(p => !p.out);
  if (alive.length === 1) { s.over = true; s.winner = alive[0].id; s.reason = 'Única nação de pé'; return { state: s }; }
  s.ap = RULES.ap; s.step = 'place'; s.hand = []; dealHand(s); income(s);
  // lendários no início de 2 turnos seguidos
  const p = s.players[s.active], all = LEGENDARY.every(l => Object.values(s.board).some(c => c.legendary === l && c.owner === p.id));
  s.legendaryStreak[p.id] = all ? (s.legendaryStreak[p.id] || 0) + 1 : 0;
  if (s.legendaryStreak[p.id] >= 2) { s.over = true; s.winner = p.id; s.reason = 'Domina os 3 locais lendários'; }
  checkHalf(s);
  return { state: s };
}
function finishByPoints(s) {
  s.round = RULES.rounds; s.over = true;
  const ranked = s.players.map(p => [p.id, score(s, p.id), p.gold]).sort((a, b) => b[1] - a[1] || b[2] - a[2]);
  s.winner = ranked[0][0]; s.reason = 'Mais pontos ao fim de 15 rondas'; s.finalScores = ranked;
  return { state: s };
}

// Uma só porta de entrada para a interface e a IA.
export function act(s, a) {
  switch (a.type) {
    case 'place': return placeTile(s, a.i, a.q, a.r, a.rot);
    case 'skipPlace': return skipPlace(s);
    case 'move': return movePawn(s, a.pawn, a.to);
    case 'conquer': return conquer(s, a.pawn);
    case 'attack': return attack(s, a.pawn, a.target);
    case 'recruit': return recruit(s, a.at);
    case 'tower': return buildTower(s, a.at);
    case 'end': return endTurn(s);
    default: return fail('Acção desconhecida.');
  }
}

// Posições possíveis para as peças da mão (todas as rotações).
export function placements(s) {
  const out = [], seen = new Set();
  for (const k of Object.keys(s.board)) {
    const [q, r] = k.split(',').map(Number);
    for (const [a, b] of neighbors(q, r)) {
      const nk = key(a, b); if (s.board[nk] || seen.has(nk)) continue; seen.add(nk);
      s.hand.forEach((t, i) => { for (let rot = 0; rot < 6; rot++) if (placementScore(s, a, b, { ...t, rot })) out.push({ type: 'place', i, q: a, r: b, rot }); });
    }
  }
  return out;
}
