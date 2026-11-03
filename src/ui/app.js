// FRONTIER — interface de jogo (etapa 3): Free Frontier no PC e no telemóvel, vários jogadores no mesmo
// aparelho, com ecrã de passagem entre jogadores (protege mão e objectivo privado) e gravação automática.
// Sem acontecimentos activos (etapa 6).
import { loadAtlases, tileStyle } from './assets.js';
import { MapView } from './map-view.js';
import { sound } from './audio.js';
import { randomSeed } from './seed.js';
import { $, esc } from './dom.js';
import { createGame, applyAction, legalActions } from '../core/index.js';
import { emptyFrontier, parseKey } from '../core/rules/placement-a.js';
import { TERRAINS, BIOME_NAMES, RESOURCE_NAMES, RESOURCES } from '../data/terrains.js';
import { SITES } from '../data/sites.js';
import { STRUCTURES } from '../data/structures.js';
import { EVENTS } from '../data/events.js';
import { PUBLIC_OBJECTIVES, PRIVATE_OBJECTIVES } from '../data/objectives.js';
import { ring } from '../core/hex.js';
import { writeSave, listSaves, readSave, deleteSave, exportSave, importSave, newSaveId } from '../storage/saves.js';
import { showDice, hideDice } from './dice.js';
import { helpHTML } from './help.js';

const COLORS = ['#a8321f', '#2c6a97', '#4f6b33', '#c8922e'];
const RES = r => RESOURCE_NAMES[r];
let state = null, view = null, chosen = null, picked = null, discard = null;
let revealed = null, showPriv = false, lastMsg = '';      // revealed = jogador que já recebeu o aparelho
const store = (() => { try { return window.localStorage; } catch { return null; } })();
let currentId = null, busy = false;
const persist = () => { if (store && currentId) writeSave(store, currentId, state); };
const STEP_NAMES = ['Dados', 'Colocar', 'Acções', 'Repor'];
const STEP_INDEX = { roll: 0, caravan: 0, place: 1, actions: 2, stones: 2, refill: 3, limit: 3 };
const needsCover = () => state && state.phase !== 'over' && state.active != null && revealed !== state.active;

function newGame(names) {
  state = createGame({ seed: randomSeed(), players: names.map((n, i) => ({ name: n.trim() || 'Jogador ' + (i + 1), color: COLORS[i] })) });
  chosen = picked = discard = null; revealed = null; lastMsg = ''; currentId = newSaveId(); hideDice();
  $('#dialog').hidden = true; persist(); render(); fit();
}
function resume(saved) {
  state = saved.state; currentId = saved.id; hideDice(); chosen = picked = discard = null; revealed = null; lastMsg = '';
  $('#dialog').hidden = true; render(); fit();
}
function fit() {
  const top = $('.topbar').getBoundingClientRect().bottom, bottom = innerHeight - $('.panel').getBoundingClientRect().top;
  view.fitAll(top, bottom);
}

