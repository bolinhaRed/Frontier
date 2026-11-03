// FRONTIER — interface de jogo (etapa 3): Free Frontier no PC e no telemóvel, vários jogadores no mesmo
// aparelho, com ecrã de passagem entre jogadores (protege mão e objectivo privado) e gravação automática.
// Sem acontecimentos activos (etapa 6).
import { loadAtlases, tileStyle, artStyle } from './assets.js';
import { MapView } from './map-view.js';
import { sound } from './audio.js';
import { randomSeed } from './seed.js';
import { $, esc } from './dom.js';
import { createGame, applyAction, legalActions, currentPlayer } from '../core/index.js';
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
import { worldBoard, worldSideHTML, territoryHTML, territoryAt } from './world.js';
import { loadCampaign, saveCampaign, recordResult, takeRelic, toggleRelic, borderFor, territory } from '../storage/campaign.js';
import { buildScenario } from '../core/scenario.js';
import { RELICS, CHALLENGE_TEXT } from '../data/territories.js';
import { CHALLENGE_CHECKS } from '../core/rules/solo.js';

const COLORS = ['#a8321f', '#2c6a97', '#4f6b33', '#c8922e'];
const RES = r => RESOURCE_NAMES[r];
let state = null, view = null, chosen = null, picked = null, discard = null;
let revealed = null, showPriv = false, lastMsg = '', lastShown = '';      // revealed = jogador que já recebeu o aparelho
const store = (() => { try { return window.localStorage; } catch { return null; } })();
let currentId = null, busy = false, mode = 'game', camp = null, selT = null;
const persist = () => { if (store && currentId) writeSave(store, currentId, state); };
const STEP_NAMES = ['Dados', 'Colocar', 'Acções', 'Repor'];
const STEP_INDEX = { roll: 0, caravan: 0, place: 1, actions: 2, stones: 2, refill: 3, limit: 3 };
const who = () => currentPlayer(state);   // quem decide agora (no acontecimento, quem escolhe)
const needsCover = () => mode === 'game' && state && state.players.length > 1 && state.phase !== 'over' && who() != null && revealed !== who();

