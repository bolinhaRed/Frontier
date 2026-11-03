// FRONTIER — vista do mapa: desenho em Canvas 2D, câmara, toque, pinça, roda e rato.
// Reutilizado do projecto original (map-engine.js), sem nevoeiro nem exploradores.
// Recebe um quadro já pronto a desenhar; não conhece as regras do jogo.
//   board = { cells: [{ q, r, atlas, tile, rot, color?, token? }], slots: [{ q, r, legal? }] }
//   cells: hexágonos com tile (color = contorno do dono, token = número da ficha, flag = cor de quem
//   explorou o local, mark = contorno tracejado de destaque);
//   slots: hexágonos vazios desenhados como contorno; legal = onde se pode jogar agora.
import { hexToPixel, pixelToHex, key, HEX_SIZE, TILE_W, TILE_H, corners } from '../core/hex.js';
import { tileSource } from './assets.js';

const ease = t => 1 - Math.pow(1 - t, 3);
const now = () => performance.now();

export class MapView {
  constructor(canvas, opts = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.onSelect = opts.onSelect || (() => {});
    this.cam = { x: 0, y: 0, z: 0.5 };
    this.motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.selected = null; this.hover = null;
    this.tween = null; this.vel = null;
    this.pointers = new Map(); this.gesture = null; this.pinch = null;
    this.dirty = true;
    this._bindInput();
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    const loop = () => { this._frame(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  setBoard(board) {
    this.board = board;
    const all = [...board.cells, ...(board.slots || [])];
    this.byKey = new Map(all.map(h => [key(h.q, h.r), h]));
    const ps = all.map(h => hexToPixel(h.q, h.r));
    const xs = ps.map(p => p.x), ys = ps.map(p => p.y);
    this.bounds = { x0: Math.min(...xs) - TILE_W / 2, x1: Math.max(...xs) + TILE_W / 2, y0: Math.min(...ys) - TILE_H / 2, y1: Math.max(...ys) + TILE_H / 2 };
    // desenha de cima para baixo, para os tiles mais abaixo ficarem por cima
    this.order = board.cells.map(h => ({ h, p: hexToPixel(h.q, h.r) })).sort((a, b) => a.p.y - b.p.y || a.p.x - b.p.x);
    this.slotPos = (board.slots || []).map(h => hexToPixel(h.q, h.r));
    this._clamp(); this.dirty = true;
  }

  get minZoom() { const b = this.bounds; return b ? Math.max(0.06, Math.min(this.W / (b.x1 - b.x0), this.H / (b.y1 - b.y0)) * 0.92) : 0.1; }
  get maxZoom() { return 1.3; }

  resize() {
    const r = this.cv.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = r.width; this.H = r.height;
    this.cv.width = Math.round(r.width * this.dpr); this.cv.height = Math.round(r.height * this.dpr);
    if (this.bounds) this._clamp();
    this.dirty = true;
  }

  // ---------- câmara ----------
  screenToWorld(sx, sy) { return { x: this.cam.x + (sx - this.W / 2) / this.cam.z, y: this.cam.y + (sy - this.H / 2) / this.cam.z }; }
  hexAt(sx, sy) {
    const w = this.screenToWorld(sx, sy); const { q, r } = pixelToHex(w.x, w.y);
    return this.byKey?.get(key(q, r)) || null;
  }
  _clamp() {
    const b = this.bounds, c = this.cam; if (!b) return;
    c.z = Math.min(this.maxZoom, Math.max(this.minZoom, c.z));
    const mx = this.W / 2 / c.z * 0.6, my = this.H / 2 / c.z * 0.6;
    c.x = Math.min(b.x1 - mx + 60, Math.max(b.x0 + mx - 60, c.x));
    if (b.x1 - b.x0 < (this.W / c.z) * 0.8) c.x = (b.x0 + b.x1) / 2;
    c.y = Math.min(b.y1 - my + 60, Math.max(b.y0 + my - 60, c.y));
    if (b.y1 - b.y0 < (this.H / c.z) * 0.8) c.y = (b.y0 + b.y1) / 2;
  }
  zoomAt(factor, sx = this.W / 2, sy = this.H / 2) {
    const before = this.screenToWorld(sx, sy);
    this.cam.z = Math.min(this.maxZoom, Math.max(this.minZoom, this.cam.z * factor));
    const after = this.screenToWorld(sx, sy);
    this.cam.x += before.x - after.x; this.cam.y += before.y - after.y;
    this._clamp(); this.dirty = true;
  }
  flyTo(x, y, z = this.cam.z, dur = 450) {
    const to = { x, y, z: Math.min(this.maxZoom, Math.max(this.minZoom, z)) };
    if (!this.motion) { Object.assign(this.cam, to); this._clamp(); this.dirty = true; return; }
    this.tween = { from: { ...this.cam }, to, t0: now(), dur };
  }
  // Enquadra o mapa na área livre entre insetTop e insetBottom (px no ecrã), p. ex. acima de um painel.
  fitAll(insetTop = 0, insetBottom = 0) {
    const b = this.bounds; if (!b) return;
    const H = Math.max(120, this.H - insetTop - insetBottom);
    const z = Math.min(this.W / (b.x1 - b.x0), H / (b.y1 - b.y0)) * 0.9;
    this.flyTo((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2 + (insetBottom - insetTop) / 2 / z, z);
  }
  select(h) { this.selected = h; this.dirty = true; }

  // ---------- entrada ----------
  _bindInput() {
    const cv = this.cv;
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      this.tween = null; this.vel = null;
      if (this.pointers.size === 1) this.gesture = { sx: e.offsetX, sy: e.offsetY, t: now(), moved: false, hist: [] };
      else if (this.pointers.size === 2) { this.gesture.moved = true; this.pinch = this._pinchState(); }
    });
    cv.addEventListener('pointermove', e => {
      if (!this.pointers.has(e.pointerId)) {
        if (e.pointerType === 'mouse') { const h = this.hexAt(e.offsetX, e.offsetY); if (h !== this.hover) { this.hover = h; this.dirty = true; } }
        return;
      }
      const p = this.pointers.get(e.pointerId); const dx = e.offsetX - p.x, dy = e.offsetY - p.y;
      p.x = e.offsetX; p.y = e.offsetY;
      if (this.pointers.size === 1) {
        const g = this.gesture;
        if (Math.hypot(e.offsetX - g.sx, e.offsetY - g.sy) > 7) g.moved = true;
        if (g.moved) {
          this.cam.x -= dx / this.cam.z; this.cam.y -= dy / this.cam.z; this._clamp(); this.dirty = true;
          g.hist.push({ dx, dy, t: now() }); if (g.hist.length > 5) g.hist.shift();
        }
      } else if (this.pointers.size === 2 && this.pinch) {
        const cur = this._pinchState();
        const before = this.screenToWorld(this.pinch.mx, this.pinch.my);
        this.cam.z = Math.min(this.maxZoom, Math.max(this.minZoom, this.cam.z * cur.d / this.pinch.d));
        const after = this.screenToWorld(cur.mx, cur.my);
        this.cam.x += before.x - after.x; this.cam.y += before.y - after.y;
        this._clamp(); this.pinch = cur; this.dirty = true;
      }
    });
    const end = e => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      const g = this.gesture;
      if (this.pointers.size === 0 && g) {
        if (!g.moved && now() - g.t < 600) this.onSelect(this.hexAt(e.offsetX, e.offsetY));
        else if (g.hist.length > 1 && this.motion) {
          const h = g.hist, dt = Math.max(16, h[h.length - 1].t - h[0].t);
          const vx = h.reduce((s, a) => s + a.dx, 0) / dt, vy = h.reduce((s, a) => s + a.dy, 0) / dt;
          if (now() - h[h.length - 1].t < 80 && Math.hypot(vx, vy) > 0.25) this.vel = { vx, vy, t: now() };
        }
        this.gesture = null;
      }
      if (this.pointers.size === 1) { const [p] = this.pointers.values(); this.gesture = { sx: p.x, sy: p.y, t: 0, moved: true, hist: [] }; this.pinch = null; }
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && this.hover) { this.hover = null; this.dirty = true; } });
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      const d = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
      this.tween = null; this.zoomAt(Math.exp(-d * 0.0016), e.offsetX, e.offsetY);
    }, { passive: false });
  }
  _pinchState() {
    const [a, b] = [...this.pointers.values()];
    return { d: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }

  // ---------- desenho ----------
  _frame() {
    const t = now();
    if (this.tween) {
      const tw = this.tween, k = Math.min(1, (t - tw.t0) / tw.dur), e = ease(k);
      this.cam.x = tw.from.x + (tw.to.x - tw.from.x) * e; this.cam.y = tw.from.y + (tw.to.y - tw.from.y) * e;
      this.cam.z = tw.from.z + (tw.to.z - tw.from.z) * e; this._clamp();
      if (k >= 1) this.tween = null;
      this.dirty = true;
    }
    if (this.vel) {
      const f = Math.exp(-(t - this.vel.t) / 260);
      this.cam.x -= this.vel.vx * 16 * f / this.cam.z; this.cam.y -= this.vel.vy * 16 * f / this.cam.z; this._clamp();
      if (f < 0.05) this.vel = null;
      this.dirty = true;
    }
    if (!this.dirty) return;
    this.dirty = false;
    this.draw();
  }

  draw() {
    const { ctx, cam, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    if (!this.board) return;
    const s = cam.z * dpr;
    ctx.setTransform(s, 0, 0, s, dpr * this.W / 2 - cam.x * s, dpr * this.H / 2 - cam.y * s);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    // hexágonos vazios: contorno ténue sobre o pergaminho
    const grid = new Path2D();
    this.slotPos.forEach(p => this._hexPath(grid, p.x, p.y));
    ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(92,70,40,.22)'; ctx.stroke(grid);
    // hexágonos onde se pode jogar agora
    const legal = new Path2D(); let anyLegal = false;
    (this.board.slots || []).forEach((h, i) => { if (h.legal) { anyLegal = true; this._hexPath(legal, this.slotPos[i].x, this.slotPos[i].y, HEX_SIZE - 8); } });
    if (anyLegal) { ctx.fillStyle = 'rgba(200,146,46,.14)'; ctx.fill(legal); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(156,106,32,.55)'; ctx.stroke(legal); }
    for (const { h, p } of this.order) this._tile(h.atlas, h.tile, p, h.rot || 0);
    for (const { h, p } of this.order) {
      if (h.color) { ctx.lineWidth = 7; ctx.strokeStyle = h.color; ctx.stroke(this._hexPath(new Path2D(), p.x, p.y, HEX_SIZE - 6)); }
      if (h.token != null) this._token(p.x, p.y + 52, h.token);
      if (h.flag) this._flag(p.x + 34, p.y - 62, h.flag);
      if (h.mark) { ctx.lineWidth = 6; ctx.setLineDash([14, 10]); ctx.strokeStyle = h.mark; ctx.stroke(this._hexPath(new Path2D(), p.x, p.y, HEX_SIZE - 14)); ctx.setLineDash([]); }
    }
    const outline = (h, color, w) => { if (!h) return; const p = hexToPixel(h.q, h.r); ctx.lineWidth = Math.max(w, w / 2 / cam.z); ctx.strokeStyle = color; ctx.stroke(this._hexPath(new Path2D(), p.x, p.y, HEX_SIZE - 5)); };
    if (this.hover !== this.selected) outline(this.hover, 'rgba(255,244,214,.75)', 4);
    outline(this.selected, '#c8922e', 6);
  }

  // Ficha de número: círculo de pergaminho; 6 e 8 a vermelho, como no papel.
  _token(x, y, n) {
    const ctx = this.ctx, hot = n === 6 || n === 8;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fillStyle = '#f6edd8'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#2f2216'; ctx.stroke();
    ctx.fillStyle = hot ? '#a8321f' : '#2f2216'; ctx.font = `700 ${hot ? 28 : 25}px Alegreya, Georgia, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), x, y + 1);
    ctx.restore();
  }

  // Galhardete na cor do jogador que explorou o local.
  _flag(x, y, color) {
    const ctx = this.ctx; ctx.save();
    ctx.strokeStyle = '#2f2216'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + 52); ctx.lineTo(x, y - 6); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 38, y + 7); ctx.lineTo(x, y + 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _tile(atlas, tile, p, rot) {
    const [img, sx, sy, sw, sh] = tileSource(atlas, tile, this.cam.z * this.dpr);
    const ctx = this.ctx;
    if (rot) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(rot); ctx.drawImage(img, sx, sy, sw, sh, -TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H); ctx.restore(); }
    else ctx.drawImage(img, sx, sy, sw, sh, p.x - TILE_W / 2, p.y - TILE_H / 2, TILE_W, TILE_H);
  }

  _hexPath(path, cx, cy, size = HEX_SIZE - 2) {
    const c = corners(cx, cy, size);
    path.moveTo(c[0][0], c[0][1]); for (let i = 1; i < 6; i++) path.lineTo(c[i][0], c[i][1]); path.closePath();
    return path;
  }
}
