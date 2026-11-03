// Cenário Solo: território + relíquias equipadas → parâmetros para createGame.
// As relíquias só mudam valores (custos, limites, tamanhos); não acrescentam regras.
import { RELICS, TERRITORY_RADIUS } from '../data/territories.js';
import { BALANCE } from '../data/balance.js';

export function buildScenario(territory, equipped = [], border = []) {
  const sc = {
    id: territory.id, name: territory.name, mode: territory.mode || 'A', rounds: territory.rounds, area: TERRITORY_RADIUS,
    deck: { ...territory.deck }, biomes: territory.biomes, sites: [...territory.sites],
    start: { ...BALANCE.startResources }, balance: {}, events: !!territory.events, eventOrder: territory.eventOrder || [],
    main: territory.main, challenges: territory.challenges, border, relics: [...equipped], blight: blightFor(territory), region: territory.region,
  };
  // Identidade de cada região (antes das relíquias, que podem alterar os mesmos valores)
  if (territory.region === 1) sc.start.food += 1;                                                     // Vale Verde: abundância
  if (territory.region === 2) { sc.start.food = Math.max(0, sc.start.food - 1); sc.balance.exploreBonus = { stone: 1 }; }   // Terras Secas
  if (territory.region === 3) { sc.winterEvery = 3; sc.balance.costs = { ...(sc.balance.costs || {}), tower: { wood: 1, stone: 1, food: 0 } }; }  // Gelo Eterno
  for (const id of equipped) {
    const r = RELICS[id]; if (!r) continue;
    Object.assign(sc.balance, r.balance || {});
    if (r.start) Object.assign(sc.start, r.start);
    if (r.rounds) sc.rounds += r.rounds;
    if (r.extraSite) sc.sites.push(r.extraSite);
    if (r.deckMinus) for (const [t, n] of Object.entries(r.deckMinus)) sc.deck[t] = Math.max(0, sc.deck[t] - n);
  }
  return sc;
}

// Praga por região: começa em 2 pontos opostos da borda (1 no território de introdução) e acelera no fim.
export function blightFor(t) {
  if (t.blight === false) return null;
  const starts = [[2, -4], [-2, 4]];   // borda, longe dos locais iniciais
  if (t.id === 1) return { start: [starts[0]], from: 6, rate: 1, aim: 0 };            // introdução: lenta e sem pontaria
  if (t.region === 1) return { start: starts, from: 4, rate: 1, aim: 0.25 };
  if (t.region === 2) return { start: starts, from: 3, rate: 1, aim: 0.35, rateLate: { round: 8, rate: 2 } };
  if (t.region === 4) return { start: [...starts, [-3, 0]], from: 3, rate: 1, aim: 0.5, rateLate: { round: 7, rate: 2 } };   // Terras Mortas: 3 focos, um mais perto
  return { start: starts, from: 3, rate: 1, aim: 0.5, rateLate: { round: 7, rate: 2 } };
}
