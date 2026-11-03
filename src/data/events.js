// Baralho de acontecimentos (10 cartas). D2: existe desde a etapa 2, baralhado pela seed,
// para o Círculo de pedras; os efeitos só são implementados na etapa 6.
export const EVENTS = {
  wildfire:  { name: 'Incêndio florestal',        kind: 'Perigo',             art: 'forest_18_blast' },
  creatures: { name: 'Criaturas nas Deadlands',   kind: 'Perigo',             art: 'forest_08_spider' },
  storm:     { name: 'Tempestade',                kind: 'Clima',              art: 'tundra_04_snowStorm' },
  winter:    { name: 'Inverno rigoroso',          kind: 'Clima',              art: 'tundra_01_full' },
  fog:       { name: 'Nevoeiro',                  kind: 'Clima',              art: 'fog' },
  ruins:     { name: 'Ruínas esquecidas',         kind: 'Descoberta',         art: 'forest_17_ruins' },
  vein:      { name: 'Veio de pedra',             kind: 'Descoberta',         art: 'mountain_11_cave' },
  merchants: { name: 'Caravana de mercadores',    kind: 'Oportunidade',       art: 'desert_19_road' },
  harvest:   { name: 'Ano fértil',                kind: 'Oportunidade',       art: 'forest_10_mushroom' },
  volcano:   { name: 'Vulcão desperta',           kind: 'Alteração do terreno', art: 'mountain_04_vulcano' },
};
export const EVENT_ROUNDS_EVERY = 4;   // fim das rondas 4 e 8 (D1: sem efeito até à etapa 6)
