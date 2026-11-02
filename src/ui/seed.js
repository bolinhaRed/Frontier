// Escolha da seed de uma partida nova. Usa Math.random e fica na interface de propósito:
// as regras (src/core) recebem a seed já escolhida e nunca usam Math.random.
export function randomSeed() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}
