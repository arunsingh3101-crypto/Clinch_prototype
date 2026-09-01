import { CONFIG } from '../config.js?v=20260901104346';
import { clamp, dist } from '../utils/geometry.js?v=20260901104346';
import Chaser from '../entities/enemies/Chaser.js?v=20260901104346';
import Shooter from '../entities/enemies/Shooter.js?v=20260901104346';
import Cutter from '../entities/enemies/Cutter.js?v=20260901104346';
import Dormant from '../entities/enemies/Dormant.js?v=20260901104346';
import Fleer from '../entities/enemies/Fleer.js?v=20260901104346';

// Phased, pulsed wave spawner (Part 9). Per-enemy stats stay constant; only
// density, mix, and cadence escalate over the run.
export default class Spawner {
  constructor(scene) {
    this.scene = scene;
    this.runStart = scene.time.now;
    this.nextPulseAt = this.runStart + 1500;
  }

  currentPhase(elapsed) {
    if (elapsed < CONFIG.WAVES.PHASE_SHOOTERS_AT) return 0; // chasers only
    if (elapsed < CONFIG.WAVES.PHASE_CUTTERS_AT) return 1; // + shooters
    return 2; // + cutters (density then ramps further after PHASE_ESCALATION_AT)
  }

  pulseInterval(elapsed) {
    if (elapsed < CONFIG.WAVES.PHASE_ESCALATION_AT) return CONFIG.WAVES.PULSE_INTERVAL_START_MS;
    const t = clamp((elapsed - CONFIG.WAVES.PHASE_ESCALATION_AT) / CONFIG.WAVES.ESCALATION_RAMP_MS, 0, 1);
    return Phaser.Math.Linear(CONFIG.WAVES.PULSE_INTERVAL_START_MS, CONFIG.WAVES.PULSE_INTERVAL_MIN_MS, t);
  }

  pulseSize(elapsed) {
    if (elapsed < CONFIG.WAVES.PHASE_ESCALATION_AT) return CONFIG.WAVES.PULSE_SIZE_START;
    const t = clamp((elapsed - CONFIG.WAVES.PHASE_ESCALATION_AT) / CONFIG.WAVES.ESCALATION_RAMP_MS, 0, 1);
    return Math.round(Phaser.Math.Linear(CONFIG.WAVES.PULSE_SIZE_START, CONFIG.WAVES.PULSE_SIZE_MAX, t));
  }

  update(now, player, enemies) {
    if (!CONFIG.DEBUG.ENEMY_SPAWNING) return;
    if (now < this.nextPulseAt) return;
    const elapsed = now - this.runStart;
    this.nextPulseAt = now + this.pulseInterval(elapsed);

    const phase = this.currentPhase(elapsed);
    const size = this.pulseSize(elapsed);

    for (let i = 0; i < size; i++) {
      const type = this.pickType(phase);
      if (!type) continue; // no enemy types enabled at all
      const pos = this.spawnPosition(player);
      if (type === 'chaser') enemies.push(new Chaser(this.scene, pos.x, pos.y));
      else if (type === 'shooter') enemies.push(new Shooter(this.scene, pos.x, pos.y));
      else if (type === 'cutter') enemies.push(new Cutter(this.scene, pos.x, pos.y));
      else if (type === 'dormant') enemies.push(new Dormant(this.scene, pos.x, pos.y));
      else enemies.push(new Fleer(this.scene, pos.x, pos.y));
    }
  }

  // Picks a type per the Part 9 phase mix, then filters through the start
  // screen's enemy-type toggles. If the phase-picked type is disabled, this
  // falls back to a uniform pick among whatever IS enabled — which also means
  // restricting to e.g. cutters-only spawns cutters immediately instead of
  // waiting for their normal phase gate, which is what you want when
  // isolating one enemy type for testing.
  pickType(phase) {
    // Falls back to "everything enabled" if a stale cached config.js somehow
    // lacks this field (browsers can serve a torn mix of old/new files across
    // a static site with unversioned URLs) -- degrade gracefully instead of
    // throwing mid-run.
    const enabled = CONFIG.DEBUG.ENEMY_TYPES || { chaser: true, shooter: true, cutter: true, dormant: true, fleer: true };
    const phaseType = this.phaseType(phase);
    if (enabled[phaseType]) return phaseType;

    const pool = Object.keys(enabled).filter((k) => enabled[k]);
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  phaseType(phase) {
    if (phase === 0) return 'chaser';
    if (phase === 1) return Math.random() < 0.7 ? 'chaser' : 'shooter';
    // phase 2+: full mix, chasers still most common (they're the herding engine)
    const r = Math.random();
    if (r < 0.45) return 'chaser';
    if (r < 0.65) return 'shooter';
    if (r < 0.8) return 'cutter';
    if (r < 0.9) return 'dormant';
    return 'fleer';
  }

  spawnPosition(player) {
    const margin = CONFIG.ARENA.WALL_MARGIN + 20;
    for (let attempt = 0; attempt < 8; attempt++) {
      const edge = Phaser.Math.Between(0, 3);
      let x, y;
      if (edge === 0) { x = margin; y = Phaser.Math.Between(margin, CONFIG.ARENA.HEIGHT - margin); }
      else if (edge === 1) { x = CONFIG.ARENA.WIDTH - margin; y = Phaser.Math.Between(margin, CONFIG.ARENA.HEIGHT - margin); }
      else if (edge === 2) { y = margin; x = Phaser.Math.Between(margin, CONFIG.ARENA.WIDTH - margin); }
      else { y = CONFIG.ARENA.HEIGHT - margin; x = Phaser.Math.Between(margin, CONFIG.ARENA.WIDTH - margin); }

      if (dist(x, y, player.x, player.y) >= CONFIG.ENEMIES.SPAWN_MIN_DIST_FROM_PLAYER) {
        return { x, y };
      }
    }
    return { x: margin, y: margin };
  }
}
