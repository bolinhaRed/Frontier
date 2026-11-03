// Modo «Nevoeiro» — expedição roguelite em 3 territórios. Separado dos outros modos: pode retirar-se sem os afectar.
// Usa as peças e as regras de encaixe da Expedição (src/expedition), sem as alterar.
// Regras (valores provisórios, em FOG):
//  • Cada território é um mapa limitado (raio 5) coberto de nevoeiro, com locais e perigos escondidos.
//  • Mão de 3 peças à vista e a seguinte também à vista. Escolhes uma, rodas e colocas ao lado de outra.
//  • Cada peça colocada gasta 1 mantimento. Sem mantimentos, a expedição acaba.
//  • Colocar ao lado de um hexágono com nevoeiro revela o que lá está: local (fica no mapa) ou perigo (custa mantimentos).
//    A 2 hexágonos de distância pressente-se que «há alguma coisa», sem se saber o quê.
//  • Ganhar mantimentos: fechar estradas e rios (sem pontas soltas), Florestas grandes, encaixe perfeito,
//    reclamar locais e Aldeias (ligá-los por estrada ao Acampamento).
//  • Pontos: cada lado com o mesmo terreno do vizinho +1, mesma cor +1; estradas e rios fechados; locais.
//  • Cumprir o objectivo do território termina-o: cada mantimento que sobra vale 2 pontos e escolhes 1 de 3 relíquias.
//  • Trocar a mão inteira custa 2 mantimentos.
import { key, neighbors, distance, ring } from '../core/hex.js';
import { rngState, nextFloat, nextInt, shuffle, asFn } from '../core/rng.js';
import { KINDS, SPLIT_PAIRS, edgesOf } from '../expedition/tiles.js';
import { placementScore, groupOf, legalPlacements } from '../expedition/engine.js';

export const FOG = {
  radius: 5, hand: 3, startSupplies: 20, siteMaxDist: 4, placeCost: 1, redrawCost: 2, leftoverPoints: 2, sense: 2,
  road: { supplies: 2, perTwoTiles: 1, pointsPerTile: 2 },
  river: { supplies: 3, pointsPerTile: 2 },
  forest: [5, 9], forestSupplies: 2,
  perfect: { supplies: 2, points: 3 },
  village: { supplies: 2, points: 2 },
  sameBiome: 0.5,
  titles: [[260, 'Lenda do Nevoeiro'], [200, 'Mestre de Expedições'], [140, 'Batedor Experiente'], [80, 'Batedor'], [0, 'Perdido no Nevoeiro']],
};

export const SITES = {
  ruins:    { name: 'Ruínas', supplies: 4, points: 3 },
  crystals: { name: 'Cristais', supplies: 2, points: 6 },
  stones:   { name: 'Círculo de pedras', supplies: 3, points: 4 },
  cave:     { name: 'Caverna', supplies: 5, points: 0 },
};
export const HAZARDS = {
  swamp:     { name: 'Pântano', supplies: -1, art: 'swamp' },
  graveyard: { name: 'Cemitério', supplies: -3, art: 'graveyard' },
};

export const TERRITORIES = [
  { name: 'Primeira Travessia', fog: 'greenlands', biomes: [['greenlands', 70], ['drylands', 30]],
    sites: ['ruins', 'crystals', 'stones'], hazards: ['swamp', 'swamp'], goal: { claims: 2 },
    text: 'Reclama 2 locais: liga-os por estrada ao Acampamento.' },
  { name: 'Rios e Caminhos', fog: 'sandlands', biomes: [['greenlands', 30], ['drylands', 30], ['sandlands', 40]],
    sites: ['ruins', 'cave', 'crystals'], hazards: ['swamp', 'graveyard', 'swamp'], goal: { claims: 2, rivers: 1 },
    text: 'Reclama 2 locais e fecha 1 rio.' },
  { name: 'Coração do Nevoeiro', fog: 'deadlands', biomes: [['icelands', 40], ['deadlands', 35], ['greenlands', 25]],
    sites: ['ruins', 'cave', 'crystals', 'stones'], hazards: ['swamp', 'graveyard', 'graveyard', 'swamp'], goal: { claims: 3, longRoad: 5 },
    text: 'Reclama 3 locais e fecha uma estrada com 5 ou mais troços.' },
];

