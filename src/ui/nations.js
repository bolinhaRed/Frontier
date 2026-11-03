// Interface do modo «Quatro Nações». Separada do resto: o app.js só a liga ao menu.
import { createNations, act, placements, reachable, tileDefense, chanceVsFixed, chanceVsPawn, recruitSpots, recruitCost, towerCost, pawnAt, score,
  NATIONS, ORDER, RULES, LEGENDARY_NAMES } from '../nations/engine.js';
import { aiAction } from '../nations/ai.js';
import { placementScore } from '../expedition/engine.js';
import { KINDS, isPathTile } from '../expedition/tiles.js';
import { tileStyle, pathStyle } from './assets.js';
import { ring, key, neighbors } from '../core/hex.js';
import { randomSeed } from './seed.js';

const SAVE = 'frontier.nations';
const STRUCT_TILE = { castle: 'city', tower: 'tower' }, LEG_TILE = { temple: 'wonder', volcano: 'vulcano', crystals: 'crystals' };
const NAMES = { plain: 'Planície', forest: 'Floresta', woods: 'Bosque', hills: 'Colinas', mountains: 'Montanhas', lake: 'Lago', village: 'Aldeia',
  road_straight: 'Estrada', road_bend: 'Estrada em curva', road_fork: 'Cruzamento', river_straight: 'Rio', river_bend: 'Rio em curva', river_bend2: 'Rio em curva', bridge: 'Ponte' };
const pct = x => Math.round(x * 100) + '%';

