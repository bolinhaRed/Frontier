// Estrutura do repositório: ficheiros obrigatórios, manifest e referências da página.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../tools/imports.js';

const read = f => readFileSync(join(ROOT, f), 'utf8');

test('ficheiros obrigatórios presentes', () => {
  for (const f of ['index.html', 'manifest.webmanifest', 'package.json', 'README.md', 'CREDITS.md', 'LICENSE', '.gitignore',
    'docs/SPEC.md', 'docs/ARCHITECTURE.md', 'docs/TESTING.md', 'docs/ASSETS.md', 'docs/DEPLOY.md', '.github/workflows/tests.yml'])
    assert.ok(existsSync(join(ROOT, f)), `falta ${f}`);
});

test('todas as referências locais do index.html existem', () => {
  const refs = [...read('index.html').matchAll(/(?:href|src)="([^"#]+)"/g)].map(m => m[1]).filter(u => !/^[a-z]+:/i.test(u));
  assert.ok(refs.length > 0);
  for (const r of refs) assert.ok(existsSync(join(ROOT, r)), `index.html aponta para ${r}, que não existe`);
});

test('manifest válido, com caminhos relativos e ícones existentes', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.start_url, './'); assert.equal(m.scope, './');
  for (const i of m.icons) { assert.ok(!i.src.startsWith('/'), i.src); assert.ok(existsSync(join(ROOT, i.src)), i.src); }
});

test('package.json sem dependências de execução', () => {
  const p = JSON.parse(read('package.json'));
  assert.equal(p.type, 'module');
  assert.deepEqual(Object.keys(p.dependencies || {}), []);
  assert.ok(p.scripts.test);
});

test('licenças: MIT para o código e créditos de C. Martins', () => {
  assert.match(read('LICENSE'), /MIT License/);
  assert.match(read('CREDITS.md'), /C(arlos)?\.? Martins/);
});

test('versão 1.0 sem chamadas de rede no código do jogo, além dos assets locais', () => {
  for (const f of ['src/ui/app.js', 'src/ui/assets.js']) {
    const s = read(f);
    assert.ok(!/https?:\/\//.test(s), `${f} contém um endereço externo`);
  }
});