export const RELICS = {
  canteen:  { name: 'Cantil', text: '+4 mantimentos ao começar cada território.' },
  compass:  { name: 'Bússola', text: 'No nevoeiro, vês se o que pressentes é um local (dourado) ou um perigo (vermelho).' },
  backpack: { name: 'Mochila grande', text: 'Mão de 4 peças em vez de 3.' },
  axe:      { name: 'Machado', text: 'As Florestas dão mantimentos a partir de 4 peças (em vez de 5).' },
  cart:     { name: 'Carroça', text: 'Fechar uma estrada dá +2 mantimentos extra.' },
  oldmap:   { name: 'Mapa antigo', text: 'O primeiro perigo de cada território não tem efeito.' },
  ferry:    { name: 'Barqueiro', text: 'Os rios também ligam locais e Aldeias ao Acampamento.' },
};

// Pesos próprios deste modo (provisórios): mais estradas do que na Expedição, porque aqui são o caminho até aos locais.
export const DECK_WEIGHTS = { plain: 14, forest: 8, woods: 5, hills: 5, mountains: 3, lake: 5, village: 4,
  road_straight: 12, road_bend: 10, road_fork: 5, bridge: 4, road_split: 4,
  river_straight: 5, river_bend: 3, river_bend2: 3, river_split: 3 };
const DECK = Object.entries(DECK_WEIGHTS);
const pick = (st, entries) => { let x = nextFloat(st) * entries.reduce((t, [, w]) => t + w, 0); for (const [v, w] of entries) if ((x -= w) < 0) return v; return entries[0][0]; };
const has = (s, id) => s.relics.includes(id);
const T = s => TERRITORIES[s.t];
const handSize = s => FOG.hand + (has(s, 'backpack') ? 1 : 0);

function draw(s) {
  const allowed = T(s).biomes.map(([b]) => b);
  for (;;) {
    const kind = pick(s.rng, DECK);
    let biome = s.lastBiome && allowed.includes(s.lastBiome) && nextFloat(s.rng) < FOG.sameBiome ? s.lastBiome : pick(s.rng, T(s).biomes), biome2 = null;
    if (KINDS[kind].split) {
      const ps = SPLIT_PAIRS[kind].filter(p => allowed.includes(p[0]) && allowed.includes(p[1]));
      if (!ps.length) continue;
      const w = ps.filter(p => p.includes(biome)), P = (w.length ? w : ps)[nextInt(s.rng, (w.length ? w : ps).length)];
      [biome, biome2] = P;
    }
    s.lastBiome = biome2 || biome;
    return { kind, biome, rot: 0, ...(biome2 ? { biome2 } : {}) };
  }
}

function setupTerritory(s) {
  const t = T(s), R = FOG.radius;
  s.board = { '0,0': { kind: 'village', biome: t.biomes[0][0], rot: 0, camp: true } };
  // segredos: nunca junto ao Acampamento nem colados uns aos outros
  const cells = [];
  for (let d = 2; d <= R; d++) for (const [q, r] of ring(0, 0, d)) cells.push(key(q, r));
  shuffle(cells, asFn(s.rng));
  const items = [...t.sites.map(id => ({ type: 'site', id })), ...t.hazards.map(id => ({ type: 'hazard', id }))];
  s.secrets = {};
  for (const it of items) {
    const k = cells.find(c => { const [q, r] = c.split(',').map(Number);
      return !s.secrets[c] && (it.type !== 'site' || distance(0, 0, q, r) <= FOG.siteMaxDist) && !neighbors(q, r).some(([a, b]) => s.secrets[key(a, b)]); });
    if (k) s.secrets[k] = it;
  }
  s.supplies = FOG.startSupplies + (has(s, 'canteen') ? 4 : 0);
  s.shield = has(s, 'oldmap');
  s.claims = 0; s.closedRivers = 0; s.longestRoad = 0; s.linked = [];
  s.lastBiome = t.biomes[0][0];
  s.hand = []; for (let i = 0; i < handSize(s); i++) s.hand.push(draw(s));
  s.next = draw(s);
  s.step = 'place'; s.offer = null; s.tScore = 0;
}

