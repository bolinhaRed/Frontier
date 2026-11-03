// «Como jogar»: secções curtas, com custos lidos dos dados do jogo (ficam sempre certos).
import { STRUCTURES, STRUCTURE_ORDER } from '../data/structures.js';
import { SITES } from '../data/sites.js';
import { BALANCE } from '../data/balance.js';
import { RESOURCE_NAMES } from '../data/terrains.js';

const cost = c => Object.entries(c).filter(([, n]) => n).map(([r, n]) => `${n} ${RESOURCE_NAMES[r]}`).join(' + ') || '—';
const where = s => s.over ? 'sobre uma Aldeia tua' : s.on === 'any' ? `terreno teu numa região com ${s.minRegion}+` : s.on.map(t => ({ plain: 'Planície', forest: 'Floresta', hills: 'Colinas', mountains: 'Montanhas' }[t])).join(' ou ');
const bonus = s => s.bonus?.food ? '+1 Provisão quando produz' : s.bonus?.same ? `+${s.bonus.same} recurso quando produz`
  : s.onePerGame ? 'uma por partida' : s.name === 'Torre de vigia' ? 'protege terrenos vizinhos dos Perigos' : `+${s.influence} de influência`;

export function helpHTML() {
  const B = BALANCE;
  const sec = (title, body, open = false) => `<details${open ? ' open' : ''}><summary>${title}</summary>${body}</details>`;
  return `<div class="cover-box help"><h2>Como jogar</h2><p class="hint">Free Frontier · 2 a 4 jogadores · ganha quem tiver mais pontos no fim.</p>
  ${sec('O objectivo', '<p>Coloca terrenos para construir um território, produz Madeira, Pedra e Provisões, constrói e explora. Pontuas com regiões, estruturas, locais, objectivos e alguns bónus no fim.</p>', true)}
  ${sec('Preparação', `<p>O Lago fica no centro e há 3 locais especiais à volta. Cada jogador começa com ${B.startResources.wood} Madeira, ${B.startResources.stone} Pedra e ${B.startResources.food} Provisões (+1 Provisão por cada lugar depois do 1.º) e coloca 2 terrenos, à vez. Depois recebe 3 cartas na mão; há 3 no mercado. Há 3 objectivos públicos e 1 privado, secreto.</p>`)}
  ${sec('O turno', '<ol><li><b>Dados</b>: lança 2 dados.</li><li><b>Colocar</b>: põe 1 terreno da mão num hexágono livre ao lado de outro ocupado.</li><li><b>Acções</b>: constrói, explora, troca, faz uma Expansão, pela ordem que quiseres.</li><li><b>Repor</b>: volta a ter 3 cartas na mão.</li></ol>')}
  ${sec('Dados e produção', `<p>Cada terreno tem um número. Quando a soma dos dados sai, <b>todos</b> os terrenos com esse número produzem para o dono: Planície, Lago e Rio dão Provisões; Floresta e Bosque, Madeira; Colinas e Montanhas, Pedra. 6 e 8 saem mais vezes; 2 e 12, raramente.</p><p><b>Saiu 7 (Caravana)</b>: ninguém produz. Escolhes +1 recurso, ou trocar a 2 por 1 neste turno.</p>`)}
  ${sec('Regiões e marcos', '<p>Terrenos vizinhos da mesma família formam uma região, sejam de quem forem: Planície; Floresta e Bosque; Colinas e Montanhas; Lago e Rio.</p><p>Influência: 1 por terreno teu, mais a das estruturas. Quando uma região chega a 3, 5, 7, 9… terrenos, quem tem mais influência ganha 2, 3, 4, 5… pontos (empatados recebem todos).</p><p><b>Contribuição</b>: se juntares um terreno a uma região de 3 ou mais onde não tens maioria, recebes 1 recurso dessa família (uma vez entre marcos).</p>')}
  ${sec('Construir (máximo 2 por turno)', `<table class="score"><thead><tr><th>Estrutura</th><th>Custo</th><th>Onde</th><th>Efeito</th><th>Pontos</th></tr></thead><tbody>${STRUCTURE_ORDER.map(id => { const s = STRUCTURES[id];
    return `<tr><td>${s.name}</td><td>${cost(s.cost)}</td><td>${where(s)}</td><td>${bonus(s)}</td><td>${s.points}</td></tr>`; }).join('')}</tbody></table><p class="hint">Uma estrutura por hexágono. O Castelo substitui a Aldeia (5 pontos no total).</p>`)}
  ${sec('Explorar (máximo 1 por turno)', `<p>Custa ${cost(B.exploreCost)}. Precisas de um terreno teu ao lado do local, que ainda ninguém explorou.</p><ul>${['ruins', 'cave', 'crystals', 'stones'].map(id => `<li><b>${SITES[id].name}</b> (${SITES[id].points} pts): ${{ ruins: '2 recursos à tua escolha', cave: '3 Pedra', crystals: 'só pontos', stones: 'vês e reordenas, em segredo, os 3 próximos acontecimentos' }[id]}.</li>`).join('')}</ul>`)}
  ${sec('Trocas, Expansão e mercado', `<p><b>Trocar com o banco</b>: ${B.tradeRate} recursos iguais por 1 de outro tipo (2 por 1 depois da Caravana).</p><p><b>Expansão</b> (1 por turno, só se colocaste): ${cost(B.expansionCost)} para colocar uma segunda carta.</p><p><b>Repor a mão</b>: do baralho é grátis; do mercado custa ${cost(B.marketCost)}.</p><p><b>Limite</b>: no fim do teu turno, se tiveres mais de ${B.resourceCap} recursos, devolves o excesso.</p>`)}
  ${sec('Objectivos', `<p><b>Públicos</b> (3 por partida): o primeiro a cumprir ganha ${B.publicPoints[0]}, o segundo ${B.publicPoints[1]}. <b>Privado</b>: ${B.privatePoints} pontos no fim se o cumprires; só tu o vês.</p>`)}
  ${sec('Fim e pontuação', `<p>A partida acaba no fim da última ronda (12 a 2, 10 a 3, 9 a 4) ou da ronda em que o baralho acabar. Somam-se: cada região com 3+ dá o seu tamanho a quem tem mais influência e metade ao segundo; objectivo privado; +2 por ficha 2 ou 12 e +1 por 3 ou 11 nos teus terrenos; 1 ponto por cada 3 recursos.</p><p class="hint">Desempate: mais estruturas, depois mais recursos, depois quem joga mais tarde.</p>`)}
  <div class="row-btns"><button class="btn primary" data-close-help>Fechar</button></div></div>`;
}
