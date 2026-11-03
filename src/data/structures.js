// Estruturas (rev. 1.4, secção Estruturas). Custos e pontos provisórios até à etapa 8.
// on = terrenos onde se pode construir (D3: Aldeia só em Planície ou Floresta, sem Bosque).
export const STRUCTURES = {
  farm:    { name: 'Quinta',         tile: 'farms',   cost: { wood: 1, stone: 0, food: 1 }, on: ['plain'],             influence: 0, points: 1, bonus: { food: 1 } },
  village: { name: 'Aldeia',         tile: 'village', cost: { wood: 2, stone: 1, food: 1 }, on: ['plain', 'forest'],   influence: 1, points: 2, bonus: { same: 1 } },
  tower:   { name: 'Torre de vigia', tile: 'tower',   cost: { wood: 1, stone: 2, food: 0 }, on: ['hills', 'mountains'], influence: 1, points: 2, bonus: null },
  keep:    { name: 'Fortaleza',      tile: 'keep',    cost: { wood: 1, stone: 3, food: 0 }, on: ['hills', 'mountains'], influence: 2, points: 3, bonus: null },
  // Castelo: só sobre uma Aldeia própria; influência e pontos são os totais (substituem os da Aldeia).
  castle:  { name: 'Castelo',        tile: 'city',    cost: { wood: 2, stone: 3, food: 2 }, over: 'village',           influence: 2, points: 5, bonus: { same: 2 } },
  // Maravilha: terreno próprio numa região com 5 ou mais terrenos, no momento de construir; 1 por partida.
  wonder:  { name: 'Maravilha',      tile: 'wonder',  cost: { wood: 3, stone: 4, food: 3 }, on: 'any', minRegion: 5, onePerGame: true, influence: 1, points: 8, bonus: null },
};
export const STRUCTURE_ORDER = ['farm', 'village', 'tower', 'keep', 'castle', 'wonder'];
