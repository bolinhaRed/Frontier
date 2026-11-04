// Interface das Quatro Nações (v2). Separada do resto: o app.js só a liga ao menu.
// Um toque num hexágono marcado conquista-o (o custo está escrito nele); um toque numa terra tua junta-lhe 1 tropa da
// mão; «Desfazer» volta atrás dentro do turno. Mostra os pontos que a ronda vai dar antes de terminar o turno.
import { createNations, act, targets, conquerCost, pointsFor, NATIONS, ORDER, RULES, LEGENDARY_NAMES } from '../nations/engine.js';
import { aiAction } from '../nations/ai.js';
import { KINDS, isPathTile } from '../expedition/tiles.js';
import { ring } from '../core/hex.js';
import { randomSeed } from './seed.js';

const SAVE = 'frontier.nations', SEEN = 'frontier.nations.tutorial';
const LEG_TILE = { temple: 'wonder', volcano: 'vulcano', crystals: 'crystals' };
const KIND_NAME = { plain: 'Planície', forest: 'Floresta', woods: 'Bosque', hills: 'Colinas', mountains: 'Montanhas', lake: 'Lago', village: 'Aldeia' };
const PAWN_IMG = {}, portrait = n => `./assets/nations/portrait-${n}.webp`;
const nameOf = c => (c.legendary ? LEGENDARY_NAMES[c.legendary] : c.path === 'river' ? 'Rio' : c.path === 'road' ? 'Estrada' : KIND_NAME[c.kind] || 'Terreno');

