// Quatro Nações — gerador de mapa. O mapa já vem feito (não há colocação de peças):
//  • zonas de terreno bem delimitadas (manchas de Planície, Floresta, Bosque, Colinas, Montanhas);
//  • Badlands no centro com os 3 lendários (Templo, Vulcão, Cristais);
//  • rios que nascem num Lago e seguem até à borda; estradas de borda a borda;
//  • regra de ouro: cada abertura de rio ou estrada encosta a uma abertura igual do vizinho (ou, num rio, a um
//    Lago), ou sai do mapa. Nunca fica virada para um terreno. `checkPaths` confirma-o.
import { key, neighbors, distance, DIRS } from '../core/hex.js';
import { rngState, nextFloat, nextInt, shuffle, asFn } from '../core/rng.js';
import { OPEN } from '../expedition/tiles.js';

export const RADIUS = 4;
const BIOMES4 = ['greenlands', 'sandlands', 'drylands', 'icelands'];
const ANCHORS = [[4, -2], [-4, 2], [-2, -2], [2, 2]];     // um bioma por quadrante
const rotd = (o, r) => (((o - r) % 6) + 6) % 6;
const inside = (q, r) => distance(0, 0, q, r) <= RADIUS;
const step = (q, r, d) => [q + DIRS[d][0], r + DIRS[d][1]];

// Peça e rotação cujas aberturas são exactamente o conjunto pedido.
function fit(kinds, need, rnd) {
  const want = [...need].sort().join();
  const opts = [];
  for (const k of kinds) for (let r = 0; r < 6; r++) if (OPEN[k].map(o => rotd(o, r)).sort().join() === want) opts.push({ kind: k, rot: r });
  return opts.length ? opts[Math.floor(rnd() * opts.length)] : null;
}

// Caminho que avança sem viragens bruscas (só em frente ou 60° de cada vez), até sair do mapa.
function walk(s, start, dir, ok, rnd, minLen) {
  const path = [];
  let [q, r] = start, d = dir;
  for (let i = 0; i < 40; i++) {
    path.push({ k: key(q, r), q, r, inDir: d });
    const turns = shuffle([0, 0, 1, -1], () => rnd());
    let moved = false;
    for (const t of turns) {
      const nd = (((d + t) % 6) + 6) % 6, [nq, nr] = step(q, r, nd);
      if (!inside(nq, nr)) { if (path.length >= minLen) { path[path.length - 1].outDir = nd; return path; } continue; }
      if (!ok(nq, nr) || path.some(p => p.q === nq && p.r === nr)) continue;
      path[path.length - 1].outDir = nd; q = nq; r = nr; d = nd; moved = true; break;
    }
    if (!moved) return null;
  }
  return null;
}

