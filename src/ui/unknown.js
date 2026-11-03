// Interface do modo «Terras Desconhecidas». Separada do resto: o app.js só a liga ao menu.
import { createUnknown, place, move, discover, swap, swapCost, reachable, returnToCamp, UNK, CHAPTERS, EVENTS, SITE_REWARDS } from '../unknown/engine.js';
import { legalPlacements, placementScore } from '../expedition/engine.js';
import { KINDS, isPathTile } from '../expedition/tiles.js';
import { tileStyle, pathStyle, splitStyle } from './assets.js';
import { ring } from '../core/hex.js';
import { randomSeed } from './seed.js';

const SAVE = 'frontier.unknown', BEST = 'frontier.unknown.best';
const NAMES = { plain: 'Planície', forest: 'Floresta', woods: 'Bosque', hills: 'Colinas', mountains: 'Montanhas', lake: 'Lago', village: 'Aldeia',
  road_straight: 'Estrada', road_bend: 'Estrada em curva', road_fork: 'Cruzamento', river_straight: 'Rio', river_bend: 'Rio em curva', river_bend2: 'Rio em curva',
  bridge: 'Ponte', road_split: 'Estrada de fronteira', river_split: 'Rio de fronteira', site_ruins: 'Ruínas', site_cave: 'Caverna', site_crystals: 'Cristais',
  site_stones: 'Círculo de pedras', site_graveyard: 'Cemitério' };
const SITE_NAMES = { ruins: 'Ruínas', cave: 'Caverna', crystals: 'Cristais', stones: 'Círculo de pedras', graveyard: 'Cemitério', village: 'Aldeia' };
const reward = R => [R.points ? `${R.points > 0 ? '+' : ''}${R.points} pontos` : '', R.tokens ? `${R.tokens > 0 ? '+' : ''}${R.tokens} ficha${Math.abs(R.tokens) > 1 ? 's' : ''}` : '', R.mpTurns ? `+1 movimento durante ${R.mpTurns} turnos` : ''].filter(Boolean).join(', ');

