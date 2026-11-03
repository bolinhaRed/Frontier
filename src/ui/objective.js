// Objectivo do território (Solo) em forma de lista de progresso, com o «como fazer» de cada parte.
import { structuresOf } from '../core/rules/structures.js';
import { riverComponents } from '../core/rules/placement-b.js';
import { blightDistance } from '../core/rules/blight.js';
import { key, neighbors } from '../core/hex.js';

const own = (s, f = () => true) => Object.values(s.board).filter(c => c.owner === 0 && f(c));
const count = (s, structure) => structuresOf(s, 0, c => c.structure === structure);
const maxRegion = (s, fam) => Math.max(0, ...s.regions.filter(r => !fam || r.family === fam).map(r => r.hexes.length));
const sites = s => Object.values(s.board).filter(c => c.kind === 'site');
const HOW = {
  farm: 'Quinta: 1 Madeira + 1 Provisões, numa Planície tua. No passo «Acções», toca na Planície.',
  village: 'Aldeia: 2 Madeira + 1 Pedra + 1 Provisões, numa Planície ou Floresta tua.',
  castle: 'Castelo: 2 Madeira + 3 Pedra + 2 Provisões, por cima de uma Aldeia tua.',
  keep: 'Fortaleza: 1 Madeira + 3 Pedra, em Colinas ou Montanhas tuas.',
  wonder: 'Maravilha: 3 Madeira + 4 Pedra + 3 Provisões, num terreno teu de uma região com 5 ou mais.',
  explore: 'Explorar: põe um terreno ao lado do local; depois, no passo «Acções», toca no local (2 Provisões).',
  region: 'Põe terrenos da mesma família lado a lado: Planície; Floresta e Bosque; Colinas e Montanhas; Lago e Rio.',
  river: 'Põe Rios com as aberturas viradas umas para as outras (botão «Rodar» antes de confirmar).',
};
const item = (label, have, need, how) => ({ label, have: Math.min(have, need), need, done: have >= need, how });
const flag = (label, done, how) => ({ label, have: done ? 1 : 0, need: 1, done, how, bool: true });

// Menor número de hexágonos vazios a ocupar para ligar o Lago ao local (0 = ligado).
function gap(s, siteKey) {
  const near = k => { const [q, r] = k.split(',').map(Number); return neighbors(q, r).map(([a, b]) => key(a, b)); };
  const goal = new Set(near(siteKey)), dist = new Map(), dq = [];
  for (const k of near('0,0')) { const c = s.board[k]; if (!c) { dist.set(k, 1); dq.push(k); } else if (c.owner === 0) { dist.set(k, 0); dq.unshift(k); } }
  while (dq.length) {
    const k = dq.shift(), d = dist.get(k);
    if (goal.has(k)) return d;
    for (const n of near(k)) {
      const c = s.board[n]; if (n === '0,0' || n === siteKey) continue;
      const w = !c ? 1 : c.owner === 0 ? 0 : null; if (w === null) continue;
      if (Math.max(...n.split(',').map(Math.abs), Math.abs(n.split(',').map(Number).reduce((a, b) => a + b))) > (s.area || 99)) continue;
      if (!dist.has(n) || dist.get(n) > d + w) { dist.set(n, d + w); w ? dq.push(n) : dq.unshift(n); }
    }
  }
  return 99;
}

export function objectiveItems(s) {
  const m = s.solo.main;
  switch (m.id) {
    case 'clearing': return [item('Quintas', count(s, 'farm'), 2, HOW.farm), item('Maior região de Planície', maxRegion(s, 'plain'), 5, HOW.region)];
    case 'connect': { const g = gap(s, m.site); return [flag(g === 0 ? 'Lago ligado às Ruínas' : `Faltam ${g} hexágonos para ligar o Lago às Ruínas`, g === 0, 'Põe terrenos teus em linha, do Lago até ao lado das Ruínas na borda.')]; }
    case 'exploreAll': return [item('Locais explorados', sites(s).filter(c => c.explored === 0).length, sites(s).length, HOW.explore)];
    case 'castle': return [flag('Aldeia construída', count(s, 'village') + count(s, 'castle') > 0, HOW.village), item('Castelo', count(s, 'castle'), 1, HOW.castle)];
    case 'rangeRegion': return [item('Maior região de Serra', maxRegion(s, 'range'), m.n, HOW.region)];
    case 'survive': return [item('Acontecimentos atravessados', (s.eventDiscard || []).length, 2, 'O Inverno e o Incêndio chegam no fim das rondas 4 e 8.'),
      item('Estruturas', structuresOf(s, 0), 4, 'Constrói; mas no Inverno cada 2 estruturas pedem 1 Provisão.'),
      item('Floresta ou Bosque', own(s, c => c.kind === 'terrain' && (c.terrain === 'forest' || c.terrain === 'woods')).length, 3, 'Protege as Florestas do Incêndio com uma Torre de vigia ao lado, ou guarda 2 Provisões.')];
    case 'riverLong': return [item('Maior rio contínuo', Math.max(0, ...riverComponents(s).map(c => c.length)), 4, HOW.river)];
    case 'pass': return [item('Fortalezas', count(s, 'keep'), 2, HOW.keep), item('Maior região de Serra', maxRegion(s, 'range'), 5, HOW.region)];
    case 'oasis': return [item('Lago ou Rio teus', own(s, c => c.kind === 'terrain' && (c.terrain === 'lake' || c.terrain === 'river')).length, 4, 'Coloca Lagos e Rios.'), item('Quintas', count(s, 'farm'), 3, HOW.farm + ' No Frontier Rules, com Lago ou Rio ao lado.')];
    case 'volcano': return [flag('Vulcão desperto', Object.values(s.board).some(c => c.kind === 'volcano'), 'Desperta no fim da ronda 4, numa Montanha sem estrutura.'),
      flag('Estrutura tua ao lado do Vulcão', s.solo.achievedRound != null, 'Constrói num terreno teu vizinho do Vulcão.')];
    case 'lost': return [flag('Cemitério explorado', sites(s).some(c => c.site === 'graveyard' && c.explored === 0), HOW.explore), item('Maravilha', count(s, 'wonder'), 1, HOW.wonder)];
    case 'heart': return [item('Maravilha', count(s, 'wonder'), 1, HOW.wonder), item('Regiões com 5 ou mais', s.regions.filter(r => r.hexes.length >= 5).length, 3, HOW.region),
      item('Locais explorados', sites(s).filter(c => c.explored === 0).length, sites(s).length, HOW.explore)];
    default: return [];
  }
}

export function blightText(s) {
  if (!s.blight) return '';
  const d = blightDistance(s), n = (s.blight.threat || []).length;
  const warn = n ? ` ${n} hexágono${n > 1 ? 's' : ''} ameaçado${n > 1 ? 's' : ''} (contorno laranja): fica${n > 1 ? 'm' : ''} corrompido${n > 1 ? 's' : ''} no fim da ronda, a não ser que lhe${n > 1 ? 's' : ''} ponhas uma Torre ou Fortaleza ao lado ou os purifiques (2 Provisões + 1 Pedra).` : '';
  const when = s.round < s.blight.from ? `começa a avançar no fim da ronda ${s.blight.from}` : 'avança no fim de cada ronda';
  return (d <= 1 ? `⚠ A praga está ao lado do Lago… mais um passo e perdes o território.`
    : `A praga ${when}; está a ${d} hexágonos do Lago. Se lá chegar, perdes o território. Torres de vigia e Fortalezas protegem-se a si e aos vizinhos.`) + warn;
}
