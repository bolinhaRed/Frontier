// Gravação automática simples (etapa 3): a partida em curso é gravada depois de cada acção e
// recuperada ao reabrir a página. O armazenamento é passado de fora (localStorage no browser,
// um objecto equivalente nos testes). Gravações múltiplas, exportar e importar: etapa 4.
import { SCHEMA_VERSION } from '../core/state.js';

export const AUTOSAVE_KEY = 'frontier.autosave';

export function saveGame(store, state) {
  try { store.setItem(AUTOSAVE_KEY, JSON.stringify({ schema: SCHEMA_VERSION, savedAt: new Date().toISOString(), state })); return true; }
  catch { return false; }
}

// Devolve { state, savedAt } ou null se não houver gravação, ou se estiver estragada ou noutra versão.
export function loadGame(store) {
  try {
    const raw = store.getItem(AUTOSAVE_KEY); if (!raw) return null;
    const d = JSON.parse(raw);
    return d && d.schema === SCHEMA_VERSION && looksValid(d.state) ? { state: d.state, savedAt: d.savedAt } : null;
  } catch { return null; }
}

export function clearGame(store) { try { store.removeItem(AUTOSAVE_KEY); } catch { /* sem armazenamento */ } }

function looksValid(s) {
  return !!s && typeof s === 'object' && ['setup', 'turn', 'over'].includes(s.phase)
    && Array.isArray(s.players) && s.players.length >= 2 && s.players.length <= 4
    && s.board && typeof s.board === 'object' && s.rng && Number.isInteger(s.rng.s)
    && Array.isArray(s.deck) && Array.isArray(s.order) && Array.isArray(s.log);
}