// Ecrã de nova partida: número de jogadores e nomes.
let draftNames = ['Jogador 1', 'Jogador 2'];
function openNewGame() {
  const d = $('#dialog'); d.hidden = false;
  d.innerHTML = `<div class="cover-box"><h2>Nova partida</h2><p class="hint">Free Frontier · 2 a 4 jogadores no mesmo aparelho</p>
    <div class="count">${[2, 3, 4].map(n => `<button class="btn small${draftNames.length === n ? ' primary' : ''}" data-count="${n}">${n} jogadores</button>`).join('')}</div>
    <div class="names">${draftNames.map((n, i) => `<label><i style="background:${COLORS[i]}"></i><input data-name="${i}" value="${esc(n)}" maxlength="16" aria-label="Nome do jogador ${i + 1}"></label>`).join('')}</div>
    ${state && state.phase !== 'over' ? '<p class="warn">A partida em curso será substituída.</p>' : ''}
    <div class="row-btns"><button class="btn" data-cancel>Cancelar</button><button class="btn primary" data-start>Começar</button></div></div>`;
}
// Menu: partidas guardadas (continuar, exportar, apagar), importar, nova partida, como jogar.
function openMenu(note = '') {
  const d = $('#dialog'); d.hidden = false;
  const saves = store ? listSaves(store) : [];
  const when = iso => new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
  d.innerHTML = `<div class="cover-box"><h2>FRONTIER</h2>
    <div class="row-btns"><button class="btn primary" data-open-new>Nova partida</button><button class="btn" data-help>Como jogar</button>${state ? '<button class="btn" data-cancel>Voltar ao jogo</button>' : ''}</div>
    ${note ? `<p class="warn">${esc(note)}</p>` : ''}
    <h3>Partidas guardadas</h3>
    ${saves.length ? `<ul class="saves">${saves.map(g => `<li${g.id === currentId ? ' class="cur"' : ''}><div><b>${g.players.map(esc).join(', ')}</b><small>${esc(g.where)} · ${esc(when(g.savedAt))}</small></div>
      <span><button class="btn small primary" data-load="${g.id}">${g.over ? 'Ver' : 'Continuar'}</button><button class="btn small" data-export="${g.id}">Exportar</button><button class="btn small" data-del="${g.id}">Apagar</button></span></li>`).join('')}</ul>`
      : '<p class="hint">Ainda não há partidas guardadas.</p>'}
    <div class="row-btns"><label class="btn small">Importar ficheiro<input type="file" accept=".json,application/json" data-import hidden></label></div>
    <p class="hint">As partidas gravam-se sozinhas neste aparelho. Para continuar noutro, exporta aqui e importa lá.</p></div>`;
}

function act(a) {
  const before = state;
  const r = applyAction(state, a);
  if (!r.ok) { sound.play('error'); $('#msg').textContent = r.error; return; }
  state = r.state; lastMsg = describe(before, a);
  persist();
  if (a.type === 'roll') {           // o motor já lançou; a animação mostra esse resultado
    busy = true;
    showDice(state.turn.dice).then(() => { busy = false; finishAct(a); });
    return;
  }
  finishAct(a);
}
function finishAct(a) {
  $('#msg').textContent = lastMsg;
  sound.play(['setupPlace', 'place', 'expand', 'build'].includes(a.type) ? 'place' : 'card');
  const p = state.players[state.active];
  if (!p?.hand.includes(chosen)) chosen = null;
  picked = null; if (state.step !== 'limit') discard = null;
  render();
  if (['setupPlace', 'place', 'expand'].includes(a.type)) fit();
}

// Frase curta sobre o que acabou de acontecer.
function describe(before, a) {
  const name = before.players[a.player]?.name;
  if (a.type === 'roll') {
    const dice = (state.turn?.dice || []).join(' + ');
    const sum = (state.turn?.dice || []).reduce((x, y) => x + y, 0);
    if (sum === 7) return `${name} lançou ${dice} = 7: Caravana. Ninguém produz.`;
    const got = (state.turn?.produced || []).map(g => `${state.players[g.owner].name} ${Object.entries(g.gain).map(([r, n]) => '+' + n + ' ' + RES(r)).join(', ')}`);
    return `${name} lançou ${dice} = ${sum}. ` + (got.length ? got.join('; ') + '.' : 'Ninguém produz.');
  }
  const pts = state.players[a.player].score - before.players[a.player].score;
  return pts > 0 ? `${name}: +${pts} pontos.` : '';
}

