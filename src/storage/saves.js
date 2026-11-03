// Gravações múltiplas (etapa 4): cada partida tem a sua gravação, actualizada depois de cada acção.
// Guardadas no armazenamento local do browser (localStorage: cada partida ocupa poucas dezenas de kB).
// Exportar e importar em ficheiro JSON, para passar partidas entre aparelhos.
import { SCHEMA_VERSION } from '../core/state.js';
import { AUTOSAVE_KEY } from './autosave.js';

const INDEX = 'frontier.saves';
const slot = id => 'frontier.save.' + id;
export const MAX_SAVES = 20;

const readIndex = store => { try { const v = JSON.parse(store.getItem(INDEX) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const writeIndex = (store, list) => store.setItem(INDEX, JSON.stringify(list));

function summary(id, state, savedAt) {
  const where = state.phase === 'setup' ? 'Preparação' : state.phase === 'over' ? 'Terminada' : `Ronda ${state.round} de ${state.maxRounds}`;
  return { id, savedAt, players: state.players.map(p => p.name), where, over: state.phase === 'over' };
}

// Converte gravações de versões anteriores para a actual. Só existe a versão 1.
export function migrate(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.schema === SCHEMA_VERSION) return data;
  return null;
}

export function validState(s) {
  return !!s && typeof s === 'object' && ['setup', 'turn', 'over'].includes(s.phase)
    && Array.isArray(s.players) && s.players.length >= 2 && s.players.length <= 4
    && s.board && typeof s.board === 'object' && s.rng && Number.isInteger(s.rng.s)
    && Array.isArray(s.deck) && Array.isArray(s.order) && Array.isArray(s.log);
}

let seq = 0;
export function newSaveId() { return Date.now().toString(36) + '-' + (++seq).toString(36); }

// Grava (ou actualiza) a partida id. As mais antigas saem quando passa de MAX_SAVES.
export function writeSave(store, id, state) {
  try {
    const savedAt = new Date().toISOString();
    store.setItem(slot(id), JSON.stringify({ schema: SCHEMA_VERSION, id, savedAt, state }));
    let list = readIndex(store).filter(s => s.id !== id);
    list.unshift(summary(id, state, savedAt));
    for (const old of list.slice(MAX_SAVES)) store.removeItem(slot(old.id));
    writeIndex(store, list.slice(0, MAX_SAVES));
    return true;
  } catch { return false; }
}

export function listSaves(store) { migrateAutosave(store); return readIndex(store); }

export function readSave(store, id) {
  try {
    const d = migrate(JSON.parse(store.getItem(slot(id))));
    return d && validState(d.state) ? d : null;
  } catch { return null; }
}

export function deleteSave(store, id) {
  try { store.removeItem(slot(id)); writeIndex(store, readIndex(store).filter(s => s.id !== id)); } catch { /* nada */ }
}

export function exportSave(store, id) {
  const d = readSave(store, id);
  return d ? JSON.stringify({ app: 'FRONTIER', ...d }, null, 1) : null;
}

// Importa um ficheiro exportado. Devolve { id } ou { error }.
export function importSave(store, text) {
  let d;
  try { d = JSON.parse(text); } catch { return { error: 'O ficheiro não é uma gravação do FRONTIER.' }; }
  if (!d || d.app !== 'FRONTIER') return { error: 'O ficheiro não é uma gravação do FRONTIER.' };
  const m = migrate(d);
  if (!m) return { error: 'Esta gravação é de uma versão do jogo que esta versão não consegue ler.' };
  if (!validState(m.state)) return { error: 'A gravação está estragada.' };
  const id = newSaveId();
  return writeSave(store, id, m.state) ? { id } : { error: 'Não há espaço para guardar a partida.' };
}

// A gravação automática única da etapa 3 passa a ser uma gravação da lista.
function migrateAutosave(store) {
  try {
    const raw = store.getItem(AUTOSAVE_KEY); if (!raw) return;
    const d = migrate(JSON.parse(raw));
    if (d && validState(d.state)) writeSave(store, newSaveId(), d.state);
    store.removeItem(AUTOSAVE_KEY);
  } catch { /* nada */ }
}
