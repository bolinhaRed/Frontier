// Terrenos, famílias (regiões), recursos e biomas (rev. 1.4, secção Componentes).
export const RESOURCES = ['wood', 'stone', 'food'];          // Madeira, Pedra, Provisões
export const RESOURCE_NAMES = { wood: 'Madeira', stone: 'Pedra', food: 'Provisões' };

export const FAMILIES = ['plain', 'forest', 'range', 'water']; // Planície, Floresta, Serra, Águas
export const FAMILY_NAMES = { plain: 'Planície', forest: 'Floresta', range: 'Serra', water: 'Águas' };

// tile = nome no atlas (assets/tiles/atlas.json)
export const TERRAINS = {
  plain:     { name: 'Planície',  family: 'plain',  resource: 'food',  tile: 'plain' },
  forest:    { name: 'Floresta',  family: 'forest', resource: 'wood',  tile: 'forest' },
  woods:     { name: 'Bosque',    family: 'forest', resource: 'wood',  tile: 'woods' },
  hills:     { name: 'Colinas',   family: 'range',  resource: 'stone', tile: 'hills' },
  mountains: { name: 'Montanhas', family: 'range',  resource: 'stone', tile: 'mountains' },
  lake:      { name: 'Lago',      family: 'water',  resource: 'food',  tile: 'lake' },
  river:     { name: 'Rio',       family: 'water',  resource: 'food',  tile: 'river' },
};
export const TERRAIN_ORDER = ['plain', 'forest', 'woods', 'hills', 'mountains', 'lake', 'river'];

export const BIOMES = ['greenlands', 'drylands', 'sandlands', 'icelands', 'deadlands'];
export const BIOME_NAMES = { greenlands: 'Greenlands', drylands: 'Drylands', sandlands: 'Sandlands', icelands: 'Icelands', deadlands: 'Deadlands' };