function boardView() {
  const cells = [], used = new Set();
  const legal = new Set();
  const step = state.phase === 'setup' ? 'setup' : state.step;
  if (step === 'setup' || step === 'place') emptyFrontier(state).forEach(k => legal.add(k));
  if (step === 'actions' && chosen) legalActions(state).filter(a => a.type === 'expand' && a.card === chosen).forEach(a => legal.add(a.q + ',' + a.r));
  for (const [k, c] of Object.entries(state.board)) {
    const [q, r] = parseKey(k); used.add(k);
    const mark = picked === k ? '#c8922e' : null;
    if (c.kind === 'site') cells.push({ q, r, atlas: 'greenlands', tile: SITES[c.site].tile, flag: c.explored != null ? state.players[c.explored].color : null, mark });
    else if (c.kind === 'lake') cells.push({ q, r, atlas: c.biome, tile: 'lake', mark });
    else cells.push({ q, r, atlas: c.biome, tile: c.structure ? STRUCTURES[c.structure].tile : TERRAINS[c.terrain].tile,
      rot: c.structure ? 0 : (c.rot || 0) * Math.PI / 3, color: c.owner != null ? state.players[c.owner].color : null, token: c.token, mark });
  }
  const R = Math.max(4, ...[...used].map(k => { const [q, r] = parseKey(k); return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2 + 2; }));
  const slots = [];
  for (let d = 1; d <= R; d++) for (const [q, r] of ring(0, 0, d)) { const k = q + ',' + r; if (!used.has(k)) slots.push({ q, r, legal: legal.has(k) }); }
  return { cells, slots };
}

const cardHTML = (id, extra = '') => {
  const c = state.cards[id], t = TERRAINS[c.terrain], tok = state.tokens[id];
  return `<button class="card${id === chosen ? ' on' : ''}" data-card="${id}" ${extra}>
    <span class="art" style="${tileStyle(c.biome, t.tile, 76)}"></span>
    <span class="tok${tok === 6 || tok === 8 ? ' hot' : ''}">${tok ?? ''}</span>
    <span class="nm">${esc(t.name)}</span><span class="bi">${esc(BIOME_NAMES[c.biome])}</span></button>`;
};
const btn = (label, a, cls = '') => `<button class="btn small ${cls}" data-act='${esc(JSON.stringify(a))}'>${esc(label)}</button>`;
const resText = r => Object.entries(r).filter(([, n]) => n).map(([k, n]) => `${n} ${RES(k)}`).join(' + ') || 'grátis';

function sideHTML() {
  const s = state;
  const players = s.order.map(pid => { const p = s.players[pid];
    return `<li class="${pid === s.active ? 'act' : ''}"><i style="background:${p.color}"></i><b>${esc(p.name)}</b> <span class="pts">${p.score} pts</span>
      <span class="chips">${RESOURCES.map(r => `<span class="chip r-${r}" title="${RES(r)}">${RES(r)} <b>${p.resources[r]}</b></span>`).join('')}</span></li>`; }).join('');
  const objs = s.publicObjectives.map(o => { const d = PUBLIC_OBJECTIVES[o.id];
    const who = [...o.first.map(pid => `${s.players[pid].name} (5)`), ...o.second.map(pid => `${s.players[pid].name} (2)`)].join(', ');
    return `<li><b>${esc(d.name)}</b>: ${esc(d.desc)}${who ? ` <em>${esc(who)}</em>` : ''}</li>`; }).join('');
  const p = s.players[s.active];
  let priv = '';
  if (p && p.private && revealed === s.active) priv = showPriv
    ? `<p class="priv"><b>O teu objectivo privado:</b> ${esc(PRIVATE_OBJECTIVES[p.private].name)} — ${esc(PRIVATE_OBJECTIVES[p.private].desc)} (4 pts no fim) <button class="btn small" data-priv>Esconder</button></p>`
    : `<p class="priv"><button class="btn small" data-priv>Ver o meu objectivo privado</button></p>`;
  return `<ol class="players">${players}</ol><h2>Objectivos públicos (5 / 2)</h2><ul class="objs">${objs}</ul>${priv}`;
}