export function createFog(seed = 'FOG') {
  const s = { mode: 'fog', version: 1, seed: String(seed), rng: rngState('fog', seed), t: 0, relics: [], score: 0,
    board: {}, secrets: {}, hand: [], next: null, supplies: 0, over: false, won: false, title: null, history: [], log: [] };
  setupTerritory(s);
  return s;
}

// ---------- consultas ----------
export const inBounds = (q, r) => distance(0, 0, q, r) <= FOG.radius;
export function legalFor(s, tile) {
  if (s.step !== 'place' || !tile) return [];
  return legalPlacements(s, tile).filter(p => inBounds(p.q, p.r));
}
export const anyMove = s => s.hand.some(t => legalFor(s, t).length);
export const canRedraw = s => s.step === 'place' && s.supplies > FOG.redrawCost;

// Hexágonos com nevoeiro a mostrar: dentro do mapa, vazios e sem vizinho colocado.
// sensed: segredos a FOG.sense ou menos de uma peça colocada (sem dizer o quê, excepto com a Bússola).
export function fogView(s) {
  const placed = Object.keys(s.board).map(k => k.split(',').map(Number));
  const fog = [], open = [];
  for (let d = 1; d <= FOG.radius; d++) for (const [q, r] of ring(0, 0, d)) {
    const k = key(q, r); if (s.board[k]) continue;
    const near = Math.min(...placed.map(([a, b]) => distance(a, b, q, r)));
    if (near <= 1) { open.push({ q, r }); continue; }
    const sec = s.secrets[k];
    fog.push({ q, r, sensed: sec && near <= FOG.sense ? (has(s, 'compass') ? sec.type : 'unknown') : null });
  }
  return { fog, open };
}

export function goalProgress(s) {
  const g = T(s).goal, out = [];
  if (g.claims) out.push({ text: `Locais reclamados: ${s.claims}/${g.claims}`, ok: s.claims >= g.claims });
  if (g.rivers) out.push({ text: `Rios fechados: ${s.closedRivers}/${g.rivers}`, ok: s.closedRivers >= g.rivers });
  if (g.longRoad) out.push({ text: `Maior estrada fechada: ${s.longestRoad}/${g.longRoad} troços`, ok: s.longestRoad >= g.longRoad });
  return out;
}
const goalDone = s => goalProgress(s).every(x => x.ok);

// ---------- regras internas ----------
function isClosed(s, group, type) {
  for (const k of group) {
    const [q, r] = k.split(',').map(Number), e = edgesOf(s.board[k]), N = neighbors(q, r);
    for (let d = 0; d < 6; d++) if (e[d] === type && !s.board[key(...N[d])]) return false;
  }
  return true;
}

function reveal(s, k, events) {
  const [q, r] = k.split(',').map(Number);
  for (const [a, b] of neighbors(q, r)) {
    const nk = key(a, b), sec = s.secrets[nk];
    if (!sec || s.board[nk]) continue;
    const biome = s.lastBiome && T(s).biomes.some(([x]) => x === s.lastBiome) ? s.lastBiome : T(s).biomes[0][0];
    if (sec.type === 'site') {
      s.board[nk] = { kind: 'site_' + sec.id, biome, rot: 0, site: sec.id };
      events.push(`Local descoberto: ${SITES[sec.id].name}. Reclama-se com uma estrada ligada ao Acampamento.`);
    } else {
      const H = HAZARDS[sec.id];
      s.board[nk] = { kind: 'site_graveyard', biome, rot: 0, hazard: sec.id, art: H.art };
      if (s.shield) { s.shield = false; events.push(`${H.name}! O Mapa antigo evitou o perigo.`); }
      else { s.supplies = Math.max(0, s.supplies + H.supplies); events.push(`${H.name}! ${H.supplies} mantimento${H.supplies === -1 ? '' : 's'}.`); }
    }
  }
}

