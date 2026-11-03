// Objectivos (rev. 1.4). As condições estão em src/core/rules/objectives.js.
export const PUBLIC_OBJECTIVES = {
  pioneer:    { name: 'Pioneiro',          desc: 'Terrenos em 4 biomas diferentes.' },
  lumberjack: { name: 'Lenhador',          desc: '5 terrenos de Floresta ou Bosque.' },
  waters:     { name: 'Senhor das águas',  desc: '4 terrenos de Lago ou Rio.' },
  mason:      { name: 'Pedreiro',          desc: '2 estruturas em Colinas ou Montanhas.' },
  explorer:   { name: 'Explorador',        desc: '2 locais especiais explorados.' },
  builder:    { name: 'Construtor',        desc: '4 estruturas.' },
  hardland:   { name: 'Terra difícil',     desc: '3 terrenos com ficha 2, 3, 11 ou 12.' },
  majority:   { name: 'Maioria',           desc: 'Maioria em 2 regiões com 4 ou mais terrenos.' },
  farmer:     { name: 'Agricultor',        desc: '2 Quintas.' },
  neighbor:   { name: 'Vizinho',           desc: '6 terrenos próprios, cada um adjacente a pelo menos um terreno de outro jogador.' },
};
export const PRIVATE_OBJECTIVES = {
  linked_greenlands: { name: 'Raízes verdes',   desc: '3 terrenos teus de Greenlands ligados entre si.', biome: 'greenlands' },
  linked_drylands:   { name: 'Terra seca',      desc: '3 terrenos teus de Drylands ligados entre si.',   biome: 'drylands' },
  linked_sandlands:  { name: 'Areias',          desc: '3 terrenos teus de Sandlands ligados entre si.',  biome: 'sandlands' },
  linked_icelands:   { name: 'Gelo',            desc: '3 terrenos teus de Icelands ligados entre si.',   biome: 'icelands' },
  linked_deadlands:  { name: 'Terra morta',     desc: '3 terrenos teus de Deadlands ligados entre si.',  biome: 'deadlands' },
  castle:            { name: 'Senhor do castelo', desc: 'Construir um Castelo.' },
  plain6:            { name: 'Celeiro',         desc: 'Maioria numa região de Planície com 6 ou mais terrenos.' },
  range5:            { name: 'Senhor da serra', desc: 'Maioria numa região de Serra com 5 ou mais terrenos.' },
  families:          { name: 'Equilíbrio',      desc: 'Pelo menos 2 terrenos teus de cada família.' },
  sites2:            { name: 'Viajante',        desc: '2 locais especiais explorados, de tipos diferentes.' },
};