function finalHTML() {
  const f = state.final, s = state;
  const rows = f.ranking.map((pid, i) => { const r = f.rows[pid], p = s.players[pid], pt = p.points;
    return `<tr${i === 0 ? ' class="win"' : ''}><td>${i + 1}.º</td><td><i style="background:${p.color}"></i>${esc(p.name)}</td>
      <td>${pt.milestones || 0}</td><td>${pt.structures || 0}</td><td>${pt.sites || 0}</td><td>${pt.objectives || 0}</td>
      <td>${r.regions}</td><td>${r.private}</td><td>${r.hardLand}</td><td>${r.leftovers}</td><td><b>${r.total}</b></td></tr>`; }).join('');
  return `<p class="head">Fim da partida · venceu ${esc(s.players[f.winner].name)}</p>
    <div class="scroll"><table class="score"><thead><tr><th></th><th>Jogador</th><th>Marcos</th><th>Estruturas</th><th>Locais</th><th>Objectivos</th>
    <th>Regiões</th><th>Privado</th><th>Terra difícil</th><th>Sobras</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="hint">Objectivos privados: ${f.ranking.map(pid => { const p = s.players[pid];
      return `${esc(p.name)} — ${esc(PRIVATE_OBJECTIVES[p.private].name)} ${f.rows[pid].private ? '(cumprido)' : '(não cumprido)'}`; }).join(' · ')}</p>
    <p class="hint">Desempate: mais estruturas, depois mais recursos, depois quem joga mais tarde.</p>
    <div class="row-btns"><button class="btn primary" data-open-new>Nova partida</button></div>`;
}

// Opções para o hexágono escolhido no passo das acções (construir, explorar).
function hexOptions(k) {
  const [q, r] = parseKey(k);
  const L = legalActions(state).filter(a => (a.type === 'build' || a.type === 'explore') && a.q === q && a.r === r);
  if (!L.length) return '<span class="hint">Nada a fazer neste hexágono.</span>';
  return L.map(a => a.type === 'build'
    ? btn(`Construir ${STRUCTURES[a.structure].name} (${resText(STRUCTURES[a.structure].cost)}, +${a.structure === 'castle' ? 3 : STRUCTURES[a.structure].points} pts)`, a)
    : btn(`Explorar ${SITES[state.board[k].site].name} (2 Provisões${a.take ? ', recebe ' + a.take.map(RES).join(' + ') : ''})`, a)).join('');
}

function coverHTML() {
  const p = state.players[state.active];
  const where = state.phase === 'setup' ? 'Preparação' : `Ronda ${state.round} de ${state.maxRounds}`;
  return `<div class="cover-box"><i class="dot" style="background:${p.color}"></i><p class="hint">${where}</p><h2>Vez de ${esc(p.name)}</h2>
    <p>Passa o aparelho a ${esc(p.name)}. A mão e o objectivo privado só aparecem depois de tocar no botão.</p>
    ${lastMsg ? `<p class="last">Última jogada: ${esc(lastMsg)}</p>` : ''}
    <button class="btn primary" data-reveal>Sou ${esc(p.name)} — mostrar</button></div>`;
}

function stepsHTML() {
  if (state.phase === 'setup') return '<span class="on">Preparação</span>';
  if (state.phase !== 'turn') return '<span class="on">Pontuação final</span>';
  const i = STEP_INDEX[state.step];
  return STEP_NAMES.map((n, k) => `<span class="${k === i ? 'on' : k < i ? 'done' : ''}">${k + 1}. ${n}</span>`).join('');
}

