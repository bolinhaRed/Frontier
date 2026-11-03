// Fim do passo 3 (acções): passa a repor a mão.
export const legal = state => [{ type: 'endActions', player: state.active }];
export function apply(state) { state.step = 'refill'; }
