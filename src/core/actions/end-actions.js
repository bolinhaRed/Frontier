// Fim do passo 3 (acções): passa a repor a mão.
// Solo: com o objectivo do território cumprido, o jogador pode concluir já (conta para «2 rondas antes»).
export const legal = state => [{ type: 'endActions', player: state.active },
  ...(state.solo?.achievedRound != null ? [{ type: 'concludeSolo', player: state.active }] : [])];
export function apply(state, a) {
  if (a.type === 'concludeSolo') {
    if (state.solo?.achievedRound == null) return 'O objectivo do território ainda não foi cumprido.';
    state.solo.concludedRound = state.round; state.step = 'conclude'; return;
  }
  state.step = 'refill';
}