function render() {
  const covered = needsCover();
  $('#cover').hidden = !covered;
  if (covered) $('#cover').innerHTML = coverHTML();
  view.setBoard(boardView());
  $('#side').innerHTML = sideHTML();
  $('#steps').innerHTML = stepsHTML();
  const s = state, p = s.players[s.active];
  let head = '', tools = '', handBtns = 'disabled';
  const diceTxt = s.turn?.dice ? ` · dados ${s.turn.dice[0]} + ${s.turn.dice[1]} = ${s.turn.dice[0] + s.turn.dice[1]}` : '';
  if (s.phase === 'setup') {
    head = `Preparação · ${esc(p.name)} coloca a carta que tirou`;
    $('#hand').innerHTML = covered ? '' : cardHTML(s.setup.card, 'disabled');
    tools = '<span class="hint">Toca num hexágono marcado.</span>';
  } else if (s.phase === 'turn') {
    head = `Ronda ${s.round} de ${s.maxRounds} · ${esc(p.name)}${diceTxt}`;
    const L = legalActions(s);
    if (s.step === 'roll') tools = btn('Lançar os dados', { type: 'roll', player: s.active }, 'primary');
    if (s.step === 'caravan') tools = '<span class="hint">Saiu 7 (Caravana). Escolhe:</span>' + L.map(a => btn(a.option === 'trade' ? 'Trocas a 2 por 1 neste turno' : '+1 ' + RES(a.resource), a)).join('');
    if (s.step === 'place') { handBtns = ''; tools = p.hand.length ? '<span class="hint">Escolhe uma carta e toca num hexágono marcado.</span>' : btn('Turno sem colocação', { type: 'skipPlace', player: s.active }); }
    if (s.step === 'actions') {
      handBtns = L.some(a => a.type === 'expand') ? '' : 'disabled';
      const trades = L.filter(a => a.type === 'trade');
      const rate = s.turn.caravan === 'trade' ? 2 : 3;
      tools = `<span class="hint">Construções ${s.turn.builds}/2 · toca num terreno teu para construir ou num local para explorar${handBtns ? '' : ' · escolhe uma carta para a Expansão (2 Madeira + 2 Provisões)'}.</span>`
        + (picked ? `<div class="opts">${hexOptions(picked)}</div>` : '')
        + (trades.length ? `<div class="opts"><span class="hint">Trocar ${rate} por 1:</span>${trades.map(a => btn(`${RES(a.give)} → ${RES(a.get)}`, a)).join('')}</div>` : '')
        + btn('Terminar acções e repor a mão', { type: 'endActions', player: s.active }, 'primary');
    }
    if (s.step === 'stones') {
      tools = '<span class="hint">Círculo de pedras: só tu vês estas cartas do topo do baralho de acontecimentos. Escolhe a ordem (a primeira fica no topo):</span>'
        + L.map(a => btn(a.order.map(id => EVENTS[id].name).join(' → '), a)).join('');
    }
    if (s.step === 'refill') tools = btn(`Tirar do baralho (${s.deck.length})`, { type: 'drawDeck', player: s.active }) + '<span class="hint">ou toca numa carta do mercado (1 Provisão)</span>';
    if (s.step === 'limit') {
      const over = Object.values(p.resources).reduce((a, b) => a + b, 0) - s.balance.resourceCap;
      discard = discard || { wood: 0, stone: 0, food: 0 };
      const left = over - Object.values(discard).reduce((a, b) => a + b, 0);
      tools = `<span class="hint">Tens mais de 10 recursos: devolve ${over} (faltam ${left}).</span>`
        + RESOURCES.map(r => `<span class="stepper">${RES(r)} ${discard[r]} <button class="btn small" data-dis="${r}" ${discard[r] >= p.resources[r] || left <= 0 ? 'disabled' : ''}>+</button><button class="btn small" data-undis="${r}" ${discard[r] ? '' : 'disabled'}>−</button></span>`).join('')
        + (left === 0 ? btn('Devolver', { type: 'discard', player: s.active, give: discard }, 'primary') : '');
    }
    $('#hand').innerHTML = covered ? '' : p.hand.map(id => cardHTML(id, handBtns)).join('') || '<span class="hint">Sem cartas na mão.</span>';
    if (covered) tools = '';
  } else {
    $('#hand').innerHTML = '';
  }
  $('#head').innerHTML = head;
  $('#tools').innerHTML = s.phase === 'over' ? finalHTML() : tools;
  $('#market').innerHTML = s.market.map(id => cardHTML(id, s.phase === 'turn' && s.step === 'refill' && p.resources.food >= 1 ? 'data-buy="1"' : 'disabled')).join('');
  $('.panel').classList.toggle('over', s.phase === 'over');
}

function onHex(h) {
  if (!h) return;
  const s = state, k = h.q + ',' + h.r;
  if (s.phase === 'setup') return act({ type: 'setupPlace', player: s.active, q: h.q, r: h.r, rot: 0 });
  if (s.phase !== 'turn') return;
  const p = s.players[s.active];
  if (s.step === 'place') {
    const card = chosen || (p.hand.length === 1 ? p.hand[0] : null);
    if (!card) { $('#msg').textContent = 'Escolhe primeiro uma carta da mão.'; return; }
    return act({ type: 'place', player: s.active, card, q: h.q, r: h.r, rot: 0 });
  }
  if (s.step === 'actions') {
    if (chosen && !s.board[k]) return act({ type: 'expand', player: s.active, card: chosen, q: h.q, r: h.r, rot: 0 });
    picked = s.board[k] ? k : null; render();
  }
}

