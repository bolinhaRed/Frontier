// Produção (rev. 1.4, secção Produção): cada terreno com o número que saiu dá 1 recurso ao dono,
// mais o bónus da estrutura. Não produzem: Lago neutro, locais especiais, Árvores mortas, Vulcão
// e terrenos sob efeito temporário (etapa 6). Devolve a lista do que cada terreno deu.
import { TERRAINS } from '../../data/terrains.js';
import { STRUCTURES } from '../../data/structures.js';

export function produce(state, sum) {
  const out = [];
  for (const [k, c] of Object.entries(state.board)) {
    if (c.kind !== 'terrain' || c.owner == null || c.token !== sum || !TERRAINS[c.terrain]) continue;
    if (c.blocked) continue;                                   // efeitos temporários (etapa 6)
    const res = TERRAINS[c.terrain].resource, gain = { [res]: 1 };
    const bonus = c.structure ? STRUCTURES[c.structure].bonus : null;
    if (bonus?.same) gain[res] += bonus.same;
    if (bonus?.food) gain.food = (gain.food || 0) + bonus.food;
    const p = state.players[c.owner];
    for (const [r, n] of Object.entries(gain)) p.resources[r] += n;
    out.push({ hex: k, owner: c.owner, gain });
  }
  return out;
}
