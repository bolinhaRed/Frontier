// Baralho de acontecimentos (10 cartas). D2: existe desde a etapa 2, baralhado pela seed,
// para o Círculo de pedras; os efeitos só são implementados na etapa 6.
export const EVENTS = {
  wildfire:  { name: 'Incêndio florestal',        kind: 'Perigo',             art: 'forest_18_blast' , text: 'Quem tem Floresta ou Bosque sem estrutura e sem Torre ao lado: paga 2 Provisões, ou arde um deles ao acaso (fica Árvores mortas e recebes 2 Madeira).' },
  creatures: { name: 'Criaturas nas Deadlands',   kind: 'Perigo',             art: 'forest_08_spider' , text: 'Os teus terrenos de Deadlands sem Torre ao lado não produzem durante 2 rondas, a não ser que pagues 1 Pedra.' },
  storm:     { name: 'Tempestade',                kind: 'Clima',              art: 'tundra_04_snowStorm' , text: 'Os teus Lagos e Rios não produzem durante 2 rondas, a não ser que pagues 1 Madeira.' },
  winter:    { name: 'Inverno rigoroso',          kind: 'Clima',              art: 'tundra_01_full' , text: 'Por cada 2 estruturas, 1 Provisão. Escolhes quanto pagas; perdes 1 ponto por cada uma que não pagues.' },
  fog:       { name: 'Nevoeiro',                  kind: 'Clima',              art: 'fog' , text: 'O mercado é renovado. Depois, cada um troca 1 carta da mão pela do topo do baralho, ou recebe 1 Provisão.' },
  ruins:     { name: 'Ruínas esquecidas',         kind: 'Descoberta',         art: 'forest_17_ruins' , text: 'Surgem Ruínas novas no mapa. Cada um recebe 1 Provisão, ou passa a poder explorá-las por 1 Provisão.' },
  vein:      { name: 'Veio de pedra',             kind: 'Descoberta',         art: 'mountain_11_cave' , text: 'Cada um recebe 2 Pedra, ou +1 Pedra sempre que uma Serra sua produzir, durante 2 rondas.' },
  merchants: { name: 'Caravana de mercadores',    kind: 'Oportunidade',       art: 'desert_19_road' , text: 'Cada um recebe 1 recurso à escolha, ou faz já uma troca de 2 por 1.' },
  harvest:   { name: 'Ano fértil',                kind: 'Oportunidade',       art: 'forest_10_mushroom' , text: 'Escolhe uma família: cada terreno teu dessa família que possa produzir dá 1 recurso.' },
  volcano:   { name: 'Vulcão desperta',           kind: 'Alteração do terreno', art: 'mountain_04_vulcano' , text: 'Uma Montanha sem estrutura, ao acaso, passa a Vulcão. O dono recebe 3 Pedra, ou 1 ponto no fim por cada vizinho ocupado.' },
};
export const EVENT_ROUNDS_EVERY = 4;   // fim das rondas 4 e 8 (D1: sem efeito até à etapa 6)