export function generateMap(seed) {
  const st = rngState('nations-map', seed), rnd = () => nextFloat(st);
  for (let attempt = 0; attempt < 50; attempt++) {
    const board = {};
    // 1. terrenos por manchas (Voronoi) e bioma por quadrante
    const seeds = [];
    for (let i = 0; i < 14; i++) {
      const q = nextInt(st, 9) - 4, r = nextInt(st, 9) - 4; if (!inside(q, r)) { i--; continue; }
      seeds.push({ q, r, kind: ['plain', 'plain', 'plain', 'forest', 'forest', 'woods', 'hills', 'hills', 'mountains'][nextInt(st, 9)] });
    }
    for (let q = -RADIUS; q <= RADIUS; q++) for (let r = -RADIUS; r <= RADIUS; r++) {
      if (!inside(q, r)) continue;
      const near = seeds.reduce((a, b) => (distance(q, r, b.q, b.r) < distance(q, r, a.q, a.r) ? b : a));
      const biome = BIOMES4[ANCHORS.map(([a, b], i) => [distance(q, r, a, b), i]).sort((x, y) => x[0] - y[0])[0][1]];
      board[key(q, r)] = { kind: near.kind, biome, rot: 0 };
    }
    // 2. Badlands e lendários
    board['0,0'] = { kind: 'plain', biome: 'deadlands', rot: 0, badlands: true, legendary: 'temple' };
    neighbors(0, 0).forEach(([q, r], i) => { board[key(q, r)] = { kind: i === 0 ? 'mountains' : i % 2 ? 'hills' : 'plain', biome: 'deadlands', rot: 0, badlands: true, legendary: i === 0 ? 'volcano' : i === 3 ? 'crystals' : null }; });
    // 3. Aldeias: uma por quadrante, a 3 do centro
    ANCHORS.forEach(([a, b]) => { const q = Math.round(a * 0.75), r = Math.round(b * 0.75); if (board[key(q, r)] && !board[key(q, r)].badlands) board[key(q, r)].kind = 'village'; });
    // 4. Rios: 2, de um Lago até à borda
    const free = (q, r) => { const c = board[key(q, r)]; return c && !c.badlands && !c.path && c.kind !== 'village' && c.kind !== 'lake'; };
    let fail = false;
    for (let n = 0; n < 2 && !fail; n++) {
      let made = false;
      for (let t = 0; t < 30 && !made; t++) {
        const lq = nextInt(st, 7) - 3, lr = nextInt(st, 7) - 3;
        if (!inside(lq, lr) || distance(0, 0, lq, lr) < 2 || !free(lq, lr)) continue;
        const d0 = nextInt(st, 6), [sq, sr] = step(lq, lr, d0);
        if (!free(sq, sr)) continue;
        // não pode haver outro rio encostado ao Lago
        const path = walk({}, [sq, sr], d0, (q, r) => free(q, r) && neighbors(q, r).every(([a, b]) => !board[key(a, b)]?.path), rnd, 3);
        if (!path) continue;
        board[key(lq, lr)] = { ...board[key(lq, lr)], kind: 'lake' };
        for (const p of path) {
          const opens = [(p.inDir + 3) % 6, p.outDir], f = fit(['river_straight', 'river_bend', 'river_bend2'], opens, rnd);
          if (!f) { fail = true; break; }
          board[p.k] = { ...board[p.k], kind: f.kind, rot: f.rot, path: 'river' };
        }
        made = true;
      }
      if (!made) fail = true;
    }
    // 5. Estrada: 1, de borda a borda, sem tocar em rios
    if (!fail) {
      let made = false;
      for (let t = 0; t < 40 && !made; t++) {
        const edge = Object.keys(board).map(k => k.split(',').map(Number)).filter(([q, r]) => distance(0, 0, q, r) === RADIUS);
        const [eq, er] = edge[nextInt(st, edge.length)];
        const dOut = [0, 1, 2, 3, 4, 5].find(d => !inside(...step(eq, er, d)));
        if (!free(eq, er)) continue;
        const path = walk({}, [eq, er], (dOut + 3) % 6, (q, r) => free(q, r) && neighbors(q, r).every(([a, b]) => board[key(a, b)]?.path !== 'river'), rnd, 6);
        if (!path) continue;
        path[0].inDir = (dOut + 3) % 6;                       // entra pela borda
        let ok = true; const tiles = [];
        for (const p of path) { const f = fit(['road_straight', 'road_bend'], [(p.inDir + 3) % 6, p.outDir], rnd); if (!f) { ok = false; break; } tiles.push([p.k, f]); }
        if (!ok) continue;
        for (const [k, f] of tiles) board[k] = { ...board[k], kind: f.kind, rot: f.rot, path: 'road' };
        made = true;
      }
      if (!made) fail = true;
    }
    if (!fail && checkPaths(board).length === 0) return board;
  }
  throw new Error('Não foi possível gerar o mapa.');
}

// Problemas de ligação: aberturas viradas para um terreno, ou rios/estradas ao lado sem se ligarem.
export function checkPaths(board) {
  const bad = [];
  for (const [k, c] of Object.entries(board)) {
    if (!c.path) continue;
    const [q, r] = k.split(',').map(Number), opens = OPEN[c.kind].map(o => rotd(o, c.rot));
    for (const d of opens) {
      const n = board[key(...step(q, r, d))];
      if (!n) continue;                                                   // sai do mapa
      if (c.path === 'river' && n.kind === 'lake') continue;              // desagua (nasce) no Lago
      const back = n.path === c.path && OPEN[n.kind].map(o => rotd(o, n.rot)).includes((d + 3) % 6);
      if (!back) bad.push(`${k}: abertura ${d} sem ligação`);
    }
    // nenhum vizinho com abertura virada para esta peça sem resposta
    neighbors(q, r).forEach(([a, b], d) => {
      const n = board[key(a, b)]; if (!n?.path || n.path === c.path) return;
      if (OPEN[n.kind].map(o => rotd(o, n.rot)).includes((d + 3) % 6)) bad.push(`${key(a, b)} aponta para ${k}`);
    });
  }
  for (const [k, c] of Object.entries(board)) {             // terrenos com uma abertura apontada
    if (c.path) continue;
    const [q, r] = k.split(',').map(Number);
    neighbors(q, r).forEach(([a, b], d) => { const n = board[key(a, b)]; if (n?.path && OPEN[n.kind].map(o => rotd(o, n.rot)).includes((d + 3) % 6) && !(n.path === 'river' && c.kind === 'lake')) bad.push(`${key(a, b)} aponta para o terreno ${k}`); });
  }
  return bad;
}
