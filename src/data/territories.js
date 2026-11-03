// Campanha Solo: 13 territórios num mundo contínuo (aprovado a 3 de Novembro de 2026).
// Cada território é um hexágono de raio 4; os centros seguem a grelha a = (9,-4), b = (4,5), que
// encaixa os territórios lado a lado. Regiões 3 e 4 e o território final chegam com o Frontier Rules (etapa 8).
export const TERRITORY_RADIUS = 4;
export const GRID_A = [9, -4], GRID_B = [4, 5];
export const worldCenter = ([i, j]) => [i * GRID_A[0] + j * GRID_B[0], i * GRID_A[1] + j * GRID_B[1]];

const DECK = { plain: 8, forest: 5, woods: 3, hills: 4, mountains: 3, lake: 3, river: 4 };          // 30 cartas
const GREEN = ['greenlands', 'greenlands', 'greenlands', 'drylands', 'icelands'];
const DRY = ['drylands', 'drylands', 'sandlands', 'greenlands', 'deadlands'];
const ICE = ['icelands', 'icelands', 'greenlands', 'icelands', 'greenlands'];
const SAND = ['sandlands', 'drylands', 'deadlands', 'drylands', 'sandlands'];
const SITES3 = [{ site: 'ruins', q: 2, r: 0 }, { site: 'cave', q: -2, r: 2 }, { site: 'crystals', q: 0, r: -2 }];

export const REGIONS = [
  { id: 1, name: 'Vale Verde', note: 'Free Frontier, sem acontecimentos' },
  { id: 2, name: 'Terras Secas', note: 'Com acontecimentos no fim das rondas 4 e 8', needs: 1 },
  { id: 3, name: 'Gelo Eterno', note: 'Frontier Rules: biomas, Montanhas e Rios; presságios', needs: 2 },
  { id: 4, name: 'Terras Mortas e Areias', note: 'Frontier Rules e mais perigos', needs: 3 },
  { id: 5, name: 'Coração da Fronteira', note: 'Pede 24 estrelas e as regiões 3 e 4 conquistadas', needs: 4, stars: 24 },
];

