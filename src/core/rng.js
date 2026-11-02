// FRONTIER — gerador aleatório determinístico.
// Reutilizado do projecto original (rng.js). Acrescenta um estado serializável:
// o estado do gerador é um objecto JSON simples ({ s }) que vive dentro do estado
// da partida, para que uma partida gravada continue exactamente igual.
// Nenhuma regra usa Math.random; a seed inicial é escolhida pela interface (src/ui/seed.js).

export function hashStr(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

// Passo do mulberry32 sobre um inteiro de 32 bits; devolve [valor em [0,1), novo estado].
function step(a) {
  a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a >>> 0];
}

// Versão com closure (cómoda para ferramentas e testes; não é serializável).
export function mulberry32(a) {
  let s = a | 0;
  return () => { const [v, n] = step(s); s = n; return v; };
}
export const rngFor = (...parts) => mulberry32(hashStr(parts.join('|')));

// Versão serializável: o estado é { s: inteiro de 32 bits sem sinal }.
export const rngState = (...parts) => ({ s: hashStr(parts.join('|')) });
export function nextFloat(st) { const [v, n] = step(st.s); st.s = n; return v; }
export const nextInt = (st, n) => Math.floor(nextFloat(st) * n);
export const asFn = st => () => nextFloat(st);

export function shuffle(arr, r) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
export const pick = (arr, r) => arr[Math.floor(r() * arr.length)];

export function weightedPick(entries, r) { // entries: [[item, peso], ...]
  const total = entries.reduce((s, e) => s + e[1], 0);
  let x = r() * total;
  for (const [item, w] of entries) { if ((x -= w) < 0) return item; }
  return entries[entries.length - 1]?.[0];
}

export const cleanSeed = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