function closures(s, k, events) {
  const tile = s.board[k], e = edgesOf(tile);
  if (e.includes('road')) {
    const g = groupOf(s, k, 'road');
    if (!g.some(x => s.board[x].closedRoad) && isClosed(s, g, 'road')) {
      g.forEach(x => { s.board[x].closedRoad = true; });
      const sup = FOG.road.supplies + Math.floor(g.length / 2) * FOG.road.perTwoTiles + (has(s, 'cart') ? 2 : 0), pts = g.length * FOG.road.pointsPerTile;
      s.supplies += sup; s.score += pts; s.tScore += pts; s.longestRoad = Math.max(s.longestRoad, g.length);
      events.push(`Estrada fechada (${g.length} troços): +${sup} mantimentos, +${pts} pontos`);
    }
  }
  if (e.includes('river')) {
    const g = groupOf(s, k, 'river');
    if (!g.some(x => s.board[x].closedRiver) && isClosed(s, g, 'river')) {
      g.forEach(x => { s.board[x].closedRiver = true; });
      const pts = g.length * FOG.river.pointsPerTile;
      s.supplies += FOG.river.supplies; s.score += pts; s.tScore += pts; s.closedRivers++;
      events.push(`Rio fechado (${g.length} troços): +${FOG.river.supplies} mantimentos, +${pts} pontos`);
    }
  }
  if (KINDS[tile.kind].base === 'forest') {
    const g = groupOf(s, k, 'forest'), steps = has(s, 'axe') ? FOG.forest.map(x => x - 1) : FOG.forest;
    const paid = Math.max(0, ...g.map(x => s.board[x].paidForest || 0));
    let top = paid;
    for (const t of steps) if (g.length >= t && t > paid) { s.supplies += FOG.forestSupplies; top = t; events.push(`Floresta com ${t}: +${FOG.forestSupplies} mantimentos`); }
    if (top > paid) g.forEach(x => { s.board[x].paidForest = top; });
  }
}

// Rede do Acampamento: estradas (e rios, com o Barqueiro) que passam junto ao Acampamento.
export function campNetwork(s) {
  const net = new Set(), types = has(s, 'ferry') ? ['road', 'river'] : ['road'];
  for (const [a, b] of neighbors(0, 0)) {
    const k = key(a, b), t = s.board[k]; if (!t) continue;
    for (const type of types) if (edgesOf(t).includes(type)) groupOf(s, k, type).forEach(x => net.add(x));
  }
  // redes que se tocam através de uma Aldeia ou de um local já reclamado também contam
  let grew = true;
  while (grew) {
    grew = false;
    for (const k of [...net]) {
      const [q, r] = k.split(',').map(Number);
      for (const [a, b] of neighbors(q, r)) {
        const hub = s.board[key(a, b)];
        if (!hub || !(hub.claimed || hub.linkedVillage)) continue;
        for (const [c, d] of neighbors(a, b)) {
          const nk = key(c, d), t = s.board[nk]; if (!t || net.has(nk)) continue;
          for (const type of types) if (edgesOf(t).includes(type)) { groupOf(s, nk, type).forEach(x => net.add(x)); grew = true; }
        }
      }
    }
  }
  return net;
}