export function createNationsUI({ $, esc, view, store }) {
  let s = null, sel = null, handI = 0, rot = 0, ghost = null, msg = '', revealed = null, timer = null, draft = ['human', 'normal'];
  const save = () => { try { store?.setItem(SAVE, JSON.stringify(s)); } catch {} };
  const fit = () => view.fitAll($('.topbar').getBoundingClientRect().bottom, innerHeight - $('.panel').getBoundingClientRect().top);
  const me = () => s.players[s.active];
  const isAI = () => me().kind === 'ai';
  const humans = () => s.players.filter(p => p.kind !== 'ai');
  const art = c => {
    if (c.legendary) return { atlas: c.biome, tile: LEG_TILE[c.legendary] };
    if (c.structure) return { atlas: c.biome, tile: STRUCT_TILE[c.structure] };
    return isPathTile(c.kind) ? { atlas: 'paths-' + c.biome, tile: c.kind } : { atlas: c.biome, tile: KINDS[c.kind].art };
  };
  const tileHTML = (t, w, r = 0) => `<span class="art" style="${isPathTile(t.kind) ? pathStyle(t.biome, t.kind, w) : tileStyle(t.biome, KINDS[t.kind].art, w)};transform:rotate(${r * 60}deg)"></span>`;

  function board() {
    const cells = [], used = new Set();
    const reach = sel != null && s.step === 'act' ? reachable(s, sel) : {};
    const pawnsAt = new Map(); for (const p of s.players) for (const w of p.pawns) pawnsAt.set(w.at, { p, w });
    const legal = new Set(s.step === 'place' && !isAI() && s.hand[handI] ? placements(s).filter(a => a.i === handI && a.rot === rot).map(a => a.q + ',' + a.r) : []);
    const selW = sel != null ? me().pawns.find(w => w.id === sel) : null;
    const enemyNear = new Set(selW && s.ap >= 1 ? neighbors(...selW.at.split(',').map(Number)).map(([a, b]) => key(a, b)).filter(k => { const t = pawnAt(s, k); return t && t.player.id !== s.active; }) : []);
    for (const [k, c] of Object.entries(s.board)) {
      const [q, r] = k.split(',').map(Number); used.add(k); const a = art(c), pw = pawnsAt.get(k);
      cells.push({ q, r, atlas: a.atlas, tile: a.tile, rot: c.structure || c.legendary ? 0 : (c.rot || 0) * Math.PI / 3, color: c.owner != null ? NATIONS[s.players[c.owner].nation].color : null,
        mark: enemyNear.has(k) ? '#a8321f' : reach[k] != null ? '#2c6a97' : c.legendary && c.owner == null ? '#7a2f8f' : null,
        pawn: pw ? { color: NATIONS[pw.p.nation].color, letter: NATIONS[pw.p.nation].letter, level: pw.w.level, selected: pw.p.id === s.active && pw.w.id === sel } : null });
    }
    if (ghost) { const t = s.hand[handI], a = isPathTile(t.kind) ? { atlas: 'paths-' + t.biome, tile: t.kind } : { atlas: t.biome, tile: KINDS[t.kind].art }; cells.push({ q: ghost.q, r: ghost.r, atlas: a.atlas, tile: a.tile, rot: rot * Math.PI / 3, mark: ghost.ok ? '#3f7a3a' : '#a8321f' }); used.add(ghost.q + ',' + ghost.r); }
    let R = 4; for (const k of used) { const [q, r] = k.split(',').map(Number); R = Math.max(R, (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2 + 1); }
    const slots = []; for (let d = 1; d <= R; d++) for (const [q, r] of ring(0, 0, d)) { const k = q + ',' + r; if (!used.has(k)) slots.push({ q, r, legal: legal.has(k) }); }
    return { cells, slots };
  }

  function sideHTML() {
    const leg = Object.values(s.board).filter(c => c.legendary);
    return `<h2>Quatro Nações · ronda ${s.round} de ${RULES.rounds}</h2>
      <ol class="players">${s.players.map(p => { const N = NATIONS[p.nation], tiles = Object.values(s.board).filter(c => c.owner === p.id).length;
        return `<li class="${p.id === s.active ? 'act' : ''}"><i style="background:${N.color}"></i><b>${esc(N.name)}</b>${p.kind === 'ai' ? ` <small>(IA ${({ easy: 'fácil', normal: 'normal', hard: 'difícil' })[p.level] || ''})</small>` : ''} <span class="pts">${score(s, p.id)} pts</span>
          <span class="chips"><span class="chip">Ouro <b>${p.gold}</b></span><span class="chip">Terras <b>${tiles}</b></span><span class="chip">Peões <b>${p.pawns.length}</b></span></span>
          <small>${esc(N.text)}</small></li>`; }).join('')}</ol>
      <h2>Locais lendários</h2><ul class="objs">${leg.map(c => `<li>${LEGENDARY_NAMES[c.legendary]}: ${c.owner == null ? 'livre' : esc(NATIONS[s.players[c.owner].nation].short)}</li>`).join('')}</ul>
      <h2>Como se ganha</h2><ul class="objs"><li>Os 3 lendários no início de 2 turnos teus seguidos;</li><li>ou mais de metade do mapa;</li><li>ou mais pontos no fim da ronda ${RULES.rounds} (1 por terra, 3 por lendário, 2 por estrutura).</li></ul>`;
  }

  function render() {
    clearTimeout(timer);
    if (!s) return;
    view.setBoard(board());
    $('#side').innerHTML = sideHTML();
    $('.panel').classList.remove('over', 'expedition', 'unknown'); $('.panel').classList.toggle('in-event', s.step !== 'place' || isAI() || s.over);
    $('#steps').innerHTML = s.over ? '<span class="on">Fim</span>' : `<span class="${s.step === 'place' ? 'on' : ''}">1. Colocar</span><span class="${s.step === 'act' ? 'on' : ''}">2. Acções</span>`;
    const N = NATIONS[me().nation];
    // passar o aparelho entre pessoas
    const cover = !s.over && humans().length > 1 && !isAI() && revealed !== s.active;
    $('#cover').hidden = !cover;
    if (cover) { $('#cover').innerHTML = `<div class="cover-box"><i class="dot" style="background:${N.color}"></i><h2>Vez dos ${esc(N.name)}</h2><p>Passa o aparelho.</p><button class="btn primary" data-na-reveal>Começar o turno</button></div>`; return; }
    if (s.over) {
      const W = NATIONS[s.players[s.winner].nation];
      $('#head').innerHTML = `Vitória dos ${esc(W.name)}!`; $('#guide').innerHTML = esc(s.reason || '');
      $('#hand').innerHTML = ''; $('#market').innerHTML = '';
      $('#tools').innerHTML = '<button class="btn primary" data-na-newgame>Nova partida</button><button class="btn" data-menu>Menu</button>'; $('#msg').textContent = msg; return;
    }
    $('#head').innerHTML = `${esc(N.name)} · ronda ${s.round} · ${s.step === 'act' ? `${+s.ap.toFixed(2)} pontos de acção` : 'coloca uma peça'} · ${me().gold} ouro`;
    let guide = '', tools = '';
    if (isAI()) { guide = `${esc(N.name)} (IA) estão a jogar…`; $('#hand').innerHTML = ''; $('#market').innerHTML = ''; }
    else if (s.step === 'place') {
      guide = ghost ? (ghost.ok ? 'Toca outra vez no mesmo hexágono, ou em «Colocar».' : 'Com esta rotação não encaixa aqui.') : 'Escolhe uma das 2 peças, roda-a e toca num hexágono marcado. A peça fica neutra: depois tens de a conquistar.';
      $('#hand').innerHTML = s.hand.map((t, i) => `<button class="card${i === handI ? ' on' : ''}" data-na-hand="${i}">${tileHTML(t, 70, i === handI ? rot : 0)}<span class="nm">${esc(NAMES[t.kind])}</span></button>`).join('');
      $('#market').innerHTML = '';
      tools = '<button class="btn primary" data-na-rot>↻ Rodar</button>' + (ghost?.ok ? '<button class="btn primary" data-na-place>Colocar</button>' : '') + '<button class="btn" data-na-skip>Não colocar</button>';
    } else {
      const w = sel != null ? me().pawns.find(x => x.id === sel) : null;
      guide = w ? 'Azul: onde o peão chega (toca para mover). Vermelho: peões inimigos que podes atacar.' : 'Toca num peão teu para o escolher.';
      $('#hand').innerHTML = ''; $('#market').innerHTML = '';
      if (w && s.ap >= 1) {
        const c = s.board[w.at];
        if (c.owner !== s.active) tools += `<button class="btn primary" data-na-conquer>Conquistar ${c.legendary ? LEGENDARY_NAMES[c.legendary] : ''} (defesa ${tileDefense(s, w.at)}, ${pct(chanceVsFixed(w.level, tileDefense(s, w.at)))})</button>`;
        else if (!c.structure && c.kind !== 'village' && !isPathTile(c.kind) && me().gold >= towerCost(s)) tools += `<button class="btn" data-na-tower>Construir Torre (${towerCost(s)} ouro)</button>`;
      }
      if (s.ap >= 1 && me().gold >= recruitCost(s) && me().pawns.length < RULES.maxPawns && recruitSpots(s).length) tools += `<button class="btn" data-na-recruit>Recrutar peão (${recruitCost(s)} ouro)</button>`;
      tools += '<button class="btn primary" data-na-end>Terminar turno</button>';
    }
    $('#guide').innerHTML = guide; $('#tools').innerHTML = tools; $('#msg').textContent = msg;
    if (isAI()) timer = setTimeout(aiStep, 380);
  }

  function apply(r) {
    if (r.error) { msg = r.error; render(); return; }
    const prev = s.active; s = r.state; msg = (r.events || []).join(' · ');
    if (s.active !== prev) { sel = null; handI = 0; rot = 0; ghost = null; }
    if (s.step === 'act' && ghost) ghost = null;
    save(); render();
  }
  function aiStep() { if (!s || s.over || !isAI()) return; apply(act(s, aiAction(s))); }

  function onHex(h) {
    if (!h || s.over || isAI()) return;
    const k = h.q + ',' + h.r;
    if (s.step === 'place') {
      if (ghost && ghost.q === h.q && ghost.r === h.r && ghost.ok) { const r = act(s, { type: 'place', i: handI, q: h.q, r: h.r, rot }); ghost = null; rot = 0; apply(r); return; }
      if (s.board[k]) return;
      let ok = !!placementScore(s, h.q, h.r, { ...s.hand[handI], rot });
      if (!ok) { const o = placements(s).find(a => a.i === handI && a.q === h.q && a.r === h.r); if (o) { rot = o.rot; ok = true; } }
      ghost = { q: h.q, r: h.r, ok }; render(); return;
    }
    const mine = me().pawns.find(w => w.at === k);
    if (mine) { sel = mine.id; msg = ''; render(); return; }
    if (sel == null) return;
    const t = pawnAt(s, k);
    if (t && t.player.id !== s.active) {
      const w = me().pawns.find(x => x.id === sel), cell = s.board[k];
      const b = t.pawn.level + (cell.owner === t.player.id ? 1 : 0) + (cell.structure ? 2 : 0);
      if (!confirm(`Atacar? Probabilidade de ganhar: ${pct(chanceVsPawn(w.level + (me().nation === 'fire' ? 1 : 0), b))}`)) return;
      apply(act(s, { type: 'attack', pawn: sel, target: k })); return;
    }
    if (reachable(s, sel)[k] != null) apply(act(s, { type: 'move', pawn: sel, to: k }));
  }

  function onClick(b) {
    const d = b.dataset;
    if (d.naReveal != null) { revealed = s.active; render(); return true; }
    if (d.naHand != null) { handI = +d.naHand; rot = 0; ghost = null; render(); return true; }
    if (d.naRot != null) { rot = (rot + 1) % 6; if (ghost) ghost.ok = !!placementScore(s, ghost.q, ghost.r, { ...s.hand[handI], rot }); render(); return true; }
    if (d.naPlace != null) { const r = act(s, { type: 'place', i: handI, q: ghost.q, r: ghost.r, rot }); ghost = null; rot = 0; apply(r); return true; }
    if (d.naSkip != null) { ghost = null; apply(act(s, { type: 'skipPlace' })); return true; }
    if (d.naConquer != null) { apply(act(s, { type: 'conquer', pawn: sel })); return true; }
    if (d.naTower != null) { const w = me().pawns.find(x => x.id === sel); apply(act(s, { type: 'tower', at: w.at })); return true; }
    if (d.naRecruit != null) { apply(act(s, { type: 'recruit', at: recruitSpots(s)[0] })); return true; }
    if (d.naEnd != null) { sel = null; apply(act(s, { type: 'end' })); return true; }
    if (d.naNewgame != null) { openSetup(); return true; }
    if (d.naCount) { const n = +d.naCount; draft = Array.from({ length: n }, (_, i) => draft[i] || (i === 0 ? 'human' : 'normal')); openSetup(); return true; }
    if (d.naStart != null) { begin(); return true; }
    if (d.naContinue != null) { $('#dialog').hidden = true; render(); fit(); return true; }
    return false;
  }
  function onChange(e) { const i = e.target.dataset?.naKind; if (i != null) draft[+i] = e.target.value; }

  function openSetup() {
    const d = $('#dialog'); d.hidden = false;
    d.innerHTML = `<div class="cover-box"><h2>Quatro Nações</h2><p class="hint">Conquista território com os teus peões. 2 a 4 nações, pessoas ou IA. <b>Para jogar sozinho:</b> deixa um lugar como Pessoa e os outros como IA. A IA difícil começa com 3 peões de nível 2 e +1 ouro por turno.</p>
      <div class="count">${[2, 3, 4].map(n => `<button class="btn small${draft.length === n ? ' primary' : ''}" data-na-count="${n}">${n} nações</button>`).join('')}</div>
      <div class="names">${draft.map((k, i) => { const N = NATIONS[ORDER[i]]; return `<label><i style="background:${N.color}"></i><span style="flex:1;text-align:left"><b>${esc(N.name)}</b><br><small>${esc(N.text)}</small></span>
        <select data-na-kind="${i}">${[['human', 'Pessoa'], ['easy', 'IA fácil'], ['normal', 'IA normal'], ['hard', 'IA difícil']].map(([v, t]) => `<option value="${v}"${k === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`; }).join('')}</div>
      <div class="row-btns"><button class="btn" data-cancel>Cancelar</button><button class="btn primary" data-na-start>Começar</button></div></div>`;
  }
  function begin() {
    if (!draft.some(k => k === 'human')) draft[0] = 'human';
    s = createNations({ seed: randomSeed(), players: draft.map((k, i) => ({ nation: ORDER[i], kind: k === 'human' ? 'human' : 'ai', level: k === 'human' ? null : k })) });
    sel = null; handI = 0; rot = 0; ghost = null; msg = ''; revealed = humans().length === 1 ? s.players.find(p => p.kind !== 'ai').id : null;
    $('#dialog').hidden = true; save(); render(); fit();
  }
  function start() {
    let saved = null; try { saved = JSON.parse(store?.getItem(SAVE) || 'null'); } catch {}
    if (saved && saved.mode === 'nations' && saved.version === 1 && !saved.over) {
      s = saved; revealed = null; sel = null; ghost = null; msg = '';
      const d = $('#dialog'); d.hidden = false;
      d.innerHTML = `<div class="cover-box"><h2>Quatro Nações</h2><p>Tens uma partida a meio (ronda ${s.round}).</p><div class="row-btns"><button class="btn" data-na-newgame>Nova partida</button><button class="btn primary" data-na-continue>Continuar</button></div></div>`;
      return;
    }
    openSetup();
  }
  const hasSaved = () => { try { const x = JSON.parse(store?.getItem(SAVE) || 'null'); return !!(x && x.version === 1 && !x.over); } catch { return false; } };
  return { start, render, onHex, onClick, onChange, hasSaved };
}
