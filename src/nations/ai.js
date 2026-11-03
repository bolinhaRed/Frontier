// IA das Quatro Nações, com 3 níveis. Só faz acções válidas; uma acção de cada vez.
//   easy   — conquista só quando é muito provável, não ataca, recruta pouco.
//   normal — conquista com probabilidade razoável, ataca peões fracos, vai atrás do que vale mais.
//   hard   — como normal, mas persegue os lendários, trava quem estiver perto de ganhar, arrisca mais
//            nos alvos valiosos, fortifica os lendários; recebe +1 ouro por turno (no motor).
import { neighbors, key, distance } from '../core/hex.js';
import { placements, reachable, recruitSpots, recruitCost, towerCost, tileDefense, chanceVsFixed, chanceVsPawn, pawnAt, RULES } from './engine.js';
import { mulberry32, hashStr } from '../core/rng.js';

const LEG = ['temple', 'volcano', 'crystals'];
const value = (c, level) => (c.legendary ? (level === 'hard' ? 7 : 6) : c.capital != null ? 5 : c.kind === 'village' ? 4 : c.badlands ? 2 : 1);

export function aiAction(s) {
  const p = s.players[s.active], level = p.level || 'normal', rnd = mulberry32(hashStr(s.seed + '|' + s.log.length));
  const fire = p.nation === 'fire' ? 1 : 0;
  if (s.step === 'place') {
    const P = placements(s); if (!P.length) return { type: 'skipPlace' };
    const mine = Object.entries(s.board).filter(([, c]) => c.owner === p.id).map(([k]) => k.split(',').map(Number));
    const near = P.filter(x => mine.some(([q, r]) => distance(q, r, x.q, x.r) <= 2));
    const pool = near.length ? near : P; return pool[Math.floor(rnd() * pool.length)];
  }
  if (s.ap < RULES.roadStep - 1e-9) return { type: 'end' };

  // quem está perto de ganhar pelos lendários? (a IA difícil vai atrás dele)
  const legOwner = {}; for (const c of Object.values(s.board)) if (c.legendary && c.owner != null) legOwner[c.owner] = (legOwner[c.owner] || 0) + 1;
  const threat = level === 'hard' ? Object.entries(legOwner).find(([o, n]) => +o !== p.id && n >= 2)?.[0] : undefined;

  // 1. recrutar
  const maxPawns = level === 'easy' ? 3 : RULES.maxPawns;
  if (s.ap >= 1 && p.gold >= recruitCost(s) && p.pawns.length < maxPawns) { const at = recruitSpots(s)[0]; if (at) return { type: 'recruit', at }; }
  // 2. conquistar onde está
  const minChance = { easy: 0.66, normal: 0.5, hard: 0.5 }[level];
  if (s.ap >= 1) for (const w of p.pawns) {
    const c = s.board[w.at]; if (c.owner === p.id) continue;
    const ch = chanceVsFixed(w.level, tileDefense(s, w.at)), v = value(c, level);
    if (ch >= minChance || (level !== 'easy' && ch >= 0.33 && v >= 4) || (threat != null && c.owner === +threat && c.legendary && ch >= 0.33)) return { type: 'conquer', pawn: w.id };
  }
  // 3. atacar peões vizinhos
  if (s.ap >= 1 && level !== 'easy') for (const w of p.pawns) {
    const [q, r] = w.at.split(',').map(Number);
    for (const [a, b] of neighbors(q, r)) {
      const t = pawnAt(s, key(a, b)); if (!t || t.player.id === p.id) continue;
      const cell = s.board[key(a, b)], def = t.pawn.level + (cell.owner === t.player.id ? 1 : 0) + (cell.structure ? 2 : 0);
      const need = level === 'hard' && (cell.legendary || t.player.id === +threat) ? 0.5 : 0.55;
      if (chanceVsPawn(w.level + fire, def) >= need) return { type: 'attack', pawn: w.id, target: key(a, b) };
    }
  }
  // 4. mover para o melhor alvo ao alcance (guardando 1 ponto para conquistar)
  let best = null;
  for (const w of p.pawns) {
    if (s.board[w.at].owner !== p.id && s.ap >= 1) continue;
    for (const [to, cost] of Object.entries(reachable(s, w.id))) {
      const c = s.board[to]; if (c.owner === p.id || s.ap - cost < 1) continue;
      let sc = value(c, level) * chanceVsFixed(w.level, tileDefense(s, to)) - cost * 0.3;
      if (threat != null && c.owner === +threat) sc += 1.5;
      sc += level === 'easy' ? rnd() * 3 : rnd() * 0.05;
      if (!best || sc > best.sc) best = { sc, a: { type: 'move', pawn: w.id, to } };
    }
  }
  if (best) return best.a;
  // 5. Torre num terreno próprio valioso
  if (s.ap >= 1 && p.gold >= towerCost(s) && level !== 'easy') {
    const k = Object.entries(s.board).find(([, c]) => c.owner === p.id && !c.structure && c.kind !== 'village' && !c.kind.includes('_') && c.kind !== 'bridge' && (c.legendary || c.badlands));
    if (k) return { type: 'tower', at: k[0] };
  }
  return { type: 'end' };
}
