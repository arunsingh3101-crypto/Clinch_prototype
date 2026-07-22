import { CONFIG } from '../config.js?v=20260722a';
import { clamp } from '../utils/geometry.js?v=20260722a';
import Trail from './Trail.js?v=20260722a';

export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.health = CONFIG.PLAYER.HEALTH;
    this.invulnUntil = 0;
    this.trail = new Trail(scene);

    this.sprite = scene.add.rectangle(x, y, CONFIG.PLAYER.RADIUS * 2, CONFIG.PLAYER.RADIUS * 2, 0x2ecc71);
    this.sprite.setStrokeStyle(2, 0xffffff);
  }

  get isInvulnerable() {
    return this.scene.time.now < this.invulnUntil;
  }

  move(dx, dy, deltaSeconds, now) {
    if (dx === 0 && dy === 0) return;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const speed = CONFIG.PLAYER.SPEED;

    const margin = CONFIG.ARENA.WALL_MARGIN + CONFIG.PLAYER.RADIUS;
    this.x = clamp(this.x + nx * speed * deltaSeconds, margin, CONFIG.ARENA.WIDTH - margin);
    this.y = clamp(this.y + ny * speed * deltaSeconds, margin, CONFIG.ARENA.HEIGHT - margin);

    this.trail.addPoint(this.x, this.y, now);
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
