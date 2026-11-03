// Modo Nevoeiro: testes rápidos do motor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFog, place, redraw, chooseRelic, legalFor, fogView, FOG, TERRITORIES } from '../../src/fog/engine.js';

const first = s => { for (let i = 0; i < s.hand.length; i++) { const L = legalFor(s, s.hand[i]); if (L.length) return [i, L[0]]; } return null; };

test('a mesma seed dá o mesmo território', () => {
  assert.deepEqual(createFog('A1'), createFog('A1'));
});

test('segredos dentro do mapa, longe do Acampamento e não colados', () => {
  const s = createFog('B2'), T = TERRITORIES[0];
  assert.equal(Object.keys(s.secrets).length, T.sites.length + T.hazards.length);
  for (const k of Object.keys(s.secrets)) {
    const [q, r] = k.split(',').map(Number), d = (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
    assert.ok(d >= 2 && d <= FOG.radius, k);
  }
});

test('colocar gasta 1 mantimento (antes de recompensas) e repõe a mão', () => {
  const s = createFog('C3'), [i, p] = first(s), r = place(s, i, p.q, p.r, p.rot);
  assert.ok(r.state);
  assert.equal(r.state.hand.length, FOG.hand);
  assert.ok(r.state.supplies >= s.supplies - 1 - 3);   // −1, e no máximo um Cemitério
  assert.equal(Object.keys(r.state.board).length >= 2, true);
});

test('o nevoeiro recua à volta das peças', () => {
  const s = createFog('D4'), before = fogView(s).fog.length, [i, p] = first(s);
  assert.ok(fogView(place(s, i, p.q, p.r, p.rot).state).fog.length < before);
});

test('trocar a mão custa mantimentos', () => {
  const s = createFog('E5'), r = redraw(s);
  assert.equal(r.state.supplies, s.supplies - FOG.redrawCost);
});

test('uma partida jogada sem pensar termina sem erros', () => {
  let s = createFog('F6'), n = 0;
  while (!s.over && n++ < 300) {
    if (s.step === 'relic') { s = chooseRelic(s, s.offer[0]).state; continue; }
    const m = first(s); if (!m) { const r = redraw(s); if (r.error) break; s = r.state; continue; }
    s = place(s, m[0], m[1].q, m[1].r, m[1].rot).state;
  }
  assert.ok(s.over);
});
