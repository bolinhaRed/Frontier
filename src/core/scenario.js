// Cenário Solo: território + relíquias equipadas → parâmetros para createGame.
// As relíquias só mudam valores (custos, limites, tamanhos); não acrescentam regras.
import { RELICS, TERRITORY_RADIUS } from '../data/territories.js';
import { BALANCE } from '../data/balance.js';

export function buildScenario(territory, equipped = [], border = []) {
  const sc = {
    id: territory.id, name: territory.name, mode: territory.mode || 'A', rounds: territory.rounds, area: TERRITORY_RADIUS,
    deck: { ...territory.deck }, biomes: territory.biomes, sites: [...territory.sites],
    start: { ...BALANCE.startResources }, balance: {}, events: !!territory.events, eventOrder: territory.eventOrder || [],
    main: territory.main, challenges: territory.challenges, border, relics: [...equipped],
  };
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
