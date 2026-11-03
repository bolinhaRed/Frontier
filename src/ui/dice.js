// Dados animados. O motor lança primeiro; a animação só mostra esse resultado, por isso as faces
// finais são sempre as que o motor usou. As faces que piscam durante o voo são só decoração.
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const face = (el, n) => { el.dataset.face = n; el.innerHTML = Array.from({ length: 9 }, (_, i) => `<i${PIPS[n].includes(i + 1) ? ' class="on"' : ''}></i>`).join(''); };

let layer = null, hideTimer = null;
export function showDice(dice) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!layer) { layer = document.createElement('div'); layer.className = 'dice-layer'; layer.setAttribute('aria-hidden', 'true'); document.querySelector('.app').append(layer); }
  clearTimeout(hideTimer);
  layer.innerHTML = '<div class="die"></div><div class="die"></div><div class="dice-sum"></div>';
  const els = [...layer.querySelectorAll('.die')], sum = layer.querySelector('.dice-sum');
  layer.className = 'dice-layer show' + (reduce ? '' : ' roll');
  return new Promise(done => {
    const finish = () => {
      els.forEach((el, i) => face(el, dice[i]));
      sum.textContent = dice[0] + dice[1];
      layer.classList.add('landed');
      hideTimer = setTimeout(() => layer.classList.remove('show'), 1600);
      done();
    };
    if (reduce) return finish();
    let t = 0;
    const flick = setInterval(() => { els.forEach(el => face(el, 1 + Math.floor(Math.random() * 6))); if ((t += 70) >= 560) { clearInterval(flick); finish(); } }, 70);
  });
}
export function hideDice() { if (layer) layer.classList.remove('show'); }
