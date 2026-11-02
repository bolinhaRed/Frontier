import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, hashStr, rngState, nextFloat, nextInt, shuffle, asFn } from '../../src/core/rng.js';

test('dá os mesmos números que o gerador do projecto original', () => {
  const r = mulberry32(hashStr('FRONTIER'));
  assert.deepEqual([r(), r(), r()], [0.2102931011468172, 0.6225932838860899, 0.9632048930507153]);
});

test('o estado serializável dá a mesma sequência que a closure', () => {
  const st = rngState('FRONTIER'), r = mulberry32(hashStr('FRONTIER'));
  for (let i = 0; i < 100; i++) assert.equal(nextFloat(st), r());
});

test('gravar e ler o estado em JSON continua a mesma sequência', () => {
  const a = rngState('seed', 1);
  for (let i = 0; i < 10; i++) nextFloat(a);
  const b = JSON.parse(JSON.stringify(a));
  for (let i = 0; i < 50; i++) assert.equal(nextFloat(a), nextFloat(b));
});

test('a mesma seed baralha sempre da mesma forma', () => {
  const deck = () => [...Array(48).keys()];
  assert.deepEqual(shuffle(deck(), asFn(rngState('X'))), shuffle(deck(), asFn(rngState('X'))));
  assert.notDeepEqual(shuffle(deck(), asFn(rngState('X'))), shuffle(deck(), asFn(rngState('Y'))));
});

test('nextInt fica sempre dentro do intervalo', () => {
  const st = rngState('int');
  for (let i = 0; i < 1000; i++) { const v = nextInt(st, 6); assert.ok(v >= 0 && v < 6 && Number.isInteger(v)); }
});
