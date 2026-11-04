// Modo «Quatro Nações» (v2, ao estilo Small World): conquista com custos certos, sem dados.
// 2 a 4 nações, pessoas ou IA. Cada jogador escolhe a sua nação.
//  • Mapa já feito (src/nations/map.js). Lagos só os Espíritos do Gelo conquistam.
//  • Cada nação tem 10 tropas. Turno: 1) recolher — fica 1 tropa em cada terra, as outras voltam à mão;
//    2) conquistar — custo = 2 + tropas inimigas lá + 1 em Montanha + 1 nas Badlands/lendários (+ ajustes da
//    nação); a 1.ª conquista é na borda do mapa, as seguintes ao lado das tuas terras; 3) distribuir as tropas
//    que sobram pelas tuas terras; 4) pontuar: 1 por terra + bónus da nação + 2 por lendário.
//  • Quem perde uma terra recupera as tropas de lá menos 1, que se perde.
//  • No início do turno, +1 tropa por Aldeia que tenhas.
//  • 8 rondas; ganha quem tiver mais pontos.
import { key, neighbors, distance } from '../core/hex.js';
import { rngState } from '../core/rng.js';
import { generateMap, RADIUS } from './map.js';

export const NATIONS = {
  nature: { name: 'Guardiões da Floresta', short: 'Guardiões', letter: 'G', biome: 'greenlands', color: '#3f7a3a', text: 'Florestas e Bosques custam 1 tropa a menos, valem +1 ponto por ronda e defendem-se melhor (+1).' },
  fire:   { name: 'Nómadas da Areia',      short: 'Nómadas',   letter: 'N', biome: 'sandlands',  color: '#c8922e', text: 'Uma vez por turno conquistam a 2 hexágonos das suas terras. Estradas custam 1 a menos e valem +1 ponto.' },
  stone:  { name: 'Forjadores da Rocha',   short: 'Forjadores', letter: 'F', biome: 'drylands',  color: '#8a5a3c', text: 'Colinas e Montanhas custam 1 tropa a menos e valem +1 ponto por ronda.' },
  water:  { name: 'Espíritos do Gelo',     short: 'Espíritos', letter: 'E', biome: 'icelands',   color: '#2c6a97', text: 'Conquistam Lagos e Rios por menos 1 tropa; Lagos e Rios valem +1 ponto.' },
};
export const ORDER = ['nature', 'fire', 'stone', 'water'];
export const RULES = { troops: 10, rounds: 8, base: 2, legendaryPoints: 2 };
export const LEGENDARY_NAMES = { temple: 'Templo', volcano: 'Vulcão', crystals: 'Cristais' };
const isRiver = c => c.path === 'river', isRoad = c => c.path === 'road';

export function createNations({ seed = 'NAT', players }) {
  if (!Array.isArray(players) || players.length < 2 || players.length > 4) throw new Error('2 a 4 nações.');
  const nations = players.map((p, i) => p.nation || ORDER[i]);
  if (new Set(nations).size !== nations.length) throw new Error('Cada nação só pode ser escolhida uma vez.');
  const s = { mode: 'nations', version: 2, seed: String(seed), rng: rngState('nations', seed), board: generateMap(seed),
    round: 1, active: 0, step: 'conquer', hand: 0, players: [], over: false, winner: null, log: [], lastTurn: null };
  for (const c of Object.values(s.board)) { c.owner = null; c.troops = 0; }
  s.players = players.map((p, i) => ({ id: i, nation: nations[i], name: NATIONS[nations[i]].name, kind: p.kind || 'human', level: p.level || 'normal', score: 0,
    pool: RULES.troops + (p.kind === 'ai' && p.level === 'hard' ? 2 : 0), lastPoints: 0 }));     // IA difícil: +2 tropas (anunciado no ecrã)
  startTurn(s);
  return s;
}

const mine = (s, pid) => Object.entries(s.board).filter(([, c]) => c.owner === pid);

function startTurn(s) {
  const p = s.players[s.active];
  // recolher: fica 1 tropa em cada terra, as outras voltam à mão; +1 por Aldeia
  let hand = p.pool; p.pool = 0;
  for (const [, c] of mine(s, p.id)) { hand += c.troops - 1; c.troops = 1; }
  hand += mine(s, p.id).filter(([, c]) => c.kind === 'village').length;
  s.hand = hand; s.step = 'conquer'; s.turnLog = []; s.farUsed = false;
}

// Custo para a nação activa conquistar k (null = não pode).
export function conquerCost(s, k, pid = s.active) {
  const c = s.board[k]; if (!c || c.owner === pid) return null;
  const n = s.players[pid].nation;
  if (c.kind === 'lake' && n !== 'water') return null;
  if (!canReach(s, k, pid)) return null;
  let cost = RULES.base + (c.troops || 0);
  if (c.kind === 'mountains') cost += 1;
  if (c.badlands) cost += 1;
  if (n === 'stone' && (c.kind === 'hills' || c.kind === 'mountains')) cost -= 1;
  if (n === 'water' && (c.kind === 'lake' || isRiver(c))) cost -= 1;
  if (n === 'nature' && (c.kind === 'forest' || c.kind === 'woods')) cost -= 1;
  if (n === 'fire' && isRoad(c)) cost -= 1;
  if (c.owner != null && s.players[c.owner].nation === 'nature' && (c.kind === 'forest' || c.kind === 'woods')) cost += 1;
  return Math.max(1, cost);
}
function canReach(s, k, pid) {
  const [q, r] = k.split(',').map(Number), own = mine(s, pid);
  if (!own.length) return distance(0, 0, q, r) === RADIUS;                 // 1.ª conquista: na borda
  const near = own.some(([ok]) => { const [a, b] = ok.split(',').map(Number); return distance(a, b, q, r) <= 1; });
  if (near) return true;
  // Nómadas: uma vez por turno, a 2 de distância
  return s.players[pid].nation === 'fire' && pid === s.active && !s.farUsed && own.some(([ok]) => { const [a, b] = ok.split(',').map(Number); return distance(a, b, q, r) <= 2; });
}
export const targets = s => Object.keys(s.board).filter(k => conquerCost(s, k) != null).map(k => ({ k, cost: conquerCost(s, k) }));

