import { CONFIG } from '../config.js?v=20260901123254';
import { clamp } from '../utils/geometry.js?v=20260901123254';
import Trail from './Trail.js?v=20260901123254';

export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.health = CONFIG.PLAYER.HEALTH;
    this.invulnUntil = 0;
    this.trail = new Trail(scene);

    // Composable story-mode capabilities (spec §5), keyed by capability.key.
    // Arcade attaches none: trailActive stays true forever, sneaking false.
    this.capabilities = new Map();
    this.trailActive = true; // false while the trail is toggled OFF (§1.1)
    this.sneaking = false; // derived by SneakMode from trailActive (§1.2)

    // Current velocity (px/s), refreshed each move. Zero while standing still.
    // Read by sheep to tell a fast/direct approach from a careful one (§1.6).
    this.vx = 0;
    this.vy = 0;

    this.sprite = scene.add.rectangle(x, y, CONFIG.PLAYER.RADIUS * 2, CONFIG.PLAYER.RADIUS * 2, 0x2ecc71);
    this.sprite.setStrokeStyle(2, 0xffffff);
  }

  get isInvulnerable() {
    return this.scene.time.now < this.invulnUntil;
  }

  move(dx, dy, deltaSeconds, now) {
    if (dx === 0 && dy === 0) {
      this.vx = 0;
      this.vy = 0;
      return;
    }
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const speed = CONFIG.PLAYER.SPEED;
    this.vx = nx * speed;
    this.vy = ny * speed;

    const margin = CONFIG.ARENA.WALL_MARGIN + CONFIG.PLAYER.RADIUS;
    this.x = clamp(this.x + nx * speed * deltaSeconds, margin, CONFIG.ARENA.WIDTH - margin);
    this.y = clamp(this.y + ny * speed * deltaSeconds, margin, CONFIG.ARENA.HEIGHT - margin);

    // No trail is laid while it's toggled OFF (§1.1) — Sneak Mode.
    if (this.trailActive) this.trail.addPoint(this.x, this.y, now);
  }

  // --- Capability wiring (spec §5) -------------------------------------------
  addCapability(cap, sim) {
    cap.attach({ player: this, sim });
    cap.enable();
    this.capabilities.set(cap.constructor.key, cap);
    return cap;
  }

  getCapability(key) {
    return this.capabilities.get(key) || null;
  }

  updateCapabilities(now, deltaSeconds) {
    for (const cap of this.capabilities.values()) {
      if (cap.enabled) cap.update(now, deltaSeconds);
    }
  }

  takeDamage(amount, now) {
    if (CONFIG.DEBUG.GOD_MODE) return false;
    if (this.isInvulnerable || this.health <= 0) return false;
    this.health -= amount;
    this.invulnUntil = now + CONFIG.PLAYER.INVULN_MS;
    return true;
  }

  resetTrail(now) {
    const stub = [];
    if (CONFIG.PLAYER.STARTER_STUB_LENGTH > 0) {
      stub.push({ x: this.x, y: this.y, t: now });
    }
    this.trail.reset(stub);
  }

  syncSprite() {
    this.sprite.setPosition(this.x, this.y);
    this.sprite.setAlpha(this.isInvulnerable ? (Math.floor(this.scene.time.now / 80) % 2 === 0 ? 0.4 : 1) : 1);
  }

  destroy() {
    this.trail.destroy();
    this.sprite.destroy();
  }
}
