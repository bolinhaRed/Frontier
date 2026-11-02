// Inventário dos assets: confirma que assets/inventory.json corresponde aos ficheiros reais.
// As dimensões e o tipo de cor são lidos do cabeçalho PNG (IHDR), sem dependências.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, openSync, readSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../tools/imports.js';

const SRC = join(ROOT, 'assets/source');
const inv = JSON.parse(readFileSync(join(ROOT, 'assets/inventory.json'), 'utf8'));
const atlas = JSON.parse(readFileSync(join(ROOT, 'assets/tiles/atlas.json'), 'utf8'));

function pngHeader(file) {
  const fd = openSync(file, 'r'), b = Buffer.alloc(26);
  readSync(fd, b, 0, 26, 0); closeSync(fd);
  assert.equal(b.toString('hex', 0, 8), '89504e470d0a1a0a', `${file} não é PNG`);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25] };
}

test('241 PNG: 162 de topo plano e 79 de topo pontiagudo', () => {
  assert.equal(inv.count, 241); assert.equal(inv.assets.length, 241);
  assert.equal(inv.assets.filter(a => a.family === 'topo plano').length, 162);
  assert.equal(inv.assets.filter(a => a.family === 'topo pontiagudo').length, 79);
});

test('topo plano: 27 tiles × 6 variantes', () => {
  const flat = inv.assets.filter(a => a.family === 'topo plano');
  assert.deepEqual([...new Set(flat.map(a => a.variant))].sort(), ['deadlands', 'drylands', 'foundation', 'greenlands', 'icelands', 'sandlands']);
  for (let i = 1; i <= 27; i++) assert.equal(flat.filter(a => a.index === i).length, 6, `tile #${i}`);
});

test('topo pontiagudo: desert 20, forest 20, mountain 20, tundra 19', () => {
  const p = inv.assets.filter(a => a.family === 'topo pontiagudo');
  const n = k => p.filter(a => a.pack === k).length;
  assert.deepEqual([n('desert'), n('forest'), n('mountain'), n('tundra')], [20, 20, 20, 19]);
});

test('cada ficheiro existe, é RGBA e tem as dimensões do inventário', () => {
  for (const a of inv.assets) {
    const f = join(SRC, a.file);
    assert.ok(existsSync(f), `falta ${a.file}`);
    const h = pngHeader(f);
    assert.equal(h.colorType, 6, `${a.file} não é RGBA`);
    assert.deepEqual([h.width, h.height], [a.width, a.height], a.file);
    if (a.family === 'topo plano') assert.deepEqual([h.width, h.height], [238, 207], a.file);
    else assert.ok(h.height === 255 && (h.width === 221 || h.width === 222), a.file);
  }
});

test('não há PNG fora do inventário', () => {
  const listed = new Set(inv.assets.map(a => a.file));
  for (const d of ['hex-flat', 'hex-pointy']) for (const n of readdirSync(join(SRC, d))) assert.ok(listed.has(`${d}/${n}`), `${d}/${n} não está no inventário`);
});

test('atlas: 27 tiles por folha e todas as folhas presentes', () => {
  assert.equal(atlas.order.length, 27);
  for (const n of atlas.atlases) assert.ok(existsSync(join(ROOT, 'assets/tiles', n + '.webp')), `falta ${n}.webp`);
  const names = new Set(inv.assets.filter(a => a.family === 'topo plano').map(a => a.gameName));
  assert.deepEqual([...names].sort(), [...atlas.order].sort());
});

test('a arte dos 10 acontecimentos existe', () => {
  const art = ['forest_18_blast', 'forest_08_spider', 'tundra_04_snowStorm', 'tundra_01_full', 'forest_17_ruins', 'mountain_11_cave', 'desert_19_road', 'forest_10_mushroom', 'mountain_04_vulcano'];
  for (const a of art) assert.ok(existsSync(join(SRC, 'hex-pointy', a + '.png')), a);
  assert.ok(inv.assets.some(a => a.gameName === 'fog'), 'Nevoeiro usa o tile #27 fog');
});