const clone = x => structuredClone(x);
const fail = error => ({ error });

export function conquer(s0, k) {
  const s = clone(s0); if (s.over || s.step !== 'conquer') return fail('Agora não é altura de conquistar.');
  const cost = conquerCost(s, k); if (cost == null) return fail('Não podes conquistar esse hexágono daqui.');
  if (s.hand < cost) return fail(`Precisas de ${cost} tropas e só tens ${s.hand}.`);
  const c = s.board[k], prev = c.owner;
  const [cq, cr] = k.split(',').map(Number);
  if (mine(s, s.active).length && !mine(s, s.active).some(([ok]) => distance(...ok.split(',').map(Number), cq, cr) <= 1)) s.farUsed = true;
  if (prev != null) { s.players[prev].pool += Math.max(0, c.troops - 1); }  // o defensor perde 1 tropa
  c.owner = s.active; c.troops = cost; s.hand -= cost;
  s.turnLog.push({ k, cost, from: prev });
  s.log.push({ conquer: k });
  return { state: s };
}
// Passar à distribuição (acabar as conquistas).
export function stopConquering(s0) { const s = clone(s0); if (s.step !== 'conquer') return fail('Agora não.'); s.step = 'deploy'; if (!mine(s, s.active).length) s.step = 'deploy'; return { state: s }; }
// Distribuir 1 tropa da mão para uma terra própria.
export function deploy(s0, k) {
  const s = clone(s0); if (s.step !== 'deploy' && s.step !== 'conquer') return fail('Agora não.');
  const c = s.board[k]; if (!c || c.owner !== s.active) return fail('Só nas tuas terras.');
  if (s.hand < 1) return fail('Não tens tropas na mão.');
  c.troops++; s.hand--; s.log.push({ deploy: k }); return { state: s };
}
// Distribuir automaticamente as tropas da mão pelas terras da fronteira (as que tocam em inimigos ou em terras livres).
export function autoDeploy(s0) {
  const s = clone(s0); const own = mine(s, s.active).map(([k]) => k); if (!own.length) return { state: s };
  const danger = k => { const [q, r] = k.split(',').map(Number); return neighbors(q, r).filter(([a, b]) => { const n = s.board[key(a, b)]; return n && n.owner !== s.active; }).length; };
  const order = own.sort((a, b) => danger(b) - danger(a) || a.localeCompare(b));
  let i = 0; while (s.hand > 0) { s.board[order[i % order.length]].troops++; s.hand--; i++; if (danger(order[i % order.length]) === 0 && i >= order.length) i = 0; }
  return { state: s };
}

export function pointsFor(s, pid) {
  const n = s.players[pid].nation; let pts = 0;
  for (const [, c] of mine(s, pid)) {
    pts += 1;
    if (c.legendary) pts += RULES.legendaryPoints;
    if (n === 'nature' && (c.kind === 'forest' || c.kind === 'woods')) pts += 1;
    if (n === 'stone' && (c.kind === 'hills' || c.kind === 'mountains')) pts += 1;
    if (n === 'water' && (c.kind === 'lake' || isRiver(c))) pts += 1;
    if (n === 'fire' && isRoad(c)) pts += 1;
  }
  return pts;
}

export function endTurn(s0) {
  const s = clone(s0); if (s.over) return fail('A partida terminou.');
  if (s.hand > 0) { if (mine(s, s.active).length) { const r = autoDeploy(s); Object.assign(s, r.state); } else { s.players[s.active].pool += s.hand; s.hand = 0; } }
  const p = s.players[s.active];                       // depois de distribuir (o estado foi substituído)
  const pts = pointsFor(s, p.id); p.score += pts; p.lastPoints = pts;
  s.lastTurn = { player: p.id, conquered: s.turnLog.length, points: pts };
  s.log.push({ end: p.id, points: pts });
  const N = s.players.length;
  s.active = (s.active + 1) % N;
  if (s.active === 0) { s.round++; if (s.round > RULES.rounds) { s.over = true; s.round = RULES.rounds; const best = [...s.players].sort((a, b) => b.score - a.score || mine(s, b.id).length - mine(s, a.id).length)[0]; s.winner = best.id; return { state: s }; } }
  startTurn(s);
  return { state: s };
}

export function act(s, a) {
  switch (a.type) {
    case 'conquer': return conquer(s, a.k);
    case 'stop': return stopConquering(s);
    case 'deploy': return deploy(s, a.k);
    case 'auto': return autoDeploy(s);
    case 'end': return endTurn(s);
    default: return fail('Acção desconhecida.');
  }
}