// main: objectivo principal (conquista). challenges: 2 desafios opcionais. relics: as 2 relíquias oferecidas.
export const TERRITORIES = [
  { id: 1, region: 1, name: 'Clareira', grid: [0, 0], art: 'forest_03_clearing', rounds: 10, deck: DECK, biomes: GREEN, sites: SITES3,
    main: { id: 'clearing', text: 'Constrói 2 Quintas e uma região de Planície com 5 ou mais terrenos.' },
    challenges: [{ id: 'noMarket' }, { id: 'tiles', n: 10 }], relics: ['mason', 'granary'] },
  { id: 2, region: 1, name: 'Margem do Rio', grid: [1, 0], art: 'mountain_02_bridge', rounds: 10, deck: { ...DECK, river: 6, plain: 6 }, biomes: GREEN,
    sites: [{ site: 'ruins', q: 4, r: -2 }, { site: 'cave', q: -2, r: 2 }, { site: 'crystals', q: 0, r: -2 }],
    main: { id: 'connect', site: '4,-2', text: 'Liga o Lago às Ruínas na borda com uma linha de terrenos teus.' },
    challenges: [{ id: 'noExpansion' }, { id: 'structures', n: 3 }], relics: ['engineer', 'merchant'] },
  { id: 3, region: 1, name: 'Bosque Antigo', grid: [0, 1], art: 'forest_06_full', rounds: 10, deck: { ...DECK, forest: 7, woods: 5, plain: 6 }, biomes: GREEN,
    sites: [{ site: 'ruins', q: 3, r: -1 }, { site: 'stones', q: -3, r: 2 }, { site: 'crystals', q: 0, r: -3 }],
    main: { id: 'exploreAll', text: 'Explora os 3 locais especiais.' },
    challenges: [{ id: 'early' }, { id: 'score', n: 35 }], relics: ['scout', 'settler'] },
  { id: 4, region: 2, name: 'Planalto', grid: [1, 1], art: 'mountain_08_full', rounds: 10, deck: DECK, biomes: DRY, sites: SITES3, events: true,
    main: { id: 'castle', text: 'Constrói um Castelo.' },
    challenges: [{ id: 'noMarket' }, { id: 'explored', n: 2 }], relics: ['caravaneer', 'mason'] },
  { id: 5, region: 2, name: 'Ravina', grid: [2, -1], art: 'desert_15_rift', rounds: 10, deck: { ...DECK, hills: 6, mountains: 5, plain: 6, river: 2 }, biomes: DRY, sites: SITES3, events: true,
    main: { id: 'rangeRegion', n: 7, text: 'Faz uma região de Serra (Colinas e Montanhas) com 7 ou mais terrenos.' },
    challenges: [{ id: 'early' }, { id: 'noExpansion' }], relics: ['surveyor', 'engineer'] },
  { id: 6, region: 2, name: 'Encruzilhada', grid: [-1, 1], art: 'desert_16_road', rounds: 10, deck: DECK, biomes: DRY, sites: SITES3, events: true, eventOrder: ['winter', 'wildfire'],
    main: { id: 'survive', text: 'Atravessa o Inverno e o Incêndio sem perder pontos nem terrenos, com 4 estruturas e 3 de Floresta ou Bosque no fim.' },
    challenges: [{ id: 'structures', n: 5 }, { id: 'score', n: 45 }], relics: ['merchant', 'granary'] },
  { id: 7, region: 3, name: 'Fiorde', grid: [2, 0], art: 'tundra_07_iceBridge', mode: 'B', rounds: 10, deck: { ...DECK, river: 8, lake: 4, plain: 6, woods: 2 }, biomes: ICE, sites: SITES3, events: true,
    main: { id: 'riverLong', text: 'Faz um rio contínuo com 4 ou mais troços (Rio longo).' },
    challenges: [{ id: 'noMarket' }, { id: 'tiles', n: 11 }], relics: ['surveyor', 'scout'] },
  { id: 8, region: 3, name: 'Glaciar', grid: [1, -1], art: 'tundra_01_full', mode: 'B', rounds: 11, deck: DECK, biomes: ICE, events: true, eventOrder: ['fog', 'storm'],
    sites: [{ site: 'ruins', q: 3, r: -1 }, { site: 'stones', q: -3, r: 2 }, { site: 'cave', q: 0, r: -3 }],
    main: { id: 'exploreAll', text: 'Explora os 3 locais, com o Nevoeiro e a Tempestade pelo caminho.' },
    challenges: [{ id: 'early' }, { id: 'structures', n: 4 }], relics: ['caravaneer', 'settler'] },
  { id: 9, region: 3, name: 'Passo de Montanha', grid: [2, 1], art: 'mountain_10_gates', mode: 'B', rounds: 11, deck: { ...DECK, hills: 6, mountains: 6, plain: 6, river: 2 }, biomes: ICE, sites: SITES3, events: true,
    main: { id: 'pass', text: 'Constrói 2 Fortalezas e faz uma região de Serra com 5 ou mais terrenos.' },
    challenges: [{ id: 'noExpansion' }, { id: 'score', n: 50 }], relics: ['mason', 'merchant'] },
  { id: 10, region: 4, name: 'Oásis', grid: [-1, 0], art: 'desert_14_oasis', mode: 'B', rounds: 11, deck: { ...DECK, lake: 5, river: 6, plain: 8, forest: 3 }, biomes: SAND, sites: SITES3, events: true,
    main: { id: 'oasis', text: 'Tem 4 terrenos de Lago ou Rio e 3 Quintas.' },
    challenges: [{ id: 'noMarket' }, { id: 'explored', n: 2 }], relics: ['granary', 'engineer'] },
  { id: 11, region: 4, name: 'Vulcão', grid: [0, -1], art: 'mountain_04_vulcano', mode: 'B', rounds: 11, deck: { ...DECK, hills: 6, mountains: 7, plain: 6, river: 2, woods: 2 }, biomes: SAND, sites: SITES3, events: true, eventOrder: ['volcano'],
    main: { id: 'volcano', text: 'Quando o Vulcão despertar (fim da ronda 4), tem uma estrutura tua ao lado dele. Precisas de Montanhas sem estrutura.' },
    challenges: [{ id: 'structures', n: 5 }, { id: 'noExpansion' }], relics: ['scout', 'caravaneer'] },
  { id: 12, region: 4, name: 'Ruínas Perdidas', grid: [-1, 2], art: 'desert_17_ruins', mode: 'B', rounds: 12, deck: DECK, biomes: SAND, events: true,
    sites: [{ site: 'graveyard', q: 3, r: -1 }, { site: 'ruins', q: -3, r: 2 }, { site: 'crystals', q: 0, r: -3 }],
    main: { id: 'lost', text: 'Explora o Cemitério e constrói a Maravilha.' },
    challenges: [{ id: 'explored', n: 3 }, { id: 'score', n: 55 }], relics: ['settler', 'surveyor'] },
  { id: 13, region: 5, name: 'Coração da Fronteira', grid: [0, 2], art: 'desert_18_temple', mode: 'B', rounds: 12, deck: { ...DECK, plain: 9, forest: 6, hills: 5 }, biomes: GREEN, events: true,
    sites: [{ site: 'ruins', q: 2, r: 0 }, { site: 'stones', q: -2, r: 2 }, { site: 'graveyard', q: 0, r: -2 }],
    main: { id: 'heart', text: 'Constrói a Maravilha, faz 3 regiões com 5 ou mais terrenos e explora os 3 locais.' },
    challenges: [{ id: 'structures', n: 6 }, { id: 'score', n: 65 }], relics: [] },
];

