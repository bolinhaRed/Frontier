// Lê os imports estáticos e dinâmicos de um ficheiro JS e resolve-os para caminhos relativos à raiz.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';

export const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');

const RE = /(?:^|[^\w$.])(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|(?:^|[^\w$.])import\s*\(\s*['"]([^'"]+)['"]\s*\)|(?:^|[^\w$.])import\s*['"]([^'"]+)['"]/g;

export function importsOf(file) {
  const src = readFileSync(join(ROOT, file), 'utf8');
  const out = [];
  for (const m of src.matchAll(RE)) {
    const spec = m[1] || m[2] || m[3];
    out.push(spec.startsWith('.') ? relative(ROOT, resolve(ROOT, dirname(file), spec)) : spec);
  }
  return out;
}

export function listJs(dir) {
  const out = [];
  const walk = d => {
    for (const n of readdirSync(join(ROOT, d))) {
      const p = join(d, n);
      if (statSync(join(ROOT, p)).isDirectory()) walk(p);
      else if (n.endsWith('.js')) out.push(p);
    }
  };
  walk(dir);
  return out.sort();
}
