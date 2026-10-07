// Keyboard + touch input merged into one state, sampled once per fixed step.
// Presses are latched so a tap shorter than a frame is never lost.

// Keep receiving a finger's events even if it slides off the control.
const capture = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch { /* synthetic / stale pointer */ } };

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'jump', KeyC: 'jump', Space: 'jump',
  KeyX: 'dash', KeyK: 'dash',
  ShiftLeft: 'grab', ShiftRight: 'grab', KeyV: 'grab', KeyJ: 'grab',
};

export class Controls {
  constructor() {
    this.keys = new Set(); // held keyboard actions
    this.touch = { left: false, right: false, up: false, down: false, jump: false, dash: false, grab: false };
    this.pressed = { jump: false, dash: false };
    this.lastH = 0; // last horizontal direction pressed (for left+right overlap)
    this.lastV = 0;
    this.listeners = [];
    this.anyPress = null; // callback(action) for menus / audio unlock
    this.bindKeyboard();
    this.bindTouch();
  }

  emitPress(action) {
    if (action === 'jump' || action === 'dash') this.pressed[action] = true;
    if (action === 'left') this.lastH = -1;
    if (action === 'right') this.lastH = 1;
    if (action === 'up') this.lastV = -1;
    if (action === 'down') this.lastV = 1;
    this.anyPress && this.anyPress(action);
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (!a) { this.anyPress && this.anyPress(e.code); return; }
      e.preventDefault();
      if (e.repeat) return;
      if (!this.keys.has(a)) { this.keys.add(a); this.emitPress(a); }
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      // another key may still hold the same action (e.g. Z and C)
      const still = Object.entries(KEYMAP).some(([code, act]) => act === a && code !== e.code && this.codeDown?.has(code));
      if (!still) this.keys.delete(a);
    });
    this.codeDown = new Set();
    window.addEventListener('keydown', (e) => this.codeDown.add(e.code), true);
    window.addEventListener('keyup', (e) => this.codeDown.delete(e.code), true);
    window.addEventListener('blur', () => { this.keys.clear(); this.codeDown.clear(); });
  }

  bindTouch() {
    const body = document.body;
    const params = new URLSearchParams(location.search);
    const isTouch = params.get('touch') === '1' || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (params.get('touch') === '0') return;
    if (isTouch) body.classList.add('touch');
    window.addEventListener('touchstart', () => body.classList.add('touch'), { once: true, passive: true });
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // --- d-pad: 8-way from the thumb's offset to the pad centre -------------
    const pad = document.getElementById('dpad');
    const knob = document.getElementById('knob');
    if (!pad) return;
    const padPointers = new Map();
    const updatePad = () => {
      let dx = 0, dy = 0;
      for (const p of padPointers.values()) { dx = p.dx; dy = p.dy; }
      const r = pad.getBoundingClientRect();
      const dead = r.width * 0.14;
      const prev = { ...this.touch };
      let l = false, rt = false, u = false, d = false;
      if (padPointers.size && Math.hypot(dx, dy) > dead) {
        const ang = Math.atan2(dy, dx); // 8 sectors of 45 degrees
        const sector = Math.round(ang / (Math.PI / 4));
        const dirs = { 0: [1, 0], 1: [1, 1], 2: [0, 1], 3: [-1, 1], 4: [-1, 0], '-4': [-1, 0], '-3': [-1, -1], '-2': [0, -1], '-1': [1, -1] };
        const [hx, hy] = dirs[sector];
        l = hx < 0; rt = hx > 0; u = hy < 0; d = hy > 0;
      }
      this.touch.left = l; this.touch.right = rt; this.touch.up = u; this.touch.down = d;
      for (const k of ['left', 'right', 'up', 'down']) if (this.touch[k] && !prev[k]) this.emitPress(k);
      const max = r.width * 0.3;
      const len = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, max / len);
      knob.style.transform = padPointers.size ? `translate(${dx * k}px, ${dy * k}px)` : '';
    };
    const padMove = (e) => {
      if (!padPointers.has(e.pointerId)) return;
      const r = pad.getBoundingClientRect();
      padPointers.set(e.pointerId, { dx: e.clientX - (r.left + r.width / 2), dy: e.clientY - (r.top + r.height / 2) });
      updatePad();
    };
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      capture(pad, e);
      padPointers.set(e.pointerId, { dx: 0, dy: 0 });
      padMove(e);
    });
    pad.addEventListener('pointermove', padMove);
    const padUp = (e) => { padPointers.delete(e.pointerId); updatePad(); };
    pad.addEventListener('pointerup', padUp);
    pad.addEventListener('pointercancel', padUp);
    pad.addEventListener('lostpointercapture', padUp);

    // --- buttons: each tracks its own set of pointers --------------------
    for (const el of document.querySelectorAll('.btn')) {
      const action = el.dataset.btn;
      const ptrs = new Set();
      const sync = () => {
        const was = this.touch[action];
        this.touch[action] = ptrs.size > 0;
        el.classList.toggle('down', ptrs.size > 0);
        if (!was && this.touch[action]) this.emitPress(action);
      };
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); capture(el, e); ptrs.add(e.pointerId); sync(); });
      const up = (e) => { ptrs.delete(e.pointerId); sync(); };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
    }
  }

  held(a) { return this.keys.has(a) || this.touch[a]; }

  // One fixed step's worth of input. Clears the press latches.
  sample() {
    const l = this.held('left'), r = this.held('right'), u = this.held('up'), d = this.held('down');
    const x = l && r ? this.lastH : r ? 1 : l ? -1 : 0;
    const y = u && d ? this.lastV : d ? 1 : u ? -1 : 0;
    const out = {
      x, y,
      jump: this.held('jump'), jumpPressed: this.pressed.jump,
      dash: this.held('dash'), dashPressed: this.pressed.dash,
      grab: this.held('grab'),
    };
    this.pressed.jump = this.pressed.dash = false;
    return out;
  }
}
