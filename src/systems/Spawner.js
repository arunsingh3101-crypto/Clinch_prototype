import { CONFIG } from '../config.js';
import { clamp, dist } from '../utils/geometry.js';
import Chaser from '../entities/enemies/Chaser.js';
import Shooter from '../entities/enemies/Shooter.js';
import Cutter from '../entities/enemies/Cutter.js';

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
      const pos = this.spawnPosition(player);
      if (type === 'chaser') enemies.push(new Chaser(this.scene, pos.x, pos.y));
      else if (type === 'shooter') enemies.push(new Shooter(this.scene, pos.x, pos.y));
      else enemies.push(new Cutter(this.scene, pos.x, pos.y));
    }
  }

  pickType(phase) {
    if (phase === 0) return 'chaser';
    if (phase === 1) return Math.random() < 0.7 ? 'chaser' : 'shooter';
    // phase 2+: full mix, chasers still most common (they're the herding engine)
    const r = Math.random();
    if (r < 0.55) return 'chaser';
    if (r < 0.8) return 'shooter';
    return 'cutter';
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
