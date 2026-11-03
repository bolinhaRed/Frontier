// Interface do modo Expedição (estilo Dorfromantik). Separada do resto: o app.js só a liga ao menu.
import { createExpedition, place, legalPlacements, placementScore, groupOf, swapWithRow, rowCost } from '../expedition/engine.js';
import { KINDS, RULES, isPathTile, questName, BIOME_NAMES } from '../expedition/tiles.js';
import { tileStyle, pathStyle, splitStyle } from './assets.js';
import { ring } from '../core/hex.js';
import { randomSeed } from './seed.js';

const SAVE = 'frontier.expedition', BEST = 'frontier.expedition.best';
const NAMES = { plain: 'Planície', forest: 'Floresta', woods: 'Bosque', hills: 'Colinas', mountains: 'Montanhas', lake: 'Lago', village: 'Aldeia',
  road_straight: 'Estrada', road_bend: 'Estrada em curva', road_fork: 'Cruzamento', river_straight: 'Rio', river_bend: 'Rio em curva', river_bend2: 'Rio em curva', bridge: 'Ponte', road_split: 'Estrada de fronteira', river_split: 'Rio de fronteira' };

export function createExpeditionUI({ $, esc, view, store, onMenu }) {
  let ex = null, rot = 0, ghost = null, msg = '';
  const save = () => { try { store?.setItem(SAVE, JSON.stringify(ex)); } catch {} };
  const best = () => { try { return +(store?.getItem(BEST) || 0); } catch { return 0; } };

  const art = t => KINDS[t.kind].split ? { atlas: 'splits', tile: `${t.kind}:${t.biome}|${t.biome2}` } : isPathTile(t.kind) ? { atlas: 'paths-' + t.biome, tile: t.kind } : { atlas: t.biome, tile: KINDS[t.kind].art };
  const tileHTML = (t, w, r = 0) => { const a = art(t);
    return `<span class="art" style="${KINDS[t.kind].split ? splitStyle(a.tile, w) : isPathTile(t.kind) ? pathStyle(t.biome, t.kind, w) : tileStyle(t.biome, a.tile, w)};transform:rotate(${r * 60}deg)"></span>`; };

  function board() {
    const cells = [], used = new Set(), legal = new Set(legalPlacements(ex).filter(p => p.rot === rot).map(p => p.q + ',' + p.r));
    const questAt = new Map(ex.quests.map(q => [q.at, q]));
    for (const [k, t] of Object.entries(ex.board)) {
      const [q, r] = k.split(',').map(Number); used.add(k); const a = art(t), qu = questAt.get(k);
      cells.push({ q, r, atlas: a.atlas, tile: a.tile, rot: t.rot * Math.PI / 3, token: qu ? qu.target : null, mark: qu ? '#c8922e' : null });
    }
    if (ghost) { const a = art(ex.current); cells.push({ q: ghost.q, r: ghost.r, atlas: a.atlas, tile: a.tile, rot: rot * Math.PI / 3, mark: ghost.sc ? '#3f7a3a' : '#a8321f' }); used.add(ghost.q + ',' + ghost.r); }
    let R = 3; for (const k of used) { const [q, r] = k.split(',').map(Number); R = Math.max(R, (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2 + 2); }
    const slots = [];
    for (let d = 1; d <= R; d++) for (const [q, r] of ring(0, 0, d)) { const k = q + ',' + r; if (!used.has(k)) slots.push({ q, r, legal: legal.has(k) }); }
    return { cells, slots };
  }

  function render() {
    view.setBoard(board());
    $('#steps').innerHTML = '<span class="on">Expedição</span>';
    $('#cover').hidden = true;
    $('.panel').classList.remove('over', 'in-event'); $('.panel').classList.add('expedition');
    const quests = ex.quests.map(q => { const size = groupOf(ex, q.at, q.kind).length;
      return `<li><b>${esc(questName(q.kind))}</b>: ${size}/${q.target} <small>(círculo dourado no mapa)</small></li>`; }).join('');
    $('#side').innerHTML = `<h2>Expedição</h2><p><b>${ex.score}</b> pontos · <b>${ex.stack + (ex.next ? 1 : 0) + (ex.current ? 1 : 0)}</b> peças por colocar</p>
      <p class="hint">Recorde: ${best()} pontos</p>
      <h2>Missões (+${RULES.questReward.points} pontos e +${RULES.questReward.tiles} peças)</h2>${quests ? `<ul class="objs">${quests}</ul>` : '<p class="hint">Algumas peças trazem uma missão: faz crescer o grupo dessa peça até ao número indicado.</p>'}
      <h2>Como se joga</h2><ul class="objs"><li>Roda a peça e põe-na ao lado de outra.</li><li>Cada lado com o mesmo terreno do vizinho dá 1 ponto; com a mesma cor também, mais 1. Estradas e rios não têm cor.</li>
      <li>Fila: podes trocar a peça actual por uma das 3 à vista; custa peças da pilha (1, depois 2, depois 3…).</li>
      <li>Estradas só tocam estradas; rios só tocam rios ou Lagos. Uma ponta aberta só aceita a peça que a continua.</li><li>Peça rodeada pelos 6 lados, com terreno e cor a bater: encaixe perfeito, +3 pontos e +1 peça.</li>
      <li>Acaba quando acabarem as peças.</li></ul>`;
    if (ex.over) {
      const b = best(), rec = ex.score >= b && ex.score > 0;
      if (rec) try { store?.setItem(BEST, String(ex.score)); } catch {}
      $('#head').innerHTML = `Expedição terminada · ${ex.score} pontos${rec ? ' · novo recorde!' : ''}`;
      $('#guide').innerHTML = `${ex.placed} peças colocadas, ${ex.perfects} encaixes perfeitos, ${ex.done} missões cumpridas.`;
      $('#hand').innerHTML = ''; $('#market').innerHTML = '';
      $('#tools').innerHTML = '<button class="btn primary" data-ex-new>Nova expedição</button><button class="btn" data-menu>Menu</button>';
      $('#msg').textContent = ''; return;
    }
    $('#head').innerHTML = `Expedição · ${ex.score} pontos · ${ex.stack + 2} peças`;
    $('#guide').innerHTML = ghost
      ? (ghost.sc ? `<b>+${ghost.sc.points} pontos</b> (${ghost.sc.match} de terreno, ${ghost.sc.colour} de cor)${ghost.sc.perfect ? ' · encaixe perfeito (+1 peça)' : ''}. Toca outra vez no mesmo hexágono, ou em «Colocar». Podes rodar antes.` : 'Com esta rotação não encaixa aqui. Roda a peça ou escolhe outro hexágono.')
      : 'Roda a peça (↻) e toca num hexágono marcado. Marcados = onde encaixa com esta rotação.';
    $('#hand').innerHTML = `<div class="ex-tile"><button class="card on" disabled>${tileHTML(ex.current, 76, rot)}<span class="nm">${esc(NAMES[ex.current.kind])}</span>${ex.current.quest ? `<span class="bi">missão: ${esc(questName(ex.current.quest.kind))} +${ex.current.quest.add}</span>` : ''}</button></div>`
      + (ex.next ? `<div class="card" style="opacity:.75">${tileHTML(ex.next, 56)}<span class="bi">a seguir</span></div>` : '');
    const cost = rowCost(ex);
    $('#market').innerHTML = ex.row.map((t, i) => t ? `<button class="card" data-ex-swap="${i}" ${ex.stack >= cost ? '' : 'disabled'} title="Trocar pela peça actual">${tileHTML(t, 60)}<span class="nm">${esc(NAMES[t.kind])}</span><span class="bi">trocar: −${cost} peças</span></button>` : '').join('');
    $('#tools').innerHTML = '<button class="btn primary" data-ex-rot>↻ Rodar</button>' + (ghost?.sc ? '<button class="btn primary" data-ex-place>Colocar</button>' : '') + (ghost ? '<button class="btn" data-ex-cancel>Cancelar</button>' : '');
    $('#msg').textContent = msg;
  }

  function onHex(h) {
    if (!h || ex.over) return;
    if (ghost && ghost.q === h.q && ghost.r === h.r && ghost.sc) return commit();
    if (ex.board[h.q + ',' + h.r]) return;
    // escolhe a melhor rotação para este hexágono, se a actual não servir
    let sc = placementScore(ex, h.q, h.r, { ...ex.current, rot });
    if (!sc) { const opts = legalPlacements(ex).filter(p => p.q === h.q && p.r === h.r); if (opts.length) { const b = opts.reduce((a, c) => (c.points > a.points ? c : a)); rot = b.rot; sc = b; } }
    ghost = { q: h.q, r: h.r, sc }; msg = ''; render();
  }
  function commit() {
    const r = place(ex, ghost.q, ghost.r, rot);
    if (r.error) { msg = r.error; render(); return; }
    ex = r.state; ghost = null; rot = 0;
    msg = `+${r.result.points} pontos` + (r.result.perfect ? ' · encaixe perfeito! +1 peça' : '') + (r.result.completed.length ? ` · missão cumprida! +${RULES.questReward.tiles} peças` : '');
    save(); render(); view.fitAll($('.topbar').getBoundingClientRect().bottom, innerHeight - $('.panel').getBoundingClientRect().top);
  }
  function onClick(b) {
    if (b.dataset.exRot != null) { rot = (rot + 1) % 6; if (ghost) ghost.sc = placementScore(ex, ghost.q, ghost.r, { ...ex.current, rot }); render(); return true; }
    if (b.dataset.exPlace != null) { commit(); return true; }
    if (b.dataset.exSwap != null) { const r = swapWithRow(ex, +b.dataset.exSwap); if (r.error) msg = r.error; else { ex = r.state; ghost = null; rot = 0; msg = 'Trocaste de peça.'; save(); } render(); return true; }
    if (b.dataset.exCancel != null) { ghost = null; render(); return true; }
    if (b.dataset.exNew != null) { start(true); return true; }
    return false;
  }
  function start(fresh = false) {
    let saved = null; try { saved = !fresh && JSON.parse(store?.getItem(SAVE) || 'null'); } catch {}
    ex = saved && saved.mode === 'expedition' && saved.version === 2 && !saved.over ? saved : createExpedition(randomSeed());
    rot = 0; ghost = null; msg = ''; save(); render();
    view.fitAll($('.topbar').getBoundingClientRect().bottom, innerHeight - $('.panel').getBoundingClientRect().top);
  }
  const hasSaved = () => { try { const s = JSON.parse(store?.getItem(SAVE) || 'null'); return !!(s && s.version === 2 && !s.over); } catch { return false; } };
  return { start, render, onHex, onClick, hasSaved };
}