export function createUnknownUI({ $, esc, view, store }) {
  let s = null, rot = 0, ghost = null, msg = '';
  const save = () => { try { store?.setItem(SAVE, JSON.stringify(s)); } catch {} };
  const best = () => { try { return +(store?.getItem(BEST) || 0); } catch { return 0; } };
  const art = t => KINDS[t.kind].split ? { atlas: 'splits', tile: `${t.kind}:${t.biome}|${t.biome2}` } : isPathTile(t.kind) ? { atlas: 'paths-' + t.biome, tile: t.kind } : { atlas: t.biome, tile: KINDS[t.kind].art };
  const tileHTML = (t, w, r = 0) => { const a = art(t);
    return `<span class="art" style="${KINDS[t.kind].split ? splitStyle(a.tile, w) : isPathTile(t.kind) ? pathStyle(t.biome, t.kind, w) : tileStyle(t.biome, a.tile, w)};transform:rotate(${r * 60}deg)"></span>`; };
  const fit = () => view.fitAll($('.topbar').getBoundingClientRect().bottom, innerHeight - $('.panel').getBoundingClientRect().top);

  function board() {
    const cells = [], used = new Set();
    const legal = new Set(s.step === 'place' ? legalPlacements(s).filter(p => p.rot === rot).map(p => p.q + ',' + p.r) : []);
    const reach = new Set(s.step === 'move' ? reachable(s) : []);
    for (const [k, t] of Object.entries(s.board)) {
      const [q, r] = k.split(',').map(Number); used.add(k); const a = art(t);
      const isSite = KINDS[t.kind].site;
      cells.push({ q, r, atlas: a.atlas, tile: a.tile, rot: t.rot * Math.PI / 3, flag: k === s.explorer ? '#a8321f' : null,
        mark: reach.has(k) ? '#2c6a97' : isSite && !s.explored[k] ? '#c8922e' : null });
    }
    if (ghost) { const a = art(s.current); cells.push({ q: ghost.q, r: ghost.r, atlas: a.atlas, tile: a.tile, rot: rot * Math.PI / 3, mark: ghost.ok ? '#3f7a3a' : '#a8321f' }); used.add(ghost.q + ',' + ghost.r); }
    let R = 3; for (const k of used) { const [q, r] = k.split(',').map(Number); R = Math.max(R, (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2 + 2); }
    const slots = [];
    for (let d = 1; d <= R; d++) for (const [q, r] of ring(0, 0, d)) { const k = q + ',' + r; if (!used.has(k)) slots.push({ q, r, legal: legal.has(k) }); }
    return { cells, slots };
  }

  function render() {
    view.setBoard(board());
    $('#steps').innerHTML = s.over ? '<span class="on">Fim</span>' : ['Colocar', 'Mover', 'Descobrir'].map((n, i) => `<span class="${['place', 'move', 'discover'][i] === s.step ? 'on' : ''}">${n}</span>`).join('');
    $('#cover').hidden = true; $('.panel').classList.remove('over'); $('.panel').classList.add('expedition', 'unknown'); $('.panel').classList.toggle('in-event', s.step === 'move' || s.step === 'discover');
    const C = CHAPTERS[Math.min(s.chapter, 2)], st = s.chapterState;
    const ok = b => (b ? '✔' : '○');
    $('#side').innerHTML = `<h2>Terras Desconhecidas</h2><p><b>${s.score}</b> pontos · <b>${s.tokens}</b> fichas · recorde ${best()}</p>
      ${s.over ? '' : `<h2>Capítulo ${s.chapter + 1} de 3 — ${esc(C.name)} · peça ${s.inChapter + 1} de 12</h2>
      <ul class="progress"><li class="${st.main ? 'ok' : ''}">${ok(st.main)} ${esc(C.main.text)} <small>+10 pontos e +2 fichas</small></li>
      ${C.challenges.map((c, i) => `<li class="${st.ch[i] ? 'ok' : ''}">${ok(st.ch[i])} ${esc(c.text)} <small>+5 pontos</small></li>`).join('')}</ul>
      <p class="hint"><b>Acontecimento: ${esc(EVENTS[s.event].name)}.</b> ${esc(EVENTS[s.event].text)}</p>`}
      <h2>Como se joga</h2><ul class="objs"><li>Coloca a peça (podes trocá-la por uma do mercado: a 1.ª troca do capítulo é grátis, depois 1 ficha).</li>
      <li>Move o Explorador (bandeira vermelha): 2 pontos; por estrada ligada cada passo custa ½; Montanha e terra morta 2; Lagos e rios só pela Ponte.</li>
      <li>Ao chegar a um local (contorno dourado) escolhes pontos ou fichas.</li>
      <li>Pontos: regiões, estradas e rios com 3, 5, 7… peças; Aldeias e locais ligados pela mesma estrada (+5 cada); locais ligados por rio a um Lago (+6); Ponte (+3); encaixe perfeito (+3 e +1 ficha).</li></ul>`;
    if (s.over) {
      const b = best(), rec = s.score > b; if (rec) try { store?.setItem(BEST, String(s.score)); } catch {}
      $('#head').innerHTML = `Expedição terminada · ${s.score} pontos · ${esc(s.title)}${rec ? ' · novo recorde!' : ''}`;
      $('#guide').innerHTML = s.history.map((h, i) => `Capítulo ${i + 1}: objectivo ${h.main ? '✔' : '✘'}, desafios ${h.ch.filter(Boolean).length}/2`).join(' · ');
      $('#hand').innerHTML = ''; $('#market').innerHTML = '';
      $('#tools').innerHTML = '<button class="btn primary" data-un-new>Nova expedição</button><button class="btn" data-menu>Menu</button>'; $('#msg').textContent = msg; return;
    }
    $('#head').innerHTML = `Capítulo ${s.chapter + 1} · peça ${s.inChapter + 1}/12 · ${s.score} pontos · ${s.tokens} fichas`;
    let tools = '', guide = '';
    if (s.step === 'place') {
      guide = ghost ? (ghost.ok ? 'Toca outra vez no mesmo hexágono, ou em «Colocar».' : 'Com esta rotação não encaixa aqui. Roda a peça ou escolhe outro hexágono.')
        : 'Roda a peça (↻) e toca num hexágono marcado.';
      tools = '<button class="btn primary" data-un-rot>↻ Rodar</button>' + (ghost?.ok ? '<button class="btn primary" data-un-place>Colocar</button>' : '') + (ghost ? '<button class="btn" data-un-cancel>Cancelar</button>' : '');
      const cost = swapCost(s);
      $('#hand').innerHTML = `<button class="card on" disabled>${tileHTML(s.current, 76, rot)}<span class="nm">${esc(NAMES[s.current.kind])}</span></button>`
        + (s.stack[0] ? `<div class="card" style="opacity:.75">${tileHTML(s.stack[0], 56)}<span class="bi">a seguir</span></div>` : '');
      $('#market').innerHTML = s.market.map((t, i) => `<button class="card" data-un-swap="${i}" ${s.tokens >= cost ? '' : 'disabled'}>${tileHTML(t, 60)}<span class="nm">${esc(NAMES[t.kind])}</span><span class="bi">trocar: ${cost ? '1 ficha' : 'grátis'}</span></button>`).join('');
    } else if (s.step === 'move') {
      guide = 'Toca num hexágono com contorno azul para mover o Explorador, ou fica onde estás.';
      tools = '<button class="btn" data-un-stay>Ficar aqui</button>' + (!s.returnUsed && s.tokens >= 1 ? '<button class="btn" data-un-camp>Regressar ao Acampamento (1 ficha)</button>' : '');
      $('#hand').innerHTML = ''; $('#market').innerHTML = '';
    } else if (s.step === 'discover') {
      const site = s.pendingSite.site, R = SITE_REWARDS[site];
      guide = `<b>${esc(SITE_NAMES[site])}</b> — escolhe a recompensa.`;
      tools = `<button class="btn primary" data-un-disc="A">${esc(reward(R.A))}</button><button class="btn primary" data-un-disc="B">${esc(reward(R.B))}</button>`;
      $('#hand').innerHTML = ''; $('#market').innerHTML = '';
    }
    $('#guide').innerHTML = guide; $('#tools').innerHTML = tools; $('#msg').textContent = msg;
  }

  function apply(r) {
    if (r.error) { msg = r.error; render(); return; }
    s = r.state; ghost = null; msg = (r.events || []).join(' · '); save(); render();
  }
  function onHex(h) {
    if (!h || s.over) return;
    const k = h.q + ',' + h.r;
    if (s.step === 'move') { if (reachable(s).includes(k)) apply(move(s, k)); return; }
    if (s.step !== 'place') return;
    if (ghost && ghost.q === h.q && ghost.r === h.r && ghost.ok) { const r = place(s, h.q, h.r, rot); rot = 0; apply(r); fit(); return; }
    if (s.board[k]) return;
    let ok = !!placementScore(s, h.q, h.r, { ...s.current, rot });
    if (!ok) { const o = legalPlacements(s).find(p => p.q === h.q && p.r === h.r); if (o) { rot = o.rot; ok = true; } }
    ghost = { q: h.q, r: h.r, ok }; msg = ''; render();
  }
  function onClick(b) {
    const d = b.dataset;
    if (d.unRot != null) { rot = (rot + 1) % 6; if (ghost) ghost.ok = !!placementScore(s, ghost.q, ghost.r, { ...s.current, rot }); render(); return true; }
    if (d.unPlace != null) { const r = place(s, ghost.q, ghost.r, rot); rot = 0; apply(r); fit(); return true; }
    if (d.unCancel != null) { ghost = null; render(); return true; }
    if (d.unSwap != null) { apply(swap(s, +d.unSwap)); return true; }
    if (d.unStay != null) { apply(move(s, null)); return true; }
    if (d.unCamp != null) { apply(returnToCamp(s)); return true; }
    if (d.unDisc) { apply(discover(s, d.unDisc)); return true; }
    if (d.unNew != null) { start(true); return true; }
    return false;
  }
  function start(fresh = false) {
    let saved = null; try { saved = !fresh && JSON.parse(store?.getItem(SAVE) || 'null'); } catch {}
    s = saved && saved.mode === 'unknown' && saved.version === 1 && !saved.over ? saved : createUnknown(randomSeed());
    rot = 0; ghost = null; msg = ''; save(); render(); fit();
  }
  const hasSaved = () => { try { const x = JSON.parse(store?.getItem(SAVE) || 'null'); return !!(x && x.version === 1 && !x.over); } catch { return false; } };
  return { start, render, onHex, onClick, hasSaved };
}
