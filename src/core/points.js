// Pontos ganhos durante a partida, com a origem guardada para o ecrã final e para os testes.
export const POINT_KINDS = ['milestones', 'structures', 'sites', 'objectives'];
export function award(state, pid, kind, n) {
  const p = state.players[pid];
  p.points[kind] = (p.points[kind] || 0) + n;
  p.score += n;
}
export const canPay = (p, cost) => Object.entries(cost).every(([r, n]) => p.resources[r] >= n);
export const pay = (p, cost) => { for (const [r, n] of Object.entries(cost)) p.resources[r] -= n; };
export const totalResources = p => Object.values(p.resources).reduce((a, b) => a + b, 0);
