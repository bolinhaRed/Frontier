// FRONTIER — carregamento dos atlas de tiles e níveis de detalhe (mipmaps).
// Reutilizado do projecto original (assets.js), com os caminhos da nova estrutura.
const TILES = './assets/tiles/';
let meta = null;
const atlases = {};   // nome → [nível0 (img), nível1 (½), nível2 (¼), nível3 (⅛)]
const index = {};     // nome do tile → posição no atlas

function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => rej(new Error('Não foi possível carregar ' + src)); i.src = src; });
}

export async function loadAtlases(onProgress = () => {}) {
  const r = await fetch(TILES + 'atlas.json');
  if (!r.ok) throw new Error('Não foi possível carregar ' + TILES + 'atlas.json');
  meta = await r.json();
  meta.order.forEach((n, i) => { index[n] = i; });
  let done = 0;
  await Promise.all(meta.atlases.map(async n => {
    atlases[n] = [await loadImage(TILES + n + '.webp')];
    onProgress(++done / meta.atlases.length);
  }));
  return meta;
}

function mip(name, level) {
  const levels = atlases[name];
  if (levels[level]) return levels[level];
  const prev = mip(name, level - 1);
  const c = document.createElement('canvas');
  c.width = Math.ceil(prev.width / 2); c.height = Math.ceil(prev.height / 2);
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
  g.drawImage(prev, 0, 0, c.width, c.height);
  return (levels[level] = c);
}

// Devolve [imagem, sx, sy, sw, sh] do tile no nível adequado à escala de desenho.
export function tileSource(atlasName, tile, scale) {
  const level = scale > 0.55 ? 0 : scale > 0.28 ? 1 : scale > 0.14 ? 2 : 3;
  const img = mip(atlasName, level);
  const f = 1 / (1 << level);
  const t = meta.tile, i = index[tile] ?? index.plain;
  const col = i % t.cols, row = Math.floor(i / t.cols);
  return [img, (col * t.cw + t.pad) * f, (row * t.ch + t.pad) * f, t.w * f, t.h * f];
}