export function createNationsUI({ $, esc, view, store }) {
  for (const n of ORDER) { const im = new Image(); im.onload = () => { if (s) render(); }; im.src = `./assets/nations/pawn-${n}.png`; PAWN_IMG[n] = im; }
  let s = null, undo = [], msg = '', revealed = null, timer = null, tutorial = true;
  let draft = [{ nation: 'nature', kind: 'human' }, { nation: 'fire', kind: 'normal' }];
  const save = () => { try { store?.setItem(SAVE, JSON.stringify(s)); } catch {} };
  const fit = () => view.fitAll($('.topbar').getBoundingClientRect().bottom, innerHeight - $('.panel').getBoundingClientRect().top);
  const me = () => s.players[s.active], isAI = () => me().kind === 'ai', humans = () => s.players.filter(p => p.kind !== 'ai');
  const art = c => (c.legendary ? { atlas: c.biome, tile: LEG_TILE[c.legendary] } : isPathTile(c.kind) ? { atlas: 'paths-' + c.biome, tile: c.kind } : { atlas: c.biome, tile: KINDS[c.kind].art });

  function board() {
    const cells = [], T = new Map(!isAI() && !s.over ? targets(s).map(t => [t.k, t.cost]) : []);
    for (const [k, c] of Object.entries(s.board)) {
      const [q, r] = k.split(',').map(Number), a = art(c), N = c.owner != null ? NATIONS[s.players[c.owner].nation] : null;
      const affordable = T.has(k) && T.get(k) <= s.hand;
      cells.push({ q, r, atlas: a.atlas, tile: a.tile, rot: (c.rot || 0) * Math.PI / 3, color: N ? N.color : null,
        token: T.has(k) ? T.get(k) : null, mark: T.has(k) ? (affordable ? '#2c6a97' : '#a8321f') : c.legendary && c.owner == null ? '#7a2f8f' : null,
        pawn: N ? { color: N.color, letter: N.letter, count: c.troops, img: PAWN_IMG[s.players[c.owner].nation] } : null });
    }
    const used = new Set(Object.keys(s.board)), slots = [];
    for (let d = 1; d <= 5; d++) for (const [q, r] of ring(0, 0, d)) { const k = q + ',' + r; if (!used.has(k)) slots.push({ q, r }); }
    return { cells, slots };
  }

  function sideHTML() {
    return `<h2>Quatro Nações · ronda ${s.round} de ${RULES.rounds}</h2>
      <ol class="players">${[...s.players].sort((a, b) => b.score - a.score).map(p => { const N = NATIONS[p.nation], terras = Object.values(s.board).filter(c => c.owner === p.id).length;
        return `<li class="${p.id === s.active ? 'act' : ''}"><img class="portrait" src="${portrait(p.nation)}" alt="" style="border-color:${N.color}"><b>${esc(N.name)}</b>${p.kind === 'ai' ? ` <small>(IA ${({ easy: 'fácil', normal: 'normal', hard: 'difícil' })[p.level]})</small>` : ''}
          <span class="pts">${p.score} pts</span><span class="chips"><span class="chip">Terras <b>${terras}</b></span><span class="chip">Última ronda <b>+${p.lastPoints}</b></span></span>
          <small>${esc(N.text)}</small></li>`; }).join('')}</ol>
      <h2>Como se joga</h2><ul class="objs">
      <li>No início do turno recolhes as tropas: fica 1 em cada terra tua; as outras voltam à mão (+1 por Aldeia tua).</li>
      <li>Conquistar custa 2 tropas + as tropas inimigas lá + 1 em Montanha + 1 nas Badlands. O custo está escrito no hexágono.</li>
      <li>A 1.ª conquista é na borda do mapa; as seguintes ao lado das tuas terras. Lagos, só os Espíritos do Gelo.</li>
      <li>No fim do turno ganhas 1 ponto por terra, +2 por lendário (Templo, Vulcão, Cristais) e os bónus da tua nação.</li>
      <li>Quem perde uma terra perde 1 tropa; as outras voltam-lhe para a mão.</li><li>Ao fim de ${RULES.rounds} rondas ganha quem tiver mais pontos.</li></ul>`;
  }

  function guideText() {
    if (isAI()) return `${esc(me().name)} (IA) a jogar…`;
    const own = Object.values(s.board).some(c => c.owner === s.active), T = targets(s).filter(t => t.cost <= s.hand), pts = pointsFor(s, s.active);
    const end = `Se terminares agora, ganhas <b>+${pts} pontos</b> nesta ronda.`;
    if (!tutorial) return `${s.hand} tropas na mão. ${end}`;
    if (!own) return '<b>Começa aqui.</b> Ainda não tens terras: escolhe um hexágono da <b>borda</b> marcado a azul. O número é o custo em tropas. Escolhe terras que valham pontos à tua nação.';
    if (T.length && s.hand >= 2) return `Tens <b>${s.hand} tropas</b>. Continua a conquistar ao lado das tuas terras (azul = consegues pagar; vermelho = falta-te tropas). Cada terra dá pontos em todas as rondas. ${end}`;
    return `Já não dá para mais conquistas. Podes tocar nas tuas terras da fronteira para lhes juntar tropas (defendem-nas), ou carregar em «Terminar turno» (as que sobram vão para a fronteira). ${end}`;
  }

  function render() {
    clearTimeout(timer); if (!s) return;
    view.setBoard(board());
    $('#side').innerHTML = sideHTML();
    $('.panel').classList.remove('over', 'expedition', 'unknown'); $('.panel').classList.add('in-event');
    $('#steps').innerHTML = s.over ? '<span class="on">Fim</span>' : `<span class="on">Ronda ${s.round}/${RULES.rounds}</span>`;
    const N = NATIONS[me().nation];
    const cover = !s.over && humans().length > 1 && !isAI() && revealed !== s.active;
    $('#cover').hidden = !cover;
    if (cover) { $('#cover').innerHTML = `<div class="cover-box"><img class="portrait big" src="${portrait(me().nation)}" alt="" style="border-color:${N.color}"><h2>Vez dos ${esc(N.name)}</h2><p>Passa o aparelho.</p><button class="btn primary" data-na-reveal>Começar o turno</button></div>`; return; }
    if (s.over) {
      const rank = [...s.players].sort((a, b) => b.score - a.score), W = NATIONS[rank[0].nation];
      $('#head').innerHTML = `<img class="portrait" src="${portrait(rank[0].nation)}" alt="" style="border-color:${W.color}"> Vitória dos ${esc(W.name)}!`;
      $('#guide').innerHTML = rank.map((p, i) => `${i + 1}.º ${esc(NATIONS[p.nation].short)} — ${p.score} pontos`).join(' · ');
      $('#tools').innerHTML = '<button class="btn primary" data-na-newgame>Nova partida</button><button class="btn" data-menu>Menu</button>'; $('#msg').textContent = msg; return;
    }
    $('#head').innerHTML = `<img class="portrait" src="${portrait(me().nation)}" alt="" style="border-color:${N.color}"> ${esc(N.name)} · <b>${s.hand}</b> tropas na mão · ${me().score} pontos`;
    $('#guide').innerHTML = guideText();
    $('#tools').innerHTML = isAI() ? '' : `${undo.length ? '<button class="btn" data-na-undo>Desfazer</button>' : ''}<button class="btn primary" data-na-end>Terminar turno</button>`;
    $('#msg').textContent = msg;
    if (isAI()) timer = setTimeout(aiStep, 260);
  }

  function apply(r, keepUndo = true) {
    if (r.error) { msg = r.error; render(); return; }
    if (keepUndo) undo.push(s);
    const prev = s.active; s = r.state;
    if (s.active !== prev) { undo = []; const lt = s.lastTurn; if (lt) msg = `${NATIONS[s.players[lt.player].nation].short}: ${lt.conquered} conquista${lt.conquered === 1 ? '' : 's'}, +${lt.points} pontos.`; if (prev != null && s.players[prev].kind !== 'ai' && s.round >= 2) { tutorial = false; try { store?.setItem(SEEN, '1'); } catch {} } }
    save(); render();
  }
  function aiStep() { if (!s || s.over || !isAI()) return; apply(act(s, aiAction(s)), false); }

  function onHex(h) {
    if (!h || !s || s.over || isAI()) return;
    const k = h.q + ',' + h.r, c = s.board[k]; if (!c) return;
    if (c.owner === s.active) { msg = ''; apply(act(s, { type: 'deploy', k })); return; }
    const cost = conquerCost(s, k);
    if (cost == null) { msg = c.kind === 'lake' ? 'Só os Espíritos do Gelo conquistam Lagos.' : 'Só podes conquistar ao lado das tuas terras (ou na borda, se ainda não tens nenhuma).'; render(); return; }
    msg = `${nameOf(c)} conquistada por ${cost} tropas.`; apply(act(s, { type: 'conquer', k }));
  }

  function onClick(b) {
    const d = b.dataset;
    if (d.naReveal != null) { revealed = s.active; render(); return true; }
    if (d.naUndo != null) { s = undo.pop(); msg = 'Desfeito.'; save(); render(); return true; }
    if (d.naEnd != null) { apply(act(s, { type: 'end' }), false); return true; }
    if (d.naNewgame != null) { openSetup(); return true; }
    if (d.naCount) { const n = +d.naCount; const used = new Set(); draft = Array.from({ length: n }, (_, i) => { const x = draft[i] || { nation: ORDER.find(o => !draft.some(y => y.nation === o)) || ORDER[i], kind: i ? 'normal' : 'human' }; return x; });
      draft.forEach(x => { if (used.has(x.nation)) x.nation = ORDER.find(o => !used.has(o)); used.add(x.nation); }); openSetup(); return true; }
    if (d.naStart != null) { begin(); return true; }
    if (d.naContinue != null) { $('#dialog').hidden = true; render(); fit(); return true; }
    return false;
  }
  function onChange(e) {
    const t = e.target.dataset || {};
    if (t.naKind != null) draft[+t.naKind].kind = e.target.value;
    if (t.naNation != null) { const i = +t.naNation, v = e.target.value, j = draft.findIndex(x => x.nation === v); if (j >= 0 && j !== i) draft[j].nation = draft[i].nation; draft[i].nation = v; openSetup(); }
  }

  function openSetup() {
    const d = $('#dialog'); d.hidden = false;
    d.innerHTML = `<div class="cover-box"><h2>Quatro Nações</h2>
      <p class="hint">Conquista o mapa com as tuas tropas. Sem dados: cada conquista tem um custo certo e escrito no mapa. 8 rondas, cerca de 10 minutos.
      <b>Para jogar sozinho:</b> o teu lugar como Pessoa e os outros como IA. A IA difícil começa com +2 tropas.</p>
      <div class="count">${[2, 3, 4].map(n => `<button class="btn small${draft.length === n ? ' primary' : ''}" data-na-count="${n}">${n} nações</button>`).join('')}</div>
      <div class="names">${draft.map((x, i) => { const N = NATIONS[x.nation]; return `<label><img class="portrait" src="${portrait(x.nation)}" alt="" style="border-color:${N.color}">
        <span style="flex:1;text-align:left"><select data-na-nation="${i}" aria-label="Nação do lugar ${i + 1}">${ORDER.map(o => `<option value="${o}"${o === x.nation ? ' selected' : ''}>${NATIONS[o].name}</option>`).join('')}</select><br><small>${esc(N.text)}</small></span>
        <select data-na-kind="${i}" aria-label="Quem joga">${[['human', 'Pessoa'], ['easy', 'IA fácil'], ['normal', 'IA normal'], ['hard', 'IA difícil']].map(([v, t]) => `<option value="${v}"${x.kind === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`; }).join('')}</div>
      <div class="row-btns"><button class="btn" data-cancel>Cancelar</button><button class="btn primary" data-na-start>Começar</button></div></div>`;
  }
  function begin() {
    if (!draft.some(x => x.kind === 'human')) draft[0].kind = 'human';
    s = createNations({ seed: randomSeed(), players: draft.map(x => ({ nation: x.nation, kind: x.kind === 'human' ? 'human' : 'ai', level: x.kind === 'human' ? null : x.kind })) });
    undo = []; msg = ''; revealed = humans().length === 1 ? humans()[0].id : null;
    try { tutorial = store?.getItem(SEEN) !== '1'; } catch {}
    $('#dialog').hidden = true; save(); render(); fit();
  }
  function start() {
    let saved = null; try { saved = JSON.parse(store?.getItem(SAVE) || 'null'); } catch {}
    if (saved && saved.mode === 'nations' && saved.version === 2 && !saved.over) {
      s = saved; revealed = humans().length === 1 ? humans()[0].id : null; undo = []; msg = '';
      try { tutorial = store?.getItem(SEEN) !== '1'; } catch {}
      const d = $('#dialog'); d.hidden = false;
      d.innerHTML = `<div class="cover-box"><h2>Quatro Nações</h2><p>Tens uma partida a meio (ronda ${s.round} de ${RULES.rounds}).</p><div class="row-btns"><button class="btn" data-na-newgame>Nova partida</button><button class="btn primary" data-na-continue>Continuar</button></div></div>`;
      return;
    }
    openSetup();
  }
  const hasSaved = () => { try { const x = JSON.parse(store?.getItem(SAVE) || 'null'); return !!(x && x.version === 2 && !x.over); } catch { return false; } };
  return { start, render, onHex, onClick, onChange, hasSaved };
}