function newGame(names) {
  state = createGame({ seed: randomSeed(), players: names.map((n, i) => ({ name: n.trim() || 'Jogador ' + (i + 1), color: COLORS[i] })) });
  chosen = picked = discard = null; revealed = null; lastMsg = ''; currentId = newSaveId(); hideDice(); mode = 'game';
  $('#dialog').hidden = true; persist(); render(); fit(); intro();
}
function resume(saved) {
  state = saved.state; currentId = saved.id; hideDice(); mode = 'game'; chosen = picked = discard = null; revealed = state.players.length === 1 ? 0 : null; lastMsg = '';
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
    <div class="row-btns"><button class="btn primary" data-world>Campanha Solo</button><button class="btn" data-open-new>Partida de 2 a 4 jogadores</button></div>
    <div class="row-btns"><button class="btn small" data-help>Como jogar</button>${tips ? '' : '<button class="btn small" data-tips-on>Mostrar dicas</button>'}${state && mode === 'game' ? '<button class="btn small" data-cancel>Voltar ao jogo</button>' : ''}</div>
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
  const doable = new Set(step === 'actions' && !chosen && !needsCover() ? legalActions(state).filter(a => a.type === 'build' || a.type === 'explore').map(a => a.q + ',' + a.r) : []);
  for (const [k, c] of Object.entries(state.board)) {
    const [q, r] = parseKey(k); used.add(k);
    const mark = picked === k ? '#c8922e' : doable.has(k) ? '#3f7a3a' : null;
    if (c.kind === 'site') cells.push({ q, r, atlas: 'greenlands', tile: SITES[c.site].tile, flag: c.explored != null ? state.players[c.explored].color : null, mark });
    else if (c.kind === 'lake') cells.push({ q, r, atlas: c.biome, tile: 'lake', mark });
    else if (c.kind === 'deadtrees' || c.kind === 'volcano') cells.push({ q, r, atlas: c.biome, tile: c.kind === 'volcano' ? 'vulcano' : 'deadtrees', color: c.owner != null ? state.players[c.owner].color : null, token: c.token, mark });
    else cells.push({ q, r, atlas: c.biome, tile: c.structure ? STRUCTURES[c.structure].tile : TERRAINS[c.terrain].tile,
      rot: c.structure ? 0 : (c.rot || 0) * Math.PI / 3, color: c.owner != null ? state.players[c.owner].color : null, token: c.token,
      mark: mark || (c.blocks && Object.keys(c.blocks).length ? '#5d5a55' : null) });
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
  if (state.solo) return soloFinalHTML();
  const f = state.final, s = state;
  const rows = f.ranking.map((pid, i) => { const r = f.rows[pid], p = s.players[pid], pt = p.points;
    return `<tr${i === 0 ? ' class="win"' : ''}><td>${i + 1}.º</td><td><i style="background:${p.color}"></i>${esc(p.name)}</td>
      <td>${pt.milestones || 0}</td><td>${pt.structures || 0}</td><td>${pt.sites || 0}</td><td>${pt.objectives || 0}</td>
      <td>${r.regions}</td><td>${r.private}</td><td>${r.hardLand}</td><td>${r.leftovers}</td><td>${r.volcano}</td><td>${pt.events || 0}</td><td><b>${r.total}</b></td></tr>`; }).join('');
  return `<p class="head">Fim da partida · venceu ${esc(s.players[f.winner].name)}</p>
    <div class="scroll"><table class="score"><thead><tr><th></th><th>Jogador</th><th>Marcos</th><th>Estruturas</th><th>Locais</th><th>Objectivos</th>
    <th>Regiões</th><th>Privado</th><th>Terra difícil</th><th>Sobras</th><th>Vulcão</th><th>Acont.</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></div>
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

// Etiqueta de cada opção de acontecimento.
function optionLabel(id, a) {
  const R = r => RES(r);
  const L = {
    wildfire: { A: 'Pagar 2 Provisões', B: 'Deixar arder (+2 Madeira)' },
    creatures: { A: 'Pagar 1 Pedra', B: 'Não pagar (não produzem 2 rondas)' },
    storm: { A: 'Pagar 1 Madeira', B: 'Não pagar (não produzem 2 rondas)' },
    ruins: { A: '+1 Provisão', B: 'Explorar estas Ruínas por 1 Provisão' },
    vein: { A: '+2 Pedra', B: '+1 Pedra por Serra que produza (2 rondas)' },
    volcano: { A: '+3 Pedra', B: '+1 ponto no fim por vizinho ocupado' },
  };
  if (id === 'winter') return `Pagar ${a.amount} Provisões`;
  if (id === 'fog') return a.option === 'B' ? '+1 Provisão' : `Trocar ${TERRAINS[state.cards[a.card].terrain].name} (${state.tokens[a.card]}) pela carta do topo`;
  if (id === 'merchants') return a.option === 'A' ? `+1 ${R(a.resource)}` : `Trocar 2 ${R(a.give)} por 1 ${R(a.get)}`;
  if (id === 'harvest') return { plain: 'Planície', forest: 'Floresta e Bosque', range: 'Serra', water: 'Águas' }[a.family];
  return L[id]?.[a.option] || a.option;
}
function eventDetail(ev, pid) {
  const t = ev.targets[pid]; if (!t) return '';
  if (ev.id === 'winter') return `<p class="hint">Custo para ti: ${t.cost} Provisões.</p>`;
  if (t.hexes) return `<p class="hint">Terrenos afectados: ${t.hexes.length} (marcados no mapa).</p>`;
  return '';
}

// Primeira partida neste aparelho: resumo de um turno em 4 passos.
function intro() {
  let seen = false; try { seen = localStorage.getItem('frontier.intro') === '1'; } catch {}
  tips = tips || !seen;
  if (seen) return;
  const d = $('#dialog'); d.hidden = false;
  d.innerHTML = `<div class="cover-box help"><h2>Como se joga</h2>
    <p>Constróis um território com hexágonos de terreno. Cada terreno tem um número; quando esse número sai nos dados, o terreno dá-te um recurso: <b>Madeira</b>, <b>Pedra</b> ou <b>Provisões</b>. Com os recursos constróis e exploras, e isso dá pontos.</p>
    <ol><li><b>Dados</b>: lança; os terrenos com esse número produzem.</li>
    <li><b>Colocar</b>: põe 1 terreno da mão ao lado de outro.</li>
    <li><b>Acções</b>: constrói, explora, troca — o jogo marca no mapa o que podes fazer.</li>
    <li><b>Repor</b>: volta a ter 3 cartas na mão.</li></ol>
    <p>Em cada passo aparece uma dica por baixo do título do painel. Tens as regras completas em «Como jogar».</p>
    <div class="row-btns"><button class="btn primary" data-intro>Percebi, vamos jogar</button></div></div>`;
}

// ---------- Campanha Solo ----------
function openWorld() {
  camp = store ? loadCampaign(store) : loadCampaign({ getItem: () => null });
  mode = 'world'; $('#dialog').hidden = true; hideDice();
  if (selT == null) selT = 1;
  renderWorld(); view.fitAll(80, innerHeight - $('.panel').getBoundingClientRect().top);
}
function renderWorld() {
  $('#cover').hidden = true;
  view.setBoard(worldBoard(camp, selT, COLORS[0]));
  $('#side').innerHTML = worldSideHTML(camp, esc);
  $('#steps').innerHTML = '<span class="on">Mundo</span>';
  const t = selT ? territory(selT) : null;
  $('#head').innerHTML = t ? esc(t.name) : 'Campanha Solo';
  $('#tools').innerHTML = territoryHTML(camp, t, esc, artStyle);
  $('#hand').innerHTML = ''; $('#market').innerHTML = ''; $('#msg').textContent = '';
  $('.panel').classList.add('in-event'); $('.panel').classList.remove('over');
}
function startSolo(id) {
  const t = territory(id);
  const scenario = buildScenario(t, camp.relics.equipped, borderFor(camp, t));
  state = createGame({ seed: randomSeed(), players: [{ name: 'Tu', color: COLORS[0] }], scenario });
  chosen = picked = discard = null; revealed = 0; lastMsg = ''; currentId = newSaveId(); mode = 'game';
  persist(); render(); fit(); intro();
}
function soloSideHTML() {
  const s = state, so = s.solo, p = s.players[0];
  const done = so.achievedRound != null;
  return `<ol class="players"><li class="act"><i style="background:${p.color}"></i><b>${esc(so.name)}</b> <span class="pts">${p.score} pts</span>
    <span class="chips">${RESOURCES.map(r => `<span class="chip r-${r}" title="${RES(r)}">${RES(r)} <b>${p.resources[r]}</b></span>`).join('')}</span></li></ol>
    <h2>Objectivo do território</h2><p class="${done ? 'ok' : ''}">${done ? '✔ ' : ''}${esc(so.main.text)}</p>
    <h2>Desafios (+1 estrela cada)</h2><ul class="objs">${so.challenges.map(c => `<li>${esc(CHALLENGE_TEXT[c.id](c))}</li>`).join('')}</ul>
    ${so.relics.length ? `<h2>Relíquias</h2><ul class="objs">${so.relics.map(id => `<li><b>${esc(RELICS[id].name)}</b>: ${esc(RELICS[id].text)}</li>`).join('')}</ul>` : ''}`;
}
function soloFinalHTML() {
  const res = state.final.solo, so = state.solo;
  if (camp == null) camp = loadCampaign(store);
  camp.recorded = camp.recorded || [];
  if (!camp.recorded.includes(currentId)) { recordResult(camp, state); camp.recorded.push(currentId); saveCampaign(store, camp); }
  const st = '★'.repeat(res.stars) + '☆'.repeat(3 - res.stars);
  const offer = res.won && camp.offer ? `<p><b>Escolhe uma relíquia:</b></p><div class="opts">${camp.offer.map(id => `<button class="btn small" data-relic="${id}">${esc(RELICS[id].name)} — ${esc(RELICS[id].text)}</button>`).join('')}</div>` : '';
  return `<p class="head">${esc(so.name)} · ${res.won ? 'território conquistado' : 'objectivo não cumprido'} <span class="stars">${st}</span></p>
    <ul class="objs"><li>${res.won ? '✔' : '✘'} ${esc(so.main.text)}</li>${so.challenges.map((c, i) => `<li>${res.challenges[i] ? '✔' : '✘'} ${esc(CHALLENGE_TEXT[c.id](c))}</li>`).join('')}</ul>
    <p class="hint">${state.final.rows[0].total} pontos.${res.won ? ' O território fica no mapa do mundo tal como o deixaste.' : ' Podes tentar de novo: o território muda a cada tentativa.'}</p>
    ${offer}
    <div class="row-btns"><button class="btn primary" data-world>Voltar ao mundo</button><button class="btn" data-go="${so.territory}">Tentar de novo</button></div>`;
}

function coverHTML() {
  const p = state.players[who()];
  const where = state.event ? `Acontecimento: ${EVENTS[state.event.id].name}` : state.phase === 'setup' ? 'Preparação' : `Ronda ${state.round} de ${state.maxRounds}`;
  return `<div class="cover-box"><i class="dot" style="background:${p.color}"></i><p class="hint">${where}</p><h2>Vez de ${esc(p.name)}</h2>
    <p>Passa o aparelho a ${esc(p.name)}. A mão e o objectivo privado só aparecem depois de tocar no botão.</p>
    ${lastMsg ? `<p class="last">Última jogada: ${esc(lastMsg)}</p>` : ''}
    <button class="btn primary" data-reveal>Sou ${esc(p.name)} — mostrar</button></div>`;
}

// Dica do passo actual: o que fazer agora e porquê, em linguagem simples.
let tips = true;
try { tips = localStorage.getItem('frontier.tips') !== '0'; } catch {}
function guideHTML() {
  const s = state; if (!s || !tips || needsCover()) return '';
  const off = ' <button class="link" data-tips>Esconder dicas</button>';
  if (s.event) return '<b>Acontecimento.</b> Lê o cartão e escolhe uma opção. Os efeitos «não produzem» duram 2 rondas.' + off;
  if (s.phase === 'over') return '';
  if (s.phase === 'setup') return '<b>Preparação.</b> Toca num hexágono marcado para pôr este terreno. Cada terreno produz quando sair o número dele nos dados. Terrenos da mesma família lado a lado formam regiões, que dão pontos.' + off;
  const L = legalActions(s);
  const T = {
    roll: '<b>Passo 1 de 4 — dados.</b> Carrega em «Lançar os dados». Todos os terrenos com o número que sair produzem para o dono: Planície, Lago e Rio dão Provisões; Floresta e Bosque, Madeira; Colinas e Montanhas, Pedra.',
    caravan: '<b>Saiu 7.</b> Ninguém produz. Escolhe 1 recurso, ou trocas mais baratas neste turno (2 por 1 em vez de 3 por 1).',
    place: '<b>Passo 2 de 4 — colocar.</b> Escolhe uma carta da mão e toca num hexágono marcado. O número na carta é o que a faz produzir: 6 e 8 saem muito, 2 e 12 quase nunca. Juntar terrenos da mesma família faz crescer regiões (3, 5, 7… terrenos dão pontos).',
    stones: '<b>Círculo de pedras.</b> Escolhe a ordem dos próximos acontecimentos. Só tu vês estas cartas.',
    refill: '<b>Passo 4 de 4 — repor a mão.</b> Tira do baralho (grátis, carta surpresa) ou toca numa carta do mercado (vês o terreno e o número; custa 1 Provisão).',
    limit: '<b>Demasiados recursos.</b> No fim do teu turno só podes guardar 10. Escolhe quais devolves.',
  };
  if (s.step !== 'actions') return (T[s.step] || '') + off;
  const builds = [...new Set(L.filter(a => a.type === 'build').map(a => STRUCTURES[a.structure].name))];
  const can = [];
  if (builds.length) can.push('construir ' + builds.join(', '));
  if (L.some(a => a.type === 'explore')) can.push('explorar um local especial (2 Provisões)');
  if (L.some(a => a.type === 'expand')) can.push('fazer uma Expansão (2 Madeira + 2 Provisões)');
  if (L.some(a => a.type === 'trade')) can.push('trocar recursos');
  if (L.some(a => a.type === 'concludeSolo')) can.push('concluir o território');
  return '<b>Passo 3 de 4 — acções.</b> ' + (can.length ? `Agora consegues: ${can.join('; ')}. Os hexágonos onde podes construir ou explorar estão marcados: toca num deles.` : 'Ainda não tens recursos para construir ou explorar. Não faz mal: carrega em «Terminar acções».') + off;
}

function stepsHTML() {
  if (state.phase === 'setup') return '<span class="on">Preparação</span>';
  if (state.phase !== 'turn') return '<span class="on">Pontuação final</span>';
  const i = STEP_INDEX[state.step];
  return STEP_NAMES.map((n, k) => `<span class="${k === i ? 'on' : k < i ? 'done' : ''}">${k + 1}. ${n}</span>`).join('');
}

function render() {
  if (mode === 'world') return renderWorld();
  const covered = needsCover();
  $('#cover').hidden = !covered;
  if (covered) $('#cover').innerHTML = coverHTML();
  view.setBoard(boardView());
  $('#side').innerHTML = state.solo ? soloSideHTML() : sideHTML();
  $('#steps').innerHTML = stepsHTML();
  $('.panel').classList.remove('in-event');
  const s = state, p = s.players[s.active];
  let head = '', tools = '', handBtns = 'disabled';
  const diceTxt = s.turn?.dice ? ` · dados ${s.turn.dice[0]} + ${s.turn.dice[1]} = ${s.turn.dice[0] + s.turn.dice[1]}` : '';
  if (s.event) {
    const ev = s.event, card = EVENTS[ev.id], ch = s.players[who()];
    head = `Acontecimento · ${esc(card.name)} · escolhe ${esc(ch.name)}`;
    tools = covered ? '' : `<div class="event"><span class="art${ev.id === 'wildfire' ? ' fire' : ''}" style="${ev.id === 'fog' ? tileStyle('greenlands', 'fog', 110) : artStyle(card.art, 110)}"></span>
      <div><b>${esc(card.name)}</b> <small>${esc(card.kind)}</small><p>${esc(card.text)}</p>${eventDetail(ev, who())}
      <div class="opts">${legalActions(s).map(a => btn(optionLabel(ev.id, a), a)).join('')}</div></div></div>`;
    $('#hand').innerHTML = covered ? '' : p ? (s.players[who()].hand.map(id => cardHTML(id, 'disabled')).join('')) : '';
  } else if (s.phase === 'setup') {
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
        + (L.some(a => a.type === 'concludeSolo') ? btn('Concluir território agora', { type: 'concludeSolo', player: s.active }) : '')
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
  if (s.lastEvent && !s.event && lastShown !== s.lastEvent.id + s.lastEvent.round) { lastShown = s.lastEvent.id + s.lastEvent.round; lastMsg = `Acontecimento: ${EVENTS[s.lastEvent.id].name}.`; $('#msg').textContent = lastMsg; }
  $('#head').innerHTML = head;
  $('#guide').innerHTML = guideHTML();
  $('#tools').innerHTML = s.phase === 'over' ? finalHTML() : tools;
  $('#market').innerHTML = s.market.map(id => cardHTML(id, s.phase === 'turn' && s.step === 'refill' && p.resources.food >= 1 ? 'data-buy="1"' : 'disabled')).join('');
  $('.panel').classList.toggle('over', s.phase === 'over');
  if (s.phase === 'over') hideDice();
  $('.panel').classList.toggle('in-event', !!s.event);
}

function onHex(h) {
  if (!h) return;
  if (mode === 'world') { const t = territoryAt(h.q, h.r); selT = t ? t.id : null; renderWorld(); return; }
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
    if (b.dataset.tipsOn != null) { tips = true; try { localStorage.setItem('frontier.tips', '1'); } catch {} openMenu(); return; }
    if (b.dataset.tips != null) { tips = false; try { localStorage.setItem('frontier.tips', '0'); } catch {} render(); return; }
    if (b.dataset.intro != null) { try { localStorage.setItem('frontier.intro', '1'); } catch {} $('#dialog').hidden = true; return; }
    if (b.dataset.world != null) return openWorld();
    if (b.dataset.go) return startSolo(+b.dataset.go);
    if (b.dataset.equip) { toggleRelic(camp, b.dataset.equip); saveCampaign(store, camp); renderWorld(); return; }
    if (b.dataset.relic) { takeRelic(camp, b.dataset.relic); saveCampaign(store, camp); render(); return; }
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
    if (b.dataset.reveal != null) { revealed = who(); showPriv = false; render(); return; }
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
  openMenu();       // menu principal: Campanha Solo, partida de 2 a 4, partidas guardadas
  if (location.hash === '#debug') window.FRONTIER = { get state() { return state; }, set state(v) { state = v; render(); }, view, act };
}
start();