function claims(s, events) {
  const net = campNetwork(s), touched = new Set();
  for (const k of net) { const [q, r] = k.split(',').map(Number); for (const [a, b] of neighbors(q, r)) touched.add(key(a, b)); }
  for (const k of touched) {
    const t = s.board[k]; if (!t) continue;
    if (t.site && !t.claimed) {
      const S = SITES[t.site]; t.claimed = true; s.claims++; s.supplies += S.supplies; s.score += S.points; s.tScore += S.points;
      events.push(`Local reclamado (${S.name}): +${S.supplies} mantimentos${S.points ? `, +${S.points} pontos` : ''}`);
    } else if (t.kind === 'village' && !t.camp && !t.linkedVillage) {
      t.linkedVillage = true; s.supplies += FOG.village.supplies; s.score += FOG.village.points; s.tScore += FOG.village.points;
      events.push(`Aldeia ligada ao Acampamento: +${FOG.village.supplies} mantimentos, +${FOG.village.points} pontos`);
    }
  }
}

function endCheck(s, events) {
  if (goalDone(s)) {
    const bonus = s.supplies * FOG.leftoverPoints;
    s.score += bonus; s.tScore += bonus;
    events.push(`Território conquistado! Mantimentos que sobraram: +${bonus} pontos`);
    s.history.push({ t: s.t, won: true, score: s.tScore });
    if (s.t >= TERRITORIES.length - 1) { s.over = true; s.won = true; s.step = 'over'; finish(s); return; }
    const pool = Object.keys(RELICS).filter(id => !has(s, id));
    shuffle(pool, asFn(s.rng)); s.offer = pool.slice(0, 3); s.step = 'relic';
    return;
  }
  if (s.supplies <= 0) { events.push('Acabaram-se os mantimentos.'); lose(s); return; }
  if (!anyMove(s) && !canRedraw(s)) { events.push('Nenhuma peça cabe e não tens mantimentos para trocar a mão.'); lose(s); }
}
function lose(s) { s.history.push({ t: s.t, won: false, score: s.tScore }); s.over = true; s.step = 'over'; finish(s); }
function finish(s) { s.title = FOG.titles.find(([min]) => s.score >= min)[1]; }

// ---------- acções ----------
const clone = s => structuredClone(s);

export function place(s0, i, q, r, rot) {
  const s = clone(s0);
  if (s.step !== 'place') return { error: 'Agora não é altura de colocar.' };
  const tile0 = s.hand[i]; if (!tile0) return { error: 'Escolhe uma peça da mão.' };
  if (!inBounds(q, r)) return { error: 'Fora do território.' };
  const tile = { ...tile0, rot }, sc = placementScore(s, q, r, tile);
  if (!sc) return { error: 'A peça não encaixa aqui com esta rotação.' };
  const k = key(q, r), events = [];
  s.supplies -= FOG.placeCost;
  s.board[k] = tile; s.score += sc.points; s.tScore += sc.points;
  if (sc.perfect) { s.supplies += FOG.perfect.supplies; s.score += FOG.perfect.points; s.tScore += FOG.perfect.points; events.push(`Encaixe perfeito: +${FOG.perfect.supplies} mantimentos, +${FOG.perfect.points} pontos`); }
  reveal(s, k, events);
  closures(s, k, events);
  claims(s, events);
  s.hand.splice(i, 1, s.next); s.next = draw(s);
  s.log.push({ i, q, r, rot, points: sc.points });
  endCheck(s, events);
  return { state: s, events, points: sc.points };
}

export function redraw(s0) {
  const s = clone(s0);
  if (!canRedraw(s)) return { error: `Trocar a mão custa ${FOG.redrawCost} mantimentos e tens de ficar com pelo menos 1.` };
  s.supplies -= FOG.redrawCost;
  s.hand = s.hand.map(() => draw(s));
  s.log.push({ redraw: true });
  const events = ['Mão nova.']; endCheck(s, events);
  return { state: s, events };
}

export function chooseRelic(s0, id) {
  const s = clone(s0);
  if (s.step !== 'relic' || !s.offer.includes(id)) return { error: 'Escolhe uma das relíquias propostas.' };
  s.relics.push(id); s.t++; setupTerritory(s);
  s.log.push({ relic: id });
  return { state: s, events: [`${RELICS[id].name} na mochila. Território ${s.t + 1}: ${T(s).name}.`] };
}
