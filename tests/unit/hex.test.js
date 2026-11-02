import { test } from 'node:test';
import assert from 'node:assert/strict';
import { neighbors, distance, hexToPixel, pixelToHex, ring, key, TILE_W, TILE_H } from '../../src/core/hex.js';

test('tamanho dos tiles igual ao dos PNG de topo plano', () => {
  assert.equal(TILE_W, 238); assert.equal(TILE_H, 207);
});

test('cada hexágono tem 6 vizinhos distintos, todos à distância 1', () => {
  const n = neighbors(2, -1);
  assert.equal(new Set(n.map(([q, r]) => key(q, r))).size, 6);
  n.forEach(([q, r]) => assert.equal(distance(2, -1, q, r), 1));
});

test('um anel de raio d tem 6·d hexágonos, todos à distância d', () => {
  for (let d = 1; d <= 4; d++) {
    const r = ring(0, 0, d);
    assert.equal(r.length, 6 * d);
    r.forEach(([q, rr]) => assert.equal(distance(0, 0, q, rr), d));
  }
});

test('pixel → hexágono devolve o hexágono de origem', () => {
  for (let q = -4; q <= 4; q++) for (let r = -4; r <= 4; r++) {
    const p = hexToPixel(q, r), h = pixelToHex(p.x + 3, p.y - 2);
    assert.deepEqual([h.q + 0, h.r + 0], [q, r]); // + 0 normaliza -0
  }
});
