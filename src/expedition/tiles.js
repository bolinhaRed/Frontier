// Modo Expedição (estilo Dorfromantik) — tipos de peça. Separado dos outros modos: pode retirar-se sem os afectar.
// Cada peça tem 6 lados (índices de DIRS: 0 SE, 1 NE, 2 N, 3 NW, 4 SW, 5 S). Cada lado tem:
//   • um tipo: plain, forest, range, water (terreno), road (estrada) ou river (rio);
//   • uma cor (bioma), excepto os lados de estrada e rio, que não têm cor.
export const OPEN = { road_straight: [3, 0], road_bend: [3, 1], road_fork: [3, 4, 0], river_straight: [3, 0], river_bend: [3, 1], river_bend2: [2, 0],
  road_split: [3, 0], river_split: [3, 1] };

// Peças divididas (desenhos do Vasco): lados de cada cor na rotação 0.
export const SPLIT_SIDES = { road_split: { top: [1, 2], bottom: [4, 5] }, river_split: { top: [2], bottom: [0, 4, 5] } };
export const SPLIT_PAIRS = {
  road_split: [['deadlands', 'sandlands'], ['deadlands', 'icelands'], ['greenlands', 'icelands'], ['drylands', 'icelands'], ['greenlands', 'sandlands'], ['greenlands', 'drylands'], ['greenlands', 'deadlands'], ['drylands', 'sandlands']],
  river_split: [['deadlands', 'sandlands'], ['drylands', 'sandlands'], ['greenlands', 'sandlands'], ['icelands', 'sandlands'], ['drylands', 'greenlands'], ['deadlands', 'icelands'], ['icelands', 'greenlands'], ['greenlands', 'icelands'], ['drylands', 'icelands']],
};

// Peças possíveis e o seu peso na pilha (provisório).
export const KINDS = {
  plain:          { w: 22, base: 'plain',  art: 'plain' },
  forest:         { w: 11, base: 'forest', art: 'forest' },
  woods:          { w: 7,  base: 'forest', art: 'woods' },
  hills:          { w: 8,  base: 'range',  art: 'hills' },
  mountains:      { w: 5,  base: 'range',  art: 'mountains' },
  lake:           { w: 6,  base: 'water',  art: 'lake' },
  village:        { w: 4,  base: 'plain',  art: 'village', village: true },
  road_straight:  { w: 7,  base: 'plain',  path: 'road' },
  road_bend:      { w: 6,  base: 'plain',  path: 'road' },
  road_fork:      { w: 3,  base: 'plain',  path: 'road' },
  river_straight: { w: 5,  base: 'plain',  path: 'river' },
  river_bend:     { w: 3,  base: 'plain',  path: 'river' },
  river_bend2:    { w: 3,  base: 'plain',  path: 'river' },
  // Ponte: a estrada atravessa de NW para SE e o rio de NE para SW; cada um continua no seu grupo
  bridge:         { w: 3,  base: 'plain',  paths: { road: [3, 0], river: [1, 4] } },
  road_split:     { w: 4,  base: 'plain',  path: 'road', split: true },
  river_split:    { w: 4,  base: 'plain',  path: 'river', split: true },
};
export const BIOMES = [['greenlands', 40], ['drylands', 20], ['icelands', 16], ['sandlands', 14], ['deadlands', 10]];
export const BIOME_NAMES = { greenlands: 'verde', drylands: 'seca', icelands: 'neve', sandlands: 'areia', deadlands: 'terra morta' };
export const isPathTile = kind => !!(KINDS[kind].path || KINDS[kind].paths);
export const FAMILY_NAMES = { plain: 'Planície', forest: 'Floresta', range: 'Serra', water: 'Água', road: 'Estrada', river: 'Rio' };
export const questName = kind => (kind.startsWith('biome:') ? 'Zona ' + BIOME_NAMES[kind.slice(6)] : FAMILY_NAMES[kind]);

export const RULES = {
  startStack: 35,          // peças na pilha ao começar
  perfectBonus: 1,         // peças ganhas num encaixe perfeito (terreno e cor nos 6 lados)
  perfectPoints: 3,
  questChance: 0.28,       // probabilidade de uma peça trazer missão
  biomeQuestShare: 0.35,   // parte das missões que são de cor
  questReward: { tiles: 5, points: 10 },
  maxQuests: 3,
  sameBiomeChance: 0.6,    // a cor da peça seguinte repete a anterior com esta probabilidade
  rowSize: 3,              // peças à vista na fila
};

const rotd = (o, rot) => (((o - rot) % 6) + 6) % 6;

// Tipo de cada lado de uma peça colocada com a rotação rot (0 a 5).
export function edgesOf(tile) {
  const k = KINDS[tile.kind], e = Array(6).fill(k.base);
  if (k.path) for (const o of OPEN[tile.kind]) e[rotd(o, tile.rot)] = k.path;
  if (k.paths) for (const [type, opens] of Object.entries(k.paths)) for (const o of opens) e[rotd(o, tile.rot)] = type;
  return e;
}

// Cor de cada lado (null nos lados de estrada e rio).
export function colorsOf(tile) {
  const k = KINDS[tile.kind], c = Array(6).fill(tile.biome);
  if (k.split) { const S = SPLIT_SIDES[tile.kind]; for (const o of S.bottom) c[rotd(o, tile.rot)] = tile.biome2; }
  const e = edgesOf(tile);
  return c.map((x, i) => (e[i] === 'road' || e[i] === 'river' ? null : x));
}
