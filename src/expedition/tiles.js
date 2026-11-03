// Modo Expedição (estilo Dorfromantik) — tipos de peça. Separado dos outros modos: pode retirar-se sem os afectar.
// Cada peça tem 6 lados (índices de DIRS: 0 SE, 1 NE, 2 N, 3 NW, 4 SW, 5 S) com um tipo:
// plain, forest, range, water (terreno), road (estrada), river (rio).
export const OPEN = { road_straight: [3, 0], road_bend: [3, 1], road_fork: [3, 4, 0], river_straight: [3, 0], river_bend: [3, 1], river_bend2: [2, 0] };

// Peças possíveis e o seu peso na pilha (provisório).
export const KINDS = {
  plain:          { w: 24, base: 'plain',  art: 'plain' },
  forest:         { w: 12, base: 'forest', art: 'forest' },
  woods:          { w: 8,  base: 'forest', art: 'woods' },
  hills:          { w: 9,  base: 'range',  art: 'hills' },
  mountains:      { w: 5,  base: 'range',  art: 'mountains' },
  lake:           { w: 6,  base: 'water',  art: 'lake' },
  village:        { w: 4,  base: 'plain',  art: 'village', village: true },
  road_straight:  { w: 8,  base: 'plain',  path: 'road' },
  road_bend:      { w: 7,  base: 'plain',  path: 'road' },
  road_fork:      { w: 3,  base: 'plain',  path: 'road' },
  river_straight: { w: 5,  base: 'plain',  path: 'river' },
  river_bend:     { w: 3,  base: 'plain',  path: 'river' },
  river_bend2:    { w: 3,  base: 'plain',  path: 'river' },
};
export const BIOMES = [['greenlands', 60], ['drylands', 18], ['icelands', 10], ['sandlands', 8], ['deadlands', 4]];
export const FAMILY_NAMES = { plain: 'Planície', forest: 'Floresta', range: 'Serra', water: 'Água', road: 'Estrada', river: 'Rio' };

export const RULES = {
  startStack: 40,          // peças na pilha ao começar
  perfectBonus: 1,         // peças ganhas num encaixe perfeito
  perfectPoints: 3,
  questChance: 0.28,       // probabilidade de uma peça trazer missão
  questReward: { tiles: 5, points: 10 },
  maxQuests: 3,
};

// Lados de uma peça colocada com a rotação rot (0 a 5).
export function edgesOf(tile) {
  const k = KINDS[tile.kind], e = Array(6).fill(k.base);
  if (k.path) for (const o of OPEN[tile.kind]) e[(((o - tile.rot) % 6) + 6) % 6] = k.path;
  return e;
}
