// Utilitários de DOM reutilizados do projecto original (ui.js).
export const $ = (sel, root = document) => root.querySelector(sel);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
