// Campanha Solo: progresso guardado no aparelho (territórios conquistados, estrelas, tabuleiros finais,
// relíquias). Separado das partidas: a partida de um território grava-se como as outras.
import { TERRITORIES, REGIONS, RELICS, MAX_EQUIPPED, TERRITORY_RADIUS, worldCenter } from '../data/territories.js';
import { distance } from '../core/hex.js';

export const CAMPAIGN_KEY = 'frontier.campaign';
const empty = () => ({ schema: 1, territories: {}, relics: { owned: [], equipped: [] }, offer: null });

export function loadCampaign(store) {
  try { const d = JSON.parse(store.getItem(CAMPAIGN_KEY)); return d && d.schema === 1 && d.territories && d.relics ? d : empty(); } catch { return empty(); }
}
export function saveCampaign(store, c) { try { store.setItem(CAMPAIGN_KEY, JSON.stringify(c)); return true; } catch { return false; } }

export const territory = id => TERRITORIES.find(t => t.id === id);
export const totalStars = c => Object.values(c.territories).reduce((n, t) => n + (t.stars || 0), 0);
const conquered = (c, id) => !!c.territories[id]?.won;
const neighbours = (a, b) => { const [i, j] = a.grid, [k, l] = b.grid; const d = [k - i, l - j];
  return [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]].some(([x, y]) => x === d[0] && y === d[1]); };

// Disponível: a região está aberta e é o 1.º território, ou é vizinho de um conquistado.
export function regionOpen(c, regionId) {
  const R = REGIONS.find(r => r.id === regionId);
  if (!R || R.locked) return false;
  if (R.stars && totalStars(c) < R.stars) return false;
  const needs = R.id === 5 ? [3, 4] : R.needs ? [R.needs] : [];
  return needs.every(n => TERRITORIES.filter(t => t.region === n).every(t => conquered(c, t.id)));
}
export function isAvailable(c, t) {
  if (!t.main || !regionOpen(c, t.region)) return false;
  if (t.id === 1 || conquered(c, t.id)) return true;
  // o 1.º território de uma região que acabou de abrir também fica disponível
  const first = TERRITORIES.find(o => o.region === t.region);
  if (first.id === t.id && t.region > 1) return true;
  return TERRITORIES.some(o => conquered(c, o.id) && neighbours(o, t));
}

// Fronteira herdada: terrenos dos vizinhos conquistados que tocam a borda deste território.
export function borderFor(c, t) {
  const [cq, cr] = worldCenter(t.grid), out = [];
  for (const o of TERRITORIES) {
    const rec = c.territories[o.id]; if (!rec?.board || !neighbours(o, t)) continue;
    const [oq, or] = worldCenter(o.grid);
    for (const cell of rec.board) {
      if (!cell.owned || !cell.terrain) continue;
      const q = cell.q + oq - cq, r = cell.r + or - cr;
      if (distance(0, 0, q, r) === TERRITORY_RADIUS + 1) out.push({ q, r, terrain: cell.terrain, biome: cell.biome });
    }
  }
  return out;
}

// Fim de uma partida de território: guarda o resultado; na 1.ª vitória oferece 2 relíquias.
export function recordResult(c, state) {
  const res = state.final.solo, id = state.solo.territory, t = territory(id);
  const prev = c.territories[id] || {};
  const firstWin = res.won && !prev.won;
  const rec = { ...prev, played: (prev.played || 0) + 1 };
  if (res.won) {
    rec.won = true; rec.stars = Math.max(prev.stars || 0, res.stars);
    rec.board = Object.entries(state.board).map(([k, x]) => { const [q, r] = k.split(',').map(Number);
      return { q, r, kind: x.kind, terrain: x.terrain || null, biome: x.biome || null, structure: x.structure || null, site: x.site || null, explored: x.explored != null, owned: x.owner != null }; });
  }
  c.territories[id] = rec;
  if (firstWin) { const offer = t.relics.filter(r => !c.relics.owned.includes(r)); c.offer = offer.length ? offer : null; }
  return { firstWin, offer: c.offer };
}

export function takeRelic(c, id) {
  if (!c.offer?.includes(id)) return false;
  c.relics.owned.push(id); c.offer = null;
  if (c.relics.equipped.length < MAX_EQUIPPED) c.relics.equipped.push(id);
  return true;
}
export function toggleRelic(c, id) {
  const e = c.relics.equipped;
  if (e.includes(id)) { c.relics.equipped = e.filter(x => x !== id); return true; }
  if (!c.relics.owned.includes(id) || e.length >= MAX_EQUIPPED) return false;
  e.push(id); return true;
}
export { RELICS };
