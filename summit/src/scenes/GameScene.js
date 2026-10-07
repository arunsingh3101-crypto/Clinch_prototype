import { STEP, VIEW_W, VIEW_H, TILE, MOVE, COLORS, WORLD } from '../config.js';
import { Sim, EMPTY_INPUT } from '../sim/Sim.js';
import { makeRoomTexture, makeBackground } from '../gfx/Art.js';
import { ROOMS } from '../world/rooms.js';
import { SANDBOX } from '../world/testRoom.js';
import { sfx } from '../audio/Sfx.js';
import { decode } from '../sim/routeInput.js';
import { controls, params } from '../globals.js';

const HAIR_OUTLINE = 0x17142a;

export class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  init(data) {
    const r = params.get('room');
    this.rooms = r === 'sandbox' ? [SANDBOX] : ROOMS;
    const start = data?.room ?? (r && r !== 'sandbox' ? Math.max(0, Math.min(ROOMS.length - 1, parseInt(r, 10) - 1)) : 0);
    this.sim = new Sim(this.rooms, start);
    this.manual = params.get('test') === '1';
    this.acc = 0;
  }

  create() {
    this.bg = this.add.image(0, 0, '__WHITE').setOrigin(0).setDepth(0);
    this.snow = [];
    const R = Math.random;
    for (let i = 0; i < 40; i++) this.snow.push({ x: R() * VIEW_W, y: R() * VIEW_H, s: 10 + R() * 25, d: R() * 6.28, z: R() < 0.3 ? 2 : 1 });
    this.snowG = this.add.graphics().setDepth(1);
    this.roomImg = this.add.image(0, 0, '__WHITE').setOrigin(0).setDepth(3);
    this.objLayer = this.add.layer().setDepth(4);
    this.ghosts = this.add.layer().setDepth(5);
    this.hairBack = this.add.graphics().setDepth(6);
    this.playerSpr = this.add.sprite(0, 0, 'player', 'idle').setOrigin(0.5, 1).setDepth(7);
    this.hairFront = this.add.graphics().setDepth(8);
    this.fx = this.add.graphics().setDepth(9);
    this.ui = this.add.graphics().setDepth(10);
    this.particles = [];
    this.hair = Array.from({ length: 5 }, () => ({ x: 0, y: 0 }));
    this.squash = { x: 1, y: 1 };

    this.hudBerry = this.add.image(10, 6, 'berry').setOrigin(0).setDepth(20).setScale(1);
    this.hudBerryText = this.add.bitmapText(28, 10, 'pix', '', 6).setScale(2).setDepth(20);
    this.hudDeathText = this.add.bitmapText(80, 10, 'pix', '', 6).setScale(2).setDepth(20);
    this.hudTime = this.add.bitmapText(VIEW_W - 10, 10, 'pix', '', 6).setScale(2).setOrigin(1, 0).setDepth(20);
    this.roomTitle = this.add.bitmapText(VIEW_W / 2, 48, 'pix', '', 6).setScale(2).setOrigin(0.5).setDepth(20);
    this.hudShade = this.add.rectangle(0, 0, VIEW_W, 28, 0x000000, 0.25).setOrigin(0).setDepth(19);
    this.wipe = this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x0d0e1a, 1).setOrigin(0).setDepth(30).setAlpha(0);

    this.buildRoom();
    this.showRoomTitle();
    this.wipe.setAlpha(1);
    this.tweens.add({ targets: this.wipe, alpha: 0, duration: 300 });

    controls.anyPress = (a) => { sfx.unlock(); if (a === 'KeyM') sfx.toggleMute(); if (a === 'Escape' || a === 'KeyP') this.togglePause(); };
    this.paused = false;
    this.pauseText = this.add.bitmapText(VIEW_W / 2, VIEW_H / 2, 'pix', 'PAUSED', 6).setScale(4).setOrigin(0.5).setDepth(40).setVisible(false);

    this.exposeTestHook();
  }

  togglePause() {
    this.paused = !this.paused;
    this.pauseText.setVisible(this.paused);
  }

  // ---------------------------------------------------------------- room ---
  buildRoom() {
    const w = this.sim.world;
    const idx = this.sim.roomIndex;
    this.bg.setTexture(makeBackground(this, idx));
    this.roomImg.setTexture(makeRoomTexture(this, w, idx));
    this.objLayer.removeAll(true);
    this.objSprites = [];
    for (const c of w.crystals) {
      const s = this.add.image(c.x + 8, c.y + 8, 'crystal');
      this.objLayer.add(s);
      this.objSprites.push({ kind: 'crystal', o: c, s, base: c.y + 8 });
    }
    for (const b of w.berries) {
      const s = this.add.image(b.x + 8, b.y + 8, 'berry');
      this.objLayer.add(s);
      this.objSprites.push({ kind: 'berry', o: b, s, base: b.y + 8 });
    }
    for (const c of w.crumbles) {
      const s = this.add.image(c.x, c.y, 'crumble').setOrigin(0);
      this.objLayer.add(s);
      this.objSprites.push({ kind: 'crumble', o: c, s });
    }
    for (const p of w.platforms) {
      const s = this.add.tileSprite(p.x, p.y, p.w, p.h, 'platform').setOrigin(0);
      this.objLayer.add(s);
      this.objSprites.push({ kind: 'platform', o: p, s });
    }
    if (w.flag) {
      const s = this.add.sprite(w.flag.x, w.flag.y, 'flag', 0).setOrigin(0.15, 0);
      this.objLayer.add(s);
      this.objSprites.push({ kind: 'flag', o: w.flag, s });
    }
    this.resetHair();
  }

  showRoomTitle() {
    const def = this.sim.world.def;
    this.roomTitle.setText(def.id === 'sandbox' ? 'SANDBOX' : `${this.sim.roomIndex + 1} - ${def.name.toUpperCase()}`);
    this.roomTitle.setAlpha(1);
    this.tweens.killTweensOf(this.roomTitle);
    this.tweens.add({ targets: this.roomTitle, alpha: 0, delay: 1400, duration: 500 });
  }

  resetHair() {
    const p = this.sim.player;
    for (const n of this.hair) { n.x = p.x + 6; n.y = p.y + 2; }
  }

  // ----------------------------------------------------------- main loop ---
  update(time, delta) {
    if (!this.manual && !this.paused) {
      this.acc += Math.min(delta, 100) / 1000;
      let n = 0;
      while (this.acc >= STEP && n < 5) {
        this.stepSim(controls.sample());
        this.acc -= STEP;
        n++;
      }
      if (n === 5) this.acc = 0;
    }
    this.render(delta / 1000);
  }

  stepSim(input) {
    this.sim.step(input);
    const p = this.sim.player;
    if (p.state === 'dash' && !this.sim.frozen() && this.sim.frames % 3 === 0) this.addGhost();
    for (const e of this.sim.drainEvents()) this.onEvent(e);
  }

  onEvent(e) {
    const p = this.sim.player;
    const feetX = p.x + p.w / 2, feetY = p.y + p.h;
    switch (e.type) {
      case 'jump':
        sfx.play('jump');
        this.dust(feetX, feetY, 4);
        this.squash = { x: 0.75, y: 1.25 };
        break;
      case 'walljump':
        sfx.play('walljump');
        this.dust(e.dir > 0 ? p.x : p.x + p.w, p.y + p.h - 4, 4);
        this.squash = { x: 0.75, y: 1.25 };
        break;
      case 'hop': sfx.play('hop'); break;
      case 'dash': {
        sfx.play('dash');
        this.cameras.main.shake(90, 0.005);
        const c = COLORS.HAIR_NO_DASH;
        for (let i = 0; i < 10; i++) {
          const a = Math.atan2(-e.dir.y, -e.dir.x) + (Math.random() - 0.5) * 1.4;
          const sp = 40 + Math.random() * 90;
          this.spawn(p.x + p.w / 2, p.y + p.h / 2, Math.cos(a) * sp, Math.sin(a) * sp, 0.35, i % 2 ? c : 0xffffff, 2);
        }
        break;
      }
      case 'land':
        sfx.play('land');
        this.dust(feetX, feetY, e.speed > 300 ? 8 : 5);
        this.squash = { x: 1.3, y: 0.7 };
        if (e.speed >= MOVE.MAX_FALL - 10) this.cameras.main.shake(70, 0.003);
        break;
      case 'refill': sfx.play('refill'); break;
      case 'death': {
        sfx.play('death');
        this.cameras.main.shake(220, 0.012);
        this.cameras.main.flash(80, 255, 255, 255);
        const col = p.dashes > 0 ? COLORS.HAIR_DASH : COLORS.HAIR_NO_DASH;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const sp = 120 + Math.random() * 40;
          this.spawn(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.45, i % 2 ? col : 0xffffff, 4, 0.9);
        }
        break;
      }
      case 'respawn':
        sfx.play('respawn');
        this.resetHair();
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          this.spawn(p.x + 6 + Math.cos(a) * 24, p.y + 10 + Math.sin(a) * 24, -Math.cos(a) * 100, -Math.sin(a) * 100, 0.24, 0xffffff, 2);
        }
        break;
      case 'crystal':
        sfx.play('crystal');
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * 6.28, sp = 30 + Math.random() * 80;
          this.spawn(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.5, i % 2 ? 0x5ee8a0 : 0xd8fff0, 2);
        }
        break;
      case 'crystalBack': sfx.play('crystalBack'); break;
      case 'berry': {
        sfx.play('berry');
        for (let i = 0; i < 14; i++) {
          const a = Math.random() * 6.28, sp = 30 + Math.random() * 70;
          this.spawn(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp - 30, 0.7, i % 3 ? 0xffe08a : 0xe8364f, 2);
        }
        const t = this.add.bitmapText(e.x, e.y - 10, 'pix', '+1', 6).setScale(2).setOrigin(0.5).setDepth(21);
        this.tweens.add({ targets: t, y: e.y - 34, alpha: 0, duration: 900, onComplete: () => t.destroy() });
        break;
      }
      case 'crumble':
        sfx.play('crumble');
        for (let i = 0; i < 8; i++) this.spawn(e.x + Math.random() * 16, e.y + Math.random() * 16, (Math.random() - 0.5) * 60, Math.random() * 40, 0.6, 0x9c6b3f, 3, 0, 500);
        break;
      case 'room':
        sfx.play('room');
        this.particles.length = 0;
        this.buildRoom();
        this.showRoomTitle();
        this.wipe.setAlpha(1);
        this.tweens.killTweensOf(this.wipe);
        this.tweens.add({ targets: this.wipe, alpha: 0, duration: WORLD.ROOM_TRANSITION * 1000 });
        break;
      case 'finish':
        sfx.play('finish');
        this.time.delayedCall(this.manual ? 0 : 1200, () => {
          const s = this.sim;
          this.scene.start('end', { time: s.time, deaths: s.deaths, berries: s.berries.size, total: s.totalBerries });
        });
        break;
    }
  }

  // ----------------------------------------------------------- particles ---
  spawn(x, y, vx, vy, life, color, size = 2, drag = 0, grav = 0) {
    this.particles.push({ x, y, vx, vy, life, max: life, color, size, drag, grav });
  }

  dust(x, y, n) {
    for (let i = 0; i < n; i++) {
      const dir = i % 2 ? 1 : -1;
      this.spawn(x + dir * 3, y - 1, dir * (20 + Math.random() * 40), -10 - Math.random() * 20, 0.3, 0xe6ebf7, 2, 3);
    }
  }

  addGhost() {
    const p = this.sim.player;
    const g = this.add.image(p.x + p.w / 2, p.y + p.h, 'player-sil', this.pickFrame(p))
      .setOrigin(0.5, 1).setFlipX(p.facing < 0).setTint(COLORS.HAIR_NO_DASH).setAlpha(0.7);
    this.ghosts.add(g);
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  // -------------------------------------------------------------- render ---
  render(dt) {
    const sim = this.sim, p = sim.player, w = sim.world;
    const t = this.time.now / 1000;

    // snow drift
    this.snowG.clear();
    for (const f of this.snow) {
      f.y += f.s * dt * f.z; f.x += Math.sin(t + f.d) * 8 * dt - 6 * dt * f.z;
      if (f.y > VIEW_H) { f.y = -2; f.x = Math.random() * VIEW_W; }
      if (f.x < -2) f.x = VIEW_W;
      this.snowG.fillStyle(0xffffff, f.z === 2 ? 0.8 : 0.45).fillRect(Math.round(f.x), Math.round(f.y), f.z, f.z);
    }

    // objects
    for (const o of this.objSprites) {
      if (o.kind === 'crystal') {
        o.s.setTexture(o.o.active ? 'crystal' : 'crystal-off');
        o.s.y = Math.round(o.base + (o.o.active ? Math.sin(t * 3 + o.o.x) * 2 : 0));
      } else if (o.kind === 'berry') {
        o.s.setVisible(!o.o.collected);
        o.s.y = Math.round(o.base + Math.sin(t * 2.5 + o.o.x) * 2);
      } else if (o.kind === 'crumble') {
        const st = o.o.state;
        o.s.setVisible(st !== 'gone');
        o.s.x = o.o.x + (st === 'shaking' ? Math.round((Math.random() - 0.5) * 2) : 0);
        o.s.y = o.o.y + (st === 'shaking' ? Math.round((Math.random() - 0.5) * 2) : 0);
      } else if (o.kind === 'platform') {
        o.s.x = o.o.x; o.s.y = o.o.y;
      } else if (o.kind === 'flag') {
        o.s.setFrame(Math.floor(t * 4) % 2);
      }
    }

    // player
    const dead = sim.deadTimer > 0;
    const visible = !dead;
    this.playerSpr.setVisible(visible);
    const facing = p.facing;
    this.squash.x += (1 - this.squash.x) * Math.min(1, dt * 12);
    this.squash.y += (1 - this.squash.y) * Math.min(1, dt * 12);
    this.playerSpr.setPosition(p.x + p.w / 2, p.y + p.h);
    this.playerSpr.setFlipX(facing < 0);
    this.playerSpr.setScale(this.squash.x, this.squash.y);
    const frame = this.pickFrame(p);
    this.playerSpr.setFrame(frame);
    this.drawHair(p, visible, frame);

    // particles
    this.fx.clear();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.life -= dt;
      if (q.life <= 0) { this.particles.splice(i, 1); continue; }
      q.vy += q.grav * dt;
      if (q.drag) { q.vx -= q.vx * q.drag * dt; q.vy -= q.vy * q.drag * dt; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      const s = q.size * Math.max(0.5, q.life / q.max);
      this.fx.fillStyle(q.color, Math.min(1, (q.life / q.max) * 1.5)).fillRect(Math.round(q.x - s / 2), Math.round(q.y - s / 2), Math.ceil(s), Math.ceil(s));
    }

    // stamina bar
    this.ui.clear();
    if (visible && (p.state === 'climb' || p.stamina < MOVE.CLIMB_MAX_STAMINA)) {
      const frac = p.stamina / MOVE.CLIMB_MAX_STAMINA;
      const low = p.stamina < MOVE.CLIMB_TIRED_THRESHOLD;
      const col = low ? (Math.floor(t * 10) % 2 ? 0xff3b3b : 0xffffff) : frac < 0.5 ? 0xf2c14e : 0x5ee8a0;
      const bx = Math.round(p.x + p.w / 2 - 8), by = p.y - 12;
      this.ui.fillStyle(0x17142a, 0.9).fillRect(bx - 1, by - 1, 18, 4);
      this.ui.fillStyle(col, 1).fillRect(bx, by, Math.ceil(16 * frac), 2);
    }

    // HUD
    const total = sim.totalBerries;
    this.hudBerryText.setText(`${sim.berries.size}/${total}`);
    this.hudDeathText.setText(`DEATHS ${sim.deaths}`);
    this.hudTime.setText(formatTime(sim.time));
  }

  pickFrame(p) {
    if (p.state === 'dash') return 'dash';
    if (p.state === 'climb') return Math.abs(p.vy) > 1 ? (Math.floor(p.y / 6) % 2 ? 'climb1' : 'climb0') : 'climb0';
    const ground = p.collideAt(0, 1);
    if (ground) {
      if (Math.abs(p.vx) > 15) return `run${Math.floor(p.x / 10) % 4}`;
      return 'idle';
    }
    if (p.wallSliding) return 'slide';
    return p.vy < 0 ? 'jump' : 'fall';
  }

  drawHair(p, visible, frame) {
    const gB = this.hairBack, gF = this.hairFront;
    gB.clear(); gF.clear();
    if (!visible) return;
    const f = p.facing;
    const bob = frame === 'run1' || frame === 'run3' ? 1 : 0;
    const sx = p.x - 2, sy = p.y - 4; // sprite top-left (unscaled)
    const lean = frame === 'dash' ? 1 : 0;
    const headX = f > 0 ? sx + 7 + lean : sx + 8 - lean;
    const headY = sy + 6 + bob;
    const col = p.hairFlash > 0 ? COLORS.HAIR_FLASH : p.dashes > 0 || p.maxDashes === 0 ? COLORS.HAIR_DASH : COLORS.HAIR_NO_DASH;

    const nodes = this.hair;
    nodes[0].x = headX - f * 1; nodes[0].y = headY;
    const dashing = p.state === 'dash';
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1], n = nodes[i];
      const tx = prev.x - f * 2.2 - (dashing ? p.vx * 0.004 : 0);
      const ty = prev.y + (p.state === 'climb' ? 1.6 : 1.1) - (dashing ? p.vy * 0.004 : 0);
      n.x += (tx - n.x) * 0.55; n.y += (ty - n.y) * 0.55;
      const dx = n.x - prev.x, dy = n.y - prev.y, d = Math.hypot(dx, dy);
      if (d > 3) { n.x = prev.x + (dx / d) * 3; n.y = prev.y + (dy / d) * 3; }
    }
    const radii = [4, 3.5, 3, 2.5, 2];
    gB.fillStyle(HAIR_OUTLINE, 1);
    nodes.forEach((n, i) => gB.fillCircle(Math.round(n.x), Math.round(n.y), radii[i] + 1));
    gB.fillStyle(col, 1);
    nodes.forEach((n, i) => gB.fillCircle(Math.round(n.x), Math.round(n.y), radii[i]));
    // bangs over the forehead
    const bx = f > 0 ? sx + 4 + lean : sx + 4 - lean;
    gF.fillStyle(HAIR_OUTLINE, 1).fillRect(bx - 1, sy + 3 + bob, 10, 1);
    gF.fillStyle(col, 1).fillRect(bx, sy + 4 + bob, 8, 2);
    gF.fillRect(f > 0 ? bx : bx + 6, sy + 6 + bob, 2, 2);
  }

  // --------------------------------------------------------------- tests ---
  exposeTestHook() {
    const scene = this;
    window.__summit = {
      ready: true,
      manual: this.manual,
      snapshot: () => scene.sim.snapshot(),
      // advance n fixed steps holding `input`; presses fire on the first step only
      step(n = 1, input = {}) {
        for (let i = 0; i < n; i++) {
          scene.stepSim({ ...EMPTY_INPUT, ...input, jumpPressed: i === 0 && !!input.jump && !input.noPress, dashPressed: i === 0 && !!input.dash });
        }
        scene.render(n * STEP);
        return scene.sim.snapshot();
      },
      loadRoom(i) {
        scene.sim.loadRoom(i);
        scene.particles.length = 0;
        scene.buildRoom();
        scene.showRoomTitle();
        scene.roomTitle.setAlpha(1);
        return scene.sim.snapshot();
      },
      // play a solver route ([[token, frames], ...]); stops early if the room changes
      replay(route, { stopOnRoomChange = true } = {}) {
        const start = scene.sim.roomIndex;
        for (const [tok, n] of route) {
          for (let f = 0; f < n; f++) {
            scene.stepSim(decode(tok, f));
            if (stopOnRoomChange && scene.sim.roomIndex !== start) { scene.render(STEP); return scene.sim.snapshot(); }
          }
        }
        scene.render(STEP);
        return scene.sim.snapshot();
      },
      // run out the room-transition wipe without stepping the new room
      skipTransition() { while (scene.sim.transitionTimer > 0) scene.stepSim(EMPTY_INPUT); return scene.sim.snapshot(); },
      place(x, y) { const p = scene.sim.player; p.x = x; p.y = y; p.vx = p.vy = 0; scene.resetHair(); },
      roomCount: () => scene.rooms.length,
      roomName: () => scene.sim.world.def.name,
    };
  }
}

export function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return `${m}:${sec.toFixed(2).padStart(5, '0')}`;
}
