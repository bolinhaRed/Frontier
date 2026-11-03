// IA (etapa 7). Três níveis; todos escolhem só entre legalActions(state) e não vêem informação escondida
// (não olham para o baralho nem para as mãos ou objectivos privados dos outros).
//   easy   — coloca ao acaso entre as 5 melhores posições por produção; constrói o primeiro que puder; nunca faz Expansão nem compra no mercado.
//   normal — avalia cada acção possível (e uma troca seguida da melhor construção) e escolhe a melhor.
//   hard   — como normal, mas desconta o que a jogada dá ao adversário mais forte.
import { applyAction, legalActions, currentPlayer } from '../core/apply.js';
import { TERRAINS } from '../data/terrains.js';
import { influence } from '../core/rules/regions.js';
import { mulberry32, hashStr } from '../core/rng.js';

const WAYS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
const P = n => (WAYS[n] || 0) / 36;

// Valor estimado da posição para o jogador pid (em pontos).
export function evaluate(s, pid) {
  const p = s.players[pid], N = s.players.length;
  const roundsLeft = Math.max(0, s.maxRounds - s.round) + 0.5;
  let v = p.score;
  const res = Object.values(p.resources).reduce((a, b) => a + b, 0);
  v += Math.min(res, s.balance.resourceCap) * 0.35 + Math.max(0, res - s.balance.resourceCap) * 0.1;
  for (const c of Object.values(s.board)) {
    if (c.owner !== pid || c.kind !== 'terrain') continue;
    const bonus = c.structure === 'castle' ? 2 : c.structure === 'village' || c.structure === 'farm' ? 1 : 0;
    v += P(c.token) * roundsLeft * N * (1 + bonus) * 0.3;
    v += ({ 2: 2, 12: 2, 3: 1, 11: 1 }[c.token] || 0) * 0.8;
  }
  for (const rg of s.regions) {
    if (rg.hexes.length < 2) continue;
    const inf = influence(s, rg), mine = inf[pid];
    if (!mine) continue;
    const others = Object.entries(inf).filter(([o]) => +o !== pid).map(([, x]) => x);
    const best = Math.max(0, ...others);
    if (mine > best) v += rg.hexes.length * 0.75; else if (mine === best) v += rg.hexes.length * 0.4; else v += rg.hexes.length * 0.15;
  }
  if (s.solo) v += s.solo.achievedRound != null ? 20 : 0;
  if (s.final) v = s.final.rows[pid].total + (s.final.solo?.stars || 0) * 10;
  return v;
}

function value(s, pid, level) {
  const mine = evaluate(s, pid);
  if (level !== 'hard' || s.players.length < 2) return mine;
  const opp = Math.max(...s.players.filter(q => q.id !== pid).map(q => evaluate(s, q.id)));
  return mine - 0.35 * opp;
}

const after = (s, a) => { const r = applyAction(s, a); return r.ok ? r.state : null; };

export function chooseAction(full, level = 'normal') {
  // a IA não precisa do registo de acções: simular sem ele é muito mais rápido (desafios do Solo à parte)
  const state = full.solo ? full : { ...full, log: [] };
  const pid = currentPlayer(state);
  const L = legalActions(state);
  if (L.length <= 1) return L[0];
  const rnd = mulberry32(hashStr(`${full.seed}|${pid}|${full.log.length}`));
  const step = state.event ? 'event' : state.phase === 'setup' ? 'setup' : state.step;

  if (step === 'stones') return L[0];
  if (step === 'limit') { // devolve do recurso de que tem mais
    const r = state.players[pid].resources;
    return L.reduce((best, a) => (score(a) > score(best) ? a : best));
    function score(a) { return -Object.entries(a.give).reduce((t, [k, n]) => t + n * (10 - r[k]), 0); }
  }
  if (level === 'easy') return easy(state, L, pid, rnd, step);

  const conclude = L.find(a => a.type === 'concludeSolo');
  if (conclude && step === 'actions') return conclude;
  let best = null, bestV = -Infinity;
  const base = step === 'actions' ? value(state, pid, level) : -Infinity;
  for (const a of L) {
    if (a.type === 'endActions') continue;
    let s2 = after(state, a); if (!s2) continue;
    let v = value(s2, pid, level);
    // uma troca só vale pelo que permite fazer a seguir
    if (a.type === 'trade' && s2.step === 'actions') {
      let follow = -Infinity;
      for (const b of legalActions(s2)) if (b.type === 'build' || b.type === 'explore' || b.type === 'expand') { const s3 = after(s2, b); if (s3) follow = Math.max(follow, value(s3, pid, level)); }
      v = follow;
    }
    if (a.type === 'buyMarket') v -= 0.2;               // a carta do baralho é surpresa mas grátis
    v += rnd() * 0.01;                                  // desempate estável
    if (v > bestV) { bestV = v; best = a; }
  }
  if (step === 'actions') { const end = L.find(a => a.type === 'endActions'); if (!best || bestV <= base + 0.05) return end; }
  return best || L[0];
}

function easy(state, L, pid, rnd, step) {
  const pick = xs => xs[Math.floor(rnd() * xs.length)];
  if (step === 'place' || step === 'setup') {
    const tok = a => P(a.type === 'setupPlace' ? state.tokens[state.setup.card] : state.tokens[a.card]);
    const places = L.filter(a => a.type === 'place' || a.type === 'setupPlace');
    if (!places.length) return L[0];
    // as 5 melhores por produção: probabilidade da ficha + vizinhos da mesma família
    const fam = a => TERRAINS[(state.cards[a.card || state.setup.card]).terrain].family;
    const sc = a => tok(a) * 10 + (state.board[(a.q + 1) + ',' + a.r]?.terrain && TERRAINS[state.board[(a.q + 1) + ',' + a.r].terrain]?.family === fam(a) ? 0.5 : 0) + rnd() * 0.1;
    return pick([...places].sort((x, y) => sc(y) - sc(x)).slice(0, 5));
  }
  if (step === 'actions') return L.find(a => a.type === 'build') || L.find(a => a.type === 'explore') || L.find(a => a.type === 'concludeSolo') || L.find(a => a.type === 'endActions');
  if (step === 'refill') return L.find(a => a.type === 'drawDeck') || L[0];
  return pick(L);
}
