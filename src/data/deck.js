// Composição do baralho de terrenos por número de jogadores (rev. 1.4). Totais 48 / 66 / 78.
export const DECK_COUNTS = {
  2: { plain: 13, forest: 8,  woods: 5, hills: 6,  mountains: 5, lake: 5, river: 6 },
  3: { plain: 18, forest: 11, woods: 7, hills: 9,  mountains: 6, lake: 7, river: 8 },
  4: { plain: 21, forest: 13, woods: 8, hills: 10, mountains: 8, lake: 8, river: 10 },
};
// Modo B: 10% das cartas com presságio (usado na etapa 7).
export const PRESAGES = { 2: 5, 3: 7, 4: 8 };
