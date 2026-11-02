// npm run test:affected — corre só os testes que dependem (directa ou indirectamente)
// dos ficheiros alterados em relação ao último commit (git diff HEAD + ficheiros novos).
// Se não houver Git ou se mudar algo fora de src/ e tests/, corre todos os testes.
import { execSync, spawnSync } from 'node:child_process';
import { importsOf, listJs, ROOT } from './imports.js';

let changed;
try {
  const out = execSync('git diff --name-only HEAD && git ls-files --others --exclude-standard', { cwd: ROOT, encoding: 'utf8' });
  changed = [...new Set(out.split('\n').filter(Boolean))];
} catch { changed = null; }

const tests = listJs('tests').filter(f => f.endsWith('.test.js'));
let run;
if (!changed) { console.log('Sem Git: a correr todos os testes.'); run = tests; }
else if (changed.length === 0) { console.log('Nada mudou desde o último commit.'); process.exit(0); }
else if (changed.some(f => !f.startsWith('src/') && !f.startsWith('tests/'))) { console.log('Mudou algo fora de src/ e tests/: a correr todos os testes.'); run = tests; }
else {
  const deps = new Map();
  const closure = (f, seen = new Set()) => {
    if (seen.has(f)) return seen; seen.add(f);
    if (!deps.has(f)) { try { deps.set(f, importsOf(f).filter(p => p.endsWith('.js'))); } catch { deps.set(f, []); } }
    deps.get(f).forEach(d => closure(d, seen));
    return seen;
  };
  run = tests.filter(t => { const c = closure(t); return changed.some(f => c.has(f)); });
  if (changed.some(f => f === 'src/data/balance.js')) console.log('Aviso: mudou src/data/balance.js — convém correr npm run sim:check (a partir da etapa 5).');
  if (run.length === 0) { console.log('Nenhum teste depende dos ficheiros alterados.'); process.exit(0); }
}
console.log(`A correr ${run.length} de ${tests.length} ficheiros de teste.`);
const r = spawnSync(process.execPath, ['--test', ...run], { cwd: ROOT, stdio: 'inherit' });
process.exit(r.status ?? 1);
