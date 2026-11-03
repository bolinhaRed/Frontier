// Interface do modo «Nevoeiro». Separada do resto: o app.js só a liga ao menu.
import { createFog, place, redraw, chooseRelic, legalFor, anyMove, canRedraw, fogView, goalProgress, campNetwork, FOG, TERRITORIES, RELICS, SITES } from '../fog/engine.js';
import { placementScore } from '../expedition/engine.js';
import { KINDS, isPathTile } from '../expedition/tiles.js';
import { tileStyle, pathStyle, splitStyle } from './assets.js';
import { randomSeed } from './seed.js';

const SAVE = 'frontier.fog', BEST = 'frontier.fog.best';
const NAMES = { plain: 'Planície', forest: 'Floresta', woods: 'Bosque', hills: 'Colinas', mountains: 'Montanhas', lake: 'Lago', village: 'Aldeia',
  road_straight: 'Estrada', road_bend: 'Estrada em curva', road_fork: 'Cruzamento', river_straight: 'Rio', river_bend: 'Rio em curva', river_bend2: 'Rio em curva',
  bridge: 'Ponte', road_split: 'Estrada de fronteira', river_split: 'Rio de fronteira' };

export function createFogUI({ $, esc, view, store }) {
  let s = null, sel = 0, rot = 0, ghost = null, msg = '';
  const save = () => { try { store?.setItem(SAVE, JSON.stringify(s)); } catch {} };
  const best = () => { try { return +(store?.getItem(BEST) || 0); } catch { return 0; } };
  const art = t => KINDS[t.kind].split ? { atlas: 'splits', tile: `${t.kind}:${t.biome}|${t.biome2}` }
    : isPathTile(t.kind) ? { atlas: 'paths-' + t.biome, tile: t.kind } : { atlas: t.biome, tile: t.art || KINDS[t.kind].art };
  const tileHTML = (t, w, r = 0) => { const a = art(t);
    return `<span class="art" style="${KINDS[t.kind].split ? splitStyle(a.tile, w) : isPathTile(t.kind) ? pathStyle(t.biome, t.kind, w) : tileStyle(t.biome, a.tile, w)};transform:rotate(${r * 60}deg)"></span>`; };
  const fit = () => view.fitAll($('.topbar').getBoundingClientRect().bottom, innerHeight - $('.panel').getBoundingClientRect().top);
  const cur = () => s.hand[sel];

  function board() {
    const T = TERRITORIES[s.t], cells = [], net = campNetwork(s);
    const legal = new Set(s.step === 'place' && cur() ? legalFor(s, cur()).filter(p => p.rot === rot).map(p => p.q + ',' + p.r) : []);
    for (const [k, t] of Object.entries(s.board)) {
      const [q, r] = k.split(',').map(Number), a = art(t);
      cells.push({ q, r, atlas: a.atlas, tile: a.tile, rot: t.rot * Math.PI / 3,
        color: net.has(k) ? 'rgba(168,50,31,.55)' : null,
        flag: t.camp ? '#a8321f' : t.claimed ? '#3f7a3a' : null,
        mark: t.site && !t.claimed ? '#c8922e' : null });
    }
    const { fog, open } = fogView(s);
    for (const f of fog) cells.push({ q: f.q, r: f.r, atlas: T.fog, tile: 'fog', rot: 0,
      mark: f.sensed === 'site' ? '#c8922e' : f.sensed === 'hazard' ? '#a8321f' : f.sensed ? '#f3ead2' : null });
    const slots = open.filter(o => !(ghost && ghost.q === o.q && ghost.r === o.r)).map(o => ({ q: o.q, r: o.r, legal: legal.has(o.q + ',' + o.r) }));
    if (ghost) { const a = art(cur()); cells.push({ q: ghost.q, r: ghost.r, atlas: a.atlas, tile: a.tile, rot: rot * Math.PI / 3, mark: ghost.sc ? '#3f7a3a' : '#a8321f' }); }
    return { cells, slots };
  }

  function sideHTML() {
    const T = TERRITORIES[Math.min(s.t, TERRITORIES.length - 1)];
    const goal = goalProgress(s).map(g => `<li class="${g.ok ? 'ok' : ''}">${g.ok ? '✔' : '○'} ${esc(g.text)}</li>`).join('');
    const rel = s.relics.length ? `<ul class="objs">${s.relics.map(id => `<li><b>${esc(RELICS[id].name)}</b>: ${esc(RELICS[id].text)}</li>`).join('')}</ul>` : '<p class="hint">Ainda nenhuma. Ganhas uma por cada território conquistado.</p>';
    return `<h2>Nevoeiro</h2><p><b>${s.score}</b> pontos · <b>${s.supplies}</b> mantimentos · recorde ${best()}</p>
      <h2>Território ${s.t + 1} de ${TERRITORIES.length}: ${esc(T.name)}</h2><p>${esc(T.text)}</p><ul class="progress">${goal}</ul>
      <h2>Relíquias</h2>${rel}
      <h2>Como se joga</h2><ul class="objs">
      <li>Escolhe uma peça da mão, roda-a e põe-na ao lado de outra. Cada peça gasta 1 mantimento.</li>
      <li>Pôr uma peça junto ao nevoeiro revela o que lá está. Um contorno claro no nevoeiro quer dizer que há alguma coisa: local ou perigo.</li>
      <li>Perigos: Pântano −1, Cemitério −3 mantimentos.</li>
      <li>Locais (contorno dourado): reclama-os com uma estrada que passe junto ao Acampamento (bandeira vermelha) e junto ao local. A rede do Acampamento tem contorno vermelho.
        ${Object.values(SITES).map(x => `${x.name} +${x.supplies}`).join(', ')} mantimentos.</li>
      <li>Mais mantimentos: fechar uma estrada ou um rio (sem pontas soltas), Floresta com ${FOG.forest.join(' e ')} peças, Aldeia ligada ao Acampamento, encaixe perfeito.</li>
      <li>Pontos: cada lado com o mesmo terreno do vizinho +1 e com a mesma cor +1, estradas e rios fechados, locais. Mantimentos que sobram no fim de um território valem ${FOG.leftoverPoints} pontos cada.</li>
      <li>Trocar a mão inteira: ${FOG.redrawCost} mantimentos.</li></ul>`;
  }

  function render() {
    view.setBoard(board());
    $('#cover').hidden = true; $('.panel').classList.remove('over', 'in-event', 'unknown'); $('.panel').classList.add('expedition', 'fog');
    $('#steps').innerHTML = TERRITORIES.map((t, i) => `<span class="${i === s.t && !s.over ? 'on' : i < s.t || (s.won && i === s.t) ? 'done' : ''}">${i + 1}. ${esc(t.name)}</span>`).join('');
    $('#side').innerHTML = sideHTML();
    $('#msg').textContent = msg;
    if (s.over) {
      const b = best(), rec = s.score > b; if (rec) try { store?.setItem(BEST, String(s.score)); } catch {}
      $('#head').innerHTML = `${s.won ? 'Expedição concluída' : 'Expedição perdida no nevoeiro'} · ${s.score} pontos · ${esc(s.title)}${rec ? ' · novo recorde!' : ''}`;
      $('#guide').innerHTML = s.history.map(h => `${esc(TERRITORIES[h.t].name)}: ${h.won ? 'conquistado' : 'perdido'} (${h.score} pontos)`).join(' · ');
      $('#hand').innerHTML = ''; $('#market').innerHTML = '';
      $('#tools').innerHTML = '<button class="btn primary" data-fg-new>Nova expedição</button><button class="btn" data-menu>Menu</button>'; return;
    }
    if (s.step === 'relic') {
      $('.panel').classList.add('in-event');
      $('#head').innerHTML = `Território conquistado · ${s.score} pontos`;
      $('#guide').innerHTML = `Escolhe uma relíquia para levares para «${esc(TERRITORIES[s.t + 1].name)}».`;
      $('#hand').innerHTML = ''; $('#market').innerHTML = '';
      $('#tools').innerHTML = s.offer.map(id => `<button class="btn primary" data-fg-relic="${id}"><b>${esc(RELICS[id].name)}</b> — ${esc(RELICS[id].text)}</button>`).join('');
      return;
    }
    $('#head').innerHTML = `${esc(TERRITORIES[s.t].name)} · ${s.supplies} mantimentos · ${s.score} pontos`;
    const stuck = !anyMove(s);
    $('#guide').innerHTML = stuck ? 'Nenhuma peça da mão cabe. Troca a mão.'
      : ghost ? (ghost.sc ? `<b>+${ghost.sc.points} pontos</b>${ghost.sc.perfect ? ' · encaixe perfeito' : ''}. Toca outra vez no mesmo hexágono, ou em «Colocar».` : 'Com esta rotação não encaixa aqui. Roda a peça ou escolhe outro hexágono.')
      : 'Escolhe uma peça, roda-a (↻) e toca num hexágono marcado.';
    $('#hand').innerHTML = s.hand.map((t, i) => `<button class="card${i === sel ? ' on' : ''}" data-fg-pick="${i}">${tileHTML(t, i === sel ? 70 : 60, i === sel ? rot : 0)}<span class="nm">${esc(NAMES[t.kind])}</span>${legalFor(s, t).length ? '' : '<span class="bi">não cabe</span>'}</button>`).join('');
    $('#market').innerHTML = `<div class="card" style="opacity:.75">${tileHTML(s.next, 56)}<span class="bi">a seguir</span></div>`;
    $('#tools').innerHTML = '<button class="btn primary" data-fg-rot>↻ Rodar</button>' + (ghost?.sc ? '<button class="btn primary" data-fg-place>Colocar</button>' : '')
      + (ghost ? '<button class="btn" data-fg-cancel>Cancelar</button>' : '')
      + `<button class="btn${stuck ? ' primary' : ''}" data-fg-redraw ${canRedraw(s) ? '' : 'disabled'}>Trocar a mão (−${FOG.redrawCost})</button>`;
  }

  function apply(r) {
    if (r.error) { msg = r.error; render(); return; }
    const newT = r.state.t !== s.t;
    s = r.state; ghost = null; rot = 0; sel = Math.min(sel, s.hand.length - 1);
    msg = [r.points ? `+${r.points} ponto${r.points === 1 ? '' : 's'}` : '', ...(r.events || [])].filter(Boolean).join(' · ');
    save(); render(); if (newT) fit();
  }
  function onHex(h) {
    if (!h || s.over || s.step !== 'place' || !cur()) return;
    const k = h.q + ',' + h.r;
    if (ghost && ghost.q === h.q && ghost.r === h.r && ghost.sc) { apply(place(s, sel, h.q, h.r, rot)); return; }
    if (s.board[k] || !fogView(s).open.some(o => o.q === h.q && o.r === h.r)) return;
    let sc = placementScore(s, h.q, h.r, { ...cur(), rot });
    if (!sc) { const opts = legalFor(s, cur()).filter(p => p.q === h.q && p.r === h.r); if (opts.length) { const b = opts.reduce((a, c) => (c.points > a.points ? c : a)); rot = b.rot; sc = b; } }
    ghost = { q: h.q, r: h.r, sc }; msg = ''; render();
  }
  function onClick(b) {
    const d = b.dataset;
    if (d.fgPick != null) { sel = +d.fgPick; rot = 0; ghost = null; render(); return true; }
    if (d.fgRot != null) { rot = (rot + 1) % 6; if (ghost) ghost.sc = placementScore(s, ghost.q, ghost.r, { ...cur(), rot }); render(); return true; }
    if (d.fgPlace != null) { apply(place(s, sel, ghost.q, ghost.r, rot)); return true; }
    if (d.fgCancel != null) { ghost = null; render(); return true; }
    if (d.fgRedraw != null) { apply(redraw(s)); return true; }
    if (d.fgRelic) { apply(chooseRelic(s, d.fgRelic)); return true; }
    if (d.fgNew != null) { start(true); return true; }
    return false;
  }
  function start(fresh = false) {
    let saved = null; try { saved = !fresh && JSON.parse(store?.getItem(SAVE) || 'null'); } catch {}
    s = saved && saved.mode === 'fog' && saved.version === 1 && !saved.over ? saved : createFog(randomSeed());
    sel = 0; rot = 0; ghost = null; msg = ''; save(); render(); fit();
  }
  const hasSaved = () => { try { const x = JSON.parse(store?.getItem(SAVE) || 'null'); return !!(x && x.mode === 'fog' && x.version === 1 && !x.over); } catch { return false; } };
  return { start, render, onHex, onClick, hasSaved };
}
