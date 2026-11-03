// Dados animados. O motor lança primeiro; a animação mostra esse resultado.
// Durante o voo, cada dado dá 3 voltas; as faces só mudam quando o dado está de lado (invisível),
// e a face real fica à vista a meio do voo, antes de o dado parar — nunca muda no fim.
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const face = (el, n) => { el.dataset.face = n; el.querySelector('.pips').innerHTML = Array.from({ length: 9 }, (_, i) => `<i${PIPS[n].includes(i + 1) ? ' class="on"' : ''}></i>`).join(''); };
const FLIP = 150, FLIPS = 3;   // cada volta dura 150 ms; a face troca a meio da volta (dado de lado)

let layer = null, hideTimer = null;
export function showDice(dice) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!layer) { layer = document.createElement('div'); layer.className = 'dice-layer'; layer.setAttribute('aria-hidden', 'true'); document.querySelector('.app').append(layer); }
  clearTimeout(hideTimer);
  const n = dice.length, gap = n === 3 ? 84 : 92;
  layer.innerHTML = dice.map((_, i) => `<div class="die" style="--x:${(i - (n - 1) / 2) * gap}px;--r:${[-8, 7, -4][i]}deg;--d:${i * 0.03}s"><div class="pips"></div></div>`).join('') + '<div class="dice-sum"></div>';
  const els = [...layer.querySelectorAll('.die')], sum = layer.querySelector('.dice-sum');
  layer.className = 'dice-layer show' + (reduce ? '' : ' roll');
  return new Promise(done => {
    const land = () => {
      sum.textContent = n === 2 ? dice[0] + dice[1] : 'Escolhe 2';
      layer.classList.add('landed');
      hideTimer = setTimeout(() => layer.classList.remove('show'), 1700);
      done();
    };
    if (reduce) { els.forEach((el, i) => face(el, dice[i])); return land(); }
    // faces de partida ao acaso; nas voltas 1 e 2 outra ao acaso; na 3.ª volta, a face real
    els.forEach((el, i) => face(el, 1 + ((dice[i] + 2) % 6)));
    for (let k = 0; k < FLIPS; k++) setTimeout(() => els.forEach((el, i) => face(el, k === FLIPS - 1 ? dice[i] : 1 + Math.floor(Math.random() * 6))), FLIP * k + FLIP / 2);
    setTimeout(land, 820);
  });
}
export function hideDice() { if (layer) layer.classList.remove('show'); }