function bind() {
  document.addEventListener('click', e => {
    sound.unlock();
    const b = e.target.closest('button'); if (!b || b.disabled || busy) return;
    if (b.dataset.menu != null) return openMenu();
    if (b.dataset.help != null) { $('#help').innerHTML = helpHTML(); $('#help').hidden = false; return; }
    if (b.dataset.closeHelp != null) { $('#help').hidden = true; return; }
    if (b.dataset.load) { const g = readSave(store, b.dataset.load); return g ? resume(g) : openMenu('Não foi possível abrir essa gravação.'); }
    if (b.dataset.del) { if (confirm('Apagar esta partida guardada?')) { deleteSave(store, b.dataset.del); if (b.dataset.del === currentId) { currentId = null; state = null; } openMenu(); } return; }
    if (b.dataset.export) {
      const txt = exportSave(store, b.dataset.export); if (!txt) return openMenu('Não foi possível exportar.');
      const url = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
      const link = Object.assign(document.createElement('a'), { href: url, download: `frontier-${new Date().toISOString().slice(0, 10)}.json` });
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    if (b.dataset.act) return act(JSON.parse(b.dataset.act));
    if (b.dataset.buy) return act({ type: 'buyMarket', player: state.active, card: b.dataset.card });
    if (b.dataset.card) { chosen = chosen === b.dataset.card ? null : b.dataset.card; picked = null; render(); return; }
    if (b.dataset.dis) { discard[b.dataset.dis]++; render(); return; }
    if (b.dataset.undis) { discard[b.dataset.undis]--; render(); return; }
    if (b.dataset.reveal != null) { revealed = state.active; showPriv = false; render(); return; }
    if (b.dataset.priv != null) { showPriv = !showPriv; render(); return; }
    if (b.dataset.side != null) { $('#side').classList.toggle('open'); return; }
    if (b.dataset.openNew != null) { draftNames = state ? state.players.map(p => p.name) : draftNames; openNewGame(); return; }
    if (b.dataset.count) { const n = +b.dataset.count; draftNames = Array.from({ length: n }, (_, i) => draftNames[i] || 'Jogador ' + (i + 1)); openNewGame(); return; }
    if (b.dataset.start != null) return newGame(draftNames);
    if (b.dataset.cancel != null) { if (state) $('#dialog').hidden = true; else openMenu(); return; }
  });
  document.addEventListener('change', async e => {
    if (e.target.dataset?.import == null || !e.target.files[0]) return;
    const r = importSave(store, await e.target.files[0].text());
    if (r.error) return openMenu(r.error);
    resume(readSave(store, r.id));
  });
  document.addEventListener('input', e => { const i = e.target.dataset?.name; if (i != null) draftNames[+i] = e.target.value; });
  const mb = $('#music');
  const setMusic = on => { mb.setAttribute('aria-pressed', on); mb.textContent = on ? 'Música: ligada' : 'Música: desligada'; try { localStorage.setItem('frontier.music', on ? '1' : '0'); } catch {} };
  mb.addEventListener('click', () => { const on = mb.getAttribute('aria-pressed') !== 'true'; on ? sound.startMusic() : sound.stopMusic(); setMusic(on); });
  let saved = '0'; try { saved = localStorage.getItem('frontier.music') ?? '0'; } catch {}
  setMusic(false);
  if (saved === '1') document.addEventListener('pointerdown', () => { sound.startMusic(); setMusic(true); }, { once: true });
}

async function start() {
  try { await loadAtlases(); }
  catch (e) { $('#head').textContent = e.message + '. Abre o jogo através de um servidor local (ver README).'; return; }
  view = new MapView($('#map'), { onSelect: onHex });
  bind();
  if (store && listSaves(store).length) openMenu(); else openNewGame();
  if (location.hash === '#debug') window.FRONTIER = { get state() { return state; }, set state(v) { state = v; render(); }, view, act };
}
start();
