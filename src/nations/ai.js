// IA das Quatro Nações (v2). Planeia o turno: conquista os alvos que dão mais pontos por tropa, guarda tropas
// para defender a fronteira e distribui-as onde há perigo.
//   easy   — conquista o mais barato, sem pensar em pontos; deixa tudo por defender.
//   normal — escolhe pelo valor por tropa; guarda 1 tropa para a fronteira.
//   hard   — como normal, prefere tirar terras a quem lidera e guarda mais para defender.
import { targets, conquerCost, NATIONS } from './engine.js';

const value = (s, k, pid, level) => {
  const c = s.board[k], n = s.players[pid].nation; let v = 1;
  if (c.legendary) v += 2;
  if (n === 'nature' && (c.kind === 'forest' || c.kind === 'woods')) v += 1;
  if (n === 'stone' && (c.kind === 'hills' || c.kind === 'mountains')) v += 1;
  if (n === 'water' && (c.kind === 'lake' || c.path === 'river')) v += 1;
  if (n === 'fire' && c.path === 'road') v += 1;
  if (c.kind === 'village') v += 1.5;
  if (level === 'hard') {
    if (c.owner != null) { const lead = Math.max(...s.players.map(p => p.score)); if (s.players[c.owner].score === lead) v += 1; }
    // terras juntas defendem-se melhor
    const [q, r] = k.split(',').map(Number); let adj = 0;
    for (const [dq, dr] of [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]) if (s.board[(q + dq) + ',' + (r + dr)]?.owner === pid) adj++;
    v += adj * 0.25;
  }
  return v;
};

export function aiAction(s) {
  const p = s.players[s.active], level = p.level || 'normal';
  if (s.step === 'conquer') {
    const reserve = level === 'easy' ? 0 : 1;
    const T = targets(s).filter(t => t.cost <= s.hand - (Object.values(s.board).some(c => c.owner === s.active) ? reserve : 0) || (t.cost <= s.hand && !Object.values(s.board).some(c => c.owner === s.active)));
    if (T.length) {
      const pick = level === 'easy' ? T.sort((a, b) => a.cost - b.cost || a.k.localeCompare(b.k))[0]
        : T.map(t => ({ ...t, sc: value(s, t.k, p.id, level) / t.cost })).sort((a, b) => b.sc - a.sc || a.k.localeCompare(b.k))[0];
      return { type: 'conquer', k: pick.k };
    }
    return { type: 'end' };
  }
  return { type: 'end' };
}
export { NATIONS, conquerCost };