export const CHALLENGE_TEXT = {
  noMarket: () => 'Sem compras no mercado.',
  noExpansion: () => 'Sem Expansões.',
  tiles: c => `Acabar com ${c.n} ou mais terrenos.`,
  structures: c => `Acabar com ${c.n} ou mais estruturas.`,
  explored: c => `Explorar ${c.n} locais.`,
  early: () => 'Concluir 2 ou mais rondas antes do fim.',
  score: c => `Fazer ${c.n} ou mais pontos.`,
};

// Relíquias: trocas de valores, sem regras novas. Máximo 2 equipadas.
export const RELICS = {
  mason:      { name: 'Pedreiro-mestre', text: 'Torre e Fortaleza custam −1 Pedra e +1 Madeira.', balance: { costs: { tower: { wood: 2, stone: 1, food: 0 }, keep: { wood: 2, stone: 2, food: 0 } } } },
  engineer:   { name: 'Engenheiro', text: 'A Expansão custa 2 Madeira + 2 Pedra em vez de 2 Madeira + 2 Provisões.', balance: { expansionCost: { wood: 2, stone: 2 } } },
  merchant:   { name: 'Mercador', text: 'Comprar no mercado é grátis, mas o mercado só tem 2 cartas.', balance: { marketCost: {}, marketSize: 2 } },
  scout:      { name: 'Batedor', text: 'Mais umas Ruínas no mapa, mas explorar custa 3 Provisões.', balance: { exploreCost: { food: 3 } }, extraSite: { site: 'ruins', q: -2, r: -1 } },
  granary:    { name: 'Celeiro', text: 'Limite de 12 recursos, mas começas sem Provisões.', balance: { resourceCap: 12 }, start: { food: 0 } },
  settler:    { name: 'Colono', text: 'Mão de 4 cartas, mas 2 rondas a menos.', balance: { handSize: 4 }, rounds: -2 },
  caravaneer: { name: 'Caravaneiro', text: 'Trocas sempre a 2 por 1, mas o 7 dá só +1 recurso.', balance: { tradeRate: 2, caravanTrade: false } },
  surveyor:   { name: 'Agrimensor', text: 'Colocas 3 terrenos na preparação em vez de 2, mas o baralho tem 3 cartas a menos.', balance: { setupTilesPerPlayer: 3 }, deckMinus: { plain: 1, forest: 1, hills: 1 } },
};
export const MAX_EQUIPPED = 2;
