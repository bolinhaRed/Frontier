// Frontier Rules (Modo B), rev. 1.4.
// Compatibilidade de biomas (simétrica). Lago e Rio, o Lago neutro e os locais são compatíveis com tudo.
export const COMPAT = {
  greenlands: ['greenlands', 'drylands', 'icelands'],
  drylands: ['drylands', 'greenlands', 'sandlands', 'deadlands'],
  sandlands: ['sandlands', 'drylands'],
  icelands: ['icelands', 'greenlands'],
  deadlands: ['deadlands', 'drylands'],
};
// Aberturas do Rio na rotação 0, em índices de DIRS (0 SE, 1 NE, 2 N, 3 NW, 4 SW, 5 S).
// DECISÃO POR APROVAR: o desenho do tile #7 (rio) liga o lado NW ao lado SE (lados opostos);
// a rev. 1.4 descreve uma curva de 120°. Seguimos o desenho, para o mapa bater com a regra.
// Para a curva de 120° da especificação, usar [3, 5].
export const RIVER_OPENINGS = [3, 0];
export const RIVER_LONG = { length: 4, points: 2 };
export const PRESAGE_SHARE = 0.1;      // 10% das cartas do baralho (5 / 7 / 8)
