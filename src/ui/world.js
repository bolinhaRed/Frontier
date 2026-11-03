// Mapa do mundo da campanha Solo: os territórios conquistados aparecem com o tabuleiro final,
// os outros cobertos de nevoeiro; os disponíveis mostram o Lago e ficam marcados.
import { TERRITORIES, REGIONS, RELICS, CHALLENGE_TEXT, TERRITORY_RADIUS, worldCenter } from '../data/territories.js';
import { isAvailable, totalStars } from '../storage/campaign.js';
import { TERRAINS } from '../data/terrains.js';
import { SITES } from '../data/sites.js';
import { STRUCTURES } from '../data/structures.js';
import { distance } from '../core/hex.js';

const FOG_BIOME = { 1: 'greenlands', 2: 'drylands', 3: 'icelands', 4: 'deadlands', 5: 'sandlands' };

function hexesOf(t) {
  const [cq, cr] = worldCenter(t.grid), out = [], R = TERRITORY_RADIUS;
  for (let q = -R; q <= R; q++) for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) out.push([q, r, q + cq, r + cr]);
  return out;
}

export function territoryAt(q, r) {
  return TERRITORIES.find(t => { const [cq, cr] = worldCenter(t.grid); return distance(cq, cr, q, r) <= TERRITORY_RADIUS; }) || null;
}

export function worldBoard(camp, selected, color) {
  const cells = [], slots = [];
  for (const t of TERRITORIES) {
    const rec = camp.territories[t.id], avail = isAvailable(camp, t), [cq, cr] = worldCenter(t.grid);
    const sel = selected === t.id ? '#c8922e' : null;
    if (rec?.board) {
      const at = new Map(rec.board.map(c => [c.q + ',' + c.r, c]));
      for (const [q, r, wq, wr] of hexesOf(t)) {
        const c = at.get(q + ',' + r), mark = q === 0 && r === 0 ? sel : null;
        if (!c) { slots.push({ q: wq, r: wr }); continue; }
        if (c.kind === 'blight') { cells.push({ q: wq, r: wr, atlas: 'deadlands', tile: 'hole', mark }); continue; }
        const tile = c.kind === 'site' ? SITES[c.site].tile : c.kind === 'lake' ? 'lake' : c.kind === 'deadtrees' ? 'deadtrees' : c.kind === 'volcano' ? 'vulcano'
          : c.structure ? STRUCTURES[c.structure].tile : TERRAINS[c.terrain]?.tile || 'plain';
        cells.push({ q: wq, r: wr, atlas: c.biome || 'greenlands', tile, color: c.owned && c.kind !== 'site' ? color : null, flag: c.kind === 'site' && c.explored ? color : null, mark });
      }
    } else {
      for (const [q, r, wq, wr] of hexesOf(t)) {
        if (q === 0 && r === 0 && avail) cells.push({ q: wq, r: wr, atlas: FOG_BIOME[t.region], tile: 'lake', mark: sel || '#2f2216' });
        else cells.push({ q: wq, r: wr, atlas: FOG_BIOME[t.region], tile: 'fog', mark: q === 0 && r === 0 ? sel : null });
      }
    }
  }
  return { cells, slots };
}

const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);

export function worldSideHTML(camp, esc) {
  const owned = camp.relics.owned;
  return `<h2>Campanha Solo · ${totalStars(camp)} estrelas</h2>
    <ul class="objs">${REGIONS.map(R => `<li><b>${esc(R.name)}</b> — ${esc(R.note)}<br>${TERRITORIES.filter(t => t.region === R.id).map(t => {
      const rec = camp.territories[t.id];
      return `${esc(t.name)} ${rec?.won ? stars(rec.stars) : isAvailable(camp, t) ? '· disponível' : ''}`; }).join(' · ')}</li>`).join('')}</ul>
    <h2>Relíquias (máximo 2 equipadas)</h2>
    ${owned.length ? `<ul class="objs">${owned.map(id => `<li><b>${esc(RELICS[id].name)}</b>: ${esc(RELICS[id].text)}
      <button class="btn small" data-equip="${id}">${camp.relics.equipped.includes(id) ? 'Tirar' : 'Equipar'}</button></li>`).join('')}</ul>`
      : '<p class="hint">Ganhas uma relíquia na primeira vitória de cada território.</p>'}`;
}

export function territoryHTML(camp, t, esc, artStyle) {
  if (!t) return '<p class="hint">Toca num território do mapa. Os disponíveis têm o Lago à vista.</p>';
  const rec = camp.territories[t.id], R = REGIONS.find(x => x.id === t.region), avail = isAvailable(camp, t);
  const body = t.main ? `<p><b>Objectivo:</b> ${esc(t.main.text)}</p>
      <p><b>Desafios:</b> ${t.challenges.map(c => esc(CHALLENGE_TEXT[c.id](c))).join(' · ')}</p>
      <p class="hint">${t.rounds} rondas · ${esc(R.note)}${camp.relics.equipped.length ? ' · relíquias: ' + camp.relics.equipped.map(id => esc(RELICS[id].name)).join(', ') : ''}</p>`
    : `<p class="hint">${esc(R.note)}.</p>`;
  return `<div class="event"><span class="art" style="${artStyle(t.art, 96)}"></span><div>
    <b>${esc(t.name)}</b> <small>${esc(R.name)}${rec?.won ? ' · ' + stars(rec.stars) : ''}</small>${body}
    <div class="opts">${avail ? `<button class="btn primary" data-go="${t.id}">${rec?.won ? 'Jogar de novo' : 'Partir'}</button>` : '<span class="hint">Ainda não disponível.</span>'}</div></div></div>`;
}
