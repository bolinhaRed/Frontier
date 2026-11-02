// FRONTIER — arranque da etapa 0: carrega os atlas e desenha um mapa vazio de demonstração.
// Não há regras de jogo nesta etapa: o quadro abaixo serve só para verificar o desenho.
import { loadAtlases } from './assets.js';
import { MapView } from './map-view.js';
import { ring } from '../core/hex.js';
import { $ } from './dom.js';

// Lago neutro ao centro e 3 locais especiais a 2 hexágonos, em direcções alternadas
// (a disposição da preparação, sem cartas nem jogadores).
function demoBoard() {
  const cells = [
    { q: 0, r: 0, atlas: 'greenlands', tile: 'lake' },
    { q: 2, r: 0, atlas: 'greenlands', tile: 'ruins' },
    { q: -2, r: 2, atlas: 'greenlands', tile: 'cave' },
    { q: 0, r: -2, atlas: 'greenlands', tile: 'stones' },
  ];
  const used = new Set(cells.map(c => c.q + ',' + c.r));
  const slots = [];
  for (let d = 1; d <= 4; d++) for (const [q, r] of ring(0, 0, d)) if (!used.has(q + ',' + r)) slots.push({ q, r });
  return { cells, slots };
}

async function start() {
  const status = $('#status');
  try {
    await loadAtlases(p => { status.textContent = `A carregar os tiles… ${Math.round(p * 100)}%`; });
  } catch (e) {
    status.textContent = e.message + '. Abre o jogo através de um servidor local (ver README).';
    status.dataset.state = 'error';
    return;
  }
  const view = new MapView($('#map'), { onSelect: h => { view.select(h); status.textContent = h ? `Hexágono ${h.q}, ${h.r}` : 'Toca num hexágono'; } });
  view.setBoard(demoBoard());
  view.fitAll();
  status.textContent = 'Toca num hexágono';
}
start();
