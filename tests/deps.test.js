// Regras de arquitectura: o motor (src/core) e os dados (src/data) não dependem da interface,
// da IA, da gravação nem do browser, para correrem igual no browser e em Node (e num servidor na 2.0).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importsOf, listJs, ROOT } from '../tools/imports.js';

const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const code = f => stripComments(readFileSync(join(ROOT, f), 'utf8'));
const src = listJs('src');

test('todos os imports relativos apontam para ficheiros que existem', () => {
  for (const f of [...src, ...listJs('tests'), ...listJs('tools')])
    for (const i of importsOf(f)) if (!i.startsWith('node:')) assert.ok(existsSync(join(ROOT, i)), `${f} importa ${i}, que não existe`);
});

test('src/core só importa src/core e src/data', () => {
  for (const f of src.filter(f => f.startsWith('src/core/')))
    for (const i of importsOf(f)) assert.ok(i.startsWith('src/core/') || i.startsWith('src/data/'), `${f} importa ${i}`);
});

test('src/data só importa src/data', () => {
  for (const f of src.filter(f => f.startsWith('src/data/')))
    for (const i of importsOf(f)) assert.ok(i.startsWith('src/data/'), `${f} importa ${i}`);
});

test('src/core e src/data não usam APIs do browser', () => {
  const banned = /\b(document|window|localStorage|sessionStorage|indexedDB|navigator|fetch|requestAnimationFrame|Image|HTMLElement)\b/;
  for (const f of src.filter(f => f.startsWith('src/core/') || f.startsWith('src/data/'))) {
    const m = code(f).match(banned);
    assert.equal(m, null, `${f} usa ${m?.[0]}`);
  }
});

test('Math.random não aparece fora da interface', () => {
  // A interface pode usá-lo para coisas sem efeito nas regras (seed nova, música generativa).
  for (const f of src) if (!f.startsWith('src/ui/')) assert.ok(!/Math\.random/.test(code(f)), `${f} usa Math.random`);
});

test('os testes não importam o simulador', () => {
  for (const f of listJs('tests')) for (const i of importsOf(f)) assert.ok(!i.startsWith('sim/'), `${f} importa ${i}`);
});
