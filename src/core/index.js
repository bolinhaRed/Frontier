// Ponto de entrada do motor de regras.
export { createGame, SCHEMA_VERSION, RULES_VERSION } from './state.js';
export { applyAction, legalActions, currentPlayer } from './apply.js';
