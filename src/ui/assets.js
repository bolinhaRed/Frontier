// FRONTIER — carregamento dos atlas de tiles e níveis de detalhe (mipmaps).
// Reutilizado do projecto original (assets.js), com os caminhos da nova estrutura.
const TILES = './assets/tiles/';
let meta = null, art = null, paths = null;
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
  try { art = await (await fetch('./assets/art/art.json')).json(); } catch { art = null; }
  // peças de estrada e rio (modo Expedição): uma folha por bioma
  try {
    paths = await (await fetch(TILES + 'paths.json')).json();
    await Promise.all(meta.atlases.map(async n => { atlases['paths-' + n] = [await loadImage(TILES + 'paths-' + n + '.webp')]; }));
  } catch { paths = null; }
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
  const isPath = atlasName.startsWith('paths-');
  const t = isPath ? paths.tile : meta.tile, i = isPath ? paths.order.indexOf(tile) : (index[tile] ?? index.plain);
  const col = i % t.cols, row = Math.floor(i / t.cols);
  return [img, (col * t.cw + t.pad) * f, (row * t.ch + t.pad) * f, t.w * f, t.h * f];
}

// Estilo CSS para mostrar um tile num elemento HTML (cartas da mão e do mercado).
export function tileStyle(atlasName, tile, displayW) {
  const t = meta.tile, i = index[tile] ?? index.plain;
  const col = i % t.cols, row = Math.floor(i / t.cols), s = displayW / t.w;
  const sheetW = t.cols * t.cw, sheetH = Math.ceil(meta.order.length / t.cols) * t.ch;
  return `background:url(${TILES + atlasName}.webp) ${-(col * t.cw + t.pad) * s}px ${-(row * t.ch + t.pad) * s}px / ${sheetW * s}px ${sheetH * s}px no-repeat;width:${displayW}px;height:${Math.round(t.h * s)}px`;
}

// Ilustração de topo pontiagudo (folhas em assets/art/), para as cartas de acontecimento.
export function artStyle(name, displayW) {
  if (!art || !name) return '';
  const [pack, , ...rest] = name.split('_'); const n = rest.join('_');
  const P = art.packs[pack]; if (!P) return '';
  const i = P.names.indexOf(n); if (i < 0) return '';
  const c = art.cell, s = displayW / c.w, cw = c.w + c.pad * 2, ch = c.h + c.pad * 2;
  const rows = Math.ceil(P.names.length / P.cols);
  return `background:url(./assets/art/${pack}.webp) ${-((i % P.cols) * cw + c.pad) * s}px ${-(Math.floor(i / P.cols) * ch + c.pad) * s}px / ${P.cols * cw * s}px ${rows * ch * s}px no-repeat;width:${displayW}px;height:${Math.round(c.h * s)}px`;
}

// Peça de estrada ou rio num elemento HTML (modo Expedição).
export function pathStyle(biome, kind, displayW) {
  const t = paths.tile, i = paths.order.indexOf(kind), s = displayW / t.w;
  return `background:url(${TILES}paths-${biome === 'foundation' ? 'sketch' : biome}.webp) ${-(i * t.cw + t.pad) * s}px ${-t.pad * s}px / ${paths.order.length * t.cw * s}px ${t.ch * s}px no-repeat;width:${displayW}px;height:${Math.round(t.h * s)}px`;
}
